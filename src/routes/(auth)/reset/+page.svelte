<!-- src/routes/(auth)/reset/+page.svelte -->
<script lang="ts">
  import { onMount }     from 'svelte';
  import { deserialize } from '$app/forms';
  import { goto }        from '$app/navigation';
  import { initTheme }   from '$lib/index.js';
  import ThemeToggle     from '$lib/components/ui/ThemeToggle.svelte';
  import {
    Lock, Eye, EyeOff, ArrowRight, ArrowLeft,
    KeyRound, CheckCircle, AlertCircle, ShieldCheck,
  } from '@lucide/svelte';

  onMount(() => initTheme());

  // ── State machine: verify → reset → done ──────────────────────
  type Stage = 'verify' | 'reset' | 'done';
  let stage    = $state<Stage>('verify');
  let loading  = $state(false);
  let error    = $state('');
  let token    = $state('');

  // OTP input — 6 individual boxes
  let otp = $state(['', '', '', '', '', '']);

  // Password fields
  let password    = $state('');
  let confirm     = $state('');
  let showPass    = $state(false);
  let showConfirm = $state(false);

  const otpValue = $derived(otp.join(''));

  // ── OTP box handling ──────────────────────────────────────────
  let otpInputs: HTMLInputElement[] = [];

  function onOtpInput(i: number, e: Event) {
    const val = (e.target as HTMLInputElement).value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    otp[i] = val.slice(-1);
    if (val && i < 5) {
      otpInputs[i + 1]?.focus();
    }
  }

  function onOtpKeydown(i: number, e: KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      otp[i - 1] = '';
      otpInputs[i - 1]?.focus();
    }
    if (e.key === 'ArrowLeft'  && i > 0) otpInputs[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < 5) otpInputs[i + 1]?.focus();
  }

  function onOtpPaste(e: ClipboardEvent) {
    e.preventDefault();
    const text = (e.clipboardData?.getData('text') ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const chars = text.slice(0, 6).split('');
    otp = [...chars, ...Array(6).fill('')].slice(0, 6) as typeof otp;
    otpInputs[Math.min(chars.length, 5)]?.focus();
  }

  // ── Verify OTP ────────────────────────────────────────────────
  async function verifyToken() {
    error = '';
    if (otpValue.length !== 6) { error = 'Please enter all 6 characters.'; return; }
    loading = true;
    try {
      const fd = new FormData();
      fd.set('token', otpValue);
      const res    = await fetch('?/verifyToken', { method: 'POST', body: fd });
      const result = deserialize(await res.text()) as any;
      if (result.data?.error) { error = result.data.error; return; }
      token = otpValue;
      stage = 'reset';
    } catch { error = 'Network error.'; }
    finally { loading = false; }
  }

  // ── Reset password ────────────────────────────────────────────
  async function resetPassword() {
    error = '';
    if (password.length < 8) { error = 'Password must be at least 8 characters.'; return; }
    if (password !== confirm) { error = 'Passwords do not match.'; return; }
    loading = true;
    try {
      const fd = new FormData();
      fd.set('token',    token);
      fd.set('password', password);
      fd.set('confirm',  confirm);
      const res    = await fetch('?/resetPassword', { method: 'POST', body: fd });
      const result = deserialize(await res.text()) as any;
      if (result.data?.error) { error = result.data.error; return; }
      stage = 'done';
    } catch { error = 'Network error.'; }
    finally { loading = false; }
  }

  // Password strength
  const strength = $derived(() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8)           s++;
    if (password.length >= 12)          s++;
    if (/[A-Z]/.test(password))         s++;
    if (/[0-9]/.test(password))         s++;
    if (/[^A-Za-z0-9]/.test(password))  s++;
    return s;
  });
  const strengthInfo = $derived(() => {
    const s = strength();
    if (s <= 1) return { label: 'Weak',   color: '#ef4444' };
    if (s <= 3) return { label: 'Fair',   color: '#f59e0b' };
    if (s <= 4) return { label: 'Good',   color: '#3b82f6' };
    return               { label: 'Strong', color: '#22c55e' };
  });

  // Stage → step index for the step indicator
  const stepIndex = $derived(stage === 'verify' ? 1 : stage === 'reset' ? 2 : 3);
