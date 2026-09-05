<script lang="ts">
	import { Slider } from '$lib/components/ui/slider';
	import type { AnswerValue, NpsQuestion, ScaleQuestion } from '$lib/surveys/definition';

	let {
		question,
		value,
		onChange,
		disabled = false
	}: {
		question: ScaleQuestion | NpsQuestion;
		value: AnswerValue | undefined;
		onChange: (v: AnswerValue) => void;
		disabled?: boolean;
	} = $props();

	const min = $derived(question.min ?? (question.type === 'nps' ? 0 : 1));
	const max = $derived(question.max ?? 5);
	const current = $derived(value?.kind === 'number' ? value.value : undefined);
	const labels = $derived(question.type === 'scale' ? (question.labels ?? {}) : {});
	const npsBand = $derived(
		question.type === 'nps' && current !== undefined
			? current <= 6
				? 'Detractor'
				: current <= 8
					? 'Passive'
					: 'Promoter'
			: null
	);
</script>

<div class="space-y-2">
	<div class="flex items-center gap-4">
		<Slider
			type="single"
			value={current ?? min}
			onValueChange={(v) => onChange({ kind: 'number', value: v })}
			{min}
			{max}
			step={1}
			{disabled}
			aria-labelledby={`q-${question.id}`}
			class="flex-1"
		/>
		<span class="w-16 shrink-0 text-center text-sm font-medium tabular-nums" aria-live="polite">
			{current ?? '–'}
		</span>
	</div>
	<div class="flex justify-between text-xs text-muted-foreground">
		<span>{labels[String(min)] ?? min}</span>
		{#if npsBand}
			<span aria-live="polite">{npsBand}</span>
		{/if}
		<span>{labels[String(max)] ?? max}</span>
	</div>
</div>
