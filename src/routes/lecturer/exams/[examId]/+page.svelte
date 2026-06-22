<!-- src/routes/lecturer/exams/[examId]/+page.svelte -->
<script lang="ts">
  import type { ActionData, PageData } from './$types';
  import { enhance } from '$app/forms';
  import {
    ChevronLeft, BarChart2, Clock, Users, ShieldAlert,
    Layers, FileText, Timer, Check, Shuffle, Eye, LogIn,
    AlertTriangle, TrendingUp, Scale, BookOpen, FileEdit,
    Zap, X, CheckCircle2, XCircle, CalendarClock, Hash,
    GripVertical, Info
  } from '@lucide/svelte';
  import { fly, fade, scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  const exam = $derived(data.exam);

  // ── Display helpers ───────────────────────────────────────────────────────
  const levelDisplay = $derived(
    exam.levels.length === 0
      ? 'All levels'
      : [...exam.levels].sort((a: any, b: any) => a.level - b.level).map((l: any) => `${l.level}L`).join(', ')
  );
  const deptDisplay = $derived(
    !exam.department || exam.department.trim() === ''
      ? 'All departments'
      : exam.department
  );

  const STATUS_META: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    draft:     { label: 'Draft',     color: '#64748b', bg: 'rgba(100,116,139,0.12)', dot: '#94a3b8' },
    scheduled: { label: 'Scheduled', color: '#2563eb', bg: 'rgba(37,99,235,0.1)',    dot: '#3b82f6' },
    active:    { label: 'Active',    color: '#16a34a', bg: 'rgba(22,163,74,0.1)',    dot: '#22c55e' },
    completed: { label: 'Completed', color: '#7c3aed', bg: 'rgba(124,58,237,0.1)',   dot: '#a78bfa' },
    cancelled: { label: 'Cancelled', color: '#dc2626', bg: 'rgba(220,38,38,0.1)',    dot: '#f87171' },
  };

  const meta = $derived(STATUS_META[exam.status] ?? STATUS_META.draft);
  const editable = $derived(exam.status === 'draft' || exam.status === 'scheduled');

  // ── Invigilators ──────────────────────────────────────────────────────────
  const assignedIds           = $derived(new Set(exam.invigilators.map((i: any) => i.invigilatorId)));
  const availableInvigilators = $derived(data.invigilators.filter((i: any) => !assignedIds.has(i.id)));

  // ── Confirm modals ────────────────────────────────────────────────────────
  let confirmAction = $state<'publish' | 'cancel' | 'unpublish' | null>(null);

  const CONFIRM_COPY = {
    publish:   {
      title:   'Publish exam?',
      body:    'This will make the exam visible to eligible students. It will go live automatically at the scheduled start time.',
      confirm: 'Publish',
      danger:  false,
    },
    unpublish: {
      title:   'Move back to draft?',
      body:    'The exam will become invisible to students again. You can re-publish it later.',
      confirm: 'Move to draft',
      danger:  false,
    },
    cancel: {
      title:   'Cancel exam?',
      body:    'This will permanently cancel the exam. Students will not be able to sit it. This cannot be undone.',
      confirm: 'Yes, cancel exam',
      danger:  true,
    },
  };

  // ── Formatting ────────────────────────────────────────────────────────────
  const MONTH = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function fmtDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return `${MONTH[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} · ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }

  const caWeight     = $derived(Math.max(0, 100 - exam.totalMarks));
  const passPercent  = $derived(exam.totalMarks > 0 ? Math.round((exam.passMark / exam.totalMarks) * 100) : 0);
</script>

<svelte:head><title>{exam.title} — MOUAU eTest</title></svelte:head>

<!-- ── Confirm modal ─────────────────────────────────────────────────────── -->
{#if confirmAction}
  {@const copy = CONFIRM_COPY[confirmAction]}
  <div
    class="modal-bg"
    transition:fade={{ duration: 180 }}
    onclick={() => (confirmAction = null)}
    role="dialog" aria-modal="true"
  >
    <div
      class="confirm-modal"
      transition:scale={{ duration: 220, easing: cubicOut, start: 0.95 }}
      onclick={e => e.stopPropagation()}
    >
      <div class="confirm-icon" class:danger={copy.danger}>
        {#if copy.danger}<XCircle size={22} />{:else}<CheckCircle2 size={22} />{/if}
      </div>
      <h3>{copy.title}</h3>
      <p>{copy.body}</p>
      <div class="confirm-actions">
        <button type="button" class="btn ghost" onclick={() => (confirmAction = null)}>
          Cancel
        </button>
        <form method="POST" action="?/{confirmAction}" use:enhance={() => {
          confirmAction = null;
          return async ({ update }) => { await update(); };
        }}>
          <button type="submit" class="btn" class:primary={!copy.danger} class:danger={copy.danger}>
            {copy.confirm}
          </button>
        </form>
      </div>
    </div>
  </div>
{/if}

<div class="page">

  <!-- ── Back + title ──────────────────────────────────────────────────── -->
  <header class="page-header">
    <div class="header-left">
      <a class="back-link" href="/lecturer/exams">
        <ChevronLeft size={14} strokeWidth={2.5} /> All exams
      </a>
      <h1>{exam.title}</h1>
      <p class="course-meta">
        {exam.course?.code} — {exam.course?.title}
        · {exam.session} · Semester {exam.semester}
      </p>
    </div>
    <span class="status-pill" style="background:{meta.bg}; color:{meta.color};">
      <span class="status-dot" style="background:{meta.dot};"></span>
      {meta.label}
    </span>
  </header>

  <!-- ── Banners ───────────────────────────────────────────────────────── -->
  {#if form?.message}
    <div class="banner error" transition:fly={{ y: -6, duration: 180 }}>
      <AlertTriangle size={14} /> {form.message}
    </div>
  {/if}
  {#if form?.success}
    <div class="banner success" transition:fly={{ y: -6, duration: 180 }}>
      <Check size={14} /> Done.
    </div>
  {/if}

  <!-- ── Two-column layout ─────────────────────────────────────────────── -->
  <div class="main-grid">

    <!-- ══ LEFT — all config previews ══════════════════════════════════ -->
    <div class="left-col">

      <!-- Basics -->
      <div class="preview-card">
        <div class="preview-card-header">
          <span class="pch-icon"><BookOpen size={14} /></span>
          <span class="pch-title">Basics</span>
        </div>
        <div class="preview-rows">
          <div class="preview-row">
            <span class="pr-label">Title</span>
            <span class="pr-value">{exam.title}</span>
          </div>
          <div class="preview-row">
            <span class="pr-label">Course</span>
            <span class="pr-value">{exam.course?.code} — {exam.course?.title}</span>
          </div>
          <div class="preview-row">
            <span class="pr-label">Session</span>
            <span class="pr-value">{exam.session}</span>
          </div>
          <div class="preview-row">
            <span class="pr-label">Semester</span>
            <span class="pr-value">{exam.semester === 1 ? 'First' : 'Second'} Semester</span>
          </div>
          {#if exam.instructions}
            <div class="preview-row stacked">
              <span class="pr-label">Instructions</span>
              <span class="pr-value instructions-text">{exam.instructions}</span>
            </div>
          {/if}
        </div>
      </div>

      <!-- Scope -->
      <div class="preview-card">
        <div class="preview-card-header">
          <span class="pch-icon"><Users size={14} /></span>
          <span class="pch-title">Eligibility Scope</span>
          <span class="pch-badge">Set at creation · read-only</span>
        </div>
        <div class="preview-rows">
          <div class="preview-row">
            <span class="pr-label">Eligible levels</span>
            <span class="pr-value">{levelDisplay}</span>
          </div>
          <div class="preview-row">
            <span class="pr-label">Departments</span>
            <span class="pr-value">{deptDisplay}</span>
          </div>
          <div class="preview-row">
            <span class="pr-label">Eligible students</span>
            <span class="pr-value accent">{data.eligibleCount}</span>
          </div>
        </div>
      </div>

      <!-- Timing -->
      <div class="preview-card">
        <div class="preview-card-header">
          <span class="pch-icon"><Clock size={14} /></span>
          <span class="pch-title">Timing</span>
        </div>
        <div class="preview-rows">
          <div class="preview-row">
            <span class="pr-label">Scheduled start</span>
            <span class="pr-value">{fmtDate(exam.scheduledStart?.toString())}</span>
          </div>
          <div class="preview-row">
            <span class="pr-label">Scheduled end</span>
            <span class="pr-value">{fmtDate(exam.scheduledEnd?.toString())}</span>
          </div>
          <div class="preview-row">
            <span class="pr-label">Duration</span>
            <span class="pr-value">{exam.durationMinutes} minutes</span>
          </div>
          <div class="preview-row">
            <span class="pr-label">Late entry</span>
            <span class="pr-value">
              {exam.allowLateEntry ? `Allowed — ${exam.lateEntryMinutes} min grace` : 'Not allowed'}
            </span>
          </div>
        </div>
      </div>

      <!-- Scoring -->
      <div class="preview-card">
        <div class="preview-card-header">
          <span class="pch-icon"><Scale size={14} /></span>
          <span class="pch-title">Scoring</span>
        </div>
        <div class="preview-rows">
          <div class="preview-row">
            <span class="pr-label">Exam weight</span>
            <span class="pr-value">{exam.totalMarks} / 100 marks</span>
          </div>
          <div class="preview-row">
            <span class="pr-label">CA weight</span>
            <span class="pr-value">{caWeight} / 100 marks</span>
          </div>
          <div class="preview-row">
            <span class="pr-label">Pass mark</span>
            <span class="pr-value">
              {exam.passMark} / {exam.totalMarks} ({passPercent}% of exam)
            </span>
          </div>
          <div class="preview-row">
            <span class="pr-label">Show result</span>
            <span class="pr-value">
              {exam.showResultAfter ? 'Immediately after submission' : 'After lecturer release'}
            </span>
          </div>
        </div>
      </div>

      <!-- Questions & Integrity -->
      <div class="preview-card">
        <div class="preview-card-header">
          <span class="pch-icon"><FileText size={14} /></span>
          <span class="pch-title">Questions &amp; Integrity</span>
        </div>
        <div class="preview-rows">
          <div class="preview-row">
            <span class="pr-label">Question pool</span>
            <span class="pr-value">
              {exam.questionsToPresent > 0
                ? `${exam.questionsToPresent} per student (from ${exam._count.questions} total)`
                : `All ${exam._count.questions} questions`}
            </span>
          </div>
          <div class="preview-row">
            <span class="pr-label">Randomize questions</span>
            <span class="pr-value">{exam.randomizeQuestions ? 'Yes — shuffled per student' : 'No — fixed order'}</span>
          </div>
          <div class="preview-row">
            <span class="pr-label">Randomize options</span>
            <span class="pr-value">{exam.randomizeOptions ? 'Yes — MCQ choices shuffled' : 'No — fixed order'}</span>
          </div>
          <div class="preview-row">
            <span class="pr-label">Max violations</span>
            <span class="pr-value" class:warn={exam.maxViolations <= 2}>
              {exam.maxViolations} before auto-submit
            </span>
          </div>
          <div class="preview-row">
            <span class="pr-label">Sessions started</span>
            <span class="pr-value accent">{exam._count.examSessions}</span>
          </div>
        </div>
      </div>

      <!-- Invigilators — interactive -->
      <div class="preview-card">
        <div class="preview-card-header">
          <span class="pch-icon"><Users size={14} /></span>
          <span class="pch-title">Invigilators</span>
          <span class="pch-count">{exam.invigilators.length}</span>
        </div>

        <div class="invig-body">
          {#if exam.invigilators.length === 0}
            <p class="invig-empty">No invigilators assigned yet.</p>
          {:else}
            <ul class="invig-list">
              {#each exam.invigilators as inv (inv.invigilatorId)}
                <li class="invig-item">
                  <div class="invig-avatar">
                    {inv.invigilator.fullName.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()}
                  </div>
                  <div class="invig-info">
                    <span class="invig-name">{inv.invigilator.fullName}</span>
                    <span class="invig-id">{inv.invigilator.staffId ?? inv.invigilator.email}</span>
                  </div>
                  <form method="POST" action="?/remove_invigilator" use:enhance>
                    <input type="hidden" name="invigilatorId" value={inv.invigilatorId} />
                    <button class="invig-remove" type="submit" title="Remove invigilator">
                      <X size={13} />
                    </button>
                  </form>
                </li>
              {/each}
            </ul>
          {/if}

          {#if availableInvigilators.length > 0}
            <form method="POST" action="?/assign_invigilator" use:enhance class="invig-add">
              <select name="invigilatorId" required>
                <option value="" disabled selected>Select invigilator…</option>
                {#each availableInvigilators as inv}
                  <option value={inv.id}>{inv.fullName} ({inv.staffId ?? inv.email})</option>
                {/each}
              </select>
              <button class="btn primary small" type="submit">Assign</button>
            </form>
          {/if}
        </div>
      </div>

    </div>

    <!-- ══ RIGHT — sticky action panel ═════════════════════════════════ -->
    <div class="right-col">
      <div class="action-panel">

        <!-- Status indicator -->
        <div class="ap-status" style="background:{meta.bg}; border-color: color-mix(in srgb, {meta.color} 30%, transparent);">
          <span class="ap-status-dot" style="background:{meta.dot};"></span>
          <div class="ap-status-text">
            <span class="ap-status-label">{meta.label}</span>
            <span class="ap-status-desc">
              {#if exam.status === 'draft'}Draft — invisible to students{:else if exam.status === 'scheduled'}Goes live at scheduled time{:else if exam.status === 'active'}Currently live for eligible students{:else if exam.status === 'completed'}This exam has ended{:else}Exam was cancelled{/if}
            </span>
          </div>
        </div>

        <!-- Quick stats -->
        <div class="ap-stats">
          <div class="ap-stat">
            <span class="ap-stat-n">{exam._count.questions}</span>
            <span class="ap-stat-l">Questions</span>
          </div>
          <div class="ap-stat-div"></div>
          <div class="ap-stat">
            <span class="ap-stat-n">{data.eligibleCount}</span>
            <span class="ap-stat-l">Eligible</span>
          </div>
          <div class="ap-stat-div"></div>
          <div class="ap-stat">
            <span class="ap-stat-n">{exam._count.examSessions}</span>
            <span class="ap-stat-l">Started</span>
          </div>
        </div>

        <div class="ap-divider"></div>

        <!-- Primary actions -->
        <div class="ap-actions">
          <!-- Manage questions — always available -->
          <a href="/lecturer/exams/{exam.id}/questions" class="btn primary full">
            <FileEdit size={14} /> Manage Questions
          </a>

          {#if exam.status === 'draft'}
            <button type="button" class="btn scheduled full"
              onclick={() => (confirmAction = 'publish')}
              disabled={!exam.scheduledStart || !exam.scheduledEnd || exam._count.questions === 0}
            >
              <Zap size={14} /> Publish Exam
            </button>
            <button type="button" class="btn danger full" onclick={() => (confirmAction = 'cancel')}>
              <XCircle size={14} /> Cancel Exam
            </button>
          {:else if exam.status === 'scheduled'}
            <button type="button" class="btn ghost full" onclick={() => (confirmAction = 'unpublish')}>
              <FileText size={14} /> Move to Draft
            </button>
            <button type="button" class="btn danger full" onclick={() => (confirmAction = 'cancel')}>
              <XCircle size={14} /> Cancel Exam
            </button>
          {:else if exam.status === 'active' || exam.status === 'completed'}
            <a href="/lecturer/results/{exam.id}" class="btn ghost full">
              <BarChart2 size={14} /> View Results
            </a>
          {/if}
        </div>

        <!-- Publish guard hints for draft -->
        {#if exam.status === 'draft'}
          <div class="ap-checklist">
            <div class="ap-check" class:ok={!!exam.scheduledStart && !!exam.scheduledEnd}>
              {#if exam.scheduledStart && exam.scheduledEnd}
                <CheckCircle2 size={13} />
              {:else}
                <Info size={13} />
              {/if}
              Schedule set
            </div>
            <div class="ap-check" class:ok={exam._count.questions > 0}>
              {#if exam._count.questions > 0}
                <CheckCircle2 size={13} />
              {:else}
                <Info size={13} />
              {/if}
              At least 1 question
            </div>
          </div>
        {/if}

        <div class="ap-divider"></div>

        <!-- Scoring summary -->
        <div class="ap-summary">
          <div class="ap-sum-title">Scoring</div>
          <div class="ap-sum-row">
            <span>Exam weight</span>
            <strong>{exam.totalMarks}/100</strong>
          </div>
          <div class="ap-sum-row">
            <span>Pass mark</span>
            <strong>{exam.passMark} pts ({passPercent}%)</strong>
          </div>
          <div class="ap-sum-row">
            <span>Duration</span>
            <strong>{exam.durationMinutes} min</strong>
          </div>
        </div>

      </div>
    </div>

  </div>
</div>

<style>
  .page {
    max-width: 1100px; margin: 0 auto;
    padding: 1.75rem 2rem 4rem;
    display: flex; flex-direction: column; gap: 1.25rem;
  }

  /* ── Header ──────────────────────────────────────────────────────────────── */
  .page-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 1rem; flex-wrap: wrap;
    padding-bottom: 1.25rem; border-bottom: 1px solid var(--color-border);
  }
  .header-left { display: flex; flex-direction: column; gap: 0.2rem; }
  .back-link {
    display: inline-flex; align-items: center; gap: 0.2rem;
    font-size: 0.75rem; font-weight: 600; color: var(--lc-600, #4f46e5);
    text-decoration: none; margin-bottom: 0.3rem; transition: gap 0.12s;
  }
  .back-link:hover { gap: 0.4rem; }
  .page-header h1 {
    font-size: 1.6rem; font-weight: 900; letter-spacing: -0.035em;
    color: var(--color-text); margin: 0;
  }
  .course-meta { font-size: 0.82rem; color: var(--color-muted); margin: 0; }

  .status-pill {
    display: inline-flex; align-items: center; gap: 0.4rem;
    font-size: 0.72rem; font-weight: 700;
    padding: 0.35rem 0.75rem; border-radius: 999px;
    flex-shrink: 0; margin-top: 0.25rem; white-space: nowrap;
  }
  .status-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

  /* ── Banners ─────────────────────────────────────────────────────────────── */
  .banner {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.75rem 1rem; border-radius: 0.625rem;
    font-size: 0.85rem; font-weight: 600;
  }
  .banner.error   { background: rgba(239,68,68,0.08);  color: #ef4444; border: 1px solid rgba(239,68,68,0.2); }
  .banner.success { background: rgba(34,197,94,0.08);  color: #15803d; border: 1px solid rgba(34,197,94,0.2); }

  /* ── Main grid ───────────────────────────────────────────────────────────── */
  .main-grid {
    display: grid;
    grid-template-columns: 1fr 260px;
    gap: 1.25rem;
    align-items: start;
  }
  @media (max-width: 860px) {
    .main-grid { grid-template-columns: 1fr; }
    .right-col { order: -1; }
  }

  .left-col  { display: flex; flex-direction: column; gap: 1rem; }
  .right-col { position: sticky; top: 1.25rem; }

  /* ── Preview cards ───────────────────────────────────────────────────────── */
  .preview-card {
    background: var(--color-surface);
    border: 1.5px solid var(--color-border);
    border-radius: 0.875rem;
    overflow: hidden;
  }
  .preview-card-header {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.625rem 1rem;
    background: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
  }
  .pch-icon {
    width: 26px; height: 26px; border-radius: 0.35rem; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    background: var(--lc-soft, rgba(79,70,229,0.08));
    color: var(--lc-600, #4f46e5);
  }
  .pch-title { font-size: 0.78rem; font-weight: 700; color: var(--color-text); flex: 1; }
  .pch-badge {
    font-size: 0.6rem; font-weight: 700; padding: 0.1rem 0.45rem;
    border-radius: 0.3rem; background: var(--color-border); color: var(--color-muted);
    text-transform: uppercase; letter-spacing: 0.04em;
  }
  .pch-count {
    font-size: 0.68rem; font-weight: 800;
    padding: 0.1rem 0.45rem; border-radius: 999px;
    background: var(--lc-soft, rgba(79,70,229,0.08));
    color: var(--lc-600, #4f46e5);
  }

  /* ── Preview rows ────────────────────────────────────────────────────────── */
  .preview-rows { display: flex; flex-direction: column; }
  .preview-row {
    display: flex; align-items: baseline; justify-content: space-between;
    gap: 1rem; padding: 0.6rem 1rem;
    border-bottom: 1px solid var(--color-border);
    transition: background 0.1s;
  }
  .preview-row:last-child { border-bottom: none; }
  .preview-row:hover { background: var(--lc-soft, rgba(79,70,229,0.03)); }
  .preview-row.stacked { flex-direction: column; gap: 0.25rem; align-items: flex-start; }

  .pr-label {
    font-size: 0.75rem; font-weight: 600; color: var(--color-muted);
    white-space: nowrap; flex-shrink: 0;
  }
  .pr-value {
    font-size: 0.8rem; font-weight: 600; color: var(--color-text);
    text-align: right; line-height: 1.4;
  }
  .pr-value.accent { color: var(--lc-600, #4f46e5); font-weight: 700; }
  .pr-value.warn   { color: #d97706; }
  .instructions-text {
    font-size: 0.78rem; font-weight: 400; color: var(--color-muted);
    text-align: left; line-height: 1.6; white-space: pre-wrap;
  }

  /* ── Invigilators ────────────────────────────────────────────────────────── */
  .invig-body { padding: 0.75rem 1rem; display: flex; flex-direction: column; gap: 0.625rem; }
  .invig-empty { font-size: 0.78rem; color: var(--color-muted); margin: 0; }
  .invig-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.4rem; }
  .invig-item {
    display: flex; align-items: center; gap: 0.625rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--color-border); border-radius: 0.625rem;
    background: var(--color-bg);
  }
  .invig-avatar {
    width: 28px; height: 28px; border-radius: 0.4rem; flex-shrink: 0;
    background: var(--lc-soft, rgba(79,70,229,0.1));
    color: var(--lc-600, #4f46e5);
    display: flex; align-items: center; justify-content: center;
    font-size: 0.6rem; font-weight: 800;
  }
  .invig-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.05rem; }
  .invig-name { font-size: 0.8rem; font-weight: 600; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .invig-id   { font-size: 0.68rem; color: var(--color-muted); }
  .invig-remove {
    width: 26px; height: 26px; border-radius: 0.375rem; flex-shrink: 0;
    border: 1px solid transparent; background: none; cursor: pointer;
    color: var(--color-muted); display: flex; align-items: center; justify-content: center;
    transition: all 0.15s; padding: 0;
  }
  .invig-remove:hover { background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.2); color: #ef4444; }
  .invig-add {
    display: flex; gap: 0.5rem; padding-top: 0.25rem;
  }
  .invig-add select {
    flex: 1; padding: 0.5rem 0.75rem;
    border: 1.5px solid var(--color-border); border-radius: 0.5rem;
    background: var(--color-bg); color: var(--color-text);
    font-size: 0.82rem; font-family: inherit; outline: none;
    transition: border-color 0.15s;
  }
  .invig-add select:focus { border-color: var(--lc-600, #4f46e5); }

  /* ── Action panel (right col) ────────────────────────────────────────────── */
  .action-panel {
    background: var(--color-surface);
    border: 1.5px solid var(--color-border);
    border-radius: 0.875rem;
    overflow: hidden;
    display: flex; flex-direction: column; gap: 0;
  }

  .ap-status {
    display: flex; align-items: center; gap: 0.625rem;
    padding: 0.875rem 1rem;
    border-bottom: 1px solid var(--color-border);
    border: 1.5px solid transparent;
    border-radius: 0.875rem 0.875rem 0 0;
  }
  .ap-status-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .ap-status-text { display: flex; flex-direction: column; gap: 0.05rem; }
  .ap-status-label { font-size: 0.8rem; font-weight: 800; color: var(--color-text); }
  .ap-status-desc  { font-size: 0.68rem; color: var(--color-muted); }

  .ap-stats {
    display: flex; align-items: center;
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--color-border);
  }
  .ap-stat { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.05rem; }
  .ap-stat-n { font-size: 1.15rem; font-weight: 900; color: var(--color-text); letter-spacing: -0.03em; line-height: 1; }
  .ap-stat-l { font-size: 0.58rem; font-weight: 600; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 0.1rem; }
  .ap-stat-div { width: 1px; height: 24px; background: var(--color-border); flex-shrink: 0; }

  .ap-divider { height: 1px; background: var(--color-border); }

  .ap-actions { padding: 0.875rem; display: flex; flex-direction: column; gap: 0.5rem; }

  .ap-checklist {
    padding: 0 0.875rem 0.875rem;
    display: flex; flex-direction: column; gap: 0.35rem;
  }
  .ap-check {
    display: flex; align-items: center; gap: 0.4rem;
    font-size: 0.72rem; font-weight: 600; color: var(--color-muted);
  }
  .ap-check.ok { color: #16a34a; }

  .ap-summary { padding: 0.875rem; display: flex; flex-direction: column; gap: 0.4rem; }
  .ap-sum-title { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.07em; color: var(--color-muted); margin-bottom: 0.15rem; }
  .ap-sum-row {
    display: flex; align-items: center; justify-content: space-between;
    font-size: 0.75rem; color: var(--color-muted);
  }
  .ap-sum-row strong { font-weight: 700; color: var(--color-text); }

  /* ── Buttons ─────────────────────────────────────────────────────────────── */
  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem;
    padding: 0.575rem 1rem; border-radius: 0.6rem;
    font-size: 0.82rem; font-weight: 700; text-decoration: none;
    border: 1.5px solid var(--color-border); background: var(--color-surface);
    color: var(--color-text); cursor: pointer; font-family: inherit;
    transition: all 0.15s; white-space: nowrap;
  }
  .btn.full { width: 100%; }
  .btn.small { padding: 0.4rem 0.75rem; font-size: 0.75rem; }
  .btn.primary { background: var(--lc-600, #4f46e5); border-color: var(--lc-600, #4f46e5); color: white; }
  .btn.primary:hover { background: var(--lc-700, #4338ca); border-color: var(--lc-700, #4338ca); }
  .btn.scheduled { background: rgba(37,99,235,0.1); border-color: rgba(37,99,235,0.3); color: #2563eb; }
  .btn.scheduled:hover { background: rgba(37,99,235,0.18); }
  .btn.scheduled:disabled { opacity: 0.45; cursor: not-allowed; }
  .btn.ghost { background: transparent; }
  .btn.ghost:hover { border-color: var(--lc-600, #4f46e5); color: var(--lc-600, #4f46e5); }
  .btn.danger { background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.25); color: #ef4444; }
  .btn.danger:hover { background: rgba(239,68,68,0.16); }

  /* ── Confirm modal ───────────────────────────────────────────────────────── */
  .modal-bg {
    position: fixed; inset: 0; z-index: 400;
    background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
  }
  .confirm-modal {
    background: var(--color-surface); border: 1.5px solid var(--color-border);
    border-radius: 1rem; padding: 1.75rem;
    width: min(400px, calc(100vw - 2rem));
    display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
    text-align: center; box-shadow: 0 24px 80px rgba(0,0,0,0.25);
  }
  .confirm-icon {
    width: 48px; height: 48px; border-radius: 50%;
    background: rgba(79,70,229,0.1); color: var(--lc-600, #4f46e5);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .confirm-icon.danger { background: rgba(239,68,68,0.1); color: #ef4444; }
  .confirm-modal h3 { font-size: 1rem; font-weight: 800; color: var(--color-text); margin: 0; }
  .confirm-modal p  { font-size: 0.82rem; color: var(--color-muted); margin: 0; line-height: 1.55; }
  .confirm-actions { display: flex; gap: 0.625rem; width: 100%; margin-top: 0.5rem; }
  .confirm-actions .btn { flex: 1; }
</style>