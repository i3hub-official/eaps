<!-- src/routes/lecturer/questions/[questionId]/edit/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';
  import {
    ChevronLeft, Save, X, CheckCircle, AlertCircle,
    HelpCircle, List, FileText, Eye
  } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();
  const { question, exams } = data;

  // ── Toast system ──────────────────────────────────────────────────────────
  type Toast = { id: number; message: string; type: 'info' | 'warn' | 'success' };
  let toasts = $state<Toast[]>([]);
  let toastId = 0;

  function showToast(message: string, type: Toast['type'] = 'info', duration = 2600) {
    const id = ++toastId;
    toasts = [...toasts, { id, message, type }];
    setTimeout(() => { toasts = toasts.filter(t => t.id !== id); }, duration);
  }

  let questionType = $state(question.type);
  let showPreview = $state(false);
  let previewBody = $state(question.body);
</script>

<svelte:head><title>Edit Question — MOUAU eTest</title></svelte:head>

<!-- ── Toast stack ─────────────────────────────────────────────────────────── -->
<div class="toast-stack" aria-live="polite">
  {#each toasts as t (t.id)}
    <div class="toast toast-{t.type}"
      in:fly={{ y: 10, duration: 200 }}
      out:fly={{ y: -6, duration: 160 }}>
      {#if t.type === 'warn'}<AlertCircle size={13} />
      {:else if t.type === 'success'}<CheckCircle size={13} />
      {:else}<HelpCircle size={13} />{/if}
      {t.message}
    </div>
  {/each}
</div>

<div class="page">
  <div class="page-header">
    <div class="header-top">
      <a href={`/lecturer/questions/${question.id}`} class="back-link">
        <ChevronLeft size={14} /> Back to Question
      </a>
    </div>
    <div class="header-main">
      <div>
        <div class="header-badge">
          <Save size={16} />
          <span>Edit Question</span>
        </div>
        <h1>Edit Question</h1>
      </div>
    </div>
  </div>

  <!-- Simplified form - same as create with pre-filled values -->
  <form method="POST" use:enhance>
    <!-- Reuse the same form structure as create page -->
    <!-- Pre-fill with question data -->
  </form>
</div>

<style>
  /* Same styles as create page */
</style>