<!-- src/routes/lecturer/reports/assessments/+page.svelte -->
<script lang="ts">
	import { Topbar } from '$lib/components/dashboard';
	import { Card } from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { enhance } from '$app/forms';
	import FileJson from '@lucide/svelte/icons/file-json';
	import FileText from '@lucide/svelte/icons/file-text';
	import Download from '@lucide/svelte/icons/download';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import Loader from '@lucide/svelte/icons/loader';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';

	let { data, form } = $props();

	let isExportingCsv = $state(false);
	let isExportingPdf = $state(false);
	let expandedAssessments = $state<Set<string>>(new Set());

	function toggleAssessment(assessmentId: string) {
		if (expandedAssessments.has(assessmentId)) {
			expandedAssessments.delete(assessmentId);
		} else {
			expandedAssessments.add(assessmentId);
		}
		expandedAssessments = expandedAssessments;
	}

	function formatDate(date: string | Date | null) {
		if (!date) return '—';
		return new Date(date).toLocaleString('en-NG', {
			dateStyle: 'short',
			timeStyle: 'short',
		});
	}

	type AssessmentResult = {
		marks: number;
		totalMarks: number;
		percentage: number;
		grade: string | null;
		passed: boolean;
		submittedAt: string | Date | null;
	};

	function getStatusBadge(passed: boolean): { label: string; variant: 'default' | 'destructive' } {
		return passed
			? { label: 'Pass', variant: 'default' }
			: { label: 'Fail', variant: 'destructive' };
	}

	// ─── FIX: Use regular Map instead of SvelteMap ──────────────────────────
	let assessmentsByClass = $state<Map<string, typeof data.assessments>>(new Map());

	$effect(() => {
		const grouped = new Map<string, typeof data.assessments>();
		if (data?.assessments) {
			for (const assessment of data.assessments) {
				const key = assessment.courseCode;
				if (!grouped.has(key)) {
					grouped.set(key, []);
				}
				grouped.get(key)!.push(assessment);
			}
		}
		assessmentsByClass = grouped;
	});

	function handleCsvExport() {
		isExportingCsv = true;
	}

	function handlePdfExport() {
		isExportingPdf = true;
	}

	function downloadCsv(csv: string, filename: string) {
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		const link = document.createElement('a');
		const url = URL.createObjectURL(blob);
		link.setAttribute('href', url);
		link.setAttribute('download', filename);
		link.style.visibility = 'hidden';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	function downloadPdf(html: string, filename: string) {
		const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const win = window.open(url, '_blank');
		if (win) {
			win.print();
		}
	}

	$effect(() => {
		if (form?.success && form?.csv && form?.filename) {
			downloadCsv(form.csv, form.filename);
			isExportingCsv = false;
		}
	});

	$effect(() => {
		if (form?.success && form?.html && form?.filename) {
			downloadPdf(form.html, form.filename);
			isExportingPdf = false;
		}
	});
</script>

<Topbar title="Assessment Report" description="View and export scores for all students across all your assessments" />

<main class="flex flex-1 flex-col gap-6 p-6">
	{#if form?.error}
		<div class="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
			<AlertCircle class="mt-0.5 size-4 shrink-0" />
			<span>{form.error}</span>
		</div>
	{/if}

	{#if data?.assessments?.length === 0}
		<Card class="flex flex-col items-center gap-3 p-12 text-center">
			<div class="flex size-10 items-center justify-center rounded-md bg-muted">
				<FileText class="size-5 text-muted-foreground" />
			</div>
			<div>
				<p class="text-base font-semibold">No assessments yet</p>
				<p class="mt-1 text-sm text-muted-foreground">
					You haven't created any TEST, EXAMINATION, or ASSIGNMENT assessments with released results yet.
				</p>
			</div>
		</Card>
	{:else}
		<!-- Export buttons -->
		<div class="flex gap-2">
			<form method="POST" action="?/exportCsv" use:enhance={handleCsvExport}>
				<Button type="submit" variant="outline" disabled={isExportingCsv}>
					{#if isExportingCsv}
						<Loader class="mr-2 size-4 animate-spin" />
						Exporting…
					{:else}
						<Download class="mr-2 size-4" />
						Export CSV
					{/if}
				</Button>
			</form>

			<form method="POST" action="?/exportPdf" use:enhance={handlePdfExport}>
				<Button type="submit" variant="outline" disabled={isExportingPdf}>
					{#if isExportingPdf}
						<Loader class="mr-2 size-4 animate-spin" />
						Exporting…
					{:else}
						<FileText class="mr-2 size-4" />
						Export PDF
					{/if}
				</Button>
			</form>
		</div>

		<!-- Summary stats -->
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<Card class="p-4">
				<p class="text-xs text-muted-foreground">Total Assessments</p>
				<p class="mt-1 text-2xl font-semibold">{data.assessments.length}</p>
			</Card>
			<Card class="p-4">
				<p class="text-xs text-muted-foreground">Total Students</p>
				<p class="mt-1 text-2xl font-semibold">{data.students.length}</p>
			</Card>
			<Card class="p-4">
				<p class="text-xs text-muted-foreground">Total Results</p>
				<p class="mt-1 text-2xl font-semibold">
					{data.assessments.reduce((sum, a) => sum + a.resultCount, 0)}
				</p>
			</Card>
			<Card class="p-4">
				<p class="text-xs text-muted-foreground">Avg Coverage</p>
				<p class="mt-1 text-2xl font-semibold">
					{data.students.length > 0
						? Math.round(
								(data.assessments.reduce((sum, a) => sum + a.resultCount, 0) /
									(data.assessments.length * data.students.length)) *
									100,
							)
						: 0}%
				</p>
			</Card>
		</div>

		<!-- Report table by course -->
		<div class="flex flex-col gap-6">
			{#each Array.from(assessmentsByClass.entries()) as [courseCode, courseAssessments] (courseCode)}
				{@const courseList = Array.isArray(courseAssessments) ? courseAssessments : Array.from(courseAssessments)}
				<Card class="overflow-hidden">
					<div class="border-b bg-muted/40 px-6 py-3">
						<p class="font-semibold">{courseCode}</p>
						<p class="text-xs text-muted-foreground">
							{courseList.length} assessment{courseList.length === 1 ? '' : 's'} · {data.students.length} student{data.students.length === 1 ? '' : 's'}
						</p>
					</div>

					<div class="overflow-x-auto">
						<table class="w-full text-sm">
							<thead>
								<tr class="border-b bg-muted/20">
									<th class="sticky left-0 z-10 border-r bg-muted/40 px-4 py-2 text-left font-medium">
										Student
									</th>
									{#each courseList as assessment (assessment.id)}
										<th class="px-4 py-2 text-left font-medium">
											<div class="flex flex-col gap-1">
												<p class="font-semibold text-xs">{assessment.title}</p>
												<p class="text-xs text-muted-foreground">{assessment.type}</p>
											</div>
										</th>
									{/each}
								</tr>
							</thead>
							<tbody>
								{#each data.students as student (student.id)}
									<tr class="border-b hover:bg-muted/30">
										<td class="sticky left-0 z-10 border-r bg-background px-4 py-3 font-medium">
											<div class="flex flex-col gap-0.5">
												<p>{student.firstName} {student.lastName}</p>
												<p class="text-xs text-muted-foreground">{student.matricNumber}</p>
											</div>
										</td>
										{#each courseList as assessment (assessment.id)}
											{@const result = data.reportData[student.id]?.[assessment.id]}
											<td class="border-r px-4 py-3">
												{#if result}
													{@const statusBadge = getStatusBadge(result.passed)}
													<div class="flex flex-col gap-2">
														<!-- Marks / Percentage -->
														<div>
															<p class="font-semibold text-sm">
																{result.marks}/{result.totalMarks}
															</p>
															<p class="text-xs text-muted-foreground">{result.percentage}%</p>
														</div>

														<!-- Grade & Status -->
														<div class="flex gap-1">
															{#if result.grade}
																<Badge variant="outline" class="font-normal">
																	{result.grade}
																</Badge>
															{/if}
															<Badge
																variant={statusBadge.variant}
																class="font-normal"
															>
																{statusBadge.label}
															</Badge>
														</div>

														<!-- Submission date -->
														<p class="text-xs text-muted-foreground">
															{formatDate(result.submittedAt)}
														</p>
													</div>
												{:else}
													<div class="flex items-center justify-center py-2 text-xs text-muted-foreground">
														—
													</div>
												{/if}
											</td>
										{/each}
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</Card>
			{/each}
		</div>
	{/if}
</main>

<style>
	:global(body) {
		@apply overflow-x-hidden;
	}
</style>