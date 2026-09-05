<script lang="ts">
	import { FieldDescription } from '$lib/components/ui/field';
	import type { Question } from '$lib/surveys/definition';

	let { question }: { question: Question } = $props();
</script>

<FieldDescription>
	This question uses type “{question.type}”, which this version of the site doesn’t support yet.
	Your other answers are safe — skipping it won’t block you.
</FieldDescription>
