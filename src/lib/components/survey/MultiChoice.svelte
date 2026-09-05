<script lang="ts">
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { FieldDescription } from '$lib/components/ui/field';
	import type { AnswerValue, MultipleQuestion } from '$lib/surveys/definition';

	let {
		question,
		value,
		onChange,
		disabled = false
	}: {
		question: MultipleQuestion;
		value: AnswerValue | undefined;
		onChange: (v: AnswerValue) => void;
		disabled?: boolean;
	} = $props();

	const selected = $derived(value?.kind === 'multiple' ? value.optionIds : []);
	const otherText = $derived(value?.kind === 'multiple' ? (value.other ?? '') : '');
	const exclusive = $derived(question.exclusiveOptions ?? []);
	const options = $derived([
		...question.options,
		...(question.allowOther && !question.options.some((o) => o.id === 'other')
			? [{ id: 'other', label: 'Other' }]
			: [])
	]);
	const atLimit = $derived(question.limit !== undefined && selected.length >= question.limit);
	const showOtherInput = $derived(selected.includes('other') && question.allowOther);

	function toggle(id: string, checked: boolean) {
		let next: string[];
		if (checked) {
			next = exclusive.includes(id)
				? [id] // exclusive pick clears everything else
				: [...selected.filter((s) => !exclusive.includes(s)), id];
		} else {
			next = selected.filter((s) => s !== id);
		}
		onChange({
			kind: 'multiple',
			optionIds: next,
			other: next.includes('other') ? otherText || undefined : undefined
		});
	}
</script>

<div class="space-y-3" role="group" aria-labelledby={`q-${question.id}`}>
	{#if question.limit !== undefined}
		<FieldDescription>
			{selected.length} of {question.limit} selected
		</FieldDescription>
	{/if}
	{#each options as option (option.id)}
		{@const isChecked = selected.includes(option.id)}
		<div class="flex items-center gap-3">
			<Checkbox
				id={`${question.id}-${option.id}`}
				checked={isChecked}
				onCheckedChange={(v) => toggle(option.id, v === true)}
				disabled={disabled || (!isChecked && atLimit)}
			/>
			<Label for={`${question.id}-${option.id}`} class="font-normal">
				{option.label || option.id}
			</Label>
		</div>
	{/each}
</div>
{#if showOtherInput}
	<Input
		placeholder="Please specify"
		value={otherText}
		oninput={(e) =>
			onChange({ kind: 'multiple', optionIds: selected, other: e.currentTarget.value })}
		class="mt-2 max-w-sm"
		{disabled}
		aria-label="Please specify"
	/>
{/if}
