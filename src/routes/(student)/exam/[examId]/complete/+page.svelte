<!-- src/routes/(student)/exam/[examId]/complete/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
  const { result, exam } = data;
</script>

<svelte:head>
  <title>Submitted — MOUAU eTest</title>
</svelte:head>

<div class="min-h-[60vh] flex items-center justify-center">
  <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center max-w-md w-full">
    <div class="text-5xl mb-4">{result?.passed ? '🎉' : '📋'}</div>
    <h1 class="text-2xl font-bold text-gray-800 mb-2">Exam Submitted!</h1>
    <p class="text-gray-500 text-sm mb-6">
      Your answers for <strong>{exam?.course_code} — {exam?.title}</strong> have been recorded.
    </p>

    {#if result && exam?.show_result_after}
      <div class="bg-gray-50 rounded-xl p-6 mb-6 text-left space-y-3">
        <div class="flex justify-between text-sm">
          <span class="text-gray-600">Score</span>
          <span class="font-bold text-gray-800">{result.score} / {result.total_questions}</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-gray-600">Percentage</span>
          <span class="font-bold text-gray-800">{result.percentage?.toFixed(1)}%</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-gray-600">Grade</span>
          <span class={`font-bold text-lg ${result.passed ? 'text-green-700' : 'text-red-600'}`}>
            {result.grade}
          </span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-gray-600">Status</span>
          <span class={`font-bold ${result.passed ? 'text-green-700' : 'text-red-600'}`}>
            {result.passed ? 'PASSED ✓' : 'FAILED ✗'}
          </span>
        </div>
      </div>
    {:else}
      <p class="text-gray-400 text-sm italic mb-6">
        Your results will be released by your lecturer.
      </p>
    {/if}

    <a
      href="/dashboard"
      class="inline-block bg-green-700 hover:bg-green-800 text-white font-semibold px-6 py-3 rounded-lg transition-colors text-sm"
    >
      Back to Dashboard
    </a>
  </div>
</div>
