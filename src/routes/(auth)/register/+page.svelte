<!-- src/routes/(auth)/register/+page.svelte -->
<script lang="ts">
  import type { PageData, ActionData } from './$types';
  let { data, form }: { data: PageData; form: ActionData } = $props();
  let loading = $state(false);
  let selectedRole = $state('student');
</script>

<svelte:head><title>Register — MOUAU eTest</title></svelte:head>

<div class="auth-page">
  <div class="auth-card">
    <div class="brand">
      <div class="logo" aria-hidden="true">📋</div>
      <h1>Create Account</h1>
      <p class="tagline">Student self-registration</p>
    </div>

    {#if form?.errors}
      <div class="alert error" role="alert">
        {Object.values(form.errors)[0]}
      </div>
    {/if}

    <form method="POST" class="auth-form" onsubmit={() => { loading = true; }}>
      <div class="field">
        <label for="full_name">Full Name *</label>
        <input id="full_name" name="full_name" type="text" required
          placeholder="John Doe" value={form?.values?.fullName ?? ''} />
      </div>

      <div class="field">
        <label for="email">Email *</label>
        <input id="email" name="email" type="email" required
          placeholder="you@student.mouau.edu.ng" value={form?.values?.email ?? ''} />
      </div>

      <div class="field">
        <label for="matric_number">Matric Number *</label>
        <input id="matric_number" name="matric_number" type="text" required
          placeholder="2021/CSC/001" value={form?.values?.matricNumber ?? ''} />
      </div>

      <div class="field-row">
        <div class="field">
          <label for="department_id">Department *</label>
          <select id="department_id" name="department_id" required>
            <option value="">Select…</option>
            {#each data.departments as d}
              <option value={d.id} selected={form?.values?.departmentId === d.id}>
                {d.code} — {d.name}
              </option>
            {/each}
          </select>
        </div>
        <div class="field short">
          <label for="level">Level *</label>
          <select id="level" name="level" required>
            <option value="">—</option>
            {#each [100,200,300,400,500] as l}
              <option value={l} selected={form?.values?.level === l}>{l}</option>
            {/each}
          </select>
        </div>
      </div>

      <div class="field">
        <label for="password">Password *</label>
        <input id="password" name="password" type="password" required
          placeholder="Minimum 8 characters" />
      </div>

      <div class="field">
        <label for="confirm">Confirm Password *</label>
        <input id="confirm" name="confirm" type="password" required
          placeholder="Repeat your password" />
      </div>

      <button type="submit" class="submit-btn" disabled={loading}>
        {loading ? 'Creating account…' : 'Create Account'}
      </button>
    </form>

    <p class="login-link">
      Already have an account? <a href="/login">Sign in</a>
    </p>
  </div>
</div>

<style>
  .auth-page {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    padding: 1.5rem; background: var(--color-bg);
  }
  .auth-card {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 1.25rem; padding: 2.5rem 2rem; width: 100%; max-width: 440px;
    display: flex; flex-direction: column; gap: 1.5rem;
  }
  .brand { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
  .logo { font-size: 2.5rem; }
  h1    { font-size: 1.4rem; font-weight: 800; margin: 0; }
  .tagline { font-size: 0.8rem; color: var(--color-muted); margin: 0; }

  .alert.error { padding: 0.75rem 1rem; border-radius: 0.5rem; background: #fee2e2; color: #dc2626; font-size: 0.875rem; }

  .auth-form { display: flex; flex-direction: column; gap: 1rem; }
  .field { display: flex; flex-direction: column; gap: 0.4rem; flex: 1; }
  .field.short { max-width: 90px; }
  .field label { font-size: 0.875rem; font-weight: 500; }
  .field-row { display: flex; gap: 0.75rem; }

  .field input, .field select {
    padding: 0.7rem 0.9rem; border: 1.5px solid var(--color-border);
    border-radius: 0.6rem; background: var(--color-bg); color: var(--color-text);
    font-size: 0.9rem; outline: none; transition: border-color 0.15s; width: 100%;
  }
  .field input:focus, .field select:focus { border-color: var(--color-primary); }

  .submit-btn {
    padding: 0.8rem; background: var(--color-primary); color: #fff;
    border: none; border-radius: 0.6rem; font-size: 1rem; font-weight: 600;
    cursor: pointer; margin-top: 0.25rem; transition: background 0.15s;
  }
  .submit-btn:hover    { background: var(--color-primary-hover); }
  .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  .login-link { text-align: center; font-size: 0.875rem; color: var(--color-muted); margin: 0; }
  .login-link a { color: var(--color-primary); font-weight: 500; text-decoration: none; }
</style>