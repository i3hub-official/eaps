<!-- src/lib/components/exam/ViolationWarning.svelte -->

<script lang="ts">
  interface Props {
    count: number;
    max: number;
    action: string;
    flagType: string;
    onDismiss: () => void;
  }

  let { count, max, action, flagType, onDismiss }: Props = $props();

  const FLAG_LABELS: Record<string, string> = {
    tab_switch:          'Tab switch detected',
    window_blur:         'Window focus lost',
    fullscreen_exit:     'Fullscreen exited',
    copy_attempt:        'Copy attempt detected',
    devtools_open:       'DevTools opened',
    screenshot_attempt:  'Screenshot attempt detected',
    multiple_faces:      'Multiple faces detected',
    no_face_detected:    'No face detected',
    invigilator_manual:  'Flagged by invigilator',
  };

  const ACTION_MESSAGES: Record<string, string> = {
    warning:             'This is a warning. Further violations may pause your exam.',
    invigilator_alerted: 'Your invigilator has been alerted.',
    exam_paused:         'Your exam has been paused. Wait for your invigilator.',
    auto_submitted:      'Your exam has been automatically submitted due to repeated violations.',
  };

  const isFatal = $derived(action === 'auto_submitted' || action === 'exam_paused');
  const label   = $derived(FLAG_LABELS[flagType]  ?? 'Violation detected');
  const message = $derived(ACTION_MESSAGES[action] ?? 'A violation was recorded.');
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="overlay" role="alertdialog" aria-modal="true" aria-labelledby="vw-title">
  <div class="modal" class:fatal={isFatal}>
    <div class="icon" aria-hidden="true">{isFatal ? '🚫' : '⚠️'}</div>

    <h2 id="vw-title">{label}</h2>
    <p class="message">{message}</p>

    <div class="strike-bar">
      {#each Array(max) as _, i}
        <span class="dot" class:filled={i < count}></span>
      {/each}
    </div>
    <p class="strike-count">{count} of {max} violations</p>

    {#if !isFatal}
      <button class="dismiss" onclick={onDismiss} type="button">
        I understand — continue exam
      </button>
    {/if}
  </div>
</div>

<style>
  .overlay {
    position: fixed; inset: 0; z-index: 9999;
    background: rgba(0,0,0,0.75);
    display: flex; align-items: center; justify-content: center;
    padding: 1rem;
  }

  .modal {
    background: var(--color-surface);
    border: 2px solid #f59e0b;
    border-radius: 1rem;
    padding: 2rem;
    max-width: 420px;
    width: 100%;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    animation: slide-up 0.2s ease;
  }

  .modal.fatal { border-color: #ef4444; }

  .icon    { font-size: 3rem; }
  h2       { font-size: 1.25rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .message { color: var(--color-muted); margin: 0; line-height: 1.5; }

  .strike-bar {
    display: flex;
    gap: 0.4rem;
    margin: 0.25rem 0;
  }

  .dot {
    width: 1rem; height: 1rem;
    border-radius: 50%;
    background: var(--color-border);
    transition: background 0.2s;
  }
  .dot.filled { background: #ef4444; }

  .strike-count { font-size: 0.8rem; color: var(--color-muted); margin: 0; }

  .dismiss {
    padding: 0.75rem 1.5rem;
    background: var(--color-primary);
    color: #fff;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    margin-top: 0.5rem;
    transition: opacity 0.15s;
  }
  .dismiss:hover { opacity: 0.9; }

  @keyframes slide-up {
    from { transform: translateY(1rem); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
</style>
