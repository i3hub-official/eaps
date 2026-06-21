<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { BookMarked, BookCheck, TrendingUp, Download, BarChart2, ArrowLeft } from '@lucide/svelte';

  let { children }: { children: import('svelte').Snippet } = $props();

  const currentPath = $derived($page.url.pathname);
  const isRoot = $derived(currentPath === '/lecturer/results');

  const tabs = [
    { id: 'all', label: 'All Results', href: '/lecturer/results', icon: BarChart2 },
    { id: 'by-course', label: 'By Course', href: '/lecturer/results/by-course', icon: BookMarked },
    { id: 'by-exam', label: 'By Exam', href: '/lecturer/results/by-exam', icon: BookCheck },
    { id: 'grade-reports', label: 'Grade Reports', href: '/lecturer/results/grade-reports', icon: TrendingUp },
  ];

  function navigate(href: string, e: MouseEvent) {
    e.preventDefault();
    goto(href);
  }
</script>

<div class="results-layout">
  {#if !isRoot}
    <a href="/lecturer/results" class="back-link" onclick={(e) => navigate('/lecturer/results', e)}>
      <ArrowLeft size={14} />
      <span>Back to Results</span>
    </a>
  {/if}

  <nav class="sub-nav" aria-label="Results sections">
    {#each tabs as tab}
      {@const active = currentPath === tab.href}
      <a
        href={tab.href}
        class="sub-tab"
        class:active
        onclick={(e) => navigate(tab.href, e)}
        aria-current={active ? 'page' : undefined}
      >
        <tab.icon size={14} />
        <span>{tab.label}</span>
      </a>
    {/each}
  </nav>

  <div class="results-content">
    {@render children()}
  </div>
</div>

<style>
  .results-layout { display: flex; flex-direction: column; gap: 1rem; }
  .back-link {
    display: flex; align-items: center; gap: 0.4rem;
    font-size: 0.78rem; font-weight: 600; color: var(--lc-600);
    text-decoration: none; width: fit-content;
    transition: opacity 0.12s;
  }
  .back-link:hover { opacity: 0.8; }
  .sub-nav {
    display: flex; gap: 0.25rem;
    padding: 0.25rem; background: var(--color-bg);
    border: 1px solid var(--color-border); border-radius: 0.625rem;
    width: fit-content; flex-wrap: wrap;
  }
  .sub-tab {
    display: flex; align-items: center; gap: 0.4rem;
    padding: 0.5rem 0.875rem; border-radius: 0.45rem;
    border: none; background: none;
    color: var(--color-muted); font-size: 0.78rem; font-weight: 600;
    text-decoration: none; cursor: pointer;
    transition: all 0.12s ease;
  }
  .sub-tab:hover { color: var(--color-text); }
  .sub-tab.active { background: var(--lc-soft); color: var(--lc-600); }
  .results-content { min-height: 0; }
</style>