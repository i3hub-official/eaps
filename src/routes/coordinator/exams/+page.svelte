<!-- src/routes/coordinator/exams/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	import {
		ClipboardList, Search, X, Calendar, Clock,
		Users, CheckCircle, AlertCircle, FileText,
		ChevronRight, BarChart3, Filter
	} from '@lucide/svelte';

	let { data }: { data: PageData } = $props();

	let search = $state('');
	let statusFilter = $state<'all' | 'draft' | 'scheduled' | 'active' | 'completed' | 'cancelled'>('all');

	const filteredExams = $derived(() => {
		return data.exams.filter(e => {
			const matchesSearch = !search ||
				e.title.toLowerCase().includes(search.toLowerCase()) ||
				e.course.code.toLowerCase().includes(search.toLowerCase());
			const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
			return matchesSearch && matchesStatus;
		});
	});

	const statusColors: Record<string, string> = {
		draft: '#64748b',
		scheduled: '#0ea5e9',
		active: '#22c55e',
		completed: '#8b5cf6',
		cancelled: '#ef4444'
	};

	const statusIcons: Record<string, any> = {
		draft: FileText,
		scheduled: Calendar,
		active: Clock,
		completed: CheckCircle,
		cancelled: AlertCircle
	};

	const statusLabels: Record<string, string> = {
		draft: 'Draft',
		scheduled: 'Scheduled',
		active: 'Active',
		completed: 'Completed',
		cancelled: 'Cancelled'
	};

	function getStatusColor(status: string): string {
		return statusColors[status] || '#64748b';
	}

	function getStatusLabel(status: string): string {
		return statusLabels[status] || status;
	}

	function getStatusIcon(status: string) {
		return statusIcons[status] || FileText;
	}

	function formatDate(date: Date | null): string {
		if (!date) return 'Not scheduled';
		return new Date(date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getStatusCount(status: string): number {
		return data.statusCounts[status as keyof typeof data.statusCounts] || 0;
	}
</script>

<svelte:head>
	<title>Exams — Dept Coordinator</title>
</svelte:head>

<div class="page">
	<!-- Header -->
	<header class="page-header">
		<div>
			<h1>Exams</h1>
			<p class="subtitle">
				{data.stats.total} exams in your department
			</p>
		</div>
		<a href="/coordinator/exams/create" class="btn btn-primary">
			<ClipboardList size={14} /> Create Exam
		</a>
	</header>

	<!-- Stats Grid -->
	<div class="stats-grid">
		<div class="stat-card">
			<div class="stat-icon" style="background: rgba(5,150,105,0.1); color: #059669;">
				<ClipboardList size={20} />
			</div>
			<div>
				<div class="stat-value">{data.stats.total}</div>
				<div class="stat-label">Total Exams</div>
			</div>
		</div>
		<div class="stat-card">
			<div class="stat-icon" style="background: rgba(34,197,94,0.1); color: #22c55e;">
				<Clock size={20} />
			</div>
			<div>
				<div class="stat-value">{data.stats.active}</div>
				<div class="stat-label">Active</div>
			</div>
		</div>
		<div class="stat-card">
			<div class="stat-icon" style="background: rgba(14,165,233,0.1); color: #0ea5e9;">
				<Calendar size={20} />
			</div>
			<div>
				<div class="stat-value">{data.stats.scheduled}</div>
				<div class="stat-label">Scheduled</div>
			</div>
		</div>
		<div class="stat-card">
			<div class="stat-icon" style="background: rgba(139,92,246,0.1); color: #8b5cf6;">
				<CheckCircle size={20} />
			</div>
			<div>
				<div class="stat-value">{data.stats.completed}</div>
				<div class="stat-label">Completed</div>
			</div>
		</div>
		<div class="stat-card">
			<div class="stat-icon" style="background: rgba(99,102,241,0.1); color: #6366f1;">
				<Users size={20} />
			</div>
			<div>
				<div class="stat-value">{data.stats.totalSessions}</div>
				<div class="stat-label">Total Sessions</div>
			</div>
		</div>
	</div>

	<!-- Status Breakdown -->
	<div class="status-breakdown">
		{#each Object.keys(statusLabels) as status}
			{@const count = getStatusCount(status)}
			{@const Icon = getStatusIcon(status)}
			<div class="status-item" style="--status-color:{getStatusColor(status)};">
				<Icon size={14} />
				<span>{statusLabels[status]}</span>
				<span class="status-count">{count}</span>
			</div>
		{/each}
	</div>

	<!-- Filters -->
	<div class="filters-bar">
		<div class="filter-group">
			<div class="search-wrap">
				<Search size={14} />
				<input
					type="text"
					class="search-input"
					placeholder="Search exams..."
					bind:value={search}
				/>
				{#if search}
					<button class="search-clear" onclick={() => search = ''}><X size={12} /></button>
				{/if}
			</div>

			<select class="filter-select" bind:value={statusFilter}>
				<option value="all">All Status</option>
				<option value="draft">Draft</option>
				<option value="scheduled">Scheduled</option>
				<option value="active">Active</option>
				<option value="completed">Completed</option>
				<option value="cancelled">Cancelled</option>
			</select>
		</div>
		<span class="result-count">{filteredExams().length} exams</span>
	</div>

	<!-- Exam List -->
	<div class="exam-list">
		{#each filteredExams() as exam (exam.id)}
			<a href={`/coordinator/exams/${exam.id}`} class="exam-item">
				<div class="exam-info">
					<span class="exam-code">{exam.course.code}</span>
					<span class="exam-title">{exam.title}</span>
					<span class="exam-lecturer">{exam.lecturer.fullName}</span>
				</div>
				<div class="exam-meta">
					<span class="exam-status" style="color:{getStatusColor(exam.status)};">
						<svelte:component this={getStatusIcon(exam.status)} size={12} />
						{getStatusLabel(exam.status)}
					</span>
					<span class="exam-date">
						<Calendar size={12} />
						{formatDate(exam.scheduledStart)}
					</span>
					<span class="exam-sessions">
						<Users size={12} />
						{exam.examSessions.length} sessions
					</span>
					<span class="exam-marks">
						<BarChart3 size={12} />
						{exam.totalMarks} marks
					</span>
					<ChevronRight size={16} class="exam-arrow" />
				</div>
			</a>
		{:else}
			<div class="empty-state">
				<ClipboardList size={48} strokeWidth={1} color="var(--color-muted)" />
				<p>No exams found matching your filters</p>
			</div>
		{/each}
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
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
		gap: 1rem;
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

	.btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.625rem 1.125rem;
		border-radius: 0.625rem;
		font-size: 0.85rem;
		font-weight: 600;
		text-decoration: none;
		cursor: pointer;
		transition: all 0.15s;
		border: none;
		font-family: inherit;
	}
	.btn-primary {
		background: #059669;
		color: white;
	}
	.btn-primary:hover {
		background: #047857;
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
	}

	/* Stats */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: 0.75rem;
		margin-bottom: 1rem;
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

	/* Status Breakdown */
	.status-breakdown {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
		padding: 0.75rem 1rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
	}
	.status-item {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-text);
		background: var(--color-bg);
		padding: 0.25rem 0.6rem;
		border-radius: 999px;
	}
	.status-item :global(svg) {
		color: var(--status-color);
	}
	.status-count {
		font-weight: 700;
		color: var(--color-text);
		background: var(--color-border);
		padding: 0.05rem 0.4rem;
		border-radius: 999px;
		font-size: 0.65rem;
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

	/* Exam List */
	.exam-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.exam-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.875rem 1.25rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
		text-decoration: none;
		transition: all 0.2s ease;
		gap: 1rem;
		flex-wrap: wrap;
	}
	.exam-item:hover {
		border-color: #059669;
		box-shadow: 0 2px 8px rgba(5, 150, 105, 0.08);
		transform: translateX(4px);
	}

	.exam-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}
	.exam-code {
		font-size: 0.75rem;
		font-weight: 700;
		color: #059669;
		background: rgba(5, 150, 105, 0.08);
		padding: 0.15rem 0.5rem;
		border-radius: 0.3rem;
	}
	.exam-title {
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--color-text);
	}
	.exam-lecturer {
		font-size: 0.75rem;
		color: var(--color-muted);
	}

	.exam-meta {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}
	.exam-status {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.7rem;
		font-weight: 600;
	}
	.exam-date, .exam-sessions, .exam-marks {
		display: flex;
		align-items: center;
		gap: 0.2rem;
		font-size: 0.7rem;
		color: var(--color-muted);
	}
	.exam-arrow {
		color: var(--color-muted);
		flex-shrink: 0;
	}

	/* Empty State */
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
		.exam-item {
			flex-direction: column;
			align-items: flex-start;
		}
		.exam-meta {
			width: 100%;
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