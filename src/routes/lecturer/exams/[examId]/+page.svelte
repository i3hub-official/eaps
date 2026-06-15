<!-- src/routes/lecturer/exams/[examId]/+page.svelte
 -->
<script lang="ts">
  import type { ActionData, PageData } from './$types';
  import { enhance } from '$app/forms';
  import { toDatetimeLocal } from '$lib/server/exam/exam-form.js';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  const exam = $derived(data.exam);
  const examLevels = $derived(new Set(exam.levels.map((l) => l.level)));
  const examDepts = $derived(
    new Set((exam.department ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean))
  );
  const assignedIds = $derived(new Set(exam.invigilators.map((i) => i.invigilatorId)));
  const availableInvigilators = $derived(data.invigilators.filter((i) => !assignedIds.has(i.id)));

  const STATUS_LABEL: Record<string, string> = {
    draft: 'Draft', scheduled: 'Scheduled', active: 'Active', completed: 'Completed', cancelled: 'Cancelled',
  };
  const editable = $derived(exam.status === 'draft' || exam.status === 'scheduled');
</script>

<div class="page">
  <header class="page-header">
    <div>
      <a class="back" href="/lecturer/exams">← All exams</a>
      <h1>{exam.title}</h1>
      <p class="course">{exam.course?.code} — {exam.course?.title} · {exam.session} · Semester {exam.semester}</p>
    </div>
    <span class="status status-{exam.status}">{STATUS_LABEL[exam.status]}</span>
  </header>

  {#if form?.message}
    <div class="banner error">{form.message}</div>
  {/if}
  {#if form?.success}
    <div class="banner success">Saved.</div>
  {/if}

  <section class="stats-row">
    <div class="stat-card"><span class="num">{exam._count.questions}</span><span class="label">Questions</span></div>
    <div class="stat-card"><span class="num">{data.eligibleCount}</span><span class="label">Eligible students</span></div>
    <div class="stat-card"><span class="num">{exam._count.examSessions}</span><span class="label">Sessions started</span></div>
  </section>

  <section class="card actions-card">
    <h2>Status</h2>
    <p class="hint">
      {#if exam.status === 'draft'}
        Draft exams are invisible to students. Publish to make it visible once its scheduled window opens.
      {:else if exam.status === 'scheduled'}
        Scheduled — will go live automatically at the scheduled start time.
      {:else if exam.status === 'active'}
        Currently live for eligible students.
      {:else if exam.status === 'completed'}
        This exam has ended.
      {:else}
        This exam was cancelled.
      {/if}
    </p>
    <div class="action-buttons">
      {#if exam.status === 'draft'}
        <form method="POST" action="?/publish" use:enhance>
          <button class="btn primary" type="submit">Publish</button>
        </form>
        <form method="POST" action="?/cancel" use:enhance>
          <button class="btn danger" type="submit">Cancel exam</button>
        </form>
      {:else if exam.status === 'scheduled'}
        <form method="POST" action="?/unpublish" use:enhance>
          <button class="btn" type="submit">Move back to draft</button>
        </form>
        <form method="POST" action="?/cancel" use:enhance>
          <button class="btn danger" type="submit">Cancel exam</button>
        </form>
      {/if}
      <a class="btn" href="/lecturer/exams/{exam.id}/questions">Manage questions ({exam._count.questions})</a>
    </div>
  </section>

  <form method="POST" action="?/update" use:enhance class="exam-form">
    <input type="hidden" name="session" value={exam.session} />
    <input type="hidden" name="semester" value={exam.semester} />

    <section class="card">
      <h2>Basics</h2>
      <label class="field">
        <span>Title</span>
        <input name="title" type="text" value={exam.title} required disabled={!editable} />
      </label>
      <label class="field">
        <span>Instructions</span>
        <textarea name="instructions" rows="3" disabled={!editable}>{exam.instructions ?? ''}</textarea>
      </label>
    </section>

    <section class="card">
      <h2>Timing &amp; Marking</h2>
      <div class="field-row">
        <label class="field">
          <span>Duration (minutes)</span>
          <input name="durationMinutes" type="number" min="1" value={exam.durationMinutes} disabled={!editable} />
        </label>
        <label class="field">
          <span>Total marks</span>
          <input name="totalMarks" type="number" min="1" value={exam.totalMarks} disabled={!editable} />
        </label>
        <label class="field">
          <span>Pass mark</span>
          <input name="passMark" type="number" min="0" value={exam.passMark} disabled={!editable} />
        </label>
      </div>
      <div class="field-row">
        <label class="field">
          <span>Scheduled start</span>
          <input name="scheduledStart" type="datetime-local" value={toDatetimeLocal(exam.scheduledStart)} disabled={!editable} />
        </label>
        <label class="field">
          <span>Scheduled end</span>
          <input name="scheduledEnd" type="datetime-local" value={toDatetimeLocal(exam.scheduledEnd)} disabled={!editable} />
        </label>
      </div>
      <label class="checkbox">
        <input type="checkbox" name="allowLateEntry" checked={exam.allowLateEntry} disabled={!editable} />
        <span>Allow late entry</span>
      </label>
      <label class="field">
        <span>Late entry window (minutes)</span>
        <input name="lateEntryMinutes" type="number" min="0" value={exam.lateEntryMinutes} disabled={!editable} />
      </label>
    </section>

    <section class="card">
      <h2>Questions &amp; Integrity</h2>
      <label class="field">
        <span>Questions to present per student (0 = all)</span>
        <input name="questionsToPresent" type="number" min="0" value={exam.questionsToPresent} disabled={!editable} />
      </label>
      <label class="checkbox">
        <input type="checkbox" name="randomizeQuestions" checked={exam.randomizeQuestions} disabled={!editable} />
        <span>Randomize question order per student</span>
      </label>
      <label class="checkbox">
        <input type="checkbox" name="randomizeOptions" checked={exam.randomizeOptions} disabled={!editable} />
        <span>Randomize MCQ option order per student</span>
      </label>
      <label class="checkbox">
        <input type="checkbox" name="showResultAfter" checked={exam.showResultAfter} disabled={!editable} />
        <span>Show result to students immediately after submission</span>
      </label>
      <label class="field">
        <span>Max violations before auto-submit</span>
        <input name="maxViolations" type="number" min="1" value={exam.maxViolations} disabled={!editable} />
      </label>
    </section>

    <section class="card">
      <h2>Restrictions</h2>
      <p class="hint">Leave all unchecked to allow any registered student in this course/session/semester.</p>
      <div class="field">
        <span>Levels</span>
        <div class="checkbox-grid">
          {#each data.levels as level}
            <label class="checkbox">
              <input type="checkbox" name="levels" value={level.level} checked={examLevels.has(level.level)} disabled={!editable} />
              <span>{level.name ?? `${level.level}L`}</span>
            </label>
          {/each}
        </div>
      </div>
      <div class="field">
        <span>Departments</span>
        <div class="checkbox-grid">
          {#each data.departments as dept}
            <label class="checkbox">
              <input type="checkbox" name="departments" value={dept.name} checked={examDepts.has(dept.name.toLowerCase())} disabled={!editable} />
              <span>{dept.name}</span>
            </label>
          {/each}
        </div>
      </div>
    </section>

    {#if editable}
      <div class="actions">
        <button class="btn primary" type="submit">Save changes</button>
      </div>
    {/if}
  </form>

  <section class="card">
    <h2>Invigilators</h2>
    {#if exam.invigilators.length > 0}
      <ul class="invig-list">
        {#each exam.invigilators as inv}
          <li>
            <span>{inv.invigilator.fullName} ({inv.invigilator.staffId ?? inv.invigilator.email})</span>
            <form method="POST" action="?/remove_invigilator" use:enhance>
              <input type="hidden" name="invigilatorId" value={inv.invigilatorId} />
              <button class="btn danger small" type="submit">Remove</button>
            </form>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="hint">No invigilators assigned yet.</p>
    {/if}

    {#if availableInvigilators.length > 0}
      <form method="POST" action="?/assign_invigilator" use:enhance class="invig-add">
        <select name="invigilatorId" required>
          <option value="" disabled selected>Select invigilator…</option>
          {#each availableInvigilators as inv}
            <option value={inv.id}>{inv.fullName} ({inv.staffId ?? inv.email})</option>
          {/each}
        </select>
        <button class="btn" type="submit">Assign</button>
      </form>
    {/if}
  </section>
</div>

<style>
  .page { max-width: 760px; margin: 0 auto; padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; }
  .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
  .back { font-size: 0.8rem; color: var(--color-muted); text-decoration: none; }
  .back:hover { color: var(--blue-600, #2563eb); }
  .page-header h1 { font-size: 1.35rem; font-weight: 800; margin: 0.25rem 0 0.25rem; color: var(--color-text); }
  .course { font-size: 0.85rem; color: var(--color-muted); margin: 0; }

  .status { font-size: 0.7rem; font-weight: 800; padding: 0.3rem 0.7rem; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap; }
  .status-draft { background: var(--color-bg); color: var(--color-muted); border: 1px solid var(--color-border); }
  .status-scheduled { background: rgba(59,130,246,0.1); color: var(--blue-600, #2563eb); }
  .status-active { background: rgba(34,197,94,0.12); color: #15803d; }
  .status-completed { background: rgba(107,114,128,0.12); color: var(--color-muted); }
  .status-cancelled { background: rgba(239,68,68,0.1); color: #ef4444; }

  .banner { padding: 0.75rem 1rem; border-radius: 0.625rem; font-size: 0.85rem; font-weight: 600; }
  .banner.error { background: rgba(239,68,68,0.08); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); }
  .banner.success { background: rgba(34,197,94,0.08); color: #15803d; border: 1px solid rgba(34,197,94,0.2); }

  .stats-row { display: flex; gap: 1rem; }
  .stat-card { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.25rem; padding: 1rem; border: 1.5px solid var(--color-border); border-radius: 0.875rem; background: var(--color-surface); }
  .stat-card .num { font-size: 1.4rem; font-weight: 800; color: var(--color-text); }
  .stat-card .label { font-size: 0.72rem; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.04em; }

  .card { border: 1.5px solid var(--color-border); border-radius: 1rem; background: var(--color-surface); padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }
  .card h2 { font-size: 0.95rem; font-weight: 800; margin: 0; color: var(--color-text); }

  .action-buttons { display: flex; gap: 0.75rem; flex-wrap: wrap; }

  .exam-form { display: flex; flex-direction: column; gap: 1.25rem; }
  .field { display: flex; flex-direction: column; gap: 0.375rem; flex: 1; font-size: 0.85rem; font-weight: 700; color: var(--color-text); }
  .field-row { display: flex; gap: 1rem; flex-wrap: wrap; }
  .field input, .field select, .field textarea {
    padding: 0.625rem 0.75rem; border: 1.5px solid var(--color-border); border-radius: 0.5rem;
    background: var(--color-bg); color: var(--color-text); font-size: 0.875rem; font-weight: 500; font-family: inherit;
  }
  .field input:disabled, .field textarea:disabled { opacity: 0.6; cursor: not-allowed; }
  .field input:focus, .field select:focus, .field textarea:focus { outline: none; border-color: var(--blue-500, #3b82f6); }

  .checkbox { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; font-weight: 600; color: var(--color-text); }
  .checkbox-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 0.5rem; }

  .hint { font-size: 0.78rem; color: var(--color-muted); margin: 0; }

  .actions { display: flex; justify-content: flex-end; }
  .btn { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.625rem 1.25rem; border-radius: 0.625rem; font-size: 0.85rem; font-weight: 700; text-decoration: none; border: 1.5px solid var(--color-border); background: var(--color-surface); color: var(--color-text); cursor: pointer; }
  .btn.small { padding: 0.4rem 0.75rem; font-size: 0.75rem; }
  .btn.primary { background: var(--blue-600, #2563eb); border-color: var(--blue-600, #2563eb); color: #fff; }
  .btn.primary:hover { background: var(--blue-700, #1d4ed8); }
  .btn.danger { background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.25); color: #ef4444; }
  .btn.danger:hover { background: rgba(239,68,68,0.15); }

  .invig-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
  .invig-list li { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.625rem 0.875rem; border: 1px solid var(--color-border); border-radius: 0.625rem; font-size: 0.85rem; color: var(--color-text); }
  .invig-add { display: flex; gap: 0.75rem; }
  .invig-add select { flex: 1; padding: 0.625rem 0.75rem; border: 1.5px solid var(--color-border); border-radius: 0.5rem; background: var(--color-bg); color: var(--color-text); font-size: 0.85rem; }
</style>