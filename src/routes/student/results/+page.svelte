<script lang="ts">
	import {
		BarChart3,
		Award,
		TrendingUp,
		XCircle,
		CheckCircle2,
		Clock,
		Calendar,
		AlertTriangle,
		ArrowRight,
		BookOpen,
		FileText,
		Filter,
		Search,
		Grid3X3,
		List,
		ChevronDown,
		Download,
		PieChart,
		Star,
		Target
	} from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let filter = $state<'all' | 'passed' | 'failed'>('all');
	let search = $state('');
	let viewMode = $state<'grid' | 'list'>('list');
	let sortBy = $state<'date' | 'score' | 'course'>('date');

	const filteredAndSorted = $derived(() => {
		let list = [...data.results];

		// Apply filters
		if (filter === 'passed') list = list.filter((r) => r.passed);
		if (filter === 'failed') list = list.filter((r) => !r.passed);

		if (search.trim()) {
			const q = search.toLowerCase();
			list = list.filter(
				(r) =>
					r.examTitle.toLowerCase().includes(q) ||
					r.courseCode.toLowerCase().includes(q) ||
					r.courseTitle.toLowerCase().includes(q)
			);
		}

		// Apply sorting
		list.sort((a, b) => {
			if (sortBy === 'date')
				return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
			if (sortBy === 'score') return (b.percentage || 0) - (a.percentage || 0);
			if (sortBy === 'course') return a.courseCode.localeCompare(b.courseCode);
			return 0;
		});

		return list;
	});

	function gradeColor(g: string | null) {
		if (!g) return 'var(--color-muted)';
		if (['A', 'B'].includes(g)) return '#10b981';
		if (['C', 'D'].includes(g)) return '#3b82f6';
		if (['E'].includes(g)) return '#f59e0b';
		return '#ef4444';
	}

	function formatDate(d: Date | string | null) {
		if (!d) return '—';
		const date = new Date(d);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));

		if (days === 0) return 'Today';
		if (days === 1) return 'Yesterday';
		if (days < 7) return `${days} days ago`;
		return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
	}

	function formatDuration(mins: number) {
		if (mins < 60) return `${mins}m`;
		const h = Math.floor(mins / 60);
		const m = mins % 60;
		return m > 0 ? `${h}h ${m}m` : `${h}h`;
	}

	const getPerformanceMessage = (percentage: number) => {
		if (percentage >= 70) return 'Excellent!';
		if (percentage >= 60) return 'Good work!';
		if (percentage >= 50) return 'Satisfactory';
		if (percentage >= 40) return 'Need improvement';
		return 'Requires retake';
	};
</script>

<div class="results-page">
	<!-- Header -->
	<div class="page-header">
		<div class="header-left">
			<h1>My Results</h1>
			<p class="page-sub">Track your academic performance</p>
		</div>
		<button class="export-btn" onclick={() => window.print()}>
			<Download size={14} />
			<span class="hide-mobile">Export</span>
		</button>
	</div>

	<!-- Stats Cards - Mobile First Grid -->
	<div class="stats-grid">
		<div class="stat-card">
			<div class="stat-icon" style="background: #10b98110; color: #10b981;">
				<BarChart3 size={20} />
			</div>
			<div class="stat-info">
				<span class="stat-value">{data.stats.totalExams}</span>
				<span class="stat-label">Total Exams</span>
			</div>
		</div>
		<div class="stat-card">
			<div class="stat-icon" style="background: #10b98110; color: #10b981;">
				<CheckCircle2 size={20} />
			</div>
			<div class="stat-info">
				<span class="stat-value">{data.stats.passedExams}</span>
				<span class="stat-label">Passed</span>
			</div>
		</div>
		<div class="stat-card">
			<div class="stat-icon" style="background: #ef444410; color: #ef4444;">
				<XCircle size={20} />
			</div>
			<div class="stat-info">
				<span class="stat-value">{data.stats.failedExams}</span>
				<span class="stat-label">Failed</span>
			</div>
		</div>
		<div class="stat-card">
			<div class="stat-icon" style="background: #8b5cf610; color: #8b5cf6;">
				<Award size={20} />
			</div>
			<div class="stat-info">
				<span class="stat-value">{data.stats.avgPercentage}%</span>
				<span class="stat-label">Average</span>
			</div>
		</div>
		<div class="stat-card">
			<div class="stat-icon" style="background: #06b6d410; color: #06b6d4;">
				<Star size={20} />
			</div>
			<div class="stat-info">
				<span class="stat-value">{data.stats.totalCreditUnits}</span>
				<span class="stat-label">Credits</span>
			</div>
		</div>
	</div>

	<!-- Filters Bar - Mobile Optimized -->
	<div class="filters-section">
		<div class="search-wrapper">
  <div class="search-icon-wrapper">
    <Search size={16} />
  </div>
  <input 
    type="text" 
    placeholder="Search exams or courses..." 
    bind:value={search}
    class="search-input"
  />
