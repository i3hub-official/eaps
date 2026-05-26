<!-- src/routes/(lecturer)/exams/[examId]/+page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData, ActionData } from './$types';
  import { FileText, BarChart2, CheckCircle, ChevronRight, UserCheck, X } from 'lucide-svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  const { exam, questionCount, invigilators, allInvigilators } = data;

  const STATUS_FLOW: Record<string, string> = {
    draft: 'Publish → Scheduled',
    scheduled: 'Activate → Live',
    active: 'Complete Exam',
  };

  const STATUS_ACTION: Record<string, string> = {
    draft: 'publish',
    scheduled: 'activate',
    active: 'complete',
  };

  const STATUS_META: Record<string, { color: string; label: string }> = {
    draft:     { color: 'gray',   label: 'Draft' },
    scheduled: { color: 'blue',   label: 'Scheduled' },
    active:    { color: 'green',  label: 'Live' },
    completed: { color: 'purple', label: 'Completed' },
    cancelled: { color: 'red',    label: 'Cancelled' },
  };

  const assignedIds = $derived(new Set(invigilators.map((i: any) => i.invigilatorId)));
  const available = $derived(allInvigilators.filter((i: any) => !assignedIds.has(i.id)));
  const isDraft = $derived(exam.status === 'draft');

  function fmtDateTime(d: Date | null | undefined) {
    if (!d) return '';
    return new Date(d).toISOString().slice(0, 16);
  }
</script>

<svelte:head><title>Manage — {exam.title}</title></svelte:head>

