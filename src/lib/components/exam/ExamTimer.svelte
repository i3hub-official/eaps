<script lang="ts">
  // src/lib/components/exam/ExamTimer.svelte

  let {
    remainingSeconds,
    onExpired,
  }: { remainingSeconds: number; onExpired: () => void } = $props()

  const display = $derived(() => {
    const s = Math.max(0, remainingSeconds)
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) {
      return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    }
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  })

  const urgent = $derived(remainingSeconds <= 300) // < 5 min
  const critical = $derived(remainingSeconds <= 60) // < 1 min
</script>

<div class="timer" class:urgent class:critical aria-live="polite" aria-label="Time remaining">
  <span class="timer-icon">{critical ? '⚠️' : '⏱'}</span>
  <span class="timer-display">{display()}</span>
</div>

<style>
  .timer {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-family: 'Courier New', monospace;
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--color-text);
    background: var(--bg-muted, #f8fafc);
    padding: 0.375rem 0.75rem;
    border-radius: 0.5rem;
    border: 1.5px solid var(--color-border);
    transition: all 0.3s;
    min-width: 80px;
    justify-content: center;
  }

  .timer.urgent {
    color: #d97706;
    background: #fffbeb;
    border-color: #fde68a;
  }

  .timer.critical {
    color: #dc2626;
    background: #fef2f2;
    border-color: #fca5a5;
    animation: blink 1s step-end infinite;
  }

  .timer-icon { font-size: 0.85rem; }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
</style>