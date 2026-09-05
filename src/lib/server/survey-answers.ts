/**
 * Server bridge between yml-driven AnswerValues and the answers table.
 * All question/option ids are re-validated against the parsed definition —
 * client payloads are never trusted. Unknown ids/types are dropped, never crash.
 */
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { answers, responses } from '$lib/server/db/survey.schema';
import {
	allQuestions,
	computeCompletion,
	getQuestion,
	isAnswered,
	isKnownType,
	isVisible,
	validateAnswer,
	type Answers,
	type AnswerValue,
	type Question,
	type SurveyDef
} from '$lib/surveys/definition';

export type SurveyResponse = typeof responses.$inferSelect;

export class SurveyInputError extends Error {
	issues: Record<string, string>;
	constructor(issues: Record<string, string>) {
		super('Invalid survey answers');
		this.issues = issues;
	}
}

// ---------------------------------------------------------------------------
// AnswerValue <-> rows
// ---------------------------------------------------------------------------

type NewAnswerRow = Omit<typeof answers.$inferInsert, 'id' | 'responseId'>;

function emptyRows(): NewAnswerRow[] {
	return [];
}

/** Map a validated AnswerValue to answer rows (responseId attached by caller). */
export function answerToRows(question: Question, value: AnswerValue): NewAnswerRow[] {
	if (!isKnownType(question.type)) return []; // future types: store nothing, never crash
	switch (value.kind) {
		case 'empty':
			return emptyRows();
		case 'single': {
			if (!value.optionId) return emptyRows();
			return [
				{
					questionId: question.id,
					optionId: value.optionId,
					textValue: value.other?.trim() ? value.other.trim() : null
				}
			];
		}
		case 'multiple':
			return value.optionIds.map((id) => ({
				questionId: question.id,
				optionId: id,
				textValue: id === 'other' && value.other?.trim() ? value.other.trim() : null
			}));
		case 'number':
			return [{ questionId: question.id, numberValue: value.value }];
		case 'text': {
			const text = value.text.trim();
			return text ? [{ questionId: question.id, textValue: text }] : emptyRows();
		}
		case 'list': {
			const items = value.items.map((i) => i.trim()).filter(Boolean);
			return items.map((textValue, position) => ({ questionId: question.id, textValue, position }));
		}
		case 'country':
			return value.code ? [{ questionId: question.id, optionId: value.code }] : emptyRows();
	}
}

/**
 * Coerce untrusted JSON into an AnswerValue matching the question's type.
 * Returns null when the shape is wrong (caller records an 'Invalid answer' issue).
 */
export function coerceAnswerValue(question: Question, raw: unknown): AnswerValue | null {
	if (!isKnownType(question.type)) return { kind: 'empty' };
	if (typeof raw !== 'object' || raw === null) return { kind: 'empty' };
	const r = raw as Record<string, unknown>;
	switch (question.type) {
		case 'single':
			if (r['kind'] !== 'single' || typeof r['optionId'] !== 'string') return null;
			return {
				kind: 'single',
				optionId: r['optionId'],
				other: typeof r['other'] === 'string' ? r['other'] : undefined
			};
		case 'multiple':
			if (r['kind'] !== 'multiple' || !Array.isArray(r['optionIds'])) return null;
			return {
				kind: 'multiple',
				optionIds: [...new Set(r['optionIds'].filter((x): x is string => typeof x === 'string'))],
				other: typeof r['other'] === 'string' ? r['other'] : undefined
			};
		case 'scale':
		case 'nps':
			if (r['kind'] !== 'number' || typeof r['value'] !== 'number') return null;
			return { kind: 'number', value: r['value'] };
		case 'text':
			if (r['kind'] !== 'text' || typeof r['text'] !== 'string') return null;
			return { kind: 'text', text: r['text'] };
		case 'text_list':
			if (r['kind'] !== 'list' || !Array.isArray(r['items'])) return null;
			return {
				kind: 'list',
				items: r['items'].filter((x): x is string => typeof x === 'string')
			};
		case 'country':
			if (r['kind'] !== 'country' || typeof r['code'] !== 'string') return null;
			return { kind: 'country', code: r['code'] };
		default:
			return { kind: 'empty' };
	}
}

type AnswerRow = typeof answers.$inferSelect;

/** Rebuild client state from DB rows. Unknown-type questions are skipped. */
export function rowsToAnswers(def: SurveyDef, rows: AnswerRow[]): Answers {
	const byQuestion = new Map<string, AnswerRow[]>();
	for (const row of rows) {
		const list = byQuestion.get(row.questionId) ?? [];
		list.push(row);
		byQuestion.set(row.questionId, list);
	}
	const out: Answers = {};
	for (const [qid, qrows] of byQuestion) {
		const question = getQuestion(def, qid);
		if (!question || !isKnownType(question.type)) continue;
		switch (question.type) {
			case 'single': {
				const row = qrows[0];
				if (row?.optionId) {
					out[qid] = {
						kind: 'single',
						optionId: row.optionId,
						other: row.textValue ?? undefined
					};
				}
				break;
			}
			case 'multiple': {
				const optionIds = qrows.map((r) => r.optionId).filter((x): x is string => !!x);
				if (optionIds.length > 0) {
					out[qid] = {
						kind: 'multiple',
						optionIds,
						other: qrows.find((r) => r.optionId === 'other')?.textValue ?? undefined
					};
				}
				break;
			}
			case 'scale':
			case 'nps': {
				const v = qrows[0]?.numberValue;
				if (typeof v === 'number') out[qid] = { kind: 'number', value: v };
				break;
			}
			case 'text': {
				const t = qrows[0]?.textValue;
				if (t) out[qid] = { kind: 'text', text: t };
				break;
			}
			case 'text_list': {
				const items = qrows
					.slice()
					.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
					.map((r) => r.textValue)
					.filter((x): x is string => !!x);
				if (items.length > 0) out[qid] = { kind: 'list', items };
				break;
			}
			case 'country': {
				const code = qrows[0]?.optionId;
				if (code) out[qid] = { kind: 'country', code };
				break;
			}
		}
	}
	return out;
}

