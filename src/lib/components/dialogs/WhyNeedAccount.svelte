<script>
	import {
		Dialog,
		DialogTrigger,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogClose
	} from '$lib/components/ui/dialog';
	import { buttonVariants } from '$lib/components/ui/button/index.js';
</script>

<Dialog>
	<DialogTrigger type="button" class={buttonVariants({ variant: 'link' })}>
		Why do I need an account?
	</DialogTrigger>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>Why do I need an account?</DialogTitle>
		</DialogHeader>
		<div class="space-y-3 py-4">
			<ul class="list-inside list-disc space-y-2 text-sm text-muted-foreground">
				<li>We want to make sure entries are from actual human users.</li>
				<li>We want to notify you when results are published.</li>
				<li>We want to notify you of future surveys.</li>
			</ul>
		</div>
		<DialogClose type="button" class={buttonVariants({ variant: 'default' })}>Got it</DialogClose>
	</DialogContent>
</Dialog>
