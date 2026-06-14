<!-- src/lib/components/exam/ExamTimer.svelte -->
<script lang="ts">
  interface Props {
    totalSeconds: number;
    remainingSeconds: number;
    onWarning?: () => void;
    onCritical?: () => void;
    onTimeUp?: () => void;
  }

  let {
    totalSeconds,
    remainingSeconds: initialRemaining,
    onWarning,
    onCritical,
    onTimeUp
  }: Props = $props();

  let remaining = $state(initialRemaining);
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const pct = $derived(Math.max(0, (remaining / totalSeconds) * 100));
  const isWarning = $derived(pct <= 25 && pct > 10);
  const isCritical = $derived(pct <= 10);

  const mm = $derived(String(Math.floor(remaining / 60)).padStart(2, '0'));
  const ss = $derived(String(remaining % 60).padStart(2, '0'));

  $effect(() => {
    intervalId = setInterval(() => {
      remaining = Math.max(0, remaining - 1);
      if (remaining === Math.floor(totalSeconds * 0.25) && onWarning) onWarning();
      if (remaining === Math.floor(totalSeconds * 0.10) && onCritical) onCritical();
      if (remaining <= 0 && onTimeUp) { onTimeUp(); stop(); }
    }, 1000);

    return () => stop();
  });

  function stop() {
    if (intervalId) { clearInterval(intervalId); intervalId = null; }
  }

  export function getRemaining() { return remaining; }
  export function pause() { stop(); }
  export function resume() {
    stop();
    intervalId = setInterval(() => {
      remaining = Math.max(0, remaining - 1);
      if (remaining <= 0 && onTimeUp) { onTimeUp(); stop(); }
    }, 1000);
  }
</script>

<div class="timer" class:warning={isWarning} class:critical={isCritical}>
  <div class="timer-bar" style="width: {pct}%"></div>
  <span class="timer-text">{mm}:{ss}</span>
</div>

<style>
  .timer {
    position: relative;
    display: flex; align-items: center; justify-content: center;
    height: 40px;
    border-radius: 0.625rem;
    background: var(--color-bg, #f9fafb);
    border: 1.5px solid var(--color-border, #e5e7eb);
    overflow: hidden;
    font-variant-numeric: tabular-nums;
  }
  .timer.warning { border-color: #f59e0b; }
  .timer.critical { border-color: #ef4444; animation: pulse-border 1s ease-in-out infinite; }

  @keyframes pulse-border {
    0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.3); }
    50% { box-shadow: 0 0 0 4px rgba(239,68,68,0.15); }
  }

  .timer-bar {
    position: absolute; left: 0; top: 0; bottom: 0;
    background: var(--g400, #4ade80);
    transition: width 1s linear, background 0.3s;
    border-radius: 0.5rem;
  }
  .timer.warning .timer-bar { background: #f59e0b; }
  .timer.critical .timer-bar { background: #ef4444; }

  .timer-text {
    position: relative;
    z-index: 1;
    font-size: 1.1rem;
    font-weight: 800;
    color: var(--color-text, #111827);
  }
  .timer.critical .timer-text { color: #ef4444; }
</style>