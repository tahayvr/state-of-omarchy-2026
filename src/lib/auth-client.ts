import { createAuthClient } from 'better-auth/svelte';
import { emailOTPClient, magicLinkClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
	plugins: [magicLinkClient(), emailOTPClient()]
});
