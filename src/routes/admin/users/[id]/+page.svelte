<!-- src/routes/admin/users/[id]/+page.svelte -->
<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import {
    User, Mail, Phone, GraduationCap, BookOpen, Shield, ShieldCheck,
    AlertTriangle, CheckCircle, Edit, Lock, UserX, UserCheck,
    Trash2, Eye, ClipboardList, Bell, Activity, Calendar, Hash
  } from 'lucide-svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  const { user } = data;

  let activeTab = $state<'profile'|'sessions'|'exams'>('profile');
  let editMode = $state(false);
  let showDelete = $state(false);
  let showResetPw = $state(false);
  let collegeId = $state(String(user.collegeId ?? ''));

  const filteredDepts = $derived(
    collegeId
      ? data.departments.filter(d => String(d.collegeId) === collegeId)
      : data.departments
  );

  const roleIcon = { student: GraduationCap, lecturer: BookOpen, invigilator: ShieldCheck, admin: Shield }[user.role];
  const roleColor = { student: 'role-student', lecturer: 'role-lecturer', invigilator: 'role-invig', admin: 'role-admin' }[user.role];

  function fmt(d: Date | string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });
  }
</script>

<div class="user-detail">

  <!-- Profile card -->
  <div class="profile-card">
    <div class="pc-avatar">{user.fullName.charAt(0).toUpperCase()}</div>
    <div class="pc-info">
      <div class="pc-name">{user.fullName}</div>
      <div class="pc-email">{user.email}</div>
      <div class="pc-badges">
        <span class="role-badge {roleColor}"><roleIcon size={12} /> {user.role}</span>
        {#if user.isSuspended}
          <span class="flag-badge flag-suspended">Suspended</span>
        {:else if !user.isActive}
          <span class="flag-badge flag-inactive">Inactive</span>
        {:else}
          <span class="flag-badge flag-active">Active</span>
        {/if}
      </div>
    </div>
    <div class="pc-stats">
      <div class="pc-stat"><Hash size={13} /><span>{user._count.examSessions}</span><label>Sessions</label></div>
      <div class="pc-stat"><ClipboardList size={13} /><span>{user._count.createdExams}</span><label>Exams</label></div>
      <div class="pc-stat"><Activity size={13} /><span>{user._count.auditLogs}</span><label>Audit logs</label></div>
    </div>
    <div class="pc-actions">
      <button class="btn-outline" onclick={() => editMode = !editMode}>
        <Edit size={13} /> {editMode ? 'Cancel' : 'Edit Profile'}
      </button>
      <button class="btn-outline btn-outline-yellow" onclick={() => showResetPw = true}>
        <Lock size={13} /> Reset Password
      </button>
      {#if user.isSuspended}
        <form method="POST" action="?/unsuspend" use:enhance>
          <button type="submit" class="btn-outline btn-outline-green"><UserCheck size={13} /> Unsuspend</button>
        </form>
      {:else}
        <form method="POST" action="?/suspend" use:enhance>
          <button type="submit" class="btn-outline btn-outline-orange"><UserX size={13} /> Suspend</button>
        </form>
      {/if}
      {#if user.isActive}
        <form method="POST" action="?/deactivate" use:enhance>
          <button type="submit" class="btn-outline btn-outline-red"><UserX size={13} /> Deactivate</button>
        </form>
      {:else}
        <form method="POST" action="?/activate" use:enhance>
          <button type="submit" class="btn-outline btn-outline-green"><UserCheck size={13} /> Activate</button>
        </form>
      {/if}
      <button class="btn-outline btn-outline-red" onclick={() => showDelete = true}>
        <Trash2 size={13} /> Delete
      </button>
    </div>
  </div>

  <!-- Feedback -->
  {#if form?.success}<div class="toast toast-ok"><CheckCircle size={14} /> {form.message ?? 'Done.'}</div>{/if}
  {#if form?.error}  <div class="toast toast-err"><AlertTriangle size={14} /> {form.error}</div>{/if}

  <!-- Tabs -->
  <div class="tabs">
    {#each [
      { key: 'profile', label: 'Profile',  icon: User },
      { key: 'sessions',label: `Sessions (${user._count.examSessions})`, icon: ClipboardList },
      ...(user.role === 'lecturer' ? [{ key: 'exams', label: `Exams (${user._count.createdExams})`, icon: BookOpen }] : []),
    ] as tab}
      <button class="tab" class:tab-active={activeTab === tab.key} onclick={() => activeTab = tab.key as any}>
        <tab.icon size={14} /> {tab.label}
      </button>
    {/each}
  </div>

  <!-- Profile tab -->
  {#if activeTab === 'profile'}
    {#if editMode}
      <form method="POST" action="?/update" use:enhance class="edit-card">
        <div class="card-head"><Edit size={15} /> Edit Profile</div>
        <div class="form-grid">
          <div class="field-half">
            <label for="fullName">Full Name</label>
            <input id="fullName" name="fullName" value={user.fullName} />
          </div>
          <div class="field-half">
            <label for="email">Email</label>
            <input id="email" name="email" type="email" value={user.email} />
          </div>
          <div class="field-half">
            <label for="phone">Phone</label>
            <input id="phone" name="phone" value={user.phone ?? ''} />
          </div>

          {#if user.role !== 'admin'}
            <div class="field-half">
              <label for="collegeId">College</label>
              <select id="collegeId" name="collegeId" bind:value={collegeId}>
                <option value="">—</option>
                {#each data.colleges as c}<option value={String(c.id)}>{c.name}</option>{/each}
              </select>
            </div>
            <div class="field-half">
              <label for="deptId">Department</label>
              <select id="deptId" name="departmentId">
                <option value="">—</option>
                {#each filteredDepts as d}<option value={d.id} selected={user.departmentId === d.id}>{d.name}</option>{/each}
              </select>
            </div>
          {/if}

          {#if user.role === 'student'}
            <div class="field-third">
              <label for="matric">Matric Number</label>
              <input id="matric" name="matricNumber" value={user.matricNumber ?? ''} />
            </div>
            <div class="field-third">
              <label for="level">Level</label>
              <select id="level" name="level">
                <option value="">—</option>
                {#each [100,200,300,400,500,600] as l}<option value={l} selected={user.level === l}>{l}</option>{/each}
              </select>
            </div>
            <div class="field-third">
              <label for="session">Session</label>
              <input id="session" name="session" value={user.session ?? ''} />
            </div>
          {/if}

          {#if user.role === 'lecturer' || user.role === 'invigilator'}
            <div class="field-half">
              <label for="staffId">Staff ID</label>
              <input id="staffId" name="staffId" value={user.staffId ?? ''} />
            </div>
          {/if}
        </div>
        <div class="card-foot">
          <button type="button" class="btn-ghost" onclick={() => editMode = false}>Cancel</button>
          <button type="submit" class="btn-primary">Save Changes</button>
        </div>
      </form>
    {:else}
      <div class="info-card">
        <div class="card-head"><User size={15} /> Profile Details</div>
        <div class="info-grid">
          <div class="ig-row"><Mail size={13} /><span class="ig-lbl">Email</span><span>{user.email}</span></div>
          <div class="ig-row"><Phone size={13} /><span class="ig-lbl">Phone</span><span>{user.phone ?? '—'}</span></div>
          <div class="ig-row"><GraduationCap size={13} /><span class="ig-lbl">College</span><span>{user.college?.name ?? '—'}</span></div>
          <div class="ig-row"><BookOpen size={13} /><span class="ig-lbl">Department</span><span>{user.department?.name ?? '—'}</span></div>
          {#if user.matricNumber}<div class="ig-row"><Hash size={13} /><span class="ig-lbl">Matric No</span><span>{user.matricNumber}</span></div>{/if}
          {#if user.staffId}<div class="ig-row"><Hash size={13} /><span class="ig-lbl">Staff ID</span><span>{user.staffId}</span></div>{/if}
          {#if user.jambRegNo}<div class="ig-row"><Hash size={13} /><span class="ig-lbl">JAMB Reg</span><span>{user.jambRegNo}</span></div>{/if}
          {#if user.level}<div class="ig-row"><Activity size={13} /><span class="ig-lbl">Level</span><span>{user.level}</span></div>{/if}
          {#if user.session}<div class="ig-row"><Calendar size={13} /><span class="ig-lbl">Session</span><span>{user.session}</span></div>{/if}
          <div class="ig-row"><Calendar size={13} /><span class="ig-lbl">Joined</span><span>{fmt(user.createdAt)}</span></div>
          {#if user.isSuspended}
            <div class="ig-row"><AlertTriangle size={13} class="ig-warn" /><span class="ig-lbl">Suspended</span><span class="warn-text">{fmt(user.suspendedAt)}</span></div>
          {/if}
        </div>
      </div>
    {/if}

  <!-- Sessions tab -->
  {:else if activeTab === 'sessions'}
    <div class="table-card">
      <table class="data-table">
        <thead><tr><th>Exam</th><th>Status</th><th>Score</th><th>Grade</th></tr></thead>
        <tbody>
          {#each user.examSessions as sess}
            <tr>
              <td>
                <div class="s-exam">{sess.exam.title}</div>
                <div class="s-course">{sess.exam.course.code}</div>
              </td>
              <td><span class="mini-badge">{sess.status.replace(/_/g,' ')}</span></td>
              <td>{sess.examResult?.percentage != null ? `${Number(sess.examResult.percentage).toFixed(1)}%` : '—'}</td>
              <td>{sess.examResult?.grade ?? '—'}</td>
            </tr>
          {/each}
          {#if user.examSessions.length === 0}
            <tr><td colspan="4" class="empty-row">No exam sessions found</td></tr>
          {/if}
        </tbody>
      </table>
    </div>

  <!-- Exams tab (lecturer only) -->
  {:else if activeTab === 'exams'}
    <div class="table-card">
      <table class="data-table">
        <thead><tr><th>Exam</th><th>Course</th><th>Status</th></tr></thead>
        <tbody>
          {#each user.createdExams as exam}
            <tr>
              <td><a href="/admin/exams/{exam.id}" class="exam-link">{exam.title}</a></td>
              <td>{exam.course.code}</td>
              <td><span class="mini-badge">{exam.status}</span></td>
            </tr>
          {/each}
          {#if user.createdExams.length === 0}
            <tr><td colspan="3" class="empty-row">No exams created</td></tr>
          {/if}
        </tbody>
      </table>
    </div>
  {/if}

</div>

<!-- Reset password modal -->
{#if showResetPw}
  <div class="modal-bg" onclick={() => showResetPw = false} role="dialog">
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <Lock size={26} class="modal-icon" />
      <h2>Reset Password</h2>
      <p>Set a new password for <strong>{user.fullName}</strong>.</p>
      <form method="POST" action="?/resetPassword" use:enhance style="width:100%;display:flex;flex-direction:column;gap:.75rem;">
        <input name="newPassword" type="password" placeholder="New password (min. 8 chars)" minlength="8" required class="modal-input" />
        <div class="modal-btns">
          <button type="button" class="btn-ghost" onclick={() => showResetPw = false}>Cancel</button>
          <button type="submit" class="btn-primary">Reset Password</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Delete confirm -->
{#if showDelete}
  <div class="modal-bg" onclick={() => showDelete = false} role="dialog">
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <AlertTriangle size={28} class="modal-warn" />
      <h2>Delete User?</h2>
      <p>This will permanently delete <strong>{user.fullName}</strong> and all their data. This action cannot be undone.</p>
      <div class="modal-btns">
        <button class="btn-ghost" onclick={() => showDelete = false}>Cancel</button>
        <form method="POST" action="?/delete" use:enhance style="flex:1;display:flex;">
          <button type="submit" class="btn-danger" style="flex:1;">Delete</button>
        </form>
      </div>
    </div>
  </div>
{/if}

<style>
  .user-detail { display: flex; flex-direction: column; gap: 1.25rem; }

  /* Profile card */
  .profile-card {
    display: flex; align-items: center; gap: 1.25rem; flex-wrap: wrap;
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: .875rem; padding: 1.25rem 1.5rem;
  }
  
  .pc-avatar { 
    width: 56px; height: 56px; border-radius: 50%; 
    background: linear-gradient(135deg, var(--avatar-start), var(--avatar-end)); 
    display: flex; align-items: center; justify-content: center; 
    font-weight: 800; font-size: 1.4rem; color: white; flex-shrink: 0; 
  }
  
  .pc-info { flex: 1; min-width: 0; }
  .pc-name  { font-size: 1.05rem; font-weight: 800; color: var(--color-text); }
  .pc-email { font-size: .8rem; color: var(--color-muted); margin-top: .2rem; }
  .pc-badges { display: flex; gap: .5rem; margin-top: .5rem; flex-wrap: wrap; }
  
  .role-badge { 
    display: inline-flex; align-items: center; gap: .3rem; 
    font-size: .68rem; font-weight: 700; padding: .25rem .625rem; 
    border-radius: 2rem; text-transform: capitalize; 
  }
  .role-student  { background: rgba(59,130,246,.12); color: #3b82f6; }
  .role-lecturer { background: rgba(99,102,241,.12); color: #6366f1; }
  .role-invig    { background: rgba(249,115,22,.12); color: #f97316; }
  .role-admin    { background: rgba(59,130,246,.12); color: #3b82f6; }
  
  .flag-badge { font-size: .68rem; font-weight: 700; padding: .25rem .625rem; border-radius: 2rem; }
  .flag-active   { background: rgba(22,163,74,.12);  color: #16a34a; }
  .flag-suspended{ background: rgba(234,179,8,.12);  color: #ca8a04; }
  .flag-inactive { background: rgba(107,114,128,.12);color: #6b7280; }

  .pc-stats { display: flex; gap: 1.5rem; }
  .pc-stat { display: flex; flex-direction: column; align-items: center; gap: .2rem; font-size: .7rem; color: var(--color-muted); }
  .pc-stat span { font-size: 1rem; font-weight: 700; color: var(--color-text); }
  .pc-stat :global(svg) { color: var(--color-muted); }
  .pc-actions { display: flex; gap: .5rem; flex-wrap: wrap; }

  /* Buttons */
  .btn-outline {
    display: flex; align-items: center; gap: .375rem; padding: .4rem .875rem;
    border: 1px solid var(--color-border); border-radius: .5rem; background: none;
    font-size: .75rem; font-weight: 600; cursor: pointer; font-family: inherit; color: var(--color-text); transition: all .15s;
  }
  .btn-outline:hover { background: var(--color-surface-hover); }
  .btn-outline-green:hover { border-color: #16a34a; color: #16a34a; }
  .btn-outline-yellow:hover{ border-color: #ca8a04; color: #ca8a04; }
  .btn-outline-orange:hover{ border-color: #f97316; color: #f97316; }
  .btn-outline-red:hover   { border-color: #dc2626; color: #dc2626; }
  
  .btn-primary { 
    display: flex; align-items: center; gap: .5rem; padding: .6rem 1.25rem; 
    background: #3b82f6; color: white; border: none; border-radius: .5rem; 
    font-size: .85rem; font-weight: 600; cursor: pointer; font-family: inherit; 
  }
  .btn-primary:hover { background: #1d4ed8; }
  
  .btn-ghost { 
    display: flex; align-items: center; gap: .5rem; padding: .6rem 1.25rem; 
    background: transparent; border: 1px solid var(--color-border); 
    color: var(--color-text); border-radius: .5rem; font-size: .85rem; 
    font-weight: 600; cursor: pointer; font-family: inherit; 
  }
  .btn-ghost:hover { background: var(--color-surface-hover); }
  
  .btn-danger { 
    padding: .6rem; background: #dc2626; border: none; border-radius: .5rem; 
    color: white; font-size: .85rem; font-weight: 600; cursor: pointer; font-family: inherit; 
  }

  /* Toast */
  .toast { display: flex; align-items: center; gap: .5rem; padding: .75rem 1rem; border-radius: .625rem; font-size: .82rem; }
  .toast-ok  { background: rgba(22,163,74,.08);  border: 1px solid rgba(22,163,74,.25);  color: #16a34a; }
  .toast-err { background: rgba(220,38,38,.08);  border: 1px solid rgba(220,38,38,.25);  color: #dc2626; }

  /* Tabs */
  .tabs { display: flex; gap: .375rem; border-bottom: 2px solid var(--color-border); }
  .tab { 
    display: flex; align-items: center; gap: .375rem; padding: .6rem 1rem; 
    background: none; border: none; border-bottom: 2px solid transparent; 
    margin-bottom: -2px; font-size: .82rem; font-weight: 600; 
    color: var(--color-muted); cursor: pointer; font-family: inherit; 
  }
  .tab:hover { color: var(--color-text); }
  .tab-active { color: #3b82f6; border-bottom-color: #3b82f6; }

  /* Info card */
  .info-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: .875rem; overflow: hidden; }
  .card-head { 
    padding: .875rem 1.25rem; border-bottom: 1px solid var(--color-border); 
    font-size: .85rem; font-weight: 700; color: var(--color-text); 
    background: var(--color-bg); display: flex; align-items: center; gap: .5rem; 
  }
  .info-grid { display: flex; flex-direction: column; padding: .5rem 0; }
  .ig-row { display: flex; align-items: center; gap: .75rem; padding: .625rem 1.25rem; font-size: .82rem; }
  .ig-row:hover { background: var(--color-surface-hover); }
  .ig-row :global(svg) { color: var(--color-muted); flex-shrink: 0; }
  .ig-lbl { color: var(--color-muted); min-width: 100px; font-size: .75rem; }
  .warn-text { color: #ca8a04; font-weight: 600; }
  :global(.ig-warn) { color: #ca8a04 !important; }

  /* Edit card */
  .edit-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: .875rem; overflow: hidden; display: flex; flex-direction: column; }
  .form-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 1rem; padding: 1.25rem; }
  .field-half  { grid-column: span 6; }
  .field-third { grid-column: span 4; }
  label { display: block; font-size: .78rem; font-weight: 600; color: var(--color-text); margin-bottom: .375rem; }
  input, select { 
    width: 100%; padding: .6rem .875rem; background: var(--color-bg); 
    border: 1px solid var(--color-border); border-radius: .5rem; 
    font-size: .82rem; color: var(--color-text); font-family: inherit; 
    outline: none; -webkit-appearance: none; transition: border-color .15s; 
  }
  input:focus, select:focus { border-color: #3b82f6; }
  .card-foot { display: flex; justify-content: flex-end; gap: .75rem; padding: 1rem 1.25rem; border-top: 1px solid var(--color-border); background: var(--color-bg); }

  /* Table */
  .table-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: .875rem; overflow: hidden; }
  .data-table { width: 100%; border-collapse: collapse; }
  .data-table th { 
    padding: .75rem 1rem; background: var(--color-bg); font-size: .7rem; 
    font-weight: 700; text-transform: uppercase; letter-spacing: .05em; 
    color: var(--color-muted); text-align: left; border-bottom: 1px solid var(--color-border); 
  }
  .data-table td { padding: .75rem 1rem; border-bottom: 1px solid var(--color-border); font-size: .82rem; vertical-align: middle; }
  .data-table tr:last-child td { border-bottom: none; }
  .s-exam { font-weight: 600; color: var(--color-text); }
  .s-course { font-size: .7rem; color: var(--color-muted); }
  .mini-badge { 
    font-size: .68rem; font-weight: 700; padding: .2rem .5rem; 
    border-radius: 2rem; background: var(--color-bg); border: 1px solid var(--color-border); 
    color: var(--color-muted); text-transform: capitalize; white-space: nowrap; 
  }
  .exam-link { color: #3b82f6; text-decoration: none; font-weight: 600; }
  .exam-link:hover { text-decoration: underline; }
  .empty-row { text-align: center; color: var(--color-muted); padding: 2rem; }

  /* Modal */
  .modal-bg { 
    position: fixed; inset: 0; background: rgba(0,0,0,.55); 
    backdrop-filter: blur(4px); z-index: 200; display: flex; 
    align-items: center; justify-content: center; padding: 1rem; 
  }
  .modal { 
    background: var(--color-surface); border: 1px solid var(--color-border); 
    border-radius: 1rem; padding: 2rem 1.75rem 1.5rem; width: 100%; 
    max-width: 400px; display: flex; flex-direction: column; 
    align-items: center; gap: .875rem; box-shadow: 0 20px 60px rgba(0,0,0,.25); 
  }
  .modal :global(.modal-icon) { color: #ca8a04; }
  .modal :global(.modal-warn) { color: #dc2626; }
  .modal h2 { font-size: 1.05rem; font-weight: 700; color: var(--color-text); }
  .modal p { font-size: .82rem; color: var(--color-muted); text-align: center; line-height: 1.5; }
  .modal-btns { display: flex; gap: .625rem; width: 100%; }
  .modal-input { 
    width: 100%; padding: .6rem .875rem; background: var(--color-bg); 
    border: 1px solid var(--color-border); border-radius: .5rem; 
    font-size: .82rem; color: var(--color-text); font-family: inherit; outline: none; 
  }
  .modal-input:focus { border-color: #3b82f6; }

  @media (max-width: 640px) {
    .profile-card { flex-direction: column; align-items: flex-start; }
    .field-half, .field-third { grid-column: span 12; }
  }
</style>