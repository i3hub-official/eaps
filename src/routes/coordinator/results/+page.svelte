<!-- src/routes/coordinator/results/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	import {
		BarChart3, Search, X, Users, CheckCircle,
		AlertCircle, FileText, Calendar, Clock,
		ChevronRight, Award, TrendingUp, TrendingDown
	} from '@lucide/svelte';

	let { data }: { data: PageData } = $props();

	let search = $state('');
	let filterPassed = $state<'all' | 'passed' | 'failed' | 'pending'>('all');

	const filteredResults = $derived(() => {
		return data.results.filter(r => {
			const matchesSearch = !search ||
				r.student.fullName.toLowerCase().includes(search.toLowerCase()) ||
				r.student.matricNumber?.toLowerCase().includes(search.toLowerCase()) ||
				r.exam.course.code.toLowerCase().includes(search.toLowerCase());

			let matchesStatus = true;
			if (filterPassed === 'passed') matchesStatus = r.passed === true;
			else if (filterPassed === 'failed') matchesStatus = r.passed === false;
			else if (filterPassed === 'pending') matchesStatus = r.score === null;

			return matchesSearch && matchesStatus;
		});
	});

	function formatDate(date: Date | null): string {
		if (!date) return 'N/A';
		return new Date(date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getGradeColor(grade: string | null): string {
		if (!grade) return '#64748b';
		const g = grade.charAt(0);
		if (g === 'A') return '#22c55e';
		if (g === 'B') return '#0ea5e9';
		if (g === 'C') return '#f59e0b';
		if (g === 'D') return '#f97316';
		return '#ef4444';
	}

	function getPassedIcon(passed: boolean | null) {
		if (passed === true) return CheckCircle;
		if (passed === false) return AlertCircle;
		return Clock;
	}

	function getPassedColor(passed: boolean | null): string {
		if (passed === true) return '#22c55e';
		if (passed === false) return '#ef4444';
		return '#f59e0b';
	}
</script>

<svelte:head>
	<title>Results — Dept Coordinator</title>
</svelte:head>

<div class="page">
	<!-- Header -->
	<header class="page-header">
		<div>
			<h1>Results</h1>
			<p class="subtitle">
				{data.stats.total} results &middot;
				{data.stats.passed} passed &middot;
				{data.stats.failed} failed &middot;
				{data.stats.pending} pending
			</p>
		</div>
	</header>

	<!-- Stats Grid -->
	<div class="stats-grid">
		<div class="stat-card">
			<div class="stat-icon" style="background: rgba(5,150,105,0.1); color: #059669;">
				<BarChart3 size={20} />
			</div>
			<div>
				<div class="stat-value">{data.stats.total}</div>
				<div class="stat-label">Total Results</div>
			</div>
		</div>
		<div class="stat-card">
			<div class="stat-icon" style="background: rgba(34,197,94,0.1); color: #22c55e;">
				<CheckCircle size={20} />
			</div>
			<div>
				<div class="stat-value">{data.stats.passed}</div>
				<div class="stat-label">Passed</div>
			</div>
		</div>
		<div class="stat-card">
			<div class="stat-icon" style="background: rgba(239,68,68,0.1); color: #ef4444;">
				<AlertCircle size={20} />
			</div>
			<div>
				<div class="stat-value">{data.stats.failed}</div>
				<div class="stat-label">Failed</div>
			</div>
		</div>
		<div class="stat-card">
			<div class="stat-icon" style="background: rgba(245,158,11,0.1); color: #f59e0b;">
				<Clock size={20} />
			</div>
			<div>
				<div class="stat-value">{data.stats.pending}</div>
				<div class="stat-label">Pending</div>
			</div>
		</div>
		<div class="stat-card">
			<div class="stat-icon" style="background: rgba(99,102,241,0.1); color: #6366f1;">
				<Award size={20} />
			</div>
			<div>
				<div class="stat-value">{data.stats.averageScore.toFixed(1)}%</div>
				<div class="stat-label">Average Score</div>
			</div>
		</div>
	</div>

	<!-- Grade Distribution -->
	<div class="grade-distribution">
		<h4>Grade Distribution</h4>
		<div class="grade-bars">
			{#each ['A', 'B', 'C', 'D', 'F'] as grade}
				{@const count = data.gradeDistribution[grade as keyof typeof data.gradeDistribution] || 0}
				{@const max = Math.max(...Object.values(data.gradeDistribution), 1)}
				{@const percentage = Math.round((count / data.stats.total) * 100)}
				<div class="grade-bar">
					<span class="grade-label" style="color:{getGradeColor(grade)};">{grade}</span>
					<div class="grade-track">
						<div 
							class="grade-fill" 
							style="width:{percentage}%; background:{getGradeColor(grade)};"
						></div>
					</div>
					<span class="grade-count">{count}</span>
				</div>
			{/each}
		</div>
	</div>

	<!-- Filters -->
	<div class="filters-bar">
		<div class="filter-group">
			<div class="search-wrap">
				<Search size={14} />
				<input
					type="text"
					class="search-input"
					placeholder="Search by student or course..."
					bind:value={search}
				/>
				{#if search}
					<button class="search-clear" onclick={() => search = ''}><X size={12} /></button>
				{/if}
			</div>

			<select class="filter-select" bind:value={filterPassed}>
				<option value="all">All Results</option>
				<option value="passed">Passed</option>
				<option value="failed">Failed</option>
				<option value="pending">Pending</option>
			</select>
		</div>
		<span class="result-count">{filteredResults().length} results</span>
	</div>

	<!-- Results Table -->
	<div class="results-table">
		<table>
			<thead>
				<tr>
					<th>Student</th>
					<th>Course</th>
					<th>Exam</th>
					<th>Score</th>
					<th>Grade</th>
					<th>Status</th>
					<th>Date</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each filteredResults() as result (result.id)}
					<tr>
						<td>
							<div class="student-info">
								<span class="student-name">{result.student.fullName}</span>
								<span class="student-matric">{result.student.matricNumber || 'N/A'}</span>
							</div>
						</td>
						<td>
							<span class="course-code">{result.exam.course.code}</span>
						</td>
						<td>
							<span class="exam-title">{result.exam.title}</span>
						</td>
						<td>
							{#if result.score !== null}
								<span class="score">{result.score}/{result.exam.totalMarks}</span>
								<span class="score-pct">({result.percentage?.toFixed(1)}%)</span>
							{:else}
								<span class="pending-text">—</span>
							{/if}
						</td>
						<td>
							{#if result.grade}
								<span class="grade-badge" style="background:{getGradeColor(result.grade)};">
									{result.grade}
								</span>
							{:else}
								<span class="pending-text">—</span>
							{/if}
						</td>
						<td>
							{#if result.passed !== null}
								<span class="status-badge" class:passed={result.passed} class:failed={!result.passed}>
									<svelte:component this={getPassedIcon(result.passed)} size={12} />
									{result.passed ? 'Passed' : 'Failed'}
								</span>
							{:else}
								<span class="status-badge pending">
									<Clock size={12} />
									Pending
								</span>
							{/if}
						</td>
						<td>
							<span class="result-date">{formatDate(result.submittedAt)}</span>
						</td>
						<td>
							<a href={`/coordinator/results/${result.id}`} class="view-btn">
								View <ChevronRight size={14} />
							</a>
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="8" class="empty-row">
							<div class="empty-state">
								<BarChart3 size={40} strokeWidth={1} color="var(--color-muted)" />
								<p>No results found matching your filters</p>
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<style>
	.page {
		max-width: 1200px;
		margin: 0 auto;
		padding: 1.5rem;
	}

	/* Header */
	.page-header {
		margin-bottom: 1.5rem;
	}
	.page-header h1 {
		font-size: 1.75rem;
		font-weight: 800;
		color: var(--color-text);
		margin: 0;
	}
	.subtitle {
		font-size: 0.85rem;
		color: var(--color-muted);
		margin: 0.25rem 0 0;
	}

	/* Stats */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}
	.stat-card {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.875rem 1rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
	}
	.stat-icon {
		width: 36px;
		height: 36px;
		border-radius: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}
	.stat-value {
		font-size: 1.25rem;
		font-weight: 800;
		color: var(--color-text);
		line-height: 1.2;
	}
	.stat-label {
		font-size: 0.7rem;
		color: var(--color-muted);
		font-weight: 500;
	}

	/* Grade Distribution */
	.grade-distribution {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
		padding: 1rem 1.25rem;
		margin-bottom: 1.5rem;
	}
	.grade-distribution h4 {
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--color-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0 0 0.75rem;
	}
	.grade-bars {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.grade-bar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.grade-label {
		font-size: 0.75rem;
		font-weight: 700;
		width: 20px;
	}
	.grade-track {
		flex: 1;
		height: 6px;
		background: var(--color-border);
		border-radius: 3px;
		overflow: hidden;
	}
	.grade-fill {
		height: 100%;
		border-radius: 3px;
		transition: width 0.6s ease;
	}
	.grade-count {
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--color-muted);
		width: 30px;
		text-align: right;
	}

	/* Filters */
	.filters-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
		margin-bottom: 1.5rem;
	}
	.filter-group {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.search-wrap {
		position: relative;
		display: flex;
		align-items: center;
	}
	.search-wrap :global(svg:first-child) {
		position: absolute;
		left: 0.65rem;
		color: var(--color-muted);
		pointer-events: none;
	}
	.search-input {
		padding: 0.45rem 0.6rem 0.45rem 2rem;
		border: 1px solid var(--color-border);
		border-radius: 0.4rem;
		background: var(--color-bg);
		color: var(--color-text);
		font-size: 0.8rem;
		width: 200px;
		font-family: inherit;
		transition: border-color 0.15s;
	}
	.search-input:focus {
		outline: none;
		border-color: #059669;
	}
	.search-clear {
		position: absolute;
		right: 0.4rem;
		background: none;
		border: none;
		cursor: pointer;
		color: var(--color-muted);
		padding: 0.15rem;
		border-radius: 0.2rem;
	}
	.search-clear:hover {
		color: var(--color-text);
	}
	.filter-select {
		padding: 0.45rem 0.6rem;
		border: 1px solid var(--color-border);
		border-radius: 0.4rem;
		background: var(--color-bg);
		color: var(--color-text);
		font-size: 0.8rem;
		font-family: inherit;
		cursor: pointer;
	}
	.result-count {
		font-size: 0.8rem;
		color: var(--color-muted);
		font-weight: 500;
	}

	/* Results Table */
	.results-table {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
		overflow: hidden;
	}
	.results-table table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
	}
	.results-table thead {
		background: var(--color-bg);
	}
	.results-table th {
		text-align: left;
		padding: 0.75rem 1rem;
		font-size: 0.7rem;
		font-weight: 700;
		color: var(--color-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		border-bottom: 1px solid var(--color-border);
	}
	.results-table td {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--color-border);
		vertical-align: middle;
	}
	.results-table tbody tr {
		transition: background 0.15s ease;
	}
	.results-table tbody tr:hover {
		background: rgba(5, 150, 105, 0.03);
	}
	.results-table tbody tr:last-child td {
		border-bottom: none;
	}

	/* Table Cells */
	.student-info {
		display: flex;
		flex-direction: column;
	}
	.student-name {
		font-weight: 600;
		color: var(--color-text);
	}
	.student-matric {
		font-size: 0.7rem;
		color: var(--color-muted);
	}

	.course-code {
		font-size: 0.75rem;
		font-weight: 700;
		color: #059669;
		background: rgba(5, 150, 105, 0.08);
		padding: 0.15rem 0.4rem;
		border-radius: 0.3rem;
	}

	.exam-title {
		font-weight: 500;
		color: var(--color-text);
	}

	.score {
		font-weight: 600;
		color: var(--color-text);
	}
	.score-pct {
		font-size: 0.7rem;
		color: var(--color-muted);
		margin-left: 0.25rem;
	}

	.grade-badge {
		display: inline-block;
		padding: 0.15rem 0.5rem;
		border-radius: 0.3rem;
		font-size: 0.75rem;
		font-weight: 700;
		color: white;
	}

	.pending-text {
		color: var(--color-muted);
	}

	.status-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.2rem 0.5rem;
		border-radius: 999px;
		font-size: 0.7rem;
		font-weight: 600;
	}
	.status-badge.passed {
		background: #dcfce7;
		color: #166534;
	}
	.status-badge.failed {
		background: #fee2e2;
		color: #991b1b;
	}
	.status-badge.pending {
		background: #fef3c7;
		color: #92400e;
	}

	.result-date {
		font-size: 0.7rem;
		color: var(--color-muted);
	}

	.view-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		font-size: 0.7rem;
		font-weight: 600;
		color: #059669;
		text-decoration: none;
		padding: 0.2rem 0.4rem;
		border-radius: 0.3rem;
		transition: background 0.15s ease;
	}
	.view-btn:hover {
		background: rgba(5, 150, 105, 0.08);
	}

	/* Empty State */
	.empty-row td {
		padding: 0;
	}
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding: 3rem 1rem;
		color: var(--color-muted);
		text-align: center;
	}
	.empty-state p {
		margin: 0;
		font-size: 0.85rem;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.page {
			padding: 1rem;
		}
		.stats-grid {
			grid-template-columns: 1fr 1fr;
		}
		.results-table {
			overflow-x: auto;
		}
		.results-table table {
			font-size: 0.75rem;
			min-width: 700px;
		}
		.results-table th,
		.results-table td {
			padding: 0.5rem 0.75rem;
		}
		.search-input {
			width: 100%;
		}
		.filters-bar {
			flex-direction: column;
			align-items: stretch;
		}
		.filter-group {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>