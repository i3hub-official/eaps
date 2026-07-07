<script lang="ts">
  // src/routes/student/verify/+page.svelte
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let video: HTMLVideoElement;
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let stream: MediaStream | null = null;
  let raf: number | null = null;
  let scanRaf: number | null = null;

  type Status = 'loading' | 'liveness' | 'matching' | 'success' | 'error';
  let status        = $state<Status>('loading');
  let headline      = $state('Identity check');
  let subline       = $state('Starting camera…');
  let livenessDone  = $state(0);
  let livenessTotal = $state(2);
  let retryCount    = $state(0);
  let matchScore    = $state(0);

  // These were referenced in drawOverlay() in the original file but never
  // declared anywhere — a ReferenceError waiting to happen. Declared here.
  let securityPass  = $state(false);
  let multipleFaces = $state(false);

  let gestureDetected = false;
  let livenessIndex = 0;
  let lastPitch: number | null = null;
  let scanY = $state(0);
  let scanDir = 1;

  // ── Human instance ──────────────────────────────────────────────────────
  // ASSUMPTION: model files live at /models/human — Human needs its own
  // model set (blazeface/facemesh/faceres/antispoof/liveness), which is a
  // different set of files than face-api.js's tiny models. Confirm these
  // are actually hosted there; Human won't fall back silently, it'll fail
  // to load.
  let human: import('@vladmandic/human').Human | null = null;
  let HumanCtor: typeof import('@vladmandic/human').default | null = null;

  const GESTURES = [
    { id: 'open_mouth',  label: 'Open your mouth' },
    { id: 'turn_left',   label: 'Turn head left'  },
    { id: 'turn_right',  label: 'Turn head right' },
    { id: 'nod',         label: 'Nod your head'   },
  ];
  let selected: typeof GESTURES = [];

  // Human's similarity() returns 0..1, HIGHER is better (opposite of the old
  // face-api distance metric). This threshold is a starting point — tune it
  // against real enrollment/verification data before relying on it.
  const SIMILARITY_THRESHOLD = 0.62;
  const ANTISPOOF_THRESHOLD  = 0.5;
  const LIVENESS_THRESHOLD   = 0.5;

  // ── gesture parsing off Human's built-in semantic gesture classifier ────
  // Human emits result.gesture as [{ face: 0, gesture: 'facing left' }, ...].
  // This replaces all the hand-rolled EAR/mouth-ratio math from the
  // face-api.js version — Human's classifier is maintained upstream instead
  // of reimplemented here.
  function gestureStrings(result: any): string[] {
    return (result.gesture ?? [])
      .filter((g: any) => g.face === 0)
      .map((g: any) => g.gesture as string);
  }

  function mouthOpenPercent(strings: string[]): number {
    for (const g of strings) {
      const m = /mouth (\d+)% open/.exec(g);
      if (m) return parseInt(m[1], 10);
    }
    return 0;
  }

  function checkGesture(id: string, result: any): boolean {
    const strings = gestureStrings(result);
    const face = result.face?.[0];

    switch (id) {
      case 'open_mouth':
        return mouthOpenPercent(strings) > 35;

      case 'turn_left':
        return strings.includes('facing left');

      case 'turn_right':
        return strings.includes('facing right');

      case 'nod': {
        // Human's static gesture set doesn't include motion gestures like
        // "nod" — using raw pitch delta from face.rotation.angle instead.
        const pitch = face?.rotation?.angle?.pitch;
        if (typeof pitch !== 'number') return false;
        if (lastPitch === null) { lastPitch = pitch; return false; }
        const delta = Math.abs(pitch - lastPitch);
        lastPitch = pitch;
        return delta > 0.15; // radians — tune against real footage
      }

      default:
        return false;
    }
  }

  // ── scan line ───────────────────────────────────────────────────────────
  function animateScan() {
    scanY += scanDir * 0.007;
    if (scanY >= 1) { scanY = 1; scanDir = -1; }
    if (scanY <= 0) { scanY = 0; scanDir =  1; }
    scanRaf = requestAnimationFrame(animateScan);
  }

  // ── canvas overlay ──────────────────────────────────────────────────────
  function drawOverlay(hit: boolean, phase: 'liveness' | 'matching') {
    if (!ctx || !canvas) return;
    const w = canvas.width, h = canvas.height;
    const cx = w/2, cy = h/2, rx = w*0.34, ry = h*0.42;

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.fillStyle = 'rgba(10,13,15,0.72)';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI*2);
    const accentColor = phase === 'matching' ? '#00c9a7'
                      : hit                  ? '#f59e0b'
                      :                        'rgba(255,255,255,0.15)';
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = hit || phase === 'matching' ? 2.5 : 1.5;
    ctx.stroke();

    const bLen = 22;
    const corners = [
      { x: cx-rx, y: cy-ry, d: [1,1]  },
      { x: cx+rx, y: cy-ry, d: [-1,1]  },
      { x: cx-rx, y: cy+ry, d: [1,-1]  },
      { x: cx+rx, y: cy+ry, d: [-1,-1] },
    ];
    ctx.strokeStyle = phase === 'matching' ? '#00c9a7' : hit ? '#f59e0b' : 'rgba(0,201,167,0.55)';
    ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (const { x, y, d } of corners) {
      ctx.beginPath(); ctx.moveTo(x+d[0]*bLen, y); ctx.lineTo(x, y); ctx.lineTo(x, y+d[1]*bLen); ctx.stroke();
    }

    ctx.save();
    ctx.beginPath(); ctx.ellipse(cx, cy, rx-1, ry-1, 0, 0, Math.PI*2); ctx.clip();
    const sy = cy - ry + scanY * ry * 2;
    const scanColor = phase === 'matching' ? 'rgba(0,201,167,' : 'rgba(245,158,11,';
    const grad = ctx.createLinearGradient(0, sy-12, 0, sy+12);
    grad.addColorStop(0,   `${scanColor}0)`);
    grad.addColorStop(0.5, `${scanColor}0.5)`);
    grad.addColorStop(1,   `${scanColor}0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(cx-rx, sy-12, rx*2, 24);
    ctx.restore();

    if (!securityPass && !multipleFaces) {
      ctx.save();
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 10px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('🔒 Security Check Failed', cx, cy - ry - 10);
      ctx.restore();
    } else if (securityPass && hit) {
      ctx.save();
      ctx.fillStyle = '#00c9a7';
      ctx.font = 'bold 10px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('✓ Live Person Verified', cx, cy - ry - 10);
      ctx.restore();
    }
  }

  // ── liveness loop ───────────────────────────────────────────────────────
  async function livenessLoop() {
    if (status !== 'liveness' || !human) return;

    try {
      const result = await human.detect(video);

      multipleFaces = result.face.length > 1;

      if (result.face.length === 0) {
        drawOverlay(false, 'liveness');
        subline = 'Position your face in the oval';
        gestureDetected = false;
        raf = requestAnimationFrame(livenessLoop);
        return;
      }

      if (multipleFaces) {
        drawOverlay(false, 'liveness');
        subline = 'Only one face should be visible';
        raf = requestAnimationFrame(livenessLoop);
        return;
      }

      const face = result.face[0];
      // Human's antispoof/liveness modules — this is the built-in
      // replacement for the manual gesture-only anti-spoofing the
      // face-api.js version relied on.
      securityPass =
        (face.real ?? 1) > ANTISPOOF_THRESHOLD &&
        (face.live ?? 1) > LIVENESS_THRESHOLD;

      const g = selected[livenessIndex];
      const hit = checkGesture(g.id, result);
      drawOverlay(hit, 'liveness');

      if (hit && !gestureDetected) {
        gestureDetected = true;
        livenessDone = livenessIndex + 1;

        if (livenessIndex + 1 >= selected.length) {
          matchFace();
          return;
        }
        livenessIndex++;
        gestureDetected = false;
        lastPitch = null;
        subline = selected[livenessIndex].label;
      } else if (!hit) {
        gestureDetected = false;
      }

      raf = requestAnimationFrame(livenessLoop);
    } catch {
      raf = requestAnimationFrame(livenessLoop);
    }
  }

  // ── face match ──────────────────────────────────────────────────────────
  async function matchFace() {
    status   = 'matching';
    headline = 'Verifying identity';
    subline  = 'Comparing with enrolled face…';

    try {
      const result = await human!.detect(video);
      const face = result.face?.[0];
      if (!face) throw new Error('No face detected — hold still');
      if (result.face.length > 1) throw new Error('Only one face should be visible');

      const embedding = face.embedding;
      if (!embedding) throw new Error('Could not read face features — try again');

      // Re-check antispoof/liveness at match time, not just during the
      // gesture phase — a photo held up after gestures pass shouldn't sneak
      // through.
      securityPass = (face.real ?? 1) > ANTISPOOF_THRESHOLD && (face.live ?? 1) > LIVENESS_THRESHOLD;
      if (!securityPass) throw new Error('Liveness check failed — please try again with your real face');

      drawOverlay(true, 'matching');

      const res = await fetch('/api/face/descriptor');
      if (!res.ok) throw new Error('No enrolled face found — please enroll first');
      const { descriptor: stored } = await res.json();

      // ASSUMPTION: /api/face/descriptor and the enrollment flow (FaceEnroll.svelte,
      // face/crypto.ts, /api/student/face-enroll) are also updated to store
      // Human's embedding format. I haven't seen those files — if enrollment
      // still writes face-api.js's 128-length descriptor, this comparison
      // will be comparing incompatible vector spaces and will always fail
      // or always "match" incorrectly. Send me those files to confirm/fix.
      const similarity = human!.similarity(embedding, stored);
      const isMatch = similarity > SIMILARITY_THRESHOLD;

      matchScore = Math.round(similarity * 100);

      if (isMatch) {
        await fetch('/api/face/verify-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            verified: true,
            similarityScore: matchScore,
            examId: data.exam?.id,
          }),
        });
        status   = 'success';
        headline = 'Identity Verified';
        subline  = `${matchScore}% match — you're good to go`;
        stopCamera();
        setTimeout(() => {
          const examId  = data.exam?.id;
          const returnTo = data.returnTo;

          if (returnTo) {
            goto(returnTo);
          } else if (data.exam?.hasExistingSession && data.exam?.sessionId) {
            goto(`/student/exams/${data.exam.sessionId}`);
          } else if (examId) {
            goto(`/student/exams/${examId}`);
          } else {
            goto('/student');
          }
        }, 1800);
      } else {
        retryCount++;
        status   = 'error';
        headline = 'Not recognised';
        subline  = `${matchScore}% match — need at least ${Math.round(SIMILARITY_THRESHOLD * 100)}%`;
        stopCamera();
      }
    } catch (e: any) {
      retryCount++;
      status   = 'error';
      headline = 'Verification failed';
      subline  = e.message ?? 'Please try again';
      stopCamera();
    }
  }

  // ── lifecycle ───────────────────────────────────────────────────────────
  function stopCamera() {
    if (raf) cancelAnimationFrame(raf);
    if (scanRaf) cancelAnimationFrame(scanRaf);
    stream?.getTracks().forEach(t => t.stop());
    stream = null;
  }

  function retry() {
    livenessDone = 0;
    livenessIndex = 0;
    gestureDetected = false;
    lastPitch = null;
    status = 'loading';
    init();
  }

  async function init() {
    try {
      if (!human) {
        if (!HumanCtor) {
          const mod = await import('@vladmandic/human');
          HumanCtor = mod.default;
        }
        human = new HumanCtor({
          modelBasePath: '/models/human',
          face: {
            enabled: true,
            detector: { rotation: true, maxDetected: 5 },
            mesh: { enabled: true },
            iris: { enabled: false },
            description: { enabled: true }, // produces face.embedding
            emotion: { enabled: false },
            antispoof: { enabled: true },   // produces face.real
            liveness: { enabled: true },    // produces face.live
          },
          body: { enabled: false },
          hand: { enabled: false },
          object: { enabled: false },
          segmentation: { enabled: false },
          gesture: { enabled: true },
        });
        await human.load();
        await human.warmup();
      }

      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      video.srcObject = stream;
      await video.play();
      canvas.width  = video.videoWidth  || 640;
      canvas.height = video.videoHeight || 480;
      ctx = canvas.getContext('2d');

      selected = [...GESTURES].sort(() => 0.5 - Math.random()).slice(0, 2);
      livenessTotal = selected.length;
      livenessIndex = 0;
      livenessDone = 0;
      gestureDetected = false;
      lastPitch = null;

      status   = 'liveness';
      headline = 'Liveness check';
      subline  = selected[0].label;

      animateScan();
      raf = requestAnimationFrame(livenessLoop);
    } catch (e: any) {
      status   = 'error';
      headline = 'Camera error';
      subline  = e.message?.includes('denied') ? 'Allow camera access and retry' : 'Failed to start — refresh and try again';
    }
  }

  onMount(init);
  onDestroy(stopCamera);

  let currentLabel = $derived(
    status === 'liveness' && selected[livenessIndex] ? selected[livenessIndex].label : ''
  );
