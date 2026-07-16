<!-- src/routes/(student)/student/tests/[sessionId]/+page@.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte'
	import { enhance } from '$app/forms'
	import { toast } from 'svelte-sonner'
	import { Button } from '$lib/components/ui/button/index.js'
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js'
	import { Checkbox } from '$lib/components/ui/checkbox/index.js'
	import { RadioGroup, RadioGroupItem } from '$lib/components/ui/radio-group/index.js'
	import { Textarea } from '$lib/components/ui/textarea/index.js'
	import { Input } from '$lib/components/ui/input/index.js'
	import { Badge } from '$lib/components/ui/badge/index.js'
	import FaceVerifyModal from '$lib/components/exam/FaceVerifyModal.svelte'
	import DeviceCheckPanel from '$lib/components/exam/DeviceCheckPanel.svelte'
	import AlertCircle from '@lucide/svelte/icons/alert-circle'
	import Clock from '@lucide/svelte/icons/clock'
	import ArrowLeft from '@lucide/svelte/icons/arrow-left'
	import ArrowRight from '@lucide/svelte/icons/arrow-right'
	import ArrowUp from '@lucide/svelte/icons/arrow-up'
	import ArrowDown from '@lucide/svelte/icons/arrow-down'
	import RotateCw from '@lucide/svelte/icons/rotate-cw'
	import ExamMonitor from '$lib/components/exam/ExamMonitor.svelte'
	import type { PageData } from './$types'

	let { data }: { data: PageData } = $props()

	type Step = 'lobby' | 'attempts' | 'terms' | 'faceverify' | 'kiosk' | 'closed'

	function initialStep(): Step {
		if (['SUBMITTED', 'TIMED_OUT', 'DISQUALIFIED'].includes(data.status)) return 'closed'
		if (data.status === 'IN_PROGRESS' || data.status === 'PAUSED') {
			if (data.needsReverify) return 'faceverify'
			return 'kiosk'
		}
		if (data.attemptInfo.attemptNumber > 1 && data.attemptInfo.previousAttempts.length > 0) {
			return data.attemptInfo.allowRetakes ? 'attempts' : 'lobby'
		}
		return 'lobby'
	}

	let step = $state<Step>(initialStep())
	let termsAccepted = $state(Boolean(data.termsAcceptedAt))
	let devicePassed = $state(false)
	let submitError = $state<string | null>(null)

	// ─── Hidden form refs (enhance-based server actions) ─────────────────────
	// Using requestSubmit() on these keeps us in SvelteKit's action system
	// (correct URL, CSRF token, no manual fetch) while letting step advancement
	// happen client-side in the enhance callback — no full page reload.
	let acceptTermsForm = $state<HTMLFormElement | null>(null)
	let markFaceVerifiedForm = $state<HTMLFormElement | null>(null)
	let submittingTerms = $state(false)
	let submittingFace = $state(false)

	const NUMBER_SIZE_CLASS = 'size-12 text-base font-bold'
	const NUMBER_SIZE_CLASS_MOBILE = 'size-10 shrink-0 text-sm font-bold'

	// ─── Kiosk state ─────────────────────────────────────────────────────────
	let questions = $state(data.questions.map((q) => ({ ...q })))
	let currentIndex = $state(0)
	let remainingSeconds = $state(data.timeRemainingSeconds ?? data.assessment.durationMinutes * 60)
	let isSubmitting = $state(false)
	let showSubmitConfirm = $state(false)

	let timerInterval: ReturnType<typeof setInterval> | null = null
	let syncInterval: ReturnType<typeof setInterval> | null = null
	let saveTimers = new Map<string, ReturnType<typeof setTimeout>>()
	let questionNavRef = $state<HTMLDivElement | null>(null)

	const currentQuestion = $derived(questions[currentIndex])
	const answeredCount = $derived(
		questions.filter((q) => {
			if (q.type === 'ESSAY' || q.type === 'FILL_BLANK') return q.textAnswer.trim().length > 0
			if (q.type === 'MULTIPLE_CHOICE' || q.type === 'SINGLE_CHOICE' || q.type === 'TRUE_FALSE')
				return q.selectedOptions.length > 0
			if (q.type === 'MATCHING') return Object.keys(q.matchAnswer).length > 0
			return true
		}).length
	)
	const allAnswered = $derived(answeredCount === questions.length)

	function isQuestionAnswered(q: (typeof questions)[number]) {
		if (q.type === 'ESSAY' || q.type === 'FILL_BLANK') return q.textAnswer.trim().length > 0
		if (q.type === 'MATCHING') return Object.keys(q.matchAnswer).length > 0
		if (q.type === 'ORDERING') return true
		return q.selectedOptions.length > 0
	}

	function formatTime(totalSeconds: number) {
		const m = Math.floor(totalSeconds / 60)
		const s = totalSeconds % 60
		return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
	}

	// ─── Attempt management ──────────────────────────────────────────────────
	function proceedFromAttempts() {
		step = 'lobby'
	}

	function proceedToTerms() {
		if (!devicePassed) {
			toast.error('All device checks (camera, microphone, location) must pass before continuing')
			return
		}
		step = 'terms'
	}

	// Called when student clicks "Continue" on the terms step.
	// Submits the hidden ?/acceptTerms form via SvelteKit enhance — the enhance
	// callback advances the step once the server confirms.
	function proceedFromTerms() {
		if (!termsAccepted) {
			toast.error('You must accept the rules to continue')
			return
		}
		if (submittingTerms) return
		submittingTerms = true
		acceptTermsForm?.requestSubmit()
	}

	async function enterKiosk() {
		// requestFullscreen must fire synchronously before any await so the
		// browser still considers it user-gesture-initiated.
		requestFullscreen()

		try {
			const res = await fetch(`/api/assessment/session/${data.sessionId}/start`, { method: 'POST' })
			if (!res.ok) {
				const body = await res.json().catch(() => ({}))
				throw new Error(body?.message ?? 'Could not start the session')
			}
			const body = await res.json()
			if (body.expiresAt) {
				remainingSeconds = Math.max(
					0,
					Math.floor((new Date(body.expiresAt).getTime() - Date.now()) / 1000)
				)
			}
			step = 'kiosk'
			startTimers()
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to start session')
		}
	}

	function onFaceVerifySuccess() {
		// Same reasoning — fire fullscreen synchronously first.
		requestFullscreen()

		if (data.status === 'IN_PROGRESS' || data.status === 'PAUSED') {
			step = 'kiosk'
			startTimers()
		} else {
			enterKiosk()
		}
	}

	// Called from FaceVerifyModal once the client-side Human.js check passes.
	// Stamps faceVerifiedAt on the session then advances to the kiosk.
	function onFaceVerified() {
		if (submittingFace) return
		submittingFace = true
		markFaceVerifiedForm?.requestSubmit()
	}

	function onFaceVerifyCancel() {
		step = 'terms'
	}

	// ─── Fullscreen + violation logging ──────────────────────────────────────
	async function logViolation(type: string, severity = 1, metadata: Record<string, unknown> = {}) {
		try {
			await fetch(`/api/assessment/session/${data.sessionId}/violation`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ type, severity, metadata }),
			})
		} catch {
			// best-effort; never block the exam on a logging failure
		}
	}

	function requestFullscreen() {
		document.documentElement.requestFullscreen?.().catch(() => {
			toast.warning('Fullscreen could not be enabled — this may be logged as a violation')
		})
	}

	function handleFullscreenChange() {
		if (step === 'kiosk' && !document.fullscreenElement && data.assessment.fullscreenRequired) {
			logViolation('FULLSCREEN_EXIT', 2)
			toast.warning('You exited fullscreen mode — this has been logged')
		}
	}

	function handleVisibilityChange() {
		if (step === 'kiosk' && document.visibilityState === 'hidden') {
			logViolation('TAB_SWITCH', 2)
		}
	}

	function handleCopy(e: ClipboardEvent) {
		if (step === 'kiosk') {
			e.preventDefault()
			logViolation('COPY_ATTEMPT', 1)
		}
	}

	function handlePaste(e: ClipboardEvent) {
		if (step === 'kiosk') {
			e.preventDefault()
			logViolation('PASTE_ATTEMPT', 1)
		}
	}

	function isTypingTarget(target: EventTarget | null) {
		if (!(target instanceof HTMLElement)) return false
		const tag = target.tagName
		return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
	}

	function handleKioskShortcut(e: KeyboardEvent) {
		if (step !== 'kiosk' || !currentQuestion) return
		if (isTypingTarget(e.target)) return
		if (e.ctrlKey || e.metaKey || e.altKey) return

		const key = e.key.toLowerCase()

		if (showSubmitConfirm) {
			if (key === 'y') { e.preventDefault(); confirmSubmit() }
			else if (key === 'r') { e.preventDefault(); showSubmitConfirm = false }
			return
		}

		const letterIndex = { a: 0, b: 1, c: 2, d: 3 }[key]
		if (letterIndex !== undefined && currentQuestion.options?.[letterIndex]) {
			e.preventDefault()
			const optId = currentQuestion.options[letterIndex].id
			if (currentQuestion.type === 'MULTIPLE_CHOICE') toggleMultiple(optId)
			else if (currentQuestion.type === 'SINGLE_CHOICE' || currentQuestion.type === 'TRUE_FALSE')
				selectSingle(optId)
			return
		}

		if (key === 'n') { e.preventDefault(); goTo(currentIndex + 1) }
		else if (key === 'p') { e.preventDefault(); goTo(currentIndex - 1) }
		else if (key === 'y') { e.preventDefault(); openSubmitConfirm() }
	}

	const syncIntervalMs = 20_000 + Math.random() * 5_000

	function startTimers() {
		timerInterval = setInterval(() => {
			remainingSeconds = Math.max(0, remainingSeconds - 1)
			if (remainingSeconds === 0) {
				clearInterval(timerInterval!)
				handleSubmit(true)
			}
		}, 1000)

		syncInterval = setInterval(async () => {
			try {
				const res = await fetch(`/api/assessment/session/${data.sessionId}/timer`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ clientRemainingSeconds: remainingSeconds }),
				})
				const body = await res.json().catch(() => null)
				if (body?.expired) {
					handleSubmit(true)
				} else if (typeof body?.serverRemainingSeconds === 'number') {
					remainingSeconds = body.serverRemainingSeconds
				}
			} catch {
				// best-effort sync; local countdown keeps running regardless
			}
		}, syncIntervalMs)
	}

	function stopTimers() {
		if (timerInterval) clearInterval(timerInterval)
		if (syncInterval) clearInterval(syncInterval)
	}

	function scheduleSave(questionId: string) {
		const existing = saveTimers.get(questionId)
		if (existing) clearTimeout(existing)
		saveTimers.set(questionId, setTimeout(() => saveAnswer(questionId), 600))
	}

	async function saveAnswer(questionId: string) {
		const q = questions.find((x) => x.questionId === questionId)
		if (!q) return
		try {
			await fetch(`/api/assessment/session/${data.sessionId}/answer`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					questionId,
					selectedOptions: q.selectedOptions,
					textAnswer: q.textAnswer,
					orderAnswer: q.orderAnswer,
					matchAnswer: q.matchAnswer,
				}),
			})
		} catch {
			// best-effort; final submit captures latest state
		}
	}

	function selectSingle(optionId: string) {
		currentQuestion.selectedOptions = [optionId]
		scheduleSave(currentQuestion.questionId)
	}

	function toggleMultiple(optionId: string) {
		const set = new Set(currentQuestion.selectedOptions)
		if (set.has(optionId)) set.delete(optionId)
		else set.add(optionId)
		currentQuestion.selectedOptions = [...set]
		scheduleSave(currentQuestion.questionId)
	}

	function updateText(value: string) {
		currentQuestion.textAnswer = value
		scheduleSave(currentQuestion.questionId)
	}

	function moveOrderItem(index: number, direction: -1 | 1) {
		const arr = [...currentQuestion.orderAnswer]
		const target = index + direction
		if (target < 0 || target >= arr.length) return
		;[arr[index], arr[target]] = [arr[target], arr[index]]
		currentQuestion.orderAnswer = arr
		scheduleSave(currentQuestion.questionId)
	}

	function optionBody(optionId: string) {
		return currentQuestion.options.find((o) => o.id === optionId)?.body ?? optionId
	}

	function updateMatch(leftBody: string, rightOptionId: string) {
		currentQuestion.matchAnswer = { ...currentQuestion.matchAnswer, [leftBody]: rightOptionId }
		scheduleSave(currentQuestion.questionId)
	}

	function goTo(index: number) {
		if (index >= 0 && index < questions.length) currentIndex = index
	}

	function openSubmitConfirm() {
		showSubmitConfirm = true
	}

	function confirmSubmit() {
		showSubmitConfirm = false
		handleSubmit(false)
	}

	async function handleSubmit(auto = false) {
		if (isSubmitting) return
		isSubmitting = true
		submitError = null
		stopTimers()

		const MAX_ATTEMPTS = 3
		const RETRY_DELAY_MS = 1500

		for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
			try {
				const res = await fetch(`/api/assessment/session/${data.sessionId}/submit`, { method: 'POST' })
				if (!res.ok) throw new Error(`Submission failed (${res.status})`)

				if (document.fullscreenElement) {
					await document.exitFullscreen?.().catch(() => {})
				}
				window.location.href = `/student/tests/${data.sessionId}/result`
				return
			} catch (err) {
				console.error(`Submission attempt ${attempt} failed:`, err)
				if (attempt < MAX_ATTEMPTS) {
					await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
					continue
				}
				isSubmitting = false
				submitError =
					'We could not submit your test after several attempts. Your answers are saved — please check your connection and try again.'
				return
			}
		}
	}

	// Keep the active question button scrolled into view on the mobile strip
	$effect(() => {
		if (step !== 'kiosk') return
		const idx = currentIndex
		if (!questionNavRef) return
		const btn = questionNavRef.querySelectorAll('button')[idx] as HTMLElement | undefined
		btn?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
	})

	onMount(() => {
		document.addEventListener('fullscreenchange', handleFullscreenChange)
		document.addEventListener('visibilitychange', handleVisibilityChange)
		document.addEventListener('copy', handleCopy)
		document.addEventListener('paste', handlePaste)
		document.addEventListener('keydown', handleKioskShortcut)

		if (step === 'kiosk') {
			startTimers()
			if (!document.fullscreenElement) requestFullscreen()
		}
	})

	onDestroy(() => {
		stopTimers()
		if (typeof document !== 'undefined') {
			document.removeEventListener('fullscreenchange', handleFullscreenChange)
			document.removeEventListener('visibilitychange', handleVisibilityChange)
			document.removeEventListener('copy', handleCopy)
			document.removeEventListener('paste', handlePaste)
			document.removeEventListener('keydown', handleKioskShortcut)
		}
	})
