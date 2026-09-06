<script lang="ts">
	import { enhance } from '$app/forms';
	import { fly, fade } from 'svelte/transition';
	import { MediaQuery } from 'svelte/reactivity';
	import {
		Card,
		CardHeader,
		CardTitle,
		CardDescription,
		CardContent
	} from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Field, FieldContent, FieldDescription } from '$lib/components/ui/field';

	let email = $state('');
	let status = $state<'idle' | 'submitting' | 'joined' | 'error'>('idle');
	let errorMessage = $state('');
	let alreadyJoined = $state(false);

	// Groups status into the two states the card swaps between, same pattern as AuthCard,
	// so the header and body cross-fade together instead of the title flashing separately.
	const showForm = $derived(status !== 'joined');
	const reducedMotion = new MediaQuery('(prefers-reduced-motion: reduce)');
	const stageEnter = $derived(
		reducedMotion.current ? { duration: 0 } : { y: 8, duration: 220, delay: 80 }
	);
	const stageExit = $derived(reducedMotion.current ? { duration: 0 } : { duration: 120 });
</script>

<Card class="w-full max-w-md bg-transparent">
	{#key showForm}
		{#if showForm}
			<div in:fly={stageEnter} out:fade={stageExit}>
				<CardHeader class="text-center">
					<CardTitle>Don't miss the survey</CardTitle>
					<CardDescription>
						Leave your email. We'll let you know the moment the survey opens.
					</CardDescription>
				</CardHeader>
			</div>
		{/if}
	{/key}
	<CardContent>
		{#key showForm}
			{#if !showForm}
				<div class="space-y-2 text-center" in:fly={stageEnter} out:fade={stageExit}>
					<p class="text-sm font-medium">
						{alreadyJoined ? "You're already on the list" : "You're on the list"}
					</p>
					<FieldDescription class="text-center">
						We'll email <span class="font-medium text-foreground">{email}</span> when survey is live.
					</FieldDescription>
				</div>
			{:else}
				<div in:fly={stageEnter} out:fade={stageExit}>
					<form
						method="POST"
						action="?/join"
						use:enhance={() => {
							status = 'submitting';
							errorMessage = '';
							return async ({ result }) => {
								if (result.type === 'success' && result.data?.success) {
									alreadyJoined = Boolean(result.data.alreadyJoined);
									status = 'joined';
								} else if (result.type === 'failure') {
									status = 'error';
									errorMessage =
										(result.data?.error as string | undefined) ??
										'Something went wrong. Please try again.';
								} else {
									status = 'error';
									errorMessage = 'Something went wrong. Please try again.';
								}
							};
						}}
					>
						<Field>
							<FieldContent>
								<Label for="waitlist-email" class="sr-only">Email address</Label>
								<Input
									id="waitlist-email"
									type="email"
									name="email"
									required
									placeholder="Email"
									bind:value={email}
									class="w-full"
									autocomplete="email"
									disabled={status === 'submitting'}
								/>
							</FieldContent>
							{#if status === 'error'}
								<FieldDescription class="text-destructive">{errorMessage}</FieldDescription>
							{/if}
						</Field>
						<div class="mt-4">
							<Button
								type="submit"
								class="w-full"
								disabled={!email.trim() || status === 'submitting'}
							>
								{status === 'submitting' ? 'Joining…' : 'Notify me'}
							</Button>
						</div>
					</form>
				</div>
			{/if}
		{/key}
	</CardContent>
</Card>