</div>

		<div class="filter-actions">
			<div class="filter-chips">
				<button class="chip" class:active={filter === 'all'} onclick={() => (filter = 'all')}>
					All
				</button>
				<button class="chip" class:active={filter === 'passed'} onclick={() => (filter = 'passed')}>
					<CheckCircle2 size={12} /> Passed
				</button>
				<button class="chip" class:active={filter === 'failed'} onclick={() => (filter = 'failed')}>
					<XCircle size={12} /> Failed
				</button>
			</div>

			<div class="view-controls">
				<select class="sort-select" bind:value={sortBy}>
					<option value="date">Latest First</option>
					<option value="score">Highest Score</option>
					<option value="course">Course Code</option>
				</select>

				<div class="view-toggle">
					<button
						class="view-btn"
						class:active={viewMode === 'grid'}
						onclick={() => (viewMode = 'grid')}
						aria-label="Grid view"
					>
						<Grid3X3 size={14} />
					</button>
					<button
						class="view-btn"
						class:active={viewMode === 'list'}
						onclick={() => (viewMode = 'list')}
						aria-label="List view"
					>
						<List size={14} />
					</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Results Display -->
	{#if filteredAndSorted().length === 0}
		<div class="empty-state">
			<FileText size={48} strokeWidth={1.2} />
			<h3>No results found</h3>
			<p>Try adjusting your search or filter criteria</p>
		</div>
	{:else}
		<!-- Grid View (Mobile Default) -->
		{#if viewMode === 'grid'}
			<div class="results-grid">
				{#each filteredAndSorted() as result (result.id)}
					<div class="result-card">
						<!-- Header -->
						<div class="card-header">
							<div>
								<span class="course-code">{result.courseCode}</span>
								<span class="exam-name">{result.examTitle}</span>
							</div>
							<div
								class="grade-badge"
								style="background: {gradeColor(result.grade)}15; color: {gradeColor(result.grade)};"
							>
								{result.grade ?? '—'}
							</div>
						</div>

						<!-- Score Section -->
						<div class="score-section">
							<div
								class="percentage-circle"
								style="--percentage: {result.percentage ?? 0}; --color: {gradeColor(result.grade)};"
							>
								<svg viewBox="0 0 36 36" class="circular-chart">
									<path
										class="circle-bg"
										d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
									/>
									<path
										class="circle"
										stroke-dasharray="{(result.percentage ?? 0) * 1.005}, 100"
										d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
									/>
									<text x="18" y="20.35" class="percentage-text">{result.percentage ?? 0}%</text>
								</svg>
							</div>
							<div class="score-details">
								<span class="score-value">{result.score ?? 0}/{result.totalMarks}</span>
								<span class="score-label">Total Marks</span>
							</div>
						</div>

						<!-- Performance Message -->
						<div class="performance-message" style="color: {gradeColor(result.grade)};">
							<Target size={12} />
							<span>{getPerformanceMessage(result.percentage ?? 0)}</span>
						</div>

						<!-- Meta Info -->
						<div class="card-meta">
							<div class="meta-item">
								<Clock size={12} />
								<span>{formatDuration(result.durationMinutes)}</span>
							</div>
							<div class="meta-item">
								<Calendar size={12} />
								<span>{formatDate(result.submittedAt)}</span>
							</div>
							<div class="status-badge" class:passed={result.passed} class:failed={!result.passed}>
								{#if result.passed}
									<CheckCircle2 size={12} /> Passed
								{:else}
									<XCircle size={12} /> Failed
								{/if}
							</div>
						</div>

						<!-- Action -->
						<a href="/student/results/{result.id}" class="view-details">
							View Details <ArrowRight size={14} />
						</a>
					</div>
				{/each}
			</div>
		{:else}
			<!-- List View (Table for Desktop) -->
			<div class="table-wrapper">
				<table class="results-table">
					<thead>
						<tr>
							<th>Exam</th>
							<th>Score</th>
							<th>Grade</th>
							<th>Status</th>
							<th>Date</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{#each filteredAndSorted() as result (result.id)}
							<tr>
								<td class="exam-cell">
									<span class="exam-code">{result.courseCode}</span>
									<span class="exam-title">{result.examTitle}</span>
								</td>
								<td class="score-cell">
									<div class="score-bar-mini">
										<div
											class="score-bar-fill"
											style="width: {result.percentage ?? 0}%; background: {gradeColor(
												result.grade
											)};"
										></div>
									</div>
									<span class="score-text">{result.score ?? 0}/{result.totalMarks}</span>
								</td>
								<td>
									<span
										class="grade-chip"
										style="background: {gradeColor(result.grade)}15; color: {gradeColor(
											result.grade
										)};"
									>
										{result.grade ?? '—'}
									</span>
								</td>
								<td>
									<span
										class="status-chip"
										class:passed={result.passed}
										class:failed={!result.passed}
									>
										{#if result.passed}Passed{:else}Failed{/if}
									</span>
								</td>
								<td class="date-cell">{formatDate(result.submittedAt)}</td>
								<td>
									<a href="/student/results/{result.id}" class="view-link">
										<ArrowRight size={16} />
									</a>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{/if}
</div>

<style>
	.results-page {
		max-width: 1400px;
		margin: 0 auto;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	/* Header */
	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.header-left h1 {
		font-size: 1.5rem;
		font-weight: 800;
		color: var(--color-text);
		margin: 0 0 0.25rem;
	}

	.page-sub {
		font-size: 0.875rem;
		color: var(--color-muted);
		margin: 0;
	}

	.export-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		color: var(--color-muted);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.export-btn:hover {
		border-color: var(--green-600);
		color: var(--green-600);
	}

	/* Stats Grid - Mobile First */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.75rem;
	}

	.stat-card {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.875rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
		transition: all 0.2s;
	}

	.stat-icon {
		width: 44px;
		height: 44px;
		border-radius: 0.75rem;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.stat-info {
		flex: 1;
	}

	.stat-value {
		display: block;
		font-size: 1.25rem;
		font-weight: 800;
		color: var(--color-text);
		line-height: 1.2;
	}

	.stat-label {
		display: block;
		font-size: 0.7rem;
		color: var(--color-muted);
		font-weight: 500;
	}

	/* Filters */
	.filters-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.search-wrapper {
		position: relative;
		width: 100%;
	}

	.search-icon-wrapper {
		position: absolute;
		left: 1rem;
		top: 1rem;
		top: 50%;
		transform: translateY(-50%);
		color: var(--color-muted);
		pointer-events: none;
		z-index: 1;
	}

	.search-input {
		width: 100%;
		padding: 0.75rem 1rem 0.75rem 2.75rem;
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
		background: var(--color-surface);
		font-size: 0.875rem;
		color: var(--color-text);
		outline: none;
		transition: all 0.2s;
	}
	.search-input:focus {
		border-color: var(--green-600);
	}

	.filter-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		justify-content: space-between;
		align-items: center;
	}

	.filter-chips {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.chip {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 0.875rem;
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		border-radius: 2rem;
		font-size: 0.813rem;
		font-weight: 600;
		color: var(--color-muted);
		cursor: pointer;
		transition: all 0.2s;
	}

	.chip.active {
		background: var(--green-600);
		border-color: var(--green-600);
		color: white;
	}

	.view-controls {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.sort-select {
		padding: 0.5rem 2rem 0.5rem 0.875rem;
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		background: var(--color-surface);
		font-size: 0.813rem;
		color: var(--color-text);
		cursor: pointer;
		appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 0.5rem center;
	}

	.view-toggle {
		display: flex;
		gap: 0.25rem;
		padding: 0.25rem;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
	}

	.view-btn {
		padding: 0.375rem 0.625rem;
		border: none;
		background: transparent;
		border-radius: 0.375rem;
		color: var(--color-muted);
		cursor: pointer;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.view-btn.active {
		background: var(--green-600);
		color: white;
	}

	/* Empty State */
	.empty-state {
		text-align: center;
		padding: 3rem 1.5rem;
		background: var(--color-surface);
		border-radius: 1rem;
		border: 1px solid var(--color-border);
	}

	.empty-state svg {
		color: var(--color-muted);
		margin-bottom: 1rem;
	}

	.empty-state h3 {
		font-size: 1.125rem;
		font-weight: 700;
		margin: 0 0 0.5rem;
		color: var(--color-text);
	}

	.empty-state p {
		font-size: 0.875rem;
		color: var(--color-muted);
		margin: 0;
	}

	/* Grid View (Cards) */
	.results-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1rem;
	}

	.result-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 1rem;
		padding: 1rem;
		transition: all 0.2s;
	}

	.result-card:hover {
		border-color: var(--green-600);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1rem;
	}

	.course-code {
		display: block;
		font-size: 0.7rem;
		font-weight: 700;
		font-family: monospace;
		color: var(--green-600);
		margin-bottom: 0.25rem;
	}

	.exam-name {
		display: block;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text);
	}

	.grade-badge {
		padding: 0.25rem 0.5rem;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 700;
	}

	.score-section {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
		padding: 1rem 0;
		border-top: 1px solid var(--color-border);
		border-bottom: 1px solid var(--color-border);
	}

	.percentage-circle {
		width: 80px;
		height: 80px;
	}

	.circular-chart {
		width: 100%;
		height: 100%;
	}

	.circle-bg {
		fill: none;
		stroke: var(--color-border);
		stroke-width: 2.8;
	}

	.circle {
		fill: none;
		stroke-width: 2.8;
		stroke: var(--color);
		stroke-linecap: round;
		animation: progress 1s ease-out forwards;
		stroke-dasharray: 0, 100;
	}

	.percentage-text {
		fill: var(--color-text);
		font-size: 0.5rem;
		font-weight: 700;
		text-anchor: middle;
		dominant-baseline: middle;
	}

	@keyframes progress {
		to {
			stroke-dasharray: var(--percentage), 100;
		}
	}

	.score-details {
		text-align: right;
	}

	.score-value {
		display: block;
		font-size: 1.125rem;
		font-weight: 800;
		color: var(--color-text);
	}

	.score-label {
		font-size: 0.7rem;
		color: var(--color-muted);
	}

	.performance-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.813rem;
		font-weight: 600;
		margin-bottom: 1rem;
		padding: 0.5rem;
		background: var(--color-bg);
		border-radius: 0.5rem;
	}

	.card-meta {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
		margin-bottom: 1rem;
		padding-top: 0.5rem;
	}

	.meta-item {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.75rem;
		color: var(--color-muted);
	}

	.status-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.25rem 0.625rem;
		border-radius: 0.375rem;
		font-size: 0.7rem;
		font-weight: 700;
	}

	.status-badge.passed {
		background: var(--green-soft);
		color: var(--green-700);
	}

	.status-badge.failed {
		background: rgba(239, 68, 68, 0.1);
		color: #ef4444;
	}

	.view-details {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		background: var(--color-bg);
		border-radius: 0.5rem;
		font-size: 0.813rem;
		font-weight: 600;
		color: var(--green-600);
		text-decoration: none;
		transition: all 0.2s;
	}

	.view-details:hover {
		background: var(--green-soft);
	}

	/* Table View */
	.table-wrapper {
		overflow-x: auto;
	}

	.results-table {
		width: 100%;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 1rem;
		border-collapse: collapse;
		overflow: hidden;
	}

	.results-table thead th {
		padding: 1rem;
		text-align: left;
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-muted);
		background: var(--color-bg);
		border-bottom: 1px solid var(--color-border);
	}

	.results-table tbody tr {
		border-bottom: 1px solid var(--color-border);
		transition: background 0.2s;
	}

	.results-table tbody tr:hover {
		background: var(--color-bg);
	}

	.results-table td {
		padding: 1rem;
	}

	.exam-cell {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.exam-code {
		font-size: 0.7rem;
		font-weight: 700;
		font-family: monospace;
		color: var(--green-600);
	}

	.exam-title {
		font-size: 0.813rem;
		font-weight: 600;
		color: var(--color-text);
	}

	.score-cell {
		min-width: 120px;
	}

	.score-bar-mini {
		width: 100%;
		height: 4px;
		background: var(--color-border);
		border-radius: 2px;
		overflow: hidden;
		margin-bottom: 0.375rem;
	}

	.score-bar-fill {
		height: 100%;
		border-radius: 2px;
		transition: width 0.3s;
	}

	.score-text {
		font-size: 0.75rem;
		color: var(--color-muted);
	}

	.grade-chip {
		display: inline-block;
		padding: 0.25rem 0.5rem;
		border-radius: 0.375rem;
		font-size: 0.813rem;
		font-weight: 700;
	}

	.status-chip {
		display: inline-block;
		padding: 0.25rem 0.625rem;
		border-radius: 0.375rem;
		font-size: 0.75rem;
		font-weight: 700;
	}

	.status-chip.passed {
		background: var(--green-soft);
		color: var(--green-700);
	}

	.status-chip.failed {
		background: rgba(239, 68, 68, 0.1);
		color: #ef4444;
	}

	.date-cell {
		font-size: 0.75rem;
		color: var(--color-muted);
		white-space: nowrap;
	}

	.view-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 0.5rem;
		color: var(--color-muted);
		text-decoration: none;
		transition: all 0.2s;
	}

	.view-link:hover {
		background: var(--green-soft);
		color: var(--green-600);
	}

	/* Tablet & Desktop Responsive */
	@media (min-width: 640px) {
		.results-page {
			padding: 1.5rem;
			gap: 2rem;
		}

		.stats-grid {
			grid-template-columns: repeat(3, 1fr);
			gap: 1rem;
		}

		.filters-section {
			flex-direction: row;
			gap: 1rem;
		}

		.search-wrapper {
			flex: 1;
			max-width: 300px;
		}

		.filter-actions {
			flex: 1;
		}

		.results-grid {
			grid-template-columns: repeat(2, 1fr);
			gap: 1rem;
		}
	}

	@media (min-width: 1024px) {
		.stats-grid {
			grid-template-columns: repeat(5, 1fr);
		}

		.results-grid {
			grid-template-columns: repeat(3, 1fr);
			gap: 1.25rem;
		}
	}

	@media (max-width: 767px) {
		.hide-mobile {
			display: none;
		}

		.view-controls {
			width: 100%;
			justify-content: space-between;
		}

		.sort-select {
			flex: 1;
		}
	}
</style>
