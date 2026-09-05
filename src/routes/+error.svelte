<script lang="ts">
	import { page } from '$app/state';
	import Logo from '$lib/components/brand/Logo.svelte';
	import Seo from '$lib/components/head/Seo.svelte';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';

	const isNotFound = $derived(page.status === 404);
	const title = $derived(isNotFound ? 'Page not found' : 'Something went wrong');
	const description = $derived(
		isNotFound
			? 'This page doesn’t exist.'
			: 'An unexpected error occurred. Your saved answers are safe — try going back.'
	);
</script>

<Seo title={`${page.status} — State of Omarchy 2026`} origin={page.url.origin} />

<div class="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-12">
	<Card class="w-full max-w-md bg-transparent">
		<CardHeader class="text-center">
			<p class="font-mono text-sm text-muted-foreground" aria-hidden="true">{page.status}</p>
			<CardTitle>{title}</CardTitle>
			<CardDescription>{description}</CardDescription>
		</CardHeader>
		<CardContent class="flex justify-center gap-3">
			<Button href="/" variant="outline">Home</Button>
			<Button href="/survey">Back to survey</Button>
		</CardContent>
	</Card>
</div>
