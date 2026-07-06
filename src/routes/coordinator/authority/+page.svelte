<!-- src/routes/coordinator/authority/+page.svelte -->
<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import {
		ShieldCheck, Users, GraduationCap, Building2, BookOpen,
		ChevronDown, Check, X, Search, AlertCircle,
		RotateCcw, Save, EyeOff,
		ChevronLeft, ChevronRight, UserCog
	} from '@lucide/svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// ─── State ───
	let reasonDrafts = $state<Record<string, string>>({});
	let scopeDrafts = $state<Record<string, string>>({});
	let assigneeDrafts = $state<Record<string, string>>({});
	let search = $state('');
	let levelFilter = $state<string>('all');
	let scopeFilter = $state<'all' | 'lecturer' | 'department_coordinator' | 'college_coordinator'>('all');
	let showOnlyPending = $state(false);
	let expandedCards = $state<Set<string>>(new Set());
	let justApplied = $state<string | null>(null);

	// ─── Pagination ───
	let currentPage = $state(1);
	let pageSize = $state(10);
	const pageSizeOptions = [10, 20, 50, 100];

	// ─── Level detection ───
	function getLevel(code: string): string | null {
		const m = code.match(/(\d{3,})/);
		if (!m) return null;
		const first = parseInt(m[1][0], 10);
		return first ? String(first * 100) : null;
	}

	const availableLevels = $derived(() => {
		const set = new Set<string>();
		data.offerings.forEach((o) => {
			const lvl = getLevel(o.course.code);
			if (lvl) set.add(lvl);
		});
		return Array.from(set).sort((a, b) => Number(a) - Number(b));
	});

	const filteredOfferings = $derived(() => {
		return data.offerings.filter(o => {
			const q = search.toLowerCase();
			const matchesSearch = !q ||
				o.course.code.toLowerCase().includes(q) ||
				o.course.title.toLowerCase().includes(q) ||
				o.departments.some(d => d.department.name.toLowerCase().includes(q));

			const currentScope = o.authority?.scope ?? 'lecturer';
			const matchesScope = scopeFilter === 'all' || currentScope === scopeFilter;

			const matchesPending = !showOnlyPending || !o.authority;

			const matchesLevel = levelFilter === 'all' || getLevel(o.course.code) === levelFilter;

			return matchesSearch && matchesScope && matchesPending && matchesLevel;
		});
	});

	$effect(() => {
		void search;
		void levelFilter;
		void scopeFilter;
		void showOnlyPending;
		void pageSize;
		currentPage = 1;
	});

	const totalItems = $derived(() => filteredOfferings().length);
	const totalPages = $derived(() => Math.max(1, Math.ceil(totalItems() / pageSize)));

	const paginatedOfferings = $derived(() => {
		const start = (currentPage - 1) * pageSize;
		return filteredOfferings().slice(start, start + pageSize);
	});

	const rangeStart = $derived(() => (totalItems() === 0 ? 0 : (currentPage - 1) * pageSize + 1));
	const rangeEnd = $derived(() => Math.min(currentPage * pageSize, totalItems()));

	function goToPage(p: number) {
		currentPage = Math.min(Math.max(1, p), totalPages());
	}

	const pageNumbers = $derived(() => {
		const total = totalPages();
		const cur = currentPage;
		const pages: (number | '…')[] = [];
		const window = 1;
		for (let i = 1; i <= total; i++) {
			if (i === 1 || i === total || (i >= cur - window && i <= cur + window)) {
				pages.push(i);
			} else if (pages[pages.length - 1] !== '…') {
				pages.push('…');
			}
		}
		return pages;
	});

	const scopeCounts = $derived(() => {
		const counts = { lecturer: 0, department_coordinator: 0, college_coordinator: 0, unset: 0 };
		data.offerings.forEach(o => {
			if (!o.authority) counts.unset++;
			else counts[o.authority.scope as keyof typeof counts]++;
		});
		return counts;
	});

	// ─── Helpers ───
	function scopeLabel(s: string | undefined) {
		return {
			lecturer: 'Lecturer',
			department_coordinator: 'Dept Coordinator',
			college_coordinator: 'Exam Officer'
		}[s ?? 'lecturer'] ?? 'Lecturer';
	}

	function scopeDescription(s: string | undefined) {
		return {
			lecturer: 'Lecturer creates exams for this course',
			department_coordinator: 'Dept Coordinator creates exams for this course',
			college_coordinator: 'Exam Officer creates exams for this course'
		}[s ?? 'lecturer'] ?? 'Lecturer creates exams';
	}

	function scopeIcon(s: string | undefined) {
		return {
			lecturer: GraduationCap,
			department_coordinator: Building2,
			college_coordinator: ShieldCheck
		}[s ?? 'lecturer'] ?? GraduationCap;
	}

	function scopeColor(s: string | undefined) {
		return {
			lecturer: '#16a34a',
			department_coordinator: '#7c3aed',
			college_coordinator: '#0ea5e9'
		}[s ?? 'lecturer'] ?? '#64748b';
	}

	function scopeBg(s: string | undefined) {
		return {
			lecturer: '#dcfce7',
			department_coordinator: '#f3e8ff',
			college_coordinator: '#e0f2fe'
		}[s ?? 'lecturer'] ?? '#e2e8f0';
	}

	function getEligiblePeople(scope: string) {
		if (scope === 'lecturer') {
			return data.lecturers.map(l => ({ ...l, role: 'Lecturer' }));
		} else if (scope === 'department_coordinator') {
			return data.departmentCoordinators.map(c => ({ ...c, role: 'Dept Coordinator' }));
		} else if (scope === 'college_coordinator') {
			return [{ id: data.coordinatorId, fullName: 'You (Coordinator)', role: 'Coordinator' }];
		}
		return [];
	}

	function getPersonCount(scope: string) {
		return getEligiblePeople(scope).length;
	}

	function toggleExpand(id: string) {
		const next = new Set(expandedCards);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		expandedCards = next;
	}

	function resetFilters() {
		search = '';
		levelFilter = 'all';
		scopeFilter = 'all';
		showOnlyPending = false;
		currentPage = 1;
	}

	function levelOptionLabel(lvl: string) {
		return `${lvl}L only (Year ${Math.round(Number(lvl) / 100)})`;
	}

	function applyFlash(id: string) {
		justApplied = id;
		setTimeout(() => { if (justApplied === id) justApplied = null; }, 1500);
	}
