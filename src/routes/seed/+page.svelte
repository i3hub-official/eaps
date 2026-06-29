<script lang="ts">
  import { enhance } from '$app/forms';
  import { fade, fly, slide } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import type { PageData, ActionData } from './$types';
  import {
    Database, Loader2, CheckCircle2, AlertCircle, Trash2, Sprout,
    GraduationCap, Building2, Users, BookOpen, FileCheck, HelpCircle,
    ChevronRight, RotateCcw, ShieldCheck, Bell, Settings2, CalendarDays,
    FlaskConical, BookMarked, Library, Layers, CreditCard, Terminal, Activity,
    ArrowRight, Sparkles, ShieldAlert, Info, UserX, BookX,
  } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();
  let form = $state<ActionData | null>(null);
  let seeding = $state(false);
  let resetting = $state(false);

  let progress = $state({ current: 0, total: 13, step: '', detail: '' });
  let logs = $state<string[]>([]);
  let showLogs = $state(false);

  let eventSource: EventSource | null = null;
  let seedResults = $state<string[]>([]);

  const seedSteps = [
    { key: 'levels',        label: 'Levels',          icon: GraduationCap, total: 2,     emoji: '📊', color: '#8b5cf6' },
    { key: 'semesters',     label: 'Semesters',       icon: CalendarDays,  total: 2,     emoji: '📅', color: '#06b6d4' },
    { key: 'colleges',      label: 'Colleges',        icon: Building2,     total: 12,    emoji: '🏛️', color: '#f59e0b' },
    { key: 'departments',   label: 'Departments',     icon: Building2,     total: 62,    emoji: '🏢', color: '#f97316' },
    { key: 'Credit Unit',   label: 'Credit Caps',     icon: CreditCard,    total: 4,     emoji: '🎯', color: '#ec4899' },
    { key: 'users',         label: 'Users',           icon: Users,         total: null,  emoji: '👥', color: '#6366f1' },
    { key: 'courses',       label: 'Courses',         icon: BookOpen,      total: null,  emoji: '📚', color: '#10b981' },
    { key: 'exam',          label: 'Exams',           icon: ShieldCheck,   total: 6,     emoji: '📝', color: '#ef4444' },
    { key: 'questions',     label: 'Questions',       icon: HelpCircle,    total: 65,    emoji: '❓', color: '#a855f7' },
    { key: 'notifications', label: 'Notifications',   icon: Bell,          total: null,  emoji: '🔔', color: '#eab308' },
    { key: 'preferences',   label: 'Preferences',     icon: Settings2,     total: null,  emoji: '⚙️', color: '#64748b' },
  ];

  const semesterDefs = [
    { name: 'First Semester',  months: 'September – January', icon: BookMarked, color: '#3b82f6', short: 'Sem 1' },
    { name: 'Second Semester', months: 'February – August', icon: Library,    color: '#10b981', short: 'Sem 2' },
  ];

  const creditCapRows = [
    { level: '100L', sem1: 27, sem2: 27, carryOver: 0,  borrowed: 6  },
    { level: '200L', sem1: 24, sem2: 24, carryOver: 6,  borrowed: 6  },
  ];

  function addLog(msg: string, isError = false) {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    logs = [...logs, `[${time}] ${msg}`];
    if (isError) console.error(msg);
  }

  function resetProgress() {
    progress = { current: 0, total: seedSteps.length, step: '', detail: '' };
    logs = [];
    seedResults = [];
    showLogs = true;
    form = null;
  }

  function startSSE() {
    if (eventSource) eventSource.close();
    eventSource = new EventSource('/api/seed-progress');
    let reconnectAttempts = 0;

    eventSource.onopen = () => {
      addLog('Connected to real-time progress stream');
      reconnectAttempts = 0;
    };

    eventSource.onmessage = (event) => {
      const d = JSON.parse(event.data);
      if (d.type === 'progress') {
        const stepIndex = seedSteps.findIndex(s => s.key === d.step);
        if (stepIndex !== -1) {
          progress.current = stepIndex + 1;
          progress.step    = d.message;
          progress.detail  = d.detail || '';
        }
        addLog(`${d.emoji || '●'} ${d.message}${d.detail ? ` — ${d.detail}` : ''}`);
      } else if (d.type === 'complete') {
        progress.current = seedSteps.length;
        addLog(`✨ ${d.message}`);
        seeding = false;
        eventSource?.close();
        setTimeout(() => window.location.reload(), 1500);
      } else if (d.type === 'error') {
        addLog(`❌ Error: ${d.message}`, true);
        seeding = false;
        eventSource?.close();
      }
    };

    eventSource.onerror = () => {
      if (reconnectAttempts < 3) {
        reconnectAttempts++;
        addLog(`⚠️ Connection lost, reconnecting... (${reconnectAttempts}/3)`, true);
        setTimeout(() => startSSE(), 2000);
      } else {
        addLog('❌ Failed to maintain progress connection. Please refresh.', true);
        seeding = false;
        eventSource?.close();
      }
    };
  }

  function getStepStatus(index: number, current: number) {
    if (index < current) return 'completed';
    if (index === current) return 'active';
    return 'pending';
  }

  function getTotalRecords() {
    return seedSteps.reduce((acc, step) => acc + (step.total || 0), 0);
  }
