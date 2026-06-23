<!-- src/routes/verify/+page.svelte -->
<script lang="ts">
  import { Shield, Search, QrCode, Hash, AlertCircle, Loader, CheckCircle, X } from '@lucide/svelte';
  import { fly, fade } from 'svelte/transition';
  import { goto } from '$app/navigation';

  // ── State ─────────────────────────────────────────────────────────────────
  type Tab = 'matric' | 'qr';
  let activeTab    = $state<Tab>('matric');
  let matricInput  = $state('');
  let examInput    = $state('');   // optional exam/course code to narrow search
  let loading      = $state(false);
  let errorMsg     = $state<string | null>(null);

  // QR scanner state
  let videoEl      = $state<HTMLVideoElement | null>(null);
  let scanning     = $state(false);
  let scanError    = $state<string | null>(null);
  let stream: MediaStream | null = null;

  // ── Matric / ID search ─────────────────────────────────────────────────────
  async function search() {
    const q = matricInput.trim();
    if (!q) { errorMsg = 'Enter a matric number or result ID.'; return; }
    errorMsg = null;
    loading  = true;

    try {
      const params = new URLSearchParams({ q });
      if (examInput.trim()) params.set('exam', examInput.trim());

      const res  = await fetch(`/api/verify/lookup?${params}`);
      const data = await res.json();

      if (!res.ok || !data.resultId) {
        errorMsg = data.error ?? 'No result found for that matric number.';
        return;
      }
      goto(`/s/verify/${data.resultId}`);
    } catch {
      errorMsg = 'Network error — please try again.';
    } finally {
      loading = false;
    }
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Enter') search();
  }

  // ── QR scanning ───────────────────────────────────────────────────────────
  async function startScan() {
    scanError = null;
    scanning  = true;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });

      if (videoEl) {
        videoEl.srcObject = stream;
        await videoEl.play();
        scheduleFrame();
      }
    } catch (e: any) {
      scanError = e.name === 'NotAllowedError'
        ? 'Camera access denied — please allow camera access and try again.'
        : 'Camera unavailable on this device.';
      scanning = false;
    }
  }

  function stopScan() {
    scanning = false;
    stream?.getTracks().forEach(t => t.stop());
    stream = null;
    if (videoEl) videoEl.srcObject = null;
  }

  function scheduleFrame() {
    if (!scanning) return;
    requestAnimationFrame(async () => {
      if (!scanning || !videoEl || videoEl.readyState < 2) {
        scheduleFrame();
        return;
      }
      try {
        // @ts-ignore — BarcodeDetector is available in modern Chromium browsers
        if ('BarcodeDetector' in window) {
          // @ts-ignore
          const detector = new BarcodeDetector({ formats: ['qr_code'] });
          const codes = await detector.detect(videoEl);
          if (codes.length > 0) {
            const raw = codes[0].rawValue as string;
            handleScannedValue(raw);
            return;
          }
        }
      } catch { /* BarcodeDetector unavailable, keep looping */ }
      scheduleFrame();
    });
  }

  function handleScannedValue(raw: string) {
    stopScan();
    // If the QR contains a full verify URL, extract the resultId and navigate
    try {
      const url = new URL(raw);
      if (url.pathname.startsWith('/s/verify/')) {
        const resultId = url.pathname.split('/s/verify/')[1];
        if (resultId) { goto(`/s/verify/${resultId}`); return; }
      }
    } catch { /* not a URL — treat as matric number */ }

    // Otherwise treat as matric / result ID and run a lookup
    matricInput = raw;
    activeTab   = 'matric';
    search();
  }

  function switchTab(tab: Tab) {
    if (tab === activeTab) return;
    if (scanning) stopScan();
    errorMsg  = null;
    scanError = null;
    activeTab = tab;
  }

  $effect(() => {
    return () => { if (scanning) stopScan(); };
  });
</script>

<svelte:head><title>Verify Result — MOUAU eTest</title></svelte:head>

