<script lang="ts">
	import { Textarea } from '$lib/components/ui/textarea';
	import { FieldDescription } from '$lib/components/ui/field';
	import type { AnswerValue, TextQuestion } from '$lib/surveys/definition';

	let {
		question,
		value,
		onChange,
		disabled = false
	}: {
		question: TextQuestion;
		value: AnswerValue | undefined;
		onChange: (v: AnswerValue) => void;
		disabled?: boolean;
	} = $props();

	const text = $derived(value?.kind === 'text' ? value.text : '');
</script>

<div class="space-y-2">
	<Textarea
		placeholder={question.placeholder ?? 'Your answer'}
		value={text}
		maxlength={question.maxLength ?? undefined}
		oninput={(e) => onChange({ kind: 'text', text: e.currentTarget.value })}
		{disabled}
		aria-labelledby={`q-${question.id}`}
		rows={3}
	/>
	{#if question.maxLength !== undefined}
		<FieldDescription>
			{text.length} / {question.maxLength}
		</FieldDescription>
	{/if}
</div>
