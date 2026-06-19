<!-- src/routes/admin/users/create/lecturer/+page.svelte -->
<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';
  import {
    BookOpen, AlertCircle, Copy, Check, RefreshCw,
    Eye, EyeOff, ChevronDown, Search, Plus, Trash2, ArrowLeft
  } from '@lucide/svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let loading      = $state(false);
  let mounted      = $state(false);
  let showPassword = $state(false);
  let password     = $state('');
  let copied       = $state(false);

  let selectedCollegeId = $state('');
  let selectedDeptId    = $state('');
  let openDropdown      = $state<string | null>(null);
  let dropdownSearch    = $state('');

  let courses = $state<Array<{ courseId: string; deptId: string }>>([]);

  onMount(() => {
    requestAnimationFrame(() => { mounted = true; });
    genPassword();
  });

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

  const filteredDepts = $derived(
    selectedCollegeId
      ? (data.departments ?? []).filter((d: any) => String(d.collegeId) === selectedCollegeId)
      : (data.departments ?? [])
  );

  function deptCourses(deptId: string) {
    return (data.courses ?? []).filter((c: any) => c.departmentId === deptId);
  }

  const hasDupe = $derived(() => {
    const ids = courses.map(c => c.courseId).filter(Boolean);
    return ids.length !== new Set(ids).size;
  });

  const canSubmit = $derived(
    !!password &&
    courses.length > 0 &&
    courses.every(c => c.courseId) &&
    !hasDupe()
  );

  function toggleDD(id: string) {
    openDropdown = openDropdown === id ? null : id;
    dropdownSearch = '';
  }

  function selectDD(id: string, value: string, label: string) {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (el) el.value = value;
    const disp = document.getElementById(`${id}-display`);
    if (disp) disp.textContent = label;
    if (id === 'college_id') { selectedCollegeId = value; selectedDeptId = ''; courses = []; }
    if (id === 'department_id') { selectedDeptId = value; }
    openDropdown = null;
    dropdownSearch = '';
  }

  function filtered(items: any[], key: string) {
    if (!dropdownSearch) return items;
    const q = dropdownSearch.toLowerCase();
    return items.filter((i: any) => i[key]?.toLowerCase().includes(q));
  }

  function clickOutside(e: MouseEvent) {
    if (!(e.target as HTMLElement).closest('.dd')) openDropdown = null;
  }

  $effect(() => {
    if (openDropdown) {
      document.addEventListener('click', clickOutside);
      return () => document.removeEventListener('click', clickOutside);
    }
  });
</script>

