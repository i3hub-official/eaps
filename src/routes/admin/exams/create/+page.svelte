<!-- src/routes/admin/exams/create/+page.svelte -->
<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import {
    ClipboardList, BookOpen, Users, Calendar, Settings2,
    Shield, ChevronRight, AlertCircle, Clock, Hash,
    ToggleLeft, Shuffle, Eye, CheckSquare, Plus
  } from 'lucide-svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let loading = $state(false);
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

  // Group courses by department
  const coursesByDept = $derived(
    data.courses.reduce((acc, c) => {
      const key = `${c.department.college.name} — ${c.department.name}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(c);
      return acc;
    }, {} as Record<string, typeof data.courses>)
  );
</script>

<div class="create-page">
  <div class="create-header">
    <div class="header-icon"><ClipboardList size={20} /></div>
    <div>
      <h1>Create Exam</h1>
      <p>Configure and schedule a new examination</p>
    </div>
  </div>

  {#if form?.error}
    <div class="form-error"><AlertCircle size={14} /> {form.error}</div>
  {/if}

  <form method="POST" use:enhance={() => { loading = true; return async ({ update }) => { loading = false; await update(); }; }}>

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
            {#each data.lecturers as l}
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
              <!-- Hidden inputs to submit selected levels -->
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
          <label for="durationMinutes">Duration (minutes) <span class="req">*</span></label>
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
          <input id="maxViolations" name="maxViolations" type="number" min="1" max="20" value="5" />
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
          { name: 'randomizeQuestions', label: 'Randomize question order',    desc: 'Shuffle questions for each student',       icon: Shuffle },
          { name: 'randomizeOptions',   label: 'Randomize answer options',    desc: 'Shuffle MCQ options per question',         icon: Shuffle },
          { name: 'showResultAfter',    label: 'Show results immediately',    desc: 'Students see score on submission',         icon: Eye },
          { name: 'allowLateEntry',     label: 'Allow late entry',            desc: 'Permit joining after scheduled start',     icon: Clock },
        ] as toggle}
          <div class="field-half">
            <label class="toggle-label">
              <input type="checkbox" name={toggle.name} checked />
              <div class="toggle-content">
                <div class="toggle-title"><toggle.icon size={14} /> {toggle.label}</div>
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
      <button type="submit" class="btn-primary" disabled={loading}>
        {#if loading}<span class="spin">⟳</span>{:else}<Plus size={15} />{/if}
        Create Exam
      </button>
    </div>
  </form>
</div>

<style>
  .create-page { display: flex; flex-direction: column; gap: 1.25rem; max-width: 900px; }
  .create-header { display: flex; align-items: center; gap: .875rem; }
  .header-icon {
    width: 44px; height: 44px; border-radius: .75rem;
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0;
  }
  h1 { font-size: 1.2rem; font-weight: 800; color: var(--color-text); }
  p  { font-size: .8rem; color: var(--color-muted); }

  .form-error { display: flex; align-items: center; gap: .5rem; padding: .75rem 1rem; background: rgba(220,38,38,.08); border: 1px solid rgba(220,38,38,.25); border-radius: .625rem; font-size: .82rem; color: #dc2626; }

  /* Card */
  .card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: .875rem; overflow: hidden; }
  .card-head { display: flex; align-items: center; gap: .5rem; padding: .875rem 1.25rem; border-bottom: 1px solid var(--color-border); font-size: .85rem; font-weight: 700; color: var(--color-text); background: var(--color-bg); }
  .card-body { display: grid; grid-template-columns: repeat(12, 1fr); gap: 1rem; padding: 1.25rem; }

  /* Field sizes */
  .field-full   { grid-column: span 12; }
  .field-half   { grid-column: span 6; }
  .field-third  { grid-column: span 4; }
  .field-quarter{ grid-column: span 3; }

  label { display: block; font-size: .78rem; font-weight: 600; color: var(--color-text); margin-bottom: .375rem; }
  .req  { color: #dc2626; }

  input[type="text"], input[type="number"], input[type="datetime-local"], select {
    width: 100%; padding: .6rem .875rem;
    background: var(--color-bg); border: 1px solid var(--color-border);
    border-radius: .5rem; font-size: .82rem; color: var(--color-text);
    font-family: inherit; outline: none; transition: border-color .15s;
    -webkit-appearance: none;
  }
  input:focus, select:focus { border-color: #3b82f6; }

  /* Level chips */
  .level-chips { display: flex; gap: .375rem; flex-wrap: wrap; }
  .level-chip {
    padding: .35rem .75rem; border-radius: 2rem;
    border: 1.5px solid var(--color-border); background: var(--color-bg);
    font-size: .78rem; font-weight: 600; color: var(--color-muted);
    cursor: pointer; font-family: inherit; transition: all .15s;
  }
  .level-chip.selected { border-color: #3b82f6; color: #3b82f6; background: rgba(59, 130, 246, .08); }

  /* Toggle */
  .toggle-label { display: flex; align-items: flex-start; gap: .625rem; cursor: pointer; }
  .toggle-label input[type="checkbox"] { margin-top: .2rem; flex-shrink: 0; width: 16px; height: 16px; accent-color: #3b82f6; }
  .toggle-content { display: flex; flex-direction: column; gap: .2rem; }
  .toggle-title { display: flex; align-items: center; gap: .375rem; font-size: .82rem; font-weight: 600; color: var(--color-text); }
  .toggle-desc { font-size: .72rem; color: var(--color-muted); }

  /* Footer */
  .form-foot { display: flex; align-items: center; justify-content: flex-end; gap: .75rem; padding-top: .5rem; }
  .btn-primary {
    display: flex; align-items: center; gap: .5rem;
    padding: .6rem 1.25rem; background: #3b82f6; color: white;
    border: none; border-radius: .5rem; font-size: .85rem; font-weight: 600;
    cursor: pointer; font-family: inherit; transition: background .15s;
  }
  .btn-primary:hover { background: #1d4ed8; }
  .btn-primary:disabled { opacity: .5; cursor: not-allowed; }
  .btn-ghost {
    display: flex; align-items: center; gap: .5rem;
    padding: .6rem 1.25rem; background: transparent;
    border: 1px solid var(--color-border); color: var(--color-text);
    border-radius: .5rem; font-size: .85rem; font-weight: 600; cursor: pointer; font-family: inherit; text-decoration: none;
  }
  .btn-ghost:hover { background: var(--color-surface-hover); }
  .spin { display: inline-block; animation: spin .7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 640px) {
    .field-half, .field-third, .field-quarter { grid-column: span 12; }
  }
</style>
