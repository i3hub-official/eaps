<!-- src/routes/(auth)/login/+page.svelte -->
<script lang="ts">
  import type { ActionData } from './$types';
  import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, ShieldCheck } from 'lucide-svelte';
  import ThemeToggle from '$lib/components/ui/ThemeToggle.svelte';

  let { form }: { form: ActionData } = $props();
  let loading = $state(false);
  let showPass = $state(false);

  let clientErrors = $state<{ email?: string; password?: string }>({});
  let touched = $state<{ email: boolean; password: boolean }>({ email: false, password: false });

  function validateEmail(value: string): string | undefined {
    if (!value || value.trim() === '') return 'Email address is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return 'Please enter a valid email address';
    return undefined;
  }

  function validatePassword(value: string): string | undefined {
    if (!value || value.trim() === '') return 'Password is required';
    if (value.length < 6) return 'Password must be at least 6 characters';
    return undefined;
  }

  function validateField(field: 'email' | 'password', value: string) {
    touched[field] = true;
    if (field === 'email') {
      clientErrors.email = validateEmail(value);
    } else {
      clientErrors.password = validatePassword(value);
    }
  }

  function handleSubmit(e: SubmitEvent) {
    const formEl = e.target as HTMLFormElement;
    const email = (formEl.elements.namedItem('email') as HTMLInputElement).value;
    const password = (formEl.elements.namedItem('password') as HTMLInputElement).value;

    const emailErr = validateEmail(email);
    const passErr = validatePassword(password);

    clientErrors = { email: emailErr, password: passErr };
    touched = { email: true, password: true };

    if (emailErr || passErr) {
      e.preventDefault();
      return;
    }

    loading = true;
  }

  function getError(field: 'email' | 'password'): string | undefined {
    if (touched[field] && clientErrors[field]) return clientErrors[field];
    return form?.errors?.[field];
  }

  function hasError(field: 'email' | 'password'): boolean {
    return !!getError(field);
  }
</script>

<svelte:head>
  <title>Login — MOUAU eTest</title>
</svelte:head>

