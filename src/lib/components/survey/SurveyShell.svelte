<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { fly, fade } from 'svelte/transition';
	import { MediaQuery } from 'svelte/reactivity';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Progress } from '$lib/components/ui/progress';
	import Seo from '$lib/components/head/Seo.svelte';
	import { Spinner } from '$lib/components/ui/spinner';
	import RiCheckLine from 'remixicon-svelte/icons/check-line';
	import { FieldDescription } from '$lib/components/ui/field';
	import { cn } from '$lib/utils';
	import QuestionCard from '$lib/components/survey/QuestionCard.svelte';
	import SingleChoice from '$lib/components/survey/SingleChoice.svelte';
	import MultiChoice from '$lib/components/survey/MultiChoice.svelte';
	import ScaleInput from '$lib/components/survey/ScaleInput.svelte';
	import TextAnswer from '$lib/components/survey/TextAnswer.svelte';
	import TextList from '$lib/components/survey/TextList.svelte';
	import CountrySelect from '$lib/components/survey/CountrySelect.svelte';
	import UnsupportedQuestion from '$lib/components/survey/UnsupportedQuestion.svelte';
	import {
		allQuestions,
		computeCompletion,
		isCountry,
		isMultiple,
		isNps,
		isScale,
		isSectionComplete,
		isSingle,
		isText,
		isTextList,
		isVisible,
		isAnswered,
		sectionAnswerCounts,
		sectionCompletion,
		validateAnswer,
		visibleQuestions,
		type Answers,
		type AnswerValue,
		type SurveyDef
	} from '$lib/surveys/definition';

	let {
		def,
		initialAnswers
	}: {
		def: SurveyDef;
		initialAnswers: Answers;
	} = $props();

	let answers = $state<Answers>({});
	let answersInitialized = false;
	// One-time init from server data (deliberately not reactive to prop changes).
	$effect.pre(() => {
		if (!answersInitialized) {
			answers = { ...initialAnswers };
			answersInitialized = true;
		}
	});
	let errors = $state<Record<string, string>>({});
	let saveState = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');
	let submitError = $state('');
	let confirmOpen = $state(false);
	let submitting = $state(false);
	let submitted = $state(false);
	let saveTimer: ReturnType<typeof setTimeout> | null = null;
	let saveQueued = false;

	const reducedMotion = new MediaQuery('(prefers-reduced-motion: reduce)');
	const sectionExit = $derived(reducedMotion.current ? { duration: 0 } : { duration: 120 });

	/** Staggered per-question entrance, capped so long sections don't take forever to reveal. */
	function questionEnter(index: number) {
		if (reducedMotion.current) return { duration: 0 };
		return { y: 10, duration: 200, delay: 40 + Math.min(index, 8) * 40 };
	}

	let stepperEl = $state<HTMLElement>();

	const sectionIds = $derived(def.sections.map((s) => s.id));

	let activeSectionId = $state<string | null>(null);
	// Pin the visible step: an explicit ?s= (initial load, jump, back/forward) always
	// wins; otherwise the step stays put once resolved. This must NOT re-derive from
	// answers — otherwise finishing a section's required questions yanks the user ahead.
	$effect.pre(() => {
		const requested = page.url.searchParams.get('s');
		if (requested && sectionIds.includes(requested)) {
			activeSectionId = requested;
		} else if (!activeSectionId) {
			activeSectionId = defaultSectionId();
		}
	});

	/** Default step: first section with unanswered required, else any unanswered, else first. */
	function defaultSectionId(): string {
		const firstRequiredOpen = def.sections.find((s) => !isSectionComplete(s, answers));
		if (firstRequiredOpen) return firstRequiredOpen.id;
		const firstOpen = def.sections.find((s) => {
			const counts = sectionAnswerCounts(s, answers);
			return counts.answered < counts.total;
		});
		return (firstOpen ?? def.sections[0]).id;
	}

	const sectionIndex = $derived.by(() => {
		const requested = page.url.searchParams.get('s');
		if (requested && sectionIds.includes(requested)) return sectionIds.indexOf(requested);
		if (activeSectionId) return Math.max(0, sectionIds.indexOf(activeSectionId));
		// First render only (SSR or pre-effect): resolve the default from initial answers
		// so server and client agree. Afterwards activeSectionId is always set and this
		// branch — the only one reading answers — is never taken, so answering can no
		// longer move the user between sections.
		return Math.max(0, sectionIds.indexOf(defaultSectionId()));
	});
	const section = $derived(def.sections[sectionIndex]);
	const visible = $derived(section ? visibleQuestions(section, answers) : []);
	// Answered share across the whole survey — starts at 0, not at "sections
	// without required questions" (isSectionComplete is required-only and stays
	// the submit gate; it must NOT drive the bar).
	const progress = $derived(computeCompletion(def, answers));
	const completedSectionCount = $derived(
		def.sections.filter((s) => isSectionComplete(s, answers)).length
	);
	const sectionCounts = $derived(section ? sectionAnswerCounts(section, answers) : null);
	const isLast = $derived(sectionIndex === def.sections.length - 1);

	// Keep the active step pill in view as the section changes (nav can overflow on mobile).
	$effect(() => {
		const el = stepperEl?.querySelector<HTMLElement>(`[data-section-step="${section.id}"]`);
		el?.scrollIntoView({
			behavior: reducedMotion.current ? 'auto' : 'smooth',
			inline: 'center',
			block: 'nearest'
		});
	});

	function setAnswer(qid: string, value: AnswerValue) {
		answers[qid] = value;
		if (errors[qid]) errors[qid] = '';
		scheduleSave();
	}

	// Hidden answers are cleared generically the moment their showIf stops matching.
	$effect(() => {
		for (const q of allQuestions(def)) {
			if (answers[q.id] !== undefined && !isVisible(q, answers)) {
				delete answers[q.id];
				if (errors[q.id]) errors[q.id] = '';
				scheduleSave();
			}
		}
	});

	function scheduleSave() {
		if (saveTimer) clearTimeout(saveTimer);
		saveTimer = setTimeout(() => void saveNow(), 800);
	}

	async function saveNow(): Promise<boolean> {
		if (saveState === 'saving') {
			saveQueued = true;
			return true;
		}
		saveState = 'saving';
		try {
			const form = new FormData();
			form.set('answers', JSON.stringify(answers));
			const res = await fetch('?/save', { method: 'POST', body: form });
			const body = await res.json().catch(() => null);
			if (!res.ok || body?.type !== 'success') {
				const issues = body?.data?.issues ?? body?.issues ?? {};
				for (const [qid, message] of Object.entries(issues)) {
					errors[qid] = String(message);
				}
				saveState = 'error';
				return false;
			}
			saveState = 'saved';
			return true;
		} catch {
			saveState = 'error';
			return false;
		} finally {
			if (saveQueued) {
				saveQueued = false;
				await saveNow();
			}
		}
	}

	function validateSection(): boolean {
		const next: Record<string, string> = {};
		for (const q of visible) {
			const problem = validateAnswer(q, answers[q.id]);
			if (problem) next[q.id] = problem;
		}
		errors = { ...errors, ...next };
		return Object.keys(next).length === 0;
	}

	async function goTo(index: number) {
		activeSectionId = sectionIds[index];
		// Don't block navigation on save: autosave already persists every answer, and the
		// shell stays mounted across ?s= changes so an in-flight save completes fine.
		// (submit() still awaits a final save — that one gates correctness.)
		void saveNow();
		// Query-param step nav can't be expressed via resolveRoute(); no `base` is configured.
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		await goto(`/survey?s=${sectionIds[index]}`, { invalidateAll: false });
		focusHeading();
	}

	/** Move keyboard/screen-reader focus to the section heading (it persists across steps). */
	function focusHeading() {
		window.scrollTo({ top: 0 });
		// The heading element itself never unmounts (only its text changes), so focusing is
		// safe immediately — no tick needed.
		document.getElementById('survey-section-heading')?.focus({ preventScroll: true });
	}

	async function next() {
		if (!validateSection()) {
			// Inline errors announce via role="alert"; move focus to the heading so
			// keyboard users restart from a known point instead of a dead button.
			focusHeading();
			return;
		}
		await goTo(sectionIndex + 1);
	}

	/** Free jump: saves first, never blocks on validation (Next/Submit gate instead). */
	async function jumpTo(index: number) {
		if (index === sectionIndex) return;
		await goTo(index);
	}

	/** First section (in order) with an unanswered required visible question. */
	function firstIncompleteSection(): number {
		for (let i = 0; i < def.sections.length; i++) {
			if (!isSectionComplete(def.sections[i], answers)) return i;
		}
		return -1;
	}

	async function submit() {
		if (submitting) return;
		submitError = '';
		const incomplete = firstIncompleteSection();
		if (incomplete >= 0 && incomplete !== sectionIndex) {
			confirmOpen = false;
			await goTo(incomplete);
			validateSection();
			return;
		}
		if (!validateSection()) {
			confirmOpen = false;
			focusHeading();
			return;
		}
		if (!(await saveNow())) {
			confirmOpen = false;
			return;
		}
		submitting = true;
		try {
			// Actions require a form body; submit carries no payload.
			const res = await fetch('?/submit', { method: 'POST', body: new FormData() });
			const body = await res.json().catch(() => null);
			if (!res.ok || body?.type !== 'success') {
				confirmOpen = false;
				const issues: Record<string, string> = body?.data?.issues ?? body?.issues ?? {};
				for (const [qid, message] of Object.entries(issues)) {
					errors[qid] = String(message);
				}
				const firstIssue = Object.keys(issues)[0];
				if (firstIssue) {
					const owner = def.sections.findIndex((s) => s.questions.some((q) => q.id === firstIssue));
					if (owner >= 0 && owner !== sectionIndex) {
						// Same as goTo(): query-param nav, no `base` configured.
						// eslint-disable-next-line svelte/no-navigation-without-resolve
						await goto(`/survey?s=${sectionIds[owner]}`, { invalidateAll: false });
						return;
					}
				}
				submitError = 'Something needs attention above before submitting.';
				return;
			}
			// Brief success state inside the still-open dialog before the soft nav —
			// an instant redirect reads as if nothing happened.
			submitted = true;
			await new Promise((r) => setTimeout(r, 650));
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			await goto('/survey/done');
		} catch {
			confirmOpen = false;
			submitError = 'Could not submit. Check your connection and try again.';
		} finally {
			submitting = false;
		}
	}
