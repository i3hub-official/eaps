<!-- src/routes/(student)/student/courses/register/+page.svelte -->
<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import {
    BookOpen,
    Plus,
    Trash2,
    CheckCircle2,
    AlertCircle,
    Clock,
    GraduationCap,
    Building2,
    Hash,
    Award,
    Loader2,
    X,
    RefreshCw,
    ArrowRightLeft,
    Layers,
    AlertTriangle,
    Info,
  } from 'lucide-svelte';
  import { fly, slide, fade } from 'svelte/transition';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let activeTab = $state<'registered' | 'normal' | 'carryOver' | 'borrowed'>('registered');
  let registeringId = $state<string | null>(null);
  let droppingId = $state<string | null>(null);
  let selectedBorrowDept = $state<string>('');

  const creditPercentage = $derived(
    Math.min((data.stats.totalCreditUnits / data.stats.maxCreditUnits) * 100, 100)
  );

  const canRegisterMore = $derived(data.stats.totalCreditUnits < data.stats.maxCreditUnits);
  const canCarryOver = $derived(
    data.stats.studentLevel >= 200 && data.stats.carryOverCount < data.stats.maxCarryOver
  );
  const canBorrow = $derived(data.stats.borrowedCount < data.stats.maxBorrowed);

  const filteredBorrowed = $derived(() => {
    if (!selectedBorrowDept) return data.available.borrowed;
    return data.available.borrowed.filter((c) => c.departmentId === selectedBorrowDept);
  });

  function getRegTypeColor(type: string) {
    switch (type) {
      case 'carry_over': return '#f59e0b';
      case 'borrowed': return '#8b5cf6';
      default: return '#16a34a';
    }
  }

  function getRegTypeLabel(type: string) {
    switch (type) {
      case 'carry_over': return 'Carry-over';
      case 'borrowed': return 'Borrowed';
      default: return 'Normal';
    }
  }
</script>

<svelte:head><title>Course Registration — MOUAU eTest</title></svelte:head>

