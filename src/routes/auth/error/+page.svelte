<script lang="ts">
	import { page } from '$app/state';
	import Logo from '$lib/components/brand/Logo.svelte';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';

	const error = $derived(page.url.searchParams.get('error'));
	const title = $derived(
		error === 'INVALID_TOKEN'
			? 'This link has already been used'
			: error === 'EXPIRED_TOKEN' || error === 'EXPIRED'
				? 'This link has expired'
				: 'Something went wrong'
	);
	const description = $derived(
		error === 'INVALID_TOKEN'
			? 'Magic links work only once. Request a fresh one below.'
			: error === 'EXPIRED_TOKEN' || error === 'EXPIRED'
				? 'Magic links expire after 15 minutes. Request a fresh one below.'
				: 'Your sign-in link was invalid. Request a fresh one below.'
	);
</script>

<div class="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-12">
	<Logo />
	<Card class="w-full max-w-md bg-transparent">
		<CardHeader class="text-center">
			<CardTitle>{title}</CardTitle>
			<CardDescription>{description}</CardDescription>
		</CardHeader>
		<CardContent class="flex justify-center">
			<Button href="/" class="w-full max-w-xs">Get a new sign-in link</Button>
		</CardContent>
	</Card>
</div>
