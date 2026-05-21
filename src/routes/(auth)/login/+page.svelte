<!-- src/routes/(auth)/login/+page.svelte -->
<script lang="ts">
  import type { ActionData } from './$types';
  import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, ShieldCheck, GraduationCap, BookOpen, Users, CheckCircle } from 'lucide-svelte';
  import ThemeToggle from '$lib/components/ui/ThemeToggle.svelte';

  let { form }: { form: ActionData } = $props();
  let loading = $state(false);
  let showPass = $state(false);
  
  // Inline validation states
  let emailError = $state('');
  let passwordError = $state('');
  let emailTouched = $state(false);
  let passwordTouched = $state(false);
  let email = $state('');
  let password = $state('');

  function validateEmail(value: string) {
    if (!value) {
      emailError = 'Email is required';
      return false;
    }
    if (!/^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/.test(value)) {
      emailError = 'Please enter a valid email address';
      return false;
    }
    emailError = '';
    return true;
  }

  function validatePassword(value: string) {
    if (!value) {
      passwordError = 'Password is required';
      return false;
    }
    if (value.length < 6) {
      passwordError = 'Password must be at least 6 characters';
      return false;
    }
    passwordError = '';
    return true;
  }

  function handleEmailInput(e: Event) {
    const target = e.target as HTMLInputElement;
    email = target.value;
    if (emailTouched) {
      validateEmail(email);
    }
  }

  function handlePasswordInput(e: Event) {
    const target = e.target as HTMLInputElement;
    password = target.value;
    if (passwordTouched) {
      validatePassword(password);
    }
  }

  function handleEmailBlur() {
    emailTouched = true;
    validateEmail(email);
  }

  function handlePasswordBlur() {
    passwordTouched = true;
    validatePassword(password);
  }

  function handleSubmit(e: Event) {
    emailTouched = true;
    passwordTouched = true;
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    
    if (!isEmailValid || !isPasswordValid) {
      e.preventDefault();
      return;
    }
    
    loading = true;
  }
</script>

<svelte:head>
  <title>Login — MOUAU eTest</title>
</svelte:head>

