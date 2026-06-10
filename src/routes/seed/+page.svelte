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
    RotateCcw,
    ShieldCheck,
    Bell,
    Settings2,
  } from 'lucide-svelte';

  let { data }: { data: PageData } = $props();
  let form = $state<ActionData | null>(null);
  let seeding = $state(false);
  let resetting = $state(false);

  let progress = $state({ current: 0, total: 0, step: '', detail: '' });
  let logs = $state<string[]>([]);
  let showLogs = $state(false);
  
  // Track real server progress
  let eventSource: EventSource | null = null;
  let seedResults = $state<string[]>([]);

  // ─── Step definitions (aligned with server results.push order) ───────────
  const seedSteps = [
    { key: 'levels',        label: 'Levels',         icon: GraduationCap, total: 8,    emoji: '📊' },
    { key: 'colleges',      label: 'Colleges',       icon: Building2,     total: 12,   emoji: '🏛️' },
    { key: 'departments',   label: 'Departments',    icon: Building2,     total: 57,   emoji: '🏢' },
    { key: 'staff',         label: 'Staff',          icon: Users,         total: 62,   emoji: '👥' },
    { key: 'students',      label: 'Students',       icon: Users,         total: 45,   emoji: '🎓' },
    { key: 'courses',       label: 'Courses',        icon: BookOpen,      total: 370,  emoji: '📚' },
    { key: 'registrations', label: 'Registrations',  icon: FileCheck,     total: null, emoji: '📋' },
    { key: 'exam',          label: 'Exams',          icon: ShieldCheck,   total: 2,    emoji: '📝' },
    { key: 'questions',     label: 'Questions',      icon: HelpCircle,    total: 28,   emoji: '❓' },
    { key: 'notifications', label: 'Notifications',  icon: Bell,          total: null, emoji: '🔔' },
    { key: 'preferences',   label: 'Preferences',    icon: Settings2,     total: null, emoji: '⚙️' },
  ];

  function addLog(msg: string, isError = false) {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    logs = [...logs, `[${time}] ${msg}`];
    if (isError) {
      console.error(msg);
    }
  }

  function resetProgress() {
    progress = { current: 0, total: seedSteps.length, step: '', detail: '' };
    logs = [];
    seedResults = [];
    showLogs = true;
    form = null;
  }

  // Real SSE connection to get server progress
function startSSE() {
  if (eventSource) {
    eventSource.close();
  }
  
  eventSource = new EventSource('/api/seed-progress');
  let reconnectAttempts = 0;
  
  eventSource.onopen = () => {
    addLog('✅ Connected to real-time progress stream');
    reconnectAttempts = 0;
  };
  
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.type === 'progress') {
      const stepIndex = seedSteps.findIndex(s => s.key === data.step);
      if (stepIndex !== -1) {
        progress.current = stepIndex + 1;
        progress.step = data.message;
        progress.detail = data.detail || '';
      }
      addLog(`${data.emoji || '📌'} ${data.message} ${data.detail ? `— ${data.detail}` : ''}`);
    } 
    else if (data.type === 'complete') {
      progress.current = seedSteps.length;
      addLog(`✨ ${data.message}`);
      seeding = false;
      eventSource?.close();
      setTimeout(() => window.location.reload(), 1500);
    }
    else if (data.type === 'error') {
      addLog(`❌ ${data.message}`, true);
      seeding = false;
      eventSource?.close();
    }
  };
  
  eventSource.onerror = () => {
    if (reconnectAttempts < 3) {
      reconnectAttempts++;
      addLog(`⚠️ Connection lost, reconnecting... (attempt ${reconnectAttempts}/3)`, true);
      setTimeout(() => startSSE(), 2000);
    } else {
      addLog('❌ Failed to maintain progress connection. Please refresh and try again.', true);
      seeding = false;
      eventSource?.close();
    }
  };
}
</script>

<svelte:head><title>Database Seed — MOUAU eTest</title></svelte:head>

