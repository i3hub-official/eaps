<!-- src/routes/student/courses/register/+page.svelte -->
<script lang="ts">
	import {
		BookOpen,
		Trash2,
		CheckCircle2,
		AlertCircle,
		GraduationCap,
		CreditCard,
		ArrowLeft,
		X,
		Building2,
		Lock,
		Send,
		RefreshCw,
		ShieldAlert,
		ChevronDown,
		ChevronUp
	} from '@lucide/svelte';
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	type RegEntry = (typeof data.existingRegistrations)[number];
	type CourseEntry = (typeof data.availableCourses)[number];
	type RegType = 'normal' | 'carry_over' | 'borrowed';
	type Phase = 'draft' | 'submitted' | 'locked';

	// ── Reactive state from server ────────────────────────────────────────
	let regs = $state<RegEntry[]>(data.existingRegistrations);
	let courses = $state<CourseEntry[]>(data.availableCourses);
	let phase = $state<Phase>(data.meta.phase as Phase);
	let usedCredits = $state(data.meta.currentCredits);

	$effect(() => {
		regs = data.existingRegistrations;
		courses = data.availableCourses;
		phase = data.meta.phase as Phase;
		usedCredits = data.meta.currentCredits;
		// Clear pending selections when server data changes
		pendingAddIds = new Map();
		updateAddIds = new Map();
		updateDropIds = new Set();
	});

	// ── UI state ──────────────────────────────────────────────────────────
	let search = $state('');
	let typeFilter = $state(''); // '' = all, else matches course.typeLabel
	let dropping = $state<string | null>(null);
	let submitting = $state(false);
	let regsExpanded = $state(true);

	// Draft: offeringIds the student has tapped to queue for adding
	let pendingAddIds = $state<Map<string, RegType>>(new Map()); // offeringId → type

	// Submitted: separate add/drop sets for the one-time update
	let updateAddIds = $state<Map<string, RegType>>(new Map());
	let updateDropIds = $state<Set<string>>(new Set());

	// ── Helpers ───────────────────────────────────────────────────────────
	const maxCredits = data.meta.maxCredits;

	const currentCredits = $derived(usedCredits);

	const pendingCredits = $derived(
		[...pendingAddIds.keys()].reduce((s, id) => {
			const c = courses.find((x) => x.id === id);
			return s + (c?.creditUnits ?? 0);
		}, 0)
	);

	const creditsToRemove = $derived(
		[...updateDropIds].reduce((s, regId) => {
			const reg = regs.find((r) => r.id === regId);
			return s + (reg?.creditUnits ?? 0);
		}, 0)
	);

	const creditsToAdd = $derived(
		[...updateAddIds.keys()].reduce((s, courseId) => {
			const c = courses.find((x) => x.id === courseId);
			return s + (c?.creditUnits ?? 0);
		}, 0)
	);

	const projectedAfterAdd = $derived(currentCredits + pendingCredits);
	const projectedAfterUpdate = $derived(currentCredits - creditsToRemove + creditsToAdd);

	const creditPct = $derived(Math.min((currentCredits / maxCredits) * 100, 100));
	const creditColor = $derived(
		creditPct > 90 ? '#dc2626' : creditPct > 75 ? '#f59e0b' : 'var(--green-600)'
	);

	function canAddCourse(creditUnits: number, courseId: string): boolean {
		if (pendingAddIds.has(courseId)) return true;
		return projectedAfterAdd + creditUnits <= maxCredits;
	}

	function canAddInUpdate(creditUnits: number, courseId: string): boolean {
		if (updateAddIds.has(courseId)) return true;
		return projectedAfterUpdate + creditUnits <= maxCredits;
	}

	// Distinct type labels actually present, in a stable order — drives the
	// filter chip row. A 100L student simply never sees a "Carry-Over" chip
	// because resolveLowerLevelOfferings already returned nothing for them.
	const TYPE_ORDER = ['Normal', 'GST', 'Borrowed', 'Elective', 'Carry-Over'];
	const presentTypes = $derived(
		TYPE_ORDER.filter((t) => courses.some((c) => c.typeLabel === t))
	);

	const q = $derived(search.trim().toLowerCase());
	const visibleCourses = $derived(
		courses.filter((c) => {
			if (typeFilter && c.typeLabel !== typeFilter) return false;
			if (!q) return true;
			return (
				c.code.toLowerCase().includes(q) ||
				c.title.toLowerCase().includes(q) ||
				c.department.toLowerCase().includes(q)
			);
		})
	);

	const updateAddCourses = $derived(courses.filter((c) => updateAddIds.has(c.id)));
	const updateDropRegs = $derived(regs.filter((r) => updateDropIds.has(r.id)));
	const netCreditChange = $derived(creditsToAdd - creditsToRemove);

	const normalRegs = $derived(regs.filter((r) => r.registrationType === 'normal'));
	const carryOverRegs = $derived(regs.filter((r) => r.registrationType === 'carry_over'));
	const borrowedRegs = $derived(regs.filter((r) => r.registrationType === 'borrowed'));

	// ── Card tap handlers ─────────────────────────────────────────────────
	function handleCardTap(course: CourseEntry) {
		const type = course.regType as RegType;

		if (phase === 'draft') {
			const m = new Map(pendingAddIds);
			if (m.has(course.id)) {
				m.delete(course.id);
			} else {
				if (!canAddCourse(course.creditUnits, course.id)) return;
				m.set(course.id, type);
			}
			pendingAddIds = m;
		} else if (phase === 'submitted') {
			const m = new Map(updateAddIds);
			if (m.has(course.id)) {
				m.delete(course.id);
			} else {
				if (!canAddInUpdate(course.creditUnits, course.id)) return;
				m.set(course.id, type);
			}
			updateAddIds = m;
		}
	}

	function toggleDropReg(regId: string) {
		const s = new Set(updateDropIds);
		if (s.has(regId)) {
			s.delete(regId);
		} else {
			s.add(regId);
		}
		updateDropIds = s;
	}

	// ── Optimistic add / revert ───────────────────────────────────────────
	function optimisticAdd(course: CourseEntry, type: RegType) {
		const status = type === 'carry_over' ? 'pending' : 'approved';
		regs = [
			...regs,
			{
				id: 'opt-' + course.id,
				courseId: course.id,
				courseCode: course.code,
				courseTitle: course.title,
				creditUnits: course.creditUnits,
				level: course.level,
				department: course.department,
				registrationType: type,
				status,
				registeredAt: new Date()
			}
		];
		usedCredits += course.creditUnits;
		courses = courses.filter((c) => c.id !== course.id);
	}

	function revertAdd(course: CourseEntry, type: RegType) {
		regs = regs.filter((r) => r.courseId !== course.id);
		usedCredits -= course.creditUnits;
		courses = [...courses, course].sort((a, b) => a.code.localeCompare(b.code));
	}

	// ── Label / color helpers (for the registered-courses panel, which only
	// has raw registrationType, not the server-computed typeLabel/typeColor
	// available courses carry) ──────────────────────────────────────────────
	function typeLabel(t: string) {
		return t === 'carry_over' ? 'Carry-Over' : t === 'borrowed' ? 'Borrowed' : 'Normal';
	}
	function typeColor(t: string) {
		return t === 'carry_over' ? '#f59e0b' : t === 'borrowed' ? '#6366f1' : 'var(--green-600)';
	}

	function statusBadge(s: string) {
		switch (s) {
			case 'approved':
				return { text: 'Approved', color: 'var(--green-700)', bg: 'var(--green-soft)' };
			case 'pending':
				return { text: 'Pending', color: '#d97706', bg: 'rgba(245,158,11,.12)' };
			case 'rejected':
				return { text: 'Rejected', color: '#dc2626', bg: 'rgba(220,38,38,.1)' };
			default:
				return { text: s, color: 'var(--color-muted)', bg: 'var(--color-bg)' };
		}
	}

	const phaseInfo: Record<Phase, { label: string; color: string; bg: string }> = {
		draft: { label: 'Adding courses', color: 'var(--green-700)', bg: 'var(--green-soft)' },
		submitted: {
			label: 'Submitted · 1 update remaining',
			color: '#d97706',
			bg: 'rgba(245,158,11,.1)'
		},
		locked: {
			label: 'Locked · Contact academic office',
			color: '#dc2626',
			bg: 'rgba(220,38,38,.07)'
		}
	};

	// Pending courses objects (for batch submit)
	const pendingCourses = $derived(
		[...pendingAddIds.entries()]
			.map(([id, type]) => ({
				course: courses.find((c) => c.id === id)!,
				type
			}))
			.filter((x) => x.course)
	);

	const showUpdatePanel = $derived(
		phase === 'submitted' && (updateAddIds.size > 0 || updateDropIds.size > 0)
	);

	const creditWarning = $derived(
		phase === 'draft' && projectedAfterAdd > maxCredits
			? `Would exceed ${maxCredits} CU limit by ${projectedAfterAdd - maxCredits} CU`
			: phase === 'submitted' && projectedAfterUpdate > maxCredits
				? `Would exceed ${maxCredits} CU limit by ${projectedAfterUpdate - maxCredits} CU`
				: null
	);
