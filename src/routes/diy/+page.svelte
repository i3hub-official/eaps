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

	// ✅ MUST use $state for reactive updates in Svelte 5
	let showEnrollModal = $state(false);
	let showVerifyModal = $state(false);
	let showMonitor = $state(false);

	let enrollStatus = $state('');
	let enrollError = $state('');
	let verifyStatus = $state('');
	let verifyError = $state('');
	let isEnrolled = $state(false);
	let logs = $state<string[]>([]);

	const testSessionId = 'test-session-' + Date.now();

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
		addLog('🔐 Opening verification modal...');
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

<div class="min-h-screen bg-linear-to-br from-slate-900 to-slate-800 p-6">
	<div class="max-w-6xl mx-auto">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="text-4xl font-bold text-white mb-2">🧪 Face Enrollment Test Suite</h1>
			<p class="text-slate-300">Test enrollment, verification, and proctoring monitoring</p>
			<p class="text-sm text-slate-400 mt-2">Session ID: <code class="bg-black/30 px-2 py-1 rounded">{testSessionId}</code></p>
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
					Verify your enrolled face with same liveness checks. Tests if matching works correctly.
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
					disabled={!isEnrolled}
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
			examId={testSessionId}
			onSuccess={handleVerifySuccess}
			onCancel={handleVerifyCancel}
		/>
	</div>
{/if}

<!-- Exam Monitor -->
{#if showMonitor}
	<ExamMonitor sessionId={testSessionId} />
{/if}
