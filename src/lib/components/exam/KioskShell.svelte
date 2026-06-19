<!-- src/lib/components/exam/KioskShell.svelte -->
<!--
  Auto-enters fullscreen immediately on mount (no prompt shown to user).
  All violation detection lives here. Cooldowns are enforced per-type so
  that the same event cannot fire more than once per cooldown window,
  regardless of how many browser events trigger simultaneously.

  Cooldown windows (ms):
    devtools_open   — 10 000 (10 s) : interval fires every 2 s, so max 1 report per 10 s
    window_blur     —  5 000 (5 s)  : DevTools stealing focus fires this repeatedly
    fullscreen_exit —  5 000 (5 s)  : one report per fullscreen loss
    tab_switch      —  3 000 (3 s)
    copy_attempt    —  2 000 (2 s)

  The kiosk page MUST NOT add its own fullscreenchange listener — Shell owns that.
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
  let fsBlocked    = $state(false);

  // ── Per-type cooldown ──────────────────────────────────────────────────
  const COOLDOWNS: Record<string, number> = {
    devtools_open:   10_000,
    window_blur:      5_000,
    fullscreen_exit:  5_000,
    tab_switch:       3_000,
    copy_attempt:     2_000,
  };
  const lastFired = new Map<string, number>();

  function fire(type: string) {
    const now      = Date.now();
    const cooldown = COOLDOWNS[type] ?? 3_000;
    const last     = lastFired.get(type) ?? 0;
    if (now - last < cooldown) return; // still in cooldown — drop it
    lastFired.set(type, now);
    onViolation(type);
  }

  // ── Fullscreen ─────────────────────────────────────────────────────────
  async function enterFullscreen() {
    if (!browser) return;
    try {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      isFullscreen = true;
    } catch {
      fsBlocked = true; // browser denied — continue silently
    }
  }

  function onFullscreenChange() {
    if (!browser) return;
    if (!document.fullscreenElement) {
      isFullscreen = false;
      if (!fsBlocked) {
        fire('fullscreen_exit');
        setTimeout(enterFullscreen, 800);
      }
    } else {
      isFullscreen = true;
    }
  }

  // ── Visibility / blur ──────────────────────────────────────────────────
  function onVisibilityChange() {
    if (!browser) return;
    if (document.hidden) fire('tab_switch');
  }

  // window blur fires when DevTools panel gets focus — heavily throttled
  function onWindowBlur() { fire('window_blur'); }

  // ── Keyboard ───────────────────────────────────────────────────────────
  function onKeyDown(e: KeyboardEvent) {
    const isDevtools =
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && ['I','J','C'].includes(e.key));

    const isBlockedShortcut =
      e.ctrlKey && ['s','p','u','z'].includes(e.key.toLowerCase());

    const isCopyPaste =
      e.ctrlKey && ['c','x','v'].includes(e.key.toLowerCase());

    const isMeta = !!e.metaKey;

    if (isDevtools || isBlockedShortcut || isMeta) {
      e.preventDefault();
      e.stopPropagation();
      if (isDevtools) fire('devtools_open');
    }

    if (isCopyPaste) {
      e.preventDefault();
      e.stopPropagation();
      fire('copy_attempt');
    }
  }

  function onContextMenu(e: MouseEvent) { e.preventDefault(); }
  function onCopy(e: ClipboardEvent)    { e.preventDefault(); fire('copy_attempt'); }
  function onCut(e: ClipboardEvent)     { e.preventDefault(); fire('copy_attempt'); }

  // ── DevTools size heuristic ────────────────────────────────────────────
  // Fires every 2 s but the 10 s cooldown means at most 1 report per 10 s.
  // We skip the check entirely if the page isn't in fullscreen and the browser
  // blocked fullscreen (dev machine) — avoids false positives during dev.
  let devtoolsInterval: ReturnType<typeof setInterval> | undefined;

  function startDevtoolsDetection() {
    if (!browser) return;
    devtoolsInterval = setInterval(() => {
      if (fsBlocked) return; // dev machine without fullscreen — skip heuristic
      const widthDiff  = window.outerWidth  - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      if (widthDiff > 160 || heightDiff > 160) {
        fire('devtools_open');
      }
    }, 2_000);
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────
  onMount(() => {
    if (!browser) return;
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