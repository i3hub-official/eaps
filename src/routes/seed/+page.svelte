<!-- src/routes/(admin)/seed/+page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
  import { fade, fly } from 'svelte/transition';
  import type { PageData, ActionData } from './$types';
  import { 
    Database, 
    Loader2, 
    CheckCircle2, 
    AlertCircle, 
    Trash2, 
    Sprout, 
    GraduationCap,
    Building2,
    Users,
    BookOpen,
    FileCheck,
    HelpCircle,
    ChevronRight,
    RotateCcw
  } from 'lucide-svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let seeding = $state(false);
  let resetting = $state(false);
  
  // Live progress state
  let progress = $state({ current: 0, total: 0, step: '', detail: '' });
  let logs = $state<string[]>([]);
  let showLogs = $state(false);

  const seedSteps = [
    { key: 'colleges', label: 'Colleges', icon: Building2, total: 12 },
    { key: 'departments', label: 'Departments', icon: GraduationCap, total: 56 },
    { key: 'users', label: 'Users & Staff', icon: Users, total: 10 },
    { key: 'students', label: 'Students', icon: Users, total: 66 },
    { key: 'courses', label: 'Courses', icon: BookOpen, total: 32 },
    { key: 'registrations', label: 'Registrations', icon: FileCheck, total: 1 },
    { key: 'exam', label: 'Exam Setup', icon: HelpCircle, total: 1 },
    { key: 'questions', label: 'Questions', icon: HelpCircle, total: 12 },
  ];

  function addLog(msg: string) {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    logs = [...logs, `[${time}] ${msg}`];
  }

  function resetProgress() {
    progress = { current: 0, total: seedSteps.length, step: '', detail: '' };
    logs = [];
  }
</script>

<svelte:head><title>Database Seed — MOUAU eTest</title></svelte:head>

