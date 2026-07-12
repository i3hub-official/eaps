<!-- src/routes/student/results/+page.svelte -->
<script lang="ts">
	import { Topbar } from '$lib/components/dashboard';
	import { Card } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import Award from '@lucide/svelte/icons/award';
	import FileText from '@lucide/svelte/icons/file-text';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import XCircle from '@lucide/svelte/icons/x-circle';
	import History from '@lucide/svelte/icons/history';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import Dumbbell from '@lucide/svelte/icons/dumbbell';
	import ClipboardList from '@lucide/svelte/icons/clipboard-list';
	import PenLine from '@lucide/svelte/icons/pen-line';
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';

	let { data } = $props();

	function formatDate(d: string | Date | null) {
		if (!d) return null;
		return new Date(d).toLocaleDateString('en-NG', { dateStyle: 'medium' });
	}

	const gradeVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
		A: 'default',
		B: 'default',
		C: 'secondary',
		D: 'secondary',
		E: 'outline',
		F: 'destructive'
	};

	const typeLabel: Record<string, string> = {
		PRACTICE: 'Practice',
		ASSIGNMENT: 'Assignment',
		TEST: 'Test',
		EXAMINATION: 'Examination'
	};

	// Fixed display order reused everywhere a type-tab or type-group
	// appears on this page.
	const TYPE_ORDER = ['PRACTICE', 'ASSIGNMENT', 'TEST', 'EXAMINATION'] as const;

	const typeIcon: Record<string, typeof Dumbbell> = {
		PRACTICE: Dumbbell,
		ASSIGNMENT: ClipboardList,
		TEST: PenLine,
		EXAMINATION: GraduationCap
	};

	// One grouping, shared by both the Assessment Results tab and the
	// Transcript tab's by-type view — both are just different renderings
	// of "this student's results, split by type," so there's no reason to
	// compute it twice. Types with zero results are dropped so an empty
	// tab never renders.
	const groupedResults = $derived(
		TYPE_ORDER.map((type) => ({
			type,
			results: data.assessmentResults.filter((r: { type: string }) => r.type === type)
		})).filter((group) => group.results.length > 0)
	);

	// Independent "which type-tab is active" state per outer tab, so
	// switching between Assessment Results / Transcript doesn't reset which
	// inner tab (Practice/Assignment/Test/Examination) you were looking at
	// in the OTHER outer tab.
	let activeResultsType = $state(groupedResults[0]?.type);
	let activeTranscriptType = $state(groupedResults[0]?.type);
</script>

<Topbar title="Results" />

