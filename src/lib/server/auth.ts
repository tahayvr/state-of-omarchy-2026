import { env } from '$env/dynamic/private';
import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { emailOTP, magicLink } from 'better-auth/plugins';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { sendSignInEmail, stashSignInOtp, takeStashedSignInOtp } from '$lib/server/email';

export const auth = betterAuth({
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'sqlite' }),
	plugins: [
		emailOTP({
			expiresIn: 900, // 15 minutes, matches the magic link
			allowedAttempts: 3,
			async sendVerificationOTP({ email, otp, type }) {
				// Only 'sign-in' is ever triggered (no password flows exist).
				// Stash instead of sending: the magic-link sender bundles
				// link + code into a single email below.
				if (type === 'sign-in') stashSignInOtp(email, otp);
			}
		}),
		magicLink({
			expiresIn: 900, // 15 minutes
			disableSignUp: false, // auto-create user on first verified click
			sendMagicLink: async ({ email, url }) => {
				// Mint an OTP in the same request so one email offers both:
				// click the link OR type the code. Both verify independently.
				await auth.api.sendVerificationOTP({ body: { email, type: 'sign-in' } });
				const otp = takeStashedSignInOtp(email);
				await sendSignInEmail({ to: email, url, otp });
			}
		}),
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	],
	rateLimit: { enabled: true },
	trustedOrigins: env.ORIGIN ? [env.ORIGIN] : []
});
