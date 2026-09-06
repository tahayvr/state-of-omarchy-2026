<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { FieldDescription } from '$lib/components/ui/field';
	import type { Question } from '$lib/surveys/definition';
	import type { Snippet } from 'svelte';
	import RiCheckLine from 'remixicon-svelte/icons/check-line';
	import { cn } from '$lib/utils';

	let {
		question,
		error,
		answered = false,
		children
	}: {
		question: Question;
		error?: string | null;
		answered?: boolean;
		children: Snippet;
	} = $props();
</script>

<!--
	A native <legend> can't be trusted with a flex/wrap layout: browsers size it by its
	own shrink-to-fit content width rather than the fieldset's constrained width, so long
	prompts overflow instead of wrapping on narrow screens. Every input renderer already
	sets aria-labelledby={`q-${question.id}`} explicitly, so a plain group div (labelled
	the same way) gives every screen reader the same association without the quirk.
-->
<div
	role="group"
	aria-labelledby={`q-${question.id}`}
	class={cn(
		'space-y-3 rounded-lg border bg-card/50 p-4 transition-colors duration-200',
		error ? 'border-destructive/60' : answered ? 'border-primary/40' : 'border-border/60'
	)}
>
	<div class="flex flex-wrap items-center gap-2 text-sm font-medium">
		{#if answered && !error}
			<RiCheckLine class="size-4 shrink-0 text-primary" aria-hidden="true" />
		{/if}
		<span id={`q-${question.id}`} class="min-w-0 break-words">
			{question.prompt || '(Untitled question)'}
		</span>
		{#if !question.required}
			<Badge variant="outline">Optional</Badge>
		{/if}
	</div>
	{@render children()}
	{#if error}
		<FieldDescription class="text-destructive" role="alert">{error}</FieldDescription>
	{/if}
</div>
