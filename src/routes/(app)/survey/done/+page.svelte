<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import Seo from '$lib/components/head/Seo.svelte';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import type { PageServerData } from './$types';

	let { data }: { data: PageServerData } = $props();

	const shareText = $derived(
		`I just completed the ${data.editionTitle} ${data.editionYear} survey! ${page.url.origin} #StateOfOmarchy`
	);
	const xUrl = $derived(`https://x.com/intent/post?text=${encodeURIComponent(shareText)}`);
</script>

<Seo title="Thanks — State of Omarchy 2026" origin={page.url.origin} />

<div
	class="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center gap-6 px-4 py-12"
>
	<Card class="w-full bg-transparent">
		<CardHeader class="text-center">
			<CardTitle>Thanks for completing the survey!</CardTitle>
			<CardDescription>
				{data.answered} answers recorded for {data.email}. Your response is locked in.
			</CardDescription>
		</CardHeader>
		<CardContent class="flex flex-col items-center gap-4">
			<div class="flex flex-wrap items-center justify-center gap-2">
				<Button href={xUrl} target="_blank" rel="noopener" size="sm">Share on X</Button>
			</div>
			<p class="text-center text-xs text-muted-foreground">
				Results will be published later on a separate site — watch for the announcement.
			</p>
			<Button href="/" variant="ghost" size="sm">Back home</Button>
		</CardContent>
	</Card>
</div>
