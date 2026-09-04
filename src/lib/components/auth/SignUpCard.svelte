<script>
	import {
		Card,
		CardHeader,
		CardDescription,
		CardContent,
		CardFooter
	} from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Field, FieldContent } from '$lib/components/ui/field';
	import WhyNeedAccount from '$lib/components/dialogs/WhyNeedAccount.svelte';

	let email = $state('');
</script>

<Card class="w-full max-w-md bg-transparent">
	<CardHeader class="text-center">
		<CardDescription>
			Participate in the State of Omarchy 2026 survey by making an account.
		</CardDescription>
	</CardHeader>
	<CardContent>
		<Field>
			<FieldContent>
				<Label for="email" class="sr-only">Email address</Label>
				<Input
					id="email"
					type="email"
					placeholder="you@example.com"
					bind:value={email}
					class="w-full"
					autocomplete="email"
				/>
			</FieldContent>
		</Field>
		<div class="mt-4 flex justify-center">
			<WhyNeedAccount />
		</div>
	</CardContent>
	<CardFooter class="flex justify-center">
		<Button type="submit" class="w-full max-w-xs" disabled={!email}>Send magic link</Button>
	</CardFooter>
</Card>
