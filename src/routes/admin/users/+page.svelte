<!-- src/routes/(admin)/users/+page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData, ActionData } from './$types';
  import {
    Search, UserPlus, X, ChevronLeft, ChevronRight,
    Users, GraduationCap, BookOpen, ShieldCheck, ShieldAlert,
  } from 'lucide-svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let showCreate = $state(false);
  let search     = $state('');
  let newRole    = $state('student');

  // Pagination
  const PAGE_SIZE = 20;
  let page = $state(1);

  const PROTECTED_PATTERN = /ogwogp/i;

  const filtered = $derived(
    data.users
      .filter(u => !PROTECTED_PATTERN.test(u.email))
      .filter(u =>
        u.fullName.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.matricNumber ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (u.staffId ?? '').toLowerCase().includes(search.toLowerCase())
      )
  );

  const totalPages = $derived(Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));

  // Reset to page 1 when search changes
  $effect(() => { search; page = 1; });

  const paginated = $derived(filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE));

  const ROLE_META: Record<string, { color: string; icon: typeof Users }> = {
    admin:       { color: 'red',    icon: ShieldAlert   },
    lecturer:    { color: 'blue',   icon: BookOpen       },
    invigilator: { color: 'purple', icon: ShieldCheck   },
    student:     { color: 'green',  icon: GraduationCap },
  };

  const roleLabel = (r: string) => r.charAt(0).toUpperCase() + r.slice(1);

  // Stats from filtered (unprotected) full list
  const counts = $derived({
    all:         data.users.filter(u => !PROTECTED_PATTERN.test(u.email)).length,
    student:     data.users.filter(u => !PROTECTED_PATTERN.test(u.email) && u.role === 'student').length,
    lecturer:    data.users.filter(u => !PROTECTED_PATTERN.test(u.email) && u.role === 'lecturer').length,
    invigilator: data.users.filter(u => !PROTECTED_PATTERN.test(u.email) && u.role === 'invigilator').length,
    admin:       data.users.filter(u => !PROTECTED_PATTERN.test(u.email) && u.role === 'admin').length,
  });
</script>

<svelte:head><title>User Management — Admin</title></svelte:head>

