/**
 * Survey definition core — framework-free pure TypeScript.
 *
 * RULE: this module must stay dependency-free (no `yaml`, no Svelte, no `$lib`
 * aliases, only relative imports). It is imported by:
 *  - the SvelteKit app (server AND client components),
 *  - `scripts/survey-lint.ts` via tsx.
 *
 * `survey.yml` is parsed elsewhere (SvelteKit loader / lint script) and handed
 * to `parseSurvey()` as an unknown value. This module never touches the filesystem.
 */

export const KNOWN_TYPES = [
	'single',
	'multiple',
	'scale',
	'nps',
	'text',
	'text_list',
	'country'
] as const;
export type KnownQuestionType = (typeof KNOWN_TYPES)[number];

export function isKnownType(type: string): type is KnownQuestionType {
	return (KNOWN_TYPES as readonly string[]).includes(type);
}

export interface OptionDef {
	id: string;
	label: string;
}

export type ShowIfOp = 'eq' | 'includesAny';

export interface ShowIf {
	questionId: string;
	op: ShowIfOp;
	values: string[];
}

interface BaseQuestion {
	id: string;
	/** Raw type string — may be unknown at runtime (see UnknownQuestion fallback). */
	type: string;
	prompt: string;
	required?: boolean;
	showIf?: ShowIf;
}

export interface SingleQuestion extends BaseQuestion {
	type: 'single';
	options: OptionDef[];
	allowOther?: boolean;
}

export interface MultipleQuestion extends BaseQuestion {
	type: 'multiple';
	options: OptionDef[];
	allowOther?: boolean;
	limit?: number;
	exclusiveOptions?: string[];
}

export interface ScaleQuestion extends BaseQuestion {
	type: 'scale';
	min: number;
	max: number;
	labels?: Record<string, string>;
}

export interface NpsQuestion extends BaseQuestion {
	type: 'nps';
	min: number;
	max: number;
}

export interface TextQuestion extends BaseQuestion {
	type: 'text';
	maxLength?: number;
	placeholder?: string;
}

export interface TextListQuestion extends BaseQuestion {
	type: 'text_list';
	limit?: number;
	placeholder?: string;
}

export interface CountryQuestion extends BaseQuestion {
	type: 'country';
	storage?: string;
	skipOption?: { id: string; label: string };
}

/** Forward-compat: a question whose type has no renderer yet. Never crashes. */
export interface UnknownQuestion extends BaseQuestion {
	type: string;
	options?: OptionDef[];
	allowOther?: boolean;
	limit?: number;
	exclusiveOptions?: string[];
	min?: number;
	max?: number;
	labels?: Record<string, string>;
	maxLength?: number;
	placeholder?: string;
	storage?: string;
	skipOption?: { id: string; label: string };
}

export type Question =
	| SingleQuestion
	| MultipleQuestion
	| ScaleQuestion
	| NpsQuestion
	| TextQuestion
	| TextListQuestion
	| CountryQuestion
	| UnknownQuestion;

export interface Section {
	id: string;
	title: string;
	description?: string;
	questions: Question[];
}

export interface SurveyMeta {
	id: string;
	editionId: string;
	year: number;
	title: string;
	hashtag?: string;
	estimatedMinutes?: number;
	version: number;
}

export interface SurveyDef {
	meta: SurveyMeta;
	sections: Section[];
}

/** Discriminated client/server answer value, keyed by question id. */
export type AnswerValue =
	| { kind: 'empty' }
	| { kind: 'single'; optionId: string; other?: string }
	| { kind: 'multiple'; optionIds: string[]; other?: string }
	| { kind: 'number'; value: number }
	| { kind: 'text'; text: string }
	| { kind: 'list'; items: string[] }
	| { kind: 'country'; code: string };

export type Answers = Record<string, AnswerValue | undefined>;

export interface LintIssue {
	level: 'error' | 'warning';
	message: string;
}

export class SurveyParseError extends Error {}

// ---------------------------------------------------------------------------
// Parsing (unknown yml content -> SurveyDef, never throws on question-level
// issues; structural minimum enforced, everything else coerced + linted)
// ---------------------------------------------------------------------------

function asRecord(v: unknown): Record<string, unknown> {
	return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {};
}

function asString(v: unknown, fallback = ''): string {
	return typeof v === 'string' ? v : fallback;
}

