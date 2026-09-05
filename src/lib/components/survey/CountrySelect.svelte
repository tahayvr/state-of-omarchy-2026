<script lang="ts">
	import type { AnswerValue, CountryQuestion } from '$lib/surveys/definition';
	import { getCountryOptions } from '$lib/surveys/countries';

	let {
		question,
		value,
		onChange,
		disabled = false
	}: {
		question: CountryQuestion;
		value: AnswerValue | undefined;
		onChange: (v: AnswerValue) => void;
		disabled?: boolean;
	} = $props();

	const countries = getCountryOptions();
	const code = $derived(value?.kind === 'country' ? value.code : '');
</script>

<select
	value={code}
	onchange={(e) => onChange({ kind: 'country', code: e.currentTarget.value })}
	{disabled}
	aria-labelledby={`q-${question.id}`}
	class="h-9 w-full max-w-sm rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50"
>
	<option value="" disabled>Select a country…</option>
	{#each countries as country (country.value)}
		<option value={country.value}>{country.label}</option>
	{/each}
	{#if question.skipOption}
		<option value={question.skipOption.id}>{question.skipOption.label}</option>
	{/if}
</select>
