<!-- src/routes/(auth)/forgot/+page.svelte -->
<script lang="ts">
  import { onMount }   from 'svelte';
  import { deserialize } from '$app/forms';
  import { initTheme }   from '$lib/index.js';
  import {
    Mail, ArrowRight, ChevronLeft,
    AlertCircle, CheckCircle, KeyRound,
  } from 'lucide-svelte';

  onMount(() => initTheme());

  let email    = $state('');
  let loading  = $state(false);
  let sent     = $state(false);
  let error    = $state('');

  async function handleSubmit() {
    error = '';
    if (!email.trim() || !email.includes('@')) {
      error = 'Please enter a valid email address.';
      return;
    }
    loading = true;
    try {
      const fd = new FormData();
      fd.set('email', email);
      const res    = await fetch('?/default', { method: 'POST', body: fd });
      const result = deserialize(await res.text()) as any;
      if (result.data?.error) { error = result.data.error; return; }
      sent = true;
    } catch (e: any) {
      error = 'Network error. Please try again.';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head><title>Forgot Password — MOUAU eTest</title></svelte:head>

<div class="auth-page">
  <div class="auth-card">
    <a href="/login" class="auth-back">
      <ChevronLeft size={15} /><span>Back to Login</span>
    </a>

    <div class="auth-icon-wrap">
      <div class="auth-icon"><KeyRound size={24} /></div>
    </div>

    {#if !sent}
      <div class="auth-header">
        <h1>Forgot your password?</h1>
        <p>Enter your email and we'll send you a reset code.</p>
      </div>

      {#if error}
        <div class="auth-alert error"><AlertCircle size={15} /><span>{error}</span></div>
      {/if}

      <div class="auth-form">
        <div class="auth-field">
          <label for="email">Email address</label>
          <div class="auth-input-wrap">
            <span class="auth-input-icon"><Mail size={15} /></span>
            <input
              id="email" type="email" bind:value={email}
              placeholder="your@mouau.edu.ng"
              class="auth-input" autocomplete="email"
              onkeydown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            />
          </div>
        </div>

        <button class="auth-btn" onclick={handleSubmit} type="button" disabled={loading}>
          {#if loading}
            <span class="auth-spinner"></span> Sending…
          {:else}
            Send Reset Code <ArrowRight size={15} />
          {/if}
        </button>
      </div>
    {:else}
      <!-- Sent state -->
      <div class="auth-sent">
        <div class="sent-icon"><CheckCircle size={32} /></div>
        <h2>Check your email</h2>
        <p>
          If <strong>{email}</strong> is registered, we've sent a
          6-character reset code to that address.
        </p>

        <div class="sent-steps">
          <div class="sent-step">
            <span class="sent-step-num">1</span>
            <span>Open the email from MOUAU eTest</span>
          </div>
          <div class="sent-step">
            <span class="sent-step-num">2</span>
            <span>Click <em>"Verify My Code"</em> — it opens a new tab showing your code</span>
          </div>
          <div class="sent-step">
            <span class="sent-step-num">3</span>
            <span>Come back here and enter the 6-character code</span>
          </div>
        </div>

        <a href="/reset" class="auth-btn-link">
          Enter my code <ArrowRight size={15} />
        </a>

        <button
          class="auth-resend"
          type="button"
          onclick={() => { sent = false; email = ''; }}
        >
          Use a different email
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .auth-page {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    padding: 1.5rem; background: var(--color-bg);
  }
  .auth-card {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 1.25rem; padding: 2rem; max-width: 420px; width: 100%;
    display: flex; flex-direction: column; gap: 1.25rem;
  }

  .auth-back {
    display: inline-flex; align-items: center; gap: 0.35rem;
    color: var(--color-muted); text-decoration: none; font-size: 0.82rem;
    font-weight: 500; transition: color 0.15s; width: fit-content;
  }
  .auth-back:hover { color: var(--color-primary); }

  .auth-icon-wrap { display: flex; justify-content: center; }
  .auth-icon {
    width: 56px; height: 56px; border-radius: 1rem;
    background: color-mix(in srgb, var(--color-primary) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-primary) 20%, transparent);
    display: flex; align-items: center; justify-content: center;
    color: var(--color-primary);
  }

  .auth-header { text-align: center; }
  .auth-header h1 { font-size: 1.4rem; font-weight: 800; margin: 0 0 0.25rem; letter-spacing: -0.02em; }
  .auth-header p  { font-size: 0.875rem; color: var(--color-muted); margin: 0; line-height: 1.5; }

  .auth-alert {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.75rem 1rem; border-radius: 0.6rem; font-size: 0.82rem;
  }
  .auth-alert.error { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; }
  [data-theme="dark"] .auth-alert.error { background: rgba(220,38,38,0.12); border-color: rgba(220,38,38,0.3); }

  .auth-form { display: flex; flex-direction: column; gap: 1rem; }

  .auth-field { display: flex; flex-direction: column; gap: 0.4rem; }
  .auth-field label { font-size: 0.82rem; font-weight: 600; color: var(--color-text); }

  .auth-input-wrap { position: relative; }
  .auth-input-icon {
    position: absolute; left: 0.875rem; top: 50%; transform: translateY(-50%);
    color: var(--color-muted); display: flex; align-items: center; pointer-events: none;
  }
  .auth-input {
    width: 100%; padding: 0.75rem 0.875rem 0.75rem 2.625rem;
    border: 1.5px solid var(--color-border); border-radius: 0.75rem;
    font-size: 0.875rem; color: var(--color-text); background: var(--color-bg);
    outline: none; transition: all 0.2s; box-sizing: border-box;
  }
  .auth-input:focus {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 12%, transparent);
  }

  .auth-btn {
    padding: 0.8rem; background: var(--color-primary); color: #fff;
    border: none; border-radius: 0.75rem; font-size: 0.9rem; font-weight: 600;
    cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
    transition: all 0.2s;
    box-shadow: 0 4px 12px color-mix(in srgb, var(--color-primary) 30%, transparent);
  }
  .auth-btn:hover:not(:disabled) {
    background: var(--color-primary-hover); transform: translateY(-1px);
  }
  .auth-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  /* Sent state */
  .auth-sent { display: flex; flex-direction: column; align-items: center; gap: 1rem; text-align: center; }
  .sent-icon { color: #22c55e; }
  .auth-sent h2 { font-size: 1.2rem; font-weight: 700; margin: 0; }
  .auth-sent p  { font-size: 0.875rem; color: var(--color-muted); margin: 0; line-height: 1.6; }

  .sent-steps {
    background: var(--color-bg); border: 1px solid var(--color-border);
    border-radius: 0.875rem; padding: 1rem; width: 100%;
    display: flex; flex-direction: column; gap: 0.75rem; text-align: left;
  }
  .sent-step {
    display: flex; align-items: flex-start; gap: 0.75rem;
    font-size: 0.82rem; color: var(--color-text); line-height: 1.5;
  }
  .sent-step em { font-style: normal; font-weight: 600; color: var(--color-primary); }
  .sent-step-num {
    width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
    background: var(--color-primary); color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.7rem; font-weight: 700;
  }

  .auth-btn-link {
    display: flex; align-items: center; justify-content: center; gap: 0.5rem;
    padding: 0.8rem 2rem; background: var(--color-primary); color: #fff;
    border-radius: 0.75rem; text-decoration: none; font-weight: 600; font-size: 0.9rem;
    width: 100%; transition: all 0.2s;
    box-shadow: 0 4px 12px color-mix(in srgb, var(--color-primary) 30%, transparent);
  }
  .auth-btn-link:hover { background: var(--color-primary-hover); transform: translateY(-1px); }

  .auth-resend {
    background: none; border: none; cursor: pointer;
    font-size: 0.8rem; color: var(--color-muted); text-decoration: underline;
  }
  .auth-resend:hover { color: var(--color-text); }

  .auth-spinner {
    width: 14px; height: 14px; border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.3); border-top-color: white;
    animation: spin 0.6s linear infinite; flex-shrink: 0;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>