</script><script lang="ts">
  // src/routes/student/verify/+page.svelte
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let video: HTMLVideoElement;
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let stream: MediaStream | null = null;
  let raf: number | null = null;
  let scanRaf: number | null = null;

  type Status = 'loading' | 'liveness' | 'matching' | 'success' | 'error';
  let status        = $state<Status>('loading');
  let headline      = $state('Identity check');
  let subline       = $state('Starting camera…');
  let livenessDone  = $state(0);
  let livenessTotal = $state(2);
  let retryCount    = $state(0);
  let matchScore    = $state(0);

  // These were referenced in drawOverlay() in the original file but never
  // declared anywhere — a ReferenceError waiting to happen. Declared here.
  let securityPass  = $state(false);
  let multipleFaces = $state(false);

  let gestureDetected = false;
  let livenessIndex = 0;
  let lastPitch: number | null = null;
  let scanY = $state(0);
  let scanDir = 1;

  // ── Human instance ──────────────────────────────────────────────────────
  // ASSUMPTION: model files live at /models/human — Human needs its own
  // model set (blazeface/facemesh/faceres/antispoof/liveness), which is a
  // different set of files than face-api.js's tiny models. Confirm these
  // are actually hosted there; Human won't fall back silently, it'll fail
  // to load.
  let human: import('@vladmandic/human').Human | null = null;
  let HumanCtor: typeof import('@vladmandic/human').default | null = null;

  const GESTURES = [
    { id: 'open_mouth',  label: 'Open your mouth' },
    { id: 'turn_left',   label: 'Turn head left'  },
    { id: 'turn_right',  label: 'Turn head right' },
    { id: 'nod',         label: 'Nod your head'   },
  ];
  let selected: typeof GESTURES = [];

  // Human's similarity() returns 0..1, HIGHER is better (opposite of the old
  // face-api distance metric). This threshold is a starting point — tune it
  // against real enrollment/verification data before relying on it.
  const SIMILARITY_THRESHOLD = 0.62;
  const ANTISPOOF_THRESHOLD  = 0.5;
  const LIVENESS_THRESHOLD   = 0.5;

  // ── gesture parsing off Human's built-in semantic gesture classifier ────
  // Human emits result.gesture as [{ face: 0, gesture: 'facing left' }, ...].
  // This replaces all the hand-rolled EAR/mouth-ratio math from the
  // face-api.js version — Human's classifier is maintained upstream instead
  // of reimplemented here.
  function gestureStrings(result: any): string[] {
    return (result.gesture ?? [])
      .filter((g: any) => g.face === 0)
      .map((g: any) => g.gesture as string);
  }

  function mouthOpenPercent(strings: string[]): number {
    for (const g of strings) {
      const m = /mouth (\d+)% open/.exec(g);
      if (m) return parseInt(m[1], 10);
    }
    return 0;
  }

  function checkGesture(id: string, result: any): boolean {
    const strings = gestureStrings(result);
    const face = result.face?.[0];

    switch (id) {
      case 'open_mouth':
        return mouthOpenPercent(strings) > 35;

      case 'turn_left':
        return strings.includes('facing left');

      case 'turn_right':
        return strings.includes('facing right');

      case 'nod': {
        // Human's static gesture set doesn't include motion gestures like
        // "nod" — using raw pitch delta from face.rotation.angle instead.
        const pitch = face?.rotation?.angle?.pitch;
        if (typeof pitch !== 'number') return false;
        if (lastPitch === null) { lastPitch = pitch; return false; }
        const delta = Math.abs(pitch - lastPitch);
        lastPitch = pitch;
        return delta > 0.15; // radians — tune against real footage
      }

      default:
        return false;
    }
  }

  // ── scan line ───────────────────────────────────────────────────────────
  function animateScan() {
    scanY += scanDir * 0.007;
    if (scanY >= 1) { scanY = 1; scanDir = -1; }
    if (scanY <= 0) { scanY = 0; scanDir =  1; }
    scanRaf = requestAnimationFrame(animateScan);
  }

  // ── canvas overlay ──────────────────────────────────────────────────────
  function drawOverlay(hit: boolean, phase: 'liveness' | 'matching') {
    if (!ctx || !canvas) return;
    const w = canvas.width, h = canvas.height;
    const cx = w/2, cy = h/2, rx = w*0.34, ry = h*0.42;

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.fillStyle = 'rgba(10,13,15,0.72)';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI*2);
    const accentColor = phase === 'matching' ? '#00c9a7'
                      : hit                  ? '#f59e0b'
                      :                        'rgba(255,255,255,0.15)';
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = hit || phase === 'matching' ? 2.5 : 1.5;
    ctx.stroke();

    const bLen = 22;
    const corners = [
      { x: cx-rx, y: cy-ry, d: [1,1]  },
      { x: cx+rx, y: cy-ry, d: [-1,1]  },
      { x: cx-rx, y: cy+ry, d: [1,-1]  },
      { x: cx+rx, y: cy+ry, d: [-1,-1] },
    ];
    ctx.strokeStyle = phase === 'matching' ? '#00c9a7' : hit ? '#f59e0b' : 'rgba(0,201,167,0.55)';
    ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (const { x, y, d } of corners) {
      ctx.beginPath(); ctx.moveTo(x+d[0]*bLen, y); ctx.lineTo(x, y); ctx.lineTo(x, y+d[1]*bLen); ctx.stroke();
    }

    ctx.save();
    ctx.beginPath(); ctx.ellipse(cx, cy, rx-1, ry-1, 0, 0, Math.PI*2); ctx.clip();
    const sy = cy - ry + scanY * ry * 2;
    const scanColor = phase === 'matching' ? 'rgba(0,201,167,' : 'rgba(245,158,11,';
    const grad = ctx.createLinearGradient(0, sy-12, 0, sy+12);
    grad.addColorStop(0,   `${scanColor}0)`);
    grad.addColorStop(0.5, `${scanColor}0.5)`);
    grad.addColorStop(1,   `${scanColor}0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(cx-rx, sy-12, rx*2, 24);
    ctx.restore();

    if (!securityPass && !multipleFaces) {
      ctx.save();
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 10px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('🔒 Security Check Failed', cx, cy - ry - 10);
      ctx.restore();
    } else if (securityPass && hit) {
      ctx.save();
      ctx.fillStyle = '#00c9a7';
      ctx.font = 'bold 10px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('✓ Live Person Verified', cx, cy - ry - 10);
      ctx.restore();
    }
  }

  // ── liveness loop ───────────────────────────────────────────────────────
  async function livenessLoop() {
    if (status !== 'liveness' || !human) return;

    try {
      const result = await human.detect(video);

      multipleFaces = result.face.length > 1;

      if (result.face.length === 0) {
        drawOverlay(false, 'liveness');
        subline = 'Position your face in the oval';
        gestureDetected = false;
        raf = requestAnimationFrame(livenessLoop);
        return;
      }

      if (multipleFaces) {
        drawOverlay(false, 'liveness');
        subline = 'Only one face should be visible';
        raf = requestAnimationFrame(livenessLoop);
        return;
      }

      const face = result.face[0];
      // Human's antispoof/liveness modules — this is the built-in
      // replacement for the manual gesture-only anti-spoofing the
      // face-api.js version relied on.
      securityPass =
        (face.real ?? 1) > ANTISPOOF_THRESHOLD &&
        (face.live ?? 1) > LIVENESS_THRESHOLD;

      const g = selected[livenessIndex];
      const hit = checkGesture(g.id, result);
      drawOverlay(hit, 'liveness');

      if (hit && !gestureDetected) {
        gestureDetected = true;
        livenessDone = livenessIndex + 1;

        if (livenessIndex + 1 >= selected.length) {
          matchFace();
          return;
        }
        livenessIndex++;
        gestureDetected = false;
        lastPitch = null;
        subline = selected[livenessIndex].label;
      } else if (!hit) {
        gestureDetected = false;
      }

      raf = requestAnimationFrame(livenessLoop);
    } catch {
      raf = requestAnimationFrame(livenessLoop);
    }
  }

  // ── face match ──────────────────────────────────────────────────────────
  async function matchFace() {
    status   = 'matching';
    headline = 'Verifying identity';
    subline  = 'Comparing with enrolled face…';

    try {
      const result = await human!.detect(video);
      const face = result.face?.[0];
      if (!face) throw new Error('No face detected — hold still');
      if (result.face.length > 1) throw new Error('Only one face should be visible');

      const embedding = face.embedding;
      if (!embedding) throw new Error('Could not read face features — try again');

      // Re-check antispoof/liveness at match time, not just during the
      // gesture phase — a photo held up after gestures pass shouldn't sneak
      // through.
      securityPass = (face.real ?? 1) > ANTISPOOF_THRESHOLD && (face.live ?? 1) > LIVENESS_THRESHOLD;
      if (!securityPass) throw new Error('Liveness check failed — please try again with your real face');

      drawOverlay(true, 'matching');

      const res = await fetch('/api/face/descriptor');
      if (!res.ok) throw new Error('No enrolled face found — please enroll first');
      const { descriptor: stored } = await res.json();

      // ASSUMPTION: /api/face/descriptor and the enrollment flow (FaceEnroll.svelte,
      // face/crypto.ts, /api/student/face-enroll) are also updated to store
      // Human's embedding format. I haven't seen those files — if enrollment
      // still writes face-api.js's 128-length descriptor, this comparison
      // will be comparing incompatible vector spaces and will always fail
      // or always "match" incorrectly. Send me those files to confirm/fix.
      const similarity = human!.similarity(embedding, stored);
      const isMatch = similarity > SIMILARITY_THRESHOLD;

      matchScore = Math.round(similarity * 100);

      if (isMatch) {
        await fetch('/api/face/verify-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            verified: true,
            similarityScore: matchScore,
            examId: data.exam?.id,
          }),
        });
        status   = 'success';
        headline = 'Identity Verified';
        subline  = `${matchScore}% match — you're good to go`;
        stopCamera();
        setTimeout(() => {
          const examId  = data.exam?.id;
          const returnTo = data.returnTo;

          if (returnTo) {
            goto(returnTo);
          } else if (data.exam?.hasExistingSession && data.exam?.sessionId) {
            goto(`/student/exams/${data.exam.sessionId}`);
          } else if (examId) {
            goto(`/student/exams/${examId}`);
          } else {
            goto('/student');
          }
        }, 1800);
      } else {
        retryCount++;
        status   = 'error';
        headline = 'Not recognised';
        subline  = `${matchScore}% match — need at least ${Math.round(SIMILARITY_THRESHOLD * 100)}%`;
        stopCamera();
      }
    } catch (e: any) {
      retryCount++;
      status   = 'error';
      headline = 'Verification failed';
      subline  = e.message ?? 'Please try again';
      stopCamera();
    }
  }

  // ── lifecycle ───────────────────────────────────────────────────────────
  function stopCamera() {
    if (raf) cancelAnimationFrame(raf);
    if (scanRaf) cancelAnimationFrame(scanRaf);
    stream?.getTracks().forEach(t => t.stop());
    stream = null;
  }

  function retry() {
    livenessDone = 0;
    livenessIndex = 0;
    gestureDetected = false;
    lastPitch = null;
    status = 'loading';
    init();
  }

  async function init() {
    try {
      if (!human) {
        if (!HumanCtor) {
          const mod = await import('@vladmandic/human');
          HumanCtor = mod.default;
        }
        human = new HumanCtor({
          modelBasePath: '/models/human',
          face: {
            enabled: true,
            detector: { rotation: true, maxDetected: 5 },
            mesh: { enabled: true },
            iris: { enabled: false },
            description: { enabled: true }, // produces face.embedding
            emotion: { enabled: false },
            antispoof: { enabled: true },   // produces face.real
            liveness: { enabled: true },    // produces face.live
          },
          body: { enabled: false },
          hand: { enabled: false },
          object: { enabled: false },
          segmentation: { enabled: false },
          gesture: { enabled: true },
        });
        await human.load();
        await human.warmup();
      }

      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      video.srcObject = stream;
      await video.play();
      canvas.width  = video.videoWidth  || 640;
      canvas.height = video.videoHeight || 480;
      ctx = canvas.getContext('2d');

      selected = [...GESTURES].sort(() => 0.5 - Math.random()).slice(0, 2);
      livenessTotal = selected.length;
      livenessIndex = 0;
      livenessDone = 0;
      gestureDetected = false;
      lastPitch = null;

      status   = 'liveness';
      headline = 'Liveness check';
      subline  = selected[0].label;

      animateScan();
      raf = requestAnimationFrame(livenessLoop);
    } catch (e: any) {
      status   = 'error';
      headline = 'Camera error';
      subline  = e.message?.includes('denied') ? 'Allow camera access and retry' : 'Failed to start — refresh and try again';
    }
  }

  onMount(init);
  onDestroy(stopCamera);

  let currentLabel = $derived(
    status === 'liveness' && selected[livenessIndex] ? selected[livenessIndex].label : ''
  );
