<!-- src/lib/components/exam/ExamTimer.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  interface Props {
    totalSecs: number;
    onExpire: () => void;
    onTick?: (remaining: number) => void;
  }

  let { totalSecs, onExpire, onTick }: Props = $props();

  let remaining = $state(totalSecs);
  let interval: ReturnType<typeof setInterval> | null = null;

  const fmt = (n: number) => String(n).padStart(2, '0');

  const hours   = $derived(Math.floor(remaining / 3600));
  const minutes = $derived(Math.floor((remaining % 3600) / 60));
  const seconds = $derived(remaining % 60);
  const urgent  = $derived(remaining <= 300);  // last 5 mins
  const warning = $derived(remaining <= 600);  // last 10 mins

  onMount(() => {
    interval = setInterval(() => {
      remaining = Math.max(0, remaining - 1);
      onTick?.(remaining);
      if (remaining === 0) {
        clearInterval(interval!);
        onExpire();
      }
    }, 1000);
  });

  onDestroy(() => {
    if (interval) clearInterval(interval);
  });

  export function setRemaining(secs: number) {
    remaining = secs;
  }
</script>

<div class="timer" class:warning class:urgent aria-live="polite" aria-label="Time remaining">
  {#if hours > 0}
    <span class="segment">{fmt(hours)}<small>h</small></span>
    <span class="colon">:</span>
  {/if}
  <span class="segment">{fmt(minutes)}<small>m</small></span>
  <span class="colon">:</span>
  <span class="segment">{fmt(seconds)}<small>s</small></span>
</div>

<style>
  .timer {
    display: inline-flex;
    align-items: baseline;
    gap: 0.1rem;
    font-variant-numeric: tabular-nums;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-text);
    transition: color 0.3s;
  }
  .warning { color: #f59e0b; }
  .urgent  { color: #ef4444; animation: pulse 1s infinite; }

  .segment { display: inline-flex; align-items: baseline; gap: 1px; }
  small    { font-size: 0.6em; font-weight: 500; opacity: 0.8; }
  .colon   { margin: 0 2px; opacity: 0.6; }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.5; }
  }
</style>
