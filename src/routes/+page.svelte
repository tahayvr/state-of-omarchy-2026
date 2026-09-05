<script lang="ts">
	import Logo from '$lib/components/brand/Logo.svelte';
	import AuthCard from '$lib/components/auth/AuthCard.svelte';
	import type { PageServerData } from './$types';

	let { data }: { data: PageServerData } = $props();
</script>

<div class="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-12">
	<Logo />
	<AuthCard next={data.next} />
</div>