<div class="verify-page">
  <div class="verify-card">

    <!-- Header -->
    <div class="card-header">
      <div class="shield-icon">
        <Shield size={28} />
      </div>
      <div>
        <h1>Result Verification</h1>
        <p>Michael Okpara University of Agriculture, Umudike</p>
      </div>
    </div>

    <!-- Tab switcher -->
    <div class="tabs">
      <button
        class="tab"
        class:active={activeTab === 'matric'}
        onclick={() => switchTab('matric')}
        type="button"
      >
        <Hash size={14} /> Enter Matric / ID
      </button>
      <button
        class="tab"
        class:active={activeTab === 'qr'}
        onclick={() => switchTab('qr')}
        type="button"
      >
        <QrCode size={14} /> Scan QR Code
      </button>
    </div>

    <!-- ── Tab: Matric / ID search ────────────────────────────────────── -->
    {#if activeTab === 'matric'}
      <div class="tab-body" transition:fade={{ duration: 140 }}>
        <p class="tab-hint">
          Enter the student's matric number or paste a result ID to verify their exam record.
        </p>

        <div class="field">
          <label for="matric-input">Matric Number or Result ID</label>
          <div class="input-row">
            <input
              id="matric-input"
              type="text"
              placeholder="e.g. 2021/194507/EC or result UUID"
              bind:value={matricInput}
              onkeydown={onKey}
              autocomplete="off"
              spellcheck="false"
              disabled={loading}
            />
          </div>
        </div>

        <div class="field">
          <label for="exam-input">
            Course / Exam Filter
            <span class="opt">Optional — narrows results if student sat multiple exams</span>
          </label>
          <input
            id="exam-input"
            type="text"
            placeholder="e.g. CSC301 or Introduction to Computing"
            bind:value={examInput}
            onkeydown={onKey}
            disabled={loading}
          />
        </div>

        {#if errorMsg}
          <div class="error-msg" transition:fly={{ y: -4, duration: 140 }}>
            <AlertCircle size={14} /> {errorMsg}
          </div>
        {/if}

        <button class="search-btn" onclick={search} disabled={loading || !matricInput.trim()} type="button">
          {#if loading}
            <Loader size={16} class="spin" /> Searching…
          {:else}
            <Search size={16} /> Verify Result
          {/if}
        </button>
      </div>

    <!-- ── Tab: QR Scanner ────────────────────────────────────────────── -->
    {:else}
      <div class="tab-body" transition:fade={{ duration: 140 }}>
        <p class="tab-hint">
          Point your camera at the QR code on the student's result slip to verify instantly.
        </p>

        <div class="qr-viewport">
          {#if scanning}
            <!-- svelte-ignore a11y_media_has_caption -->
            <video bind:this={videoEl} class="qr-video" playsinline></video>
            <div class="qr-overlay">
              <div class="qr-frame"></div>
            </div>
            <button class="stop-btn" onclick={stopScan} type="button">
              <X size={14} /> Stop camera
            </button>
          {:else}
            <div class="qr-placeholder">
              <QrCode size={48} strokeWidth={1.2} />
              <p>Camera is off</p>
            </div>
          {/if}
        </div>

        {#if scanError}
          <div class="error-msg" transition:fly={{ y: -4, duration: 140 }}>
            <AlertCircle size={14} /> {scanError}
          </div>
        {/if}

        {#if !scanning}
          <button class="search-btn" onclick={startScan} type="button">
            <QrCode size={16} /> Start Camera
          </button>
        {/if}

        <p class="qr-note">
          QR scanning uses your device's camera and works best in Chrome or Edge.
          On unsupported browsers, use the matric number tab instead.
        </p>
      </div>
    {/if}

    <!-- Footer -->
    <div class="card-footer">
      <Shield size={11} />
      Records are generated by MOUAU eTest and are <strong>not official transcripts</strong> endorsed by the university.
    </div>
  </div>
</div>

<style>
  .verify-page {
    min-height: 100vh;
    display: flex; align-items: center; justify-content: center;
    background: var(--color-bg, #f1f5f9);
    padding: 2rem 1rem;
  }

  .verify-card {
    width: 100%; max-width: 480px;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 1.25rem;
    overflow: hidden;
    box-shadow: 0 8px 40px rgba(0,0,0,.1);
  }

  /* ── Header ──────────────────────────────────────────────────────────── */
  .card-header {
    display: flex; align-items: center; gap: 1rem;
    padding: 1.5rem 1.75rem;
    border-bottom: 1px solid #e5e7eb;
    background: linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%);
  }

  .shield-icon {
    width: 52px; height: 52px; flex-shrink: 0;
    border-radius: 50%;
    background: #10b981;
    color: white;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 12px rgba(16,185,129,.3);
  }

  .card-header h1 {
    font-size: 1.15rem; font-weight: 900; color: #111827; margin: 0 0 .2rem;
    letter-spacing: -.02em;
  }
  .card-header p {
    font-size: .75rem; color: #6b7280; margin: 0; line-height: 1.4;
  }

  /* ── Tabs ────────────────────────────────────────────────────────────── */
  .tabs {
    display: flex;
    border-bottom: 1px solid #e5e7eb;
  }

  .tab {
    flex: 1; display: flex; align-items: center; justify-content: center; gap: .4rem;
    padding: .875rem 1rem;
    border: none; background: none; cursor: pointer;
    font-size: .8rem; font-weight: 600; color: #6b7280;
    font-family: inherit;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    transition: all .15s;
  }
  .tab:hover { color: #111827; background: #f9fafb; }
  .tab.active { color: #10b981; border-bottom-color: #10b981; background: white; }

  /* ── Tab body ────────────────────────────────────────────────────────── */
  .tab-body {
    padding: 1.5rem 1.75rem;
    display: flex; flex-direction: column; gap: 1rem;
  }

  .tab-hint {
    font-size: .8rem; color: #6b7280; margin: 0; line-height: 1.55;
  }

  /* ── Fields ──────────────────────────────────────────────────────────── */
  .field { display: flex; flex-direction: column; gap: .35rem; }

  .field label {
    font-size: .78rem; font-weight: 700; color: #374151;
    display: flex; align-items: center; gap: .4rem; flex-wrap: wrap;
  }
  .opt {
    font-size: .68rem; font-weight: 500; color: #9ca3af;
  }

  .field input {
    padding: .7rem 1rem;
    border: 1.5px solid #e5e7eb;
    border-radius: .625rem;
    background: #f9fafb;
    color: #111827;
    font-size: .9rem;
    font-family: inherit;
    outline: none;
    transition: border-color .15s, box-shadow .15s;
    width: 100%; box-sizing: border-box;
  }
  .field input:focus { border-color: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,.12); background: white; }
  .field input:disabled { opacity: .5; cursor: not-allowed; }

  .input-row { display: flex; gap: .5rem; }
  .input-row input { flex: 1; }

  /* ── Error ───────────────────────────────────────────────────────────── */
  .error-msg {
    display: flex; align-items: center; gap: .5rem;
    padding: .625rem .875rem;
    background: rgba(239,68,68,.06);
    border: 1px solid rgba(239,68,68,.2);
    border-radius: .5rem;
    font-size: .8rem; color: #dc2626; font-weight: 600;
  }

  /* ── Search button ───────────────────────────────────────────────────── */
  .search-btn {
    display: flex; align-items: center; justify-content: center; gap: .5rem;
    width: 100%; padding: .8rem 1rem;
    background: #10b981; border: none; border-radius: .75rem;
    color: white; font-size: .9rem; font-weight: 700;
    cursor: pointer; font-family: inherit;
    transition: background .15s, transform .1s;
  }
  .search-btn:hover:not(:disabled) { background: #059669; }
  .search-btn:active:not(:disabled) { transform: scale(.98); }
  .search-btn:disabled { opacity: .5; cursor: not-allowed; }

  :global(.spin) { animation: spin .8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── QR Viewport ─────────────────────────────────────────────────────── */
  .qr-viewport {
    position: relative;
    width: 100%; aspect-ratio: 1;
    border-radius: .875rem;
    overflow: hidden;
    background: #111827;
    border: 1.5px solid #e5e7eb;
  }

  .qr-video {
    width: 100%; height: 100%; object-fit: cover;
    display: block;
  }

  .qr-overlay {
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    pointer-events: none;
  }

  .qr-frame {
    width: 55%; aspect-ratio: 1;
    border: 3px solid #10b981;
    border-radius: .75rem;
    box-shadow: 0 0 0 2000px rgba(0,0,0,.45);
    animation: frame-pulse 2s ease-in-out infinite;
  }

  @keyframes frame-pulse {
    0%, 100% { border-color: #10b981; box-shadow: 0 0 0 2000px rgba(0,0,0,.45), 0 0 0 0 rgba(16,185,129,.4); }
    50%       { border-color: #34d399; box-shadow: 0 0 0 2000px rgba(0,0,0,.45), 0 0 12px 4px rgba(16,185,129,.3); }
  }

  .qr-placeholder {
    width: 100%; height: 100%;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: .75rem; color: #4b5563;
  }
  .qr-placeholder p { font-size: .8rem; color: #6b7280; margin: 0; }

  .stop-btn {
    position: absolute; bottom: .875rem; left: 50%; transform: translateX(-50%);
    display: inline-flex; align-items: center; gap: .35rem;
    padding: .45rem 1rem;
    background: rgba(0,0,0,.65); color: white;
    border: 1px solid rgba(255,255,255,.2); border-radius: 999px;
    font-size: .75rem; font-weight: 700; cursor: pointer; font-family: inherit;
    backdrop-filter: blur(4px);
    transition: background .15s;
  }
  .stop-btn:hover { background: rgba(0,0,0,.8); }

  .qr-note {
    font-size: .7rem; color: #9ca3af; text-align: center;
    line-height: 1.55; margin: 0;
  }

  /* ── Footer ──────────────────────────────────────────────────────────── */
  .card-footer {
    display: flex; align-items: flex-start; gap: .4rem;
    padding: .875rem 1.75rem;
    background: #fffbeb;
    border-top: 1px solid #fde68a;
    font-size: .7rem; color: #92400e;
    line-height: 1.55;
  }
  .card-footer strong { font-weight: 700; }
</style>