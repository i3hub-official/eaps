<!-- Comprehensive Face Enrollment & Verification Test with Monitor -->
<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import FaceEnrollModal from '$lib/components/exam/FaceEnrollModal.svelte';
	import FaceVerifyModal from '$lib/components/exam/FaceVerifyModal.svelte';
	import ExamMonitor from '$lib/components/exam/ExamMonitor.svelte';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import Clock from '@lucide/svelte/icons/clock';
	import Eye from '@lucide/svelte/icons/eye';

	let { data } = $props();

	// ✅ MUST use $state for reactive updates in Svelte 5
	let showEnrollModal = $state(false);
	let showVerifyModal = $state(false);
	let showMonitor = $state(false);

	let enrollStatus = $state('');
	let enrollError = $state('');
	let verifyStatus = $state('');
	let verifyError = $state('');
	let isEnrolled = $state(data.faceEnrolled);
	let logs = $state<string[]>([]);

	// Real assessment ID selected from the student's actual eligible tests
	// (data.assessments, loaded server-side in +page.server.ts) — no more
	// fabricated 'test-session-<timestamp>' string. Face verification will
	// now genuinely look up and update a real AssessmentSession row, since
	// /api/face/verify-session matches on { assessmentId, studentId }.
	let selectedAssessmentId = $state(data.assessments[0]?.id ?? '');

	function addLog(message: string) {
		const timestamp = new Date().toLocaleTimeString();
		const logEntry = `[${timestamp}] ${message}`;
		logs.unshift(logEntry);
		console.log(logEntry);

		// Keep only last 50 logs
		if (logs.length > 50) logs = logs.slice(0, 50);
	}

	// ─── ENROLLMENT HANDLERS ───────────────────────────────────────────
	function openEnrollModal() {
		addLog('📝 Opening enrollment modal...');
		showEnrollModal = true;
		enrollStatus = '';
		enrollError = '';
	}

	function handleEnrollSuccess() {
		addLog('✅ Enrollment successful!');
		showEnrollModal = false;
		enrollStatus = 'ENROLLED';
		enrollError = '';
		isEnrolled = true;
	}

	function handleEnrollCancel() {
		addLog('❌ Enrollment cancelled');
		showEnrollModal = false;
		enrollStatus = '';
		enrollError = '';
	}

	// ─── VERIFICATION HANDLERS ─────────────────────────────────────────
	function openVerifyModal() {
		if (!isEnrolled) {
			addLog('⚠️ Cannot verify: face not enrolled yet');
			verifyError = 'Please enroll your face first';
			return;
		}
		if (!selectedAssessmentId) {
			addLog('⚠️ No assessment selected');
			verifyError = 'Select an assessment to verify against';
			return;
		}
		addLog(`🔐 Opening verification modal for assessment ${selectedAssessmentId}...`);
		showVerifyModal = true;
		verifyStatus = '';
		verifyError = '';
	}

	function handleVerifySuccess() {
		addLog('✅ Verification successful!');
		showVerifyModal = false;
		verifyStatus = 'VERIFIED';
		verifyError = '';
	}

	function handleVerifyCancel() {
		addLog('❌ Verification cancelled');
		showVerifyModal = false;
		verifyStatus = '';
		verifyError = '';
	}

	// ─── MONITOR HANDLERS ──────────────────────────────────────────────
	function openMonitor() {
		if (!isEnrolled) {
			addLog('⚠️ Cannot start monitor: face not enrolled yet');
			return;
		}
		addLog('👁️ Starting exam monitor...');
		showMonitor = true;
	}

	function closeMonitor() {
		addLog('⏹️ Stopping exam monitor');
		showMonitor = false;
	}

	// ─── UTILITIES ─────────────────────────────────────────────────────
	function clearLogs() {
		addLog('🗑️ Logs cleared');
		logs = logs.slice(0, 1); // Keep only the clear log
	}

	function exportLogs() {
		const logText = logs.join('\n');
		const blob = new Blob([logText], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `face-test-${Date.now()}.log`;
		a.click();
		addLog('💾 Logs exported');
	}
</script>

<svelte:head>
	<title>Face Enrollment & Verification Test</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
	<div class="max-w-6xl mx-auto">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="text-4xl font-bold text-white mb-2">🧪 Face Enrollment Test Suite</h1>
			<p class="text-slate-300">Test enrollment, verification, and proctoring monitoring</p>
			<p class="text-sm text-slate-400 mt-2">
				Logged in as <code class="bg-black/30 px-2 py-1 rounded">{data.student.firstName} {data.student.lastName}</code>
			</p>
		</div>

		<!-- Assessment selector — real assessment, drives the actual
		     AssessmentSession lookup in verify-session -->
		<div class="mb-6 rounded-xl border border-slate-700 bg-slate-800/50 backdrop-blur p-4">
			<label class="text-sm text-slate-300 block mb-1" for="assessment-select">
				Test against assessment
			</label>
			<select
				id="assessment-select"
				bind:value={selectedAssessmentId}
				class="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-white text-sm"
			>
				{#if data.assessments.length === 0}
					<option value="">No eligible assessments found</option>
				{/if}
				{#each data.assessments as a}
					<option value={a.id}>{a.type} — {a.course} — {a.title}</option>
				{/each}
			</select>
			{#if data.assessments.length === 0}
				<p class="text-xs text-slate-500 mt-2">
					You need an approved course registration with a published TEST or EXAMINATION to test verification against a real session.
				</p>
			{/if}
			{#if data.activeSessions.length > 0}
				<p class="text-xs text-slate-500 mt-2">
					You have {data.activeSessions.length} active session(s) in progress — select the matching assessment above to resume verifying against it.
				</p>
			{/if}
		</div>

		<!-- Main Grid -->
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
			<!-- Step 1: Enrollment -->
			<div class="rounded-xl border border-slate-700 bg-slate-800/50 backdrop-blur p-6">
				<div class="flex items-center gap-3 mb-4">
					<div class="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold">1</div>
					<h2 class="text-xl font-semibold text-white">Face Enrollment</h2>
				</div>

				<p class="text-sm text-slate-300 mb-4">
					Enroll your face using liveness detection with random gestures (blink, turn head, nod).
				</p>

				<div class="mb-4">
					{#if isEnrolled}
						<div class="flex items-center gap-2 text-green-400 font-medium">
							<CheckCircle2 class="size-5" />
							Enrolled
						</div>
					{:else}
						<div class="flex items-center gap-2 text-yellow-400 font-medium">
							<AlertCircle class="size-5" />
							Not enrolled
						</div>
					{/if}
				</div>

				<Button
					class="w-full"
					onclick={openEnrollModal}
					disabled={isEnrolled}
				>
					{isEnrolled ? '✓ Already Enrolled' : 'Start Enrollment'}
				</Button>

				{#if enrollError}
					<div class="mt-3 p-2 rounded bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
						{enrollError}
					</div>
				{/if}
			</div>

			<!-- Step 2: Verification -->
			<div class="rounded-xl border border-slate-700 bg-slate-800/50 backdrop-blur p-6">
				<div class="flex items-center gap-3 mb-4">
					<div class="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold">2</div>
					<h2 class="text-xl font-semibold text-white">Face Verification</h2>
				</div>

				<p class="text-sm text-slate-300 mb-4">
					Verify your enrolled face with same liveness checks. Tests if matching works correctly against a real assessment session.
				</p>

				<div class="mb-4">
					{#if verifyStatus === 'VERIFIED'}
						<div class="flex items-center gap-2 text-green-400 font-medium">
							<CheckCircle2 class="size-5" />
							Verified
						</div>
					{:else if isEnrolled}
						<div class="flex items-center gap-2 text-slate-300 font-medium">
							<Eye class="size-5" />
							Ready
						</div>
					{:else}
						<div class="flex items-center gap-2 text-slate-400 font-medium">
							<AlertCircle class="size-5" />
							Enroll first
						</div>
					{/if}
				</div>

				<Button
					class="w-full"
					onclick={openVerifyModal}
					disabled={!isEnrolled || !selectedAssessmentId}
				>
					{isEnrolled ? 'Start Verification' : 'Enroll First'}
				</Button>

				{#if verifyError}
					<div class="mt-3 p-2 rounded bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
						{verifyError}
					</div>
				{/if}
			</div>

			<!-- Step 3: Monitor -->
			<div class="rounded-xl border border-slate-700 bg-slate-800/50 backdrop-blur p-6">
				<div class="flex items-center gap-3 mb-4">
					<div class="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold">3</div>
					<h2 class="text-xl font-semibold text-white">Exam Monitor</h2>
				</div>

				<p class="text-sm text-slate-300 mb-4">
					Start the exam proctor monitor. Tracks violations: tab switches, fullscreen exit, copy/paste, etc.
				</p>

				<div class="mb-4">
					{#if showMonitor}
						<div class="flex items-center gap-2 text-orange-400 font-medium">
							<Clock class="size-5 animate-spin" />
							Monitoring
						</div>
					{:else if isEnrolled}
						<div class="flex items-center gap-2 text-slate-300 font-medium">
							<Clock class="size-5" />
							Ready
						</div>
					{:else}
						<div class="flex items-center gap-2 text-slate-400 font-medium">
							<AlertCircle class="size-5" />
							Enroll first
						</div>
					{/if}
				</div>

				{#if showMonitor}
					<Button variant="destructive" class="w-full" onclick={closeMonitor}>
						Stop Monitor
					</Button>
				{:else}
					<Button
						class="w-full"
						onclick={openMonitor}
						disabled={!isEnrolled}
					>
						{isEnrolled ? 'Start Monitor' : 'Enroll First'}
					</Button>
				{/if}
			</div>
		</div>

		<!-- Violations Reference -->
		<div class="rounded-xl border border-slate-700 bg-slate-800/50 backdrop-blur p-6 mb-6">
			<h2 class="text-xl font-semibold text-white mb-4">📋 Violations Reference</h2>

			<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
				<!-- Enabled Violations -->
				<div>
					<h3 class="text-sm font-semibold text-green-400 mb-3">✅ Currently Enabled</h3>
					<div class="space-y-2 text-sm">
						<div class="flex items-start gap-2">
							<span class="text-green-400 font-bold">🔴</span>
							<div>
								<p class="font-medium text-white">FACE_NOT_DETECTED (Critical)</p>
								<p class="text-slate-400 text-xs">No face detected for 2+ consecutive checks</p>
								<p class="text-slate-500 text-xs">Test: Look away from camera</p>
							</div>
						</div>
						<div class="flex items-start gap-2">
							<span class="text-green-400 font-bold">🔴</span>
							<div>
								<p class="font-medium text-white">FACE_MISMATCH (Critical)</p>
								<p class="text-slate-400 text-xs">Face similarity below 70%</p>
								<p class="text-slate-500 text-xs">Test: Change lighting or angle dramatically</p>
							</div>
						</div>
						<div class="flex items-start gap-2">
							<span class="text-green-400 font-bold">🔴</span>
							<div>
								<p class="font-medium text-white">MULTIPLE_FACES (Critical)</p>
								<p class="text-slate-400 text-xs">More than one face detected</p>
								<p class="text-slate-500 text-xs">Test: Have someone appear on camera</p>
							</div>
						</div>
						<div class="flex items-start gap-2">
							<span class="text-yellow-400 font-bold">🟡</span>
							<div>
								<p class="font-medium text-white">TAB_SWITCH (Warning)</p>
								<p class="text-slate-400 text-xs">Switched to another tab/window</p>
								<p class="text-slate-500 text-xs">Test: Alt+Tab or click another tab</p>
							</div>
						</div>
						<div class="flex items-start gap-2">
							<span class="text-yellow-400 font-bold">🟡</span>
							<div>
								<p class="font-medium text-white">FULLSCREEN_EXIT (Warning)</p>
								<p class="text-slate-400 text-xs">Exited fullscreen mode</p>
								<p class="text-slate-500 text-xs">Test: Press Esc key</p>
							</div>
						</div>
						<div class="flex items-start gap-2">
							<span class="text-yellow-400 font-bold">🟡</span>
							<div>
								<p class="font-medium text-white">DEVTOOLS_OPEN (Critical)</p>
								<p class="text-slate-400 text-xs">Developer tools detected</p>
								<p class="text-slate-500 text-xs">Test: Press F12 or Ctrl+Shift+I</p>
							</div>
						</div>
						<div class="flex items-start gap-2">
							<span class="text-green-500 font-bold">🟢</span>
							<div>
								<p class="font-medium text-white">COPY_ATTEMPT (Minor)</p>
								<p class="text-slate-400 text-xs">Attempted to copy text</p>
								<p class="text-slate-500 text-xs">Test: Ctrl+C (will be blocked)</p>
							</div>
						</div>
						<div class="flex items-start gap-2">
							<span class="text-green-500 font-bold">🟢</span>
							<div>
								<p class="font-medium text-white">PASTE_ATTEMPT (Minor)</p>
								<p class="text-slate-400 text-xs">Attempted to paste text</p>
								<p class="text-slate-500 text-xs">Test: Ctrl+V (will be blocked)</p>
							</div>
						</div>
						<div class="flex items-start gap-2">
							<span class="text-green-500 font-bold">🟢</span>
							<div>
								<p class="font-medium text-white">KEYBOARD_SHORTCUT (Minor)</p>
								<p class="text-slate-400 text-xs">Dangerous keyboard shortcuts blocked</p>
								<p class="text-slate-500 text-xs">Test: Ctrl+S, Ctrl+P, Ctrl+Q, etc.</p>
							</div>
						</div>
						<div class="flex items-start gap-2">
							<span class="text-green-500 font-bold">🟢</span>
							<div>
								<p class="font-medium text-white">FOCUS_LOSS (Minor)</p>
								<p class="text-slate-400 text-xs">Window lost focus</p>
								<p class="text-slate-500 text-xs">Test: Alt+Tab away (different from TAB_SWITCH)</p>
							</div>
						</div>
						<div class="flex items-start gap-2">
							<span class="text-green-500 font-bold">🟢</span>
							<div>
								<p class="font-medium text-white">IDLE_TIMEOUT (Minor)</p>
								<p class="text-slate-400 text-xs">No mouse/keyboard activity for 5 minutes</p>
								<p class="text-slate-500 text-xs">Test: Wait 5 min without interacting</p>
							</div>
						</div>
						<div class="flex items-start gap-2">
							<span class="text-green-500 font-bold">🟢</span>
							<div>
								<p class="font-medium text-white">NETWORK_DROP (Minor)</p>
								<p class="text-slate-400 text-xs">Internet connection lost</p>
								<p class="text-slate-500 text-xs">Test: Disconnect WiFi/cable (if safe)</p>
							</div>
						</div>
					</div>
				</div>

				<!-- Future Implementations -->
				<div>
					<h3 class="text-sm font-semibold text-blue-400 mb-3">💡 Could Be Implemented</h3>
					<div class="space-y-2 text-sm">
						<div class="flex items-start gap-2">
							<span class="text-blue-400 font-bold">📌</span>
							<div>
								<p class="font-medium text-white">SCREEN_RECORDING</p>
								<p class="text-slate-400 text-xs">Detect if screen is being recorded (OBS, ShareX, etc.)</p>
								<p class="text-slate-500 text-xs">Severity: Critical | Method: Canvas fingerprinting</p>
							</div>
						</div>
						<div class="flex items-start gap-2">
							<span class="text-blue-400 font-bold">📌</span>
							<div>
								<p class="font-medium text-white">EXTERNAL_MONITOR</p>
								<p class="text-slate-400 text-xs">Detect if using external display/mirror</p>
								<p class="text-slate-500 text-xs">Severity: Critical | Method: Display API detection</p>
							</div>
						</div>
						<div class="flex items-start gap-2">
							<span class="text-blue-400 font-bold">📌</span>
							<div>
								<p class="font-medium text-white">SUSPICIOUS_MOUSE</p>
								<p class="text-slate-400 text-xs">Detect non-human mouse movement patterns</p>
								<p class="text-slate-500 text-xs">Severity: Warning | Method: Movement velocity analysis</p>
							</div>
						</div>
						<div class="flex items-start gap-2">
							<span class="text-blue-400 font-bold">📌</span>
							<div>
								<p class="font-medium text-white">UNUSUAL_GAZE</p>
								<p class="text-slate-400 text-xs">Detect if eyes looking away from screen consistently</p>
								<p class="text-slate-500 text-xs">Severity: Warning | Method: Eye gaze tracking</p>
							</div>
						</div>
						<div class="flex items-start gap-2">
							<span class="text-blue-400 font-bold">📌</span>
							<div>
								<p class="font-medium text-white">HEAD_POSE_EXTREME</p>
								<p class="text-slate-400 text-xs">Detect suspicious head angles (looking down at phone)</p>
								<p class="text-slate-500 text-xs">Severity: Warning | Method: Head rotation thresholds</p>
							</div>
						</div>
						<div class="flex items-start gap-2">
							<span class="text-blue-400 font-bold">📌</span>
							<div>
								<p class="font-medium text-white">BACKGROUND_CHANGE</p>
								<p class="text-slate-400 text-xs">Detect if background changes (someone walking behind)</p>
								<p class="text-slate-500 text-xs">Severity: Minor | Method: Background segmentation</p>
							</div>
						</div>
						<div class="flex items-start gap-2">
							<span class="text-blue-400 font-bold">📌</span>
							<div>
								<p class="font-medium text-white">UNNATURAL_LIGHTING</p>
								<p class="text-slate-400 text-xs">Detect artificial face illumination (holding phone light)</p>
								<p class="text-slate-500 text-xs">Severity: Warning | Method: Lighting consistency analysis</p>
							</div>
						</div>
						<div class="flex items-start gap-2">
							<span class="text-blue-400 font-bold">📌</span>
							<div>
								<p class="font-medium text-white">RAPID_FACE_CHANGE</p>
								<p class="text-slate-400 text-xs">Detect if face descriptor changes suddenly (person swap)</p>
								<p class="text-slate-500 text-xs">Severity: Critical | Method: Embedding distance tracking</p>
							</div>
						</div>
						<div class="flex items-start gap-2">
							<span class="text-blue-400 font-bold">📌</span>
							<div>
								<p class="font-medium text-white">VIRTUAL_BACKGROUND</p>
								<p class="text-slate-400 text-xs">Detect fake/blurred backgrounds (Zoom filter)</p>
								<p class="text-slate-500 text-xs">Severity: Warning | Method: Background blur detection</p>
							</div>
						</div>
						<div class="flex items-start gap-2">
							<span class="text-blue-400 font-bold">📌</span>
							<div>
								<p class="font-medium text-white">RAPID_BLINKING</p>
								<p class="text-slate-400 text-xs">Detect unnatural blinking patterns</p>
								<p class="text-slate-500 text-xs">Severity: Minor | Method: Blink rate & pattern analysis</p>
							</div>
						</div>
						<div class="flex items-start gap-2">
							<span class="text-blue-400 font-bold">📌</span>
							<div>
								<p class="font-medium text-white">AUDIO_DETECTION</p>
								<p class="text-slate-400 text-xs">Detect suspicious background audio (other people talking)</p>
								<p class="text-slate-500 text-xs">Severity: Warning | Method: Audio spectrum analysis</p>
							</div>
						</div>
						<div class="flex items-start gap-2">
							<span class="text-blue-400 font-bold">📌</span>
							<div>
								<p class="font-medium text-white">VIRTUAL_CAMERA</p>
								<p class="text-slate-400 text-xs">Detect if using virtual camera app (Snap Camera)</p>
								<p class="text-slate-500 text-xs">Severity: Critical | Method: Anti-spoof + anomaly detection</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Severity Legend -->
			<div class="border-t border-slate-600 pt-4">
				<h3 class="text-sm font-semibold text-white mb-3">📊 Severity Levels</h3>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
					<div class="flex items-start gap-2">
						<span class="text-green-500 font-bold">🟢 Minor (1)</span>
						<p class="text-slate-400">Logged but exam continues. Multiple violations required for concern.</p>
					</div>
					<div class="flex items-start gap-2">
						<span class="text-yellow-500 font-bold">🟡 Warning (2)</span>
						<p class="text-slate-400">Violation logged. Admin review. May impact exam integrity assessment.</p>
					</div>
					<div class="flex items-start gap-2">
						<span class="text-red-500 font-bold">🔴 Critical (3)</span>
						<p class="text-slate-400">Immediate action. May auto-disqualify if multiple occur.</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Logs Section -->
		<div class="rounded-xl border border-slate-700 bg-slate-800/50 backdrop-blur p-6 mb-6">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-xl font-semibold text-white">📋 Live Logs</h2>
				<div class="flex gap-2">
					<Button variant="outline" size="sm" onclick={clearLogs}>Clear</Button>
					<Button variant="outline" size="sm" onclick={exportLogs}>Export</Button>
				</div>
			</div>

			<div class="bg-black/30 rounded-lg p-4 font-mono text-sm text-slate-300 h-48 overflow-y-auto border border-slate-700">
				{#if logs.length === 0}
					<div class="text-slate-500">No logs yet. Start with face enrollment above...</div>
				{:else}
					{#each logs as log}
						<div class="py-1 text-slate-300 hover:bg-white/5 px-2 rounded">
							{log}
						</div>
					{/each}
				{/if}
			</div>
		</div>

		<!-- Status Cards -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<div class="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
				<div class="text-sm text-slate-400 mb-1">Enrollment Status</div>
				<div class="text-lg font-semibold text-white">
					{isEnrolled ? '✅ Enrolled' : '⏳ Pending'}
				</div>
			</div>

			<div class="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
				<div class="text-sm text-slate-400 mb-1">Verification Status</div>
				<div class="text-lg font-semibold text-white">
					{verifyStatus === 'VERIFIED' ? '✅ Verified' : verifyStatus || '⏳ Not Tested'}
				</div>
			</div>

			<div class="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
				<div class="text-sm text-slate-400 mb-1">Monitor Status</div>
				<div class="text-lg font-semibold text-white">
					{showMonitor ? '🔴 Active' : '⏸️ Inactive'}
				</div>
			</div>
		</div>
	</div>
</div>

<!-- ─── MODALS ─────────────────────────────────────────────────────────── -->

<!-- Enrollment Modal -->
{#if showEnrollModal}
	<div style="position: fixed; inset: 0; z-index: 40;">
		<FaceEnrollModal
			onSuccess={handleEnrollSuccess}
			onCancel={handleEnrollCancel}
		/>
	</div>
{/if}

<!-- Verification Modal -->
{#if showVerifyModal}
	<div style="position: fixed; inset: 0; z-index: 40;">
		<FaceVerifyModal
			examId={selectedAssessmentId}
			onSuccess={handleVerifySuccess}
			onCancel={handleVerifyCancel}
		/>
	</div>
{/if}

<!-- Exam Monitor -->
{#if showMonitor}
	<ExamMonitor sessionId={selectedAssessmentId} />
{/if}