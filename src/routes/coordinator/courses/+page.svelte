<!-- src/routes/coordinator/courses/+page.svelte -->
<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import {
		BookOpen, Search, X, Plus, Users, GraduationCap,
		ChevronDown, Check, AlertCircle, Save, Trash2,
		Calendar, Layers, Building2, Filter
	} from '@lucide/svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let search = $state('');
	let levelFilter = $state<number | 'all'>('all');
	let semesterFilter = $state<number | 'all'>('all');
	let expandedCards = $state<Set<string>>(new Set());
	let showAssignModal = $state(false);
	let selectedCourseId = $state<string | null>(null);
	let selectedLecturerId = $state('');

	const filteredCourses = $derived(() => {
		return data.courses.filter(c => {
			const matchesSearch = !search ||
				c.code.toLowerCase().includes(search.toLowerCase()) ||
				c.title.toLowerCase().includes(search.toLowerCase());
			const matchesLevel = levelFilter === 'all' || c.level === levelFilter;
			const matchesSemester = semesterFilter === 'all' || c.semester === semesterFilter;
			return matchesSearch && matchesLevel && matchesSemester;
		});
	});

	function toggleExpand(id: string) {
		const next = new Set(expandedCards);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		expandedCards = next;
	}

	function getLevelLabel(level: number | null) {
		if (!level) return 'N/A';
		return `${level}L`;
	}

	function getSemesterLabel(semester: number | null) {
		if (!semester) return 'N/A';
		return semester === 1 ? 'First Semester' : 'Second Semester';
	}

	function getCourseType(type: string | undefined) {
		const types: Record<string, string> = {
			core: 'Core',
			gst: 'GST',
			elective: 'Elective',
			borrowed: 'Borrowed'
		};
		return types[type || 'core'] || 'Core';
	}

	const uniqueLevels = $derived(() => {
		const levels = new Set<number>();
		data.courses.forEach(c => { if (c.level) levels.add(c.level); });
		return Array.from(levels).sort((a, b) => a - b);
	});

	const uniqueSemesters = $derived(() => {
		const semesters = new Set<number>();
		data.courses.forEach(c => { if (c.semester) semesters.add(c.semester); });
		return Array.from(semesters).sort();
	});
</script>

<svelte:head>
	<title>Courses — Dept Coordinator</title>
</svelte:head>

