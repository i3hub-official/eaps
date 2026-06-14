<!-- src/routes/(auth)/login/+page.svelte -->
<script lang="ts">
  import type { ActionData } from './$types';
  import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, ShieldCheck, ArrowRight, ArrowLeft, Sparkles, Fingerprint } from '@lucide/svelte';
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
    const masked = '•'.repeat(Math.max(local.length - 2, 2));
    return `${visible}${masked}@${domain}`;
  });
</script>

<svelte:head>
  <title>Login — MOUAU eTest</title>
</svelte:head>

<div class="root">
  <!-- Mobile hero strip (visible only on small screens) -->
  <div class="mobile-banner">
    <div class="mobile-banner-inner">
      <div class="brand">
        <div class="brand-icon">
          <ShieldCheck size={18} strokeWidth={1.5} />
        </div>
        <div class="brand-text">
          <p class="brand-name">MOUAU eTest</p>
          <p class="brand-sub">Secure Examination Platform</p>
        </div>
      </div>
      <div class="mobile-tagline">
        <span class="gradient-text">Integrity. Precision. Every Exam.</span>
      </div>
    </div>
    <!-- Decorative background elements for mobile strip -->
    <div class="mobile-glow"></div>
    <div class="mobile-grid"></div>
  </div>

  <!-- Left branding panel (desktop only) -->
  <aside class="panel-left">
    <div class="panel-left-inner">
      <div class="brand">
        <div class="brand-icon">
          <ShieldCheck size={24} strokeWidth={1.5} />
        </div>
        <div class="brand-text">
          <p class="brand-name">MOUAU eTest</p>
          <p class="brand-sub">Secure Examination Platform</p>
        </div>
      </div>

      <div class="panel-body">
        <div class="hero-badge">
          <Sparkles size={12} />
          <span>Trusted by 12,000+ students</span>
        </div>
        
        <h1 class="panel-heading">
          Integrity.<br/>
          Precision.<br/>
          <span class="gradient-text">Every Exam.</span>
        </h1>
        
        <p class="panel-desc">
          A tamper-proof digital examination ecosystem built for Michael Okpara University of Agriculture, Umudike.
        </p>

        <div class="features-grid">
          {#each [
            { icon: Fingerprint, text: 'AI-powered malpractice detection' },
            { icon: ShieldCheck, text: 'Military-grade encryption' },
            { icon: Sparkles, text: 'Per-student question randomization' },
            { icon: ShieldCheck, text: 'Real-time invigilator dashboard' }
          ] as feature}
            <div class="feature-card">
              <div class="feature-icon">
                <svelte:component this={feature.icon} size={14} strokeWidth={2} />
              </div>
              <span class="feature-text">{feature.text}</span>
            </div>
          {/each}
        </div>
      </div>

      <div class="panel-footer">
        <div class="footer-divider"></div>
        <p>© {new Date().getFullYear()} Michael Okpara University of Agriculture</p>
      </div>
    </div>

    <!-- Decorative elements -->
    <div class="glow-orb glow-1"></div>
    <div class="glow-orb glow-2"></div>
    <div class="grid-pattern"></div>
  </aside>

  <!-- Right form panel -->
  <main class="panel-right">
    <div class="top-right"><ThemeToggle /></div>

    <div class="form-wrap">
      <div class="form-header">
        <div class="form-badge">
          <ShieldCheck size={11} strokeWidth={2.5} />
          <span>Secure Access Portal</span>
        </div>
        <h2 class="form-title">Welcome back</h2>
        <p class="form-hint">Sign in to access your examination dashboard</p>
      </div>

      <!-- Step indicator -->
      <div class="steps-container">
        <div class="steps">
          <div class="step" class:active={step === 'email'} class:done={step === 'password'}>
            <div class="step-ring">
              <div class="step-dot">
                {#if step === 'password'}
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6L5 9L10 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                {:else}
                  1
                {/if}
              </div>
            </div>
            <span class="step-label">Email</span>
          </div>
          
          <div class="step-connector" class:active={step === 'password'}>
            <div class="connector-fill"></div>
          </div>
          
          <div class="step" class:active={step === 'password'}>
            <div class="step-ring">
              <div class="step-dot">2</div>
            </div>
            <span class="step-label">Password</span>
          </div>
        </div>
      </div>

      <!-- Server error -->
      {#if form?.error}
        <div class="error-box" role="alert">
          <div class="error-icon">
            <AlertCircle size={16} strokeWidth={2} />
          </div>
          <span class="error-text">{form.error}</span>
        </div>
      {/if}

      <form method="POST" onsubmit={handleSubmit} novalidate class="form-body">
        <!-- Hidden email field so it submits on step 2 -->
        {#if step === 'password'}
          <input type="hidden" name="email" value={email} />
        {/if}

        <!-- ── Step 1: Email ── -->
        {#if step === 'email'}
          <div class="field-group">
            <label for="email" class="field-label">
              Email address
              <span class="required">*</span>
            </label>
            <div class="field-wrap" class:has-error={emailTouched && emailError}>
              <span class="field-icon"><Mail size={16} strokeWidth={1.5} /></span>
              <input
                id="email"
                name="email"
                type="email"
                autocomplete="email"
                placeholder="you@mouau.edu.ng"
                class="field-input"
                bind:value={email}
                onblur={() => (emailTouched = true)}
                onkeydown={handleEmailKeydown}
                autofocus
              />
            </div>
            {#if emailTouched && emailError}
              <p class="inline-error" role="alert">
                <AlertCircle size={13} strokeWidth={2} />
                <span>{emailError}</span>
              </p>
            {/if}
          </div>

          <div class="forgot-row">
            <a href="/forgot" class="text-link">Forgot password?</a>
          </div>

          <button type="button" onclick={handleNext} class="btn btn-primary btn-full">
            <span>Continue</span>
            <ArrowRight size={16} strokeWidth={2} />
          </button>

        <!-- ── Step 2: Password ── -->
        {:else}
          <!-- Who are we signing in as -->
          <div class="email-pill">
            <button type="button" onclick={goBack} class="pill-back" aria-label="Change email address">
              <ArrowLeft size={14} strokeWidth={2} />
            </button>
            <div class="pill-content">
              <span class="pill-label">Signing in as</span>
              <span class="pill-addr">{maskedEmail()}</span>
            </div>
          </div>

          <div class="field-group">
            <label for="password" class="field-label">
              Password
              <span class="required">*</span>
            </label>
            <div class="field-wrap" class:has-error={passwordTouched && passwordError}>
              <span class="field-icon"><Lock size={16} strokeWidth={1.5} /></span>
              <input
                id="password"
                name="password"
                type={showPass ? 'text' : 'password'}
                autocomplete="current-password"
                placeholder="Enter your password"
                class="field-input field-input-pass"
                bind:value={password}
                onblur={() => (passwordTouched = true)}
                autofocus
              />
              <button
                type="button"
                onclick={() => (showPass = !showPass)}
                class="pass-toggle"
                aria-label={showPass ? 'Hide password' : 'Show password'}
              >
                {#if showPass}
                  <EyeOff size={16} strokeWidth={1.5} />
                {:else}
                  <Eye size={16} strokeWidth={1.5} />
                {/if}
              </button>
            </div>
            {#if passwordTouched && passwordError}
              <p class="inline-error" role="alert">
                <AlertCircle size={13} strokeWidth={2} />
                <span>{passwordError}</span>
              </p>
            {/if}
          </div>

          <button type="submit" disabled={loading} class="btn btn-primary btn-full">
            {#if loading}
              <span class="spinner-ring">
                <span></span><span></span><span></span><span></span>
              </span>
              <span>Signing in…</span>
            {:else}
              <LogIn size={16} strokeWidth={2} />
              <span>Sign In</span>
            {/if}
          </button>
        {/if}
      </form>

      <div class="security-notice">
        <div class="security-icon">
          <ShieldCheck size={14} strokeWidth={2} />
        </div>
        <span>All activities are monitored and logged for security purposes</span>
      </div>

      <div class="divider">
        <div class="divider-line"></div>
        <span class="divider-text">or</span>
        <div class="divider-line"></div>
      </div>

      <p class="register-hint">
        New student? <a href="/register" class="text-link">Create an account</a>
      </p>
    </div>
  </main>
</div>

<style>
  /* ─────────────────────────────────────────────────────
     Theme tokens — keyed to data-theme on <html>
     Both :root (light default) and [data-theme="dark"]
     are defined so the page responds correctly regardless
     of whether the toggle adds a class or only a data attr.
  ───────────────────────────────────────────────────── */
  :global(:root),
  :global([data-theme="light"]) {
    --login-primary:       #059669;
    --login-primary-hover: #047857;
    --login-primary-light: #d1fae5;
    --login-error:         #dc2626;
    --login-error-light:   #fef2f2;
    --login-text:          #0f172a;
    --login-text-muted:    #64748b;
    --login-border:        #e2e8f0;
    --login-bg:            #ffffff;
    --login-bg-card:       #f8fafc;
    --login-radius:        0.75rem;
    --login-shadow-sm:     0 1px 2px 0 rgb(0 0 0 / 0.05);
    --login-shadow:        0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    --login-shadow-lg:     0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  }

 /* data-theme="dark" AND legacy .dark class — both kept in sync */
:global([data-theme="dark"]),
:global(.dark) {
  /* Base colors - proper deep dark */
  --login-bg:         var(--login-bg-card);      /* Deeper, richer dark than #0f172a */
  --login-bg-card:    #14171c;      /* Clear elevation from base bg */
  --login-text:       #e8edf5;      /* Softer white, less eye strain */
  --login-text-muted: #8b95a5;      /* Better contrast than #94a3b8 */
  --login-border:     #262a33;      /* Subtle, non-distracting */
  
  /* Shadows - proper dark mode shadows (deeper) */
  --login-shadow-sm:  0 1px 2px 0 rgb(0 0 0 / 0.4);
  --login-shadow:     0 4px 6px -1px rgb(0 0 0 / 0.5), 0 2px 4px -2px rgb(0 0 0 / 0.5);
  
  /* Status colors - complete definitions */
  --login-primary:     #059669;      /* Base emerald color */
  --login-primary-light: rgba(5, 150, 105, 0.15);
  --login-primary-hover: #047857;
  
  --login-error:       #dc2626;
  --login-error-light: rgba(220, 38, 38, 0.12);
  --login-error-border: rgba(220, 38, 38, 0.35);
}

  /* ── Layout ─────────────────────────────────────────── */
  .root {
    min-height: 100dvh;
    display: grid;
    /* desktop: two equal columns */
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto 1fr;
    background: var(--login-bg);
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  }

  /* ── Mobile banner ──────────────────────────────────── */
  /*
    On mobile the full left panel is replaced by a compact
    dark hero strip at the top of the page that preserves
    brand presence without eating vertical space.
  */
 .mobile-banner {
  display: none;
  grid-column: 1 / -1;
  background: var(--login-bg-card);  /* Changed from #020617 */
  padding: 1.25rem 1.5rem 1.5rem;
  position: relative;
  overflow: hidden;
  isolation: isolate;
}

  .mobile-banner-inner {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
  }

  .mobile-tagline {
    font-size: 1.125rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.2;
  }

  .mobile-glow {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at 20% 50%, rgba(5, 150, 105, 0.25) 0%, transparent 60%);
    pointer-events: none;
  }

  .mobile-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(5, 150, 105, 0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(5, 150, 105, 0.04) 1px, transparent 1px);
    background-size: 32px 32px;
    mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%);
    pointer-events: none;
  }

  @media (max-width: 900px) {
    .root {
      grid-template-columns: 1fr;
    }
    .panel-left {
      display: none;
    }
    .mobile-banner {
      display: block;
    }
    .panel-right {
      /* let the form panel fill remaining height naturally */
      align-items: flex-start;
      padding-top: 2rem;
    }
  }

  /* ── Left panel (desktop) ───────────────────────────── */
  .panel-left {
  background: var(--login-bg-card);  /* Changed from #020617 */
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  isolation: isolate;
  grid-row: 1 / -1;
}

  .grid-pattern {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(5, 150, 105, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(5, 150, 105, 0.03) 1px, transparent 1px);
    background-size: 40px 40px;
    mask-image: radial-gradient(ellipse at center, black 40%, transparent 80%);
    pointer-events: none;
  }

 .glow-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
  opacity: 0.4;
}

 .glow-1 {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, var(--login-primary-light) 0%, transparent 70%);
  top: -10%;
  left: -10%;
  animation: float 8s ease-in-out infinite;
}

.glow-2 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, var(--login-primary-light) 0%, transparent 70%);
  bottom: -10%;
  right: -10%;
  animation: float 10s ease-in-out infinite reverse;
  opacity: 0.3;
} 

  @keyframes float {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33% { transform: translate(30px, -30px) scale(1.05); }
    66% { transform: translate(-20px, 20px) scale(0.95); }
  }

  .panel-left-inner {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 2.5rem 3rem;
  }

  .brand { 
    display: flex; 
    align-items: center; 
    gap: 0.875rem; 
  }

  .brand-icon {
    width: 42px; 
    height: 42px;
    border-radius: 12px;
    background: rgba(5, 150, 105, 0.15);
    border: 1px solid rgba(5, 150, 105, 0.25);
    display: flex; 
    align-items: center; 
    justify-content: center;
    color: #34d399; 
    flex-shrink: 0;
    backdrop-filter: blur(8px);
  }

  /* Smaller icon inside mobile banner */
  .mobile-banner .brand-icon {
    width: 34px;
    height: 34px;
    border-radius: 9px;
  }

 .brand-name {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--login-text);  /* Changed from #f8fafc */
  margin: 0;
  letter-spacing: -0.01em;
}