<div class="page">
  <div class="card">
    <!-- Header -->
    <div class="header">
      <div class="icon-wrap">
        <Database size={28} strokeWidth={2} />
      </div>
      <div>
        <h1>Database Seed</h1>
        <p class="sub">
          {data.isFirstRun
            ? 'No users found — safe to seed.'
            : 'Admin access required to re-seed or reset.'}
        </p>
      </div>
    </div>

    <!-- Current counts -->
    <div class="counts">
      {#each Object.entries(data.counts) as [key, val]}
        <div class="count-pill" class:has-data={val > 0}>
          <span class="count-val">{val}</span>
          <span class="count-key">{key}</span>
        </div>
      {/each}
    </div>

    <!-- Progress Section (only during seeding) -->
    {#if seeding}
      <div class="progress-section" transition:fly={{ y: -10, duration: 200 }}>
        <!-- Progress bar -->
        <div class="progress-header">
          <span class="progress-label">Seeding in progress…</span>
          <span class="progress-fraction">{progress.current}/{progress.total}</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width: {(progress.current / progress.total) * 100}%"></div>
        </div>
        
        <!-- Current step -->
        {#if progress.step}
          <div class="current-step" transition:fade>
            <Loader2 size={16} class="spin" />
            <span>{progress.step}</span>
            {#if progress.detail}
              <span class="step-detail">— {progress.detail}</span>
            {/if}
          </div>
        {/if}

        <!-- Step indicators -->
        <div class="step-grid">
          {#each seedSteps as step, i}
            {@const Icon = step.icon}
            {@const isDone = i < progress.current}
            {@const isActive = i === progress.current}
            <div class="step-item" class:done={isDone} class:active={isActive}>
              <div class="step-dot">
                {#if isDone}
                  <CheckCircle2 size={14} />
                {:else if isActive}
                  <Loader2 size={14} class="spin" />
                {:else}
                  <Icon size={14} />
                {/if}
              </div>
              <span class="step-name">{step.label}</span>
              <span class="step-count">{step.total}</span>
            </div>
          {/each}
        </div>

        <!-- Live logs toggle -->
        <button class="log-toggle" onclick={() => showLogs = !showLogs}>
          <ChevronRight size={14} class={showLogs ? 'rotated' : ''} />
          {showLogs ? 'Hide' : 'Show'} live logs ({logs.length})
        </button>
        
        {#if showLogs}
          <div class="log-panel" transition:fade>
            {#each logs as log}
              <div class="log-line">{log}</div>
            {/each}
            {#if logs.length === 0}
              <div class="log-line muted">Waiting for server…</div>
            {/if}
          </div>
        {/if}
      </div>
    {/if}

    <!-- Result -->
    {#if form?.success && form.results && !seeding}
      <div class="result success" transition:fly={{ y: 10, duration: 200 }}>
        <div class="result-header">
          <CheckCircle2 size={20} />
          <span>Seed complete!</span>
        </div>
        {#each form.results as line}
          <p>{line}</p>
        {/each}
      </div>
    {:else if form?.error && !seeding}
      <div class="result error" transition:fly={{ y: 10, duration: 200 }}>
        <div class="result-header">
          <AlertCircle size={20} />
          <span>Seed failed</span>
        </div>
        <p>{form.error}</p>
      </div>
    {/if}

    <!-- Actions -->
    <div class="actions">
      <form method="POST" action="?/seed" use:enhance={() => {
        resetProgress();
        seeding = true;
        addLog('Starting seed process…');
        
        // Simulate progress updates (server doesn't stream, so we estimate)
        const interval = setInterval(() => {
          if (!seeding) { clearInterval(interval); return; }
          const fakeSteps = [
            { step: 'Creating colleges…', detail: 'CAERSE, CASAP, CAFST…', at: 1 },
            { step: 'Creating departments…', detail: 'ABM, AEC, AERS…', at: 2 },
            { step: 'Creating admin & staff…', detail: '1 admin, 6 lecturers, 3 invigilators', at: 3 },
            { step: 'Creating students…', detail: '~66 students across departments', at: 4 },
            { step: 'Creating courses…', detail: 'CSC, MTH, PHY, EEE…', at: 5 },
            { step: 'Registering students…', detail: 'Matching students to courses', at: 6 },
            { step: 'Setting up exam…', detail: 'CSC301 exam configuration', at: 7 },
            { step: 'Creating questions…', detail: 'MCQ + Fill-in-the-blank', at: 8 },
          ];
          const next = fakeSteps.find(s => s.at > progress.current);
          if (next) {
            progress.current = next.at;
            progress.step = next.step;
            progress.detail = next.detail;
            addLog(next.step);
          }
        }, 400);

        return async ({ update }) => { 
          clearInterval(interval);
          progress.current = progress.total;
          progress.step = 'Finalizing…';
          addLog('Seed complete!');
          await update(); 
          seeding = false; 
        };
      }}>
        <button class="btn-primary" disabled={seeding || resetting}>
          {#if seeding}
            <Loader2 size={16} class="spin" />
            Seeding…
          {:else}
            <Sprout size={16} />
            Seed Database
          {/if}
        </button>
      </form>

      {#if !data.isFirstRun}
        <form method="POST" action="?/reset" use:enhance={() => {
          if (!confirm('Delete ALL data? This cannot be undone.')) return () => {};
          resetting = true;
          addLog('Resetting all data…');
          return async ({ update }) => { 
            await update(); 
            resetting = false;
            addLog('Reset complete.');
          };
        }}>
          <button class="btn-danger" disabled={seeding || resetting}>
            {#if resetting}
              <Loader2 size={16} class="spin" />
              Resetting…
            {:else}
              <Trash2 size={16} />
              Reset All Data
            {/if}
          </button>
        </form>
      {/if}
    </div>

    <!-- Last result quick refresh hint -->
    {#if form?.success && !seeding}
      <button class="refresh-hint" onclick={() => window.location.reload()}>
        <RotateCcw size={14} />
        Refresh to see updated counts
      </button>
    {/if}

    <p class="warn">⚠️ Remove or protect this route before going to production.</p>
  </div>
</div>

<style>
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  :global(.spin) {
    animation: spin 1s linear infinite;
  }

  .page { 
    min-height: 100vh; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    padding: 2rem; 
    background: var(--color-bg); 
  }

  .card { 
    background: var(--color-surface); 
    border: 1px solid var(--color-border); 
    border-radius: 1.25rem; 
    padding: 2rem; 
    max-width: 520px; 
    width: 100%; 
    display: flex; 
    flex-direction: column; 
    gap: 1.25rem; 
    box-shadow: 0 1px 3px rgb(0 0 0 / 0.05);
  }

  .header {
    display: flex;
    align-items: center;
    gap: 0.875rem;
  }

  .icon-wrap {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: var(--color-primary-subtle);
    color: var(--color-primary);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  h1 { 
    font-size: 1.4rem; 
    font-weight: 700; 
    margin: 0; 
  }

  .sub { 
    font-size: 0.875rem; 
    color: var(--color-muted); 
    margin: 0; 
    margin-top: 0.15rem;
  }

  /* Counts */
  .counts { 
    display: flex; 
    flex-wrap: wrap; 
    gap: 0.5rem; 
  }

  .count-pill { 
    background: var(--color-bg); 
    border: 1px solid var(--color-border); 
    border-radius: 0.5rem; 
    padding: 0.5rem 0.75rem; 
    display: flex; 
    flex-direction: column; 
    align-items: center; 
    min-width: 72px; 
    transition: all 0.15s ease;
  }

  .count-pill.has-data {
    border-color: var(--color-focus);
    background: #f0fdf4;
  }

  .count-pill.has-data .count-val {
    color: var(--color-focus);
  }

  .count-val { 
    font-size: 1.25rem; 
    font-weight: 700; 
  }

  .count-key { 
    font-size: 0.7rem; 
    color: var(--color-muted); 
    text-transform: capitalize; 
  }

  /* Progress Section */
  .progress-section {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .progress-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .progress-label {
    color: var(--color-text);
  }

  .progress-fraction {
    color: var(--color-muted);
    font-variant-numeric: tabular-nums;
  }

  .progress-track {
    height: 6px;
    background: var(--color-border);
    border-radius: 999px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--color-focus);
    border-radius: 999px;
    transition: width 0.4s ease;
  }

  .current-step {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-focus);
  }

  .step-detail {
    font-weight: 400;
    color: var(--color-muted);
  }

  /* Step Grid */
  .step-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
  }

  .step-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.5rem 0.25rem;
    border-radius: 0.5rem;
    font-size: 0.65rem;
    color: var(--color-muted);
    transition: all 0.2s ease;
  }

  .step-item.done {
    color: var(--color-focus);
  }

  .step-item.active {
    background: #f0fdf4;
    color: var(--color-focus);
    font-weight: 600;
  }

  .step-dot {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-border);
    color: var(--color-muted);
    transition: all 0.2s ease;
  }

  .step-item.done .step-dot {
    background: var(--color-focus);
    color: white;
  }

  .step-item.active .step-dot {
    background: var(--color-focus);
    color: white;
  }

  .step-name {
    text-align: center;
    line-height: 1.2;
  }

  .step-count {
    font-size: 0.6rem;
    opacity: 0.7;
  }

  /* Logs */
  .log-toggle {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.75rem;
    color: var(--color-muted);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    font-weight: 500;
  }

  .log-toggle :global(.rotated) {
    transform: rotate(90deg);
  }

  .log-panel {
    max-height: 160px;
    overflow-y: auto;
    background: #0f172a;
    border-radius: 0.5rem;
    padding: 0.5rem 0.75rem;
    font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
    font-size: 0.7rem;
    line-height: 1.6;
  }

  .log-line {
    color: #22c55e;
  }

  .log-line.muted {
    color: #64748b;
    font-style: italic;
  }

  /* Results */
  .result { 
    padding: 1rem; 
    border-radius: 0.5rem; 
    font-size: 0.85rem; 
  }

  .result p { 
    margin: 0.25rem 0; 
    padding-left: 1.5rem;
  }

  .result-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
  }

  .result.success { 
    background: #f0fdf4; 
    color: #15803d; 
    border: 1px solid #bbf7d0; 
  }

  .result.success .result-header {
    color: #15803d;
  }

  .result.error { 
    background: #fef2f2; 
    color: #dc2626; 
    border: 1px solid #fecaca; 
  }

  .result.error .result-header {
    color: #dc2626;
  }

  /* Actions */
  .actions { 
    display: flex; 
    gap: 0.75rem; 
    flex-wrap: wrap; 
  }

  .btn-primary, 
  .btn-danger {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.7rem 1.5rem; 
    border: none; 
    border-radius: 0.5rem; 
    font-weight: 600; 
    cursor: pointer; 
    font-size: 0.9rem;
    transition: all 0.15s ease;
  }

  .btn-primary { 
    background: var(--color-primary); 
    color: #fff; 
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--color-primary-hover);
    transform: translateY(-1px);
  }

  .btn-danger { 
    background: #dc2626; 
    color: #fff; 
  }

  .btn-danger:hover:not(:disabled) {
    background: #b91c1c;
    transform: translateY(-1px);
  }

  .btn-primary:disabled, 
  .btn-danger:disabled { 
    opacity: 0.6; 
    cursor: not-allowed; 
    transform: none;
  }

  /* Refresh hint */
  .refresh-hint {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.8rem;
    color: var(--color-primary);
    background: var(--color-primary-subtle);
    border: none;
    border-radius: 0.5rem;
    padding: 0.4rem 0.875rem;
    cursor: pointer;
    font-weight: 500;
    align-self: center;
    transition: all 0.15s ease;
  }

  .refresh-hint:hover {
    background: #dbeafe;
  }

  .warn { 
    font-size: 0.78rem; 
    color: #d97706; 
    margin: 0; 
    text-align: center;
  }

  /* Responsive */
  @media (max-width: 480px) {
    .step-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .card {
      padding: 1.5rem;
    }
  }
</style>