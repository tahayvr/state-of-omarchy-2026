<script>
	import LogoDark from '$lib/assets/logo/soo-logo-dark.svg';
	import LogoLight from '$lib/assets/logo/soo-logo-light.svg';

	let { size = 'lg', tagline = true } = $props();

	const width = $derived(size === 'sm' ? 'w-48' : 'w-lg');
</script>

<div class="flex-col justify-center gap-2">
	<img
		src={LogoDark}
		alt="State of Omarchy 2026"
		width="652"
		height="251"
		fetchpriority="high"
		class="hidden {width} dark:block"
	/>
	<img
		src={LogoLight}
		alt="State of Omarchy 2026"
		width="652"
		height="251"
		fetchpriority="high"
		class="{width} dark:hidden"
	/>
	{#if tagline}
		<h2 class="mt-2 text-center font-mono text-muted-foreground">
			The yearly survey about
			<a href="https://omarchy.org/" target="_blank" rel="noopener">Omarchy Linux</a>
		</h2>
	{/if}
</div>
