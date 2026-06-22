<!-- src/routes/lecturer/exams/[examId]/+page.svelte -->
<script lang="ts">
  import type { ActionData, PageData } from './$types';
  import { enhance } from '$app/forms';
  import { toDatetimeLocal } from '$lib/utils/datetime';
  import {
    ChevronLeft, BarChart3, Clock, Settings, Users,
    ShieldAlert, Layers, FileText, Timer, Check,
    Shuffle, Eye, LogIn, AlertTriangle, TrendingUp,
    Scale, BookOpen,
  } from '@lucide/svelte';
  import { fly } from 'svelte/transition';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  const exam = $derived(data.exam);

  // ── Derived display values (read-only — set at creation) ──────────────────
  const levelDisplay = $derived(
    exam.levels.length === 0
      ? 'All levels'
      : [...exam.levels].sort((a, b) => a.level - b.level).map(l => `${l.level}L`).join(', ')
  );
  const deptDisplay = $derived(
    !exam.department || exam.department.trim() === ''
      ? 'All departments'
      : exam.department
  );

  const STATUS_LABEL: Record<string, string> = {
    draft: 'Draft', scheduled: 'Scheduled', active: 'Active',
    completed: 'Completed', cancelled: 'Cancelled',
  };

  const editable = $derived(exam.status === 'draft' || exam.status === 'scheduled');
  const assignedIds = $derived(new Set(exam.invigilators.map((i: any) => i.invigilatorId)));
  const availableInvigilators = $derived(data.invigilators.filter((i: any) => !assignedIds.has(i.id)));

  // ── Local editable state (mirrors exam, updated by lecturer) ─────────────
  let title            = $state(exam.title);
  let instructions     = $state(exam.instructions ?? '');
  let durationMinutes  = $state(exam.durationMinutes);
  let totalMarks       = $state(exam.totalMarks);
  let passMark         = $state(exam.passMark);
  let maxViolations    = $state(exam.maxViolations);
  let questionsToPresent = $state(exam.questionsToPresent);
  let lateEntryMinutes = $state(exam.lateEntryMinutes);

  let randomizeQuestions = $state(exam.randomizeQuestions);
  let randomizeOptions   = $state(exam.randomizeOptions);
  let showResultAfter    = $state(exam.showResultAfter);
  let allowLateEntry     = $state(exam.allowLateEntry);

  // ── Derived scoring values for preview ───────────────────────────────────
  const caWeight       = $derived(Math.max(0, 100 - totalMarks));
  const caWeightValid  = $derived(totalMarks > 0 && totalMarks < 100);
  const passPercent    = $derived(totalMarks > 0 ? Math.round((passMark / totalMarks) * 100) : 0);
  const totalMarksError = $derived(
    totalMarks <= 0    ? 'Must be greater than 0'
    : totalMarks >= 100 ? 'Cannot be 100 — CA must contribute at least 1 mark'
    : null
  );

  // ── Date display ──────────────────────────────────────────────────────────
  const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function fmtDateDisplay(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} · ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }
</script>

<svelte:head><title>{exam.title} — MOUAU eTest</title></svelte:head>

