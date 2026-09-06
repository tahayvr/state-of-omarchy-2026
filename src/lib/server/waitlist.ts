import { db } from '$lib/server/db';
import { waitlistSignups } from '$lib/server/db/schema';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
	return EMAIL_RE.test(value.trim());
}

export interface JoinResult {
	alreadyJoined: boolean;
}

/** Idempotent: re-submitting an address already on the list is a normal case, not an error. */
export async function joinWaitlist(rawEmail: string, source?: string | null): Promise<JoinResult> {
	const email = rawEmail.trim().toLowerCase();
	const inserted = await db
		.insert(waitlistSignups)
		.values({ email, source: source ?? null })
		.onConflictDoNothing({ target: waitlistSignups.email })
		.returning({ id: waitlistSignups.id });
	return { alreadyJoined: inserted.length === 0 };
}
