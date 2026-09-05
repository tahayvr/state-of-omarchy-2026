<script lang="ts">
	import { tick } from 'svelte';
	import RiArrowDownSLine from 'remixicon-svelte/icons/arrow-down-s-line';
	import RiCheckLine from 'remixicon-svelte/icons/check-line';
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { cn } from '$lib/utils.js';
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
	const options = $derived(
		question.skipOption
			? [...countries, { value: question.skipOption.id, label: question.skipOption.label }]
			: countries
	);
	const code = $derived(value?.kind === 'country' ? value.code : '');
	const selectedLabel = $derived(options.find((o) => o.value === code)?.label);

	let open = $state(false);
	let triggerRef = $state<HTMLButtonElement>(null!);

	// Refocus the trigger after picking so keyboard users can keep tabbing through the form.
	function pick(next: string) {
		onChange({ kind: 'country', code: next });
		open = false;
		tick().then(() => triggerRef.focus());
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger bind:ref={triggerRef}>
		{#snippet child({ props })}
			<Button
				{...props}
				variant="outline"
				role="combobox"
				aria-expanded={open}
				aria-labelledby={`q-${question.id}`}
				class="w-full max-w-sm justify-between font-normal"
				{disabled}
			>
				<span class="truncate">{selectedLabel ?? 'Select a country…'}</span>
				<RiArrowDownSLine class="size-4 shrink-0 opacity-50" />
			</Button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content class="w-[min(24rem,calc(100vw-2rem))] p-0" align="start">
		<Command.Root>
			<Command.Input placeholder="Search countries…" />
			<Command.List>
				<Command.Empty>No country found.</Command.Empty>
				<Command.Group>
					{#each options as option (option.value)}
						<Command.Item
							value={option.value}
							keywords={[option.label]}
							onSelect={() => pick(option.value)}
						>
							<RiCheckLine class={cn(code !== option.value && 'text-transparent')} />
							{option.label}
						</Command.Item>
					{/each}
				</Command.Group>
			</Command.List>
		</Command.Root>
	</Popover.Content>
</Popover.Root>
