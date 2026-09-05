<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import type { LayoutServerData } from '../$types';

	let { data }: { data: LayoutServerData } = $props();
</script>

<div
	class="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center gap-6 px-4 py-12"
>
	<Card class="w-full bg-transparent">
		<CardHeader class="text-center">
			<CardTitle>State of Omarchy 2026 survey</CardTitle>
			<CardDescription>
				Signed in as {data.user?.email}. The questionnaire is coming next.
			</CardDescription>
		</CardHeader>
		<CardContent class="flex justify-center gap-3">
			<Button href="/account" variant="outline">Account</Button>
		</CardContent>
	</Card>
</div>
