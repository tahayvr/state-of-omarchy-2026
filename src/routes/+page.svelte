<script lang="ts">
	import {
		Card,
		CardHeader,
		CardDescription,
		CardContent,
		CardFooter
	} from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import { Field, FieldContent } from '$lib/components/ui/field';
	import {
		Dialog,
		DialogTrigger,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogDescription,
		DialogClose
	} from '$lib/components/ui/dialog';
	import Logo from '$lib/components/brand/Logo.svelte';

	let email = $state('');
</script>

<div class="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-12">
	<Logo />
	<Card class="w-full max-w-md bg-transparent">
		<CardHeader class="text-center">
			<CardDescription>
				Participate in the State of Omarchy 2026 survey by making an account.
			</CardDescription>
		</CardHeader>
		<CardContent>
			<Field>
				<FieldContent>
					<Label for="email" class="sr-only">Email address</Label>
					<Input
						id="email"
						type="email"
						placeholder="you@example.com"
						bind:value={email}
						class="w-full"
						autocomplete="email"
					/>
				</FieldContent>
			</Field>
			<p class="mt-4 text-center text-sm text-muted-foreground">
				<Dialog>
					<DialogTrigger type="button" class={buttonVariants({ variant: 'link' })}>
						Why do I need an account?
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Why do I need an account?</DialogTitle>
							<DialogDescription>
								We use magic links to verify your identity without passwords.
							</DialogDescription>
						</DialogHeader>
						<div class="space-y-3 py-4">
							<ul class="list-inside list-disc space-y-2 text-sm text-muted-foreground">
								<li>We want to make sure entries are from actual human users.</li>
								<li>We want to notify you when results are published.</li>
								<li>We want to notify you of future surveys.</li>
							</ul>
						</div>
						<DialogClose type="button" class={buttonVariants({ variant: 'default' })}>
							Got it
						</DialogClose>
					</DialogContent>
				</Dialog>
			</p>
		</CardContent>
		<CardFooter class="flex justify-center">
			<Button type="submit" class="w-full max-w-xs" disabled={!email}>Send magic link</Button>
		</CardFooter>
	</Card>
</div>
