<!-- src/routes/admin/manage/+layout.svelte -->
<script lang="ts">
  import type { LayoutData } from './$types';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { Shield, Building2, Layers, BookMarked, GraduationCap, UserPlus,UserCog, } from '@lucide/svelte';

  let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

  const currentPath = $derived($page.url.pathname);

  const tabs = [
    { href: '/admin/manage/colleges', label: 'Colleges', icon: Building2 },
    { href: '/admin/manage/departments', label: 'Departments', icon: Layers },
    { href: '/admin/manage/courses', label: 'Courses', icon: BookMarked },
    { href: '/admin/manage/levels', label: 'Levels', icon: GraduationCap },
    { href: '/admin/manage/course-registrations', label: 'Course Registrations', icon: UserPlus },
    { href: '/admin/manage/exam-officers', label: 'College Exam-Officers', icon: UserCog },
  ];

  async function navigate(href: string, e: MouseEvent) {
    e.preventDefault();
    await goto(href);
  }
</script>

<div class="manage-layout">
  <div class="manage-header">
    <div class="manage-header-left">
      <div class="manage-icon"><Shield size={24} /></div>
      <div>
        <h1>System Management</h1>
        <p class="manage-subtitle">Manage academic structure: colleges, departments, courses, levels, and registrations</p>
      </div>
    </div>
  </div>

  <div class="manage-tabs">
    {#each tabs as tab}
      <a
        href={tab.href}
        class="manage-tab"
        class:active={currentPath === tab.href}
        onclick={(e) => navigate(tab.href, e)}
      >
        <tab.icon size={16} />
        <span>{tab.label}</span>
      </a>
    {/each}
  </div>

  <div class="manage-content">
    {@render children()}
  </div>
</div>

<style>
  .manage-layout {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .manage-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .manage-header-left {
    display: flex;
    align-items: center;
    gap: 0.875rem;
  }

  .manage-icon {
    width: 48px;
    height: 48px;
    border-radius: 0.75rem;
    background: rgba(59, 130, 246, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #3b82f6;
    flex-shrink: 0;
  }

  .manage-header-left h1 {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0;
  }

  .manage-subtitle {
    color: var(--color-muted);
    font-size: 0.875rem;
    margin-top: 0.25rem;
  }

  .manage-tabs {
    display: flex;
    gap: 0.25rem;
    padding: 0.25rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    overflow-x: auto;
    flex-wrap: wrap;
  }

  .manage-tab {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 1.25rem;
    border-radius: 0.5rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-muted);
    text-decoration: none;
    transition: all 0.15s;
    white-space: nowrap;
  }

  .manage-tab:hover {
    color: var(--color-text);
    background: var(--color-surface);
  }

  .manage-tab.active {
    color: white;
    background: #3b82f6;
  }

  .manage-content {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 1.5rem;
  }

  @media (max-width: 768px) {
    .manage-tabs {
      flex-wrap: wrap;
    }
    .manage-tab {
      flex: 1;
      justify-content: center;
    }
    .manage-content {
      padding: 1rem;
    }
  }
</style>