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
	import { fly } from 'svelte/transition';
	import { MediaQuery } from 'svelte/reactivity';
	import RiHeartLine from 'remixicon-svelte/icons/heart-line';
	import RiTShirtLine from 'remixicon-svelte/icons/t-shirt-line';
	import RiArrowRightUpLine from 'remixicon-svelte/icons/arrow-right-up-line';
	import type { PageServerData } from './$types';

	let { data }: { data: PageServerData } = $props();

	const reducedMotion = new MediaQuery('(prefers-reduced-motion: reduce)');
	const cardEnter = $derived(
		reducedMotion.current ? { duration: 0 } : { y: 12, duration: 300, delay: 80 }
	);
	const ctaEnter = $derived(
		reducedMotion.current ? { duration: 0 } : { y: 12, duration: 300, delay: 200 }
	);

	const cta = [
		{
			href: 'https://donate.omarchy.org',
			icon: RiHeartLine,
			title: 'Become a Patron of Omarchy'
		},
		{
			href: 'https://supply.37signals.com/collections/omarchy',
			icon: RiTShirtLine,
			title: 'Get Omarchy Merch'
		}
	];

	const shareText = $derived(
		`I just completed the ${data.editionTitle} ${data.editionYear} survey! ${page.url.origin} #StateOfOmarchy`
	);
	const xUrl = $derived(`https://x.com/intent/post?text=${encodeURIComponent(shareText)}`);
</script>

<Seo title="Thanks — State of Omarchy 2026" origin={page.url.origin} />

<div
	class="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center gap-6 px-4 py-12"
>
	<div class="w-full" in:fly={cardEnter}>
		<Card class="w-full bg-transparent">
			<CardHeader class="text-center">
				<CardTitle>You're in the record books</CardTitle>
				<CardDescription>
					{data.answered} answers now locked in for {data.email}. thanks for taking the time.
				</CardDescription>
			</CardHeader>
			<CardContent class="flex flex-col items-center gap-4">
				<div class="flex flex-wrap items-center justify-center gap-2">
					<Button href={xUrl} target="_blank" rel="noopener" size="sm">Share on X</Button>
				</div>
				<p class="text-center text-xs text-muted-foreground">
					We're crunching every response into a proper results site. watch for the announcement when
					it's live.
				</p>
				<Button href="/" variant="ghost" size="sm">Back home</Button>
			</CardContent>
		</Card>
	</div>

	<div class="grid w-full gap-3 sm:grid-cols-2" in:fly={ctaEnter}>
		<!-- External links, not part of app routing — resolve() doesn't apply. -->
		<!-- eslint-disable svelte/no-navigation-without-resolve -->
		{#each cta as item (item.href)}
			<a
				href={item.href}
				target="_blank"
				rel="noopener"
				class="group flex items-center gap-3 rounded-lg border border-border/60 bg-card/50 p-4 transition-colors hover:border-primary/40"
			>
				<span
					class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
				>
					<item.icon class="size-5" aria-hidden="true" />
				</span>
				<p class="flex-1 text-sm font-medium">{item.title}</p>
				<RiArrowRightUpLine
					class="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
					aria-hidden="true"
				/>
			</a>
		{/each}
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
	</div>
</div>
