import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getSafeNext } from '$lib/utils';

export const load: PageServerLoad = async ({ locals, url }) => {
	const next = getSafeNext(url.searchParams.get('next'));
	if (locals.user) {
		redirect(302, next);
	}
	return { next };
};
