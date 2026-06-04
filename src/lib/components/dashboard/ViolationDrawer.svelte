<!-- src/lib/components/dashboard/ViolationDrawer.svelte -->
<!-- 
  Drop this into /invigilator/monitor/[examId]/+page.svelte.

  Usage:
    <ViolationDrawer {sessionId} {studentName} bind:open={drawerOpen} />

  The component fetches violations for the selected session via the
  existing GET /api/invigilator/session?session_id=... endpoint,
  then lets the invigilator pause, resume, or force-submit.
-->
<script lang="ts">
  import { X, Shield, AlertTriangle, Play, Pause, LogOut, RefreshCw } from 'lucide-svelte';

  let {
    sessionId,
    studentName,
    open = $bindable(false),
    onAction,
  }: {
    sessionId: string;
    studentName: string;
    open: boolean;
    onAction?: (action: string, sessionId: string) => void;
  } = $props();

  type Violation = {
    id: string;
    flagType: string;
    actionTaken: string | null;
    note: string | null;
    flaggedAt: string;
  };

  let violations    = $state<Violation[]>([]);
  let loading       = $state(false);
  let actionLoading = $state<string | null>(null);
  let note          = $state('');
  let error         = $state<string | null>(null);

  const FLAG_LABELS: Record<string, string> = {
    tab_switch:         'Tab switch',
    window_blur:        'Window blur',
    fullscreen_exit:    'Fullscreen exit',
    copy_attempt:       'Copy attempt',
    devtools_open:      'DevTools opened',
    screenshot_attempt: 'Screenshot attempt',
    multiple_faces:     'Multiple faces',
    no_face_detected:   'No face detected',
    invigilator_manual: 'Invigilator action',
  };

  async function fetchViolations() {
    if (!sessionId) return;
    loading = true;
    error = null;
    try {
      const res = await fetch(`/api/invigilator/session?session_id=${sessionId}`);
      const data = await res.json();
      violations = data.violations ?? [];
    } catch {
      error = 'Failed to load violations.';
    } finally {
      loading = false;
    }
  }

  async function sendAction(action: 'pause' | 'resume' | 'force_submit') {
    actionLoading = action;
    error = null;
    try {
      const res = await fetch('/api/invigilator/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, action, note: note || undefined }),
      });
      if (!res.ok) throw new Error(await res.text());
      note = '';
      onAction?.(action, sessionId);
      await fetchViolations();
    } catch (e: any) {
      error = e?.message ?? 'Action failed.';
    } finally {
      actionLoading = null;
    }
  }

  function relative(d: string) {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'Just now';
    if (m < 60) return `${m}m ago`;
    return `${Math.floor(m / 60)}h ago`;
  }

  // Fetch when drawer opens or sessionId changes
  $effect(() => {
    if (open && sessionId) fetchViolations();
  });
</script>