</script>

<svelte:head>
  <title>Database Seed — MOUAU eTest</title>
</svelte:head>

<div class="page">
  <div class="container">
    
    <!-- Hero Header -->
    <header class="hero" class:first-run={data.isFirstRun}>
      <div class="hero-content">
        <div class="hero-badge">
          <Database size={20} strokeWidth={2}/>
          <span>Database Management</span>
        </div>
        <h1>Seed Database</h1>
        <p class="hero-desc">
          {#if data.isFirstRun}
            Initialize your database with demo data for the MOUAU eTest platform.
          {:else}
            Re-seed or reset your database. Admin privileges required.
          {/if}
        </p>
      </div>
      <div class="hero-visual">
        <div class="hero-ring"></div>
        <div class="hero-ring ring-2"></div>
        <Database size={48} strokeWidth={1.5} class="hero-icon"/>
      </div>
    </header>

    <!-- Stats Overview -->
    <section class="stats-bar">
      <div class="stat-item">
        <span class="stat-value">{Object.values(data.counts).reduce((a, b) => a + b, 0)}</span>
        <span class="stat-label">Total Records</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-value">{Object.values(data.counts).filter(v => v > 0).length}</span>
        <span class="stat-label">Tables Populated</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-value">{getTotalRecords()}</span>
        <span class="stat-label">Records to Seed</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-value" class:live={data.isFirstRun}>{data.isFirstRun ? '✅ Ready' : '🔒 Locked'}</span>
        <span class="stat-label">Status</span>
      </div>
    </section>

    <!-- Current Counts Grid -->
    <section class="counts-section">
      <h2 class="section-title">
        <Activity size={16}/>
        Current Database State
      </h2>
      <div class="counts-grid">
        {#each Object.entries(data.counts) as [key, val]}
          <div class="count-card" class:populated={val > 0}>
            <div class="count-indicator" class:active={val > 0}></div>
            <div class="count-info">
              <span class="count-number">{val}</span>
              <span class="count-name">{key}</span>
            </div>
            {#if val > 0}
              <CheckCircle2 size={14} class="count-check"/>
            {/if}
          </div>
        {/each}
      </div>
    </section>

    <!-- Progress Section -->
    {#if seeding}
      <section class="progress-card" transition:slide={{ duration: 300, easing: cubicOut }}>
        <div class="progress-header">
          <div class="progress-title">
            <div class="progress-pulse"></div>
            <span>Seeding in Progress</span>
          </div>
          <span class="progress-percentage">{Math.round((progress.current / progress.total) * 100)}%</span>
        </div>

        <div class="progress-track">
          <div class="progress-fill" style="width: {Math.min((progress.current / progress.total) * 100, 100)}%"></div>
        </div>

        <div class="progress-meta">
          <span class="progress-step-name">
            {#if progress.step}
              <Loader2 size={14} class="spin"/>
              {progress.step}
            {:else}
              Initializing...
            {/if}
          </span>
          {#if progress.detail}
            <span class="progress-detail">{progress.detail}</span>
          {/if}
          <span class="progress-fraction">{progress.current} of {progress.total} steps</span>
        </div>

        <!-- Step Visualizer -->
        <div class="step-timeline">
          {#each seedSteps as step, i}
            {@const status = getStepStatus(i, progress.current)}
            <div class="timeline-item {status}">
              <div class="timeline-connector" class:hidden={i === 0}></div>
              <div class="timeline-node" style="--step-color: {step.color}">
                {#if status === 'completed'}
                  <CheckCircle2 size={14}/>
                {:else if status === 'active'}
                  <Loader2 size={14} class="spin"/>
                {:else}
                  <svelte:component this={step.icon} size={14}/>
                {/if}
              </div>
              <div class="timeline-content">
                <span class="timeline-label">{step.label}</span>
                {#if step.total !== null}
                  <span class="timeline-count">~{step.total}</span>
                {/if}
              </div>
            </div>
          {/each}
        </div>

        <!-- Live Logs -->
        <div class="logs-section">
          <button class="logs-toggle" onclick={() => showLogs = !showLogs}>
            <Terminal size={14}/>
            <span>Live Terminal</span>
            <span class="logs-badge">{logs.length}</span>
<ChevronRight size={14} class={`logs-chevron ${showLogs ? 'rotated' : ''}`}/>
          </button>
          
          {#if showLogs}
            <div class="logs-panel" transition:slide={{ duration: 200 }}>
              {#if logs.length === 0}
                <div class="log-empty">⏳ Waiting for server response...</div>
              {:else}
                {#each logs as log, i}
                  <div class="log-entry" in:fade={{ delay: i * 20 }}>
                    {log}
                  </div>
                {/each}
              {/if}
            </div>
          {/if}
        </div>
      </section>
    {/if}

    <!-- Results -->
    {#if form?.success && form.results && !seeding}
      <section class="result-card success" transition:fly={{ y: 20, duration: 300 }}>
        <div class="result-icon-wrap">
          <Sparkles size={24}/>
        </div>
        <div class="result-content">
          <h3>✨ Seed Complete!</h3>
          <div class="result-lines">
            {#each form.results as line}
              <p>{line}</p>
            {/each}
          </div>
          <button class="refresh-btn" onclick={() => window.location.reload()}>
            <RotateCcw size={14}/>
            Refresh to see updated data
          </button>
        </div>
      </section>
    {:else if form?.error && !seeding}
      <section class="result-card error" transition:fly={{ y: 20, duration: 300 }}>
        <div class="result-icon-wrap error">
          <ShieldAlert size={24}/>
        </div>
        <div class="result-content">
          <h3>❌ Seed Failed</h3>
          <p class="error-message">{form.error}</p>
        </div>
      </section>
    {/if}

    <!-- Actions -->
    <section class="actions-section">
      <div class="actions-grid">
        <form method="POST" action="?/seed" use:enhance={() => {
          resetProgress();
          seeding = true;
          addLog('🚀 Starting seed process...');
          startSSE();
          return async ({ update }) => update();
        }}>
          <button class="action-btn seed-btn" disabled={seeding || resetting}>
            {#if seeding}
              <Loader2 size={18} class="spin"/>
              <span>Seeding Database...</span>
            {:else}
              <Sprout size={18}/>
              <span>Seed Database</span>
              <ArrowRight size={16} class="btn-arrow"/>
            {/if}
          </button>
        </form>

        <form method="POST" action="?/reset" use:enhance={() => {
          if (!confirm('⚠️ DANGER: This will permanently delete ALL data. This action cannot be undone. Continue?')) return () => {};
          resetting = true;
          addLog('🗑️ Resetting database...');
          return async ({ update }) => {
            const result = await update();
            resetting = false;
            if (result.success) {
              addLog('✅ Database reset complete!');
            } else {
              addLog('❌ Reset failed: ' + (result.error || 'Unknown error'), true);
            }
            setTimeout(() => window.location.reload(), 1500);
            return result;
          };
        }}>
          <button class="action-btn reset-btn" disabled={seeding || resetting}>
            {#if resetting}
              <Loader2 size={18} class="spin"/>
              <span>Resetting...</span>
            {:else}
              <Trash2 size={18}/>
              <span>Reset All Data</span>
            {/if}
          </button>
        </form>
      </div>
    </section>

    <!-- Info Panels -->
    {#if !seeding && !form}
      <div class="info-grid">
        <!-- Academic Calendar -->
        <section class="info-card">
          <div class="info-header">
            <CalendarDays size={16}/>
            <h3>Academic Calendar 2025/2026</h3>
          </div>
          <div class="semesters-grid">
            {#each semesterDefs as sem}
              <div class="semester-card" style="--sem-color: {sem.color}">
                <div class="semester-icon">
                  <svelte:component this={sem.icon} size={20}/>
                </div>
                <div class="semester-info">
                  <span class="semester-name">{sem.name}</span>
                  <span class="semester-months">{sem.months}</span>
                </div>
                <span class="semester-badge">{sem.short}</span>
              </div>
            {/each}
          </div>
        </section>

        <!-- Credit Caps -->
        <section class="info-card wide">
          <div class="info-header">
            <CreditCard size={16}/>
            <h3>Credit Caps per Level (100L & 200L)</h3>
          </div>
          <div class="caps-grid">
            {#each creditCapRows as row}
              <div class="cap-item">
                <div class="cap-level">{row.level}</div>
                <div class="cap-details">
                  <div class="cap-row">
                    <span class="cap-label">Sem 1</span>
                    <span class="cap-value">{row.sem1} CU</span>
                  </div>
                  <div class="cap-row">
                    <span class="cap-label">Sem 2</span>
                    <span class="cap-value">{row.sem2} CU</span>
                  </div>
                  <div class="cap-row">
                    <span class="cap-label">Carry</span>
                    <span class="cap-value" class:zero={row.carryOver === 0}>
                      {row.carryOver === 0 ? '—' : `${row.carryOver} CU`}
                    </span>
                  </div>
                  <div class="cap-row">
                    <span class="cap-label">Borrow</span>
                    <span class="cap-value">{row.borrowed} CU</span>
                  </div>
                </div>
              </div>
            {/each}
          </div>
          <p class="info-note">
            <Info size={12}/>
            100L has no carry-over credits as there is no previous level.
          </p>
        </section>

        <!-- What Gets Seeded -->
        <section class="info-card wide">
          <div class="info-header">
            <Layers size={16}/>
            <h3>Seed Overview</h3>
            <span class="seed-total">~{getTotalRecords()} records</span>
          </div>
          <div class="seed-list">
            {#each seedSteps as step, i}
              <div class="seed-item" style="--item-color: {step.color}">
                <div class="seed-number">{i + 1}</div>
                <div class="seed-icon">
                  <svelte:component this={step.icon} size={16}/>
                </div>
                <span class="seed-label">{step.label}</span>
                {#if step.total !== null}
                  <span class="seed-count">~{step.total}</span>
                {:else}
                  <span class="seed-count auto">auto</span>
                {/if}
              </div>
            {/each}
          </div>
        </section>
      </div>
    {/if}

    <!-- Test Scenarios Panel -->
    {#if !seeding && !form}
      <section class="info-card wide test-scenarios">
        <div class="info-header">
          <FlaskConical size={16} />
          <h3>What This Seed Sets Up for Testing</h3>
          <span class="seed-total">Read before testing</span>
        </div>

        <div class="scenario-grid">
          <div class="scenario-card">
            <div class="scenario-icon" style="background: rgba(239,68,68,0.1); color:#ef4444;">
              <UserX size={18} />
            </div>
            <div class="scenario-body">
              <h4>🧪 Eligibility Testing — Unregistered Students</h4>
              <p>
                ~30% of students have <strong>3–5 courses intentionally skipped</strong> during registration.
                100-level students only have gaps in <strong>Semester 2</strong>.
              </p>
              <div class="scenario-tip">
                <span class="tip-label">Test:</span>
                Set an exam on a skipped course — those students should be <strong>ineligible</strong>.
              </div>
            </div>
          </div>

          <div class="scenario-card">
            <div class="scenario-icon" style="background: rgba(245,158,11,0.1); color:#d97706;">
              <BookX size={18} />
            </div>
            <div class="scenario-body">
              <h4>📚 Carry-Over Students — 200L</h4>
              <p>
                Every 200L student has <strong>2 carry-over registrations</strong> from 100L
                with <code>status: pending</code> and <code>registrationType: carry_over</code>.
              </p>
              <div class="scenario-tip">
                <span class="tip-label">Test:</span>
                Set an exam on a carry-over course — student should appear eligible with carry-over status.
              </div>
            </div>
          </div>

          <div class="scenario-card">
            <div class="scenario-icon" style="background: rgba(16,185,129,0.1); color:#10b981;">
              <GraduationCap size={18} />
            </div>
            <div class="scenario-body">
              <h4>📖 Universal GST Courses — All 100L Students</h4>
              <p>
                All 100-level students across every college are registered for:
              </p>
              <ul class="scenario-list">
                <li><code>GST111</code> — Communication in English I <span class="sem-tag">Sem 1</span></li>
                <li><code>GST112</code> — Nigerian History and Culture <span class="sem-tag">Sem 1</span></li>
                <li><code>GST121</code> — Communication in English II <span class="sem-tag">Sem 2</span></li>
              </ul>
              <div class="scenario-tip">
                <span class="tip-label">Test:</span>
                Set a GST111 exam — students from ALL colleges should be eligible.
              </div>
            </div>
          </div>

          <div class="scenario-card">
            <div class="scenario-icon" style="background: rgba(99,102,241,0.1); color:#6366f1;">
              <Users size={18} />
            </div>
            <div class="scenario-body">
              <h4>🏛️ Multi-College Student Coverage</h4>
              <p>
                Students spread across <strong>12 colleges and 60+ departments</strong> including:
                COLPAS, CEET, COLMAS, COLNAS, CAFST, CCSS, CAERSE, CASAP, CNREM, COED, CVM, SGS.
              </p>
              <div class="scenario-tip">
                <span class="tip-label">Test:</span>
                Set department-specific exam — only students from that department should be eligible.
              </div>
            </div>
          </div>
        </div>

        <div class="credential-block">
          <h4>🔑 Default Login Credentials</h4>
          <div class="cred-grid">
            {#each [
              { role: 'Admin',        email: 'admin@mouau.edu.ng',        pass: 'admin123',       color: '#6366f1' },
              { role: 'HOD',          email: 'hod.csc@mouau.edu.ng',      pass: 'hod123',         color: '#7c3aed' },
              { role: 'Dean',         email: 'dean.colpas@mouau.edu.ng',  pass: 'dean123',        color: '#0ea5e9' },
              { role: 'Exam Officer', email: 'examofficer1@mouau.edu.ng', pass: 'examofficer123', color: '#f97316' },
              { role: 'VC/DVC',       email: 'vc@mouau.edu.ng',           pass: 'vcdvc123',       color: '#e11d48' },
              { role: 'Lecturer',     email: 'dr.okafor.csc@mouau.edu.ng', pass: 'lecturer123',   color: '#8b5cf6' },
              { role: 'Invigilator',  email: 'invig1@mouau.edu.ng',       pass: 'invigilator123', color: '#f59e0b' },
              { role: 'Student (CSC)',email: 'adebayo.adekunle@student.mouau.edu.ng', pass: 'student123', color: '#10b981' },
              { role: 'Student (GAP)',email: 'ade.adeleke@student.mouau.edu.ng', pass: 'student123', color: '#ef4444' },
            ] as cred}
              <div class="cred-row">
                <span class="cred-role" style="color:{cred.color}">{cred.role}</span>
                <code class="cred-email">{cred.email}</code>
                <code class="cred-pass">{cred.pass}</code>
              </div>
            {/each}
          </div>
          <p class="cred-note">
            <Info size={12} />
            "Student (GAP)" = <code>ade.adeleke@student.mouau.edu.ng</code> has intentional course gaps — use to test ineligibility.
            "Ogwo" accounts exist for every role for easy testing across all portals.
          </p>
        </div>
      </section>
    {/if}

    <!-- Warning -->
    <div class="warning-banner">
      <ShieldAlert size={16}/>
      <div class="warning-content">
        <strong>⚠️ Production Notice</strong>
        <span>Remove or protect this route before deploying to production.</span>
      </div>
    </div>

  </div>
</div>

<style>
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse { 
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.1); }
  }
  @keyframes ring-pulse {
    0% { transform: scale(0.8); opacity: 0.8; }
    100% { transform: scale(1.5); opacity: 0; }
  }
  
  :global(.spin) { animation: spin 1s linear infinite; }

  .page {
    min-height: 100vh;
    padding: 2rem 1rem;
    background: var(--color-bg);
    display: flex;
    justify-content: center;
  }

  .container {
    max-width: 800px;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  /* ── Hero ───────────────────────────────────────────────────────────── */
  .hero {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 2rem;
    background: linear-gradient(135deg, var(--color-surface) 0%, rgba(59, 130, 246, 0.03) 100%);
    border: 1px solid var(--color-border);
    border-radius: 1.5rem;
    position: relative;
    overflow: hidden;
  }

  .hero.first-run {
    background: linear-gradient(135deg, var(--color-surface) 0%, rgba(16, 185, 129, 0.05) 100%);
    border-color: rgba(16, 185, 129, 0.2);
  }

  .hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.35rem 0.875rem;
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
  }

  .hero h1 {
    font-size: 1.875rem;
    font-weight: 800;
    margin: 0;
    color: var(--color-text);
    letter-spacing: -0.025em;
  }

  .hero-desc {
    margin: 0.5rem 0 0;
    color: var(--color-muted);
    font-size: 0.875rem;
    max-width: 320px;
    line-height: 1.5;
  }

  .hero-visual {
    position: relative;
    width: 80px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #3b82f6;
  }

  :global(.hero-icon) {
    position: relative;
    z-index: 1;
  }

  .hero-ring {
    position: absolute;
    inset: 0;
    border: 2px solid rgba(59, 130, 246, 0.2);
    border-radius: 50%;
    animation: ring-pulse 3s ease-out infinite;
  }

  .ring-2 {
    animation-delay: 1.5s;
  }

  /* ── Stats Bar ────────────────────────────────────────────────────────── */
  .stats-bar {
    display: flex;
    align-items: center;
    justify-content: space-around;
    padding: 1.25rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--color-text);
    font-variant-numeric: tabular-nums;
  }

  .stat-value.live {
    color: #10b981;
  }

  .stat-label {
    font-size: 0.7rem;
    color: var(--color-muted);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .stat-divider {
    width: 1px;
    height: 2rem;
    background: var(--color-border);
  }

  @media (max-width: 500px) {
    .stat-divider { display: none; }
    .stats-bar { gap: 0.75rem; }
  }

  /* ── Counts ───────────────────────────────────────────────────────────── */
  .counts-section {
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-muted);
    margin: 0;
  }

  .counts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 0.625rem;
  }

  .count-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.875rem;
    position: relative;
    transition: all 0.2s ease;
  }

  .count-card.populated {
    border-color: rgba(59, 130, 246, 0.3);
    background: linear-gradient(135deg, var(--color-surface) 0%, rgba(59, 130, 246, 0.03) 100%);
  }

  .count-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-border);
    flex-shrink: 0;
  }

  .count-indicator.active {
    background: #10b981;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
  }

  .count-info {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
  }

  .count-number {
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--color-text);
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }

  .count-card.populated .count-number {
    color: #3b82f6;
  }

  .count-name {
    font-size: 0.7rem;
    color: var(--color-muted);
    text-transform: capitalize;
    margin-top: 0.125rem;
  }

  :global(.count-check) {
    color: #10b981;
    flex-shrink: 0;
  }

  /* ── Progress ─────────────────────────────────────────────────────────── */
  .progress-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1.25rem;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .progress-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .progress-title {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    font-weight: 700;
    color: var(--color-text);
  }

  .progress-pulse {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #10b981;
    animation: pulse 2s ease-in-out infinite;
  }

  .progress-percentage {
    font-size: 1.25rem;
    font-weight: 800;
    color: #3b82f6;
    font-variant-numeric: tabular-nums;
  }

  .progress-track {
    height: 8px;
    background: var(--color-bg);
    border-radius: 999px;
    overflow: hidden;
    position: relative;
  }

  .progress-fill {
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, #3b82f6, #6366f1, #8b5cf6);
    background-size: 200% 100%;
    transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
  }

  .progress-fill::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
    animation: shimmer 2s infinite;
  }

  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  .progress-meta {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    font-size: 0.8rem;
  }

  .progress-step-name {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    color: #3b82f6;
  }

  .progress-detail {
    color: var(--color-muted);
  }

  .progress-fraction {
    margin-left: auto;
    color: var(--color-muted);
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }

  /* Timeline */
  .step-timeline {
    display: flex;
    flex-direction: column;
    gap: 0;
    max-height: 300px;
    overflow-y: auto;
    padding-right: 0.5rem;
  }

  .step-timeline::-webkit-scrollbar { width: 4px; }
  .step-timeline::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 2px; }

  .timeline-item {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    padding: 0.5rem 0;
    position: relative;
    padding-left: 1.5rem;
  }

  .timeline-connector {
    position: absolute;
    left: 7px;
    top: -0.5rem;
    bottom: 50%;
    width: 2px;
    background: var(--color-border);
  }

  .timeline-connector.hidden { display: none; }

  .timeline-item.completed .timeline-connector {
    background: #3b82f6;
  }

  .timeline-node {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg);
    border: 2px solid var(--color-border);
    color: var(--color-muted);
    flex-shrink: 0;
    position: relative;
    z-index: 1;
    transition: all 0.3s ease;
  }

  .timeline-item.completed .timeline-node {
    background: #3b82f6;
    border-color: #3b82f6;
    color: white;
  }

  .timeline-item.active .timeline-node {
    background: var(--step-color);
    border-color: var(--step-color);
    color: white;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
  }

  .timeline-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex: 1;
    min-width: 0;
  }

  .timeline-label {
    font-size: 0.8rem;
    color: var(--color-text);
    font-weight: 500;
  }

  .timeline-item.active .timeline-label {
    font-weight: 700;
    color: var(--step-color);
  }

  .timeline-count {
    font-size: 0.7rem;
    color: var(--color-muted);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    background: var(--color-bg);
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
  }

  /* Logs */
  .logs-section {
    border-top: 1px solid var(--color-border);
    padding-top: 1rem;
  }

  .logs-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: none;
    border: none;
    color: var(--color-muted);
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    padding: 0;
    transition: color 0.15s;
    width: 100%;
  }

  .logs-toggle:hover {
    color: var(--color-text);
  }

  .logs-badge {
    background: var(--color-bg);
    color: var(--color-text);
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.7rem;
    font-weight: 700;
    border: 1px solid var(--color-border);
  }

  :global(.logs-chevron) {
    transition: transform 0.2s ease;
    margin-left: auto;
  }

  :global(.logs-chevron.rotated) {
    transform: rotate(90deg);
  }

  .logs-panel {
    margin-top: 0.75rem;
    background: #0f172a;
    border-radius: 0.75rem;
    padding: 1rem;
    max-height: 200px;
    overflow-y: auto;
    font-family: 'SF Mono', 'Cascadia Code', Monaco, monospace;
    font-size: 0.75rem;
    line-height: 1.7;
  }

  .logs-panel::-webkit-scrollbar { width: 4px; }
  .logs-panel::-webkit-scrollbar-thumb { background: #334155; border-radius: 2px; }

  .log-empty {
    color: #64748b;
    font-style: italic;
  }

  .log-entry {
    color: #4ade80;
    word-break: break-all;
  }

  /* ── Results ──────────────────────────────────────────────────────────── */
  .result-card {
    display: flex;
    gap: 1.25rem;
    padding: 1.5rem;
    border-radius: 1.25rem;
    border: 1px solid;
  }

  .result-card.success {
    background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
    border-color: #bbf7d0;
    color: #15803d;
  }

  .result-card.error {
    background: linear-gradient(135deg, #fef2f2 0%, #fef2f2 100%);
    border-color: #fecaca;
    color: #dc2626;
  }

  .result-icon-wrap {
    width: 48px;
    height: 48px;
    border-radius: 1rem;
    background: rgba(21, 128, 61, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .result-icon-wrap.error {
    background: rgba(220, 38, 38, 0.1);
  }

  .result-content h3 {
    margin: 0 0 0.5rem;
    font-size: 1.125rem;
    font-weight: 700;
  }

  .result-lines {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-bottom: 1rem;
  }

  .result-lines p {
    margin: 0;
    font-size: 0.8rem;
    opacity: 0.9;
  }

  .error-message {
    margin: 0;
    font-size: 0.875rem;
    opacity: 0.9;
  }

  .refresh-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: rgba(21, 128, 61, 0.1);
    border: 1px solid rgba(21, 128, 61, 0.2);
    color: #15803d;
    border-radius: 0.5rem;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
  }

  .refresh-btn:hover {
    background: rgba(21, 128, 61, 0.2);
    transform: translateY(-1px);
  }

  /* ── Actions ────────────────────────────────────────────────────────── */
  .actions-section {
    margin-top: 0.5rem;
  }

  .actions-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.625rem;
    width: 100%;
    padding: 1rem 1.5rem;
    border: none;
    border-radius: 1rem;
    font-size: 0.9375rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    overflow: hidden;
  }

  .action-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
  }

  .seed-btn {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    box-shadow: 0 4px 14px -2px rgba(59, 130, 246, 0.4);
  }

  .seed-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px -4px rgba(59, 130, 246, 0.5);
  }

  .seed-btn:active:not(:disabled) {
    transform: translateY(0);
  }

  :global(.btn-arrow) {
    transition: transform 0.2s ease;
  }

  .seed-btn:hover:not(:disabled) :global(.btn-arrow) {
    transform: translateX(3px);
  }

  .reset-btn {
    background: var(--color-surface);
    color: #dc2626;
    border: 2px solid rgba(220, 38, 38, 0.15);
  }

  .reset-btn:hover:not(:disabled) {
    background: #fef2f2;
    border-color: rgba(220, 38, 38, 0.3);
    transform: translateY(-2px);
    box-shadow: 0 4px 14px -2px rgba(220, 38, 38, 0.15);
  }

  @media (max-width: 500px) {
    .actions-grid { grid-template-columns: 1fr; }
  }

  /* ── Info Grid ────────────────────────────────────────────────────────── */
  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .info-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1.25rem;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .info-card.wide {
    grid-column: 1 / -1;
  }

  .info-header {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    color: var(--color-muted);
  }

  .info-header h3 {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--color-text);
    flex: 1;
  }

  .seed-total {
    font-size: 0.75rem;
    color: #3b82f6;
    font-weight: 700;
    background: rgba(59, 130, 246, 0.1);
    padding: 0.25rem 0.75rem;
    border-radius: 0.5rem;
  }

  @media (max-width: 640px) {
    .info-grid { grid-template-columns: 1fr; }
  }

  /* Semesters */
  .semesters-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  .semester-card {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    padding: 1rem;
    border-radius: 1rem;
    border: 1.5px solid var(--sem-color);
    background: color-mix(in srgb, var(--sem-color) 5%, var(--color-surface));
    position: relative;
  }

  .semester-icon {
    width: 40px;
    height: 40px;
    border-radius: 0.75rem;
    background: var(--sem-color);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .semester-info {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
  }

  .semester-name {
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--sem-color);
  }

  .semester-months {
    font-size: 0.75rem;
    color: var(--color-muted);
    margin-top: 0.125rem;
  }

  .semester-badge {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    font-size: 0.65rem;
    font-weight: 700;
    color: var(--sem-color);
    opacity: 0.5;
  }

  @media (max-width: 500px) {
    .semesters-grid { grid-template-columns: 1fr; }
  }

  /* Credit Caps */
  .caps-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 0.75rem;
  }

  .cap-item {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.875rem;
    overflow: hidden;
  }

  .cap-level {
    padding: 0.5rem 0.875rem;
    background: rgba(59, 130, 246, 0.08);
    color: #3b82f6;
    font-weight: 800;
    font-size: 0.875rem;
    font-family: monospace;
  }

  .cap-details {
    padding: 0.625rem 0.875rem;
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .cap-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.75rem;
  }

  .cap-label {
    color: var(--color-muted);
    font-weight: 500;
  }

  .cap-value {
    font-weight: 700;
    color: var(--color-text);
    font-variant-numeric: tabular-nums;
  }

  .cap-value.zero {
    color: var(--color-muted);
  }

  .info-note {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    margin: 0;
    font-size: 0.7rem;
    color: var(--color-muted);
  }

  /* Seed List */
  .seed-list {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .seed-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.625rem 0.875rem;
    border-radius: 0.625rem;
    transition: all 0.15s ease;
    border: 1px solid transparent;
  }

  .seed-item:hover {
    background: var(--color-bg);
    border-color: var(--color-border);
  }

  .seed-number {
    width: 22px;
    height: 22px;
    border-radius: 0.375rem;
    background: var(--item-color);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.65rem;
    font-weight: 800;
    flex-shrink: 0;
  }

  .seed-icon {
    color: var(--item-color);
    opacity: 0.8;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .seed-label {
    flex: 1;
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--color-text);
  }

  .seed-count {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--item-color);
    background: color-mix(in srgb, var(--item-color) 10%, transparent);
    padding: 0.2rem 0.625rem;
    border-radius: 0.375rem;
    font-variant-numeric: tabular-nums;
  }

  .seed-count.auto {
    color: var(--color-muted);
    background: var(--color-bg);
  }

  /* ── Test Scenarios ───────────────────────────────────────────────────── */
  .test-scenarios {
    background: linear-gradient(135deg, var(--color-surface) 0%, rgba(99,102,241,0.02) 100%);
  }

  .scenario-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .scenario-card {
    display: flex;
    gap: 0.875rem;
    padding: 1rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.875rem;
    transition: border-color 0.15s;
  }

  .scenario-card:hover {
    border-color: rgba(99,102,241,0.3);
  }

  .scenario-icon {
    width: 40px;
    height: 40px;
    border-radius: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .scenario-body {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex: 1;
    min-width: 0;
  }

  .scenario-body h4 {
    margin: 0;
    font-size: 0.82rem;
    font-weight: 800;
    color: var(--color-text);
    line-height: 1.3;
  }

  .scenario-body p {
    margin: 0;
    font-size: 0.78rem;
    color: var(--color-muted);
    line-height: 1.6;
  }

  .scenario-body strong { color: var(--color-text); }

  .scenario-body code {
    font-family: monospace;
    font-size: 0.75rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    padding: 0.1rem 0.35rem;
    border-radius: 0.25rem;
    color: var(--color-text);
  }

  .scenario-list {
    margin: 0.25rem 0 0;
    padding-left: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.78rem;
    color: var(--color-muted);
    list-style: none;
    padding: 0;
  }

  .scenario-list li {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-wrap: wrap;
  }

  .sem-tag {
    font-size: 0.65rem;
    font-weight: 700;
    padding: 0.1rem 0.4rem;
    background: rgba(99,102,241,0.1);
    color: #6366f1;
    border-radius: 0.25rem;
  }

  .scenario-tip {
    display: flex;
    gap: 0.4rem;
    padding: 0.5rem 0.75rem;
    background: color-mix(in srgb, #6366f1 6%, var(--color-surface));
    border: 1px solid color-mix(in srgb, #6366f1 20%, transparent);
    border-radius: 0.5rem;
    font-size: 0.75rem;
    color: var(--color-text);
    line-height: 1.5;
    flex-wrap: wrap;
  }

  .tip-label {
    font-weight: 800;
    color: #6366f1;
    flex-shrink: 0;
  }

  @media (max-width: 640px) {
    .scenario-grid { grid-template-columns: 1fr; }
  }

  /* ── Credentials ──────────────────────────────────────────────────────── */
  .credential-block {
    border-top: 1px solid var(--color-border);
    padding-top: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .credential-block h4 {
    margin: 0;
    font-size: 0.82rem;
    font-weight: 800;
    color: var(--color-text);
  }

  .cred-grid {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .cred-row {
    display: grid;
    grid-template-columns: 130px 1fr auto;
    align-items: center;
    gap: 0.75rem;
    padding: 0.4rem 0.75rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    font-size: 0.75rem;
  }

  .cred-role {
    font-weight: 700;
    font-size: 0.72rem;
    white-space: nowrap;
  }

  .cred-email {
    font-family: monospace;
    font-size: 0.72rem;
    color: var(--color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .cred-pass {
    font-family: monospace;
    font-size: 0.72rem;
    color: var(--color-muted);
    white-space: nowrap;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    padding: 0.15rem 0.5rem;
    border-radius: 0.3rem;
  }

  .cred-note {
    display: flex;
    align-items: flex-start;
    gap: 0.4rem;
    margin: 0;
    font-size: 0.72rem;
    color: var(--color-muted);
    line-height: 1.55;
  }

  @media (max-width: 640px) {
    .cred-row { grid-template-columns: 1fr; gap: 0.25rem; }
  }

  /* ── Warning ─────────────────────────────────────────────────────────── */
  .warning-banner {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    padding: 1rem 1.25rem;
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(245, 158, 11, 0.04) 100%);
    border: 1px solid rgba(245, 158, 11, 0.2);
    border-radius: 1rem;
    color: #d97706;
  }

  .warning-content {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .warning-content strong {
    font-size: 0.8rem;
    font-weight: 700;
  }

  .warning-content span {
    font-size: 0.75rem;
    opacity: 0.9;
  }
</style>