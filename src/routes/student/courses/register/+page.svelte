<!-- src/routes/student/courses/register/+page.svelte -->

<script lang="ts">
  import {
    BookOpen, Plus, Trash2, CheckCircle2, AlertCircle,
    GraduationCap, Hash, CreditCard, ArrowRight, X
  } from 'lucide-svelte';
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';

  let { data, form }: { data: PageData; form: ActionData } = $props();
const course = data.availableCourses.find(c => c.id === selectedCourse);
  
let selectedCourse = $state<string | null>(
    data.availableCourses.find(c => c.preselected)?.id ?? null
  );
  let selectedType = $state<'normal' | 'carry_over' | 'borrowed'>('normal');
  let showConfirm = $state(false);
  let dropTarget = $state<string | null>(null);

  const totalCredits = $derived(
    data.existingRegistrations.reduce((sum, r) => sum + r.creditUnits, 0)
  );
  const creditPercent = $derived((totalCredits / data.meta.maxCredits) * 100);

  function typeLabel(t: string) {
    switch (t) {
      case 'carry_over': return 'Carry Over';
      case 'borrowed': return 'Borrowed';
      default: return 'Normal';
    }
  }
  function typeColor(t: string) {
    switch (t) {
      case 'carry_over': return '#f59e0b';
      case 'borrowed': return '#3b82f6';
      default: return 'var(--green-600)';
    }
  }
</script>

