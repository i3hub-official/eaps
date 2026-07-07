<!-- src/routes/dean/+page.svelte -->
<script lang="ts">
  import { BookOpen, Users, ClipboardList, TrendingUp } from '@lucide/svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const stats = [
    {
      label: 'Departments',
      value: data.stats.departments,
      icon: BookOpen,
      href: '/dean/courses',
      color: 'sky',
    },
    {
      label: 'Staff',
      value: data.stats.staff,
      icon: Users,
      href: '/dean/staff',
      color: 'sky',
    },
    {
      label: 'Students',
      value: data.stats.students,
      icon: Users,
      href: '/dean/students',
      color: 'sky',
    },
    {
      label: 'Active Assessments',
      value: data.stats.activeAssessments,
      icon: ClipboardList,
      href: '/dean/assessments',
      color: 'sky',
    },
  ];

  const quickActions = [
    { label: 'Approve Courses', href: '/dean/courses/pending', icon: 'check' },
    { label: 'View Results', href: '/dean/results', icon: 'bar-chart' },
    { label: 'Staff Performance', href: '/dean/reports/staff', icon: 'trending-up' },
    { label: 'Audit Trail', href: '/dean/audit', icon: 'list' },
  ];
</script>

<div class="space-y-8">
  <!-- Header -->
  <div>
    <h1 class="text-3xl font-bold mb-2">Dean Dashboard</h1>
    <p style="color: var(--color-muted);">College overview and academic decisions</p>
  </div>

  <!-- Stats Grid -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {#each stats as stat (stat.label)}
      <a
        href={stat.href}
        class="p-4 rounded-lg border transition-all hover:shadow-md"
        style="border-color: var(--color-border); background: var(--color-surface);"
      >
        <div class="flex items-start justify-between">
          <div>
            <p style="color: var(--color-muted);" class="text-sm font-medium">
              {stat.label}
            </p>
            <p class="text-3xl font-bold mt-2">{stat.value}</p>
          </div>
          <div class="p-2 rounded-lg" style="background: var(--dn-soft); color: var(--dn-accent);">
            <svelte:component this={stat.icon} size={20} />
          </div>
        </div>
      </a>
    {/each}
  </div>

  <!-- Quick Actions -->
  <div class="mt-8">
    <h2 class="text-xl font-semibold mb-4">Quick Actions</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {#each quickActions as action (action.label)}
        <a
          href={action.href}
          class="p-4 rounded-lg border text-center font-medium transition-all hover:shadow-md"
          style="border-color: var(--color-border); background: var(--color-surface); color: var(--dn500);"
        >
          {action.label}
        </a>
      {/each}
    </div>
  </div>

  <!-- Departments Overview -->
  <div class="mt-8">
    <h2 class="text-xl font-semibold mb-4">Department Overview</h2>
    {#if data.departments && data.departments.length > 0}
      <div class="border rounded-lg overflow-hidden" style="border-color: var(--color-border);">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {#each data.departments as dept (dept.id)}
            <a
              href={`/dean/courses?department=${dept.id}`}
              class="p-4 rounded-lg border transition-all hover:shadow-md"
              style="border-color: var(--color-border); background: var(--color-surface);"
            >
              <h3 class="font-semibold mb-2">{dept.name}</h3>
              <p style="color: var(--color-muted);" class="text-sm">
                {dept.courseCount} courses • {dept.studentCount} students
              </p>
              <div class="mt-3 pt-3 border-t" style="border-color: var(--color-border);">
                <p style="color: var(--dn-accent);" class="text-xs font-medium">
                  HOD: {dept.hodName}
                </p>
              </div>
            </a>
          {/each}
        </div>
      </div>
    {:else}
      <div
        class="p-8 rounded-lg border text-center"
        style="border-color: var(--color-border); background: var(--color-surface);"
      >
        <p style="color: var(--color-muted);">No departments found</p>
      </div>
    {/if}
  </div>

  <!-- Pending Approvals -->
  {#if data.pendingApprovals && data.pendingApprovals.length > 0}
    <div class="mt-8 p-4 rounded-lg border" style="border-color: var(--color-border); background: var(--dn-soft);">
      <h2 class="text-lg font-semibold mb-3">Pending Approvals</h2>
      <div class="space-y-2">
        {#each data.pendingApprovals.slice(0, 3) as item (item.id)}
          <a
            href={item.approvalHref}
            class="block p-3 rounded bg-white dark:bg-slate-800 border transition-all hover:shadow-sm"
            style="border-color: var(--color-border);"
          >
            <p class="font-medium">{item.title}</p>
            <p style="color: var(--color-muted);" class="text-sm mt-1">{item.description}</p>
          </a>
        {/each}
      </div>
    </div>
  {/if}
</div>