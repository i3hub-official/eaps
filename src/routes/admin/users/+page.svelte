<!-- src/routes/(admin)/users/+page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData, ActionData } from './$types';
  import {
    Search, UserPlus, X, ChevronLeft, ChevronRight,
    Users, GraduationCap, BookOpen, ShieldCheck, ShieldAlert,
    Building2, Mail, IdCard, AlertCircle
  } from 'lucide-svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let showCreate = $state(false);
  let search = $state('');
  let newRole = $state('student');
  
  // Modal states
  let selectedUser = $state<any>(null);
  let showProfileModal = $state(false);
  let showDeactivateModal = $state(false);
  let userToDeactivate = $state<any>(null);
  
  // Pagination
  const PAGE_SIZE = 10;
  let currentPage = $state(1);

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
  const startItem = $derived((currentPage - 1) * PAGE_SIZE + 1);
  const endItem = $derived(Math.min(currentPage * PAGE_SIZE, filtered.length));

  $effect(() => { search; currentPage = 1; });

  const paginated = $derived(filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE));

  const ROLE_META: Record<string, { color: string; icon: any; bg: string }> = {
    admin: { color: '#dc2626', icon: ShieldAlert, bg: '#fee2e2' },
    lecturer: { color: '#7c3aed', icon: BookOpen, bg: '#f3e8ff' },
    invigilator: { color: '#f59e0b', icon: ShieldCheck, bg: '#fef3c7' },
    student: { color: '#16a34a', icon: GraduationCap, bg: '#dcfce7' },
  };

  const roleLabel = (r: string) => r.charAt(0).toUpperCase() + r.slice(1);

  const counts = $derived({
    all: data.users.length,
    student: data.users.filter(u => u.role === 'student').length,
    lecturer: data.users.filter(u => u.role === 'lecturer').length,
    invigilator: data.users.filter(u => u.role === 'invigilator').length,
    admin: data.users.filter(u => u.role === 'admin').length,
  });

  function openProfile(user: any) {
    selectedUser = user;
    showProfileModal = true;
  }

  function openDeactivateModal(user: any) {
    userToDeactivate = user;
    showDeactivateModal = true;
  }

  function closeModals() {
    showProfileModal = false;
    showDeactivateModal = false;
    selectedUser = null;
    userToDeactivate = null;
  }
  
  function getRoleMeta(role: string) {
    return ROLE_META[role] || { color: '#64748b', icon: Users, bg: '#e2e8f0' };
  }
</script>

<svelte:head><title>User Management — MOUAU eTest Admin</title></svelte:head>

