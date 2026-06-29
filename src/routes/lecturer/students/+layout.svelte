<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { 
    BookMarked, BookCheck, TrendingUp, Download, BarChart2, ArrowLeft,
    Printer, FileSpreadsheet, Table 
  } from '@lucide/svelte';

  let { children }: { children: import('svelte').Snippet } = $props();

  const currentPath = $derived($page.url.pathname);
  const isRoot = $derived(currentPath === '/lecturer/results');

  const tabs = [
    { id: 'all', label: 'All Results', href: '/lecturer/results', icon: BarChart2 },
    { id: 'by-course', label: 'By Course', href: '/lecturer/results/by-course', icon: BookMarked },
    { id: 'by-exam', label: 'By Exam', href: '/lecturer/results/by-exam', icon: BookCheck },
    { id: 'grade-reports', label: 'Grade Reports', href: '/lecturer/results/grade-reports', icon: TrendingUp },
    { id: 'export', label: 'Export', href: '/lecturer/results/export', icon: Download },
    { id: 'print', label: 'Print', href: '/lecturer/results/print', icon: Printer },
  ];

  function navigate(href: string, e: MouseEvent) {
    e.preventDefault();
    goto(href);
  }

  // Check if current path is a child of a tab
  function isTabActive(tabHref: string) {
    if (tabHref === '/lecturer/results') {
      return currentPath === '/lecturer/results';
    }
    return currentPath.startsWith(tabHref);
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
      {@const active = isTabActive(tab.href)}
      <a
        href={tab.href}
        class="sub-tab"
        class:active
        class:tab-export={tab.id === 'export'}
        class:tab-print={tab.id === 'print'}
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
  .results-layout { 
    display: flex; 
    flex-direction: column; 
    gap: 1rem; 
    padding: 0 0.5rem;
  }
  
  .back-link {
    display: flex; 
    align-items: center; 
    gap: 0.4rem;
    font-size: 0.78rem; 
    font-weight: 600; 
    color: var(--lc-600);
    text-decoration: none; 
    width: fit-content;
    transition: opacity 0.12s;
  }
  .back-link:hover { opacity: 0.8; }
  
  .sub-nav {
    display: flex; 
    gap: 0.25rem;
    padding: 0.25rem; 
    background: var(--color-bg);
    border: 1px solid var(--color-border); 
    border-radius: 0.625rem;
    width: fit-content; 
    flex-wrap: wrap;
  }
  
  .sub-tab {
    display: flex; 
    align-items: center; 
    gap: 0.4rem;
    padding: 0.5rem 0.875rem; 
    border-radius: 0.45rem;
    border: none; 
    background: none;
    color: var(--color-muted); 
    font-size: 0.78rem; 
    font-weight: 600;
    text-decoration: none; 
    cursor: pointer;
    transition: all 0.12s ease;
    white-space: nowrap;
  }
  
  .sub-tab:hover { 
    color: var(--color-text); 
    background: var(--color-surface);
  }
  
  .sub-tab.active { 
    background: var(--lc-soft); 
    color: var(--lc-600); 
  }
  
  .sub-tab.tab-export.active { 
    background: rgba(22, 163, 74, 0.08); 
    color: #16a34a; 
  }
  
  .sub-tab.tab-print.active { 
    background: rgba(124, 58, 237, 0.08); 
    color: #7c3aed; 
  }
  
  .results-content { 
    min-height: 0; 
  }

  /* ── Mobile ──────────────────────────────────────────────────────────────── */
  @media (max-width: 768px) {
    .sub-nav {
      width: 100%;
      justify-content: center;
    }
    .sub-tab {
      font-size: 0.7rem;
      padding: 0.4rem 0.6rem;
    }
    .sub-tab span { display: none; }
    .sub-tab svg { margin: 0; }
    .sub-tab.active span { display: inline; }
  }

  @media (max-width: 480px) {
    .sub-tab {
      padding: 0.35rem 0.5rem;
      font-size: 0.65rem;
    }
    .results-layout { padding: 0; }
  }
</style>