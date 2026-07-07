<!-- src/routes/dean/+layout.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import { Menu, X, LogOut } from '@lucide/svelte';
  import type { LayoutData } from './$types';

  let { data, children }: { data: LayoutData; children: any } = $props();
  let sidebarOpen = $state(false);

  $effect(() => {
    $page.url.pathname;
    sidebarOpen = false;
  });

  const navItems = [
    { href: '/dean', label: 'Dashboard', icon: 'grid' },
    { href: '/dean/courses', label: 'Courses', icon: 'book' },
    { href: '/dean/staff', label: 'Staff', icon: 'users' },
    { href: '/dean/students', label: 'Students', icon: 'user-group' },
    { href: '/dean/assessments', label: 'Assessments', icon: 'clipboard' },
    { href: '/dean/results', label: 'Results', icon: 'bar-chart' },
    { href: '/dean/reports', label: 'Reports', icon: 'file-text' },
  ];
</script>

<div class="min-h-screen flex flex-col" style="background: var(--color-bg);">
  <!-- Top bar with sky blue accent -->
  <header
    class="sticky top-0 z-40 border-b"
    style="border-color: var(--color-border); background: var(--color-surface);"
  >
    <div class="h-16 px-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <button
          onclick={() => (sidebarOpen = !sidebarOpen)}
          class="lg:hidden p-2 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-900/20"
          aria-label="Toggle menu"
        >
          {#if sidebarOpen}
            <X size={20} style="color: var(--dn-accent);" />
          {:else}
            <Menu size={20} style="color: var(--dn-accent);" />
          {/if}
        </button>
        <h1 class="text-lg font-semibold">MOUAU eTest Dean Portal</h1>
      </div>
      <div class="flex items-center gap-4">
        <span class="text-sm" style="color: var(--color-muted);">
          {data.staff.firstName}
        </span>
        <a
          href="/logout"
          class="p-2 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-900/20"
          aria-label="Logout"
        >
          <LogOut size={18} />
        </a>
      </div>
    </div>
  </header>

  <div class="flex flex-1 overflow-hidden">
    <!-- Sidebar -->
    <aside
      class="fixed lg:static inset-y-16 left-0 w-64 z-30 transform transition-transform duration-200 lg:translate-x-0 border-r"
      class:translate-x-0={sidebarOpen}
      class:-translate-x-full={!sidebarOpen}
      style="border-color: var(--color-border); background: var(--color-surface);"
    >
      <nav class="p-4 space-y-2">
        {#each navItems as item (item.href)}
          <a
            href={item.href}
            class="block px-4 py-2.5 rounded-lg font-medium text-sm transition-all"
            style={$page.url.pathname === item.href
              ? `background: var(--dn100); color: var(--dn700);`
              : `color: var(--color-text);`}
            class:hover:bg-sky-50={$page.url.pathname !== item.href}
          >
            <span>{item.label}</span>
          </a>
        {/each}
      </nav>
    </aside>

    {#if sidebarOpen}
      <div
        class="fixed inset-0 lg:hidden z-20 bg-black/20"
        onclick={() => (sidebarOpen = false)}
      />
    {/if}

    <!-- Main content -->
    <main class="flex-1 overflow-auto">
      <div class="p-6 max-w-7xl">
        {@render children()}
      </div>
    </main>
  </div>
</div>

<style>
  :root {
    --color-primary: var(--dn500);
  }
</style>