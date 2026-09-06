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
	const steps = $derived(Array.from({ length: max - min + 1 }, (_, i) => min + i));
	const npsBand = $derived(
		question.type === 'nps' && current !== undefined
			? current <= 6
				? 'Detractor'
				: current <= 8
					? 'Passive'
					: 'Promoter'
			: null
	);
	// Thumb position as a percentage, for the floating value bubble above it.
	const pct = $derived(max > min ? (((current ?? min) - min) / (max - min)) * 100 : 0);
</script>

<div class="space-y-3">
	<div class="pt-7">
		<div class="relative">
			<!-- Floating value bubble, follows the thumb; unanswered shows no bubble. -->
			{#if current !== undefined}
				<div
					class="pointer-events-none absolute bottom-full mb-2 -translate-x-1/2 rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground tabular-nums shadow-sm transition-[left] duration-150"
					style={`left: ${pct}%`}
				>
					{current}
					<span
						class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-primary"
						aria-hidden="true"
					></span>
				</div>
			{/if}
			<!-- Tick marks, one per step, sit on top of the track. -->
			<div
				class="pointer-events-none absolute inset-x-2.5 top-1/2 flex -translate-y-1/2 justify-between"
			>
				{#each steps as n (n)}
					<span
						class={n === (current ?? min) ? 'sr-only' : 'size-1 rounded-full bg-background/70'}
						aria-hidden="true"
					></span>
				{/each}
			</div>
			<Slider
				type="single"
				value={current ?? min}
				onValueChange={(v) => onChange({ kind: 'number', value: v })}
				{min}
				{max}
				step={1}
				{disabled}
				aria-labelledby={`q-${question.id}`}
				aria-valuetext={current !== undefined ? String(current) : undefined}
				class="w-full"
			/>
		</div>
	</div>
	<div
		class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground"
	>
		<span class="max-w-[45%] break-words">
			<span class="font-medium text-foreground">{min}</span>{#if labels[String(min)]}
				<span> — {labels[String(min)]}</span>
			{/if}
		</span>
		{#if npsBand}
			<span class="font-medium text-foreground" aria-live="polite">{npsBand}</span>
		{/if}
		<span class="ml-auto max-w-[45%] text-right break-words">
			<span class="font-medium text-foreground">{max}</span>{#if labels[String(max)]}
				<span> — {labels[String(max)]}</span>
			{/if}
		</span>
	</div>
</div>
