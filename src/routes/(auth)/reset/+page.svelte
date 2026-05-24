<!-- src/routes/(auth)/reset/+page.svelte -->
<script lang="ts">
  import { onMount }     from 'svelte';
  import { deserialize } from '$app/forms';
  import { goto }        from '$app/navigation';
  import { initTheme }   from '$lib/index.js';
  import {
    Lock, Eye, EyeOff, ArrowRight, ChevronLeft,
    KeyRound, CheckCircle, AlertCircle, ShieldCheck,
  } from 'lucide-svelte';

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
</script>

<svelte:head><title>Reset Password — MOUAU eTest</title></svelte:head>

<div class="reset-page">
  <div class="reset-card">

    <!-- Brand -->
    <div class="reset-brand">
      <span aria-hidden="true">📋</span>
      <span>MOUAU eTest</span>
    </div>

    <!-- Error -->
    {#if error}
      <div class="reset-alert"><AlertCircle size={15} /><span>{error}</span></div>
    {/if}

    <!-- ══ STAGE: verify ══ -->
    {#if stage === 'verify'}
      <div class="reset-icon"><KeyRound size={24} /></div>
      <div class="reset-header">
        <h1>Enter your reset code</h1>
        <p>
          Check your email for the 6-character code.<br />
          <a href="/forgot" class="reset-link">Need a new code?</a>
        </p>
      </div>

      <div class="otp-hint">
        <span>💡</span>
        <span>Click <em>"Verify My Code"</em> in the email to see your code in a new tab</span>
      </div>

      <!-- OTP boxes -->
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

      <button class="reset-btn" onclick={verifyToken} type="button" disabled={loading || otpValue.length !== 6}>
        {#if loading}
          <span class="reset-spinner"></span> Verifying…
        {:else}
          Verify Code <ArrowRight size={15} />
        {/if}
      </button>

      <a href="/login" class="reset-back">
        <ChevronLeft size={14} /> Back to Login
      </a>

    <!-- ══ STAGE: reset ══ -->
    {:else if stage === 'reset'}
      <div class="reset-icon"><ShieldCheck size={24} /></div>
      <div class="reset-header">
        <h1>Choose a new password</h1>
        <p>Your code has been verified. Set your new password below.</p>
      </div>

      <div class="token-confirmed">
        <CheckCircle size={14} /> Code confirmed: <strong>{token}</strong>
      </div>

      <div class="reset-form">
        <div class="reset-field">
          <label for="password">New Password</label>
          <div class="reset-input-wrap">
            <span class="reset-input-icon"><Lock size={15} /></span>
            <input
              id="password" type={showPass ? 'text' : 'password'}
              bind:value={password}
              placeholder="Create a strong password"
              class="reset-input reset-input--toggle"
              disabled={loading}
            />
            <button class="reset-eye" type="button" onclick={() => { showPass = !showPass; }}>
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

        <div class="reset-field">
          <label for="confirm">Confirm Password</label>
          <div class="reset-input-wrap">
            <span class="reset-input-icon"><Lock size={15} /></span>
            <input
              id="confirm" type={showConfirm ? 'text' : 'password'}
              bind:value={confirm}
              placeholder="Repeat your password"
              class="reset-input reset-input--toggle"
              disabled={loading}
            />
            <button class="reset-eye" type="button" onclick={() => { showConfirm = !showConfirm; }}>
              {#if showConfirm}<EyeOff size={15} />{:else}<Eye size={15} />{/if}
            </button>
          </div>
          {#if confirm && confirm === password}
            <p class="field-hint success">✓ Passwords match</p>
          {:else if confirm && confirm !== password}
            <p class="field-hint error">Passwords do not match</p>
          {/if}
        </div>

        <button class="reset-btn" onclick={resetPassword} type="button" disabled={loading}>
          {#if loading}
            <span class="reset-spinner"></span> Saving…
          {:else}
            Set New Password <ArrowRight size={15} />
          {/if}
        </button>
      </div>

    <!-- ══ STAGE: done ══ -->
    {:else if stage === 'done'}
      <div class="reset-done">
        <div class="done-icon"><CheckCircle size={40} /></div>
        <h1>Password changed!</h1>
        <p>
          Your password has been updated and all active sessions have been signed out.
          You can now sign in with your new password.
        </p>
        <a href="/login" class="reset-btn reset-btn--link">
          Sign In <ArrowRight size={15} />
        </a>
      </div>
    {/if}

  </div>
</div>

<style>
  .reset-page {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    padding: 1.5rem; background: var(--color-bg);
  }
  .reset-card {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 1.25rem; padding: 2rem; max-width: 420px; width: 100%;
    display: flex; flex-direction: column; align-items: center; gap: 1.25rem;
    text-align: center;
  }

  .reset-brand {
    display: flex; align-items: center; gap: 0.4rem;
    font-size: 0.875rem; font-weight: 700; color: var(--color-muted);
  }

  .reset-icon {
    width: 52px; height: 52px; border-radius: 1rem;
    background: color-mix(in srgb, var(--color-primary) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-primary) 20%, transparent);
    display: flex; align-items: center; justify-content: center;
    color: var(--color-primary);
  }

  .reset-header { text-align: center; }
  .reset-header h1 { font-size: 1.3rem; font-weight: 800; margin: 0 0 0.3rem; letter-spacing: -0.02em; }
  .reset-header p  { font-size: 0.875rem; color: var(--color-muted); margin: 0; line-height: 1.6; }
  .reset-link { color: var(--color-primary); text-decoration: none; font-weight: 500; }

  .reset-alert {
    display: flex; align-items: center; gap: 0.5rem; width: 100%;
    padding: 0.75rem 1rem; border-radius: 0.6rem; font-size: 0.82rem;
    background: #fef2f2; border: 1px solid #fecaca; color: #dc2626;
  }
  [data-theme="dark"] .reset-alert { background: rgba(220,38,38,0.12); border-color: rgba(220,38,38,0.3); }

  /* OTP hint */
  .otp-hint {
    display: flex; align-items: flex-start; gap: 0.5rem;
    padding: 0.75rem 1rem; width: 100%;
    background: color-mix(in srgb, var(--color-primary) 7%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-primary) 15%, transparent);
    border-radius: 0.75rem; font-size: 0.8rem; color: var(--color-text);
    text-align: left; line-height: 1.5;
  }
  .otp-hint em { font-style: normal; font-weight: 600; color: var(--color-primary); }

  /* OTP boxes */
  .otp-wrap { display: flex; gap: 0.5rem; justify-content: center; }
  .otp-box {
    width: 48px; height: 56px;
    border: 2px solid var(--color-border); border-radius: 0.75rem;
    background: var(--color-bg); color: var(--color-text);
    font-size: 1.4rem; font-weight: 900; font-family: monospace;
    text-align: center; text-transform: uppercase;
    outline: none; transition: all 0.15s; caret-color: transparent;
  }
  .otp-box:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 15%, transparent); }
  .otp-box.filled { border-color: var(--color-primary); background: color-mix(in srgb, var(--color-primary) 5%, transparent); }

  /* Token confirmed banner */
  .token-confirmed {
    display: flex; align-items: center; gap: 0.4rem; justify-content: center;
    font-size: 0.8rem; color: #16a34a; font-weight: 500;
    background: #f0fdf4; border: 1px solid #bbf7d0;
    padding: 0.5rem 1rem; border-radius: 999px; width: fit-content;
  }
  [data-theme="dark"] .token-confirmed { background: rgba(34,197,94,0.12); border-color: rgba(34,197,94,0.3); }

  /* Form */
  .reset-form { width: 100%; display: flex; flex-direction: column; gap: 1rem; }
  .reset-field { display: flex; flex-direction: column; gap: 0.4rem; text-align: left; }
  .reset-field label { font-size: 0.82rem; font-weight: 600; color: var(--color-text); }

  .reset-input-wrap { position: relative; }
  .reset-input-icon {
    position: absolute; left: 0.875rem; top: 50%; transform: translateY(-50%);
    color: var(--color-muted); display: flex; pointer-events: none;
  }
  .reset-input {
    width: 100%; padding: 0.75rem 0.875rem 0.75rem 2.625rem;
    border: 1.5px solid var(--color-border); border-radius: 0.75rem;
    font-size: 0.875rem; color: var(--color-text); background: var(--color-bg);
    outline: none; transition: all 0.2s; box-sizing: border-box;
  }
  .reset-input:focus {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 12%, transparent);
  }
  .reset-input--toggle { padding-right: 2.75rem; }
  .reset-eye {
    position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%);
    background: none; border: none; cursor: pointer; color: var(--color-muted);
    display: flex; padding: 0.2rem; transition: color 0.15s;
  }
  .reset-eye:hover { color: var(--color-primary); }

  /* Strength */
  .strength-row  { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.3rem; }
  .strength-bars { display: flex; gap: 3px; flex: 1; }
  .strength-bar  { flex: 1; height: 4px; border-radius: 2px; transition: background 0.3s; }
  .strength-label { font-size: 0.7rem; font-weight: 600; white-space: nowrap; }

  .field-hint { font-size: 0.7rem; margin: 0.2rem 0 0; }
  .field-hint.success { color: #16a34a; }
  .field-hint.error   { color: #dc2626; }

  /* Button */
  .reset-btn {
    width: 100%; padding: 0.8rem;
    background: var(--color-primary); color: #fff;
    border: none; border-radius: 0.75rem; font-size: 0.9rem; font-weight: 600;
    cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
    transition: all 0.2s; text-decoration: none;
    box-shadow: 0 4px 12px color-mix(in srgb, var(--color-primary) 30%, transparent);
  }
  .reset-btn:hover:not(:disabled) { background: var(--color-primary-hover); transform: translateY(-1px); }
  .reset-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .reset-btn--link { display: flex; margin-top: 0.5rem; }

  .reset-back {
    display: flex; align-items: center; gap: 0.3rem;
    font-size: 0.8rem; color: var(--color-muted); text-decoration: none;
  }
  .reset-back:hover { color: var(--color-primary); }

  /* Done */
  .reset-done { display: flex; flex-direction: column; align-items: center; gap: 1rem; width: 100%; }
  .done-icon  { color: #22c55e; }
  .reset-done h1 { font-size: 1.3rem; font-weight: 800; margin: 0; }
  .reset-done p  { font-size: 0.875rem; color: var(--color-muted); margin: 0; line-height: 1.6; }

  /* Spinner */
  .reset-spinner {
    width: 14px; height: 14px; border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.3); border-top-color: white;
    animation: spin 0.6s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 480px) {
    .reset-card { padding: 1.5rem 1.25rem; }
    .otp-box { width: 42px; height: 50px; font-size: 1.2rem; }
  }
</style>