<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { RadioGroup, RadioGroupItem } from '$lib/components/ui/radio-group';
	import type { AnswerValue, SingleQuestion } from '$lib/surveys/definition';

	let {
		question,
		value,
		onChange,
		disabled = false
	}: {
		question: SingleQuestion;
		value: AnswerValue | undefined;
		onChange: (v: AnswerValue) => void;
		disabled?: boolean;
	} = $props();

	const selected = $derived(value?.kind === 'single' ? value.optionId : '');
	const otherText = $derived(value?.kind === 'single' ? (value.other ?? '') : '');
	const options = $derived([
		...question.options,
		...(question.allowOther && !question.options.some((o) => o.id === 'other')
			? [{ id: 'other', label: 'Other' }]
			: [])
	]);
	const showOtherInput = $derived(selected === 'other' && question.allowOther);

	function pick(id: string) {
		onChange({
			kind: 'single',
			optionId: id,
			other: id === 'other' ? otherText || undefined : undefined
		});
	}
</script>

<RadioGroup value={selected} onValueChange={pick} {disabled} aria-labelledby={`q-${question.id}`}>
	{#each options as option (option.id)}
		<div class="flex items-center gap-3">
			<RadioGroupItem value={option.id} id={`${question.id}-${option.id}`} {disabled} />
			<Label for={`${question.id}-${option.id}`} class="font-normal"
				>{option.label || option.id}</Label
			>
		</div>
	{/each}
</RadioGroup>
{#if showOtherInput}
	<Input
		placeholder="Please specify"
		value={otherText}
		oninput={(e) => onChange({ kind: 'single', optionId: 'other', other: e.currentTarget.value })}
		class="mt-2 max-w-sm"
		{disabled}
		aria-label="Please specify"
	/>
{/if}