</script>

<svelte:head>
	<title>{data.assessment.title} — EAPS</title>
</svelte:head>

<!--
	Hidden forms — no UI. We call requestSubmit() on them programmatically so
	SvelteKit enhance intercepts the POST and we stay on the same page (no
	full reload, no 405).
-->
<form
	bind:this={acceptTermsForm}
	method="POST"
	action="?/acceptTerms"
	class="hidden"
	use:enhance={() => {
		return async ({ result }) => {
			submittingTerms = false
			if (result.type === 'success' || result.type === 'redirect') {
				if (data.assessment.requireFaceVerify && !data.faceVerifiedAt) {
					if (!data.faceEnrolled) {
						toast.error('You must enroll your face before taking this assessment')
						return
					}
					step = 'faceverify'
				} else {
					enterKiosk()
				}
			} else {
				toast.error('Could not save your acceptance — please try again')
			}
		}
	}}
></form>

<form
	bind:this={markFaceVerifiedForm}
	method="POST"
	action="?/markFaceVerified"
	class="hidden"
	use:enhance={() => {
		return async ({ result }) => {
			submittingFace = false
			if (result.type === 'success' || result.type === 'redirect') {
				onFaceVerifySuccess()
			} else {
				toast.error('Face verification could not be saved — please try again')
			}
		}
	}}