<div class="root">
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
        <h1 class="panel-heading">Integrity.<br/>Every.<br/>Exam.</h1>
        <p class="panel-desc">
          Tamper-proof digital examination system for Michael Okpara University of Agriculture, Umudike.
        </p>
      </div>
      <p class="panel-footer">© {new Date().getFullYear()} MOUAU</p>
    </div>
  </aside>

  <main class="panel-right">
    <div class="top-right"><ThemeToggle /></div>

    <div class="form-wrap">
      <div class="form-header">
        <div class="form-badge">Secure Access</div>
        <h2 class="form-title">Welcome back</h2>
        <p class="form-hint">Sign in to continue to your dashboard</p>
      </div>

      <form method="POST" onsubmit={handleSubmit} class="form" novalidate>
        <div class="field">
          <label for="email" class="field-label">Email address</label>
          <div class="field-input-wrap" class:error={hasError('email')}>
            <span class="field-icon"><Mail size={16} /></span>
            <input
              id="email" name="email" type="email" autocomplete="email"
              placeholder="you@mouau.edu.ng" class="field-input"
              class:field-input-error={hasError('email')}
              onblur={(e) => validateField('email', e.currentTarget.value)}
              oninput={(e) => { if (touched.email) validateField('email', e.currentTarget.value); }}
            />
          </div>
          {#if getError('email')}
            <p class="inline-error"><AlertCircle size={14} /> {getError('email')}</p>
          {/if}
        </div>

        <div class="field">
          <label for="password" class="field-label">Password</label>
          <div class="field-input-wrap" class:error={hasError('password')}>
            <span class="field-icon"><Lock size={16} /></span>
            <input
              id="password" name="password"
              type={showPass ? 'text' : 'password'}
              autocomplete="current-password"
              placeholder="Enter your password"
              class="field-input field-input-pass"
              class:field-input-error={hasError('password')}
              onblur={(e) => validateField('password', e.currentTarget.value)}
              oninput={(e) => { if (touched.password) validateField('password', e.currentTarget.value); }}
            />
            <button type="button" onclick={() => (showPass = !showPass)} class="pass-toggle" aria-label="Toggle password">
              {#if showPass}<EyeOff size={16} />{:else}<Eye size={16} />{/if}
            </button>
          </div>
          {#if getError('password')}
            <p class="inline-error"><AlertCircle size={14} /> {getError('password')}</p>
          {/if}
        </div>

        {#if form?.error}
          <div class="error-box">
            <AlertCircle size={16} /><span>{form.error}</span>
          </div>
        {/if}

        <button type="submit" disabled={loading} class="submit-btn">
          {#if loading}
            <span class="spinner"></span> Signing in...
          {:else}
            <LogIn size={16} /> Sign In
          {/if}
        </button>
      </form>

      <div class="info-box">
        <ShieldCheck size={14} />
        <p>This is a secure platform. All activities are monitored and logged.</p>
      </div>

      <p class="register-link">
        New student? <a href="/register">Create an account</a>
      </p>
    </div>
  </main>
</div>

<style>
  :root {
    --bg: #ffffff;
    --bg-card: #ffffff;
    --text: #0f172a;
    --text-muted: #475569;
    --border: #e2e8f0;
  }
  :global(.dark) {
    --bg: #0f172a;
    --bg-card: #1e293b;
    --text: #f8fafc;
    --text-muted: #94a3b8;
    --border: #334155;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  .root {
    min-height: 100vh;
    display: grid;
    grid-template-columns: 1fr 1fr;
    background: var(--bg);
  }

  @media (max-width: 768px) {
    .root { grid-template-columns: 1fr; }
    .panel-left { height: auto; min-height: 260px; padding: 1.5rem 1.25rem; }
    .panel-left-inner { padding: 0; }
    .panel-body { padding: 1.25rem 0; }
    .panel-heading { font-size: 2.1rem; line-height: 1.1; }
    .panel-desc { font-size: 0.8rem; max-width: 100%; }
    .panel-footer { font-size: 0.65rem; }
  }

  .panel-left {
    background: linear-gradient(135deg, #051a11 0%, #0a2a1c 100%);
    position: relative; overflow: hidden;
    display: flex; flex-direction: column; color: white;
  }
  .panel-left::before {
    content: ''; position: absolute; inset: 0; pointer-events: none;
    background-image: linear-gradient(rgba(34, 197, 94, 0.08) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(34, 197, 94, 0.08) 1px, transparent 1px);
    background-size: 40px 40px;
  }
  .panel-left-inner {
    position: relative; z-index: 1;
    display: flex; flex-direction: column;
    height: 100%; padding: 2.5rem;
  }

  .brand { display: flex; align-items: center; gap: 0.75rem; }
  .brand-icon {
    width: 48px; height: 48px; border-radius: 12px;
    background: rgba(34, 197, 94, 0.12);
    border: 1px solid rgba(34, 197, 94, 0.3);
    display: flex; align-items: center; justify-content: center;
    color: #22c55e;
  }
  .brand-name { font-size: 1.1rem; font-weight: 800; letter-spacing: -0.01em; }
  .brand-sub  { font-size: 0.7rem; color: rgba(255, 255, 255, 0.45); }
  .panel-body {
    flex: 1; display: flex; flex-direction: column;
    justify-content: center; padding: 3rem 0;
  }
  .panel-heading {
    font-size: clamp(2.4rem, 4.5vw, 3.5rem);
    font-weight: 900; line-height: 1.05; letter-spacing: -0.04em;
  }
  .panel-desc {
    font-size: 0.85rem; color: rgba(255, 255, 255, 0.55);
    line-height: 1.7; margin-top: 1rem;
  }
  .panel-footer { font-size: 0.7rem; color: rgba(255, 255, 255, 0.25); margin-top: auto; }

  .panel-right {
    display: flex; align-items: center; justify-content: center;
    padding: 2rem 1.5rem; background: var(--bg); position: relative;
  }
  .top-right { position: absolute; top: 1.25rem; right: 1.25rem; }
  .form-wrap  { width: 100%; max-width: 420px; }

  .form-header { text-align: center; margin-bottom: 2rem; }
  .form-badge {
    display: inline-block; padding: 0.25rem 0.75rem;
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.25);
    border-radius: 9999px;
    font-size: 0.7rem; font-weight: 600; color: #22c55e;
    margin-bottom: 0.75rem;
  }
  .form-title { font-size: 2rem; font-weight: 800; color: var(--text); letter-spacing: -0.03em; }
  .form-hint  { color: var(--text-muted); font-size: 0.9rem; }

  .form { display: flex; flex-direction: column; gap: 1.25rem; }

  .field { display: flex; flex-direction: column; gap: 0.35rem; }
  .field-label {
    font-size: 0.75rem; font-weight: 600; color: var(--text-muted);
    text-transform: uppercase; letter-spacing: 0.05em;
  }
  .field-input-wrap { position: relative; }
  .field-input-wrap.error .field-icon { color: #dc2626; }
  .field-icon {
    position: absolute; left: 1rem; top: 50%; transform: translateY(-50%);
    color: var(--text-muted); transition: color 0.15s;
  }
  .field-input {
    width: 100%; padding: 0.85rem 1rem 0.85rem 2.75rem;
    background: var(--bg-card); border: 1.5px solid var(--border);
    border-radius: 0.75rem; font-size: 0.95rem; outline: none;
    transition: all 0.2s; color: var(--text);
  }
  .field-input:focus {
    border-color: #22c55e;
    box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.1);
  }
  .field-input-error,
  .field-input-wrap.error .field-input {
    border-color: #dc2626;
    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.08);
  }
  .field-input-error:focus,
  .field-input-wrap.error .field-input:focus {
    border-color: #dc2626;
    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.12);
  }
  .field-input-pass { padding-right: 3rem; }
  .pass-toggle {
    position: absolute; right: 1rem; top: 50%; transform: translateY(-50%);
    background: none; border: none; color: var(--text-muted);
    cursor: pointer; display: flex; align-items: center;
    padding: 0.25rem; border-radius: 0.25rem; transition: color 0.15s;
  }
  .pass-toggle:hover { color: var(--text); }

  .inline-error {
    color: #dc2626; font-size: 0.8rem;
    display: flex; align-items: center; gap: 0.35rem;
    margin-top: 0.15rem; animation: slideIn 0.2s ease;
  }
  :global(.dark) .inline-error { color: #f87171; }
  @keyframes slideIn {
    from { opacity: 0; transform: translateY(-4px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .error-box {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: #fef2f2; border: 1px solid #fecaca;
    color: #dc2626; border-radius: 0.5rem; font-size: 0.85rem;
  }
  :global(.dark) .error-box {
    background: rgba(220, 38, 38, 0.1);
    border-color: rgba(220, 38, 38, 0.3);
    color: #f87171;
  }

  .submit-btn {
    margin-top: 0.5rem; padding: 0.9rem;
    background: linear-gradient(135deg, #15803d 0%, #166534 100%);
    color: white; border: none; border-radius: 0.75rem;
    font-weight: 600; font-size: 0.95rem; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 0.5rem;
    transition: all 0.15s;
  }
  .submit-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 15px rgba(21, 128, 61, 0.35);
  }
  .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  .spinner {
    width: 18px; height: 18px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: white; border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .info-box {
    margin-top: 2rem; padding: 1rem;
    background: var(--bg-card); border-radius: 0.5rem;
    font-size: 0.75rem; color: var(--text-muted);
    text-align: center;
    display: flex; align-items: center; justify-content: center; gap: 0.5rem;
  }

  .register-link {
    margin-top: 1.25rem;
    text-align: center;
    font-size: 0.875rem;
    color: var(--text-muted);
  }
  .register-link a {
    color: #22c55e;
    font-weight: 600;
    text-decoration: none;
  }
  .register-link a:hover { text-decoration: underline; }
</style>