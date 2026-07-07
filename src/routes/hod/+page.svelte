<!-- src/routes/hod/+page.svelte -->
<script lang="ts">
  import { BookOpen, Users, FileText, CheckCircle } from '@lucide/svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const stats = [
    {
      label: 'Courses',
      value: data.stats.courseCount,
      icon: BookOpen,
      href: '/hod/courses',
    },
    {
      label: 'Lecturers',
      value: data.stats.lecturerCount,
      icon: Users,
      href: '/hod/lecturers',
    },
    {
      label: 'Students',
      value: data.stats.studentCount,
      icon: Users,
      href: '/hod/students',
    },
    {
      label: 'Active Exams',
      value: data.stats.activeExams,
      icon: FileText,
      href: '/hod/assessments',
    },
  ];

  const quickActions = [
    { label: 'Assign Lecturer', href: '/hod/courses/assign', icon: 'user-plus' },
    { label: 'Approve Exams', href: '/hod/assessments/pending', icon: 'check' },
    { label: 'Release Results', href: '/hod/results/pending', icon: 'checkmark' },
    { label: 'Generate Report', href: '/hod/reports', icon: 'file-text' },
  ];
</script>

<div class="space-y-8">
  <!-- Header -->
  <div>
    <h1 class="text-3xl font-bold mb-2">Department Dashboard</h1>
    <p style="color: var(--color-muted);">
      {data.department?.name ?? 'Department'} • {data.department?.code ?? 'N/A'}
    </p>
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
          <div class="p-2 rounded-lg" style="background: var(--g100); color: var(--g700);">
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
          style="border-color: var(--color-border); background: var(--color-surface); color: var(--g600);"
        >
          {action.label}
        </a>
      {/each}
    </div>
  </div>

  <!-- Courses List -->
  <div class="mt-8">
    <h2 class="text-xl font-semibold mb-4">Courses</h2>
    {#if data.courses && data.courses.length > 0}
      <div class="border rounded-lg overflow-hidden" style="border-color: var(--color-border);">
        <table class="w-full">
          <thead style="background: var(--color-surface-hover); border-color: var(--color-border);">
            <tr class="border-b">
              <th class="px-6 py-3 text-left text-sm font-semibold">Code</th>
              <th class="px-6 py-3 text-left text-sm font-semibold">Title</th>
              <th class="px-6 py-3 text-left text-sm font-semibold">Level</th>
              <th class="px-6 py-3 text-left text-sm font-semibold">Lecturer</th>
              <th class="px-6 py-3 text-left text-sm font-semibold">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y" style="border-color: var(--color-border);">
            {#each data.courses.slice(0, 5) as course (course.id)}
              <tr style="border-color: var(--color-border);">
                <td class="px-6 py-3 text-sm font-medium">{course.code}</td>
                <td class="px-6 py-3 text-sm">{course.title}</td>
                <td class="px-6 py-3 text-sm">{course.level}00</td>
                <td class="px-6 py-3 text-sm">{course.lecturer || '—'}</td>
                <td class="px-6 py-3 text-sm">
                  <a href={`/hod/courses/${course.id}`} class="text-green-600 hover:underline">
                    Edit
                  </a>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else}
      <div
        class="p-8 rounded-lg border text-center"
        style="border-color: var(--color-border); background: var(--color-surface);"
      >
        <p style="color: var(--color-muted);">No courses found</p>
      </div>
    {/if}
  </div>

  <!-- Pending Approvals -->
  {#if data.pendingApprovals && data.pendingApprovals.length > 0}
    <div
      class="mt-8 p-4 rounded-lg border"
      style="border-color: var(--color-border); background: var(--g100);"
    >
      <h2 class="text-lg font-semibold mb-3" style="color: var(--g700);">
        Pending Approvals ({data.pendingApprovals.length})
      </h2>
      <div class="space-y-2">
        {#each data.pendingApprovals.slice(0, 3) as item (item.id)}
          <a
            href={item.href}
            class="block p-3 rounded bg-white dark:bg-slate-800 border transition-all hover:shadow-sm"
            style="border-color: var(--color-border);"
          >
            <p class="font-medium flex items-center gap-2">
              <CheckCircle size={16} style="color: var(--g600);" />
              {item.title}
            </p>
            <p style="color: var(--color-muted);" class="text-sm mt-1">
              {item.description}
            </p>
          </a>
        {/each}
      </div>
      {#if data.pendingApprovals.length > 3}
        <a
          href="/hod/approvals"
          class="inline-block mt-4 text-sm font-medium"
          style="color: var(--g700);"
        >
          View all ({data.pendingApprovals.length})
        </a>
      {/if}
    </div>
  {/if}
</div>