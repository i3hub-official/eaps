<!-- src/lib/components/exam/ExamTimer.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  interface Props {
    seconds:    number;         // initial seconds (passed as `seconds` from session page)
    totalSeconds: number;       // total for progress ring calculation
    onExpired:  () => void;     // called when timer hits 0
    onTick?:    (remaining: number) => void;
  }

  let { seconds, totalSeconds, onExpired, onTick }: Props = $props();

  let remaining = $state(seconds);
  let interval: ReturnType<typeof setInterval> | null = null;  // ← fixed syntax

  const fmt = (n: number) => String(n).padStart(2, '0');

  const hours   = $derived(Math.floor(remaining / 3600));
  const minutes = $derived(Math.floor((remaining % 3600) / 60));
  const secs    = $derived(remaining % 60);

  const pct     = $derived(totalSeconds > 0 ? (remaining / totalSeconds) * 100 : 0);
  const urgent  = $derived(remaining <= 300);
  const warning = $derived(remaining <= 600 && remaining > 300);
  const phase   = $derived(urgent ? 'urgent' : warning ? 'warning' : 'normal');

  onMount(() => {
    interval = setInterval(() => {
      remaining = Math.max(0, remaining - 1);
      onTick?.(remaining);
      if (remaining === 0) {
        clearInterval(interval!);
        interval = null;
        onExpired();
      }
    }, 1000);
  });

  onDestroy(() => {
    if (interval) { clearInterval(interval); interval = null; }
  });

  export function setRemaining(s: number) {
    remaining = s;
  }
</script>

<div class="timer-root" data-phase={phase} aria-live="polite" aria-label="Time remaining">
  <div class="timer-ring">
    <svg class="progress-ring" viewBox="0 0 48 48">
      <circle class="track" cx="24" cy="24" r="20" />
      <circle
        class="fill"
        cx="24"
        cy="24"
        r="20"
        stroke-dasharray="125.6"
        stroke-dashoffset={125.6 - (125.6 * pct) / 100}
      />
    </svg>
    <div class="timer-display">
      {#if hours > 0}
        <span class="digit">{fmt(hours)}</span>
        <span class="sep">:</span>
      {/if}
      <span class="digit">{fmt(minutes)}</span>
      <span class="sep">:</span>
      <span class="digit">{fmt(secs)}</span>
    </div>
  </div>
  <div class="timer-label">
    {phase === 'urgent' ? 'Time critical' : phase === 'warning' ? 'Time running low' : 'Time remaining'}
  </div>
</div>

<style>
  .timer-root {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    font-family: 'JetBrains Mono', 'SF Mono', monospace;
  }

  .timer-ring {
    position: relative;
    width: 120px;
    height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .progress-ring {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  .track {
    fill: none;
    stroke: rgba(255, 255, 255, 0.06);
    stroke-width: 3;
  }

  .fill {
    fill: none;
    stroke-width: 3;
    stroke-linecap: round;
    transition: stroke-dashoffset 1s linear, stroke 0.3s;
  }

  .timer-root[data-phase="normal"] .fill  { stroke: #00c9a7; }
  .timer-root[data-phase="warning"] .fill { stroke: #f59e0b; }
  .timer-root[data-phase="urgent"] .fill  {
    stroke: #ef4444;
    animation: ring-pulse 1s ease-in-out infinite;
  }

  .timer-display {
    display: flex;
    align-items: baseline;
    gap: 2px;
    font-size: 1.1rem;
    font-weight: 700;
    color: #fff;
    z-index: 1;
  }

  .digit {
    font-variant-numeric: tabular-nums;
    min-width: 1.4em;
    text-align: center;
  }

  .sep { opacity: 0.4; margin: 0 1px; }

  .timer-label {
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(255, 255, 255, 0.4);
  }

  .timer-root[data-phase="warning"] .timer-label { color: #f59e0b; }
  .timer-root[data-phase="urgent"]  .timer-label {
    color: #ef4444;
    animation: text-pulse 1s ease-in-out infinite;
  }

  @keyframes ring-pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.6; }
  }

  @keyframes text-pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.5; }
  }
</style>