<!-- Backdrop -->
{#if open}
  <div class="backdrop" onclick={() => open = false}></div>
{/if}

<!-- Drawer -->
<div class="drawer" class:drawer-open={open}>
  <div class="drawer-head">
    <div class="dh-info">
      <Shield size={16} />
      <div>
        <div class="dh-name">{studentName}</div>
        <div class="dh-sub">Violation log</div>
      </div>
    </div>
    <div class="dh-actions">
      <button class="dh-refresh" onclick={fetchViolations} disabled={loading} title="Refresh">
        <RefreshCw size={14} class={loading ? 'spin' : ''} />
      </button>
      <button class="dh-close" onclick={() => open = false}><X size={16} /></button>
    </div>
  </div>

  <!-- Action buttons -->
  <div class="action-strip">
    <button
      class="action-btn action-pause"
      disabled={!!actionLoading}
      onclick={() => sendAction('pause')}
    >
      {#if actionLoading === 'pause'}<span class="spin">⟳</span>{:else}<Pause size={13} />{/if}
      Pause
    </button>
    <button
      class="action-btn action-resume"
      disabled={!!actionLoading}
      onclick={() => sendAction('resume')}
    >
      {#if actionLoading === 'resume'}<span class="spin">⟳</span>{:else}<Play size={13} />{/if}
      Resume
    </button>
    <button
      class="action-btn action-force"
      disabled={!!actionLoading}
      onclick={() => sendAction('force_submit')}
    >
      {#if actionLoading === 'force_submit'}<span class="spin">⟳</span>{:else}<LogOut size={13} />{/if}
      Force Submit
    </button>
  </div>

  <!-- Note input -->
  <div class="note-wrap">
    <textarea
      class="note-input"
      placeholder="Optional note for this action…"
      bind:value={note}
      rows="2"
    ></textarea>
  </div>

  {#if error}
    <div class="drawer-error"><AlertTriangle size={12} /> {error}</div>
  {/if}

  <!-- Violation list -->
  <div class="vlist">
    {#if loading}
      <div class="vlist-loading">Loading violations…</div>
    {:else if violations.length === 0}
      <div class="vlist-empty"><Shield size={24} /><p>No violations recorded</p></div>
    {:else}
      <div class="vlist-count">{violations.length} violation{violations.length !== 1 ? 's' : ''}</div>
      {#each violations as v (v.id)}
        <div class="vlog-row">
          <div class="vlog-dot"></div>
          <div class="vlog-content">
            <span class="vlog-type">{FLAG_LABELS[v.flagType] ?? v.flagType}</span>
            {#if v.actionTaken}
              <span class="vlog-action">{v.actionTaken.replace(/_/g,' ')}</span>
            {/if}
            {#if v.note}
              <span class="vlog-note">"{v.note}"</span>
            {/if}
          </div>
          <span class="vlog-time">{relative(v.flaggedAt)}</span>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  /* Backdrop */
  .backdrop {
    position: fixed; inset: 0; background: rgba(0,0,0,.35);
    backdrop-filter: blur(1px); z-index: 49;
    animation: fade-in .15s ease;
  }
  @keyframes fade-in { from{opacity:0}to{opacity:1} }

  /* Drawer */
  .drawer {
    position: fixed; top: 0; right: 0; bottom: 0; width: 360px;
    background: var(--color-surface); border-left: 1px solid var(--color-border);
    display: flex; flex-direction: column; z-index: 50;
    transform: translateX(100%);
    transition: transform .25s cubic-bezier(.16,1,.3,1);
    box-shadow: -8px 0 32px rgba(0,0,0,.12);
  }
  .drawer-open { transform: translateX(0); }

  /* Header */
  .drawer-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 1rem 1.25rem; border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }
  .dh-info { display: flex; align-items: center; gap: .625rem; color: var(--color-text); }
  .dh-info :global(svg) { color: #14b8a6; }
  .dh-name { font-size: .88rem; font-weight: 700; color: var(--color-text); }
  .dh-sub  { font-size: .7rem; color: var(--color-muted); }
  .dh-actions { display: flex; gap: .375rem; }
  .dh-refresh, .dh-close {
    width: 30px; height: 30px; border-radius: .375rem;
    background: none; border: 1px solid var(--color-border);
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    color: var(--color-muted); transition: all .15s;
  }
  .dh-refresh:hover { border-color: #14b8a6; color: #14b8a6; }
  .dh-close:hover   { border-color: #dc2626; color: #dc2626; }
  .dh-refresh:disabled { opacity: .5; cursor: not-allowed; }

  /* Actions */
  .action-strip {
    display: grid; grid-template-columns: 1fr 1fr 1fr; gap: .5rem;
    padding: .875rem 1.25rem; border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }
  .action-btn {
    display: flex; align-items: center; justify-content: center; gap: .375rem;
    padding: .5rem; border-radius: .5rem; border: none;
    font-size: .75rem; font-weight: 700; cursor: pointer; font-family: inherit;
    transition: all .15s;
  }
  .action-btn:disabled { opacity: .5; cursor: not-allowed; }
  .action-pause  { background: rgba(245,158,11,.12); color: #ca8a04; }
  .action-pause:hover:not(:disabled)  { background: rgba(245,158,11,.2); }
  .action-resume { background: rgba(22,163,74,.12);  color: #16a34a; }
  .action-resume:hover:not(:disabled) { background: rgba(22,163,74,.2); }
  .action-force  { background: rgba(220,38,38,.12);  color: #dc2626; }
  .action-force:hover:not(:disabled)  { background: rgba(220,38,38,.2); }

  /* Note */
  .note-wrap { padding: .75rem 1.25rem; border-bottom: 1px solid var(--color-border); flex-shrink: 0; }
  .note-input {
    width: 100%; padding: .5rem .75rem; background: var(--color-bg);
    border: 1px solid var(--color-border); border-radius: .5rem;
    font-size: .78rem; color: var(--color-text); font-family: inherit;
    outline: none; resize: none; transition: border-color .15s;
  }
  .note-input:focus { border-color: #14b8a6; }

  /* Error */
  .drawer-error {
    display: flex; align-items: center; gap: .5rem;
    margin: .5rem 1.25rem; padding: .5rem .75rem;
    background: rgba(220,38,38,.08); border: 1px solid rgba(220,38,38,.2);
    border-radius: .5rem; font-size: .75rem; color: #dc2626; flex-shrink: 0;
  }

  /* Violation list */
  .vlist { flex: 1; overflow-y: auto; padding: .75rem 1.25rem; display: flex; flex-direction: column; gap: .5rem; }
  .vlist::-webkit-scrollbar { width: 3px; }
  .vlist::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 2px; }
  .vlist-loading, .vlist-empty { padding: 2rem; text-align: center; color: var(--color-muted); font-size: .82rem; }
  .vlist-empty { display: flex; flex-direction: column; align-items: center; gap: .75rem; }
  .vlist-empty :global(svg) { color: var(--color-border); }
  .vlist-count { font-size: .68rem; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--color-muted); margin-bottom: .25rem; }

  .vlog-row { display: flex; align-items: flex-start; gap: .625rem; padding: .5rem 0; border-bottom: 1px solid var(--color-border); }
  .vlog-row:last-child { border-bottom: none; }
  .vlog-dot { width: 6px; height: 6px; border-radius: 50%; background: #dc2626; flex-shrink: 0; margin-top: .35rem; }
  .vlog-content { flex: 1; display: flex; flex-direction: column; gap: .2rem; }
  .vlog-type   { font-size: .8rem; font-weight: 700; color: var(--color-text); }
  .vlog-action { font-size: .72rem; color: #f59e0b; font-weight: 600; }
  .vlog-note   { font-size: .7rem; color: var(--color-muted); font-style: italic; }
  .vlog-time   { font-size: .68rem; color: var(--color-muted); white-space: nowrap; flex-shrink: 0; }

  .spin { display: inline-block; animation: spin .7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 480px) { .drawer { width: 100vw; } }
</style>