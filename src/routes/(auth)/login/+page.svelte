<!-- src/routes/(auth)/login/+page.svelte -->
<script lang="ts">
  import type { ActionData } from './$types';
  import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-svelte';
  import ThemeToggle from '$lib/components/ui/ThemeToggle.svelte';

  let { form }: { form: ActionData } = $props();

  // ── Step state ────────────────────────────────────────
  type Step = 'email' | 'password';
  let step = $state<Step>('email');
  let loading = $state(false);
  let showPass = $state(false);

  let email = $state('');
  let password = $state('');

  let emailError = $state('');
  let passwordError = $state('');
  let emailTouched = $state(false);
  let passwordTouched = $state(false);

  // ── Validation ────────────────────────────────────────
  function validateEmail(v: string): string {
    if (!v.trim()) return 'Email address is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address';
    return '';
  }

  function validatePassword(v: string): string {
    if (!v) return 'Password is required';
    if (v.length < 6) return 'Password must be at least 6 characters';
    return '';
  }

  // ── Step 1: Next button ───────────────────────────────
  function handleNext() {
    emailTouched = true;
    emailError = validateEmail(email);
    if (emailError) return;
    step = 'password';
  }

  function handleEmailKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); handleNext(); }
  }

  // ── Step 2: Submit ────────────────────────────────────
  function handleSubmit(e: SubmitEvent) {
    passwordTouched = true;
    passwordError = validatePassword(password);
    if (passwordError) { e.preventDefault(); return; }
    loading = true;
  }

  function goBack() {
    step = 'email';
    password = '';
    passwordError = '';
    passwordTouched = false;
    loading = false;
  }

  // Live validation
  $effect(() => { if (emailTouched) emailError = validateEmail(email); });
  $effect(() => { if (passwordTouched) passwordError = validatePassword(password); });

  // Mask email for display on step 2
  const maskedEmail = $derived(() => {
    const [local, domain] = email.split('@');
    if (!local || !domain) return email;
    const visible = local.slice(0, 2);
    const masked = '*'.repeat(Math.max(local.length - 2, 2));
    return `${visible}${masked}@${domain}`;
  });
</script>

<svelte:head>
  <title>Login — MOUAU eTest</title>
</svelte:head>