<div class="page">
  <!-- Header -->
  <header class="page-header">
    <div class="header-title">
      <BookOpen size={24} />
      <div>
        <h1>Course Registration</h1>
        <p class="subtitle">
          {data.stats.currentSession} · Semester {data.stats.currentSemester} · {data.stats.studentLevel} Level
        </p>
      </div>
    </div>
    <div class="credit-pill">
      <div class="credit-info">
        <span class="credit-value">{data.stats.totalCreditUnits}</span>
        <span class="credit-label">/ {data.stats.maxCreditUnits} Credits</span>
      </div>
      <div class="credit-bar">
        <div
          class="credit-fill"
          style="width: {creditPercentage}%; background: {creditPercentage >= 90 ? '#ef4444' : creditPercentage >= 75 ? '#f59e0b' : '#16a34a'}"
        ></div>
      </div>
      <span class="credit-status" style="color: {creditPercentage >= 90 ? '#ef4444' : creditPercentage >= 75 ? '#f59e0b' : '#16a34a'}">
        {creditPercentage >= 90 ? 'Near limit' : creditPercentage >= 75 ? 'Filling up' : 'Good standing'}
      </span>
    </div>
  </header>

  <!-- Alert -->
  {#if form?.message}
    <div
      class="alert"
      class:success={form?.success}
      class:error={!form?.success}
      transition:slide={{ duration: 200 }}
    >
      {#if form?.success}<CheckCircle2 size={16} />{:else}<AlertCircle size={16} />{/if}
      <span>{form.message}</span>
      <button class="alert-close" onclick={() => (form = null)}><X size={14} /></button>
    </div>
  {/if}

  <!-- Limits Info -->
  <div class="limits-bar">
    <div class="limit-item" class:at-limit={data.stats.carryOverCount >= data.stats.maxCarryOver}>
      <RefreshCw size={14} />
      <span>Carry-overs: {data.stats.carryOverCount}/{data.stats.maxCarryOver}</span>
    </div>
    <div class="limit-item" class:at-limit={data.stats.borrowedCount >= data.stats.maxBorrowed}>
      <ArrowRightLeft size={14} />
      <span>Borrowed: {data.stats.borrowedCount}/{data.stats.maxBorrowed}</span>
    </div>
    <div class="limit-item">
      <Layers size={14} />
      <span>Total: {data.stats.totalRegistered} courses</span>
    </div>
  </div>

  <!-- Tabs -->
  <div class="tabs">
    <button class="tab-btn" class:active={activeTab === 'registered'} onclick={() => activeTab = 'registered'}>
      <CheckCircle2 size={14} />
      Registered
      <span class="tab-count">{data.registrations.length}</span>
    </button>
    <button class="tab-btn" class:active={activeTab === 'normal'} onclick={() => activeTab = 'normal'}>
      <BookOpen size={14} />
      Normal
      <span class="tab-count">{data.available.normal.length}</span>
    </button>
    {#if data.stats.studentLevel >= 200}
      <button class="tab-btn" class:active={activeTab === 'carryOver'} onclick={() => activeTab = 'carryOver'}>
        <RefreshCw size={14} />
        Carry-overs
        <span class="tab-count">{data.available.carryOver.length}</span>
      </button>
    {/if}
    <button class="tab-btn" class:active={activeTab === 'borrowed'} onclick={() => activeTab = 'borrowed'}>
      <ArrowRightLeft size={14} />
      Borrow
      <span class="tab-count">{data.available.borrowed.length}</span>
    </button>
  </div>

  <!-- REGISTERED TAB -->
  {#if activeTab === 'registered'}
    <section class="course-section" in:fly={{ y: 10, duration: 200 }}>
      {#if data.registrations.length === 0}
        <div class="empty-state">
          <BookOpen size={40} />
          <h3>No courses registered yet</h3>
          <p>Switch to another tab to register for courses this semester.</p>
        </div>
      {:else}
        <div class="reg-summary">
          {#each ['normal', 'carry_over', 'borrowed'] as type}
            {@const count = data.registrations.filter(r => r.registrationType === type).length}
            {#if count > 0}
              <div class="reg-badge" style="border-color: {getRegTypeColor(type)}; color: {getRegTypeColor(type)}">
                {getRegTypeLabel(type)}: {count}
              </div>
            {/if}
          {/each}
        </div>
        <div class="course-grid">
          {#each data.registrations as reg (reg.id)}
            <div class="course-card registered">
              <div class="card-header">
                <div class="course-code">{reg.course.code}</div>
                <div class="type-tag" style="background: {getRegTypeColor(reg.registrationType)}15; color: {getRegTypeColor(reg.registrationType)}">
                  {getRegTypeLabel(reg.registrationType)}
                </div>
              </div>
              <h3 class="course-title">{reg.course.title}</h3>
              <div class="course-meta">
                <span><Building2 size={12} /> {reg.course.department.code}</span>
                <span><Hash size={12} /> {reg.course.creditUnits} CR</span>
                {#if reg.level}
                  <span><GraduationCap size={12} /> {reg.level.name || reg.level.level + ' Level'}</span>
                {/if}
              </div>
              <div class="card-footer">
                <span class="registered-at"><Clock size={12} /> {new Date(reg.createdAt).toLocaleDateString()}</span>
                <form method="POST" action="?/drop" use:enhance={() => {
                  droppingId = reg.id;
                  return async ({ update }) => { droppingId = null; update(); };
                }}>
                  <input type="hidden" name="registrationId" value={reg.id} />
                  <button type="submit" class="drop-btn" disabled={droppingId === reg.id}>
                    {#if droppingId === reg.id}<Loader2 size={14} class="spin" />{:else}<Trash2 size={14} />{/if}
                    Drop
                  </button>
                </form>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>

  <!-- NORMAL TAB -->
  {:else if activeTab === 'normal'}
    <section class="course-section" in:fly={{ y: 10, duration: 200 }}>
      {#if data.available.normal.length === 0}
        <div class="empty-state">
          <Award size={40} />
          <h3>All normal courses registered!</h3>
        </div>
      {:else}
        <div class="course-grid">
          {#each data.available.normal as course (course.id)}
            <div class="course-card available">
              <div class="card-header">
                <div class="course-code">{course.code}</div>
                <span class="credit-badge">{course.creditUnits} CR</span>
              </div>
              <h3 class="course-title">{course.title}</h3>
              <div class="course-meta">
                <span><Building2 size={12} /> {course.department.code}</span>
                <span><GraduationCap size={12} /> {course.level} Level</span>
              </div>
              <div class="course-stats">
                <span class="enrollment-count"><Info size={12} /> {course._count.registrations} registered</span>
              </div>
              <form method="POST" action="?/register" use:enhance={() => {
                registeringId = course.id;
                return async ({ update }) => { registeringId = null; update(); };
              }}>
                <input type="hidden" name="courseId" value={course.id} />
                <input type="hidden" name="registrationType" value="normal" />
                <button type="submit" class="register-btn" disabled={!canRegisterMore || registeringId === course.id}>
                  {#if registeringId === course.id}<Loader2 size={14} class="spin" /> Registering...{:else}<Plus size={14} /> Register{/if}
                </button>
              </form>
            </div>
          {/each}
        </div>
      {/if}
    </section>

  <!-- CARRY-OVER TAB -->
  {:else if activeTab === 'carryOver'}
    <section class="course-section" in:fly={{ y: 10, duration: 200 }}>
      {#if !canCarryOver}
        <div class="empty-state warning">
          <AlertTriangle size={40} />
          <h3>Carry-over limit reached</h3>
          <p>You can only register for {data.stats.maxCarryOver} carry-over courses.</p>
        </div>
      {:else if data.available.carryOver.length === 0}
        <div class="empty-state">
          <CheckCircle2 size={40} />
          <h3>No carry-over courses available</h3>
          <p>You don't have any failed courses from previous levels.</p>
        </div>
      {:else}
        <div class="info-banner">
          <Info size={16} />
          <span>These are courses you failed in previous levels. Maximum {data.stats.maxCarryOver} allowed.</span>
        </div>
        <div class="course-grid">
          {#each data.available.carryOver as course (course.id)}
            <div class="course-card available carry-over">
              <div class="card-header">
                <div class="course-code">{course.code}</div>
                <span class="credit-badge">{course.creditUnits} CR</span>
              </div>
              <h3 class="course-title">{course.title}</h3>
              <div class="course-meta">
                <span><Building2 size={12} /> {course.department.code}</span>
                <span><GraduationCap size={12} /> {course.level} Level</span>
                <span class="carry-badge"><RefreshCw size={10} /> Carry-over</span>
              </div>
              <form method="POST" action="?/register" use:enhance={() => {
                registeringId = course.id;
                return async ({ update }) => { registeringId = null; update(); };
              }}>
                <input type="hidden" name="courseId" value={course.id} />
                <input type="hidden" name="registrationType" value="carry_over" />
                <button type="submit" class="register-btn carry" disabled={!canRegisterMore || registeringId === course.id}>
                  {#if registeringId === course.id}<Loader2 size={14} class="spin" />{:else}<RefreshCw size={14} />{/if}
                  Register Carry-over
                </button>
              </form>
            </div>
          {/each}
        </div>
      {/if}
    </section>

  <!-- BORROWED TAB -->
  {:else if activeTab === 'borrowed'}
    <section class="course-section" in:fly={{ y: 10, duration: 200 }}>
      {#if !canBorrow}
        <div class="empty-state warning">
          <AlertTriangle size={40} />
          <h3>Borrow limit reached</h3>
          <p>You can only borrow {data.stats.maxBorrowed} courses from other departments.</p>
        </div>
      {:else if data.available.borrowed.length === 0}
        <div class="empty-state">
          <ArrowRightLeft size={40} />
          <h3>No borrowed courses available</h3>
          <p>No courses from other departments match your level.</p>
        </div>
      {:else}
        <div class="info-banner">
          <Info size={16} />
          <span>Borrow courses from other departments in your college. Max {data.stats.maxBorrowed}.</span>
        </div>
        
        <!-- Department Filter -->
        <div class="dept-filter">
          <label>Filter by Department:</label>
          <select bind:value={selectedBorrowDept}>
            <option value="">All Departments</option>
            {#each data.departments as dept}
              <option value={dept.id}>{dept.name} ({dept.code})</option>
            {/each}
          </select>
        </div>

        <div class="course-grid">
          {#each filteredBorrowed() as course (course.id)}
            <div class="course-card available borrowed">
              <div class="card-header">
                <div class="course-code">{course.code}</div>
                <span class="credit-badge">{course.creditUnits} CR</span>
              </div>
              <h3 class="course-title">{course.title}</h3>
              <div class="course-meta">
                <span><Building2 size={12} /> {course.department.name}</span>
                <span><GraduationCap size={12} /> {course.level} Level</span>
                <span class="borrow-badge"><ArrowRightLeft size={10} /> Borrow</span>
              </div>
              <form method="POST" action="?/register" use:enhance={() => {
                registeringId = course.id;
                return async ({ update }) => { registeringId = null; update(); };
              }}>
                <input type="hidden" name="courseId" value={course.id} />
                <input type="hidden" name="registrationType" value="borrowed" />
                <button type="submit" class="register-btn borrow" disabled={!canRegisterMore || registeringId === course.id}>
                  {#if registeringId === course.id}<Loader2 size={14} class="spin" />{:else}<ArrowRightLeft size={14} />{/if}
                  Borrow Course
                </button>
              </form>
            </div>
          {/each}
        </div>
      {/if}
    </section>
  {/if}
</div>

<style>
  .page { max-width: 1200px; margin: 0 auto; padding: 1.5rem; }

  .page-header {
    display: flex; justify-content: space-between; align-items: flex-start;
    flex-wrap: wrap; gap: 1rem; margin-bottom: 1.25rem;
  }

  .header-title { display: flex; align-items: center; gap: 0.875rem; }
  .header-title :global(svg) { color: #16a34a; flex-shrink: 0; }

  .page-header h1 { font-size: 1.5rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .subtitle { color: var(--color-muted); font-size: 0.85rem; margin: 0.25rem 0 0; }

  .credit-pill {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.75rem; padding: 0.875rem 1.25rem;
    display: flex; align-items: center; gap: 0.875rem; min-width: 220px;
  }

  .credit-info { display: flex; align-items: baseline; gap: 0.25rem; }
  .credit-value { font-size: 1.5rem; font-weight: 800; color: var(--color-text); line-height: 1; }
  .credit-label { font-size: 0.75rem; color: var(--color-muted); font-weight: 500; }

  .credit-bar { flex: 1; height: 6px; background: var(--color-bg); border-radius: 3px; overflow: hidden; min-width: 80px; }
  .credit-fill { height: 100%; border-radius: 3px; transition: width 0.4s ease; }

  .credit-status { font-size: 0.7rem; font-weight: 600; white-space: nowrap; }

  .alert {
    display: flex; align-items: center; gap: 0.625rem;
    padding: 0.875rem 1rem; border-radius: 0.625rem;
    margin-bottom: 1rem; font-size: 0.875rem; font-weight: 500;
  }
  .alert.success { background: rgba(22, 163, 74, 0.08); color: #16a34a; border: 1px solid rgba(22, 163, 74, 0.2); }
  .alert.error { background: rgba(239, 68, 68, 0.08); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
  .alert-close { margin-left: auto; background: none; border: none; color: inherit; opacity: 0.6; cursor: pointer; padding: 0.125rem; display: flex; align-items: center; justify-content: center; border-radius: 0.25rem; }
  .alert-close:hover { opacity: 1; background: rgba(0,0,0,0.05); }

  .limits-bar {
    display: flex; gap: 1rem; margin-bottom: 1.25rem;
    flex-wrap: wrap;
  }
  .limit-item {
    display: flex; align-items: center; gap: 0.4rem;
    padding: 0.4rem 0.875rem; background: var(--color-surface);
    border: 1px solid var(--color-border); border-radius: 0.5rem;
    font-size: 0.8rem; font-weight: 500; color: var(--color-muted);
  }
  .limit-item.at-limit { border-color: #ef4444; color: #ef4444; background: rgba(239,68,68,0.05); }

  .tabs {
    display: flex; gap: 0.25rem; background: var(--color-surface);
    border: 1px solid var(--color-border); border-radius: 0.625rem;
    padding: 0.375rem; margin-bottom: 1.25rem; width: fit-content; flex-wrap: wrap;
  }
  .tab-btn {
    display: flex; align-items: center; gap: 0.4rem;
    padding: 0.5rem 1rem; border-radius: 0.5rem; border: none;
    background: none; color: var(--color-muted);
    font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
  }
  .tab-btn:hover { color: var(--color-text); background: var(--color-bg); }
  .tab-btn.active { background: #16a34a; color: white; }
  .tab-count {
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 20px; height: 20px; padding: 0 0.375rem;
    background: rgba(0,0,0,0.08); border-radius: 999px;
    font-size: 0.7rem; font-weight: 700;
  }
  .tab-btn.active .tab-count { background: rgba(255,255,255,0.2); }

  .course-section { min-height: 300px; }

  .reg-summary {
    display: flex; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap;
  }
  .reg-badge {
    padding: 0.35rem 0.75rem; border-radius: 0.5rem;
    font-size: 0.8rem; font-weight: 600; border: 1.5px solid;
  }

  .course-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1rem;
  }

  .course-card {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.75rem; padding: 1.25rem;
    display: flex; flex-direction: column; gap: 0.75rem;
    transition: box-shadow 0.2s, transform 0.2s;
  }
  .course-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.04); transform: translateY(-1px); }

  .card-header { display: flex; justify-content: space-between; align-items: center; }

  .course-code {
    font-family: monospace; font-size: 0.8rem; font-weight: 700;
    color: #16a34a; background: rgba(22,163,74,0.08);
    padding: 0.25rem 0.625rem; border-radius: 0.375rem;
  }

  .type-tag {
    font-size: 0.7rem; font-weight: 700;
    padding: 0.2rem 0.5rem; border-radius: 0.25rem;
  }

  .credit-badge {
    font-size: 0.7rem; font-weight: 700; color: var(--color-muted);
    background: var(--color-bg); padding: 0.2rem 0.5rem;
    border-radius: 0.25rem; border: 1px solid var(--color-border);
  }

  .course-title { font-size: 1rem; font-weight: 600; color: var(--color-text); margin: 0; line-height: 1.4; }

  .course-meta {
    display: flex; flex-wrap: wrap; gap: 0.625rem;
  }
  .course-meta span {
    display: flex; align-items: center; gap: 0.3rem;
    font-size: 0.75rem; color: var(--color-muted);
  }

  .carry-badge {
    background: rgba(245,158,11,0.1); color: #f59e0b;
    padding: 0.15rem 0.4rem; border-radius: 0.25rem;
    font-size: 0.7rem; font-weight: 600;
  }
  .borrow-badge {
    background: rgba(139,92,246,0.1); color: #8b5cf6;
    padding: 0.15rem 0.4rem; border-radius: 0.25rem;
    font-size: 0.7rem; font-weight: 600;
  }

  .course-stats { margin-top: auto; padding-top: 0.75rem; border-top: 1px solid var(--color-border); }
  .enrollment-count {
    display: flex; align-items: center; gap: 0.3rem;
    font-size: 0.75rem; color: var(--color-muted);
  }

  .card-footer {
    display: flex; justify-content: space-between; align-items: center;
    margin-top: auto; padding-top: 0.75rem; border-top: 1px solid var(--color-border);
  }

  .registered-at {
    display: flex; align-items: center; gap: 0.3rem;
    font-size: 0.75rem; color: var(--color-muted);
  }

  .register-btn, .drop-btn {
    display: flex; align-items: center; justify-content: center; gap: 0.4rem;
    width: 100%; padding: 0.625rem; border-radius: 0.5rem;
    font-size: 0.85rem; font-weight: 600; cursor: pointer;
    transition: all 0.2s; border: none;
  }

  .register-btn {
    background: #16a34a; color: white; margin-top: 0.5rem;
  }
  .register-btn:hover:not(:disabled) { background: #15803d; }
  .register-btn.carry { background: #f59e0e; }
  .register-btn.carry:hover:not(:disabled) { background: #d97706; }
  .register-btn.borrow { background: #8b5cf6; }
  .register-btn.borrow:hover:not(:disabled) { background: #7c3aed; }
  .register-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .drop-btn {
    background: rgba(239,68,68,0.08); color: #ef4444;
    border: 1px solid rgba(239,68,68,0.2);
    padding: 0.4rem 0.75rem; width: auto; font-size: 0.8rem;
  }
  .drop-btn:hover:not(:disabled) { background: #ef4444; color: white; }
  .drop-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  :global(.spin) { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .empty-state {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 0.875rem; padding: 4rem 2rem; text-align: center; color: var(--color-muted);
  }
  .empty-state.warning :global(svg) { color: #f59e0b; opacity: 0.6; }
  .empty-state :global(svg) { color: var(--color-muted); opacity: 0.4; }
  .empty-state h3 { font-size: 1.125rem; font-weight: 600; color: var(--color-text); margin: 0; }
  .empty-state p { font-size: 0.875rem; margin: 0; max-width: 400px; }

  .info-banner {
    display: flex; align-items: center; gap: 0.625rem;
    padding: 0.75rem 1rem; background: rgba(59,130,246,0.06);
    border: 1px solid rgba(59,130,246,0.15); border-radius: 0.625rem;
    margin-bottom: 1rem; font-size: 0.85rem; color: #3b82f6;
  }

  .dept-filter {
    display: flex; align-items: center; gap: 0.75rem;
    margin-bottom: 1rem; flex-wrap: wrap;
  }
  .dept-filter label { font-size: 0.85rem; font-weight: 600; color: var(--color-text); }
  .dept-filter select {
    padding: 0.5rem 0.875rem; background: var(--color-surface);
    border: 1px solid var(--color-border); border-radius: 0.5rem;
    color: var(--color-text); font-size: 0.85rem; min-width: 220px;
  }

  @media (max-width: 768px) {
    .page { padding: 1rem; }
    .page-header { flex-direction: column; align-items: stretch; }
    .credit-pill { width: 100%; }
    .course-grid { grid-template-columns: 1fr; }
    .tabs { width: 100%; }
    .tab-btn { flex: 1; justify-content: center; }
  }
</style>