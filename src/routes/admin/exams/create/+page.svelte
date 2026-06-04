<!-- src/routes/admin/exams/create/+page.svelte -->
<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import {
    ClipboardList, BookOpen, Clock, Settings2,
    AlertCircle, Plus, Loader2, X, ChevronLeft, GraduationCap
  } from 'lucide-svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let loadingAction = $state<string | null>(null);
  let selectedLevels = $state<number[]>([]);

  const LEVELS = [100, 200, 300, 400, 500, 600];
  const SESSIONS = Array.from({ length: 6 }, (_, i) => {
    const y = new Date().getFullYear() - 2 + i;
    return `${y}/${y + 1}`;
  });

  function toggleLevel(lvl: number) {
    selectedLevels = selectedLevels.includes(lvl)
      ? selectedLevels.filter(l => l !== lvl)
      : [...selectedLevels, lvl];
  }

  const coursesByDept = $derived(
    data.courses?.reduce((acc, c) => {
      const key = `${c.department?.college?.name ?? 'Unknown'} — ${c.department?.name ?? 'Unknown'}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(c);
      return acc;
    }, {} as Record<string, typeof data.courses>) ?? {}
  );

  function handleEnhance() {
    return () => {
      loadingAction = 'create';
      return async ({ update }: { update: () => Promise<void> }) => {
        await update();
        loadingAction = null;
      };
    };
  }
</script>

<svelte:head><title>Create Exam — MOUAU eTest Admin</title></svelte:head>

<div class="create-page">
  <div class="page-header">
    <a href="/admin/exams" class="back-link">
      <ChevronLeft size={16} /> Back to Exams
    </a>
    <div class="page-title">
      <ClipboardList size={22} class="title-icon" />
      <div>
        <h1>Create Exam</h1>
        <p class="subtitle">Configure and schedule a new examination</p>
      </div>
    </div>
  </div>

  {#if form?.error}
    <div class="toast error" role="alert">
      <AlertCircle size={16} />
      <span>{form.error}</span>
      <button class="toast-close" onclick={() => form = null}><X size={14} /></button>
    </div>
  {/if}

  <form method="POST" use:enhance={handleEnhance()}>

    <!-- Basic info -->
    <div class="card">
      <div class="card-head"><BookOpen size={16} /> Basic Information</div>
      <div class="card-body">
        <div class="field-full">
          <label for="title">Exam Title <span class="req">*</span></label>
          <input id="title" name="title" placeholder="e.g. CSC 201 — Mid-Semester Examination" required />
        </div>

        <div class="field-half">
          <label for="courseId">Course <span class="req">*</span></label>
          <select id="courseId" name="courseId" required>
            <option value="">— Select course —</option>
            {#each Object.entries(coursesByDept) as [dept, courses]}
              <optgroup label={dept}>
                {#each courses as c}
                  <option value={c.id}>{c.code} — {c.title}</option>
                {/each}
              </optgroup>
            {/each}
          </select>
        </div>

        <div class="field-half">
          <label for="createdBy">Assigned Lecturer <span class="req">*</span></label>
          <select id="createdBy" name="createdBy" required>
            <option value="">— Select lecturer —</option>
            {#each data.lecturers ?? [] as l}
              <option value={l.id}>{l.fullName}{l.staffId ? ` (${l.staffId})` : ''}</option>
            {/each}
          </select>
        </div>

        <div class="field-third">
          <label for="session">Session <span class="req">*</span></label>
          <select id="session" name="session" required>
            {#each SESSIONS as s}<option value={s}>{s}</option>{/each}
          </select>
        </div>

        <div class="field-third">
          <label for="semester">Semester <span class="req">*</span></label>
          <select id="semester" name="semester" required>
            <option value="1">First Semester</option>
            <option value="2">Second Semester</option>
          </select>
        </div>

        <div class="field-third">
          <label>Target Levels</label>
          <div class="level-chips">
            {#each LEVELS as lvl}
              <button
                type="button"
                class="level-chip"
                class:selected={selectedLevels.includes(lvl)}
                onclick={() => toggleLevel(lvl)}
              >{lvl}</button>
            {/each}
          </div>
          {#each selectedLevels as lvl}
            <input type="hidden" name="levels" value={lvl} />
          {/each}
        </div>
      </div>
    </div>

    <!-- Timing & marks -->
    <div class="card">
      <div class="card-head"><Clock size={16} /> Timing & Marks</div>
      <div class="card-body">
        <div class="field-quarter">
          <label for="durationMinutes">Duration (min) <span class="req">*</span></label>
          <input id="durationMinutes" name="durationMinutes" type="number" min="5" max="480" value="60" required />
        </div>
        <div class="field-quarter">
          <label for="totalMarks">Total Marks</label>
          <input id="totalMarks" name="totalMarks" type="number" min="1" value="100" />
        </div>
        <div class="field-quarter">
          <label for="passMark">Pass Mark</label>
          <input id="passMark" name="passMark" type="number" min="1" value="40" />
        </div>
        <div class="field-quarter">
          <label for="maxViolations">Max Violations</label>
          <input id="maxViolations" name="maxViolations" type="number" min="0" max="20" value="5" />
        </div>

        <div class="field-half">
          <label for="scheduledStart">Scheduled Start</label>
          <input id="scheduledStart" name="scheduledStart" type="datetime-local" />
        </div>
        <div class="field-half">
          <label for="scheduledEnd">Scheduled End</label>
          <input id="scheduledEnd" name="scheduledEnd" type="datetime-local" />
        </div>
      </div>
    </div>

    <!-- Settings / toggles -->
    <div class="card">
      <div class="card-head"><Settings2 size={16} /> Exam Settings</div>
      <div class="card-body">
        {#each [
          { name: 'randomizeQuestions', label: 'Randomize question order',    desc: 'Shuffle questions for each student' },
          { name: 'randomizeOptions',   label: 'Randomize answer options',    desc: 'Shuffle MCQ options per question' },
          { name: 'showResultAfter',    label: 'Show results immediately',    desc: 'Students see score on submission' },
          { name: 'allowLateEntry',     label: 'Allow late entry',            desc: 'Permit joining after scheduled start' },
        ] as toggle}
          <div class="field-half">
            <label class="toggle-label" for={toggle.name}>
              <input type="checkbox" id={toggle.name} name={toggle.name} checked />
              <div class="toggle-content">
                <div class="toggle-title">{toggle.label}</div>
                <div class="toggle-desc">{toggle.desc}</div>
              </div>
            </label>
          </div>
        {/each}
      </div>
    </div>

    <!-- Submit -->
    <div class="form-foot">
      <a href="/admin/exams" class="btn-ghost">Cancel</a>
      <button type="submit" class="btn-primary" disabled={loadingAction === 'create'}>
        {#if loadingAction === 'create'}
          <Loader2 size={15} class="spin" /> Creating...
        {:else}
          <Plus size={15} /> Create Exam
        {/if}
      </button>
    </div>
  </form>
</div>

<style>
  .create-page { display: flex; flex-direction: column; gap: 1.25rem; max-width: 900px; }

  /* ── Page Header ─────────────────────────────────────────────── */
  .page-header { display: flex; flex-direction: column; gap: 0.75rem; }
  .back-link {
    display: inline-flex; align-items: center; gap: 0.25rem;
    font-size: 0.78rem; color: var(--color-muted); text-decoration: none;
    font-weight: 500; transition: color 0.15s; width: fit-content;
  }
  .back-link:hover { color: #3b82f6; }
  .page-title { display: flex; align-items: center; gap: 0.875rem; }
  .page-title :global(.title-icon) { color: #3b82f6; flex-shrink: 0; }
  .page-title h1 { font-size: 1.35rem; font-weight: 700; color: var(--color-text); line-height: 1.2; margin: 0; }
  .subtitle { font-size: 0.8rem; color: var(--color-muted); margin-top: 0.15rem; }

  /* ── Toast ───────────────────────────────────────────────────── */
  .toast {
    display: flex; align-items: center; gap: 0.625rem;
    padding: 0.875rem 1rem;
    border-radius: 0.625rem;
    font-size: 0.875rem; font-weight: 500;
    animation: slideIn 0.2s ease;
  }
  .toast.error {
    background: rgba(220,38,38,0.08);
    color: #dc2626;
    border: 1px solid rgba(220,38,38,0.15);
  }
  .toast-close {
    margin-left: auto;
    background: none; border: none; cursor: pointer;
    color: currentColor; opacity: 0.5; padding: 0.15rem;
    border-radius: 0.25rem; display: flex; align-items: center;
    transition: opacity 0.15s;
  }
  .toast-close:hover { opacity: 1; }
  @keyframes slideIn {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── Card ────────────────────────────────────────────────────── */
  .card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.875rem; overflow: hidden; }
  .card-head {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.875rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
    font-size: 0.85rem; font-weight: 700; color: var(--color-text);
    background: var(--color-bg);
  }
  .card-body {
    display: grid; grid-template-columns: repeat(12, 1fr); gap: 1rem;
    padding: 1.25rem;
  }

  /* ── Fields ──────────────────────────────────────────────────── */
  .field-full    { grid-column: span 12; }
  .field-half    { grid-column: span 6; }
  .field-third   { grid-column: span 4; }
  .field-quarter { grid-column: span 3; }

  label { display: block; font-size: 0.72rem; font-weight: 700; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.4rem; }
  .req { color: #dc2626; }

  input[type="text"], input[type="number"], input[type="datetime-local"], select {
    width: 100%; padding: 0.65rem 0.875rem;
    background: var(--color-bg); border: 1px solid var(--color-border);
    border-radius: 0.5rem; font-size: 0.82rem; color: var(--color-text);
    font-family: inherit; outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    -webkit-appearance: none; appearance: none;
  }
  input:focus, select:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
  input::placeholder { color: var(--color-muted); opacity: 0.5; }

  /* ── Level Chips ─────────────────────────────────────────────── */
  .level-chips { display: flex; gap: 0.375rem; flex-wrap: wrap; }
  .level-chip {
    padding: 0.4rem 0.875rem; border-radius: 2rem;
    border: 1.5px solid var(--color-border); background: var(--color-bg);
    font-size: 0.78rem; font-weight: 600; color: var(--color-muted);
    cursor: pointer; font-family: inherit;
    transition: all 0.15s;
  }
  .level-chip:hover { border-color: rgba(59,130,246,0.4); color: #3b82f6; }
  .level-chip.selected {
    border-color: #3b82f6; color: #3b82f6;
    background: rgba(59, 130, 246, 0.08);
  }

  /* ── Toggle ──────────────────────────────────────────────────── */
  .toggle-label {
    display: flex; align-items: flex-start; gap: 0.625rem;
    cursor: pointer; padding: 0.5rem;
    border-radius: 0.5rem;
    transition: background 0.15s;
  }
  .toggle-label:hover { background: var(--color-bg); }
  .toggle-label input[type="checkbox"] {
    margin-top: 0.15rem; flex-shrink: 0;
    width: 16px; height: 16px;
    accent-color: #3b82f6; cursor: pointer;
  }
  .toggle-content { display: flex; flex-direction: column; gap: 0.15rem; }
  .toggle-title { font-size: 0.82rem; font-weight: 600; color: var(--color-text); }
  .toggle-desc { font-size: 0.72rem; color: var(--color-muted); }

  /* ── Footer ──────────────────────────────────────────────────── */
  .form-foot {
    display: flex; align-items: center; justify-content: flex-end; gap: 0.75rem;
    padding-top: 0.5rem;
  }
  .btn-primary {
    display: inline-flex; align-items: center; gap: 0.5rem;
    padding: 0.6rem 1.25rem; background: #3b82f6; color: white;
    border: none; border-radius: 0.5rem; font-size: 0.85rem; font-weight: 600;
    cursor: pointer; font-family: inherit;
    transition: background 0.15s, transform 0.1s;
  }
  .btn-primary:hover:not(:disabled) { background: #2563eb; }
  .btn-primary:active:not(:disabled) { transform: translateY(1px); }
  .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

  .btn-ghost {
    display: inline-flex; align-items: center; gap: 0.5rem;
    padding: 0.6rem 1.25rem; background: transparent;
    border: 1px solid var(--color-border); color: var(--color-text);
    border-radius: 0.5rem; font-size: 0.85rem; font-weight: 600;
    cursor: pointer; font-family: inherit; text-decoration: none;
    transition: all 0.15s;
  }
  .btn-ghost:hover { background: var(--color-bg); border-color: var(--color-text); }

  /* ── Spin ────────────────────────────────────────────────────── */
  :global(.spin) { animation: spin 0.7s linear infinite; display: inline-block; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Responsive ──────────────────────────────────────────────── */
  @media (max-width: 640px) {
    .field-half, .field-third, .field-quarter { grid-column: span 12; }
    .form-foot { flex-direction: column-reverse; }
    .form-foot :global(.btn-primary), .form-foot :global(.btn-ghost) { width: 100%; justify-content: center; }
  }
</style>