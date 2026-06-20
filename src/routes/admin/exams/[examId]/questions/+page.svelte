<!-- src/routes/admin/exams/[examId]/questions/+page.svelte -->
<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import QuestionBuilder from '$lib/components/exam/QuestionBuilder.svelte';
  import { Building2, ChevronDown, Check } from '@lucide/svelte';
  import { enhance } from '$app/forms';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  const marksAllocated = $derived(data.exam.questions.reduce((s: number, q: { marks: number }) => s + q.marks, 0));

  // Admin can always edit regardless of exam status
  const editable = true;

  // ── Status changer (admin-only overlay) ───────────────────────────────────
  const STATUS_OPTS = [
    { value: 'draft',     label: 'Draft',     color: '#6b7280' },
    { value: 'scheduled', label: 'Scheduled', color: '#3b82f6' },
    { value: 'active',    label: 'Active',    color: '#16a34a' },
    { value: 'completed', label: 'Completed', color: '#9333ea' },
    { value: 'cancelled', label: 'Cancelled', color: '#dc2626' },
  ] as const;

  let statusOpen = $state(false);
  const currentStatus = $derived(STATUS_OPTS.find(s => s.value === data.exam.status) ?? STATUS_OPTS[0]);
</script>

<svelte:head><title>Questions — {data.exam.course.code} | Admin</title></svelte:head>

<!-- Admin-only owner banner + status changer -->
<div class="admin-bar">
  <div class="owner-banner">
    <div class="owner-avatar">
      {data.exam.lecturer.fullName.split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase()}
    </div>
    <div class="owner-info">
      <span class="owner-label">Exam Owner</span>
      <span class="owner-name">{data.exam.lecturer.fullName}</span>
      {#if data.exam.lecturer.staffId}
        <span class="owner-meta">{data.exam.lecturer.staffId}</span>
      {/if}
      {#if data.exam.lecturer.department}
        <span class="owner-meta"><Building2 size={11} /> {data.exam.lecturer.department.name}</span>
      {/if}
    </div>
    <div class="owner-right">
      <div class="status-wrap">
        <button
          type="button"
          class="status-btn"
          style="--sc: {currentStatus.color}"
          onclick={() => statusOpen = !statusOpen}
        >
          <span class="status-dot"></span>
          {currentStatus.label}
          <ChevronDown size={13} />
        </button>
        {#if statusOpen}
          <div class="status-dropdown">
            {#each STATUS_OPTS as s}
              <form
                method="POST"
                action="?/updateStatus"
                use:enhance={() => {
                  statusOpen = false;
                  return async ({ update }) => { await update(); };
                }}
              >
                <input type="hidden" name="status" value={s.value} />
                <button
                  type="submit"
                  class="status-opt"
                  class:current={s.value === data.exam.status}
                  style="--sc: {s.color}"
                >
                  <span class="status-dot"></span>
                  {s.label}
                  {#if s.value === data.exam.status}<Check size={12} />{/if}
                </button>
              </form>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

<QuestionBuilder
  exam={data.exam}
  questions={data.exam.questions}
  marksAllocated={marksAllocated}
  backHref="/admin/exams/{data.exam.id}"
  editable={editable}
  form={form}
/>

<style>
  .admin-bar {
    max-width: 860px;
    margin: 1.75rem auto 0;
    padding: 0 1.5rem;
  }

  .owner-banner {
    display: flex; align-items: center; gap: 1rem;
    padding: 0.875rem 1.125rem; margin-bottom: 0;
    background: rgba(79, 70, 229, 0.06);
    border: 1px solid rgba(79, 70, 229, 0.18);
    border-radius: 0.875rem;
  }
  .owner-avatar {
    width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg, var(--lc-700), var(--lc-600));
    display: flex; align-items: center; justify-content: center;
    font-size: 0.72rem; font-weight: 800; color: white;
  }
  .owner-info {
    display: flex; align-items: center; gap: 0.625rem; flex: 1; flex-wrap: wrap;
  }
  .owner-label {
    font-size: 0.65rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--lc-600);
    background: var(--lc-soft); padding: 0.12rem 0.45rem;
    border-radius: 0.3rem; flex-shrink: 0;
  }
  .owner-name { font-size: 0.875rem; font-weight: 700; color: var(--color-text); }
  .owner-meta {
    display: inline-flex; align-items: center; gap: 0.25rem;
    font-size: 0.72rem; color: var(--color-muted);
  }
  .owner-right { margin-left: auto; flex-shrink: 0; }

  .status-wrap { position: relative; }
  .status-btn {
    display: inline-flex; align-items: center; gap: 0.45rem;
    padding: 0.45rem 0.75rem;
    border: 1px solid color-mix(in srgb, var(--sc) 40%, transparent);
    background: color-mix(in srgb, var(--sc) 10%, transparent);
    border-radius: 999px;
    font-size: 0.75rem; font-weight: 700;
    color: var(--sc); cursor: pointer; transition: all 0.15s;
  }
  .status-btn:hover { background: color-mix(in srgb, var(--sc) 18%, transparent); }
  .status-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--sc); flex-shrink: 0; }
  .status-dropdown {
    position: absolute; top: calc(100% + 6px); right: 0;
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.75rem; box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    z-index: 100; overflow: hidden; min-width: 150px;
    animation: dd-in 0.15s ease;
  }
  @keyframes dd-in {
    from { opacity: 0; transform: translateY(-4px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .status-opt {
    width: 100%; display: flex; align-items: center; gap: 0.5rem;
    padding: 0.55rem 0.875rem; background: none; border: none; cursor: pointer;
    font-size: 0.8rem; font-weight: 600; color: var(--sc);
    font-family: inherit; text-align: left; transition: background 0.1s;
  }
  .status-opt:hover { background: color-mix(in srgb, var(--sc) 8%, transparent); }
  .status-opt.current { background: color-mix(in srgb, var(--sc) 10%, transparent); }
  .status-opt :global(svg) { margin-left: auto; }
</style>