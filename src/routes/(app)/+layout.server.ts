import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { surveyLaunched } from '$lib/server/launch';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!surveyLaunched) {
		redirect(302, '/');
	}
	if (!locals.user) {
		redirect(302, `/?next=${encodeURIComponent(url.pathname)}`);
	}
	return { user: locals.user };
};
