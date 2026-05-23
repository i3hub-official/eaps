<!-- src/routes/(admin)/users/+page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let showCreate = $state(false);
  let filterRole = $state(data.role);
  let search     = $state('');
  let newRole    = $state('student');

  const filtered = $derived(data.users.filter(u =>
    u.fullName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.matricNumber ?? '').toLowerCase().includes(search.toLowerCase())
  ));

  const ROLE_COLORS: Record<string, string> = {
    admin: 'red', lecturer: 'blue', invigilator: 'purple', student: 'green',
  };
</script>

<svelte:head><title>Users — Admin</title></svelte:head>

<div class="page">
  <div class="page-header">
    <h1>User Management</h1>
    <button class="btn-primary" onclick={() => { showCreate = !showCreate; }} type="button">
      {showCreate ? '✕ Cancel' : '+ Add User'}
    </button>
  </div>

  {#if form?.createError}
    <div class="alert error">{form.createError}</div>
  {/if}
  {#if form?.created}
    <div class="alert success">User created successfully.</div>
  {/if}

  <!-- Create user form -->
  {#if showCreate}
    <form method="POST" action="?/create" use:enhance class="create-form"
      onsubmit={() => { showCreate = false; }}>
      <h2>Create User</h2>
      <div class="field-grid">
        <div class="field">
          <label>Full Name *</label>
          <input name="full_name" type="text" required placeholder="Dr. John Doe" />
        </div>
        <div class="field">
          <label>Email *</label>
          <input name="email" type="email" required placeholder="john@mouau.edu.ng" />
        </div>
        <div class="field">
          <label>Role *</label>
          <select name="role" bind:value={newRole} required>
            <option value="student">Student</option>
            <option value="lecturer">Lecturer</option>
            <option value="invigilator">Invigilator</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div class="field">
          <label>Password *</label>
          <input name="password" type="password" required placeholder="Minimum 8 characters" />
        </div>
        <div class="field">
          <label>Department</label>
          <select name="department_id">
            <option value="">— None —</option>
            {#each data.departments as d}
              <option value={d.id}>{d.code} — {d.name}</option>
            {/each}
          </select>
        </div>
        {#if newRole === 'student'}
          <div class="field">
            <label>Matric Number</label>
            <input name="matric_number" type="text" placeholder="2021/CSC/001" />
          </div>
          <div class="field">
            <label>Level</label>
            <select name="level">
              <option value="">—</option>
              {#each [100,200,300,400,500] as l}
                <option value={l}>{l}</option>
              {/each}
            </select>
          </div>
        {:else}
          <div class="field">
            <label>Staff ID</label>
            <input name="staff_id" type="text" placeholder="LCT001" />
          </div>
        {/if}
      </div>
      <button type="submit" class="btn-primary">Create User</button>
    </form>
  {/if}

  <!-- Filters -->
  <div class="filters">
    <input class="search" type="search" placeholder="Search name, email, matric…" bind:value={search} />
    <div class="role-tabs">
      {#each ['all','student','lecturer','invigilator','admin'] as r}
        <a
          href="/admin/users{r !== 'all' ? `?role=${r}` : ''}"
          class="tab" class:active={filterRole === r}
        >{r === 'all' ? 'All' : r.charAt(0).toUpperCase() + r.slice(1)}s</a>
      {/each}
    </div>
  </div>

  <!-- Table -->
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Role</th>
          <th>Matric / Staff ID</th>
          <th>Department</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {#if filtered.length === 0}
          <tr><td colspan="7" class="empty">No users found.</td></tr>
        {:else}
          {#each filtered as u}
            <tr class:inactive={!u.isActive}>
              <td class="name">{u.fullName}</td>
              <td class="email">{u.email}</td>
              <td>
                <span class="role-badge {ROLE_COLORS[u.role]}">{u.role}</span>
              </td>
              <td class="mono">{u.matricNumber ?? u.staffId ?? '—'}</td>
              <td>{u.departmentId ? '✓' : '—'}</td>
              <td>
                <span class="status-badge" class:active={u.isActive} class:inactive-badge={!u.isActive}>
                  {u.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td>
                {#if u.isActive}
                  <form method="POST" action="?/deactivate" use:enhance style="display:inline">
                    <input type="hidden" name="id" value={u.id} />
                    <button type="submit" class="action-btn deactivate"
                      onclick={(e) => { if (!confirm('Deactivate this user?')) e.preventDefault(); }}>
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
</div>

<style>
  .page { padding: 2rem; max-width: 1100px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.25rem; }
  .page-header { display: flex; justify-content: space-between; align-items: center; }
  h1 { font-size: 1.4rem; font-weight: 700; margin: 0; }

  .btn-primary {
    padding: 0.6rem 1.25rem; background: var(--color-primary); color: #fff;
    border: none; border-radius: 0.5rem; font-weight: 600; font-size: 0.9rem; cursor: pointer;
  }

  .alert { padding: 0.75rem 1rem; border-radius: 0.5rem; font-size: 0.875rem; }
  .alert.error   { background: #fee2e2; color: #dc2626; }
  .alert.success { background: #dcfce7; color: #16a34a; }

  .create-form {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.75rem; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem;
  }
  h2 { font-size: 1rem; font-weight: 700; margin: 0; }
  .field-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.875rem; }
  .field { display: flex; flex-direction: column; gap: 0.35rem; }
  .field label { font-size: 0.82rem; font-weight: 500; }
  .field input, .field select {
    padding: 0.55rem 0.75rem; border: 1px solid var(--color-border);
    border-radius: 0.4rem; background: var(--color-bg); color: var(--color-text);
    font-size: 0.875rem; outline: none;
  }
  .field input:focus, .field select:focus { border-color: var(--color-primary); }

  .filters { display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; }
  .search {
    padding: 0.45rem 0.875rem; border: 1px solid var(--color-border);
    border-radius: 0.5rem; background: var(--color-bg); color: var(--color-text);
    font-size: 0.875rem; outline: none; width: 240px;
  }
  .role-tabs { display: flex; gap: 0.35rem; }
  .tab {
    padding: 0.35rem 0.75rem; border: 1px solid var(--color-border);
    border-radius: 999px; font-size: 0.75rem; font-weight: 500;
    color: var(--color-muted); text-decoration: none; transition: all 0.15s;
  }
  .tab:hover, .tab.active { background: var(--color-primary); border-color: var(--color-primary); color: #fff; }

  .table-wrap { overflow-x: auto; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; }
  table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  th { padding: 0.75rem 1rem; text-align: left; font-size: 0.72rem; font-weight: 600; color: var(--color-muted); text-transform: uppercase; background: var(--color-bg); }
  td { padding: 0.75rem 1rem; border-top: 1px solid var(--color-border); }
  tr.inactive td { opacity: 0.5; }

  .name  { font-weight: 500; }
  .email { color: var(--color-muted); }
  .mono  { font-family: monospace; font-size: 0.82rem; }

  .role-badge {
    font-size: 0.7rem; font-weight: 600; padding: 0.2rem 0.5rem; border-radius: 999px;
  }
  .role-badge.red    { background: #fee2e2; color: #dc2626; }
  .role-badge.blue   { background: #dbeafe; color: #1d4ed8; }
  .role-badge.purple { background: #f3e8ff; color: #7e22ce; }
  .role-badge.green  { background: #dcfce7; color: #16a34a; }

  .status-badge { font-size: 0.72rem; font-weight: 600; padding: 0.2rem 0.5rem; border-radius: 999px; }
  .status-badge.active        { background: #dcfce7; color: #16a34a; }
  .status-badge.inactive-badge { background: #fee2e2; color: #dc2626; }

  .action-btn {
    padding: 0.3rem 0.7rem; border: none; border-radius: 0.35rem;
    font-size: 0.75rem; font-weight: 600; cursor: pointer;
  }
  .action-btn.deactivate { background: #fee2e2; color: #dc2626; }
  .action-btn.activate   { background: #dcfce7; color: #16a34a; }

  .empty { text-align: center; color: var(--color-muted); padding: 2rem; }
</style>