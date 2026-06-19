<!-- src/routes/admin/users/create/admin/+page.svelte -->
<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';
  import { Shield, AlertCircle, AlertTriangle, Copy, Check, RefreshCw, Eye, EyeOff, ArrowLeft } from '@lucide/svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let loading = $state(false); let mounted = $state(false);
  let showPassword = $state(false); let password = $state(''); let copied = $state(false);
  let confirmed = $state(false);

  onMount(() => { requestAnimationFrame(() => { mounted = true; }); genPassword(); });

  function genPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    password = Array.from({ length: 14 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    copied = false;
  }
  async function copyPassword() {
    await navigator.clipboard.writeText(password);
    copied = true;
    setTimeout(() => { copied = false; }, 2000);
  }
</script>

<div class="page" class:mounted>
  <div class="page-head">
    <a href="/admin/users/create" class="back"><ArrowLeft size={14} /> All roles</a>
    <div class="title-row">
      <div class="role-pill" style="background:rgba(59,130,246,.1);color:#3b82f6">
        <Shield size={16} /> Admin
      </div>
      <h1>Create Admin</h1>
    </div>
    <p>Full system access. Can create users, manage semesters, and configure the platform.</p>
  </div>

  <!-- Warning banner -->
  <div class="warn-banner">
    <AlertTriangle size={15} />
    <div>
      <strong>Elevated privileges.</strong> Admin accounts have unrestricted access to all data and settings.
      Only create this account for trusted personnel.
    </div>
  </div>

  {#if form?.error}<div class="alert-err"><AlertCircle size={14} />{form.error}</div>{/if}

  <form method="POST" use:enhance={() => { loading = true; return async ({ update }) => { loading = false; await update(); }; }}>
    <input type="hidden" name="password" value={password} />
    <input type="hidden" name="role" value="admin" />

    <div class="card">
      <div class="card-head">Personal information</div>
      <div class="grid">
        <div class="f half"><label for="fullName">Full name <span class="req">*</span></label><input id="fullName" name="fullName" placeholder="As on staff ID" required /></div>
        <div class="f half"><label for="email">Email <span class="req">*</span></label><input id="email" name="email" type="email" placeholder="admin@mouau.edu.ng" required /></div>
        <div class="f half"><label for="phone">Phone</label><input id="phone" name="phone" type="tel" placeholder="+234 000 000 0000" /></div>
        <div class="f half"><label for="staffId">Staff ID</label><input id="staffId" name="staffId" placeholder="MOUAU/STAFF/001" /></div>
      </div>
    </div>

    <!-- Full access summary -->
    <div class="card">
      <div class="card-head">Permissions</div>
      <div class="card-body">
        <div class="perm-list">
          {#each [
            'Create, edit, and delete all users',
            'Manage exam schedules and results',
            'Configure academic semesters',
            'View audit logs and API keys',
            'Access all portal areas',
            'Reset any user password',
          ] as p}
            <div class="perm-row">
              <span class="perm-dot"></span>
              <span>{p}</span>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-head">Access credentials</div>
      <div class="card-body">
        <p class="hint">Admin passwords are generated at 14 characters. Copy before submitting — it won't be shown again.</p>
        <div class="pw-row">
          <span class="pw-val" class:blur={!showPassword}>
            {showPassword ? password : '•'.repeat(password.length)}
          </span>
          <div class="pw-btns">
            <button type="button" class="icon-btn" onclick={() => { showPassword = !showPassword; }}>
              {#if showPassword}<EyeOff size={14} />{:else}<Eye size={14} />{/if}
            </button>
            <button type="button" class="icon-btn" onclick={genPassword}><RefreshCw size={14} /></button>
            <button type="button" class="icon-btn copy" class:copied onclick={copyPassword}>
              {#if copied}<Check size={14} />{:else}<Copy size={14} />{/if}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirmation checkbox -->
    <div class="card">
      <div class="card-body">
        <label class="confirm-row">
          <input type="checkbox" bind:checked={confirmed} />
          <span>I confirm this person should have full admin access to MOUAU eTest.</span>
        </label>
      </div>
    </div>

    <div class="foot">
      <a href="/admin/users/create" class="btn-ghost">Cancel</a>
      <button type="submit" class="btn-primary" disabled={loading || !password || !confirmed} style="background:#3b82f6">
        {#if loading}<RefreshCw size={13} class="spin" />{:else}<Shield size={13} />{/if}
        Create Admin
      </button>
    </div>
  </form>
</div>

<style>
 @import '../../_form.css';

  .role-pill {
    display: inline-flex;
    align-items: center;
    gap: .4rem;
    font-size: .75rem;
    font-weight: 700;
    padding: .3rem .75rem;
    border-radius: 2rem;
  }

  .warn-banner {
    display: flex;
    align-items: flex-start;
    gap: .75rem;
    padding: .875rem 1.1rem;
    background: rgba(234,179,8,.08);
    border: 1px solid rgba(234,179,8,.3);
    border-radius: .75rem;
    font-size: .82rem;
    color: #92400e;
    line-height: 1.5;
  }

  .warn-banner :global(svg) { color: #d97706; flex-shrink: 0; margin-top: .1rem; }

  .perm-list { display:flex; flex-direction:column; gap:.5rem; }
  .perm-row {
    display: flex;
    align-items: center;
    gap: .75rem;
    padding: .45rem .75rem;
    border-radius: .5rem;
    background: var(--color-bg);
    font-size: .82rem;
    color: var(--color-text);
  }
  .perm-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #3b82f6;
    flex-shrink: 0;
  }

  .confirm-row {
    display: flex;
    align-items: flex-start;
    gap: .75rem;
    cursor: pointer;
    font-size: .83rem;
    color: var(--color-text);
    line-height: 1.5;
  }

  .confirm-row input[type="checkbox"] {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    margin-top: .15rem;
    accent-color: #3b82f6;
    cursor: pointer;
  }
</style>