.brand-sub {
  font-size: 0.6875rem;
  color: var(--login-text-muted);  /* Changed from rgba(255,255,255,0.4) */
  margin: 0.125rem 0 0;
  letter-spacing: 0.04em;
  font-weight: 500;
}
  .panel-body {
    flex: 1; 
    display: flex; 
    flex-direction: column;
    justify-content: center; 
    padding: 3rem 0;
    max-width: 420px;
  }

 .hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.875rem;
  background: var(--login-primary-light);  /* Changed from rgba(255,255,255,0.05) */
  border: 1px solid var(--login-border);  /* Changed from rgba(255,255,255,0.1) */
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--login-primary);  /* Changed from #34d399 */
  letter-spacing: 0.02em;
  width: fit-content;
  margin-bottom: 1.5rem;
  backdrop-filter: blur(8px);
}

 .panel-heading {
  font-size: clamp(2.5rem, 4vw, 3.5rem);
  font-weight: 800;
  color: var(--login-text);  /* Changed from #fff */
  line-height: 1.1;
  letter-spacing: -0.03em;
  margin: 0 0 1.25rem;
}

  .gradient-text {
    background: linear-gradient(135deg, #34d399 0%, #059669 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .panel-desc {
  font-size: 0.875rem;
  color: var(--login-text-muted);  /* ✅ CORRECT - proper text color */
  line-height: 1.7;
  margin: 0 0 2rem;
  max-width: 340px;
  font-weight: 400;
}

  .features-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

 .feature-card {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.75rem;
  background: var(--login-bg-card);   /* Keeps some transparency */
  border: 1px solid var(--login-border);
  border-radius: 0.625rem;
  transition: all 0.2s ease;
}

 .feature-card:hover {
  background: var(--login-bg-card);  /* Solid background on hover for better readability */
  border-color: var(--login-primary-light);
  transform: translateY(-1px);
}

  .feature-icon {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: rgba(5, 150, 105, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #34d399;
    flex-shrink: 0;
  }

 .feature-text {
  font-size: 0.6875rem;
  color: var(--login-text-muted);
  line-height: 1.4;
  font-weight: 500;
}

  .panel-footer {
    margin-top: auto;
  }

  .footer-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
    margin-bottom: 1rem;
  }

 .panel-footer p {
  font-size: 0.6875rem;
  color: var(--login-text-muted);  /* Changed from rgba(255,255,255,0.25) */
  margin: 0;
  text-align: center;
  letter-spacing: 0.02em;
  opacity: 0.6;
}

  /* ── Right panel ────────────────────────────────────── */
  .panel-right {
    display: flex; 
    align-items: center; 
    justify-content: center;
    padding: 2rem; 
    position: relative;
    background: var(--login-bg);
    /* sits in column 2 on desktop, column 1 on mobile */
  }

  .top-right { 
    position: absolute; 
    top: 1.5rem; 
    right: 1.5rem; 
  }

  .form-wrap { 
    width: 100%; 
    max-width: 380px; 
  }

  /* ── Form header ────────────────────────────────────── */
  .form-header { 
    margin-bottom: 1.75rem; 
    text-align: center;
  }

  .form-badge {
    display: inline-flex; 
    align-items: center; 
    gap: 0.375rem;
    font-size: 0.6875rem; 
    font-weight: 700;
    text-transform: uppercase; 
    letter-spacing: 0.08em;
    color: var(--login-primary);
    background: var(--login-primary-light);
    border: 1px solid rgba(5, 150, 105, 0.2);
    padding: 0.375rem 0.75rem; 
    border-radius: 9999px;
    margin-bottom: 1rem;
  }

  :global([data-theme="dark"]) .form-badge,
  :global(.dark) .form-badge {
    border-color: rgba(5, 150, 105, 0.25);
  }

  .form-title {
    font-size: 1.875rem; 
    font-weight: 800;
    color: var(--login-text); 
    letter-spacing: -0.03em;
    margin: 0 0 0.5rem;
  }

  .form-hint { 
    font-size: 0.8125rem; 
    color: var(--login-text-muted); 
    margin: 0;
    font-weight: 400;
  }

  /* ── Step indicator ─────────────────────────────────── */
  .steps-container {
    margin-bottom: 1.75rem;
  }

  .steps {
    display: flex; 
    align-items: center; 
    gap: 0;
  }

  .step {
    display: flex; 
    flex-direction: column;
    align-items: center; 
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .step-label {
    font-size: 0.6875rem; 
    font-weight: 600;
    color: var(--login-text-muted);
    transition: color 0.3s;
  }

  .step.active .step-label { 
    color: var(--login-text); 
  }

  .step.done .step-label { 
    color: var(--login-primary); 
  }

  .step-ring {
    padding: 3px;
    border-radius: 50%;
    transition: all 0.3s;
  }

  .step.active .step-ring {
    background: linear-gradient(135deg, var(--login-primary), #34d399);
  }

  .step-dot {
    width: 28px; 
    height: 28px; 
    border-radius: 50%;
    display: flex; 
    align-items: center; 
    justify-content: center;
    font-size: 0.75rem; 
    font-weight: 700;
    border: 2px solid var(--login-border);
    background: var(--login-bg);
    color: var(--login-text-muted);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .step.active .step-dot {
    border-color: transparent;
    color: #fff;
    background: transparent;
  }

  .step.done .step-dot {
    background: var(--login-primary); 
    border-color: var(--login-primary);
    color: #fff;
  }

  .step-connector {
    flex: 1; 
    height: 2px;
    background: var(--login-border);
    margin: 0 0.75rem;
    position: relative;
    top: -14px;
    border-radius: 1px;
    overflow: hidden;
  }

  .connector-fill {
    height: 100%;
    width: 0%;
    background: linear-gradient(90deg, var(--login-primary), #34d399);
    transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .step-connector.active .connector-fill {
    width: 100%;
  }

  /* ── Error box ──────────────────────────────────────── */
  .error-box {
    display: flex; 
    align-items: center; 
    gap: 0.625rem;
    padding: 0.875rem 1rem; 
    border-radius: var(--login-radius);
    background: var(--login-error-light); 
    border: 1px solid #fecaca;
    color: var(--login-error); 
    font-size: 0.8125rem; 
    margin-bottom: 1.25rem;
    animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
  }

  :global([data-theme="dark"]) .error-box,
  :global(.dark) .error-box {
    border-color: rgba(220, 38, 38, 0.3); 
    color: #f87171;
  }

  .error-icon {
    flex-shrink: 0;
    opacity: 0.8;
  }

  @keyframes shake {
    10%, 90% { transform: translate3d(-1px, 0, 0); }
    20%, 80% { transform: translate3d(2px, 0, 0); }
    30%, 50%, 70% { transform: translate3d(-3px, 0, 0); }
    40%, 60% { transform: translate3d(3px, 0, 0); }
  }

  /* ── Fields ─────────────────────────────────────────── */
  .form-body {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .field-group { 
    margin-bottom: 1rem; 
  }

  .field-label {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.6875rem; 
    font-weight: 600;
    color: var(--login-text-muted);
    text-transform: uppercase; 
    letter-spacing: 0.06em;
    margin-bottom: 0.5rem;
  }

  .required {
    color: var(--login-error);
    font-size: 0.875rem;
    line-height: 1;
  }

  .field-wrap {
    position: relative; 
    display: flex; 
    align-items: center;
  }

  .field-icon {
    position: absolute; 
    left: 0.875rem;
    color: var(--login-text-muted);
    display: flex; 
    align-items: center;
    pointer-events: none; 
    transition: color 0.2s;
    opacity: 0.6;
  }

  .field-wrap:focus-within .field-icon { 
    color: var(--login-primary); 
    opacity: 1;
  }

  .field-wrap.has-error .field-icon { 
    color: var(--login-error); 
    opacity: 1;
  }

  .field-input {
    width: 100%;
    padding: 0.875rem 1rem 0.875rem 2.625rem;
    background: var(--login-bg-card);
    border: 1.5px solid var(--login-border);
    border-radius: var(--login-radius);
    color: var(--login-text);
    font-size: 0.875rem;
    font-weight: 500;
    outline: none;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .field-input:hover {
    border-color: #cbd5e1;
  }

  :global([data-theme="dark"]) .field-input:hover,
  :global(.dark) .field-input:hover {
    border-color: #475569;
  }

  .field-input:focus {
    border-color: var(--login-primary);
    box-shadow: 0 0 0 4px rgba(5, 150, 105, 0.08);
    background: var(--login-bg);
  }

  :global([data-theme="dark"]) .field-input:focus,
  :global(.dark) .field-input:focus {
    box-shadow: 0 0 0 4px rgba(5, 150, 105, 0.12);
  }

  .field-wrap.has-error .field-input {
    border-color: var(--login-error);
    box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.06);
  }

  .field-wrap.has-error .field-input:focus {
    box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.1);
  }

  .field-input::placeholder { 
    color: var(--login-text-muted); 
    opacity: 0.5; 
    font-weight: 400;
  }

  .field-input-pass { 
    padding-right: 2.75rem; 
  }

  .pass-toggle {
    position: absolute; 
    right: 0.75rem;
    background: none; 
    border: none; 
    cursor: pointer;
    color: var(--login-text-muted);
    display: flex; 
    align-items: center;
    padding: 0.25rem; 
    border-radius: 0.375rem;
    transition: all 0.15s;
    opacity: 0.6;
  }

  .pass-toggle:hover { 
    color: var(--login-text); 
    opacity: 1;
    background: var(--login-border);
  }

  .inline-error {
    display: flex; 
    align-items: center; 
    gap: 0.375rem;
    font-size: 0.75rem; 
    color: var(--login-error);
    margin-top: 0.375rem;
    animation: slideDown 0.2s ease;
    font-weight: 500;
  }

  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* ── Forgot row ─────────────────────────────────────── */
  .forgot-row {
    display: flex; 
    justify-content: flex-end;
    margin-bottom: 1.25rem; 
    margin-top: -0.25rem;
  }

  .text-link {
    font-size: 0.8125rem; 
    font-weight: 600;
    color: var(--login-primary); 
    text-decoration: none;
    transition: all 0.15s;
    position: relative;
  }

  .text-link::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 0;
    height: 1.5px;
    background: var(--login-primary);
    transition: width 0.2s;
  }

  .text-link:hover { 
    color: var(--login-primary-hover); 
  }

  .text-link:hover::after {
    width: 100%;
  }

  /* ── Email pill (step 2) ────────────────────────────── */
  .email-pill {
    display: flex; 
    align-items: center; 
    gap: 0.625rem;
    background: var(--login-bg-card);
    border: 1.5px solid var(--login-border);
    border-radius: 9999px;
    padding: 0.375rem 1rem 0.375rem 0.375rem;
    margin-bottom: 1.25rem;
    width: fit-content;
    transition: all 0.2s;
  }

  .email-pill:hover {
    border-color: var(--login-primary);
    box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.08);
  }

  .pill-back {
    width: 28px; 
    height: 28px; 
    border-radius: 50%;
    background: var(--login-border);
    border: none; 
    cursor: pointer;
    color: var(--login-text-muted);
    display: flex; 
    align-items: center; 
    justify-content: center;
    transition: all 0.15s;
    flex-shrink: 0;
  }

  .pill-back:hover {
    background: var(--login-primary);
    color: #fff;
    transform: scale(1.05);
  }

  .pill-content {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .pill-label {
    font-size: 0.625rem;
    color: var(--login-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
  }

  .pill-addr {
    font-size: 0.8125rem; 
    font-weight: 600;
    color: var(--login-text); 
    font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
    letter-spacing: -0.01em;
  }

  /* ── Buttons ────────────────────────────────────────── */
  .btn {
    display: inline-flex;
    align-items: center; 
    justify-content: center; 
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    border: none; 
    border-radius: var(--login-radius);
    font-size: 0.875rem; 
    font-weight: 600;
    cursor: pointer; 
    letter-spacing: -0.01em;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }

  .btn-primary {
    background: linear-gradient(135deg, #059669 0%, #047857 100%);
    color: #fff;
    box-shadow: 0 1px 3px 0 rgba(5, 150, 105, 0.3), 0 1px 2px -1px rgba(5, 150, 105, 0.2);
  }

  .btn-primary::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 100%);
    opacity: 0;
    transition: opacity 0.2s;
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 10px 25px -5px rgba(5, 150, 105, 0.4), 0 4px 10px -5px rgba(5, 150, 105, 0.2);
  }

  .btn-primary:hover:not(:disabled)::before {
    opacity: 1;
  }

  .btn-primary:active:not(:disabled) { 
    transform: translateY(0); 
  }

  .btn-primary:disabled { 
    opacity: 0.6; 
    cursor: not-allowed; 
    transform: none;
  }

  .btn-full {
    width: 100%;
    padding: 0.875rem;
    margin-top: 0.5rem;
  }

  /* Spinner */
  .spinner-ring {
    display: inline-block;
    position: relative;
    width: 16px;
    height: 16px;
  }

  .spinner-ring span {
    box-sizing: border-box;
    display: block;
    position: absolute;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255,255,255,0.3);
    border-radius: 50%;
    animation: spinner-ring 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
    border-color: rgba(255,255,255,0.3) transparent transparent transparent;
  }

  .spinner-ring span:nth-child(1) { animation-delay: -0.45s; }
  .spinner-ring span:nth-child(2) { animation-delay: -0.3s; }
  .spinner-ring span:nth-child(3) { animation-delay: -0.15s; }

  @keyframes spinner-ring {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* ── Security notice ────────────────────────────────── */
  .security-notice {
    display: flex; 
    align-items: center; 
    justify-content: center; 
    gap: 0.5rem;
    margin-top: 1.25rem; 
    padding: 0.75rem 1rem;
    background: var(--login-bg-card);
    border: 1px solid var(--login-border);
    border-radius: var(--login-radius);
    font-size: 0.6875rem; 
    color: var(--login-text-muted);
    font-weight: 500;
  }

  .security-icon {
    color: var(--login-primary);
    opacity: 0.7;
  }

  /* ── Divider ────────────────────────────────────────── */
  .divider {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 1.25rem 0;
  }

  .divider-line {
    flex: 1;
    height: 1px;
    background: var(--login-border);
  }

  .divider-text {
    font-size: 0.6875rem;
    color: var(--login-text-muted);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* ── Register hint ──────────────────────────────────── */
  .register-hint {
    text-align: center;
    font-size: 0.8125rem; 
    color: var(--login-text-muted);
    font-weight: 500;
    margin: 0;
  }

  .register-hint a {
    color: var(--login-primary); 
    font-weight: 700;
  }

  .register-hint a:hover {
    color: var(--login-primary-hover);
  }

  /* ── Reduced motion ─────────────────────────────────── */
  @media (prefers-reduced-motion: reduce) {
    .glow-1, .glow-2,
    .spinner-ring span,
    .error-box, .inline-error,
    .feature-card, .field-input,
    .btn, .email-pill,
    .step-dot, .connector-fill {
      animation: none;
      transition: none;
    }
  }
</style>
