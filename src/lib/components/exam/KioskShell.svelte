<!-- src/lib/components/exam/KioskShell.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';

  interface Props {
    onViolation: (type: string) => void;
    children: import('svelte').Snippet;
  }

  let { onViolation, children }: Props = $props();

  let isFullscreen = $state(false);

  // ── Enter fullscreen ────────────────────────────────────────────────────────
  async function enterFullscreen() {
    if (!browser) return;  // ✅ guard
    try {
      await document.documentElement.requestFullscreen();
      isFullscreen = true;
    } catch {
      // Browser denied — treat as violation trigger
    }
  }

  // ── Violation detection hooks ───────────────────────────────────────────────

  function onVisibilityChange() {
    if (!browser) return;  // ✅ guard
    if (document.hidden) onViolation('tab_switch');
  }

  function onWindowBlur() {
    onViolation('window_blur');
  }

  function onFullscreenChange() {
    if (!browser) return;  // ✅ guard
    if (!document.fullscreenElement) {
      isFullscreen = false;
      onViolation('fullscreen_exit');
      // Attempt to re-enter fullscreen after a short delay
      setTimeout(enterFullscreen, 800);
    } else {
      isFullscreen = true;
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    // Block common shortcuts
    const blocked = [
      e.ctrlKey && 'acvxspuz'.includes(e.key.toLowerCase()),   // copy/paste/save/print
      e.key === 'F12',
      e.ctrlKey && e.shiftKey && ['I','J','C'].includes(e.key),
      e.altKey && e.key === 'Tab',
      e.metaKey,
    ];
    if (blocked.some(Boolean)) {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey)) {
        onViolation('devtools_open');
      }
    }
  }

  function onContextMenu(e: MouseEvent) {
    e.preventDefault();
  }

  function onCopy(e: ClipboardEvent) {
    e.preventDefault();
    onViolation('copy_attempt');
  }

  function onCut(e: ClipboardEvent) {
    e.preventDefault();
    onViolation('copy_attempt');
  }

  // DevTools detection via window size heuristic
  let devtoolsInterval: ReturnType<typeof setInterval> | undefined;

  function startDevtoolsDetection() {
    if (!browser) return;  // ✅ guard
    devtoolsInterval = setInterval(() => {
      const threshold = 160;
      if (
        window.outerWidth - window.innerWidth > threshold ||
        window.outerHeight - window.innerHeight > threshold
      ) {
        onViolation('devtools_open');
      }
    }, 2000);
  }

  onMount(() => {
    if (!browser) return;  // ✅ guard

    enterFullscreen();

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onWindowBlur);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('copy', onCopy);
    document.addEventListener('cut', onCut);
    startDevtoolsDetection();
  });

  onDestroy(() => {
    if (!browser) return;  // ✅ guard

    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('blur', onWindowBlur);
    document.removeEventListener('fullscreenchange', onFullscreenChange);
    document.removeEventListener('keydown', onKeyDown, true);
    document.removeEventListener('contextmenu', onContextMenu);
    document.removeEventListener('copy', onCopy);
    document.removeEventListener('cut', onCut);
    clearInterval(devtoolsInterval);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  });
</script>

{#if !isFullscreen}
  <div class="fullscreen-prompt">
    <div class="prompt-card">
      <span class="icon" aria-hidden="true">⛶</span>
      <h2>Fullscreen Required</h2>
      <p>This exam must be taken in fullscreen mode.</p>
      <button onclick={enterFullscreen} type="button">Enter Fullscreen</button>
    </div>
  </div>
{/if}

<div class="kiosk" class:dimmed={!isFullscreen}>
  {@render children()}
</div>

<style>
  .kiosk {
    min-height: 100vh;
    background: var(--color-bg);
    position: relative;
    transition: opacity 0.2s;
  }
  .kiosk.dimmed { pointer-events: none; opacity: 0.3; }

  .fullscreen-prompt {
    position: fixed; inset: 0; z-index: 10000;
    background: rgba(0,0,0,0.85);
    display: flex; align-items: center; justify-content: center;
  }

  .prompt-card {
    background: var(--color-surface);
    border-radius: 1rem;
    padding: 2.5rem;
    text-align: center;
    max-width: 360px;
    width: 100%;
    display: flex; flex-direction: column; align-items: center; gap: 1rem;
  }

  .icon  { font-size: 3rem; }
  h2     { font-size: 1.3rem; font-weight: 700; margin: 0; }
  p      { color: var(--color-muted); margin: 0; }

  button {
    padding: 0.75rem 2rem;
    background: var(--color-primary);
    color: #fff;
    border: none;
    border-radius: 0.5rem;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    margin-top: 0.5rem;
  }
</style>