</script>

<svelte:head><title>Reset Password — MOUAU eTest</title></svelte:head>

<div class="root">

  <!-- ── Left panel ───────────────────────────────────────────── -->
  <aside class="panel-left">
    <div class="panel-left-inner">
      <div class="brand">
        <div class="brand-icon"><ShieldCheck size={26} strokeWidth={1.5} /></div>
        <div>
          <p class="brand-name">MOUAU eTest</p>
          <p class="brand-sub">Secure Examination Platform</p>
        </div>
      </div>
      <div class="panel-body">
        <h1 class="panel-heading">Secure<br/>your<br/>account.</h1>
        <p class="panel-desc">
          You're just a few steps away from regaining access to MOUAU eTest.
          Your reset code expires in 15 minutes.
        </p>
        <ul class="features">
          {#each [
            'Enter your 6-character reset code',
            'Choose a strong new password',
            'All sessions signed out on reset',
            'Secure end-to-end verification',
          ] as f}
            <li><span class="dot"></span>{f}</li>
          {/each}
        </ul>
      </div>
      <p class="panel-footer">© {new Date().getFullYear()} Michael Okpara University of Agriculture</p>
    </div>
  </aside>

  <!-- ── Right panel ──────────────────────────────────────────── -->
  <main class="panel-right">
    <div class="top-bar">
      <a href="/login" class="back-link">
        <ArrowLeft size={15} /> Back to Login
      </a>
      <ThemeToggle />
    </div>

    <div class="form-wrap">

      <!-- Header -->
      <div class="form-header">
        <div class="form-icon">
          <KeyRound size={22} strokeWidth={1.5} />
        </div>
        <h2 class="form-title">
          {#if stage === 'verify'}Enter your reset code
          {:else if stage === 'reset'}Choose a new password
          {:else}Password changed!
          {/if}
        </h2>
        <p class="form-hint">
          {#if stage === 'verify'}Enter the 6-character code from your reset link
          {:else if stage === 'reset'}Your code has been verified — set your new password
          {:else}You can now sign in with your new password
          {/if}
        </p>
      </div>

      <!-- Step indicator -->
      <div class="steps">
        <div class="step" class:done={stepIndex > 1} class:active={stepIndex === 1}>
          <div class="step-dot">1</div>
          <span>Email</span>
        </div>
        <div class="step-connector" class:done={stepIndex > 1}></div>
        <div class="step" class:done={stepIndex > 2} class:active={stepIndex === 2}>
          <div class="step-dot">2</div>
          <span>Verify</span>
        </div>
        <div class="step-connector" class:done={stepIndex > 2}></div>
        <div class="step" class:done={stepIndex > 3} class:active={stepIndex === 3}>
          <div class="step-dot">3</div>
          <span>New Password</span>
        </div>
      </div>

      <!-- Error -->
      {#if error}
        <div class="error-box">
          <AlertCircle size={15} /><span>{error}</span>
        </div>
      {/if}

      <!-- ══ STAGE: verify ══ -->
      {#if stage === 'verify'}

        <!-- Hint -->
        <div class="info-box">
          <p class="info-box-title">How to find your code</p>
          <div class="how-step">
            <span class="how-num">1</span>
            <span>Click <em>Open Link</em> or <em>Verify My Code</em> in the email</span>
          </div>
          <div class="how-step">
            <span class="how-num">2</span>
            <span>Your 6-character code appears in the new tab</span>
          </div>
          <div class="how-step">
            <span class="how-num">3</span>
            <span>Return here and type it below</span>
          </div>
        </div>

        <!-- OTP boxes -->
        <div class="otp-section">
          <label class="field-label">Reset code</label>
          <div class="otp-wrap">
            {#each otp as _, i}
              <input
                bind:this={otpInputs[i]}
                type="text" maxlength="1"
                value={otp[i]}
                class="otp-box"
                class:filled={!!otp[i]}
                oninput={(e) => onOtpInput(i, e)}
                onkeydown={(e) => onOtpKeydown(i, e)}
                onpaste={onOtpPaste}
                inputmode="text"
                autocomplete="one-time-code"
                aria-label="Code character {i + 1}"
              />
            {/each}
          </div>
          <p class="otp-sub">
            Need a new code? <a href="/forgot" class="green-link">Request another</a>
          </p>
        </div>

        <button
          class="submit-btn"
          onclick={verifyToken}
          type="button"
          disabled={loading || otpValue.length !== 6}
        >
          {#if loading}
            <span class="spinner"></span> Verifying…
          {:else}
            Verify Code <ArrowRight size={16} />
          {/if}
        </button>

      <!-- ══ STAGE: reset ══ -->
      {:else if stage === 'reset'}

        <!-- Token badge -->
        <div class="token-badge">
          <CheckCircle size={14} />
          Code confirmed: <strong>{token}</strong>
        </div>

        <!-- New password field -->
        <div class="field">
          <label for="password" class="field-label">New Password</label>
          <div class="field-wrap">
            <span class="fi"><Lock size={15} /></span>
            <input
              id="password"
              type={showPass ? 'text' : 'password'}
              bind:value={password}
              placeholder="Create a strong password"
              class="fi-input fi-input--toggle"
              disabled={loading}
            />
            <button class="eye-btn" type="button" onclick={() => { showPass = !showPass; }}>
              {#if showPass}<EyeOff size={15} />{:else}<Eye size={15} />{/if}
            </button>
          </div>
          {#if password}
            <div class="strength-row">
              <div class="strength-bars">
                {#each [1,2,3,4,5] as i}
                  <div class="strength-bar"
                    style="background:{i <= strength() ? strengthInfo().color : 'var(--color-border)'}">
                  </div>
                {/each}
              </div>
              <span class="strength-label" style="color:{strengthInfo().color}">
                {strengthInfo().label}
              </span>
            </div>
          {/if}
        </div>

        <!-- Confirm password field -->
        <div class="field">
          <label for="confirm" class="field-label">Confirm Password</label>
          <div class="field-wrap">
            <span class="fi"><Lock size={15} /></span>
            <input
              id="confirm"
              type={showConfirm ? 'text' : 'password'}
              bind:value={confirm}
              placeholder="Repeat your password"
              class="fi-input fi-input--toggle"
              disabled={loading}
            />
            <button class="eye-btn" type="button" onclick={() => { showConfirm = !showConfirm; }}>
              {#if showConfirm}<EyeOff size={15} />{:else}<Eye size={15} />{/if}
            </button>
          </div>
          {#if confirm && confirm === password}
            <p class="field-hint success">✓ Passwords match</p>
          {:else if confirm && confirm !== password}
            <p class="field-hint error-hint">Passwords do not match</p>
          {/if}
        </div>

        <button
          class="submit-btn"
          onclick={resetPassword}
          type="button"
          disabled={loading}
        >
          {#if loading}
            <span class="spinner"></span> Saving…
          {:else}
            Set New Password <ArrowRight size={16} />
          {/if}
        </button>

      <!-- ══ STAGE: done ══ -->
      {:else if stage === 'done'}
        <div class="done-wrap">
          <div class="done-icon-ring">
            <CheckCircle size={36} />
          </div>
          <p class="done-body">
            Your password has been updated and all active sessions have been signed out.
            You can now sign in with your new credentials.
          </p>
          <a href="/login" class="submit-btn submit-btn--link">
            Sign In <ArrowRight size={16} />
          </a>
        </div>
      {/if}

    </div>
  </main>
</div>

<style>
  /* ── Layout ─────────────────────────────────────────── */
  .root {
    min-height: 100vh;
    display: grid;
    grid-template-columns: 1fr 1fr;
    background: var(--color-bg);
  }
  @media (max-width: 768px) {
    .root { grid-template-columns: 1fr; }
    .panel-left { display: none; }
  }

  /* ── Left panel ──────────────────────────────────────── */
  .panel-left {
    background: #071810;
    position: relative; overflow: hidden;
    display: flex; flex-direction: column;
  }
  .panel-left::before {
    content: ''; position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(34,197,94,.07) 1px, transparent 1px),
      linear-gradient(90deg, rgba(34,197,94,.07) 1px, transparent 1px);
    background-size: 44px 44px; pointer-events: none;
  }
  .panel-left::after {
    content: ''; position: absolute;
    width: 600px; height: 600px; border-radius: 50%;
    background: radial-gradient(circle, rgba(34,197,94,.12) 0%, transparent 65%);
    top: -160px; left: -160px; pointer-events: none;
  }
  .panel-left-inner {
    position: relative; z-index: 1;
    display: flex; flex-direction: column;
    height: 100%; padding: 2.5rem;
  }
  .brand { display: flex; align-items: center; gap: 0.75rem; }
  .brand-icon {
    width: 44px; height: 44px; border-radius: 10px;
    background: rgba(34,197,94,.12);
    border: 1px solid rgba(34,197,94,.25);
    display: flex; align-items: center; justify-content: center;
    color: #22c55e; flex-shrink: 0;
  }
  .brand-name { font-size: .95rem; font-weight: 800; color: #f1f5f9; margin: 0; letter-spacing: -.01em; }
  .brand-sub  { font-size: .68rem; color: rgba(255,255,255,.3); margin: 0; letter-spacing: .04em; }

  .panel-body { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 2.5rem 0; }
  .panel-heading {
    font-size: clamp(2.8rem, 4.5vw, 4rem);
    font-weight: 900; color: #fff;
    line-height: 1.02; letter-spacing: -.04em; margin: 0 0 1.25rem;
  }
  .panel-desc { font-size: .85rem; color: rgba(255,255,255,.38); line-height: 1.75; margin: 0 0 1.75rem; max-width: 300px; }
  .features   { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: .7rem; }
  .features li { display: flex; align-items: center; gap: .6rem; font-size: .78rem; color: rgba(255,255,255,.5); }
  .dot { width: 5px; height: 5px; border-radius: 50%; background: #22c55e; flex-shrink: 0; box-shadow: 0 0 6px #22c55e; }
  .panel-footer { font-size: .68rem; color: rgba(255,255,255,.18); margin: 0; }

  /* ── Right panel ─────────────────────────────────────── */
  .panel-right {
    display: flex; align-items: center; justify-content: center;
    padding: 3rem 2rem; position: relative;
    background: var(--color-bg);
  }
  .top-bar {
    position: absolute; top: 1.5rem; left: 1.5rem; right: 1.5rem;
    display: flex; align-items: center; justify-content: space-between;
  }
  .back-link {
    display: inline-flex; align-items: center; gap: 0.4rem;
    font-size: 0.78rem; font-weight: 600;
    color: var(--color-muted); text-decoration: none;
    transition: color 0.15s;
  }
  .back-link:hover { color: #15803d; }
  [data-theme="dark"] .back-link:hover { color: #22c55e; }

  .form-wrap { width: 100%; max-width: 400px; }

  /* ── Form header ─────────────────────────────────────── */
  .form-header { margin-bottom: 1.75rem; display: flex; flex-direction: column; gap: 0.6rem; }
  .form-icon {
    width: 48px; height: 48px; border-radius: 12px;
    background: rgba(34,197,94,.1); border: 1px solid rgba(34,197,94,.2);
    display: flex; align-items: center; justify-content: center;
    color: #16a34a; margin-bottom: 0.25rem;
  }
  [data-theme="dark"] .form-icon { background: rgba(34,197,94,.15); border-color: rgba(34,197,94,.3); color: #22c55e; }

  .form-title { font-size: 1.9rem; font-weight: 900; color: var(--color-text); letter-spacing: -.04em; margin: 0; }
  .form-hint  { font-size: .83rem; color: var(--color-muted); margin: 0; }

  /* ── Steps ───────────────────────────────────────────── */
  .steps {
    display: flex; align-items: center; margin-bottom: 1.5rem;
  }
  .step {
    display: flex; align-items: center; gap: .4rem;
    font-size: .72rem; font-weight: 600; color: var(--color-muted);
    transition: color .2s; white-space: nowrap;
  }
  .step.active { color: var(--color-text); }
  .step.done   { color: #16a34a; }
  [data-theme="dark"] .step.done { color: #22c55e; }

  .step-dot {
    width: 22px; height: 22px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: .65rem; font-weight: 700;
    border: 2px solid var(--color-border);
    background: var(--color-bg);
    transition: all .2s; flex-shrink: 0;
  }
  .step.active .step-dot { border-color: #15803d; color: #15803d; }
  .step.done   .step-dot { background: #16a34a; border-color: #16a34a; color: #fff; }
  [data-theme="dark"] .step.active .step-dot { border-color: #22c55e; color: #22c55e; }
  [data-theme="dark"] .step.done   .step-dot { background: #22c55e; border-color: #22c55e; }

  .step-connector {
    flex: 1; height: 2px; background: var(--color-border);
    margin: 0 .4rem; min-width: 20px; transition: background .3s;
  }
  .step-connector.done { background: #16a34a; }
  [data-theme="dark"] .step-connector.done { background: #22c55e; }

  /* ── Error ───────────────────────────────────────────── */
  .error-box {
    display: flex; align-items: center; gap: .5rem;
    padding: .7rem .9rem; border-radius: .5rem;
    background: #fee2e2; border: 1px solid #fecaca;
    color: #991b1b; font-size: .82rem; margin-bottom: 1.25rem;
  }
  [data-theme="dark"] .error-box { background: rgba(220,38,38,0.12); border-color: rgba(220,38,38,0.3); color: #fca5a5; }

  /* ── Info box (OTP hint) ─────────────────────────────── */
  .info-box {
    background: var(--color-bg); border: 1px solid var(--color-border);
    border-radius: .875rem; padding: 1rem; margin-bottom: 1.25rem;
    display: flex; flex-direction: column; gap: .75rem;
  }
  .info-box-title { font-size: .7rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--color-muted); margin: 0; }

  .how-step  { display: flex; align-items: flex-start; gap: .6rem; font-size: .82rem; color: var(--color-text); line-height: 1.5; }
  .how-step em { font-style: normal; font-weight: 700; color: #16a34a; }
  [data-theme="dark"] .how-step em { color: #22c55e; }
  .how-num {
    width: 20px; height: 20px; border-radius: 50%; flex-shrink: 0;
    background: #15803d; color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: .65rem; font-weight: 700; margin-top: .1rem;
  }
  [data-theme="dark"] .how-num { background: #16a34a; }

  /* ── OTP ─────────────────────────────────────────────── */
  .otp-section { display: flex; flex-direction: column; gap: .5rem; margin-bottom: 1.25rem; }
  .otp-wrap { display: flex; gap: 0.5rem; }
  .otp-box {
    flex: 1; min-width: 0; height: 56px;
    border: 1.5px solid var(--color-border); border-radius: .6rem;
    background: var(--color-surface); color: var(--color-text);
    font-size: 1.35rem; font-weight: 900; font-family: monospace;
    text-align: center; text-transform: uppercase;
    outline: none; transition: all 0.15s; caret-color: transparent;
  }
  .otp-box:focus { border-color: #22c55e; box-shadow: 0 0 0 3px rgba(34,197,94,.1); }
  .otp-box.filled { border-color: #22c55e; background: rgba(34,197,94,.04); }
  [data-theme="dark"] .otp-box.filled { background: rgba(34,197,94,.08); }

  .otp-sub { font-size: .78rem; color: var(--color-muted); margin: 0; }
  .green-link { color: #15803d; font-weight: 600; text-decoration: none; }
  .green-link:hover { text-decoration: underline; }
  [data-theme="dark"] .green-link { color: #22c55e; }

  /* ── Token badge ─────────────────────────────────────── */
  .token-badge {
    display: inline-flex; align-items: center; gap: .4rem;
    font-size: .78rem; color: #16a34a; font-weight: 600;
    background: rgba(34,197,94,.07); border: 1px solid rgba(34,197,94,.2);
    padding: .45rem .9rem; border-radius: 999px;
    margin-bottom: 1.25rem;
  }
  [data-theme="dark"] .token-badge { background: rgba(34,197,94,.1); border-color: rgba(34,197,94,.25); color: #22c55e; }

  /* ── Fields ──────────────────────────────────────────── */
  .field { display: flex; flex-direction: column; gap: .4rem; margin-bottom: 1rem; }
  .field-label { font-size: .72rem; font-weight: 700; color: var(--color-muted); text-transform: uppercase; letter-spacing: .07em; }
  .field-wrap  { position: relative; display: flex; align-items: center; }

  .fi {
    position: absolute; left: .85rem; color: var(--color-muted);
    display: flex; align-items: center; pointer-events: none; transition: color .15s;
  }
  .fi-input {
    width: 100%; padding: .78rem .85rem .78rem 2.5rem;
    background: var(--color-surface); border: 1.5px solid var(--color-border);
    border-radius: .6rem; color: var(--color-text); font-size: .875rem;
    outline: none; transition: border-color .15s, box-shadow .15s; font-family: inherit;
    box-sizing: border-box;
  }
  .fi-input:focus { border-color: #22c55e; box-shadow: 0 0 0 3px rgba(34,197,94,.1); }
  .fi-input::placeholder { color: var(--color-muted); opacity: .55; }
  .fi-input--toggle { padding-right: 2.75rem; }

  .eye-btn {
    position: absolute; right: .75rem; top: 50%; transform: translateY(-50%);
    background: none; border: none; cursor: pointer; color: var(--color-muted);
    display: flex; padding: 0.2rem; transition: color 0.15s;
  }
  .eye-btn:hover { color: #16a34a; }
  [data-theme="dark"] .eye-btn:hover { color: #22c55e; }

  /* ── Strength ────────────────────────────────────────── */
  .strength-row  { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem; }
  .strength-bars { display: flex; gap: 3px; flex: 1; }
  .strength-bar  { flex: 1; height: 4px; border-radius: 2px; transition: background 0.3s; }
  .strength-label { font-size: 0.7rem; font-weight: 600; white-space: nowrap; }

  .field-hint { font-size: .72rem; margin: .15rem 0 0; }
  .field-hint.success    { color: #16a34a; }
  .field-hint.error-hint { color: #dc2626; }
  [data-theme="dark"] .field-hint.error-hint { color: #f87171; }

  /* ── Submit button ───────────────────────────────────── */
  .submit-btn {
    display: flex; align-items: center; justify-content: center; gap: .5rem;
    width: 100%; padding: .82rem;
    background: #15803d; color: #fff;
    border: none; border-radius: .6rem;
    font-size: .9rem; font-weight: 700; cursor: pointer;
    transition: background .15s, transform .1s, box-shadow .15s;
    margin-top: .25rem; font-family: inherit; text-decoration: none;
  }
  .submit-btn:hover:not(:disabled) {
    background: #166534;
    box-shadow: 0 4px 16px rgba(21,128,61,.3);
    transform: translateY(-1px);
  }
  .submit-btn:disabled { opacity: .5; cursor: not-allowed; }
  .submit-btn--link { display: flex; }
  [data-theme="dark"] .submit-btn         { background: #16a34a; }
  [data-theme="dark"] .submit-btn:hover:not(:disabled) { background: #15803d; }

  /* ── Done ────────────────────────────────────────────── */
  .done-wrap {
    display: flex; flex-direction: column; align-items: flex-start; gap: 1rem;
    padding: 1.5rem; background: var(--color-surface);
    border: 1.5px solid var(--color-border); border-radius: .875rem;
    margin-bottom: .5rem;
  }
  .done-icon-ring {
    width: 60px; height: 60px; border-radius: 50%;
    background: rgba(34,197,94,.1); border: 1px solid rgba(34,197,94,.2);
    display: flex; align-items: center; justify-content: center;
    color: #22c55e;
  }
  .done-body { font-size: .875rem; color: var(--color-muted); margin: 0; line-height: 1.65; }

  /* ── Spinner ─────────────────────────────────────────── */
  .spinner {
    width: 15px; height: 15px;
    border: 2px solid rgba(255,255,255,.25); border-top-color: #fff;
    border-radius: 50%; animation: spin .6s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>