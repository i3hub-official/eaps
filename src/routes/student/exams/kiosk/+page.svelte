<!-- src/routes/student/exams/kiosk/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	import { onMount, tick } from 'svelte';
	import {
		AlertTriangle,
		CheckCircle,
		ChevronLeft,
		ChevronRight,
		Send,
		Loader2,
		Clock,
		User,
		ArrowLeft,
		Trophy,
		XCircle,
		Eye,
		EyeOff,
		Shield,
		CheckSquare,
		User as UserIcon
	} from '@lucide/svelte';

	import KioskShell from '$lib/components/exam/KioskShell.svelte';
	import FaceVerifyModal from '$lib/components/exam/FaceVerifyModal.svelte';
	import FaceMonitor from '$lib/components/exam/FaceMonitor.svelte';
	import ViolationWarning from '$lib/components/exam/ViolationWarning.svelte';
	import Watermark from '$lib/components/exam/Watermark.svelte';

	import {
		persistSession,
		loadSession,
		clearSession,
		mergeServerAnswers,
		pendingAnswers,
		type PersistedSession
	} from '$lib/exam/session-store.js';

	let { data }: { data: PageData } = $props();

	// ─── Step ─────────────────────────────────────────────────────────────────
	type KioskStep = 'lobby' | 'starting' | 'exam' | 'paused' | 'submitted' | 'results' | 'flagged';

	// ─── Lobby state ──────────────────────────────────────────────────────────
	type LobbyPhase = 'verify' | 'rules' | 'ready';
	let lobbyPhase = $state<LobbyPhase>('verify');
	let rulesAccepted = $state(false);
	let faceVerified = $state(false);
	let verifyError = $state('');

	function onFaceVerifySuccess() {
		faceVerified = true;
		lobbyPhase = 'rules';
	}

	function onFaceVerifyCancel() {
		// Send them back to the exams list if they cancel verification
		window.location.href = '/student/exams';
	}

	async function onRulesAccepted() {
		rulesAccepted = true;
		lobbyPhase = 'ready';
		// Small delay so they see the "ready" state, then start
		await new Promise((r) => setTimeout(r, 800));
		step = 'starting';
		await startExam();
	}

	type ClientQuestion = {
		id: string;
		type: 'mcq' | 'fill_in_the_blank' | 'true_false' | 'essay' | 'generic';
		body: string;
		imageUrl: string | null;
		marks: number;
		options: Array<{ id: string; text: string }>;
	};

	// ─── Session state ─────────────────────────────────────────────────────────
	let step = $state<KioskStep>('starting');
	let sessionId = $state<string | null>(data.sessionId);
	let totalQuestions = $state<number>(data.totalQuestions ?? 0);
	let currentIndex = $state<number>(0);
	let answers = $state<Record<number, string>>({});

	// ─── Question ─────────────────────────────────────────────────────────────
	let question = $state<ClientQuestion | null>(null);
	let questionLoading = $state(false);
	let questionError = $state('');

	// ─── Timer ────────────────────────────────────────────────────────────────
	let timeRemaining = $state<number>(data.timeRemaining ?? 0);
	let timerInterval: ReturnType<typeof setInterval> | null = null;
	let syncInterval: ReturnType<typeof setInterval> | null = null;

	const timerWarning = $derived(timeRemaining > 0 && timeRemaining <= 300);
	const timerCritical = $derived(timeRemaining > 0 && timeRemaining <= 60);

	function formatTime(secs: number): string {
		const h = Math.floor(secs / 3600),
			m = Math.floor((secs % 3600) / 60),
			s = secs % 60;
		if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
		return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
	}

	function startLocalTimer() {
		if (timerInterval) clearInterval(timerInterval);
		timerInterval = setInterval(() => {
			if (timeRemaining <= 0) {
				clearInterval(timerInterval!);
				timerInterval = null;
				void handleAutoSubmit();
				return;
			}
			timeRemaining--;
			if (timeRemaining % 10 === 0 && sessionId) persistSession(buildPersistedState());
		}, 1000);
	}

	async function syncTimerFromServer() {
		if (!sessionId || step !== 'exam') return;
		try {
			const res = await fetch(`/api/exam/${data.examId}/time?sessionId=${sessionId}`);
			if (!res.ok) return;
			const json = await res.json();
			applyServerStatus(json.status, json.timeRemaining);
		} catch {
			/* silent */
		}
	}

	function startTimerSync() {
		if (syncInterval) clearInterval(syncInterval);
		syncInterval = setInterval(syncTimerFromServer, 30_000);
	}

	function stopAllTimers() {
		if (timerInterval) {
			clearInterval(timerInterval);
			timerInterval = null;
		}
		if (syncInterval) {
			clearInterval(syncInterval);
			syncInterval = null;
		}
	}

	// ─── SSE — real-time backend commands ─────────────────────────────────────
	let sseSource: EventSource | null = null;
	let sseReconnectTimer: ReturnType<typeof setTimeout> | null = null;
	let sseConnected = $state(false);

	function connectSSE() {
		if (!sessionId) return;
		if (sseSource) {
			sseSource.close();
			sseSource = null;
		}

		const url = `/api/exam/${data.examId}/session-stream?sessionId=${sessionId}`;
		sseSource = new EventSource(url);

		sseSource.addEventListener('open', () => {
			sseConnected = true;
			if (sseReconnectTimer) {
				clearTimeout(sseReconnectTimer);
				sseReconnectTimer = null;
			}
		});

		sseSource.addEventListener('status', (e) => {
			try {
				const payload = JSON.parse((e as MessageEvent).data);
				applyServerStatus(payload.status, payload.timeRemaining, payload.action);
			} catch {
				/* malformed event */
			}
		});

		sseSource.addEventListener('error', () => {
			sseConnected = false;
			sseSource?.close();
			sseSource = null;
			if (step === 'exam' || step === 'paused') {
				sseReconnectTimer = setTimeout(connectSSE, 5_000);
			}
		});
	}

	function disconnectSSE() {
		if (sseSource) {
			sseSource.close();
			sseSource = null;
		}
		if (sseReconnectTimer) {
			clearTimeout(sseReconnectTimer);
			sseReconnectTimer = null;
		}
		sseConnected = false;
	}

	function applyServerStatus(status: string, serverTimeRemaining?: number, action?: string) {
		switch (status) {
			case 'in_progress':
				if (step === 'paused') {
					step = 'exam';
					if (typeof serverTimeRemaining === 'number') timeRemaining = serverTimeRemaining;
					startLocalTimer();
					startTimerSync();
				} else if (typeof serverTimeRemaining === 'number') {
					if (Math.abs(timeRemaining - serverTimeRemaining) > 3) {
						timeRemaining = serverTimeRemaining;
					}
				}
				break;

			case 'paused':
				if (step === 'exam') {
					stopAllTimers();
					step = 'paused';
				}
				break;

			case 'flagged':
				notifyOpener('flagged');
				stopAllTimers();
				step = 'flagged';
				break;

			case 'submitted':
			case 'force_submitted':
				handleServerSubmitted();
				break;
		}
	}

	// ─── Fullscreen ────────────────────────────────────────────────────────────
	let fullscreenViolationPending = false;

	async function requestFullscreen() {
		try {
			await document.documentElement.requestFullscreen();
		} catch {
			/* ok */
		}
	}

	async function exitFullscreen() {
		try {
			if (document.fullscreenElement) await document.exitFullscreen();
		} catch {
			/* ok */
		}
	}

	function onFullscreenChange() {
		if (step !== 'exam') return;
		if (!document.fullscreenElement) {
			void requestFullscreen();
			if (!fullscreenViolationPending && !violationInFlight) {
				fullscreenViolationPending = true;
				void handleViolation('fullscreen_exit').finally(() => {
					fullscreenViolationPending = false;
				});
			}
		}
	}

	// ─── Violations ───────────────────────────────────────────────────────────
	let violationCount = $state(0);
	let violationVisible = $state(false);
	let violationType = $state('');
	let violationAction = $state('warning');
	let violationInFlight = false;

	async function handleViolation(type: string) {
		if (violationInFlight || step !== 'exam') return;
		violationInFlight = true;
		violationType = type;
		try {
			const res = await fetch(`/api/exam/${data.examId}/violation`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(buildAnswerBody(sessionId, questionId, questionType, value))
			});
			if (res.ok) {
				const json = await res.json();
				if (typeof json.violationCount === 'number') violationCount = json.violationCount;
				violationAction = json.action ?? 'warning';
				if (json.action === 'auto_submitted') {
					violationVisible = true;
					await submitExam();
					return;
				}
				if (json.action === 'exam_paused') {
					notifyOpener('flagged');
					stopAllTimers();
					step = 'flagged';
					return;
				}
			} else {
				violationAction = 'warning';
			}
		} catch {
			violationAction = 'warning';
		} finally {
			violationInFlight = false;
		}
		violationVisible = true;
	}

  function buildAnswerBody(
  sessionId: string,
  questionId: string,
  type: ClientQuestion['type'],
  value: string
) {
  const isOption = type === 'mcq' || type === 'true_false';
  return {
    sessionId,
    questionId,
    selectedOption: isOption ? value : null,
    textAnswer:     isOption ? null  : value || null,
    timeSpentSecs:  0,
  };
}

	// ─── Offline queue ─────────────────────────────────────────────────────────
	let isOnline = $state(true);
	let offlineQueue = $state<
		Array<{ index: number; questionId: string; value: string; type: ClientQuestion['type'] }>
	>([]);
	let isSyncing = $state(false);

	async function syncOfflineQueue() {
		if (isSyncing || offlineQueue.length === 0 || !isOnline || !sessionId) return;
		isSyncing = true;
		const batch = [...offlineQueue];
		const failed: typeof offlineQueue = [];
		for (const item of batch) {
			if (!item.questionId) continue;
			try {
				const res = await fetch(`/api/exam/${data.examId}/answer`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(buildAnswerBody(sessionId, item.questionId, item.type, item.value))
				});
				if (!res.ok && res.status !== 409) failed.push(item);
			} catch {
				failed.push(item);
			}
		}
		offlineQueue = failed;
		isSyncing = false;
	}

	// ─── Submit ────────────────────────────────────────────────────────────────
	let isSubmitting = $state(false);
	let submitError = $state('');
	let showSubmitConfirm = $state(false);
	let submitRetryTimer: ReturnType<typeof setInterval> | null = null;

	async function submitExam() {
		if (!sessionId || isSubmitting) return;
		isSubmitting = true;
		submitError = '';
		if (submitRetryTimer) {
			clearInterval(submitRetryTimer);
			submitRetryTimer = null;
		}
		await syncOfflineQueue();
		try {
			const res = await fetch(`/api/exam/${data.examId}/submit`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sessionId })
			});
			if (res.status === 409 || res.ok) {
				handleServerSubmitted();
				return;
			}
			submitError = 'Submission failed — retrying…';
			submitRetryTimer = setInterval(submitExam, 5000);
		} catch {
			submitError = 'No connection — retrying…';
			submitRetryTimer = setInterval(submitExam, 5000);
		} finally {
			if (!submitRetryTimer) isSubmitting = false;
		}
	}

	async function handleAutoSubmit() {
		await submitExam();
	}

	async function handleServerSubmitted() {
		if (!sessionId) return;
		clearSession(sessionId);
		stopAllTimers();
		disconnectSSE();
		showSubmitConfirm = false;
		await exitFullscreen();
		notifyOpener('submitted');

		if (data.exam.showResultAfter) {
			await fetchResult();
			step = 'results';
		} else {
			step = 'submitted';
			startRedirectCountdown();
		}
	}

	// ─── Results ───────────────────────────────────────────────────────────────
	type ExamResult = {
		score: number | null;
		percentage: number | null;
		passed: boolean | null;
		correct: number | null;
		totalQuestions: number | null;
		answered: number | null;
		grade: string | null;
		violationCount: number;
		timeTakenSecs: number | null;
	};

	let result = $state<ExamResult | null>(null);
	let resultLoading = $state(false);
	let resultError = $state('');

	async function fetchResult() {
		if (!sessionId) return;
		resultLoading = true;
		resultError = '';
		try {
			const res = await fetch(`/api/exam/${data.examId}/result?sessionId=${sessionId}`);
			if (res.ok) {
				result = await res.json();
			} else {
				resultError = 'Could not load your result right now.';
			}
		} catch {
			resultError = 'Network error loading result.';
		} finally {
			resultLoading = false;
		}
	}

	// ─── Post-submission redirect countdown ────────────────────────────────────
	let redirectSecsLeft = $state(30);
	let redirectInterval: ReturnType<typeof setInterval> | null = null;

	function startRedirectCountdown() {
		redirectSecsLeft = 30;
		redirectInterval = setInterval(() => {
			redirectSecsLeft--;
			if (redirectSecsLeft <= 0) {
				clearInterval(redirectInterval!);
				redirectInterval = null;
				window.location.href = '/student';
			}
		}, 1000);
	}

	// ─── Notify opener ─────────────────────────────────────────────────────────
	function notifyOpener(type: 'submitted' | 'flagged') {
		try {
			window.opener?.postMessage({ source: 'etest_kiosk', type }, window.location.origin);
		} catch {
			/* opener may be closed */
		}
	}

	// ─── Persistence ──────────────────────────────────────────────────────────
	function buildPersistedState(): PersistedSession {
		return {
			sessionId: sessionId!,
			examId: data.examId,
			answers: { ...answers },
			currentIndex,
			timeOffsetMs: (data.timeRemaining - timeRemaining) * 1000,
			savedAt: Date.now()
		};
	}

	// ─── Fetch question ────────────────────────────────────────────────────────
	async function fetchQuestion(idx: number) {
		if (!sessionId) return;
		questionLoading = true;
		questionError = '';
		question = null;
		try {
			const res = await fetch(
				`/api/exam/${data.examId}/question?index=${idx}&sessionId=${sessionId}`
			);
			if (res.status === 409) {
				void handleServerSubmitted();
				return;
			}
			if (res.status === 423) {
				notifyOpener('flagged');
				stopAllTimers();
				step = 'flagged';
				return;
			}
			if (!res.ok) {
				const j = await res.json().catch(() => ({}));
				questionError = j.message ?? `Failed to load question ${idx + 1}`;
				return;
			}
			const payload = await res.json();
			question = payload.question;
			totalQuestions = payload.total;
			currentIndex = idx;
			persistSession(buildPersistedState());
		} catch {
			questionError = 'Network error — press R to retry';
		} finally {
			questionLoading = false;
		}
	}

	// ─── Save answer ───────────────────────────────────────────────────────────
