<!-- src/lib/components/exam/FaceMonitor.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';

  interface Props {
    examId: string;
    sessionId: string;
    enrolledDescriptor: number[] | null;
    checkInterval?: number;
    onViolation: (type: 'no_face_detected' | 'multiple_faces') => void;
    onCameraError?: (msg: string) => void;
  }

  let {
    examId,
    sessionId,
    enrolledDescriptor,
    checkInterval = 12_000,
    onViolation,
    onCameraError,
  }: Props = $props();

  let videoEl: HTMLVideoElement;

  let human: any = null;
  let stream: MediaStream | null = null;
  let interval: ReturnType<typeof setInterval> | null = null;
  let tickInterval: ReturnType<typeof setInterval> | null = null; // FIX: for nextCheckIn countdown
  let ready = false;
  let consecutiveNoFace = 0;

  let livenessConfirmed = false;
  let eyeOpenHistory: number[] = [];
  const LIVENESS_WINDOW = 8;

  const MATCH_THRESHOLD = 0.65;
  const SOFT_THRESHOLD  = 0.55;
  const NO_FACE_GRACE   = 2;
  const EAR_OPEN        = 0.25;
  const EAR_CLOSED      = 0.18;

  // ── UI State ───────────────────────────────────────────────────────────────
  type MonitorStatus = 'initializing' | 'active' | 'warning' | 'error' | 'paused';
  let monitorStatus   = $state<MonitorStatus>('initializing');
  let faceCount       = $state(0);
  let lastCheckTime   = $state<Date | null>(null);
  let similarityScore = $state<number | null>(null);
  let violationCount  = $state({ no_face: 0, multiple: 0, mismatch: 0 });
  let isExpanded      = $state(false);
  let cameraPermission = $state<'prompt' | 'granted' | 'denied'>('prompt');

  // FIX: reactive `now` so nextCheckIn countdown actually ticks
  let now = $state(Date.now());

  let modelLoadingPromise: Promise<any> | null = null;

  // ── Pre-load models ────────────────────────────────────────────────────────
  if (browser && !modelLoadingPromise) {
    modelLoadingPromise = (async () => {
      const HumanModule = await import('@vladmandic/human');
      const humanInstance = new HumanModule.default({
        modelBasePath: '/models/human',
        backend:       'webgl',
        hand:          { enabled: false },
        body:          { enabled: false },
        object:        { enabled: false },
        gesture:       { enabled: false }, // FIX: was true in fallback, false here — aligned to false
        segmentation:  { enabled: false },
        face: {
          enabled:     true,
          detector:    { maxDetected: 4, minConfidence: 0.45, return: true },
          description: { enabled: true },
          mesh:        { enabled: true },  // needed for EAR liveness check
          emotion:     { enabled: false },
          iris:        { enabled: false },
          antispoof:   { enabled: true },
          liveness:    { enabled: true },
        },
      });
      await humanInstance.load();
      await humanInstance.warmup();
      return humanInstance;
    })();
  }

  onMount(async () => {
    if (!browser) return;

    // FIX: tick `now` every second so nextCheckIn derived value updates
    tickInterval = setInterval(() => { now = Date.now(); }, 1000);

    try {
      if ('permissions' in navigator) {
        const perm = await navigator.permissions.query({ name: 'camera' as PermissionName });
        cameraPermission = perm.state as 'prompt' | 'granted' | 'denied';
        perm.addEventListener('change', () => {
          cameraPermission = perm.state as 'prompt' | 'granted' | 'denied';
        });
      }

      human = await (modelLoadingPromise ?? (async () => {
        const HumanModule = await import('@vladmandic/human');
        const h = new HumanModule.default({
          modelBasePath: '/models/human',
          backend:       'webgl',
          hand:          { enabled: false },
          body:          { enabled: false },
          object:        { enabled: false },
          gesture:       { enabled: false }, // FIX: aligned with pre-load config
          segmentation:  { enabled: false },
          face: {
            enabled:     true,
            detector:    { maxDetected: 4, minConfidence: 0.45, return: true },
            description: { enabled: true },
            mesh:        { enabled: true },
            emotion:     { enabled: false },
            iris:        { enabled: false },
            antispoof:   { enabled: true },
            liveness:    { enabled: true },
          },
        });
        await h.load();
        await h.warmup();
        return h;
      })());

      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });

      videoEl.srcObject = stream;
      await videoEl.play();

      ready         = true;
      monitorStatus = 'active';
      cameraPermission = 'granted';

      setTimeout(runCheck, 3_000);
      interval = setInterval(runCheck, checkInterval);
    } catch (e: any) {
      const msg = e?.message ?? 'Camera unavailable';
      monitorStatus = 'error';
      if (msg.toLowerCase().includes('denied') || msg.toLowerCase().includes('permission')) {
        cameraPermission = 'denied';
      }
      onCameraError?.(msg);
    }
  });

  onDestroy(stop);

  export function stop() {
    if (interval)     { clearInterval(interval);     interval     = null; }
    if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
    stream?.getTracks().forEach(t => t.stop());
    stream = null;
    ready  = false;
    monitorStatus = 'paused';
  }

  export function pause() {
    if (interval) { clearInterval(interval); interval = null; }
    monitorStatus = 'paused';
  }

  export function resume() {
    if (!interval && ready) {
      interval = setInterval(runCheck, checkInterval);
      monitorStatus = 'active';
      runCheck();
    }
  }

  // ── EAR helpers ────────────────────────────────────────────────────────────
  function dist2d(a: number[], b: number[]): number {
    return Math.hypot(a[0] - b[0], a[1] - b[1]);
  }

  function eyeAspectRatio(mesh: number[][], indices: number[]): number {
    const pts = indices.map(i => mesh[i]);
    if (!pts[0] || !pts[3]) return 1;
    const vertical   = dist2d(pts[1], pts[5]) + dist2d(pts[2], pts[4]);
    const horizontal = 2 * dist2d(pts[0], pts[3]);
    return horizontal > 0 ? vertical / horizontal : 1;
  }

  const LEFT_EYE_IDX  = [33,  160, 158, 133, 153, 144];
  const RIGHT_EYE_IDX = [263, 387, 385, 362, 380, 373];

  function getMeanEAR(mesh: number[][]): number {
    return (eyeAspectRatio(mesh, LEFT_EYE_IDX) + eyeAspectRatio(mesh, RIGHT_EYE_IDX)) / 2;
  }

  function checkLiveness(ear: number): void {
    if (livenessConfirmed) return;
    eyeOpenHistory.push(ear);
    if (eyeOpenHistory.length > LIVENESS_WINDOW) eyeOpenHistory.shift();
    if (eyeOpenHistory.length < LIVENESS_WINDOW) return;
    const openFrames   = eyeOpenHistory.filter(v => v > EAR_OPEN).length;
    const closedFrames = eyeOpenHistory.filter(v => v < EAR_CLOSED).length;
    if (openFrames >= 4 && closedFrames >= 1) livenessConfirmed = true;
  }

  // ── Descriptor comparison ──────────────────────────────────────────────────
  function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot   += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom > 0 ? dot / denom : 0;
  }

  function compareDescriptors(enrolled: number[], current: number[]): number {
    if (enrolled.length === current.length) return cosineSimilarity(enrolled, current);
    const min = Math.min(enrolled.length, current.length);
    return cosineSimilarity(enrolled.slice(0, min), current.slice(0, min));
  }

  // ── Main check ─────────────────────────────────────────────────────────────
  async function runCheck() {
    if (!ready || !human || !videoEl) return;

    try {
      const result = await human.detect(videoEl);
      const faces  = result?.face ?? [];
      const count  = faces.length;
      faceCount     = count;
      lastCheckTime = new Date();

      if (count === 0) {
        consecutiveNoFace++;
        monitorStatus = 'warning';
        if (consecutiveNoFace >= NO_FACE_GRACE) {
          consecutiveNoFace = 0;
          violationCount.no_face++;
          onViolation('no_face_detected');
          await reportViolation('no_face_detected');
        }
        return;
      }

      consecutiveNoFace = 0;

      if (count > 1) {
        monitorStatus = 'warning';
        violationCount.multiple++;
        onViolation('multiple_faces');
        await reportViolation('multiple_faces');
        return;
      }

      const face = faces[0];

      // Liveness & antispoof
      const isLive = face.liveness?.score  != null ? face.liveness.score  > 0.55 : true;
      const isReal = face.antispoof?.score != null ? face.antispoof.score > 0.55 : true;

      if (!isLive || !isReal) {
        // FIX: spoof attempts logged with reason in meta, not as a bare 'multiple_faces'
        monitorStatus = 'warning';
        violationCount.mismatch++;
        await reportMismatch(0, 'spoof_attempt');
        console.warn('Spoofing attempt detected during exam');
      } else {
        monitorStatus = 'active';
      }

      if (face.mesh && face.mesh.length > 0) {
        checkLiveness(getMeanEAR(face.mesh as number[][]));
      }

      if (enrolledDescriptor && face.embedding?.length > 0) {
        const similarity = compareDescriptors(
          enrolledDescriptor,
          Array.from(face.embedding as number[]),
        );
        similarityScore = similarity;
        if (similarity < SOFT_THRESHOLD) {
          violationCount.mismatch++;
          await reportMismatch(similarity, 'face_mismatch');
        }
      } else {
        similarityScore = null;
      }
    } catch (err) {
      console.error('Face check error:', err);
    }
  }

  async function reportViolation(flagType: 'no_face_detected' | 'multiple_faces') {
    try {
      await fetch(`/api/exam/${examId}/violation`, {
        method:    'POST',
        headers:   { 'Content-Type': 'application/json' },
        body:      JSON.stringify({ session_id: sessionId, flag_type: flagType }),
        keepalive: true,
      });
    } catch { /* fire-and-forget */ }
  }

  async function reportMismatch(similarity: number, reason: 'face_mismatch' | 'spoof_attempt') {
    try {
      await fetch(`/api/exam/${examId}/violation`, {
        method:    'POST',
        headers:   { 'Content-Type': 'application/json' },
        body:      JSON.stringify({
          session_id: sessionId,
          flag_type:  'multiple_faces',
          meta: {
            reason,
            similarity:       similarity.toFixed(4),
            soft_threshold:   SOFT_THRESHOLD,
            match_threshold:  MATCH_THRESHOLD,
            verdict:          similarity < SOFT_THRESHOLD ? 'no_match' : 'uncertain',
            liveness:         livenessConfirmed,
          },
        }),
        keepalive: true,
      });
    } catch { /* fire-and-forget */ }
  }

  // ── Derived UI ─────────────────────────────────────────────────────────────
  let statusColor = $derived(
    monitorStatus === 'error'   ? '#ef4444' :
    monitorStatus === 'warning' ? '#f59e0b' :
    monitorStatus === 'paused'  ? '#6b7280' :
    livenessConfirmed           ? '#22c55e' : '#3b82f6'
  );

  let statusLabel = $derived(
    monitorStatus === 'error'   ? 'Camera Error' :
    monitorStatus === 'warning' ? 'Attention Needed' :
    monitorStatus === 'paused'  ? 'Monitoring Paused' :
    !livenessConfirmed          ? 'Verifying…' :
    faceCount === 1             ? 'Monitoring Active' : 'Checking…'
  );

  // FIX: uses reactive `now` so it ticks every second
  let nextCheckIn = $derived(
    lastCheckTime
      ? Math.max(0, Math.round((checkInterval - (now - lastCheckTime.getTime())) / 1000))
      : checkInterval / 1000
  );
