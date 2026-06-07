<!-- // src/lib/components/face/FaceEnrollmentModal.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  interface Props {
    open: boolean;
    onClose: () => void;
    onComplete: () => void;
  }

  let { open, onClose, onComplete }: Props = $props();

  let video: HTMLVideoElement;
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let stream: MediaStream | null = null;
  let raf: number | null = null;

  type Status = 'intro' | 'loading' | 'gesture' | 'processing' | 'done' | 'error';
  let status = $state<Status>('intro');
  let headline = $state('Face Enrollment');
  let subline = $state('Starting camera…');
  let gestureIndex = $state(0);
  let gesturesDone = $state(0);
  let captureCount = 0;
  let descriptors: number[][] = [];
  let gestureDetected = false;
  let holdTimer: number | null = null;
  let holdProgress = $state(0);
  let errorMessage = $state('');

  // Smile detection state
  let smileHistory: boolean[] = [];
  const SMILE_HISTORY_SIZE = 8;
  let smileConfirmed = false;

  // Nose circle detection state
  let nosePositions: { x: number; y: number }[] = [];
  const NOSE_HISTORY_SIZE = 20;
  let circleBaseline: { x: number; y: number } | null = null;

  let faceapi: typeof import('@vladmandic/face-api') | null = null;

  const GESTURES = [
    { id: 'open_mouth', label: 'Open your mouth',  icon: 'mouth' },
    { id: 'turn_left',  label: 'Turn head left',   icon: 'left'  },
    { id: 'turn_right', label: 'Turn head right',  icon: 'right' },
    { id: 'smile',      label: 'Smile!',           icon: 'smile' },
    { id: 'nose_circle', label: 'Trace a circle with your nose', icon: 'circle' },
  ];
  const CAPTURES_PER  = 3;
  const TOTAL         = 3;
  const HOLD_DURATION = 1200;

  let selected: typeof GESTURES = [];

  // ── Smile detection ─────────────────────────────────────────────────────────
  function detectSmile(lm: any): boolean {
    const p = lm.positions;
    // Mouth corners: 48 (left), 54 (right)
    // Mouth top: 51, bottom: 57
    // Lip top: 62, bottom: 66 (inner mouth)
    const mouthLeft = p[48], mouthRight = p[54];
    const mouthTop = p[51], mouthBottom = p[57];
    const lipTop = p[62], lipBottom = p[66];

    if (!mouthLeft || !mouthRight || !mouthTop || !mouthBottom) return false;

    const width = Math.abs(mouthRight.x - mouthLeft.x);
    const height = Math.abs(mouthBottom.y - mouthTop.y);
    const lipHeight = lipTop && lipBottom ? Math.abs(lipBottom.y - lipTop.y) : height;

    if (width <= 0) return false;

    // Smile: mouth is wide and relatively flat
    // Also check that lips are apart (mouth slightly open or teeth showing)
    const aspectRatio = height / width;
    const lipRatio = lipHeight / width;

    // Wide smile: width > 35px (scaled roughly), flat aspect, some lip separation
    const isWide = width > 30;
    const isFlat = aspectRatio < 0.45;
    const hasSeparation = lipRatio > 0.08;

    // Require sustained smile
    const isSmiling = isWide && isFlat && hasSeparation;

    smileHistory.push(isSmiling);
    if (smileHistory.length > SMILE_HISTORY_SIZE) smileHistory.shift();

    // Confirm only if majority of recent frames show smile
    if (smileHistory.length >= 5) {
      const trueCount = smileHistory.filter(Boolean).length;
      const ratio = trueCount / smileHistory.length;
      if (ratio >= 0.6 && !smileConfirmed) {
        smileConfirmed = true;
        return true;
      }
    }

    return false;
  }

  // ── Nose circle detection ─────────────────────────────────────────────────
  function detectNoseCircle(lm: any): boolean {
    const nose = lm.positions[30];
    if (!nose) return false;

    nosePositions.push({ x: nose.x, y: nose.y });
    if (nosePositions.length > NOSE_HISTORY_SIZE) nosePositions.shift();

    if (nosePositions.length < 12) return false;

    // Set baseline from first position
    if (!circleBaseline) {
      circleBaseline = { ...nosePositions[0] };
      return false;
    }

    // Calculate centroid
    let cx = 0, cy = 0;
    for (const pt of nosePositions) {
      cx += pt.x;
      cy += pt.y;
    }
    cx /= nosePositions.length;
    cy /= nosePositions.length;

    // Calculate average radius
    let avgR = 0;
    for (const pt of nosePositions) {
      avgR += Math.sqrt((pt.x - cx) ** 2 + (pt.y - cy) ** 2);
    }
    avgR /= nosePositions.length;

    // Too small or too large = not a circle
    if (avgR < 8 || avgR > 60) {
      circleBaseline = null;
      nosePositions = [];
      return false;
    }

    // Check points are distributed around full circle (not just a line)
    let angleSum = 0;
    let directionChanges = 0;
    let lastAngle = Math.atan2(
      nosePositions[0].y - cy,
      nosePositions[0].x - cx
    );

    for (let i = 1; i < nosePositions.length; i++) {
      const angle = Math.atan2(
        nosePositions[i].y - cy,
        nosePositions[i].x - cx
      );
      let diff = angle - lastAngle;

      // Normalize to [-PI, PI]
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;

      angleSum += Math.abs(diff);
      if (diff * (lastAngle - Math.atan2(nosePositions[i-1]?.y - cy || 0, nosePositions[i-1]?.x - cx || 0)) < 0) {
        directionChanges++;
      }
      lastAngle = angle;
    }

    // Total rotation should be significant (at least ~1.5 radians = ~86 degrees)
    // And should be mostly one direction (not back-and-forth)
    const totalRotation = angleSum;
    const isCircular = totalRotation > 2.5; // ~143 degrees minimum
    const isConsistentDirection = directionChanges <= 3;

    if (isCircular && isConsistentDirection) {
      // Reset for next detection
      circleBaseline = null;
      nosePositions = [];
      return true;
    }

    return false;
  }

  // ── Gesture router ────────────────────────────────────────────────────────
  function checkGesture(id: string, lm: any): boolean {
    const p = lm.positions;
    switch (id) {
      case 'open_mouth': {
        const h  = Math.abs(p[62]?.y - p[66]?.y);
        const fh = Math.abs(p[27]?.y - p[8]?.y);
        return fh > 0 && h / fh > 0.08;
      }
      case 'turn_left': {
        const n = p[30], l = p[36], r = p[45];
        if (!n || !l || !r) return false;
        const w = Math.abs(l.x - r.x);
        return w > 0 && (n.x - l.x) / w < 0.32;
      }
      case 'turn_right': {
        const n = p[30], l = p[36], r = p[45];
        if (!n || !l || !r) return false;
        const w = Math.abs(l.x - r.x);
        return w > 0 && (n.x - l.x) / w > 0.68;
      }
      case 'smile': {
        return detectSmile(lm);
      }
      case 'nose_circle': {
        return detectNoseCircle(lm);
      }
      default: return false;
    }
  }

  // ── Image capture & super compression ─────────────────────────────────────
  async function captureAndCompress(): Promise<string | null> {
    if (!video || !video.videoWidth) return null;

    // Create offscreen canvas at small size
    const captureCanvas = document.createElement('canvas');
    const targetWidth = 160; // tiny for DB storage
    const aspectRatio = video.videoHeight / video.videoWidth;
    const targetHeight = Math.round(targetWidth * aspectRatio);

    captureCanvas.width = targetWidth;
    captureCanvas.height = targetHeight;

    const c = captureCanvas.getContext('2d');
    if (!c) return null;

    // Draw flipped video (mirror correction)
    c.translate(targetWidth, 0);
    c.scale(-1, 1);
    c.drawImage(video, 0, 0, targetWidth, targetHeight);

    // Convert to WebP with aggressive quality reduction
    // Fallback to JPEG if WebP not supported
    let blob: Blob | null = null;
    try {
      blob = await new Promise<Blob | null>((resolve) => {
        captureCanvas.toBlob(
          (b) => resolve(b),
          'image/webp',
          0.15 // 15% quality — very compressed
        );
      });
    } catch {
      blob = null;
    }

    // Fallback to JPEG
    if (!blob || blob.size > 15000) {
      blob = await new Promise<Blob | null>((resolve) => {
        captureCanvas.toBlob(
          (b) => resolve(b),
          'image/jpeg',
          0.2 // 20% quality
        );
      });
    }

    if (!blob) return null;

    // Convert to base64
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob!);
    });
  }

  // ── canvas overlay (vertical oval) ───────────────────────────────────────
  function drawOverlay(hit: boolean, multipleFaces: boolean = false, progress: number = 0) {
    if (!ctx || !canvas) return;
    const w = canvas.width, h = canvas.height;
    const cx = w / 2, cy = h / 2;

    const rx = w * 0.28;
    const ry = h * 0.44;

    ctx.clearRect(0, 0, w, h);

    ctx.save();
    ctx.fillStyle = 'rgba(10,13,15,0.72)';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    if (multipleFaces) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;
    } else if (hit) {
      ctx.strokeStyle = '#00c9a7';
      ctx.lineWidth = 2.5;
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1.5;
    }
    ctx.stroke();

    const bLen = 20, bW = 2.5;
    const positions = [
      { x: cx - rx, y: cy - ry, d: [1,  1] as [number,number] },
      { x: cx + rx, y: cy - ry, d: [-1, 1] as [number,number] },
      { x: cx - rx, y: cy + ry, d: [1, -1] as [number,number] },
      { x: cx + rx, y: cy + ry, d: [-1,-1] as [number,number] },
    ];
    ctx.strokeStyle = multipleFaces ? '#ef4444' : hit ? '#00c9a7' : 'rgba(0,201,167,0.6)';
    ctx.lineWidth   = bW;
    ctx.lineCap     = 'round';
    for (const { x, y, d } of positions) {
      ctx.beginPath();
      ctx.moveTo(x + d[0] * bLen, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y + d[1] * bLen);
      ctx.stroke();
    }

    if (hit && progress > 0 && !multipleFaces) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx + 8, ry + 8, 0, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      ctx.strokeStyle = 'rgba(0,201,167,0.6)';
      ctx.lineWidth   = 3;
      ctx.lineCap     = 'round';
      ctx.stroke();
      ctx.restore();
    }

    if (multipleFaces) {
      ctx.save();
      ctx.fillStyle = '#ef4444';
      ctx.font      = 'bold 14px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('⚠ Multiple faces detected', cx, cy + ry + 28);
      ctx.restore();
    }
  }

  // ── detection loop ────────────────────────────────────────────────────────
  async function loop() {
    if (status !== 'gesture' || !faceapi) return;

    try {
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320 }))
        .withFaceLandmarks(true)
        .withFaceDescriptors();

      const count = detections.length;

      if (count === 0) {
        drawOverlay(false);
        subline = 'Position your face in the oval';
        gestureDetected = false;
        holdProgress = 0;
        if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
        raf = requestAnimationFrame(loop);
        return;
      }

      if (count > 1) {
        drawOverlay(false, true);
        subline = 'Only one person allowed';
        gestureDetected = false;
        holdProgress = 0;
        if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
        raf = requestAnimationFrame(loop);
        return;
      }

      const det = detections[0];
      const g   = selected[gestureIndex];
      const hit = checkGesture(g.id, det.landmarks);

      if (hit && !gestureDetected) {
        if (!holdTimer) {
          holdTimer = window.setTimeout(() => {
            gestureDetected = true;
            descriptors.push(Array.from(det.descriptor));
            captureCount++;
            holdProgress = 0;
            holdTimer    = null;

            if (captureCount >= CAPTURES_PER) {
              gesturesDone = gestureIndex + 1;
              if (gesturesDone >= selected.length) {
                submit(); return;
              }
              gestureIndex++;
              captureCount    = 0;
              gestureDetected = false;
              resetGestureState();
              subline = selected[gestureIndex].label;
            } else {
              subline = `Captured ${captureCount}/${CAPTURES_PER}`;
            }
          }, HOLD_DURATION);
        }
        holdProgress = Math.min(holdProgress + 0.05, 1);
      } else if (!hit) {
        if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
        holdProgress    = 0;
        gestureDetected = false;
      }

      drawOverlay(hit, false, holdProgress);
      raf = requestAnimationFrame(loop);
    } catch {
      raf = requestAnimationFrame(loop);
    }
  }

  // ── submit ───────────────────────────────────────────────────────────────
  async function submit() {
    status   = 'processing';
    headline = 'Processing…';
    subline  = 'Saving your face data…';
    stopCamera();

    // Capture and compress photo
    const photoDataUrl = await captureAndCompress();

    const avg = descriptors[0].map((_, i) =>
      descriptors.reduce((s, d) => s + d[i], 0) / descriptors.length
    );

    try {
      const res = await fetch('/api/face/enroll', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          descriptor: avg,
          photo: photoDataUrl, // base64 data URL or null
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `${res.status}`);
      status   = 'done';
      headline = 'Enrolled!';
      subline  = 'Your face has been saved successfully';
      setTimeout(() => onComplete(), 1800);
    } catch (e: any) {
      status        = 'error';
      headline      = 'Enrollment failed';
      errorMessage  = e.message ?? 'Please try again';
      subline       = errorMessage;
    }
  }

  function stopCamera() {
    if (raf)       cancelAnimationFrame(raf);
    if (holdTimer) clearTimeout(holdTimer);
    stream?.getTracks().forEach(t => t.stop());
    stream = null;
  }

  function resetGestureState() {
    smileHistory = [];
    smileConfirmed = false;
    nosePositions = [];
    circleBaseline = null;
  }

  function resetState() {
    descriptors     = [];
    captureCount    = 0;
    gesturesDone    = 0;
    gestureDetected = false;
    resetGestureState();
    holdProgress    = 0;
    if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
  }

  function startEnrollment() {
    status = 'loading';
    init();
  }

  function retry() {
    resetState();
    status = 'loading';
    init();
  }

  async function init() {
    try {
      if (!faceapi) {
        faceapi = await import('@vladmandic/face-api');
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        ]);
      }

      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      video.srcObject = stream;
      await video.play();
      canvas.width  = video.videoWidth  || 640;
      canvas.height = video.videoHeight || 480;
      ctx = canvas.getContext('2d');

      selected     = [...GESTURES].sort(() => 0.5 - Math.random()).slice(0, TOTAL);
      gestureIndex = 0;
      gesturesDone = 0;
      captureCount = 0;

      status   = 'gesture';
      headline = 'Face Enrollment';
      subline  = selected[0].label;

      raf = requestAnimationFrame(loop);
    } catch (e: any) {
      status       = 'error';
      headline     = 'Camera error';
      errorMessage = e.message?.includes('denied')
        ? 'Allow camera access and retry'
        : 'Failed to load — refresh and try again';
      subline = errorMessage;
    }
  }

  onMount(() => {});
  onDestroy(stopCamera);

  $effect(() => {
    if (open && status === 'intro') {
      startEnrollment();
    }
    if (!open) {
      stopCamera();
      resetState();
      status       = 'intro';
      errorMessage = '';
      gestureIndex = 0;
    }
  });

  const currentGestureLabel = $derived(
    status === 'gesture' && selected[gestureIndex] ? selected[gestureIndex].label : ''
  );