</script>

<svelte:head>
  <title>Identity Verification — MOUAU eTest</title>
</svelte:head>

<div class="page">

  <!-- ── Top bar ──────────────────────────────────────────────────────────── -->
  <header class="topbar">
    <a href={data.returnTo || '/student'} class="back-btn" aria-label="Go back">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2.2"
           stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 12H5M12 5l-7 7 7 7"/>
      </svg>
    </a>
    <span class="top-label">Face Verification</span>
    <div style="width:36px"></div>
  </header>

  <!-- ── Camera area ──────────────────────────────────────────────────────── -->
  <div class="cam-wrap">
    <video
      bind:this={videoEl}
      class="feed"
      class:hidden={phase === 'loading' || phase === 'success' || phase === 'failed'}
      autoplay muted playsinline
    ></video>

    <canvas
      bind:this={canvasEl}
      class="overlay"
      class:hidden={phase === 'loading' || phase === 'success' || phase === 'failed'}
    ></canvas>

    <!-- Oval guide + scan line (drawn on top of human's canvas) -->
    {#if phase === 'ready' || phase === 'scanning' || phase === 'matching'}
      <svg class="oval-svg" viewBox="0 0 640 480" preserveAspectRatio="xMidYMid meet">
        <defs>
          <mask id="oval-mask">
            <rect width="640" height="480" fill="white"/>
            <ellipse cx="320" cy="240" rx="210" ry="200" fill="black"/>
          </mask>
          <!-- Scan line gradient -->
          <linearGradient id="scan-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stop-color={phase === 'matching' ? '#00c9a7' : '#f59e0b'} stop-opacity="0"/>
            <stop offset="50%"  stop-color={phase === 'matching' ? '#00c9a7' : '#f59e0b'} stop-opacity="0.55"/>
            <stop offset="100%" stop-color={phase === 'matching' ? '#00c9a7' : '#f59e0b'} stop-opacity="0"/>
          </linearGradient>
          <clipPath id="oval-clip">
            <ellipse cx="320" cy="240" rx="208" ry="198"/>
          </clipPath>
        </defs>

        <!-- Dark overlay with oval cutout -->
        <rect width="640" height="480" fill="rgba(10,13,15,0.65)" mask="url(#oval-mask)"/>

        <!-- Oval border -->
        <ellipse cx="320" cy="240" rx="210" ry="200"
          fill="none"
          stroke={phase === 'matching' ? '#00c9a7' : securityPass ? '#f59e0b' : 'rgba(255,255,255,0.2)'}
          stroke-width={securityPass || phase === 'matching' ? '2.5' : '1.5'}
        />

        <!-- Corner brackets -->
        {#each [[-1,-1],[1,-1],[-1,1],[1,1]] as [dx, dy]}
          {@const bx = 320 + dx * 210}
          {@const by = 240 + dy * 200}
          <path
            d="M {bx + dx * -22} {by} L {bx} {by} L {bx} {by + dy * -22}"
            fill="none"
            stroke={phase === 'matching' ? '#00c9a7' : securityPass ? '#f59e0b' : 'rgba(0,201,167,0.5)'}
            stroke-width="2.5" stroke-linecap="round"
          />
        {/each}

        <!-- Animated scan line (clipped to oval) -->
        {@const sy = (240 - 200) + scanY * 400}
        <rect
          x="110" y={sy - 14} width="420" height="28"
          fill="url(#scan-grad)"
          clip-path="url(#oval-clip)"
        />
      </svg>
    {/if}

    <!-- Loading state -->
    {#if phase === 'loading'}
      <div class="center-state">
        <div class="spinner"></div>
        <p class="state-text">Loading face detection…</p>
      </div>
    {/if}

    <!-- Success state -->
    {#if phase === 'success'}
      <div class="center-state success">
        <div class="result-ring teal">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
               stroke="#00c9a7" stroke-width="2.5"
               stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <p class="state-text" style="color:#00c9a7">Identity Verified</p>
        <p class="state-sub">
          {data.exam?.hasExistingSession ? 'Resuming your exam…' : 'Proceeding to exam…'}
        </p>
      </div>
    {/if}

    <!-- Failed state -->
    {#if phase === 'failed' && retryCount < MAX_RETRIES}
      <div class="center-state error">
        <div class="result-ring red">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
               stroke="#ef4444" stroke-width="2.5"
               stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </div>
        <p class="state-text" style="color:#ef4444">{headline}</p>
        <p class="state-sub">{subline}</p>
      </div>
    {/if}
  </div>

  <!-- ── Bottom panel ──────────────────────────────────────────────────────── -->
  <div class="bottom">

    {#if phase === 'loading'}
      <div class="bottom-text">
        <p class="headline">{headline}</p>
        <p class="subline">{subline}</p>
      </div>

    {:else if phase === 'ready' || phase === 'scanning'}
      <div class="score-bars">
        <div class="score-row">
          <span class="score-lbl">Liveness</span>
          <div class="score-track">
            <div
              class="score-fill"
              class:pass={livenessScore >= LIVENESS_THRESHOLD}
              style="width:{Math.min(livenessScore * 100, 100)}%"
            ></div>
          </div>
          <span class="score-val">{Math.round(livenessScore * 100)}%</span>
        </div>
        <div class="score-row">
          <span class="score-lbl">Antispoof</span>
          <div class="score-track">
            <div
              class="score-fill"
              class:pass={antispoofScore >= ANTISPOOF_THRESHOLD}
              style="width:{Math.min(antispoofScore * 100, 100)}%"
            ></div>
          </div>
          <span class="score-val">{Math.round(antispoofScore * 100)}%</span>
        </div>
      </div>
      <div class="bottom-text">
        <p class="headline">{headline}</p>
        <p class="subline" aria-live="polite">{subline}</p>
      </div>

    {:else if phase === 'matching'}
      <div class="bottom-text">
        <p class="headline">Verifying identity…</p>
        <p class="subline">Please keep still</p>
      </div>

    {:else if phase === 'success'}
      <div class="bottom-text">
        <p class="headline" style="color:#00c9a7">{headline}</p>
        <p class="subline">{subline}</p>
      </div>

    {:else if phase === 'failed'}
      <div class="score-bars">
        <div class="score-row">
          <span class="score-lbl">Match</span>
          <div class="score-track">
            <div
              class="score-fill"
              class:pass={matchScore >= SIMILARITY_THRESHOLD * 100}
              style="width:{matchScore}%"
            ></div>
          </div>
          <span class="score-val">{matchScore}%</span>
        </div>
      </div>
      <div class="bottom-text">
        <p class="headline err">{headline}</p>
        <p class="subline">{subline}</p>
      </div>

      {#if retryCount < MAX_RETRIES}
        <button class="cta" onclick={retry}>
          Try again ({MAX_RETRIES - retryCount} left)
        </button>
      {:else}
        <p class="subline" style="color:#ef4444;text-align:center">
          Too many failed attempts. Please contact your invigilator.
        </p>
      {/if}

      <a href="/student" class="skip">Cancel</a>
    {/if}

  </div>
</div>

<style>
  :global(html), :global(body) { margin: 0; background: #0a0d0f; }

  .page {
    position: fixed; inset: 0;
    background: #0a0d0f;
    display: flex;
    flex-direction: column;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: #fff;
    overflow: hidden;
  }

  /* ── Top bar ─────────────────────────────────────────────────────────── */
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem 0.5rem;
    z-index: 20;
    background: linear-gradient(to bottom, #0a0d0f 60%, transparent);
    flex-shrink: 0;
  }

  .back-btn {
    width: 36px; height: 36px;
    border-radius: 50%;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.08);
    display: flex; align-items: center; justify-content: center;
    color: #fff; text-decoration: none;
    transition: background 0.15s;
    flex-shrink: 0;
  }
  .back-btn:hover { background: rgba(255,255,255,0.14); }

  .top-label {
    font-size: 0.85rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    color: rgba(255,255,255,0.55);
    text-transform: uppercase;
  }

  /* ── Camera area ─────────────────────────────────────────────────────── */
  .cam-wrap {
    flex: 1;
    position: relative;
    overflow: hidden;
    min-height: 0;
  }

  .feed {
    position: absolute; inset: 0;
    width: 100%; height: 100%;
    object-fit: cover;
    transform: scaleX(-1); /* mirror */
  }

  .overlay {
    position: absolute; inset: 0;
    width: 100%; height: 100%;
    pointer-events: none;
    transform: scaleX(-1);
  }

  .hidden { display: none; }

  /* SVG overlay for oval + scan line */
  .oval-svg {
    position: absolute; inset: 0;
    width: 100%; height: 100%;
    pointer-events: none;
  }

  /* Centre states (loading, success, failed) */
  .center-state {
    position: absolute; inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.875rem;
    background: rgba(10,13,15,0.85);
    z-index: 10;
  }

  .center-state.success { background: rgba(0,30,20,0.9); }
  .center-state.error   { background: rgba(30,0,0,0.9); }

  .result-ring {
    width: 68px; height: 68px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    animation: pop-in 0.35s cubic-bezier(0.34,1.56,0.64,1);
  }
  .result-ring.teal { background: rgba(0,201,167,0.12); border: 2px solid rgba(0,201,167,0.35); }
  .result-ring.red  { background: rgba(239,68,68,0.12); border: 2px solid rgba(239,68,68,0.35); }

  .state-text { font-size: 1rem; font-weight: 600; margin: 0; }
  .state-sub  { font-size: 0.8rem; color: rgba(255,255,255,0.45); margin: 0; text-align: center; }

  /* ── Bottom panel ────────────────────────────────────────────────────── */
  .bottom {
    position: relative;
    z-index: 20;
    padding: 1.25rem 1.75rem 2.5rem;
    background: linear-gradient(to top, #0a0d0f 80%, transparent);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.875rem;
    min-height: 190px;
    flex-shrink: 0;
  }

  /* Score bars */
  .score-bars {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
    max-width: 340px;
  }

  .score-row {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    font-size: 0.75rem;
  }

  .score-lbl {
    width: 62px;
    color: rgba(255,255,255,0.45);
    font-weight: 500;
    flex-shrink: 0;
  }

  .score-track {
    flex: 1;
    height: 5px;
    background: rgba(255,255,255,0.08);
    border-radius: 999px;
    overflow: hidden;
  }

  .score-fill {
    height: 100%;
    background: #ef4444;
    border-radius: 999px;
    transition: width 0.4s ease, background 0.4s ease;
  }

  .score-fill.pass { background: #00c9a7; }

  .score-val {
    width: 36px;
    text-align: right;
    color: rgba(255,255,255,0.45);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  /* Text */
  .bottom-text { text-align: center; }
  .headline {
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0 0 0.3rem;
    letter-spacing: -0.01em;
  }
  .headline.err { color: #ef4444; }
  .subline {
    font-size: 0.875rem;
    color: rgba(255,255,255,0.4);
    margin: 0;
    min-height: 1.3em;
    line-height: 1.5;
  }

  /* CTA */
  .cta {
    width: 100%; max-width: 320px;
    padding: 0.875rem;
    background: #00c9a7;
    color: #0a0d0f;
    border: none;
    border-radius: 100px;
    font-weight: 700;
    font-size: 0.95rem;
    cursor: pointer;
    font-family: inherit;
    letter-spacing: 0.02em;
    transition: opacity 0.15s, transform 0.1s;
  }
  .cta:hover  { opacity: 0.88; }
  .cta:active { transform: scale(0.98); }

  .skip {
    font-size: 0.8rem;
    color: rgba(255,255,255,0.25);
    text-decoration: none;
  }
  .skip:hover { color: rgba(255,255,255,0.5); }

  /* Spinner */
  .spinner {
    width: 40px; height: 40px;
    border: 2.5px solid rgba(255,255,255,0.08);
    border-top-color: rgba(255,255,255,0.4);
    border-radius: 50%;
    animation: spin 0.75s linear infinite;
  }

  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes pop-in  {
    from { opacity: 0; transform: scale(0.6); }
    to   { opacity: 1; transform: scale(1); }
  }
</style>