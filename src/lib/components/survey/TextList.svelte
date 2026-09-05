<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import RiCloseLine from 'remixicon-svelte/icons/close-line';
	import type { AnswerValue, TextListQuestion } from '$lib/surveys/definition';

	let {
		question,
		value,
		onChange,
		disabled = false
	}: {
		question: TextListQuestion;
		value: AnswerValue | undefined;
		onChange: (v: AnswerValue) => void;
		disabled?: boolean;
	} = $props();

	const HARD_CAP = 20;
	const max = $derived(question.limit ?? HARD_CAP);
	const items = $derived(value?.kind === 'list' ? value.items : []);

	function setItem(index: number, text: string) {
		const next = items.slice();
		next[index] = text;
		onChange({ kind: 'list', items: next });
	}

	function addItem() {
		if (items.length >= max) return;
		onChange({ kind: 'list', items: [...items, ''] });
	}

	function removeItem(index: number) {
		onChange({ kind: 'list', items: items.filter((_, i) => i !== index) });
	}
</script>

<div class="space-y-2" role="group" aria-labelledby={`q-${question.id}`}>
	{#each items as item, i (i)}
		<div class="flex items-center gap-2">
			<Input
				placeholder={question.placeholder ?? `Entry ${i + 1}`}
				value={item}
				oninput={(e) => setItem(i, e.currentTarget.value)}
				{disabled}
				aria-label={`${question.prompt} ${i + 1}`}
			/>
			<Button
				variant="ghost"
				size="icon"
				onclick={() => removeItem(i)}
				{disabled}
				aria-label={`Remove entry ${i + 1}`}
			>
				<RiCloseLine />
			</Button>
		</div>
	{/each}
	{#if items.length < max}
		<Button variant="outline" size="sm" onclick={addItem} {disabled}>
			Add{question.limit !== undefined ? ` (${items.length}/${question.limit})` : ''}
		</Button>
	{/if}
</div>
