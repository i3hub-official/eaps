<!-- src/routes/admin/face-duplicates/+page.svelte -->
<script lang="ts">
	import { Topbar } from '$lib/components/dashboard';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import { enhance } from '$app/forms';

	let { form } = $props();
	let scanning = $state(false);

	type Pair = {
		similarity: number;
		studentA: { id: string; matricNumber: string; name: string };
		studentB: { id: string; matricNumber: string; name: string };
	};

	let pairs = $derived((form?.pairs ?? []) as Pair[]);
	let hasScanned = $derived(form?.scanned ?? false);
</script>

<svelte:head>
	<title>Face Duplicate Detection — EAPS</title>
</svelte:head>

<Topbar title="Face Duplicate Detection" description="Scan for students sharing an enrolled face across accounts" />

<div class="flex flex-col gap-6 p-6">
	<Card class="p-5">
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<p class="text-sm font-semibold">Run a duplicate-enrollment scan</p>
				<p class="mt-0.5 text-sm text-muted-foreground">
					Compares every enrolled face descriptor pairwise. This can take a while on a large student
					body — it runs on demand, not automatically.
				</p>
			</div>
			<form
				method="POST"
				action="?/scan"
				use:enhance={() => {
					scanning = true;
					return async ({ update }) => {
						await update();
						scanning = false;
					};
				}}
			>
				<Button type="submit" disabled={scanning}>
					{#if scanning}
						<Loader2 class="size-4 animate-spin" />
						Scanning…
					{:else}
						Run scan
					{/if}
				</Button>
			</form>
		</div>
	</Card>

	{#if hasScanned}
		{#if pairs.length === 0}
			<Card class="flex flex-col items-center gap-3 border-dashed p-10 text-center">
				<div class="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
					<ShieldCheck class="size-5" />
				</div>
				<div>
					<p class="text-base font-semibold">No duplicates found</p>
					<p class="mt-1 text-sm text-muted-foreground">
						Scanned in {form?.durationMs ?? 0}ms. No two enrolled faces matched above the duplicate
						threshold.
					</p>
				</div>
			</Card>
		{:else}
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2 text-base">
						<AlertTriangle class="size-4.5 text-destructive" />
						{pairs.length} potential duplicate{pairs.length === 1 ? '' : 's'} found
					</CardTitle>
					<CardDescription>
						Scanned in {form?.durationMs ?? 0}ms. Review each pair before taking action — a high
						similarity score is a strong signal, not automatic proof.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="space-y-3">
						{#each pairs as pair}
							<div class="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
								<div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
									<div>
										<p class="text-sm font-medium">{pair.studentA.name}</p>
										<p class="font-mono text-xs text-muted-foreground">{pair.studentA.matricNumber}</p>
									</div>
									<span class="hidden text-muted-foreground sm:inline">↔</span>
									<div>
										<p class="text-sm font-medium">{pair.studentB.name}</p>
										<p class="font-mono text-xs text-muted-foreground">{pair.studentB.matricNumber}</p>
									</div>
								</div>
								<Badge variant="destructive">{(pair.similarity * 100).toFixed(1)}% match</Badge>
							</div>
						{/each}
					</div>
				</CardContent>
			</Card>
		{/if}
	{/if}
</div>