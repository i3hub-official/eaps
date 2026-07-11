<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { Topbar } from '$lib/components/dashboard';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Alert, AlertDescription } from '$lib/components/ui/alert/index.js';
	import {
		Dialog, DialogContent, DialogDescription, DialogFooter,
		DialogHeader, DialogTitle, DialogTrigger,
	} from '$lib/components/ui/dialog/index.js';
	import { ArrowLeft, Pencil, CheckCircle2, XCircle, Trash2, AlertCircle, Clock, FileText, Shield } from '@lucide/svelte/icons';

	let { data, form } = $props();
	const a = $derived(data.assessment);

	const NON_DRAFT = ['PUBLISHED', 'SCHEDULED', 'ACTIVE', 'ENDED'];
	const isPublishedLike = $derived(NON_DRAFT.includes(a.status));

	let isPublishing = $state(false);
	let isUnpublishing = $state(false);
	let isDeleting = $state(false);
	let deleteDialogOpen = $state(false);

	function fmtDate(d: string | Date | null) {
		if (!d) return '—';
		return new Date(d).toLocaleString();
	}

	function statusVariant(status: string) {
		if (status === 'DRAFT') return 'secondary';
		if (status === 'CANCELLED') return 'destructive';
		return 'default';
	}

	function formatSchedule(date: Date | string | null | undefined) {
		if (!date) return null;
		return new Date(date).toLocaleString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
		});
	}

	function getScheduleLabel(assessment: { status: string; type: string; startTime: any; endTime: any; dueDate: any }) {
		const { status, type, startTime, endTime, dueDate } = assessment;

		if (type === 'ASSIGNMENT' && dueDate) {
			return { label: `Due ${formatSchedule(dueDate)}`, tone: 'default' as const };
		}

		switch (status) {
			case 'SCHEDULED':
				return startTime
					? { label: `Opens ${formatSchedule(startTime)}`, tone: 'warning' as const }
					: { label: 'Awaiting start time', tone: 'warning' as const };
			case 'ACTIVE':
				return endTime
					? { label: `Closes ${formatSchedule(endTime)}`, tone: 'success' as const }
					: { label: 'Open now', tone: 'success' as const };
			case 'ENDED':
				return endTime
					? { label: `Ended ${formatSchedule(endTime)}`, tone: 'muted' as const }
					: { label: 'Ended', tone: 'muted' as const };
			case 'PUBLISHED':
				return startTime
					? { label: `Starts ${formatSchedule(startTime)}`, tone: 'default' as const }
					: { label: 'Published', tone: 'default' as const };
			default:
				return null;
		}
	}

	function scheduleToneClass(tone: 'default' | 'warning' | 'success' | 'muted') {
		const map = {
			default: 'text-muted-foreground',
			warning: 'text-yellow-600 dark:text-yellow-400',
			success: 'text-green-600 dark:text-green-400',
			muted: 'text-muted-foreground/70',
		};
		return map[tone];
	}
</script>

<svelte:head>
	<title>{a.title} — MOUAU e-Test</title>
</svelte:head>

