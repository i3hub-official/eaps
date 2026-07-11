<!-- src/routes/(student)/student/tests/[sessionId]/+page.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte'
	import { goto } from '$app/navigation'
	import { toast } from 'svelte-sonner'
	import { Button } from '$lib/components/ui/button/index.js'
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js'
	import { Badge } from '$lib/components/ui/badge/index.js'
	import { Checkbox } from '$lib/components/ui/checkbox/index.js'
	import { RadioGroup, RadioGroupItem } from '$lib/components/ui/radio-group/index.js'
	import { Textarea } from '$lib/components/ui/textarea/index.js'
	import { Input } from '$lib/components/ui/input/index.js'
	import FaceVerifyModal from '$lib/components/exam/FaceVerifyModal.svelte'
	import Camera from '@lucide/svelte/icons/camera'
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2'
	import AlertCircle from '@lucide/svelte/icons/alert-circle'
	import Clock from '@lucide/svelte/icons/clock'
	import ArrowLeft from '@lucide/svelte/icons/arrow-left'
	import ArrowRight from '@lucide/svelte/icons/arrow-right'
	import ArrowUp from '@lucide/svelte/icons/arrow-up'
	import ArrowDown from '@lucide/svelte/icons/arrow-down'
	import ExamMonitor from '$lib/components/exam/ExamMonitor.svelte'

	let { data } = $props()

	type Step = 'lobby' | 'terms' | 'faceverify' | 'kiosk' | 'closed'

	// Sessions that are already IN_PROGRESS/PAUSED skip straight to the
	// kiosk (reconnect/resume) — UNLESS the server flagged needsReverify
	// (idle too long since last activity), in which case face verification
	// runs again before re-entering the kiosk. Terminal sessions never reach
	// this component — the server loader redirects those to /result — but
	// 'closed' is kept as a defensive fallback in case status flips under us
	// mid-kiosk (e.g. a background disqualification).
	function initialStep(): Step {
		if (['SUBMITTED', 'TIMED_OUT', 'DISQUALIFIED'].includes(data.status)) return 'closed'
		if (data.status === 'IN_PROGRESS' || data.status === 'PAUSED') {
			if (data.needsReverify) return 'faceverify'
			return 'kiosk'
		}
		return 'lobby'
	}

	let step = $state<Step>(initialStep())
	let termsAccepted = $state(Boolean(data.termsAcceptedAt))
	let cameraChecked = $state(false)
	let cameraError = $state('')

	// ─── Kiosk state ─────────────────────────────────────────────────────────
	let questions = $state(data.questions.map((q) => ({ ...q })))
	let currentIndex = $state(0)
	let remainingSeconds = $state(data.timeRemainingSeconds ?? data.assessment.durationMinutes * 60)
	let isSubmitting = $state(false)

	let timerInterval: ReturnType<typeof setInterval> | null = null
	let syncInterval: ReturnType<typeof setInterval> | null = null
	let saveTimers = new Map<string, ReturnType<typeof setTimeout>>()

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

	function formatTime(totalSeconds: number) {
		const m = Math.floor(totalSeconds / 60)
		const s = totalSeconds % 60
		return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
	}

	// ─── Camera check (lobby) ──────────────────────────────────────────────
	async function checkCamera() {
		cameraError = ''
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ video: true })
			stream.getTracks().forEach((t) => t.stop())
			cameraChecked = true
			toast.success('Camera access confirmed')
		} catch {
			cameraError = 'Camera access denied or unavailable. Enable camera permissions to continue.'
			toast.error(cameraError)
		}
	}

	function proceedToTerms() {
		if (!cameraChecked) {
			toast.error('Confirm camera access before continuing')
			return
		}
		step = 'terms'
	}

	async function proceedFromTerms() {
		if (!termsAccepted) {
			toast.error('You must accept the rules to continue')
			return
		}

		try {
			await fetch(`/api/assessment/session/${data.sessionId}/accept-terms`, { method: 'POST' })
		} catch {
			// best-effort; don't block progress on a logging failure
		}

		if (data.assessment.requireFaceVerify && !data.faceVerifiedAt) {
			if (!data.faceEnrolled) {
				toast.error('You must enroll your face before taking this assessment')
				return
			}
			step = 'faceverify'
		} else {
			enterKiosk()
		}
	}

	async function enterKiosk() {
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
			if (data.assessment.fullscreenRequired) requestFullscreen()
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to start session')
		}
	}

	function onFaceVerifySuccess() {
		if (data.status === 'IN_PROGRESS' || data.status === 'PAUSED') {
			// Resume path: session is already started server-side, so calling
			// /start again would 400 ("Session already started"). Just
			// re-enter the kiosk and resume timers.
			step = 'kiosk'
			startTimers()
			if (data.assessment.fullscreenRequired) requestFullscreen()
		} else {
			enterKiosk()
		}
	}

	function onFaceVerifyCancel() {
		step = 'terms'
	}

	// ─── Fullscreen + violation logging ────────────────────────────────────
	async function logViolation(type: string, severity = 1, metadata: Record<string, unknown> = {}) {
		try {
			await fetch(`/api/assessment/session/${data.sessionId}/violation`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ type, severity, metadata }),
			})
		} catch {
			// best-effort; don't block the exam on a logging failure
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

	// ─── Keyboard shortcuts (kiosk only) ────────────────────────────────────
	// A–D select options 0–3 for choice questions, Y/N for True/False,
	// R returns to the previous question. Disabled while focus is inside a
	// text field so essay/fill-blank typing is never hijacked, and disabled
	// whenever a modifier key is held so it never fights the browser or the
	// ExamMonitor's own Ctrl/Cmd shortcut interception.
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

		const letterIndex = { a: 0, b: 1, c: 2, d: 3 }[key]
		if (letterIndex !== undefined && currentQuestion.options?.[letterIndex]) {
			e.preventDefault()
			const optId = currentQuestion.options[letterIndex].id
			if (currentQuestion.type === 'MULTIPLE_CHOICE') toggleMultiple(optId)
			else if (currentQuestion.type === 'SINGLE_CHOICE' || currentQuestion.type === 'TRUE_FALSE')
				selectSingle(optId)
			return
		}

		if (currentQuestion.type === 'TRUE_FALSE' && (key === 'y' || key === 'n')) {
			e.preventDefault()
			const wantsTrue = key === 'y'
			const match = currentQuestion.options.find((o) =>
				wantsTrue ? /^(true|yes)$/i.test(o.body.trim()) : /^(false|no)$/i.test(o.body.trim())
			)
			if (match) selectSingle(match.id)
			return
		}

		if (key === 'r') {
			e.preventDefault()
			goTo(currentIndex - 1)
		}
	}

	// ─── Timers ─────────────────────────────────────────────────────────────
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
		}, 20_000)
	}

	function stopTimers() {
		if (timerInterval) clearInterval(timerInterval)
		if (syncInterval) clearInterval(syncInterval)
	}

	// ─── Answer autosave (debounced per question) ──────────────────────────
	function scheduleSave(questionId: string) {
		const existing = saveTimers.get(questionId)
		if (existing) clearTimeout(existing)
		saveTimers.set(
			questionId,
			setTimeout(() => saveAnswer(questionId), 600)
		)
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
			// best-effort; the next successful save (or final submit) still
			// captures the latest state held in `questions`
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

	async function handleSubmit(auto = false) {
		if (isSubmitting) return
		isSubmitting = true
		stopTimers()

		try {
			await toast.promise(
				fetch(`/api/assessment/session/${data.sessionId}/submit`, { method: 'POST' }).then((r) => {
					if (!r.ok) throw new Error('Submission failed')
					return r.json()
				}),
				{
					loading: auto ? 'Time is up — submitting…' : 'Submitting…',
					success: 'Submitted successfully',
					error: 'Failed to submit. Please try again.',
				}
			).unwrap()

			if (document.fullscreenElement) await document.exitFullscreen?.().catch(() => {})

			// Leave the kiosk entirely and land on the result page. replaceState
			// drops the kiosk route from history so the back button can't
			// re-enter the exam; invalidateAll forces the result loader to run
			// fresh rather than reusing anything cached for this URL.
			await goto(`/student/tests/${data.sessionId}/result`, {
				replaceState: true,
				invalidateAll: true,
			})
		} catch {
			isSubmitting = false
			startTimers()
		}
	}

	onMount(() => {
		document.addEventListener('fullscreenchange', handleFullscreenChange)
		document.addEventListener('visibilitychange', handleVisibilityChange)
		document.addEventListener('copy', handleCopy)
		document.addEventListener('paste', handlePaste)
		document.addEventListener('keydown', handleKioskShortcut)

		if (step === 'kiosk') {
			startTimers()
			if (data.assessment.fullscreenRequired && !document.fullscreenElement) requestFullscreen()
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
	<title>{data.assessment.title} — MOUAU e-Test</title>
</svelte:head>

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

{:else if step === 'lobby'}
	<div class="mx-auto flex min-h-screen max-w-lg flex-col justify-center p-6">
		<Card>
			<CardHeader>
				<CardTitle>Verify your details</CardTitle>
				<CardDescription>Confirm your information and device before continuing</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="rounded-lg border p-4 text-sm">
					<div class="flex justify-between py-1"><span class="text-muted-foreground">Test</span><span class="font-medium">{data.assessment.title}</span></div>
					<div class="flex justify-between py-1"><span class="text-muted-foreground">Course</span><span class="font-medium">{data.assessment.course.code} — {data.assessment.course.title}</span></div>
					<div class="flex justify-between py-1"><span class="text-muted-foreground">Duration</span><span class="font-medium">{data.assessment.durationMinutes} minutes</span></div>
					<div class="flex justify-between py-1"><span class="text-muted-foreground">Questions</span><span class="font-medium">{data.assessment.questionCount}</span></div>
					<div class="flex justify-between py-1"><span class="text-muted-foreground">Total marks</span><span class="font-medium">{data.assessment.totalMarks}</span></div>
				</div>

				<div class="rounded-lg border p-4">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2 text-sm font-medium">
							<Camera class="size-4" /> Camera check
						</div>
						{#if cameraChecked}
							<Badge><CheckCircle2 class="mr-1 size-3" /> Ready</Badge>
						{:else}
							<Button size="sm" variant="outline" onclick={checkCamera}>Test camera</Button>
						{/if}
					</div>
					{#if cameraError}
						<p class="mt-2 text-xs text-destructive">{cameraError}</p>
					{/if}
				</div>

				<Button class="w-full" onclick={proceedToTerms} disabled={!cameraChecked}>
					Continue
				</Button>
			</CardContent>
		</Card>
	</div>

{:else if step === 'terms'}
	<div class="mx-auto flex min-h-screen max-w-lg flex-col justify-center p-6">
		<Card>
			<CardHeader>
				<CardTitle>Rules & Regulations</CardTitle>
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

				<Button class="w-full" onclick={proceedFromTerms} disabled={!termsAccepted}>
					Continue
				</Button>
			</CardContent>
		</Card>
	</div>

{:else if step === 'faceverify'}
	<FaceVerifyModal
		examId={data.assessment.id}
		onSuccess={onFaceVerifySuccess}
		onCancel={onFaceVerifyCancel}
	/>

{:else if step === 'kiosk' && currentQuestion}
	<div class="flex min-h-screen flex-col">
		<!-- Kiosk header: timer + progress -->
		<div class="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-6 py-3 backdrop-blur">
			<div>
				<p class="text-sm font-semibold">{data.assessment.title}</p>
				<p class="text-xs text-muted-foreground">{data.assessment.course.code} · {answeredCount}/{questions.length} answered</p>
			</div>
			<div class="flex items-center gap-2 font-mono text-lg font-bold {remainingSeconds < 60 ? 'text-destructive' : ''}">
				<Clock class="size-5" />
				{formatTime(remainingSeconds)}
			</div>
		</div>

		<div class="flex flex-1">
			<!-- Question palette -->
			<aside class="hidden w-48 shrink-0 border-r p-4 md:block">
				<div class="grid grid-cols-5 gap-2">
					{#each questions as q, i}
						{@const answered =
							q.type === 'ESSAY' || q.type === 'FILL_BLANK'
								? q.textAnswer.trim().length > 0
								: q.type === 'MATCHING'
									? Object.keys(q.matchAnswer).length > 0
									: q.type === 'ORDERING'
										? true
										: q.selectedOptions.length > 0}
						<button
							type="button"
							onclick={() => goTo(i)}
							class="flex size-8 items-center justify-center rounded-md border text-xs font-semibold
								{i === currentIndex ? 'border-primary bg-primary text-primary-foreground' : answered ? 'border-primary/40 bg-primary/10' : 'border-border'}"
						>
							{i + 1}
						</button>
					{/each}
				</div>
				<p class="mt-4 text-[11px] leading-relaxed text-muted-foreground">
					Shortcuts: A–D select an option, Y/N for True/False, R returns to the previous question.
				</p>
			</aside>

			<!-- Question body -->
			<main class="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
				<div>
					<p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
						Question {currentIndex + 1} of {questions.length} · {currentQuestion.marks} mark{currentQuestion.marks === 1 ? '' : 's'}
					</p>
					<p class="mt-2 text-lg">{currentQuestion.body}</p>
				</div>

				{#if currentQuestion.type === 'SINGLE_CHOICE' || currentQuestion.type === 'TRUE_FALSE'}
					<RadioGroup value={currentQuestion.selectedOptions[0] ?? ''} onValueChange={selectSingle} class="space-y-2">
						{#each currentQuestion.options as opt, i}
							<label class="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/40">
								<RadioGroupItem value={opt.id} />
								<span class="flex size-5 shrink-0 items-center justify-center rounded border text-[11px] font-semibold text-muted-foreground">
									{String.fromCharCode(65 + i)}
								</span>
								<span class="text-sm">{opt.body}</span>
							</label>
						{/each}
					</RadioGroup>

				{:else if currentQuestion.type === 'MULTIPLE_CHOICE'}
					<div class="space-y-2">
						{#each currentQuestion.options as opt, i}
							<label class="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/40">
								<Checkbox
									checked={currentQuestion.selectedOptions.includes(opt.id)}
									onCheckedChange={() => toggleMultiple(opt.id)}
								/>
								<span class="flex size-5 shrink-0 items-center justify-center rounded border text-[11px] font-semibold text-muted-foreground">
									{String.fromCharCode(65 + i)}
								</span>
								<span class="text-sm">{opt.body}</span>
							</label>
						{/each}
					</div>

				{:else if currentQuestion.type === 'FILL_BLANK'}
					<Input
						value={currentQuestion.textAnswer}
						oninput={(e) => updateText((e.currentTarget as HTMLInputElement).value)}
						placeholder="Type your answer"
					/>

				{:else if currentQuestion.type === 'ESSAY'}
					<Textarea
						value={currentQuestion.textAnswer}
						oninput={(e) => updateText((e.currentTarget as HTMLTextAreaElement).value)}
						rows={8}
						placeholder="Write your answer here"
					/>

				{:else if currentQuestion.type === 'ORDERING'}
					<div class="space-y-2">
						{#each currentQuestion.orderAnswer as optId, i}
							<div class="flex items-center gap-3 rounded-lg border p-3">
								<span class="w-6 text-sm font-semibold text-muted-foreground">{i + 1}</span>
								<span class="flex-1 text-sm">{optionBody(optId)}</span>
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
						{#each currentQuestion.leftItems ?? [] as leftBody}
							<div class="flex items-center gap-3 rounded-lg border p-3">
								<span class="flex-1 text-sm">{leftBody}</span>
								<select
									class="h-9 rounded-md border border-input bg-background px-2 text-sm"
									value={currentQuestion.matchAnswer[leftBody] ?? ''}
									onchange={(e) => updateMatch(leftBody, (e.currentTarget as HTMLSelectElement).value)}
								>
									<option value="" disabled>Match to…</option>
									{#each currentQuestion.options as opt}
										<option value={opt.id}>{opt.body}</option>
									{/each}
								</select>
							</div>
						{/each}
					</div>
				{/if}

				<div class="mt-auto flex items-center justify-between pt-4">
					<Button variant="outline" onclick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0}>
						<ArrowLeft class="mr-2 size-4" /> Previous
					</Button>

					{#if currentIndex === questions.length - 1}
						<Button onclick={() => handleSubmit(false)} disabled={isSubmitting}>
							{isSubmitting ? 'Submitting…' : 'Submit Test'}
						</Button>
					{:else}
						<Button onclick={() => goTo(currentIndex + 1)}>
							Next <ArrowRight class="ml-2 size-4" />
						</Button>
					{/if}
				</div>
			</main>
		</div>

		<ExamMonitor sessionId={data.sessionId} />
	</div>
{/if}