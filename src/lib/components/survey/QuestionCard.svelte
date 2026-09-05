<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { FieldDescription } from '$lib/components/ui/field';
	import type { Question } from '$lib/surveys/definition';
	import type { Snippet } from 'svelte';

	let {
		question,
		error,
		children
	}: { question: Question; error?: string | null; children: Snippet } = $props();
</script>

<fieldset class="space-y-3 rounded-lg border border-transparent py-2">
	<legend class="flex flex-wrap items-center gap-2 text-sm font-medium">
		<span id={`q-${question.id}`}>{question.prompt || '(Untitled question)'}</span>
		{#if question.required}
			<Badge variant="secondary">Required</Badge>
		{/if}
	</legend>
	{@render children()}
	{#if error}
		<FieldDescription class="text-destructive" role="alert">{error}</FieldDescription>
	{/if}
</fieldset>