<div class="root">
  <!-- Left branding panel -->
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
        <h1 class="panel-heading">Integrity.<br/>Every.<br/>Exam.</h1>
        <p class="panel-desc">
          Tamper-proof digital examination system for Michael Okpara University of Agriculture, Umudike.
        </p>
        <ul class="features">
          {#each ['AI-powered malpractice detection', 'Per-student question randomization', 'Real-time invigilator dashboard', 'Instant automated grading'] as f}
            <li><span class="dot"></span>{f}</li>
          {/each}
        </ul>
      </div>
      <p class="panel-footer">© {new Date().getFullYear()} Michael Okpara University of Agriculture</p>
    </div>
  </aside>

  <!-- Right form panel -->
  <main class="panel-right">
    <div class="top-right"><ThemeToggle /></div>

    <div class="form-wrap">
      <div class="form-header">
        <div class="form-badge">
          <ShieldCheck size={12} /> Secure Access
        </div>
        <h2 class="form-title">Welcome back</h2>
        <p class="form-hint">Sign in to continue to your dashboard</p>
      </div>

      <!-- Step indicator -->
      <div class="steps">
        <div class="step" class:active={step === 'email'} class:done={step === 'password'}>
          <div class="step-dot">1</div>
          <span>Email</span>
        </div>
        <div class="step-connector" class:done={step === 'password'}></div>
        <div class="step" class:active={step === 'password'}>
          <div class="step-dot">2</div>
          <span>Password</span>
        </div>
      </div>

      <!-- Server error -->
      {#if form?.error}
        <div class="error-box">
          <AlertCircle size={15} /><span>{form.error}</span>
        </div>
      {/if}

      <form method="POST" onsubmit={handleSubmit} novalidate>
        <!-- Hidden email field so it submits on step 2 -->
        {#if step === 'password'}
          <input type="hidden" name="email" value={email} />
        {/if}

        <!-- ── Step 1: Email ── -->
        {#if step === 'email'}
          <div class="field">
            <label for="email" class="field-label">Email address</label>
            <div class="field-wrap" class:has-error={emailTouched && emailError}>
              <span class="fi"><Mail size={15} /></span>
              <input
                id="email"
                name="email"
                type="email"
                autocomplete="email"
                placeholder="you@mouau.edu.ng"
                class="fi-input"
                bind:value={email}
                onblur={() => (emailTouched = true)}
                onkeydown={handleEmailKeydown}
                autofocus
              />
            </div>
            {#if emailTouched && emailError}
              <p class="inline-error"><AlertCircle size={13} />{emailError}</p>
            {/if}
          </div>

          <!-- Forgot password -->
          <div class="forgot-row">
            <a href="/forgot" class="forgot-link">Forgot password?</a>
          </div>

          <button type="button" onclick={handleNext} class="submit-btn">
            Continue <ArrowRight size={16} />
          </button>

        <!-- ── Step 2: Password ── -->
        {:else}
          <!-- Who are we signing in as -->
          <div class="email-pill">
            <button type="button" onclick={goBack} class="email-pill-back" aria-label="Change email">
              <ArrowLeft size={13} />
            </button>
            <span class="email-pill-addr">{maskedEmail()}</span>
          </div>

          <div class="field">
            <label for="password" class="field-label">Password</label>
            <div class="field-wrap" class:has-error={passwordTouched && passwordError}>
              <span class="fi"><Lock size={15} /></span>
              <input
                id="password"
                name="password"
                type={showPass ? 'text' : 'password'}
                autocomplete="current-password"
                placeholder="Enter your password"
                class="fi-input fi-input-pass"
                bind:value={password}
                onblur={() => (passwordTouched = true)}
                autofocus
              />
              <button
                type="button"
                onclick={() => (showPass = !showPass)}
                class="pass-toggle"
                aria-label="Toggle password visibility"
              >
                {#if showPass}<EyeOff size={15} />{:else}<Eye size={15} />{/if}
              </button>
            </div>
            {#if passwordTouched && passwordError}
              <p class="inline-error"><AlertCircle size={13} />{passwordError}</p>
            {/if}
          </div>

          <button type="submit" disabled={loading} class="submit-btn">
            {#if loading}
              <span class="spinner"></span> Signing in…
            {:else}
              <LogIn size={16} /> Sign In
            {/if}
          </button>
        {/if}
      </form>

      <div class="info-box">
        <ShieldCheck size={13} />
        All activities are monitored and logged.
      </div>

      <p class="register-hint">
        New student? <a href="/register">Create an account</a>
      </p>
    </div>
  </main>
</div>

<style>
  /* ── Layout ─────────────────────────────────────────── */
  .root {
    min-height: 100vh;
    display: grid;
    grid-template-columns: 1fr 1fr;
    background: var(--bg);
  }

  @media (max-width: 768px) {
    .root { grid-template-columns: 1fr; }
    .panel-left { display: none; }
  }

  /* ── Left panel ─────────────────────────────────────── */
  .panel-left {
    background: #071810;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .panel-left::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(34,197,94,.07) 1px, transparent 1px),
      linear-gradient(90deg, rgba(34,197,94,.07) 1px, transparent 1px);
    background-size: 44px 44px;
    pointer-events: none;
  }

  .panel-left::after {
    content: '';
    position: absolute;
    width: 600px; height: 600px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(34,197,94,.12) 0%, transparent 65%);
    top: -160px; left: -160px;
    pointer-events: none;
  }

  .panel-left-inner {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 2.5rem;
  }

  .brand { display: flex; align-items: center; gap: 0.75rem; }

  .brand-icon {
    width: 44px; height: 44px;
    border-radius: 10px;
    background: rgba(34,197,94,.12);
    border: 1px solid rgba(34,197,94,.25);
    display: flex; align-items: center; justify-content: center;
    color: #22c55e; flex-shrink: 0;
  }

  .brand-name {
    font-size: .95rem; font-weight: 800;
    color: #f1f5f9; margin: 0; letter-spacing: -.01em;
  }

  .brand-sub {
    font-size: .68rem; color: rgba(255,255,255,.3);
    margin: 0; letter-spacing: .04em;
  }

  .panel-body {
    flex: 1; display: flex; flex-direction: column;
    justify-content: center; padding: 2.5rem 0;
  }

  .panel-heading {
    font-size: clamp(2.8rem, 4.5vw, 4rem);
    font-weight: 900; color: #fff;
    line-height: 1.02; letter-spacing: -.04em; margin: 0 0 1.25rem;
  }

  .panel-desc {
    font-size: .85rem; color: rgba(255,255,255,.38);
    line-height: 1.75; margin: 0 0 1.75rem; max-width: 300px;
  }

  .features {
    list-style: none; padding: 0; margin: 0;
    display: flex; flex-direction: column; gap: .7rem;
  }

  .features li {
    display: flex; align-items: center; gap: .6rem;
    font-size: .78rem; color: rgba(255,255,255,.5);
  }

  .dot {
    width: 5px; height: 5px; border-radius: 50%;
    background: #22c55e; flex-shrink: 0;
    box-shadow: 0 0 6px #22c55e;
  }

  .panel-footer {
    font-size: .68rem; color: rgba(255,255,255,.18); margin: 0;
  }

  /* ── Right panel ────────────────────────────────────── */
  .panel-right {
    display: flex; align-items: center; justify-content: center;
    padding: 3rem 2rem; position: relative;
    background: var(--bg);
  }

  .top-right { position: absolute; top: 1.5rem; right: 1.5rem; }

  .form-wrap { width: 100%; max-width: 400px; }

  /* ── Form header ────────────────────────────────────── */
  .form-header { margin-bottom: 1.75rem; }

  .form-badge {
    display: inline-flex; align-items: center; gap: .35rem;
    font-size: .68rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: .1em;
    color: #16a34a;
    background: rgba(34,197,94,.08);
    border: 1px solid rgba(34,197,94,.2);
    padding: .25rem .6rem; border-radius: 9999px;
    margin-bottom: .75rem;
  }

  :global(.dark) .form-badge {
    color: #22c55e;
    background: rgba(34,197,94,.12);
    border-color: rgba(34,197,94,.25);
  }

  .form-title {
    font-size: 2rem; font-weight: 900;
    color: var(--text); letter-spacing: -.04em;
    margin: 0 0 .4rem;
  }

  .form-hint { font-size: .83rem; color: var(--text-muted); margin: 0; }

  /* ── Step indicator ─────────────────────────────────── */
  .steps {
    display: flex; align-items: center; gap: 0;
    margin-bottom: 1.5rem;
  }

  .step {
    display: flex; align-items: center; gap: .45rem;
    font-size: .72rem; font-weight: 600;
    color: var(--text-muted);
    transition: color .2s;
  }

  .step.active { color: var(--text); }
  .step.done   { color: #16a34a; }
  :global(.dark) .step.done { color: #22c55e; }

  .step-dot {
    width: 22px; height: 22px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: .65rem; font-weight: 700;
    border: 2px solid var(--border);
    background: var(--bg);
    transition: all .2s;
  }

  .step.active .step-dot {
    border-color: #15803d;
    color: #15803d;
  }

  .step.done .step-dot {
    background: #16a34a; border-color: #16a34a;
    color: #fff;
  }

  :global(.dark) .step.active .step-dot { border-color: #22c55e; color: #22c55e; }
  :global(.dark) .step.done .step-dot   { background: #22c55e; border-color: #22c55e; }

  .step-connector {
    flex: 1; height: 2px;
    background: var(--border);
    margin: 0 .5rem;
    transition: background .3s;
  }

  .step-connector.done { background: #16a34a; }
  :global(.dark) .step-connector.done { background: #22c55e; }

  /* ── Error box ──────────────────────────────────────── */
  .error-box {
    display: flex; align-items: center; gap: .5rem;
    padding: .7rem .9rem; border-radius: .5rem;
    background: #fee2e2; border: 1px solid #fecaca;
    color: #991b1b; font-size: .82rem; margin-bottom: 1.25rem;
  }

  :global(.dark) .error-box {
    background: #450a0a; border-color: #7f1d1d; color: #fca5a5;
  }

  /* ── Fields ─────────────────────────────────────────── */
  .field { display: flex; flex-direction: column; gap: .4rem; margin-bottom: 1rem; }

  .field-label {
    font-size: .72rem; font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase; letter-spacing: .07em;
  }

  .field-wrap {
    position: relative; display: flex; align-items: center;
  }

  .fi {
    position: absolute; left: .85rem;
    color: var(--text-muted);
    display: flex; align-items: center;
    pointer-events: none; transition: color .15s;
  }

  .field-wrap.has-error .fi { color: #dc2626; }
  :global(.dark) .field-wrap.has-error .fi { color: #f87171; }

  .fi-input {
    width: 100%;
    padding: .78rem .85rem .78rem 2.5rem;
    background: var(--bg-card);
    border: 1.5px solid var(--border);
    border-radius: .6rem;
    color: var(--text);
    font-size: .875rem;
    outline: none;
    transition: border-color .15s, box-shadow .15s;
  }

  .fi-input:focus {
    border-color: #22c55e;
    box-shadow: 0 0 0 3px rgba(34,197,94,.1);
  }

  .field-wrap.has-error .fi-input {
    border-color: #dc2626;
    box-shadow: 0 0 0 3px rgba(220,38,38,.08);
  }

  :global(.dark) .field-wrap.has-error .fi-input {
    border-color: #f87171;
    box-shadow: 0 0 0 3px rgba(248,113,113,.08);
  }

  .fi-input::placeholder { color: var(--text-muted); opacity: .55; }
  .fi-input-pass { padding-right: 2.75rem; }

  .pass-toggle {
    position: absolute; right: .75rem;
    background: none; border: none; cursor: pointer;
    color: var(--text-muted);
    display: flex; align-items: center;
    padding: .2rem; border-radius: .25rem;
    transition: color .15s;
  }
  .pass-toggle:hover { color: var(--text); }

  .inline-error {
    display: flex; align-items: center; gap: .35rem;
    font-size: .75rem; color: #dc2626;
    animation: slideIn .2s ease;
  }

  :global(.dark) .inline-error { color: #f87171; }

  @keyframes slideIn {
    from { opacity: 0; transform: translateY(-4px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── Forgot row ─────────────────────────────────────── */
  .forgot-row {
    display: flex; justify-content: flex-end;
    margin-bottom: 1.25rem; margin-top: -.25rem;
  }

  .forgot-link {
    font-size: .78rem; font-weight: 600;
    color: #15803d; text-decoration: none;
    transition: color .15s;
  }

  .forgot-link:hover { color: #166534; text-decoration: underline; }
  :global(.dark) .forgot-link { color: #22c55e; }
  :global(.dark) .forgot-link:hover { color: #4ade80; }

  /* ── Email pill (step 2) ────────────────────────────── */
  .email-pill {
    display: flex; align-items: center; gap: .5rem;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 9999px;
    padding: .35rem .75rem .35rem .4rem;
    margin-bottom: 1.25rem;
    width: fit-content;
  }

  .email-pill-back {
    width: 24px; height: 24px; border-radius: 50%;
    background: var(--border);
    border: none; cursor: pointer;
    color: var(--text-muted);
    display: flex; align-items: center; justify-content: center;
    transition: background .15s, color .15s;
    flex-shrink: 0;
  }

  .email-pill-back:hover {
    background: var(--text-muted);
    color: var(--bg);
  }

  .email-pill-addr {
    font-size: .78rem; font-weight: 600;
    color: var(--text); font-family: monospace;
  }

  /* ── Submit button ──────────────────────────────────── */
  .submit-btn {
    display: flex; align-items: center; justify-content: center; gap: .5rem;
    width: 100%; padding: .82rem;
    background: #15803d; color: #fff;
    border: none; border-radius: .6rem;
    font-size: .9rem; font-weight: 700;
    cursor: pointer; letter-spacing: -.01em;
    transition: background .15s, transform .1s, box-shadow .15s;
    margin-top: .25rem;
  }

  .submit-btn:hover:not(:disabled) {
    background: #166534;
    box-shadow: 0 4px 16px rgba(21,128,61,.3);
    transform: translateY(-1px);
  }

  .submit-btn:active:not(:disabled) { transform: translateY(0); }
  .submit-btn:disabled { opacity: .5; cursor: not-allowed; }

  .spinner {
    width: 15px; height: 15px;
    border: 2px solid rgba(255,255,255,.25);
    border-top-color: #fff; border-radius: 50%;
    animation: spin .6s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Info box ───────────────────────────────────────── */
  .info-box {
    display: flex; align-items: center; justify-content: center; gap: .4rem;
    margin-top: 1.5rem; padding: .65rem 1rem;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: .5rem;
    font-size: .72rem; color: var(--text-muted);
  }

  /* ── Register hint ──────────────────────────────────── */
  .register-hint {
    text-align: center;
    font-size: .8rem; color: var(--text-muted);
    margin-top: 1.1rem;
  }

  .register-hint a {
    color: #15803d; font-weight: 600; text-decoration: none;
  }

  .register-hint a:hover { text-decoration: underline; }
  :global(.dark) .register-hint a { color: #22c55e; }
</style>