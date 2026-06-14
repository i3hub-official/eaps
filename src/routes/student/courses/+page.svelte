<!-- src/routes/(student)/student/courses/+page.svelte -->
<script lang="ts">
	import {
		BookOpen,
		GraduationCap,
		Calendar,
		ArrowRight,
		Clock,
		AlertCircle,
		Search,
		Plus,
		ShieldAlert,
		CreditCard,
		CheckCircle2,
		Info,
		AlertTriangle,
		XCircle
	} from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let search = $state('');

	const registrations = data?.registrations ?? [];
	const meta = data?.meta ?? {
		session: '—',
		semester: 0,
		totalCredits: 0,
		maxCredits: 24,
		remainingCredits: 24,
		canAddMore: true,
		limits: {
			maxCarryOver: 6,
			maxBorrowed: 6,
			currentCarryOver: 0,
			currentBorrowed: 0,
			hasReachedCarryOverLimit: false,
			hasReachedBorrowedLimit: false
		}
	};
	const academicSemester = data?.academicSemester;

	const hasAny = registrations.length > 0;
	const hasPending = registrations.some((r) => r.status === 'pending');
	const hasRejected = registrations.some((r) => r.status === 'rejected');

	// Group by type
	const grouped = $derived(() => {
		const map: Record<string, typeof registrations> = {
			normal: [],
			carry_over: [],
			borrowed: []
		};
		const q = search.toLowerCase().trim();
		for (const r of registrations) {
			if (
				q &&
				!r.courseCode.toLowerCase().includes(q) &&
				!r.courseTitle.toLowerCase().includes(q) &&
				!r.department.toLowerCase().includes(q)
			)
				continue;
			(map[r.registrationType] ??= []).push(r);
		}
		return map;
	});

	const normalCount = registrations.filter((r) => r.registrationType === 'normal').length;
	const carryOverCount = registrations.filter((r) => r.registrationType === 'carry_over').length;
	const borrowedCount = registrations.filter((r) => r.registrationType === 'borrowed').length;

	const TYPE_META: Record<string, { label: string; color: string; bg: string; headBg: string }> = {
		normal: {
			label: 'Normal',
			color: 'var(--green-700)',
			bg: 'var(--green-soft)',
			headBg: 'var(--green-soft)'
		},
		carry_over: {
			label: 'Carry-Over',
			color: '#b45309',
			bg: 'rgba(245,158,11,.10)',
			headBg: 'rgba(245,158,11,.13)'
		},
		borrowed: {
			label: 'Borrowed',
			color: '#4338ca',
			bg: 'rgba(99,102,241,.08)',
			headBg: 'rgba(99,102,241,.12)'
		}
	};

	function examStatusStyle(s: string) {
		switch (s) {
			case 'active':
				return { color: 'var(--green-700)', bg: 'var(--green-soft)' };
			case 'scheduled':
				return { color: '#1d4ed8', bg: 'rgba(37,99,235,.1)' };
			case 'completed':
				return { color: 'var(--color-muted)', bg: 'var(--color-bg)' };
			default:
				return { color: 'var(--color-muted)', bg: 'var(--color-bg)' };
		}
	}

	function regStatusStyle(status: string) {
		switch (status) {
			case 'approved':
				return { text: 'Approved', color: 'var(--green-700)', bg: 'var(--green-soft)' };
			case 'pending':
				return { text: 'Pending', color: '#b45309', bg: 'rgba(245,158,11,.12)' };
			case 'rejected':
				return { text: 'Rejected', color: '#b91c1c', bg: 'rgba(220,38,38,.1)' };
			default:
				return { text: status, color: 'var(--color-muted)', bg: 'var(--color-bg)' };
		}
	}

	function fmtDate(d: Date | string | null) {
		if (!d) return 'TBD';
		try {
			return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
		} catch {
			return '—';
		}
	}

	const GROUP_ORDER = ['normal', 'carry_over', 'borrowed'] as const;

	// Credit percentage for progress bar
	const creditPercentage = (meta.totalCredits / meta.maxCredits) * 100;
	const creditColor =
		creditPercentage > 90 ? '#dc2626' : creditPercentage > 75 ? '#f59e0b' : 'var(--green-600)';
