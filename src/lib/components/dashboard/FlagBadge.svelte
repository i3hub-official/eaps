<!-- src/lib/components/dashboard/FlagBadge.svelte -->
<script lang="ts">
  interface Props {
    flagType: string;
    count?: number;
    showLabel?: boolean;
  }

  let { flagType, count, showLabel = true }: Props = $props();

  const FLAGS: Record<string, { icon: string; label: string; color: string }> = {
    tab_switch:         { icon: '⇄', label: 'Tab Switch',       color: 'orange' },
    window_blur:        { icon: '👁', label: 'Focus Lost',       color: 'yellow' },
    fullscreen_exit:    { icon: '⛶', label: 'Fullscreen Exit',  color: 'orange' },
    copy_attempt:       { icon: '⎘',  label: 'Copy Attempt',    color: 'red'    },
    devtools_open:      { icon: '🛠', label: 'DevTools',         color: 'red'    },
    screenshot_attempt: { icon: '📸', label: 'Screenshot',       color: 'purple' },
    multiple_faces:     { icon: '👥', label: 'Multiple Faces',   color: 'red'    },
    no_face_detected:   { icon: '👤', label: 'No Face',          color: 'gray'   },
    invigilator_manual: { icon: '🚩', label: 'Manual Flag',      color: 'blue'   },
  };

  const flag = $derived(FLAGS[flagType] ?? { icon: '⚠️', label: flagType, color: 'gray' });
</script>

<span class="badge color-{flag.color}" title={flag.label}>
  <span class="icon" aria-hidden="true">{flag.icon}</span>
  {#if showLabel}<span class="label">{flag.label}</span>{/if}
  {#if count != null && count > 1}<span class="count">×{count}</span>{/if}
</span>

<style>
  .badge {
    display: inline-flex; align-items: center; gap: 0.3rem;
    padding: 0.2rem 0.5rem; border-radius: 999px;
    font-size: 0.72rem; font-weight: 600; white-space: nowrap;
  }
  .icon  { font-size: 0.85em; }
  .count { opacity: 0.8; }

  .color-orange { background: #ffedd5; color: #c2410c; }
  .color-yellow { background: #fef9c3; color: #854d0e; }
  .color-red    { background: #fee2e2; color: #dc2626; }
  .color-purple { background: #f3e8ff; color: #7e22ce; }
  .color-blue   { background: #dbeafe; color: #1d4ed8; }
  .color-gray   { background: var(--color-border); color: var(--color-muted); }
</style>