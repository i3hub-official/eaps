<!-- src/routes/admin/manage/course-registrations/+page.svelte -->
<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import {
    BookOpen, Plus, Trash2, Pencil, X, ChevronRight,
    GraduationCap, Building2, Hash, Search,
    RefreshCw, ArrowRightLeft, CheckCircle2, AlertCircle,
    LoaderCircle, Filter, Lock, Unlock,
  } from '@lucide/svelte';
  import { fly, slide, fade } from 'svelte/transition';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  // ── UI state ──────────────────────────────────────────────────────────────
  let showCreateModal = $state(false);
  let editingReg = $state<(typeof data.registrations)[0] | null>(null);
  let deletingId = $state<string | null>(null);
  let submitting = $state(false);
  let unlocking = $state(false);
  let unlockReason = $state('');
  let showUnlockConfirm = $state(false);
  let searchQuery = $state('');
  let regTypeFilter = $state('');

  // ── Student drawer state ──────────────────────────────────────────────────
  let drawerOpen = $state(!!data.selectedStudentId);
  let drawerStudentId = $state<string | null>(data.selectedStudentId);
  let drawerTab = $state<'registered' | 'available'>('registered');
  let availableTab = $state<'normal' | 'carryOver' | 'borrowed'>('normal');
  let registeringCourseId = $state<string | null>(null);

  const drawerStudent = $derived(
    drawerStudentId ? data.students.find((s) => s.id === drawerStudentId) : null
  );

  const drawerRegistrations = $derived(
    drawerStudentId
      ? data.registrations.filter((r) => r.studentId === drawerStudentId)
      : []
  );

  // ── Table filters ─────────────────────────────────────────────────────────
  const filtered = $derived(() => {
    let rows = data.registrations;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (r) =>
          r.student.fullName.toLowerCase().includes(q) ||
          r.student.matricNumber?.toLowerCase().includes(q) ||
          r.course.code.toLowerCase().includes(q) ||
          r.course.title.toLowerCase().includes(q)
      );
    }
    if (regTypeFilter) rows = rows.filter((r) => r.registrationType === regTypeFilter);
    return rows;
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const currentSession = data.activeSemester.session;
  const currentSemester = data.activeSemester.semester;

  function openDrawer(studentId: string) {
    drawerStudentId = studentId;
    drawerOpen = true;
    drawerTab = 'registered';
    showUnlockConfirm = false;
    goto(`?studentId=${studentId}`, { replaceState: true, noScroll: true });
  }

  function closeDrawer() {
    drawerOpen = false;
    drawerStudentId = null;
    showUnlockConfirm = false;
    goto('?', { replaceState: true, noScroll: true });
  }

  function getTypeColor(type: string) {
    if (type === 'carry_over') return '#f59e0b';
    if (type === 'borrowed') return '#8b5cf6';
    return '#3b82f6';
  }

  function getTypeLabel(type: string) {
    if (type === 'carry_over') return 'Carry-over';
    if (type === 'borrowed') return 'Borrowed';
    return 'Normal';
  }

  function phaseColor(phase: string | null) {
    if (phase === 'locked') return '#ef4444';
    if (phase === 'submitted') return '#f59e0b';
    return '#16a34a';
  }

  function phaseLabel(phase: string | null) {
    if (phase === 'locked') return 'Locked';
    if (phase === 'submitted') return 'Submitted · 1 update left';
    return 'Draft';
  }
</script>

<svelte:head><title>Course Registrations — Admin</title></svelte:head>

