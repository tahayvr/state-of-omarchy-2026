<script lang="ts">
	import './layout.css';
	// import favicon from '$lib/assets/favicon.svg';
	import { ModeWatcher } from 'mode-watcher';
	import ToggleButton from '$lib/components/theme/Toggle.svelte';
	import { Button } from '$lib/components/ui/button';
	import type { LayoutServerData } from './$types';

	let { data, children }: { data: LayoutServerData; children: import('svelte').Snippet } = $props();
</script>

<!-- <svelte:head><link rel="icon" href={favicon} /></svelte:head> -->

<ModeWatcher />
<header class="absolute top-0 right-0 left-0 flex items-center justify-end gap-2 p-4">
	{#if data.user}
		<Button href="/survey" variant="ghost" size="sm">Survey</Button>
		<Button href="/account" variant="ghost" size="sm">{data.user.email}</Button>
	{:else}
		<Button href="/login" variant="ghost" size="sm">Log in</Button>
	{/if}
</header>
<div class="h-full max-h-screen w-full max-w-full">
	{@render children()}
</div>

<div class="fixed right-4 bottom-4">
	<ToggleButton />
</div>