<main class="flex flex-1 flex-col gap-6 p-6">
	{#if data.cgpa}
		<Card class="flex flex-wrap items-center justify-between gap-4 p-6">
			<div class="flex items-center gap-3">
				<div class="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
					<Award class="size-5" />
				</div>
				<div>
					<p class="text-sm text-muted-foreground">Cumulative GPA</p>
					<p class="text-2xl font-semibold">{data.cgpa}</p>
				</div>
			</div>
		</Card>
	{/if}

	<!-- AI performance insight — streamed separately so a slow/unavailable
	     LLM call never holds up the transcript below, which is real data
	     the student is actively waiting on. -->
	{#await data.recommendations}
		<Card class="flex items-center gap-3 p-6">
			<Loader2 class="size-4 animate-spin text-muted-foreground" />
			<p class="text-sm text-muted-foreground">Analyzing your assessment performance…</p>
		</Card>
	{:then recommendations}
		{#if recommendations}
			<Card class="flex flex-col gap-2 p-6">
				<div class="flex items-center gap-2">
					<div class="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
						<Sparkles class="size-4" />
					</div>
					<h3 class="font-semibold">Performance Insight</h3>
					<Badge variant="outline" class="font-normal">AI-generated</Badge>
				</div>
				<p class="text-xs text-muted-foreground">
					Based on your Practice, Assignment, Test, and Examination results.
				</p>
				<p class="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{recommendations}</p>
			</Card>
		{/if}
	{:catch}
		<!-- Silently omit the card — a failed insight isn't worth alarming
		     the student about, and it's already logged server-side. -->
	{/await}

	<Tabs.Root value="transcript" class="flex flex-1 flex-col gap-4">
		<Tabs.List>
			<Tabs.Trigger value="assessments">Assessment Results</Tabs.Trigger>
			<Tabs.Trigger value="transcript">Transcript</Tabs.Trigger>
		</Tabs.List>

		<!-- ═══════════════════════════════════════════════════════════════
		     TRANSCRIPT — the official academic record. TranscriptEntry is
		     course-level (CA + Exam = Total per course per session) and
		     doesn't itself distinguish Practice vs Test vs Examination —
		     CA and Exam already ARE the two components a transcript reports.
		     So this tab keeps that table as the authoritative record, and
		     underneath adds a "By Assessment Type" section with its own
		     real Practice/Assignment/Test/Examination tabs, showing the
		     underlying results that feed into CA/Exam — the "how you got
		     there" view, not a replacement for the official one.
		     ═══════════════════════════════════════════════════════════════ -->
		<Tabs.Content value="transcript" class="flex flex-col gap-6">
			<div>
				<h3 class="mb-3 text-sm font-semibold text-muted-foreground">Official Record</h3>
				{#if data.sessionSummaries.length === 0}
					<Card class="flex flex-col items-center gap-3 border-dashed p-12 text-center">
						<div class="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
							<FileText class="size-5" />
						</div>
						<div>
							<p class="text-base font-semibold">No finalized results yet</p>
							<p class="mt-1 text-sm text-muted-foreground">
								Your transcript will appear here once results are finalized for a session.
							</p>
						</div>
					</Card>
				{:else}
					<div class="flex flex-col gap-4">
						{#each data.sessionSummaries as session (session.sessionId)}
							<Card class="overflow-hidden p-0">
								<div class="flex flex-wrap items-center justify-between gap-3 border-b p-4">
									<h3 class="font-semibold">{session.sessionName}</h3>
									<div class="flex items-center gap-4 text-sm text-muted-foreground">
										<span>{session.totalCreditUnits} credit units</span>
										{#if session.gpa}
											<Badge variant="outline">GPA: {session.gpa}</Badge>
										{/if}
									</div>
								</div>
								<Table.Root>
									<Table.Header>
										<Table.Row>
											<Table.Head>Code</Table.Head>
											<Table.Head>Title</Table.Head>
											<Table.Head>Units</Table.Head>
											<Table.Head>CA</Table.Head>
											<Table.Head>Exam</Table.Head>
											<Table.Head>Total</Table.Head>
											<Table.Head>Grade</Table.Head>
											<Table.Head>Status</Table.Head>
										</Table.Row>
									</Table.Header>
									<Table.Body>
										{#each session.courses as course (course.id)}
											<Table.Row>
												<Table.Cell class="font-medium">{course.courseCode}</Table.Cell>
												<Table.Cell class="text-muted-foreground">{course.courseTitle}</Table.Cell>
												<Table.Cell>{course.creditUnits ?? '—'}</Table.Cell>
												<Table.Cell>{course.testMark ?? '—'}</Table.Cell>
												<Table.Cell>{course.examMark ?? '—'}</Table.Cell>
												<Table.Cell class="font-medium">{course.totalMark ?? '—'}</Table.Cell>
												<Table.Cell>
													{#if course.grade}
														<Badge variant={gradeVariant[course.grade] ?? 'outline'}>{course.grade}</Badge>
													{:else}
														—
													{/if}
												</Table.Cell>
												<Table.Cell>
													{#if course.passed === true}
														<span class="flex items-center gap-1 text-sm text-primary">
															<CheckCircle2 class="size-3.5" /> Passed
														</span>
													{:else if course.passed === false}
														<span class="flex items-center gap-1 text-sm text-destructive">
															<XCircle class="size-3.5" /> Failed
														</span>
													{:else}
														—
													{/if}
												</Table.Cell>
											</Table.Row>
										{/each}
									</Table.Body>
								</Table.Root>
							</Card>
						{/each}
					</div>
				{/if}
			</div>

			{#if groupedResults.length > 0}
				<div>
					<h3 class="mb-3 text-sm font-semibold text-muted-foreground">By Assessment Type</h3>
					<Tabs.Root bind:value={activeTranscriptType}>
						<Tabs.List>
							{#each groupedResults as group (group.type)}
								<Tabs.Trigger value={group.type}>
									{typeLabel[group.type] ?? group.type}
									<Badge variant="secondary" class="ml-2 font-normal">{group.results.length}</Badge>
								</Tabs.Trigger>
							{/each}
						</Tabs.List>

						{#each groupedResults as group (group.type)}
							<Tabs.Content value={group.type}>
								<Card class="overflow-hidden p-0">
									<Table.Root>
										<Table.Header>
											<Table.Row>
												<Table.Head>Course</Table.Head>
												<Table.Head>Title</Table.Head>
												<Table.Head>Score</Table.Head>
												<Table.Head>%</Table.Head>
												<Table.Head>Grade</Table.Head>
												<Table.Head>Released</Table.Head>
											</Table.Row>
										</Table.Header>
										<Table.Body>
											{#each group.results as r (r.id)}
												<Table.Row>
													<Table.Cell class="font-medium">{r.course?.code ?? '—'}</Table.Cell>
													<Table.Cell class="text-muted-foreground">{r.title}</Table.Cell>
													<Table.Cell>{r.marksObtained}/{r.totalMarks}</Table.Cell>
													<Table.Cell>{r.percentage}%</Table.Cell>
													<Table.Cell>
														{#if r.grade}
															<Badge variant={gradeVariant[r.grade] ?? 'outline'}>{r.grade}</Badge>
														{:else}
															—
														{/if}
													</Table.Cell>
													<Table.Cell class="text-xs text-muted-foreground">{formatDate(r.releasedAt) ?? '—'}</Table.Cell>
												</Table.Row>
											{/each}
										</Table.Body>
									</Table.Root>
								</Card>
							</Tabs.Content>
						{/each}
					</Tabs.Root>
				</div>
			{/if}
		</Tabs.Content>

		<!-- ═══════════════════════════════════════════════════════════════
		     ASSESSMENT RESULTS — raw attempt list, with a real tab per type.
		     ═══════════════════════════════════════════════════════════════ -->
		<Tabs.Content value="assessments" class="flex flex-col gap-4">
			{#if data.assessmentResults.length === 0}
				<Card class="flex flex-col items-center gap-3 border-dashed p-12 text-center">
					<div class="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
						<Award class="size-5" />
					</div>
					<div>
						<p class="text-base font-semibold">No released results yet</p>
						<p class="mt-1 text-sm text-muted-foreground">
							Results appear here once your lecturer or exam officer releases them.
						</p>
					</div>
				</Card>
			{:else}
				<Tabs.Root bind:value={activeResultsType}>
					<Tabs.List>
						{#each groupedResults as group (group.type)}
							{@const Icon = typeIcon[group.type]}
							<Tabs.Trigger value={group.type}>
								<Icon class="mr-1.5 size-3.5" />
								{typeLabel[group.type] ?? group.type}
								<Badge variant="secondary" class="ml-2 font-normal">{group.results.length}</Badge>
							</Tabs.Trigger>
						{/each}
					</Tabs.List>

					{#each groupedResults as group (group.type)}
						<Tabs.Content value={group.type} class="flex flex-col gap-3">
							{#each group.results as r (r.id)}
								<Card class="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
									<div class="flex flex-col gap-1">
										<div class="flex flex-wrap items-center gap-2">
											{#if r.course}
												<Badge variant="secondary" class="font-normal">{r.course.code}</Badge>
											{/if}
											{#if r.isRevised}
												<span class="flex items-center gap-1 text-xs text-muted-foreground">
													<History class="size-3" /> Revised
												</span>
											{/if}
										</div>
										<p class="font-medium leading-snug">{r.title}</p>
										<p class="text-xs text-muted-foreground">Released {formatDate(r.releasedAt)}</p>
										{#if r.allowReview}
											<Button href={`/student/results/${r.id}/review`} variant="link" size="sm" class="h-auto w-fit p-0 text-xs">
												<BookOpen class="mr-1 size-3" /> Review Questions
											</Button>
										{/if}
									</div>

									<div class="flex items-center gap-3">
										<div class="text-right">
											<p class="font-semibold">{r.marksObtained}/{r.totalMarks}</p>
											<p class="text-xs text-muted-foreground">{r.percentage}%</p>
										</div>
										{#if r.grade}
											<Badge variant={gradeVariant[r.grade] ?? 'outline'} class="text-base">{r.grade}</Badge>
										{/if}
									</div>
								</Card>
							{/each}
						</Tabs.Content>
					{/each}
				</Tabs.Root>
			{/if}
		</Tabs.Content>
	</Tabs.Root>
</main>