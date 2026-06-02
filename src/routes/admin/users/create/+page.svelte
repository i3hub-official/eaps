<!-- src/routes/admin/users/create/+page.svelte -->
<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import {
    UserPlus, AlertCircle, GraduationCap, BookOpen, ShieldCheck, Shield
  } from 'lucide-svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let loading = $state(false);
  let role = $state('student');
  let collegeId = $state('');

  const filteredDepts = $derived(
    collegeId
      ? data.departments.filter(d => String(d.collegeId) === collegeId)
      : data.departments
  );

  const LEVELS = [100, 200, 300, 400, 500, 600];
  const SESSIONS = Array.from({ length: 5 }, (_, i) => {
    const y = new Date().getFullYear() - 1 + i;
    return `${y}/${y + 1}`;
  });
</script>

<div class="create-page">
  <div class="page-header">
    <div class="header-icon"><UserPlus size={20} /></div>
    <div>
      <h1>Create User</h1>
      <p>Add a new user to the MOUAU eTest system</p>
    </div>
  </div>

  {#if form?.error}
    <div class="form-error"><AlertCircle size={14} /> {form.error}</div>
  {/if}

  <form method="POST" use:enhance={() => { loading = true; return async ({ update }) => { loading = false; await update(); }; }}>

    <!-- Role selector -->
    <div class="card">
      <div class="card-head">User Role</div>
      <div class="role-grid">
        {#each [
          { value: 'student',     label: 'Student',     icon: GraduationCap, desc: 'Takes exams, views results' },
          { value: 'lecturer',    label: 'Lecturer',    icon: BookOpen,      desc: 'Creates and manages exams' },
          { value: 'invigilator', label: 'Invigilator', icon: ShieldCheck,   desc: 'Monitors exam sessions' },
          { value: 'admin',       label: 'Admin',       icon: Shield,        desc: 'Full system access' },
        ] as r}
          <label class="role-card" class:role-selected={role === r.value}>
            <input type="radio" name="role" value={r.value} bind:group={role} />
            <div class="role-icon"><r.icon size={18} /></div>
            <div class="role-label">{r.label}</div>
            <div class="role-desc">{r.desc}</div>
          </label>
        {/each}
      </div>
    </div>

    <!-- Basic info -->
    <div class="card">
      <div class="card-head">Personal Information</div>
      <div class="form-grid">
        <div class="field-half">
          <label for="fullName">Full Name <span class="req">*</span></label>
          <input id="fullName" name="fullName" placeholder="As on student ID" required />
        </div>
        <div class="field-half">
          <label for="email">Email Address <span class="req">*</span></label>
          <input id="email" name="email" type="email" placeholder="user@mouau.edu.ng" required />
        </div>
        <div class="field-half">
          <label for="phone">Phone Number</label>
          <input id="phone" name="phone" type="tel" placeholder="+234 000 000 0000" />
        </div>
        <div class="field-half">
          <label for="password">Initial Password <span class="req">*</span></label>
          <input id="password" name="password" type="password" placeholder="Min. 8 characters" required minlength="8" />
        </div>
      </div>
    </div>

    <!-- Academic info (conditional on role) -->
    {#if role !== 'admin'}
      <div class="card">
        <div class="card-head">Academic Information</div>
        <div class="form-grid">
          <div class="field-half">
            <label for="collegeId">College</label>
            <select id="collegeId" name="collegeId" bind:value={collegeId}>
              <option value="">— Select college —</option>
              {#each data.colleges as c}<option value={String(c.id)}>{c.name}</option>{/each}
            </select>
          </div>
          <div class="field-half">
            <label for="departmentId">Department</label>
            <select id="departmentId" name="departmentId">
              <option value="">— Select department —</option>
              {#each filteredDepts as d}
                <option value={d.id}>{d.name}{!collegeId ? ` (${d.college.name})` : ''}</option>
              {/each}
            </select>
          </div>

          {#if role === 'student'}
            <div class="field-third">
              <label for="matricNumber">Matric Number</label>
              <input id="matricNumber" name="matricNumber" placeholder="e.g. 2020/123456" />
            </div>
            <div class="field-third">
              <label for="jambRegNo">JAMB Reg No</label>
              <input id="jambRegNo" name="jambRegNo" placeholder="Optional" />
            </div>
            <div class="field-sixth">
              <label for="level">Level</label>
              <select id="level" name="level">
                <option value="">—</option>
                {#each LEVELS as l}<option value={l}>{l}</option>{/each}
              </select>
            </div>
            <div class="field-sixth">
              <label for="session">Session</label>
              <select id="session" name="session">
                <option value="">—</option>
                {#each SESSIONS as s}<option value={s}>{s}</option>{/each}
              </select>
            </div>
          {/if}

          {#if role === 'lecturer' || role === 'invigilator'}
            <div class="field-half">
              <label for="staffId">Staff ID</label>
              <input id="staffId" name="staffId" placeholder="e.g. MOUAU/STAFF/001" />
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <div class="form-foot">
      <a href="/admin/users" class="btn-ghost">Cancel</a>
      <button type="submit" class="btn-primary" disabled={loading}>
        {#if loading}<span class="spin">⟳</span>{:else}<UserPlus size={14} />{/if}
        Create User
      </button>
    </div>
  </form>
</div>

<style>
  .create-page { display: flex; flex-direction: column; gap: 1.25rem; max-width: 860px; }
  .page-header { display: flex; align-items: center; gap: .875rem; }
  .header-icon { width: 44px; height: 44px; border-radius: .75rem; background: linear-gradient(135deg,#16a34a,#15803d); display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; }
  h1 { font-size: 1.2rem; font-weight: 800; color: var(--color-text); }
  p  { font-size: .8rem; color: var(--color-muted); }
  .form-error { display: flex; align-items: center; gap: .5rem; padding: .75rem 1rem; background: rgba(220,38,38,.08); border: 1px solid rgba(220,38,38,.25); border-radius: .625rem; font-size: .82rem; color: #dc2626; }

  .card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: .875rem; overflow: hidden; }
  .card-head { padding: .875rem 1.25rem; border-bottom: 1px solid var(--color-border); font-size: .85rem; font-weight: 700; color: var(--color-text); background: var(--color-bg); }

  /* Role grid */
  .role-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; border-top: none; }
  .role-card { display: flex; flex-direction: column; align-items: center; gap: .5rem; padding: 1.25rem 1rem; cursor: pointer; border-right: 1px solid var(--color-border); transition: background .15s; text-align: center; }
  .role-card:last-child { border-right: none; }
  .role-card input { display: none; }
  .role-card:hover { background: var(--color-surface-hover); }
  .role-selected { background: rgba(22,163,74,.06); }
  .role-icon { width: 40px; height: 40px; border-radius: .625rem; background: var(--color-bg); border: 1.5px solid var(--color-border); display: flex; align-items: center; justify-content: center; color: var(--color-muted); transition: all .15s; }
  .role-selected .role-icon { background: rgba(22,163,74,.1); border-color: #16a34a; color: #16a34a; }
  .role-label { font-size: .82rem; font-weight: 700; color: var(--color-text); }
  .role-desc { font-size: .68rem; color: var(--color-muted); line-height: 1.35; }

  /* Form grid */
  .form-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 1rem; padding: 1.25rem; }
  .field-half   { grid-column: span 6; }
  .field-third  { grid-column: span 4; }
  .field-sixth  { grid-column: span 3; }

  label { display: block; font-size: .78rem; font-weight: 600; color: var(--color-text); margin-bottom: .375rem; }
  .req  { color: #dc2626; }
  input, select {
    width: 100%; padding: .6rem .875rem;
    background: var(--color-bg); border: 1px solid var(--color-border);
    border-radius: .5rem; font-size: .82rem; color: var(--color-text);
    font-family: inherit; outline: none; -webkit-appearance: none; transition: border-color .15s;
  }
  input:focus, select:focus { border-color: #16a34a; }

  .form-foot { display: flex; justify-content: flex-end; gap: .75rem; }
  .btn-primary { display: flex; align-items: center; gap: .5rem; padding: .6rem 1.25rem; background: #16a34a; color: white; border: none; border-radius: .5rem; font-size: .85rem; font-weight: 600; cursor: pointer; font-family: inherit; transition: background .15s; }
  .btn-primary:hover { background: #15803d; }
  .btn-primary:disabled { opacity: .5; cursor: not-allowed; }
  .btn-ghost { display: flex; align-items: center; gap: .5rem; padding: .6rem 1.25rem; background: transparent; border: 1px solid var(--color-border); color: var(--color-text); border-radius: .5rem; font-size: .85rem; font-weight: 600; cursor: pointer; font-family: inherit; text-decoration: none; }
  .btn-ghost:hover { background: var(--color-surface-hover); }
  .spin { display: inline-block; animation: spin .7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 640px) {
    .role-grid { grid-template-columns: repeat(2, 1fr); }
    .field-half, .field-third, .field-sixth { grid-column: span 12; }
  }
</style>