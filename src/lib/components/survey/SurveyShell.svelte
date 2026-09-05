<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Progress } from '$lib/components/ui/progress';
	import { Spinner } from '$lib/components/ui/spinner';
	import RiCheckLine from 'remixicon-svelte/icons/check-line';
	import { FieldDescription } from '$lib/components/ui/field';
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
		sectionAnswerCounts,
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
	let saveTimer: ReturnType<typeof setTimeout> | null = null;
	let saveQueued = false;

	const sectionIds = $derived(def.sections.map((s) => s.id));
	const requestedStep = $derived(page.url.searchParams.get('s'));
	const sectionIndex = $derived.by(() => {
		const i = sectionIds.indexOf(requestedStep ?? '');
		if (i >= 0) return i;
		// Default: first section with unanswered required questions, else first
		// section with any unanswered question, else the first one.
		const firstRequiredOpen = def.sections.findIndex((s) => !isSectionComplete(s, answers));
		if (firstRequiredOpen >= 0) return firstRequiredOpen;
		const firstOpen = def.sections.findIndex((s) => {
			const counts = sectionAnswerCounts(s, answers);
			return counts.answered < counts.total;
		});
		return firstOpen >= 0 ? firstOpen : 0;
	});
	const section = $derived(def.sections[sectionIndex]);
	const visible = $derived(section ? visibleQuestions(section, answers) : []);
	// Answered share across the whole survey — starts at 0, not at "sections
	// without required questions" (isSectionComplete is required-only and stays
	// the submit gate; it must NOT drive the bar).
	const progress = $derived(computeCompletion(def, answers));
	const sectionCounts = $derived(section ? sectionAnswerCounts(section, answers) : null);
	const isLast = $derived(sectionIndex === def.sections.length - 1);

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
		if (await saveNow()) {
			// Query-param step nav can't be expressed via resolveRoute(); no `base` is configured.
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			await goto(`/survey?s=${sectionIds[index]}`, { invalidateAll: false });
			window.scrollTo({ top: 0 });
		}
	}

	async function next() {
		if (!validateSection()) {
			window.scrollTo({ top: 0, behavior: 'smooth' });
			return;
		}
		await goTo(sectionIndex + 1);
	}

	/** First section (in order) with an unanswered required visible question. */
	function firstIncompleteSection(): number {
		for (let i = 0; i < def.sections.length; i++) {
			if (!isSectionComplete(def.sections[i], answers)) return i;
		}
		return -1;
	}

	async function submit() {
		submitError = '';
		const incomplete = firstIncompleteSection();
		if (incomplete >= 0 && incomplete !== sectionIndex) {
			await goTo(incomplete);
			validateSection();
			return;
		}
		if (!validateSection()) return;
		if (!(await saveNow())) return;
		try {
			// Actions require a form body; submit carries no payload.
			const res = await fetch('?/submit', { method: 'POST', body: new FormData() });
			const body = await res.json().catch(() => null);
			if (!res.ok || body?.type !== 'success') {
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
			window.location.assign('/survey/done');
		} catch {
			submitError = 'Could not submit. Check your connection and try again.';
		}
	}
</script>

<div class="mx-auto w-full max-w-2xl px-4 py-8">
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
			<h1 class="text-xl font-semibold">{section.title}</h1>
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

	<div class="mt-4 space-y-8">
		{#each visible as question (question.id)}
			<QuestionCard {question} error={errors[question.id]}>
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
		{/each}
	</div>

	<footer class="mt-8 flex items-center justify-between gap-3">
		<Button variant="outline" onclick={() => goTo(sectionIndex - 1)} disabled={sectionIndex === 0}>
			Back
		</Button>
		{#if isLast}
			<Button onclick={submit}>Review &amp; submit</Button>
		{:else}
			<Button onclick={next}>Next</Button>
		{/if}
	</footer>
	{#if submitError}
		<FieldDescription class="mt-3 text-center text-destructive" role="alert">
			{submitError}
		</FieldDescription>
	{/if}
</div>
