<script lang="ts">
	import { page } from '$app/state';
	import Logo from '$lib/components/brand/Logo.svelte';
	import AuthCard from '$lib/components/auth/AuthCard.svelte';
	import WaitlistCard from '$lib/components/waitlist/WaitlistCard.svelte';
	import Seo from '$lib/components/head/Seo.svelte';
	import type { PageServerData } from './$types';

	let { data }: { data: PageServerData } = $props();
</script>

<Seo title="State of Omarchy 2026 — Take the survey" origin={page.url.origin} />

<div class="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-12">
	<Logo />
	{#if data.launched}
		<AuthCard next={data.next} />
	{:else}
		<WaitlistCard />
	{/if}
</div>
