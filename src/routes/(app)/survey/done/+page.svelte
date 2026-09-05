<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import type { PageServerData } from './$types';

	let { data }: { data: PageServerData } = $props();
</script>

<div
	class="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center gap-6 px-4 py-12"
>
	<Card class="w-full bg-transparent">
		<CardHeader class="text-center">
			<CardTitle>Thanks for completing the survey!</CardTitle>
			<CardDescription>
				{data.answered} answers recorded for {data.email}.
			</CardDescription>
		</CardHeader>
		<CardContent class="flex justify-center gap-3">
			<Button href="/" variant="outline">Back home</Button>
		</CardContent>
	</Card>
</div>
