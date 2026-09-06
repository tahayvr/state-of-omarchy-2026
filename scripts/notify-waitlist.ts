/// <reference types="node" />
// pnpm notify:waitlist - sends the launch email to every unnotified waitlist address.
// Run once on launch day, after SURVEY_LAUNCHED=true is deployed.
//
// This runs under plain tsx (not Vite), so it can't use the $lib/$env SvelteKit
// aliases — it builds its own DB client and Resend call directly instead of
// importing src/lib/server/db or src/lib/server/email.ts. Uses `node --env-file`
// (wired up via the notify:waitlist package.json script) to load .env.
//
// Not covered by `pnpm check` either: SvelteKit's generated tsconfig only includes
// src/** and test(s)/**, not scripts/** (same as the pre-existing survey-lint.ts).
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { eq, isNull } from 'drizzle-orm';
import { Resend } from 'resend';
import { waitlistSignups } from '../src/lib/server/db/waitlist.schema';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not set');

const client = createClient({ url: databaseUrl, authToken: process.env.DATABASE_AUTH_TOKEN });
const db = drizzle(client);

const origin = process.env.ORIGIN ?? 'https://stateofomarchy.com';
const from = process.env.RESEND_FROM ?? 'State of Omarchy <onboarding@resend.dev>';
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function sendLaunchEmail(to: string): Promise<void> {
	const url = `${origin}/`;
	if (!resend) {
		console.log(`  [dry-run, no RESEND_API_KEY] would email ${to}: ${url}`);
		return;
	}
	const { error } = await resend.emails.send({
		from,
		to,
		subject: 'The State of Omarchy 2026 survey is live',
		text: `The State of Omarchy 2026 survey is open.\n\nTake it here:\n${url}`,
		html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
			<h2 style="margin:0 0 12px">The survey is live</h2>
			<p style="color:#555">Thanks for waiting — the State of Omarchy 2026 survey is open now.</p>
			<a href="${url}" style="display:inline-block;background:#000;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0">Take the survey</a>
		</div>`
	});
	if (error) throw new Error(error.message);
}

const pending = await db.select().from(waitlistSignups).where(isNull(waitlistSignups.notifiedAt));
console.log(`${pending.length} address(es) to notify.\n`);

let sent = 0;
let failed = 0;
for (const row of pending) {
	try {
		await sendLaunchEmail(row.email);
		await db
			.update(waitlistSignups)
			.set({ notifiedAt: new Date() })
			.where(eq(waitlistSignups.id, row.id));
		sent++;
	} catch (e) {
		failed++;
		console.error(`  FAILED ${row.email}:`, e instanceof Error ? e.message : e);
	}
}

console.log(`\n${sent} sent, ${failed} failed${failed > 0 ? ' (re-run to retry failures)' : ''}.`);
process.exit(failed > 0 ? 1 : 0);