<div class="page">

  <!-- Header -->
  <div class="page-header">
    <div>
      <h1>User Management</h1>
      <p class="page-sub">{counts.all} total users</p>
    </div>
    <button class="btn-primary" onclick={() => { showCreate = !showCreate; }} type="button">
      {#if showCreate}
        <X size={16} /> Cancel
      {:else}
        <UserPlus size={16} /> Add User
      {/if}
    </button>
  </div>

  <!-- Alerts -->
  {#if form?.createError}
    <div class="alert error">
      <AlertCircle size={14} />
      <span>{form.createError}</span>
    </div>
  {/if}
  {#if form?.deactivateError}
    <div class="alert error">
      <AlertCircle size={14} />
      <span>{form.deactivateError}</span>
    </div>
  {/if}
  {#if form?.created}
    <div class="alert success">
      <span>✓</span>
      <span>User created successfully.</span>
    </div>
  {/if}
  {#if form?.deactivated}
    <div class="alert success">
      <span>✓</span>
      <span>User deactivated.</span>
    </div>
  {/if}
  {#if form?.activated}
    <div class="alert success">
      <span>✓</span>
      <span>User reactivated.</span>
    </div>
  {/if}

  <!-- Create user form -->
  {#if showCreate}
    <form method="POST" action="?/create" use:enhance class="create-form">
      <div class="create-form-header">
        <h2>Create New User</h2>
        <button type="button" class="icon-btn" onclick={() => { showCreate = false; }}>
          <X size={18} />
        </button>
      </div>

      <div class="field-grid">
        <div class="field">
          <label>Full Name <span class="req">*</span></label>
          <input name="full_name" type="text" required placeholder="John Doe" />
        </div>
        <div class="field">
          <label>Email <span class="req">*</span></label>
          <input name="email" type="email" required placeholder="john@mouau.edu.ng" />
        </div>
        <div class="field">
          <label>Role <span class="req">*</span></label>
          <select name="role" bind:value={newRole} required>
            <option value="student">Student</option>
            <option value="lecturer">Lecturer</option>
            <option value="invigilator">Invigilator</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div class="field">
          <label>Password <span class="req">*</span></label>
          <input name="password" type="password" required placeholder="Min. 8 characters" />
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
              <option value="">— Select —</option>
              {#each [100, 200, 300, 400, 500] as l}
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

      <div class="create-form-footer">
        <button type="button" class="btn-ghost" onclick={() => { showCreate = false; }}>Cancel</button>
        <button type="submit" class="btn-primary"><UserPlus size={14} /> Create User</button>
      </div>
    </form>
  {/if}

  <!-- Role tabs + search -->
  <div class="toolbar">
    <div class="role-tabs">
      {#each ['all', 'student', 'lecturer', 'invigilator', 'admin'] as r}
        <a href="/admin/users{r !== 'all' ? `?role=${r}` : ''}" 
           class="tab" class:active={data.role === r}>
          {r === 'all' ? 'All' : roleLabel(r) + 's'}
          <span class="tab-count">{counts[r as keyof typeof counts]}</span>
        </a>
      {/each}
    </div>
    
    <div class="search-wrap">
      <input type="search" placeholder="Search users..." bind:value={search} class="search" />
    </div>
  </div>

  <!-- User Cards -->
  <div class="users-grid">
    {#if paginated.length === 0}
      <div class="empty-state">
        <Users size={48} strokeWidth={1} />
        <p>No users found{search ? ` matching "${search}"` : ''}.</p>
      </div>
    {:else}
      {#each paginated as u (u.id)}
        {@const roleMeta = getRoleMeta(u.role)}
        {@const RoleIconComponent = roleMeta.icon}
        <div class="user-card" class:inactive={!u.isActive}>
          <div class="card-header">
            <div class="user-avatar" style="background: {roleMeta.bg}">
              <RoleIconComponent size={20} style="color: {roleMeta.color}" />
            </div>
            <div class="user-info">
              <h3 class="user-name">{u.fullName}</h3>
              <div class="user-meta">
                <span class="role-badge" style="background: {roleMeta.bg}; color: {roleMeta.color}">
                  {u.role}
                </span>
                <span class="status-badge" class:active={u.isActive}>
                  {u.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          <div class="card-details">
            <div class="detail-row">
              <Mail size={14} />
              <span class="detail-value">{u.email}</span>
            </div>
            <div class="detail-row">
              <IdCard size={14} />
              <span class="detail-value mono">{u.matricNumber || u.staffId || '—'}</span>
            </div>
            {#if u.department}
              <div class="detail-row">
                <Building2 size={14} />
                <span class="detail-value">{u.department.code || u.department.name}</span>
              </div>
            {/if}
          </div>

          <div class="card-actions">
            <button class="btn-outline" onclick={() => openProfile(u)} type="button">
              View Profile
            </button>
            {#if u.isActive}
              <button class="btn-danger" onclick={() => openDeactivateModal(u)} type="button">
                Deactivate
              </button>
            {:else}
              <form method="POST" action="?/activate" use:enhance style="display:inline">
                <input type="hidden" name="id" value={u.id} />
                <button type="submit" class="btn-success">Activate</button>
              </form>
            {/if}
          </div>
        </div>
      {/each}
    {/if}
  </div>

  <!-- Pagination -->
  {#if totalPages > 1}
    <div class="pagination">
      <div class="pag-info">
        Showing {startItem}–{endItem} of {filtered.length}
      </div>
      <div class="pag-controls">
        <button class="pag-btn" disabled={currentPage === 1} onclick={() => currentPage--} type="button">
          <ChevronLeft size={16} />
        </button>
        {#each Array.from({ length: totalPages }, (_, i) => i + 1) as p}
          {#if totalPages <= 5 || p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1}
            <button class="pag-btn pag-num" class:current={p === currentPage} onclick={() => currentPage = p} type="button">
              {p}
            </button>
          {:else if Math.abs(p - currentPage) === 2}
            <span class="pag-ellipsis">…</span>
          {/if}
        {/each}
        <button class="pag-btn" disabled={currentPage === totalPages} onclick={() => currentPage++} type="button">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  {/if}

  <!-- Profile Modal -->
  {#if showProfileModal && selectedUser}
    {@const profileMeta = getRoleMeta(selectedUser.role)}
    {@const ProfileIcon = profileMeta.icon}
    <div class="modal-overlay" onclick={closeModals}>
      <div class="modal" onclick={(e) => e.stopPropagation()}>
        <div class="modal-header">
          <h2>User Profile</h2>
          <button class="modal-close" onclick={closeModals} type="button">
            <X size={20} />
          </button>
        </div>
        
        <div class="modal-body">
          <div class="profile-avatar" style="background: {profileMeta.bg}">
            <ProfileIcon size={32} style="color: {profileMeta.color}" />
          </div>
          
          <div class="profile-field">
            <label>Full Name</label>
            <p>{selectedUser.fullName}</p>
          </div>
          
          <div class="profile-field">
            <label>Email Address</label>
            <p>{selectedUser.email}</p>
          </div>
          
          <div class="profile-field">
            <label>Role</label>
            <p>{selectedUser.role}</p>
          </div>
          
          {#if selectedUser.matricNumber}
            <div class="profile-field">
              <label>Matric Number</label>
              <p class="mono">{selectedUser.matricNumber}</p>
            </div>
          {/if}
          
          {#if selectedUser.staffId}
            <div class="profile-field">
              <label>Staff ID</label>
              <p class="mono">{selectedUser.staffId}</p>
            </div>
          {/if}
          
          {#if selectedUser.level}
            <div class="profile-field">
              <label>Level</label>
              <p>{selectedUser.level}</p>
            </div>
          {/if}
          
          {#if selectedUser.department}
            <div class="profile-field">
              <label>Department</label>
              <p>{selectedUser.department.name}</p>
            </div>
          {/if}
          
          <div class="profile-field">
            <label>Status</label>
            <p class={selectedUser.isActive ? 'status-active' : 'status-inactive'}>
              {selectedUser.isActive ? 'Active' : 'Inactive'}
            </p>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn-ghost" onclick={closeModals} type="button">Close</button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Deactivate Confirmation Modal -->
  {#if showDeactivateModal && userToDeactivate}
    <div class="modal-overlay" onclick={closeModals}>
      <div class="modal modal-warning" onclick={(e) => e.stopPropagation()}>
        <div class="modal-header">
          <h2>Confirm Deactivation</h2>
          <button class="modal-close" onclick={closeModals} type="button">
            <X size={20} />
          </button>
        </div>
        
        <div class="modal-body">
          <div class="warning-icon">
            <AlertCircle size={40} />
          </div>
          <p>Are you sure you want to deactivate <strong>{userToDeactivate.fullName}</strong>?</p>
          <p class="warning-text">This user will lose access to the platform until reactivated.</p>
        </div>
        
        <div class="modal-footer">
          <button class="btn-ghost" onclick={closeModals} type="button">Cancel</button>
          <form method="POST" action="?/deactivate" use:enhance style="display:inline">
            <input type="hidden" name="id" value={userToDeactivate.id} />
            <button type="submit" class="btn-danger" onclick={closeModals}>Confirm Deactivate</button>
          </form>
        </div>
      </div>
    </div>
  {/if}

</div>

<!-- Styles remain the same as before -->
<style>
  .page {
    padding: 1rem;
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    background: var(--color-bg);
    min-height: 100vh;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
  }
  
  h1 {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--color-text);
    margin: 0;
  }
  
  .page-sub {
    font-size: 0.75rem;
    color: var(--color-muted);
    margin: 0.25rem 0 0;
  }

  .btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 1rem;
    background: #16a34a;
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
  }
  
  .btn-primary:hover {
    opacity: 0.9;
  }
  
  .btn-ghost {
    padding: 0.5rem 1rem;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    font-weight: 500;
    font-size: 0.85rem;
    cursor: pointer;
    color: var(--color-text);
  }
  
  .btn-ghost:hover {
    background: var(--color-surface-hover);
  }
  
  .btn-danger {
    padding: 0.5rem 1rem;
    background: #dc2626;
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
  }
  
  .btn-danger:hover {
    background: #b91c1c;
  }
  
  .btn-success {
    padding: 0.5rem 1rem;
    background: #16a34a;
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
  }
  
  .btn-outline {
    padding: 0.5rem 1rem;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    font-weight: 500;
    font-size: 0.85rem;
    cursor: pointer;
    color: var(--color-text);
  }
  
  .btn-outline:hover {
    background: var(--color-surface-hover);
  }

  .alert {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    border-radius: 0.5rem;
    font-size: 0.85rem;
  }
  
  .alert.error {
    background: #fee2e2;
    color: #dc2626;
  }
  
  .alert.success {
    background: #dcfce7;
    color: #16a34a;
  }

  .create-form {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 1rem;
  }
  
  .create-form-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  h2 {
    font-size: 1rem;
    font-weight: 700;
    margin: 0;
  }
  
  .field-grid {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }
  
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .field label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-muted);
  }
  
  .req {
    color: #dc2626;
  }
  
  .field input, .field select {
    padding: 0.6rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-bg);
    color: var(--color-text);
    font-size: 0.85rem;
  }
  
  .create-form-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--color-border);
  }

  .toolbar {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .role-tabs {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  
  .tab {
    padding: 0.4rem 0.8rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 2rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-muted);
    text-decoration: none;
    white-space: nowrap;
  }
  
  .tab.active {
    background: #16a34a;
    border-color: #16a34a;
    color: white;
  }
  
  .tab-count {
    margin-left: 0.25rem;
    opacity: 0.7;
  }
  
  .search-wrap {
    position: relative;
  }
  
  .search-icon {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--color-muted);
  }
  
  .search {
    width: 100%;
    padding: 0.6rem 0.75rem 0.6rem 2.25rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-surface);
    color: var(--color-text);
    font-size: 0.85rem;
  }

  .users-grid {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .user-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 1rem;
  }
  
  .user-card.inactive {
    opacity: 0.6;
  }
  
  .card-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }
  
  .user-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  
  .user-info {
    flex: 1;
  }
  
  .user-name {
    font-size: 1rem;
    font-weight: 700;
    margin: 0 0 0.25rem;
    color: var(--color-text);
  }
  
  .user-meta {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  
  .role-badge {
    padding: 0.2rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
  }
  
  .status-badge {
    padding: 0.2rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.7rem;
    font-weight: 600;
  }
  
  .status-badge.active {
    background: #dcfce7;
    color: #16a34a;
  }
  
  .status-badge:not(.active) {
    background: #fee2e2;
    color: #dc2626;
  }
  
  .card-details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }
  
  .detail-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: var(--color-text);
  }
  
  .detail-value {
    color: var(--color-muted);
  }
  
  .mono {
    font-family: monospace;
  }
  
  .card-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }

  .empty-state {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--color-muted);
  }

  .pagination {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.75rem;
    padding-top: 0.5rem;
  }
  
  .pag-info {
    font-size: 0.75rem;
    color: var(--color-muted);
  }
  
  .pag-controls {
    display: flex;
    gap: 0.25rem;
    align-items: center;
  }
  
  .pag-btn {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-surface);
    cursor: pointer;
  }
  
  .pag-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .pag-btn.current {
    background: #16a34a;
    border-color: #16a34a;
    color: white;
  }
  
  .pag-ellipsis {
    padding: 0 0.25rem;
    color: var(--color-muted);
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }
  
  .modal {
    background: var(--color-surface);
    border-radius: 0.75rem;
    max-width: 400px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid var(--color-border);
  }
  
  .modal-close {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-muted);
  }
  
  .modal-body {
    padding: 1rem;
  }
  
  .modal-footer {
    padding: 1rem;
    border-top: 1px solid var(--color-border);
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }
  
  .profile-avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 1rem;
  }
  
  .profile-field {
    margin-bottom: 0.75rem;
  }
  
  .profile-field label {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--color-muted);
    text-transform: uppercase;
    display: block;
    margin-bottom: 0.25rem;
  }
  
  .profile-field p {
    font-size: 0.9rem;
    margin: 0;
    color: var(--color-text);
  }
  
  .status-active {
    color: #16a34a;
    font-weight: 600;
  }
  
  .status-inactive {
    color: #dc2626;
    font-weight: 600;
  }
  
  .warning-icon {
    text-align: center;
    color: #f59e0b;
    margin-bottom: 1rem;
  }
  
  .warning-text {
    font-size: 0.8rem;
    color: var(--color-muted);
    margin-top: 0.5rem;
  }

  @media (min-width: 768px) {
    .page {
      padding: 1.5rem;
    }
    
    .toolbar {
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
    }
    
    .search-wrap {
      width: 280px;
    }
    
    .field-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }
    
    .users-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }
  }
  
  @media (min-width: 1024px) {
    .users-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  :global(.dark) .btn-primary,
  :global(.dark) .btn-success {
    background: #16a34a;
  }
  
  :global(.dark) .tab.active {
    background: #16a34a;
  }
  
  :global(.dark) .pag-btn.current {
    background: #16a34a;
  }
  
  :global(.dark) .status-badge.active {
    background: rgba(22, 163, 74, 0.2);
    color: #86efac;
  }
  
  :global(.dark) .status-badge:not(.active) {
    background: rgba(220, 38, 38, 0.2);
    color: #fca5a5;
  }
  
  :global(.dark) .alert.error {
    background: rgba(220, 38, 38, 0.15);
    color: #fca5a5;
  }
  
  :global(.dark) .alert.success {
    background: rgba(22, 163, 74, 0.15);
    color: #86efac;
  }
</style>