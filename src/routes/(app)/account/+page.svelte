<script lang="ts">
	import { enhance } from '$app/forms';
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
			<CardTitle>Your account</CardTitle>
			<CardDescription>{data.user?.email}</CardDescription>
		</CardHeader>
		<CardContent class="flex justify-center gap-3">
			<Button href="/survey">Go to survey</Button>
			<form method="post" action="?/signOut" use:enhance>
				<Button type="submit" variant="outline">Sign out</Button>
			</form>
		</CardContent>
	</Card>
</div>
