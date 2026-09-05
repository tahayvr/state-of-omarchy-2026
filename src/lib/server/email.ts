import { env } from '$env/dynamic/private';
import { Resend } from 'resend';

const from = env.RESEND_FROM ?? 'State of Omarchy <onboarding@resend.dev>';

// Short-lived stash so the magic-link sender can bundle the OTP into ONE email.
// Writer and reader are always the same request (sendMagicLink awaits the OTP
// creation before composing), so a process-local map is safe here. Worst case
// on concurrent same-email requests is an orphaned OTP that expires unused —
// never a bad login, since every token is independently valid.
const pendingOtps = new Map<string, { otp: string; expires: number }>();

export function stashSignInOtp(email: string, otp: string, ttlMs = 60_000) {
	pendingOtps.set(email.toLowerCase(), { otp, expires: Date.now() + ttlMs });
}

export function takeStashedSignInOtp(email: string): string | null {
	const key = email.toLowerCase();
	const entry = pendingOtps.get(key);
	pendingOtps.delete(key);
	if (!entry || entry.expires < Date.now()) return null;
	return entry.otp;
}

function getResend() {
	if (!env.RESEND_API_KEY) return null;
	return new Resend(env.RESEND_API_KEY);
}

export async function sendSignInEmail({
	to,
	url,
	otp
}: {
	to: string;
	url: string;
	otp: string | null;
}) {
	// Dev fallback: no API key → log everything so the flow stays testable locally.
	if (!getResend()) {
		console.log(`[dev] sign-in for ${to}: link=${url} code=${otp ?? '(none)'}`);
		return;
	}

	const codeBlock = otp
		? `<p style="color:#555">Or enter this code on the sign-in page. It expires in 15 minutes:</p>
		   <p style="font-size:28px;font-weight:bold;letter-spacing:8px;margin:8px 0">${otp}</p>`
		: '';

	const { error } = await getResend()!.emails.send({
		from,
		to,
		subject: 'Sign in to State of Omarchy 2026',
		text: `Sign in to the State of Omarchy 2026 survey.\n\nClick this link (expires in 15 minutes, single use):\n${url}\n\n${otp ? `Or enter this code on the sign-in page:\n${otp}\n\n` : ''}If you didn't request this, you can ignore this email.`,
		html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
			<h2 style="margin:0 0 12px">Sign in to State of Omarchy 2026</h2>
			<p style="color:#555">Click the button below to sign in to the survey. The link expires in 15 minutes and can only be used once.</p>
			<a href="${url}" style="display:inline-block;background:#000;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0">Sign in to the survey</a>
			${codeBlock}
			<p style="color:#888;font-size:12px">If you didn't request this, you can safely ignore this email.</p>
		</div>`
	});

	if (error) {
		console.error('Failed to send sign-in email:', error);
		throw new Error('Failed to send sign-in email. Please try again.');
	}
}
