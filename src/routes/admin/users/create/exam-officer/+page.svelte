<!-- src/routes/admin/users/create/exam-officer/+page.svelte -->
<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';
  import { ClipboardList, AlertCircle, Copy, Check, RefreshCw, Eye, EyeOff, ArrowLeft } from '@lucide/svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let loading = $state(false); let mounted = $state(false);
  let showPassword = $state(false); let password = $state(''); let copied = $state(false);

  onMount(() => { requestAnimationFrame(() => { mounted = true; }); genPassword(); });

  function genPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    password = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    copied = false;
  }
  async function copyPassword() { await navigator.clipboard.writeText(password); copied = true; setTimeout(() => { copied = false; }, 2000); }
</script>

<div class="page" class:mounted>
  <div class="page-head">
    <a href="/admin/users/create" class="back"><ArrowLeft size={14} /> All roles</a>
    <div class="title-row">
      <div class="role-pill" style="background:rgba(14,165,233,.1);color:#0ea5e9"><ClipboardList size={16} /> Exam Officer</div>
      <h1>Create Exam Officer</h1>
    </div>
    <p>Under the Registrar's office. Full access to exam schedules and results across all faculties. Cannot manage users.</p>
  </div>

  {#if form?.error}<div class="alert-err"><AlertCircle size={14} />{form.error}</div>{/if}

  <form method="POST" use:enhance={() => { loading = true; return async ({ update }) => { loading = false; await update(); }; }}>
    <input type="hidden" name="password" value={password} />
    <input type="hidden" name="role" value="exam_officer" />

    <div class="card">
      <div class="card-head">Personal information</div>
      <div class="grid">
        <div class="f half"><label for="fullName">Full name <span class="req">*</span></label><input id="fullName" name="fullName" placeholder="As on staff ID" required /></div>
        <div class="f half"><label for="email">Email <span class="req">*</span></label><input id="email" name="email" type="email" placeholder="staff@mouau.edu.ng" required /></div>
        <div class="f half"><label for="phone">Phone</label><input id="phone" name="phone" type="tel" placeholder="+234 000 000 0000" /></div>
        <div class="f half"><label for="staffId">Staff ID</label><input id="staffId" name="staffId" placeholder="MOUAU/STAFF/001" /></div>
      </div>
    </div>

    <div class="card">
      <div class="card-head">Access credentials</div>
      <div class="card-body">
        <p class="hint">Copy this password before creating the account — it won't be shown again.</p>
        <div class="pw-row">
          <span class="pw-val" class:blur={!showPassword}>{showPassword ? password : '•'.repeat(password.length)}</span>
          <div class="pw-btns">
            <button type="button" class="icon-btn" onclick={() => { showPassword = !showPassword; }}>{#if showPassword}<EyeOff size={14} />{:else}<Eye size={14} />{/if}</button>
            <button type="button" class="icon-btn" onclick={genPassword}><RefreshCw size={14} /></button>
            <button type="button" class="icon-btn copy" class:copied onclick={copyPassword}>{#if copied}<Check size={14} />{:else}<Copy size={14} />{/if}{copied ? 'Copied!' : 'Copy'}</button>
          </div>
        </div>
      </div>
    </div>

    <div class="foot">
      <a href="/admin/users/create" class="btn-ghost">Cancel</a>
      <button type="submit" class="btn-primary" disabled={loading || !password} style="background:#0ea5e9">
        {#if loading}<RefreshCw size={13} class="spin" />{:else}<ClipboardList size={13} />{/if}
        Create Exam Officer
      </button>
    </div>
  </form>
</div>

<style>
  @import '../../_form.css';
  .role-pill { display:inline-flex;align-items:center;gap:.4rem;font-size:.75rem;font-weight:700;padding:.3rem .75rem;border-radius:2rem; }
</style>