<div class="page" class:mounted>
  <div class="page-head">
    <a href="/admin/users/create" class="back"><ArrowLeft size={14} /> All roles</a>
    <div class="title-row">
      <div class="role-pill" style="background:rgba(99,102,241,.1);color:#6366f1">
        <BookOpen size={16} /> Lecturer
      </div>
      <h1>Create Lecturer</h1>
    </div>
    <p>Creates and manages course exams. Must be assigned to at least one course.</p>
  </div>

  {#if form?.error}
    <div class="alert-err"><AlertCircle size={14} />{form.error}</div>
  {/if}

  <form method="POST" use:enhance={() => { loading = true; return async ({ update }) => { loading = false; await update(); }; }}>
    <input type="hidden" name="password" value={password} />
    <input type="hidden" name="role" value="lecturer" />

    <!-- Personal -->
    <div class="card">
      <div class="card-head">Personal information</div>
      <div class="grid">
        <div class="f half">
          <label for="fullName">Full name <span class="req">*</span></label>
          <input id="fullName" name="fullName" placeholder="As on staff ID" required />
        </div>
        <div class="f half">
          <label for="email">Email <span class="req">*</span></label>
          <input id="email" name="email" type="email" placeholder="staff@mouau.edu.ng" required />
        </div>
        <div class="f half">
          <label for="phone">Phone</label>
          <input id="phone" name="phone" type="tel" placeholder="+234 000 000 0000" />
        </div>
        <div class="f half">
          <label for="staffId">Staff ID</label>
          <input id="staffId" name="staffId" placeholder="MOUAU/STAFF/001" />
        </div>
      </div>
    </div>

    <!-- Department -->
    <div class="card">
      <div class="card-head">Department</div>
      <div class="grid">
        <!-- College -->
        <div class="f half">
          <label>College / Faculty</label>
          <div class="dd">
            <button type="button" class="dd-btn" onclick={() => toggleDD('college_id')}>
              <span id="college_id-display">— Select college —</span>
              <ChevronDown size={13} />
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

        <!-- Department -->
        <div class="f half">
          <label>Department <span class="req">*</span></label>
          <div class="dd">
            <button type="button" class="dd-btn" class:disabled={!selectedCollegeId} onclick={() => selectedCollegeId && toggleDD('department_id')}>
              <span id="department_id-display">— Select department —</span>
              <ChevronDown size={13} />
            </button>
            {#if openDropdown === 'department_id'}
              <div class="dd-menu">
                <div class="dd-search"><Search size={12} /><input placeholder="Search…" bind:value={dropdownSearch} /></div>
                <div class="dd-list">
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

    <!-- Course assignments -->
    <div class="card">
      <div class="card-head">Course assignments <span class="req">*</span></div>
      <div class="card-body">
        <p class="hint">Assign the courses this lecturer will teach. At least one required.</p>

        <div class="course-list">
          {#each courses as row, i}
            <div class="course-row">
              <!-- Dept for this course -->
              <div class="dd course-dept">
                <button type="button" class="dd-btn" onclick={() => toggleDD(`cd_${i}`)}>
                  <span id={`cd_${i}-display`}>
                    {row.deptId ? (() => { const d = data.departments?.find((d: any) => d.id === row.deptId); return d ? `${d.code}` : '— Dept —'; })() : '— Dept —'}
                  </span>
                  <ChevronDown size={13} />
                </button>
                {#if openDropdown === `cd_${i}`}
                  <div class="dd-menu">
                    <div class="dd-search"><Search size={12} /><input placeholder="Search…" bind:value={dropdownSearch} /></div>
                    <div class="dd-list">
                      {#each filtered(filteredDepts, 'name') as d}
                        <button type="button" class="dd-item" class:sel={row.deptId === d.id}
                          onclick={() => { courses[i] = { deptId: d.id, courseId: '' }; courses = [...courses]; selectDD(`cd_${i}`, d.id, d.code); }}>
                          <span class="code">{d.code}</span><span>{d.name}</span>
                        </button>
                      {/each}
                    </div>
                  </div>
                {/if}
              </div>

              <!-- Course -->
              <div class="dd course-course">
                <button type="button" class="dd-btn" class:disabled={!row.deptId} onclick={() => row.deptId && toggleDD(`cc_${i}`)}>
                  <span id={`cc_${i}-display`}>
                    {row.courseId ? (() => { const c = data.courses?.find((c: any) => c.id === row.courseId); return c ? `${c.code}` : '— Course —'; })() : '— Course —'}
                  </span>
                  <ChevronDown size={13} />
                </button>
                {#if openDropdown === `cc_${i}`}
                  <div class="dd-menu">
                    <div class="dd-search"><Search size={12} /><input placeholder="Search…" bind:value={dropdownSearch} /></div>
                    <div class="dd-list">
                      {#each filtered(deptCourses(row.deptId), 'title') as c}
                        <button type="button" class="dd-item"
                          class:sel={row.courseId === c.id}
                          class:disabled={courses.some((r, j) => j !== i && r.courseId === c.id)}
                          onclick={() => { courses[i] = { ...courses[i], courseId: c.id }; courses = [...courses]; selectDD(`cc_${i}`, c.id, `${c.code} — ${c.title}`); }}>
                          <span class="code">{c.code}</span><span>{c.title}</span>
                          {#if c.level}<span class="muted">{c.level}L</span>{/if}
                        </button>
                      {/each}
                    </div>
                  </div>
                {/if}
                <input type="hidden" name="course_ids" value={row.courseId} />
              </div>

              <button type="button" class="rm-btn" onclick={() => { courses = courses.filter((_,j) => j !== i); }} title="Remove"><Trash2 size={13} /></button>
            </div>
          {/each}
        </div>

        <button type="button" class="add-btn" onclick={() => { courses = [...courses, { courseId: '', deptId: '' }]; }}>
          <Plus size={13} /> Add course
        </button>

        {#if hasDupe()}
          <div class="alert-err small"><AlertCircle size={12} /> Duplicate course selected.</div>
        {/if}
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
            <button type="button" class="icon-btn" onclick={() => { showPassword = !showPassword; }} title={showPassword ? 'Hide' : 'Reveal'}>
              {#if showPassword}<EyeOff size={14} />{:else}<Eye size={14} />{/if}
            </button>
            <button type="button" class="icon-btn" onclick={genPassword} title="Regenerate"><RefreshCw size={14} /></button>
            <button type="button" class="icon-btn copy" class:copied onclick={copyPassword}>
              {#if copied}<Check size={14} />{:else}<Copy size={14} />{/if}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="foot">
      <a href="/admin/users/create" class="btn-ghost">Cancel</a>
      <button type="submit" class="btn-primary" disabled={loading || !canSubmit} style="background:#6366f1">
        {#if loading}<RefreshCw size={13} class="spin" />{:else}<BookOpen size={13} />{/if}
        Create Lecturer
      </button>
    </div>
  </form>
</div>

<style>
  @import '../../_form.css';
  .role-pill { display:inline-flex;align-items:center;gap:.4rem;font-size:.75rem;font-weight:700;padding:.3rem .75rem;border-radius:2rem; }
  .course-list { display:flex;flex-direction:column;gap:.5rem;margin-bottom:.75rem; }
  .course-row { display:flex;align-items:flex-start;gap:.5rem; }
  .course-dept { flex:0 0 38%; }
  .course-course { flex:1; }
  .rm-btn { padding:.55rem;border:1px solid var(--color-border);border-radius:.5rem;background:none;color:#dc2626;cursor:pointer;flex-shrink:0;transition:background .15s; }
  .rm-btn:hover { background:rgba(220,38,38,.08); }
  .add-btn { display:inline-flex;align-items:center;gap:.35rem;padding:.4rem .875rem;background:rgba(99,102,241,.08);border:1px dashed rgba(99,102,241,.4);border-radius:.5rem;font-size:.78rem;font-weight:600;color:#6366f1;cursor:pointer;font-family:inherit;transition:all .15s; }
  .add-btn:hover { background:rgba(99,102,241,.15);border-style:solid; }
  @media(max-width:580px){ .course-row{flex-direction:column;} .course-dept,.course-course{width:100%;} }
</style>