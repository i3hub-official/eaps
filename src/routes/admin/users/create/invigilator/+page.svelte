<!-- src/routes/admin/users/create/invigilator/+page.svelte -->
<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';
  import { ShieldCheck, AlertCircle, Copy, Check, RefreshCw, Eye, EyeOff, ChevronDown, Search, ArrowLeft } from '@lucide/svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let loading = $state(false); let mounted = $state(false);
  let showPassword = $state(false); let password = $state(''); let copied = $state(false);
  let selectedCollegeId = $state(''); let selectedDeptId = $state('');
  let openDropdown = $state<string|null>(null); let dropdownSearch = $state('');

  onMount(() => { requestAnimationFrame(() => { mounted = true; }); genPassword(); });

  function genPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    password = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    copied = false;
  }
  async function copyPassword() { await navigator.clipboard.writeText(password); copied = true; setTimeout(() => { copied = false; }, 2000); }

  const filteredDepts = $derived(
    selectedCollegeId
      ? (data.departments ?? []).filter((d: any) => String(d.collegeId) === selectedCollegeId)
      : (data.departments ?? [])
  );

  function toggleDD(id: string) { openDropdown = openDropdown === id ? null : id; dropdownSearch = ''; }
  function selectDD(id: string, value: string, label: string) {
    const el = document.getElementById(id) as HTMLInputElement|null; if (el) el.value = value;
    const disp = document.getElementById(`${id}-display`); if (disp) disp.textContent = label;
    if (id === 'college_id') { selectedCollegeId = value; selectedDeptId = ''; }
    if (id === 'department_id') selectedDeptId = value;
    openDropdown = null; dropdownSearch = '';
  }
  function filtered(items: any[], key: string) {
    if (!dropdownSearch) return items;
    const q = dropdownSearch.toLowerCase();
    return items.filter((i: any) => i[key]?.toLowerCase().includes(q));
  }
  function clickOutside(e: MouseEvent) { if (!(e.target as HTMLElement).closest('.dd')) openDropdown = null; }
  $effect(() => { if (openDropdown) { document.addEventListener('click', clickOutside); return () => document.removeEventListener('click', clickOutside); } });
</script>

<div class="page" class:mounted>
  <div class="page-head">
    <a href="/admin/users/create" class="back"><ArrowLeft size={14} /> All roles</a>
    <div class="title-row">
      <div class="role-pill" style="background:rgba(249,115,22,.1);color:#f97316"><ShieldCheck size={16} /> Invigilator</div>
      <h1>Create Invigilator</h1>
    </div>
    <p>Monitors live exam sessions. Assigned to specific exams by the admin or lecturer.</p>
  </div>

  {#if form?.error}<div class="alert-err"><AlertCircle size={14} />{form.error}</div>{/if}

  <form method="POST" use:enhance={() => { loading = true; return async ({ update }) => { loading = false; await update(); }; }}>
    <input type="hidden" name="password" value={password} />
    <input type="hidden" name="role" value="invigilator" />

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
      <div class="card-head">Department (optional)</div>
      <div class="grid">
        <div class="f half">
          <label>College / Faculty</label>
          <div class="dd">
            <button type="button" class="dd-btn" onclick={() => toggleDD('college_id')}>
              <span id="college_id-display">— Select college —</span><ChevronDown size={13} />
            </button>
            {#if openDropdown === 'college_id'}
              <div class="dd-menu">
                <div class="dd-search"><Search size={12} /><input placeholder="Search…" bind:value={dropdownSearch} /></div>
                <div class="dd-list">
                  <button type="button" class="dd-item" onclick={() => selectDD('college_id','','— Select college —')}><span class="muted">None</span></button>
                  {#each filtered(data.colleges ?? [], 'name') as c}
                    <button type="button" class="dd-item" class:sel={selectedCollegeId === String(c.id)} onclick={() => selectDD('college_id', String(c.id), c.abbreviation ? `${c.abbreviation} — ${c.name}` : c.name)}>
                      {#if c.code}<span class="code">{c.code}</span>{/if}<span>{c.name}</span>
                    </button>
                  {/each}
                </div>
              </div>
            {/if}
            <input type="hidden" name="college_id" id="college_id" />
          </div>
        </div>
        <div class="f half">
          <label>Department</label>
          <div class="dd">
            <button type="button" class="dd-btn" class:disabled={!selectedCollegeId} onclick={() => selectedCollegeId && toggleDD('department_id')}>
              <span id="department_id-display">— Select department —</span><ChevronDown size={13} />
            </button>
            {#if openDropdown === 'department_id'}
              <div class="dd-menu">
                <div class="dd-search"><Search size={12} /><input placeholder="Search…" bind:value={dropdownSearch} /></div>
                <div class="dd-list">
                  <button type="button" class="dd-item" onclick={() => selectDD('department_id','','— Select department —')}><span class="muted">None</span></button>
                  {#each filtered(filteredDepts, 'name') as d}
                    <button type="button" class="dd-item" class:sel={selectedDeptId === d.id} onclick={() => selectDD('department_id', d.id, `${d.code} — ${d.name}`)}>
                      <span class="code">{d.code}</span><span>{d.name}</span>
                    </button>
                  {/each}
                </div>
              </div>
            {/if}
            <input type="hidden" name="department_id" id="department_id" />
          </div>
        </div>
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
      <button type="submit" class="btn-primary" disabled={loading || !password} style="background:#f97316">
        {#if loading}<RefreshCw size={13} class="spin" />{:else}<ShieldCheck size={13} />{/if}
        Create Invigilator
      </button>
    </div>
  </form>
</div>

<style>
  @import '../../_form.css';
  .role-pill { display:inline-flex;align-items:center;gap:.4rem;font-size:.75rem;font-weight:700;padding:.3rem .75rem;border-radius:2rem; }
</style>