<!-- src/routes/lecturer/exams/new/+page.svelte -->
<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import {
    ChevronLeft, BookOpen, Clock, Settings,
    AlertCircle, Info, Users
  } from 'lucide-svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  const LEVELS = [100, 200, 300, 400, 500, 600] as const;

  // Selected levels — set of numbers
  let selectedLevels = $state<Set<number>>(new Set());
  let allLevels = $derived(selectedLevels.size === LEVELS.length);

  function toggleLevel(level: number) {
    const next = new Set(selectedLevels);
    if (next.has(level)) {
      next.delete(level);
    } else {
      next.add(level);
    }
    selectedLevels = next;
  }

  function toggleAll() {
    if (allLevels) {
      selectedLevels = new Set();
    } else {
      selectedLevels = new Set(LEVELS);
    }
  }

  // Serialise for the hidden input: "100,200,300" or "" (means all)
  const levelsValue = $derived(
    allLevels ? 'all' : [...selectedLevels].sort((a, b) => a - b).join(',')
  );
</script>

<svelte:head><title>New Exam — MOUAU eTest</title></svelte:head>

<div class="dashboard">

  <!-- ══ HEADER ══════════════════════════════════════════════ -->
  <header class="dash-header">
    <div class="dash-header-left">
      <a href="/lecturer" class="back-link">
        <ChevronLeft size={15} /> Dashboard
      </a>
      <h1 class="dash-title">Create New Exam</h1>
      <p class="dash-subtitle">Set up a new examination for your students</p>
    </div>
  </header>

  {#if form?.error}
    <div class="alert-error">
      <AlertCircle size={15} />
      {form.error}
    </div>
  {/if}

  <form method="POST" class="form-layout">

    <!-- ══ LEFT COL ═════════════════════════════════════════ -->
    <div class="left-col">

      <!-- Basic Info -->
      <section class="panel">
        <div class="panel-head">
          <div class="panel-title-wrap">
            <BookOpen size={15} />
            <h2>Basic Info</h2>
          </div>
        </div>
        <div class="panel-body">
          <div class="field">
            <label for="title">Exam Title <span class="req">*</span></label>
            <input id="title" name="title" type="text" required
              placeholder="e.g. CSC301 First Semester Examination" />
          </div>
          <div class="field">
            <label for="course_id">Course <span class="req">*</span></label>
            <select id="course_id" name="course_id" required>
              <option value="">Select a course…</option>
              {#each data.courses as c}
                <option value={c.id}>{c.code} — {c.title}</option>
              {/each}
            </select>
          </div>
          <div class="field">
            <label for="instructions">Instructions</label>
            <textarea id="instructions" name="instructions" rows="3"
              placeholder="Answer all questions. No external resources allowed."></textarea>
          </div>
        </div>
      </section>

      <!-- ══ SCOPE ══════════════════════════════════════════ -->
      <section class="panel">
        <div class="panel-head">
          <div class="panel-title-wrap">
            <Users size={15} />
            <h2>Exam Scope</h2>
          </div>
          <span class="panel-hint">Who can sit this exam?</span>
        </div>

        <div class="panel-body">

          <!-- Level selector -->
          <div class="scope-block">
            <div class="scope-label-row">
              <span class="scope-label">Student Levels</span>
              <button
                type="button"
                class="all-btn"
                class:all-active={allLevels}
                onclick={toggleAll}
              >
                {allLevels ? '✓ All Levels' : 'Select All'}
              </button>
            </div>

            <div class="level-grid">
              {#each LEVELS as level}
                <button
                  type="button"
                  class="level-chip"
                  class:selected={selectedLevels.has(level)}
                  onclick={() => toggleLevel(level)}
                  aria-pressed={selectedLevels.has(level)}
                >
                  <span class="level-num">{level}</span>
                  <span class="level-suffix">Level</span>
                </button>
              {/each}
            </div>

            {#if selectedLevels.size === 0 && !allLevels}
              <p class="scope-note">
                No level selected — defaults to all levels.
              </p>
            {:else}
              <p class="scope-note selected-note">
                {allLevels
                  ? 'All levels (100 – 600) can sit this exam.'
                  : `${[...selectedLevels].sort((a,b)=>a-b).map(l => l + 'L').join(', ')} students can sit this exam.`}
              </p>
            {/if}

            <!-- Hidden serialised value picked up by the server action -->
            <input type="hidden" name="levels" value={levelsValue} />
          </div>

          <div class="scope-divider"></div>

          <!-- Department -->
          <div class="scope-block">
            <div class="scope-label-row">
              <span class="scope-label">Department</span>
              <span class="scope-optional">Optional</span>
            </div>
            <div class="field" style="margin-top:0">
              <input
                id="department"
                name="department"
                type="text"
                placeholder="e.g. Computer Science, All Departments"
              />
              <span class="field-hint">
                Leave blank to allow all departments. Separate multiple with commas.
              </span>
            </div>
          </div>

        </div>
      </section>

      <!-- Timing & Scoring -->
      <section class="panel">
        <div class="panel-head">
          <div class="panel-title-wrap">
            <Clock size={15} />
            <h2>Timing &amp; Scoring</h2>
          </div>
        </div>
        <div class="panel-body">
          <div class="field-grid">
            <div class="field">
              <label for="duration_minutes">Duration (minutes) <span class="req">*</span></label>
              <input id="duration_minutes" name="duration_minutes" type="number" value="60" min="5" max="300" required />
            </div>
            <div class="field">
              <label for="total_marks">Total Marks <span class="req">*</span></label>
              <input id="total_marks" name="total_marks" type="number" value="100" min="1" required />
            </div>
            <div class="field">
              <label for="pass_mark">Pass Mark <span class="req">*</span></label>
              <input id="pass_mark" name="pass_mark" type="number" value="40" min="1" required />
            </div>
            <div class="field">
              <label for="max_violations">Max Violations</label>
              <input id="max_violations" name="max_violations" type="number" value="5" min="1" max="20" />
            </div>
          </div>

          <div class="field-grid">
            <div class="field">
              <label for="scheduled_start">Scheduled Start</label>
              <input id="scheduled_start" name="scheduled_start" type="datetime-local" />
            </div>
            <div class="field">
              <label for="scheduled_end">Scheduled End</label>
              <input id="scheduled_end" name="scheduled_end" type="datetime-local" />
            </div>
          </div>

          <div class="field-grid">
            <div class="field">
              <label for="session">Academic Session <span class="req">*</span></label>
              <input id="session" name="session" type="text" value="2024/2025" required placeholder="2024/2025" />
            </div>
            <div class="field">
              <label for="semester">Semester <span class="req">*</span></label>
              <select id="semester" name="semester" required>
                <option value="1">First Semester</option>
                <option value="2">Second Semester</option>
              </select>
            </div>
          </div>
        </div>
      </section>

    </div>

    <!-- ══ RIGHT COL ════════════════════════════════════════ -->
    <div class="right-col">

      <!-- Options -->
      <section class="panel">
        <div class="panel-head">
          <div class="panel-title-wrap">
            <Settings size={15} />
            <h2>Options</h2>
          </div>
        </div>
        <div class="panel-body toggle-body">
          <label class="toggle-row">
            <div class="toggle-info">
              <span class="toggle-label">Randomize Questions</span>
              <span class="toggle-desc">Shuffle question order per student</span>
            </div>
            <input type="checkbox" name="randomize_questions" checked class="toggle-cb" />
          </label>
          <label class="toggle-row">
            <div class="toggle-info">
              <span class="toggle-label">Randomize Options</span>
              <span class="toggle-desc">Shuffle MCQ option order per student</span>
            </div>
            <input type="checkbox" name="randomize_options" checked class="toggle-cb" />
          </label>
          <label class="toggle-row">
            <div class="toggle-info">
              <span class="toggle-label">Show Result After</span>
              <span class="toggle-desc">Display result immediately after submission</span>
            </div>
            <input type="checkbox" name="show_result_after" class="toggle-cb" />
          </label>
        </div>
      </section>

      <!-- Info card -->
      <div class="info-card">
        <div class="info-icon"><Info size={16} /></div>
        <div class="info-text">
          <span class="info-title">Next Steps</span>
          <span class="info-desc">After creating the exam, you'll be taken to the question builder to add MCQ and fill-in-the-blank questions.</span>
        </div>
      </div>

      <!-- Submit -->
      <div class="form-footer">
        <a href="/lecturer" class="btn-outline">Cancel</a>
        <button type="submit" class="btn-primary">
          Create Exam &amp; Add Questions →
        </button>
      </div>

    </div>
  </form>

</div>

<style>
  .dashboard {
    padding: 2rem 2.5rem 3rem;
    max-width: 1100px; margin: 0 auto;
    display: flex; flex-direction: column; gap: 2rem;
  }

  /* ── Header ──────────────────────────────────────────── */
  .dash-header { padding-bottom: 0.5rem; border-bottom: 1px solid var(--color-border); }
  .back-link {
    display: inline-flex; align-items: center; gap: 0.25rem;
    font-size: 0.78rem; font-weight: 600; color: #16a34a;
    text-decoration: none; margin-bottom: 0.5rem; transition: gap 0.15s;
  }
  .back-link:hover { gap: 0.4rem; }
  .dash-title {
    font-size: 2rem; font-weight: 900; letter-spacing: -0.04em;
    color: var(--color-text); margin: 0 0 0.2rem; line-height: 1;
  }
  .dash-subtitle { font-size: 0.82rem; color: var(--color-muted); margin: 0; }

  /* ── Alert ───────────────────────────────────────────── */
  .alert-error {
    display: flex; align-items: center; gap: 0.6rem;
    padding: 0.875rem 1rem; background: rgba(239,68,68,0.08);
    border: 1px solid rgba(239,68,68,0.25); border-radius: 0.75rem;
    font-size: 0.875rem; color: #dc2626;
  }

  /* ── Layout ──────────────────────────────────────────── */
  .form-layout {
    display: grid; grid-template-columns: 1fr 340px; gap: 1.5rem; align-items: start;
  }
  @media (max-width: 900px) { .form-layout { grid-template-columns: 1fr; } }
  .left-col, .right-col { display: flex; flex-direction: column; gap: 1.25rem; }

  /* ── Panel ───────────────────────────────────────────── */
  .panel {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 1rem; overflow: hidden;
    animation: fadeUp 0.4s ease both;
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .panel-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 1rem 1.25rem; border-bottom: 1px solid var(--color-border);
    background: var(--color-bg);
  }
  .panel-title-wrap { display: flex; align-items: center; gap: 0.5rem; color: var(--color-muted); }
  .panel-title-wrap h2 {
    font-size: 0.82rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--color-text); margin: 0;
  }
  .panel-hint { font-size: 0.75rem; color: var(--color-muted); font-style: italic; }
  .panel-body { padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }

  /* ── Scope block ─────────────────────────────────────── */
  .scope-block { display: flex; flex-direction: column; gap: 0.75rem; }

  .scope-label-row {
    display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
  }

  .scope-label {
    font-size: 0.82rem; font-weight: 600; color: var(--color-text);
  }

  .scope-optional {
    font-size: 0.72rem; font-weight: 600; color: var(--color-muted);
    background: var(--color-border); padding: 0.15rem 0.5rem;
    border-radius: 999px; text-transform: uppercase; letter-spacing: 0.04em;
  }

  /* "Select All" button */
  .all-btn {
    font-size: 0.72rem; font-weight: 700; padding: 0.25rem 0.65rem;
    border-radius: 999px; border: 1.5px solid var(--color-border);
    background: none; color: var(--color-muted);
    cursor: pointer; transition: all 0.15s;
    text-transform: uppercase; letter-spacing: 0.04em;
  }
  .all-btn:hover { border-color: #16a34a; color: #16a34a; }
  .all-btn.all-active {
    background: #16a34a; border-color: #16a34a; color: white;
  }

  /* Level chip grid */
  .level-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }

  .level-chip {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 0.1rem;
    padding: 0.7rem 0.5rem;
    border-radius: 0.625rem;
    border: 1.5px solid var(--color-border);
    background: var(--color-bg);
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
    position: relative;
    overflow: hidden;
  }

  .level-chip::before {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(22, 163, 74, 0.06);
    opacity: 0;
    transition: opacity 0.15s;
  }

  .level-chip:hover { border-color: #16a34a; }
  .level-chip:hover::before { opacity: 1; }

  .level-chip.selected {
    border-color: #16a34a;
    background: rgba(22, 163, 74, 0.08);
  }

  .level-chip.selected::after {
    content: '✓';
    position: absolute;
    top: 4px; right: 6px;
    font-size: 0.6rem;
    font-weight: 800;
    color: #16a34a;
  }

  .level-num {
    font-size: 1.2rem; font-weight: 900;
    color: var(--color-text);
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }

  .level-chip.selected .level-num { color: #16a34a; }

  .level-suffix {
    font-size: 0.65rem; font-weight: 600;
    color: var(--color-muted); text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* Note below chips */
  .scope-note {
    font-size: 0.775rem; color: var(--color-muted);
    margin: 0; padding: 0.5rem 0.75rem;
    background: var(--color-bg); border-radius: 0.5rem;
    border: 1px solid var(--color-border);
    line-height: 1.5;
  }

  .scope-note.selected-note {
    color: #16a34a;
    background: rgba(22, 163, 74, 0.05);
    border-color: rgba(22, 163, 74, 0.2);
  }

  .scope-divider {
    height: 1px; background: var(--color-border); margin: 0.25rem 0;
  }

  /* Field hint */
  .field-hint {
    font-size: 0.74rem; color: var(--color-muted); margin-top: 0.2rem;
    line-height: 1.4;
  }

  /* ── Form Fields ─────────────────────────────────────── */
  .field { display: flex; flex-direction: column; gap: 0.4rem; }
  .field label { font-size: 0.82rem; font-weight: 600; color: var(--color-text); }
  .req { color: #ef4444; }

  .field input, .field select, .field textarea {
    padding: 0.6rem 0.875rem;
    border: 1px solid var(--color-border); border-radius: 0.6rem;
    background: var(--color-bg); color: var(--color-text);
    font-size: 0.875rem; font-family: inherit; outline: none;
    width: 100%; box-sizing: border-box; resize: vertical;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .field input:focus, .field select:focus, .field textarea:focus {
    border-color: #16a34a; box-shadow: 0 0 0 3px rgba(22,163,74,0.1);
  }
  .field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.875rem; }
  @media (max-width: 600px) { .field-grid { grid-template-columns: 1fr; } }

  /* ── Toggles ─────────────────────────────────────────── */
  .toggle-body { gap: 0; padding: 0; }
  .toggle-row {
    display: flex; align-items: center; justify-content: space-between; gap: 1rem;
    padding: 1rem 1.25rem; cursor: pointer;
    border-bottom: 1px solid var(--color-border);
    transition: background 0.12s;
  }
  .toggle-row:last-child { border-bottom: none; }
  .toggle-row:hover { background: var(--color-bg); }
  .toggle-info { display: flex; flex-direction: column; gap: 0.15rem; }
  .toggle-label { font-size: 0.85rem; font-weight: 600; color: var(--color-text); }
  .toggle-desc  { font-size: 0.75rem; color: var(--color-muted); }
  .toggle-cb { width: 1rem; height: 1rem; flex-shrink: 0; cursor: pointer; accent-color: #16a34a; }

  /* ── Info card ───────────────────────────────────────── */
  .info-card {
    display: flex; gap: 0.875rem; padding: 1rem 1.25rem;
    background: rgba(22,163,74,0.05); border: 1px solid rgba(22,163,74,0.2);
    border-radius: 1rem;
  }
  .info-icon { color: #16a34a; flex-shrink: 0; margin-top: 0.1rem; }
  .info-text  { display: flex; flex-direction: column; gap: 0.25rem; }
  .info-title { font-size: 0.82rem; font-weight: 700; color: var(--color-text); }
  .info-desc  { font-size: 0.78rem; color: var(--color-muted); line-height: 1.5; }

  /* ── Footer ──────────────────────────────────────────── */
  .form-footer { display: flex; flex-direction: column; gap: 0.625rem; }
  .btn-primary {
    display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
    padding: 0.75rem 1.25rem; background: #16a34a; border: 1px solid #16a34a;
    border-radius: 0.75rem; font-size: 0.875rem; font-weight: 700; color: white;
    cursor: pointer; transition: all 0.15s; text-decoration: none;
  }
  .btn-primary:hover { background: #15803d; border-color: #15803d; }
  .btn-outline {
    display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
    padding: 0.75rem 1.25rem; background: transparent;
    border: 1px solid var(--color-border); border-radius: 0.75rem;
    font-size: 0.875rem; font-weight: 600; color: var(--color-text);
    cursor: pointer; transition: all 0.15s; text-decoration: none;
  }
  .btn-outline:hover { border-color: #16a34a; color: #16a34a; }

  /* Dark mode tweaks */
  :global(.dark) .level-chip.selected {
    background: rgba(22, 163, 74, 0.12);
  }
  :global(.dark) .scope-note.selected-note {
    background: rgba(22, 163, 74, 0.08);
  }
</style>