<!-- src/routes/coordinator/lecturers/+page.svelte -->
<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import {
		Users, Search, X, Plus, BookOpen, GraduationCap,
		ChevronDown, Check, AlertCircle, Save, Trash2,
		Mail, Phone, User, FileText, BarChart3, Calendar
	} from '@lucide/svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let search = $state('');
	let expandedCards = $state<Set<string>>(new Set());
	let showAssignModal = $state(false);
	let selectedLecturerId = $state<string | null>(null);
	let selectedCourseId = $state('');

	const filteredLecturers = $derived(() => {
		if (!data?.lecturers) return [];
		if (!search) return data.lecturers;
		const q = search.toLowerCase();
		return data.lecturers.filter(l =>
			l.fullName?.toLowerCase().includes(q) ||
			l.email?.toLowerCase().includes(q) ||
			(l.staffId && l.staffId.toLowerCase().includes(q))
		);
	});

	function toggleExpand(id: string) {
		const next = new Set(expandedCards);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		expandedCards = next;
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
	<title>Lecturers — Dept Coordinator</title>
</svelte:head>

<div class="page">
	<!-- Header -->
	<header class="page-header">
		<div>
			<h1>Lecturers</h1>
			<p class="subtitle">
				{data?.stats?.total || 0} lecturers in your department &middot;
				{data?.stats?.withCourses || 0} with courses &middot;
				{data?.stats?.withoutCourses || 0} without courses &middot;
				{data?.stats?.totalAssignments || 0} total assignments
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

	<!-- Stats Summary -->
	<div class="stats-grid">
		<div class="stat-card">
			<div class="stat-icon" style="background: rgba(13,148,136,0.1); color: #0d9488;">
				<Users size={20} />
			</div>
			<div>
				<div class="stat-value">{data?.stats?.total || 0}</div>
				<div class="stat-label">Total Lecturers</div>
			</div>
		</div>
		<div class="stat-card">
			<div class="stat-icon" style="background: rgba(34,197,94,0.1); color: #22c55e;">
				<BookOpen size={20} />
			</div>
			<div>
				<div class="stat-value">{data?.stats?.withCourses || 0}</div>
				<div class="stat-label">With Courses</div>
			</div>
		</div>
		<div class="stat-card">
			<div class="stat-icon" style="background: rgba(239,68,68,0.1); color: #ef4444;">
				<FileText size={20} />
			</div>
			<div>
				<div class="stat-value">{data?.stats?.withoutCourses || 0}</div>
				<div class="stat-label">Without Courses</div>
			</div>
		</div>
		<div class="stat-card">
			<div class="stat-icon" style="background: rgba(99,102,241,0.1); color: #6366f1;">
				<BarChart3 size={20} />
			</div>
			<div>
				<div class="stat-value">{data?.stats?.totalAssignments || 0}</div>
				<div class="stat-label">Total Assignments</div>
			</div>
		</div>
	</div>

	<!-- Filters -->
	<div class="filters-bar">
		<div class="search-wrap">
			<Search size={14} />
			<input
				type="text"
				class="search-input"
				placeholder="Search lecturers..."
				bind:value={search}
			/>
			{#if search}
				<button class="search-clear" onclick={() => search = ''}><X size={12} /></button>
			{/if}
		</div>
		<span class="result-count">{filteredLecturers.length} lecturers</span>
	</div>

	<!-- Lecturer List -->
	<div class="lecturers-list">
		{#if !data?.lecturers || data.lecturers.length === 0}
			<div class="empty-state large">
				<Users size={48} strokeWidth={1} color="var(--color-muted)" />
				<p>No lecturers found in this department</p>
				<p class="hint">Contact admin to add lecturers to this department</p>
			</div>
		{:else if filteredLecturers.length === 0 && search}
			<div class="empty-state large">
				<Search size={48} strokeWidth={1} color="var(--color-muted)" />
				<p>No lecturers match your search</p>
				<button class="btn-link" onclick={() => search = ''}>Clear search</button>
			</div>
		{:else}
			{#each filteredLecturers as lecturer (lecturer.id)}
				{@const isExpanded = expandedCards.has(lecturer.id)}
				{@const courses = lecturer.lecturerCourses || []}
				{@const teachingAssignments = lecturer.teachingAssignments || []}

				<div class="lecturer-card" class:expanded={isExpanded}>
					<div class="lecturer-header" onclick={() => toggleExpand(lecturer.id)}>
						<div class="lecturer-info">
							<div class="lecturer-avatar">{getInitials(lecturer.fullName)}</div>
							<div>
								<div class="lecturer-name">{lecturer.fullName}</div>
								<div class="lecturer-details">
									<Mail size={12} /> {lecturer.email}
									{#if lecturer.staffId}
										&middot; <User size={12} /> {lecturer.staffId}
									{/if}
									{#if lecturer.phone}
										&middot; <Phone size={12} /> {lecturer.phone}
									{/if}
								</div>
							</div>
						</div>
						<div class="lecturer-meta">
							<span class="meta-badge">
								{courses.length} course{courses.length !== 1 ? 's' : ''}
							</span>
							<span class="meta-badge teaching">
								{teachingAssignments.length} offering{teachingAssignments.length !== 1 ? 's' : ''}
							</span>
							<button class="expand-btn" class:expanded={isExpanded}>
								<ChevronDown size={16} />
							</button>
						</div>
					</div>

					{#if isExpanded}
						<div class="lecturer-body">
							<!-- Course Assignments -->
							<div class="section-header">
								<h4>Assigned Courses</h4>
								<button
									class="btn btn-sm btn-primary"
									onclick={() => {
										selectedLecturerId = lecturer.id;
										selectedCourseId = '';
										showAssignModal = true;
									}}
								>
									<Plus size={12} /> Assign Course
								</button>
							</div>

							{#if courses.length === 0}
								<div class="empty-state">
									<BookOpen size={24} strokeWidth={1} />
									<p>No courses assigned to this lecturer</p>
								</div>
							{:else}
								<div class="course-grid">
									{#each courses as assignment}
										<div class="course-chip">
											<span class="course-code">{assignment.course.code}</span>
											<span class="course-title">{assignment.course.title}</span>
											<span class="course-credits">{assignment.course.creditUnits} CU</span>
											<form
												method="POST"
												action="?/removeCourse"
												use:enhance={() => {
													return async ({ update }) => {
														await update();
													};
												}}
												class="remove-form"
											>
												<input type="hidden" name="lecturerId" value={lecturer.id} />
												<input type="hidden" name="courseId" value={assignment.course.id} />
												<button
													type="submit"
													class="remove-btn"
													title="Remove course"
												>
													<X size={12} />
												</button>
											</form>
										</div>
									{/each}
								</div>
							{/if}

							<!-- Teaching Assignments (Offerings) -->
							{#if teachingAssignments.length > 0}
								<div class="section">
									<h4>Teaching Assignments (Offerings)</h4>
									<div class="offering-list">
										{#each teachingAssignments as ta}
											<div class="offering-item">
												<span class="offering-code">{ta.offering.course.code}</span>
												<span class="offering-title">{ta.offering.course.title}</span>
												<span class="offering-semester">
													<Calendar size={12} />
													{ta.offering.academicSemester?.label || 'N/A'}
												</span>
											</div>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		{/if}
	</div>

	<!-- Assign Course Modal -->
	{#if showAssignModal}
		<div class="modal-overlay" onclick={() => showAssignModal = false}>
			<div class="modal" onclick={(e) => e.stopPropagation()}>
				<div class="modal-header">
					<h3>Assign Course to Lecturer</h3>
					<button class="modal-close" onclick={() => showAssignModal = false}><X size={18} /></button>
				</div>
				<form
					method="POST"
					action="?/assignCourse"
					use:enhance={() => {
						return async ({ update }) => {
							await update();
							showAssignModal = false;
						};
					}}
				>
					<input type="hidden" name="lecturerId" value={selectedLecturerId || ''} />

					<div class="modal-body">
						<div class="field">
							<label>Select Course <span class="req">*</span></label>
							<select name="courseId" bind:value={selectedCourseId} required>
								<option value="" disabled>Choose a course...</option>
								{#each data.courses as course}
									<option value={course.id}>
										{course.code} — {course.title} ({course.creditUnits} CU, {course.level}L)
									</option>
								{/each}
							</select>
						</div>
					</div>

					<div class="modal-footer">
						<button type="button" class="btn btn-ghost" onclick={() => showAssignModal = false}>
							Cancel
						</button>
						<button type="submit" class="btn btn-primary" disabled={!selectedCourseId}>
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

	/* Stats */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}
	.stat-card {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
	}
	.stat-icon {
		width: 38px;
		height: 38px;
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
	.search-wrap {
		position: relative;
		display: flex;
		align-items: center;
		flex: 1;
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
		width: 100%;
		font-family: inherit;
		transition: border-color 0.15s;
	}
	.search-input:focus {
		outline: none;
		border-color: #0d9488;
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
	.result-count {
		font-size: 0.8rem;
		color: var(--color-muted);
		font-weight: 500;
		white-space: nowrap;
	}

	/* Lecturer List */
	.lecturers-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.lecturer-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
		overflow: hidden;
		transition: all 0.2s ease;
	}
	.lecturer-card:hover {
		border-color: #0d9488;
	}
	.lecturer-card.expanded {
		border-color: #0d9488;
		box-shadow: 0 2px 8px rgba(13, 148, 136, 0.08);
	}

	.lecturer-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.875rem 1.25rem;
		cursor: pointer;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.lecturer-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.lecturer-avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: linear-gradient(135deg, #0d9488, #14b8a6);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.8rem;
		font-weight: 700;
		flex-shrink: 0;
	}
	.lecturer-name {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-text);
	}
	.lecturer-details {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
		color: var(--color-muted);
		flex-wrap: wrap;
	}
	.lecturer-details :global(svg) {
		flex-shrink: 0;
	}

	.lecturer-meta {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.meta-badge {
		font-size: 0.7rem;
		font-weight: 600;
		padding: 0.2rem 0.6rem;
		border-radius: 999px;
		background: var(--color-bg);
		color: var(--color-muted);
	}
	.meta-badge.teaching {
		background: rgba(13, 148, 136, 0.08);
		color: #0d9488;
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

	/* Lecturer Body */
	.lecturer-body {
		padding: 0 1.25rem 1.25rem;
		border-top: 1px solid var(--color-border);
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
		margin-top: 1rem;
	}
	.section-header h4 {
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--color-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0;
	}

	.section {
		margin-top: 1rem;
	}
	.section h4 {
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--color-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0 0 0.5rem;
	}

	/* Course Grid */
	.course-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.course-chip {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.35rem 0.65rem;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 0.4rem;
		font-size: 0.78rem;
	}
	.course-code {
		font-weight: 700;
		color: #0d9488;
	}
	.course-title {
		color: var(--color-text);
	}
	.course-credits {
		color: var(--color-muted);
		font-size: 0.65rem;
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
		gap: 0.25rem;
	}
	.offering-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.3rem 0.6rem;
		background: var(--color-bg);
		border-radius: 0.3rem;
		font-size: 0.75rem;
	}
	.offering-code {
		font-weight: 600;
		color: #0d9488;
	}
	.offering-title {
		color: var(--color-text);
	}
	.offering-semester {
		color: var(--color-muted);
		margin-left: auto;
		font-size: 0.65rem;
		display: flex;
		align-items: center;
		gap: 0.2rem;
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
	.empty-state p {
		margin: 0;
		font-size: 0.85rem;
	}
	.empty-state .hint {
		font-size: 0.75rem;
		opacity: 0.7;
	}

	.btn-link {
		background: none;
		border: none;
		color: #0d9488;
		font-size: 0.85rem;
		cursor: pointer;
		text-decoration: underline;
		font-family: inherit;
	}
	.btn-link:hover {
		color: #0f766e;
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
	}
	.btn-primary {
		background: #0d9488;
		color: white;
		border-color: #0d9488;
	}
	.btn-primary:hover:not(:disabled) {
		background: #0f766e;
		border-color: #0f766e;
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
		border-color: #0d9488;
		color: #0d9488;
	}
	.btn-sm {
		padding: 0.3rem 0.6rem;
		font-size: 0.7rem;
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
		border-color: #0d9488;
	}
	.req {
		color: #dc2626;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.page {
			padding: 1rem;
		}
		.lecturer-header {
			flex-direction: column;
			align-items: flex-start;
		}
		.lecturer-meta {
			width: 100%;
			justify-content: flex-start;
		}
		.stats-grid {
			grid-template-columns: 1fr 1fr;
		}
		.course-chip {
			flex-wrap: wrap;
		}
	}
</style>