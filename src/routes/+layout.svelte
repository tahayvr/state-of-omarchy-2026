<script lang="ts">
	import './layout.css';
	// import favicon from '$lib/assets/favicon.svg';
	import { ModeWatcher } from 'mode-watcher';
	import ToggleButton from '$lib/components/theme/Toggle.svelte';

	let { children } = $props();
</script>

<!-- <svelte:head><link rel="icon" href={favicon} /></svelte:head> -->

<ModeWatcher />
<div class="h-full max-h-screen w-full max-w-full">
	{@render children()}
</div>

<div class="fixed right-4 bottom-4">
	<ToggleButton />
</div>
