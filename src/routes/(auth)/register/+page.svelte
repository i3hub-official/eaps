<script lang="ts">
  import { onDestroy } from 'svelte';
  import { deserialize } from '$app/forms';
  import { goto } from '$app/navigation';
  import { tick } from 'svelte';
  import jsQR from 'jsqr';
  import ThemeToggle from '$lib/components/ui/ThemeToggle.svelte';
  import { extractRefFromUrl } from '$lib/universities/receipt';
  import { getUniConfig } from '$lib/universities/registry';

  import {
    ShieldCheck, ArrowRight, User, Lock, Eye, EyeOff,
    Mail, Phone, Building2, BookOpen, Briefcase, QrCode,
    Camera, Upload, X, Check, Scan, UserPlus, AlertCircle,
    RefreshCw, ChevronLeft, ChevronRight
  } from '@lucide/svelte';

  import type { PageData, ActionData } from './$types';

  const MOUAU_CFG         = getUniConfig('MOUAU')!.receipt!;
  const REF_FIELD_NAME    = MOUAU_CFG.refFieldName    ?? 'ref';
  const REF_EXTRACT_PARAM = MOUAU_CFG.refExtractParam ?? 'transaction_ref';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let currentStep  = $state(1);
  let isLoading    = $state(false);
  let errorMessage = $state(form?.error ?? '');

  let uniMatric       = $state('');
  let refNumber       = $state('');
  let refMasked       = $state(false);
  let receiptRaw      = $state<Record<string, string> | null>(null);
  let receiptPreview  = $state<Record<string, string> | null>(null);
  let receiptFetched  = $state(false);
  let receiptLoading  = $state(false);
  let settingFromScan = $state(false);

  let matricTouched = $state(false);
  let matricError   = $state('');
  let refTouched    = $state(false);
  let refError      = $state('');

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
      receiptRaw = null; receiptPreview = null; receiptFetched = false;
      surname = firstName = otherName = jambRegNo = college = department = '';
    }
  }

  let showWebcam   = $state(false);
  let videoEl      = $state<HTMLVideoElement | null>(null);
  let camStream    = $state<MediaStream | null>(null);
  let scanInterval = $state<ReturnType<typeof setInterval> | null>(null);
  let camError     = $state('');
  let scanCanvas: HTMLCanvasElement;

  let surname      = $state(form?.values?.surname      ?? '');
  let firstName    = $state(form?.values?.firstName    ?? '');
  let otherName    = $state(form?.values?.otherName    ?? '');
  let matricNumber = $state(form?.values?.matricNumber ?? '');
  let jambRegNo    = $state(form?.values?.jambRegNo    ?? '');
  let college      = $state(form?.values?.college      ?? '');
  let department   = $state(form?.values?.department   ?? '');
  let level        = $state(form?.values?.level        ?? '');
  let phone        = $state(form?.values?.phone        ?? '');
  let email        = $state(form?.values?.email        ?? '');

  type Step2Field = 'surname' | 'firstName' | 'matricNumber' | 'department' | 'email';
  let touched2 = $state<Partial<Record<Step2Field, boolean>>>({});
  let errors2  = $state<Partial<Record<Step2Field, string>>>({});

  function validateStep2Field(field: Step2Field, value: string) {
    touched2[field] = true;
    const required: Record<Step2Field, string> = {
      surname:      'Surname is required',
      firstName:    'First name is required',
      matricNumber: 'Matric number is required',
      department:   'Department is required',
      email:        'Email address is required',
    };
    if (!value.trim()) { errors2[field] = required[field]; return; }
    if (field === 'matricNumber') {
      const matricErr = validateMatricNumber(value);
      if (matricErr) { errors2[field] = matricErr; return; }
    }
    if (field === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errors2[field] = 'Enter a valid email address'; return;
    }
    errors2[field] = undefined;
  }

  function getError2(field: Step2Field): string | undefined {
    if (touched2[field] && errors2[field]) return errors2[field];
    return undefined;
  }

  let password            = $state('');
  let confirmPassword     = $state('');
  let showPassword        = $state(false);
  let showConfirmPassword = $state(false);
  let touched3 = $state({ password: false, confirm: false });
  let errors3  = $state<{ password?: string; confirm?: string }>({});

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
  function touchPassword(v: string) { touched3.password = true; errors3.password = validatePassword(v); }
  function touchConfirm(v: string)  { touched3.confirm  = true; errors3.confirm  = validateConfirm(v); }

  function clearReceiptState() {
    refNumber = ''; refMasked = false;
    receiptRaw = null; receiptPreview = null; receiptFetched = false;
    surname = firstName = otherName = jambRegNo = matricNumber = college = department = '';
    refError = ''; refTouched = false;
  }

  async function fetchReceipt(fromScan = false) {
    const matricErr = validateMatricNumber(uniMatric);
    if (matricErr) { errorMessage = matricErr; matricTouched = true; matricError = matricErr; return; }
    const ref = extractRefFromUrl(refNumber.trim(), REF_EXTRACT_PARAM);
    if (!ref) { errorMessage = `Please enter or scan the ${MOUAU_CFG.refLabel}.`; refTouched = true; refError = errorMessage; return; }
    receiptLoading = true; receiptRaw = null; receiptPreview = null; errorMessage = '';
    if (fromScan) refMasked = true;

    try {
      const fd = new FormData();
      fd.set(REF_FIELD_NAME, ref);
      const res    = await fetch(`?/${MOUAU_CFG.actionName}`, { method: 'POST', body: fd });
      const result = deserialize(await res.text());

      if (result.type === 'error') { errorMessage = result.error?.message ?? 'Something went wrong.'; refMasked = false; return; }
      if (result.type !== 'success' || !result.data?.success) { errorMessage = (result.data?.error as string) ?? 'Could not fetch receipt.'; refMasked = false; return; }

      const d = result.data.data as Record<string, string> & { preview: Record<string, string> };
      const receiptMatricNorm = d.matricNo?.replace(/\//g, '').toUpperCase() || '';
      const inputMatricNorm   = uniMatric.replace(/\//g, '').toUpperCase().trim();

      if (d.matricNo && !receiptMatricNorm.includes(inputMatricNorm)) {
        errorMessage = 'Matric number does not match this receipt. Please check and try again.';
        refMasked = false; return;
      }

      if (d.name) {
        const parts = d.name.trim().split(/\s+/);
        surname = parts[0] ?? ''; firstName = parts[1] ?? ''; otherName = parts.slice(2).join(' ');
      }
      if (d.matricNo)   matricNumber = d.matricNo;
      if (d.jambregNo)  jambRegNo    = d.jambregNo;
      if (d.college)    college      = d.college;
      if (d.department) department   = d.department;
      if (d.level)      level        = d.level;

      receiptRaw = d; receiptPreview = d.preview; receiptFetched = true;
      if (fromScan) currentStep = 1;
    } catch (err: unknown) {
      errorMessage = err instanceof Error ? err.message : 'Network error'; refMasked = false;
    } finally {
      receiptLoading = false;
    }
  }

  async function handleQrUpload(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const matricErr = validateMatricNumber(uniMatric);
    if (matricErr) { errorMessage = 'Please enter a valid matric number before scanning.'; matricTouched = true; matricError = matricErr; return; }
    errorMessage = '';
    (e.target as HTMLInputElement).value = '';
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width; canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(bitmap, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imgData.data, imgData.width, imgData.height);
      if (code?.data) {
        settingFromScan = true;
        refNumber = extractRefFromUrl(code.data, REF_EXTRACT_PARAM);
        refTouched = true; refError = validateRefNumber(refNumber) || '';
        await tick(); settingFromScan = false;
        await fetchReceipt(true);
      } else {
        errorMessage = 'Could not read QR code. Please enter the ref manually.';
      }
    } catch { errorMessage = 'Failed to process image.'; }
  }

  async function startWebcam() {
    const matricErr = validateMatricNumber(uniMatric);
    if (matricErr) { errorMessage = 'Please enter a valid matric number before scanning.'; matricTouched = true; matricError = matricErr; return; }
    camError = ''; errorMessage = '';
    try {
      camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      showWebcam = true;
      await new Promise(r => setTimeout(r, 100));
      if (videoEl) { videoEl.srcObject = camStream; await videoEl.play(); startScanLoop(); }
    } catch { camError = 'Camera access denied. Upload an image instead.'; }
  }

  function startScanLoop() {
    scanCanvas = document.createElement('canvas');
    scanInterval = setInterval(async () => {
      if (!videoEl || videoEl.readyState !== 4) return;
      scanCanvas.width = videoEl.videoWidth; scanCanvas.height = videoEl.videoHeight;
      const ctx = scanCanvas.getContext('2d')!;
      ctx.drawImage(videoEl, 0, 0);
      const imgData = ctx.getImageData(0, 0, scanCanvas.width, scanCanvas.height);
      const code = jsQR(imgData.data, imgData.width, imgData.height);
      if (code?.data) {
        stopWebcam(); settingFromScan = true;
        refNumber = extractRefFromUrl(code.data, REF_EXTRACT_PARAM);
        refTouched = true; refError = validateRefNumber(refNumber) || '';
        await tick(); settingFromScan = false;
        fetchReceipt(true);
      }
    }, 300);
  }

  function stopWebcam() {
    if (scanInterval) clearInterval(scanInterval);
    if (camStream) camStream.getTracks().forEach(t => t.stop());
    camStream = null; showWebcam = false;
  }

  onDestroy(() => stopWebcam());

  function nextStep() {
    errorMessage = '';
    if (currentStep === 1) {
      const matricErr = validateMatricNumber(uniMatric);
      matricTouched = true; matricError = matricErr || '';
      if (matricErr) { errorMessage = matricErr; return; }
      if (!receiptFetched) { errorMessage = 'Please verify your receipt first by clicking "Fetch" or scanning a QR code.'; return; }
      currentStep = 2;
    } else if (currentStep === 2) {
      const fields: Step2Field[] = ['surname', 'firstName', 'matricNumber', 'department', 'email'];
      const vals: Record<Step2Field, string> = { surname, firstName, matricNumber, department, email };
      fields.forEach(f => validateStep2Field(f, vals[f]));
      if (fields.some(f => errors2[f])) { errorMessage = 'Please fix the highlighted fields.'; return; }
      currentStep = 3;
    }
  }

  function prevStep() { errorMessage = ''; currentStep -= 1; }

  async function handleSubmit() {
    errorMessage = '';
    touchPassword(password); touchConfirm(confirmPassword);
    const pErr = validatePassword(password);
    const cErr = validateConfirm(confirmPassword);
    if (pErr || cErr) { errorMessage = pErr ?? cErr ?? ''; return; }
    isLoading = true;
    try {
      const fd = new FormData();
      fd.set('matricNumber', matricNumber); fd.set('jambRegNo',  jambRegNo);
      fd.set('firstName',    firstName);    fd.set('otherName',  otherName);
      fd.set('surname',      surname);      fd.set('college',    college);
      fd.set('department',   department);   fd.set('level',      level);
      fd.set('phone',        phone);        fd.set('email',      email);
      fd.set('receiptNo',    receiptRaw?.receiptNo ?? '');
      fd.set('receiptRef',   refNumber);
      fd.set('session',      receiptRaw?.session   ?? '');
      fd.set('password',     password);
      const res    = await fetch('?/signup', { method: 'POST', body: fd });
      const result = deserialize(await res.text());
      if (result.type === 'error') { errorMessage = result.error?.message ?? 'Something went wrong.'; return; }
      if (result.type !== 'success' || !result.data?.success) { errorMessage = (result.data?.error as string) ?? 'Unable to create account.'; return; }
      await goto('/student');
    } catch (err: unknown) {
      errorMessage = err instanceof Error ? err.message : 'Network error';
    } finally {
      isLoading = false;
    }
  }

  const STEPS = ['Verify receipt', 'Your details', 'Set password'];
</script>

<svelte:head>
  <title>Register — MOUAU eTest</title>
</svelte:head>

<div class="root">

  <!-- ── Mobile banner ──────────────────────────────────────────── -->
  <div class="mobile-banner">
    <div class="mobile-banner-inner">
      <div class="mb-top">
        <div class="brand">
          <div class="brand-icon"><ShieldCheck size={18} strokeWidth={1.5} /></div>
          <div>
            <p class="brand-name">MOUAU eTest</p>
            <p class="brand-sub">Secure Examination Platform</p>
          </div>
        </div>
      </div>
      <div class="mb-steps">
        {#each STEPS as label, i}
          <div class="mb-step" class:mb-step--done={currentStep > i + 1} class:mb-step--active={currentStep === i + 1}>
            <div class="mb-step-dot">
              {#if currentStep > i + 1}<Check size={10} strokeWidth={3} />{:else}{i + 1}{/if}
            </div>
            <span class="mb-step-label">{label}</span>
          </div>
          {#if i < STEPS.length - 1}
            <div class="mb-step-line" class:mb-step-line--filled={currentStep > i + 1}></div>
          {/if}
        {/each}
      </div>
    </div>
    <div class="mb-glow"></div>
    <div class="mb-grid"></div>
  </div>

  <!-- ── Left panel ─────────────────────────────────────────────── -->
  <aside class="panel-left">
    <div class="panel-left-inner">
      <div class="brand">
        <div class="brand-icon"><ShieldCheck size={28} /></div>
        <div>
          <p class="brand-name">MOUAU eTest</p>
          <p class="brand-sub">Secure Examination Platform</p>
        </div>
      </div>
      <div class="panel-body">
        <div class="hero-badge">
          <ShieldCheck size={12} />
          <span>Trusted by 12,000+ students</span>
        </div>
        <h1 class="panel-heading">Your<br/>exam<br/><span class="gradient-text">account.</span></h1>
        <p class="panel-desc">
          Register once with your school fee receipt. All details are verified automatically — no admin required.
        </p>
        <div class="step-track">
          {#each STEPS as label, i}
            <div class="st-item" class:done={currentStep > i + 1} class:active={currentStep === i + 1}>
              <div class="st-circle">
                {#if currentStep > i + 1}<Check size={13} />{:else}{i + 1}{/if}
              </div>
              <span class="st-label">{label}</span>
            </div>
            {#if i < STEPS.length - 1}
              <div class="st-line" class:filled={currentStep > i + 1}></div>
            {/if}
          {/each}
        </div>
      </div>
      <div class="panel-footer">
        <div class="footer-divider"></div>
        <p>© {new Date().getFullYear()} Michael Okpara University of Agriculture</p>
      </div>
    </div>
    <div class="glow-orb glow-1"></div>
    <div class="glow-orb glow-2"></div>
    <div class="grid-pattern"></div>
  </aside>

  <!-- ── Right panel ─────────────────────────────────────────────── -->
  <main class="panel-right">
    <div class="top-right"><ThemeToggle /></div>

    <div class="form-wrap">
      <div class="form-header">
        <div class="form-badge">
          <ShieldCheck size={11} strokeWidth={2.5} />
          <span>Step {currentStep} of {STEPS.length}</span>
        </div>
        <h2 class="form-title">{STEPS[currentStep - 1]}</h2>
        <p class="form-hint">
          {#if currentStep === 1}Enter your matric number and verify your school fee receipt
          {:else if currentStep === 2}Confirm your academic details
          {:else}Create a secure password for your account
          {/if}
        </p>
      </div>

      {#if errorMessage}
        <div class="error-box" role="alert">
          <AlertCircle size={15} /><span>{errorMessage}</span>
        </div>
      {/if}

      <!-- ══ STEP 1 ══ -->
      {#if currentStep === 1}
        <div class="step-body">
          <div class="field">
            <label class="field-label" for="s1matric">Matric number <span class="req">*</span></label>
            <div class="field-input-wrap" class:error={!!matricError}>
              <span class="field-icon"><Briefcase size={16} /></span>
              <input id="s1matric" type="text" bind:value={uniMatric} oninput={onMatricInput}
                placeholder="MOUAU/PHY/25/001002" class="field-input"
                class:field-input-error={!!matricError} />
            </div>
            {#if matricError}<p class="inline-error"><AlertCircle size={13} /> {matricError}</p>{/if}
          </div>

          <div class="scan-box" class:scan-box--locked={!!matricError}>
            <p class="scan-box-label">
              <QrCode size={14} /> Scan school fee QR code
              {#if matricError}<span class="lock-note">— fix matric number first</span>{/if}
            </p>
            <div class="scan-btns">
              <button type="button" class="scan-btn" onclick={startWebcam} disabled={!!matricError}>
                <Camera size={14} /> Live camera
              </button>
              <label class="scan-btn" class:scan-btn--disabled={!!matricError}>
                <Upload size={14} /> Upload image
                <input type="file" accept="image/*" class="sr-only" disabled={!!matricError} onchange={handleQrUpload} />
              </label>
            </div>
          </div>

          {#if camError}<p class="cam-error"><AlertCircle size={13} /> {camError}</p>{/if}

          {#if showWebcam}
            <div class="webcam-wrap">
              <div class="webcam-frame">
                <!-- svelte-ignore a11y-media-has-caption -->
                <video bind:this={videoEl} playsinline autoplay class="webcam-video"></video>
                <div class="scan-reticle"></div>
              </div>
              <p class="webcam-hint">Point at the QR code on your receipt</p>
              <button type="button" class="stop-cam-btn" onclick={stopWebcam}>
                <X size={13} /> Cancel camera
              </button>
            </div>
          {/if}

          <div class="field">
            <label class="field-label">Transaction ref <span class="opt">(or paste from QR)</span></label>
            <div class="field-input-wrap ref-wrap" class:error={!!refError && !receiptFetched}>
              <span class="field-icon"><QrCode size={16} /></span>
              <input
                type={refMasked ? 'password' : 'text'}
                value={refMasked ? '••••••••••••' : refNumber}
                oninput={(e) => { refNumber = (e.target as HTMLInputElement).value; onRefInput(); }}
                placeholder="Remita RRR Code"
                class="field-input"
                class:inp--masked={refMasked}
                class:field-input-error={!!refError && !receiptFetched}
                disabled={!!matricError || receiptLoading}
                readonly={refMasked}
              />
              {#if receiptLoading}
                <div class="ref-state"><span class="mini-spinner"></span> Verifying…</div>
              {:else if !refMasked}
                <button type="button" class="fetch-btn"
                  onclick={() => fetchReceipt(false)}
                  disabled={!refNumber.trim() || !!matricError}>Fetch</button>
              {:else}
                <button type="button" class="ref-clear-btn" onclick={() => {
                  refNumber = ''; refMasked = false; receiptRaw = null;
                  receiptPreview = null; receiptFetched = false;
                  surname = firstName = otherName = jambRegNo = college = department = '';
                  refError = ''; refTouched = false;
                }} title="Clear"><X size={13} /></button>
              {/if}
            </div>
            {#if refError && !receiptFetched}
              <p class="inline-error"><AlertCircle size={13} /> {refError}</p>
            {/if}
            <span class="field-hint">Found on your MOUAU portal or school fee receipt</span>
          </div>

          {#if receiptPreview}
            <div class="receipt-card">
              <p class="receipt-title"><Check size={12} /> Verified — details auto-filled below</p>
              <div class="receipt-rows">
                {#each Object.entries(receiptPreview) as [k, v] (k)}
                  {#if v}<div class="receipt-row"><span class="rk">{k}</span><span class="rv">{v}</span></div>{/if}
                {/each}
              </div>
            </div>
          {/if}

          <button type="button" class="submit-btn" onclick={nextStep} disabled={!receiptFetched}>
            {#if !receiptFetched}Verify receipt first{:else}Continue <ChevronRight size={16} />{/if}
          </button>
          <p class="signin-link">Already have an account? <a href="/login">Sign in</a></p>
        </div>
      {/if}

      <!-- ══ STEP 2 ══ -->
      {#if currentStep === 2}
        <div class="step-body">
          {#if receiptFetched}
            <div class="prefill-notice">
              <Check size={13} />
              <span>Fields filled from your receipt are locked.
                <button type="button" class="rescan-link" onclick={() => {
                  receiptFetched = false; receiptRaw = null; receiptPreview = null; currentStep = 1;
                }}><RefreshCw size={11} /> Re-scan</button>
              </span>
            </div>
          {/if}

          <div class="field-row">
            <div class="field">
              <label class="field-label" for="s2sn">
                Surname <span class="req">*</span>
                {#if receiptFetched}<Lock size={11} class="lock-icon" />{/if}
              </label>
              <div class="field-input-wrap" class:error={!!getError2('surname')}>
                <span class="field-icon"><User size={16} /></span>
                <input id="s2sn" type="text" bind:value={surname}
                  class="field-input" class:field-input-error={!!getError2('surname')}
                  placeholder="Adebayo" readonly={receiptFetched}
                  onblur={(e) => validateStep2Field('surname', e.currentTarget.value)}
                  oninput={(e) => { if (touched2.surname) validateStep2Field('surname', e.currentTarget.value); }} />
              </div>
              {#if getError2('surname')}<p class="inline-error"><AlertCircle size={13} /> {getError2('surname')}</p>{/if}
            </div>
            <div class="field">
              <label class="field-label" for="s2fn">
                First name <span class="req">*</span>
                {#if receiptFetched}<Lock size={11} class="lock-icon" />{/if}
              </label>
              <div class="field-input-wrap" class:error={!!getError2('firstName')}>
                <span class="field-icon"><User size={16} /></span>
                <input id="s2fn" type="text" bind:value={firstName}
                  class="field-input" class:field-input-error={!!getError2('firstName')}
                  placeholder="Oluwaseun" readonly={receiptFetched}
                  onblur={(e) => validateStep2Field('firstName', e.currentTarget.value)}
                  oninput={(e) => { if (touched2.firstName) validateStep2Field('firstName', e.currentTarget.value); }} />
              </div>
              {#if getError2('firstName')}<p class="inline-error"><AlertCircle size={13} /> {getError2('firstName')}</p>{/if}
            </div>
          </div>

          <div class="field">
            <label class="field-label">
              Other name(s)
              {#if receiptFetched}<Lock size={11} class="lock-icon" />{:else}<span class="opt">optional</span>{/if}
            </label>
            <div class="field-input-wrap">
              <span class="field-icon"><User size={16} /></span>
              <input type="text" bind:value={otherName} placeholder="Middle name"
                class="field-input" readonly={receiptFetched} />
            </div>
          </div>

          <div class="field">
            <label class="field-label" for="s2matric">
              Matric / reg. number <span class="req">*</span>
              {#if receiptFetched}<Lock size={11} class="lock-icon" />{/if}
            </label>
            <div class="field-input-wrap" class:error={!!getError2('matricNumber')}>
              <span class="field-icon"><Briefcase size={16} /></span>
              <input id="s2matric" type="text" bind:value={matricNumber}
                class="field-input" class:field-input-error={!!getError2('matricNumber')}
                placeholder="MOUAU/CSC/25/001" readonly={receiptFetched}
                onblur={(e) => validateStep2Field('matricNumber', e.currentTarget.value)}
                oninput={(e) => { if (touched2.matricNumber) validateStep2Field('matricNumber', e.currentTarget.value); }} />
            </div>
            {#if getError2('matricNumber')}<p class="inline-error"><AlertCircle size={13} /> {getError2('matricNumber')}</p>{/if}
          </div>

          <div class="field">
            <label class="field-label">
              JAMB reg. number
              {#if receiptFetched}<Lock size={11} class="lock-icon" />{:else}<span class="opt">optional</span>{/if}
            </label>
            <div class="field-input-wrap">
              <span class="field-icon"><Briefcase size={16} /></span>
              <input type="text" bind:value={jambRegNo} placeholder="202551405692CF"
                class="field-input" readonly={receiptFetched} maxlength="14" />
            </div>
          </div>

          <div class="field-row">
            <div class="field">
              <label class="field-label">
                College / Faculty
                {#if receiptFetched}<Lock size={11} class="lock-icon" />{:else}<span class="opt">optional</span>{/if}
              </label>
              <div class="field-input-wrap">
                <span class="field-icon"><Building2 size={16} /></span>
                <input type="text" bind:value={college} placeholder="Natural Sciences"
                  class="field-input" readonly={receiptFetched} />
              </div>
            </div>
            <div class="field">
              <label class="field-label">
                Department <span class="req">*</span>
                {#if receiptFetched}<Lock size={11} class="lock-icon" />{/if}
              </label>
              <div class="field-input-wrap" class:error={!!getError2('department')}>
                <span class="field-icon"><BookOpen size={16} /></span>
                <input type="text" bind:value={department}
                  class="field-input" class:field-input-error={!!getError2('department')}
                  placeholder="Computer Science" readonly={receiptFetched}
                  onblur={(e) => validateStep2Field('department', e.currentTarget.value)}
                  oninput={(e) => { if (touched2.department) validateStep2Field('department', e.currentTarget.value); }} />
              </div>
              {#if getError2('department')}<p class="inline-error"><AlertCircle size={13} /> {getError2('department')}</p>{/if}
            </div>
          </div>

          <div class="field-row">
            <div class="field">
              <label class="field-label" for="s2level">
                Level
                {#if receiptFetched}<Lock size={11} class="lock-icon" />{:else}<span class="opt">optional</span>{/if}
              </label>
              <div class="field-input-wrap">
                <span class="field-icon"><Briefcase size={16} /></span>
                <select id="s2level" bind:value={level} class="field-input sel" disabled={receiptFetched}>
                  <option value="">—</option>
                  {#each [100, 200, 300, 400, 500] as l}<option value={String(l)}>{l}</option>{/each}
                </select>
              </div>
            </div>
            <div class="field">
              <label class="field-label"><Phone size={13} /> Phone <span class="opt">optional</span></label>
              <div class="field-input-wrap">
                <span class="field-icon"><Phone size={16} /></span>
                <input type="tel" bind:value={phone} placeholder="+234 801 234 5678" class="field-input" />
              </div>
            </div>
          </div>

          <div class="field">
            <label class="field-label" for="s2email">Email address <span class="req">*</span></label>
            <div class="field-input-wrap" class:error={!!getError2('email')}>
              <span class="field-icon"><Mail size={16} /></span>
              <input id="s2email" type="email" bind:value={email}
                class="field-input" class:field-input-error={!!getError2('email')}
                placeholder="you@student.mouau.edu.ng"
                onblur={(e) => validateStep2Field('email', e.currentTarget.value)}
                oninput={(e) => { if (touched2.email) validateStep2Field('email', e.currentTarget.value); }} />
            </div>
            {#if getError2('email')}<p class="inline-error"><AlertCircle size={13} /> {getError2('email')}</p>{/if}
          </div>

          <div class="actions">
            <button type="button" class="back-btn" onclick={prevStep}><ChevronLeft size={16} /> Back</button>
            <button type="button" class="submit-btn" onclick={nextStep}>Continue <ChevronRight size={16} /></button>
          </div>
        </div>
      {/if}

      <!-- ══ STEP 3 ══ -->
      {#if currentStep === 3}
        <div class="step-body">
          <div class="field">
            <label class="field-label" for="s3pw">Password <span class="req">*</span></label>
            <div class="field-input-wrap" class:error={touched3.password && !!errors3.password}>
              <span class="field-icon"><Lock size={16} /></span>
              <input id="s3pw" type={showPassword ? 'text' : 'password'} bind:value={password}
                placeholder="Minimum 8 characters"
                class="field-input field-input-pass"
                class:field-input-error={touched3.password && !!errors3.password}
                disabled={isLoading}
                onblur={(e) => touchPassword(e.currentTarget.value)}
                oninput={(e) => { if (touched3.password) touchPassword(e.currentTarget.value); }} />
              <button type="button" class="pass-toggle" onclick={() => showPassword = !showPassword}>
                {#if showPassword}<EyeOff size={16} />{:else}<Eye size={16} />{/if}
              </button>
            </div>
            {#if touched3.password && errors3.password}
              <p class="inline-error"><AlertCircle size={13} /> {errors3.password}</p>
            {/if}
            <span class="field-hint">Minimum 8 characters</span>
          </div>

          <div class="field">
            <label class="field-label" for="s3pw2">Confirm password <span class="req">*</span></label>
            <div class="field-input-wrap" class:error={touched3.confirm && !!errors3.confirm}>
              <span class="field-icon"><Lock size={16} /></span>
              <input id="s3pw2" type={showConfirmPassword ? 'text' : 'password'} bind:value={confirmPassword}
                placeholder="Repeat your password"
                class="field-input field-input-pass"
                class:field-input-error={touched3.confirm && !!errors3.confirm}
                disabled={isLoading}
                onblur={(e) => touchConfirm(e.currentTarget.value)}
                oninput={(e) => { if (touched3.confirm) touchConfirm(e.currentTarget.value); }} />
              <button type="button" class="pass-toggle" onclick={() => showConfirmPassword = !showConfirmPassword}>
                {#if showConfirmPassword}<EyeOff size={16} />{:else}<Eye size={16} />{/if}
              </button>
            </div>
            {#if touched3.confirm && errors3.confirm}
              <p class="inline-error"><AlertCircle size={13} /> {errors3.confirm}</p>
            {/if}
          </div>

          <div class="info-box">
            <ShieldCheck size={14} />
            <p>This is a secure platform. All activities are monitored and logged.</p>
          </div>

          <div class="actions">
            <button type="button" class="back-btn" onclick={prevStep} disabled={isLoading}>
              <ChevronLeft size={16} /> Back
            </button>
            <button type="button" class="submit-btn" onclick={handleSubmit} disabled={isLoading}>
              {#if isLoading}<span class="spinner"></span> Creating account…
              {:else}<UserPlus size={16} /> Create account{/if}
            </button>
          </div>
          <p class="signin-link">Already have an account? <a href="/login">Sign in</a></p>
        </div>
      {/if}

    </div>
  </main>
</div>

<style>
  /* ── Tokens ──────────────────────────────────────────────────── */
  :global(:root),
  :global([data-theme="light"]) {
    --reg-bg:               #ffffff;
    --reg-bg-card:          #f8fafc;
    --reg-text:             #0f172a;
    --reg-text-muted:       #64748b;
    --reg-border:           #e2e8f0;
    --reg-primary:          #059669;
    --reg-primary-hover:    #047857;
    --reg-primary-light:    #d1fae5;
    --reg-primary-accent:   #34d399;
    --reg-error:            #dc2626;
    --reg-error-bg:         #fef2f2;
    --reg-error-bdr:        #fecaca;
    --reg-error-clr:        #dc2626;
    --reg-shadow-sm:        0 1px 2px 0 rgb(0 0 0 / 0.05);
  }

  :global([data-theme="dark"]),
  :global(.dark) {
    --reg-bg:               #0a0c10;
    --reg-bg-card:          #14171c;
    --reg-text:             #e8edf5;
    --reg-text-muted:       #8b95a5;
    --reg-border:           #262a33;
    --reg-primary:          #059669;
    --reg-primary-hover:    #047857;
    --reg-primary-light:    rgba(5, 150, 105, 0.15);
    --reg-primary-accent:   #34d399;
    --reg-error:            #dc2626;
    --reg-error-bg:         rgba(220, 38, 38, 0.12);
    --reg-error-bdr:        rgba(220, 38, 38, 0.35);
    --reg-error-clr:        #f87171;
    --reg-shadow-sm:        0 1px 2px 0 rgb(0 0 0 / 0.4);
  }

  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

  /* ── Layout ──────────────────────────────────────────────────── */
  .root {
    min-height: 100vh;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto 1fr;
    background: var(--reg-bg);
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  }

  /* ── Mobile banner ───────────────────────────────────────────── */
  .mobile-banner {
    display: none;
    grid-column: 1 / -1;
    background: var(--reg-bg-card);
    padding: 1.25rem 1.5rem 1.5rem;
    position: relative;
    overflow: hidden;
    isolation: isolate;
  }

  .mobile-banner-inner {
    position: relative; z-index: 1;
    display: flex; flex-direction: column; gap: 1rem;
  }

  .mb-top { display: flex; align-items: center; justify-content: space-between; }

  .mb-steps { display: flex; align-items: center; gap: 0; }

  .mb-step {
    display: flex; align-items: center; gap: 0.375rem;
    flex-shrink: 0; opacity: 0.4; transition: opacity 0.2s;
  }
  .mb-step--active { opacity: 1; }
  .mb-step--done   { opacity: 0.65; }

  .mb-step-dot {
    width: 22px; height: 22px; border-radius: 50%;
    background: rgba(5, 150, 105, 0.1);
    border: 1.5px solid rgba(5, 150, 105, 0.2);
    display: flex; align-items: center; justify-content: center;
    font-size: 0.65rem; font-weight: 700;
    color: rgba(5, 150, 105, 0.6);
    flex-shrink: 0; transition: all 0.2s;
  }
  .mb-step--active .mb-step-dot { background: var(--reg-primary); border-color: var(--reg-primary); color: white; }
  .mb-step--done   .mb-step-dot { background: rgba(5, 150, 105, 0.25); border-color: rgba(5, 150, 105, 0.5); color: var(--reg-primary-accent); }

  .mb-step-label { font-size: 0.7rem; font-weight: 600; color: var(--reg-text-muted); white-space: nowrap; }
  .mb-step--active .mb-step-label { color: var(--reg-text); }

  .mb-step-line {
    flex: 1; height: 1.5px; background: var(--reg-border);
    margin: 0 0.5rem; transition: background 0.3s; min-width: 16px;
  }
  .mb-step-line--filled { background: rgba(5, 150, 105, 0.45); }

  .mb-glow {
    position: absolute; inset: 0;
    background: radial-gradient(ellipse at 15% 50%, rgba(5, 150, 105, 0.2) 0%, transparent 60%);
    pointer-events: none;
  }
  .mb-grid {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(5, 150, 105, 0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(5, 150, 105, 0.05) 1px, transparent 1px);
    background-size: 32px 32px;
    mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%);
    pointer-events: none;
  }

  @media (max-width: 900px) {
    .root { grid-template-columns: 1fr; }
    .panel-left { display: none; }
    .mobile-banner { display: block; }
    .panel-right { align-items: flex-start; padding-top: 2rem; }
  }

  /* ── Left panel ──────────────────────────────────────────────── */
  .panel-left {
    background: var(--reg-bg-card);
    position: relative; overflow: hidden;
    display: flex; flex-direction: column;
    isolation: isolate; grid-row: 1 / -1;
  }

  .grid-pattern {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(5, 150, 105, 0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(5, 150, 105, 0.04) 1px, transparent 1px);
    background-size: 40px 40px;
    mask-image: radial-gradient(ellipse at center, black 40%, transparent 80%);
    pointer-events: none;
  }

  .glow-orb { position: absolute; border-radius: 50%; filter: blur(80px); pointer-events: none; opacity: 0.4; }
  .glow-1 {
    width: 500px; height: 500px;
    background: radial-gradient(circle, var(--reg-primary-light) 0%, transparent 70%);
    top: -10%; left: -10%;
    animation: float 8s ease-in-out infinite;
  }
  .glow-2 {
    width: 400px; height: 400px;
    background: radial-gradient(circle, var(--reg-primary-light) 0%, transparent 70%);
    bottom: -10%; right: -10%;
    animation: float 10s ease-in-out infinite reverse;
    opacity: 0.3;
  }

  @keyframes float {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33%       { transform: translate(30px, -30px) scale(1.05); }
    66%       { transform: translate(-20px, 20px) scale(0.95); }
  }

  .panel-left-inner {
    position: relative; z-index: 1;
    display: flex; flex-direction: column;
    height: 100%; padding: 2.5rem 3rem;
  }

  .brand { display: flex; align-items: center; gap: 0.875rem; }

  .brand-icon {
    width: 42px; height: 42px; border-radius: 12px;
    background: rgba(5, 150, 105, 0.15);
    border: 1px solid rgba(5, 150, 105, 0.25);
    display: flex; align-items: center; justify-content: center;
    color: var(--reg-primary-accent); flex-shrink: 0;
    backdrop-filter: blur(8px);
  }
  .mobile-banner .brand-icon { width: 34px; height: 34px; border-radius: 9px; }

  .brand-name { font-size: 0.9375rem; font-weight: 700; color: var(--reg-text); margin: 0; letter-spacing: -0.01em; }
  .brand-sub  { font-size: 0.6875rem; color: var(--reg-text-muted); margin: 0.125rem 0 0; letter-spacing: 0.04em; font-weight: 500; }

  .panel-body {
    flex: 1; display: flex; flex-direction: column;
    justify-content: center; padding: 3rem 0; max-width: 420px;
  }

  .hero-badge {
    display: inline-flex; align-items: center; gap: 0.375rem;
    padding: 0.375rem 0.875rem;
    background: var(--reg-primary-light);
    border: 1px solid rgba(5, 150, 105, 0.2);
    border-radius: 9999px;
    font-size: 0.6875rem; font-weight: 600; color: var(--reg-primary);
    width: fit-content; margin-bottom: 1.5rem;
  }

  .panel-heading {
    font-size: clamp(2.5rem, 4vw, 3.5rem);
    font-weight: 800; color: var(--reg-text);
    line-height: 1.1; letter-spacing: -0.03em; margin: 0 0 1.25rem;
  }

  .gradient-text {
    background: linear-gradient(135deg, #34d399 0%, #059669 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  }

  .panel-desc {
    font-size: 0.875rem; color: var(--reg-text-muted);
    line-height: 1.7; margin: 0 0 2rem; max-width: 340px;
  }

  /* Step track */
  .step-track { display: flex; flex-direction: column; gap: 0; margin-top: 2.5rem; }

  .st-item {
    display: flex; align-items: center; gap: 0.75rem;
    padding: 0.5rem 0; opacity: 0.45; transition: opacity 0.2s;
  }
  .st-item.active { opacity: 1; }
  .st-item.done   { opacity: 0.7; }

  .st-circle {
    width: 28px; height: 28px; border-radius: 50%;
    background: rgba(5, 150, 105, 0.08);
    border: 1.5px solid rgba(5, 150, 105, 0.2);
    display: flex; align-items: center; justify-content: center;
    font-size: 0.75rem; font-weight: 700; flex-shrink: 0; transition: all 0.2s;
    color: var(--reg-text-muted);
  }
  .st-item.active .st-circle { background: var(--reg-primary); border-color: var(--reg-primary); color: white; }
  .st-item.done  .st-circle  { background: rgba(5, 150, 105, 0.25); border-color: rgba(5, 150, 105, 0.5); color: var(--reg-primary-accent); }

  .st-label { font-size: 0.8rem; font-weight: 600; color: var(--reg-text); }

  .st-line {
    width: 2px; height: 24px; background: rgba(5, 150, 105, 0.1);
    margin-left: 13px; transition: background 0.3s;
  }
  .st-line.filled { background: rgba(5, 150, 105, 0.4); }

  .panel-footer { margin-top: auto; }
  .footer-divider { height: 1px; background: linear-gradient(90deg, transparent, rgba(5,150,105,0.15), transparent); margin-bottom: 1rem; }
  .panel-footer p { font-size: 0.6875rem; color: var(--reg-text-muted); margin: 0; text-align: center; opacity: 0.6; }

  /* ── Right panel ─────────────────────────────────────────────── */
  .panel-right {
    display: flex; align-items: flex-start; justify-content: center;
    padding: 3rem 1.5rem; background: var(--reg-bg);
    position: relative; overflow-y: auto;
  }

  .top-right { position: absolute; top: 1.25rem; right: 1.25rem; }
  .form-wrap  { width: 100%; max-width: 440px; padding-top: 1rem; }
  .form-header { text-align: center; margin-bottom: 1.75rem; }

  .form-badge {
    display: inline-flex; align-items: center; gap: 0.375rem;
    font-size: 0.6875rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.08em;
    color: var(--reg-primary);
    background: var(--reg-primary-light);
    border: 1px solid rgba(5, 150, 105, 0.2);
    padding: 0.375rem 0.75rem; border-radius: 9999px; margin-bottom: 1rem;
  }

  .form-title { font-size: 1.875rem; font-weight: 800; color: var(--reg-text); letter-spacing: -0.03em; margin: 0 0 0.5rem; }
  .form-hint  { color: var(--reg-text-muted); font-size: 0.8125rem; margin: 0; }

  /* Error */
  .error-box {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: var(--reg-error-bg); border: 1px solid var(--reg-error-bdr);
    color: var(--reg-error-clr); border-radius: 0.625rem;
    font-size: 0.85rem; margin-bottom: 1.25rem;
  }

  /* ── Fields ──────────────────────────────────────────────────── */
  .step-body { display: flex; flex-direction: column; gap: 0; animation: fadeUp 0.2s ease; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .field { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 1rem; }
  .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  @media (max-width: 480px) { .field-row { grid-template-columns: 1fr; } }

  .field-label {
    font-size: 0.75rem; font-weight: 600; color: var(--reg-text-muted);
    text-transform: uppercase; letter-spacing: 0.05em;
    display: flex; align-items: center; gap: 5px; flex-wrap: wrap;
  }

  .req  { color: var(--reg-primary); font-weight: 700; }
  .opt  { font-size: 0.68rem; font-weight: 400; color: var(--reg-text-muted); text-transform: none; letter-spacing: 0; }
  .lock-icon { color: var(--reg-text-muted); opacity: 0.6; flex-shrink: 0; }
  .field-hint { font-size: 0.72rem; color: var(--reg-text-muted); margin-top: -0.25rem; }

  .field-input-wrap { position: relative; }
  .field-input-wrap.error .field-icon { color: var(--reg-error); }

  .field-icon {
    position: absolute; left: 1rem; top: 50%; transform: translateY(-50%);
    color: var(--reg-text-muted); transition: color 0.15s; pointer-events: none;
  }

  .field-input {
    width: 100%; padding: 0.825rem 1rem 0.825rem 2.75rem;
    background: var(--reg-bg-card); border: 1.5px solid var(--reg-border);
    border-radius: 0.75rem; font-size: 0.95rem; outline: none;
    transition: all 0.2s; color: var(--reg-text); font-family: inherit;
  }

  .field-input:focus {
    border-color: var(--reg-primary);
    box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1);
  }

  .field-input:disabled,
  .field-input[readonly] {
    background: color-mix(in srgb, var(--reg-border) 40%, var(--reg-bg-card));
    color: var(--reg-text-muted); cursor: default;
  }

  .field-input-error { border-color: var(--reg-error) !important; box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.08) !important; }
  .field-input-pass  { padding-right: 3rem; }
  .inp--masked { letter-spacing: 0.2em; color: var(--reg-text-muted); }
  .sel { appearance: none; cursor: pointer; }

  .pass-toggle {
    position: absolute; right: 1rem; top: 50%; transform: translateY(-50%);
    background: none; border: none; color: var(--reg-text-muted);
    cursor: pointer; display: flex; align-items: center;
    padding: 0.25rem; border-radius: 0.25rem; transition: color 0.15s;
  }
  .pass-toggle:hover { color: var(--reg-text); }

  .inline-error {
    color: var(--reg-error-clr); font-size: 0.78rem;
    display: flex; align-items: center; gap: 0.35rem;
    animation: slideIn 0.2s ease;
  }

  @keyframes slideIn {
    from { opacity: 0; transform: translateY(-4px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── QR scan ─────────────────────────────────────────────────── */
  .scan-box {
    padding: 1rem; margin-bottom: 1rem;
    background: var(--reg-bg-card); border: 1.5px solid var(--reg-border);
    border-radius: 0.75rem; transition: opacity 0.2s;
  }
  .scan-box--locked { opacity: 0.5; pointer-events: none; }

  .scan-box-label {
    display: flex; align-items: center; gap: 6px;
    font-size: 0.78rem; font-weight: 600;
    color: var(--reg-text-muted); margin-bottom: 0.625rem;
  }
  .lock-note { font-weight: 400; font-size: 0.72rem; }

  .scan-btns { display: flex; gap: 8px; flex-wrap: wrap; }

  .scan-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 0.5rem 1rem; border: 1.5px solid var(--reg-border);
    border-radius: 0.5rem; background: var(--reg-bg);
    color: var(--reg-text-muted); font-size: 0.78rem; font-weight: 600;
    font-family: inherit; cursor: pointer; transition: all 0.15s;
  }
  .scan-btn:hover:not(:disabled) { border-color: var(--reg-primary); color: var(--reg-primary); }
  .scan-btn:disabled, .scan-btn--disabled { pointer-events: none; opacity: 0.45; }

  .cam-error { display: flex; align-items: center; gap: 5px; font-size: 0.78rem; color: var(--reg-error); margin-bottom: 0.75rem; }

  .webcam-wrap { display: flex; flex-direction: column; align-items: center; gap: 8px; margin-bottom: 1rem; }
  .webcam-frame { position: relative; width: 100%; border-radius: 0.75rem; overflow: hidden; background: #000; aspect-ratio: 4/3; }
  .webcam-video { width: 100%; height: 100%; object-fit: cover; display: block; }
  .scan-reticle {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    width: 150px; height: 150px;
    border: 2px solid var(--reg-primary); border-radius: 0.75rem;
    box-shadow: 0 0 0 9999px rgba(0,0,0,0.5); pointer-events: none;
  }
  .webcam-hint { font-size: 0.72rem; color: rgba(255,255,255,0.7); text-align: center; }
  .stop-cam-btn {
    display: flex; align-items: center; gap: 6px; padding: 0.45rem 0.875rem;
    border: 1px solid #fca5a5; border-radius: 0.5rem;
    background: #fee2e2; color: var(--reg-error);
    font-size: 0.78rem; font-weight: 600; cursor: pointer; font-family: inherit;
  }

  .ref-wrap .field-input { padding-right: 72px; }

  .fetch-btn {
    position: absolute; right: 6px; top: 50%; transform: translateY(-50%);
    padding: 0.35rem 0.875rem;
    background: linear-gradient(135deg, var(--reg-primary) 0%, var(--reg-primary-hover) 100%);
    color: white; border: none; border-radius: 0.5rem;
    font-size: 0.75rem; font-weight: 600; cursor: pointer; font-family: inherit; transition: opacity 0.15s;
  }
  .fetch-btn:disabled { opacity: 0.45; cursor: not-allowed; }

  .ref-state {
    position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
    display: flex; align-items: center; gap: 6px;
    font-size: 0.72rem; color: var(--reg-primary); font-weight: 600; pointer-events: none;
  }

  .ref-clear-btn {
    position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
    background: none; border: none; cursor: pointer;
    color: var(--reg-text-muted); display: flex; align-items: center;
    padding: 4px; border-radius: 4px; transition: color 0.15s;
  }
  .ref-clear-btn:hover { color: var(--reg-error); }

  /* Receipt card */
  .receipt-card {
    padding: 10px 12px; margin-bottom: 1rem;
    background: var(--reg-primary-light);
    border: 1px solid rgba(5, 150, 105, 0.3); border-radius: 0.75rem;
  }
  :global([data-theme="dark"]) .receipt-card,
  :global(.dark) .receipt-card { background: rgba(5, 150, 105, 0.08); border-color: rgba(5, 150, 105, 0.25); }

  .receipt-title {
    display: flex; align-items: center; gap: 6px;
    font-size: 0.7rem; font-weight: 700; color: var(--reg-primary);
    text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 8px;
  }
  :global([data-theme="dark"]) .receipt-title,
  :global(.dark) .receipt-title { color: var(--reg-primary-accent); }

  .receipt-rows { display: flex; flex-direction: column; gap: 3px; }
  .receipt-row { display: flex; justify-content: space-between; font-size: 0.78rem; gap: 8px; }
  .rk { color: var(--reg-text-muted); text-transform: capitalize; }
  .rv { color: var(--reg-text); font-weight: 500; text-align: right; }

  /* Prefill notice */
  .prefill-notice {
    display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
    padding: 8px 12px; margin-bottom: 1rem;
    background: rgba(5, 150, 105, 0.07);
    border: 1px solid rgba(5, 150, 105, 0.2);
    border-radius: 0.625rem; font-size: 0.78rem; color: var(--reg-text-muted);
  }

  .rescan-link {
    display: inline-flex; align-items: center; gap: 4px;
    background: none; border: none; color: var(--reg-primary);
    font-size: 0.72rem; font-weight: 600; cursor: pointer;
    margin-left: auto; padding: 0; font-family: inherit;
  }

  /* ── Buttons ─────────────────────────────────────────────────── */
  .submit-btn {
    width: 100%; padding: 0.875rem;
    background: linear-gradient(135deg, var(--reg-primary) 0%, var(--reg-primary-hover) 100%);
    color: white; border: none; border-radius: 0.75rem;
    font-size: 0.95rem; font-weight: 600; cursor: pointer; font-family: inherit;
    display: flex; align-items: center; justify-content: center; gap: 0.5rem;
    margin-top: 0.25rem; transition: all 0.15s;
    box-shadow: 0 1px 3px rgba(5, 150, 105, 0.3);
  }
  .submit-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 15px rgba(5, 150, 105, 0.35);
  }
  .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; background: var(--reg-border); box-shadow: none; }

  .back-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 0.825rem 1.25rem;
    background: var(--reg-bg-card); border: 1.5px solid var(--reg-border);
    border-radius: 0.75rem; font-size: 0.9rem; font-weight: 600;
    color: var(--reg-text-muted); cursor: pointer; font-family: inherit;
    transition: all 0.15s; flex-shrink: 0;
  }
  .back-btn:hover { border-color: var(--reg-primary); color: var(--reg-primary); }
  .back-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  .actions { display: flex; gap: 10px; margin-top: 0.25rem; }
  .actions .submit-btn { flex: 1; width: auto; }

  @media (max-width: 480px) {
    .actions { flex-direction: column-reverse; }
    .actions .submit-btn, .back-btn { width: 100%; justify-content: center; }
  }

  /* ── Misc ────────────────────────────────────────────────────── */
  .mini-spinner {
    width: 10px; height: 10px;
    border: 2px solid rgba(5, 150, 105, 0.3); border-top-color: var(--reg-primary);
    border-radius: 50%; animation: spin 0.6s linear infinite; display: inline-block;
  }

  .spinner {
    width: 18px; height: 18px;
    border: 2px solid rgba(255, 255, 255, 0.3); border-top-color: white;
    border-radius: 50%; animation: spin 0.7s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .info-box {
    margin-bottom: 1rem; padding: 0.875rem 1rem;
    background: var(--reg-bg-card); border-radius: 0.5rem;
    font-size: 0.75rem; color: var(--reg-text-muted);
    display: flex; align-items: center; gap: 0.5rem;
    border: 1px solid var(--reg-border);
  }

  .signin-link { text-align: center; font-size: 0.875rem; color: var(--reg-text-muted); margin-top: 1.25rem; }
  .signin-link a { color: var(--reg-primary); font-weight: 600; text-decoration: none; }
  .signin-link a:hover { color: var(--reg-primary-hover); }

  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); }

  @media (prefers-reduced-motion: reduce) {
    .step-body, .mini-spinner, .spinner, .inline-error,
    .glow-1, .glow-2 { animation: none; transition: none; }
  }
</style>