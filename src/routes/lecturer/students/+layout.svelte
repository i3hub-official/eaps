<!-- src/routes/lecturer/students/+layout.svelte -->
<script lang="ts">
  import type { LayoutData } from './$types';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { ClipboardList } from '@lucide/svelte';

  let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

  const currentPath = $derived($page.url.pathname);

  const tabs = [
    { href: '/lecturer/students', label: 'Overview' },
    { href: '/lecturer/students/by-course', label: 'By Course' },
    { href: '/lecturer/students/eligibility', label: 'Eligibility' },
    { href: '/lecturer/students/violations', label: 'Violations' },
    { href: '/lecturer/students/report', label: 'Report Student' },
  ];

  function isActive(href: string) {
    return currentPath === href || currentPath.startsWith(href + '/');
  }

  function navigateTo(href: string, e: MouseEvent) {
    e.preventDefault();
    goto(href);
  }
</script>

<div class="students-layout">
  <header class="students-header">
    <div>
      <h1>Students</h1>
      <p>Manage and monitor your students</p>
    </div>
    <div class="header-actions">
      <a href="/lecturer/students/report" class="btn primary">
        <ClipboardList size={14} /> Report Student
      </a>
    </div>
  </header>

  <nav class="tabs">
    {#each tabs as tab}
      <a
        href={tab.href}
        class="tab"
        class:active={isActive(tab.href)}
        onclick={e => navigateTo(tab.href, e)}
      >
        {tab.label}
      </a>
    {/each}
  </nav>

  <div class="tab-content">
    {@render children()}
  </div>
</div>

<style>
  .students-layout {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .students-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .students-header h1 {
    font-size: 1.5rem;
    font-weight: 900;
    color: var(--color-text);
    margin: 0 0 0.25rem;
    letter-spacing: -0.02em;
  }

  .students-header p {
    font-size: 0.85rem;
    color: var(--color-muted);
    margin: 0;
  }

  .header-actions {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.55rem 1rem;
    border-radius: 0.6rem;
    font-size: 0.8rem;
    font-weight: 700;
    border: 1.5px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text);
    cursor: pointer;
    transition: all 0.15s;
    text-decoration: none;
    font-family: inherit;
  }

  .btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(0,0,0,0.08);
  }

  .btn.primary {
    background: var(--lc-600, #4f46e5);
    border-color: var(--lc-600, #4f46e5);
    color: #fff;
  }

  .btn.primary:hover {
    background: var(--lc-700, #4338ca);
    border-color: var(--lc-700, #4338ca);
  }

  .btn.secondary {
    border-color: var(--lc-600, #4f46e5);
    color: var(--lc-600, #4f46e5);
    background: var(--lc-soft, rgba(79,70,229,0.06));
  }

  .btn.secondary:hover {
    background: var(--lc-soft, rgba(79,70,229,0.12));
  }

  .tabs {
    display: flex;
    gap: 0.25rem;
    border-bottom: 2px solid var(--color-border);
    padding-bottom: 0;
  }

  .tab {
    padding: 0.6rem 1.25rem;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--color-muted);
    text-decoration: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    transition: all 0.15s;
    cursor: pointer;
  }

  .tab:hover {
    color: var(--color-text);
  }

  .tab.active {
    color: var(--lc-600, #4f46e5);
    border-bottom-color: var(--lc-600, #4f46e5);
  }

  .tab-content {
    padding: 0.25rem 0;
  }

  @media (max-width: 640px) {
    .students-header {
      flex-direction: column;
    }
    
    .header-actions {
      width: 100%;
    }
    
    .header-actions .btn {
      flex: 1;
      justify-content: center;
    }

    .tabs {
      overflow-x: auto;
      gap: 0;
    }

    .tab {
      padding: 0.5rem 0.75rem;
      font-size: 0.75rem;
      white-space: nowrap;
    }
  }
</style>