<div class="page">

  <!-- Page header -->
  <div class="page-header">
    <a href="/lecturer/exams" class="back">← Exams</a>
    <div class="header-body">
      <div class="header-top">
        <h1>{exam.title}</h1>
        <span class="status-pill status-{STATUS_META[exam.status].color}">
          {STATUS_META[exam.status].label}
        </span>
      </div>
      <div class="header-meta">
        <span class="meta-tag">{exam.course.code}</span>
        <span class="meta-sep">·</span>
        <span class="meta-item">{questionCount} question{questionCount !== 1 ? 's' : ''}</span>
        <span class="meta-sep">·</span>
        <span class="meta-item">{exam.durationMinutes} min</span>
        <span class="meta-sep">·</span>
        <span class="meta-item">{exam.totalMarks} marks</span>
      </div>
    </div>

    <div class="header-actions">
      <a href="/lecturer/exams/{exam.id}/questions" class="btn-outline">
        <FileText size={14} /> Questions
      </a>
      <a href="/lecturer/exams/{exam.id}/results" class="btn-outline">
        <BarChart2 size={14} /> Results
      </a>
      {#if STATUS_ACTION[exam.status]}
        <form method="POST" action="?/{STATUS_ACTION[exam.status]}" use:enhance>
          <button type="submit" class="btn-advance">
            <CheckCircle size={14} />
            {STATUS_FLOW[exam.status]}
          </button>
        </form>
      {/if}
    </div>
  </div>

  <!-- Alerts -->
  {#if form?.publishError || form?.settingsError || form?.assignError}
    <div class="alert error">
      {form?.publishError ?? form?.settingsError ?? form?.assignError}
    </div>
  {/if}
  {#if form?.settingsSuccess || form?.publishSuccess || form?.activateSuccess || form?.completeSuccess || form?.assignSuccess || form?.removeSuccess}
    <div class="alert success">Changes saved successfully.</div>
  {/if}

  <div class="layout">
    <!-- Main: Settings -->
    <div class="main-col">
      <section class="card">
        <div class="card-header">
          <h2>Exam Settings</h2>
          {#if !isDraft}
            <span class="locked-badge">Locked</span>
          {/if}
        </div>

        <form method="POST" action="?/updateSettings" use:enhance class="settings-form">

          <div class="field">
            <label>Title</label>
            <input name="title" type="text" value={exam.title} required disabled={!isDraft} />
          </div>

          <div class="field">
            <label>Instructions</label>
            <textarea name="instructions" rows="3" disabled={!isDraft}>{exam.instructions ?? ''}</textarea>
          </div>

          <div class="field-row four">
            <div class="field">
              <label>Duration (min)</label>
              <input name="duration_minutes" type="number" value={exam.durationMinutes} min="5" disabled={!isDraft} />
            </div>
            <div class="field">
              <label>Total Marks</label>
              <input name="total_marks" type="number" value={exam.totalMarks} min="1" disabled={!isDraft} />
            </div>
            <div class="field">
              <label>Pass Mark</label>
              <input name="pass_mark" type="number" value={exam.passMark} min="1" disabled={!isDraft} />
            </div>
            <div class="field">
              <label>Max Violations</label>
              <input name="max_violations" type="number" value={exam.maxViolations} min="1" disabled={!isDraft} />
            </div>
          </div>

          <div class="field-row">
            <div class="field">
              <label>Scheduled Start</label>
              <input name="scheduled_start" type="datetime-local" value={fmtDateTime(exam.scheduledStart)} disabled={!isDraft} />
            </div>
            <div class="field">
              <label>Scheduled End</label>
              <input name="scheduled_end" type="datetime-local" value={fmtDateTime(exam.scheduledEnd)} disabled={!isDraft} />
            </div>
          </div>

          <div class="toggles">
            <label class="toggle" class:disabled={!isDraft}>
              <div class="toggle-track">
                <input type="checkbox" name="randomize_questions" checked={exam.randomizeQuestions} disabled={!isDraft} />
                <span class="toggle-slider"></span>
              </div>
              <span>Randomize question order</span>
            </label>
            <label class="toggle" class:disabled={!isDraft}>
              <div class="toggle-track">
                <input type="checkbox" name="randomize_options" checked={exam.randomizeOptions} disabled={!isDraft} />
                <span class="toggle-slider"></span>
              </div>
              <span>Randomize option order</span>
            </label>
            <label class="toggle" class:disabled={!isDraft}>
              <div class="toggle-track">
                <input type="checkbox" name="show_result_after" checked={exam.showResultAfter} disabled={!isDraft} />
                <span class="toggle-slider"></span>
              </div>
              <span>Show result to student after submission</span>
            </label>
          </div>

          {#if isDraft}
            <button type="submit" class="btn-save">Save Settings</button>
          {/if}
        </form>
      </section>
    </div>

    <!-- Sidebar -->
    <div class="side-col">

      <!-- Quick info -->
      <section class="card info-card">
        <h2>Quick Info</h2>
        <dl class="info-list">
          <div class="info-row">
            <dt>Session</dt>
            <dd>{exam.session} — Sem {exam.semester}</dd>
          </div>
          <div class="info-row">
            <dt>Questions</dt>
            <dd>{questionCount}</dd>
          </div>
          <div class="info-row">
            <dt>Duration</dt>
            <dd>{exam.durationMinutes} min</dd>
          </div>
          <div class="info-row">
            <dt>Pass mark</dt>
            <dd>{exam.passMark} / {exam.totalMarks}</dd>
          </div>
          <div class="info-row">
            <dt>Max violations</dt>
            <dd>{exam.maxViolations}</dd>
          </div>
        </dl>
      </section>

      <!-- Invigilators -->
      <section class="card">
        <div class="card-header">
          <h2>Invigilators</h2>
          <span class="count-badge">{invigilators.length}</span>
        </div>

        {#if invigilators.length === 0}
          <p class="empty-text">No invigilators assigned yet.</p>
        {:else}
          <ul class="invig-list">
            {#each invigilators as inv}
              <li class="invig-item">
                <div class="invig-avatar">
                  {inv.invigilator.fullName.charAt(0).toUpperCase()}
                </div>
                <div class="invig-info">
                  <span class="invig-name">{inv.invigilator.fullName}</span>
                  <span class="invig-email">{inv.invigilator.email}</span>
                </div>
                <form method="POST" action="?/removeInvigilator" use:enhance>
                  <input type="hidden" name="invigilator_id" value={inv.invigilatorId} />
                  <button type="submit" class="remove-btn" aria-label="Remove">
                    <X size={13} />
                  </button>
                </form>
              </li>
            {/each}
          </ul>
        {/if}

        {#if available.length > 0}
          <form method="POST" action="?/assignInvigilator" use:enhance class="assign-form">
            <select name="invigilator_id" required>
              <option value="">Assign invigilator…</option>
              {#each available as inv}
                <option value={inv.id}>{inv.fullName} ({inv.staffId ?? inv.email})</option>
              {/each}
            </select>
            <button type="submit" class="btn-assign">
              <UserCheck size={14} /> Assign
            </button>
          </form>
        {/if}
      </section>

    </div>
  </div>
</div>

<style>
  .page {
    padding: 2rem 0;
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  /* Header */
  .page-header {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 1rem;
  }

  .back {
    font-size: 0.8rem;
    color: var(--color-muted);
    text-decoration: none;
    font-weight: 500;
    margin-top: 0.25rem;
    white-space: nowrap;
    transition: color 0.15s;
  }

  .back:hover { color: #16a34a; }

  .header-body { flex: 1; min-width: 0; }

  .header-top {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  h1 {
    font-size: 1.35rem;
    font-weight: 800;
    margin: 0;
    letter-spacing: -0.02em;
    color: var(--color-text);
  }

  .status-pill {
    font-size: 0.68rem;
    font-weight: 700;
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .status-pill.status-gray   { background: var(--color-border); color: var(--color-muted); }
  .status-pill.status-blue   { background: #dbeafe; color: #1d4ed8; }
  .status-pill.status-green  { background: #dcfce7; color: #16a34a; }
  .status-pill.status-purple { background: #f3e8ff; color: #7e22ce; }
  .status-pill.status-red    { background: #fee2e2; color: #dc2626; }

  .header-meta {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-top: 0.4rem;
    flex-wrap: wrap;
  }

  .meta-tag {
    font-size: 0.72rem;
    font-weight: 800;
    padding: 0.18rem 0.5rem;
    background: rgba(22, 163, 74, 0.1);
    color: #16a34a;
    border-radius: 0.3rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .meta-sep { color: var(--color-border); font-size: 0.85rem; }

  .meta-item {
    font-size: 0.8rem;
    color: var(--color-muted);
    font-weight: 500;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .btn-outline {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.5rem 0.875rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    color: var(--color-text);
    font-weight: 600;
    font-size: 0.82rem;
    text-decoration: none;
    white-space: nowrap;
    transition: all 0.15s;
  }

  .btn-outline:hover { background: var(--color-surface-hover); }

  .btn-advance {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.5rem 1rem;
    background: #16a34a;
    color: #fff;
    border: none;
    border-radius: 0.5rem;
    font-weight: 700;
    font-size: 0.82rem;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.15s;
  }

  .btn-advance:hover { background: #15803d; }

  /* Alerts */
  .alert {
    padding: 0.875rem 1rem;
    border-radius: 0.6rem;
    font-size: 0.875rem;
    font-weight: 500;
    border-left: 3px solid;
  }

  .alert.error   { background: #fef2f2; color: #dc2626; border-color: #dc2626; }
  .alert.success { background: #f0fdf4; color: #16a34a; border-color: #16a34a; }

  /* Layout */
  .layout {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 1.25rem;
    align-items: start;
  }

  @media (max-width: 800px) {
    .layout { grid-template-columns: 1fr; }
  }

  .main-col, .side-col {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  /* Card */
  .card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.875rem;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  h2 {
    font-size: 0.9rem;
    font-weight: 700;
    margin: 0;
    color: var(--color-text);
  }

  .locked-badge {
    font-size: 0.68rem;
    font-weight: 700;
    padding: 0.15rem 0.5rem;
    background: #fef3c7;
    color: #92400e;
    border-radius: 999px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .count-badge {
    font-size: 0.72rem;
    font-weight: 700;
    padding: 0.15rem 0.45rem;
    background: rgba(22, 163, 74, 0.1);
    color: #16a34a;
    border-radius: 999px;
  }

  /* Settings form */
  .settings-form {
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    flex: 1;
  }

  .field label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .field input,
  .field textarea {
    padding: 0.55rem 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-bg);
    color: var(--color-text);
    font-size: 0.875rem;
    font-family: inherit;
    outline: none;
    resize: vertical;
    width: 100%;
    box-sizing: border-box;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .field input:focus,
  .field textarea:focus {
    border-color: #16a34a;
    box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.1);
  }

  .field input:disabled,
  .field textarea:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    background: var(--color-bg);
  }

  .field-row {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .field-row.four .field { min-width: 0; flex-basis: calc(25% - 0.6rem); }

  /* Toggles */
  .toggles {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .toggle {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    font-size: 0.85rem;
    cursor: pointer;
    color: var(--color-text);
    font-weight: 500;
  }

  .toggle.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .toggle-track {
    position: relative;
    flex-shrink: 0;
  }

  .toggle-track input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }

  .toggle-slider {
    display: block;
    width: 36px;
    height: 20px;
    background: var(--color-border);
    border-radius: 999px;
    transition: background 0.2s;
  }

  .toggle-slider::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    width: 14px;
    height: 14px;
    background: white;
    border-radius: 50%;
    transition: transform 0.2s;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  }

  .toggle-track input:checked + .toggle-slider { background: #16a34a; }
  .toggle-track input:checked + .toggle-slider::after { transform: translateX(16px); }

  .btn-save {
    padding: 0.6rem 1.25rem;
    background: #16a34a;
    color: #fff;
    border: none;
    border-radius: 0.5rem;
    font-weight: 700;
    font-size: 0.875rem;
    cursor: pointer;
    align-self: flex-start;
    transition: background 0.15s;
  }

  .btn-save:hover { background: #15803d; }

  /* Info card */
  .info-list {
    display: flex;
    flex-direction: column;
    gap: 0;
    margin: 0;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.85rem;
    padding: 0.6rem 0;
    border-bottom: 1px solid var(--color-border);
  }

  .info-row:last-child { border-bottom: none; }

  .info-row dt { color: var(--color-muted); font-weight: 500; }
  .info-row dd { font-weight: 700; margin: 0; color: var(--color-text); }

  /* Invigilators */
  .invig-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .invig-item {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.6rem 0.75rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
  }

  .invig-avatar {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: linear-gradient(135deg, #16a34a, #2563eb);
    color: white;
    font-size: 0.75rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .invig-info {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    min-width: 0;
    flex: 1;
  }

  .invig-name  { font-size: 0.82rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .invig-email { font-size: 0.72rem; color: var(--color-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .remove-btn {
    background: none;
    border: none;
    color: var(--color-muted);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 0.3rem;
    display: flex;
    align-items: center;
    transition: all 0.15s;
  }

  .remove-btn:hover { background: #fee2e2; color: #dc2626; }

  .assign-form {
    display: flex;
    gap: 0.5rem;
  }

  .assign-form select {
    flex: 1;
    padding: 0.5rem 0.625rem;
    border: 1px solid var(--color-border);
    border-radius: 0.4rem;
    background: var(--color-bg);
    color: var(--color-text);
    font-size: 0.82rem;
    outline: none;
    transition: border-color 0.15s;
  }

  .assign-form select:focus { border-color: #16a34a; }

  .btn-assign {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.4rem 0.75rem;
    background: #16a34a;
    color: #fff;
    border: none;
    border-radius: 0.4rem;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.15s;
  }

  .btn-assign:hover { background: #15803d; }

  .empty-text {
    font-size: 0.85rem;
    color: var(--color-muted);
    margin: 0;
    text-align: center;
    padding: 0.5rem 0;
  }
</style>