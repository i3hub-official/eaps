<!-- src/routes/(auth)/reset/verify/+page.svelte -->
<!-- Opened from email link — shows the OTP so user can type it in any tab -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { initTheme } from '$lib/index.js';
  import { CheckCircle, XCircle, Copy, Check, ShieldCheck, ArrowRight } from 'lucide-svelte';
  import ThemeToggle from '$lib/components/ui/ThemeToggle.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  onMount(() => initTheme());

  let copied = $state(false);

  async function copyToken() {
    if (!data.token) return;
    try {
      await navigator.clipboard.writeText(data.token);
      copied = true;
      setTimeout(() => { copied = false; }, 2000);
    } catch {}
  }
</script>

<svelte:head><title>Your Reset Code — MOUAU eTest</title></svelte:head>

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
        <h1 class="panel-heading">Your<br/>code<br/>awaits.</h1>
        <p class="panel-desc">
          This page shows your one-time reset code.
          Copy it, return to the reset form, and set your new password.
        </p>
        <ul class="features">
          {#each [
            'One-time 6-character reset code',
            'Expires in 15 minutes',
            'Copy and paste or type it in',
            'All sessions signed out on reset',
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
      <a href="/reset" class="back-link">
        <ArrowRight size={15} /> Go to reset form
      </a>
      <ThemeToggle />
    </div>

    <div class="form-wrap">

      {#if data.valid && data.token}

        <!-- Header -->
        <div class="form-header">
          <div class="form-icon success">
            <CheckCircle size={22} strokeWidth={1.5} />
          </div>
          <h2 class="form-title">Here's your reset code</h2>
          <p class="form-hint">
            Copy the code below and enter it in the password reset form.
            It expires in <strong>15 minutes</strong>.
          </p>
        </div>

        <!-- OTP display card -->
        <div class="token-card">
          <div class="token-card-header">
            <span>Your 6-character code</span>
            <span class="expires-badge">Expires in 15 min</span>
          </div>
          <div class="token-chars">
            {#each data.token.split('') as char}
              <span class="token-char">{char}</span>
            {/each}
          </div>
          <div class="token-card-footer">
            <button class="copy-btn" onclick={copyToken} type="button">
              {#if copied}
                <Check size={14} /> Copied!
              {:else}
                <Copy size={14} /> Copy Code
              {/if}
            </button>
          </div>
        </div>

        <!-- Steps -->
        <div class="how-it-works">
          <p class="how-title">What to do next</p>
          <div class="how-step">
            <span class="how-num">1</span>
            <span>Go back to the browser tab where you entered your email</span>
          </div>
          <div class="how-step">
            <span class="how-num">2</span>
            <span>Enter the 6-character code above into the reset form</span>
          </div>
          <div class="how-step">
            <span class="how-num">3</span>
            <span>Choose your new password and sign in</span>
          </div>
        </div>

        <a href="/reset" class="submit-btn">
          Go to reset form <ArrowRight size={16} />
        </a>

      {:else}

        <!-- Invalid / expired token -->
        <div class="form-header">
          <div class="form-icon error">
            <XCircle size={22} strokeWidth={1.5} />
          </div>
          <h2 class="form-title">Invalid or expired link</h2>
          <p class="form-hint">
            {data.error ?? 'This reset link is invalid or has already been used.'}
          </p>
        </div>

        <div class="error-notice">
          <p class="how-title">Why did this happen?</p>
          <div class="how-step">
            <span class="how-num how-num--red">!</span>
            <span>Reset links expire after <strong>15 minutes</strong></span>
          </div>
          <div class="how-step">
            <span class="how-num how-num--red">!</span>
            <span>Each link can only be used once</span>
          </div>
          <div class="how-step">
            <span class="how-num how-num--red">!</span>
            <span>A newer request may have replaced this one</span>
          </div>
        </div>

        <a href="/forgot" class="submit-btn">
          Request a new code <ArrowRight size={16} />
        </a>

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
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 0.25rem;
  }
  .form-icon.success {
    background: rgba(34,197,94,.1); border: 1px solid rgba(34,197,94,.2); color: #16a34a;
  }
  .form-icon.error {
    background: rgba(239,68,68,.08); border: 1px solid rgba(239,68,68,.2); color: #dc2626;
  }
  [data-theme="dark"] .form-icon.success { background: rgba(34,197,94,.15); border-color: rgba(34,197,94,.3); color: #22c55e; }
  [data-theme="dark"] .form-icon.error   { background: rgba(239,68,68,.12); border-color: rgba(239,68,68,.3); color: #f87171; }

  .form-title { font-size: 1.9rem; font-weight: 900; color: var(--color-text); letter-spacing: -.04em; margin: 0; }
  .form-hint  { font-size: .83rem; color: var(--color-muted); margin: 0; line-height: 1.6; }

  /* ── Token card ──────────────────────────────────────── */
  .token-card {
    background: var(--color-surface); border: 1.5px solid var(--color-border);
    border-radius: .875rem; overflow: hidden; margin-bottom: 1rem;
  }
  .token-card-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: .75rem 1rem; background: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
    font-size: .72rem; font-weight: 700; color: var(--color-muted);
    text-transform: uppercase; letter-spacing: .05em;
  }
  .expires-badge {
    font-size: .65rem; font-weight: 700;
    color: #d97706; background: rgba(217,119,6,.1); padding: .15rem .5rem;
    border-radius: 999px; border: 1px solid rgba(217,119,6,.2);
  }
  [data-theme="dark"] .expires-badge { color: #fbbf24; background: rgba(251,191,36,.08); border-color: rgba(251,191,36,.2); }

  .token-chars {
    display: flex; gap: .5rem; padding: 1.25rem 1rem; justify-content: center;
  }
  .token-char {
    flex: 1; min-width: 0; height: 56px;
    background: var(--color-bg); border: 1.5px solid rgba(34,197,94,.3);
    border-radius: .6rem;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.35rem; font-weight: 900; font-family: monospace;
    color: var(--color-text);
    box-shadow: inset 0 1px 3px rgba(0,0,0,.04);
  }
  [data-theme="dark"] .token-char { border-color: rgba(34,197,94,.25); }

  .token-card-footer {
    padding: .75rem 1rem; border-top: 1px solid var(--color-border);
    display: flex;
  }
  .copy-btn {
    display: inline-flex; align-items: center; gap: .4rem;
    flex: 1; justify-content: center;
    padding: .55rem 1rem;
    background: #15803d; color: #fff;
    border: none; border-radius: .5rem;
    font-size: .82rem; font-weight: 700; cursor: pointer;
    transition: all .15s; font-family: inherit;
  }
  .copy-btn:hover { background: #166534; box-shadow: 0 4px 12px rgba(21,128,61,.3); }
  [data-theme="dark"] .copy-btn { background: #16a34a; }
  [data-theme="dark"] .copy-btn:hover { background: #15803d; }

  /* ── How it works / error notice ─────────────────────── */
  .how-it-works,
  .error-notice {
    background: var(--color-bg); border: 1px solid var(--color-border);
    border-radius: .875rem; padding: 1rem; margin-bottom: 1rem;
    display: flex; flex-direction: column; gap: .75rem;
  }
  .how-title { font-size: .7rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--color-muted); margin: 0; }
  .how-step  { display: flex; align-items: flex-start; gap: .6rem; font-size: .82rem; color: var(--color-text); line-height: 1.5; }
  .how-num {
    width: 20px; height: 20px; border-radius: 50%; flex-shrink: 0;
    background: #15803d; color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: .65rem; font-weight: 700; margin-top: .1rem;
  }
  [data-theme="dark"] .how-num { background: #16a34a; }
  .how-num--red { background: #dc2626; }
  [data-theme="dark"] .how-num--red { background: #ef4444; }

  /* ── Submit button ───────────────────────────────────── */
  .submit-btn {
    display: flex; align-items: center; justify-content: center; gap: .5rem;
    width: 100%; padding: .82rem;
    background: #15803d; color: #fff;
    border: none; border-radius: .6rem;
    font-size: .9rem; font-weight: 700; cursor: pointer;
    transition: background .15s, transform .1s, box-shadow .15s;
    font-family: inherit; text-decoration: none;
  }
  .submit-btn:hover {
    background: #166534;
    box-shadow: 0 4px 16px rgba(21,128,61,.3);
    transform: translateY(-1px);
  }
  [data-theme="dark"] .submit-btn         { background: #16a34a; }
  [data-theme="dark"] .submit-btn:hover   { background: #15803d; }
</style>