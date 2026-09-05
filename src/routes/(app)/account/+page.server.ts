import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();
	return { user };
};

export const actions: Actions = {
	signOut: async (event) => {
		await auth.api.signOut({ headers: event.request.headers });
		redirect(302, '/');
	}
};
