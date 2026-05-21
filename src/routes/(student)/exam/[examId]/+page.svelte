<!-- src/routes/(student)/exam/[examId]/+page.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { PUBLIC_APP_NAME } from '$env/static/public';
  import type { PageData } from './$types';
  import type { FlagType } from '$lib/types/exam.js';

  let { data }: { data: PageData } = $props();

  const { exam, session, questions, savedAnswers } = data;

  // ── State ───────────────────────────────────────────────
  let currentIndex = $state(0);
  let answers = $state<Record<string, { selected_option?: string; text_answer?: string }>>(
    savedAnswers ?? {}
  );
  let timeRemaining = $state(
    session.time_remaining_secs ?? exam.duration_minutes * 60
  );
  let violations = $state(0);
  let warningMessage = $state('');
  let examPaused = $state(false);
  let submitting = $state(false);
  let isFullscreen = $state(false);
  let questionStartTime = $state(Date.now());

  const currentQuestion = $derived(questions[currentIndex]);
  const answeredCount = $derived(Object.keys(answers).length);
  const progress = $derived(Math.round((answeredCount / questions.length) * 100));

  // ── Timer ──────────────────────────────────────────────
  let timerInterval: ReturnType<typeof setInterval>;
  let syncInterval: ReturnType<typeof setInterval>;

  function startTimer() {
    timerInterval = setInterval(() => {
      if (!examPaused) {
        timeRemaining--;
        if (timeRemaining <= 0) {
          clearInterval(timerInterval);
          handleSubmit(true);
        }
      }
    }, 1000);

    // Sync time to server every 30s
    syncInterval = setInterval(() => {
      fetch(`/api/exam/${exam.id}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'time_sync', session_id: session.id, remaining: timeRemaining })
      });
    }, 30000);
  }

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  // ── Fullscreen ─────────────────────────────────────────
  async function enterFullscreen() {
    try {
      await document.documentElement.requestFullscreen();
      isFullscreen = true;
    } catch {
      isFullscreen = false;
    }
  }

  // ── Violation Detection ────────────────────────────────
  async function reportViolation(flag_type: FlagType) {
    const res = await fetch(`/api/exam/${exam.id}/violation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: session.id, flag_type })
    });
    const data = await res.json();

    violations = data.violation_count;

    if (data.action === 'auto_submitted') {
      await handleSubmit(true);
      return;
    }

    if (data.action === 'exam_paused') {
      examPaused = true;
      warningMessage = '⛔ Your exam has been paused. Wait for the invigilator to resume.';
      return;
    }

    const messages: Record<string, string> = {
      tab_switch: '⚠ You switched tabs. This has been logged.',
      window_blur: '⚠ You left the exam window. This has been logged.',
      fullscreen_exit: '⚠ You exited fullscreen. Please stay in fullscreen mode.',
      copy_attempt: '⚠ Copy/paste is not allowed during the exam.',
      devtools_open: '⚠ Developer tools are not allowed.',
      screenshot_attempt: '⚠ Screenshot attempt detected.',
    };

    warningMessage = messages[flag_type] ?? '⚠ A violation has been logged.';
    setTimeout(() => (warningMessage = ''), 4000);

    if (flag_type === 'fullscreen_exit') {
      enterFullscreen();
    }
  }

  function setupViolationListeners() {
    // Tab / app switch
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onWindowBlur);

    // Fullscreen exit
    document.addEventListener('fullscreenchange', onFullscreenChange);

    // Keyboard blocks
    document.addEventListener('keydown', onKeyDown);

    // Right-click block
    document.addEventListener('contextmenu', onContextMenu);
  }

  function teardownViolationListeners() {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('blur', onWindowBlur);
    document.removeEventListener('fullscreenchange', onFullscreenChange);
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('contextmenu', onContextMenu);
  }

  function onVisibilityChange() {
    if (document.hidden) reportViolation('tab_switch');
  }

  function onWindowBlur() {
    reportViolation('window_blur');
  }

  function onFullscreenChange() {
    isFullscreen = !!document.fullscreenElement;
    if (!isFullscreen) reportViolation('fullscreen_exit');
  }

  function onKeyDown(e: KeyboardEvent) {
    const blocked =
      (e.ctrlKey && ['c', 'v', 't', 'w', 'u', 'a'].includes(e.key.toLowerCase())) ||
      e.key === 'F12' ||
      e.key === 'PrintScreen' ||
      (e.metaKey && ['c', 'v'].includes(e.key.toLowerCase())) ||
      (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase()));

    if (blocked) {
      e.preventDefault();
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey)) reportViolation('devtools_open');
      else if (e.key === 'PrintScreen') reportViolation('screenshot_attempt');
      else reportViolation('copy_attempt');
    }
  }

  function onContextMenu(e: MouseEvent) {
    e.preventDefault();
    reportViolation('copy_attempt');
  }

  // ── Answering ──────────────────────────────────────────
  async function selectAnswer(question_id: string, value: string, type: 'mcq' | 'fitb') {
    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);

    if (type === 'mcq') {
      answers = { ...answers, [question_id]: { selected_option: value } };
    } else {
      answers = { ...answers, [question_id]: { text_answer: value } };
    }

    await fetch(`/api/exam/${exam.id}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: session.id,
        question_id,
        selected_option: type === 'mcq' ? value : null,
        text_answer: type === 'fitb' ? value : null,
        time_spent_secs: timeSpent,
      })
    });
  }

  function goToQuestion(index: number) {
    questionStartTime = Date.now();
    currentIndex = index;
  }

  // ── Submit ─────────────────────────────────────────────
  async function handleSubmit(forced = false) {
    if (submitting) return;
    if (!forced) {
      const unanswered = questions.length - answeredCount;
      if (unanswered > 0) {
        const ok = confirm(`You have ${unanswered} unanswered question(s). Submit anyway?`);
        if (!ok) return;
      }
    }

    submitting = true;
    clearInterval(timerInterval);
    clearInterval(syncInterval);
    teardownViolationListeners();

    try {
      await fetch(`/api/exam/${exam.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: session.id })
      });
      if (document.fullscreenElement) await document.exitFullscreen();
      goto(`/exam/${exam.id}/complete`);
    } catch {
      submitting = false;
    }
  }

  // ── Lifecycle ──────────────────────────────────────────
  onMount(async () => {
    await enterFullscreen();
    setupViolationListeners();
    startTimer();

    // Start session on server
    await fetch(`/api/exam/${exam.id}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: session.id })
    });
  });

  onDestroy(() => {
    clearInterval(timerInterval);
    clearInterval(syncInterval);
    teardownViolationListeners();
  });
</script>

<svelte:head>
  <title>{exam.course_code} — {PUBLIC_APP_NAME}</title>
</svelte:head>

<!-- Watermark -->
<div
  class="fixed inset-0 pointer-events-none z-50 flex items-center justify-center select-none"
  style="opacity:0.06; transform:rotate(-30deg); font-size:1.4rem; color:#000; white-space:nowrap;"
  aria-hidden="true"
>
  {data.user?.full_name} • {data.user?.matric_number} • MOUAU
</div>

<!-- Exam Paused Overlay -->
{#if examPaused}
  <div class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
    <div class="bg-white rounded-2xl p-8 text-center max-w-md mx-4">
      <p class="text-4xl mb-4">⛔</p>
      <h2 class="text-xl font-bold text-gray-800 mb-2">Exam Paused</h2>
      <p class="text-gray-600 text-sm">Your exam has been paused by the invigilator. Please wait.</p>
    </div>
  </div>
{/if}

<!-- Violation Warning Toast -->
{#if warningMessage}
  <div class="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-xl shadow-lg text-sm font-medium animate-pulse">
    {warningMessage}
  </div>
{/if}

<!-- Main Exam Layout -->
<div class="fixed inset-0 bg-gray-100 flex flex-col overflow-hidden select-none" style="user-select:none">

  <!-- Top Bar -->
  <header class="bg-green-800 text-white px-6 py-3 flex items-center justify-between shrink-0 shadow">
    <div class="flex items-center gap-3">
      <span class="text-lg">🎓</span>
      <div>
        <p class="font-semibold text-sm leading-tight">{exam.title}</p>
        <p class="text-green-300 text-xs">{exam.course_code} • Q {currentIndex + 1} of {questions.length}</p>
      </div>
    </div>

    <div class="flex items-center gap-6">
      <!-- Violations -->
      {#if violations > 0}
        <div class="text-xs text-red-300 font-medium">
          ⚠ {violations}/{exam.max_violations} flags
        </div>
      {/if}

      <!-- Timer -->
      <div class={`font-mono text-lg font-bold px-3 py-1 rounded ${
        timeRemaining < 300 ? 'bg-red-600 text-white animate-pulse' :
        timeRemaining < 600 ? 'bg-yellow-500 text-black' : 'bg-green-700 text-white'
      }`}>
        {formatTime(timeRemaining)}
      </div>

      <!-- Submit -->
      <button
        onclick={() => handleSubmit(false)}
        disabled={submitting}
        class="bg-white text-green-800 hover:bg-green-100 text-xs font-bold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
      >
        {submitting ? 'Submitting...' : 'Submit Exam'}
      </button>
    </div>
  </header>

  <!-- Progress bar -->
  <div class="h-1 bg-gray-300 shrink-0">
    <div class="h-full bg-green-500 transition-all duration-300" style="width:{progress}%"></div>
  </div>

  <!-- Body -->
  <div class="flex flex-1 overflow-hidden">

    <!-- Question Navigator (left sidebar) -->
    <aside class="w-48 bg-white border-r border-gray-200 overflow-y-auto p-3 shrink-0">
      <p class="text-xs text-gray-500 font-medium mb-2 uppercase tracking-wide">Questions</p>
      <div class="grid grid-cols-4 gap-1">
        {#each questions as q, i}
          <button
            onclick={() => goToQuestion(i)}
            class={`w-full aspect-square rounded text-xs font-bold transition-colors ${
              i === currentIndex
                ? 'bg-green-700 text-white'
                : answers[q.id]
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {i + 1}
          </button>
        {/each}
      </div>

      <div class="mt-4 text-xs text-gray-500 space-y-1">
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded bg-green-100 inline-block"></span> Answered
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded bg-gray-100 inline-block"></span> Unanswered
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded bg-green-700 inline-block"></span> Current
        </div>
      </div>

      <div class="mt-4 text-xs text-gray-600 font-medium">
        {answeredCount}/{questions.length} answered
      </div>
    </aside>

    <!-- Question Panel -->
    <main class="flex-1 overflow-y-auto p-6">
      {#if currentQuestion}
        <div class="max-w-2xl mx-auto">
          <!-- Question Header -->
          <div class="flex items-center gap-3 mb-4">
            <span class="bg-green-700 text-white text-xs font-bold px-3 py-1 rounded-full">
              Q{currentIndex + 1}
            </span>
            <span class="text-xs text-gray-500">
              {currentQuestion.marks} mark{currentQuestion.marks !== 1 ? 's' : ''}
            </span>
            <span class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
              {currentQuestion.type === 'mcq' ? 'Multiple Choice' : 'Fill in the Blank'}
            </span>
          </div>

          <!-- Question Body -->
          <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-4">
            <p class="text-gray-800 font-medium leading-relaxed text-base mb-4">
              {currentQuestion.body}
            </p>

            {#if currentQuestion.image_url}
              <img
                src={currentQuestion.image_url}
                alt="Question diagram"
                class="max-w-full rounded-lg border border-gray-200 mb-4"
              />
            {/if}

            <!-- MCQ Options -->
            {#if currentQuestion.type === 'mcq' && currentQuestion.options}
              <div class="space-y-2">
                {#each currentQuestion.options as option, oi}
                  {@const selected = answers[currentQuestion.id]?.selected_option === option.id}
                  <button
                    onclick={() => selectAnswer(currentQuestion.id, option.id, 'mcq')}
                    class={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all text-sm ${
                      selected
                        ? 'border-green-600 bg-green-50 text-green-800 font-medium'
                        : 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50 text-gray-700'
                    }`}
                  >
                    <span class="font-bold mr-2 text-gray-400">
                      {String.fromCharCode(65 + oi)}.
                    </span>
                    {option.option_text}
                  </button>
                {/each}
              </div>
            {/if}

            <!-- Fill in the Blank -->
            {#if currentQuestion.type === 'fill_in_the_blank'}
              <input
                type="text"
                value={answers[currentQuestion.id]?.text_answer ?? ''}
                oninput={(e) => selectAnswer(currentQuestion.id, (e.target as HTMLInputElement).value, 'fitb')}
                placeholder="Type your answer here..."
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 text-sm transition-colors"
                autocomplete="off"
                autocorrect="off"
                autocapitalize="off"
                spellcheck="false"
              />
            {/if}
          </div>

          <!-- Navigation Buttons -->
          <div class="flex justify-between">
            <button
              onclick={() => goToQuestion(currentIndex - 1)}
              disabled={currentIndex === 0}
              class="px-5 py-2 bg-gray-200 hover:bg-gray-300 disabled:opacity-40 text-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              ← Previous
            </button>

            {#if currentIndex < questions.length - 1}
              <button
                onclick={() => goToQuestion(currentIndex + 1)}
                class="px-5 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Next →
              </button>
            {:else}
              <button
                onclick={() => handleSubmit(false)}
                disabled={submitting}
                class="px-5 py-2 bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {submitting ? 'Submitting...' : 'Submit Exam ✓'}
              </button>
            {/if}
          </div>
        </div>
      {/if}
    </main>
  </div>
</div>