<Topbar title={a.title} description="{a.course.code} — {a.course.title}">
	{#snippet actions()}
		<Button href="/lecturer/assessments" variant="outline" size="sm">
			<ArrowLeft class="mr-2 size-4" />
			Back
		</Button>
		<Button href={`/lecturer/assessments/edit/${a.id}`} variant="outline" size="sm">
			<Pencil class="mr-2 size-4" />
			Edit
		</Button>
	{/snippet}
</Topbar>

<div class="p-4 sm:p-6 space-y-4 sm:space-y-6">
	{#if form?.error}
		<Alert variant="destructive">
			<AlertCircle class="size-4" />
			<AlertDescription>{form.error}</AlertDescription>
		</Alert>
	{/if}

	<Card>
		<CardHeader>
			<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div class="min-w-0">
					<CardTitle class="flex flex-wrap items-center gap-2 text-lg sm:text-xl">
						<span class="truncate">{a.title}</span>
						<Badge variant={statusVariant(a.status)} class="shrink-0">{a.status}</Badge>
					</CardTitle>
					<CardDescription class="mt-1">{a.type} · {a.course.code} · {a.course.level}</CardDescription>
				</div>

				<div class="flex flex-wrap gap-2 shrink-0">
					{#if isPublishedLike}
						<form
							method="POST"
							action="?/unpublish"
							use:enhance={() => {
								isUnpublishing = true;
								return async ({ result, update }) => {
									isUnpublishing = false;
									if (result.type === 'success') toast.success('Assessment unpublished');
									if (result.type === 'failure') toast.error(result.data?.error ?? 'Failed to unpublish');
									await update();
								};
							}}
							class="shrink-0"
						>
							<Button type="submit" variant="outline" size="sm" disabled={isUnpublishing}>
								<XCircle class="mr-2 size-4" />
								{isUnpublishing ? 'Unpublishing…' : 'Unpublish'}
							</Button>
						</form>
					{:else if a.status === 'DRAFT'}
						<form
							method="POST"
							action="?/publish"
							use:enhance={() => {
								isPublishing = true;
								return async ({ result, update }) => {
									isPublishing = false;
									if (result.type === 'success') toast.success('Assessment published');
									if (result.type === 'failure') toast.error(result.data?.error ?? 'Failed to publish');
									await update();
								};
							}}
							class="shrink-0"
						>
							<Button type="submit" size="sm" disabled={isPublishing}>
								<CheckCircle2 class="mr-2 size-4" />
								{isPublishing ? 'Publishing…' : 'Publish'}
							</Button>
						</form>
					{/if}

					<Dialog bind:open={deleteDialogOpen}>
						<DialogTrigger>
							<Button
								variant="destructive"
								size="sm"
								disabled={isPublishedLike}
								title={isPublishedLike ? 'Unpublish before deleting' : ''}
							>
								<Trash2 class="mr-2 size-4" />
								Delete
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Delete "{a.title}"?</DialogTitle>
								<DialogDescription>
									This permanently removes the assessment and its question links. This cannot be undone.
								</DialogDescription>
							</DialogHeader>
							<DialogFooter>
								<Button variant="outline" onclick={() => (deleteDialogOpen = false)}>Cancel</Button>
								<form
									method="POST"
									action="?/delete"
									use:enhance={() => {
										isDeleting = true;
										return async ({ result }) => {
											if (result.type === 'failure') {
												isDeleting = false;
												toast.error(result.data?.error ?? 'Failed to delete');
												deleteDialogOpen = false;
											}
										};
									}}
								>
									<Button type="submit" variant="destructive" disabled={isDeleting}>
										{isDeleting ? 'Deleting…' : 'Confirm Delete'}
									</Button>
								</form>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</div>
			</div>
		</CardHeader>

		<CardContent>
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<div>
					<p class="text-xs text-muted-foreground">Total Marks</p>
					<p class="text-sm font-medium">{a.totalMarks}</p>
				</div>
				<div>
					<p class="text-xs text-muted-foreground">Pass Mark</p>
					<p class="text-sm font-medium">{a.passMark}</p>
				</div>
				<div>
					<p class="text-xs text-muted-foreground">Duration</p>
					<p class="text-sm font-medium">{a.durationMinutes} mins</p>
				</div>
				<div>
					<p class="text-xs text-muted-foreground">Questions</p>
					<p class="text-sm font-medium">{a.questions.length} / {a.questionCount}</p>
				</div>
				<div>
					<p class="text-xs text-muted-foreground flex items-center gap-1">
						<Clock class="size-3" /> Start
					</p>
					<p class="text-sm font-medium">{fmtDate(a.startTime)}</p>
				</div>
				<div>
					<p class="text-xs text-muted-foreground flex items-center gap-1">
						<Clock class="size-3" /> End
					</p>
					<p class="text-sm font-medium">{fmtDate(a.endTime)}</p>
				</div>
				<div>
					<p class="text-xs text-muted-foreground flex items-center gap-1">
						<Shield class="size-3" /> Security
					</p>
					<p class="text-sm font-medium">
						{a.requireFaceVerify ? 'Face verify' : 'No face verify'} ·
						{a.fullscreenRequired ? 'Fullscreen' : 'No fullscreen'}
					</p>
				</div>
				<div>
					<p class="text-xs text-muted-foreground">Attempts</p>
					<p class="text-sm font-medium">{a.sessionCount} session(s) · max {a.maxAttempts}</p>
				</div>
			</div>
		</CardContent>

		{#if a.instructions}
			<CardContent class="border-t pt-4">
				<p class="text-xs text-muted-foreground mb-1">Instructions</p>
				<p class="text-sm">{a.instructions}</p>
			</CardContent>
		{/if}

		{#if a.tags.length}
			<CardContent class="border-t pt-4 flex flex-wrap gap-1.5">
				{#each a.tags as tag}
					<Badge variant="outline">{tag}</Badge>
				{/each}
			</CardContent>
		{/if}
	</Card>

	<Card>
		<CardHeader>
			<CardTitle>Questions ({a.questions.length})</CardTitle>
			<CardDescription>Questions linked to this assessment</CardDescription>
		</CardHeader>
		<CardContent class="p-0">
			<div class="max-h-[520px] overflow-y-auto divide-y">
				{#if a.questions.length === 0}
					<div class="text-center text-muted-foreground py-8">
						<FileText class="mx-auto size-8 text-muted-foreground/50 mb-2" />
						<p class="text-sm">No questions linked to this assessment</p>
					</div>
				{:else}
					{#each a.questions as q, i}
						<div class="py-3 px-4 sm:px-6 flex items-start gap-3">
							<span class="text-xs text-muted-foreground w-6 shrink-0 pt-0.5 text-right">{i + 1}.</span>
							<div class="min-w-0 flex-1">
								<p class="text-sm break-words">{q.body}</p>
								<div class="flex flex-wrap gap-1 mt-1.5">
									<Badge variant="outline" class="text-[10px]">{q.type}</Badge>
									<Badge variant="outline" class="text-[10px]">{q.difficulty}</Badge>
									<Badge variant="outline" class="text-[10px]">{q.marks} mark{q.marks === 1 ? '' : 's'}</Badge>
								</div>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</CardContent>
	</Card>
</div>