</script>

<div class="monitor-wrap" class:expanded={isExpanded} aria-hidden="true">
  <div class="monitor" style="--status-color: {statusColor}">

    <button
      class="monitor-header"
      onclick={() => isExpanded = !isExpanded}
      aria-label={isExpanded ? 'Collapse monitor' : 'Expand monitor'}
    >
      <div
        class="status-pulse"
        class:warning={monitorStatus === 'warning'}
        class:error={monitorStatus === 'error'}
      ></div>
      <span class="status-text">{statusLabel}</span>
      <svg class="chevron" class:rotated={isExpanded} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </button>

    <div class="video-container">
      <video bind:this={videoEl} muted playsinline class="feed"></video>
      <div class="video-overlay">
        {#if monitorStatus === 'warning'}
          <div class="overlay-badge warning">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            {faceCount === 0 ? 'No face visible' : 'Multiple faces!'}
          </div>
        {:else if monitorStatus === 'error'}
          <div class="overlay-badge error">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            Camera error
          </div>
        {:else if !livenessConfirmed}
          <div class="overlay-badge info">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            Blink to verify
          </div>
        {/if}

        <div class="face-counter" class:bad={faceCount > 1} class:good={faceCount === 1}>
          {#if faceCount === 0}
            <span class="fc-dot"></span> No face
          {:else if faceCount === 1}
            <span class="fc-dot green"></span> 1 face
          {:else}
            <span class="fc-dot red"></span> {faceCount} faces
          {/if}
        </div>
      </div>
    </div>

    {#if isExpanded}
      <div class="details-panel">
        <div class="detail-row">
          <span class="detail-label">Liveness</span>
          <span class="detail-value" class:confirmed={livenessConfirmed}>
            {#if livenessConfirmed}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Confirmed
            {:else}
              <span class="detail-pulse"></span>
              Checking…
            {/if}
          </span>
        </div>

        {#if enrolledDescriptor}
          <div class="detail-row">
            <span class="detail-label">Identity</span>
            <span
              class="detail-value"
              class:confirmed={similarityScore !== null && similarityScore >= SOFT_THRESHOLD}
              class:bad={similarityScore !== null && similarityScore < SOFT_THRESHOLD}
            >
              {#if similarityScore === null}
                —
              {:else}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  {#if similarityScore >= SOFT_THRESHOLD}
                    <polyline points="20 6 9 17 4 12"/>
                  {:else}
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  {/if}
                </svg>
                {Math.round(similarityScore * 100)}%
              {/if}
            </span>
          </div>
        {/if}

        <div class="detail-row">
          <span class="detail-label">Next scan</span>
          <span class="detail-value muted">{nextCheckIn}s</span>
        </div>

        <div class="detail-row violations">
          <span class="detail-label">Flags</span>
          <div class="violation-chips">
            {#if violationCount.no_face > 0}
              <span class="v-chip amber">{violationCount.no_face} no-face</span>
            {/if}
            {#if violationCount.multiple > 0}
              <span class="v-chip red">{violationCount.multiple} multi-face</span>
            {/if}
            {#if violationCount.mismatch > 0}
              <span class="v-chip red">{violationCount.mismatch} mismatch</span>
            {/if}
            {#if violationCount.no_face === 0 && violationCount.multiple === 0 && violationCount.mismatch === 0}
              <span class="v-chip green">Clean</span>
            {/if}
          </div>
        </div>

        {#if cameraPermission === 'denied'}
          <div class="permission-banner">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            Camera access denied. Monitoring disabled.
          </div>
        {/if}
      </div>
    {/if}

    <div class="status-bar" style="background: {statusColor}"></div>
  </div>
</div>

<style>
  .monitor-wrap {
    position: fixed; bottom: 1rem; right: 1rem; z-index: 50;
    font-family: 'DM Sans', system-ui, sans-serif;
  }
  .monitor {
    width: 160px; background: #0f1115; border-radius: 12px; overflow: hidden;
    border: 1px solid rgba(255,255,255,0.08);
    box-shadow: 0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,0,0,0.2);
    transition: width 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s;
  }
  .monitor-wrap.expanded .monitor {
    width: 240px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05);
  }
  .monitor-header {
    width: 100%; display: flex; align-items: center; gap: 8px;
    padding: 8px 10px; background: rgba(255,255,255,0.03);
    border: none; color: rgba(255,255,255,0.7);
    font-size: 0.7rem; font-weight: 600; cursor: pointer;
    font-family: inherit; transition: background 0.15s;
  }
  .monitor-header:hover { background: rgba(255,255,255,0.06); }
  .status-pulse {
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--status-color, #3b82f6); flex-shrink: 0; position: relative;
  }
  .status-pulse::after {
    content: ''; position: absolute; inset: -3px; border-radius: 50%;
    border: 1.5px solid var(--status-color, #3b82f6);
    opacity: 0; animation: ping 2s cubic-bezier(0,0,0.2,1) infinite;
  }
  .status-pulse.warning { background: #f59e0b; animation: pulse-amber 1.5s ease-in-out infinite; }
  .status-pulse.warning::after { border-color: #f59e0b; }
  .status-pulse.error   { background: #ef4444; animation: pulse-red 1s ease-in-out infinite; }
  .status-pulse.error::after   { border-color: #ef4444; }
  .status-text { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .chevron { flex-shrink: 0; opacity: 0.4; transition: transform 0.2s, opacity 0.2s; }
  .chevron.rotated { transform: rotate(180deg); }
  .monitor-header:hover .chevron { opacity: 0.7; }
  .video-container { position: relative; width: 100%; aspect-ratio: 4/3; background: #000; overflow: hidden; }
  .feed { width: 100%; height: 100%; object-fit: cover; display: block; transform: scaleX(-1); opacity: 0.9; }
  .video-overlay {
    position: absolute; inset: 0; pointer-events: none;
    display: flex; flex-direction: column; justify-content: space-between; padding: 6px;
  }
  .overlay-badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 8px; border-radius: 6px; font-size: 0.65rem; font-weight: 600;
    backdrop-filter: blur(8px); width: fit-content;
    animation: slide-down 0.2s ease;
  }
  .overlay-badge.warning {
    background: rgba(245,158,11,0.2); color: #fbbf24; border: 1px solid rgba(245,158,11,0.3);
    animation: shake-subtle 0.5s ease, slide-down 0.2s ease;
  }
  .overlay-badge.error   { background: rgba(239,68,68,0.2);  color: #fca5a5; border: 1px solid rgba(239,68,68,0.3); }
  .overlay-badge.info    { background: rgba(59,130,246,0.15); color: #93bbfc; border: 1px solid rgba(59,130,246,0.2); }
  .face-counter {
    align-self: flex-end; display: flex; align-items: center; gap: 4px;
    padding: 2px 8px; border-radius: 100px; font-size: 0.6rem; font-weight: 600;
    background: rgba(0,0,0,0.5); backdrop-filter: blur(8px);
    border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.5); transition: all 0.3s;
  }
  .face-counter.good { background: rgba(34,197,94,0.15); border-color: rgba(34,197,94,0.3); color: #86efac; }
  .face-counter.bad  { background: rgba(239,68,68,0.15);  border-color: rgba(239,68,68,0.3);  color: #fca5a5; animation: shake-subtle 0.4s ease; }
  .fc-dot { width: 5px; height: 5px; border-radius: 50%; background: rgba(255,255,255,0.3); }
  .fc-dot.green { background: #22c55e; box-shadow: 0 0 4px rgba(34,197,94,0.5); }
  .fc-dot.red   { background: #ef4444; box-shadow: 0 0 4px rgba(239,68,68,0.5); }
  .details-panel {
    padding: 10px; border-top: 1px solid rgba(255,255,255,0.06);
    display: flex; flex-direction: column; gap: 8px;
  }
  .detail-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .detail-row.violations { flex-direction: column; align-items: flex-start; gap: 6px; }
  .detail-label { font-size: 0.65rem; color: rgba(255,255,255,0.35); font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }
  .detail-value { font-size: 0.7rem; color: rgba(255,255,255,0.7); font-weight: 600; display: inline-flex; align-items: center; gap: 4px; }
  .detail-value.confirmed { color: #86efac; }
  .detail-value.bad       { color: #fca5a5; }
  .detail-value.muted     { color: rgba(255,255,255,0.35); }
  .detail-pulse { width: 6px; height: 6px; border-radius: 50%; background: #3b82f6; animation: pulse-blue 1.5s ease-in-out infinite; }
  .violation-chips { display: flex; flex-wrap: wrap; gap: 4px; }
  .v-chip { padding: 2px 8px; border-radius: 4px; font-size: 0.6rem; font-weight: 600; }
  .v-chip.green { background: rgba(34,197,94,0.15);  color: #86efac; }
  .v-chip.amber { background: rgba(245,158,11,0.15); color: #fcd34d; }
  .v-chip.red   { background: rgba(239,68,68,0.15);  color: #fca5a5; }
  .permission-banner {
    display: flex; align-items: center; gap: 6px; padding: 8px; border-radius: 6px;
    background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2);
    color: #fca5a5; font-size: 0.65rem; font-weight: 500; line-height: 1.4;
  }
  .status-bar { height: 3px; width: 100%; transition: background 0.3s; }
  @keyframes ping         { 75%,100% { transform: scale(2); opacity: 0; } }
  @keyframes pulse-amber  { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
  @keyframes pulse-red    { 0%,100% { opacity: 1; box-shadow: 0 0 0 0 rgba(239,68,68,0.4); } 50% { opacity: 0.7; box-shadow: 0 0 0 4px rgba(239,68,68,0); } }
  @keyframes pulse-blue   { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
  @keyframes slide-down   { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes shake-subtle { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-2px); } 75% { transform: translateX(2px); } }
</style>