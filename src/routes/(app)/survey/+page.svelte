<script lang="ts">
	import SurveyShell from '$lib/components/survey/SurveyShell.svelte';
	import type { PageServerData } from './$types';

	let { data }: { data: PageServerData } = $props();
</script>

<SurveyShell def={data.def} initialAnswers={data.answers} />
