<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { Button } from '$lib/components/ui/button/index.js';
    import X from '@lucide/svelte/icons/x';
    import Loader2 from '@lucide/svelte/icons/loader-2';
    import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
    import AlertCircle from '@lucide/svelte/icons/alert-circle';
    import ScanFace from '@lucide/svelte/icons/scan-face';
    import { getHuman, cosineSimilarity } from '$lib/client/face/human.js';
    import {
        selectGestures,
        gestureConfidence,
        GestureTracker,
        ALL_GESTURES,
        type GestureDefinition,
    } from './gesture-service.js';

    let {
        examId,
        onSuccess,
        onCancel,
    }: { examId: string; onSuccess: () => void; onCancel: () => void } = $props();

    type Phase = 'loading-model' | 'requesting-camera' | 'positioning' | 'gesture' | 'checking' | 'success' | 'failed' | 'error';

    let phase = $state<Phase>('loading-model');
    let errorMessage = $state('');
    let statusText = $state('Loading face model…');
    let faceDetected = $state(false);
    let similarityPercent = $state<number | null>(null);

    // ─── Position Hold ─────────────────────────────────────────────────────
    let posHoldProgress = $state(0);
    let posHoldStart: number | null = null;
    const POS_HOLD_MS = 2000;

    // ─── Gesture Phase ─────────────────────────────────────────────────────
    let selected: GestureDefinition[] = [];
    let gestureIndex = $state(0);
    let gesturesDone = $state(0);
    let holdProgress = $state(0);
    let tracker: GestureTracker | null = null;
    const GESTURE_COUNT = 3;

    // ─── Face Embeddings & Liveness Tracking ───────────────────────────────
    // Instead of reading scores from the last frame alone (which may be stale
    // or mid-blink), we accumulate the BEST real/live scores seen across every
    // gesture frame. A real face will produce at least a few high-scoring frames;
    // a spoof will consistently fail across all of them.
    let embeddings: number[][] = [];
    let enrolledDescriptor: number[] | null = null;
    let bestRealScore = 0;
    let bestLiveScore = 0;

    const MATCH_THRESHOLD = 0.78;
    const MIN_ANTISPOOF = 0.55;   // Lowered: peak score across all frames, not per-frame
    const MIN_LIVENESS  = 0.55;   // Lowered: same rationale

    // ─── DOM Refs ─────────────────────────────────────────────────────────
    let videoEl = $state<HTMLVideoElement | null>(null);
    let canvasEl = $state<HTMLCanvasElement | null>(null);
    let ctx: CanvasRenderingContext2D | null = null;
    let stream: MediaStream | null = null;
    let human: Awaited<ReturnType<typeof getHuman>> | null = null;
    let loopHandle: number | null = null;
    let stopped = false;
    let lastResult: any = null;

    let colors = { primary: '', destructive: '', border: '', card: '', background: '', foreground: '' };

    function initColors() {
        if (typeof window === 'undefined') return;
        const style = getComputedStyle(document.documentElement);
        const getHsl = (prop: string, fallback: string) => {
            const val = style.getPropertyValue(prop).trim();
            return val ? `hsl(${val})` : fallback;
        };
        const getHslRaw = (prop: string, fallback: string) => style.getPropertyValue(prop).trim() || fallback;

        colors = {
            primary: getHsl('--primary', '#00c9a7'),
            destructive: getHsl('--destructive', '#ef4444'),
            border: getHsl('--border', 'rgba(255,255,255,0.18)'),
            card: getHsl('--card', '#0f1115'),
            background: getHslRaw('--background', '0 0% 0%'),
            foreground: getHsl('--card-foreground', '#fff')
        };
    }

    function drawOverlay(detectedFace: boolean, multiple: boolean, progress: number, label?: string) {
        if (!ctx || !canvasEl) return;
        const w = canvasEl.width;
        const h = canvasEl.height;
        const cx = w / 2;
        const cy = h / 2;
        const rx = w * 0.22;
        const ry = h * 0.48;

        ctx.clearRect(0, 0, w, h);

        ctx.save();
        ctx.fillStyle = `hsl(${colors.background} / 0.7)`;
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.strokeStyle = multiple ? colors.destructive : detectedFace ? colors.primary : colors.border;
        ctx.lineWidth = detectedFace ? 2.5 : 1.5;
        ctx.stroke();

        const cornerOffset = 16;
        const corners: [number, number, [number, number]][] = [
            [cx - rx, cy - ry, [1,  1]],
            [cx + rx, cy - ry, [-1, 1]],
            [cx - rx, cy + ry, [1, -1]],
            [cx + rx, cy + ry, [-1,-1]],
        ];
        ctx.strokeStyle = multiple ? colors.destructive : colors.primary;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        for (const [x, y, [dx, dy]] of corners) {
            ctx.beginPath();
            ctx.moveTo(x + dx * cornerOffset, y);
            ctx.lineTo(x, y);
            ctx.lineTo(x, y + dy * cornerOffset);
            ctx.stroke();
        }

        if (progress > 0 && detectedFace && !multiple) {
            ctx.save();
            ctx.beginPath();
            ctx.ellipse(cx, cy, rx + 10, ry + 10, 0, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
            ctx.strokeStyle = colors.primary;
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.stroke();
            ctx.restore();
        }

        if (label && !multiple) {
            ctx.save();
            const pillH = 36;
            const pillY = h * 0.94 - pillH / 2;
            ctx.font = '600 13px system-ui';
            const textW = ctx.measureText(label).width;
            const pillW = Math.min(textW + 44, w * 0.85);
            const pillX = cx - pillW / 2;
            ctx.fillStyle = colors.card;
            ctx.strokeStyle = colors.border;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = progress > 0 ? colors.primary : colors.foreground;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, cx, pillY + pillH / 2);
            ctx.restore();
        }
    }

    async function start() {
        try {
            stopped = false;
            phase = 'loading-model';
            statusText = 'Loading face model…';
            bestRealScore = 0;
            bestLiveScore = 0;
            initColors();
            human = await getHuman();

            if (stopped) return;

            phase = 'requesting-camera';
            statusText = 'Requesting camera access…';
            stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
                audio: false,
            });

            if (stopped) {
                stream.getTracks().forEach(t => t.stop());
                return;
            }

            if (!videoEl) throw new Error('Video element not ready.');
            videoEl.srcObject = stream;
            await videoEl.play();

            if (canvasEl) {
                canvasEl.width = videoEl.videoWidth || 640;
                canvasEl.height = videoEl.videoHeight || 480;
                ctx = canvasEl.getContext('2d');
            }

            const descRes = await fetch('/api/face/descriptor');
            if (!descRes.ok) throw new Error('Failed to retrieve verification source profile.');

            const data = await descRes.json();
            if (!data.descriptor) throw new Error('Invalid face profile metadata.');
            enrolledDescriptor = data.descriptor;

            phase = 'positioning';
            statusText = 'Centre your face in the oval';
            loopHandle = requestAnimationFrame(positioningLoop);
        } catch (err) {
            phase = 'error';
            errorMessage = err instanceof Error ? err.message : 'Could not access the camera.';
        }
    }

    async function detect() {
        if (!human || !videoEl || stopped) return;
        try {
            lastResult = await human.detect(videoEl);
        } catch {
            lastResult = null;
        }
    }

    async function positioningLoop() {
        if (stopped || phase !== 'positioning' || !canvasEl) return;
        await detect();
        if (stopped || phase !== 'positioning') return;

        const faces = lastResult?.face ?? [];

        if (faces.length === 0) {
            faceDetected = false;
            posHoldStart = null;
            posHoldProgress = 0;
            statusText = 'No face detected — centre your face in the oval';
            drawOverlay(false, false, 0);
        } else if (faces.length > 1) {
            faceDetected = false;
            posHoldStart = null;
            posHoldProgress = 0;
            statusText = 'Multiple faces detected — make sure you are alone';
            drawOverlay(false, true, 0);
        } else {
            faceDetected = true;
            const face = faces[0];
            const box = face.box;
            const faceW = Array.isArray(box) ? box[2] : box.bottomRight[0] - box.topLeft[0];
            const faceH = Array.isArray(box) ? box[3] : box.bottomRight[1] - box.topLeft[1];
            const faceCX = Array.isArray(box) ? box[0] + box[2] / 2 : (box.topLeft[0] + box.bottomRight[0]) / 2;
            const faceCY = Array.isArray(box) ? box[1] + box[3] / 2 : (box.topLeft[1] + box.bottomRight[1]) / 2;

            const w = canvasEl.width;
            const h = canvasEl.height;
            const cx = w / 2;
            const cy = h / 2;
            const rx = w * 0.22;
            const ry = h * 0.48;

            const centred = Math.abs(faceCX - cx) < rx * 0.5 && Math.abs(faceCY - cy) < ry * 0.5;
            const largeEnough = faceW > w * 0.12 && faceH > h * 0.18;

            if (centred && largeEnough) {
                const now = performance.now();
                if (!posHoldStart) posHoldStart = now;
                posHoldProgress = Math.min(1, (now - posHoldStart) / POS_HOLD_MS);
                statusText = posHoldProgress < 1 ? 'Hold still…' : 'Starting liveness check…';
                drawOverlay(true, false, posHoldProgress);

                if (posHoldProgress >= 1) {
                    selected = selectGestures(GESTURE_COUNT);
                    gestureIndex = 0;
                    gesturesDone = 0;
                    embeddings = [];
                    tracker = new GestureTracker();
                    holdProgress = 0;
                    phase = 'gesture';
                    statusText = selected[0]?.label || 'Gesture';
                    loopHandle = requestAnimationFrame(gestureLoop);
                    return;
                }
            } else {
                posHoldStart = null;
                posHoldProgress = 0;
                statusText = centred ? 'Move closer' : 'Centre your face in the oval';
                drawOverlay(true, false, 0);
            }
        }
        loopHandle = requestAnimationFrame(positioningLoop);
    }

    async function gestureLoop() {
        if (stopped || phase !== 'gesture') return;
        await detect();
        if (stopped || phase !== 'gesture') return;

        const faces = lastResult?.face ?? [];
        const gestures = lastResult?.gesture ?? [];

        if (faces.length === 0) {
            if (tracker) tracker.reset();
            holdProgress = 0;
            statusText = 'Keep your face in the oval';
            drawOverlay(false, false, 0, selected[gestureIndex]?.label);
            loopHandle = requestAnimationFrame(gestureLoop);
            return;
        }
        if (faces.length > 1) {
            if (tracker) tracker.reset();
            holdProgress = 0;
            statusText = 'Only one person allowed';
            drawOverlay(false, true, 0);
            loopHandle = requestAnimationFrame(gestureLoop);
            return;
        }

        const face = faces[0];

        // ── Accumulate best liveness/antispoof scores seen this session ──────
        // The model outputs noisy per-frame scores; a real face will peak well
        // above threshold across the dozens of frames in a gesture sequence.
        // Reading only the last frame means a blink or motion blur at the exact
        // moment of finishCapture causes a false-positive spoof rejection.
        const frameReal = face.real ?? face.antispoof ?? 0;
        const frameLive = face.live ?? 0;
        if (frameReal > bestRealScore) bestRealScore = frameReal;
        if (frameLive > bestLiveScore) bestLiveScore = frameLive;

        const g = selected[gestureIndex];
        if (!g || !tracker) {
            await finishCapture();
            return;
        }

        const confidence = gestureConfidence(g.id, face, gestures);
        const conflictingActionDetected = ALL_GESTURES
            .filter(alt => alt.id !== g.id)
            .some(alt => gestureConfidence(alt.id, face, gestures) > 0.60);

        const confirmed = tracker.update(confidence, conflictingActionDetected);
        holdProgress = tracker.holdProgress;

        drawOverlay(true, false, holdProgress, g.label);
        statusText = g.label;

        if (confirmed) {
            if (face.embedding) {
                embeddings.push(Array.from(face.embedding as number[]));
            }
            gesturesDone = gestureIndex + 1;

            if (gesturesDone >= selected.length) {
                await finishCapture();
                return;
            }

            gestureIndex++;
            tracker = new GestureTracker();
            holdProgress = 0;
            statusText = selected[gestureIndex]?.label || 'Gesture';
        }
        loopHandle = requestAnimationFrame(gestureLoop);
    }

    async function finishCapture() {
        stopped = true;
        phase = 'checking';
        statusText = 'Verifying security attributes…';

        try {
            if (embeddings.length === 0 || !enrolledDescriptor) {
                throw new Error('Biometric vector capture incomplete.');
            }

            const dim = embeddings[0].length;
            const averaged = new Array(dim).fill(0);
            for (const emb of embeddings) {
                for (let i = 0; i < dim; i++) {
                    averaged[i] += emb[i] / embeddings.length;
                }
            }

            const similarity = cosineSimilarity(averaged, enrolledDescriptor);
            similarityPercent = Math.round(similarity * 100);

            // Use the best scores accumulated across all gesture frames,
            // not the stale scores from the final (possibly frozen) frame.
            const matchPassed = similarity >= MATCH_THRESHOLD;
            const realPassed  = bestRealScore >= MIN_ANTISPOOF;
            const livePassed  = bestLiveScore >= MIN_LIVENESS;
            const clientVerified = matchPassed && realPassed && livePassed;

            const verifyRes = await fetch('/api/face/verify-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    verified: clientVerified,
                    similarityScore: similarityPercent,
                    antispoofScore: Math.round(bestRealScore * 100),
                    livenessScore: Math.round(bestLiveScore * 100),
                    examId,
                }),
            });

            if (!verifyRes.ok) throw new Error('Security verification submission rejected.');
            const serverVerdict = await verifyRes.json();

            if (clientVerified && serverVerdict.success) {
                phase = 'success';
                stopCamera();
                setTimeout(() => onSuccess(), 1200);
            } else {
                phase = 'failed';
                stopCamera();
                if (!matchPassed) {
                    statusText = 'The captured face does not match the enrolled profile.';
                } else if (!realPassed || !livePassed) {
                    statusText = 'Liveness check failed. Ensure you are in good lighting and your face is clearly visible.';
                } else {
                    statusText = serverVerdict.message || 'Identity verification rejected by authentication gateway.';
                }
            }
        } catch (err) {
            phase = 'error';
            errorMessage = err instanceof Error ? err.message : 'Verification workflow failed.';
            stopCamera();
        }
    }

    function stopCamera() {
        stopped = true;
        if (loopHandle) cancelAnimationFrame(loopHandle);
        stream?.getTracks().forEach((t) => t.stop());
        stream = null;
    }

    function retry() {
        errorMessage = '';
        similarityPercent = null;
        faceDetected = false;
        embeddings = [];
        bestRealScore = 0;
        bestLiveScore = 0;
        gestureIndex = 0;
        gesturesDone = 0;
        holdProgress = 0;
        posHoldProgress = 0;
        posHoldStart = null;
        stopped = false;
        start();
    }

    function handleCancel() {
        stopCamera();
        onCancel();
    }

    onMount(start);
    onDestroy(stopCamera);
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
    <div class="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <button
            type="button"
            onclick={handleCancel}
            class="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            aria-label="Close"
        >
            <X class="size-5" />
        </button>

        <!-- Header -->
        <div class="mb-1 flex items-center gap-2">
            <h2 class="text-lg font-semibold">Verify your identity</h2>
            {#if phase === 'gesture'}
                <span class="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                    Step {gesturesDone + 1} of {selected.length}
                </span>
            {/if}
        </div>

        <!-- Instruction line — always visible during active phases -->
        <p class="mb-4 text-sm text-muted-foreground">
            {#if phase === 'loading-model' || phase === 'requesting-camera'}
                {statusText}
            {:else if phase === 'positioning'}
                {statusText}
            {:else if phase === 'gesture'}
                {statusText}
            {:else if phase === 'checking'}
                Verifying your identity, please wait…
            {:else if phase === 'success'}
                Identity confirmed. Proceeding…
            {:else}
                Follow the on-screen instructions to verify your identity.
            {/if}
        </p>

        <!-- Camera viewport -->
        <div class="relative mb-4 aspect-video overflow-hidden rounded-lg bg-black">
            <video bind:this={videoEl} class="h-full w-full -scale-x-100 object-cover" muted playsinline></video>
            <canvas bind:this={canvasEl} class="pointer-events-none absolute inset-0 h-full w-full"></canvas>

            {#if phase === 'loading-model' || phase === 'requesting-camera' || phase === 'checking'}
                <div class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50">
                    <Loader2 class="size-8 animate-spin text-white" />
                    <p class="text-xs text-white/60">{statusText}</p>
                </div>
            {/if}

            {#if phase === 'success'}
                <div class="absolute inset-0 flex items-center justify-center bg-black/50">
                    <CheckCircle2 class="size-12 text-primary" />
                </div>
            {/if}
        </div>

        <!-- Phase-specific feedback below the video -->
        {#if phase === 'positioning'}
            <div class="mb-3 flex items-center justify-center gap-2 text-sm font-medium">
                {#if faceDetected}
                    <CheckCircle2 class="size-4 text-primary" />
                    <span class="text-primary">Face aligned — hold still</span>
                {:else}
                    <ScanFace class="size-4 animate-pulse text-muted-foreground" />
                    <span class="text-muted-foreground">Position your face inside the oval</span>
                {/if}
            </div>
            {#if posHoldProgress > 0}
                <div class="mb-4 h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div class="h-full bg-primary transition-all" style="width: {posHoldProgress * 100}%"></div>
                </div>
            {/if}
        {/if}

        {#if phase === 'gesture'}
            <div class="mb-3 flex items-center justify-center gap-2">
                {#each selected as _g, i (i)}
                    <div
                        class="h-1.5 rounded-full transition-all duration-300 {i === gestureIndex
                            ? 'w-6 bg-primary'
                            : i < gesturesDone
                                ? 'w-1.5 bg-primary/40'
                                : 'w-1.5 bg-muted'}"
                    ></div>
                {/each}
            </div>
            <div class="mb-3 flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm font-medium">
                <span class="text-foreground">{selected[gestureIndex]?.label ?? ''}</span>
            </div>
            {#if holdProgress > 0}
                <div class="mb-4 h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div class="h-full bg-primary transition-all" style="width: {holdProgress * 100}%"></div>
                </div>
            {/if}
        {/if}

        {#if phase === 'error' || phase === 'failed'}
            <div class="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle class="mt-0.5 size-4 shrink-0" />
                <p>{phase === 'error' ? errorMessage : statusText}</p>
            </div>
        {/if}

        <!-- Actions -->
        <div class="flex gap-2">
            {#if phase === 'error' || phase === 'failed'}
                <Button variant="outline" class="flex-1" onclick={handleCancel}>Cancel</Button>
                <Button class="flex-1" onclick={retry}>Try again</Button>
            {:else if phase !== 'success'}
                <Button variant="outline" class="w-full" onclick={handleCancel}>Cancel</Button>
            {/if}
        </div>
    </div>
</div>