<div class="page">
	<!-- Header -->
	<header class="page-header">
		<div>
			<h1>Courses</h1>
			<p class="subtitle">
				{data.courses.length} courses in your department
				{#if data.activeSemester}
					&middot; Active Semester: {data.activeSemester.label}
				{/if}
			</p>
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

	<!-- Filters -->
	<div class="filters-bar">
		<div class="filter-group">
			<div class="search-wrap">
				<Search size={14} />
				<input
					type="text"
					class="search-input"
					placeholder="Search courses..."
					bind:value={search}
				/>
				{#if search}
					<button class="search-clear" onclick={() => search = ''}><X size={12} /></button>
				{/if}
			</div>

			<select class="filter-select" bind:value={levelFilter}>
				<option value="all">All Levels</option>
				{#each uniqueLevels() as level}
					<option value={level}>{level}L</option>
				{/each}
			</select>

			<select class="filter-select" bind:value={semesterFilter}>
				<option value="all">All Semesters</option>
				{#each uniqueSemesters() as sem}
					<option value={sem}>{sem === 1 ? 'First Semester' : 'Second Semester'}</option>
				{/each}
			</select>
		</div>

		<div class="filter-actions">
			<span class="result-count">{filteredCourses().length} courses</span>
		</div>
	</div>

	<!-- Course List -->
	<div class="courses-list">
		{#each filteredCourses() as course (course.id)}
			{@const isExpanded = expandedCards.has(course.id)}
			{@const lecturers = course.lecturerAssignments || []}

			<div class="course-card" class:expanded={isExpanded}>
				<div class="course-header" onclick={() => toggleExpand(course.id)}>
					<div class="course-info">
						<span class="course-code">{course.code}</span>
						<span class="course-title">{course.title}</span>
						<span class="course-badge" class:general={course.isGeneral}>
							{getCourseType(course.curriculums?.[0]?.type)}
						</span>
					</div>
					<div class="course-meta">
						<span class="meta-item">
							<GraduationCap size={12} />
							{getLevelLabel(course.level)}
						</span>
						<span class="meta-item">
							<Calendar size={12} />
							{getSemesterLabel(course.semester)}
						</span>
						<span class="meta-item">
							<Layers size={12} />
							{course.creditUnits} CU
						</span>
						<span class="meta-item">
							<Users size={12} />
							{lecturers.length} lecturer{lecturers.length !== 1 ? 's' : ''}
						</span>
						<button class="expand-btn" class:expanded={isExpanded}>
							<ChevronDown size={16} />
						</button>
					</div>
				</div>

				{#if isExpanded}
					<div class="course-body">
						<!-- Lecturers -->
						<div class="section">
							<div class="section-header">
								<h4>Assigned Lecturers</h4>
								<button
									class="btn btn-sm btn-primary"
									onclick={() => {
										selectedCourseId = course.id;
										selectedLecturerId = '';
										showAssignModal = true;
									}}
								>
									<Plus size={12} /> Assign Lecturer
								</button>
							</div>

							{#if lecturers.length === 0}
								<div class="empty-state">
									<Users size={24} strokeWidth={1} />
									<p>No lecturers assigned to this course</p>
								</div>
							{:else}
								<div class="lecturer-chips">
									{#each lecturers as assignment}
										<div class="lecturer-chip">
											<span class="lecturer-name">{assignment.lecturer.fullName}</span>
											<span class="lecturer-email">{assignment.lecturer.email}</span>
											<form
												method="POST"
												action="?/removeLecturer"
												use:enhance={() => {
													return async ({ update }) => {
														await update();
														// Refresh will happen via form submission
													};
												}}
												class="remove-form"
											>
												<input type="hidden" name="courseId" value={course.id} />
												<input type="hidden" name="lecturerId" value={assignment.lecturer.id} />
												<button
													type="submit"
													class="remove-btn"
													title="Remove lecturer"
												>
													<X size={12} />
												</button>
											</form>
										</div>
									{/each}
								</div>
							{/if}
						</div>

						<!-- Offerings -->
						<div class="section">
							<h4>Offerings</h4>
							{#if course.offerings.length === 0}
								<div class="empty-state small">
									<p>No offerings available</p>
								</div>
							{:else}
								<div class="offering-list">
									{#each course.offerings as offering}
										<div class="offering-item">
											<span class="offering-label">{offering.academicSemester?.label || 'N/A'}</span>
											<span class="offering-status" class:open={offering.status === 'open'}>
												{offering.status}
											</span>
											<span class="offering-capacity">
												Capacity: {offering.capacity || 'Unlimited'}
											</span>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		{:else}
			<div class="empty-state large">
				<BookOpen size={48} strokeWidth={1} color="var(--color-muted)" />
				<p>No courses found matching your filters</p>
				<button class="btn-link" onclick={() => { search = ''; levelFilter = 'all'; semesterFilter = 'all'; }}>
					Clear all filters
				</button>
			</div>
		{/each}
	</div>

	<!-- Assign Lecturer Modal -->
	{#if showAssignModal}
		<div class="modal-overlay" onclick={() => showAssignModal = false}>
			<div class="modal" onclick={(e) => e.stopPropagation()}>
				<div class="modal-header">
					<h3>Assign Lecturer to Course</h3>
					<button class="modal-close" onclick={() => showAssignModal = false}><X size={18} /></button>
				</div>
				<form
					method="POST"
					action="?/assignLecturer"
					use:enhance={() => {
						return async ({ update }) => {
							await update();
							showAssignModal = false;
						};
					}}
				>
					<input type="hidden" name="courseId" value={selectedCourseId || ''} />

					<div class="modal-body">
						<div class="field">
							<label>Select Lecturer <span class="req">*</span></label>
							<select name="lecturerId" bind:value={selectedLecturerId} required>
								<option value="" disabled>Choose a lecturer...</option>
								{#each data.lecturers as lecturer}
									<option value={lecturer.id}>{lecturer.fullName} ({lecturer.email})</option>
								{/each}
							</select>
						</div>
					</div>

					<div class="modal-footer">
						<button type="button" class="btn btn-ghost" onclick={() => showAssignModal = false}>
							Cancel
						</button>
						<button type="submit" class="btn btn-primary" disabled={!selectedLecturerId}>
							<Save size={14} /> Assign
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
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

	/* Alerts */
	.alert {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		font-size: 0.85rem;
		margin-bottom: 1rem;
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

	/* Course List */
	.courses-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.course-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
		overflow: hidden;
		transition: all 0.2s ease;
	}

	.course-card:hover {
		border-color: #059669;
	}

	.course-card.expanded {
		border-color: #059669;
		box-shadow: 0 2px 8px rgba(5, 150, 105, 0.08);
	}

	.course-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.875rem 1.25rem;
		cursor: pointer;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.course-info {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		flex-wrap: wrap;
	}

	.course-code {
		font-size: 0.75rem;
		font-weight: 700;
		color: #059669;
		background: rgba(5, 150, 105, 0.08);
		padding: 0.2rem 0.5rem;
		border-radius: 0.3rem;
	}

	.course-title {
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--color-text);
	}

	.course-badge {
		font-size: 0.6rem;
		font-weight: 700;
		padding: 0.15rem 0.5rem;
		border-radius: 999px;
		background: #e2e8f0;
		color: #475569;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.course-badge.general {
		background: #dbeafe;
		color: #1d4ed8;
	}

	.course-meta {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.meta-item {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.7rem;
		color: var(--color-muted);
	}

	.expand-btn {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--color-muted);
		padding: 0.2rem;
		border-radius: 0.3rem;
		transition: transform 0.2s;
		display: flex;
		align-items: center;
	}
	.expand-btn:hover {
		color: var(--color-text);
		background: var(--color-bg);
	}
	.expand-btn.expanded {
		transform: rotate(180deg);
	}

	/* Course Body */
	.course-body {
		padding: 0 1.25rem 1.25rem;
		border-top: 1px solid var(--color-border);
	}

	.section {
		margin-top: 1rem;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.section h4 {
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--color-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0;
	}

	/* Lecturer Chips */
	.lecturer-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.lecturer-chip {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.4rem 0.75rem;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		font-size: 0.8rem;
	}

	.lecturer-name {
		font-weight: 600;
		color: var(--color-text);
	}

	.lecturer-email {
		color: var(--color-muted);
		font-size: 0.7rem;
	}

	.remove-form {
		display: inline;
	}

	.remove-btn {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--color-muted);
		padding: 0.1rem;
		border-radius: 0.2rem;
		display: flex;
		align-items: center;
		transition: all 0.15s;
	}
	.remove-btn:hover {
		color: #dc2626;
		background: rgba(220, 38, 38, 0.08);
	}

	/* Offering List */
	.offering-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.offering-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 0.75rem;
		background: var(--color-bg);
		border-radius: 0.4rem;
		font-size: 0.8rem;
	}

	.offering-label {
		font-weight: 500;
		color: var(--color-text);
	}

	.offering-status {
		font-size: 0.65rem;
		font-weight: 700;
		padding: 0.1rem 0.4rem;
		border-radius: 999px;
		background: #e2e8f0;
		color: #475569;
		text-transform: uppercase;
	}
	.offering-status.open {
		background: #dcfce7;
		color: #166534;
	}

	.offering-capacity {
		color: var(--color-muted);
		font-size: 0.7rem;
		margin-left: auto;
	}

	/* Empty State */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 1.5rem 1rem;
		color: var(--color-muted);
		text-align: center;
	}
	.empty-state.large {
		padding: 3rem 1rem;
	}
	.empty-state.small {
		padding: 0.75rem 1rem;
	}
	.empty-state p {
		margin: 0;
		font-size: 0.85rem;
	}

	/* Buttons */
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
		text-decoration: none;
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
	.btn-ghost {
		background: transparent;
		border: 1px solid var(--color-border);
		color: var(--color-text);
	}
	.btn-ghost:hover {
		border-color: #059669;
		color: #059669;
	}
	.btn-sm {
		padding: 0.3rem 0.6rem;
		font-size: 0.7rem;
	}

	.btn-link {
		background: none;
		border: none;
		color: #059669;
		font-size: 0.85rem;
		cursor: pointer;
		text-decoration: underline;
		font-family: inherit;
	}
	.btn-link:hover {
		color: #047857;
	}

	/* Modal */
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
		backdrop-filter: blur(4px);
	}

	.modal {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
		width: min(500px, 90vw);
		max-height: 80vh;
		overflow: hidden;
		animation: modalIn 0.2s ease;
	}

	@keyframes modalIn {
		from {
			opacity: 0;
			transform: scale(0.95) translateY(-10px);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid var(--color-border);
	}
	.modal-header h3 {
		margin: 0;
		font-size: 1rem;
		font-weight: 700;
	}
	.modal-close {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--color-muted);
		padding: 0.25rem;
		border-radius: 0.3rem;
		display: flex;
		align-items: center;
	}
	.modal-close:hover {
		background: var(--color-bg);
		color: var(--color-text);
	}

	.modal-body {
		padding: 1.25rem;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		padding: 0.75rem 1.25rem;
		border-top: 1px solid var(--color-border);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.field label {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-text);
	}
	.field select {
		padding: 0.5rem 0.6rem;
		border: 1px solid var(--color-border);
		border-radius: 0.4rem;
		background: var(--color-bg);
		color: var(--color-text);
		font-size: 0.85rem;
		font-family: inherit;
		cursor: pointer;
	}
	.field select:focus {
		outline: none;
		border-color: #059669;
	}
	.req {
		color: #dc2626;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.page {
			padding: 1rem;
		}
		.course-header {
			flex-direction: column;
			align-items: flex-start;
		}
		.course-meta {
			width: 100%;
			justify-content: flex-start;
		}
		.filter-group {
			flex-direction: column;
			align-items: stretch;
		}
		.search-input {
			width: 100%;
		}
		.filters-bar {
			flex-direction: column;
			align-items: stretch;
		}
		.lecturer-chip {
			flex-wrap: wrap;
		}
	}
</style>