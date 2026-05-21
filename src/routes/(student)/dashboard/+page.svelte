<!-- src/routes/(student)/dashboard/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();

  function statusColor(status: string) {
    return {
      active: 'bg-green-100 text-green-800',
      scheduled: 'bg-blue-100 text-blue-800',
      completed: 'bg-gray-100 text-gray-600',
      not_started: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-orange-100 text-orange-800',
      submitted: 'bg-gray-100 text-gray-600',
      force_submitted: 'bg-red-100 text-red-700',
    }[status] ?? 'bg-gray-100 text-gray-600';
  }

  function statusLabel(exam: any) {
    if (exam.session_status === 'submitted' || exam.session_status === 'force_submitted') return 'Submitted';
    if (exam.session_status === 'in_progress') return 'In Progress';
    if (exam.status === 'active') return 'Active — Take Now';
    if (exam.status === 'scheduled') return 'Upcoming';
    if (exam.status === 'completed') return 'Closed';
    return exam.status;
  }

  function canTakeExam(exam: any) {
    return exam.status === 'active' &&
      exam.session_status !== 'submitted' &&
      exam.session_status !== 'force_submitted';
  }

  function formatDate(d: string | null) {
    if (!d) return 'TBA';
    return new Date(d).toLocaleString('en-NG', {
      dateStyle: 'medium', timeStyle: 'short'
    });
  }
</script>

<svelte:head>
  <title>Dashboard — MOUAU eTest</title>
</svelte:head>

<div>
  <h1 class="text-2xl font-bold text-gray-800 mb-1">My Exams</h1>
  <p class="text-gray-500 text-sm mb-6">Your registered courses and upcoming examinations</p>

  {#if data.exams.length === 0}
    <div class="text-center py-16 text-gray-400">
      <p class="text-5xl mb-4">📋</p>
      <p class="font-medium">No exams found</p>
      <p class="text-sm mt-1">Check back when exams are scheduled for your courses.</p>
    </div>
  {:else}
    <div class="grid gap-4">
      {#each data.exams as exam}
        <div class="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <span class="font-mono text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded font-semibold">
                  {exam.course_code}
                </span>
                <span class={`text-xs px-2 py-0.5 rounded font-medium ${statusColor(exam.session_status ?? exam.status)}`}>
                  {statusLabel(exam)}
                </span>
              </div>
              <h3 class="font-semibold text-gray-800">{exam.title}</h3>
              <p class="text-sm text-gray-500 mt-1">{exam.course_title}</p>

              <div class="flex gap-4 mt-3 text-xs text-gray-500">
                <span>⏱ {exam.duration_minutes} minutes</span>
                <span>📝 {exam.total_marks} marks</span>
                <span>📅 {formatDate(exam.scheduled_start)}</span>
              </div>

              {#if exam.score !== null && (exam.session_status === 'submitted' || exam.session_status === 'force_submitted')}
                {#if exam.show_result_after}
                  <div class="mt-3 text-sm font-semibold text-green-700">
                    Score: {exam.score} / {exam.total_marks}
                  </div>
                {:else}
                  <div class="mt-3 text-sm text-gray-500 italic">Result pending release</div>
                {/if}
              {/if}
            </div>

            <div class="shrink-0">
              {#if canTakeExam(exam)}
                <a
                  href={`/exam/${exam.id}`}
                  class="inline-block bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  Start Exam →
                </a>
              {:else if exam.session_status === 'in_progress'}
                <a
                  href={`/exam/${exam.id}`}
                  class="inline-block bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  Continue →
                </a>
              {:else}
                <span class="text-xs text-gray-400 font-medium">—</span>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
