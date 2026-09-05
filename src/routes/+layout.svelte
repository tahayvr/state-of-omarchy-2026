<script lang="ts">
	import './layout.css';
	import { ModeWatcher } from 'mode-watcher';
	import ToggleButton from '$lib/components/theme/Toggle.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { authClient } from '$lib/auth-client';
	import type { LayoutServerData } from './$types';

	let { data, children }: { data: LayoutServerData; children: import('svelte').Snippet } = $props();

	async function signOut() {
		try {
			await authClient.signOut();
		} finally {
			// Full navigation so every server load re-runs without the session.
			window.location.assign('/');
		}
	}
</script>

<ModeWatcher />
<header class="absolute top-0 right-0 left-0 flex items-center justify-end gap-2 p-4">
	{#if data.user}
		<Button href="/survey" variant="ghost" size="sm">Survey</Button>
		<Popover.Root>
			<Popover.Trigger>
				{#snippet child({ props })}
					<Button
						{...props}
						variant="ghost"
						size="sm"
						aria-label={`Account options for ${data.user?.email}`}
					>
						<span class="max-w-40 truncate">{data.user?.email}</span>
					</Button>
				{/snippet}
			</Popover.Trigger>
			<Popover.Content align="end" class="w-56 p-1">
				<p class="truncate px-2 py-1.5 text-xs text-muted-foreground">{data.user?.email}</p>
				<Button variant="ghost" size="sm" onclick={signOut} class="w-full justify-start">
					Sign out
				</Button>
			</Popover.Content>
		</Popover.Root>
	{:else}
		<Button href="/" variant="ghost" size="sm">Log in</Button>
	{/if}
	<div class="fixed top-4 left-4">
		<ToggleButton />
	</div>
</header>
<div class="h-full max-h-screen w-full max-w-full">
	{@render children()}
</div>