<div class="register-page">
  <div class="page-header">
    <div>
      <h1>Course Registration</h1>
      <p class="page-sub">{data.meta.session} · Semester {data.meta.semester}</p>
    </div>
  </div>

  <!-- Credit meter -->
  <div class="credit-meter">
    <div class="credit-meter-top">
      <span class="credit-label"><CreditCard size={13} /> Credit Units</span>
      <span class="credit-value">{totalCredits} / {data.meta.maxCredits}</span>
    </div>
    <div class="credit-bar">
      <div class="credit-fill" style="width: {creditPercent}%; background: {creditPercent > 90 ? '#dc2626' : creditPercent > 75 ? '#f59e0b' : 'var(--green-600)'};"></div>
    </div>
    {#if creditPercent >= 100}
      <p class="credit-warning"><AlertCircle size={12} /> Credit limit reached</p>
    {/if}
  </div>

  <!-- Already registered -->
  <section class="reg-section">
    <div class="section-head">
      <CheckCircle2 size={15} />
      <h2>Registered Courses ({data.existingRegistrations.length})</h2>
    </div>
    {#if data.existingRegistrations.length === 0}
      <div class="empty-reg">
        <BookOpen size={24} strokeWidth={1.5} />
        <p>No courses registered yet.</p>
      </div>
    {:else}
      <div class="reg-list">
        {#each data.existingRegistrations as reg (reg.id)}
          <div class="reg-row">
            <div class="reg-info">
              <span class="reg-code">{reg.courseCode}</span>
              <span class="reg-title">{reg.courseTitle}</span>
              <span class="reg-type" style="color: {typeColor(reg.registrationType)}; background: {typeColor(reg.registrationType)}15;">
                {typeLabel(reg.registrationType)}
              </span>
            </div>
            <div class="reg-actions">
              <span class="reg-credits">{reg.creditUnits} CU</span>
              <form method="POST" action="?/drop" use:enhance={() => {
                dropTarget = reg.id;
                return async ({ update }) => { dropTarget = null; update(); };
              }}>
                <input type="hidden" name="registrationId" value={reg.id} />
                <button type="submit" class="drop-btn" disabled={dropTarget === reg.id} aria-label="Drop course">
                  <Trash2 size={13} />
                </button>
              </form>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <!-- Available courses -->
  <section class="reg-section">
    <div class="section-head">
      <Plus size={15} />
      <h2>Available Courses ({data.availableCourses.length})</h2>
    </div>
    {#if data.availableCourses.length === 0}
      <div class="empty-reg">
        <CheckCircle2 size={24} strokeWidth={1.5} />
        <p>All available courses have been registered.</p>
      </div>
    {:else}
      <div class="avail-grid">
        {#each data.availableCourses as course (course.id)}
          <div class="avail-card" class:selected={selectedCourse === course.id}>
            <div class="avail-top">
              <div class="avail-icon"><Hash size={14} /></div>
              <div class="avail-meta">
                <span class="avail-code">{course.code}</span>
                <span class="avail-credits">{course.creditUnits} CU · {course.registrationCount} registered</span>
              </div>
            </div>
            <h4 class="avail-title">{course.title}</h4>
            <div class="avail-details">
              <span><GraduationCap size={10} /> {course.department}</span>
              <span>Level {course.level}</span>
            </div>
            <button
              class="avail-select-btn"
              class:active={selectedCourse === course.id}
              onclick={() => { selectedCourse = course.id; showConfirm = true; }}
              disabled={totalCredits + course.creditUnits > data.meta.maxCredits}
            >
              {selectedCourse === course.id ? 'Selected' : 'Select'}
            </button>
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <!-- Registration type + confirm -->
  {#if showConfirm && selectedCourse}
    <div class="confirm-panel">
      <div class="confirm-head">
        <h3>Confirm Registration</h3>
        <button class="confirm-close" onclick={() => showConfirm = false}><X size={14} /></button>
      </div>
      
      {#if course}
        <p class="confirm-course">{course.code} — {course.title} ({course.creditUnits} CU)</p>
        <div class="type-selector">
          {#each ['normal', 'carry_over', 'borrowed'] as t}
            <button
              class="type-option"
              class:active={selectedType === t}
              onclick={() => selectedType = t as any}
            >
              <span class="type-dot" style="background: {typeColor(t)}"></span>
              {typeLabel(t)}
            </button>
          {/each}
        </div>
        <form method="POST" action="?/register" use:enhance={() => {
          return async ({ update }) => { showConfirm = false; selectedCourse = null; update(); };
        }}>
          <input type="hidden" name="courseId" value={course.id} />
          <input type="hidden" name="type" value={selectedType} />
          <button type="submit" class="confirm-btn" disabled={totalCredits + course.creditUnits > data.meta.maxCredits}>
            <CheckCircle2 size={14} /> Confirm Registration
          </button>
        </form>
        {#if form?.error}
          <p class="form-error"><AlertCircle size={12} /> {form.error}</p>
        {/if}
      {/if}
    </div>
  {/if}
</div>

<style>
  .register-page { display: flex; flex-direction: column; gap: 1.25rem; }
  .page-header h1 { font-size: 1.25rem; font-weight: 800; color: var(--color-text); margin: 0; }
  .page-sub { font-size: 0.78rem; color: var(--color-muted); margin: 0.25rem 0 0; }

  .credit-meter {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: var(--radius-card); padding: 1rem;
    display: flex; flex-direction: column; gap: 0.5rem;
  }
  .credit-meter-top { display: flex; justify-content: space-between; align-items: center; }
  .credit-label { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.78rem; font-weight: 600; color: var(--color-muted); }
  .credit-value { font-size: 0.85rem; font-weight: 800; color: var(--color-text); }
  .credit-bar { height: 6px; border-radius: 3px; background: var(--color-bg); overflow: hidden; }
  .credit-fill { height: 100%; border-radius: 3px; transition: width 0.3s ease; }
  .credit-warning { font-size: 0.72rem; color: #dc2626; display: flex; align-items: center; gap: 0.3rem; margin: 0; }

  .reg-section {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: var(--radius-card); overflow: hidden;
  }
  .section-head {
    display: flex; align-items: center; gap: 0.4rem;
    padding: 0.875rem 1rem; border-bottom: 1px solid var(--color-border);
    font-size: 0.85rem; font-weight: 700; color: var(--color-text);
  }
  .section-head h2 { margin: 0; font-size: inherit; font-weight: inherit; }
  .empty-reg {
    display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
    padding: 2rem 1rem; color: var(--color-muted); text-align: center;
  }
  .empty-reg p { margin: 0; font-size: 0.8rem; }

  .reg-list { display: flex; flex-direction: column; }
  .reg-row {
    display: flex; align-items: center; justify-content: space-between;
    gap: 1rem; padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--color-border);
    transition: background 0.1s;
  }
  .reg-row:last-child { border-bottom: none; }
  .reg-row:hover { background: var(--color-bg); }
  .reg-info { display: flex; align-items: center; gap: 0.5rem; min-width: 0; flex-wrap: wrap; }
  .reg-code { font-size: 0.78rem; font-weight: 800; color: var(--color-text); font-family: monospace; }
  .reg-title { font-size: 0.82rem; color: var(--color-text); }
  .reg-type {
    font-size: 0.6rem; font-weight: 700; text-transform: uppercase;
    padding: 0.1rem 0.35rem; border-radius: 0.2rem;
  }
  .reg-actions { display: flex; align-items: center; gap: 0.625rem; flex-shrink: 0; }
  .reg-credits { font-size: 0.72rem; color: var(--color-muted); font-weight: 600; }
  .drop-btn {
    width: 28px; height: 28px; border-radius: 0.35rem;
    border: 1px solid var(--color-border); background: none;
    color: var(--color-muted); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s;
  }
  .drop-btn:hover { background: rgba(220,38,38,0.08); color: #dc2626; border-color: #dc2626; }

  .avail-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 0.625rem; padding: 0.75rem;
  }
  .avail-card {
    background: var(--color-bg); border: 1px solid var(--color-border);
    border-radius: 0.625rem; padding: 0.875rem;
    display: flex; flex-direction: column; gap: 0.5rem;
    transition: all 0.15s;
  }
  .avail-card:hover { border-color: var(--green-600); }
  .avail-card.selected { border-color: var(--green-600); box-shadow: 0 0 0 2px var(--green-soft); }
  .avail-top { display: flex; align-items: center; gap: 0.5rem; }
  .avail-icon {
    width: 32px; height: 32px; border-radius: 0.45rem;
    background: var(--green-soft); color: var(--green-600);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .avail-meta { display: flex; flex-direction: column; }
  .avail-code { font-size: 0.78rem; font-weight: 800; color: var(--color-text); font-family: monospace; }
  .avail-credits { font-size: 0.65rem; color: var(--color-muted); }
  .avail-title { font-size: 0.82rem; font-weight: 700; color: var(--color-text); margin: 0; line-height: 1.3; }
  .avail-details { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .avail-details span {
    font-size: 0.65rem; color: var(--color-muted);
    display: inline-flex; align-items: center; gap: 0.2rem;
    padding: 0.1rem 0.3rem; border-radius: 0.2rem; background: var(--color-surface);
  }
  .avail-select-btn {
    margin-top: 0.25rem;
    width: 100%; padding: 0.45rem; border-radius: 0.4rem;
    border: 1px solid var(--color-border); background: var(--color-surface);
    color: var(--color-muted); font-size: 0.78rem; font-weight: 700;
    cursor: pointer; font-family: inherit; transition: all 0.15s;
  }
  .avail-select-btn:hover { border-color: var(--green-600); color: var(--green-600); }
  .avail-select-btn.active { background: var(--green-600); color: white; border-color: var(--green-600); }
  .avail-select-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .confirm-panel {
    position: fixed; bottom: 0; left: 0; right: 0;
    background: var(--color-surface); border-top: 1px solid var(--color-border);
    padding: 1rem 1.25rem; z-index: 60;
    box-shadow: 0 -4px 24px rgba(0,0,0,0.08);
    animation: slide-up 0.2s ease;
  }
  @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
  .confirm-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; }
  .confirm-head h3 { margin: 0; font-size: 0.9rem; font-weight: 700; color: var(--color-text); }
  .confirm-close {
    width: 26px; height: 26px; border-radius: 50%;
    border: 1px solid var(--color-border); background: none;
    color: var(--color-muted); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
  }
  .confirm-course { font-size: 0.82rem; color: var(--color-muted); margin: 0 0 0.625rem; }
  .type-selector { display: flex; gap: 0.375rem; margin-bottom: 0.625rem; flex-wrap: wrap; }
  .type-option {
    display: inline-flex; align-items: center; gap: 0.3rem;
    padding: 0.35rem 0.625rem; border-radius: 0.35rem;
    border: 1px solid var(--color-border); background: var(--color-bg);
    font-size: 0.75rem; font-weight: 600; color: var(--color-muted);
    cursor: pointer; font-family: inherit; transition: all 0.15s;
  }
  .type-option:hover { border-color: var(--green-600); }
  .type-option.active { border-color: var(--green-600); background: var(--green-soft); color: var(--green-700); }
  .type-dot { width: 8px; height: 8px; border-radius: 50%; }
  .confirm-btn {
    width: 100%; padding: 0.6rem; border-radius: 0.5rem;
    background: var(--green-600); color: white; border: none;
    font-size: 0.83rem; font-weight: 700; cursor: pointer;
    font-family: inherit; display: flex; align-items: center;
    justify-content: center; gap: 0.375rem; transition: background 0.15s;
  }
  .confirm-btn:hover { background: var(--green-700); }
  .confirm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .form-error {
    font-size: 0.75rem; color: #dc2626; display: flex; align-items: center; gap: 0.3rem; margin: 0.5rem 0 0;
  }

  @media (min-width: 641px) {
    .confirm-panel {
      position: static; border-radius: var(--radius-card);
      border: 1px solid var(--color-border); box-shadow: none;
      animation: none; margin-top: 0.5rem;
    }
  }
</style>