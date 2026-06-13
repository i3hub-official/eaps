<!-- src/lib/components/exam/KioskShell.svelte -->
<!--
  Auto-enters fullscreen immediately on mount (no prompt shown to user).
  If the browser blocks it (policy), silently continues without fullscreen
  rather than showing a gate the student has to pass through.
  Violation detection hooks remain unchanged.
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';

  interface Props {
    onViolation: (type: string) => void;
    children: import('svelte').Snippet;
  }

  let { onViolation, children }: Props = $props();

  let isFullscreen = $state(false);
  let fsBlocked    = $state(false); // browser denied fullscreen API

  async function enterFullscreen() {
    if (!browser) return;
    try {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      isFullscreen = true;
    } catch {
      // Browser denied (e.g. policy) — mark as blocked and continue silently.
      // Do NOT block the student from starting the exam.
      fsBlocked = true;
    }
  }

  // ── Violation detection ────────────────────────────────────────────────
  function onVisibilityChange() {
    if (!browser) return;
    if (document.hidden) onViolation('tab_switch');
  }

  function onWindowBlur() { onViolation('window_blur'); }

  function onFullscreenChange() {
    if (!browser) return;
    if (!document.fullscreenElement) {
      isFullscreen = false;
      if (!fsBlocked) {
        onViolation('fullscreen_exit');
        // Re-enter after short delay
        setTimeout(enterFullscreen, 800);
      }
    } else {
      isFullscreen = true;
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    const blocked = [
      // Block save/print/undo but NOT A/B/C/D/Y/N/R — those are exam shortcuts
      e.ctrlKey && ['s','p','u','z'].includes(e.key.toLowerCase()),
      e.key === 'F12',
      e.ctrlKey && e.shiftKey && ['I','J','C'].includes(e.key),
      e.metaKey,
    ];
    if (blocked.some(Boolean)) {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey)) onViolation('devtools_open');
    }
    // Block copy/cut/paste via Ctrl+C/X/V
    if (e.ctrlKey && ['c','x','v'].includes(e.key.toLowerCase())) {
      e.preventDefault();
      e.stopPropagation();
      onViolation('copy_attempt');
    }
  }

  function onContextMenu(e: MouseEvent) { e.preventDefault(); }
  function onCopy(e: ClipboardEvent)    { e.preventDefault(); onViolation('copy_attempt'); }
  function onCut(e: ClipboardEvent)     { e.preventDefault(); onViolation('copy_attempt'); }

  // DevTools heuristic
  let devtoolsInterval: ReturnType<typeof setInterval> | undefined;
  function startDevtoolsDetection() {
    if (!browser) return;
    devtoolsInterval = setInterval(() => {
      if (window.outerWidth - window.innerWidth > 160 || window.outerHeight - window.innerHeight > 160)
        onViolation('devtools_open');
    }, 2000);
  }

  onMount(() => {
    if (!browser) return;
    // Auto-enter fullscreen immediately — no user prompt
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
    if (!browser) return;
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

<!-- No fullscreen gate shown to the student — just render the exam -->
<div class="kiosk">
  {@render children()}
</div>

<style>
  .kiosk {
    min-height: 100vh;
    background: var(--color-bg);
    position: relative;
  }
</style>