<!-- src/routes/admin/users/create/+page.svelte -->
<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import {
    UserPlus, AlertCircle, BookOpen, ShieldCheck, Shield,
    Copy, Check, RefreshCw, Eye, EyeOff, ChevronDown,
    Search, X, Building2, Layers, GraduationCap
  } from 'lucide-svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let loading = $state(false);
  let role = $state<'lecturer' | 'invigilator' | 'admin'>('lecturer');

  // Cascading selects
  let selectedCollegeId = $state('');
  let selectedDeptId    = $state('');
  let openDropdown      = $state<string | null>(null);
  let dropdownSearch    = $state('');

  // Password
  let generatedPassword = $state('');
  let passwordCopied    = $state(false);
  let showPassword      = $state(false);

  // Mounted for entrance animation
  let mounted = $state(false);
  import { onMount } from 'svelte';
  onMount(() => { requestAnimationFrame(() => { mounted = true; }); });

  // Filtered lists
  const filteredDepts = $derived(
    selectedCollegeId
      ? (data.departments ?? []).filter((d: any) => String(d.collegeId) === selectedCollegeId)
      : (data.departments ?? [])
  );

  // Courses belonging to selected department
  const deptCourses = $derived(
    selectedDeptId
      ? (data.courses ?? []).filter((c: any) => c.departmentId === selectedDeptId)
      : []
  );

  const LEVELS = [100, 200, 300, 400, 500, 600];

  // Password generator
  function generatePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let pw = '';
    for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    generatedPassword = pw;
    passwordCopied = false;
    showPassword = false;
  }

  async function copyPassword() {
    if (!generatedPassword) return;
    await navigator.clipboard.writeText(generatedPassword);
    passwordCopied = true;
    setTimeout(() => { passwordCopied = false; }, 2000);
  }

  // Generate a password on first load
  onMount(() => { generatePassword(); });

  // Custom dropdown helpers
  function toggleDropdown(id: string) {
    openDropdown = openDropdown === id ? null : id;
    dropdownSearch = '';
  }

  function selectItem(id: string, value: string, label: string) {
    const hidden = document.getElementById(id) as HTMLInputElement;
    if (hidden) hidden.value = value;
    const display = document.getElementById(`${id}-display`);
    if (display) display.textContent = label;

    if (id === 'college_id') {
      selectedCollegeId = value;
      selectedDeptId = '';
      const dHidden  = document.getElementById('department_id') as HTMLInputElement;
      const dDisplay = document.getElementById('department_id-display');
      if (dHidden)  dHidden.value   = '';
      if (dDisplay) dDisplay.textContent = '— Select department —';
    }
    if (id === 'department_id') { selectedDeptId = value; }

    openDropdown = null;
    dropdownSearch = '';
  }

  function filterItems(items: any[], key: string) {
    if (!dropdownSearch) return items;
    const q = dropdownSearch.toLowerCase();
    return items.filter((i: any) => i[key]?.toLowerCase().includes(q));
  }

  function handleClickOutside(e: MouseEvent) {
    if (!(e.target as HTMLElement).closest('.custom-dropdown')) openDropdown = null;
  }

  $effect(() => {
    if (openDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  });

  // Reset dept when college changes via reactive
  $effect(() => {
    if (selectedCollegeId) {
      selectedDeptId = '';
    }
  });

  const SESSIONS = Array.from({ length: 5 }, (_, i) => {
    const y = new Date().getFullYear() - 1 + i;
    return `${y}/${y + 1}`;
  });

  // Role-specific styles
  function getRoleColor(value: string) {
    switch(value) {
      case 'lecturer': return { bg: 'rgba(99, 102, 241, 0.1)', border: '#6366f1', text: '#6366f1', hover: '#4f46e5' };
      case 'invigilator': return { bg: 'rgba(249, 115, 22, 0.1)', border: '#f97316', text: '#f97316', hover: '#ea580c' };
      case 'admin': return { bg: 'rgba(59, 130, 246, 0.1)', border: '#3b82f6', text: '#3b82f6', hover: '#1d4ed8' };
      default: return { bg: 'rgba(59, 130, 246, 0.1)', border: '#3b82f6', text: '#3b82f6', hover: '#1d4ed8' };
    }
  }
</script>

<div class="create-page" class:mounted>

  <!-- Page header -->
  <div class="page-header">
    <div class="header-icon" style="background: {getRoleColor(role).bg}; color: {getRoleColor(role).text};">
      <UserPlus size={20} />
    </div>
    <div>
      <h1>Create User</h1>
      <p>Add a new staff member to the MOUAU eTest system</p>
    </div>
  </div>

  {#if form?.error}
    <div class="form-error">
      <AlertCircle size={14} />
      {form.error}
    </div>
  {/if}

  <form
    method="POST"
    use:enhance={() => {
      loading = true;
      return async ({ update }) => { loading = false; await update(); };
    }}
  >
    <!-- Hidden password field -->
    <input type="hidden" name="password" value={generatedPassword} />

    <!-- ── Role selector ─────────────────────────────────────────── -->
    <div class="card" style="--delay: 0.08s">
      <div class="card-head">User Role</div>
      <div class="role-grid">
        {#each [
          { value: 'lecturer',    label: 'Lecturer',    icon: BookOpen,   desc: 'Creates and manages exams', color: { bg: 'rgba(99,102,241,0.1)', border: '#6366f1', text: '#6366f1' } },
          { value: 'invigilator', label: 'Invigilator', icon: ShieldCheck, desc: 'Monitors exam sessions', color: { bg: 'rgba(249,115,22,0.1)', border: '#f97316', text: '#f97316' } },
          { value: 'admin',       label: 'Admin',       icon: Shield,      desc: 'Full system access', color: { bg: 'rgba(59,130,246,0.1)', border: '#3b82f6', text: '#3b82f6' } },
        ] as r}
          <label class="role-card" class:role-selected={role === r.value} data-role={r.value}>
            <input type="radio" name="role" value={r.value} bind:group={role} />
            <div class="role-icon" style={role === r.value ? `background: ${r.color.bg}; border-color: ${r.color.border}; color: ${r.color.text};` : ''}>
              <r.icon size={18} />
            </div>
            <div class="role-label">{r.label}</div>
            <div class="role-desc">{r.desc}</div>
          </label>
        {/each}
      </div>
    </div>

    <!-- ── Personal information ──────────────────────────────────── -->
    <div class="card" style="--delay: 0.14s">
      <div class="card-head">Personal Information</div>
      <div class="form-grid">
        <div class="field field-half">
          <label for="fullName">Full Name <span class="req">*</span></label>
          <input id="fullName" name="fullName" placeholder="As on staff ID" required />
        </div>
        <div class="field field-half">
          <label for="email">Email Address <span class="req">*</span></label>
          <input id="email" name="email" type="email" placeholder="staff@mouau.edu.ng" required />
        </div>
        <div class="field field-half">
          <label for="phone">Phone Number</label>
          <input id="phone" name="phone" type="tel" placeholder="+234 000 000 0000" />
        </div>
        <div class="field field-half">
          <label for="staffId">Staff ID</label>
          <input id="staffId" name="staffId" placeholder="e.g. MOUAU/STAFF/001" />
        </div>
      </div>
    </div>

    <!-- ── Academic information ──────────────────────────────────── -->
    {#if role !== 'admin'}
      <div class="card" style="--delay: 0.2s">
        <div class="card-head">Academic Information</div>
        <div class="form-grid">

          <!-- College dropdown -->
          <div class="field field-half">
            <label><Building2 size={11} /> College / Faculty</label>
            <div class="custom-dropdown">
              <button type="button" class="dropdown-trigger" onclick={() => toggleDropdown('college_id')}>
                <span id="college_id-display">— Select college —</span>
                <ChevronDown size={14} class={openDropdown === 'college_id' ? 'rotated' : ''} />
              </button>
              {#if openDropdown === 'college_id'}
                <div class="dropdown-menu">
                  <div class="dropdown-search">
                    <Search size={12} />
                    <input type="text" placeholder="Search colleges..." bind:value={dropdownSearch} />
                  </div>
                  <div class="dropdown-items">
                    <button type="button" class="dropdown-item" onclick={() => selectItem('college_id', '', '— Select college —')}>
                      <span class="item-none">— None —</span>
                    </button>
                    {#each filterItems(data.colleges ?? [], 'name') as c}
                      <button type="button" class="dropdown-item" class:selected={selectedCollegeId === String(c.id)} onclick={() => selectItem('college_id', String(c.id), c.abbreviation ? `${c.abbreviation} — ${c.name}` : c.name)}>
                        {#if c.code}<span class="item-code">{c.code}</span>{/if}
                        <span class="item-name">{c.name}</span>
                      </button>
                    {/each}
                  </div>
                </div>
              {/if}
              <input type="hidden" name="college_id" id="college_id" value="" />
            </div>
          </div>

          <!-- Department dropdown (filtered by college) -->
          <div class="field field-half">
            <label><Layers size={11} /> Department</label>
            <div class="custom-dropdown">
              <button type="button" class="dropdown-trigger" class:disabled={!selectedCollegeId} onclick={() => selectedCollegeId && toggleDropdown('department_id')}>
                <span id="department_id-display">— Select department —</span>
                <ChevronDown size={14} />
              </button>
              {#if openDropdown === 'department_id'}
                <div class="dropdown-menu">
                  <div class="dropdown-search">
                    <Search size={12} />
                    <input type="text" placeholder="Search departments..." bind:value={dropdownSearch} />
                  </div>
                  <div class="dropdown-items">
                    <button type="button" class="dropdown-item" onclick={() => selectItem('department_id', '', '— Select department —')}>
                      <span class="item-none">— None —</span>
                    </button>
                    {#each filterItems(filteredDepts, 'name') as d}
                      <button type="button" class="dropdown-item" class:selected={selectedDeptId === d.id} onclick={() => selectItem('department_id', d.id, `${d.code} — ${d.name}`)}>
                        <span class="item-code">{d.code}</span>
                        <span class="item-name">{d.name}</span>
                      </button>
                    {/each}
                  </div>
                </div>
              {/if}
              <input type="hidden" name="department_id" id="department_id" value="" />
            </div>
          </div>

          <!-- Level or Course — only shown when dept is selected -->
          {#if selectedDeptId}
            {#if deptCourses.length > 0}
              <!-- Course dropdown -->
              <div class="field field-half">
                <label><GraduationCap size={11} /> Course / Unit</label>
                <div class="custom-dropdown">
                  <button type="button" class="dropdown-trigger" onclick={() => toggleDropdown('course_id')}>
                    <span id="course_id-display">— Select course —</span>
                    <ChevronDown size={14} />
                  </button>
                  {#if openDropdown === 'course_id'}
                    <div class="dropdown-menu">
                      <div class="dropdown-search">
                        <Search size={12} />
                        <input type="text" placeholder="Search courses..." bind:value={dropdownSearch} />
                      </div>
                      <div class="dropdown-items">
                        <button type="button" class="dropdown-item" onclick={() => selectItem('course_id', '', '— None —')}>
                          <span class="item-none">— None —</span>
                        </button>
                        {#each filterItems(deptCourses, 'title') as c}
                          <button type="button" class="dropdown-item" onclick={() => selectItem('course_id', c.id, `${c.code} — ${c.title}`)}>
                            <span class="item-code">{c.code}</span>
                            <span class="item-name">{c.title}</span>
                            {#if c.level}<span class="item-meta">{c.level} Level</span>{/if}
                          </button>
                        {/each}
                      </div>
                    </div>
                  {/if}
                  <input type="hidden" name="course_id" id="course_id" value="" />
                </div>
              </div>
            {:else}
              <!-- Level select -->
              <div class="field field-quarter">
                <label>Level</label>
                <select name="level">
                  <option value="">—</option>
                  {#each LEVELS as l}<option value={l}>{l}</option>{/each}
                </select>
              </div>
            {/if}

            <!-- Session -->
            <div class="field field-quarter">
              <label>Session</label>
              <select name="session">
                <option value="">—</option>
                {#each SESSIONS as s}<option value={s}>{s}</option>{/each}
              </select>
            </div>
          {/if}

        </div>
      </div>
    {/if}

    <!-- ── Auto-generated password ───────────────────────────────── -->
    <div class="card" style="--delay: 0.26s">
      <div class="card-head">Access Credentials</div>
      <div class="password-section">
        <div class="password-info">
          <p class="pw-label">Auto-generated password</p>
          <p class="pw-sub">A secure password has been generated. Copy it before creating the user — it will not be shown again.</p>
        </div>

        <div class="pw-box">
          <div class="pw-display">
            <span class="pw-value" class:blurred={!showPassword}>
              {showPassword ? generatedPassword : '•'.repeat(generatedPassword.length)}
            </span>
          </div>
          <div class="pw-actions">
            <button type="button" class="pw-btn" title={showPassword ? 'Hide' : 'Reveal'} onclick={() => { showPassword = !showPassword; }}>
              {#if showPassword}<EyeOff size={15} />{:else}<Eye size={15} />{/if}
            </button>
            <button type="button" class="pw-btn" title="Regenerate" onclick={generatePassword}>
              <RefreshCw size={15} />
            </button>
            <button type="button" class="pw-btn copy" class:copied={passwordCopied} title="Copy" onclick={copyPassword}>
              {#if passwordCopied}<Check size={15} />{:else}<Copy size={15} />{/if}
              <span>{passwordCopied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {#if !passwordCopied}
          <div class="pw-warning">
            <AlertCircle size={12} />
            Copy this password before submitting. The admin cannot retrieve it later.
          </div>
        {/if}
      </div>
    </div>

    <!-- ── Actions ───────────────────────────────────────────────── -->
    <div class="form-foot" style="--delay: 0.32s">
      <a href="/admin/users" class="btn-ghost">Cancel</a>
      <button type="submit" class="btn-primary" disabled={loading || !generatedPassword} style="background: {getRoleColor(role).border};">
        {#if loading}
          <RefreshCw size={14} class="spin" />
        {:else}
          <UserPlus size={14} />
        {/if}
        Create User
      </button>
    </div>
  </form>
</div>

<style>
  /* ── Page layout ──────────────────────────────────────────────── */
  .create-page {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    max-width: 860px;
  }

  /* ── Entrance animations ─────────────────────────────────────── */
  .page-header,
  .form-error,
  .card,
  .form-foot {
    opacity: 0;
    transform: translateY(14px);
    transition: opacity 0.38s ease, transform 0.38s ease;
    transition-delay: var(--delay, 0s);
    margin-bottom: 20px !important;
  }

  .create-page.mounted .page-header,
  .create-page.mounted .form-error,
  .create-page.mounted .card,
  .create-page.mounted .form-foot {
    opacity: 1;
    transform: translateY(0);
  }

  .create-page.mounted .page-header { transition-delay: 0s; }
  .create-page.mounted .form-error  { transition-delay: 0.04s; }
  .create-page.mounted .form-foot   { transition-delay: var(--delay, 0.32s); }

  /* ── Header ──────────────────────────────────────────────────── */
  .page-header {
    display: flex;
    align-items: center;
    gap: .875rem;
  }

  .header-icon {
    width: 44px;
    height: 44px;
    border-radius: .75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 0.3s ease;
  }

  h1 {
    font-size: 1.2rem;
    font-weight: 800;
    color: var(--color-text);
    margin: 0;
  }

  p {
    font-size: .8rem;
    color: var(--color-muted);
    margin: 0;
  }

  .form-error {
    display: flex;
    align-items: center;
    gap: .5rem;
    padding: .75rem 1rem;
    background: rgba(220,38,38,.08);
    border: 1px solid rgba(220,38,38,.25);
    border-radius: .625rem;
    font-size: .82rem;
    color: #dc2626;
  }

  /* ── Cards ───────────────────────────────────────────────────── */
  .card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: .875rem;
    overflow: visible;
    position: relative;
    z-index: 1;
  }

  .card:has(.dropdown-menu) {
    z-index: 1000;
  }

  .card-head {
    padding: .875rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
    font-size: .85rem;
    font-weight: 700;
    color: var(--color-text);
    background: var(--color-bg);
    border-radius: .875rem .875rem 0 0;
  }

  /* ── Role grid - Responsive stacking ─────────────────────────── */
  .role-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0;
  }

  .role-card {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: .5rem;
    padding: 1.5rem 1rem;
    cursor: pointer;
    border-right: 1px solid var(--color-border);
    transition: background .15s;
    text-align: center;
    position: relative;
    min-width: 0;
  }

  .role-card:last-child { 
    border-right: none; 
  }

  .role-card input { 
    display: none; 
  }
  
  .role-card:hover { 
    background: var(--color-surface-hover, rgba(0,0,0,.03)); 
  }

  .role-selected {
    background: rgba(0, 0, 0, 0.02);
  }

  /* Role-specific indicator bars */
  .role-card[data-role="lecturer"].role-selected::after {
    background: #6366f1;
  }
  .role-card[data-role="invigilator"].role-selected::after {
    background: #f97316;
  }
  .role-card[data-role="admin"].role-selected::after {
    background: #3b82f6;
  }

  /* Animated bottom indicator */
  .role-card::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%) scaleX(0);
    width: 40%;
    height: 2px;
    border-radius: 2px 2px 0 0;
    transition: transform .2s ease;
  }

  .role-selected::after {
    transform: translateX(-50%) scaleX(1);
  }

  .role-icon {
    width: 40px;
    height: 40px;
    border-radius: .625rem;
    background: var(--color-bg);
    border: 1.5px solid var(--color-border);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-muted);
    transition: all .2s;
  }

  .role-label {
    font-size: .82rem;
    font-weight: 700;
    color: var(--color-text);
  }

  .role-desc {
    font-size: .68rem;
    color: var(--color-muted);
    line-height: 1.35;
  }

  /* Responsive role grid - stacks vertically on mobile */
  @media (max-width: 640px) {
    .role-grid {
      flex-direction: column;
    }
    
    .role-card {
      flex-direction: row;
      text-align: left;
      padding: 1rem 1.25rem;
      border-right: none;
      border-bottom: 1px solid var(--color-border);
      gap: .75rem;
    }
    
    .role-card:last-child {
      border-bottom: none;
    }
    
    .role-card::after {
      width: 3px;
      height: 60%;
      top: 20%;
      left: 0;
      bottom: auto;
      transform: translateY(0) scaleY(0);
      border-radius: 0 2px 2px 0;
    }
    
    .role-selected::after {
      transform: scaleY(1);
    }
    
    .role-icon {
      width: 44px;
      height: 44px;
      flex-shrink: 0;
    }
    
    .role-card .role-desc {
      display: none;
    }
  }

  /* Tablet breakpoint - keep horizontal but adjust padding */
  @media (min-width: 641px) and (max-width: 768px) {
    .role-card {
      padding: 1.25rem 0.75rem;
    }
    
    .role-desc {
      font-size: 0.62rem;
    }
    
    .role-label {
      font-size: 0.75rem;
    }
  }

  /* ── Form grid ───────────────────────────────────────────────── */
  .form-grid {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: 1rem;
    padding: 1.25rem;
  }

  .field { display: flex; flex-direction: column; gap: .375rem; }
  .field-half    { grid-column: span 6; }
  .field-quarter { grid-column: span 3; }
  .field-full    { grid-column: span 12; }

  label {
    display: flex;
    align-items: center;
    gap: .3rem;
    font-size: .78rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .req { color: #dc2626; }

  input:not([type="radio"]):not([type="hidden"]),
  select {
    width: 100%;
    padding: .6rem .875rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: .5rem;
    font-size: .82rem;
    color: var(--color-text);
    font-family: inherit;
    outline: none;
    -webkit-appearance: none;
    transition: border-color .15s, box-shadow .15s;
    box-sizing: border-box;
  }

  input:not([type="radio"]):not([type="hidden"]):focus,
  select:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, .1);
  }

  /* Responsive form grid */
  @media (max-width: 768px) {
    .field-half, .field-quarter {
      grid-column: span 12;
    }
  }

  /* ── Custom dropdown ─────────────────────────────────────────── */
  .custom-dropdown {
    position: relative;
  }

  .dropdown-trigger {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: .5rem;
    padding: .6rem .875rem;
    border: 1px solid var(--color-border);
    border-radius: .5rem;
    background: var(--color-bg);
    color: var(--color-text);
    font-size: .82rem;
    font-family: inherit;
    cursor: pointer;
    transition: border-color .15s, box-shadow .15s;
    text-align: left;
  }

  .dropdown-trigger:hover:not(.disabled) {
    border-color: #3b82f6;
  }

  .dropdown-trigger:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, .1);
  }

  .dropdown-trigger.disabled {
    opacity: .45;
    cursor: not-allowed;
  }

  .dropdown-trigger :global(svg) {
    flex-shrink: 0;
    color: var(--color-muted);
    transition: transform .15s;
  }

  .dropdown-trigger :global(svg.rotated) {
    transform: rotate(180deg);
  }

  .dropdown-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: .5rem;
    box-shadow: 0 10px 40px rgba(0,0,0,.15);
    z-index: 200;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: dd-open .15s ease;
  }

  @keyframes dd-open {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .dropdown-search {
    display: flex;
    align-items: center;
    gap: .5rem;
    padding: .5rem .75rem;
    border-bottom: 1px solid var(--color-border);
    color: var(--color-muted);
  }

  .dropdown-search input {
    flex: 1;
    border: none !important;
    background: none !important;
    outline: none !important;
    box-shadow: none !important;
    padding: 0 !important;
    font-size: .8rem;
    color: var(--color-text);
  }

  .dropdown-items {
    overflow-y: auto;
    max-height: 220px;
    padding: .25rem;
  }

  .dropdown-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: .5rem;
    padding: .5rem .75rem;
    border: none;
    background: none;
    border-radius: .35rem;
    font-size: .8rem;
    color: var(--color-text);
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    transition: background .1s;
  }

  .dropdown-item:hover,
  .dropdown-item.selected {
    background: var(--color-bg);
  }

  .dropdown-item.selected { font-weight: 600; }

  .item-code {
    font-weight: 700;
    color: #3b82f6;
    min-width: 50px;
    font-size: .75rem;
  }

  .item-name { flex: 1; }

  .item-meta {
    font-size: .7rem;
    color: var(--color-muted);
  }

  .item-none {
    color: var(--color-muted);
    font-style: italic;
  }

  /* ── Password section ────────────────────────────────────────── */
  .password-section {
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: .875rem;
  }

  .pw-label {
    font-size: .85rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0 0 .2rem;
  }

  .pw-sub {
    font-size: .78rem;
    color: var(--color-muted);
    margin: 0;
    line-height: 1.5;
  }

  .pw-box {
    display: flex;
    align-items: center;
    gap: .75rem;
    padding: .875rem 1rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: .625rem;
    flex-wrap: wrap;
  }

  .pw-display {
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }

  .pw-value {
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: .9rem;
    color: var(--color-text);
    letter-spacing: .08em;
    display: block;
    transition: filter .2s;
  }

  .pw-value.blurred {
    filter: blur(5px);
    user-select: none;
  }

  .pw-actions {
    display: flex;
    align-items: center;
    gap: .5rem;
    flex-shrink: 0;
  }

  .pw-btn {
    display: inline-flex;
    align-items: center;
    gap: .35rem;
    padding: .4rem .7rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: .4rem;
    font-size: .75rem;
    font-weight: 600;
    color: var(--color-muted);
    cursor: pointer;
    font-family: inherit;
    transition: all .15s;
  }

  .pw-btn:hover {
    border-color: #3b82f6;
    color: var(--color-text);
  }

  .pw-btn.copy {
    background: rgba(59, 130, 246, .08);
    border-color: rgba(59, 130, 246, .3);
    color: #3b82f6;
  }

  .pw-btn.copy:hover {
    background: rgba(59, 130, 246, .15);
    border-color: #3b82f6;
  }

  .pw-btn.copied {
    background: rgba(59, 130, 246, .12);
    border-color: #3b82f6;
    color: #3b82f6;
    animation: pop .25s ease;
  }

  @keyframes pop {
    0%   { transform: scale(1); }
    50%  { transform: scale(1.08); }
    100% { transform: scale(1); }
  }

  .pw-warning {
    display: flex;
    align-items: center;
    gap: .4rem;
    font-size: .75rem;
    color: #b45309;
    background: #fef3c7;
    border: 1px solid #fde68a;
    border-radius: .4rem;
    padding: .5rem .75rem;
    animation: fadeIn .3s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-4px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* Responsive password box */
  @media (max-width: 640px) {
    .pw-box {
      flex-direction: column;
      align-items: stretch;
    }
    
    .pw-actions {
      justify-content: center;
    }
  }

  /* ── Footer ──────────────────────────────────────────────────── */
  .form-foot {
    display: flex;
    justify-content: flex-end;
    gap: .75rem;
  }

  .btn-primary {
    display: flex;
    align-items: center;
    gap: .5rem;
    padding: .6rem 1.25rem;
    color: white;
    border: none;
    border-radius: .5rem;
    font-size: .85rem;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: transform .15s, box-shadow .15s;
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .btn-primary:active:not(:disabled) {
    transform: translateY(0);
  }

  .btn-primary:disabled {
    opacity: .5;
    cursor: not-allowed;
  }

  .btn-ghost {
    display: flex;
    align-items: center;
    gap: .5rem;
    padding: .6rem 1.25rem;
    background: transparent;
    border: 1px solid var(--color-border);
    color: var(--color-text);
    border-radius: .5rem;
    font-size: .85rem;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    text-decoration: none;
    transition: background .15s;
  }

  .btn-ghost:hover {
    background: var(--color-surface-hover, rgba(0,0,0,.04));
  }

  .spin {
    animation: spin .7s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Responsive footer buttons */
  @media (max-width: 480px) {
    .form-foot {
      flex-direction: column;
    }
    
    .btn-primary,
    .btn-ghost {
      justify-content: center;
      width: 100%;
    }
  }
</style>