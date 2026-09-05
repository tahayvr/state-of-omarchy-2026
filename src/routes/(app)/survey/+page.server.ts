import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { CURRENT_EDITION, loadSurvey } from '$lib/surveys/loader';
import {
	getAnswerRows,
	getOrCreateResponse,
	rowsToAnswers,
	saveAnswers,
	submitResponse,
	SurveyInputError
} from '$lib/server/survey-answers';

export const load: PageServerLoad = async (event) => {
	const user = event.locals.user;
	if (!user) {
		redirect(302, `/login?next=${encodeURIComponent('/survey')}`);
	}

	const def = loadSurvey(CURRENT_EDITION);
	const response = await getOrCreateResponse({
		editionId: def.meta.editionId,
		surveyVersion: def.meta.version,
		userId: user.id,
		source: event.url.searchParams.get('src'),
		userAgent: event.request.headers.get('user-agent'),
		locale: event.request.headers.get('accept-language')?.split(',')[0] ?? null
	});
	if (response.submittedAt) {
		redirect(302, '/survey/done');
	}

	return {
		def,
		answers: rowsToAnswers(def, await getAnswerRows(response.id)),
		completion: response.completion ?? 0
	};
};

function parseAnswersField(form: FormData): Record<string, unknown> | null {
	const raw = form.get('answers');
	if (typeof raw !== 'string') return null;
	try {
		const parsed: unknown = JSON.parse(raw);
		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
		return parsed as Record<string, unknown>;
	} catch {
		return null;
	}
}

export const actions: Actions = {
	save: async (event) => {
		const user = event.locals.user;
		if (!user) return fail(401, { issues: {} });
		const def = loadSurvey(CURRENT_EDITION);
		const response = await getOrCreateResponse({
			editionId: def.meta.editionId,
			surveyVersion: def.meta.version,
			userId: user.id
		});
		if (response.submittedAt) return fail(403, { issues: {} });
		const input = parseAnswersField(await event.request.formData());
		if (!input) return fail(400, { issues: {} });
		try {
			const completion = await saveAnswers(response, def, input);
			return { completion };
		} catch (e) {
			if (e instanceof SurveyInputError) return fail(400, { issues: e.issues });
			throw e;
		}
	},

	submit: async (event) => {
		const user = event.locals.user;
		if (!user) return fail(401, { issues: {} });
		const def = loadSurvey(CURRENT_EDITION);
		const response = await getOrCreateResponse({
			editionId: def.meta.editionId,
			surveyVersion: def.meta.version,
			userId: user.id
		});
		try {
			await submitResponse(response, def);
			return { submitted: true };
		} catch (e) {
			if (e instanceof SurveyInputError) return fail(400, { issues: e.issues });
			throw e;
		}
	}
};
