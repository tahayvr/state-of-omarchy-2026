import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { CURRENT_EDITION, loadSurvey } from '$lib/surveys/loader';
import { getAnswerRows, getResponseByUser, rowsToAnswers } from '$lib/server/survey-answers';
import { computeCompletion } from '$lib/surveys/definition';

export const load: PageServerLoad = async (event) => {
	const user = event.locals.user;
	if (!user) {
		redirect(302, `/?next=${encodeURIComponent('/survey/done')}`);
	}
	const def = loadSurvey(CURRENT_EDITION);
	const response = await getResponseByUser(def.meta.editionId, user.id);
	if (!response || !response.submittedAt) {
		redirect(302, '/survey');
	}
	const answers = rowsToAnswers(def, await getAnswerRows(response.id));
	return {
		email: user.email,
		answered: Object.keys(answers).length,
		completion: computeCompletion(def, answers)
	};
};
