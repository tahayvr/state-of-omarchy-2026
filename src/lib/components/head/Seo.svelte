<script lang="ts">
	/**
	 * Shared head tags. Render exactly once per page with that page's title —
	 * SvelteKit merges nested <svelte:head>, so a second <title> would duplicate.
	 */
	let {
		title,
		description = 'The yearly survey about Omarchy Linux. #StateOfOmarchy',
		image = '/og-image.png',
		origin
	}: {
		title: string;
		description?: string;
		image?: string;
		origin: string;
	} = $props();

	const imageUrl = $derived(image.startsWith('http') ? image : `${origin}${image}`);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="State of Omarchy" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={imageUrl} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={imageUrl} />
</svelte:head>
