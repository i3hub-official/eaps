<!-- src/routes/(student)/student/courses/register/+page.svelte -->
<script lang="ts">
  import {
    BookOpen, Plus, Trash2, CheckCircle2, AlertCircle,
    GraduationCap, CreditCard, ArrowLeft, X,
    Building2, RotateCcw, Globe, Lock, Hash,
    ChevronRight
  } from 'lucide-svelte';
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  // ── Optimistic local state ─────────────────────────────────────────────
  type RegEntry = typeof data.existingRegistrations[number];
  type CourseEntry = typeof data.collegeCourses[number];

  let regs        = $state<RegEntry[]>(data.existingRegistrations);
  let colCourses  = $state<CourseEntry[]>(data.collegeCourses);
  let coCourses   = $state<CourseEntry[]>(data.carryOverCourses);
  let borCourses  = $state<CourseEntry[]>(data.borrowedCourses);
  let isLocked    = $state(data.meta.isLocked);
  let usedCredits = $state(data.meta.currentCredits);

  // Sync if server re-runs load (e.g. after invalidation)
  $effect(() => {
    regs        = data.existingRegistrations;
    colCourses  = data.collegeCourses;
    coCourses   = data.carryOverCourses;
    borCourses  = data.borrowedCourses;
    isLocked    = data.meta.isLocked;
    usedCredits = data.meta.currentCredits;
  });

  // ── Tab / search state ─────────────────────────────────────────────────
  let activeTab  = $state<'college' | 'carryover' | 'borrowed'>('college');
  let search     = $state('');
  let selectedId = $state<string | null>(
    data.collegeCourses.find(c => c.preselected)?.id ??
    data.carryOverCourses.find(c => c.preselected)?.id ??
    data.borrowedCourses.find(c => c.preselected)?.id ?? null,
  );
  let showDrawer  = $state(!!selectedId);
  let dropping    = $state<string | null>(null);
  let submitting  = $state(false);

  // ── Credit meter ──────────────────────────────────────────────────────
  const maxCredits  = data.meta.maxCredits;
  const creditPct   = $derived(Math.min((usedCredits / maxCredits) * 100, 100));
  const creditColor = $derived(
    creditPct > 90 ? '#dc2626' : creditPct > 75 ? '#f59e0b' : 'var(--green-600)'
  );
  const canAdd = (cu: number) => usedCredits + cu <= maxCredits;

  // ── Tab source list ───────────────────────────────────────────────────
  const q = $derived(search.trim().toLowerCase());
  function filterList(list: CourseEntry[]) {
    if (!q) return list;
    return list.filter(c =>
      c.code.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      c.department.toLowerCase().includes(q),
    );
  }

  const visibleCourses = $derived(
    activeTab === 'college'   ? filterList(colCourses)  :
    activeTab === 'carryover' ? filterList(coCourses)   :
                                filterList(borCourses),
  );

  const tabs = $derived([
    { key: 'college'   as const, label: 'My College', icon: Building2, count: colCourses.length  },
    { key: 'carryover' as const, label: 'Carry Over', icon: RotateCcw, count: coCourses.length, hidden: data.meta.studentLevel <= 100 },
    { key: 'borrowed'  as const, label: 'Borrowed',   icon: Globe,     count: borCourses.length  },
  ]);

  // ── Pending course for drawer ─────────────────────────────────────────
  const allAvailable = $derived([...colCourses, ...coCourses, ...borCourses]);
  const pendingCourse = $derived(allAvailable.find(c => c.id === selectedId) ?? null);

  // Registration type driven by active tab — used in grid AND drawer.
  // Cannot use {@const} outside {#if}/{#each}, so keep it as $derived.
  const drawerType = $derived<'normal' | 'carry_over' | 'borrowed'>(
    activeTab === 'carryover' ? 'carry_over' :
    activeTab === 'borrowed'  ? 'borrowed'   : 'normal',
  );

  function openDrawer(id: string) {
    selectedId = id;
    showDrawer = true;
    search     = '';
  }
  function closeDrawer() {
    showDrawer = false;
    selectedId = null;
  }

  // ── Optimistic register ───────────────────────────────────────────────
  function optimisticAdd(course: CourseEntry, type: 'normal' | 'carry_over' | 'borrowed') {
    const status = type === 'borrowed' ? 'approved' : type === 'normal' ? 'approved' : 'pending';
    // Immediately add to registered list
    regs = [...regs, {
      id:               'optimistic-' + course.id,
      courseId:         course.id,
      courseCode:       course.code,
      courseTitle:      course.title,
      creditUnits:      course.creditUnits,
      level:            course.level,
      department:       course.department,
      registrationType: type,
      status,
      registeredAt:     new Date(),
    }];
    usedCredits += course.creditUnits;
    // Remove from available list
    if (type === 'normal')      colCourses = colCourses.filter(c => c.id !== course.id);
    if (type === 'carry_over')  coCourses  = coCourses.filter(c => c.id !== course.id);
    if (type === 'borrowed')    borCourses = borCourses.filter(c => c.id !== course.id);
    // Lock if normal+approved
    if (type === 'normal') isLocked = true;
  }

  function revertAdd(course: CourseEntry, type: 'normal' | 'carry_over' | 'borrowed') {
    regs = regs.filter(r => r.courseId !== course.id);
    usedCredits -= course.creditUnits;
    if (type === 'normal')      colCourses = [...colCourses, course].sort((a,b)=>a.code.localeCompare(b.code));
    if (type === 'carry_over')  coCourses  = [...coCourses,  course].sort((a,b)=>a.code.localeCompare(b.code));
    if (type === 'borrowed')    borCourses = [...borCourses, course].sort((a,b)=>a.code.localeCompare(b.code));
    if (type === 'normal') isLocked = false;
  }

  // ── Helpers ───────────────────────────────────────────────────────────
  function typeLabel(t: string) {
    return t === 'carry_over' ? 'Carry Over' : t === 'borrowed' ? 'Borrowed' : 'Normal';
  }
  function typeColor(t: string) {
    return t === 'carry_over' ? '#f59e0b' : t === 'borrowed' ? '#3b82f6' : 'var(--green-600)';
  }
  function statusBadge(s: string) {
    switch (s) {
      case 'approved': return { text: 'Approved', cls: 'badge-green' };
      case 'pending':  return { text: 'Pending',  cls: 'badge-amber' };
      case 'rejected': return { text: 'Rejected', cls: 'badge-red'   };
      default:         return { text: s,           cls: 'badge-gray'  };
    }
  }

  // Group registered courses by type for display
  const normalRegs    = $derived(regs.filter(r => r.registrationType === 'normal'));
  const carryOverRegs = $derived(regs.filter(r => r.registrationType === 'carry_over'));
  const borrowedRegs  = $derived(regs.filter(r => r.registrationType === 'borrowed'));
