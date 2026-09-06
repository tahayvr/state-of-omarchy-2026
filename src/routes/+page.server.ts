import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getSafeNext } from '$lib/utils';
import { surveyLaunched } from '$lib/server/launch';
import { isValidEmail, joinWaitlist } from '$lib/server/waitlist';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!surveyLaunched) return { launched: false as const, next: null };
	const next = getSafeNext(url.searchParams.get('next'));
	if (locals.user) {
		redirect(302, next);
	}
	return { launched: true as const, next };
};

export const actions: Actions = {
	join: async (event) => {
		const form = await event.request.formData();
		const email = String(form.get('email') ?? '');
		if (!isValidEmail(email)) return fail(400, { error: 'Enter a valid email address.' });
		const { alreadyJoined } = await joinWaitlist(email, event.url.searchParams.get('src'));
		return { success: true, alreadyJoined };
	}
};
