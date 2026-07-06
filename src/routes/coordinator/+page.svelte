<!-- src/routes/coordinator/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	import { 
		Building2, GraduationCap, ClipboardList, BarChart3,
		Clock, Users, BookOpen, ShieldCheck, AlertCircle,
		ChevronRight, Calendar, TrendingUp
	} from '@lucide/svelte';

	let { data }: { data: PageData } = $props();

	const statusColors: Record<string, string> = {
		draft: '#64748b',
		scheduled: '#0ea5e9',
		active: '#22c55e',
		completed: '#8b5cf6',
		cancelled: '#ef4444'
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

	function getInitials(name: string) {
		if (!name) return '?';
		return name.split(' ')
			.filter(w => w.length > 0)
			.map(w => w[0])
			.join('')
			.slice(0, 2)
			.toUpperCase();
	}
</script>

<svelte:head>
	<title>Dashboard — Dept Coordinator</title>
</svelte:head>

<div class="page">
	<!-- Header -->
	<header class="page-header">
		<div>
			<h1>Welcome back, <span class="highlight">{data.user?.fullName}</span></h1>
			<p class="subtitle">
				{data.department?.name} ({data.department?.code}) &middot;
				{data.department?.college?.name}
			</p>
		</div>
		<div class="header-actions">
			<a href="/coordinator/authority" class="btn btn-primary">
				<ShieldCheck size={14} /> Manage Exam Authority
			</a>
		</div>
	</header>

	<!-- Stats Grid -->
	<div class="stats-grid">
		<div class="stat-card">
			<div class="stat-icon" style="background: rgba(5,150,105,0.1); color: #059669;">
				<ClipboardList size={20} />
			</div>
			<div class="stat-content">
				<span class="stat-value">{data.stats.totalExams}</span>
				<span class="stat-label">Total Exams</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon" style="background: rgba(34,197,94,0.1); color: #22c55e;">
				<TrendingUp size={20} />
			</div>
			<div class="stat-content">
				<span class="stat-value">{data.stats.activeExams}</span>
				<span class="stat-label">Active Exams</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon" style="background: rgba(99,102,241,0.1); color: #6366f1;">
				<Users size={20} />
			</div>
			<div class="stat-content">
				<span class="stat-value">{data.stats.totalLecturers}</span>
				<span class="stat-label">Lecturers</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon" style="background: rgba(245,158,11,0.1); color: #f59e0b;">
				<BookOpen size={20} />
			</div>
			<div class="stat-content">
				<span class="stat-value">{data.stats.totalCourses}</span>
				<span class="stat-label">Courses</span>
			</div>
		</div>

		{#if data.stats.pendingAuthority > 0}
			<div class="stat-card warning">
				<div class="stat-icon" style="background: rgba(239,68,68,0.1); color: #ef4444;">
					<ShieldCheck size={20} />
				</div>
				<div class="stat-content">
					<span class="stat-value">{data.stats.pendingAuthority}</span>
					<span class="stat-label">Pending Authority</span>
				</div>
				<a href="/coordinator/authority" class="stat-action">
					Assign now <ChevronRight size={14} />
				</a>
			</div>
		{/if}
	</div>

	<!-- Two Column Layout -->
	<div class="two-col">
		<!-- Recent Exams -->
		<div class="card">
			<div class="card-header">
				<div class="card-header-left">
					<Clock size={16} />
					<h3>Recent Exams</h3>
				</div>
				<a href="/coordinator/exams" class="card-link">
					View all <ChevronRight size={14} />
				</a>
			</div>
			<div class="card-body">
				{#if data.recentExams.length === 0}
					<div class="empty-state">
						<ClipboardList size={32} strokeWidth={1} />
						<p>No exams created yet</p>
						<a href="/coordinator/exams/create" class="btn btn-sm btn-primary">
							Create Exam
						</a>
					</div>
				{:else}
					<div class="exam-list">
						{#each data.recentExams as exam}
							<a href={`/coordinator/exams/${exam.id}`} class="exam-item">
								<div class="exam-info">
									<span class="exam-code">{exam.course.code}</span>
									<span class="exam-title">{exam.title}</span>
								</div>
								<div class="exam-meta">
									<span class="exam-status" style="color:{getStatusColor(exam.status)};">
										<span class="status-dot" style="background:{getStatusColor(exam.status)};"></span>
										{getStatusLabel(exam.status)}
									</span>
									<span class="exam-date">
										<Calendar size={12} />
										{formatDate(exam.scheduledStart)}
									</span>
									<span class="exam-sessions">
										{exam.examSessions.length} sessions
									</span>
								</div>
							</a>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- Recent Lecturers -->
		<div class="card">
			<div class="card-header">
				<div class="card-header-left">
					<Users size={16} />
					<h3>Lecturers</h3>
				</div>
				<a href="/coordinator/lecturers" class="card-link">
					View all <ChevronRight size={14} />
				</a>
			</div>
			<div class="card-body">
				{#if data.recentLecturers.length === 0}
					<div class="empty-state">
						<Users size={32} strokeWidth={1} />
						<p>No lecturers assigned yet</p>
					</div>
				{:else}
					<div class="lecturer-list">
						{#each data.recentLecturers as lecturer}
							<div class="lecturer-item">
								<div class="lecturer-info">
									<div class="lecturer-avatar">
										{getInitials(lecturer.fullName)}
									</div>
									<div>
										<span class="lecturer-name">{lecturer.fullName}</span>
										<span class="lecturer-email">{lecturer.email}</span>
									</div>
								</div>
								<span class="lecturer-courses">
									{lecturer.teachingAssignments?.length || 0} courses
								</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Quick Actions -->
	<div class="quick-actions">
		<h4>Quick Actions</h4>
		<div class="actions-grid">
			<a href="/coordinator/authority" class="action-item">
				<ShieldCheck size={18} />
				<span>Assign Exam Authority</span>
			</a>
			<a href="/coordinator/courses" class="action-item">
				<BookOpen size={18} />
				<span>Manage Courses</span>
			</a>
			<a href="/coordinator/lecturers" class="action-item">
				<Users size={18} />
				<span>Manage Lecturers</span>
			</a>
			<a href="/coordinator/exams/create" class="action-item">
				<ClipboardList size={18} />
				<span>Create Exam</span>
			</a>
		</div>
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
		margin-bottom: 2rem;
		flex-wrap: wrap;
		gap: 1rem;
	}
	.page-header h1 {
		font-size: 1.75rem;
		font-weight: 800;
		color: var(--color-text);
		margin: 0;
	}
	.highlight {
		background: linear-gradient(135deg, #059669, #10b981);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}
	.subtitle {
		font-size: 0.85rem;
		color: var(--color-muted);
		margin: 0.25rem 0 0;
	}
	.header-actions {
		display: flex;
		gap: 0.5rem;
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
		transition: all 0.15s ease;
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
	.btn-sm {
		padding: 0.4rem 0.75rem;
		font-size: 0.75rem;
	}

	/* Stats Grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}
	.stat-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
		padding: 1.25rem;
		display: flex;
		align-items: center;
		gap: 1rem;
		transition: all 0.15s ease;
		position: relative;
	}
	.stat-card:hover {
		border-color: #059669;
		box-shadow: 0 2px 8px rgba(5, 150, 105, 0.08);
	}
	.stat-card.warning {
		border-color: #fecaca;
		background: #fef2f2;
	}
	.stat-icon {
		width: 44px;
		height: 44px;
		border-radius: 0.625rem;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}
	.stat-content {
		flex: 1;
		display: flex;
		flex-direction: column;
	}
	.stat-value {
		font-size: 1.5rem;
		font-weight: 800;
		color: var(--color-text);
		line-height: 1.2;
	}
	.stat-label {
		font-size: 0.75rem;
		color: var(--color-muted);
		font-weight: 500;
	}
	.stat-action {
		display: flex;
		align-items: center;
		gap: 0.2rem;
		font-size: 0.7rem;
		font-weight: 600;
		color: #dc2626;
		text-decoration: none;
		margin-left: auto;
		padding: 0.2rem 0.4rem;
		border-radius: 0.3rem;
		transition: background 0.15s ease;
	}
	.stat-action:hover {
		background: rgba(220, 38, 38, 0.08);
	}

	/* Two Column Layout */
	.two-col {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
		margin-bottom: 2rem;
	}
	@media (max-width: 768px) {
		.two-col {
			grid-template-columns: 1fr;
		}
	}

	/* Cards */
	.card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
		overflow: hidden;
	}
	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid var(--color-border);
	}
	.card-header-left {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--color-text);
	}
	.card-header-left h3 {
		margin: 0;
		font-size: 0.9rem;
		font-weight: 600;
	}
	.card-link {
		display: flex;
		align-items: center;
		gap: 0.2rem;
		font-size: 0.75rem;
		color: var(--color-muted);
		text-decoration: none;
		font-weight: 500;
		transition: color 0.15s ease;
	}
	.card-link:hover {
		color: #059669;
	}
	.card-body {
		padding: 1rem 1.25rem;
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
		padding: 0.75rem;
		border-radius: 0.5rem;
		text-decoration: none;
		background: var(--color-bg);
		border: 1px solid transparent;
		transition: all 0.15s ease;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.exam-item:hover {
		border-color: #059669;
		background: rgba(5, 150, 105, 0.03);
	}
	.exam-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.exam-code {
		font-size: 0.7rem;
		font-weight: 700;
		color: #059669;
		background: rgba(5, 150, 105, 0.08);
		padding: 0.15rem 0.4rem;
		border-radius: 0.3rem;
	}
	.exam-title {
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--color-text);
	}
	.exam-meta {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.7rem;
		color: var(--color-muted);
	}
	.exam-status {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-weight: 600;
	}
	.status-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		display: inline-block;
	}
	.exam-date, .exam-sessions {
		display: flex;
		align-items: center;
		gap: 0.2rem;
	}

	/* Lecturer List */
	.lecturer-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.lecturer-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.625rem 0.75rem;
		border-radius: 0.5rem;
		background: var(--color-bg);
		transition: background 0.15s ease;
	}
	.lecturer-item:hover {
		background: rgba(5, 150, 105, 0.04);
	}
	.lecturer-info {
		display: flex;
		align-items: center;
		gap: 0.625rem;
	}
	.lecturer-avatar {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: linear-gradient(135deg, #059669, #10b981);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.65rem;
		font-weight: 700;
		flex-shrink: 0;
	}
	.lecturer-name {
		display: block;
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--color-text);
	}
	.lecturer-email {
		display: block;
		font-size: 0.7rem;
		color: var(--color-muted);
	}
	.lecturer-courses {
		font-size: 0.7rem;
		color: var(--color-muted);
		background: var(--color-border);
		padding: 0.15rem 0.5rem;
		border-radius: 999px;
	}

	/* Empty State */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding: 2rem 1rem;
		color: var(--color-muted);
		text-align: center;
	}
	.empty-state p {
		margin: 0;
		font-size: 0.85rem;
	}

	/* Quick Actions */
	.quick-actions {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
		padding: 1.25rem;
	}
	.quick-actions h4 {
		margin: 0 0 1rem;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-text);
	}
	.actions-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 0.75rem;
	}
	.action-item {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.75rem 1rem;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		text-decoration: none;
		color: var(--color-text);
		font-size: 0.85rem;
		font-weight: 500;
		transition: all 0.15s ease;
	}
	.action-item:hover {
		border-color: #059669;
		background: rgba(5, 150, 105, 0.04);
		transform: translateY(-1px);
	}

	/* Responsive */
	@media (max-width: 640px) {
		.page {
			padding: 1rem;
		}
		.stats-grid {
			grid-template-columns: 1fr 1fr;
		}
		.page-header {
			flex-direction: column;
		}
		.exam-item {
			flex-direction: column;
			align-items: flex-start;
		}
		.exam-meta {
			flex-wrap: wrap;
		}
	}
</style>