<div class="root">

  <!-- Left panel -->
  <aside class="panel-left">
    <div class="panel-left-inner">
      <div class="brand">
        <div class="brand-icon">
          <ShieldCheck size={28} />
        </div>
        <div>
          <p class="brand-name">MOUAU eTest</p>
          <p class="brand-sub">Secure Examination Platform</p>
        </div>
      </div>

      <div class="panel-body">
        <h1 class="panel-heading">Integrity.<br/>Every.<br/>Exam.</h1>
        <p class="panel-desc">
          A tamper-proof digital examination system built for Michael Okpara University of Agriculture, Umudike.
        </p>
        <div class="stats-grid">
          <div class="stat-item">
            <GraduationCap size={20} />
            <div>
              <p class="stat-number">12,000+</p>
              <p class="stat-label">Active Students</p>
            </div>
          </div>
          <div class="stat-item">
            <BookOpen size={20} />
            <div>
              <p class="stat-number">1,200+</p>
              <p class="stat-label">Course Registrations</p>
            </div>
          </div>
          <div class="stat-item">
            <Users size={20} />
            <div>
              <p class="stat-number">500+</p>
              <p class="stat-label">Faculty Members</p>
            </div>
          </div>
        </div>
      </div>

      <p class="panel-footer">© {new Date().getFullYear()} Michael Okpara University of Agriculture</p>
    </div>
  </aside>

  <!-- Right panel -->
  <main class="panel-right">
    <div class="top-right">
      <ThemeToggle />
    </div>

    <div class="form-wrap">
      <div class="form-header">
        <div class="form-badge">Secure Access</div>
        <h2 class="form-title">Welcome back</h2>
        <p class="form-hint">Sign in to continue to your dashboard</p>
      </div>

      {#if form?.error}
        <div class="server-error">
          <AlertCircle size={14} />
          <span>{form.error}</span>
        </div>
      {/if}

      <form method="POST" onsubmit={handleSubmit} class="form">
        <div class="field">
          <label for="email" class="field-label">Email address</label>
          <div class="field-input-wrap">
            <span class="field-icon"><Mail size={16} /></span>
            <input 
              id="email" 
              name="email" 
              type="email" 
              required 
              autocomplete="email" 
              placeholder="you@mouau.edu.ng" 
              class="field-input {emailError && emailTouched ? 'error' : ''} {emailError === '' && emailTouched && email ? 'valid' : ''}"
              bind:value={email}
              oninput={handleEmailInput}
              onblur={handleEmailBlur}
            />
            {#if emailError && emailTouched}
              <span class="field-error-icon">
                <AlertCircle size={14} />
              </span>
            {:else if emailError === '' && emailTouched && email}
              <span class="field-success-icon">
                <CheckCircle size={14} />
              </span>
            {/if}
          </div>
          {#if emailError && emailTouched}
            <p class="error-message">{emailError}</p>
          {/if}
        </div>

        <div class="field">
          <label for="password" class="field-label">Password</label>
          <div class="field-input-wrap">
            <span class="field-icon"><Lock size={16} /></span>
            <input 
              id="password" 
              name="password" 
              type={showPass ? 'text' : 'password'} 
              required 
              autocomplete="current-password" 
              placeholder="Enter your password" 
              class="field-input field-input-pass {passwordError && passwordTouched ? 'error' : ''} {passwordError === '' && passwordTouched && password ? 'valid' : ''}"
              bind:value={password}
              oninput={handlePasswordInput}
              onblur={handlePasswordBlur}
            />
            <button type="button" onclick={() => (showPass = !showPass)} class="pass-toggle" aria-label="Toggle password">
              {#if showPass}<EyeOff size={16} />{:else}<Eye size={16} />{/if}
            </button>
            {#if passwordError && passwordTouched}
              <span class="field-error-icon">
                <AlertCircle size={14} />
              </span>
            {:else if passwordError === '' && passwordTouched && password}
              <span class="field-success-icon">
                <CheckCircle size={14} />
              </span>
            {/if}
          </div>
          {#if passwordError && passwordTouched}
            <p class="error-message">{passwordError}</p>
          {/if}
        </div>

        <button type="submit" disabled={loading || (emailError && emailTouched) || (passwordError && passwordTouched)} class="submit-btn">
          {#if loading}
            <span class="spinner"></span>
            Signing in...
          {:else}
            <LogIn size={16} />
            Sign In
          {/if}
        </button>
      </form>

      <div class="info-box">
        <ShieldCheck size={14} />
        <p>This is a secure platform. All activities are monitored and logged.</p>
      </div>
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
    --error: #dc2626;
    --success: #10b981;
  }

  :global(.dark) {
    --bg: #0f172a;
    --bg-card: #1e293b;
    --text: #f8fafc;
    --text-muted: #94a3b8;
    --border: #334155;
    --error: #f87171;
    --success: #34d399;
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  .root {
    min-height: 100vh;
    display: grid;
    grid-template-columns: 1fr 1fr;
    background: var(--bg);
  }

  @media (max-width: 768px) {
    .root {
      grid-template-columns: 1fr;
    }
    .panel-left {
      display: flex;
      max-height: 280px;
    }
    .panel-left-inner {
      padding: 1.5rem;
    }
    .panel-body {
      padding: 1rem 0;
    }
    .panel-heading {
      font-size: 1.5rem;
      margin-bottom: 0.75rem;
    }
    .panel-desc {
      font-size: 0.75rem;
      margin-bottom: 1rem;
      max-width: 100%;
    }
    .stats-grid {
      flex-direction: row;
      gap: 1rem;
      margin-top: 1rem;
      flex-wrap: wrap;
    }
    .stat-item {
      flex: 1;
      min-width: 100px;
    }
    .stat-number {
      font-size: 0.9rem;
    }
    .stat-label {
      font-size: 0.6rem;
    }
    .brand {
      margin-bottom: 0.5rem;
    }
    .brand-icon {
      width: 36px;
      height: 36px;
    }
    .brand-name {
      font-size: 0.85rem;
    }
    .brand-sub {
      font-size: 0.6rem;
    }
    .panel-footer {
      font-size: 0.6rem;
    }
  }

  /* Left panel */
  .panel-left {
    background: linear-gradient(135deg, #051a11 0%, #0a2a1c 100%);
    position: relative;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  .panel-left::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: linear-gradient(rgba(34, 197, 94, 0.08) 1px, transparent 1px),
      linear-gradient(90deg, rgba(34, 197, 94, 0.08) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
  }

  .panel-left::after {
    content: '';
    position: absolute;
    width: 600px;
    height: 600px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(34, 197, 94, 0.15) 0%, transparent 70%);
    top: -150px;
    left: -150px;
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

  .brand {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .brand-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: rgba(34, 197, 94, 0.12);
    border: 1px solid rgba(34, 197, 94, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #22c55e;
    flex-shrink: 0;
  }

  .brand-name {
    font-size: 1rem;
    font-weight: 800;
    color: #f8fafc;
    margin: 0;
    letter-spacing: -0.01em;
  }

  .brand-sub {
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.4);
    margin: 0;
    letter-spacing: 0.04em;
  }

  .panel-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 3rem 0;
  }

  .panel-heading {
    font-size: clamp(2.5rem, 4.5vw, 3.5rem);
    font-weight: 900;
    color: #ffffff;
    line-height: 1.05;
    letter-spacing: -0.04em;
    margin: 0 0 1.5rem 0;
  }

  .panel-desc {
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.5);
    line-height: 1.7;
    margin: 0 0 2rem 0;
    max-width: 320px;
  }

  .stats-grid {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    margin-top: 2rem;
  }

  .stat-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    color: #22c55e;
  }

  .stat-number {
    font-size: 1.125rem;
    font-weight: 700;
    color: #ffffff;
    margin-bottom: 0.125rem;
  }

  .stat-label {
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.4);
  }

  .panel-footer {
    font-size: 0.68rem;
    color: rgba(255, 255, 255, 0.2);
    margin: 0;
  }

  /* Right panel */
  .panel-right {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    position: relative;
    background: var(--bg);
  }

  .top-right {
    position: absolute;
    top: 1.5rem;
    right: 1.5rem;
  }

  .form-wrap {
    width: 100%;
    max-width: 400px;
  }

  .form-header {
    margin-bottom: 2rem;
    text-align: center;
  }

  .form-badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.2);
    border-radius: 2rem;
    font-size: 0.7rem;
    font-weight: 600;
    color: #22c55e;
    margin-bottom: 1rem;
  }

  .form-title {
    font-size: 2rem;
    font-weight: 800;
    color: var(--text);
    letter-spacing: -0.03em;
    margin: 0 0 0.5rem 0;
  }

  .form-hint {
    font-size: 0.85rem;
    color: var(--text-muted);
    margin: 0;
  }

  .server-error {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    background: rgba(220, 38, 38, 0.1);
    border: 1px solid rgba(220, 38, 38, 0.3);
    color: var(--error);
    font-size: 0.85rem;
    margin-bottom: 1.5rem;
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .field-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .field-input-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }

  .field-icon {
    position: absolute;
    left: 1rem;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    pointer-events: none;
    z-index: 1;
  }

  .field-input {
    width: 100%;
    padding: 0.75rem 1rem 0.75rem 2.75rem;
    background: var(--bg-card);
    border: 1.5px solid var(--border);
    border-radius: 0.75rem;
    color: var(--text);
    font-size: 0.9rem;
    outline: none;
    transition: all 0.15s ease;
  }

  .field-input:focus {
    border-color: #22c55e;
    box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.1);
  }

  .field-input.error {
    border-color: var(--error);
    padding-right: 2.5rem;
  }

  .field-input.error:focus {
    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
  }

  .field-input.valid {
    border-color: var(--success);
    padding-right: 2.5rem;
  }

  .field-input.valid:focus {
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
  }

  .field-input::placeholder {
    color: var(--text-muted);
    opacity: 0.6;
  }

  .field-input-pass {
    padding-right: 2.75rem;
  }

  .field-error-icon {
    position: absolute;
    right: 1rem;
    color: var(--error);
    display: flex;
    align-items: center;
    pointer-events: none;
  }

  .field-success-icon {
    position: absolute;
    right: 1rem;
    color: var(--success);
    display: flex;
    align-items: center;
    pointer-events: none;
  }

  .error-message {
    font-size: 0.7rem;
    color: var(--error);
    margin-top: -0.25rem;
  }

  .pass-toggle {
    position: absolute;
    right: 1rem;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    padding: 0.25rem;
    border-radius: 0.25rem;
    transition: color 0.15s ease;
    z-index: 1;
  }

  .pass-toggle:hover {
    color: var(--text);
  }

  .submit-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.85rem;
    margin-top: 0.5rem;
    background: linear-gradient(135deg, #15803d 0%, #166534 100%);
    color: white;
    border: none;
    border-radius: 0.75rem;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .submit-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(21, 128, 61, 0.3);
  }

  .submit-btn:active:not(:disabled) {
    transform: translateY(0);
  }

  .submit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.25);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .info-box {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 2rem;
    padding: 1rem;
    background: var(--bg-card);
    border-radius: 0.5rem;
    font-size: 0.7rem;
    color: var(--text-muted);
    text-align: center;
  }

  .info-box p {
    margin: 0;
  }

  .info-box svg {
    color: #22c55e;
    flex-shrink: 0;
  }
</style>