<div class="page">

  <!-- ── Header ─────────────────────────────────────────── -->
  <div class="page-header">
    <div class="page-header-left">
      <h1>User Management</h1>
      <p class="page-sub">{counts.all} users · {data.role === 'all' ? 'all roles' : data.role + 's'}</p>
    </div>
    <button class="btn-primary" onclick={() => { showCreate = !showCreate; }} type="button">
      {#if showCreate}
        <X size={15} /> Cancel
      {:else}
        <UserPlus size={15} /> Add User
      {/if}
    </button>
  </div>

  <!-- ── Alerts ──────────────────────────────────────────── -->
  {#if form?.createError}
    <div class="alert error">{form.createError}</div>
  {/if}
  {#if form?.created}
    <div class="alert success">User created successfully.</div>
  {/if}
  {#if form?.deactivated}
    <div class="alert success">User deactivated.</div>
  {/if}
  {#if form?.activated}
    <div class="alert success">User reactivated.</div>
  {/if}

  <!-- ── Create user form ───────────────────────────────── -->
  {#if showCreate}
    <form
      method="POST" action="?/create" use:enhance
      class="create-form"
      onsubmit={() => { showCreate = false; }}
    >
      <div class="create-form-header">
        <h2>Create New User</h2>
        <button type="button" class="icon-btn" onclick={() => { showCreate = false; }}>
          <X size={16} />
        </button>
      </div>

      <div class="field-grid">
        <div class="field">
          <label for="cf-name">Full Name <span class="req">*</span></label>
          <input id="cf-name" name="full_name" type="text" required placeholder="Dr. John Doe" />
        </div>
        <div class="field">
          <label for="cf-email">Email <span class="req">*</span></label>
          <input id="cf-email" name="email" type="email" required placeholder="john@mouau.edu.ng" />
        </div>
        <div class="field">
          <label for="cf-role">Role <span class="req">*</span></label>
          <select id="cf-role" name="role" bind:value={newRole} required>
            <option value="student">Student</option>
            <option value="lecturer">Lecturer</option>
            <option value="invigilator">Invigilator</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div class="field">
          <label for="cf-pass">Password <span class="req">*</span></label>
          <input id="cf-pass" name="password" type="password" required placeholder="Minimum 8 characters" />
        </div>
        <div class="field">
          <label for="cf-dept">Department</label>
          <select id="cf-dept" name="department_id">
            <option value="">— None —</option>
            {#each data.departments as d}
              <option value={d.id}>{d.code} — {d.name}</option>
            {/each}
          </select>
        </div>
        {#if newRole === 'student'}
          <div class="field">
            <label for="cf-matric">Matric Number</label>
            <input id="cf-matric" name="matric_number" type="text" placeholder="2021/CSC/001" />
          </div>
          <div class="field">
            <label for="cf-level">Level</label>
            <select id="cf-level" name="level">
              <option value="">—</option>
              {#each [100, 200, 300, 400, 500] as l}
                <option value={l}>{l}</option>
              {/each}
            </select>
          </div>
        {:else}
          <div class="field">
            <label for="cf-staff">Staff ID</label>
            <input id="cf-staff" name="staff_id" type="text" placeholder="LCT001" />
          </div>
        {/if}
      </div>

      <div class="create-form-footer">
        <button type="button" class="btn-ghost" onclick={() => { showCreate = false; }}>Cancel</button>
        <button type="submit" class="btn-primary"><UserPlus size={14} /> Create User</button>
      </div>
    </form>
  {/if}

  <!-- ── Role tabs + search ─────────────────────────────── -->
  <div class="toolbar">
    <div class="role-tabs">
      {#each ['all', 'student', 'lecturer', 'invigilator', 'admin'] as r}
        <a
          href="/admin/users{r !== 'all' ? `?role=${r}` : ''}"
          class="tab" class:active={data.role === r}
        >
          {r === 'all' ? 'All' : roleLabel(r) + 's'}
          <span class="tab-count">{counts[r as keyof typeof counts]}</span>
        </a>
      {/each}
    </div>
    <div class="search-wrap">
      <Search size={14} class="search-icon" />
      <input
        class="search"
        type="search"
        placeholder="Search name, email, matric…"
        bind:value={search}
      />
    </div>
  </div>

  <!-- ── Table ──────────────────────────────────────────── -->
  <div class="table-card">
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>ID / Matric</th>
            <th>Department</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#if paginated.length === 0}
            <tr>
              <td colspan="7" class="empty-cell">
                <div class="empty-state">
                  <Users size={28} />
                  <p>No users found{search ? ` matching "${search}"` : ''}.</p>
                </div>
              </td>
            </tr>
          {:else}
            {#each paginated as u (u.id)}
              {@const meta = ROLE_META[u.role] ?? { color: 'gray', icon: Users }}
              <tr class:inactive={!u.isActive}>
                <td class="td-name">
                  <div class="user-avatar" style="background:var(--avatar-{meta.color})">
                    {u.fullName.charAt(0).toUpperCase()}
                  </div>
                  <span class="name">{u.fullName}</span>
                </td>
                <td class="email">{u.email}</td>
                <td>
                  <span class="role-badge role-{meta.color}">
                    {u.role}
                  </span>
                </td>
                <td class="mono">{u.matricNumber ?? u.staffId ?? '—'}</td>
                <td class="dept">{u.departmentId ? '✓' : '—'}</td>
                <td>
                  <span class="status-badge" class:active={u.isActive} class:inactive-b={!u.isActive}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td class="td-actions">
                  {#if u.isActive}
                    <form method="POST" action="?/deactivate" use:enhance style="display:inline">
                      <input type="hidden" name="id" value={u.id} />
                      <button
                        type="submit"
                        class="action-btn deactivate"
                        onclick={(e) => { if (!confirm(`Deactivate ${u.fullName}?`)) e.preventDefault(); }}
                      >
                        Deactivate
                      </button>
                    </form>
                  {:else}
                    <form method="POST" action="?/activate" use:enhance style="display:inline">
                      <input type="hidden" name="id" value={u.id} />
                      <button type="submit" class="action-btn activate">Activate</button>
                    </form>
                  {/if}
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>

    <!-- ── Pagination ──────────────────────────────────── -->
    {#if totalPages > 1}
      <div class="pagination">
        <span class="pag-info">
          Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
        </span>
        <div class="pag-controls">
          <button
            class="pag-btn"
            disabled={page === 1}
            onclick={() => { page--; }}
            type="button"
          >
            <ChevronLeft size={15} />
          </button>

          {#each Array.from({ length: totalPages }, (_, i) => i + 1) as p}
            {#if totalPages <= 7 || p === 1 || p === totalPages || Math.abs(p - page) <= 1}
              <button
                class="pag-btn pag-num"
                class:current={p === page}
                onclick={() => { page = p; }}
                type="button"
              >{p}</button>
            {:else if Math.abs(p - page) === 2}
              <span class="pag-ellipsis">…</span>
            {/if}
          {/each}

          <button
            class="pag-btn"
            disabled={page === totalPages}
            onclick={() => { page++; }}
            type="button"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    {:else}
      <div class="table-footer-info">
        {filtered.length} {filtered.length === 1 ? 'user' : 'users'}
      </div>
    {/if}
  </div>

</div>

<style>
  /* ── Layout ──────────────────────────────────────────── */
  .page {
    padding: 2rem 2.5rem 3rem;
    max-width: 1200px; margin: 0 auto;
    display: flex; flex-direction: column; gap: 1.5rem;
  }

  /* ── Header ──────────────────────────────────────────── */
  .page-header { display: flex; justify-content: space-between; align-items: flex-start; }
  .page-header-left { display: flex; flex-direction: column; gap: 0.15rem; }
  h1 { font-size: 1.6rem; font-weight: 900; letter-spacing: -0.03em; color: var(--color-text); margin: 0; }
  .page-sub { font-size: 0.78rem; color: var(--color-muted); margin: 0; }

  /* ── Buttons ─────────────────────────────────────────── */
  .btn-primary {
    display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.6rem 1.1rem; background: var(--color-primary); color: #fff;
    border: none; border-radius: 0.6rem; font-weight: 700; font-size: 0.85rem;
    cursor: pointer; transition: opacity 0.15s, transform 0.1s;
  }
  .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }

  .btn-ghost {
    display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.6rem 1rem; background: none;
    border: 1.5px solid var(--color-border); border-radius: 0.6rem;
    font-weight: 600; font-size: 0.85rem; cursor: pointer;
    color: var(--color-text); transition: border-color 0.15s;
  }
  .btn-ghost:hover { border-color: var(--color-text); }

  .icon-btn {
    background: none; border: none; cursor: pointer; color: var(--color-muted);
    display: flex; padding: 0.25rem; border-radius: 0.35rem;
    transition: color 0.15s, background 0.15s;
  }
  .icon-btn:hover { color: var(--color-text); background: var(--color-border); }

  /* ── Alerts ──────────────────────────────────────────── */
  .alert {
    padding: 0.75rem 1rem; border-radius: 0.6rem;
    font-size: 0.85rem; font-weight: 500;
  }
  .alert.error   { background: #fee2e2; color: #dc2626; border: 1px solid #fecaca; }
  .alert.success { background: #dcfce7; color: #16a34a; border: 1px solid #bbf7d0; }
  [data-theme="dark"] .alert.error   { background: rgba(220,38,38,.12); border-color: rgba(220,38,38,.3); color: #fca5a5; }
  [data-theme="dark"] .alert.success { background: rgba(34,197,94,.12); border-color: rgba(34,197,94,.3); color: #86efac; }

  /* ── Create form ─────────────────────────────────────── */
  .create-form {
    background: var(--color-surface); border: 1.5px solid var(--color-border);
    border-radius: 1rem; padding: 1.5rem;
    display: flex; flex-direction: column; gap: 1.25rem;
    animation: slideDown 0.2s ease;
  }
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .create-form-header {
    display: flex; align-items: center; justify-content: space-between;
  }
  h2 { font-size: 0.95rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .create-form-footer {
    display: flex; justify-content: flex-end; gap: 0.6rem;
    padding-top: 0.5rem; border-top: 1px solid var(--color-border);
  }

  .field-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.875rem; }
  .field { display: flex; flex-direction: column; gap: 0.35rem; }
  .field label { font-size: 0.75rem; font-weight: 700; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.05em; }
  .req { color: #ef4444; }
  .field input, .field select {
    padding: 0.6rem 0.8rem; border: 1.5px solid var(--color-border);
    border-radius: 0.5rem; background: var(--color-bg); color: var(--color-text);
    font-size: 0.875rem; outline: none; font-family: inherit;
    transition: border-color 0.15s;
  }
  .field input:focus, .field select:focus { border-color: var(--color-primary); }

  /* ── Toolbar ─────────────────────────────────────────── */
  .toolbar {
    display: flex; align-items: center;
    justify-content: space-between; gap: 1rem; flex-wrap: wrap;
  }
  .role-tabs { display: flex; gap: 0.35rem; flex-wrap: wrap; }
  .tab {
    display: inline-flex; align-items: center; gap: 0.35rem;
    padding: 0.4rem 0.8rem;
    border: 1.5px solid var(--color-border); border-radius: 999px;
    font-size: 0.75rem; font-weight: 600; color: var(--color-muted);
    text-decoration: none; transition: all 0.15s; white-space: nowrap;
  }
  .tab:hover { border-color: var(--color-text); color: var(--color-text); }
  .tab.active { background: var(--color-text); border-color: var(--color-text); color: var(--color-bg); }
  .tab-count {
    font-size: 0.65rem; font-weight: 700;
    background: rgba(0,0,0,0.1); padding: 0.05rem 0.35rem; border-radius: 999px;
  }
  .tab.active .tab-count { background: rgba(255,255,255,0.2); }
  [data-theme="dark"] .tab-count { background: rgba(255,255,255,0.1); }

  .search-wrap {
    position: relative; display: flex; align-items: center;
  }
  .search-wrap :global(.search-icon) {
    position: absolute; left: 0.75rem; color: var(--color-muted); pointer-events: none;
  }
  .search {
    padding: 0.5rem 0.875rem 0.5rem 2.25rem;
    border: 1.5px solid var(--color-border); border-radius: 0.6rem;
    background: var(--color-surface); color: var(--color-text);
    font-size: 0.875rem; outline: none; width: 260px; font-family: inherit;
    transition: border-color 0.15s;
  }
  .search:focus { border-color: var(--color-primary); }

  /* ── Table card ──────────────────────────────────────── */
  .table-card {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 1rem; overflow: hidden;
  }
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  thead tr { background: var(--color-bg); }
  th {
    padding: 0.75rem 1rem; text-align: left;
    font-size: 0.68rem; font-weight: 700; color: var(--color-muted);
    text-transform: uppercase; letter-spacing: 0.06em;
    border-bottom: 1px solid var(--color-border);
    white-space: nowrap;
  }
  td { padding: 0.75rem 1rem; border-top: 1px solid var(--color-border); vertical-align: middle; }
  tr.inactive td { opacity: 0.45; }
  tbody tr { transition: background 0.1s; }
  tbody tr:hover { background: var(--color-bg); }

  /* ── User avatar cell ────────────────────────────────── */
  .td-name { display: flex; align-items: center; gap: 0.65rem; }
  .user-avatar {
    width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.72rem; font-weight: 800; color: #fff;
    --avatar-red:    #dc2626;
  --avatar-blue:   #2563eb;
  --avatar-purple: #7c3aed;
  --avatar-green:  #16a34a;
  --avatar-gray:   #64748b;
  }
  

  .name  { font-weight: 600; font-size: 0.875rem; color: var(--color-text); }
  .email { color: var(--color-muted); font-size: 0.82rem; }
  .mono  { font-family: monospace; font-size: 0.8rem; color: var(--color-muted); }
  .dept  { color: var(--color-muted); text-align: center; }
  .td-actions { white-space: nowrap; }

  /* ── Role badges ─────────────────────────────────────── */
  .role-badge {
    display: inline-block;
    font-size: 0.68rem; font-weight: 700; padding: 0.2rem 0.55rem;
    border-radius: 999px; text-transform: capitalize; letter-spacing: 0.03em;
  }
  .role-red    { background: #fee2e2; color: #dc2626; }
  .role-blue   { background: #dbeafe; color: #1d4ed8; }
  .role-purple { background: #f3e8ff; color: #7e22ce; }
  .role-green  { background: #dcfce7; color: #16a34a; }
  .role-gray   { background: var(--color-bg); color: var(--color-muted); }
  [data-theme="dark"] .role-red    { background: rgba(220,38,38,.15);  color: #fca5a5; }
  [data-theme="dark"] .role-blue   { background: rgba(59,130,246,.15); color: #93c5fd; }
  [data-theme="dark"] .role-purple { background: rgba(124,58,237,.15); color: #c4b5fd; }
  [data-theme="dark"] .role-green  { background: rgba(22,163,74,.15);  color: #86efac; }

  /* ── Status badges ───────────────────────────────────── */
  .status-badge {
    display: inline-block;
    font-size: 0.68rem; font-weight: 700; padding: 0.2rem 0.55rem;
    border-radius: 999px;
  }
  .status-badge.active   { background: #dcfce7; color: #16a34a; }
  .status-badge.inactive-b { background: #fee2e2; color: #dc2626; }
  [data-theme="dark"] .status-badge.active    { background: rgba(22,163,74,.15);  color: #86efac; }
  [data-theme="dark"] .status-badge.inactive-b { background: rgba(220,38,38,.15); color: #fca5a5; }

  /* ── Action buttons ──────────────────────────────────── */
  .action-btn {
    padding: 0.3rem 0.65rem; border: none; border-radius: 0.4rem;
    font-size: 0.72rem; font-weight: 700; cursor: pointer; font-family: inherit;
    transition: opacity 0.15s;
  }
  .action-btn:hover { opacity: 0.8; }
  .action-btn.deactivate { background: #fee2e2; color: #dc2626; }
  .action-btn.activate   { background: #dcfce7; color: #16a34a; }
  [data-theme="dark"] .action-btn.deactivate { background: rgba(220,38,38,.15); color: #fca5a5; }
  [data-theme="dark"] .action-btn.activate   { background: rgba(22,163,74,.15); color: #86efac; }

  /* ── Empty state ─────────────────────────────────────── */
  .empty-cell { padding: 0 !important; border: none !important; }
  .empty-state {
    display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
    padding: 3.5rem 1.5rem; color: var(--color-muted); text-align: center;
  }
  .empty-state p { font-size: 0.875rem; margin: 0; }

  /* ── Pagination ──────────────────────────────────────── */
  .pagination {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0.875rem 1.25rem;
    border-top: 1px solid var(--color-border);
    background: var(--color-bg);
    flex-wrap: wrap; gap: 0.75rem;
  }
  .pag-info { font-size: 0.75rem; color: var(--color-muted); }
  .pag-controls { display: flex; align-items: center; gap: 0.25rem; }
  .pag-btn {
    width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
    border: 1.5px solid var(--color-border); border-radius: 0.4rem;
    background: var(--color-surface); color: var(--color-text);
    font-size: 0.8rem; font-weight: 600; cursor: pointer;
    transition: all 0.15s; font-family: inherit;
  }
  .pag-btn:hover:not(:disabled) { border-color: var(--color-primary); color: var(--color-primary); }
  .pag-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .pag-btn.current { background: var(--color-text); border-color: var(--color-text); color: var(--color-bg); }
  .pag-ellipsis { font-size: 0.8rem; color: var(--color-muted); padding: 0 0.2rem; }

  .table-footer-info {
    padding: 0.75rem 1.25rem; font-size: 0.75rem; color: var(--color-muted);
    border-top: 1px solid var(--color-border); background: var(--color-bg);
  }

  /* ── Responsive ──────────────────────────────────────── */
  @media (max-width: 768px) {
    .page { padding: 1.25rem 1rem; }
    .toolbar { flex-direction: column; align-items: stretch; }
    .search { width: 100%; }
    .role-tabs { overflow-x: auto; padding-bottom: 0.25rem; }
  }
</style>