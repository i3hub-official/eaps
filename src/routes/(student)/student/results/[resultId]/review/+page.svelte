<!-- src/routes/(student)/student/results/[resultId]/review/+page.svelte -->
<script lang="ts">
	import { Topbar } from '$lib/components/dashboard';
	import { Card } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const QUESTIONS_PER_PAGE = 5;

	const TYPE_LABEL: Record<string, string> = {
		PRACTICE: 'Practice',
		ASSIGNMENT: 'Assignment',
		TEST: 'Test',
		EXAMINATION: 'Examination',
	};

	// Tab is keyed by resultId (not just type) so two attempts of the same
	// type never collide into one tab.
	let activeTab = $state(
		data.tabs.find((t) => t.resultId === data.activeResultId)?.resultId ?? data.tabs[0]?.resultId,
	);

	// Independent page position per tab, so switching tabs doesn't reset
	// where you were, but each tab still starts fresh at page 1 on first
	// visit. Keyed by resultId rather than one shared page number.
	let pageByTab = $state<Record<string, number>>(
		Object.fromEntries(data.tabs.map((t) => [t.resultId, 1])),
	);

	const activeTabData = $derived(data.tabs.find((t) => t.resultId === activeTab));
	const currentPage = $derived(activeTab ? (pageByTab[activeTab] ?? 1) : 1);
	const totalPages = $derived(
		activeTabData ? Math.max(1, Math.ceil(activeTabData.questions.length / QUESTIONS_PER_PAGE)) : 1,
	);
	const pagedQuestions = $derived(
		activeTabData
			? activeTabData.questions.slice(
					(currentPage - 1) * QUESTIONS_PER_PAGE,
					currentPage * QUESTIONS_PER_PAGE,
				)
			: [],
	);

	function goToPage(page: number) {
		if (!activeTab) return;
		pageByTab[activeTab] = Math.min(Math.max(1, page), totalPages);
	}
</script>

<Topbar title="Review — {activeTabData?.title ?? 'Assessment'}" />

<main class="flex flex-1 flex-col gap-6 p-6">
	<div>
		<h2 class="text-lg font-semibold">Question Review</h2>
		{#if data.course}
			<p class="text-sm text-muted-foreground">{data.course.code} — {data.course.title}</p>
		{/if}
	</div>

	<p class="text-xs text-muted-foreground">
		These are the questions from your submitted paper, in the order you saw them. Answer options
		are not shown here.
	</p>

	{#if data.tabs.length === 0}
		<Card class="p-6 text-center text-sm text-muted-foreground">
			No reviewable results are available for this course yet.
		</Card>
	{:else}
		<Tabs.Root bind:value={activeTab}>
			<Tabs.List>
				{#each data.tabs as tab (tab.resultId)}
					<Tabs.Trigger value={tab.resultId}>
						{TYPE_LABEL[tab.type] ?? tab.type}
						<Badge variant="secondary" class="ml-2 font-normal">{tab.questions.length}</Badge>
					</Tabs.Trigger>
				{/each}
			</Tabs.List>

			{#each data.tabs as tab (tab.resultId)}
				<Tabs.Content value={tab.resultId} class="flex flex-col gap-4">
					{#if tab.resultId === activeTab}
						{#if tab.questions.length === 0}
							<Card class="p-6 text-center text-sm text-muted-foreground">
								No questions were recorded for this attempt.
							</Card>
						{:else}
							<div class="flex flex-col gap-4">
								{#each pagedQuestions as q, i (q.id)}
									{@const displayIndex = (currentPage - 1) * QUESTIONS_PER_PAGE + i + 1}
									<Card class="flex flex-col gap-3 p-4">
										<div class="flex items-start justify-between gap-2">
											<p class="text-sm font-medium">Question {displayIndex}</p>
											<Badge variant="outline" class="font-normal"
												>{q.marks} mark{q.marks === 1 ? '' : 's'}</Badge
											>
										</div>
										<p class="text-sm">{q.body}</p>
										<div class="flex flex-wrap items-center gap-1.5">
											<Badge variant="secondary" class="font-normal capitalize">
												{q.difficulty.toLowerCase()}
											</Badge>
											{#each q.tags as tag}
												<Badge variant="outline" class="font-normal">{tag}</Badge>
											{/each}
										</div>
									</Card>
								{/each}
							</div>

							{#if totalPages > 1}
								<div class="flex items-center justify-between gap-3 pt-2">
									<p class="text-xs text-muted-foreground">
										Page {currentPage} of {totalPages} · {tab.questions.length} question{tab
											.questions.length === 1
											? ''
											: 's'}
									</p>
									<div class="flex items-center gap-2">
										<Button
											variant="outline"
											size="sm"
											disabled={currentPage <= 1}
											onclick={() => goToPage(currentPage - 1)}
										>
											<ChevronLeft class="mr-1 size-3.5" /> Previous
										</Button>
										<Button
											variant="outline"
											size="sm"
											disabled={currentPage >= totalPages}
											onclick={() => goToPage(currentPage + 1)}
										>
											Next <ChevronRight class="ml-1 size-3.5" />
										</Button>
									</div>
								</div>
							{/if}
						{/if}
					{/if}
				</Tabs.Content>
			{/each}
		</Tabs.Root>
	{/if}
</main>