</script>

<div class="mx-auto w-full max-w-2xl px-4 py-8">
	<Seo title={`Survey — ${section.title} · State of Omarchy 2026`} origin={page.url.origin} />
	<header class="sticky top-0 z-10 space-y-2 bg-background/95 py-4 backdrop-blur">
		<div class="flex items-baseline justify-between gap-4">
			<p class="text-sm text-muted-foreground">
				Section {sectionIndex + 1} of {def.sections.length}
			</p>
			<span class="flex h-5 shrink-0 items-center" aria-live="polite">
				{#if saveState === 'saving'}
					<Spinner class="text-muted-foreground" aria-label="Saving answers" />
				{:else if saveState === 'saved'}
					<RiCheckLine class="size-4 text-muted-foreground" aria-label="Answers saved" />
				{:else if saveState === 'error'}
					<span class="text-sm text-destructive">Save failed — retrying on next change</span>
				{/if}
			</span>
		</div>
		<Progress value={progress} aria-label="Survey progress" />
		<div class="flex items-baseline justify-between gap-4">
			<h1 id="survey-section-heading" tabindex="-1" class="text-xl font-semibold outline-none">
				{section.title}
			</h1>
			{#if sectionCounts}
				<p class="shrink-0 text-sm text-muted-foreground" aria-live="polite">
					{sectionCounts.answered} of {sectionCounts.total} answered
				</p>
			{/if}
		</div>
		{#if section.description}
			<p class="text-sm text-muted-foreground">{section.description}</p>
		{/if}
	</header>

	{#key section.id}
		<div class="mt-4 space-y-8" out:fade={sectionExit}>
			{#each visible as question, i (question.id)}
				<div in:fly={questionEnter(i)}>
					<QuestionCard
						{question}
						error={errors[question.id]}
						answered={isAnswered(question, answers[question.id])}
					>
						{#if isSingle(question)}
							<SingleChoice
								{question}
								value={answers[question.id]}
								onChange={(v) => setAnswer(question.id, v)}
							/>
						{:else if isMultiple(question)}
							<MultiChoice
								{question}
								value={answers[question.id]}
								onChange={(v) => setAnswer(question.id, v)}
							/>
						{:else if isScale(question) || isNps(question)}
							<ScaleInput
								{question}
								value={answers[question.id]}
								onChange={(v) => setAnswer(question.id, v)}
							/>
						{:else if isText(question)}
							<TextAnswer
								{question}
								value={answers[question.id]}
								onChange={(v) => setAnswer(question.id, v)}
							/>
						{:else if isTextList(question)}
							<TextList
								{question}
								value={answers[question.id]}
								onChange={(v) => setAnswer(question.id, v)}
							/>
						{:else if isCountry(question)}
							<CountrySelect
								{question}
								value={answers[question.id]}
								onChange={(v) => setAnswer(question.id, v)}
							/>
						{:else}
							<UnsupportedQuestion {question} />
						{/if}
					</QuestionCard>
				</div>
			{/each}
		</div>
	{/key}

	<footer
		class="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur"
	>
		{#if submitError}
			<FieldDescription
				class="mx-auto mb-2 w-full max-w-2xl text-center text-destructive"
				role="alert"
			>
				{submitError}
			</FieldDescription>
		{/if}
		<div class="mx-auto flex w-full max-w-2xl items-center gap-2">
			<Button
				variant="outline"
				onclick={() => goTo(sectionIndex - 1)}
				disabled={sectionIndex === 0}
				class="shrink-0"
			>
				Back
			</Button>
			<nav
				aria-label="Jump to section"
				bind:this={stepperEl}
				class="flex min-w-0 flex-1 [scrollbar-width:none] items-center justify-center gap-1.5 overflow-x-auto py-1 [&::-webkit-scrollbar]:hidden"
			>
				{#each def.sections as s, i (s.id)}
					{@const complete = sectionCompletion(s, answers) === 100}
					{@const current = i === sectionIndex}
					<button
						type="button"
						data-section-step={s.id}
						onclick={() => jumpTo(i)}
						aria-current={current ? 'step' : undefined}
						aria-label={`${i + 1}. ${s.title}${complete ? ' — complete' : ''}`}
						title={s.title}
						class={cn(
							'flex size-8 shrink-0 scroll-mx-2 items-center justify-center rounded-full border text-xs font-medium transition-colors',
							current
								? 'border-primary bg-primary text-primary-foreground'
								: complete
									? 'border-primary/40 bg-primary/10 text-primary'
									: 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
						)}
					>
						{#if complete && !current}
							<RiCheckLine class="size-4" aria-hidden="true" />
						{:else}
							{i + 1}
						{/if}
					</button>
				{/each}
			</nav>
			{#if isLast}
				<Button onclick={() => (confirmOpen = true)} class="shrink-0">Submit</Button>
			{:else}
				<Button onclick={next} class="shrink-0">Next</Button>
			{/if}
		</div>
	</footer>
	<!-- Spacer so the fixed footer never covers the last question. -->
	<div class="h-24" aria-hidden="true"></div>

	<Dialog.Root
		open={confirmOpen}
		onOpenChange={(open) => {
			// Ignore close attempts (Esc, backdrop click) while the request is in flight
			// or the success state is showing — the goto() below owns closing it.
			if (!open && (submitting || submitted)) return;
			confirmOpen = open;
		}}
	>
		<Dialog.Content class="max-w-sm">
			{#if submitted}
				<div
					class="flex flex-col items-center gap-3 py-4 text-center"
					in:fade={reducedMotion.current ? { duration: 0 } : { duration: 200 }}
				>
					<span
						class="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary"
					>
						<RiCheckLine class="size-6" aria-hidden="true" />
					</span>
					<p class="font-medium">Response submitted</p>
					<p class="text-sm text-muted-foreground">Taking you to your confirmation…</p>
				</div>
			{:else}
				<Dialog.Header>
					<Dialog.Title>Submit your response?</Dialog.Title>
					<Dialog.Description>
						You've answered {progress}% of the survey across {completedSectionCount} of
						{def.sections.length} sections. Submitting locks your response — you won't be able to change
						it afterwards.
					</Dialog.Description>
				</Dialog.Header>
				<Dialog.Footer class="gap-2">
					<Dialog.Close class={buttonVariants({ variant: 'outline' })} disabled={submitting}>
						Keep editing
					</Dialog.Close>
					<Button onclick={submit} disabled={submitting}>
						{submitting ? 'Submitting…' : 'Yes, submit'}
					</Button>
				</Dialog.Footer>
			{/if}
		</Dialog.Content>
	</Dialog.Root>
</div>