<div class="page">
  <div class="card">

    <!-- ── Header ──────────────────────────────────────────────────────── -->
    <div class="header">
      <div class="icon-wrap">
        <Database size={28} strokeWidth={2} />
      </div>
      <div>
        <h1>Database Seed</h1>
        <p class="sub">
          {data.isFirstRun
            ? 'No users found — safe to seed without admin login.'
            : 'Admin access required to re-seed or reset.'}
        </p>
      </div>
    </div>

    <!-- ── Current counts ──────────────────────────────────────────────── -->
    <div class="counts">
      {#each Object.entries(data.counts) as [key, val]}
        <div class="count-pill" class:has-data={val > 0}>
          <span class="count-val">{val}</span>
          <span class="count-key">{key}</span>
        </div>
      {/each}
    </div>

    <!-- ── Real Progress section (while seeding) ───────────────────────── -->
    {#if seeding}
      <div class="progress-section" transition:fly={{ y: -10, duration: 200 }}>
        
        <div class="progress-header">
          <span class="progress-label">🌱 Real-time seeding in progress...</span>
          <span class="progress-fraction">{progress.current}/{progress.total}</span>
        </div>
        
        <div class="progress-track">
          <div
            class="progress-fill"
            style="width: {Math.min((progress.current / progress.total) * 100, 100)}%"
          ></div>
        </div>

        {#if progress.step}
          <div class="current-step" transition:fade>
            <Loader2 size={15} class="spin" />
            <span>{progress.step}</span>
            {#if progress.detail}<span class="step-detail">— {progress.detail}</span>{/if}
          </div>
        {/if}

        <!-- Step chips showing real completion status -->
        <div class="step-grid">
          {#each seedSteps as step, i}
            {@const isDone = i < progress.current}
            {@const isActive = i === progress.current}
            <div class="step-item" class:done={isDone} class:active={isActive}>
              <div class="step-dot">
                {#if isDone}
                  <CheckCircle2 size={13} />
                {:else if isActive}
                  <Loader2 size={13} class="spin" />
                {:else}
                  <svelte:component this={step.icon} size={13} />
                {/if}
              </div>
              <span class="step-name">{step.label}</span>
              {#if step.total !== null}
                <span class="step-count">~{step.total}</span>
              {/if}
            </div>
          {/each}
        </div>

        <!-- Live real logs toggle -->
        <button class="log-toggle" onclick={() => showLogs = !showLogs}>
          <ChevronRight size={13} class={showLogs ? 'rotated' : ''} />
          {showLogs ? 'Hide' : 'Show'} live server logs ({logs.length})
        </button>

        {#if showLogs}
          <div class="log-panel" transition:fade>
            {#if logs.length === 0}
              <div class="log-line muted">Waiting for server response...</div>
            {:else}
              {#each logs as log}
                <div class="log-line">{log}</div>
              {/each}
            {/if}
          </div>
        {/if}
      </div>
    {/if}

    <!-- ── Result (from server response) ───────────────────────────────────────── -->
    {#if form?.success && form.results && !seeding}
      <div class="result success" transition:fly={{ y: 10, duration: 200 }}>
        <div class="result-header">
          <CheckCircle2 size={18} />
          <span>Seed complete!</span>
        </div>
        {#each form.results as line}
          <p>{line}</p>
        {/each}
      </div>
    {:else if form?.error && !seeding}
      <div class="result error" transition:fly={{ y: 10, duration: 200 }}>
        <div class="result-header">
          <AlertCircle size={18} />
          <span>Seed failed</span>
        </div>
        <p>{form.error}</p>
      </div>
    {/if}

    <!-- ── Actions ─────────────────────────────────────────────────────── -->
    <div class="actions">

      <!-- Seed Button with real progress tracking -->
      <form
        method="POST"
        action="?/seed"
        use:enhance={() => {
          resetProgress();
          seeding = true;
          addLog('🌱 Starting REAL seed process on server...');
          addLog('📡 Opening progress stream...');
          
          // Start SSE to receive real server progress
          startSSE();
          
          return async ({ update }) => {
            const result = await update();
            // Don't stop seeding here - let SSE handle completion
            return result;
          };
        }}
      >
        <button class="btn-primary" disabled={seeding || resetting}>
          {#if seeding}
            <Loader2 size={15} class="spin" /> Seeding (real-time)...
          {:else}
            <Sprout size={15} /> Seed Database
          {/if}
        </button>
      </form>

      <!-- Reset Button - NOW ADDED ✅ -->
      <form
        method="POST"
        action="?/reset"
        use:enhance={() => {
          if (!confirm(
            `⚠️ DANGER: RESET ALL DATA

This will PERMANENTLY DELETE:
• All students (${data.counts.students || 0})
• All staff (${data.counts.staff || 0})
• All courses (${data.counts.courses || 0})
• All registrations (${data.counts.registrations || 0})
• All exam results
• All questions
• All notifications

⚠️ This action CANNOT be undone!

Are you absolutely sure?`
          )) return () => {};
          
          resetting = true;
          addLog('🗑️ Initiating database reset...');
          
          return async ({ update }) => {
            const result = await update();
            resetting = false;
            if (result?.data?.success) {
              addLog('✅ Database reset complete. All data cleared.');
              setTimeout(() => window.location.reload(), 1500);
            } else {
              addLog('❌ Reset failed: ' + (result?.data?.error || 'Unknown error'), true);
            }
            return result;
          };
        }}
      >
        <button class="btn-danger" disabled={seeding || resetting}>
          {#if resetting}
            <Loader2 size={15} class="spin" /> Resetting...
          {:else}
            <Trash2 size={15} /> Reset All Data
          {/if}
        </button>
      </form>
    </div>

    <!-- Refresh hint after seed -->
    {#if form?.success && !seeding}
      <button class="refresh-hint" onclick={() => window.location.reload()}>
        <RotateCcw size={13} />
        Refresh to see updated counts
      </button>
    {/if}

    <!-- What gets seeded — summary table -->
    {#if !seeding && !form}
      <div class="seed-summary" transition:fade>
        <p class="summary-title">What will be seeded (real data)</p>
        <div class="summary-grid">
          {#each seedSteps as step}
            <div class="summary-row">
              <svelte:component this={step.icon} size={13} />
              <span class="summary-label">{step.label}</span>
              <span class="summary-val">
                {step.total !== null ? `~${step.total}` : 'auto'}
              </span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Warning -->
    <div class="warning-box">
      <AlertCircle size={15} />
      <span>Remove or protect this route before going to production.</span>
    </div>

  </div>
</div>

<style>
  @keyframes spin { to { transform: rotate(360deg); } }
  :global(.spin) { animation: spin 1s linear infinite; }

  /* ── Layout ──────────────────────────────────────────────────────────── */
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
    max-width: 600px;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    box-shadow: 0 4px 24px -4px rgb(0 0 0 / 0.12);
  }

  /* ── Header ──────────────────────────────────────────────────────────── */
  .header {
    display: flex;
    align-items: center;
    gap: 0.875rem;
  }

  .icon-wrap {
    flex-shrink: 0;
    width: 52px;
    height: 52px;
    border-radius: 14px;
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  h1 {
    font-size: 1.4rem;
    font-weight: 700;
    margin: 0;
    color: var(--color-text);
  }

  .sub {
    font-size: 0.825rem;
    color: var(--color-muted);
    margin: 0.15rem 0 0;
  }

  /* ── Counts ──────────────────────────────────────────────────────────── */
  .counts {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .count-pill {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    padding: 0.45rem 0.7rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 68px;
    transition: border-color 0.15s, background 0.15s;
  }

  .count-pill.has-data {
    border-color: rgba(59, 130, 246, 0.5);
    background: rgba(59, 130, 246, 0.05);
  }

  .count-val {
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--color-text);
    line-height: 1;
  }

  .count-pill.has-data .count-val {
    color: #3b82f6;
  }

  .count-key {
    font-size: 0.67rem;
    color: var(--color-muted);
    text-transform: capitalize;
    margin-top: 0.1rem;
  }

  /* ── Progress section ────────────────────────────────────────────────── */
  .progress-section {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.875rem;
    padding: 1rem 1.1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .progress-header {
    display: flex;
    justify-content: space-between;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .progress-fraction {
    color: var(--color-muted);
    font-variant-numeric: tabular-nums;
  }

  .progress-track {
    height: 5px;
    background: var(--color-border);
    border-radius: 999px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #3b82f6, #6366f1);
    border-radius: 999px;
    transition: width 0.45s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .current-step {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.78rem;
    font-weight: 600;
    color: #3b82f6;
  }

  .step-detail {
    font-weight: 400;
    color: var(--color-muted);
  }

  /* Step chips */
  .step-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.4rem;
  }

  .step-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
    padding: 0.45rem 0.2rem;
    border-radius: 0.5rem;
    font-size: 0.62rem;
    color: var(--color-muted);
    transition: all 0.2s ease;
    border: 1px solid transparent;
  }

  .step-item.done {
    color: #3b82f6;
  }

  .step-item.active {
    background: rgba(59, 130, 246, 0.08);
    border-color: rgba(59, 130, 246, 0.25);
    color: #3b82f6;
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

  .step-item.done .step-dot,
  .step-item.active .step-dot {
    background: #3b82f6;
    color: #fff;
  }

  .step-name { text-align: center; line-height: 1.3; }
  .step-count { font-size: 0.58rem; opacity: 0.65; }

  /* ── Logs ────────────────────────────────────────────────────────────── */
  .log-toggle {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.73rem;
    color: var(--color-muted);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    font-weight: 500;
    transition: color 0.15s;
  }

  .log-toggle:hover { color: var(--color-text); }

  :global(.rotated) { transform: rotate(90deg); }

  .log-panel {
    max-height: 180px;
    overflow-y: auto;
    background: #0d1117;
    border-radius: 0.5rem;
    padding: 0.6rem 0.8rem;
    font-family: 'SF Mono', 'Cascadia Code', Monaco, monospace;
    font-size: 0.69rem;
    line-height: 1.65;
  }

  .log-panel::-webkit-scrollbar { width: 4px; }
  .log-panel::-webkit-scrollbar-track { background: #161b22; border-radius: 2px; }
  .log-panel::-webkit-scrollbar-thumb { background: #30363d; border-radius: 2px; }

  .log-line { color: #3fb950; }
  .log-line.muted { color: #484f58; font-style: italic; }

  /* ── Result ──────────────────────────────────────────────────────────── */
  .result {
    padding: 0.9rem 1rem;
    border-radius: 0.625rem;
    font-size: 0.83rem;
  }

  .result-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
  }

  .result p {
    margin: 0.2rem 0;
    padding-left: 1.5rem;
    font-size: 0.78rem;
    opacity: 0.9;
  }

  .result.success {
    background: #f0fdf4;
    color: #15803d;
    border: 1px solid #bbf7d0;
  }

  .result.error {
    background: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
  }

  /* ── Actions ─────────────────────────────────────────────────────────── */
  .actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .btn-primary,
  .btn-danger {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.65rem 1.4rem;
    border: none;
    border-radius: 0.5rem;
    font-weight: 600;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background 0.15s, transform 0.15s, box-shadow 0.15s;
  }

  .btn-primary { background: #3b82f6; color: #fff; }
  .btn-primary:hover:not(:disabled) {
    background: #2563eb;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px -2px rgba(59, 130, 246, 0.4);
  }

  .btn-danger { background: #dc2626; color: #fff; }
  .btn-danger:hover:not(:disabled) {
    background: #b91c1c;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px -2px rgba(220, 38, 38, 0.4);
  }

  .btn-primary:disabled,
  .btn-danger:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  /* ── Refresh hint ────────────────────────────────────────────────────── */
  .refresh-hint {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.78rem;
    color: #3b82f6;
    background: rgba(59, 130, 246, 0.08);
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: 0.5rem;
    padding: 0.45rem 0.9rem;
    cursor: pointer;
    font-weight: 500;
    align-self: flex-start;
    transition: background 0.15s, transform 0.15s;
  }

  .refresh-hint:hover {
    background: rgba(59, 130, 246, 0.14);
    transform: translateY(-1px);
  }

  /* ── Seed summary (pre-seed idle state) ──────────────────────────────── */
  .seed-summary {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 0.875rem 1rem;
  }

  .summary-title {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0 0 0.6rem;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.3rem 1.5rem;
  }

  .summary-row {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 0.775rem;
    color: var(--color-text);
  }

  .summary-row :global(svg) {
    color: var(--color-muted);
    flex-shrink: 0;
  }

  .summary-label { flex: 1; }

  .summary-val {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    color: #3b82f6;
    font-size: 0.73rem;
  }

  /* ── Warning ─────────────────────────────────────────────────────────── */
  .warning-box {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.65rem 0.9rem;
    background: rgba(245, 158, 11, 0.08);
    border: 1px solid rgba(245, 158, 11, 0.22);
    border-radius: 0.5rem;
    font-size: 0.73rem;
    color: #d97706;
  }

  /* ── Responsive ──────────────────────────────────────────────────────── */
  @media (max-width: 640px) {
    .page { padding: 1rem; }
    .card { padding: 1.25rem; border-radius: 1rem; }

    .step-grid { grid-template-columns: repeat(3, 1fr); }
    .summary-grid { grid-template-columns: 1fr; }

    .actions { flex-direction: column; }
    .btn-primary,
    .btn-danger { justify-content: center; width: 100%; }
  }
</style>