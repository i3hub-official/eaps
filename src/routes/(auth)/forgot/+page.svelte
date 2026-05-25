<!-- src/routes/(auth)/forgot/+page.svelte -->
<script lang="ts">
  import { onMount }     from 'svelte';
  import { deserialize } from '$app/forms';
  import { goto }        from '$app/navigation';
  import { initTheme }   from '$lib/index.js';
  import ThemeToggle     from '$lib/components/ui/ThemeToggle.svelte';
  import {
    Mail, ArrowRight, ArrowLeft, AlertCircle,
    ShieldCheck, KeyRound, ExternalLink, Copy, Check,
  } from 'lucide-svelte';

  onMount(() => initTheme());

  // ── State ─────────────────────────────────────────────
  type Step = 'email' | 'sent';
  let step      = $state<Step>('email');
  let loading   = $state(false);
  let error     = $state('');
  let email     = $state('');
  let verifyUrl = $state('');
  let copied    = $state(false);
  let emailTouched = $state(false);

  function validateEmail(v: string) {
    if (!v.trim()) return 'Email address is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address';
    return '';
  }

  const emailError = $derived(emailTouched ? validateEmail(email) : '');

  async function handleSubmit() {
    emailTouched = true;
    if (validateEmail(email)) return;
    error   = '';
    loading = true;

    try {
      const fd = new FormData();
      fd.set('email', email);
      const res    = await fetch('?/default', { method: 'POST', body: fd });
      const result = deserialize(await res.text()) as any;

      if (result.data?.error) { error = result.data.error; return; }

      // Always advance to "sent" step — even if email doesn't exist
      verifyUrl = result.data?.verifyUrl ?? '';
      step = 'sent';
    } catch {
      error = 'Network error. Please try again.';
    } finally {
      loading = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
  }

  async function copyLink() {
    if (!verifyUrl) return;
    await navigator.clipboard.writeText(verifyUrl);
    copied = true;
    setTimeout(() => { copied = false; }, 2000);
  }

  function openLink() {
    if (verifyUrl) window.open(verifyUrl, '_blank', 'noopener');
  }

  function goToOtp() {
    goto('/reset');
  }
</script>

<svelte:head><title>Reset Password — MOUAU eTest</title></svelte:head>

<div class="root">
  <!-- ── Left panel ─────────────────────────────────────────────── -->
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
        <h1 class="panel-heading">Recover<br/>your<br/>access.</h1>
        <p class="panel-desc">
          Reset your MOUAU eTest password securely.
          Your reset code expires in 15 minutes.
        </p>
        <ul class="features">
          {#each [
            'One-time 6-character reset code',
            'Expires in 15 minutes',
            'Works on any browser',
            'All sessions signed out on reset',
          ] as f}
            <li><span class="dot"></span>{f}</li>
          {/each}
        </ul>
      </div>
      <p class="panel-footer">© {new Date().getFullYear()} Michael Okpara University of Agriculture</p>
    </div>
  </aside>

  <!-- ── Right panel ────────────────────────────────────────────── -->
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
          {step === 'email' ? 'Forgot your password' : 'Check your access link'}
        </h2>
        <p class="form-hint">
          {#if step === 'email'}
            Enter your email let's get you started
          {:else}
            We've generated your secure reset link below
          {/if}
        </p>
      </div>

      <!-- Step indicator -->
      <div class="steps">
        <div class="step" class:active={step === 'email'} class:done={step === 'sent'}>
          <div class="step-dot">1</div>
          <span>Email</span>
        </div>
        <div class="step-connector" class:done={step === 'sent'}></div>
        <div class="step" class:active={step === 'sent'}>
          <div class="step-dot">2</div>
          <span>Verify</span>
        </div>
        <div class="step-connector"></div>
        <div class="step">
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

      <!-- ══ Step 1: Email ══ -->
      {#if step === 'email'}
        <div class="field">
          <label for="email" class="field-label">Email address</label>
          <div class="field-wrap" class:has-error={!!emailError}>
            <span class="fi"><Mail size={15} /></span>
            <input
              id="email" type="email" name="email"
              autocomplete="email"
              placeholder="you@mouau.edu.ng"
              class="fi-input"
              bind:value={email}
              onblur={() => { emailTouched = true; }}
              onkeydown={handleKeydown}
              autofocus
            />
          </div>
          {#if emailError}
            <p class="inline-error"><AlertCircle size={12} />{emailError}</p>
          {/if}
        </div>

        <button class="submit-btn" type="button" onclick={handleSubmit} disabled={loading}>
          {#if loading}
            <span class="spinner"></span> Sending…
          {:else}
            Continue <ArrowRight size={16} />
          {/if}
        </button>

        <p class="bottom-hint">
          Remembered it? <a href="/login">Back to login</a>
        </p>

      <!-- ══ Step 2: Link generated ══ -->
      {:else}
        <div class="sent-notice">
          <p class="sent-notice-text">
            If <strong>{email}</strong> is registered, a reset link has been generated.
          </p>
        </div>

        {#if verifyUrl}
          <!-- Link display card -->
          <div class="link-card">
            <div class="link-card-header">
              <KeyRound size={15} />
              <span>Your reset link</span>
              <span class="link-expires">Expires in 15 min</span>
            </div>

            <div class="link-url" title={verifyUrl}>
              <span class="link-url-text">{verifyUrl}</span>
            </div>

            <div class="link-actions">
              <button class="link-btn link-btn-open" type="button" onclick={openLink}>
                <ExternalLink size={14} /> Open Link
              </button>
              <button class="link-btn link-btn-copy" type="button" onclick={copyLink}>
                {#if copied}
                  <Check size={14} /> Copied!
                {:else}
                  <Copy size={14} /> Copy
                {/if}
              </button>
            </div>
          </div>

          <!-- How it works -->
          <div class="how-it-works">
            <p class="how-title">How to use this</p>
            <div class="how-step">
              <span class="how-num">1</span>
              <span>Click <em>Open Link</em> above — it opens in a new tab and shows your 6-character code</span>
            </div>
            <div class="how-step">
              <span class="how-num">2</span>
              <span>Come back to this tab and click <em>Enter my code →</em></span>
            </div>
            <div class="how-step">
              <span class="how-num">3</span>
              <span>Type the 6-character code and set your new password</span>
            </div>
          </div>

        {:else}
          <!-- Email doesn't exist — still show instructions but no link -->
          <div class="how-it-works">
            <p class="how-title">What happens next</p>
            <div class="how-step">
              <span class="how-num">1</span>
              <span>If your email is registered, you'll receive a reset link</span>
            </div>
            <div class="how-step">
              <span class="how-num">2</span>
              <span>Click the link to reveal your 6-character code</span>
            </div>
            <div class="how-step">
              <span class="how-num">3</span>
              <span>Enter the code below to set your new password</span>
            </div>
          </div>
        {/if}

        <button class="submit-btn" type="button" onclick={goToOtp}>
          Enter my code <ArrowRight size={16} />
        </button>

        <button class="restart-btn" type="button"
          onclick={() => { step = 'email'; verifyUrl = ''; error = ''; }}>
          Use a different email
        </button>
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

  /* ── Left panel — matches login green theme ──────────── */
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

  /* ── Field ───────────────────────────────────────────── */
  .field { display: flex; flex-direction: column; gap: .4rem; margin-bottom: 1rem; }
  .field-label { font-size: .72rem; font-weight: 700; color: var(--color-muted); text-transform: uppercase; letter-spacing: .07em; }
  .field-wrap  { position: relative; display: flex; align-items: center; }

  .fi {
    position: absolute; left: .85rem; color: var(--color-muted);
    display: flex; align-items: center; pointer-events: none; transition: color .15s;
  }
  .field-wrap.has-error .fi { color: #dc2626; }
  [data-theme="dark"] .field-wrap.has-error .fi { color: #f87171; }

  .fi-input {
    width: 100%; padding: .78rem .85rem .78rem 2.5rem;
    background: var(--color-surface); border: 1.5px solid var(--color-border);
    border-radius: .6rem; color: var(--color-text); font-size: .875rem;
    outline: none; transition: border-color .15s, box-shadow .15s; font-family: inherit;
  }
  .fi-input:focus { border-color: #22c55e; box-shadow: 0 0 0 3px rgba(34,197,94,.1); }
  .fi-input::placeholder { color: var(--color-muted); opacity: .55; }
  .field-wrap.has-error .fi-input { border-color: #dc2626; }
  [data-theme="dark"] .field-wrap.has-error .fi-input { border-color: #f87171; }

  .inline-error {
    display: flex; align-items: center; gap: .35rem;
    font-size: .72rem; color: #dc2626;
    animation: slideIn .15s ease;
  }
  [data-theme="dark"] .inline-error { color: #f87171; }
  @keyframes slideIn { from { opacity:0; transform:translateY(-3px); } to { opacity:1; transform:translateY(0); } }

  /* ── Submit button ───────────────────────────────────── */
  .submit-btn {
    display: flex; align-items: center; justify-content: center; gap: .5rem;
    width: 100%; padding: .82rem;
    background: #15803d; color: #fff;
    border: none; border-radius: .6rem;
    font-size: .9rem; font-weight: 700; cursor: pointer;
    transition: background .15s, transform .1s, box-shadow .15s;
    margin-top: .25rem; font-family: inherit;
  }
  .submit-btn:hover:not(:disabled) {
    background: #166534;
    box-shadow: 0 4px 16px rgba(21,128,61,.3);
    transform: translateY(-1px);
  }
  .submit-btn:disabled { opacity: .5; cursor: not-allowed; }
  [data-theme="dark"] .submit-btn         { background: #16a34a; }
  [data-theme="dark"] .submit-btn:hover:not(:disabled) { background: #15803d; }

  .spinner {
    width: 15px; height: 15px;
    border: 2px solid rgba(255,255,255,.25); border-top-color: #fff;
    border-radius: 50%; animation: spin .6s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Sent notice ─────────────────────────────────────── */
  .sent-notice {
    padding: .75rem 1rem; border-radius: .6rem; margin-bottom: 1rem;
    background: rgba(34,197,94,.07); border: 1px solid rgba(34,197,94,.2);
    font-size: .82rem;
  }
  [data-theme="dark"] .sent-notice { background: rgba(34,197,94,.1); border-color: rgba(34,197,94,.25); }
  .sent-notice-text { color: var(--color-muted); margin: 0; line-height: 1.5; }

  /* ── Link card ───────────────────────────────────────── */
  .link-card {
    background: var(--color-surface); border: 1.5px solid var(--color-border);
    border-radius: .875rem; overflow: hidden; margin-bottom: 1rem;
  }
  .link-card-header {
    display: flex; align-items: center; gap: .5rem;
    padding: .75rem 1rem; background: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
    font-size: .72rem; font-weight: 700; color: var(--color-muted);
    text-transform: uppercase; letter-spacing: .05em;
  }
  .link-card-header :global(svg) { color: #16a34a; flex-shrink: 0; }
  [data-theme="dark"] .link-card-header :global(svg) { color: #22c55e; }
  .link-expires {
    margin-left: auto; font-size: .65rem; font-weight: 700;
    color: #d97706; background: rgba(217,119,6,.1); padding: .15rem .5rem;
    border-radius: 999px; border: 1px solid rgba(217,119,6,.2);
  }
  [data-theme="dark"] .link-expires { color: #fbbf24; background: rgba(251,191,36,.08); border-color: rgba(251,191,36,.2); }

  .link-url {
    padding: .875rem 1rem; overflow: hidden;
  }
  .link-url-text {
    font-size: .72rem; font-family: monospace; color: var(--color-muted);
    word-break: break-all; line-height: 1.5;
  }

  .link-actions {
    display: flex; gap: .5rem; padding: .75rem 1rem;
    border-top: 1px solid var(--color-border);
  }
  .link-btn {
    display: inline-flex; align-items: center; gap: .4rem;
    padding: .5rem 1rem; border-radius: .5rem;
    font-size: .8rem; font-weight: 700; cursor: pointer;
    border: 1.5px solid; transition: all .15s; font-family: inherit;
    flex: 1; justify-content: center;
  }
  .link-btn-open {
    background: #15803d; color: #fff; border-color: #15803d;
  }
  .link-btn-open:hover { background: #166534; border-color: #166534; }
  [data-theme="dark"] .link-btn-open { background: #16a34a; border-color: #16a34a; }
  [data-theme="dark"] .link-btn-open:hover { background: #15803d; border-color: #15803d; }

  .link-btn-copy {
    background: none; color: var(--color-text);
    border-color: var(--color-border);
  }
  .link-btn-copy:hover { border-color: #22c55e; color: #16a34a; }
  [data-theme="dark"] .link-btn-copy:hover { color: #22c55e; border-color: #22c55e; }

  /* ── How it works ────────────────────────────────────── */
  .how-it-works {
    background: var(--color-bg); border: 1px solid var(--color-border);
    border-radius: .875rem; padding: 1rem; margin-bottom: 1rem;
    display: flex; flex-direction: column; gap: .75rem;
  }
  .how-title { font-size: .7rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--color-muted); margin: 0; }
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

  /* ── Bottom links ────────────────────────────────────── */
  .bottom-hint {
    text-align: center; font-size: .8rem; color: var(--color-muted); margin-top: 1rem;
  }
  .bottom-hint a { color: #15803d; font-weight: 600; text-decoration: none; }
  .bottom-hint a:hover { text-decoration: underline; }
  [data-theme="dark"] .bottom-hint a { color: #22c55e; }

  .restart-btn {
    display: block; width: 100%; margin-top: .75rem;
    background: none; border: none; cursor: pointer;
    font-size: .8rem; color: var(--color-muted);
    text-decoration: underline; text-align: center; font-family: inherit;
  }
  .restart-btn:hover { color: var(--color-text); }
</style>