</script>

<div class="page">
	<!-- ── Top bar ──────────────────────────────────────────────────────────── -->
	<div class="topbar">
		<a href="/student/courses" class="back-link">
			<ArrowLeft size={13} /> Back to Courses
		</a>

		<div class="topbar-center">
			<h1>Course Registration</h1>
			<p class="page-sub">
				{data.meta.session} · Sem {data.meta.semester} · {data.meta.studentLevel}L
			</p>
		</div>

		<div class="topbar-right">
			<div class="credit-ring" style="--pct:{creditPct}; --clr:{creditColor}">
				<svg width="40" height="40" viewBox="0 0 40 40">
					<circle
						cx="20"
						cy="20"
						r="16"
						fill="none"
						stroke="var(--color-border)"
						stroke-width="3.5"
					/>
					<circle
						cx="20"
						cy="20"
						r="16"
						fill="none"
						stroke={creditColor}
						stroke-width="3.5"
						stroke-dasharray="{Math.min(creditPct, 100) * 1.005} 100.5"
						stroke-dashoffset="25.125"
						stroke-linecap="round"
					/>
				</svg>
				<div class="ring-label">
					<span class="ring-used" style="color:{creditColor}">
						{phase === 'draft'
							? projectedAfterAdd
							: phase === 'submitted'
								? projectedAfterUpdate
								: currentCredits}
					</span>
					<span class="ring-max">/{maxCredits}</span>
				</div>
			</div>

			<div
				class="phase-tag"
				style="color:{phaseInfo[phase].color}; background:{phaseInfo[phase].bg}"
			>
				{#if phase === 'locked'}<Lock size={10} />{:else if phase === 'submitted'}<ShieldAlert
						size={10}
					/>{:else}<RefreshCw size={10} />{/if}
				{phaseInfo[phase].label}
			</div>
		</div>
	</div>

	{#if form?.error}
		<div class="alert alert-error"><AlertCircle size={13} /> {form.error}</div>
	{/if}

	{#if creditWarning}
		<div class="alert alert-amber"><AlertCircle size={13} /> {creditWarning}</div>
	{/if}

	<!-- ── Phase banners ──────────────────────────────────────────────────── -->
	{#if phase === 'submitted'}
		<div class="alert alert-amber">
			<ShieldAlert size={14} />
			<div>
				<strong>Registration submitted.</strong>
				Tap courses below to add or tick registered courses to remove. You have
				<strong>one update pass</strong> before your registration locks permanently.
			</div>
		</div>
	{:else if phase === 'locked'}
		<div class="alert alert-red">
			<Lock size={14} />
			<strong>Registration is locked.</strong> Contact your academic office for any further changes.
		</div>
	{/if}

	<div class="two-columns">
		<!-- LEFT COLUMN: Flat course list & Pending Tray -->
		<div class="col-left">
			{#if phase !== 'locked'}
				<section class="discover">
					<!-- Search -->
					<div class="search-wrap">
						<BookOpen size={13} class="search-icon" />
						<input
							type="text"
							placeholder="Search code, title, department…"
							bind:value={search}
							class="search-input"
						/>
						{#if search}
							<button class="search-clear" onclick={() => (search = '')}>
								<X size={11} />
							</button>
						{/if}
					</div>

					<!-- Type filter chips — only shows categories the student actually has -->
					{#if presentTypes.length > 1}
						<div class="chip-row">
							<button class="chip" class:active={typeFilter === ''} onclick={() => (typeFilter = '')}>
								All <span class="chip-count">{courses.length}</span>
							</button>
							{#each presentTypes as t}
								{@const cnt = courses.filter((c) => c.typeLabel === t).length}
								{@const clr = courses.find((c) => c.typeLabel === t)?.typeColor ?? 'var(--green-600)'}
								<button
									class="chip"
									class:active={typeFilter === t}
									style="--chip-color:{clr}"
									onclick={() => (typeFilter = typeFilter === t ? '' : t)}
								>
									{t} <span class="chip-count">{cnt}</span>
								</button>
							{/each}
						</div>
					{/if}

					<!-- Hint line -->
					<p class="tab-hint">
						<Building2 size={11} />
						{data.meta.studentCollege ?? 'Your college'} · {data.meta.studentLevel}L
						{#if phase === 'draft' && pendingAddIds.size > 0}
							<span class="hint-selected">
								· {pendingAddIds.size} selected (+{pendingCredits} CU → {projectedAfterAdd}/{maxCredits}
								CU)</span
							>
						{:else if phase === 'draft'}
							<span class="hint-selected"> · {currentCredits}/{maxCredits} CU used</span>
						{:else if phase === 'submitted' && (updateAddIds.size > 0 || updateDropIds.size > 0)}
							<span class="hint-submitted">
								· Net: {netCreditChange >= 0 ? '+' : ''}{netCreditChange} CU → {projectedAfterUpdate}/{maxCredits}
								CU</span
							>
						{:else if phase === 'submitted'}
							<span class="hint-submitted">
								· {currentCredits}/{maxCredits} CU · Tap to queue for update</span
							>
						{/if}
					</p>

					<!-- Course grid -->
					<div class="course-grid-wrapper">
						{#if visibleCourses.length === 0}
							<div class="empty-state">
								<BookOpen size={28} strokeWidth={1.4} />
								<p>
									{search || typeFilter
										? 'No courses match your search or filter.'
										: 'All available courses already registered.'}
								</p>
							</div>
						{:else}
							<div class="course-grid">
								{#each visibleCourses as course (course.id)}
									{@const over =
										phase === 'draft'
											? !canAddCourse(course.creditUnits, course.id) &&
												!pendingAddIds.has(course.id)
											: !canAddInUpdate(course.creditUnits, course.id) &&
												!updateAddIds.has(course.id)}
									{@const isDraftSelected = pendingAddIds.has(course.id)}
									{@const isUpdateSelected = updateAddIds.has(course.id)}
									{@const isSelected = phase === 'draft' ? isDraftSelected : isUpdateSelected}
									{@const tColor = course.typeColor}

									<button
										class="course-card"
										class:selected={isSelected}
										class:over-limit={over && !isSelected}
										data-regtype={course.regType}
										disabled={over && !isSelected}
										onclick={() => handleCardTap(course)}
										style="--card-accent:{tColor};"
									>
										<div class="card-top">
											<span class="card-code">{course.code}</span>
											<span class="card-cu"
												>{course.creditUnits}<span class="cu-label">CU</span></span
											>
										</div>

										<span class="card-title">{course.title}</span>

										<div class="card-meta">
											<span class="meta-chip"><GraduationCap size={9} /> {course.level}L</span>
											<span class="meta-chip"><Building2 size={9} /> {course.departmentCode}</span>
											{#if course.regType === 'borrowed'}
												<span class="meta-chip borrowed-chip">{course.collegeAbbr}</span>
											{/if}
										</div>

										<div
											class="card-footer"
											class:footer-selected={isSelected}
											style="--fc:{tColor}"
										>
											<span class="footer-type">
												<span class="type-dot" style="background:{tColor}"></span>
												{course.typeLabel}
											</span>
											{#if over}
												<span class="footer-limit">Limit reached</span>
											{:else if isSelected}
												<span class="footer-sel" style="color:{tColor}">
													<CheckCircle2 size={10} /> Selected
												</span>
											{:else}
												<span class="footer-add">Tap to add</span>
											{/if}
										</div>
									</button>
								{/each}
							</div>
						{/if}
					</div>
				</section>
			{/if}

			<!-- PENDING ADD TRAY -->
			{#if phase === 'draft' && pendingCourses.length > 0}
				<section class="pending-tray">
					<div class="tray-head">
						<div class="tray-title">
							<CheckCircle2 size={13} style="color:var(--green-600)" />
							<span>Selected to register</span>
							<span class="tray-count">{pendingCourses.length}</span>
						</div>
						<button class="tray-clear" onclick={() => (pendingAddIds = new Map())}>
							<X size={12} /> Clear all
						</button>
					</div>

					<div class="tray-list-wrapper">
						<div class="tray-list">
							{#each pendingCourses as { course, type }}
								<div class="tray-row" style="border-left-color:{course.typeColor}">
									<div class="tray-left">
										<span class="tray-code">{course.code}</span>
										<span class="tray-title">{course.title}</span>
									</div>
									<div class="tray-right">
										<span class="tray-cu">{course.creditUnits} CU</span>
										<span
											class="tray-type"
											style="color:{course.typeColor}; background:{course.typeColor}1f"
											>{course.typeLabel}</span
										>
										<button
											class="tray-remove"
											onclick={() => {
												const m = new Map(pendingAddIds);
												m.delete(course.id);
												pendingAddIds = m;
											}}
										>
											<X size={11} />
										</button>
									</div>
								</div>
							{/each}
						</div>
					</div>

					<div class="tray-footer">
						<div class="projected-credits">
							<CreditCard size={12} />
							<span
								>After adding: <strong
									style="color:{projectedAfterAdd > maxCredits ? '#dc2626' : 'var(--green-600)'}"
									>{projectedAfterAdd}</strong
								>
								/ {maxCredits} CU</span
							>
							{#if projectedAfterAdd > maxCredits}
								<span style="color:#dc2626; font-size:0.7rem;"
									>(Exceeds by {projectedAfterAdd - maxCredits} CU)</span
								>
							{/if}
						</div>

						<form
							method="POST"
							action="?/batchRegister"
							use:enhance={() => {
								submitting = true;

								const snapshot = [...pendingCourses];
								pendingAddIds = new Map();

								for (const { course, type } of snapshot) optimisticAdd(course, type);

								return async ({ result, update }) => {
									submitting = false;
									if (result.type === 'failure') {
										for (const { course, type } of snapshot) revertAdd(course, type);
										pendingAddIds = new Map(snapshot.map(({ course, type }) => [course.id, type]));
									}
									await update({ reset: false });
								};
							}}
						>
							{#each pendingCourses as { course, type } (course.id)}
								<input type="hidden" name="offeringId" value={course.id} />
								<input type="hidden" name="type" value={type} />
							{/each}
							<button
								type="submit"
								class="btn-add-selected"
								disabled={submitting || projectedAfterAdd > maxCredits}
							>
								<CheckCircle2 size={14} />
								{submitting
									? 'Adding…'
									: `Add ${pendingCourses.length} course${pendingCourses.length !== 1 ? 's' : ''}`}
							</button>
						</form>
					</div>
				</section>
			{/if}
		</div>

		<!-- RIGHT COLUMN: Registered Courses (sticky sidebar) -->
		<div class="col-right">
			<section class="reg-section">
				<button class="reg-section-head" onclick={() => (regsExpanded = !regsExpanded)}>
					<CheckCircle2 size={13} style="color:var(--green-600)" />
					<h2>Registered Courses</h2>
					<span class="reg-pill">{regs.length} · {currentCredits} CU</span>
					{#if phase === 'submitted'}
						<span class="tick-hint">Tick to remove</span>
					{/if}
					<span class="expand-icon">
						{#if regsExpanded}<ChevronUp size={14} />{:else}<ChevronDown size={14} />{/if}
					</span>
				</button>

				{#if regsExpanded}
					<div class="reg-courses-scroll">
						{#if regs.length === 0}
							<div class="reg-empty">
								<BookOpen size={18} strokeWidth={1.5} />
								<p>No courses registered yet — select from the list above.</p>
							</div>
						{:else}
							{#each [{ label: 'Normal', color: 'var(--green-600)', list: normalRegs, type: 'normal' }, { label: 'Carry-Over', color: '#f59e0b', list: carryOverRegs, type: 'carry_over' }, { label: 'Borrowed', color: '#6366f1', list: borrowedRegs, type: 'borrowed' }] as group (group.type)}
								{#if group.list.length > 0}
									<div class="reg-group">
										<div class="group-label" style="color:{group.color}">
											<span class="g-dot" style="background:{group.color}"></span>
											{group.label}
											<span class="g-count">{group.list.length}</span>
										</div>

										{#each group.list as reg (reg.id)}
											{@const sb = statusBadge(reg.status)}
											{@const isDropSelected = updateDropIds.has(reg.id)}

											<div
												class="reg-row"
												class:row-drop-queued={isDropSelected}
												role={phase === 'submitted' ? 'button' : undefined}
												tabindex={phase === 'submitted' ? 0 : undefined}
												onclick={() => phase === 'submitted' && toggleDropReg(reg.id)}
												onkeydown={(e) =>
													phase === 'submitted' && e.key === 'Enter' && toggleDropReg(reg.id)}
											>
												{#if phase === 'submitted'}
													<span class="row-checkbox" class:row-cb-active={isDropSelected}>
														<span class="row-cb-inner"></span>
													</span>
												{/if}

												<div class="reg-info">
													<span
														class="reg-code"
														style="border-color:{group.color}40; color:{group.color}"
														>{reg.courseCode}</span
													>
													<div class="reg-text">
														<span class="reg-title">{reg.courseTitle}</span>
														<span class="reg-dept">{reg.department}</span>
													</div>
												</div>

												<div class="reg-meta">
													<span class="reg-cu"
														>{reg.creditUnits}<span style="opacity:.55; font-weight:400">
															CU</span
														></span
													>
													<span class="status-badge" style="color:{sb.color}; background:{sb.bg}"
														>{sb.text}</span
													>

													{#if phase === 'draft'}
														<form
															method="POST"
															action="?/drop"
															use:enhance={() => {
																dropping = reg.id;
																const snap = { regs: [...regs], credits: usedCredits };
																regs = regs.filter((r) => r.id !== reg.id);
																usedCredits -= reg.creditUnits;
																return async ({ result, update }) => {
																	dropping = null;
																	if (result.type === 'failure') {
																		regs = snap.regs;
																		usedCredits = snap.credits;
																	}
																	await update({ reset: false });
																};
															}}
														>
															<input type="hidden" name="registrationId" value={reg.id} />
															<button
																class="drop-btn"
																disabled={dropping === reg.id}
																aria-label="Drop course"
															>
																<Trash2 size={12} />
															</button>
														</form>
													{/if}
												</div>
											</div>
										{/each}
									</div>
								{/if}
							{/each}
						{/if}
					</div>

					{#if phase === 'draft' && regs.length > 0}
						<div class="submit-footer">
							<form
								method="POST"
								action="?/submit"
								use:enhance={() => {
									submitting = true;
									return async ({ result, update }) => {
										submitting = false;
										if (result.type === 'success') phase = 'submitted';
										await update({ reset: false });
									};
								}}
							>
								<button type="submit" class="btn-submit" disabled={submitting}>
									<Send size={14} />
									{submitting ? 'Submitting…' : 'Submit Registration'}
								</button>
							</form>
							<p class="submit-note">
								After submitting you get <strong>one update</strong> before your registration is permanently
								locked.
							</p>
						</div>
					{/if}
				{/if}
			</section>
		</div>
	</div>

	<!-- UPDATE PANEL -->
	{#if showUpdatePanel}
		<div class="update-panel">
			<div class="update-header">
				<div>
					<h3>One-Time Update</h3>
					<p class="update-sub">
						{updateDropIds.size} to remove ({creditsToRemove} CU) · {updateAddIds.size} to add ({creditsToAdd}
						CU)
						{#if netCreditChange !== 0}· net {netCreditChange > 0 ? '+' : ''}{netCreditChange} CU{/if}
						<br />
						<strong
							style="color:{projectedAfterUpdate > maxCredits ? '#dc2626' : 'var(--green-600)'}"
						>
							New total: {projectedAfterUpdate} / {maxCredits} CU
						</strong>
						{#if projectedAfterUpdate > maxCredits}
							<span style="color:#dc2626">
								(Exceeds by {projectedAfterUpdate - maxCredits} CU)</span
							>
						{/if}
					</p>
				</div>
				<button
					class="close-btn"
					onclick={() => {
						updateAddIds = new Map();
						updateDropIds = new Set();
					}}
				>
					<X size={14} />
				</button>
			</div>

			{#if updateDropRegs.length > 0}
				<div class="update-group">
					<span class="update-group-label remove-label">Removing</span>
					{#each updateDropRegs as r}
						<div class="update-row remove-row">
							<span class="reg-code" style="color:#dc2626; border-color:rgba(220,38,38,.3)"
								>{r.courseCode}</span
							>
							<span class="update-title">{r.courseTitle}</span>
							<span class="reg-cu">{r.creditUnits} CU</span>
						</div>
					{/each}
				</div>
			{/if}

			{#if updateAddCourses.length > 0}
				<div class="update-group">
					<span class="update-group-label add-label">Adding</span>
					{#each updateAddCourses as c}
						<div class="update-row add-row">
							<span
								class="reg-code"
								style="color:{c.typeColor}; border-color:{c.typeColor}40">{c.code}</span
							>
							<span class="update-title">{c.title}</span>
							<span class="reg-cu">{c.creditUnits} CU</span>
						</div>
					{/each}
				</div>
			{/if}

			<form
				method="POST"
				action="?/update"
				use:enhance={() => {
					submitting = true;
					return async ({ result, update }) => {
						submitting = false;
						if (result.type === 'success') {
							phase = 'locked';
							updateAddIds = new Map();
							updateDropIds = new Set();
						}
						await update({ reset: false });
					};
				}}
			>
				{#each updateDropRegs as r}
					<input type="hidden" name="dropId" value={r.id} />
				{/each}
				{#each updateAddCourses as c}
					<input type="hidden" name="addOfferingId" value={c.id} />
					<input type="hidden" name="addType" value={updateAddIds.get(c.id)} />
				{/each}

				<button
					type="submit"
					class="btn-update"
					disabled={submitting || projectedAfterUpdate > maxCredits}
				>
					<RefreshCw size={14} />
					{submitting ? 'Applying…' : 'Apply Update & Lock Registration'}
				</button>
			</form>

			<p class="update-warn">
				<AlertCircle size={12} />
				This is your <strong>one and only</strong> update. After applying, only an admin can make changes.
			</p>
		</div>
	{/if}
</div>

<style>
	:global(:root) {
		--green-600: #16a34a;
		--green-700: #15803d;
		--green-soft: rgba(34, 197, 94, 0.08);
		--amber-soft: rgba(245, 158, 11, 0.08);
		--red-soft: rgba(220, 38, 38, 0.06);
		--color-text: #1e293b;
		--color-muted: #64748b;
		--color-border: #e2e8f0;
		--color-bg: #f8fafc;
		--color-surface: #ffffff;
	}

	.page {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		padding: 1rem 1.5rem;
		max-width: 1600px;
		margin: 0 auto;
		width: 100%;
	}

	.topbar {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		flex-wrap: wrap;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--color-border);
	}
	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.72rem;
		color: var(--color-muted);
		text-decoration: none;
		padding: 0.3rem 0;
		transition: color 0.15s;
		flex-shrink: 0;
		margin-top: 0.2rem;
	}
	.back-link:hover {
		color: var(--green-600);
	}

	.topbar-center {
		flex: 1;
		min-width: 0;
	}
	.topbar-center h1 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 800;
		color: var(--color-text);
	}
	.page-sub {
		margin: 0.1rem 0 0;
		font-size: 0.72rem;
		color: var(--color-muted);
	}

	.topbar-right {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-shrink: 0;
		flex-wrap: wrap;
	}

	.credit-ring {
		position: relative;
		width: 44px;
		height: 44px;
		flex-shrink: 0;
	}
	.credit-ring svg {
		position: absolute;
		inset: 0;
		transform: rotate(-90deg);
	}
	.ring-label {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		line-height: 1;
	}
	.ring-used {
		font-size: 0.7rem;
		font-weight: 800;
	}
	.ring-max {
		font-size: 0.45rem;
		color: var(--color-muted);
	}

	.phase-tag {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		padding: 0.25rem 0.7rem;
		border-radius: 999px;
		border: 1px solid;
	}

	.alert {
		display: flex;
		align-items: flex-start;
		gap: 0.6rem;
		padding: 0.75rem 1rem;
		border-radius: 0.6rem;
		border: 1px solid;
		font-size: 0.79rem;
		line-height: 1.45;
	}
	.alert strong {
		font-weight: 700;
	}
	.alert-error {
		background: var(--red-soft);
		border-color: rgba(220, 38, 38, 0.25);
		color: #dc2626;
	}
	.alert-amber {
		background: var(--amber-soft);
		border-color: rgba(245, 158, 11, 0.3);
		color: #92400e;
	}
	.alert-red {
		background: var(--red-soft);
		border-color: rgba(220, 38, 38, 0.25);
		color: #991b1b;
	}

	.two-columns {
		display: flex;
		gap: 1.5rem;
		align-items: flex-start;
	}

	.col-left {
		flex: 3;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		align-self: flex-start;
	}

	.col-right {
		flex: 1.2;
		min-width: 280px;
		position: sticky;
		top: 1rem;
		align-self: flex-start;
	}

	@media (max-width: 860px) {
		.two-columns {
			flex-direction: column;
		}
		.col-right {
			position: static;
			width: 100%;
		}
		.col-left {
			width: 100%;
		}
	}

	.discover {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 1rem;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.search-wrap {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0.875rem 0.875rem 0;
		padding: 0.45rem 0.7rem;
		border-radius: 0.5rem;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
	}
	.search-icon {
		color: var(--color-muted);
		flex-shrink: 0;
	}
	.search-input {
		flex: 1;
		border: none;
		background: none;
		outline: none;
		font-size: 0.8rem;
		color: var(--color-text);
		font-family: inherit;
	}
	.search-input::placeholder {
		color: var(--color-muted);
	}
	.search-clear {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		border: none;
		background: var(--color-border);
		color: var(--color-muted);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	/* Type filter chips */
	.chip-row {
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
		padding: 0.6rem 0.875rem 0;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.3rem 0.65rem;
		border-radius: 999px;
		border: 1.5px solid var(--color-border);
		background: var(--color-bg);
		font-size: 0.72rem;
		font-weight: 600;
		color: var(--color-muted);
		cursor: pointer;
		font-family: inherit;
		transition:
			border-color 0.15s,
			background 0.15s,
			color 0.15s;
	}
	.chip:hover {
		border-color: var(--chip-color, var(--green-600));
	}
	.chip.active {
		border-color: var(--chip-color, var(--green-600));
		background: color-mix(in srgb, var(--chip-color, var(--green-600)) 12%, var(--color-surface));
		color: var(--chip-color, var(--green-600));
	}
	.chip-count {
		font-size: 0.62rem;
		opacity: 0.75;
	}

	.tab-hint {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.7rem;
		color: var(--color-muted);
		padding: 0.5rem 0.875rem 0;
		margin: 0;
	}
	.hint-selected {
		color: var(--green-600);
		font-weight: 700;
	}
	.hint-submitted {
		color: #d97706;
		font-weight: 600;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 2.5rem 1rem;
		color: var(--color-muted);
		text-align: center;
	}
	.empty-state p {
		margin: 0;
		font-size: 0.8rem;
	}

	.course-grid-wrapper {
		overflow-x: auto;
		overflow-y: visible;
		-webkit-overflow-scrolling: touch;
		margin: 0;
		padding: 0.5rem 0.875rem 1rem;
	}
	.course-grid-wrapper::-webkit-scrollbar {
		height: 4px;
	}
	.course-grid-wrapper::-webkit-scrollbar-track {
		background: var(--color-border);
		border-radius: 4px;
	}
	.course-grid-wrapper::-webkit-scrollbar-thumb {
		background: var(--color-muted);
		border-radius: 4px;
	}

	.course-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 0.75rem;
		min-width: min-content;
	}

	@media (max-width: 640px) {
		.course-grid {
			grid-template-columns: repeat(2, minmax(200px, 280px));
			width: max-content;
		}
		.course-grid-wrapper {
			padding-bottom: 0.75rem;
		}
	}

	.course-card {
		background: var(--color-bg);
		border: 1.5px solid var(--color-border);
		border-radius: 0.75rem;
		padding: 0;
		display: flex;
		flex-direction: column;
		cursor: pointer;
		text-align: left;
		font-family: inherit;
		transition:
			border-color 0.15s,
			box-shadow 0.15s,
			background 0.12s;
		overflow: hidden;
	}
	.course-card:hover:not(:disabled):not(.selected) {
		border-color: var(--card-accent);
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.07);
	}
	.course-card.selected {
		border-color: var(--card-accent);
		border-width: 2px;
		background: color-mix(in srgb, var(--card-accent) 6%, var(--color-surface));
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--card-accent) 18%, transparent);
	}
	.course-card.over-limit {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.card-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.7rem 0.75rem 0.25rem;
	}
	.card-code {
		font-size: 0.72rem;
		font-weight: 800;
		color: var(--color-text);
		font-family: monospace;
		letter-spacing: 0.02em;
	}
	.card-cu {
		font-size: 0.72rem;
		font-weight: 800;
		color: var(--card-accent);
	}
	.cu-label {
		font-size: 0.55rem;
		font-weight: 600;
		opacity: 0.7;
		margin-left: 1px;
	}

	.card-title {
		font-size: 0.76rem;
		font-weight: 600;
		color: var(--color-text);
		line-height: 1.3;
		padding: 0 0.75rem;
	}

	.card-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		padding: 0.3rem 0.75rem;
	}
	.meta-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		font-size: 0.6rem;
		color: var(--color-muted);
		padding: 0.06rem 0.3rem;
		border-radius: 0.2rem;
		background: var(--color-surface);
	}
	.borrowed-chip {
		color: #6366f1 !important;
		background: rgba(99, 102, 241, 0.1) !important;
		font-weight: 700;
	}

	.card-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.3rem;
		font-size: 0.62rem;
		font-weight: 700;
		padding: 0.35rem 0.75rem;
		margin-top: auto;
		border-top: 1px solid var(--color-border);
		background: var(--color-bg);
		border-radius: 0 0 0.6rem 0.6rem;
		transition: background 0.15s;
	}
	.card-footer.footer-selected {
		background: color-mix(in srgb, var(--fc) 12%, transparent);
		border-top-color: color-mix(in srgb, var(--fc) 30%, transparent);
	}
	.footer-type {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		color: var(--card-accent);
	}
	.footer-add {
		color: var(--color-muted);
		font-weight: 500;
		font-size: 0.6rem;
	}
	.footer-sel {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		font-weight: 800;
		font-size: 0.62rem;
	}
	.footer-limit {
		color: var(--color-muted);
		font-weight: 400;
		font-size: 0.6rem;
	}
	.type-dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.pending-tray {
		background: var(--color-surface);
		border: 1.5px solid var(--green-600);
		border-radius: 1rem;
		overflow: hidden;
	}
	.tray-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.65rem 1rem;
		border-bottom: 1px solid var(--color-border);
		background: var(--green-soft);
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.tray-title {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--green-700);
	}
	.tray-count {
		min-width: 20px;
		height: 20px;
		border-radius: 999px;
		background: var(--green-600);
		color: #fff;
		font-size: 0.6rem;
		font-weight: 800;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0 5px;
	}
	.tray-clear {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.68rem;
		font-weight: 600;
		color: var(--color-muted);
		background: none;
		border: 1px solid var(--color-border);
		border-radius: 0.35rem;
		padding: 0.2rem 0.5rem;
		cursor: pointer;
		font-family: inherit;
		transition:
			color 0.15s,
			border-color 0.15s;
	}
	.tray-clear:hover {
		color: #dc2626;
		border-color: #dc2626;
	}

	.tray-list-wrapper {
		max-height: 300px;
		overflow-y: auto;
	}
	.tray-list {
		display: flex;
		flex-direction: column;
	}
	.tray-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.6rem 1rem;
		border-bottom: 1px solid var(--color-border);
		border-left: 3px solid transparent;
	}
	.tray-row:last-child {
		border-bottom: none;
	}
	.tray-left {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
		flex: 1;
	}
	.tray-code {
		font-size: 0.68rem;
		font-weight: 800;
		font-family: monospace;
		color: var(--color-text);
		white-space: nowrap;
	}
	.tray-title {
		font-size: 0.76rem;
		font-weight: 500;
		color: var(--color-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.tray-right {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex-shrink: 0;
	}
	.tray-cu {
		font-size: 0.65rem;
		font-weight: 700;
		color: var(--color-muted);
	}
	.tray-type {
		font-size: 0.58rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		padding: 0.1rem 0.4rem;
		border-radius: 0.2rem;
	}
	.tray-remove {
		width: 24px;
		height: 24px;
		border-radius: 0.3rem;
		border: 1px solid var(--color-border);
		background: none;
		color: var(--color-muted);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s;
	}
	.tray-remove:hover {
		color: #dc2626;
		border-color: #dc2626;
		background: rgba(220, 38, 38, 0.07);
	}

	.tray-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.8rem 1rem;
		border-top: 1px solid var(--color-border);
		flex-wrap: wrap;
	}
	.projected-credits {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.74rem;
		color: var(--color-muted);
	}

	.btn-add-selected {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.55rem 1.2rem;
		border-radius: 0.5rem;
		border: none;
		background: var(--green-600);
		color: #fff;
		font-size: 0.82rem;
		font-weight: 700;
		cursor: pointer;
		font-family: inherit;
		transition: background 0.15s;
	}
	.btn-add-selected:hover:not(:disabled) {
		background: var(--green-700);
	}
	.btn-add-selected:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.reg-section {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 1rem;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		max-height: calc(100vh - 200px);
	}

	.reg-section-head {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.8rem 1rem;
		background: none;
		border: none;
		border-bottom: 1px solid var(--color-border);
		cursor: pointer;
		font-family: inherit;
		transition: background 0.12s;
		flex-shrink: 0;
	}

	.reg-section-head:hover {
		background: var(--color-bg);
	}
	.reg-section-head h2 {
		margin: 0;
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--color-text);
		flex: 1;
		text-align: left;
	}
	.reg-pill {
		font-size: 0.65rem;
		font-weight: 700;
		color: var(--color-muted);
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		padding: 0.1rem 0.5rem;
		border-radius: 999px;
	}
	.tick-hint {
		font-size: 0.65rem;
		color: #d97706;
		font-style: italic;
	}
	.expand-icon {
		color: var(--color-muted);
		line-height: 0;
	}

	.reg-courses-scroll {
		flex: 1;
		overflow-y: auto;
		scrollbar-width: none;
		-ms-overflow-style: none;
	}
	.reg-courses-scroll::-webkit-scrollbar {
		display: none;
	}

	.submit-footer {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1rem;
		border-top: 1px solid var(--color-border);
		flex-shrink: 0;
		background: var(--color-surface);
	}

	.reg-empty {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 1.5rem 1rem;
		font-size: 0.8rem;
		color: var(--color-muted);
	}

	.reg-group {
		display: flex;
		flex-direction: column;
	}
	.reg-group + .reg-group {
		border-top: 1px solid var(--color-border);
	}

	.group-label {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.63rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0.5rem 1rem;
		background: var(--color-bg);
	}
	.g-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		flex-shrink: 0;
	}
	.g-count {
		margin-left: auto;
		font-size: 0.6rem;
		background: var(--color-border);
		color: var(--color-muted);
		padding: 0.05rem 0.4rem;
		border-radius: 999px;
	}

	.reg-row {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.7rem 1rem;
		border-bottom: 1px solid var(--color-border);
		transition: background 0.1s;
	}
	.reg-row:last-child {
		border-bottom: none;
	}
	.reg-row:hover {
		background: var(--color-bg);
	}
	.reg-row[role='button'] {
		cursor: pointer;
	}
	.row-drop-queued {
		background: rgba(220, 38, 38, 0.04) !important;
	}

	.row-checkbox {
		flex-shrink: 0;
		width: 18px;
		height: 18px;
		border-radius: 0.25rem;
		border: 1.5px solid var(--color-border);
		display: flex;
		align-items: center;
		justify-content: center;
		transition:
			border-color 0.15s,
			background 0.15s;
		background: var(--color-bg);
	}
	.row-checkbox.row-cb-active {
		border-color: #dc2626;
		background: rgba(220, 38, 38, 0.1);
	}
	.row-cb-inner {
		width: 8px;
		height: 8px;
		border-radius: 0.12rem;
		background: transparent;
		transition: background 0.12s;
	}
	.row-cb-active .row-cb-inner {
		background: #dc2626;
	}

	.reg-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex: 1;
		min-width: 0;
	}
	.reg-code {
		font-size: 0.67rem;
		font-weight: 800;
		font-family: monospace;
		white-space: nowrap;
		padding: 0.1rem 0.35rem;
		border-radius: 0.2rem;
		border: 1px solid;
		background: var(--color-bg);
		flex-shrink: 0;
	}
	.reg-text {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.reg-title {
		font-size: 0.79rem;
		font-weight: 600;
		color: var(--color-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.reg-dept {
		font-size: 0.63rem;
		color: var(--color-muted);
		margin-top: 0.05rem;
	}

	.reg-meta {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex-shrink: 0;
	}
	.reg-cu {
		font-size: 0.68rem;
		font-weight: 700;
		color: var(--color-muted);
	}
	.status-badge {
		font-size: 0.57rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		padding: 0.1rem 0.35rem;
		border-radius: 0.2rem;
	}

	.drop-btn {
		width: 26px;
		height: 26px;
		border-radius: 0.3rem;
		border: 1px solid var(--color-border);
		background: none;
		color: var(--color-muted);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s;
	}
	.drop-btn:hover {
		background: rgba(220, 38, 38, 0.08);
		color: #dc2626;
		border-color: rgba(220, 38, 38, 0.4);
	}
	.drop-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.submit-footer {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1rem;
		border-top: 1px solid var(--color-border);
	}
	.btn-submit {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.7rem 1.3rem;
		border-radius: 0.5rem;
		border: 1.5px solid var(--green-600);
		background: var(--green-soft);
		color: var(--green-700);
		font-size: 0.875rem;
		font-weight: 700;
		cursor: pointer;
		font-family: inherit;
		transition:
			background 0.15s,
			border-color 0.15s,
			color 0.15s;
		align-self: flex-start;
	}
	.btn-submit:hover:not(:disabled) {
		background: var(--green-600);
		color: #fff;
	}
	.btn-submit:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.submit-note {
		font-size: 0.7rem;
		color: var(--color-muted);
		margin: 0;
	}

	.update-panel {
		background: var(--color-surface);
		border: 2px solid #f59e0b;
		border-radius: 1rem;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
	}
	.update-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.5rem;
	}
	.update-header h3 {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 800;
		color: var(--color-text);
	}
	.update-sub {
		font-size: 0.73rem;
		color: var(--color-muted);
		margin: 0.15rem 0 0;
	}

	.update-group {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}
	.update-group-label {
		font-size: 0.62rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		margin-bottom: 0.1rem;
	}
	.remove-label {
		color: #dc2626;
	}
	.add-label {
		color: var(--green-600);
	}

	.update-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.45rem 0.7rem;
		border-radius: 0.35rem;
		font-size: 0.76rem;
	}
	.remove-row {
		background: rgba(220, 38, 38, 0.06);
		border: 1px solid rgba(220, 38, 38, 0.15);
	}
	.add-row {
		background: rgba(34, 197, 94, 0.05);
		border: 1px solid rgba(34, 197, 94, 0.2);
	}
	.update-title {
		flex: 1;
		color: var(--color-text);
		font-weight: 500;
	}

	.close-btn {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: 1px solid var(--color-border);
		background: none;
		color: var(--color-muted);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		transition: background 0.15s;
	}
	.close-btn:hover {
		background: var(--color-bg);
	}

	.btn-update {
		width: 100%;
		padding: 0.7rem;
		border-radius: 0.5rem;
		border: none;
		background: #f59e0b;
		color: #fff;
		font-size: 0.875rem;
		font-weight: 700;
		cursor: pointer;
		font-family: inherit;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		transition: background 0.15s;
	}
	.btn-update:hover:not(:disabled) {
		background: #d97706;
	}
	.btn-update:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.update-warn {
		font-size: 0.71rem;
		color: #92400e;
		margin: 0;
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}

	@media (max-width: 640px) {
		.page {
			padding: 0.75rem 1rem;
		}
		.topbar {
			flex-direction: column;
		}
		.topbar-center h1 {
			font-size: 1.1rem;
		}
		.topbar-right {
			justify-content: space-between;
			width: 100%;
		}
		.tray-footer {
			flex-direction: column;
			align-items: stretch;
		}
		.btn-add-selected {
			width: 100%;
			justify-content: center;
		}
		.btn-submit {
			width: 100%;
			justify-content: center;
		}
	}

	@media (max-width: 480px) {
		.course-grid {
			grid-template-columns: repeat(2, minmax(180px, 240px));
		}
	}
</style>