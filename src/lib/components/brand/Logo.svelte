<script>
	import LogoDark from '$lib/assets/logo/soo-logo-dark.svg';
	import LogoLight from '$lib/assets/logo/soo-logo-light.svg';
</script>

<div class="flex-col justify-center gap-2">
	<img
		src={LogoDark}
		alt="State of Omarchy 2026"
		width="652"
		height="251"
		fetchpriority="high"
		class="hidden w-lg dark:block"
	/>
	<img
		src={LogoLight}
		alt="State of Omarchy 2026"
		width="652"
		height="251"
		fetchpriority="high"
		class="w-lg dark:hidden"
	/>
	<h2 class="mt-2 text-center font-mono text-muted-foreground">
		The yearly survey about
		<a href="https://omarchy.org/" target="_blank" rel="noopener">Omarchy Linux</a>
	</h2>
</div>