async function saveAnswer(idx: number, value: string) {
  if (!sessionId || !question) return;
  answers = { ...answers, [idx]: value };
  persistSession(buildPersistedState());
  const questionId   = question.id;
  const questionType = question.type;
  const sid          = sessionId;

  if (!isOnline) {
    const queued = { index: idx, questionId, value, type: questionType };
    const existing = offlineQueue.findIndex(q => q.index === idx);
    if (existing >= 0) offlineQueue[existing] = queued;
    else offlineQueue = [...offlineQueue, queued];
    return;
  }
  try {
    const res = await fetch(`/api/exam/${data.examId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildAnswerBody(sid, questionId, questionType, value)),
    });
    if (res.status === 409) { void handleServerSubmitted(); return; }
    if (!res.ok) offlineQueue = [...offlineQueue, { index: idx, questionId, value, type: questionType }];
  } catch {
    offlineQueue = [...offlineQueue, { index: idx, questionId, value, type: questionType }];
  }
}

	// ─── Navigation ────────────────────────────────────────────────────────────
	async function goToQuestion(idx: number) {
		if (idx < 0 || idx >= totalQuestions || questionLoading) return;
		await fetchQuestion(idx);
	}
	const goNext = () => goToQuestion(currentIndex + 1);
	const goPrev = () => goToQuestion(currentIndex - 1);

	// ─── Start exam ────────────────────────────────────────────────────────────
	let startError = $state('');

	async function startExam() {
		startError = '';
		try {
			const res = await fetch(`/api/exam/${data.examId}/start`, { method: 'POST' });
			const json = await res.json();
			if (res.status === 409) {
				void handleServerSubmitted();
				return;
			}
			if (res.status === 423) {
				notifyOpener('flagged');
				step = 'flagged';
				return;
			}
			if (!res.ok) {
				startError = json.message ?? `Error ${res.status}`;
				return;
			}

			sessionId = json.sessionId;
			totalQuestions = json.totalQuestions;
			timeRemaining = json.timeRemaining;
			const stored = loadSession(json.sessionId);
			if (stored) {
				answers = mergeServerAnswers(stored, json.serverAnswers).answers;
				currentIndex = stored.currentIndex;
			} else {
				answers = json.serverAnswers ?? {};
				currentIndex = json.currentIndex ?? 0;
			}
			if (stored) {
				const serverKnown = new Set(Object.keys(json.serverAnswers ?? {}).map(Number));
				const pending = pendingAnswers(stored, serverKnown);
				for (const item of pending)
					offlineQueue.push({ index: item.index, questionId: '', value: item.value });
			}
			persistSession(buildPersistedState());
			step = 'exam';
			await tick();
			await requestFullscreen();
			startLocalTimer();
			startTimerSync();
			connectSSE();
			await fetchQuestion(currentIndex);
		} catch (e: any) {
			startError = e.message ?? 'Network error';
		}
	}

	// ─── Keyboard shortcuts ────────────────────────────────────────────────────
	function handleKeyDown(e: KeyboardEvent) {
		if (step !== 'exam' || questionLoading) return;
		if (
			document.activeElement instanceof HTMLInputElement ||
			document.activeElement instanceof HTMLTextAreaElement
		)
			return;
		if (violationVisible) {
			if (e.key.toLowerCase() === 'y' || e.key === 'Enter') violationVisible = false;
			return;
		}
		const letter = e.key.toUpperCase();
		if (['A', 'B', 'C', 'D'].includes(letter) && question?.type === 'mcq') {
			const opt = question.options[letter.charCodeAt(0) - 65];
			if (opt) {
				saveAnswer(currentIndex, opt.id);
				return;
			}
		}
		switch (e.key.toLowerCase()) {
			case 'n':
				goNext();
				break;
			case 'p':
				goPrev();
				break;
			case 's':
				if (!showSubmitConfirm) showSubmitConfirm = true;
				break;
			case 'r':
				void fetchQuestion(currentIndex);
				break;
			case 'y':
				if (showSubmitConfirm) void submitExam();
				break;
			case 'x':
				if (showSubmitConfirm) showSubmitConfirm = false;
				break;
		}
	}

	function setupBeacon() {
		window.addEventListener('beforeunload', () => {
			if (!sessionId || step !== 'exam') return;
			for (const item of offlineQueue) {
				if (!item.questionId) continue;
				navigator.sendBeacon(
					`/api/exam/${data.examId}/answer`,
					JSON.stringify(buildAnswerBody(sessionId, item.questionId, item.type, item.value))
				);
			}
		});
	}

	// ─── Lifecycle ─────────────────────────────────────────────────────────────
	onMount(() => {
		isOnline = navigator.onLine;
		window.addEventListener('online', () => {
			isOnline = true;
			void syncOfflineQueue();
		});
		window.addEventListener('offline', () => {
			isOnline = false;
		});
		window.addEventListener('keydown', handleKeyDown);
		document.addEventListener('fullscreenchange', onFullscreenChange);
		setupBeacon();

		const s = data.sessionStatus;
		if (s === 'submitted' || s === 'force_submitted') {
			void handleServerSubmitted();
		} else if (s === 'flagged') {
			step = 'flagged';
		} else if (s === 'paused') {
			step = 'paused';
		} else if (s === 'in_progress' && data.sessionId) {
			sessionId = data.sessionId;
			const stored = loadSession(data.sessionId);
			if (stored) {
				answers = stored.answers;
				currentIndex = stored.currentIndex;
			}
			step = 'exam';
			startLocalTimer();
			startTimerSync();
			connectSSE();
			void fetchQuestion(currentIndex);
		} else {
			step = 'lobby';
		}

		return () => {
			stopAllTimers();
			disconnectSSE();
			if (submitRetryTimer) clearInterval(submitRetryTimer);
			if (redirectInterval) clearInterval(redirectInterval);
			window.removeEventListener('keydown', handleKeyDown);
			document.removeEventListener('fullscreenchange', onFullscreenChange);
		};
	});

	// ─── Derived ───────────────────────────────────────────────────────────────
	const answeredCount = $derived(Object.keys(answers).length);
	const unanswered = $derived(totalQuestions - answeredCount);
	const timerPct = $derived(
		data.timeRemaining > 0 ? Math.max(0, (timeRemaining / data.timeRemaining) * 100) : 0
	);
	const isResume = $derived(data.sessionStatus === 'in_progress' && !!data.sessionId);

	function dotStatus(i: number): 'current' | 'answered' | 'unanswered' {
		if (i === currentIndex) return 'current';
		return answers[i] !== undefined ? 'answered' : 'unanswered';
	}

	function fmtSecs(s: number): string {
		const h = Math.floor(s / 3600),
			m = Math.floor((s % 3600) / 60),
			sec = s % 60;
		if (h > 0) return `${h}h ${m}m ${sec}s`;
		if (m > 0) return `${m}m ${sec}s`;
		return `${sec}s`;
	}

	function gradeColour(passed: boolean | null): string {
		if (passed === true) return 'var(--accent, #10b981)';
		if (passed === false) return '#ef4444';
		return 'var(--color-muted)';
	}
</script>

<svelte:head>
	<title>{data.exam.title} — eTest Kiosk</title>
</svelte:head>

<!-- ═══ LOBBY ════════════════════════════════════════════════════════════════ -->
{#if step === 'lobby'}
	<!-- Phase 1: Face Verification -->
	{#if lobbyPhase === 'verify'}
		<div class="lobby-backdrop">
			<FaceVerifyModal
				examId={data.examId}
				onSuccess={onFaceVerifySuccess}
				onCancel={onFaceVerifyCancel}
			/>
			<div class="lobby-context">
				<div class="lobby-context-inner">
					<div class="lc-icon"><Shield size={20} /></div>
					<div>
						<p class="lc-title">Identity Verification Required</p>
						<p class="lc-sub">Step 1 of 2 — Verify your face to continue</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Phase 2: Rules -->
	{:else if lobbyPhase === 'rules'}
		<div class="lobby-screen">
			<div class="lobby-card">
				<div class="lobby-header">
					<div class="lobby-check verified">
						<CheckSquare size={18} />
						<span>Identity Verified</span>
					</div>
					<h1 class="lobby-title">Exam Rules & Regulations</h1>
					<p class="lobby-sub">Read carefully before entering the exam</p>
				</div>

				<div class="exam-preview">
					<div class="ep-row">
						<span class="ep-label">Exam</span>
						<span class="ep-value">{data.exam.title}</span>
					</div>
					<div class="ep-row">
						<span class="ep-label">Course</span>
						<span class="ep-value">{data.exam.courseCode}</span>
					</div>
					<div class="ep-row">
						<span class="ep-label">Duration</span>
						<span class="ep-value">{data.exam.durationMinutes} minutes</span>
					</div>
					<div class="ep-row">
						<span class="ep-label">Questions</span>
						<span class="ep-value">{data.exam.questionsToPresent}</span>
					</div>
					<div class="ep-row">
						<span class="ep-label">Total marks</span>
						<span class="ep-value">{data.exam.totalMarks}</span>
					</div>
					<div class="ep-row">
						<span class="ep-label">Pass mark</span>
						<span class="ep-value">{data.exam.passMark}</span>
					</div>
				</div>

				<div class="rules-list">
					{#each [{ icon: '🖥️', rule: 'The exam runs in fullscreen mode. Exiting fullscreen will be logged as a violation.' }, { icon: '👁️', rule: 'Your face is monitored throughout the exam. Look directly at your camera.' }, { icon: '🚫', rule: 'No switching tabs, opening other windows, or using developer tools.' }, { icon: '👤', rule: 'Only one person must be visible to the camera at all times.' }, { icon: '📋', rule: 'Do not attempt to copy, screenshot, or record exam content.' }, { icon: '⚠️', rule: `You are allowed a maximum of ${data.exam.maxViolations} violations before automatic submission.` }, { icon: '✅', rule: 'Ensure you have a stable internet connection before starting.' }, { icon: '⏱️', rule: 'The timer will not stop once the exam begins. Submit before time runs out.' }, { icon: '🔒', rule: 'Once submitted, you cannot re-enter or change your answers.' }] as r}
						<div class="rule-item">
							<span class="rule-icon">{r.icon}</span>
							<span class="rule-text">{r.rule}</span>
						</div>
					{/each}

					{#if data.exam.instructions}
						<div class="exam-instructions">
							<p class="instructions-label">Additional Instructions from Lecturer</p>
							<p class="instructions-text">{data.exam.instructions}</p>
						</div>
					{/if}
				</div>

				<div class="rules-footer">
					<label class="accept-label">
						<input type="checkbox" bind:checked={rulesAccepted} class="accept-checkbox" />
						<span>
							I have read and understood the rules. I agree to comply with the examination conduct
							policy.
						</span>
					</label>

					<div class="lobby-actions">
						<button
							class="btn-back-lobby"
							onclick={() => (window.location.href = '/student/exams')}
						>
							<ArrowLeft size={16} /> Cancel
						</button>
						<button class="btn-enter-exam" disabled={!rulesAccepted} onclick={onRulesAccepted}>
							<Shield size={16} />
							Enter Exam &amp; Go Fullscreen
						</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Phase 3: Ready (brief transition) -->
	{:else if lobbyPhase === 'ready'}
		<div class="lobby-screen">
			<div class="lobby-ready">
				<div class="ready-ring">
					<CheckSquare size={40} />
				</div>
				<p class="ready-text">Starting exam…</p>
			</div>
		</div>
	{/if}

	<!-- ═══ STARTING ════════════════════════════════════════════════════════════ -->
{:else if step === 'starting'}
	<div class="splash">
		<Loader2 size={36} class="spin" />
		<p>{isResume ? 'Resuming exam…' : 'Starting exam…'}</p>
		{#if startError}
			<div class="splash-error">
				<AlertTriangle size={16} />
				{startError}
				<button onclick={() => void startExam()}>Retry</button>
			</div>
		{/if}
	</div>

	<!-- ═══ EXAM ═════════════════════════════════════════════════════════════════ -->
{:else if step === 'exam'}
	<KioskShell onViolation={handleViolation}>
		<Watermark text="{data.student.matricNumber ?? data.student.name} · eTest" />

		{#if sessionId}
			<FaceMonitor
				{sessionId}
				examId={data.examId}
				enrolledDescriptor={data.faceDescriptor}
				maxViolations={data.exam.maxViolations}
				onAutoSubmit={submitExam}
				onFlagged={() => {
					notifyOpener('flagged');
					stopAllTimers();
					step = 'flagged';
				}}
			/>
		{/if}

		{#if violationVisible}
			<ViolationWarning
				count={violationCount}
				max={data.exam.maxViolations}
				action={violationAction}
				flagType={violationType}
				onDismiss={() => {
					violationVisible = false;
				}}
			/>
		{/if}

		{#if showSubmitConfirm}
			<div class="modal-backdrop" role="dialog" aria-modal="true">
				<div class="confirm-modal">
					<h2>Submit Exam?</h2>
					{#if unanswered > 0}
						<p class="confirm-warn">
							<AlertTriangle size={16} />
							<strong>{unanswered}</strong> question{unanswered !== 1 ? 's' : ''} unanswered
						</p>
					{:else}
						<p class="confirm-ok">All {totalQuestions} questions answered.</p>
					{/if}
					{#if submitError}<p class="submit-err">{submitError}</p>{/if}
					<div class="confirm-keys"><kbd>Y</kbd> confirm &nbsp; <kbd>X</kbd> cancel</div>
					<div class="confirm-actions">
						<button
							class="btn-cancel"
							onclick={() => (showSubmitConfirm = false)}
							disabled={isSubmitting}
						>
							Return to exam <kbd>X</kbd>
						</button>
						<button
							class="btn-submit-confirm"
							onclick={() => void submitExam()}
							disabled={isSubmitting}
						>
							{#if isSubmitting}<Loader2 size={15} class="spin" /> Submitting…
							{:else}<Send size={15} /> Submit Now <kbd>Y</kbd>{/if}
						</button>
					</div>
				</div>
			</div>
		{/if}

		<!-- SSE connection indicator -->
		{#if !sseConnected && step === 'exam'}
			<div class="sse-badge sse-disconnected">
				<span class="sse-dot"></span> Reconnecting…
			</div>
		{/if}

		<div class="kiosk-layout">
			<!-- ══ LEFT SIDEBAR ═══════════════════════════════════════════════════ -->
			<aside class="left-panel">
				{#if isResume}
					<div class="resume-badge"><CheckCircle size={13} /> Resumed session</div>
				{/if}

				<div class="student-card">
						<img src={data.student.photoUrl} alt={data.student.name} class="student-photo" />
					<div class="student-info">
						<span class="student-name">{data.student.name}</span>
						<span class="student-matric">{data.student.matricNumber ?? ''}</span>
					</div>
				</div>

				<div class="exam-info-block">
					<span class="exam-code-pill">{data.exam.courseCode}</span>
					<span class="exam-title-text">{data.exam.title}</span>
				</div>

				<div class="timer-block" class:warning={timerWarning} class:critical={timerCritical}>
					<div class="timer-bar-track">
						<div
							class="timer-bar-fill"
							style="width:{timerPct}%"
							class:warning={timerWarning}
							class:critical={timerCritical}
						></div>
					</div>
					<div class="timer-display">
						<Clock size={16} />
						<span class="timer-digits">{formatTime(timeRemaining)}</span>
					</div>
					{#if timerWarning && !timerCritical}
						<div class="timer-hint warn">Less than 5 minutes remaining</div>
					{:else if timerCritical}
						<div class="timer-hint crit">Less than 1 minute!</div>
					{/if}
				</div>

				<div class="progress-block">
					<div class="progress-row">
						<span class="progress-label">Answered</span>
						<span class="progress-val">{answeredCount}/{totalQuestions}</span>
					</div>
					<div class="progress-track">
						<div
							class="progress-fill"
							style="width:{totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%"
						></div>
					</div>
				</div>

				<div class="nav-section">
					<div class="nav-legend">
						<span class="legend-dot answered"></span>Answered
						<span class="legend-dot unanswered"></span>Unanswered
						<span class="legend-dot current"></span>Current
					</div>
					<div class="nav-grid">
						{#each { length: totalQuestions } as _, i}
							<button
								class="nav-btn"
								class:answered={dotStatus(i) === 'answered'}
								class:current={dotStatus(i) === 'current'}
								onclick={() => void goToQuestion(i)}
								title="Question {i + 1}"
								tabindex="-1">{i + 1}</button
							>
						{/each}
					</div>
				</div>

				{#if !isOnline}
					<div class="offline-bar">Offline — {offlineQueue.length} queued</div>
				{:else if offlineQueue.length > 0}
					<div class="syncing-bar">Syncing {offlineQueue.length}…</div>
				{/if}

				{#if violationCount > 0}
					<div
						class="violation-counter"
						class:danger={violationCount >= data.exam.maxViolations - 1}
					>
						<AlertTriangle size={13} />
						{violationCount}/{data.exam.maxViolations} violations
					</div>
				{/if}

				<button class="btn-submit-side" onclick={() => (showSubmitConfirm = true)}>
					<Send size={14} /> Submit Exam <kbd>S</kbd>
				</button>

				<div class="key-hints">
					<div class="key-row"><kbd>A</kbd><kbd>B</kbd><kbd>C</kbd><kbd>D</kbd> Select option</div>
					<div class="key-row"><kbd>P</kbd> Prev &nbsp; <kbd>N</kbd> Next</div>
					<div class="key-row"><kbd>R</kbd> Reload &nbsp; <kbd>S</kbd> Submit</div>
				</div>
			</aside>

			<!-- ══ RIGHT PANEL ════════════════════════════════════════════════════ -->
			<main class="right-panel">
				{#if questionLoading}
					<div class="q-loading">
						<Loader2 size={36} class="spin" /><span>Loading question…</span>
					</div>
				{:else if questionError}
					<div class="q-error">
						<AlertTriangle size={28} />
						<p>{questionError}</p>
						<button class="btn-retry" onclick={() => void fetchQuestion(currentIndex)}
							>Retry <kbd>R</kbd></button
						>
					</div>
				{:else if question}
					<div class="question-card">
						<div class="question-header">
							<div class="q-meta-left">
								<span class="q-number">Question {currentIndex + 1}</span>
								<span class="q-of">of {totalQuestions}</span>
							</div>
							<div class="q-meta-right">
								<span class="q-marks">{question.marks} mark{question.marks !== 1 ? 's' : ''}</span>
								{#if answers[currentIndex] !== undefined}
									<span class="q-answered-badge"><CheckCircle size={12} /> Answered</span>
								{/if}
							</div>
						</div>

						<div class="question-body-wrap">
							<p class="question-text">{question.body}</p>
							{#if question.imageUrl}
								<img src={question.imageUrl} alt="Question illustration" class="question-img" />
							{/if}
						</div>

						{#if question.type === 'mcq'}
							<div class="options-list">
								{#each question.options as opt, i}
									{@const letter = String.fromCharCode(65 + i)}
									{@const selected = answers[currentIndex] === opt.id}
									<button
										class="option-btn"
										class:selected
										onclick={() => saveAnswer(currentIndex, opt.id)}
										tabindex="-1"
									>
										<span class="option-letter" class:selected>{letter}</span>
										<span class="option-text">{opt.text}</span>
										{#if selected}<CheckCircle size={18} class="option-check" />{/if}
									</button>
								{/each}
							</div>
						{/if}

						{#if question.type === 'fill_in_the_blank'}
							<div class="fitb-wrap">
								<label class="fitb-label">Your answer</label>
								<input
									type="text"
									class="fitb-input"
									placeholder="Type your answer here…"
									value={answers[currentIndex] ?? ''}
									oninput={(e) =>
										saveAnswer(currentIndex, (e.currentTarget as HTMLInputElement).value)}
								/>
							</div>
						{/if}

						<!-- MOVED: Navigation buttons - NOW AT BOTTOM WITH LARGER FONTS -->
						<div class="question-footer">
							<div class="nav-buttons-wrapper">
								<button
									class="btn-nav btn-prev"
									disabled={currentIndex === 0 || questionLoading}
									onclick={goPrev}
									tabindex="-1"
								>
									<ChevronLeft size={22} /> Previous
								</button>
								
								<div class="footer-center">
									<span class="question-counter-lg">{currentIndex + 1} / {totalQuestions}</span>
									{#if !isOnline}
										<span class="offline-text">Offline — saved locally</span>
									{/if}
								</div>

								{#if currentIndex < totalQuestions - 1}
									<button
										class="btn-nav btn-next"
										disabled={questionLoading}
										onclick={goNext}
										tabindex="-1"
									>
										Next <ChevronRight size={22} />
									</button>
								{:else}
									<button
										class="btn-nav btn-submit-footer"
										disabled={isSubmitting}
										onclick={() => (showSubmitConfirm = true)}
										tabindex="-1"
									>
										<Send size={18} /> Submit Exam
									</button>
								{/if}
							</div>
						</div>
					</div>
				{/if}
			</main>
		</div>
	</KioskShell>

	<!-- ═══ PAUSED ═══════════════════════════════════════════════════════════════ -->
{:else if step === 'paused'}
	<div class="terminal-screen paused">
		<div class="terminal-card">
			<div class="paused-pulse">
				<AlertTriangle size={40} class="paused-icon" />
			</div>
			<h1>Exam Paused</h1>
			<p>An invigilator has paused your session. Your progress is saved.</p>
			<p class="terminal-sub">Please wait — your exam will resume automatically when unpaused.</p>
			<div class="paused-wait">
				<Loader2 size={18} class="spin" />
				<span>Waiting for invigilator…</span>
			</div>
		</div>
	</div>

	<!-- ═══ SUBMITTED (no results shown) ════════════════════════════════════════ -->
{:else if step === 'submitted'}
	<div class="terminal-screen">
		<div class="terminal-card">
			<CheckCircle size={56} class="done-icon" />
			<h1>Exam Submitted</h1>
			<p>Your answers have been recorded successfully.</p>
			<p class="terminal-sub">Results will be available once your exam is graded.</p>
			<div class="redirect-countdown">
				<div class="redirect-bar" style="animation-duration:{redirectSecsLeft}s"></div>
				<span>Returning to dashboard in {redirectSecsLeft}s…</span>
			</div>
			<button
				class="btn-go-home"
				onclick={() => {
					clearInterval(redirectInterval!);
					window.location.href = '/student';
				}}
			>
				<ArrowLeft size={15} /> Go to Dashboard Now
			</button>
		</div>
	</div>

	<!-- ═══ RESULTS ═══════════════════════════════════════════════════════════════ -->
{:else if step === 'results'}
	<div class="terminal-screen results-screen">
		<div class="results-card">
			<!-- Header -->
			<div class="results-header">
				<div class="results-exam-info">
					<span class="results-course">{data.exam.courseCode}</span>
					<h1 class="results-title">{data.exam.title}</h1>
				</div>
				<CheckCircle size={32} class="done-icon" />
			</div>

			{#if resultLoading}
				<div class="results-loading">
					<Loader2 size={28} class="spin" /> <span>Loading your results…</span>
				</div>
			{:else if resultError}
				<div class="results-error"><AlertTriangle size={20} />{resultError}</div>
			{:else if result}
				<!-- Score hero -->
				<div class="score-hero" style="--grade-color:{gradeColour(result.passed)}">
					<div class="score-ring">
						<svg viewBox="0 0 100 100" class="score-svg">
							<circle class="ring-bg" cx="50" cy="50" r="42" />
							<circle
								class="ring-fill"
								cx="50"
								cy="50"
								r="42"
								stroke-dasharray="{result.percentage != null
									? (result.percentage / 100) * 263.9
									: 0} 263.9"
								style="stroke:var(--grade-color)"
							/>
						</svg>
						<div class="score-inner">
							<span class="score-pct"
								>{result.percentage != null ? Math.round(result.percentage) : '—'}%</span
							>
							{#if result.grade}
								<span class="score-grade" style="color:var(--grade-color)">{result.grade}</span>
							{/if}
						</div>
					</div>
					<div class="score-verdict" style="color:var(--grade-color)">
						{#if result.passed === true}
							<Trophy size={18} /> Passed
						{:else if result.passed === false}
							<XCircle size={18} /> Not passed
						{:else}
							Awaiting grading
						{/if}
					</div>
				</div>

				<!-- Stats grid -->
				<div class="stats-grid">
					<div class="stat-cell">
						<span class="stat-label">Correct</span>
						<span class="stat-val"
							>{result.correct ?? '—'} / {result.totalQuestions ?? totalQuestions}</span
						>
					</div>
					<div class="stat-cell">
						<span class="stat-label">Answered</span>
						<span class="stat-val"
							>{result.answered ?? answeredCount} / {result.totalQuestions ?? totalQuestions}</span
						>
					</div>
					<div class="stat-cell">
						<span class="stat-label">Score</span>
						<span class="stat-val"
							>{result.score != null ? Number(result.score).toFixed(1) : '—'} / {data.exam
								.totalMarks}</span
						>
					</div>
					<div class="stat-cell">
						<span class="stat-label">Time taken</span>
						<span class="stat-val"
							>{result.timeTakenSecs != null ? fmtSecs(result.timeTakenSecs) : '—'}</span
						>
					</div>
					{#if result.violationCount > 0}
						<div class="stat-cell stat-cell-warn">
							<span class="stat-label">Violations</span>
							<span class="stat-val warn">{result.violationCount}</span>
						</div>
					{/if}
				</div>
			{/if}

			<div class="results-footer">
				<button
					class="btn-go-home results-home-btn"
					onclick={() => (window.location.href = '/student')}
				>
					<ArrowLeft size={15} /> Back to Dashboard
				</button>
				<button
					class="btn-view-results"
					onclick={() => (window.location.href = '/student/results')}
				>
					<Eye size={15} /> Full Results
				</button>
			</div>
		</div>
	</div>

	<!-- ═══ FLAGGED ═══════════════════════════════════════════════════════════════ -->
{:else if step === 'flagged'}
	<div class="terminal-screen warn">
		<div class="terminal-card">
			<AlertTriangle size={56} class="warn-icon" />
			<h1>Session Paused</h1>
			<p>Your exam has been paused pending invigilator review.</p>
			<p class="terminal-sub">Please wait — an invigilator will contact you shortly.</p>
			<p class="terminal-close">Do not close this window.</p>
		</div>
	</div>
{/if}

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		overflow: hidden;
		user-select: none;
		background: var(--color-bg);
	}

	/* ── Splash ───────────────────────────────────────────────────────────── */
	.splash {
		height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		color: var(--color-muted);
	}
	.splash p {
		font-size: 1.2rem;
		font-weight: 600;
		color: var(--color-text);
	}
	.splash-error {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.95rem;
		color: #dc2626;
		background: color-mix(in srgb, #ef4444 8%, var(--color-surface));
		border: 1px solid color-mix(in srgb, #ef4444 30%, transparent);
		padding: 0.625rem 1rem;
		border-radius: 0.5rem;
	}
	.splash-error button {
		margin-left: 0.5rem;
		padding: 0.25rem 0.75rem;
		background: #dc2626;
		color: white;
		border: none;
		border-radius: 0.375rem;
		font-size: 0.88rem;
		font-weight: 700;
		cursor: pointer;
	}

	/* ── SSE badge ────────────────────────────────────────────────────────── */
	.sse-badge {
		position: fixed;
		top: 0.75rem;
		right: 1rem;
		z-index: 50;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.78rem;
		font-weight: 700;
		padding: 0.3rem 0.7rem;
		border-radius: 999px;
		pointer-events: none;
	}
	.sse-disconnected {
		background: color-mix(in srgb, #f59e0b 12%, var(--color-surface));
		color: #92400e;
		border: 1px solid color-mix(in srgb, #f59e0b 35%, transparent);
	}
	.sse-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #f59e0b;
		animation: blink 1s ease-in-out infinite;
	}
	@keyframes blink {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.2;
		}
	}

	/* ── Layout ───────────────────────────────────────────────────────────── */
	.kiosk-layout {
		display: grid;
		grid-template-columns: 280px 1fr;
		height: 100vh;
		overflow: hidden;
		position: relative;
		z-index: 2;
	}

	/* ── Left panel ───────────────────────────────────────────────────────── */
	.left-panel {
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
		padding: 1rem;
		background: var(--color-surface);
		border-right: 1px solid var(--color-border);
		overflow-y: auto;
		overflow-x: hidden;
	}

	.resume-badge {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.75rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0.3rem 0.65rem;
		border-radius: 20px;
		width: fit-content;
		background: color-mix(in srgb, var(--accent, #10b981) 12%, transparent);
		color: var(--accent, #10b981);
		border: 1px solid color-mix(in srgb, var(--accent, #10b981) 25%, transparent);
	}

	.student-card {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.625rem;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
	}
	.student-photo {
		width: 42px;
		height: 42px;
		border-radius: 50%;
		object-fit: cover;
		border: 2px solid var(--accent, #10b981);
		flex-shrink: 0;
	}
	.student-photo-placeholder {
		width: 42px;
		height: 42px;
		border-radius: 50%;
		background: var(--color-bg);
		border: 2px solid var(--color-border);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-muted);
		flex-shrink: 0;
	}
	.student-info {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.student-name {
		font-size: 0.85rem;
		font-weight: 800;
		color: var(--color-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.student-matric {
		font-size: 0.75rem;
		color: var(--color-muted);
		font-weight: 600;
	}

	.exam-info-block {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.5rem 0.625rem;
		background: color-mix(in srgb, var(--accent, #10b981) 8%, var(--color-surface));
		border: 1px solid color-mix(in srgb, var(--accent, #10b981) 20%, transparent);
		border-radius: 0.625rem;
	}
	.exam-code-pill {
		font-size: 0.75rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--accent, #10b981);
	}
	.exam-title-text {
		font-size: 0.88rem;
		font-weight: 700;
		color: var(--color-text);
		line-height: 1.3;
	}

	.timer-block {
		padding: 0.75rem;
		background: var(--color-bg);
		border: 1.5px solid var(--color-border);
		border-radius: 0.75rem;
		transition:
			border-color 0.3s,
			background 0.3s;
	}
	.timer-block.warning {
		border-color: #fcd34d;
		background: color-mix(in srgb, #f59e0b 6%, var(--color-bg));
	}
	.timer-block.critical {
		border-color: #fca5a5;
		background: color-mix(in srgb, #ef4444 6%, var(--color-bg));
		animation: pulse-card 1s ease-in-out infinite;
	}
	@keyframes pulse-card {
		0%,
		100% {
			box-shadow: none;
		}
		50% {
			box-shadow: 0 0 0 4px color-mix(in srgb, #ef4444 15%, transparent);
		}
	}
	.timer-bar-track {
		height: 5px;
		background: var(--color-border);
		border-radius: 3px;
		overflow: hidden;
		margin-bottom: 0.625rem;
	}
	.timer-bar-fill {
		height: 100%;
		background: var(--accent, #10b981);
		border-radius: 3px;
		transition:
			width 1s linear,
			background 0.3s;
	}
	.timer-bar-fill.warning {
		background: #f59e0b;
	}
	.timer-bar-fill.critical {
		background: #ef4444;
	}
	.timer-display {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--color-text);
	}
	.timer-digits {
		font-size: 1.8rem;
		font-weight: 900;
		font-variant-numeric: tabular-nums;
		letter-spacing: -0.02em;
		line-height: 1;
	}
	.timer-block.warning .timer-digits {
		color: #d97706;
	}
	.timer-block.critical .timer-digits {
		color: #dc2626;
	}
	.timer-hint {
		font-size: 0.78rem;
		font-weight: 700;
		margin-top: 0.375rem;
		padding: 0.2rem 0.5rem;
		border-radius: 4px;
		display: inline-block;
	}
	.timer-hint.warn {
		background: color-mix(in srgb, #f59e0b 12%, var(--color-bg));
		color: #92400e;
	}
	.timer-hint.crit {
		background: color-mix(in srgb, #ef4444 10%, var(--color-bg));
		color: #991b1b;
	}

	.progress-block {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}
	.progress-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.progress-label {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.progress-val {
		font-size: 0.88rem;
		font-weight: 800;
		color: var(--color-text);
	}
	.progress-track {
		height: 5px;
		background: var(--color-border);
		border-radius: 3px;
		overflow: hidden;
	}
	.progress-fill {
		height: 100%;
		background: var(--accent, #10b981);
		border-radius: 3px;
		transition: width 0.4s ease;
	}

	.nav-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.nav-legend {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.72rem;
		color: var(--color-muted);
		font-weight: 600;
		flex-wrap: wrap;
	}
	.legend-dot {
		width: 8px;
		height: 8px;
		border-radius: 2px;
		display: inline-block;
	}
	.legend-dot.answered {
		background: var(--accent, #10b981);
	}
	.legend-dot.unanswered {
		background: var(--color-border);
	}
	.legend-dot.current {
		background: var(--accent-dark, #16a34a);
	}
	.nav-grid {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 0.3rem;
	}
	.nav-btn {
		aspect-ratio: 1;
		border-radius: 6px;
		border: 1.5px solid var(--color-border);
		background: var(--color-bg);
		color: var(--color-muted);
		font-size: 0.78rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.12s;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
	}
	.nav-btn.answered {
		background: color-mix(in srgb, var(--accent, #10b981) 14%, var(--color-bg));
		border-color: var(--accent, #10b981);
		color: var(--accent, #10b981);
	}
	.nav-btn.current {
		background: var(--accent-dark, #16a34a);
		border-color: var(--accent-dark, #16a34a);
		color: #fff;
		transform: scale(1.08);
		box-shadow: 0 2px 8px color-mix(in srgb, var(--accent, #10b981) 40%, transparent);
	}
	.nav-btn:hover:not(.current) {
		border-color: var(--accent, #10b981);
		color: var(--accent, #10b981);
	}

	.offline-bar,
	.syncing-bar {
		font-size: 0.8rem;
		font-weight: 700;
		text-align: center;
		padding: 0.4rem 0.75rem;
		border-radius: 0.5rem;
	}
	.offline-bar {
		background: color-mix(in srgb, #ef4444 8%, var(--color-surface));
		color: #dc2626;
		border: 1px solid color-mix(in srgb, #ef4444 30%, transparent);
	}
	.syncing-bar {
		background: color-mix(in srgb, #3b82f6 8%, var(--color-surface));
		color: #2563eb;
		border: 1px solid color-mix(in srgb, #3b82f6 30%, transparent);
	}

	.violation-counter {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.82rem;
		font-weight: 700;
		padding: 0.35rem 0.75rem;
		border-radius: 0.5rem;
		background: color-mix(in srgb, #f59e0b 8%, var(--color-surface));
		color: #92400e;
		border: 1px solid color-mix(in srgb, #f59e0b 30%, transparent);
	}
	.violation-counter.danger {
		background: color-mix(in srgb, #ef4444 8%, var(--color-surface));
		color: #991b1b;
		border-color: color-mix(in srgb, #ef4444 30%, transparent);
	}

	.btn-submit-side {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.75rem;
		background: color-mix(in srgb, var(--accent, #10b981) 85%, #000);
		color: white;
		border: none;
		border-radius: 0.75rem;
		font-size: 0.95rem;
		font-weight: 800;
		cursor: pointer;
		font-family: inherit;
		transition: filter 0.2s;
	}
	.btn-submit-side:hover {
		filter: brightness(0.88);
	}
	.btn-submit-side kbd {
		font-size: 0.72rem;
		padding: 0.1rem 0.35rem;
		background: rgba(255, 255, 255, 0.2);
		border-radius: 3px;
	}

	.key-hints {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		padding: 0.625rem;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 0.625rem;
		margin-top: auto;
	}
	.key-row {
		font-size: 0.75rem;
		color: var(--color-muted);
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex-wrap: wrap;
	}
	.key-row kbd {
		font-size: 0.7rem;
		padding: 0.1rem 0.35rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 3px;
		color: var(--color-text);
		font-family: monospace;
		font-weight: 700;
	}

	/* ── Right panel ──────────────────────────────────────────────────────── */
	.right-panel {
		display: flex;
		flex-direction: column;
		height: 100vh;
		overflow: hidden;
		background: var(--color-bg);
	}
	.q-loading,
	.q-error {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		color: var(--color-muted);
	}
	.q-error {
		color: #dc2626;
	}
	.q-error p {
		font-size: 1.05rem;
		font-weight: 600;
		margin: 0;
	}
	.btn-retry {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1.25rem;
		background: var(--color-surface);
		color: var(--color-text);
		border: 1.5px solid var(--color-border);
		border-radius: 0.625rem;
		font-weight: 700;
		font-size: 0.95rem;
		cursor: pointer;
		font-family: inherit;
	}
	.question-card {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 2rem 2.5rem;
		overflow-y: auto;
		gap: 1.5rem;
	}
	.question-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-shrink: 0;
	}
	.q-meta-left {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
	}
	.q-number {
		font-size: 1.15rem;
		font-weight: 900;
		color: var(--color-text);
		letter-spacing: -0.01em;
	}
	.q-of {
		font-size: 0.9rem;
		color: var(--color-muted);
		font-weight: 600;
	}
	.q-meta-right {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.q-marks {
		font-size: 0.88rem;
		font-weight: 700;
		padding: 0.25rem 0.65rem;
		background: color-mix(in srgb, var(--accent, #10b981) 12%, transparent);
		color: var(--accent, #10b981);
		border-radius: 6px;
	}
	.q-answered-badge {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.82rem;
		font-weight: 700;
		color: var(--accent, #10b981);
		background: color-mix(in srgb, var(--accent, #10b981) 10%, transparent);
		border: 1px solid var(--accent, #10b981);
		padding: 0.2rem 0.6rem;
		border-radius: 20px;
	}
	.question-body-wrap {
		flex-shrink: 0;
	}
	.question-text {
		font-size: 1.4rem;
		line-height: 1.8;
		color: var(--color-text);
		font-weight: 500;
		margin: 0;
		max-width: 72ch;
	}
	.question-img {
		max-width: 100%;
		max-height: 280px;
		object-fit: contain;
		border-radius: 0.75rem;
		margin-top: 1rem;
		border: 1px solid var(--color-border);
	}
	.options-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		flex-shrink: 0;
	}
	.option-btn {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1.1rem 1.25rem;
		background: var(--color-surface);
		border: 1.5px solid var(--color-border);
		border-radius: 0.875rem;
		cursor: pointer;
		text-align: left;
		transition: all 0.15s;
		font-family: inherit;
		color: var(--color-text);
		max-width: 72ch;
	}
	.option-btn:hover:not(.selected) {
		border-color: var(--accent, #10b981);
		background: color-mix(in srgb, var(--accent, #10b981) 5%, var(--color-surface));
		transform: translateX(2px);
	}
	.option-btn.selected {
		border-color: var(--accent, #10b981);
		background: color-mix(in srgb, var(--accent, #10b981) 10%, var(--color-surface));
	}
	.option-letter {
		width: 38px;
		height: 38px;
		border-radius: 50%;
		border: 1.5px solid var(--color-border);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.95rem;
		font-weight: 900;
		flex-shrink: 0;
		color: var(--color-muted);
		transition: all 0.15s;
	}
	.option-letter.selected {
		background: var(--accent, #10b981);
		border-color: var(--accent, #10b981);
		color: white;
	}
	.option-text {
		flex: 1;
		font-size: 1.1rem;
		line-height: 1.5;
	}
	.option-btn :global(.option-check) {
		color: var(--accent, #10b981);
		flex-shrink: 0;
	}
	.fitb-wrap {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-width: 60ch;
		flex-shrink: 0;
	}
	.fitb-label {
		font-size: 0.88rem;
		font-weight: 700;
		color: var(--color-muted);
	}
	.fitb-input {
		padding: 1rem 1.25rem;
		font-size: 1.2rem;
		font-family: inherit;
		color: var(--color-text);
		background: var(--color-surface);
		border: 1.5px solid var(--color-border);
		border-radius: 0.75rem;
		outline: none;
		transition: border-color 0.15s;
		user-select: text;
	}
	.fitb-input:focus {
		border-color: var(--accent, #10b981);
	}

	/* ── NEW: Footer with prominent navigation buttons ────────────────────── */
	.question-footer {
		flex-shrink: 0;
		margin-top: auto;
		padding-top: 1.25rem;
		border-top: 2px solid var(--color-border);
	}

	.nav-buttons-wrapper {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.footer-center {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}

	.question-counter-lg {
		font-size: 1.1rem;
		font-weight: 800;
		color: var(--color-text);
	}

	.offline-text {
		font-size: 0.85rem;
		color: #dc2626;
		font-weight: 600;
	}

	.btn-nav {
		display: inline-flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.9rem 2rem;
		border-radius: 0.75rem;
		font-size: 1.05rem;
		font-weight: 800;
		cursor: pointer;
		font-family: inherit;
		transition: all 0.2s;
		border: 2px solid var(--color-border);
		background: var(--color-surface);
		color: var(--color-text);
		min-width: 140px;
		justify-content: center;
	}

	.btn-nav:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.btn-nav kbd {
		font-size: 0.72rem;
		padding: 0.1rem 0.4rem;
		background: rgba(0, 0, 0, 0.06);
		border-radius: 3px;
		font-family: monospace;
	}

	.btn-prev:hover:not(:disabled) {
		border-color: var(--accent, #10b981);
		color: var(--accent, #10b981);
		background: color-mix(in srgb, var(--accent, #10b981) 5%, var(--color-surface));
	}

	.btn-next {
		background: var(--accent, #10b981);
		color: white;
		border-color: var(--accent, #10b981);
	}

	.btn-next:hover:not(:disabled) {
		filter: brightness(0.9);
		transform: translateY(-2px);
		box-shadow: 0 4px 16px color-mix(in srgb, var(--accent, #10b981) 30%, transparent);
	}

	.btn-next kbd {
		background: rgba(255, 255, 255, 0.2);
	}

	.btn-submit-footer {
		background: color-mix(in srgb, var(--accent, #10b981) 85%, #000);
		color: white;
		border-color: transparent;
		font-size: 1.05rem;
		min-width: 160px;
	}

	.btn-submit-footer:hover:not(:disabled) {
		filter: brightness(0.9);
		transform: translateY(-2px);
		box-shadow: 0 4px 16px color-mix(in srgb, var(--accent, #10b981) 30%, transparent);
	}

	.btn-submit-footer:disabled {
		opacity: 0.5;
	}

	.btn-submit-footer kbd {
		background: rgba(255, 255, 255, 0.2);
	}

	/* ── Modal ────────────────────────────────────────────────────────────── */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgb(0 0 0/0.65);
		backdrop-filter: blur(6px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 200;
		padding: 1rem;
	}
	.confirm-modal {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 1.25rem;
		padding: 2rem;
		width: 100%;
		max-width: 440px;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		box-shadow: 0 24px 64px rgb(0 0 0/0.2);
	}
	.confirm-modal h2 {
		font-size: 1.25rem;
		font-weight: 900;
		margin: 0;
		color: var(--color-text);
	}
	.confirm-warn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.95rem;
		background: color-mix(in srgb, #f59e0b 8%, var(--color-surface));
		color: #92400e;
		border: 1px solid color-mix(in srgb, #f59e0b 30%, transparent);
		padding: 0.625rem 0.875rem;
		border-radius: 0.5rem;
		margin: 0;
	}
	.confirm-ok {
		font-size: 0.95rem;
		color: var(--color-muted);
		margin: 0;
	}
	.submit-err {
		font-size: 0.9rem;
		color: #dc2626;
		margin: 0;
	}
	.confirm-keys {
		font-size: 0.82rem;
		color: var(--color-muted);
	}
	.confirm-keys kbd {
		padding: 0.1rem 0.4rem;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 3px;
		font-family: monospace;
		font-size: 0.8rem;
	}
	.confirm-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
	}
	.btn-cancel {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.7rem 1.25rem;
		background: var(--color-bg);
		color: var(--color-text);
		border: 1.5px solid var(--color-border);
		border-radius: 0.625rem;
		font-weight: 700;
		font-size: 0.95rem;
		cursor: pointer;
		font-family: inherit;
	}
	.btn-cancel kbd {
		font-size: 0.72rem;
		padding: 0.1rem 0.3rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 3px;
		font-family: monospace;
	}
	.btn-cancel:disabled {
		opacity: 0.45;
	}
	.btn-submit-confirm {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.7rem 1.5rem;
		background: color-mix(in srgb, var(--accent, #10b981) 85%, #000);
		color: white;
		border: none;
		border-radius: 0.625rem;
		font-weight: 800;
		font-size: 0.95rem;
		cursor: pointer;
		font-family: inherit;
		transition: filter 0.2s;
	}
	.btn-submit-confirm:hover:not(:disabled) {
		filter: brightness(0.88);
	}
	.btn-submit-confirm:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.btn-submit-confirm kbd {
		font-size: 0.72rem;
		padding: 0.1rem 0.3rem;
		background: rgba(255, 255, 255, 0.2);
		border-radius: 3px;
		font-family: monospace;
	}

	/* ── Terminal screens ─────────────────────────────────────────────────── */
	.terminal-screen {
		height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg);
		padding: 2rem;
	}
	.terminal-screen.warn {
		background: color-mix(in srgb, #f59e0b 5%, var(--color-bg));
	}
	.terminal-screen.paused {
		background: color-mix(in srgb, #6366f1 4%, var(--color-bg));
	}
	.terminal-screen.results-screen {
		background: var(--color-bg);
		align-items: flex-start;
		overflow-y: auto;
	}

	.terminal-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		text-align: center;
		max-width: 480px;
	}
	.terminal-card :global(.done-icon) {
		color: var(--accent, #10b981);
	}
	.terminal-card :global(.warn-icon) {
		color: #f59e0b;
	}
	.terminal-card h1 {
		font-size: 1.75rem;
		font-weight: 900;
		color: var(--color-text);
		margin: 0;
	}
	.terminal-card p {
		font-size: 1.05rem;
		color: var(--color-muted);
		margin: 0;
		line-height: 1.6;
	}
	.terminal-sub {
		font-size: 0.95rem;
	}
	.terminal-close {
		font-size: 0.88rem;
		font-weight: 700;
		color: var(--color-muted);
		padding: 0.5rem 1rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		margin-top: 0.5rem;
	}

	/* Paused screen */
	.paused-pulse {
		position: relative;
	}
	.paused-pulse::after {
		content: '';
		position: absolute;
		inset: -12px;
		border-radius: 50%;
		border: 2px solid #6366f1;
		animation: paused-ring 2s ease-in-out infinite;
	}
	@keyframes paused-ring {
		0%,
		100% {
			opacity: 0.6;
			transform: scale(1);
		}
		50% {
			opacity: 0;
			transform: scale(1.4);
		}
	}
	.terminal-card :global(.paused-icon) {
		color: #6366f1;
	}
	.paused-wait {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.92rem;
		color: var(--color-muted);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		padding: 0.625rem 1rem;
		border-radius: 8px;
	}

	/* Redirect countdown */
	.redirect-countdown {
		width: 100%;
		max-width: 360px;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		align-items: center;
		font-size: 0.9rem;
		color: var(--color-muted);
	}
	.redirect-bar {
		width: 100%;
		height: 3px;
		background: var(--color-border);
		border-radius: 2px;
		overflow: hidden;
		position: relative;
	}
	.redirect-bar::after {
		content: '';
		position: absolute;
		inset-block: 0;
		left: 0;
		background: var(--accent, #10b981);
		border-radius: 2px;
		animation: drain linear forwards;
		animation-duration: inherit;
	}
	@keyframes drain {
		from {
			width: 100%;
		}
		to {
			width: 0%;
		}
	}

	.btn-go-home {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.65rem 1.25rem;
		background: var(--color-surface);
		color: var(--color-text);
		border: 1.5px solid var(--color-border);
		border-radius: 0.625rem;
		font-weight: 700;
		font-size: 0.95rem;
		cursor: pointer;
		font-family: inherit;
		transition: background 0.15s;
	}
	.btn-go-home:hover {
		background: var(--color-border);
	}

	/* ── Results card ─────────────────────────────────────────────────────── */
	.results-card {
		width: 100%;
		max-width: 560px;
		margin: auto;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 1.25rem;
		overflow: hidden;
		box-shadow: 0 8px 40px rgb(0 0 0/0.08);
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.results-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.5rem;
		border-bottom: 1px solid var(--color-border);
	}
	.results-exam-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.results-course {
		font-size: 0.78rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--accent, #10b981);
	}
	.results-title {
		font-size: 1.2rem;
		font-weight: 900;
		color: var(--color-text);
		margin: 0;
	}
	.results-header :global(.done-icon) {
		color: var(--accent, #10b981);
	}

	.results-loading {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 2.5rem;
		font-size: 1rem;
		color: var(--color-muted);
		justify-content: center;
	}
	.results-error {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 1.5rem;
		font-size: 0.95rem;
		color: #dc2626;
		background: color-mix(in srgb, #ef4444 6%, var(--color-surface));
	}

	/* Score ring */
	.score-hero {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.875rem;
		padding: 2rem 1.5rem;
		border-bottom: 1px solid var(--color-border);
	}
	.score-ring {
		position: relative;
		width: 140px;
		height: 140px;
	}
	.score-svg {
		width: 100%;
		height: 100%;
		transform: rotate(-90deg);
	}
	.ring-bg {
		fill: none;
		stroke: var(--color-border);
		stroke-width: 8;
	}
	.ring-fill {
		fill: none;
		stroke-width: 8;
		stroke-linecap: round;
		transition: stroke-dasharray 0.8s ease;
	}
	.score-inner {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.1rem;
	}
	.score-pct {
		font-size: 2rem;
		font-weight: 900;
		color: var(--color-text);
		line-height: 1;
		letter-spacing: -0.03em;
	}
	.score-grade {
		font-size: 1rem;
		font-weight: 800;
	}
	.score-verdict {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1.05rem;
		font-weight: 800;
	}

	/* Stats */
	.stats-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0;
		border-bottom: 1px solid var(--color-border);
	}
	.stat-cell {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 1rem 1.25rem;
		border-right: 1px solid var(--color-border);
		border-bottom: 1px solid var(--color-border);
	}
	.stat-cell:nth-child(even) {
		border-right: none;
	}
	.stat-cell:nth-last-child(-n + 2) {
		border-bottom: none;
	}
	.stat-cell-warn {
		background: color-mix(in srgb, #f59e0b 5%, var(--color-surface));
	}
	.stat-label {
		font-size: 0.8rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-muted);
	}
	.stat-val {
		font-size: 1.2rem;
		font-weight: 900;
		color: var(--color-text);
	}
	.stat-val.warn {
		color: #d97706;
	}

	.results-footer {
		display: flex;
		gap: 0.75rem;
		padding: 1.25rem 1.5rem;
		justify-content: flex-end;
	}
	.results-home-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.65rem 1.1rem;
		background: var(--color-bg);
		color: var(--color-text);
		border: 1.5px solid var(--color-border);
		border-radius: 0.625rem;
		font-weight: 700;
		font-size: 0.95rem;
		cursor: pointer;
		font-family: inherit;
		transition: background 0.15s;
	}
	.results-home-btn:hover {
		background: var(--color-border);
	}
	.btn-view-results {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.65rem 1.25rem;
		background: var(--accent, #10b981);
		color: white;
		border: none;
		border-radius: 0.625rem;
		font-weight: 700;
		font-size: 0.95rem;
		cursor: pointer;
		font-family: inherit;
		transition: filter 0.15s;
	}
	.btn-view-results:hover {
		filter: brightness(0.9);
	}

	:global(.spin) {
		animation: spin 1s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	/* ── Lobby backdrop (for verify phase) ──────────────────────────────────── */
	.lobby-backdrop {
		min-height: 100vh;
		background: var(--color-bg);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		position: relative;
	}

	.lobby-context {
		position: fixed;
		top: 1rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 200;
	}

	.lobby-context-inner {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 1.25rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 999px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
	}

	.lc-icon {
		color: var(--accent, #10b981);
		display: flex;
	}

	.lc-title {
		font-size: 0.92rem;
		font-weight: 700;
		color: var(--color-text);
		margin: 0;
	}

	.lc-sub {
		font-size: 0.82rem;
		color: var(--color-muted);
		margin: 0;
	}

	/* ── Lobby screen (rules phase) ─────────────────────────────────────────── */
	.lobby-screen {
		min-height: 100vh;
		background: var(--color-bg);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem 1rem;
		overflow-y: auto;
	}

	.lobby-card {
		width: 100%;
		max-width: 640px;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 1.25rem;
		overflow: hidden;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.06);
		display: flex;
		flex-direction: column;
	}

	.lobby-header {
		padding: 2rem 2rem 1.25rem;
		border-bottom: 1px solid var(--color-border);
	}

	.lobby-check {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.3rem 0.75rem;
		border-radius: 999px;
		font-size: 0.82rem;
		font-weight: 700;
		margin-bottom: 1rem;
	}

	.lobby-check.verified {
		background: color-mix(in srgb, #10b981 10%, transparent);
		color: #10b981;
		border: 1px solid color-mix(in srgb, #10b981 25%, transparent);
	}

	.lobby-title {
		font-size: 1.5rem;
		font-weight: 900;
		color: var(--color-text);
		margin: 0 0 0.3rem;
		letter-spacing: -0.02em;
	}

	.lobby-sub {
		font-size: 0.95rem;
		color: var(--color-muted);
		margin: 0;
	}

	/* ── Exam preview ────────────────────────────────────────────────────────── */
	.exam-preview {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 0;
		border-bottom: 1px solid var(--color-border);
	}

	.ep-row {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		padding: 0.875rem 1.25rem;
		border-right: 1px solid var(--color-border);
	}

	.ep-row:last-child,
	.ep-row:nth-child(3n) {
		border-right: none;
	}

	.ep-label {
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-muted);
	}

	.ep-value {
		font-size: 1rem;
		font-weight: 800;
		color: var(--color-text);
	}

	/* ── Rules list ─────────────────────────────────────────────────────────── */
	.rules-list {
		padding: 1.25rem 2rem;
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
		max-height: 340px;
		overflow-y: auto;
		border-bottom: 1px solid var(--color-border);
	}

	.rule-item {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.625rem 0.875rem;
		background: var(--color-bg);
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
	}

	.rule-icon {
		font-size: 1.1rem;
		flex-shrink: 0;
		line-height: 1.4;
	}

	.rule-text {
		font-size: 0.92rem;
		color: var(--color-text);
		line-height: 1.55;
	}

	.exam-instructions {
		padding: 0.875rem;
		background: color-mix(in srgb, var(--accent, #10b981) 6%, var(--color-bg));
		border: 1px solid color-mix(in srgb, var(--accent, #10b981) 20%, transparent);
		border-radius: 0.5rem;
		margin-top: 0.25rem;
	}

	.instructions-label {
		font-size: 0.8rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--accent, #10b981);
		margin: 0 0 0.375rem;
	}

	.instructions-text {
		font-size: 0.92rem;
		color: var(--color-text);
		line-height: 1.6;
		margin: 0;
		white-space: pre-wrap;
	}

	/* ── Rules footer ────────────────────────────────────────────────────────── */
	.rules-footer {
		padding: 1.25rem 2rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.accept-label {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		cursor: pointer;
		font-size: 0.92rem;
		color: var(--color-text);
		line-height: 1.55;
		font-weight: 500;
	}

	.accept-checkbox {
		width: 18px;
		height: 18px;
		flex-shrink: 0;
		margin-top: 0.1rem;
		accent-color: var(--accent, #10b981);
		cursor: pointer;
	}

	.lobby-actions {
		display: flex;
		gap: 0.75rem;
	}

	.btn-back-lobby {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.75rem 1.25rem;
		background: var(--color-bg);
		color: var(--color-text);
		border: 1.5px solid var(--color-border);
		border-radius: 0.75rem;
		font-weight: 700;
		font-size: 0.95rem;
		cursor: pointer;
		font-family: inherit;
		transition: all 0.15s;
		white-space: nowrap;
	}

	.btn-back-lobby:hover {
		border-color: var(--color-text);
	}

	.btn-enter-exam {
		flex: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.875rem 1.5rem;
		background: var(--accent, #10b981);
		color: white;
		border: none;
		border-radius: 0.75rem;
		font-weight: 800;
		font-size: 1.05rem;
		cursor: pointer;
		font-family: inherit;
		transition: all 0.2s;
	}

	.btn-enter-exam:hover:not(:disabled) {
		filter: brightness(0.9);
		transform: translateY(-1px);
		box-shadow: 0 6px 20px color-mix(in srgb, var(--accent, #10b981) 35%, transparent);
	}

	.btn-enter-exam:disabled {
		opacity: 0.4;
		cursor: not-allowed;
		transform: none;
	}

	/* ── Ready state ─────────────────────────────────────────────────────────── */
	.lobby-ready {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		color: var(--accent, #10b981);
	}

	.ready-ring {
		width: 80px;
		height: 80px;
		border-radius: 50%;
		border: 3px solid var(--accent, #10b981);
		display: flex;
		align-items: center;
		justify-content: center;
		animation: scale-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.ready-text {
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--color-text);
		margin: 0;
	}

	@keyframes scale-in {
		from {
			opacity: 0;
			transform: scale(0.8);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	@media (max-width: 640px) {
		.lobby-card {
			border-radius: 0;
			min-height: 100vh;
		}
		.lobby-header {
			padding: 1.25rem 1.25rem 1rem;
		}
		.rules-list {
			padding: 1rem 1.25rem;
			max-height: none;
		}
		.rules-footer {
			padding: 1rem 1.25rem;
		}
		.lobby-actions {
			flex-direction: column;
		}
		.btn-back-lobby {
			width: 100%;
			justify-content: center;
		}
		.exam-preview {
			grid-template-columns: 1fr 1fr;
		}
	}
</style>