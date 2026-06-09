<!-- src/lib/components/face/FaceEnrollmentModal.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';

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
  let loadingProgress = $state(0);

  // Human detection state
  let human: any = null;
  let isModelLoading = false;
  let modelLoadingPromise: Promise<any> | null = null;

  // Smile detection state
  let smileHistory: boolean[] = [];
  const SMILE_HISTORY_SIZE = 8;
  let smileConfirmed = false;

  // Nose circle detection state
  let nosePositions: { x: number; y: number }[] = [];
  const NOSE_HISTORY_SIZE = 30;
  let circleProgress = $state(0);

  const GESTURES = [
    { id: 'open_mouth', label: 'Open your mouth', icon: 'mouth' },
    { id: 'turn_left', label: 'Turn head left', icon: 'left' },
    { id: 'turn_right', label: 'Turn head right', icon: 'right' },
    { id: 'smile', label: 'Smile!', icon: 'smile' },
    { id: 'nose_circle', label: 'Trace a circle with your nose', icon: 'circle' },
  ];
  const CAPTURES_PER = 3;
  const TOTAL = 3;
  const HOLD_DURATION = 1200;

  let selected: typeof GESTURES = [];

  // ── Pre-load models in background ──────────────────────────────────────────
  if (browser && !modelLoadingPromise) {
    modelLoadingPromise = (async () => {
      console.log('🚀 Pre-loading Human models in background for enrolment...');
      const HumanModule = await import('@vladmandic/human');
      const humanInstance = new HumanModule.default({
        backend: 'webgl',
        modelBasePath: '/models/human',
        hand: { enabled: false },
        body: { enabled: false },
        object: { enabled: false },
        gesture: { enabled: true },
        segmentation: { enabled: false },
        face: {
          enabled: true,
          detector: { maxDetected: 1, return: true },
          description: { enabled: true },
          emotion: { enabled: true },
          landmarks: { enabled: true },
          mesh: { enabled: false },
          iris: { enabled: true },
          antispoof: { enabled: true },
          liveness: { enabled: true }
        }
      });
      await humanInstance.load();
      await humanInstance.warmup();
      console.log('✅ Models pre-loaded and warmed up');
      return humanInstance;
    })();
  }

  // ── Face detection with Human ─────────────────────────────────────────────
  async function detectFace() {
    if (!human || !video || video.paused || !video.videoWidth) return null;
    
    try {
      const result = await human.detect(video);
      if (!result || !result.face || result.face.length === 0) return null;
      return result;
    } catch (error) {
      console.error('Detection error:', error);
      return null;
    }
  }

  // ── Smile detection using Human's emotion detection ──────────────────────
  function detectSmile(face: any): boolean {
    if (face.expressions) {
      const smileScore = face.expressions.happy || 0;
      const isSmiling = smileScore > 0.6;
      
      smileHistory.push(isSmiling);
      if (smileHistory.length > SMILE_HISTORY_SIZE) smileHistory.shift();
      
      if (smileHistory.length >= 5) {
        const trueCount = smileHistory.filter(Boolean).length;
        const ratio = trueCount / smileHistory.length;
        
        if (ratio >= 0.6 && !smileConfirmed) {
          smileConfirmed = true;
          return true;
        }
      }
    }
    return false;
  }

  // ── Nose circle detection using face landmarks ───────────────────────────
  function detectNoseCircle(face: any): boolean {
    if (!face.landmarks || !face.landmarks.length) return false;
    
    const nose = face.landmarks[0];
    if (!nose) return false;
    
    nosePositions.push({ x: nose.x, y: nose.y });
    if (nosePositions.length > NOSE_HISTORY_SIZE) nosePositions.shift();
    
    if (nosePositions.length < 20) return false;
    
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    for (const pos of nosePositions) {
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x);
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y);
    }
    
    const width = maxX - minX;
    const height = maxY - minY;
    const movementRange = Math.max(width, height);
    
    if (movementRange < 40) return false;
    
    const aspectRatio = Math.min(width, height) / Math.max(width, height);
    const isCircularMotion = aspectRatio > 0.7;
    
    let directionChanges = 0;
    let lastVector = { x: 0, y: 0 };
    
    for (let i = 2; i < nosePositions.length; i++) {
      const vector = {
        x: nosePositions[i].x - nosePositions[i-1].x,
        y: nosePositions[i].y - nosePositions[i-1].y
      };
      
      if (lastVector.x !== 0 || lastVector.y !== 0) {
        const dot = lastVector.x * vector.x + lastVector.y * vector.y;
        const mag1 = Math.sqrt(lastVector.x * lastVector.x + lastVector.y * lastVector.y);
        const mag2 = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
        
        if (mag1 > 0 && mag2 > 0) {
          const cosAngle = dot / (mag1 * mag2);
          if (cosAngle < 0.7) {
            directionChanges++;
          }
        }
      }
      
      lastVector = vector;
    }
    
    const completedCircle = isCircularMotion && directionChanges >= 6;
    
    if (!completedCircle && isCircularMotion) {
      circleProgress = Math.min(circleProgress + 0.02, 0.95);
    } else if (!completedCircle) {
      circleProgress = Math.max(circleProgress - 0.01, 0);
    }
    
    if (completedCircle) {
      circleProgress = 0;
      nosePositions = [];
      return true;
    }
    
    return false;
  }

  // ── Open mouth detection using landmarks ─────────────────────────────────
  function detectOpenMouth(face: any): boolean {
    if (face.landmarks && face.landmarks.length >= 8) {
      const mouthTop = face.landmarks[3];
      const mouthBottom = face.landmarks[5];
      
      if (mouthTop && mouthBottom) {
        const mouthOpening = Math.abs(mouthBottom.y - mouthTop.y);
        const faceHeight = face.box.height;
        
        return mouthOpening / faceHeight > 0.08;
      }
    }
    return false;
  }

  // ── Head turn detection using face angle ─────────────────────────────────
  function detectHeadTurn(face: any, direction: 'left' | 'right'): boolean {
    if (face.angle) {
      const yaw = face.angle.yaw || 0;
      
      if (direction === 'left') {
        return yaw < -20;
      } else {
        return yaw > 20;
      }
    }
    return false;
  }

  // ── Get face descriptor (embedding) from Human ───────────────────────────
  function getFaceDescriptor(face: any): number[] | null {
    if (face.embedding && Array.isArray(face.embedding)) {
      return face.embedding;
    }
    return null;
  }

  // ── Gesture router ────────────────────────────────────────────────────────
  function checkGesture(id: string, face: any): boolean {
    switch (id) {
      case 'open_mouth':
        return detectOpenMouth(face);
      case 'turn_left':
        return detectHeadTurn(face, 'left');
      case 'turn_right':
        return detectHeadTurn(face, 'right');
      case 'smile':
        return detectSmile(face);
      case 'nose_circle':
        return detectNoseCircle(face);
      default:
        return false;
    }
  }

  // ── Image capture & compression ──────────────────────────────────────────
  async function captureAndCompress(): Promise<string | null> {
    if (!video || !video.videoWidth) return null;

    const captureCanvas = document.createElement('canvas');
    const targetWidth = 160;
    const aspectRatio = video.videoHeight / video.videoWidth;
    const targetHeight = Math.round(targetWidth * aspectRatio);

    captureCanvas.width = targetWidth;
    captureCanvas.height = targetHeight;

    const c = captureCanvas.getContext('2d');
    if (!c) return null;

    c.translate(targetWidth, 0);
    c.scale(-1, 1);
    c.drawImage(video, 0, 0, targetWidth, targetHeight);

    let blob: Blob | null = null;
    try {
      blob = await new Promise<Blob | null>((resolve) => {
        captureCanvas.toBlob(
          (b) => resolve(b),
          'image/webp',
          0.15
        );
      });
    } catch {
      blob = null;
    }

    if (!blob || blob.size > 15000) {
      blob = await new Promise<Blob | null>((resolve) => {
        captureCanvas.toBlob(
          (b) => resolve(b),
          'image/jpeg',
          0.2
        );
      });
    }

    if (!blob) return null;

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
      { x: cx - rx, y: cy - ry, d: [1, 1] as [number, number] },
      { x: cx + rx, y: cy - ry, d: [-1, 1] as [number, number] },
      { x: cx - rx, y: cy + ry, d: [1, -1] as [number, number] },
      { x: cx + rx, y: cy + ry, d: [-1, -1] as [number, number] },
    ];
    ctx.strokeStyle = multipleFaces ? '#ef4444' : hit ? '#00c9a7' : 'rgba(0,201,167,0.6)';
    ctx.lineWidth = bW;
    ctx.lineCap = 'round';
    for (const { x, y, d } of positions) {
      ctx.beginPath();
      ctx.moveTo(x + d[0] * bLen, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y + d[1] * bLen);
      ctx.stroke();
    }

    if (hit && progress > 0 && !multipleFaces && selected[gestureIndex]?.id !== 'nose_circle') {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx + 8, ry + 8, 0, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      ctx.strokeStyle = 'rgba(0,201,167,0.6)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();
    }

    if (selected[gestureIndex]?.id === 'nose_circle' && circleProgress > 0 && !multipleFaces) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx + 12, ry + 12, 0, -Math.PI / 2, -Math.PI / 2 + circleProgress * Math.PI * 2);
      ctx.strokeStyle = 'rgba(0,201,167,0.8)';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.stroke();
      
      ctx.font = 'bold 12px system-ui';
      ctx.fillStyle = '#00c9a7';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(circleProgress * 100)}%`, cx, cy + ry + 20);
      ctx.restore();
    }

    if (multipleFaces) {
      ctx.save();
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 14px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('⚠ Multiple faces detected', cx, cy + ry + 28);
      ctx.restore();
    }
  }

  // ── detection loop ────────────────────────────────────────────────────────
  let lastDetectionTime = 0;
  const DETECTION_INTERVAL = 100; // ms between detections for performance

  async function loop() {
    if (status !== 'gesture' || !human || !video) return;

    const now = Date.now();
    if (now - lastDetectionTime < DETECTION_INTERVAL) {
      raf = requestAnimationFrame(loop);
      return;
    }
    lastDetectionTime = now;

    try {
      const result = await detectFace();
      
      if (!result || !result.face || result.face.length === 0) {
        drawOverlay(false);
        subline = 'Position your face in the oval';
        gestureDetected = false;
        holdProgress = 0;
        if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
        raf = requestAnimationFrame(loop);
        return;
      }

      const faceCount = result.face.length;
      
      if (faceCount > 1) {
        drawOverlay(false, true);
        subline = 'Only one person allowed';
        gestureDetected = false;
        holdProgress = 0;
        if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
        raf = requestAnimationFrame(loop);
        return;
      }

      const face = result.face[0];
      const g = selected[gestureIndex];
      const hit = checkGesture(g.id, face);
      const descriptor = getFaceDescriptor(face);

      if (g.id === 'nose_circle') {
        if (hit && !gestureDetected && descriptor) {
          gestureDetected = true;
          descriptors.push(descriptor);
          captureCount++;
          
          if (captureCount >= CAPTURES_PER) {
            gesturesDone = gestureIndex + 1;
            if (gesturesDone >= selected.length) {
              submit(); 
              return;
            }
            gestureIndex++;
            captureCount = 0;
            gestureDetected = false;
            subline = selected[gestureIndex].label;
            circleProgress = 0;
          } else {
            subline = `Captured ${captureCount}/${CAPTURES_PER}`;
            setTimeout(() => {
              gestureDetected = false;
            }, 500);
          }
        }
        drawOverlay(hit, false, holdProgress);
        raf = requestAnimationFrame(loop);
        return;
      }

      if (hit && !gestureDetected && descriptor) {
        if (!holdTimer) {
          holdTimer = window.setTimeout(() => {
            gestureDetected = true;
            descriptors.push(descriptor);
            captureCount++;
            holdProgress = 0;
            holdTimer = null;

            if (captureCount >= CAPTURES_PER) {
              gesturesDone = gestureIndex + 1;
              if (gesturesDone >= selected.length) {
                submit(); 
                return;
              }
              gestureIndex++;
              captureCount = 0;
              gestureDetected = false;
              resetGestureState();
              subline = selected[gestureIndex].label;
            } else {
              subline = `Captured ${captureCount}/${CAPTURES_PER}`;
              gestureDetected = false;
            }
          }, HOLD_DURATION);
        }
        holdProgress = Math.min(holdProgress + 0.05, 1);
      } else if (!hit) {
        if (holdTimer) { 
          clearTimeout(holdTimer); 
          holdTimer = null; 
        }
        holdProgress = 0;
        gestureDetected = false;
      }

      drawOverlay(hit, false, holdProgress);
      raf = requestAnimationFrame(loop);
    } catch (error) {
      console.error('Detection error:', error);
      raf = requestAnimationFrame(loop);
    }
  }

  // ── submit enrollment ─────────────────────────────────────────────────────
  async function submit() {
    status = 'processing';
    headline = 'Processing…';
    subline = 'Saving your face data…';
    stopCamera();

    const photoDataUrl = await captureAndCompress();

    const avgDescriptor = descriptors[0].map((_, i) =>
      descriptors.reduce((sum, desc) => sum + desc[i], 0) / descriptors.length
    );

    console.log('Submitting enrollment with descriptor length:', avgDescriptor.length);

    try {
      const res = await fetch('/api/face/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descriptor: avgDescriptor,
          embedding_dimension: avgDescriptor.length,
          photo: photoDataUrl,
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error ?? `${res.status}`);
      
      status = 'done';
      headline = 'Enrolled!';
      subline = `Face saved successfully (${avgDescriptor.length}-dim embedding)`;
      setTimeout(() => onComplete(), 1800);
    } catch (e: any) {
      console.error('Enrollment error:', e);
      status = 'error';
      headline = 'Enrollment failed';
      errorMessage = e.message ?? 'Please try again';
      subline = errorMessage;
    }
  }

  function stopCamera() {
    if (raf) cancelAnimationFrame(raf);
    if (holdTimer) clearTimeout(holdTimer);
    stream?.getTracks().forEach(t => t.stop());
    stream = null;
  }

  function resetGestureState() {
    smileHistory = [];
    smileConfirmed = false;
    nosePositions = [];
    circleProgress = 0;
  }

  function resetState() {
    descriptors = [];
    captureCount = 0;
    gesturesDone = 0;
    gestureDetected = false;
    resetGestureState();
    holdProgress = 0;
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
    if (!browser) return;
    
    try {
      // Show loading progress
      const progressInterval = setInterval(() => {
        if (loadingProgress < 90) {
          loadingProgress += 5;
          subline = `Loading models: ${Math.round(loadingProgress)}%`;
        }
      }, 200);
      
      // Get pre-loaded human instance or wait for it
      if (modelLoadingPromise && !human) {
        console.log('📦 Using pre-loaded models...');
        human = await modelLoadingPromise;
        console.log('✅ Models ready instantly!');
      } else if (!human && !isModelLoading) {
        isModelLoading = true;
        console.log('Loading models (first time)...');
        
        const HumanModule = await import('@vladmandic/human');
        human = new HumanModule.default({
          backend: 'webgl',
          modelBasePath: '/models/human',
          hand: { enabled: false },
          body: { enabled: false },
          object: { enabled: false },
          gesture: { enabled: false },
          segmentation: { enabled: false },
          face: {
            enabled: true,
            detector: { maxDetected: 1, return: true },
            description: { enabled: true },
            emotion: { enabled: true },
            landmarks: { enabled: true },
            mesh: { enabled: false },
            iris: { enabled: false },
            antispoof: { enabled: false },
            liveness: { enabled: false }
          }
        });
        
        await human.load();
        await human.warmup();
        console.log('Models loaded and warmed up');
        isModelLoading = false;
      }
      
      clearInterval(progressInterval);
      loadingProgress = 100;

      console.log('🎥 Starting camera...');
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      video.srcObject = stream;
      
      // Use 'loadeddata' event for faster startup
      await new Promise<void>((resolve) => {
        const onLoaded = () => {
          if (video.videoWidth && video.videoHeight) {
            video.removeEventListener('loadeddata', onLoaded);
            resolve();
          }
        };
        video.addEventListener('loadeddata', onLoaded);
        if (video.readyState >= 2) {
          onLoaded();
        }
      });
      
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      ctx = canvas.getContext('2d');

      selected = [...GESTURES].sort(() => 0.5 - Math.random()).slice(0, TOTAL);
      gestureIndex = 0;
      gesturesDone = 0;
      captureCount = 0;

      status = 'gesture';
      headline = 'Face Enrollment';
      subline = selected[0].label;

      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
    } catch (e: any) {
      console.error('Initialization error:', e);
      status = 'error';
      headline = 'Camera error';
      errorMessage = e.message?.includes('denied')
        ? 'Allow camera access and retry'
        : e.message?.includes('not found')
        ? 'No camera found'
        : 'Failed to load — refresh and try again';
      subline = errorMessage;
    }
  }

  onMount(() => {
    return () => {
      stopCamera();
    };
  });
  
  onDestroy(stopCamera);

  $effect(() => {
    if (open && status === 'intro') {
      startEnrollment();
    }
    if (!open) {
      stopCamera();
      resetState();
      status = 'intro';
      errorMessage = '';
      gestureIndex = 0;
      loadingProgress = 0;
    }
  });

  const currentGestureLabel = $derived(
    status === 'gesture' && selected[gestureIndex] ? selected[gestureIndex].label : ''
  );
</script>

<!-- Template remains the same as your original -->
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
            {#if loadingProgress > 0 && loadingProgress < 100}
              <div class="progress-bar">
                <div class="progress-fill" style="width: {loadingProgress}%"></div>
              </div>
              <p class="state-text">{Math.round(loadingProgress)}%</p>
            {/if}
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
                <line x1="9" y1="9" x2="15" y2="15"/>
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
            {#if holdProgress > 0 || circleProgress > 0}
              <div class="hold-bar">
                <div class="hold-fill" style="width: {selected[gestureIndex]?.id === 'nose_circle' ? circleProgress * 100 : holdProgress * 100}%"></div>
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
  .error-state { background: rgba(10, 13, 15, 0.9); }

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

  .state-text { font-size: 0.875rem; color: rgba(255, 255, 255, 0.5); margin: 0; }
  .success-text { color: #00c9a7; font-weight: 600; }
  .error-text { color: #ef4444; font-weight: 600; }

  .progress-bar {
    width: 200px;
    height: 4px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #00c9a7, #00e5b9);
    border-radius: 2px;
    transition: width 0.3s ease;
  }

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

  .subline.error-sub { color: #ef4444; }
  .subline.success-sub { color: #00c9a7; }
  .gesture-label { font-size: 0.9rem; font-weight: 600; color: #fff; }

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

  .cta:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(21, 128, 61, 0.4); }
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
  .dot.done { background: rgba(0, 201, 167, 0.4); }

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

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
  @keyframes scale-in {
    from { opacity: 0; transform: scale(0.9); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes slide-up {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @media (max-width: 480px) {
    .modal-backdrop { padding: 0.5rem; }
    .modal { max-width: 100%; border-radius: 1rem; }
    .bottom { padding: 1rem; }
  }
</style>