</script>

{#if open}
  <div
    class="modal-backdrop"
    onclick={onClose}
    role="dialog"
    aria-modal="true"
    aria-labelledby="enroll-title"
  >
    <div class="modal" onclick={(e) => e.stopPropagation()}>

      <header class="modal-header">
        <div class="header-left">
          <h2 id="enroll-title">{headline}</h2>
          {#if status === 'gesture'}
            <span class="step-badge">Step {gesturesDone + 1} of {selected.length}</span>
          {/if}
        </div>
        <button class="close-btn" onclick={onClose} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </header>

      <div class="cam-wrap">
        <video bind:this={video} class="feed" autoplay muted playsinline></video>
        <canvas bind:this={canvas} class="overlay"></canvas>

        {#if status === 'loading'}
          <div class="center-state">
            <div class="spinner"></div>
            <p class="state-text">Starting camera…</p>
          </div>
        {/if}

        {#if status === 'processing'}
          <div class="center-state">
            <div class="spinner teal"></div>
            <p class="state-text">Processing face data…</p>
          </div>
        {/if}

        {#if status === 'done'}
          <div class="center-state success-state">
            <div class="success-ring">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00c9a7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <p class="state-text success-text">{headline}</p>
          </div>
        {/if}

        {#if status === 'error'}
          <div class="center-state error-state">
            <div class="error-ring">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9"  y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <p class="state-text error-text">{headline}</p>
          </div>
        {/if}
      </div>

      <div class="bottom">
        {#if status === 'intro'}
          <div class="intro-content">
            <div class="intro-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00c9a7" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2a5 5 0 1 0 0 10A5 5 0 0 0 12 2z"/>
                <path d="M3 20a9 9 0 0 1 18 0"/>
              </svg>
            </div>
            <p class="intro-text">
              We'll verify you're a real person by asking you to perform
              <strong>3 simple gestures</strong> in front of your camera.
            </p>
            <div class="intro-steps">
              <div class="step"><span class="step-num">1</span> Allow camera access</div>
              <div class="step"><span class="step-num">2</span> Follow each gesture</div>
              <div class="step"><span class="step-num">3</span> Hold until captured</div>
            </div>
            <button class="cta" onclick={startEnrollment}>Start Enrollment</button>
          </div>

        {:else if status === 'error'}
          <p class="subline error-sub">{subline}</p>
          <button class="cta" onclick={retry}>Try Again</button>

        {:else if status === 'gesture'}
          <div class="gesture-panel">
            <div class="dots" role="progressbar" aria-valuenow={gesturesDone} aria-valuemax={selected.length}>
              {#each selected as _, i}
                <div class="dot" class:done={i < gesturesDone} class:active={i === gesturesDone}></div>
              {/each}
            </div>
            <div class="gesture-hint">
              <span class="gesture-icon">
                {#if selected[gestureIndex]?.icon === 'mouth'}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <path d="M12 2a5 5 0 1 0 0 10A5 5 0 0 0 12 2z"/>
                    <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                    <path d="M9 18h6"/>
                  </svg>
                {:else if selected[gestureIndex]?.icon === 'left'}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <path d="M12 2a5 5 0 1 0 0 10A5 5 0 0 0 12 2z"/>
                    <path d="M15 14l-3 3-3-3"/>
                  </svg>
                {:else if selected[gestureIndex]?.icon === 'right'}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <path d="M12 2a5 5 0 1 0 0 10A5 5 0 0 0 12 2z"/>
                    <path d="M9 14l3 3 3-3"/>
                  </svg>
                {:else if selected[gestureIndex]?.icon === 'smile'}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <path d="M12 2a5 5 0 1 0 0 10A5 5 0 0 0 12 2z"/>
                    <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                  </svg>
                {:else if selected[gestureIndex]?.icon === 'circle'}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <circle cx="12" cy="12" r="5"/>
                    <path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
                  </svg>
                {/if}
              </span>
              <p class="subline gesture-label" aria-live="polite">{currentGestureLabel}</p>
            </div>
            {#if holdProgress > 0}
              <div class="hold-bar">
                <div class="hold-fill" style="width: {holdProgress * 100}%"></div>
              </div>
            {/if}
          </div>

        {:else if status === 'done'}
          <p class="subline success-sub">{subline}</p>

        {:else}
          <p class="subline">{subline}</p>
        {/if}
      </div>

    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 100;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    animation: fade-in 0.2s ease;
  }

  .modal {
    width: 100%;
    max-width: 420px;
    background: #0f1115;
    border-radius: 1.25rem;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5);
    animation: scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .modal-header h2 {
    font-size: 0.95rem;
    font-weight: 700;
    color: #fff;
    margin: 0;
  }

  .step-badge {
    font-size: 0.65rem;
    font-weight: 700;
    padding: 0.2rem 0.5rem;
    background: rgba(0, 201, 167, 0.15);
    color: #00c9a7;
    border-radius: 999px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .close-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s;
  }

  .close-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  .cam-wrap {
    position: relative;
    width: 100%;
    aspect-ratio: 4/3;
    background: #000;
    overflow: hidden;
  }

  .feed {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transform: scaleX(-1);
  }

  .overlay {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .center-state {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.875rem;
    background: rgba(10, 13, 15, 0.85);
    z-index: 10;
  }

  .success-state { background: rgba(10, 13, 15, 0.9); }
  .error-state   { background: rgba(10, 13, 15, 0.9); }

  .success-ring {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    border: 2px solid rgba(0, 201, 167, 0.3);
    background: rgba(0, 201, 167, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: scale-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .error-ring {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    border: 2px solid rgba(239, 68, 68, 0.3);
    background: rgba(239, 68, 68, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: scale-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .state-text       { font-size: 0.875rem; color: rgba(255, 255, 255, 0.5); margin: 0; }
  .success-text     { color: #00c9a7; font-weight: 600; }
  .error-text       { color: #ef4444; font-weight: 600; }

  .bottom {
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    min-height: 120px;
  }

  .subline {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.4);
    margin: 0;
    text-align: center;
    min-height: 1.3em;
  }

  .subline.error-sub   { color: #ef4444; }
  .subline.success-sub { color: #00c9a7; }
  .gesture-label       { font-size: 0.9rem; font-weight: 600; color: #fff; }

  .cta {
    width: 100%;
    padding: 0.85rem;
    background: linear-gradient(135deg, #15803d, #166534);
    color: #fff;
    border: none;
    border-radius: 0.75rem;
    font-weight: 700;
    font-size: 0.9rem;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
    box-shadow: 0 4px 16px rgba(21, 128, 61, 0.3);
  }

  .cta:hover  { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(21, 128, 61, 0.4); }
  .cta:active { transform: scale(0.98) translateY(0); }

  .intro-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.875rem;
    width: 100%;
    animation: slide-up 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .intro-icon {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: rgba(0, 201, 167, 0.08);
    border: 1px solid rgba(0, 201, 167, 0.25);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .intro-text {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.45);
    margin: 0;
    text-align: center;
    line-height: 1.6;
  }

  .intro-text strong { color: rgba(255, 255, 255, 0.75); font-weight: 600; }

  .intro-steps {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
    margin: 0.25rem 0;
  }

  .step {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    font-size: 0.78rem;
    color: rgba(255, 255, 255, 0.5);
  }

  .step-num {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: rgba(0, 201, 167, 0.15);
    border: 1px solid rgba(0, 201, 167, 0.3);
    color: #00c9a7;
    font-size: 0.65rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .gesture-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.625rem;
    width: 100%;
  }

  .dots {
    display: flex;
    gap: 7px;
    align-items: center;
    margin-bottom: 0.25rem;
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.15);
    transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .dot.active { width: 24px; background: #00c9a7; }
  .dot.done   { background: rgba(0, 201, 167, 0.4); }

  .gesture-hint {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .gesture-icon {
    color: #00c9a7;
    display: flex;
    align-items: center;
  }

  .hold-bar {
    width: 100%;
    max-width: 200px;
    height: 3px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 999px;
    overflow: hidden;
    margin-top: 0.25rem;
  }

  .hold-fill {
    height: 100%;
    background: linear-gradient(90deg, #00c9a7, #00e5b9);
    border-radius: 999px;
    transition: width 0.1s linear;
  }

  .spinner {
    width: 36px;
    height: 36px;
    border: 2.5px solid rgba(255, 255, 255, 0.08);
    border-top-color: rgba(255, 255, 255, 0.4);
    border-radius: 50%;
    animation: spin 0.75s linear infinite;
  }

  .spinner.teal { border-top-color: #00c9a7; }

  @keyframes spin     { to { transform: rotate(360deg); } }
  @keyframes fade-in  { from { opacity: 0; } to { opacity: 1; } }
  @keyframes scale-in {
    from { opacity: 0; transform: scale(0.9); }
    to   { opacity: 1; transform: scale(1);   }
  }
  @keyframes slide-up {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0);    }
  }

  @media (max-width: 480px) {
    .modal-backdrop { padding: 0.5rem; }
    .modal          { max-width: 100%; border-radius: 1rem; }
    .bottom         { padding: 1rem; }
  }
</style>