<!-- src/routes/(lecturer)/exams/new/+page.svelte -->
<script lang="ts">
  import type { PageData, ActionData } from './$types';
  let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head><title>New Exam — MOUAU eTest</title></svelte:head>

<div class="page">
  <div class="page-header">
    <a href="/lecturer/dashboard" class="back">← Dashboard</a>
    <h1>Create New Exam</h1>
  </div>

  {#if form?.error}
    <div class="alert error">{form.error}</div>
  {/if}

  <form method="POST" class="exam-form">
    <section class="form-section">
      <h2>Basic Info</h2>

      <div class="field">
        <label for="title">Exam Title *</label>
        <input id="title" name="title" type="text" required placeholder="e.g. CSC301 First Semester Examination" />
      </div>

      <div class="field">
        <label for="course_id">Course *</label>
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
    </section>

    <section class="form-section">
      <h2>Timing & Scoring</h2>
      <div class="field-row">
        <div class="field">
          <label for="duration_minutes">Duration (minutes) *</label>
          <input id="duration_minutes" name="duration_minutes" type="number" value="60" min="5" max="300" required />
        </div>
        <div class="field">
          <label for="total_marks">Total Marks *</label>
          <input id="total_marks" name="total_marks" type="number" value="100" min="1" required />
        </div>
        <div class="field">
          <label for="pass_mark">Pass Mark *</label>
          <input id="pass_mark" name="pass_mark" type="number" value="40" min="1" required />
        </div>
        <div class="field">
          <label for="max_violations">Max Violations</label>
          <input id="max_violations" name="max_violations" type="number" value="5" min="1" max="20" />
        </div>
      </div>

      <div class="field-row">
        <div class="field">
          <label for="scheduled_start">Scheduled Start</label>
          <input id="scheduled_start" name="scheduled_start" type="datetime-local" />
        </div>
        <div class="field">
          <label for="scheduled_end">Scheduled End</label>
          <input id="scheduled_end" name="scheduled_end" type="datetime-local" />
        </div>
      </div>

      <div class="field-row">
        <div class="field">
          <label for="session">Academic Session *</label>
          <input id="session" name="session" type="text" value="2024/2025" required placeholder="2024/2025" />
        </div>
        <div class="field">
          <label for="semester">Semester *</label>
          <select id="semester" name="semester" required>
            <option value="1">First Semester</option>
            <option value="2">Second Semester</option>
          </select>
        </div>
      </div>
    </section>

    <section class="form-section">
      <h2>Options</h2>
      <div class="toggles">
        <label class="toggle">
          <input type="checkbox" name="randomize_questions" checked />
          <span>Randomize question order per student</span>
        </label>
        <label class="toggle">
          <input type="checkbox" name="randomize_options" checked />
          <span>Randomize MCQ option order per student</span>
        </label>
        <label class="toggle">
          <input type="checkbox" name="show_result_after" />
          <span>Show result to student immediately after submission</span>
        </label>
      </div>
    </section>

    <div class="form-footer">
      <a href="/lecturer/dashboard" class="btn-outline">Cancel</a>
      <button type="submit" class="btn-primary">Create Exam & Add Questions →</button>
    </div>
  </form>
</div>

<style>
  .page { padding: 2rem; max-width: 760px; margin: 0 auto; }
  .page-header { margin-bottom: 1.5rem; }
  .back { color: var(--color-primary); text-decoration: none; font-size: 0.875rem; }
  h1   { font-size: 1.4rem; font-weight: 700; margin: 0.5rem 0 0; }

  .alert.error {
    padding: 0.75rem 1rem; background: #fee2e2; color: #dc2626;
    border-radius: 0.5rem; margin-bottom: 1rem; font-size: 0.9rem;
  }

  .exam-form { display: flex; flex-direction: column; gap: 1.5rem; }

  .form-section {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.75rem; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem;
  }
  .form-section h2 { font-size: 1rem; font-weight: 700; margin: 0 0 0.25rem; }

  .field { display: flex; flex-direction: column; gap: 0.4rem; flex: 1; }
  .field label { font-size: 0.85rem; font-weight: 500; }

  .field input, .field select, .field textarea {
    padding: 0.6rem 0.875rem; border: 1px solid var(--color-border);
    border-radius: 0.5rem; background: var(--color-bg); color: var(--color-text);
    font-size: 0.9rem; outline: none; width: 100%; box-sizing: border-box;
    font-family: inherit;
  }
  .field input:focus, .field select:focus, .field textarea:focus {
    border-color: var(--color-primary);
  }

  .field-row { display: flex; gap: 1rem; flex-wrap: wrap; }

  .toggles { display: flex; flex-direction: column; gap: 0.75rem; }
  .toggle  { display: flex; align-items: center; gap: 0.6rem; cursor: pointer; font-size: 0.9rem; }
  .toggle input { width: 1rem; height: 1rem; cursor: pointer; }

  .form-footer {
    display: flex; justify-content: flex-end; gap: 0.75rem;
    padding-top: 0.5rem;
  }
  .btn-primary {
    padding: 0.65rem 1.5rem; background: var(--color-primary); color: #fff;
    border: none; border-radius: 0.5rem; font-weight: 600; font-size: 0.9rem; cursor: pointer;
  }
  .btn-outline {
    padding: 0.65rem 1.5rem; background: none; color: var(--color-text);
    border: 1px solid var(--color-border); border-radius: 0.5rem;
    font-weight: 600; font-size: 0.9rem; text-decoration: none;
  }
</style>