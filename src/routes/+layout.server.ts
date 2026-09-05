import type { LayoutServerLoad } from './$types';
import { CURRENT_EDITION, loadSurvey } from '$lib/surveys/loader';
import { getResponseByUser } from '$lib/server/survey-answers';

export const load: LayoutServerLoad = async ({ locals }) => {
	const user = locals.user ?? null;
	if (!user) return { user, surveyStatus: null };

	// One indexed row lookup; null when the user hasn't started this edition.
	const response = await getResponseByUser(loadSurvey(CURRENT_EDITION).meta.editionId, user.id);
	return {
		user,
		surveyStatus: response
			? {
					submitted: response.submittedAt !== null,
					completion: response.completion ?? 0
				}
			: null
	};
};
