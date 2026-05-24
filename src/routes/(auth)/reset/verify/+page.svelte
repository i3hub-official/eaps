
<!-- src/routes/(auth)/reset/verify/+page.svelte -->
<!-- Opened from email link — shows the OTP so user can type it in any tab -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { initTheme } from '$lib/index.js';
  import { CheckCircle, XCircle, Copy, Check } from 'lucide-svelte';
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

<div class="verify-page">
  <div class="verify-card">
    <div class="verify-brand">
      <span aria-hidden="true">📋</span>
      <span>MOUAU eTest</span>
    </div>

    {#if data.valid && data.token}
      <div class="verify-icon success"><CheckCircle size={28} /></div>
      <h1>Here's your reset code</h1>
      <p class="verify-desc">
        Copy this code and enter it in the password reset form.<br />
        <strong>It expires in 15 minutes.</strong>
      </p>

      <!-- Big OTP display -->
      <div class="token-display">
        <p class="token-label">Your 6-character code</p>
        <div class="token-chars">
          {#each data.token.split('') as char}
            <span class="token-char">{char}</span>
          {/each}
        </div>
        <button class="copy-btn" onclick={copyToken} type="button">
          {#if copied}
            <Check size={15} /> Copied!
          {:else}
            <Copy size={15} /> Copy Code
          {/if}
        </button>
      </div>

      <div class="verify-steps">
        <p class="steps-title">What to do next:</p>
        <div class="step">
          <span class="step-num">1</span>
          <span>Go back to the browser tab where you entered your email</span>
        </div>
        <div class="step">
          <span class="step-num">2</span>
          <span>Enter the 6-character code above</span>
        </div>
        <div class="step">
          <span class="step-num">3</span>
          <span>Choose your new password</span>
        </div>
      </div>

      <a href="/reset" class="verify-link">
        Go to reset form →
      </a>

    {:else}
      <!-- Invalid / expired token -->
      <div class="verify-icon error"><XCircle size={28} /></div>
      <h1>Invalid or expired link</h1>
      <p class="verify-desc">
        {data.error ?? 'This reset link is invalid or has already been used.'}
      </p>
      <a href="/forgot" class="verify-link">Request a new code</a>
    {/if}
  </div>
</div>

<style>
  .verify-page {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    padding: 1.5rem; background: var(--color-bg);
  }
  .verify-card {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 1.25rem; padding: 2.5rem 2rem; max-width: 400px; width: 100%;
    display: flex; flex-direction: column; align-items: center; gap: 1.25rem;
    text-align: center;
  }
  .verify-brand {
    display: flex; align-items: center; gap: 0.4rem;
    font-size: 0.875rem; font-weight: 700; color: var(--color-muted);
  }

  .verify-icon { line-height: 1; }
  .verify-icon.success { color: #22c55e; }
  .verify-icon.error   { color: #ef4444; }

  h1 { font-size: 1.3rem; font-weight: 800; margin: 0; letter-spacing: -0.02em; }
  .verify-desc {
    font-size: 0.875rem; color: var(--color-muted); margin: 0; line-height: 1.6;
  }

  /* OTP display */
  .token-display {
    width: 100%; background: var(--color-bg);
    border: 2px dashed var(--color-primary); border-radius: 1rem;
    padding: 1.5rem 1rem; display: flex; flex-direction: column;
    align-items: center; gap: 1rem;
  }
  .token-label {
    font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.08em; color: var(--color-primary); margin: 0;
  }
  .token-chars {
    display: flex; gap: 0.5rem;
  }
  .token-char {
    width: 44px; height: 52px;
    background: var(--color-surface);
    border: 2px solid var(--color-border);
    border-radius: 0.6rem;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.5rem; font-weight: 900;
    font-family: monospace; color: var(--color-text);
    box-shadow: 0 2px 4px rgba(0,0,0,0.06);
  }
  .copy-btn {
    display: flex; align-items: center; gap: 0.4rem;
    padding: 0.5rem 1.25rem;
    background: var(--color-primary); color: #fff;
    border: none; border-radius: 0.5rem;
    font-size: 0.82rem; font-weight: 600; cursor: pointer;
    transition: all 0.15s;
  }
  .copy-btn:hover { background: var(--color-primary-hover); }

  /* Steps */
  .verify-steps {
    width: 100%; background: var(--color-bg); border: 1px solid var(--color-border);
    border-radius: 0.875rem; padding: 1rem; text-align: left;
    display: flex; flex-direction: column; gap: 0.75rem;
  }
  .steps-title { font-size: 0.72rem; font-weight: 700; color: var(--color-muted); margin: 0; text-transform: uppercase; letter-spacing: 0.05em; }
  .step { display: flex; align-items: flex-start; gap: 0.6rem; font-size: 0.82rem; color: var(--color-text); line-height: 1.5; }
  .step-num {
    width: 20px; height: 20px; border-radius: 50%; flex-shrink: 0;
    background: var(--color-primary); color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.65rem; font-weight: 700;
  }

  .verify-link {
    color: var(--color-primary); font-weight: 600; text-decoration: none;
    font-size: 0.875rem; transition: opacity 0.15s;
  }
  .verify-link:hover { opacity: 0.8; text-decoration: underline; }
</style>