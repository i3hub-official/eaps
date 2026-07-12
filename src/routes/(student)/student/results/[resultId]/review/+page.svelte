<!-- src/routes/(student)/student/results/[resultId]/review/+page.svelte -->
<script lang="ts">
	import { Topbar } from '$lib/components/dashboard';
	import { Card } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import X from '@lucide/svelte/icons/x';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const QUESTIONS_PER_PAGE = 5;

	const TYPE_LABEL: Record<string, string> = {
		PRACTICE: 'Practice',
		ASSIGNMENT: 'Assignment',
		TEST: 'Test',
		EXAMINATION: 'Examination',
	};

	// Deterministic color per tag name, so the same tag always renders the
	// same color across pages/sessions without needing a stored color field.
	const TAG_PALETTE = [
		{ bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' },
		{ bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30' },
		{ bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
		{ bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
		{ bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30' },
		{ bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/30' },
		{ bg: 'bg-fuchsia-500/15', text: 'text-fuchsia-400', border: 'border-fuchsia-500/30' },
		{ bg: 'bg-lime-500/15', text: 'text-lime-400', border: 'border-lime-500/30' },
	];

	function hashTag(tag: string): number {
		let hash = 0;
		for (let i = 0; i < tag.length; i++) {
			hash = (hash << 5) - hash + tag.charCodeAt(i);
			hash |= 0;
		}
		return Math.abs(hash);
	}

	function tagStyle(tag: string) {
		const c = TAG_PALETTE[hashTag(tag) % TAG_PALETTE.length];
		return `${c.bg} ${c.text} ${c.border}`;
	}

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

	// Active tag filters, kept per tab so switching tabs doesn't carry
	// filters that don't apply to that attempt's tag set.
	let tagFilterByTab = $state<Record<string, string[]>>(
		Object.fromEntries(data.tabs.map((t) => [t.resultId, []])),
	);

	const activeTabData = $derived(data.tabs.find((t) => t.resultId === activeTab));

	const availableTags = $derived(
		activeTabData
			? [...new Set(activeTabData.questions.flatMap((q) => q.tags))].sort()
			: [],
	);

	const activeTagFilters = $derived(activeTab ? (tagFilterByTab[activeTab] ?? []) : []);

	const filteredQuestions = $derived(
		activeTabData
			? activeTagFilters.length === 0
				? activeTabData.questions
				: activeTabData.questions.filter((q) => activeTagFilters.every((t) => q.tags.includes(t)))
			: [],
	);

	const currentPage = $derived(activeTab ? (pageByTab[activeTab] ?? 1) : 1);
	const totalPages = $derived(
		Math.max(1, Math.ceil(filteredQuestions.length / QUESTIONS_PER_PAGE)),
	);
	const pagedQuestions = $derived(
		filteredQuestions.slice(
			(currentPage - 1) * QUESTIONS_PER_PAGE,
			currentPage * QUESTIONS_PER_PAGE,
		),
	);

	function goToPage(page: number) {
		if (!activeTab) return;
		pageByTab[activeTab] = Math.min(Math.max(1, page), totalPages);
	}

	function toggleTagFilter(tag: string) {
		if (!activeTab) return;
		const current = tagFilterByTab[activeTab] ?? [];
		tagFilterByTab[activeTab] = current.includes(tag)
			? current.filter((t) => t !== tag)
			: [...current, tag];
		// Filtering changes the result set, so snap back to page 1.
		pageByTab[activeTab] = 1;
	}

	function clearTagFilters() {
		if (!activeTab) return;
		tagFilterByTab[activeTab] = [];
		pageByTab[activeTab] = 1;
	}
</script>

<Topbar title="Review — {activeTabData?.title ?? 'Assessment'}" backHref="/student/results" />

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
							{#if availableTags.length > 0}
								<div class="flex flex-wrap items-center gap-1.5">
									<span class="text-xs text-muted-foreground mr-1">Filter by tag:</span>
									{#each availableTags as tag}
										{@const active = activeTagFilters.includes(tag)}
										<button
											type="button"
											onclick={() => toggleTagFilter(tag)}
											class="rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors {active
												? tagStyle(tag)
												: 'border-muted-foreground/20 text-muted-foreground hover:text-foreground'}"
										>
											{tag}
										</button>
									{/each}
									{#if activeTagFilters.length > 0}
										<button
											type="button"
											onclick={clearTagFilters}
											class="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
										>
											<X class="size-3" /> Clear
										</button>
									{/if}
								</div>
							{/if}

							{#if filteredQuestions.length === 0}
								<Card class="p-6 text-center text-sm text-muted-foreground">
									No questions match the selected tags.
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
													<span
														class="rounded-full border px-2 py-0.5 text-xs font-normal {tagStyle(tag)}"
													>
														{tag}
													</span>
												{/each}
											</div>
										</Card>
									{/each}
								</div>

								{#if totalPages > 1}
									<div class="flex items-center justify-between gap-3 pt-2">
										<p class="text-xs text-muted-foreground">
											Page {currentPage} of {totalPages} · {filteredQuestions.length} question{filteredQuestions.length ===
											1
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
					{/if}
				</Tabs.Content>
			{/each}
		</Tabs.Root>
	{/if}
</main>