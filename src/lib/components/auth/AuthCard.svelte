<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
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
	let resending = $state(false);
	let resendIn = $state(0);
	let resendTimer: ReturnType<typeof setInterval> | null = null;

	function startCooldown(seconds = 20) {
		if (resendTimer) clearInterval(resendTimer);
		resendIn = seconds;
		resendTimer = setInterval(() => {
			resendIn -= 1;
			if (resendIn <= 0 && resendTimer) {
				clearInterval(resendTimer);
				resendTimer = null;
			}
		}, 1000);
	}

	function stopCooldown() {
		if (resendTimer) {
			clearInterval(resendTimer);
			resendTimer = null;
		}
		resendIn = 0;
	}

	/** Mints a fresh link + code. Returns an error message, or null on success. */
	async function requestEmail(): Promise<string | null> {
		const { error } = await authClient.signIn.magicLink({
			email: email.trim(),
			callbackURL: next,
			newUserCallbackURL: next,
			errorCallbackURL: '/auth/error'
		});
		if (error) return error.message ?? 'Could not send the sign-in email. Please try again.';
		return null;
	}

	async function sendLink(event: SubmitEvent) {
		event.preventDefault();
		if (!email || status === 'sending') return;
		status = 'sending';
		errorMessage = '';
		const problem = await requestEmail();
		if (problem) {
			status = 'error';
			errorMessage = problem;
		} else {
			status = 'sent';
			startCooldown();
		}
	}

	async function resend() {
		if (resendIn > 0 || resending || status === 'verifying') return;
		resending = true;
		errorMessage = '';
		try {
			const problem = await requestEmail();
			if (problem) {
				errorMessage = problem;
			} else {
				code = '';
				startCooldown();
			}
		} catch (e) {
			console.error('Resend failed:', e);
			errorMessage = 'Could not resend. Please try again.';
		} finally {
			resending = false;
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
		stopCooldown();
	}
</script>

<Card class="w-full max-w-md bg-transparent">
	{#if status === 'idle' || status === 'error'}
		<CardHeader class="text-center">
			<CardTitle>Shape where Omarchy goes next</CardTitle>
		</CardHeader>
	{/if}
	<CardContent>
		{#if status === 'sent' || status === 'verifying'}
			<div class="space-y-4 text-center">
				<p class="text-sm font-medium">Check your inbox</p>
				<FieldDescription>
					We sent <span class="font-medium text-foreground">{email}</span> a link and a 6-digit code —
					either works, both expire in 15 minutes.
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
				<div class="flex flex-col items-center gap-1">
					<div class="flex items-center gap-1 text-sm">
						<span class="text-muted-foreground">Didn't get it?</span>
						<Button
							variant="link"
							class="h-auto p-0 text-sm"
							onclick={resend}
							disabled={resendIn > 0 || resending}
						>
							{resending
								? 'Resending…'
								: resendIn > 0
									? `Send again in ${resendIn}s`
									: 'Send email again'}
						</Button>
					</div>
					<Button variant="link" onclick={editEmail}>Use a different email</Button>
				</div>
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
	<!-- {#if status === 'idle' || status === 'error'}
		<CardFooter class="flex justify-center">
			<p class="text-xs text-muted-foreground">No password needed — link or code signs you in.</p>
		</CardFooter>
	{/if} -->
</Card>