function asStringArray(v: unknown): string[] {
	return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

function parseOptions(v: unknown): OptionDef[] {
	if (!Array.isArray(v)) return [];
	return v
		.map((o) => asRecord(o))
		.filter((o) => typeof o['id'] === 'string')
		.map((o) => ({ id: o['id'] as string, label: asString(o['label']) }));
}

function parseShowIf(v: unknown): ShowIf | undefined {
	const r = asRecord(v);
	if (typeof r['questionId'] !== 'string') return undefined;
	return {
		questionId: r['questionId'] as string,
		op: r['op'] === 'eq' ? 'eq' : 'includesAny',
		values: asStringArray(r['values'])
	};
}

function baseFields(r: Record<string, unknown>): Omit<BaseQuestion, 'type'> {
	return {
		id: asString(r['id']),
		prompt: asString(r['prompt']),
		required: r['required'] === true,
		showIf: parseShowIf(r['showIf'])
	};
}

/**
 * Parse raw yml content into a SurveyDef. Throws SurveyParseError only when the
 * top-level shape is unusable (no sections array). Individual questions are
 * coerced with safe fallbacks so one bad edit can never 500 the site —
 * `lintSurvey()` exists to catch those edits loudly in dev/CI instead.
 */
export function parseSurvey(data: unknown): SurveyDef {
	const root = asRecord(data);
	const survey = asRecord(root['survey']);
	const rawSections = root['sections'];
	if (!Array.isArray(rawSections)) {
		throw new SurveyParseError('survey.yml must contain a top-level `sections` array');
	}
	const sections: Section[] = rawSections.map((s) => {
		const r = asRecord(s);
		const rawQuestions = Array.isArray(r['questions']) ? r['questions'] : [];
		const questions: Question[] = rawQuestions.map((q) => {
			const qr = asRecord(q);
			const base = baseFields(qr);
			const type = asString(qr['type']);
			const options = parseOptions(qr['options']);
			switch (type) {
				case 'single':
					return {
						...base,
						type,
						options,
						allowOther: qr['allowOther'] === true
					} satisfies SingleQuestion;
				case 'multiple':
					return {
						...base,
						type,
						options,
						allowOther: qr['allowOther'] === true,
						limit: typeof qr['limit'] === 'number' ? qr['limit'] : undefined,
						exclusiveOptions:
							qr['exclusiveOptions'] === undefined
								? undefined
								: asStringArray(qr['exclusiveOptions'])
					} satisfies MultipleQuestion;
				case 'scale':
					return {
						...base,
						type,
						min: typeof qr['min'] === 'number' ? qr['min'] : 1,
						max: typeof qr['max'] === 'number' ? qr['max'] : 5,
						labels:
							typeof qr['labels'] === 'object' && qr['labels'] !== null
								? Object.fromEntries(
										Object.entries(qr['labels'] as Record<string, unknown>).map(([k, v]) => [
											k,
											asString(v)
										])
									)
								: undefined
					} satisfies ScaleQuestion;
				case 'nps':
					return {
						...base,
						type,
						min: typeof qr['min'] === 'number' ? qr['min'] : 0,
						max: typeof qr['max'] === 'number' ? qr['max'] : 10
					} satisfies NpsQuestion;
				case 'text':
					return {
						...base,
						type,
						maxLength: typeof qr['maxLength'] === 'number' ? qr['maxLength'] : undefined,
						placeholder: qr['placeholder'] === undefined ? undefined : asString(qr['placeholder'])
					} satisfies TextQuestion;
				case 'text_list':
					return {
						...base,
						type,
						limit: typeof qr['limit'] === 'number' ? qr['limit'] : undefined,
						placeholder: qr['placeholder'] === undefined ? undefined : asString(qr['placeholder'])
					} satisfies TextListQuestion;
				case 'country': {
					const skip = asRecord(qr['skipOption']);
					return {
						...base,
						type,
						storage: qr['storage'] === undefined ? undefined : asString(qr['storage']),
						skipOption:
							typeof skip['id'] === 'string'
								? { id: skip['id'] as string, label: asString(skip['label']) }
								: undefined
					} satisfies CountryQuestion;
				}
				default:
					return { ...base, type, options } satisfies UnknownQuestion;
			}
		});
		return {
			id: asString(r['id']),
			title: asString(r['title']),
			description: r['description'] === undefined ? undefined : asString(r['description']),
			questions
		} satisfies Section;
	});
	return {
		meta: {
			id: asString(survey['id']),
			editionId: asString(survey['editionId']),
			year: typeof survey['year'] === 'number' ? survey['year'] : 0,
			title: asString(survey['title']),
			hashtag: survey['hashtag'] === undefined ? undefined : asString(survey['hashtag']),
			estimatedMinutes:
				typeof survey['estimatedMinutes'] === 'number' ? survey['estimatedMinutes'] : undefined,
			version: typeof survey['version'] === 'number' ? survey['version'] : 0
		},
		sections
	};
}

// ---------------------------------------------------------------------------
// Lookup + visibility
// ---------------------------------------------------------------------------

export function allQuestions(def: SurveyDef): Question[] {
	return def.sections.flatMap((s) => s.questions);
}

export function getQuestion(def: SurveyDef, id: string): Question | undefined {
	return allQuestions(def).find((q) => q.id === id);
}

export function getSectionOfQuestion(def: SurveyDef, id: string): Section | undefined {
	return def.sections.find((s) => s.questions.some((q) => q.id === id));
}

/**
 * Type guards for templates. Truthful because `parseSurvey()` only ever builds
 * a SingleQuestion (etc.) when the raw type string matches — an UnknownQuestion
 * never carries a known literal type at runtime.
 */
export function isSingle(q: Question): q is SingleQuestion {
	return q.type === 'single';
}
export function isMultiple(q: Question): q is MultipleQuestion {
	return q.type === 'multiple';
}
export function isScale(q: Question): q is ScaleQuestion {
	return q.type === 'scale';
}
export function isNps(q: Question): q is NpsQuestion {
	return q.type === 'nps';
}
export function isText(q: Question): q is TextQuestion {
	return q.type === 'text';
}
export function isTextList(q: Question): q is TextListQuestion {
	return q.type === 'text_list';
}
export function isCountry(q: Question): q is CountryQuestion {
	return q.type === 'country';
}

/** Flatten an answer to comparable id strings for showIf evaluation. */
function answerAsIds(value: AnswerValue | undefined): string[] {
	if (!value || value.kind === 'empty') return [];
	switch (value.kind) {
		case 'single':
			return value.optionId ? [value.optionId] : [];
		case 'multiple':
			return value.optionIds;
		case 'country':
			return value.code ? [value.code] : [];
		case 'number':
			return [String(value.value)];
		case 'text':
			return value.text.trim() ? [value.text.trim()] : [];
		case 'list':
			return value.items.map((i) => i.trim()).filter(Boolean);
	}
}

/**
 * Generic showIf evaluator. `eq` matches a single-valued answer; `includesAny`
 * matches when any selected id is in values. Missing/empty target answer hides.
 */
export function isVisible(question: Question, answers: Answers): boolean {
	const showIf = question.showIf;
	if (!showIf) return true;
	const ids = answerAsIds(answers[showIf.questionId]);
	if (ids.length === 0) return false;
	if (showIf.op === 'eq') return ids.length === 1 && showIf.values.includes(ids[0]);
	return ids.some((id) => showIf.values.includes(id));
}

export function visibleQuestions(section: Section, answers: Answers): Question[] {
	// Includes unknown types on purpose — renderers show the graceful fallback.
	return section.questions.filter((q) => isVisible(q, answers));
}

// ---------------------------------------------------------------------------
// Answers: emptiness + validation (generic, derived from yml attributes)
// ---------------------------------------------------------------------------

export function isAnswered(question: Question, value: AnswerValue | undefined): boolean {
	if (!value || value.kind === 'empty' || !isKnownType(question.type)) return false;
	switch (value.kind) {
		case 'single':
			return value.optionId !== '';
		case 'multiple':
			return value.optionIds.length > 0;
		case 'number':
			return Number.isInteger(value.value);
		case 'text':
			return value.text.trim() !== '';
		case 'list':
			return value.items.some((i) => i.trim() !== '');
		case 'country':
			return value.code !== '';
	}
}

function optionIds(question: SingleQuestion | MultipleQuestion): string[] {
	return question.options.map((o) => o.id);
}

/**
 * Validate one answer. Returns an error message or null (valid).
 * Assumes the question is visible — callers skip hidden questions entirely.
 * Never throws on yml content.
 */
export function validateAnswer(question: Question, value: AnswerValue | undefined): string | null {
	if (!isKnownType(question.type)) return null; // unknown types: nothing to enforce
	const empty = !isAnswered(question, value);
	if (empty) return question.required ? 'This question is required.' : null;
	if (!value || value.kind === 'empty') return null;

	switch (question.type) {
		case 'single': {
			if (value.kind !== 'single') return 'Invalid answer.';
			const q = question as SingleQuestion;
			const listed = optionIds(q).includes(value.optionId);
			const isOther = value.optionId === 'other';
			if (!listed && !(isOther && q.allowOther)) return 'Please choose a valid option.';
			if (isOther && q.allowOther && !value.other?.trim()) {
				return 'Please specify your answer.';
			}
			return null;
		}
		case 'multiple': {
			if (value.kind !== 'multiple') return 'Invalid answer.';
			const q = question as MultipleQuestion;
			const known = optionIds(q);
			for (const id of value.optionIds) {
				const listed = known.includes(id);
				const isOther = id === 'other';
				if (!listed && !(isOther && q.allowOther)) return 'Please choose valid options.';
				if (isOther && q.allowOther && !value.other?.trim()) {
					return 'Please specify your “Other” answer.';
				}
			}
			if (q.limit !== undefined && value.optionIds.length > q.limit) {
				return `Select at most ${q.limit}.`;
			}
			const exclusive = q.exclusiveOptions ?? [];
			const pickedExclusive = value.optionIds.filter((id) => exclusive.includes(id));
			if (pickedExclusive.length > 0 && value.optionIds.length > pickedExclusive.length) {
				const label =
					q.options.find((o) => o.id === pickedExclusive[0])?.label ?? pickedExclusive[0];
				return `“${label}” can’t be combined with other options.`;
			}
			return null;
		}
		case 'scale':
		case 'nps': {
			if (value.kind !== 'number') return 'Invalid answer.';
			const q = question as ScaleQuestion | NpsQuestion;
			if (!Number.isInteger(value.value) || value.value < q.min || value.value > q.max) {
				return `Please pick a value between ${q.min} and ${q.max}.`;
			}
			return null;
		}
		case 'text': {
			if (value.kind !== 'text') return 'Invalid answer.';
			const q = question as TextQuestion;
			if (q.maxLength !== undefined && value.text.length > q.maxLength) {
				return `Keep it under ${q.maxLength} characters.`;
			}
			return null;
		}
		case 'text_list': {
			if (value.kind !== 'list') return 'Invalid answer.';
			const q = question as TextListQuestion;
			const items = value.items.map((i) => i.trim()).filter(Boolean);
			if (q.limit !== undefined && items.length > q.limit) {
				return `At most ${q.limit} entries.`;
			}
			return null;
		}
		case 'country': {
			if (value.kind !== 'country') return 'Invalid answer.';
			return null;
		}
		default:
			return null;
	}
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

export function computeCompletion(def: SurveyDef, answers: Answers): number {
	const visible = allQuestions(def).filter((q) => isKnownType(q.type) && isVisible(q, answers));
	if (visible.length === 0) return 100;
	const answered = visible.filter((q) => isAnswered(q, answers[q.id])).length;
	return Math.round((answered / visible.length) * 100);
}

/** A section counts as complete when all its visible, known, required questions are answered. */
export function isSectionComplete(section: Section, answers: Answers): boolean {
	return section.questions
		.filter((q) => isKnownType(q.type) && isVisible(q, answers) && q.required)
		.every((q) => isAnswered(q, answers[q.id]));
}

/**
 * Answered share of a section (0–100, visible known questions only).
 * Unlike isSectionComplete this counts optional questions too — used for progress display.
 */
export function sectionCompletion(section: Section, answers: Answers): number {
	const { answered, total } = sectionAnswerCounts(section, answers);
	if (total === 0) return 100;
	return Math.round((answered / total) * 100);
}

export function sectionAnswerCounts(
	section: Section,
	answers: Answers
): { answered: number; total: number } {
	const visible = section.questions.filter((q) => isKnownType(q.type) && isVisible(q, answers));
	return {
		answered: visible.filter((q) => isAnswered(q, answers[q.id])).length,
		total: visible.length
	};
}

// ---------------------------------------------------------------------------
// Lint (structural + referential integrity; powers `pnpm survey:lint`)
// ---------------------------------------------------------------------------

export function lintSurvey(def: SurveyDef): LintIssue[] {
	const issues: LintIssue[] = [];
	const err = (message: string) => issues.push({ level: 'error', message });
	const warn = (message: string) => issues.push({ level: 'warning', message });

	if (!def.meta.id) err('survey.id is missing');
	if (!def.meta.editionId) err('survey.editionId is missing');
	if (!def.meta.title) err('survey.title is missing');
	if (!def.meta.version) err('survey.version is missing (recorded per response)');

	const sectionIds = new Set<string>();
	const questionIds = new Map<string, string>(); // id -> section id
	for (const section of def.sections) {
		if (!section.id) err('a section is missing its id');
		else if (sectionIds.has(section.id)) err(`duplicate section id: ${section.id}`);
		else sectionIds.add(section.id);
		if (!section.title) warn(`section ${section.id || '(?)'} has no title`);

		for (const q of section.questions) {
			const where = `question ${q.id || '(?)'} (section ${section.id})`;
			if (!q.id) {
				err(`a question in section ${section.id} is missing its id`);
				continue;
			}
			if (questionIds.has(q.id)) {
				err(`duplicate question id: ${q.id} (sections ${questionIds.get(q.id)}, ${section.id})`);
			} else questionIds.set(q.id, section.id);
			if (!q.prompt) warn(`${where} has no prompt`);

			if (!isKnownType(q.type)) {
				err(`${where} has unknown type "${q.type}" (no renderer registered)`);
				continue;
			}

			if (q.type === 'single' || q.type === 'multiple') {
				const opts = q.options ?? [];
				if (opts.length === 0) err(`${where} (${q.type}) has no options`);
				const seen = new Set<string>();
				for (const o of opts) {
					if (seen.has(o.id)) err(`${where} has duplicate option id: ${o.id}`);
					else seen.add(o.id);
					if (!o.label) warn(`${where} option ${o.id} has an empty label`);
				}
				if (q.type === 'multiple') {
					if (q.limit !== undefined && (!Number.isInteger(q.limit) || q.limit < 1)) {
						err(`${where} has invalid limit: ${q.limit}`);
					}
					for (const ex of q.exclusiveOptions ?? []) {
						if (!seen.has(ex)) err(`${where} exclusiveOptions references unknown option: ${ex}`);
					}
				}
			}

			if (q.type === 'scale' || q.type === 'nps') {
				const min = q.min ?? NaN;
				const max = q.max ?? NaN;
				if (!Number.isInteger(min) || !Number.isInteger(max) || min >= max) {
					err(`${where} has invalid min/max: ${q.min}..${q.max}`);
				}
				for (const key of Object.keys(q.type === 'scale' ? (q.labels ?? {}) : {})) {
					const n = Number(key);
					if (!Number.isInteger(n) || n < min || n > max) {
						warn(`${where} has a label outside min..max: ${key}`);
					}
				}
			}

			if (q.type === 'text' && q.maxLength !== undefined && q.maxLength < 1) {
				err(`${where} has invalid maxLength: ${q.maxLength}`);
			}
			if (
				q.type === 'text_list' &&
				q.limit !== undefined &&
				(!Number.isInteger(q.limit) || q.limit < 1)
			) {
				err(`${where} has invalid limit: ${q.limit}`);
			}

			if (q.showIf) {
				const target = allQuestions(def).find((t) => t.id === q.showIf!.questionId);
				if (!target) {
					err(`${where} showIf references unknown question: ${q.showIf.questionId}`);
				} else {
					if (q.showIf.op !== 'eq' && q.showIf.op !== 'includesAny') {
						err(`${where} showIf has unknown op: ${q.showIf.op}`);
					}
					if (q.showIf.values.length === 0) err(`${where} showIf has empty values`);
					if (target.type === 'single' || target.type === 'multiple') {
						const targetOpts = new Set((target.options ?? []).map((o) => o.id));
						for (const v of q.showIf.values) {
							if (!targetOpts.has(v) && v !== 'other') {
								err(`${where} showIf value "${v}" is not an option of ${target.id}`);
							}
						}
					}
				}
			}
		}
	}
	return issues;
}