<div class="page">

  <!-- ── Header ────────────────────────────────────────────────────────── -->
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
    <span class="status-badge status-{exam.status}">{STATUS_LABEL[exam.status]}</span>
  </header>

  <!-- ── Banners ────────────────────────────────────────────────────────── -->
  {#if form?.message}
    <div class="banner error" transition:fly={{ y: -6, duration: 180 }}>
      <AlertTriangle size={14} /> {form.message}
    </div>
  {/if}
  {#if form?.success}
    <div class="banner success" transition:fly={{ y: -6, duration: 180 }}>
      <Check size={14} /> Saved successfully.
    </div>
  {/if}

  <!-- ── Stats row ──────────────────────────────────────────────────────── -->
  <div class="stats-row">
    <div class="stat-card">
      <span class="stat-num">{exam._count.questions}</span>
      <span class="stat-label">Questions</span>
    </div>
    <div class="stat-card">
      <span class="stat-num">{data.eligibleCount}</span>
      <span class="stat-label">Eligible students</span>
    </div>
    <div class="stat-card">
      <span class="stat-num">{exam._count.examSessions}</span>
      <span class="stat-label">Sessions started</span>
    </div>
  </div>

  <div class="main-grid">

    <!-- ══ LEFT COLUMN — editable form ═══════════════════════════════════ -->
    <div class="left-col">

      <!-- Status & Actions -->
      <div class="card">
        <div class="card-header">
          <span class="card-icon"><BookOpen size={15} /></span>
          <div>
            <h2>Status &amp; Actions</h2>
            <p>
              {#if exam.status === 'draft'}Draft — invisible to students. Publish when ready.
              {:else if exam.status === 'scheduled'}Scheduled — goes live at the scheduled start time.
              {:else if exam.status === 'active'}Currently live for eligible students.
              {:else if exam.status === 'completed'}This exam has ended.
              {:else}This exam was cancelled.{/if}
            </p>
          </div>
        </div>
        <div class="card-body action-buttons">
          {#if exam.status === 'draft'}
            <form method="POST" action="?/publish" use:enhance>
              <button class="btn primary" type="submit">Publish</button>
            </form>
            <form method="POST" action="?/cancel" use:enhance>
              <button class="btn danger" type="submit">Cancel exam</button>
            </form>
          {:else if exam.status === 'scheduled'}
            <form method="POST" action="?/unpublish" use:enhance>
              <button class="btn ghost" type="submit">Move back to draft</button>
            </form>
            <form method="POST" action="?/cancel" use:enhance>
              <button class="btn danger" type="submit">Cancel exam</button>
            </form>
          {/if}
          <a class="btn ghost" href="/lecturer/exams/{exam.id}/questions">
            Manage questions ({exam._count.questions})
          </a>
        </div>
      </div>

      <!-- Main edit form -->
      <form method="POST" action="?/update" use:enhance class="edit-form">
        <!-- Hidden: session/semester are immutable -->
        <input type="hidden" name="session"  value={exam.session} />
        <input type="hidden" name="semester" value={exam.semester} />
        <!-- Hidden: courseId required by parseExamForm -->
        <input type="hidden" name="courseId" value={exam.courseId} />
        <!-- Levels and departments are immutable — pass through as hidden inputs -->
        {#each exam.levels as l}
          <input type="hidden" name="levels" value={l.level} />
        {/each}
        {#if exam.department}
          <input type="hidden" name="departments" value={exam.department} />
        {/if}

        <!-- Basics -->
        <div class="card">
          <div class="card-header">
            <span class="card-icon"><BookOpen size={15} /></span>
            <div><h2>Basics</h2><p>Title and instructions</p></div>
          </div>
          <div class="card-body">
            <div class="field">
              <label for="title">Exam Title</label>
              <input id="title" name="title" type="text"
                bind:value={title} required disabled={!editable} />
            </div>
            <div class="field">
              <label for="instructions">Instructions <span class="opt">Optional</span></label>
              <textarea id="instructions" name="instructions" rows="3"
                bind:value={instructions} disabled={!editable}></textarea>
            </div>
          </div>
        </div>

        <!-- Timing & Scoring -->
        <div class="card">
          <div class="card-header">
            <span class="card-icon"><Clock size={15} /></span>
            <div><h2>Timing &amp; Scoring</h2><p>Duration, marks and schedule</p></div>
          </div>
          <div class="card-body">

            <div class="two-col">
              <div class="field">
                <label for="scheduledStart">Scheduled Start</label>
                <input id="scheduledStart" name="scheduledStart" type="datetime-local"
                  value={toDatetimeLocal(exam.scheduledStart)} disabled={!editable} />
              </div>
              <div class="field">
                <label for="scheduledEnd">Scheduled End</label>
                <input id="scheduledEnd" name="scheduledEnd" type="datetime-local"
                  value={toDatetimeLocal(exam.scheduledEnd)} disabled={!editable} />
              </div>
            </div>

            <div class="three-col">
              <div class="field">
                <label for="durationMinutes"><Timer size={12} /> Duration</label>
                <div class="input-unit-wrap">
                  <input id="durationMinutes" name="durationMinutes" type="number"
                    bind:value={durationMinutes} min="5" max="300" disabled={!editable} />
                  <span class="unit">min</span>
                </div>
              </div>

              <div class="field">
                <label for="totalMarks">
                  <FileText size={12} /> Exam Weight
                  <span class="label-sub">/ 100</span>
                </label>
                <div class="input-unit-wrap">
                  <input id="totalMarks" name="totalMarks" type="number"
                    bind:value={totalMarks} min="1" max="99" disabled={!editable}
                    class:input-error={!!totalMarksError} />
                  <span class="unit">pts</span>
                </div>
                {#if caWeightValid && editable}
                  <div class="ca-badge" transition:fly={{ y: -4, duration: 140 }}>
                    <Scale size={10} /> CA: <strong>{caWeight}pts</strong>
                  </div>
                {/if}
                {#if totalMarksError}
                  <span class="field-error"><AlertTriangle size={10} /> {totalMarksError}</span>
                {/if}
              </div>

              <div class="field">
                <label for="passMark"><Check size={12} strokeWidth={2.5} /> Pass Mark</label>
                <div class="input-unit-wrap">
                  <input id="passMark" name="passMark" type="number"
                    bind:value={passMark} min="1" disabled={!editable} />
                  <span class="unit">pts</span>
                </div>
                {#if totalMarks > 0 && passMark > 0 && editable}
                  <span class="pass-pct">{passPercent}% of exam</span>
                {/if}
              </div>
            </div>

            <!-- Late entry -->
            <div class="toggle-row" class:disabled={!editable}>
              <div class="toggle-text">
                <span class="toggle-icon-wrap"><LogIn size={14} /></span>
                <div>
                  <span class="toggle-label">Allow Late Entry</span>
                  <span class="toggle-desc">
                    {allowLateEntry ? `${lateEntryMinutes} min grace period` : 'Must join on time'}
                  </span>
                </div>
              </div>
              <div class="toggle-track" class:on={allowLateEntry}>
                <input type="checkbox" name="allowLateEntry"
                  bind:checked={allowLateEntry}
                  disabled={!editable}
                  class="toggle-cb" />
                <span class="toggle-knob"></span>
              </div>
            </div>

            {#if allowLateEntry}
              <div class="field late-field" transition:fly={{ y: -6, duration: 160 }}>
                <label for="lateEntryMinutes">Grace period after start</label>
                <div class="input-unit-wrap" style="max-width: 140px">
                  <input id="lateEntryMinutes" name="lateEntryMinutes" type="number"
                    bind:value={lateEntryMinutes} min="1" max="60" disabled={!editable} />
                  <span class="unit">min</span>
                </div>
              </div>
            {/if}
          </div>
        </div>

        <!-- Questions & Integrity -->
        <div class="card">
          <div class="card-header">
            <span class="card-icon"><Settings size={15} /></span>
            <div><h2>Questions &amp; Integrity</h2><p>Randomisation and violation limits</p></div>
          </div>
          <div class="card-body">

            <div class="field">
              <label for="questionsToPresent"><Layers size={12} /> Questions per student</label>
              <div class="input-unit-wrap" style="max-width: 160px">
                <input id="questionsToPresent" name="questionsToPresent" type="number"
                  bind:value={questionsToPresent} min="0" disabled={!editable} />
                <span class="unit">Qs</span>
              </div>
              <p class="field-hint">0 = present all questions</p>
            </div>

            <div class="field">
              <label for="maxViolations"><ShieldAlert size={12} /> Max violations before auto-submit</label>
              <div class="input-unit-wrap" style="max-width: 120px">
                <input id="maxViolations" name="maxViolations" type="number"
                  bind:value={maxViolations} min="1" max="20" disabled={!editable} />
                <span class="unit">×</span>
              </div>
            </div>

            <div class="toggles-group">
              <label class="toggle-row" class:disabled={!editable}>
                <div class="toggle-text">
                  <span class="toggle-icon-wrap"><Shuffle size={14} /></span>
                  <div>
                    <span class="toggle-label">Randomize Questions</span>
                    <span class="toggle-desc">{randomizeQuestions ? 'Shuffled per student' : 'Fixed order'}</span>
                  </div>
                </div>
                <div class="toggle-track" class:on={randomizeQuestions}>
                  <input type="checkbox" name="randomizeQuestions"
                    bind:checked={randomizeQuestions} disabled={!editable} class="toggle-cb" />
                  <span class="toggle-knob"></span>
                </div>
              </label>

              <label class="toggle-row" class:disabled={!editable}>
                <div class="toggle-text">
                  <span class="toggle-icon-wrap"><TrendingUp size={14} /></span>
                  <div>
                    <span class="toggle-label">Randomize Options</span>
                    <span class="toggle-desc">{randomizeOptions ? 'MCQ choices shuffled' : 'Fixed order'}</span>
                  </div>
                </div>
                <div class="toggle-track" class:on={randomizeOptions}>
                  <input type="checkbox" name="randomizeOptions"
                    bind:checked={randomizeOptions} disabled={!editable} class="toggle-cb" />
                  <span class="toggle-knob"></span>
                </div>
              </label>

              <!--
                showResultAfter: bind:checked keeps the boolean in sync.
                The underlying checkbox sends "on" when checked, nothing when unchecked.
                parseExamForm reads formData.get('showResultAfter') === 'on'. Correct.
              -->
              <label class="toggle-row" class:disabled={!editable}>
                <div class="toggle-text">
                  <span class="toggle-icon-wrap"><Eye size={14} /></span>
                  <div>
                    <span class="toggle-label">Show Result Immediately</span>
                    <span class="toggle-desc">{showResultAfter ? 'Score shown after submission' : 'Results hidden until released'}</span>
                  </div>
                </div>
                <div class="toggle-track" class:on={showResultAfter}>
                  <input type="checkbox" name="showResultAfter"
                    bind:checked={showResultAfter} disabled={!editable} class="toggle-cb" />
                  <span class="toggle-knob"></span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {#if editable}
          <div class="save-row">
            <button class="btn primary" type="submit">Save changes</button>
          </div>
        {/if}
      </form>

      <!-- Invigilators -->
      <div class="card">
        <div class="card-header">
          <span class="card-icon"><Users size={15} /></span>
          <div><h2>Invigilators</h2><p>Assigned to monitor this exam</p></div>
        </div>
        <div class="card-body">
          {#if exam.invigilators.length > 0}
            <ul class="invig-list">
              {#each exam.invigilators as inv}
                <li>
                  <span>{inv.invigilator.fullName}
                    <span class="invig-id">{inv.invigilator.staffId ?? inv.invigilator.email}</span>
                  </span>
                  <form method="POST" action="?/remove_invigilator" use:enhance>
                    <input type="hidden" name="invigilatorId" value={inv.invigilatorId} />
                    <button class="btn danger small" type="submit">Remove</button>
                  </form>
                </li>
              {/each}
            </ul>
          {:else}
            <p class="field-hint">No invigilators assigned yet.</p>
          {/if}

          {#if availableInvigilators.length > 0}
            <form method="POST" action="?/assign_invigilator" use:enhance class="invig-add">
              <select name="invigilatorId" required>
                <option value="" disabled selected>Select invigilator…</option>
                {#each availableInvigilators as inv}
                  <option value={inv.id}>{inv.fullName} ({inv.staffId ?? inv.email})</option>
                {/each}
              </select>
              <button class="btn ghost" type="submit">Assign</button>
            </form>
          {/if}
        </div>
      </div>
    </div>

    <!-- ══ RIGHT COLUMN — configuration preview (read-only) ══════════════ -->
    <div class="right-col">
      <div class="summary-card">
        <div class="summary-title">Configuration Preview</div>
        <div class="summary-rows">

          <div class="sum-row">
            <span>Course</span>
            <span class="sum-val sum-val-set">{exam.course?.code ?? '—'}</span>
          </div>
          <div class="sum-row">
            <span>Session</span>
            <span class="sum-val sum-val-set">{exam.session}</span>
          </div>
          <div class="sum-row">
            <span>Semester</span>
            <span class="sum-val sum-val-set">
              {exam.semester === 1 ? 'First' : 'Second'} Semester
            </span>
          </div>

          <!-- Scope — read-only, set at creation -->
          <div class="sum-divider"></div>
          <div class="sum-section-label">Scope (set at creation)</div>

          <div class="sum-row">
            <span>Eligible levels</span>
            <span class="sum-val sum-val-set">{levelDisplay}</span>
          </div>
          <div class="sum-row">
            <span>Departments</span>
            <span class="sum-val sum-val-set">{deptDisplay}</span>
          </div>

          <!-- Live-updating fields -->
          <div class="sum-divider"></div>
          <div class="sum-section-label">Timing</div>

          <div class="sum-row">
            <span>Start</span>
            <span class="sum-val sum-val-set">{fmtDateDisplay(exam.scheduledStart?.toString())}</span>
          </div>
          <div class="sum-row">
            <span>End</span>
            <span class="sum-val sum-val-set">{fmtDateDisplay(exam.scheduledEnd?.toString())}</span>
          </div>
          <div class="sum-row">
            <span>Duration</span>
            <span class="sum-val sum-val-set">{durationMinutes} min</span>
          </div>
          <div class="sum-row">
            <span>Late entry</span>
            <span class="sum-val" class:sum-val-set={allowLateEntry}>
              {allowLateEntry ? `✓ ${lateEntryMinutes} min` : 'Off'}
            </span>
          </div>

          <div class="sum-divider"></div>
          <div class="sum-section-label">Scoring</div>

          <div class="sum-row">
            <span>Exam weight</span>
            <span class="sum-val sum-val-set" class:sum-val-warn={!!totalMarksError}>
              {totalMarks} / 100
            </span>
          </div>
          <div class="sum-row">
            <span>CA weight</span>
            <span class="sum-val" class:sum-val-set={caWeightValid}>
              {caWeightValid ? `${caWeight} / 100` : '—'}
            </span>
          </div>
          <div class="sum-row">
            <span>Pass threshold</span>
            <span class="sum-val sum-val-set">
              {passMark}/{totalMarks} · {passPercent}% (exam only)
            </span>
          </div>

          <div class="sum-divider"></div>
          <div class="sum-section-label">Questions</div>

          <div class="sum-row">
            <span>Question pool</span>
            <span class="sum-val sum-val-set">
              {questionsToPresent > 0 ? `${questionsToPresent} per student` : 'All questions'}
            </span>
          </div>
          <div class="sum-row">
            <span>Max violations</span>
            <span class="sum-val sum-val-set" class:sum-val-warn={maxViolations <= 2}>
              {maxViolations}
            </span>
          </div>

          <div class="sum-divider"></div>
          <div class="sum-section-label">Options</div>

          <div class="sum-row">
            <span>Randomize</span>
            <span class="sum-val">
              {randomizeQuestions && randomizeOptions ? 'Questions & options'
              : randomizeQuestions ? 'Questions only'
              : randomizeOptions  ? 'Options only'
              : 'Off'}
            </span>
          </div>
          <div class="sum-row">
            <span>Show result</span>
            <span class="sum-val" class:sum-val-set={showResultAfter}>
              {showResultAfter ? '✓ Immediately' : 'After release'}
            </span>
          </div>
          <div class="sum-row">
            <span>Invigilators</span>
            <span class="sum-val sum-val-set">{exam.invigilators.length}</span>
          </div>

        </div>
      </div>
    </div>

  </div>
</div>

<style>
  .page { max-width: 1100px; margin: 0 auto; padding: 1.75rem 2rem 4rem; display: flex; flex-direction: column; gap: 1.25rem; }

  /* ── Header ──────────────────────────────────────────────────────────────── */
  .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; padding-bottom: 1.25rem; border-bottom: 1px solid var(--color-border); }
  .header-left { display: flex; flex-direction: column; gap: .2rem; }
  .back-link { display: inline-flex; align-items: center; gap: .2rem; font-size: .75rem; font-weight: 600; color: var(--lc-600); text-decoration: none; margin-bottom: .25rem; transition: gap .12s; }
  .back-link:hover { gap: .4rem; }
  .page-header h1 { font-size: 1.6rem; font-weight: 900; letter-spacing: -.035em; color: var(--color-text); margin: 0; }
  .course-meta { font-size: .82rem; color: var(--color-muted); margin: 0; }

  .status-badge { font-size: .68rem; font-weight: 800; padding: .3rem .7rem; border-radius: 999px; text-transform: uppercase; letter-spacing: .04em; white-space: nowrap; flex-shrink: 0; margin-top: .25rem; }
  .status-draft     { background: var(--color-bg); color: var(--color-muted); border: 1px solid var(--color-border); }
  .status-scheduled { background: rgba(59,130,246,.1); color: #2563eb; }
  .status-active    { background: rgba(34,197,94,.12); color: #15803d; }
  .status-completed { background: rgba(107,114,128,.12); color: var(--color-muted); }
  .status-cancelled { background: rgba(239,68,68,.1); color: #ef4444; }

  /* ── Banners ─────────────────────────────────────────────────────────────── */
  .banner { display: flex; align-items: center; gap: .5rem; padding: .75rem 1rem; border-radius: .625rem; font-size: .85rem; font-weight: 600; }
  .banner.error   { background: rgba(239,68,68,.08);   color: #ef4444; border: 1px solid rgba(239,68,68,.2); }
  .banner.success { background: rgba(34,197,94,.08);   color: #15803d; border: 1px solid rgba(34,197,94,.2); }

  /* ── Stats ───────────────────────────────────────────────────────────────── */
  .stats-row { display: flex; gap: 1rem; }
  .stat-card { flex: 1; display: flex; flex-direction: column; align-items: center; gap: .25rem; padding: 1rem; border: 1.5px solid var(--color-border); border-radius: .875rem; background: var(--color-surface); }
  .stat-num   { font-size: 1.4rem; font-weight: 800; color: var(--color-text); }
  .stat-label { font-size: .7rem; color: var(--color-muted); text-transform: uppercase; letter-spacing: .04em; }

  /* ── Main grid ───────────────────────────────────────────────────────────── */
  .main-grid { display: grid; grid-template-columns: 1fr 280px; gap: 1.25rem; align-items: start; }
  @media (max-width: 860px) { .main-grid { grid-template-columns: 1fr; } .right-col { order: -1; } }

  .left-col  { display: flex; flex-direction: column; gap: 1.25rem; }
  .right-col { position: sticky; top: 1.25rem; }
  .edit-form { display: flex; flex-direction: column; gap: 1.25rem; }

  /* ── Cards ───────────────────────────────────────────────────────────────── */
  .card { background: var(--color-surface); border: 1.5px solid var(--color-border); border-radius: 1rem; overflow: visible; }
  .card-header { display: flex; align-items: flex-start; gap: .75rem; padding: .875rem 1.25rem; border-bottom: 1px solid var(--color-border); background: var(--color-bg); border-radius: 1rem 1rem 0 0; }
  .card-icon { width: 30px; height: 30px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: var(--lc-soft); border-radius: .45rem; color: var(--lc-600); }
  .card-header h2 { font-size: .83rem; font-weight: 700; color: var(--color-text); margin: 0 0 .1rem; }
  .card-header p  { font-size: .72rem; color: var(--color-muted); margin: 0; }
  .card-body { padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: .875rem; }

  /* ── Action buttons ──────────────────────────────────────────────────────── */
  .action-buttons { flex-direction: row !important; flex-wrap: wrap; gap: .625rem; }

  /* ── Fields ──────────────────────────────────────────────────────────────── */
  .field { display: flex; flex-direction: column; gap: .35rem; }
  .field label { font-size: .78rem; font-weight: 600; color: var(--color-text); display: flex; align-items: center; gap: .3rem; flex-wrap: wrap; }
  .label-sub { font-size: .67rem; font-weight: 500; color: var(--color-muted); }
  .opt { font-size: .68rem; font-weight: 500; color: var(--color-muted); }
  .field-hint { font-size: .71rem; color: var(--color-muted); margin: 0; }
  .field-error { font-size: .72rem; color: #dc2626; display: flex; align-items: center; gap: .25rem; }

  .field input, .field textarea, .field select {
    padding: .575rem .75rem; border: 1.5px solid var(--color-border); border-radius: .6rem;
    background: var(--color-bg); color: var(--color-text); font-size: .875rem;
    font-family: inherit; outline: none; width: 100%; box-sizing: border-box; resize: vertical;
    transition: border-color .15s, box-shadow .15s;
  }
  .field input:focus, .field textarea:focus { border-color: var(--lc-600); box-shadow: 0 0 0 3px var(--lc-soft); }
  .field input:disabled, .field textarea:disabled { opacity: .55; cursor: not-allowed; }
  .field input.input-error { border-color: #ef4444; }

  .two-col   { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; }
  .three-col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: .75rem; }
  @media (max-width: 600px) { .two-col, .three-col { grid-template-columns: 1fr; } }

  .input-unit-wrap { position: relative; }
  .input-unit-wrap input { padding-right: 2.25rem; }
  .unit { position: absolute; right: .75rem; top: 50%; transform: translateY(-50%); font-size: .7rem; font-weight: 700; color: var(--color-muted); pointer-events: none; }

  .ca-badge { display: inline-flex; align-items: center; gap: .3rem; font-size: .7rem; color: var(--lc-600); background: rgba(79,70,229,.07); border: 1px solid rgba(79,70,229,.2); border-radius: .4rem; padding: .25rem .5rem; }
  .ca-badge strong { font-weight: 800; }
  .pass-pct { font-size: .7rem; color: var(--color-muted); }

  .late-field { padding-top: .25rem; }

  /* ── Toggles ─────────────────────────────────────────────────────────────── */
  .toggles-group { display: flex; flex-direction: column; border: 1.5px solid var(--color-border); border-radius: .75rem; overflow: hidden; }
  .toggle-row {
    display: flex; align-items: center; justify-content: space-between; gap: 1rem;
    padding: .75rem 1rem;
    border-bottom: 1px solid var(--color-border);
    transition: background .12s; user-select: none;
    cursor: pointer;
  }
  .toggle-row:last-child { border-bottom: none; }
  .toggle-row:not(.disabled):hover { background: var(--lc-soft); }
  .toggle-row.disabled { cursor: default; opacity: .7; }
  .toggle-text { display: flex; align-items: flex-start; gap: .5rem; }
  .toggle-icon-wrap { width: 26px; height: 26px; border-radius: .35rem; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: var(--color-bg); border: 1px solid var(--color-border); color: var(--color-muted); }
  .toggle-label { display: block; font-size: .8rem; font-weight: 600; color: var(--color-text); }
  .toggle-desc  { display: block; font-size: .71rem; color: var(--color-muted); }
  .toggle-track { position: relative; width: 38px; height: 20px; flex-shrink: 0; }
  .toggle-cb    { position: absolute; opacity: 0; width: 0; height: 0; pointer-events: none; }
  .toggle-knob  { position: absolute; inset: 0; background: var(--color-border); border-radius: 999px; transition: background .2s; cursor: pointer; }
  .toggle-knob::after { content: ''; position: absolute; width: 14px; height: 14px; top: 3px; left: 3px; background: white; border-radius: 50%; transition: transform .2s; box-shadow: 0 1px 3px rgba(0,0,0,.2); }
  .toggle-track.on .toggle-knob { background: var(--lc-600); }
  .toggle-track.on .toggle-knob::after { transform: translateX(18px); }
  .toggle-row.disabled .toggle-knob { cursor: not-allowed; }

  /* ── Save row ────────────────────────────────────────────────────────────── */
  .save-row { display: flex; justify-content: flex-end; }

  /* ── Invigilators ────────────────────────────────────────────────────────── */
  .invig-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: .5rem; }
  .invig-list li { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: .625rem .875rem; border: 1px solid var(--color-border); border-radius: .625rem; font-size: .85rem; color: var(--color-text); }
  .invig-id { font-size: .75rem; color: var(--color-muted); margin-left: .4rem; }
  .invig-add { display: flex; gap: .625rem; }
  .invig-add select { flex: 1; padding: .575rem .75rem; border: 1.5px solid var(--color-border); border-radius: .5rem; background: var(--color-bg); color: var(--color-text); font-size: .83rem; font-family: inherit; outline: none; }
  .invig-add select:focus { border-color: var(--lc-600); }

  /* ── Buttons ─────────────────────────────────────────────────────────────── */
  .btn { display: inline-flex; align-items: center; gap: .4rem; padding: .575rem 1.1rem; border-radius: .6rem; font-size: .82rem; font-weight: 700; text-decoration: none; border: 1.5px solid var(--color-border); background: var(--color-surface); color: var(--color-text); cursor: pointer; font-family: inherit; transition: all .15s; white-space: nowrap; }
  .btn.small   { padding: .35rem .7rem; font-size: .73rem; }
  .btn.primary { background: var(--lc-600); border-color: var(--lc-600); color: white; }
  .btn.primary:hover { background: var(--lc-700); border-color: var(--lc-700); }
  .btn.ghost   { background: transparent; }
  .btn.ghost:hover { border-color: var(--lc-600); color: var(--lc-600); }
  .btn.danger  { background: rgba(239,68,68,.08); border-color: rgba(239,68,68,.25); color: #ef4444; }
  .btn.danger:hover { background: rgba(239,68,68,.15); }

  /* ── Configuration Preview (right col) ───────────────────────────────────── */
  .summary-card { background: var(--color-surface); border: 1.5px solid var(--color-border); border-radius: .875rem; overflow: hidden; }
  .summary-title { padding: .6rem 1rem; font-size: .7rem; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: var(--color-muted); background: var(--color-bg); border-bottom: 1px solid var(--color-border); }
  .summary-rows { padding: .4rem; }
  .sum-row { display: flex; align-items: center; justify-content: space-between; padding: .35rem .5rem; border-radius: .35rem; gap: .5rem; }
  .sum-row:hover { background: var(--lc-soft); }
  .sum-row span:first-child { font-size: .74rem; color: var(--color-muted); white-space: nowrap; }
  .sum-val { font-size: .74rem; font-weight: 600; color: var(--color-muted); text-align: right; transition: color .2s; }
  .sum-val-set  { color: var(--color-text); }
  .sum-val-warn { color: #d97706 !important; }
  .sum-divider  { height: 1px; background: var(--color-border); margin: .35rem .5rem; }
  .sum-section-label { font-size: .65rem; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: var(--color-muted); padding: .1rem .5rem .25rem; }

  :global(.dark) .toggle-knob::after { background: #e5e5e5; }
</style>