</script>

<svelte:head><title>Exam Authority — Dept Coordinator</title></svelte:head>

<div class="page">
	<!-- Header -->
	<header class="page-header">
		<div class="header-left">
			<div class="header-icon"><ShieldCheck size={26} color="#059669" /></div>
			<div>
				<h1>Exam Authority Management</h1>
				<p class="subtitle">
					{data.offerings.length} course offerings &middot;
					<span style="color:#16a34a">{scopeCounts().lecturer} lecturers</span> &middot;
					<span style="color:#7c3aed">{scopeCounts().department_coordinator} coordinators</span> &middot;
					<span style="color:#0ea5e9">{scopeCounts().college_coordinator} exam officers</span>
					{#if scopeCounts().unset > 0}
						&middot; <span style="color:#dc2626">{scopeCounts().unset} unset</span>
					{/if}
				</p>
			</div>
		</div>
	</header>

	<!-- Alerts -->
	{#if form?.error}
		<div class="alert alert-error">
			<AlertCircle size={14} />
			<span>{form.error}</span>
		</div>
	{/if}
	{#if form?.success}
		<div class="alert alert-success">
			<Check size={14} />
			<span>{form.message}</span>
		</div>
	{/if}

	<!-- Info Banner -->
	<div class="info-banner">
		<UserCog size={18} />
		<div>
			<strong>Your Role:</strong>
			As Department Coordinator, you can assign who creates exams for each course in your department.
			You can assign <strong>lecturers</strong>, <strong>department coordinators</strong>,
			or create exams yourself.
		</div>
	</div>

	<!-- Filters Bar -->
	<div class="filters-bar">
		<div class="filter-group">
			<div class="search-wrap">
				<Search size={14} />
				<input
					type="text"
					class="search-input"
					placeholder="Search courses, codes..."
					bind:value={search}
				/>
				{#if search}
					<button class="search-clear" onclick={() => search = ''}><X size={12} /></button>
				{/if}
			</div>

			<select class="filter-select" bind:value={levelFilter}>
				<option value="all">All Levels</option>
				{#each availableLevels() as lvl}
					<option value={lvl}>{levelOptionLabel(lvl)}</option>
				{/each}
			</select>

			<select class="filter-select" bind:value={scopeFilter}>
				<option value="all">All Scopes</option>
				<option value="lecturer">Lecturer</option>
				<option value="department_coordinator">Coordinator</option>
				<option value="college_coordinator">Exam Officer</option>
			</select>

			<label class="toggle-pill" class:active={showOnlyPending}>
				<input type="checkbox" bind:checked={showOnlyPending} />
				<EyeOff size={12} /> Unset only
			</label>
		</div>

		<button class="btn-reset" onclick={resetFilters}>
			<RotateCcw size={12} /> Reset
		</button>
	</div>

	<!-- Level Quick-Switch Chips -->
	<div class="level-chips">
		<button
			class="level-chip"
			class:active={levelFilter === 'all'}
			onclick={() => levelFilter = 'all'}
		>
			All Levels <span class="chip-count">{data.offerings.length}</span>
		</button>
		{#each availableLevels() as lvl}
			{@const count = data.offerings.filter(o => getLevel(o.course.code) === lvl).length}
			<button
				class="level-chip"
				class:active={levelFilter === lvl}
				onclick={() => levelFilter = lvl}
			>
				{lvl}L <span class="chip-count">{count}</span>
			</button>
		{/each}
	</div>

	<!-- Table Header -->
	<div class="table-header">
		<span class="th-course">Course</span>
		<span class="th-dept">Department</span>
		<span class="th-status">Current Authority</span>
		<span class="th-action">Action</span>
	</div>

	<!-- Cards -->
	<div class="cards-list">
		{#each paginatedOfferings() as o (o.id)}
			{@const scope = scopeDrafts[o.id] ?? o.authority?.scope ?? 'lecturer'}
			{@const isSet = !!o.authority}
			{@const isExpanded = expandedCards.has(o.id)}
			{@const ScopeIcon = scopeIcon(o.authority?.scope)}

			<div
				class="authority-card"
				class:just-flashed={justApplied === o.id}
				class:unset={!isSet}
			>
				<!-- Row -->
				<div class="card-row" onclick={() => toggleExpand(o.id)}>
					<div class="cell-course">
						<div class="course-title">
							<span class="code-chip">{o.course.code}</span>
							<strong>{o.course.title}</strong>
						</div>
						<div class="course-meta">
							{#if o.academicSemester}
								<span class="meta-pill">{o.academicSemester.label}</span>
							{/if}
						</div>
					</div>

					<div class="cell-dept">
						<span class="dept-chip">{o.departments[0]?.department.name}</span>
					</div>

					<div class="cell-status">
						{#if isSet}
							<span class="status-badge" style="background:{scopeBg(o.authority?.scope)};color:{scopeColor(o.authority?.scope)}">
								<ScopeIcon size={11} />
								{scopeLabel(o.authority?.scope)}
							</span>
						{:else}
							<span class="status-badge unset-badge">
								<AlertCircle size={11} /> Not set
							</span>
						{/if}
					</div>

					<div class="cell-action">
						<button class="btn-edit" onclick={(e) => { e.stopPropagation(); toggleExpand(o.id); }}>
							{isExpanded ? 'Close' : 'Edit'}
						</button>
					</div>
				</div>

				<!-- Expanded Form -->
				{#if isExpanded}
					<div class="card-form">
						<form
							method="POST"
							action="?/assignAuthority"
							use:enhance={() => {
								return async ({ update }) => {
									await update();
									applyFlash(o.id);
									expandedCards = new Set(expandedCards);
								};
							}}
							class="inline-form"
						>
							<input type="hidden" name="offeringId" value={o.id} />

							<div class="form-row">
								<div class="field">
									<label>Who creates exams? <span class="req">*</span></label>
									<select
										name="scope"
										bind:value={scopeDrafts[o.id]}
										onchange={() => { assigneeDrafts[o.id] = ''; }}
										required
									>
										<option value="lecturer" selected={scope === 'lecturer'}>
											Lecturer
										</option>
										<option value="department_coordinator" selected={scope === 'department_coordinator'}>
											Department Coordinator
										</option>
										<option value="college_coordinator" selected={scope === 'college_coordinator'}>
											You (Coordinator)
										</option>
									</select>
									<span class="field-hint">
										{scopeDescription(scope)}
									</span>
								</div>

								<!-- Assign to specific person -->
								<div class="field">
									<label>Assign to <span class="req">*</span></label>
									{#if scope === 'college_coordinator'}
										<input
											type="text"
											value="You (Coordinator)"
											disabled
											class="field-disabled"
										/>
										<input type="hidden" name="assignedUserId" value={data.coordinatorId} />
									{:else}
										<select
											name="assignedUserId"
											bind:value={assigneeDrafts[o.id]}
											required
											disabled={getEligiblePeople(scope).length === 0}
										>
											<option value="" disabled selected>Select person...</option>
											{#each getEligiblePeople(scope) as person}
												<option value={person.id}>
													{person.fullName} ({person.role})
												</option>
											{/each}
										</select>
										{#if getEligiblePeople(scope).length === 0}
											<span class="field-hint" style="color:#dc2626;">
												No eligible people found. Please add lecturers or coordinators first.
											</span>
										{/if}
									{/if}
								</div>

								<div class="field field-grow">
									<label>Reason for change</label>
									<input
										type="text"
										name="reason"
										placeholder="e.g. assigned to lecturer for this course"
										bind:value={reasonDrafts[o.id]}
									/>
								</div>

								<div class="field field-submit">
									<label>&nbsp;</label>
									<button
										type="submit"
										class="btn btn-primary"
										disabled={
											(scope !== 'college_coordinator' && !assigneeDrafts[o.id]) ||
											(scope === 'college_coordinator' && !data.coordinatorId)
										}
									>
										<Save size={13} /> Apply
									</button>
								</div>
							</div>
						</form>
					</div>
				{/if}
			</div>
		{:else}
			<div class="empty-state">
				<BookOpen size={40} strokeWidth={1} color="var(--color-muted)" />
				<p>No courses match your filters.</p>
				<button class="btn-link" onclick={resetFilters}>Clear all filters</button>
			</div>
		{/each}
	</div>

	<!-- Pagination -->
	{#if totalItems() > 0}
		<div class="pagination-bar">
			<div class="page-size">
				<span>Rows per page</span>
				<select bind:value={pageSize} class="filter-select">
					{#each pageSizeOptions as size}
						<option value={size}>{size}</option>
					{/each}
				</select>
			</div>

			<div class="page-range">
				Showing <strong>{rangeStart()}–{rangeEnd()}</strong> of <strong>{totalItems()}</strong>
			</div>

			<div class="page-controls">
				<button class="page-btn" onclick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
					<ChevronLeft size={14} />
				</button>
				{#each pageNumbers() as p}
					{#if p === '…'}
						<span class="page-ellipsis">…</span>
					{:else}
						<button
							class="page-btn"
							class:active={p === currentPage}
							onclick={() => goToPage(p)}
						>
							{p}
						</button>
					{/if}
				{/each}
				<button class="page-btn" onclick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages()}>
					<ChevronRight size={14} />
				</button>
			</div>
		</div>
	{/if}

	<!-- Footer Stats -->
	{#if filteredOfferings().length > 0}
		<div class="footer-bar">
			<span>Showing {paginatedOfferings().length} of {totalItems()} filtered offerings ({data.offerings.length} total)</span>
		</div>
	{/if}
</div>

<style>
	.page {
		max-width: 1100px;
		margin: 0 auto;
		padding: 2rem 1.5rem 3rem;
		font-family: 'DM Sans', system-ui, sans-serif;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	/* Header */
	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 1rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--color-border);
	}
	.header-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.header-icon {
		width: 48px;
		height: 48px;
		border-radius: 0.75rem;
		background: rgba(5, 150, 105, 0.1);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	h1 {
		font-size: 1.5rem;
		font-weight: 800;
		color: var(--color-text);
		margin: 0;
	}
	.subtitle {
		font-size: 0.8rem;
		color: var(--color-muted);
		margin: 0.25rem 0 0;
	}

	/* Alerts */
	.alert {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		font-size: 0.85rem;
		animation: fadeUp 0.3s ease;
	}
	.alert-error {
		background: #fee2e2;
		color: #991b1b;
		border: 1px solid #fecaca;
	}
	.alert-success {
		background: #dcfce7;
		color: #166534;
		border: 1px solid #bbf7d0;
	}
	:global([data-theme='dark']) .alert-error {
		background: #451a1a;
		color: #fca5a5;
	}

	/* Info Banner */
	.info-banner {
		display: flex;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		background: #ecfdf5;
		border: 1px solid #6ee7b7;
		border-radius: 0.5rem;
		font-size: 0.85rem;
		color: #065f46;
		align-items: flex-start;
	}
	.info-banner strong {
		font-weight: 700;
	}
	:global([data-theme='dark']) .info-banner {
		background: #064e3b;
		border-color: #059669;
		color: #6ee7b7;
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
		width: 260px;
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

	.toggle-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.4rem 0.7rem;
		border: 1px solid var(--color-border);
		border-radius: 2rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-muted);
		cursor: pointer;
		background: var(--color-bg);
		transition: all 0.15s;
		user-select: none;
	}
	.toggle-pill input {
		display: none;
	}
	.toggle-pill.active {
		background: #fef3c7;
		border-color: #f59e0b;
		color: #92400e;
	}

	.btn-reset {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		background: none;
		border: none;
		font-size: 0.75rem;
		color: var(--color-muted);
		cursor: pointer;
		padding: 0.3rem 0.5rem;
		border-radius: 0.3rem;
	}
	.btn-reset:hover {
		color: var(--color-text);
		background: var(--color-bg);
	}

	/* Level chips */
	.level-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.level-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.4rem 0.8rem;
		border: 1px solid var(--color-border);
		border-radius: 2rem;
		background: var(--color-surface);
		color: var(--color-muted);
		font-size: 0.78rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s;
		font-family: inherit;
	}
	.level-chip:hover {
		border-color: #059669;
		color: #059669;
	}
	.level-chip.active {
		background: #059669;
		border-color: #059669;
		color: white;
	}
	.chip-count {
		font-size: 0.7rem;
		opacity: 0.8;
		background: rgba(255, 255, 255, 0.25);
		padding: 0.05rem 0.35rem;
		border-radius: 1rem;
	}
	.level-chip:not(.active) .chip-count {
		background: var(--color-bg);
		opacity: 1;
	}

	/* Table Header */
	.table-header {
		display: grid;
		grid-template-columns: 2fr 1.2fr 140px 80px;
		gap: 0.75rem;
		align-items: center;
		padding: 0.6rem 1rem;
		font-size: 0.68rem;
		font-weight: 700;
		color: var(--color-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		border-bottom: 1px solid var(--color-border);
	}

	/* Cards */
	.cards-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.authority-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
		overflow: hidden;
		transition: all 0.2s ease;
	}
	.authority-card:hover {
		border-color: #059669;
		box-shadow: 0 2px 8px rgba(5, 150, 105, 0.08);
	}
	.authority-card.unset {
		border-left: 3px solid #dc2626;
	}
	.authority-card.just-flashed {
		animation: flashGreen 1.2s ease;
	}

	.card-row {
		display: grid;
		grid-template-columns: 2fr 1.2fr 140px 80px;
		gap: 0.75rem;
		align-items: center;
		padding: 0.875rem 1rem;
		cursor: pointer;
	}

	/* Course cell */
	.cell-course {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		min-width: 0;
	}
	.course-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.code-chip {
		font-family: 'SF Mono', monospace;
		font-size: 0.72rem;
		font-weight: 700;
		color: #059669;
		background: rgba(5, 150, 105, 0.08);
		padding: 0.15rem 0.4rem;
		border-radius: 0.3rem;
		white-space: nowrap;
	}
	.cell-course strong {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--color-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.course-meta {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.meta-pill {
		font-size: 0.7rem;
		color: var(--color-muted);
		background: var(--color-bg);
		padding: 0.1rem 0.4rem;
		border-radius: 0.25rem;
	}

	/* Dept cell */
	.cell-dept {
		min-width: 0;
	}
	.dept-chip {
		font-size: 0.72rem;
		color: var(--color-muted);
		background: var(--color-bg);
		padding: 0.15rem 0.4rem;
		border-radius: 0.3rem;
		white-space: nowrap;
	}

	/* Status cell */
	.cell-status {
		display: flex;
		justify-content: flex-start;
	}
	.status-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.72rem;
		font-weight: 600;
		padding: 0.25rem 0.55rem;
		border-radius: 0.35rem;
		white-space: nowrap;
	}
	.unset-badge {
		background: #fee2e2;
		color: #dc2626;
	}

	/* Action cell */
	.cell-action {
		text-align: right;
	}
	.btn-edit {
		padding: 0.35rem 0.7rem;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 0.4rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-muted);
		cursor: pointer;
		transition: all 0.15s;
	}
	.btn-edit:hover {
		border-color: #059669;
		color: #059669;
	}

	/* Expanded Form */
	.card-form {
		padding: 0 1rem 1rem 3.2rem;
		border-top: 1px solid var(--color-border);
		background: var(--color-bg);
		animation: fadeUp 0.25s ease;
	}
	.inline-form {
		padding-top: 0.875rem;
	}
	.form-row {
		display: flex;
		gap: 0.6rem;
		flex-wrap: wrap;
		align-items: flex-end;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}
	.field label {
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--color-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.field select,
	.field input[type='text'] {
		padding: 0.5rem 0.6rem;
		border: 1px solid var(--color-border);
		border-radius: 0.4rem;
		background: var(--color-surface);
		color: var(--color-text);
		font-size: 0.8rem;
		font-family: inherit;
		min-width: 180px;
		transition: border-color 0.15s;
	}
	.field select:focus,
	.field input[type='text']:focus {
		outline: none;
		border-color: #059669;
	}
	.field select {
		cursor: pointer;
	}
	.field select:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.field-disabled {
		padding: 0.5rem 0.6rem;
		border: 1px solid var(--color-border);
		border-radius: 0.4rem;
		background: var(--color-bg);
		color: var(--color-text);
		font-size: 0.8rem;
		font-family: inherit;
		min-width: 180px;
		opacity: 0.7;
		cursor: not-allowed;
	}
	.field-grow {
		flex: 1;
		min-width: 220px;
	}
	.field-grow input {
		width: 100%;
		box-sizing: border-box;
	}
	.field-submit {
		min-width: auto;
	}
	.req {
		color: #dc2626;
	}
	.field-hint {
		font-size: 0.7rem;
		color: var(--color-muted);
		margin-top: 0.2rem;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.5rem 0.9rem;
		border-radius: 0.4rem;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s;
		border: 1px solid transparent;
		font-family: inherit;
	}
	.btn-primary {
		background: #059669;
		color: white;
		border-color: #059669;
	}
	.btn-primary:hover:not(:disabled) {
		background: #047857;
		border-color: #047857;
	}
	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Empty */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding: 3rem 1rem;
		color: var(--color-muted);
		text-align: center;
	}
	.btn-link {
		background: none;
		border: none;
		color: #059669;
		font-size: 0.85rem;
		cursor: pointer;
		text-decoration: underline;
		padding: 0.25rem;
	}
	.btn-link:hover {
		color: #047857;
	}

	/* Pagination */
	.pagination-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
	}
	.page-size {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.78rem;
		color: var(--color-muted);
	}
	.page-range {
		font-size: 0.78rem;
		color: var(--color-muted);
	}
	.page-controls {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}
	.page-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 30px;
		height: 30px;
		padding: 0 0.4rem;
		border: 1px solid var(--color-border);
		border-radius: 0.4rem;
		background: var(--color-bg);
		color: var(--color-text);
		font-size: 0.78rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s;
		font-family: inherit;
	}
	.page-btn:hover:not(:disabled) {
		border-color: #059669;
		color: #059669;
	}
	.page-btn.active {
		background: #059669;
		border-color: #059669;
		color: white;
	}
	.page-btn:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}
	.page-ellipsis {
		padding: 0 0.3rem;
		color: var(--color-muted);
		font-size: 0.78rem;
	}

	/* Footer */
	.footer-bar {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.75rem;
		color: var(--color-muted);
		padding-top: 0.5rem;
	}

	/* Animations */
	@keyframes fadeUp {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	@keyframes flashGreen {
		0% {
			background: rgba(5, 150, 105, 0.15);
			border-color: #059669;
		}
		100% {
			background: transparent;
			border-color: var(--color-border);
		}
	}

	/* Responsive */
	@media (max-width: 768px) {
		.page {
			padding: 1rem;
		}
		.table-header {
			display: none;
		}
		.card-row {
			grid-template-columns: 1fr auto;
			grid-template-areas:
				"course action"
				"status action";
			gap: 0.5rem;
		}
		.cell-dept {
			display: none;
		}
		.cell-course {
			grid-area: course;
		}
		.cell-status {
			grid-area: status;
		}
		.cell-action {
			grid-area: action;
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
		.form-row {
			flex-direction: column;
			align-items: stretch;
		}
		.field-grow {
			min-width: auto;
		}
		.pagination-bar {
			flex-direction: column;
			align-items: stretch;
			text-align: center;
		}
		.page-controls {
			justify-content: center;
			flex-wrap: wrap;
		}
		.card-form {
			padding: 0 0.75rem 0.75rem 2.5rem;
		}
		.info-banner {
			flex-direction: column;
			align-items: center;
			text-align: center;
		}
	}
</style>