</script>

<div class="page">
	<!-- ── Header ──────────────────────────────────────────────────────── -->
	<div class="page-header">
		<div class="header-left">
			<h1>My Courses</h1>
			<p class="page-sub">
				{meta.session} · {meta.semesterLabel}
				{#if academicSemester?.startDate && academicSemester?.endDate}
					· {fmtDate(academicSemester.startDate)} – {fmtDate(academicSemester.endDate)}
				{/if}
			</p>
		</div>
		<a href="/student/courses/register" class="btn-register">
			<Plus size={14} /> Register Courses
		</a>
	</div>

	<!-- ── Summary strip with config limits ───────────────────────────────── -->
	{#if hasAny}
		<div class="summary-strip">
			<div class="stat-card">
				<CreditCard size={13} style="color:{creditColor}" />
				<div>
					<span class="stat-val">{meta.totalCredits}</span>
					<span class="stat-label">/ {meta.maxCredits} CU</span>
				</div>
			</div>

			<!-- Credit progress bar -->
			<div class="credit-progress">
				<div class="progress-bar">
					<div
						class="progress-fill"
						style="width:{Math.min(creditPercentage, 100)}%; background:{creditColor}"
					></div>
				</div>
				<span class="remaining-text">{meta.remainingCredits} CU remaining</span>
			</div>

			<div class="stat-divider"></div>

			<div class="stat-card">
				<CheckCircle2 size={13} style="color:var(--green-600)" />
				<div>
					<span class="stat-val">{registrations.length}</span>
					<span class="stat-label">Courses</span>
				</div>
			</div>

			{#if normalCount > 0}
				<div class="type-stat" style="color:var(--green-700); background:var(--green-soft)">
					<span class="t-dot" style="background:var(--green-600)"></span>
					{normalCount} Normal
				</div>
			{/if}

			{#if carryOverCount > 0}
				<div
					class="type-stat"
					style="color:#b45309; background:rgba(245,158,11,.12)"
					class:limit-warning={meta.limits.hasReachedCarryOverLimit}
				>
					<span class="t-dot" style="background:#f59e0b"></span>
					{carryOverCount}/{meta.limits.maxCarryOver} Carry-Over
					{#if meta.limits.hasReachedCarryOverLimit}
						<AlertTriangle size={10} style="margin-left:2px" />
					{/if}
				</div>
			{/if}

			{#if borrowedCount > 0}
				<div
					class="type-stat"
					style="color:#4338ca; background:rgba(99,102,241,.1)"
					class:limit-warning={meta.limits.hasReachedBorrowedLimit}
				>
					<span class="t-dot" style="background:#6366f1"></span>
					{borrowedCount}/{meta.limits.maxBorrowed} Borrowed
					{#if meta.limits.hasReachedBorrowedLimit}
						<AlertTriangle size={10} style="margin-left:2px" />
					{/if}
				</div>
			{/if}
		</div>

		<!-- Limit warnings -->
		{#if meta.limits.hasReachedCarryOverLimit}
			<div class="notice notice-warning">
				<AlertTriangle size={14} />
				<div>
					You have reached the carry-over course limit ({meta.limits.maxCarryOver}). No more
					carry-over courses can be added.
				</div>
			</div>
		{/if}

		{#if meta.limits.hasReachedBorrowedLimit}
			<div class="notice notice-warning">
				<AlertTriangle size={14} />
				<div>
					You have reached the borrowed course limit ({meta.limits.maxBorrowed}). No more borrowed
					courses can be added.
				</div>
			</div>
		{/if}

		{#if !meta.canAddMore}
			<div class="notice notice-warning">
				<XCircle size={14} />
				<div>
					You have reached the maximum credit limit ({meta.maxCredits} CU). No more courses can be added.
				</div>
			</div>
		{/if}

		{#if hasRejected}
			<div class="notice notice-red">
				<AlertCircle size={14} />
				<div>
					Some carry-over courses were <strong>rejected</strong>. Visit
					<a href="/student/courses/register">course registration</a> to review and make changes.
				</div>
			</div>
		{:else if hasPending}
			<div class="notice notice-amber">
				<ShieldAlert size={14} />
				<div>
					Some carry-over courses are <strong>pending approval</strong> from your academic office.
				</div>
			</div>
		{/if}

		<!-- Registration status if registration is closed -->
		{#if academicSemester && !academicSemester.regOpen}
			<div class="notice notice-info">
				<Info size={14} />
				<div>
					Registration is currently <strong>closed</strong> for {academicSemester.label}. Please
					contact your academic office.
				</div>
			</div>
		{/if}
	{/if}

	<!-- ── Search ───────────────────────────────────────────────────────── -->
	{#if hasAny}
		<div class="search-wrap">
			<Search size={13} class="search-icon" />
			<input type="text" placeholder="Search by code, title or department…" bind:value={search} />
			{#if search}
				<button class="clear-btn" onclick={() => (search = '')}>×</button>
			{/if}
		</div>
	{/if}

	<!-- ── Grouped course grid ─────────────────────────────────────────── -->
	{#if !hasAny}
		<div class="empty-state">
			<BookOpen size={36} strokeWidth={1.4} />
			<p>No courses registered for this semester.</p>
			<a href="/student/courses/register" class="empty-cta">
				<Plus size={13} /> Register your first course
			</a>
		</div>
	{:else}
		{@const groups = grouped()}
		{@const hasResults = GROUP_ORDER.some((t) => (groups[t]?.length ?? 0) > 0)}

		{#if !hasResults}
			<div class="empty-state">
				<BookOpen size={36} strokeWidth={1.4} />
				<p>No courses match your search.</p>
			</div>
		{:else}
			<div class="groups">
				{#each GROUP_ORDER as type}
					{@const list = groups[type] ?? []}
					{#if list.length > 0}
						{@const tm = TYPE_META[type]}
						<div class="group">
							<!-- Group header -->
							<div class="group-header" style="background:{tm.headBg}">
								<span class="t-dot" style="background:{tm.color}"></span>
								<span class="group-label" style="color:{tm.color}">{tm.label}</span>
								<span class="group-count" style="color:{tm.color}"
									>{list.length} course{list.length !== 1 ? 's' : ''}</span
								>
								<span class="group-cu" style="color:{tm.color}">
									{list.reduce((s, r) => s + (r.creditUnits ?? 0), 0)} CU
								</span>
							</div>

							<!-- Card grid: horizontal + vertical -->
							<div class="card-grid">
								{#each list as reg (reg.id)}
									{@const rs = regStatusStyle(reg.status)}
									<div class="course-card" style="--accent:{tm.color}; --accent-bg:{tm.bg}">
										<!-- Card top -->
										<div class="card-head">
											<div class="card-code-row">
												<span class="course-code" style="color:{tm.color}">{reg.courseCode}</span>
												<span class="course-cu-badge">{reg.creditUnits} CU</span>
											</div>
											<span class="status-chip" style="color:{rs.color}; background:{rs.bg}"
												>{rs.text}</span
											>
										</div>

										<h3 class="course-title">{reg.courseTitle}</h3>

										<div class="card-meta">
											<span class="chip"><GraduationCap size={10} /> {reg.level} Level</span>
											<span class="chip"><Calendar size={10} /> {reg.department}</span>
										</div>

										<!-- Exams -->
										{#if reg.exams.length > 0}
											<div class="exams-block">
												{#each reg.exams as exam}
													{@const es = examStatusStyle(exam.status)}
													<div class="exam-row">
														<span class="exam-dot" style="background:{es.color}"></span>
														<span class="exam-title-text">{exam.title}</span>
														{#if exam.scheduledStart}
															<span class="exam-date"
																><Clock size={9} /> {fmtDate(exam.scheduledStart)}</span
															>
														{/if}
														<span
															class="exam-status-badge"
															style="color:{es.color}; background:{es.bg}">{exam.status}</span
														>
														{#if exam.status === 'active'}
															<a href="/student/exam/{exam.id}" class="exam-go">
																Start <ArrowRight size={9} />
															</a>
														{/if}
													</div>
												{/each}
											</div>
										{:else}
											<p class="no-exam"><AlertCircle size={10} /> No exam scheduled</p>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					{/if}
				{/each}
			</div>
		{/if}
	{/if}
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	/* Header */
	.page-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}
	.header-left h1 {
		margin: 0;
		font-size: 1.2rem;
		font-weight: 800;
		color: var(--color-text);
	}
	.page-sub {
		margin: 0.1rem 0 0;
		font-size: 0.73rem;
		color: var(--color-muted);
	}

	.btn-register {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.55rem 1rem;
		border-radius: 0.5rem;
		background: var(--green-600);
		color: #fff;
		font-size: 0.8rem;
		font-weight: 700;
		text-decoration: none;
		flex-shrink: 0;
		transition: background 0.15s;
	}
	.btn-register:hover {
		background: var(--green-700);
	}

	/* Summary strip */
	.summary-strip {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		flex-wrap: wrap;
		padding: 0.75rem 1rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
	}
	.stat-card {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.stat-card div {
		display: flex;
		flex-direction: column;
		line-height: 1.1;
	}
	.stat-val {
		font-size: 0.95rem;
		font-weight: 800;
		color: var(--color-text);
	}
	.stat-label {
		font-size: 0.6rem;
		color: var(--color-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.stat-divider {
		width: 1px;
		height: 24px;
		background: var(--color-border);
		flex-shrink: 0;
	}

	.type-stat {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.67rem;
		font-weight: 700;
		padding: 0.2rem 0.55rem;
		border-radius: 999px;
	}
	.type-stat.limit-warning {
		background: rgba(220, 38, 38, 0.12) !important;
		color: #dc2626 !important;
	}
	.t-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	/* Credit progress */
	.credit-progress {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		min-width: 120px;
	}
	.progress-bar {
		height: 4px;
		background: var(--color-border);
		border-radius: 2px;
		overflow: hidden;
	}
	.progress-fill {
		height: 100%;
		border-radius: 2px;
		transition: width 0.3s ease;
	}
	.remaining-text {
		font-size: 0.6rem;
		color: var(--color-muted);
	}

	/* Notices */
	.notice {
		display: flex;
		align-items: flex-start;
		gap: 0.6rem;
		padding: 0.7rem 0.875rem;
		border-radius: 0.6rem;
		border: 1px solid;
		font-size: 0.78rem;
		line-height: 1.45;
	}
	.notice a {
		font-weight: 700;
		color: inherit;
	}
	.notice strong {
		font-weight: 700;
	}
	.notice-amber {
		background: rgba(245, 158, 11, 0.07);
		border-color: rgba(245, 158, 11, 0.3);
		color: #92400e;
	}
	.notice-red {
		background: rgba(220, 38, 38, 0.06);
		border-color: rgba(220, 38, 38, 0.25);
		color: #991b1b;
	}
	.notice-warning {
		background: rgba(245, 158, 11, 0.07);
		border-color: rgba(245, 158, 11, 0.3);
		color: #92400e;
	}
	.notice-info {
		background: rgba(59, 130, 246, 0.07);
		border-color: rgba(59, 130, 246, 0.25);
		color: #1e40af;
	}

	/* Search */
	.search-wrap {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.45rem 0.75rem;
		border-radius: 0.5rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		max-width: 360px;
		color: var(--color-muted);
	}
	.search-wrap input {
		flex: 1;
		border: none;
		background: none;
		outline: none;
		font-size: 0.8rem;
		color: var(--color-text);
		font-family: inherit;
	}
	.search-wrap input::placeholder {
		color: var(--color-muted);
	}
	.clear-btn {
		width: 17px;
		height: 17px;
		border-radius: 50%;
		border: none;
		background: var(--color-border);
		color: var(--color-muted);
		font-size: 0.65rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* Empty state */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding: 3.5rem 1rem;
		color: var(--color-muted);
		text-align: center;
	}
	.empty-state p {
		margin: 0;
		font-size: 0.82rem;
	}
	.empty-cta {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.55rem 1rem;
		border-radius: 0.5rem;
		background: var(--green-600);
		color: #fff;
		font-size: 0.8rem;
		font-weight: 700;
		text-decoration: none;
		transition: background 0.15s;
	}
	.empty-cta:hover {
		background: var(--green-700);
	}

	/* Groups */
	.groups {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.group-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.45rem 0.75rem;
		border-radius: 0.5rem;
		border: 1px solid transparent;
	}
	.group-label {
		font-size: 0.75rem;
		font-weight: 800;
	}
	.group-count {
		font-size: 0.67rem;
		font-weight: 600;
		opacity: 0.8;
	}
	.group-cu {
		font-size: 0.67rem;
		font-weight: 700;
		margin-left: auto;
	}

	/* Card grid — horizontal + vertical */
	.card-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 0.625rem;
	}

	/* Course card */
	.course-card {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-top: 3px solid var(--accent);
		border-radius: 0.75rem;
		padding: 0.875rem 1rem;
		transition:
			border-color 0.15s,
			box-shadow 0.15s;
	}
	.course-card:hover {
		border-color: var(--accent);
		box-shadow: 0 3px 12px rgba(0, 0, 0, 0.06);
	}

	/* Card head */
	.card-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}
	.card-code-row {
		display: flex;
		align-items: baseline;
		gap: 0.4rem;
	}
	.course-code {
		font-size: 0.75rem;
		font-weight: 800;
		font-family: monospace;
		letter-spacing: 0.02em;
	}
	.course-cu-badge {
		font-size: 0.6rem;
		font-weight: 700;
		color: var(--color-muted);
	}

	.status-chip {
		font-size: 0.58rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		padding: 0.1rem 0.38rem;
		border-radius: 0.25rem;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.course-title {
		margin: 0;
		font-size: 0.82rem;
		font-weight: 700;
		color: var(--color-text);
		line-height: 1.3;
	}

	/* Meta chips */
	.card-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		font-size: 0.62rem;
		color: var(--color-muted);
		padding: 0.12rem 0.38rem;
		border-radius: 0.25rem;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
	}

	/* Exams */
	.exams-block {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding-top: 0.375rem;
		border-top: 1px solid var(--color-border);
		margin-top: auto;
	}
	.exam-row {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.71rem;
		padding: 0.3rem 0.5rem;
		border-radius: 0.35rem;
		background: var(--color-bg);
	}
	.exam-dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		flex-shrink: 0;
	}
	.exam-title-text {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: 600;
		color: var(--color-text);
	}
	.exam-date {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		color: var(--color-muted);
		white-space: nowrap;
		font-size: 0.65rem;
	}
	.exam-status-badge {
		font-size: 0.58rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		padding: 0.08rem 0.3rem;
		border-radius: 0.2rem;
		white-space: nowrap;
	}
	.exam-go {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		padding: 0.15rem 0.45rem;
		border-radius: 0.25rem;
		background: var(--green-600);
		color: #fff;
		font-size: 0.63rem;
		font-weight: 700;
		text-decoration: none;
		white-space: nowrap;
		transition: background 0.15s;
		flex-shrink: 0;
	}
	.exam-go:hover {
		background: var(--green-700);
	}

	.no-exam {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.67rem;
		color: var(--color-muted);
		padding-top: 0.125rem;
		margin-top: auto;
	}

	/* Mobile */
	@media (max-width: 600px) {
		.summary-strip {
			gap: 0.5rem;
		}
		.stat-divider {
			display: none;
		}
		.credit-progress {
			min-width: 100px;
		}
		.card-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