></form>

{#if step === 'closed'}
	<div class="flex min-h-screen items-center justify-center p-6">
		<Card class="max-w-md">
			<CardContent class="flex flex-col items-center gap-3 py-10 text-center">
				<AlertCircle class="size-10 text-muted-foreground" />
				<h2 class="text-lg font-semibold">This session is closed</h2>
				<p class="text-sm text-muted-foreground">
					This attempt has already been {data.status.toLowerCase().replace('_', ' ')}.
				</p>
				<Button href={`/student/tests/${data.sessionId}/result`}>View Result</Button>
			</CardContent>
		</Card>
	</div>

{:else if step === 'attempts'}
	<div class="mx-auto flex min-h-screen max-w-3xl flex-col justify-center p-6">
		<Card>
			<CardHeader>
				<CardTitle>Previous Attempts</CardTitle>
				<CardDescription>Review your previous submissions before continuing</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="rounded-lg bg-muted/50 p-4">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm font-medium">Attempt {data.attemptInfo.attemptNumber}</p>
							<p class="text-xs text-muted-foreground">
								{data.attemptInfo.attemptsRemaining !== null
									? `${data.attemptInfo.attemptsRemaining} of ${data.attemptInfo.maxAttempts} remaining`
									: 'Unlimited attempts'}
							</p>
						</div>
						<RotateCw class="size-5 text-primary" />
					</div>
				</div>

				<div class="space-y-2">
					<h3 class="text-sm font-semibold">Your Previous Submissions</h3>
					<div class="rounded-lg border">
						<table class="w-full text-sm">
							<thead class="border-b bg-muted/50">
								<tr>
									<th class="p-3 text-left">Attempt</th>
									<th class="p-3 text-left">Date &amp; Time</th>
									<th class="p-3 text-center">Status</th>
									<th class="p-3 text-right">Score</th>
									<th class="p-3 text-center">Action</th>
								</tr>
							</thead>
							<tbody>
								{#each data.attemptInfo.previousAttempts as attempt, i (attempt.id)}
									<tr class="border-b last:border-0">
										<td class="p-3 font-medium">Attempt {i + 1}</td>
										<td class="p-3 text-muted-foreground">
											{new Date(attempt.submittedAt || Date.now()).toLocaleString()}
										</td>
										<td class="p-3 text-center">
											<Badge variant={attempt.status === 'SUBMITTED' ? 'default' : 'secondary'}>
												{attempt.status === 'SUBMITTED' ? 'Completed' : attempt.status.replace('_', ' ')}
											</Badge>
										</td>
										<td class="p-3 text-right font-semibold">
											{attempt.result?.isReleased ? `${attempt.result.percentage?.toFixed(1)}%` : 'N/A'}
										</td>
										<td class="p-3 text-center">
											<Button variant="outline" size="sm" href={`/student/tests/${attempt.id}/result`}>
												View
											</Button>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>

				<Button class="w-full" onclick={proceedFromAttempts}>
					<RotateCw class="mr-2 size-4" />
					Start New Attempt
				</Button>
			</CardContent>
		</Card>
	</div>

{:else if step === 'lobby'}
	<div class="mx-auto flex min-h-screen max-w-lg flex-col justify-center p-6">
		<Card>
			<CardHeader>
				<CardTitle>Verify your details</CardTitle>
				<CardDescription>Confirm your information and device before continuing</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				{#if data.attemptInfo.attemptNumber > 1}
					<div class="rounded-lg bg-blue-50 p-3 dark:bg-blue-950/30">
						<p class="text-sm font-medium text-blue-900 dark:text-blue-100">
							Attempt {data.attemptInfo.attemptNumber} of {data.attemptInfo.maxAttempts || '∞'}
						</p>
						{#if data.attemptInfo.attemptsRemaining !== null && data.attemptInfo.attemptsRemaining <= 2}
							<p class="mt-1 text-xs text-blue-800 dark:text-blue-200">
								{data.attemptInfo.attemptsRemaining} attempt{data.attemptInfo.attemptsRemaining === 1 ? '' : 's'} remaining
							</p>
						{/if}
					</div>
				{/if}

				<div class="rounded-lg border p-4 text-sm">
					<div class="flex justify-between py-1"><span class="text-muted-foreground">Test</span><span class="font-medium">{data.assessment.title}</span></div>
					<div class="flex justify-between py-1"><span class="text-muted-foreground">Course</span><span class="font-medium">{data.assessment.course.code} — {data.assessment.course.title}</span></div>
					<div class="flex justify-between py-1"><span class="text-muted-foreground">Duration</span><span class="font-medium">{data.assessment.durationMinutes} minutes</span></div>
					<div class="flex justify-between py-1"><span class="text-muted-foreground">Questions</span><span class="font-medium">{data.assessment.questionCount}</span></div>
					<div class="flex justify-between py-1"><span class="text-muted-foreground">Total marks</span><span class="font-medium">{data.assessment.totalMarks}</span></div>
				</div>

				<DeviceCheckPanel
					requireFaceVerify={data.assessment.requireFaceVerify}
					bind:allPassed={devicePassed}
				/>

				<Button class="w-full" onclick={proceedToTerms} disabled={!devicePassed}>
					Continue
				</Button>
			</CardContent>
		</Card>
	</div>

{:else if step === 'terms'}
	<div class="mx-auto flex min-h-screen max-w-lg flex-col justify-center p-6">
		<Card>
			<CardHeader>
				<CardTitle>Rules &amp; Regulations</CardTitle>
				<CardDescription>Read carefully before starting</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="max-h-[320px] overflow-y-auto rounded-lg border p-4 text-sm space-y-2">
					<p>By starting this test, you agree to the following:</p>
					<ul class="list-disc pl-5 space-y-1 text-muted-foreground">
						<li>You will remain alone and unassisted for the full duration.</li>
						<li>You will not leave fullscreen mode, switch tabs, or use another device.</li>
						<li>You will not copy, paste, or share test content.</li>
						<li>Your camera must remain on if face verification is required.</li>
						<li>Violations may be logged and can result in disqualification.</li>
					</ul>
					{#if data.assessment.instructions}
						<p class="pt-2 font-medium text-foreground">Additional instructions from your lecturer:</p>
						<p class="text-muted-foreground">{data.assessment.instructions}</p>
					{/if}
				</div>

				<label class="flex items-start gap-2 text-sm">
					<Checkbox checked={termsAccepted} onCheckedChange={(v) => (termsAccepted = !!v)} class="mt-0.5" />
					<span>I have read and agree to the rules above.</span>
				</label>

				<Button class="w-full" onclick={proceedFromTerms} disabled={!termsAccepted || submittingTerms}>
					{submittingTerms ? 'Saving…' : 'Continue'}
				</Button>
			</CardContent>
		</Card>
	</div>

{:else if step === 'faceverify'}
	<FaceVerifyModal
		examId={data.assessment.id}
		onSuccess={onFaceVerified}
		onCancel={onFaceVerifyCancel}
	/>

{:else if step === 'kiosk' && currentQuestion}
	<div class="flex min-h-screen flex-col">
		<div class="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
			<div class="flex items-center justify-between px-4 py-3 md:px-6">
				<div class="min-w-0">
					<p class="truncate text-sm font-semibold">{data.assessment.title}</p>
					<p class="truncate text-xs text-muted-foreground">
						{data.assessment.course.code} · {answeredCount}/{questions.length} answered
						{#if data.attemptInfo.attemptNumber > 1}
							· Attempt {data.attemptInfo.attemptNumber}
						{/if}
					</p>
				</div>
				<div class="flex shrink-0 items-center gap-3">
					<div class="flex items-center gap-2 font-mono text-lg font-bold {remainingSeconds < 60 ? 'text-destructive' : ''}">
						<Clock class="size-5" />
						{formatTime(remainingSeconds)}
					</div>
				</div>
			</div>

			<!-- Mobile question number strip — horizontally scrollable, always visible -->
			<div
				bind:this={questionNavRef}
				class="flex gap-2 overflow-x-auto border-t px-4 py-2 md:hidden"
			>
				{#each questions as q, i (q.questionId)}
					<button
						type="button"
						onclick={() => goTo(i)}
						class="flex items-center justify-center rounded-md border font-semibold {NUMBER_SIZE_CLASS_MOBILE}
							{i === currentIndex ? 'border-primary bg-primary text-primary-foreground' : isQuestionAnswered(q) ? 'border-primary/40 bg-primary/10' : 'border-border'}"
					>
						{i + 1}
					</button>
				{/each}
			</div>
		</div>

		<div class="flex flex-1">
			<aside class="hidden w-56 shrink-0 border-r p-4 md:block">
				<div class="grid grid-cols-5 gap-2">
					{#each questions as q, i (q.questionId)}
						<button
							type="button"
							onclick={() => goTo(i)}
							class="flex items-center justify-center rounded-md border font-semibold {NUMBER_SIZE_CLASS}
								{i === currentIndex ? 'border-primary bg-primary text-primary-foreground' : isQuestionAnswered(q) ? 'border-primary/40 bg-primary/10' : 'border-border'}"
						>
							{i + 1}
						</button>
					{/each}
				</div>
				<p class="mt-4 text-[11px] leading-relaxed text-muted-foreground">
					Shortcuts: A–D select an option, N next, P previous, Y submit, R cancel.
				</p>
			</aside>

			<main class="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
				<div>
					<p class="text-sm font-medium uppercase tracking-wide text-muted-foreground">
						Question {currentIndex + 1} of {questions.length} · {currentQuestion.marks} mark{currentQuestion.marks === 1 ? '' : 's'}
					</p>
					<p class="mt-3 text-2xl font-semibold leading-relaxed">{currentQuestion.body}</p>
				</div>

				{#if currentQuestion.type === 'SINGLE_CHOICE' || currentQuestion.type === 'TRUE_FALSE'}
					<RadioGroup value={currentQuestion.selectedOptions[0] ?? ''} onValueChange={selectSingle} class="space-y-3">
						{#each currentQuestion.options as opt, i (opt.id)}
							<label class="flex items-center gap-3 rounded-lg border-2 p-4 cursor-pointer transition-all {currentQuestion.selectedOptions.includes(opt.id) ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50 hover:bg-muted/40'}">
								<RadioGroupItem value={opt.id} />
								<span class="flex size-6 shrink-0 items-center justify-center rounded border font-bold text-sm">
									{String.fromCharCode(65 + i)}
								</span>
								<span class="text-base font-medium">{opt.body}</span>
							</label>
						{/each}
					</RadioGroup>

				{:else if currentQuestion.type === 'MULTIPLE_CHOICE'}
					<div class="space-y-3">
						{#each currentQuestion.options as opt, i (opt.id)}
							<label class="flex items-center gap-3 rounded-lg border-2 p-4 cursor-pointer transition-all {currentQuestion.selectedOptions.includes(opt.id) ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50 hover:bg-muted/40'}">
								<Checkbox
									checked={currentQuestion.selectedOptions.includes(opt.id)}
									onCheckedChange={() => toggleMultiple(opt.id)}
								/>
								<span class="flex size-6 shrink-0 items-center justify-center rounded border font-bold text-sm">
									{String.fromCharCode(65 + i)}
								</span>
								<span class="text-base font-medium">{opt.body}</span>
							</label>
						{/each}
					</div>

				{:else if currentQuestion.type === 'FILL_BLANK'}
					<Input
						value={currentQuestion.textAnswer}
						oninput={(e) => updateText((e.currentTarget as HTMLInputElement).value)}
						placeholder="Type your answer"
						class="text-lg p-3 h-12"
					/>

				{:else if currentQuestion.type === 'ESSAY'}
					<Textarea
						value={currentQuestion.textAnswer}
						oninput={(e) => updateText((e.currentTarget as HTMLTextAreaElement).value)}
						rows={10}
						placeholder="Write your answer here"
						class="text-lg p-3"
					/>

				{:else if currentQuestion.type === 'ORDERING'}
					<div class="space-y-2">
						{#each currentQuestion.orderAnswer as optId, i (optId)}
							<div class="flex items-center gap-3 rounded-lg border p-3">
								<span class="w-6 text-sm font-semibold text-muted-foreground">{i + 1}</span>
								<span class="flex-1 text-base font-medium">{optionBody(optId)}</span>
								<Button variant="ghost" size="sm" class="h-7 w-7 p-0" onclick={() => moveOrderItem(i, -1)} disabled={i === 0}>
									<ArrowUp class="size-3.5" />
								</Button>
								<Button variant="ghost" size="sm" class="h-7 w-7 p-0" onclick={() => moveOrderItem(i, 1)} disabled={i === currentQuestion.orderAnswer.length - 1}>
									<ArrowDown class="size-3.5" />
								</Button>
							</div>
						{/each}
					</div>

				{:else if currentQuestion.type === 'MATCHING'}
					<div class="space-y-2">
						{#each currentQuestion.leftItems ?? [] as leftBody (leftBody)}
							<div class="flex items-center gap-3 rounded-lg border p-3">
								<span class="flex-1 text-base font-medium">{leftBody}</span>
								<select
									class="h-10 rounded-md border border-input bg-background px-2 text-base font-medium"
									value={currentQuestion.matchAnswer[leftBody] ?? ''}
									onchange={(e) => updateMatch(leftBody, (e.currentTarget as HTMLSelectElement).value)}
								>
									<option value="" disabled>Match to…</option>
									{#each currentQuestion.options as opt (opt.id)}
										<option value={opt.id}>{opt.body}</option>
									{/each}
								</select>
							</div>
						{/each}
					</div>
				{/if}

				<div class="mt-auto flex items-center justify-between gap-2 pt-4">
					<Button variant="outline" onclick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0} class="text-base">
						<ArrowLeft class="mr-2 size-4" /> Previous <span class="ml-1 hidden text-[10px] opacity-60 sm:inline">(P)</span>
					</Button>

					<div class="flex items-center gap-2">
						{#if allAnswered || currentIndex === questions.length - 1}
							<Button onclick={openSubmitConfirm} disabled={isSubmitting} class="text-base font-semibold">
								{isSubmitting ? 'Submitting…' : 'Submit Test'} <span class="ml-1 hidden text-[10px] opacity-70 sm:inline">(Y)</span>
							</Button>
						{/if}
						{#if currentIndex < questions.length - 1}
							<Button variant={allAnswered ? 'outline' : 'default'} onclick={() => goTo(currentIndex + 1)} class="text-base">
								Next <ArrowRight class="ml-2 size-4" /> <span class="ml-1 hidden text-[10px] opacity-60 sm:inline">(N)</span>
							</Button>
						{/if}
					</div>
				</div>
			</main>
		</div>

		<!-- ExamMonitor mounts exactly once. It positions its own camera/alert/status
		     panel with fixed CSS internally (see ExamMonitor.svelte), sitting clear
		     of the bottom Previous/Next row on mobile and bottom-right on desktop.
		     Do not add a second instance elsewhere on this page — each mount opens
		     its own camera + mic stream, and two competing instances is what caused
		     the "camera unavailable" full-screen lock overlay to appear over the
		     question controls. -->
		<ExamMonitor sessionId={data.sessionId} />

		{#if showSubmitConfirm}
			<div class="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
				<div class="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
					<h3 class="text-base font-semibold">Submit your test?</h3>
					<p class="mt-1 text-sm text-muted-foreground">
						You've answered {answeredCount} of {questions.length} question{questions.length === 1 ? '' : 's'}.
						{#if answeredCount < questions.length}
							Unanswered questions will be marked as blank.
						{/if}
						This can't be undone.
					</p>
					<div class="mt-5 flex gap-2">
						<Button variant="outline" class="flex-1" onclick={() => (showSubmitConfirm = false)}>
							No <span class="ml-1 text-[10px] opacity-60">(R)</span>
						</Button>
						<Button class="flex-1" onclick={confirmSubmit} disabled={isSubmitting}>
							{isSubmitting ? 'Submitting…' : 'Yes, submit'} <span class="ml-1 text-[10px] opacity-70">(Y)</span>
						</Button>
					</div>
				</div>
			</div>
		{/if}

		{#if submitError}
			<div class="fixed inset-x-0 bottom-0 z-50 border-t border-destructive/30 bg-destructive/10 px-6 py-4">
				<div class="mx-auto flex max-w-3xl items-center justify-between gap-4">
					<div class="flex items-start gap-2 text-sm text-destructive">
						<AlertCircle class="mt-0.5 size-4 shrink-0" />
						<span>{submitError}</span>
					</div>
					<Button size="sm" onclick={() => handleSubmit(false)} disabled={isSubmitting}>
						{isSubmitting ? 'Retrying…' : 'Retry Submit'}
					</Button>
				</div>
			</div>
		{/if}
	</div>
{/if}