<!-- src/routes/lecturer/+page.svelte -->
<script lang="ts">
  import { BookOpen, FileQuestion, ClipboardList, CheckSquare } from '@lucide/svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const stats = [
    {
      label: 'Courses Teaching',
      value: data.stats.courseCount,
      icon: BookOpen,
      href: '/lecturer/courses',
    },
    {
      label: 'Questions Created',
      value: data.stats.questionCount,
      icon: FileQuestion,
      href: '/lecturer/questions',
    },
    {
      label: 'Assessments',
      value: data.stats.assessmentCount,
      icon: ClipboardList,
      href: '/lecturer/assessments',
    },
    {
      label: 'Pending Grading',
      value: data.stats.pendingGradingCount,
      icon: CheckSquare,
      href: '/lecturer/grading',
    },
  ];

  const quickActions = [
    { label: 'Create Question', href: '/lecturer/questions/create', icon: 'plus' },
    { label: 'Create Assessment', href: '/lecturer/assessments/create', icon: 'plus-circle' },
    { label: 'Grade Answers', href: '/lecturer/grading', icon: 'check' },
    { label: 'View Results', href: '/lecturer/results', icon: 'bar-chart' },
  ];
</script>

<div class="space-y-8">
  <!-- Header -->
  <div>
    <h1 class="text-3xl font-bold mb-2">Lecturer Dashboard</h1>
    <p style="color: var(--color-muted);">Manage courses, assessments, and grading</p>
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
          <div class="p-2 rounded-lg" style="background: var(--lc-soft); color: var(--lc-accent);">
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
          style="border-color: var(--color-border); background: var(--color-surface); color: var(--lc600);"
        >
          {action.label}
        </a>
      {/each}
    </div>
  </div>

  <!-- Teaching Courses -->
  <div class="mt-8">
    <h2 class="text-xl font-semibold mb-4">Your Courses</h2>
    {#if data.courses && data.courses.length > 0}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each data.courses as course (course.id)}
          <a
            href={`/lecturer/courses/${course.id}`}
            class="p-4 rounded-lg border transition-all hover:shadow-md"
            style="border-color: var(--color-border); background: var(--color-surface);"
          >
            <h3 class="font-semibold mb-1">{course.code}</h3>
            <p style="color: var(--color-muted);" class="text-sm mb-3">
              {course.title}
            </p>
            <div class="pt-3 border-t space-y-1" style="border-color: var(--color-border);">
              <p style="color: var(--color-muted);" class="text-xs">
                Level {course.level}00 • {course.studentCount} students
              </p>
              <p style="color: var(--lc-accent);" class="text-xs font-medium">
                {course.assessmentCount} assessments
              </p>
            </div>
          </a>
        {/each}
      </div>
    {:else}
      <div
        class="p-8 rounded-lg border text-center"
        style="border-color: var(--color-border); background: var(--color-surface);"
      >
        <p style="color: var(--color-muted);">No courses assigned</p>
      </div>
    {/if}
  </div>

  <!-- Pending Grading -->
  {#if data.pendingGrading && data.pendingGrading.length > 0}
    <div
      class="mt-8 p-4 rounded-lg border"
      style="border-color: var(--color-border); background: var(--lc-soft);"
    >
      <h2 class="text-lg font-semibold mb-3" style="color: var(--lc700);">
        Pending Grading ({data.pendingGrading.length})
      </h2>
      <div class="space-y-2">
        {#each data.pendingGrading.slice(0, 3) as item (item.id)}
          <a
            href={item.gradeHref}
            class="block p-3 rounded bg-white dark:bg-slate-800 border transition-all hover:shadow-sm"
            style="border-color: var(--color-border);"
          >
            <p class="font-medium">{item.assessmentTitle}</p>
            <p style="color: var(--color-muted);" class="text-sm mt-1">
              {item.answerCount} answers • {item.courseCode}
            </p>
          </a>
        {/each}
      </div>
      {#if data.pendingGrading.length > 3}
        <a
          href="/lecturer/grading"
          class="inline-block mt-4 text-sm font-medium"
          style="color: var(--lc700);"
        >
          View all ({data.pendingGrading.length})
        </a>
      {/if}
    </div>
  {/if}

  <!-- Recent Assessments -->
  <div class="mt-8">
    <h2 class="text-xl font-semibold mb-4">Recent Assessments</h2>
    {#if data.recentAssessments && data.recentAssessments.length > 0}
      <div class="border rounded-lg overflow-hidden" style="border-color: var(--color-border);">
        <div class="divide-y" style="border-color: var(--color-border);">
          {#each data.recentAssessments.slice(0, 5) as assessment (assessment.id)}
            <a
              href={`/lecturer/assessments/${assessment.id}`}
              class="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div>
                <p class="font-medium">{assessment.title}</p>
                <p style="color: var(--color-muted);" class="text-sm">
                  {assessment.courseCode} • {assessment.studentCount} students
                </p>
              </div>
              <span
                class="px-2 py-1 rounded text-xs font-medium"
                style={assessment.status === 'ACTIVE'
                  ? `background: var(--lc-soft); color: var(--lc-accent);`
                  : `background: var(--color-surface-hover); color: var(--color-muted);`}
              >
                {assessment.status}
              </span>
            </a>
          {/each}
        </div>
      </div>
    {:else}
      <div
        class="p-8 rounded-lg border text-center"
        style="border-color: var(--color-border); background: var(--color-surface);"
      >
        <p style="color: var(--color-muted);">No assessments yet</p>
      </div>
    {/if}
  </div>
</div>