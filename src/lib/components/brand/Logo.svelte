<script>
	import LogoDark from '$lib/assets/logo/soo2026-logo-dark.png';
	import LogoLight from '$lib/assets/logo/soo2026-logo-light.png';
</script>

<div class="flex-col justify-center gap-2">
	<img src={LogoDark} alt="State of Omarchy 2026" class="hidden w-lg dark:block" />
	<img src={LogoLight} alt="State of Omarchy 2026" class="w-lg dark:hidden" />
	<h2 class="mt-2 text-center font-mono text-muted-foreground">
		The yearly survey about <a href="https://omarchy.org/" target="_blank">Omarchy Linux</a>
	</h2>
</div>
