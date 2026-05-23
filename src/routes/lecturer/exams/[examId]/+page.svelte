<!-- src/routes/(lecturer)/lecturer/exams/[examId]/+page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  const { exam, questionCount, invigilators, allInvigilators } = data;

  const STATUS_FLOW: Record<string, string> = {
    draft: 'Publish (→ Scheduled)',
    scheduled: 'Activate (→ Active)',
    active: 'Complete (→ Completed)',
  };

  const STATUS_ACTION: Record<string, string> = {
    draft: 'publish',
    scheduled: 'activate',
    active: 'complete',
  };

  const STATUS_COLOR: Record<string, string> = {
    draft: 'gray', scheduled: 'blue', active: 'green',
    completed: 'purple', cancelled: 'red',
  };

  const assignedIds = $derived(new Set(invigilators.map((i: any) => i.invigilatorId)));
  const available = $derived(allInvigilators.filter((i: any) => !assignedIds.has(i.id)));

  function fmtDateTime(d: Date | null | undefined) {
    if (!d) return '';
    return new Date(d).toISOString().slice(0, 16);
  }
</script>

<svelte:head><title>Manage — {exam.title}</title></svelte:head>

<div class="page">
  <div class="page-header">
    <a href="/lecturer/exams" class="back">← Exams</a>
    <div class="header-main">
      <h1>{exam.title}</h1>
      <div class="header-meta">
        <span class="course-badge">{exam.course.code}</span>
        <span class="status {STATUS_COLOR[exam.status]}">{exam.status}</span>
        <span class="q-count">{questionCount} question{questionCount !== 1 ? 's' : ''}</span>
      </div>
    </div>
    <div class="header-actions">
      <a href="/lecturer/exams/{exam.id}/questions" class="btn-outline">Questions</a>
      <a href="/lecturer/exams/{exam.id}/results"   class="btn-outline">Results</a>
      {#if STATUS_ACTION[exam.status]}
        <form method="POST" action="?/{STATUS_ACTION[exam.status]}" use:enhance>
          <button type="submit" class="btn-primary">
            {STATUS_FLOW[exam.status]}
          </button>
        </form>
      {/if}
    </div>
  </div>

  <!-- Alerts -->
  {#if form?.publishError}  <div class="alert error">{form.publishError}</div>{/if}
  {#if form?.settingsError} <div class="alert error">{form.settingsError}</div>{/if}
  {#if form?.assignError}   <div class="alert error">{form.assignError}</div>{/if}
  {#if form?.settingsSuccess || form?.publishSuccess || form?.activateSuccess || form?.completeSuccess || form?.assignSuccess || form?.removeSuccess}
    <div class="alert success">Changes saved successfully.</div>
  {/if}

  <div class="layout">
    <!-- Settings form -->
    <div class="main-col">
      <section class="card">
        <h2>Exam Settings</h2>
        <form method="POST" action="?/updateSettings" use:enhance class="settings-form">
          <div class="field">
            <label>Title</label>
            <input name="title" type="text" value={exam.title} required disabled={exam.status !== 'draft'} />
          </div>
          <div class="field">
            <label>Instructions</label>
            <textarea name="instructions" rows="3" disabled={exam.status !== 'draft'}>{exam.instructions ?? ''}</textarea>
          </div>
          <div class="field-row">
            <div class="field">
              <label>Duration (min)</label>
              <input name="duration_minutes" type="number" value={exam.durationMinutes} min="5" disabled={exam.status !== 'draft'} />
            </div>
            <div class="field">
              <label>Total Marks</label>
              <input name="total_marks" type="number" value={exam.totalMarks} min="1" disabled={exam.status !== 'draft'} />
            </div>
            <div class="field">
              <label>Pass Mark</label>
              <input name="pass_mark" type="number" value={exam.passMark} min="1" disabled={exam.status !== 'draft'} />
            </div>
            <div class="field">
              <label>Max Violations</label>
              <input name="max_violations" type="number" value={exam.maxViolations} min="1" disabled={exam.status !== 'draft'} />
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <label>Scheduled Start</label>
              <input name="scheduled_start" type="datetime-local" value={fmtDateTime(exam.scheduledStart)} disabled={exam.status !== 'draft'} />
            </div>
            <div class="field">
              <label>Scheduled End</label>
              <input name="scheduled_end" type="datetime-local" value={fmtDateTime(exam.scheduledEnd)} disabled={exam.status !== 'draft'} />
            </div>
          </div>
          <div class="toggles">
            <label class="toggle">
              <input type="checkbox" name="randomize_questions" checked={exam.randomizeQuestions} disabled={exam.status !== 'draft'} />
              <span>Randomize question order</span>
            </label>
            <label class="toggle">
              <input type="checkbox" name="randomize_options" checked={exam.randomizeOptions} disabled={exam.status !== 'draft'} />
              <span>Randomize option order</span>
            </label>
            <label class="toggle">
              <input type="checkbox" name="show_result_after" checked={exam.showResultAfter} disabled={exam.status !== 'draft'} />
              <span>Show result to student after submission</span>
            </label>
          </div>
          {#if exam.status === 'draft'}
            <button type="submit" class="btn-primary">Save Settings</button>
          {/if}
        </form>
      </section>
    </div>

    <!-- Sidebar -->
    <div class="side-col">
      <!-- Invigilators -->
      <section class="card">
        <h2>Invigilators</h2>

        {#if invigilators.length === 0}
          <p class="empty-text">No invigilators assigned yet.</p>
        {:else}
          <ul class="invig-list">
            {#each invigilators as inv}
              <li class="invig-item">
                <div class="invig-info">
                  <span class="invig-name">{inv.invigilator.fullName}</span>
                  <span class="invig-email">{inv.invigilator.email}</span>
                </div>
                <form method="POST" action="?/removeInvigilator" use:enhance>
                  <input type="hidden" name="invigilator_id" value={inv.invigilatorId} />
                  <button type="submit" class="remove-btn" aria-label="Remove invigilator">✕</button>
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
            <button type="submit" class="btn-sm">Assign</button>
          </form>
        {/if}
      </section>

      <!-- Quick stats -->
      <section class="card">
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
            <dd>{exam.durationMinutes} minutes</dd>
          </div>
          <div class="info-row">
            <dt>Pass mark</dt>
            <dd>{exam.passMark}/{exam.totalMarks}</dd>
          </div>
          <div class="info-row">
            <dt>Max violations</dt>
            <dd>{exam.maxViolations}</dd>
          </div>
        </dl>
      </section>
    </div>
  </div>
</div>

<style>
  .page { padding: 2rem; max-width: 1100px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.5rem; }

  .page-header { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 1rem; }
  .back { color: var(--color-primary); text-decoration: none; font-size: 0.875rem; margin-top: 0.25rem; white-space: nowrap; }
  .header-main { flex: 1; min-width: 0; }
  h1 { font-size: 1.3rem; font-weight: 700; margin: 0; }
  .header-meta { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.35rem; flex-wrap: wrap; }

  .course-badge { font-size: 0.72rem; font-weight: 700; padding: 0.2rem 0.5rem; background: var(--color-primary-subtle); color: var(--color-primary); border-radius: 999px; }
  .status { font-size: 0.72rem; font-weight: 600; padding: 0.2rem 0.5rem; border-radius: 999px; text-transform: capitalize; }
  .status.gray   { background: var(--color-border);  color: var(--color-muted); }
  .status.blue   { background: #dbeafe; color: #1d4ed8; }
  .status.green  { background: #dcfce7; color: #16a34a; }
  .status.purple { background: #f3e8ff; color: #7e22ce; }
  .status.red    { background: #fee2e2; color: #dc2626; }
  .q-count { font-size: 0.78rem; color: var(--color-muted); }

  .header-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
  .btn-primary { padding: 0.55rem 1.1rem; background: var(--color-primary); color: #fff; border: none; border-radius: 0.5rem; font-weight: 600; font-size: 0.875rem; cursor: pointer; white-space: nowrap; }
  .btn-outline  { padding: 0.55rem 1.1rem; border: 1px solid var(--color-border); border-radius: 0.5rem; color: var(--color-text); font-weight: 600; font-size: 0.875rem; text-decoration: none; white-space: nowrap; }

  .alert { padding: 0.75rem 1rem; border-radius: 0.5rem; font-size: 0.875rem; }
  .alert.error   { background: #fee2e2; color: #dc2626; }
  .alert.success { background: #dcfce7; color: #16a34a; }

  .layout { display: grid; grid-template-columns: 1fr 320px; gap: 1.5rem; align-items: start; }
  @media (max-width: 800px) { .layout { grid-template-columns: 1fr; } }

  .main-col, .side-col { display: flex; flex-direction: column; gap: 1.25rem; }

  .card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }
  h2 { font-size: 0.95rem; font-weight: 700; margin: 0; }

  .settings-form { display: flex; flex-direction: column; gap: 0.875rem; }
  .field { display: flex; flex-direction: column; gap: 0.35rem; flex: 1; }
  .field label { font-size: 0.82rem; font-weight: 500; }
  .field input, .field textarea, .field select {
    padding: 0.55rem 0.75rem; border: 1px solid var(--color-border);
    border-radius: 0.4rem; background: var(--color-bg); color: var(--color-text);
    font-size: 0.875rem; font-family: inherit; outline: none; resize: vertical; width: 100%; box-sizing: border-box;
  }
  .field input:focus, .field textarea:focus { border-color: var(--color-primary); }
  .field input:disabled, .field textarea:disabled { opacity: 0.6; cursor: not-allowed; }
  .field-row { display: flex; gap: 0.75rem; flex-wrap: wrap; }

  .toggles { display: flex; flex-direction: column; gap: 0.6rem; }
  .toggle  { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; cursor: pointer; }
  .toggle input { width: 1rem; height: 1rem; }

  /* Invigilators */
  .invig-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; }
  .invig-item { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; padding: 0.6rem 0.75rem; background: var(--color-bg); border-radius: 0.4rem; }
  .invig-info { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; }
  .invig-name  { font-size: 0.875rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .invig-email { font-size: 0.75rem; color: var(--color-muted); }
  .remove-btn  { background: none; border: none; color: var(--color-muted); cursor: pointer; padding: 0.2rem 0.4rem; border-radius: 0.3rem; font-size: 0.875rem; }
  .remove-btn:hover { background: #fee2e2; color: #dc2626; }

  .assign-form { display: flex; gap: 0.5rem; }
  .assign-form select { flex: 1; padding: 0.5rem 0.6rem; border: 1px solid var(--color-border); border-radius: 0.4rem; background: var(--color-bg); color: var(--color-text); font-size: 0.82rem; outline: none; }
  .btn-sm { padding: 0.4rem 0.875rem; background: var(--color-primary); color: #fff; border: none; border-radius: 0.4rem; font-size: 0.82rem; font-weight: 600; cursor: pointer; white-space: nowrap; }

  /* Info list */
  .info-list { display: flex; flex-direction: column; gap: 0.5rem; margin: 0; }
  .info-row  { display: flex; justify-content: space-between; font-size: 0.875rem; }
  .info-row dt { color: var(--color-muted); }
  .info-row dd { font-weight: 500; margin: 0; }

  .empty-text { font-size: 0.875rem; color: var(--color-muted); margin: 0; }
</style>