</script>

<div class="page">

  <!-- ── Back + header ──────────────────────────────────────────────────── -->
  <div class="page-header">
    <a href="/student/courses" class="back-link">
      <ArrowLeft size={14} /> My Courses
    </a>
    <div class="header-row">
      <div>
        <h1>Course Registration</h1>
        <p class="page-sub">{data.meta.session} · Semester {data.meta.semester} · {data.meta.studentLevel} Level</p>
      </div>
      <!-- Credit pill -->
      <div class="credit-pill" style="--cc:{creditColor}">
        <CreditCard size={13} />
        <span class="credit-used" style="color:{creditColor}">{usedCredits}</span>
        <span class="credit-sep">/</span>
        <span class="credit-max">{maxCredits} CU</span>
      </div>
    </div>

    <!-- Progress bar always visible -->
    <div class="credit-track">
      <div class="credit-fill" style="width:{creditPct}%; background:{creditColor}"></div>
    </div>
    {#if creditPct >= 100}
      <p class="credit-warn"><AlertCircle size={12} /> Credit limit reached — drop a course to add more.</p>
    {/if}
  </div>

  <!-- ── Lock banner ────────────────────────────────────────────────────── -->
  {#if isLocked}
    <div class="lock-banner">
      <Lock size={15} />
      <div>
        <strong>Registration locked.</strong>
        Your course registration has been submitted. Contact your academic office if you need to make changes.
      </div>
    </div>
  {/if}

  <!-- ── Server error ───────────────────────────────────────────────────── -->
  {#if form?.error}
    <div class="form-error-box">
      <AlertCircle size={14} />
      {form.error}
    </div>
  {/if}

  <!-- ── Registered courses ─────────────────────────────────────────────── -->
  {#if regs.length > 0}
    <section class="reg-section">
      <div class="section-head">
        <CheckCircle2 size={14} />
        <h2>Registered Courses</h2>
        <span class="section-count">{regs.length} course{regs.length !== 1 ? 's' : ''}</span>
      </div>

      <!-- Normal -->
      {#if normalRegs.length > 0}
        <div class="reg-group">
          <div class="reg-group-label" style="color: var(--green-600)">
            <span class="type-dot" style="background: var(--green-600)"></span>
            Normal Courses
          </div>
          {#each normalRegs as reg (reg.id)}
            {@const sb = statusBadge(reg.status)}
            <div class="reg-row">
              <div class="reg-left">
                <span class="reg-code">{reg.courseCode}</span>
                <div class="reg-body">
                  <span class="reg-title">{reg.courseTitle}</span>
                  <span class="reg-dept">{reg.department}</span>
                </div>
              </div>
              <div class="reg-right">
                <span class="reg-cu">{reg.creditUnits} CU</span>
                <span class="badge {sb.cls}">{sb.text}</span>
                {#if !isLocked}
                  <form method="POST" action="?/drop" use:enhance={() => {
                    dropping = reg.id;
                    const snapshot = [...regs];
                    regs = regs.filter(r => r.id !== reg.id);
                    usedCredits -= reg.creditUnits;
                    return async ({ result, update }) => {
                      dropping = null;
                      if (result.type === 'failure') {
                        regs = snapshot;
                        usedCredits += reg.creditUnits;
                      }
                      await update({ reset: false });
                    };
                  }}>
                    <input type="hidden" name="registrationId" value={reg.id} />
                    <button class="drop-btn" disabled={dropping === reg.id} aria-label="Drop">
                      <Trash2 size={12} />
                    </button>
                  </form>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Carry-over -->
      {#if carryOverRegs.length > 0}
        <div class="reg-group">
          <div class="reg-group-label" style="color: #f59e0b">
            <span class="type-dot" style="background: #f59e0b"></span>
            Carry-Over Courses
          </div>
          {#each carryOverRegs as reg (reg.id)}
            {@const sb = statusBadge(reg.status)}
            <div class="reg-row">
              <div class="reg-left">
                <span class="reg-code">{reg.courseCode}</span>
                <div class="reg-body">
                  <span class="reg-title">{reg.courseTitle}</span>
                  <span class="reg-dept">{reg.department} · {reg.level} Level</span>
                </div>
              </div>
              <div class="reg-right">
                <span class="reg-cu">{reg.creditUnits} CU</span>
                <span class="badge {sb.cls}">{sb.text}</span>
                {#if !isLocked && reg.status !== 'approved'}
                  <form method="POST" action="?/drop" use:enhance={() => {
                    dropping = reg.id;
                    const snapshot = [...regs];
                    regs = regs.filter(r => r.id !== reg.id);
                    usedCredits -= reg.creditUnits;
                    return async ({ result, update }) => {
                      dropping = null;
                      if (result.type === 'failure') { regs = snapshot; usedCredits += reg.creditUnits; }
                      await update({ reset: false });
                    };
                  }}>
                    <input type="hidden" name="registrationId" value={reg.id} />
                    <button class="drop-btn" disabled={dropping === reg.id} aria-label="Drop">
                      <Trash2 size={12} />
                    </button>
                  </form>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Borrowed -->
      {#if borrowedRegs.length > 0}
        <div class="reg-group">
          <div class="reg-group-label" style="color: #3b82f6">
            <span class="type-dot" style="background: #3b82f6"></span>
            Borrowed Courses
          </div>
          {#each borrowedRegs as reg (reg.id)}
            {@const sb = statusBadge(reg.status)}
            <div class="reg-row">
              <div class="reg-left">
                <span class="reg-code">{reg.courseCode}</span>
                <div class="reg-body">
                  <span class="reg-title">{reg.courseTitle}</span>
                  <span class="reg-dept">{reg.department}</span>
                </div>
              </div>
              <div class="reg-right">
                <span class="reg-cu">{reg.creditUnits} CU</span>
                <span class="badge {sb.cls}">{sb.text}</span>
                {#if !isLocked}
                  <form method="POST" action="?/drop" use:enhance={() => {
                    dropping = reg.id;
                    const snapshot = [...regs];
                    regs = regs.filter(r => r.id !== reg.id);
                    usedCredits -= reg.creditUnits;
                    return async ({ result, update }) => {
                      dropping = null;
                      if (result.type === 'failure') { regs = snapshot; usedCredits += reg.creditUnits; }
                      await update({ reset: false });
                    };
                  }}>
                    <input type="hidden" name="registrationId" value={reg.id} />
                    <button class="drop-btn" disabled={dropping === reg.id} aria-label="Drop">
                      <Trash2 size={12} />
                    </button>
                  </form>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}

    </section>
  {:else}
    <div class="reg-empty">
      <Hash size={20} strokeWidth={1.5} />
      <p>No courses registered yet. Pick from the list below.</p>
    </div>
  {/if}

  <!-- ── Course discovery (hidden when locked) ──────────────────────────── -->
  {#if !isLocked}
    <section class="discover-section">

      <!-- Tab bar -->
      <div class="tab-bar">
        {#each tabs as tab}
          {#if !tab.hidden}
            <button
              class="tab-btn"
              class:active={activeTab === tab.key}
              onclick={() => { activeTab = tab.key; search = ''; }}
            >
              <svelte:component this={tab.icon} size={13} />
              {tab.label}
              <span class="tab-count">{tab.count}</span>
            </button>
          {/if}
        {/each}
      </div>

      <p class="tab-desc">
        {#if activeTab === 'college'}
          All departments within <strong>{data.meta.studentCollege ?? 'your college'}</strong> · {data.meta.studentLevel} Level
        {:else if activeTab === 'carryover'}
          Courses below your level from your college — registered as carry-over (pending approval).
        {:else}
          Same-level courses from other colleges — auto-approved on registration.
        {/if}
      </p>

      <!-- Search -->
      <div class="tab-search">
        <input
          type="text"
          placeholder="Search by code, title or department…"
          bind:value={search}
        />
        {#if search}
          <button class="clear-btn" onclick={() => (search = '')}>×</button>
        {/if}
      </div>

      <!-- Course cards -->
      {#if visibleCourses.length === 0}
        <div class="tab-empty">
          <BookOpen size={26} strokeWidth={1.5} />
          <p>
            {search ? 'No courses match your search.' :
             activeTab === 'carryover' ? 'No carry-over courses available.' :
             'All available courses have been registered.'}
          </p>
        </div>
      {:else}
        <div class="course-grid">
          {#each visibleCourses as course (course.id)}
            {@const over = !canAdd(course.creditUnits)}
            {@const type = activeTab === 'carryover' ? 'carry_over' : activeTab === 'borrowed' ? 'borrowed' : 'normal'}
            <button
              class="course-card"
              class:over-limit={over}
              class:is-selected={selectedId === course.id}
              disabled={over}
              onclick={() => openDrawer(course.id)}
            >
              <div class="card-header">
                <span class="card-code">{course.code}</span>
                <span class="card-cu">{course.creditUnits} CU</span>
              </div>
              <span class="card-title">{course.title}</span>
              <div class="card-chips">
                <span><GraduationCap size={10} /> {course.level}L</span>
                <span><Building2 size={10} /> {course.department}</span>
                {#if activeTab === 'borrowed'}
                  <span class="chip-college">{course.collegeAbbr}</span>
                {/if}
              </div>
              <div class="card-cta">
                {#if over}
                  <span class="cta-text muted">Limit reached</span>
                {:else}
                  <span class="cta-text"><Plus size={12} /> Add</span>
                  <ChevronRight size={13} />
                {/if}
              </div>
            </button>
          {/each}
        </div>
      {/if}
    </section>
  {/if}

  <!-- ── Confirm drawer ─────────────────────────────────────────────────── -->
  {#if showDrawer && pendingCourse}
    <div
      class="drawer-backdrop"
      onclick={closeDrawer}
      role="presentation"
    ></div>

    <div class="drawer">
      <div class="drawer-head">
        <div>
          <p class="drawer-label">Confirm Registration</p>
          <h3 class="drawer-code">{pendingCourse.code}</h3>
          <p class="drawer-title">{pendingCourse.title}</p>
        </div>
        <button class="close-btn" onclick={closeDrawer} aria-label="Close">
          <X size={14} />
        </button>
      </div>

      <div class="drawer-chips">
        <span><GraduationCap size={11} /> Level {pendingCourse.level}</span>
        <span><Building2 size={11} /> {pendingCourse.department}</span>
        <span><CreditCard size={11} /> {pendingCourse.creditUnits} Credit Units</span>
        <span
          class="type-chip-inline"
          style="color:{typeColor(drawerType)}; background:{typeColor(drawerType)}15; border-color:{typeColor(drawerType)}40"
        >
          <span class="type-dot" style="background:{typeColor(drawerType)}"></span>
          {typeLabel(drawerType)}
          {#if drawerType !== 'normal'}<span class="chip-note">· pending approval</span>{/if}
          {#if drawerType === 'borrowed'}<span class="chip-note">· auto-approved</span>{/if}
        </span>
      </div>

      <form
        method="POST"
        action="?/register"
        use:enhance={() => {
          submitting = true;
          const course = pendingCourse!;
          closeDrawer();
          optimisticAdd(course, drawerType);
          return async ({ result, update }) => {
            submitting = false;
            if (result.type === 'failure') {
              revertAdd(course, drawerType);
            }
            await update({ reset: false });
          };
        }}
      >
        <input type="hidden" name="courseId" value={pendingCourse.id} />
        <input type="hidden" name="type"     value={drawerType} />
        <button type="submit" class="confirm-btn" disabled={submitting || !canAdd(pendingCourse.creditUnits)}>
          <CheckCircle2 size={14} />
          Register {pendingCourse.code}
        </button>
      </form>
    </div>
  {/if}

</div>

<style>
  .page { display: flex; flex-direction: column; gap: 1rem; padding-bottom: 6rem; }

  /* ── Header ───────────────────────────────────────────────────────────── */
  .back-link {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-size: 0.75rem; color: var(--color-muted); text-decoration: none;
    margin-bottom: 0.4rem; transition: color 0.15s;
  }
  .back-link:hover { color: var(--green-600); }

  .page-header { display: flex; flex-direction: column; gap: 0.35rem; }

  .header-row {
    display: flex; align-items: flex-start;
    justify-content: space-between; gap: 1rem;
  }
  .page-header h1 { font-size: 1.2rem; font-weight: 800; color: var(--color-text); margin: 0; }
  .page-sub { font-size: 0.76rem; color: var(--color-muted); margin: 0.1rem 0 0; }

  .credit-pill {
    display: inline-flex; align-items: center; gap: 0.3rem;
    padding: 0.4rem 0.75rem; border-radius: 999px;
    border: 1px solid var(--color-border);
    background: var(--color-surface); flex-shrink: 0;
    color: var(--color-muted); font-size: 0.78rem;
  }
  .credit-used { font-weight: 800; font-size: 0.9rem; }
  .credit-sep  { opacity: 0.4; }
  .credit-max  { font-size: 0.72rem; }

  .credit-track {
    height: 4px; border-radius: 2px;
    background: var(--color-border); overflow: hidden;
  }
  .credit-fill { height: 100%; border-radius: 2px; transition: width 0.35s ease; }
  .credit-warn {
    font-size: 0.71rem; color: #dc2626;
    display: flex; align-items: center; gap: 0.3rem; margin: 0;
  }

  /* ── Lock banner ──────────────────────────────────────────────────────── */
  .lock-banner {
    display: flex; align-items: flex-start; gap: 0.625rem;
    padding: 0.875rem 1rem; border-radius: 0.625rem;
    background: rgba(245,158,11,.08); border: 1px solid rgba(245,158,11,.3);
    font-size: 0.8rem; color: #92400e;
  }
  .lock-banner strong { display: block; margin-bottom: 0.1rem; }

  /* ── Error box ────────────────────────────────────────────────────────── */
  .form-error-box {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.75rem 1rem; border-radius: 0.5rem;
    background: rgba(220,38,38,.08); border: 1px solid rgba(220,38,38,.25);
    font-size: 0.8rem; color: #dc2626;
  }

  /* ── Registered section ───────────────────────────────────────────────── */
  .reg-section {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: var(--radius-card); overflow: hidden;
  }
  .section-head {
    display: flex; align-items: center; gap: 0.4rem;
    padding: 0.75rem 1rem; border-bottom: 1px solid var(--color-border);
  }
  .section-head h2 { margin: 0; font-size: 0.85rem; font-weight: 700; color: var(--color-text); flex: 1; }
  .section-count {
    font-size: 0.7rem; color: var(--color-muted); font-weight: 600;
    background: var(--color-bg); border: 1px solid var(--color-border);
    padding: 0.1rem 0.45rem; border-radius: 999px;
  }

  .reg-group { display: flex; flex-direction: column; }
  .reg-group + .reg-group { border-top: 1px solid var(--color-border); }

  .reg-group-label {
    display: flex; align-items: center; gap: 0.4rem;
    font-size: 0.68rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.04em; padding: 0.5rem 1rem;
    background: var(--color-bg);
  }
  .type-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

  .reg-row {
    display: flex; align-items: center; justify-content: space-between;
    gap: 0.75rem; padding: 0.65rem 1rem;
    border-bottom: 1px solid var(--color-border); transition: background 0.1s;
  }
  .reg-row:last-child { border-bottom: none; }
  .reg-row:hover { background: var(--color-bg); }

  .reg-left { display: flex; align-items: center; gap: 0.625rem; min-width: 0; flex: 1; }
  .reg-code {
    font-size: 0.72rem; font-weight: 800; color: var(--color-text);
    font-family: monospace; white-space: nowrap;
    background: var(--color-bg); border: 1px solid var(--color-border);
    padding: 0.1rem 0.35rem; border-radius: 0.25rem;
  }
  .reg-body { display: flex; flex-direction: column; min-width: 0; }
  .reg-title { font-size: 0.82rem; font-weight: 600; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .reg-dept  { font-size: 0.67rem; color: var(--color-muted); margin-top: 0.05rem; }

  .reg-right { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }
  .reg-cu    { font-size: 0.7rem; font-weight: 700; color: var(--color-muted); }

  .drop-btn {
    width: 26px; height: 26px; border-radius: 0.3rem;
    border: 1px solid var(--color-border); background: none;
    color: var(--color-muted); cursor: pointer;
    display: flex; align-items: center; justify-content: center; transition: all 0.15s;
  }
  .drop-btn:hover { background: rgba(220,38,38,.08); color: #dc2626; border-color: #dc2626; }
  .drop-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .reg-empty {
    display: flex; align-items: center; gap: 0.625rem;
    padding: 1rem; border-radius: var(--radius-card);
    background: var(--color-surface); border: 1px solid var(--color-border);
    font-size: 0.8rem; color: var(--color-muted);
  }

  /* ── Discover section ─────────────────────────────────────────────────── */
  .discover-section {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: var(--radius-card); overflow: hidden;
    display: flex; flex-direction: column;
  }

  .tab-bar {
    display: flex; border-bottom: 1px solid var(--color-border);
    background: var(--color-bg); padding: 0 0.5rem;
    overflow-x: auto; scrollbar-width: none;
  }
  .tab-bar::-webkit-scrollbar { display: none; }

  .tab-btn {
    display: inline-flex; align-items: center; gap: 0.35rem;
    padding: 0.65rem 0.875rem; border: none;
    border-bottom: 2px solid transparent;
    background: none; font-size: 0.78rem; font-weight: 600;
    color: var(--color-muted); cursor: pointer; font-family: inherit;
    white-space: nowrap; transition: color 0.15s, border-color 0.15s;
    margin-bottom: -1px;
  }
  .tab-btn:hover  { color: var(--color-text); }
  .tab-btn.active { color: var(--green-600); border-bottom-color: var(--green-600); }

  .tab-count {
    min-width: 18px; height: 18px; border-radius: 999px;
    background: var(--color-border); color: var(--color-muted);
    font-size: 0.6rem; font-weight: 700;
    display: inline-flex; align-items: center; justify-content: center; padding: 0 4px;
  }
  .tab-btn.active .tab-count { background: var(--green-soft); color: var(--green-700); }

  .tab-desc {
    font-size: 0.74rem; color: var(--color-muted);
    padding: 0.625rem 1rem 0; margin: 0;
  }

  .tab-search {
    display: flex; align-items: center;
    margin: 0.625rem 0.75rem;
    padding: 0.4rem 0.625rem; border-radius: 0.45rem;
    background: var(--color-bg); border: 1px solid var(--color-border);
  }
  .tab-search input {
    flex: 1; border: none; background: none; outline: none;
    font-size: 0.78rem; color: var(--color-text); font-family: inherit;
  }
  .tab-search input::placeholder { color: var(--color-muted); }
  .clear-btn {
    width: 16px; height: 16px; border-radius: 50%;
    border: none; background: var(--color-border); color: var(--color-muted);
    font-size: 0.65rem; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
  }

  .tab-empty {
    display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
    padding: 2.5rem 1rem; color: var(--color-muted); text-align: center;
  }
  .tab-empty p { margin: 0; font-size: 0.78rem; }

  /* Course cards */
  .course-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 0.5rem; padding: 0 0.75rem 0.75rem;
  }

  .course-card {
    background: var(--color-bg); border: 1px solid var(--color-border);
    border-radius: 0.625rem; padding: 0.875rem;
    display: flex; flex-direction: column; gap: 0.4rem;
    cursor: pointer; text-align: left; font-family: inherit;
    transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
  }
  .course-card:hover:not(:disabled) {
    border-color: var(--green-600);
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    background: var(--color-surface);
  }
  .course-card.is-selected {
    border-color: var(--green-600);
    background: var(--green-soft);
  }
  .course-card.over-limit { opacity: 0.5; cursor: not-allowed; }

  .card-header { display: flex; align-items: center; justify-content: space-between; }
  .card-code { font-size: 0.78rem; font-weight: 800; color: var(--color-text); font-family: monospace; }
  .card-cu   { font-size: 0.65rem; font-weight: 700; color: var(--color-muted); }
  .card-title { font-size: 0.8rem; font-weight: 600; color: var(--color-text); line-height: 1.3; }

  .card-chips { display: flex; flex-wrap: wrap; gap: 0.3rem; }
  .card-chips span {
    display: inline-flex; align-items: center; gap: 0.2rem;
    font-size: 0.62rem; color: var(--color-muted);
    padding: 0.1rem 0.3rem; border-radius: 0.2rem;
    background: var(--color-surface);
  }
  .chip-college { color: #3b82f6 !important; background: rgba(59,130,246,.1) !important; font-weight: 700; }

  .card-cta {
    display: flex; align-items: center; justify-content: space-between;
    margin-top: 0.2rem; font-size: 0.72rem; font-weight: 700;
    color: var(--green-600);
  }
  .cta-text { display: inline-flex; align-items: center; gap: 0.2rem; }
  .cta-text.muted { color: var(--color-muted); font-weight: 400; }

  /* ── Drawer ───────────────────────────────────────────────────────────── */
  .drawer-backdrop { display: none; }

  .drawer {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: var(--radius-card); padding: 1.25rem;
    display: flex; flex-direction: column; gap: 0.875rem;
  }

  .drawer-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.5rem; }
  .drawer-label { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-muted); margin: 0 0 0.2rem; }
  .drawer-code  { font-size: 1rem; font-weight: 800; color: var(--color-text); margin: 0; font-family: monospace; }
  .drawer-title { font-size: 0.82rem; color: var(--color-muted); margin: 0.2rem 0 0; }

  .close-btn {
    width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0;
    border: 1px solid var(--color-border); background: none;
    color: var(--color-muted); cursor: pointer;
    display: flex; align-items: center; justify-content: center; transition: all 0.15s;
  }
  .close-btn:hover { background: var(--color-bg); }

  .drawer-chips { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; }
  .drawer-chips span {
    display: inline-flex; align-items: center; gap: 0.25rem;
    font-size: 0.72rem; color: var(--color-muted);
    padding: 0.2rem 0.5rem; border-radius: 0.3rem;
    background: var(--color-bg); border: 1px solid var(--color-border);
  }
  .type-chip-inline {
    font-weight: 700; border: 1px solid !important;
  }
  .chip-note { font-weight: 400; opacity: 0.75; font-size: 0.65rem; }

  .confirm-btn {
    width: 100%; padding: 0.7rem;
    border-radius: 0.5rem; border: none;
    background: var(--green-600); color: #fff;
    font-size: 0.875rem; font-weight: 700; cursor: pointer;
    font-family: inherit;
    display: flex; align-items: center; justify-content: center; gap: 0.4rem;
    transition: background 0.15s;
  }
  .confirm-btn:hover:not(:disabled) { background: var(--green-700); }
  .confirm-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  /* ── Badges ───────────────────────────────────────────────────────────── */
  .badge {
    display: inline-flex; padding: 0.1rem 0.35rem; border-radius: 0.2rem;
    font-size: 0.6rem; font-weight: 800; text-transform: uppercase; white-space: nowrap;
  }
  .badge-green { background: var(--green-soft);        color: var(--green-700); }
  .badge-amber { background: rgba(245,158,11,.12);     color: #d97706; }
  .badge-red   { background: rgba(220,38,38,.1);       color: #dc2626; }
  .badge-gray  { background: var(--color-bg);          color: var(--color-muted); border: 1px solid var(--color-border); }

  /* ── Mobile ───────────────────────────────────────────────────────────── */
  @media (max-width: 640px) {
    .page { padding-bottom: 0; }
    .course-grid { grid-template-columns: 1fr 1fr; }

    .drawer-backdrop {
      display: block; position: fixed; inset: 0;
      background: rgba(0,0,0,0.4); z-index: 50;
    }
    .drawer {
      position: fixed; bottom: 0; left: 0; right: 0;
      border-radius: 1.25rem 1.25rem 0 0; border-bottom: none;
      z-index: 60; animation: slide-up 0.2s cubic-bezier(0.32,0.72,0,1);
      max-height: 85vh; overflow-y: auto;
    }
    @keyframes slide-up {
      from { transform: translateY(100%); }
      to   { transform: translateY(0); }
    }
  }
</style>