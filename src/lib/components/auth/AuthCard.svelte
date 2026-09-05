<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import {
		Card,
		CardHeader,
		CardDescription,
		CardContent,
		CardFooter
	} from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import {
		InputOTP,
		InputOTPGroup,
		InputOTPSeparator,
		InputOTPSlot
	} from '$lib/components/ui/input-otp';
	import { Field, FieldContent, FieldDescription } from '$lib/components/ui/field';
	import WhyNeedAccount from '$lib/components/dialogs/WhyNeedAccount.svelte';

	let { next = '/survey' }: { next?: string } = $props();

	let email = $state('');
	let code = $state('');
	let status = $state<'idle' | 'sending' | 'sent' | 'verifying' | 'error'>('idle');
	let errorMessage = $state('');

	async function sendLink(event: SubmitEvent) {
		event.preventDefault();
		if (!email || status === 'sending') return;
		status = 'sending';
		errorMessage = '';
		const { error } = await authClient.signIn.magicLink({
			email: email.trim(),
			callbackURL: next,
			newUserCallbackURL: next,
			errorCallbackURL: '/auth/error'
		});
		if (error) {
			status = 'error';
			errorMessage = error.message ?? 'Could not send the sign-in email. Please try again.';
		} else {
			status = 'sent';
		}
	}

	async function verifyCode(eventOrValue?: SubmitEvent | string) {
		if (typeof eventOrValue !== 'string') eventOrValue?.preventDefault();
		const otp = typeof eventOrValue === 'string' ? eventOrValue : code;
		if (otp.trim().length < 6 || status === 'verifying') return;
		status = 'verifying';
		errorMessage = '';
		try {
			const { error } = await authClient.signIn.emailOtp({
				email: email.trim(),
				otp: otp.trim()
			});
			if (error) {
				status = 'sent';
				code = '';
				errorMessage = error.message ?? 'That code didn’t work. Try again, or use the link.';
			} else {
				// Full navigation (not goto) so every server load re-runs with the new session cookie.
				window.location.assign(next);
			}
		} catch (e) {
			console.error('Code sign-in failed:', e);
			status = 'sent';
			code = '';
			errorMessage = 'Something went wrong signing in. Please try again.';
		}
	}

	function editEmail() {
		status = 'idle';
		errorMessage = '';
		code = '';
	}
</script>

<Card class="w-full max-w-md bg-transparent">
	<CardHeader class="text-center">
		<CardDescription>
			Participate in the State of Omarchy 2026 survey by making an account.
		</CardDescription>
	</CardHeader>
	<CardContent>
		{#if status === 'sent' || status === 'verifying'}
			<div class="space-y-4 text-center">
				<p class="text-sm font-medium">Check your inbox</p>
				<FieldDescription>
					We emailed <span class="font-medium text-foreground">{email}</span> a sign-in link and a 6-digit
					code. Use either one — both expire in 15 minutes.
				</FieldDescription>
				<form onsubmit={verifyCode} class="space-y-3">
					<Field>
						<FieldContent class="items-center">
							<Label for="code" class="sr-only">6-digit code</Label>
							<InputOTP
								id="code"
								maxlength={6}
								bind:value={code}
								disabled={status === 'verifying'}
								onComplete={(value) => verifyCode(value)}
							>
								{#snippet children({ cells })}
									<InputOTPGroup>
										{#each cells.slice(0, 3) as cell, i (i)}
											<InputOTPSlot {cell} />
										{/each}
									</InputOTPGroup>
									<InputOTPSeparator />
									<InputOTPGroup>
										{#each cells.slice(3, 6) as cell, i (i)}
											<InputOTPSlot {cell} />
										{/each}
									</InputOTPGroup>
								{/snippet}
							</InputOTP>
						</FieldContent>
						{#if errorMessage}
							<FieldDescription class="text-destructive">{errorMessage}</FieldDescription>
						{/if}
					</Field>
					<Button
						type="submit"
						class="w-full"
						disabled={code.trim().length < 6 || status === 'verifying'}
					>
						{status === 'verifying' ? 'Signing in…' : 'Sign in with code'}
					</Button>
				</form>
				<Button variant="link" onclick={editEmail}>Use a different email</Button>
			</div>
		{:else}
			<form onsubmit={sendLink}>
				<Field>
					<FieldContent>
						<Label for="email" class="sr-only">Email address</Label>
						<Input
							id="email"
							type="email"
							name="email"
							required
							placeholder="you@example.com"
							bind:value={email}
							class="w-full"
							autocomplete="email"
							disabled={status === 'sending'}
						/>
					</FieldContent>
					{#if status === 'error'}
						<FieldDescription class="text-destructive">{errorMessage}</FieldDescription>
					{/if}
				</Field>
				<div class="mt-4">
					<Button type="submit" class="w-full" disabled={!email.trim() || status === 'sending'}>
						{status === 'sending' ? 'Sending…' : 'Send sign-in email'}
					</Button>
				</div>
			</form>
			<div class="mt-4 flex justify-center">
				<WhyNeedAccount />
			</div>
		{/if}
	</CardContent>
	{#if status === 'idle' || status === 'error'}
		<CardFooter class="flex justify-center">
			<p class="text-xs text-muted-foreground">No password needed — link or code signs you in.</p>
		</CardFooter>
	{/if}
</Card>
