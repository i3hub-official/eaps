<!-- src/routes/(auth)/register/+page.svelte -->
<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import { deserialize, enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import jsQR from 'jsqr';
	import { AuthShell } from '$lib/components/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { extractRefFromUrl } from '$lib/universities/receipt';
	import { getUniConfig } from '$lib/universities/registry';

	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import User from '@lucide/svelte/icons/user';
	import Lock from '@lucide/svelte/icons/lock';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import Mail from '@lucide/svelte/icons/mail';
	import Phone from '@lucide/svelte/icons/phone';
	import Building2 from '@lucide/svelte/icons/building-2';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import Briefcase from '@lucide/svelte/icons/briefcase';
	import QrCode from '@lucide/svelte/icons/qr-code';
	import Camera from '@lucide/svelte/icons/camera';
	import Upload from '@lucide/svelte/icons/upload';
	import X from '@lucide/svelte/icons/x';
	import Check from '@lucide/svelte/icons/check';
	import UserPlus from '@lucide/svelte/icons/user-plus';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';

	import type { PageData, ActionData } from './$types';

	const MOUAU_CFG = getUniConfig('MOUAU')!.receipt!;
	const REF_FIELD_NAME = MOUAU_CFG.refFieldName ?? 'ref';
	const REF_EXTRACT_PARAM = MOUAU_CFG.refExtractParam ?? 'transaction_ref';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	type Step = 1 | 2 | 3;
	let currentStep = $state<Step>(1);
	let isLoading = $state(false);
	let errorMessage = $state(form?.error ?? '');
	let showSuccess = $state(false);

	// Keep errorMessage in sync whenever the server action returns a new
	// `form` prop (e.g. progressive-enhancement fallback, or any path that
	// doesn't go through the custom use:enhance branches below).
	$effect(() => {
		if (form?.error) errorMessage = form.error;
	});

	let uniMatric = $state('');
	let refNumber = $state('');
	let refMasked = $state(false);
	let receiptRaw = $state<Record<string, string> | null>(null);
	let receiptPreview = $state<Record<string, string> | null>(null);
	let receiptFetched = $state(false);
	let receiptLoading = $state(false);
	let settingFromScan = $state(false);

	let matricTouched = $state(false);
	let matricError = $state('');
	let refTouched = $state(false);
	let refError = $state('');

	function validateMatricNumber(matric: string): string | undefined {
		if (!matric.trim()) return 'Matric number is required';
		const pattern = /^MOUAU\/([A-Z]{3,5})\/(\d{2})\/([A-Z0-9]+)$/i;
		if (!pattern.test(matric.toUpperCase())) {
			return 'Matric number must be in format: e.g., MOUAU/PHY/25/001002';
		}
		return undefined;
	}

	function validateRefNumber(ref: string): string | undefined {
		if (!ref.trim()) return `Please enter or scan the ${MOUAU_CFG.refLabel}`;
		return undefined;
	}

	function onMatricInput() {
		matricTouched = true;
		matricError = validateMatricNumber(uniMatric) || '';
		if (receiptFetched) clearReceiptState();
	}

	function onRefInput() {
		if (settingFromScan) return;
		refTouched = true;
		refError = validateRefNumber(refNumber) || '';
		refMasked = false;
		if (receiptFetched) {
			receiptRaw = null;
			receiptPreview = null;
			receiptFetched = false;
			surname = firstName = otherName = jambRegNo = college = department = level = '';
		}
	}

	let showWebcam = $state(false);
	let videoEl = $state<HTMLVideoElement | null>(null);
	let camStream = $state<MediaStream | null>(null);
	let scanInterval = $state<ReturnType<typeof setInterval> | null>(null);
	let scanTimeout = $state<ReturnType<typeof setTimeout> | null>(null);
	let camError = $state('');
	let scanCanvas: HTMLCanvasElement;
	let scanAttempts = $state(0);
	const MAX_SCAN_ATTEMPTS = 50; // ~15 seconds at 300ms intervals

	let surname = $state(form?.values?.surname ?? '');
	let firstName = $state(form?.values?.firstName ?? '');
	let otherName = $state(form?.values?.otherName ?? '');
	let matricNumber = $state(form?.values?.matricNumber ?? '');
	let jambRegNo = $state('');
	let college = $state('');
	let collegeShortName = $state('');
	let department = $state(form?.values?.department ?? '');
	let level = $state(form?.values?.level ?? '');
	let phone = $state(form?.values?.phone ?? '');
	let email = $state(form?.values?.email ?? '');

	function getCollegeDisplayName(collegeName: string, shortName: string): string {
		if (!collegeName) return '—';
		// Check if it already has shortname in parentheses
		const match = collegeName.match(/^(.*?)\s*\(([A-Z]+)\)$/);
		if (match) {
			return collegeName; // Already has shortname, return as-is
		}
		// If we have a shortname from DB, append it
		if (shortName) {
			return `${collegeName} (${shortName})`;
		}
		return collegeName;
	}

	type Step2Field = 'surname' | 'firstName' | 'matricNumber' | 'department' | 'email';
	let touched2 = $state<Partial<Record<Step2Field, boolean>>>({});
	let errors2 = $state<Partial<Record<Step2Field, string>>>({});

	function validateStep2Field(field: Step2Field, value: string) {
		touched2[field] = true;
		const required: Record<Step2Field, string> = {
			surname: 'Surname is required',
			firstName: 'First name is required',
			matricNumber: 'Matric number is required',
			department: 'Department is required',
			email: 'Email address is required'
		};
		if (!value.trim()) {
			errors2[field] = required[field];
			return;
		}
		if (field === 'matricNumber') {
			const matricErr = validateMatricNumber(value);
			if (matricErr) {
				errors2[field] = matricErr;
				return;
			}
		}
		if (field === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
			errors2[field] = 'Enter a valid email address';
			return;
		}
		errors2[field] = undefined;
	}

	function getError2(field: Step2Field): string | undefined {
		if (touched2[field] && errors2[field]) return errors2[field];
		return undefined;
	}

	let password = $state('');
	let confirmPassword = $state('');
	let showPassword = $state(false);
	let showConfirmPassword = $state(false);
	let touched3 = $state({ password: false, confirm: false });
	let errors3 = $state<{ password?: string; confirm?: string }>({});

	function validatePassword(v: string): string | undefined {
		if (!v) return 'Password is required';
		if (v.length < 8) return 'Password must be at least 8 characters';
		return undefined;
	}
	function validateConfirm(v: string): string | undefined {
		if (!v) return 'Please confirm your password';
		if (v !== password) return "Passwords don't match";
		return undefined;
	}
	function touchPassword(v: string) {
		touched3.password = true;
		errors3.password = validatePassword(v);
	}
	function touchConfirm(v: string) {
		touched3.confirm = true;
		errors3.confirm = validateConfirm(v);
	}

	function clearReceiptState() {
		refNumber = '';
		refMasked = false;
		receiptRaw = null;
		receiptPreview = null;
		receiptFetched = false;
		surname = firstName = otherName = jambRegNo = matricNumber = college = department = level = '';
		collegeShortName = '';
		refError = '';
		refTouched = false;
	}

	async function fetchReceipt(fromScan = false) {
		const matricErr = validateMatricNumber(uniMatric);
		if (matricErr) {
			errorMessage = matricErr;
			matricTouched = true;
			matricError = matricErr;
			return;
		}
		const ref = extractRefFromUrl(refNumber.trim(), REF_EXTRACT_PARAM);
		if (!ref) {
			errorMessage = `Please enter or scan the ${MOUAU_CFG.refLabel}.`;
			refTouched = true;
			refError = errorMessage;
			return;
		}
		receiptLoading = true;
		receiptRaw = null;
		receiptPreview = null;
		errorMessage = '';
		if (fromScan) refMasked = true;

		try {
			const fd = new FormData();
			fd.set(REF_FIELD_NAME, ref);
			const res = await fetch(`?/${MOUAU_CFG.actionName}`, { method: 'POST', body: fd });
			const result = deserialize(await res.text());

			if (result.type === 'error') {
				errorMessage = result.error?.message ?? 'Something went wrong.';
				refMasked = false;
				return;
			}
			if (result.type !== 'success' || !result.data?.success) {
				errorMessage = (result.data?.error as string) ?? 'Could not fetch receipt.';
				refMasked = false;
				return;
			}

			const d = result.data.data as Record<string, string> & { preview: Record<string, string> };
			const receiptMatricNorm = d.matricNo?.replace(/\//g, '').toUpperCase() || '';
			const inputMatricNorm = uniMatric.replace(/\//g, '').toUpperCase().trim();

			if (d.matricNo && !receiptMatricNorm.includes(inputMatricNorm)) {
				errorMessage = 'Matric number does not match this receipt. Please check and try again.';
				refMasked = false;
				return;
			}

			if (d.name) {
				const parts = d.name.trim().split(/\s+/);
				surname = parts[0] ?? '';
				firstName = parts[1] ?? '';
				otherName = parts.slice(2).join(' ');
			}
			if (d.matricNo) matricNumber = d.matricNo;
			if (d.jambregNo) jambRegNo = d.jambregNo;
			if (d.college) { college = d.college; }
			if (d.department) department = d.department;
			if (d.level) level = d.level;

			receiptRaw = d;
			receiptPreview = d.preview;
			receiptFetched = true;
			if (fromScan) currentStep = 1;
		} catch (err: unknown) {
			errorMessage = err instanceof Error ? err.message : 'Network error';
			refMasked = false;
		} finally {
			receiptLoading = false;
		}
	}

	async function handleQrUpload(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;

		const matricErr = validateMatricNumber(uniMatric);
		if (matricErr) {
			errorMessage = 'Please enter a valid matric number before scanning.';
			matricTouched = true;
			matricError = matricErr;
			return;
		}
		errorMessage = '';
		(e.target as HTMLInputElement).value = '';

		try {
			const bitmap = await createImageBitmap(file);
			const canvas = document.createElement('canvas');
			canvas.width = bitmap.width;
			canvas.height = bitmap.height;
			const ctx = canvas.getContext('2d')!;
			ctx.drawImage(bitmap, 0, 0);
			const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

			// Try multiple detection methods
			let code = jsQR(imgData.data, imgData.width, imgData.height);

			// Try inverted
			if (!code) {
				const invertedData = new Uint8ClampedArray(imgData.data);
				for (let i = 0; i < invertedData.length; i++) {
					invertedData[i] = 255 - invertedData[i];
				}
				code = jsQR(invertedData, imgData.width, imgData.height);
			}

			// Try contrast enhanced
			if (!code) {
				const enhancedData = new Uint8ClampedArray(imgData.data);
				for (let i = 0; i < enhancedData.length; i += 4) {
					const gray = (enhancedData[i] + enhancedData[i+1] + enhancedData[i+2]) / 3;
					const enhanced = gray > 128 ? 255 : 0;
					enhancedData[i] = enhanced;
					enhancedData[i+1] = enhanced;
					enhancedData[i+2] = enhanced;
				}
				code = jsQR(enhancedData, imgData.width, imgData.height);
			}

			if (code?.data) {
				settingFromScan = true;
				refNumber = extractRefFromUrl(code.data, REF_EXTRACT_PARAM);
				refTouched = true;
				refError = validateRefNumber(refNumber) || '';
				await tick();
				settingFromScan = false;
				await fetchReceipt(true);
			} else {
				errorMessage = 'Could not read QR code. Please ensure the QR code is clear and try again.';
			}
		} catch {
			errorMessage = 'Failed to process image. Please try with a clearer image.';
		}
	}

	async function startWebcam() {
		const matricErr = validateMatricNumber(uniMatric);
		if (matricErr) {
			errorMessage = 'Please enter a valid matric number before scanning.';
			matricTouched = true;
			matricError = matricErr;
			return;
		}
		camError = '';
		errorMessage = '';
		scanAttempts = 0;

		try {
			camStream = await navigator.mediaDevices.getUserMedia({
				video: {
					facingMode: 'environment',
					width: { ideal: 1280 },
					height: { ideal: 720 }
				}
			});
			showWebcam = true;
			await new Promise((r) => setTimeout(r, 100));
			if (videoEl) {
				videoEl.srcObject = camStream;
				await videoEl.play();
				startScanLoop();
			}
		} catch {
			camError = 'Camera access denied. Upload an image instead.';
		}
	}

	function startScanLoop() {
		scanCanvas = document.createElement('canvas');
		scanAttempts = 0;

		// Clear any existing interval
		if (scanInterval) clearInterval(scanInterval);

		scanInterval = setInterval(async () => {
			if (!videoEl || videoEl.readyState !== 4) {
				scanAttempts++;
				if (scanAttempts > MAX_SCAN_ATTEMPTS) {
					stopWebcam();
					camError = 'QR scan timed out. Please try uploading an image instead.';
				}
				return;
			}

			try {
				scanCanvas.width = videoEl.videoWidth;
				scanCanvas.height = videoEl.videoHeight;
				const ctx = scanCanvas.getContext('2d')!;

				// Draw the video frame
				ctx.drawImage(videoEl, 0, 0);

				// Get image data
				const imgData = ctx.getImageData(0, 0, scanCanvas.width, scanCanvas.height);

				// Try to detect QR code with multiple attempts
				let code = jsQR(imgData.data, imgData.width, imgData.height);

				// If not found, try with inverted colors (some QR codes are inverted)
				if (!code) {
					const invertedData = new Uint8ClampedArray(imgData.data);
					for (let i = 0; i < invertedData.length; i++) {
						invertedData[i] = 255 - invertedData[i];
					}
					code = jsQR(invertedData, imgData.width, imgData.height);
				}

				// If still not found, try with grayscale contrast enhancement
				if (!code) {
					const enhancedData = new Uint8ClampedArray(imgData.data);
					for (let i = 0; i < enhancedData.length; i += 4) {
						const gray = (enhancedData[i] + enhancedData[i+1] + enhancedData[i+2]) / 3;
						const enhanced = gray > 128 ? 255 : 0;
						enhancedData[i] = enhanced;
						enhancedData[i+1] = enhanced;
						enhancedData[i+2] = enhanced;
					}
					code = jsQR(enhancedData, imgData.width, imgData.height);
				}

				if (code?.data) {
					stopWebcam();
					settingFromScan = true;
					refNumber = extractRefFromUrl(code.data, REF_EXTRACT_PARAM);
					refTouched = true;
					refError = validateRefNumber(refNumber) || '';
					await tick();
					settingFromScan = false;
					fetchReceipt(true);
					return;
				}

				scanAttempts++;
				if (scanAttempts > MAX_SCAN_ATTEMPTS) {
					stopWebcam();
					camError = 'QR scan timed out. Please try uploading an image instead.';
				}
			} catch (err) {
				console.error('Scan error:', err);
			}
		}, 300);
	}

	function stopWebcam() {
		if (scanInterval) {
			clearInterval(scanInterval);
			scanInterval = null;
		}
		if (scanTimeout) {
			clearTimeout(scanTimeout);
			scanTimeout = null;
		}
		if (camStream) {
			camStream.getTracks().forEach((t) => t.stop());
			camStream = null;
		}
		showWebcam = false;
		scanAttempts = 0;
	}

	onDestroy(() => stopWebcam());

	function nextStep() {
		errorMessage = '';
		if (currentStep === 1) {
			const matricErr = validateMatricNumber(uniMatric);
			matricTouched = true;
			matricError = matricErr || '';
			if (matricErr) {
				errorMessage = matricErr;
				return;
			}
			if (!receiptFetched) {
				errorMessage = 'Please verify your receipt first by clicking "Fetch" or scanning a QR code.';
				return;
			}
			currentStep = 2;
		} else if (currentStep === 2) {
			const fields: Step2Field[] = ['surname', 'firstName', 'matricNumber', 'department', 'email'];
			const vals: Record<Step2Field, string> = { surname, firstName, matricNumber, department, email };
			fields.forEach((f) => validateStep2Field(f, vals[f]));
			if (fields.some((f) => errors2[f])) {
				errorMessage = 'Please fix the highlighted fields.';
				return;
			}
			currentStep = 3;
		}
	}

	function prevStep() {
		errorMessage = '';
		currentStep = (currentStep - 1) as Step;
	}

	const STEPS = ['Verify receipt', 'Your details', 'Set password'];

	const headings: Record<Step, { heading: string; subheading: string }> = {
		1: { heading: 'Verify your receipt', subheading: 'Enter your matric number and verify your school fee receipt' },
		2: { heading: 'Your details', subheading: 'Confirm your academic details' },
		3: { heading: 'Set a password', subheading: 'Create a secure password for your account' }
	};
</script>

<svelte:head>
	<title>Register — EAPS</title>
</svelte:head>

<AuthShell
	heading={headings[currentStep].heading}
	subheading={headings[currentStep].subheading}
	onBack={prevStep}
	showBack={currentStep > 1}
>
	<!-- Step tracker -->
	<div class="mb-6 flex items-center gap-4">
		{#each STEPS as label, i}
			{@const stepNum = i + 1}
			{@const done = currentStep > stepNum}
			{@const active = currentStep === stepNum}
			<div class="flex items-center gap-3">
				<div
					class="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold {done
						? 'bg-primary text-primary-foreground'
						: active
							? 'border-2 border-primary text-primary'
							: 'border-2 border-border text-muted-foreground'}"
				>
					{#if done}<Check class="size-3.5" />{:else}{stepNum}{/if}
				</div>
				<span class="text-sm font-medium {active ? 'text-foreground' : 'text-muted-foreground'}">
					{label}
				</span>
				{#if i < STEPS.length - 1}
					<div class="h-px w-8 {done ? 'bg-primary' : 'bg-border'}"></div>
				{/if}
			</div>
		{/each}
	</div>

	{#if errorMessage}
		<div class="mb-6 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
			<AlertCircle class="mt-0.5 size-4 shrink-0" />
			<span>{errorMessage}</span>
		</div>
	{/if}

	<!-- ══ STEP 1 — verify receipt ══ -->
	{#if currentStep === 1}
		<div class="flex flex-col gap-8">
			<!-- Matric Number -->
			<div class="flex flex-col gap-2">
				<Label for="s1matric" class="text-sm font-semibold">Matric Number</Label>
				<div class="relative">
					<Briefcase class="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						id="s1matric"
						bind:value={uniMatric}
						oninput={onMatricInput}
						placeholder="MOUAU/PHY/25/001002"
						class="h-11 pl-10 text-base"
						aria-invalid={!!matricError}
					/>
				</div>
				{#if matricError}
					<p class="flex items-center gap-1.5 text-sm text-destructive">
						<AlertCircle class="size-3.5" /> {matricError}
					</p>
				{/if}
			</div>

			<!-- QR Scan Section -->
			<div class="rounded-xl border border-border bg-muted/40 p-6 {matricError ? 'pointer-events-none opacity-50' : ''}">
				<p class="mb-4 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
					<QrCode class="size-4" /> Scan School Fee QR Code
					{#if matricError}<span class="font-normal text-xs">— fix matric number first</span>{/if}
				</p>
				<div class="flex flex-wrap gap-4">
					<button
						type="button"
						onclick={startWebcam}
						disabled={!!matricError}
						class="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-45"
					>
						<Camera class="size-4" /> Live Camera
					</button>
					<label class="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary {matricError ? 'pointer-events-none opacity-45' : ''}">
						<Upload class="size-4" /> Upload Image
						<input type="file" accept="image/*" class="sr-only" disabled={!!matricError} onchange={handleQrUpload} />
					</label>
				</div>
			</div>

			{#if camError}
				<p class="flex items-center gap-1.5 text-sm text-destructive">
					<AlertCircle class="size-3.5" /> {camError}
				</p>
			{/if}

			{#if showWebcam}
				<div class="flex flex-col items-center gap-4">
					<div class="relative aspect-[4/3] w-full max-w-md overflow-hidden rounded-xl bg-black">
						<!-- svelte-ignore a11y_media_has_caption -->
						<video bind:this={videoEl} playsinline autoplay class="size-full object-cover"></video>
						<div class="pointer-events-none absolute left-1/2 top-1/2 size-[150px] -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"></div>
					</div>
					<p class="text-sm text-muted-foreground">Point at the QR code on your receipt</p>
					<button
						type="button"
						onclick={stopWebcam}
						class="flex cursor-pointer items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive"
					>
						<X class="size-4" /> Cancel Camera
					</button>
				</div>
			{/if}

			<!-- Transaction Ref -->
			<div class="flex flex-col gap-2">
				<Label class="text-sm font-semibold">
					Transaction Reference <span class="font-normal text-muted-foreground">(or paste from QR)</span>
				</Label>
				<div class="relative">
					<QrCode class="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
					<input
						type={refMasked ? 'password' : 'text'}
						value={refMasked ? '••••••••••••' : refNumber}
						oninput={(e) => {
							refNumber = (e.target as HTMLInputElement).value;
							onRefInput();
						}}
						placeholder="Remita RRR Code"
						disabled={!!matricError || receiptLoading}
						readonly={refMasked}
						aria-invalid={!!refError && !receiptFetched}
						class="h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 pl-10 pr-28 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive"
					/>
					{#if receiptLoading}
						<div class="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2 text-sm font-semibold text-primary">
							<span class="size-3 animate-spin rounded-full border-2 border-primary/30 border-t-primary"></span> Verifying…
						</div>
					{:else if !refMasked}
						<button
							type="button"
							onclick={() => fetchReceipt(false)}
							disabled={!refNumber.trim() || !!matricError}
							class="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-45"
						>
							Fetch
						</button>
					{:else}
						<button
							type="button"
							onclick={() => {
								refNumber = '';
								refMasked = false;
								receiptRaw = null;
								receiptPreview = null;
								receiptFetched = false;
								surname = firstName = otherName = jambRegNo = matricNumber = college = department = '';
								refError = '';
								refTouched = false;
							}}
							title="Clear"
							class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground transition-colors hover:text-destructive"
						>
							<X class="size-4" />
						</button>
					{/if}
				</div>
				{#if refError && !receiptFetched}
					<p class="flex items-center gap-1.5 text-sm text-destructive">
						<AlertCircle class="size-3.5" /> {refError}
					</p>
				{/if}
				<p class="text-sm text-muted-foreground">Found on your MOUAU portal or school fee receipt</p>
			</div>

			<!-- Skeleton Loading for Receipt -->
			{#if receiptLoading}
				<div class="rounded-xl border border-border bg-card p-5 shadow-sm">
					<div class="mb-3 flex items-center gap-2">
						<Skeleton class="size-4" />
						<Skeleton class="h-3 w-40" />
					</div>
					<div class="flex flex-col gap-3">
						<div class="flex justify-between">
							<Skeleton class="h-4 w-24" />
							<Skeleton class="h-4 w-32" />
						</div>
						<div class="flex justify-between">
							<Skeleton class="h-4 w-28" />
							<Skeleton class="h-4 w-36" />
						</div>
						<div class="flex justify-between">
							<Skeleton class="h-4 w-20" />
							<Skeleton class="h-4 w-28" />
						</div>
						<div class="flex justify-between">
							<Skeleton class="h-4 w-24" />
							<Skeleton class="h-4 w-32" />
						</div>
						<div class="flex justify-between">
							<Skeleton class="h-4 w-20" />
							<Skeleton class="h-4 w-28" />
						</div>
					</div>
				</div>
			{/if}

			<!-- Receipt Preview -->
			{#if receiptFetched}
				<div class="rounded-xl border border-primary/25 bg-primary/5 p-5">
					<p class="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary">
						<Check class="size-4" /> Verified — Student Details
					</p>
					<div class="flex flex-col gap-4">
						<!-- Full Name -->
						<div class="flex flex-col gap-0.5">
							<span class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Full Name</span>
							<span class="text-base font-medium text-foreground">
								{[surname, firstName, otherName].filter(Boolean).join(' ') || '—'}
							</span>
						</div>

						<!-- Matric Number -->
						<div class="flex flex-col gap-0.5">
							<span class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Matric Number</span>
							<span class="text-base font-medium text-foreground">{matricNumber || '—'}</span>
						</div>

						<!-- JAMB Registration -->
						<div class="flex flex-col gap-0.5">
							<span class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">JAMB Registration</span>
							<span class="text-base font-medium text-foreground">{jambRegNo || '—'}</span>
						</div>

						<!-- College/Faculty with Short Name -->
						<div class="flex flex-col gap-0.5">
							<span class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">College / Faculty</span>
							<span class="text-base font-medium text-foreground">
								{college ? getCollegeDisplayName(college, collegeShortName) : '—'}
							</span>
						</div>

						<!-- Department -->
						<div class="flex flex-col gap-0.5">
							<span class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Department</span>
							<span class="text-base font-medium text-foreground">{department || '—'}</span>
						</div>

						<!-- Level -->
						<div class="flex flex-col gap-0.5">
							<span class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Level</span>
							<span class="text-base font-medium text-foreground">{level || '—'}</span>
						</div>

						<!-- Programme -->
						<div class="flex flex-col gap-0.5">
							<span class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Programme</span>
							<span class="text-base font-medium text-foreground">UNDERGRADUATE (Regular)</span>
						</div>

						<!-- Session -->
						<div class="flex flex-col gap-0.5">
							<span class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Session</span>
							<span class="text-base font-medium text-foreground">{receiptRaw?.session || '—'}</span>
						</div>

						<!-- Receipt Number -->
						<div class="flex flex-col gap-0.5">
							<span class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Receipt Number</span>
							<span class="text-base font-medium text-foreground">{receiptRaw?.receiptNo || '—'}</span>
						</div>
					</div>
				</div>
			{/if}

			<Button type="button" size="lg" class="h-12 w-full text-base" onclick={nextStep} disabled={!receiptFetched}>
				{#if !receiptFetched}Verify Receipt First{:else}Continue →{/if}
			</Button>
			<p class="text-center text-sm text-muted-foreground">
				Already have an account? <a href="/login" class="text-primary hover:underline">Sign in</a>
			</p>
		</div>
	{/if}

	<!-- ══ STEP 2 — details ══ -->
	{#if currentStep === 2}
		<div class="flex flex-col gap-6">
			{#if receiptFetched}
				<div class="flex flex-wrap items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
					<span>Student information has been successfully verified.</span>
				</div>

				<!-- Re-scan button below -->
				<div class="flex justify-end">
					<button
						type="button"
						onclick={() => {
							// Clear all receipt data
							receiptFetched = false;
							receiptRaw = null;
							receiptPreview = null;

							// Clear all form fields
							surname = '';
							firstName = '';
							otherName = '';
							matricNumber = '';
							jambRegNo = '';
							college = '';
							collegeShortName = '';
							department = '';
							level = '';
							uniMatric = '';
							refNumber = '';
							refMasked = false;
							refError = '';
							refTouched = false;
							matricError = '';
							matricTouched = false;
							errorMessage = '';

							// Reset to step 1
							currentStep = 1;
						}}
						class="inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-white transition-colors hover:text-primary/80"
					>
						<RefreshCw class="size-3.5" /> Re-verify Information
					</button>
				</div>
			{/if}

			<!-- Contact Information -->
			<div class="flex flex-col gap-4">
				<div class="flex flex-col gap-2">
					<Label for="s2email" class="flex items-center gap-2 text-sm font-semibold">
						Email Address
						<span class="font-normal text-muted-foreground text-xs">*</span>
					</Label>
					<Input
						id="s2email"
						type="email"
						bind:value={email}
						placeholder="you@student.mouau.edu.ng"
						class="h-11 text-base"
						aria-invalid={!!getError2('email')}
						onblur={(e: FocusEvent) => validateStep2Field('email', (e.currentTarget as HTMLInputElement).value)}
						oninput={(e: Event) => {
							if (touched2.email) validateStep2Field('email', (e.currentTarget as HTMLInputElement).value);
						}}
					/>
					{#if getError2('email')}
						<p class="text-sm text-destructive">{getError2('email')}</p>
					{:else}
						<p class="text-xs text-muted-foreground">Required for account communications</p>
					{/if}
				</div>

				<div class="flex flex-col gap-2">
					<Label for="s2phone" class="text-sm font-semibold">Phone Number</Label>
					<Input
						id="s2phone"
						type="tel"
						bind:value={phone}
						placeholder="+234 801 234 5678"
						class="h-11 text-base"
					/>
					<p class="text-xs text-muted-foreground">(Optional)</p>
				</div>
			</div>

			<!-- Summary Card -->
			<div class="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3.5">
				<Check class="size-4 shrink-0 text-primary mt-0.5" />
				<div class="text-sm text-muted-foreground">
					<p class="font-semibold text-foreground">Student Information Verified</p>
					<p class="text-xs">All academic details have been confirmed. Please review and proceed with your registration. If any data is incorrect, please contact the administration.</p>
				</div>
			</div>

			<Button type="button" size="lg" class="h-12 w-full text-base" onclick={nextStep}>
				Continue →
			</Button>
		</div>
	{/if}

	{#if showSuccess}
		<div class="flex flex-col items-center gap-4 py-12">
			<div class="flex size-16 items-center justify-center rounded-full bg-green-500/10">
				<Check class="size-8 text-green-500" />
			</div>
			<h2 class="text-2xl font-bold">Account Created!</h2>
			<p class="text-muted-foreground">Redirecting to your dashboard...</p>
		</div>
	{:else}
		<!-- ══ STEP 3 — password ══ -->
		{#if currentStep === 3}
			<form
				method="POST"
				action="?/signup"
				use:enhance={({ formElement, formData, action, cancel }) => {
					// Pre-submit validation
					touchPassword(password);
					touchConfirm(confirmPassword);
					const pErr = validatePassword(password);
					const cErr = validateConfirm(confirmPassword);
					if (pErr || cErr) {
						errorMessage = pErr ?? cErr ?? '';
						cancel();
						return;
					}

					isLoading = true;
					errorMessage = '';

					return async ({ result, update }) => {
						isLoading = false;

						if (result.type === 'failure') {
							// Coerce potential non-string error payloads to string to satisfy TS
							errorMessage = String(result.data?.error ?? 'Something went wrong.');
							return;
						}

						if (result.type === 'error') {
							errorMessage = result.error?.message ?? 'Server error.';
							return;
						}

						if (result.type === 'success' && result.data?.success) {
							showSuccess = true;
							// Wait 2 seconds, then navigate
							await new Promise(r => setTimeout(r, 2000));
							await goto('/student', { invalidateAll: true });
							return;
						}

						await update();
					};
				}}
				class="flex flex-col gap-6"
			>
				<!-- Hidden fields -->
				<input type="hidden" name="matricNumber" value={matricNumber} />
				<input type="hidden" name="jambRegNo" value={jambRegNo} />
				<input type="hidden" name="firstName" value={firstName} />
				<input type="hidden" name="otherName" value={otherName} />
				<input type="hidden" name="surname" value={surname} />
				<input type="hidden" name="college" value={college} />
				<input type="hidden" name="department" value={department} />
				<input type="hidden" name="level" value={level} />
				<input type="hidden" name="phone" value={phone} />
				<input type="hidden" name="email" value={email} />
				<input type="hidden" name="receiptNo" value={receiptRaw?.receiptNo ?? ''} />
				<input type="hidden" name="receiptRef" value={refNumber} />
				<input type="hidden" name="session" value={receiptRaw?.session ?? ''} />
				<input type="hidden" name="programmeType" value="UNDERGRADUATE" />

				<!-- Password fields -->
				<div class="flex flex-col gap-2">
					<Label for="s3pw" class="text-sm font-semibold">Password</Label>
					<div class="relative">
						<Input
							id="s3pw"
							name="password"
							type={showPassword ? 'text' : 'password'}
							bind:value={password}
							placeholder="Minimum 8 characters"
							class="h-11 pr-12 text-base"
						/>
						<button type="button" onclick={() => (showPassword = !showPassword)} class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
							{#if showPassword}<EyeOff class="size-5" />{:else}<Eye class="size-5" />{/if}
						</button>
					</div>
				</div>

				<div class="flex flex-col gap-2">
					<Label for="s3pw2" class="text-sm font-semibold">Confirm Password</Label>
					<div class="relative">
						<Input
							id="s3pw2"
							name="confirmPassword"
							type={showConfirmPassword ? 'text' : 'password'}
							bind:value={confirmPassword}
							placeholder="Repeat your password"
							class="h-11 pr-12 text-base"
						/>
						<button type="button" onclick={() => (showConfirmPassword = !showConfirmPassword)} class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
							{#if showConfirmPassword}<EyeOff class="size-5" />{:else}<Eye class="size-5" />{/if}
						</button>
					</div>
				</div>

				<Button type="submit" size="lg" class="h-12 w-full text-base" disabled={isLoading}>
					{#if isLoading}
						<span class="size-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground"></span>
						Creating account…
					{:else}
						<UserPlus class="size-5" />
						Create Account
					{/if}
				</Button>
			</form>
		{/if}
	{/if}
</AuthShell>