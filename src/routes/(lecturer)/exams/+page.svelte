<!-- src/routes/(lecturer)/exams/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { PlusCircle, BookOpen, Clock, Users, BarChart2, Edit3, Eye } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();

  let showCreate = $state(false);
  let creating = $state(false);
  let createError = $state('');

  async function handleCreate(e: SubmitEvent) {
    e.preventDefault();
    creating = true;
    createError = '';
    const form = new FormData(e.target as HTMLFormElement);
    const res = await fetch('/api/lecturer/exams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(form))
    });
    const json = await res.json();
    if (!res.ok) { createError = json.error; creating = false; return; }
    location.href = `/lecturer/exams/${json.id}/questions`;
  }

  function statusBadge(status: string) {
    return {
      draft: 'badge badge-gray',
      scheduled: 'badge badge-blue',
      active: 'badge badge-green',
      completed: 'badge badge-gray',
      cancelled: 'badge badge-red',
    }[status] ?? 'badge badge-gray';
  }

  function formatDate(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
  }
</script>

<svelte:head><title>My Exams — MOUAU eTest</title></svelte:head>

<!-- Header -->
<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1.5rem;">
  <div>
    <h1 style="font-size:1.4rem; font-weight:800; color:var(--text); margin:0 0 0.2rem;">My Exams</h1>
    <p style="color:var(--text-muted); font-size:0.85rem; margin:0;">Create and manage your course examinations</p>
  </div>
  <button onclick={() => (showCreate = true)} class="btn btn-primary">
    <PlusCircle size={16} /> New Exam
  </button>
</div>

<!-- Create Exam Modal -->
{#if showCreate}
  <div style="position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:50; display:flex; align-items:center; justify-content:center; padding:1rem;" onclick={() => (showCreate = false)}>
    <div class="card" style="width:100%; max-width:540px; padding:1.75rem;" onclick={(e) => e.stopPropagation()}>
      <h2 style="font-size:1.1rem; font-weight:700; color:var(--text); margin:0 0 1.25rem;">Create New Exam</h2>

      {#if createError}
        <div class="alert alert-error">⚠ {createError}</div>
      {/if}

      <form onsubmit={handleCreate}>
        <div class="form-group">
          <label class="label">Course</label>
          <select name="course_id" required class="input">
            <option value="">Select course...</option>
            {#each data.courses as c}
              <option value={c.id}>{c.code} — {c.title} (Level {c.level})</option>
            {/each}
          </select>
        </div>

        <div class="form-group">
          <label class="label">Exam Title</label>
          <input name="title" type="text" required placeholder="e.g. First Semester Examination" class="input" />
        </div>

        <div class="form-group">
          <label class="label">Instructions (optional)</label>
          <textarea name="instructions" rows="2" placeholder="Instructions shown to students before exam..." class="input" style="resize:vertical;"></textarea>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:0.75rem;">
          <div class="form-group" style="margin:0;">
            <label class="label">Duration (mins)</label>
            <input name="duration_minutes" type="number" value="60" min="10" max="300" required class="input" />
          </div>
          <div class="form-group" style="margin:0;">
            <label class="label">Total Marks</label>
            <input name="total_marks" type="number" value="100" min="1" required class="input" />
          </div>
          <div class="form-group" style="margin:0;">
            <label class="label">Pass Mark</label>
            <input name="pass_mark" type="number" value="40" min="1" required class="input" />
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-top:0.25rem;">
          <div class="form-group" style="margin:0;">
            <label class="label">Session</label>
            <input name="session" type="text" value="2024/2025" required class="input" />
          </div>
          <div class="form-group" style="margin:0;">
            <label class="label">Semester</label>
            <select name="semester" required class="input">
              <option value="1">First</option>
              <option value="2">Second</option>
            </select>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-top:1rem;">
          <label style="display:flex; align-items:center; gap:0.5rem; font-size:0.85rem; color:var(--text); cursor:pointer;">
            <input type="checkbox" name="randomize_questions" value="true" checked style="accent-color:var(--primary);" />
            Randomize question order
          </label>
          <label style="display:flex; align-items:center; gap:0.5rem; font-size:0.85rem; color:var(--text); cursor:pointer;">
            <input type="checkbox" name="randomize_options" value="true" checked style="accent-color:var(--primary);" />
            Randomize MCQ options
          </label>
          <label style="display:flex; align-items:center; gap:0.5rem; font-size:0.85rem; color:var(--text); cursor:pointer;">
            <input type="checkbox" name="show_result_after" value="true" style="accent-color:var(--primary);" />
            Show result after submit
          </label>
        </div>

        <div style="display:flex; gap:0.75rem; margin-top:1.5rem; justify-content:flex-end;">
          <button type="button" onclick={() => (showCreate = false)} class="btn btn-ghost">Cancel</button>
          <button type="submit" disabled={creating} class="btn btn-primary">
            {creating ? 'Creating...' : 'Create & Add Questions →'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Exams List -->
{#if data.exams.length === 0}
  <div class="card" style="padding:3rem; text-align:center;">
    <BookOpen size={40} color="var(--text-muted)" style="margin:0 auto 1rem;" />
    <p style="font-weight:600; color:var(--text); margin:0 0 0.5rem;">No exams yet</p>
    <p style="color:var(--text-muted); font-size:0.85rem; margin:0 0 1.25rem;">Create your first exam to get started.</p>
    <button onclick={() => (showCreate = true)} class="btn btn-primary"><PlusCircle size={15} /> New Exam</button>
  </div>
{:else}
  <div style="display:grid; gap:1rem;">
    {#each data.exams as exam}
      <div class="card" style="padding:1.25rem;">
        <div style="display:flex; align-items:start; justify-content:space-between; gap:1rem; flex-wrap:wrap;">
          <div style="flex:1;">
            <div style="display:flex; align-items:center; gap:0.6rem; margin-bottom:0.4rem; flex-wrap:wrap;">
              <span style="font-family:monospace; font-size:0.75rem; background:var(--bg); border:1px solid var(--border); border-radius:0.35rem; padding:0.15rem 0.5rem; color:var(--text-muted);">{exam.course_code}</span>
              <span class={statusBadge(exam.status)}>{exam.status}</span>
            </div>
            <h3 style="font-size:1rem; font-weight:700; color:var(--text); margin:0 0 0.25rem;">{exam.title}</h3>
            <p style="color:var(--text-muted); font-size:0.82rem; margin:0;">{exam.course_title}</p>

            <div style="display:flex; flex-wrap:wrap; gap:1rem; margin-top:0.75rem; font-size:0.78rem; color:var(--text-muted);">
              <span style="display:flex; align-items:center; gap:0.3rem;"><Clock size={13} />{exam.duration_minutes} min</span>
              <span style="display:flex; align-items:center; gap:0.3rem;"><BarChart2 size={13} />{exam.total_marks} marks</span>
              <span style="display:flex; align-items:center; gap:0.3rem;"><Users size={13} />{exam.session} S{exam.semester}</span>
              <span>Starts: {formatDate(exam.scheduled_start)}</span>
            </div>
          </div>

          <div style="display:flex; gap:0.5rem; flex-shrink:0;">
            <a href={`/lecturer/exams/${exam.id}/questions`} class="btn btn-ghost" style="padding:0.4rem 0.7rem; font-size:0.78rem;">
              <Edit3 size={13} /> Questions
            </a>
            <a href={`/lecturer/exams/${exam.id}/results`} class="btn btn-ghost" style="padding:0.4rem 0.7rem; font-size:0.78rem;">
              <Eye size={13} /> Results
            </a>
          </div>
        </div>
      </div>
    {/each}
  </div>
{/if}