<!-- Toast -->
{#if form?.message || form?.error}
  <div
    class="toast"
    class:success={form?.success}
    class:error={!form?.success}
    transition:fly={{ y: -12, duration: 250 }}
  >
    {#if form?.success}<CheckCircle2 size={16} />{:else}<AlertCircle size={16} />{/if}
    <span>{form?.message ?? form?.error}</span>
  </div>
{/if}

<div class="admin-page" class:drawer-open={drawerOpen}>
  <!-- ── Page header ────────────────────────────────────────────────────── -->
  <header class="page-head">
    <div class="head-left">
      <BookOpen size={22} class="head-icon" />
      <div>
        <h1>Course Registrations</h1>
        <p class="sub">
          {data.registrations.length} registrations · {data.students.length} students ·
          Active: {currentSession} Sem {currentSemester}
        </p>
      </div>
    </div>
    <button class="btn-primary" onclick={() => (showCreateModal = true)}>
      <Plus size={16} /> Add Registration
    </button>
  </header>

  <!-- ── Filters ───────────────────────────────────────────────────────── -->
  <div class="filters-row">
    <div class="search-wrap">
      <Search size={15} class="search-icon" />
      <input
        class="search-input"
        placeholder="Search student, matric, course..."
        bind:value={searchQuery}
      />
    </div>
    <div class="filter-select-wrap">
      <Filter size={14} />
      <select bind:value={regTypeFilter} class="filter-select">
        <option value="">All types</option>
        <option value="normal">Normal</option>
        <option value="carry_over">Carry-over</option>
        <option value="borrowed">Borrowed</option>
      </select>
    </div>
    <span class="result-count">{filtered().length} results</span>
  </div>

  <!-- ── Table ─────────────────────────────────────────────────────────── -->
  <div class="table-wrap">
    <table class="reg-table">
      <thead>
        <tr>
          <th>Student</th>
          <th>Course</th>
          <th>Session / Sem</th>
          <th>Type</th>
          <th>Level</th>
          <th>Date</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each filtered() as reg (reg.id)}
          <tr>
            <td>
              <button class="student-cell" onclick={() => openDrawer(reg.student.id)}>
                <div class="student-avatar">
                  {reg.student.fullName.charAt(0)}
                </div>
                <div>
                  <span class="student-name">{reg.student.fullName}</span>
                  <span class="matric">{reg.student.matricNumber ?? '—'}</span>
                </div>
                <ChevronRight size={14} class="chevron" />
              </button>
            </td>
            <td>
              <div class="course-cell">
                <span class="course-code">{reg.course.code}</span>
                <span class="course-title">{reg.course.title}</span>
                <span class="dept-tag">{reg.course.department.code}</span>
              </div>
            </td>
            <td>
              <span class="session-tag">{reg.session}</span>
              <span class="sem-tag">Sem {reg.semester}</span>
            </td>
            <td>
              <span class="type-badge" style="background:{getTypeColor(reg.registrationType)}18;color:{getTypeColor(reg.registrationType)}">
                {getTypeLabel(reg.registrationType)}
              </span>
            </td>
            <td>
              <span class="level-tag">{reg.level?.name ?? reg.student.level?.name ?? '—'}</span>
            </td>
            <td class="date-cell">
              {new Date(reg.createdAt).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: '2-digit' })}
            </td>
            <td>
              <div class="row-actions">
                <button class="icon-btn edit" title="Edit" onclick={() => (editingReg = reg)}>
                  <Pencil size={14} />
                </button>
                <form
                  method="POST"
                  action="?/delete"
                  use:enhance={() => {
                    deletingId = reg.id;
                    return async ({ update }) => { deletingId = null; update(); };
                  }}
                >
                  <input type="hidden" name="id" value={reg.id} />
                  <button type="submit" class="icon-btn delete" title="Delete" disabled={deletingId === reg.id}>
                    {#if deletingId === reg.id}
                      <LoaderCircle size={14} class="spin" />
                    {:else}
                      <Trash2 size={14} />
                    {/if}
                  </button>
                </form>
              </div>
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="7" class="empty-row">No registrations found.</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<!-- ── Student Drawer ──────────────────────────────────────────────────────── -->
{#if drawerOpen && drawerStudent}
  <!-- backdrop -->
  <button class="drawer-backdrop" onclick={closeDrawer} aria-label="Close drawer" transition:fade={{ duration: 200 }}></button>

  <aside class="student-drawer" transition:fly={{ x: 420, duration: 280 }}>
    <!-- Drawer header -->
    <div class="drawer-head">
      <div class="drawer-avatar">{drawerStudent.fullName.charAt(0)}</div>
      <div class="drawer-student-info">
        <h2>{drawerStudent.fullName}</h2>
        <p>{drawerStudent.matricNumber ?? drawerStudent.email}</p>
        <div class="drawer-badges">
          {#if drawerStudent.department}
            <span class="dbadge dept"><Building2 size={11} /> {drawerStudent.department.code}</span>
          {/if}
          {#if drawerStudent.level}
            <span class="dbadge lvl"><GraduationCap size={11} /> {drawerStudent.level.name ?? drawerStudent.level.level + ' Level'}</span>
          {/if}
          <span class="dbadge phase" style="background:{phaseColor(data.studentRegPhase)}18;color:{phaseColor(data.studentRegPhase)}">
            {#if data.studentRegPhase === 'locked'}<Lock size={11} />{:else}<Unlock size={11} />{/if}
            {phaseLabel(data.studentRegPhase)}
          </span>
        </div>
      </div>
      <button class="close-drawer" onclick={closeDrawer}><X size={18} /></button>
    </div>

    <!-- Unlock panel — only shown when this student is actually locked -->
    {#if data.studentRegPhase === 'locked'}
      <div class="unlock-panel">
        {#if !showUnlockConfirm}
          <button class="unlock-btn" onclick={() => (showUnlockConfirm = true)}>
            <Unlock size={13} /> Unlock registration for {currentSession} Sem {currentSemester}
          </button>
        {:else}
          <div class="unlock-confirm" transition:slide={{ duration: 180 }}>
            <p class="unlock-warn">
              <AlertCircle size={13} />
              This reopens the student's registration to <strong>draft</strong>, letting them add/drop
              courses again through the normal flow. Logged to the audit trail.
            </p>
            <form
              method="POST"
              action="?/unlock"
              use:enhance={() => {
                unlocking = true;
                return async ({ update }) => {
                  unlocking = false;
                  showUnlockConfirm = false;
                  unlockReason = '';
                  await update({ invalidateAll: true });
                };
              }}
            >
              <input type="hidden" name="studentId" value={drawerStudentId} />
              <input
                class="unlock-reason-input"
                type="text"
                name="reason"
                placeholder="Reason (optional, e.g. 'exam day registration request')"
                bind:value={unlockReason}
              />
              <div class="unlock-actions">
                <button type="button" class="btn-ghost sm" onclick={() => (showUnlockConfirm = false)}>Cancel</button>
                <button type="submit" class="unlock-confirm-btn" disabled={unlocking}>
                  {#if unlocking}<LoaderCircle size={13} class="spin" />{:else}<Unlock size={13} />{/if}
                  Confirm Unlock
                </button>
              </div>
            </form>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Drawer tabs -->
    <div class="drawer-tabs">
      <button class="dtab" class:active={drawerTab === 'registered'} onclick={() => (drawerTab = 'registered')}>
        <CheckCircle2 size={13} /> Registered
        <span class="dtab-count">{drawerRegistrations.length}</span>
      </button>
      <button class="dtab" class:active={drawerTab === 'available'} onclick={() => (drawerTab = 'available')}>
        <Plus size={13} /> Add Courses
      </button>
    </div>

    <!-- Registered tab -->
    {#if drawerTab === 'registered'}
      <div class="drawer-body" in:fly={{ y: 8, duration: 180 }}>
        {#if drawerRegistrations.length === 0}
          <div class="drawer-empty">
            <BookOpen size={32} />
            <p>No courses registered</p>
          </div>
        {:else}
          <!-- Summary pills -->
          <div class="drawer-summary">
            {#each ['normal', 'carry_over', 'borrowed'] as t}
              {@const cnt = drawerRegistrations.filter((r) => r.registrationType === t).length}
              {#if cnt > 0}
                <span class="sum-pill" style="background:{getTypeColor(t)}15;color:{getTypeColor(t)};border:1px solid {getTypeColor(t)}40">
                  {getTypeLabel(t)}: {cnt}
                </span>
              {/if}
            {/each}
            <span class="sum-pill credits">
              <Hash size={11} />
              {drawerRegistrations.reduce((s, r) => s + r.course.creditUnits, 0)} credits
            </span>
          </div>

          <div class="drawer-course-list">
            {#each drawerRegistrations as reg (reg.id)}
              <div class="drawer-course-item">
                <div class="dci-left">
                  <span class="dci-code">{reg.course.code}</span>
                  <div>
                    <div class="dci-title">{reg.course.title}</div>
                    <div class="dci-meta">
                      <span>{reg.course.department.code}</span>
                      <span>·</span>
                      <span>{reg.course.creditUnits} CR</span>
                      <span>·</span>
                      <span>Sem {reg.semester}</span>
                    </div>
                  </div>
                </div>
                <div class="dci-right">
                  <span class="type-badge sm" style="background:{getTypeColor(reg.registrationType)}18;color:{getTypeColor(reg.registrationType)}">
                    {getTypeLabel(reg.registrationType)}
                  </span>
                  <form
                    method="POST"
                    action="?/delete"
                    use:enhance={() => {
                      deletingId = reg.id;
                      return async ({ update }) => { deletingId = null; update(); };
                    }}
                  >
                    <input type="hidden" name="id" value={reg.id} />
                    <button type="submit" class="icon-btn delete sm" title="Drop" disabled={deletingId === reg.id}>
                      {#if deletingId === reg.id}
                        <LoaderCircle size={12} class="spin" />
                      {:else}
                        <Trash2 size={12} />
                      {/if}
                    </button>
                  </form>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

    <!-- Available / Add tab -->
    {:else}
      <div class="drawer-body" in:fly={{ y: 8, duration: 180 }}>
        {#if !data.studentAvailableCourses}
          <div class="drawer-empty">
            <BookOpen size={32} />
            <p>Student profile incomplete</p>
          </div>
        {:else}
          <!-- Sub-tabs -->
          <div class="avail-tabs">
            <button class="atab" class:active={availableTab === 'normal'} onclick={() => (availableTab = 'normal')}>
              <BookOpen size={12} /> Normal
              <span>{data.studentAvailableCourses.normal.length}</span>
            </button>
            {#if drawerStudent.level && drawerStudent.level.level >= 200}
              <button class="atab" class:active={availableTab === 'carryOver'} onclick={() => (availableTab = 'carryOver')}>
                <RefreshCw size={12} /> Carry-over
                <span>{data.studentAvailableCourses.carryOver.length}</span>
              </button>
            {/if}
            <button class="atab" class:active={availableTab === 'borrowed'} onclick={() => (availableTab = 'borrowed')}>
              <ArrowRightLeft size={12} /> Borrow
              <span>{data.studentAvailableCourses.borrowed.length}</span>
            </button>
          </div>

          {@const courseList =
            availableTab === 'normal'
              ? data.studentAvailableCourses.normal
              : availableTab === 'carryOver'
                ? data.studentAvailableCourses.carryOver
                : data.studentAvailableCourses.borrowed}

          {#if courseList.length === 0}
            <div class="drawer-empty small">
              <p>No {availableTab === 'carryOver' ? 'carry-over' : availableTab === 'borrowed' ? 'borrowable' : 'normal'} courses available</p>
            </div>
          {:else}
            <div class="drawer-course-list">
              {#each courseList as course (course.id)}
                <div class="drawer-course-item addable">
                  <div class="dci-left">
                    <span class="dci-code" style="color:{availableTab === 'carryOver' ? '#f59e0b' : availableTab === 'borrowed' ? '#8b5cf6' : '#3b82f6'}">{course.code}</span>
                    <div>
                      <div class="dci-title">{course.title}</div>
                      <div class="dci-meta">
                        <span>{course.department.code}</span>
                        <span>·</span>
                        <span>{course.creditUnits} CR</span>
                        {#if availableTab === 'carryOver'}
                          <span>· {course.level}L</span>
                        {/if}
                      </div>
                    </div>
                  </div>
                  <form
                    method="POST"
                    action="?/createFromOffering"
                    use:enhance={() => {
                      registeringCourseId = course.id;
                      return async ({ update }) => {
                        registeringCourseId = null;
                        await update({ invalidateAll: true });
                      };
                    }}
                  >
                    <input type="hidden" name="studentId" value={drawerStudentId} />
                    <input type="hidden" name="offeringId" value={course.id} />
                    <input
                      type="hidden"
                      name="registrationType"
                      value={availableTab === 'carryOver' ? 'carry_over' : availableTab === 'borrowed' ? 'borrowed' : 'normal'}
                    />
                    <button
                      type="submit"
                      class="add-course-btn"
                      class:carry={availableTab === 'carryOver'}
                      class:borrow={availableTab === 'borrowed'}
                      disabled={registeringCourseId === course.id}
                    >
                      {#if registeringCourseId === course.id}
                        <LoaderCircle size={13} class="spin" />
                      {:else}
                        <Plus size={13} />
                      {/if}
                    </button>
                  </form>
                </div>
              {/each}
            </div>
          {/if}
        {/if}
      </div>
    {/if}
  </aside>
{/if}

<!-- ── Create Modal ──────────────────────────────────────────────────────────── -->
{#if showCreateModal}
  <div class="modal-backdrop" transition:fade={{ duration: 180 }}>
    <div class="modal" transition:fly={{ y: 20, duration: 220 }}>
      <div class="modal-head">
        <h3>Add Course Registration</h3>
        <button class="close-btn" onclick={() => (showCreateModal = false)}><X size={18} /></button>
      </div>
      <form
        method="POST"
        action="?/create"
        class="modal-form"
        use:enhance={() => {
          submitting = true;
          return async ({ update }) => { submitting = false; showCreateModal = false; update(); };
        }}
      >
        <div class="field">
          <label>Student</label>
          <select name="studentId" required>
            <option value="">Select student…</option>
            {#each data.students as s}
              <option value={s.id}>{s.fullName} ({s.matricNumber ?? s.id.slice(0, 8)})</option>
            {/each}
          </select>
        </div>
        <div class="field">
          <label>Course</label>
          <select name="courseId" required>
            <option value="">Select course…</option>
            {#each data.courses as c}
              <option value={c.id}>{c.code} — {c.title}</option>
            {/each}
          </select>
        </div>
        <div class="field-row">
          <div class="field">
            <label>Session</label>
            <input type="text" name="session" placeholder={currentSession} value={currentSession} required />
          </div>
          <div class="field">
            <label>Semester</label>
            <select name="semester" required>
              <option value="1" selected={currentSemester === 1}>1st Semester</option>
              <option value="2" selected={currentSemester === 2}>2nd Semester</option>
            </select>
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label>Registration Type</label>
            <select name="registrationType">
              <option value="normal">Normal</option>
              <option value="carry_over">Carry-over</option>
              <option value="borrowed">Borrowed</option>
            </select>
          </div>
          <div class="field">
            <label>Level</label>
            <select name="levelId">
              <option value="">Auto</option>
              {#each data.levels as l}
                <option value={l.id}>{l.name ?? l.level + ' Level'}</option>
              {/each}
            </select>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-ghost" onclick={() => (showCreateModal = false)}>Cancel</button>
          <button type="submit" class="btn-primary" disabled={submitting}>
            {#if submitting}<LoaderCircle size={15} class="spin" />{/if}
            Add Registration
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- ── Edit Modal ────────────────────────────────────────────────────────────── -->
{#if editingReg}
  <div class="modal-backdrop" transition:fade={{ duration: 180 }}>
    <div class="modal" transition:fly={{ y: 20, duration: 220 }}>
      <div class="modal-head">
        <h3>Edit Registration</h3>
        <button class="close-btn" onclick={() => (editingReg = null)}><X size={18} /></button>
      </div>
      <form
        method="POST"
        action="?/edit"
        class="modal-form"
        use:enhance={() => {
          submitting = true;
          return async ({ update }) => { submitting = false; editingReg = null; update(); };
        }}
      >
        <input type="hidden" name="id" value={editingReg.id} />
        <div class="field">
          <label>Student</label>
          <select name="studentId" required>
            {#each data.students as s}
              <option value={s.id} selected={s.id === editingReg.studentId}>
                {s.fullName} ({s.matricNumber ?? s.id.slice(0, 8)})
              </option>
            {/each}
          </select>
        </div>
        <div class="field">
          <label>Course</label>
          <select name="courseId" required>
            {#each data.courses as c}
              <option value={c.id} selected={c.id === editingReg.courseId}>
                {c.code} — {c.title}
              </option>
            {/each}
          </select>
        </div>
        <div class="field-row">
          <div class="field">
            <label>Session</label>
            <input type="text" name="session" value={editingReg.session} required />
          </div>
          <div class="field">
            <label>Semester</label>
            <select name="semester" required>
              <option value="1" selected={editingReg.semester === 1}>1st Semester</option>
              <option value="2" selected={editingReg.semester === 2}>2nd Semester</option>
            </select>
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label>Registration Type</label>
            <select name="registrationType">
              <option value="normal" selected={editingReg.registrationType === 'normal'}>Normal</option>
              <option value="carry_over" selected={editingReg.registrationType === 'carry_over'}>Carry-over</option>
              <option value="borrowed" selected={editingReg.registrationType === 'borrowed'}>Borrowed</option>
            </select>
          </div>
          <div class="field">
            <label>Level</label>
            <select name="levelId">
              <option value="">Auto</option>
              {#each data.levels as l}
                <option value={l.id} selected={l.id === editingReg.levelId}>
                  {l.name ?? l.level + ' Level'}
                </option>
              {/each}
            </select>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-ghost" onclick={() => (editingReg = null)}>Cancel</button>
          <button type="submit" class="btn-primary" disabled={submitting}>
            {#if submitting}<LoaderCircle size={15} class="spin" />{/if}
            Save Changes
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  /* ── Layout ────────────────────────────────────────────────────────────── */
  .admin-page {
    padding: 1.5rem;
    max-width: 1400px;
    margin: 0 auto;
    transition: padding-right 0.3s ease;
  }
  .admin-page.drawer-open {
    padding-right: calc(440px + 1.5rem);
  }

  /* ── Header ────────────────────────────────────────────────────────────── */
  .page-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.25rem;
  }
  .head-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .head-left :global(.head-icon) { color: #3b82f6; }
  .page-head h1 {
    font-size: 1.375rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0;
  }
  .sub { font-size: 0.8rem; color: var(--color-muted); margin: 0.15rem 0 0; }

  /* ── Filters ───────────────────────────────────────────────────────────── */
  .filters-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }
  .search-wrap {
    position: relative;
    flex: 1;
    min-width: 200px;
  }
  .search-wrap :global(.search-icon) {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--color-muted);
    pointer-events: none;
  }
  .search-input {
    width: 100%;
    padding: 0.55rem 0.875rem 0.55rem 2.25rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    color: var(--color-text);
    font-size: 0.85rem;
  }
  .search-input:focus { outline: none; border-color: #3b82f6; }
  .filter-select-wrap {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    color: var(--color-muted);
  }
  .filter-select {
    padding: 0.5rem 0.75rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    color: var(--color-text);
    font-size: 0.85rem;
  }
  .result-count { font-size: 0.8rem; color: var(--color-muted); margin-left: auto; }

  /* ── Table ─────────────────────────────────────────────────────────────── */
  .table-wrap {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    overflow: hidden;
    overflow-x: auto;
  }
  .reg-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }
  .reg-table thead tr {
    background: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
  }
  .reg-table th {
    padding: 0.75rem 1rem;
    text-align: left;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-muted);
    white-space: nowrap;
  }
  .reg-table tbody tr {
    border-bottom: 1px solid var(--color-border);
    transition: background 0.15s;
  }
  .reg-table tbody tr:last-child { border-bottom: none; }
  .reg-table tbody tr:hover { background: var(--color-bg); }
  .reg-table td { padding: 0.75rem 1rem; vertical-align: middle; }

  .student-cell {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    color: inherit;
    text-align: left;
    min-width: 200px;
  }
  .student-cell:hover .student-name { color: #3b82f6; }
  .student-cell :global(.chevron) { color: var(--color-muted); margin-left: auto; }

  .student-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(34,197,94,0.12);
    color: #3b82f6;
    font-size: 0.875rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .student-name {
    display: block;
    font-weight: 600;
    color: var(--color-text);
    font-size: 0.85rem;
    white-space: nowrap;
    transition: color 0.15s;
  }
  .matric { display: block; font-size: 0.72rem; color: var(--color-muted); }

  .course-cell { display: flex; flex-direction: column; gap: 0.15rem; }
  .course-code {
    font-family: monospace;
    font-size: 0.78rem;
    font-weight: 700;
    color: #3b82f6;
  }
  .course-title { font-size: 0.82rem; color: var(--color-text); }
  .dept-tag {
    font-size: 0.7rem;
    color: var(--color-muted);
    background: var(--color-bg);
    padding: 0.1rem 0.35rem;
    border-radius: 0.25rem;
    width: fit-content;
  }

  .session-tag, .sem-tag {
    display: inline-block;
    font-size: 0.72rem;
    color: var(--color-muted);
  }
  .session-tag { font-weight: 600; color: var(--color-text); }
  .sem-tag::before { content: ' · '; }

  .type-badge {
    display: inline-block;
    font-size: 0.7rem;
    font-weight: 700;
    padding: 0.2rem 0.5rem;
    border-radius: 0.25rem;
    white-space: nowrap;
  }
  .type-badge.sm { font-size: 0.65rem; padding: 0.15rem 0.4rem; }

  .level-tag { font-size: 0.8rem; color: var(--color-muted); }
  .date-cell { font-size: 0.78rem; color: var(--color-muted); white-space: nowrap; }

  .row-actions { display: flex; gap: 0.35rem; }
  .icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 0.375rem;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    cursor: pointer;
    color: var(--color-muted);
    transition: all 0.15s;
  }
  .icon-btn.edit:hover { color: #3b82f6; border-color: #3b82f6; background: rgba(59,130,246,0.08); }
  .icon-btn.delete:hover { color: #ef4444; border-color: #ef4444; background: rgba(239,68,68,0.08); }
  .icon-btn.sm { width: 26px; height: 26px; }
  .icon-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .empty-row { text-align: center; color: var(--color-muted); padding: 3rem 1rem; }

  /* ── Drawer ─────────────────────────────────────────────────────────────── */
  .drawer-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.3);
    z-index: 40;
    border: none;
    cursor: pointer;
  }
  .student-drawer {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 440px;
    background: var(--color-surface);
    border-left: 1px solid var(--color-border);
    z-index: 50;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .drawer-head {
    display: flex;
    align-items: flex-start;
    gap: 0.875rem;
    padding: 1.25rem;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg);
  }
  .drawer-avatar {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: rgba(34,197,94,0.15);
    color: #3b82f6;
    font-size: 1.125rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .drawer-student-info { flex: 1; min-width: 0; }
  .drawer-student-info h2 {
    font-size: 1rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0 0 0.15rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .drawer-student-info p { font-size: 0.78rem; color: var(--color-muted); margin: 0 0 0.5rem; }
  .drawer-badges { display: flex; gap: 0.4rem; flex-wrap: wrap; }
  .dbadge {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.7rem;
    font-weight: 600;
    padding: 0.2rem 0.45rem;
    border-radius: 0.25rem;
  }
  .dbadge.dept { background: rgba(59,130,246,0.1); color: #3b82f6; }
  .dbadge.lvl { background: rgba(34,197,94,0.1); color: #3b82f6; }
  .dbadge.phase { font-weight: 700; }

  .close-drawer {
    background: none;
    border: none;
    color: var(--color-muted);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .close-drawer:hover { color: var(--color-text); background: var(--color-border); }

  /* ── Unlock panel ─────────────────────────────────────────────────────── */
  .unlock-panel {
    padding: 0.75rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
    background: rgba(239, 68, 68, 0.04);
  }
  .unlock-btn {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    width: 100%;
    justify-content: center;
    padding: 0.55rem 0.75rem;
    background: none;
    border: 1.5px dashed #ef4444;
    color: #ef4444;
    border-radius: 0.5rem;
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.15s;
  }
  .unlock-btn:hover { background: rgba(239, 68, 68, 0.08); }
  .unlock-confirm {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .unlock-warn {
    display: flex;
    align-items: flex-start;
    gap: 0.4rem;
    font-size: 0.72rem;
    color: #991b1b;
    margin: 0;
    line-height: 1.5;
  }
  .unlock-reason-input {
    width: 100%;
    padding: 0.5rem 0.7rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.4rem;
    font-size: 0.8rem;
    color: var(--color-text);
  }
  .unlock-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }
  .unlock-confirm-btn {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.5rem 0.9rem;
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 0.4rem;
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
  }
  .unlock-confirm-btn:hover:not(:disabled) { background: #dc2626; }
  .unlock-confirm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-ghost.sm { padding: 0.5rem 0.75rem; font-size: 0.78rem; }

  .drawer-tabs {
    display: flex;
    gap: 0;
    border-bottom: 1px solid var(--color-border);
    padding: 0 1rem;
  }
  .dtab {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.75rem 1rem;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--color-muted);
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: -1px;
  }
  .dtab:hover { color: var(--color-text); }
  .dtab.active { color: #3b82f6; border-bottom-color: #3b82f6; }
  .dtab-count {
    background: var(--color-bg);
    border-radius: 999px;
    padding: 0 0.375rem;
    font-size: 0.68rem;
    min-width: 18px;
    text-align: center;
  }
  .dtab.active .dtab-count { background: rgba(34,197,94,0.15); color: #3b82f6; }

  .drawer-body {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .drawer-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.625rem;
    padding: 3rem 1rem;
    color: var(--color-muted);
    text-align: center;
  }
  .drawer-empty :global(svg) { opacity: 0.3; }
  .drawer-empty.small { padding: 1.5rem 1rem; }

  .drawer-summary { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .sum-pill {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.72rem;
    font-weight: 700;
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
  }
  .sum-pill.credits {
    background: var(--color-bg);
    color: var(--color-muted);
    border: 1px solid var(--color-border);
  }

  .drawer-course-list { display: flex; flex-direction: column; gap: 0.5rem; }

  .drawer-course-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.75rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    transition: border-color 0.15s;
  }
  .drawer-course-item.addable:hover { border-color: #3b82f640; }

  .dci-left { display: flex; align-items: center; gap: 0.625rem; flex: 1; min-width: 0; }
  .dci-code {
    font-family: monospace;
    font-size: 0.72rem;
    font-weight: 800;
    color: #3b82f6;
    background: rgba(34,197,94,0.08);
    padding: 0.25rem 0.4rem;
    border-radius: 0.25rem;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .dci-title {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 220px;
  }
  .dci-meta {
    font-size: 0.7rem;
    color: var(--color-muted);
    display: flex;
    gap: 0.3rem;
  }
  .dci-right { display: flex; align-items: center; gap: 0.4rem; flex-shrink: 0; }

  /* Available sub-tabs */
  .avail-tabs {
    display: flex;
    gap: 0.25rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    padding: 0.25rem;
  }
  .atab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.3rem;
    padding: 0.4rem 0.5rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-muted);
    background: none;
    border: none;
    border-radius: 0.35rem;
    cursor: pointer;
    transition: all 0.15s;
  }
  .atab:hover { color: var(--color-text); }
  .atab.active { background: var(--color-surface); color: var(--color-text); box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  .atab span {
    background: var(--color-border);
    border-radius: 999px;
    padding: 0 0.3rem;
    font-size: 0.65rem;
  }

  .add-course-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 0.375rem;
    border: none;
    background: #3b82f6;
    color: white;
    cursor: pointer;
    transition: background 0.15s;
    flex-shrink: 0;
  }
  .add-course-btn:hover:not(:disabled) { background: #16a34a; }
  .add-course-btn.carry { background: #f59e0b; }
  .add-course-btn.carry:hover:not(:disabled) { background: #d97706; }
  .add-course-btn.borrow { background: #8b5cf6; }
  .add-course-btn.borrow:hover:not(:disabled) { background: #7c3aed; }
  .add-course-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  /* ── Modals ─────────────────────────────────────────────────────────────── */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.45);
    z-index: 60;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }
  .modal {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.875rem;
    width: 100%;
    max-width: 520px;
    max-height: 90vh;
    overflow-y: auto;
  }
  .modal-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 1.25rem 0;
  }
  .modal-head h3 { font-size: 1.05rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .close-btn {
    background: none;
    border: none;
    color: var(--color-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem;
    border-radius: 0.25rem;
  }
  .close-btn:hover { color: var(--color-text); background: var(--color-bg); }

  .modal-form { padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }

  .field { display: flex; flex-direction: column; gap: 0.4rem; }
  .field label { font-size: 0.8rem; font-weight: 600; color: var(--color-text); }
  .field input,
  .field select {
    padding: 0.55rem 0.75rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    color: var(--color-text);
    font-size: 0.875rem;
  }
  .field input:focus,
  .field select:focus { outline: none; border-color: #3b82f6; }
  .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.625rem;
    padding-top: 0.5rem;
    border-top: 1px solid var(--color-border);
  }

  /* ── Buttons ────────────────────────────────────────────────────────────── */
  .btn-primary {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.55rem 1.125rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
    white-space: nowrap;
  }
  .btn-primary:hover:not(:disabled) { background: #16a34a; }
  .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

  .btn-ghost {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.55rem 1rem;
    background: none;
    color: var(--color-muted);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
  }
  .btn-ghost:hover { color: var(--color-text); background: var(--color-bg); }

  /* ── Toast ──────────────────────────────────────────────────────────────── */
  .toast {
    position: fixed;
    top: 1.25rem;
    right: 1.25rem;
    z-index: 100;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.125rem;
    border-radius: 0.625rem;
    font-size: 0.875rem;
    font-weight: 500;
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  }
  .toast.success { background: #16a34a; color: white; }
  .toast.error { background: #ef4444; color: white; }

  /* ── Spin ───────────────────────────────────────────────────────────────── */
  :global(.spin) { animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Responsive ─────────────────────────────────────────────────────────── */
  @media (max-width: 768px) {
    .admin-page.drawer-open { padding-right: 1.5rem; }
    .student-drawer { width: 100%; border-left: none; border-top: 1px solid var(--color-border); top: auto; height: 75vh; border-radius: 1rem 1rem 0 0; }
    .field-row { grid-template-columns: 1fr; }
  }
</style>