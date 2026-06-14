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

  const FLAG_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
    tab_switch:         { label: 'Tab switch detected', icon: '↗', color: '#f59e0b' },
    window_blur:        { label: 'Window focus lost', icon: '◐', color: '#f59e0b' },
    fullscreen_exit:    { label: 'Fullscreen exited', icon: '⛶', color: '#f59e0b' },
    copy_attempt:       { label: 'Copy attempt detected', icon: '©', color: '#ef4444' },
    devtools_open:      { label: 'DevTools opened', icon: '⚙', color: '#ef4444' },
    screenshot_attempt: { label: 'Screenshot attempt', icon: '📷', color: '#ef4444' },
    multiple_faces:     { label: 'Multiple faces detected', icon: '👥', color: '#ef4444' },
    no_face_detected:   { label: 'No face detected', icon: '👤', color: '#ef4444' },
    face_mismatch:      { label: 'Face verification failed', icon: '🪪', color: '#ef4444' },
    invigilator_manual: { label: 'Flagged by invigilator', icon: '🚩', color: '#ef4444' },
  };

  const ACTION_MESSAGES: Record<string, string> = {
    warning:             'This is a warning. Further violations may pause your exam.',
    invigilator_alerted: 'Your invigilator has been alerted and is reviewing your session.',
    exam_paused:         'Your exam has been paused. Wait for your invigilator to resume.',
    auto_submitted:      'Your exam has been automatically submitted due to repeated violations.',
  };

  const config = $derived(FLAG_CONFIG[flagType] ?? { label: 'Violation detected', icon: '⚠', color: '#f59e0b' });
  const isFatal = $derived(action === 'auto_submitted' || action === 'exam_paused');
  const message = $derived(ACTION_MESSAGES[action] ?? 'A violation was recorded.');
  const severity = $derived(isFatal ? 'fatal' : count >= max - 1 ? 'critical' : count >= max / 2 ? 'elevated' : 'standard');
</script>

<div class="overlay" role="alertdialog" aria-modal="true" aria-labelledby="vw-title">
  <div class="modal" style="--accent: {config.color}" data-severity={severity}>
    <div class="modal-glow"></div>

    <div class="icon-ring" style="border-color: {config.color}">
      <span class="icon" aria-hidden="true">{config.icon}</span>
    </div>

    <div class="content">
      <h2 id="vw-title">{config.label}</h2>
      <p class="message">{message}</p>
    </div>

    <div class="strike-track">
      <div class="strike-label">Violation history</div>
      <div class="strike-dots">
        {#each Array(max) as _, i}
          <div class="strike-dot" class:active={i < count} class:current={i === count - 1}></div>
        {/each}
      </div>
      <div class="strike-meta">
        <span class="count">{count} <span class="of">of {max}</span></span>
        <span class="remaining">{max - count} remaining before action</span>
      </div>
    </div>

    {#if !isFatal}
      <button class="dismiss" onclick={onDismiss} type="button">
        <span>I understand — continue exam</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </button>
    {:else}
      <div class="fatal-badge">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <span>Session ended</span>
      </div>
    {/if}
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    animation: fade-in 0.2s ease;
  }

  .modal {
    position: relative;
    background: linear-gradient(180deg, #15171c 0%, #0f1115 100%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 1.5rem;
    padding: 2.5rem;
    max-width: 440px;
    width: 100%;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.75rem;
    overflow: hidden;
    animation: scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .modal-glow {
    position: absolute;
    top: -50%;
    left: 50%;
    transform: translateX(-50%);
    width: 200px;
    height: 200px;
    border-radius: 50%;
    background: var(--accent);
    opacity: 0.08;
    filter: blur(60px);
    pointer-events: none;
  }

  .icon-ring {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    border: 2px solid;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.03);
    animation: ring-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .icon {
    font-size: 2rem;
    line-height: 1;
  }

  .content {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  h2 {
    font-size: 1.15rem;
    font-weight: 700;
    color: #fff;
    margin: 0;
    line-height: 1.3;
  }

  .message {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.5);
    margin: 0;
    line-height: 1.6;
    max-width: 320px;
  }

  /* Strike track */
  .strike-track {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    width: 100%;
    padding: 1rem 1.25rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 1rem;
    border: 1px solid rgba(255, 255, 255, 0.06);
  }

  .strike-label {
    font-size: 0.7rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.3);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .strike-dots {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
  }

  .strike-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    position: relative;
  }

  .strike-dot.active {
    background: var(--accent);
    box-shadow: 0 0 8px var(--accent);
  }

  .strike-dot.current {
    transform: scale(1.3);
    animation: dot-pulse 1.5s ease-in-out infinite;
  }

  .strike-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.8rem;
  }

  .count {
    font-weight: 700;
    color: #fff;
  }

  .of {
    font-weight: 400;
    color: rgba(255, 255, 255, 0.4);
  }

  .remaining {
    color: rgba(255, 255, 255, 0.35);
  }

  /* Buttons */
  .dismiss {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.875rem 1.5rem;
    background: linear-gradient(135deg, #059669, #047857);
    color: #fff;
    border: none;
    border-radius: 0.875rem;
    font-size: 0.9rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;
    box-shadow: 0 4px 16px rgba(5, 150, 105, 0.25);
  }

  .dismiss:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(5, 150, 105, 0.35);
  }

  .dismiss:active {
    transform: scale(0.98);
  }

  .fatal-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 0.75rem;
    color: #ef4444;
    font-size: 0.85rem;
    font-weight: 600;
  }

  /* Severity variants */
  .modal[data-severity="fatal"] {
    border-color: rgba(239, 68, 68, 0.3);
  }

  .modal[data-severity="critical"] {
    border-color: rgba(245, 158, 11, 0.4);
  }

  .modal[data-severity="elevated"] {
    border-color: rgba(245, 158, 11, 0.2);
  }

  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes scale-in {
    from { opacity: 0; transform: scale(0.92) translateY(8px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }

  @keyframes ring-in {
    from { opacity: 0; transform: scale(0.5); }
    to { opacity: 1; transform: scale(1); }
  }

  @keyframes dot-pulse {
    0%, 100% { box-shadow: 0 0 0 0 var(--accent); }
    50% { box-shadow: 0 0 0 6px rgba(0, 0, 0, 0); }
  }
</style>