// ---------------------------------------------------------------------------
// Response lifecycle
// ---------------------------------------------------------------------------

export async function getResponseByUser(
	editionId: string,
	userId: string
): Promise<SurveyResponse | undefined> {
	const rows = await db
		.select()
		.from(responses)
		.where(and(eq(responses.editionId, editionId), eq(responses.userId, userId)))
		.limit(1);
	return rows[0];
}

export async function getOrCreateResponse(input: {
	editionId: string;
	surveyVersion: number;
	userId: string;
	source?: string | null;
	userAgent?: string | null;
	locale?: string | null;
}): Promise<SurveyResponse> {
	const existing = await getResponseByUser(input.editionId, input.userId);
	if (existing) return existing;
	const inserted = await db
		.insert(responses)
		.values({
			editionId: input.editionId,
			surveyVersion: input.surveyVersion,
			userId: input.userId,
			source: input.source ?? null,
			userAgent: input.userAgent ?? null,
			locale: input.locale ?? null
		})
		.returning();
	const created = inserted[0];
	if (!created) throw new Error('Failed to create survey response');
	return created;
}

export async function getAnswerRows(responseId: string): Promise<AnswerRow[]> {
	return db.select().from(answers).where(eq(answers.responseId, responseId));
}

/**
 * Save one step's answers: coerce + validate against the yml (using the merged
 * full answer set for showIf), then delete-then-insert per question in a
 * transaction. Hidden questions are cleared. Returns fresh completion %.
 * Throws SurveyInputError on any issue (nothing is written).
 */
export async function saveAnswers(
	response: SurveyResponse,
	def: SurveyDef,
	rawInput: Record<string, unknown>
): Promise<number> {
	if (response.submittedAt) throw new Error('Response already submitted');

	const existingRows = await getAnswerRows(response.id);
	const merged: Answers = { ...rowsToAnswers(def, existingRows) };
	const issues: Record<string, string> = {};
	const accepted: Record<string, AnswerValue> = {};

	for (const [qid, raw] of Object.entries(rawInput)) {
		const question = getQuestion(def, qid);
		if (!question || !isKnownType(question.type)) continue; // unknown: drop silently
		const coerced = coerceAnswerValue(question, raw);
		if (!coerced) {
			issues[qid] = 'Invalid answer.';
			continue;
		}
		merged[qid] = coerced;
		accepted[qid] = coerced;
	}

	for (const [qid, value] of Object.entries(accepted)) {
		const question = getQuestion(def, qid);
		if (!question) continue;
		if (!isVisible(question, merged)) {
			accepted[qid] = { kind: 'empty' }; // hidden: clear stored answers
			continue;
		}
		const problem = validateAnswer(question, value);
		if (problem) issues[qid] = problem;
	}

	if (Object.keys(issues).length > 0) throw new SurveyInputError(issues);

	await db.transaction(async (tx) => {
		for (const [qid, value] of Object.entries(accepted)) {
			const question = getQuestion(def, qid);
			if (!question) continue;
			await tx
				.delete(answers)
				.where(and(eq(answers.responseId, response.id), eq(answers.questionId, qid)));
			const rows = answerToRows(question, value);
			if (rows.length > 0) {
				await tx.insert(answers).values(rows.map((r) => ({ ...r, responseId: response.id })));
			}
		}
	});

	const fresh = await getAnswerRows(response.id);
	const completion = computeCompletion(def, rowsToAnswers(def, fresh));
	await db.update(responses).set({ completion }).where(eq(responses.id, response.id));
	return completion;
}

/**
 * Final submit: validates ALL required visible questions across ALL sections.
 * Throws SurveyInputError listing every problem (keyed by question id).
 */
export async function submitResponse(response: SurveyResponse, def: SurveyDef): Promise<void> {
	if (response.submittedAt) return; // idempotent
	const ans = rowsToAnswers(def, await getAnswerRows(response.id));
	const issues: Record<string, string> = {};
	for (const q of allQuestions(def)) {
		if (!isKnownType(q.type) || !isVisible(q, ans)) continue;
		const problem = validateAnswer(q, ans[q.id]);
		if (problem) issues[q.id] = problem;
	}
	// Drop answers to questions that became hidden since they were saved.
	for (const q of allQuestions(def)) {
		if (isAnswered(q, ans[q.id]) && !isVisible(q, ans)) {
			await db
				.delete(answers)
				.where(and(eq(answers.responseId, response.id), eq(answers.questionId, q.id)));
		}
	}
	if (Object.keys(issues).length > 0) throw new SurveyInputError(issues);
	await db
		.update(responses)
		.set({ submittedAt: new Date(), completion: 100 })
		.where(eq(responses.id, response.id));
}
