<!-- src/routes/admin/users/create/vc-dvc/+page.svelte -->
<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';
  import { Crown, AlertCircle, Copy, Check, RefreshCw, Eye, EyeOff, ArrowLeft } from '@lucide/svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let loading = $state(false); let mounted = $state(false);
  let showPassword = $state(false); let password = $state(''); let copied = $state(false);
  let subRole = $state<'vc' | 'dvc'>('vc');

  onMount(() => { requestAnimationFrame(() => { mounted = true; }); genPassword(); });

  function genPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    password = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
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
      <div class="role-pill" style="background:rgba(139,92,246,.1);color:#8b5cf6">
        <Crown size={16} /> VC / DVC
      </div>
      <h1>Create VC / DVC</h1>
    </div>
    <p>Top-level governance account. Dashboard, exam schedules, and results — read only. No user management.</p>
  </div>

  {#if form?.error}<div class="alert-err"><AlertCircle size={14} />{form.error}</div>{/if}

  <form method="POST" use:enhance={() => { loading = true; return async ({ update }) => { loading = false; await update(); }; }}>
    <input type="hidden" name="password" value={password} />
    <input type="hidden" name="role" value="vc_dvc" />

    <!-- Sub-role picker -->
    <div class="card">
      <div class="card-head">Position</div>
      <div class="sub-grid">
        {#each [
          { value: 'vc',  label: 'Vice Chancellor',       desc: 'Head of the university' },
          { value: 'dvc', label: 'Deputy Vice Chancellor', desc: 'Academic oversight' },
        ] as opt}
          <label class="sub-card" class:sub-sel={subRole === opt.value}>
            <input type="radio" name="sub_role" value={opt.value} bind:group={subRole} />
            <div class="sub-dot" class:dot-on={subRole === opt.value}></div>
            <div>
              <div class="sub-label">{opt.label}</div>
              <div class="sub-desc">{opt.desc}</div>
            </div>
          </label>
        {/each}
      </div>
    </div>

    <!-- Personal -->
    <div class="card">
      <div class="card-head">Personal information</div>
      <div class="grid">
        <div class="f half"><label for="fullName">Full name <span class="req">*</span></label><input id="fullName" name="fullName" placeholder="As on official record" required /></div>
        <div class="f half"><label for="email">Email <span class="req">*</span></label><input id="email" name="email" type="email" placeholder="vc@mouau.edu.ng" required /></div>
        <div class="f half"><label for="phone">Phone</label><input id="phone" name="phone" type="tel" placeholder="+234 000 000 0000" /></div>
        <div class="f half"><label for="staffId">Staff ID</label><input id="staffId" name="staffId" placeholder="MOUAU/STAFF/001" /></div>
      </div>
    </div>

    <!-- Permissions note -->
    <div class="card">
      <div class="card-head">Permissions</div>
      <div class="card-body">
        <div class="perm-list">
          {#each [
            { label: 'University-wide dashboard',     allowed: true },
            { label: 'View exam schedules',           allowed: true },
            { label: 'View results and reports',      allowed: true },
            { label: 'Create or edit exams',          allowed: false },
            { label: 'Manage users',                  allowed: false },
            { label: 'Manage academic semesters',     allowed: false },
          ] as p}
            <div class="perm-row">
              <span class="perm-dot" class:allowed={p.allowed} class:denied={!p.allowed}></span>
              <span class="perm-label" class:muted-label={!p.allowed}>{p.label}</span>
              <span class="perm-tag" class:tag-yes={p.allowed} class:tag-no={!p.allowed}>
                {p.allowed ? 'Allowed' : 'Denied'}
              </span>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <!-- Password -->
    <div class="card">
      <div class="card-head">Access credentials</div>
      <div class="card-body">
        <p class="hint">Copy this password before creating the account — it won't be shown again.</p>
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

    <div class="foot">
      <a href="/admin/users/create" class="btn-ghost">Cancel</a>
      <button type="submit" class="btn-primary" disabled={loading || !password} style="background:#8b5cf6">
        {#if loading}<RefreshCw size={13} class="spin" />{:else}<Crown size={13} />{/if}
        Create {subRole === 'vc' ? 'Vice Chancellor' : 'Deputy VC'}
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

  /* Sub-role picker */
  .sub-grid {
    display: flex;
    gap: 0;
  }

  .sub-card {
    flex: 1;
    display: flex;
    align-items: center;
    gap: .875rem;
    padding: 1.125rem 1.25rem;
    cursor: pointer;
    border-right: 1px solid var(--color-border);
    transition: background .15s;
  }

  .sub-card:last-child { border-right: none; }
  .sub-card:hover { background: var(--color-surface-hover, rgba(0,0,0,.02)); }

  .sub-card input { display: none; }

  .sub-sel { background: rgba(139,92,246,.04); }

  .sub-dot {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 2px solid var(--color-border);
    flex-shrink: 0;
    transition: border-color .15s, background .15s;
    position: relative;
  }

  .sub-dot.dot-on {
    border-color: #8b5cf6;
    background: #8b5cf6;
    box-shadow: inset 0 0 0 3px var(--color-surface);
  }

  .sub-label {
    font-size: .84rem;
    font-weight: 700;
    color: var(--color-text);
  }

  .sub-desc {
    font-size: .74rem;
    color: var(--color-muted);
    margin-top: .15rem;
  }

  /* Permissions */
  .perm-list {
    display: flex;
    flex-direction: column;
    gap: .5rem;
  }

  .perm-row {
    display: flex;
    align-items: center;
    gap: .75rem;
    padding: .5rem .75rem;
    border-radius: .5rem;
    background: var(--color-bg);
    font-size: .82rem;
  }

  .perm-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .perm-dot.allowed { background: #16a34a; }
  .perm-dot.denied  { background: #dc2626; }

  .perm-label { flex: 1; color: var(--color-text); }
  .muted-label { color: var(--color-muted); }

  .perm-tag {
    font-size: .7rem;
    font-weight: 700;
    padding: .18rem .55rem;
    border-radius: 2rem;
  }

  .tag-yes { background: rgba(22,163,74,.1);  color: #16a34a; }
  .tag-no  { background: rgba(220,38,38,.08); color: #dc2626; }

  @media (max-width: 580px) {
    .sub-grid { flex-direction: column; }
    .sub-card { border-right: none; border-bottom: 1px solid var(--color-border); }
    .sub-card:last-child { border-bottom: none; }
  }
</style>