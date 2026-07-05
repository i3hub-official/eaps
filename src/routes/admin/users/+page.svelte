<!-- src/routes/(admin)/users/+page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import type { PageData, ActionData } from './$types';
import {
  Search, UserPlus, X, ChevronLeft, ChevronRight,
  Users, GraduationCap, BookOpen, ShieldCheck, ShieldAlert,
  Building2, Mail, IdCard, AlertCircle, Calendar, Clock,
  Award, BookMarked, FileText, Activity,
  Download, RefreshCw, Filter, ChevronDown,
  Edit3, Eye, Ban, CheckCircle, Phone, Briefcase,
  UserCog, UserCheck, Crown
} from '@lucide/svelte';
  import { tick } from 'svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  // State
  let showCreate = $state(false);
  let showEdit = $state(false);
  let search = $state(data.meta?.search ?? '');
  let searchTimeout: ReturnType<typeof setTimeout> | null = null;
  let newRole = $state('student');
  let selectedUser = $state<any>(null);
  let showProfileModal = $state(false);
  let showDeactivateModal = $state(false);
  let userToDeactivate = $state<any>(null);
  let isLoadingProfile = $state(false);
  let isExporting = $state(false);
  let openDropdown = $state<string | null>(null);
  let dropdownSearch = $state('');

  // Tabs definition
  const tabs = [
    { key: 'all', label: 'All', icon: Users },
    { key: 'student', label: 'Students', icon: GraduationCap },
    { key: 'lecturer', label: 'Lecturers', icon: BookOpen },
    { key: 'invigilator', label: 'Invigilators', icon: ShieldCheck },
    { key: 'admin', label: 'Admins', icon: ShieldAlert },
    { key: 'exam_officer', label: 'Exam Officers', icon: UserCog },
    { key: 'hod', label: 'HODs', icon: UserCheck },
    { key: 'dept_coordinator', label: 'Dept Coordinators', icon: Crown },
    { key: 'college_coordinator', label: 'College Coordinators', icon: UserCog },
    { key: 'dean', label: 'Deans', icon: Crown },
{ key: 'vc_dvc', label: 'VC/DVC', icon: ShieldAlert },
  ];

  // Derived
  const PAGE_SIZE = $derived(data.meta?.limit ?? 20);
  const currentPage = $derived(data.meta?.page ?? 1);
  const totalPages = $derived(data.meta?.totalPages ?? 1);
  const totalCount = $derived(data.meta?.totalCount ?? 0);
  const startItem = $derived((currentPage - 1) * PAGE_SIZE + 1);
  const endItem = $derived(Math.min(currentPage * PAGE_SIZE, totalCount));

  const counts = $derived({
    all: data.counts?.all ?? data.meta?.totalCount ?? 0,
    student: data.counts?.student ?? 0,
    lecturer: data.counts?.lecturer ?? 0,
    invigilator: data.counts?.invigilator ?? 0,
    admin: data.counts?.admin ?? 0,
    exam_officer: data.counts?.exam_officer ?? 0,
    hod: data.counts?.hod ?? 0,
    dept_coordinator: data.counts?.dept_coordinator ?? 0,
    college_coordinator: data.counts?.college_coordinator ?? 0,
  });

  const ROLE_META: Record<string, { color: string; icon: any; bg: string; label: string }> = {
    admin: { color: '#dc2626', icon: ShieldAlert, bg: '#fee2e2', label: 'Administrator' },
    lecturer: { color: '#7c3aed', icon: BookOpen, bg: '#f3e8ff', label: 'Lecturer' },
    invigilator: { color: '#f59e0b', icon: ShieldCheck, bg: '#fef3c7', label: 'Invigilator' },
    student: { color: '#16a34a', icon: GraduationCap, bg: '#dcfce7', label: 'Student' },
    hod: { color: '#2563eb', icon: UserCheck, bg: '#dbeafe', label: 'Head of Department' },
    exam_officer: { color: '#8b5cf6', icon: UserCog, bg: '#ede9fe', label: 'Exam Officer' },
    dean: { color: '#059669', icon: Crown, bg: '#d1fae5', label: 'Dean' },
vc_dvc: { color: '#0891b2', icon: ShieldAlert, bg: '#cffafe', label: 'VC/DVC' },
  };

  function getRoleMeta(role: string) {
    return ROLE_META[role] || { color: '#64748b', icon: Users, bg: '#e2e8f0', label: 'User' };
  }

  function handleSearch() {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const url = new URL($page.url);
      if (search) url.searchParams.set('search', search);
      else url.searchParams.delete('search');
      url.searchParams.set('page', '1');
      const newUrl = url.toString();
      if (newUrl !== $page.url.toString()) {
        goto(newUrl, { replaceState: true });
      }
    }, 300);
  }

  function goToPage(p: number) {
    const url = new URL($page.url);
    url.searchParams.set('page', String(p));
    const newUrl = url.toString();
    if (newUrl !== $page.url.toString()) {
      goto(newUrl, { replaceState: true });
    }
  }

  function changeFilter(filterType: string) {
    const url = new URL($page.url);
    if (filterType !== 'all') {
      url.searchParams.set('filterType', filterType);
    } else {
      url.searchParams.delete('filterType');
    }
    url.searchParams.delete('role');
    url.searchParams.set('page', '1');
    const newUrl = url.toString();
    if (newUrl !== $page.url.toString()) {
      goto(newUrl, { replaceState: true });
    }
  }

  function toggleDropdown(id: string) {
    openDropdown = openDropdown === id ? null : id;
    dropdownSearch = '';
  }

  function selectDropdownItem(id: string, value: string, label: string) {
    const input = document.getElementById(id) as HTMLInputElement;
    if (input) input.value = value;
    const display = document.getElementById(`${id}-display`);
    if (display) display.textContent = label;
    openDropdown = null;
    dropdownSearch = '';
  }

  function filterDropdownItems(items: any[], searchKey: string) {
    if (!dropdownSearch) return items;
    return items.filter(item =>
      item[searchKey]?.toLowerCase().includes(dropdownSearch.toLowerCase())
    );
  }

  async function openProfile(user: any) {
    isLoadingProfile = true;
    selectedUser = user;
    showProfileModal = true;
    try {
      const response = await fetch(`/api/admin/users/${user.id}`);
      if (response.ok) {
        const additionalData = await response.json();
        selectedUser = { ...user, ...additionalData };
      }
    } catch (error) {
      console.error('Failed to fetch user details:', error);
    } finally {
      isLoadingProfile = false;
    }
  }

  function openEditModal(user: any) {
    selectedUser = user;
    showEdit = true;
    showCreate = false;
  }

  function openDeactivateModal(user: any) {
    userToDeactivate = user;
    showDeactivateModal = true;
  }

  function closeModals() {
    showProfileModal = false;
    showDeactivateModal = false;
    showCreate = false;
    showEdit = false;
    selectedUser = null;
    userToDeactivate = null;
  }

  async function exportToCSV() {
    isExporting = true;
    await tick();
    try {
      const headers = ['Name', 'Email', 'Role', 'Matric/Staff ID', 'Department', 'Level', 'Status', 'Created'];
      const rows = data.users?.map((u: any) => [
        u.fullName,
        u.email,
        u.role,
        u.matricNumber || u.staffId || '',
        u.department?.name || '',
        u.level || '',
        u.isActive ? 'Active' : 'Inactive',
        new Date(u.createdAt).toLocaleDateString(),
      ]) ?? [];
      const csv = [headers.join(','), ...rows.map((r: any[]) => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export CSV.');
    } finally {
      isExporting = false;
    }
  }

  function formatDate(date: string | null | undefined) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function formatDateTime(date: string | null | undefined) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-dropdown')) {
      openDropdown = null;
    }
  }

  $effect(() => {
    if (openDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  });
</script>

<svelte:head><title>User Management — MOUAU eTest Admin</title></svelte:head>

<div class="page">

  <!-- Header -->
  <header class="page-header">
    <div class="header-left">
      <div class="header-icon">
        <Users size={24} color="#16a34a" />
      </div>
      <div>
        <h1>User Management</h1>
        <p class="subtitle">{totalCount} total users · {counts.student} students · {counts.lecturer} lecturers · {counts.invigilator} invigilators · {counts.admin} admins</p>
      </div>
    </div>
    <div class="header-right">
      <button class="btn-outline" onclick={exportToCSV} disabled={isExporting}>
        {#if isExporting}
          <RefreshCw size={14} class="spin" />
        {:else}
          <Download size={14} />
        {/if}
        Export CSV
      </button>
    </div>
  </header>

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
  {#if form?.activateError}
    <div class="alert error">
      <AlertCircle size={14} />
      <span>{form.activateError}</span>
    </div>
  {/if}
  {#if form?.updateError}
    <div class="alert error">
      <AlertCircle size={14} />
      <span>{form.updateError}</span>
    </div>
  {/if}
  {#if form?.created}
    <div class="alert success">
      <CheckCircle size={14} />
      <span>User created successfully.</span>
    </div>
  {/if}
  {#if form?.deactivated}
    <div class="alert success">
      <CheckCircle size={14} />
      <span>{form.userName ?? 'User'} deactivated.</span>
    </div>
  {/if}
  {#if form?.activated}
    <div class="alert success">
      <CheckCircle size={14} />
      <span>{form.userName ?? 'User'} reactivated.</span>
    </div>
  {/if}
  {#if form?.updated}
    <div class="alert success">
      <CheckCircle size={14} />
      <span>User updated successfully.</span>
    </div>
  {/if}

  <!-- Create Form -->
  {#if showCreate}
    <form method="POST" action="?/create" use:enhance class="create-form" onsubmit={() => { showCreate = false; }}>
      <div class="form-header">
        <h2><UserPlus size={18} /> Create New User</h2>
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
            <option value="hod">HOD</option>
            <option value="exam_officer">Exam Officer</option>
          </select>
        </div>
        <div class="field">
          <label>Password <span class="req">*</span></label>
          <input name="password" type="password" required placeholder="Min. 8 characters" minlength="8" />
        </div>
        <div class="field">
          <label>Phone</label>
          <input name="phone" type="tel" placeholder="+234 800 000 0000" />
        </div>

        <!-- Custom Dropdown: Department -->
        <div class="field">
          <label>Department</label>
          <div class="custom-dropdown">
            <button type="button" class="dropdown-trigger" onclick={() => toggleDropdown('department')}>
              <span id="department-display">— Select Department —</span>
              <ChevronDown size={14} />
            </button>
            {#if openDropdown === 'department'}
              <div class="dropdown-menu">
                <div class="dropdown-search">
                  <Search size={12} />
                  <input type="text" placeholder="Search departments..." bind:value={dropdownSearch} />
                </div>
                <div class="dropdown-items">
                  <button type="button" class="dropdown-item" onclick={() => selectDropdownItem('department', '', '— None —')}>
                    — None —
                  </button>
                  {#each filterDropdownItems(data.departments ?? [], 'name') as d}
                    <button type="button" class="dropdown-item" onclick={() => selectDropdownItem('department', d.id, `${d.code} — ${d.name}`)}>
                      <span class="item-code">{d.code}</span>
                      <span class="item-name">{d.name}</span>
                      {#if d.college}
                        <span class="item-meta">{d.college.name}</span>
                      {/if}
                    </button>
                  {/each}
                </div>
              </div>
            {/if}
            <input type="hidden" name="department_id" id="department" value="" />
          </div>
        </div>

        <!-- Custom Dropdown: College -->
        <div class="field">
          <label>College / Faculty</label>
          <div class="custom-dropdown">
            <button type="button" class="dropdown-trigger" onclick={() => toggleDropdown('college')}>
              <span id="college-display">— Select College —</span>
              <ChevronDown size={14} />
            </button>
            {#if openDropdown === 'college'}
              <div class="dropdown-menu">
                <div class="dropdown-search">
                  <Search size={12} />
                  <input type="text" placeholder="Search colleges..." bind:value={dropdownSearch} />
                </div>
                <div class="dropdown-items">
                  <button type="button" class="dropdown-item" onclick={() => selectDropdownItem('college', '', '— None —')}>
                    — None —
                  </button>
                  {#each filterDropdownItems(data.colleges ?? [], 'name') as c}
                    <button type="button" class="dropdown-item" onclick={() => selectDropdownItem('college', c.id, `${c.code} — ${c.name}`)}>
                      <span class="item-code">{c.code}</span>
                      <span class="item-name">{c.name}</span>
                    </button>
                  {/each}
                </div>
              </div>
            {/if}
            <input type="hidden" name="college_id" id="college" value="" />
          </div>
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
                <option value={l}>{l} Level</option>
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

      <div class="form-footer">
        <button type="button" class="btn-ghost" onclick={() => { showCreate = false; }}>Cancel</button>
        <button type="submit" class="btn-primary"><UserPlus size={14} /> Create User</button>
      </div>
    </form>
  {/if}

  <!-- Edit Form -->
  {#if showEdit && selectedUser}
    <form method="POST" action="?/update" use:enhance class="create-form" onsubmit={() => { showEdit = false; }}>
      <div class="form-header">
        <h2><Edit3 size={18} /> Edit User</h2>
        <button type="button" class="icon-btn" onclick={() => { showEdit = false; selectedUser = null; }}>
          <X size={18} />
        </button>
      </div>
      <input type="hidden" name="id" value={selectedUser.id} />

      <div class="field-grid">
        <div class="field">
          <label>Full Name</label>
          <input name="full_name" type="text" value={selectedUser.fullName} />
        </div>
        <div class="field">
          <label>Email</label>
          <input name="email" type="email" value={selectedUser.email} />
        </div>
        <div class="field">
          <label>Phone</label>
          <input name="phone" type="tel" value={selectedUser.phone ?? ''} />
        </div>

        <!-- Custom Dropdown: Department (Edit) -->
        <div class="field">
          <label>Department</label>
          <div class="custom-dropdown">
            <button type="button" class="dropdown-trigger" onclick={() => toggleDropdown('edit-department')}>
              <span id="edit-department-display">{selectedUser.department?.name ?? '— Select Department —'}</span>
              <ChevronDown size={14} />
            </button>
            {#if openDropdown === 'edit-department'}
              <div class="dropdown-menu">
                <div class="dropdown-search">
                  <Search size={12} />
                  <input type="text" placeholder="Search departments..." bind:value={dropdownSearch} />
                </div>
                <div class="dropdown-items">
                  <button type="button" class="dropdown-item" onclick={() => selectDropdownItem('edit-department', '', '— None —')}>
                    — None —
                  </button>
                  {#each filterDropdownItems(data.departments ?? [], 'name') as d}
                    <button type="button" class="dropdown-item" class:selected={d.id === selectedUser.departmentId} onclick={() => selectDropdownItem('edit-department', d.id, `${d.code} — ${d.name}`)}>
                      <span class="item-code">{d.code}</span>
                      <span class="item-name">{d.name}</span>
                      {#if d.college}
                        <span class="item-meta">{d.college.name}</span>
                      {/if}
                    </button>
                  {/each}
                </div>
              </div>
            {/if}
            <input type="hidden" name="department_id" id="edit-department" value={selectedUser.departmentId ?? ''} />
          </div>
        </div>

        {#if selectedUser.role === 'student'}
          <div class="field">
            <label>Matric Number</label>
            <input name="matric_number" type="text" value={selectedUser.matricNumber ?? ''} />
          </div>
          <div class="field">
            <label>Level</label>
            <select name="level">
              <option value="">— Select —</option>
              {#each [100, 200, 300, 400, 500] as l}
                <option value={l} selected={selectedUser.level === l}>{l} Level</option>
              {/each}
            </select>
          </div>
        {:else}
          <div class="field">
            <label>Staff ID</label>
            <input name="staff_id" type="text" value={selectedUser.staffId ?? ''} />
          </div>
        {/if}
      </div>

      <div class="form-footer">
        <button type="button" class="btn-ghost" onclick={() => { showEdit = false; selectedUser = null; }}>Cancel</button>
        <button type="submit" class="btn-primary"><Edit3 size={14} /> Update User</button>
      </div>
    </form>
  {/if}

  <!-- Toolbar -->
  <div class="toolbar">
    <div class="role-tabs">
      {#each tabs as tab}
        <button
          class="tab"
          class:active={data.filterType === tab.key}
          onclick={() => changeFilter(tab.key)}
          type="button"
          title={tab.key === 'dept_coordinator' ? 'Users with department_coordinator authority scope' : tab.key === 'college_coordinator' ? 'Exam Officers assigned to a college' : ''}
        >
          <svelte:component this={tab.icon} size={14} />
          {tab.label}
          <span class="tab-count">{counts[tab.key as keyof typeof counts]}</span>
        </button>
      {/each}
    </div>

    <div class="search-wrap">
      <Search size={14} />
      <input
        type="search"
        placeholder="Search users..."
        bind:value={search}
        oninput={handleSearch}
        class="search"
      />
      {#if search}
        <button class="search-clear" onclick={() => { search = ''; handleSearch(); }}>
          <X size={12} />
        </button>
      {/if}
    </div>
  </div>

  <!-- Users Table -->
  <div class="table-container">
    {#if !data.users?.length}
      <div class="empty-state">
        <Users size={48} strokeWidth={1} />
        <p>No users found{search ? ` matching "${search}"` : ''}.</p>
      </div>
    {:else}
      <table class="users-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Role</th>
            <th>ID</th>
            <th>Department</th>
            <th>Level</th>
            <th>Status</th>
            <th>Joined</th>
            <th class="actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each data.users as u (u.id)}
            {@const roleMeta = getRoleMeta(u.role)}
            {@const RoleIconComponent = roleMeta.icon}
            <tr class:inactive={!u.isActive}>
              <td class="user-cell">
                <div class="user-avatar-small" style="background: {roleMeta.bg}">
                  <RoleIconComponent size={16} style="color: {roleMeta.color}" />
                </div>
                <div class="user-info-cell">
                  <span class="user-name">{u.fullName}</span>
                  <span class="user-email">{u.email}</span>
                </div>
              </td>
              <td>
                <span class="role-badge" style="background: {roleMeta.bg}; color: {roleMeta.color}">
                  {u.role}
                </span>
              </td>
              <td class="mono">{u.matricNumber || u.staffId || '—'}</td>
              <td>{u.department?.name || '—'}</td>
              <td>{u.level ? `${u.level}L` : '—'}</td>
              <td>
                <span class="status-badge" class:active={u.isActive}>
                  {u.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td class="date">{formatDate(u.createdAt)}</td>
              <td class="actions">
                <div class="action-btns">
                  <button class="action-btn" title="View Profile" onclick={() => openProfile(u)}>
                    <Eye size={14} />
                  </button>
                  <button class="action-btn" title="Edit" onclick={() => openEditModal(u)}>
                    <Edit3 size={14} />
                  </button>
                  {#if u.isActive}
                    <button class="action-btn danger" title="Deactivate" onclick={() => openDeactivateModal(u)}>
                      <Ban size={14} />
                    </button>
                  {:else}
                    <form method="POST" action="?/activate" use:enhance style="display:inline">
                      <input type="hidden" name="id" value={u.id} />
                      <button type="submit" class="action-btn success" title="Activate">
                        <CheckCircle size={14} />
                      </button>
                    </form>
                  {/if}
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>

  <!-- Pagination -->
  {#if totalPages > 1}
    <div class="pagination">
      <div class="pag-info">
        Showing <strong>{startItem}</strong>–<strong>{endItem}</strong> of <strong>{totalCount}</strong>
      </div>
      <div class="pag-controls">
        <button class="pag-btn" disabled={currentPage === 1} onclick={() => goToPage(currentPage - 1)} type="button">
          <ChevronLeft size={16} />
        </button>
        {#each Array.from({ length: totalPages }, (_, i) => i + 1) as p}
          {#if totalPages <= 7 || p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1}
            <button
              class="pag-btn pag-num"
              class:current={p === currentPage}
              onclick={() => goToPage(p)}
              type="button"
            >
              {p}
            </button>
          {:else if Math.abs(p - currentPage) === 2}
            <span class="pag-ellipsis">…</span>
          {/if}
        {/each}
        <button class="pag-btn" disabled={currentPage === totalPages} onclick={() => goToPage(currentPage + 1)} type="button">
          <ChevronRight size={16} />
        </button>
      </div>
      <div class="pag-size">
        <select onchange={(e) => {
          const url = new URL($page.url);
          url.searchParams.set('limit', (e.target as HTMLSelectElement).value);
          url.searchParams.set('page', '1');
          goto(url.toString(), { replaceState: true });
        }}>
          <option value="10" selected={PAGE_SIZE === 10}>10 / page</option>
          <option value="20" selected={PAGE_SIZE === 20}>20 / page</option>
          <option value="50" selected={PAGE_SIZE === 50}>50 / page</option>
        </select>
      </div>
    </div>
  {/if}

  <!-- Profile Modal -->
  {#if showProfileModal && selectedUser}
    {@const profileMeta = getRoleMeta(selectedUser.role)}
    {@const ProfileIcon = profileMeta.icon}
    <div class="modal-overlay" onclick={closeModals}>
      <div class="modal modal-large" onclick={(e) => e.stopPropagation()}>
        <div class="modal-header">
          <h2>User Profile</h2>
          <button class="modal-close" onclick={closeModals} type="button">
            <X size={20} />
          </button>
        </div>

        {#if isLoadingProfile}
          <div class="modal-loading">
            <div class="spinner"></div>
            <p>Loading user details...</p>
          </div>
        {:else}
          <div class="modal-body">
            <div class="profile-header">
              <div class="profile-avatar" style="background: {profileMeta.bg}">
                <ProfileIcon size={48} style="color: {profileMeta.color}" />
              </div>
              <div class="profile-header-info">
                <h3>{selectedUser.fullName}</h3>
                <div class="profile-badges">
                  <span class="profile-role" style="background: {profileMeta.bg}; color: {profileMeta.color}">
                    {profileMeta.label}
                  </span>
                  <span class="profile-status" class:active={selectedUser.isActive}>
                    {selectedUser.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>

            <div class="profile-section">
              <h4>Personal Information</h4>
              <div class="profile-grid">
                <div class="profile-field">
                  <label><Mail size={12} /> Email</label>
                  <p>{selectedUser.email}</p>
                </div>
                {#if selectedUser.phone}
                  <div class="profile-field">
                    <label><Phone size={12} /> Phone</label>
                    <p>{selectedUser.phone}</p>
                  </div>
                {/if}
                {#if selectedUser.matricNumber}
                  <div class="profile-field">
                    <label><IdCard size={12} /> Matric Number</label>
                    <p class="mono">{selectedUser.matricNumber}</p>
                  </div>
                {/if}
                {#if selectedUser.staffId}
                  <div class="profile-field">
                    <label><Briefcase size={12} /> Staff ID</label>
                    <p class="mono">{selectedUser.staffId}</p>
                  </div>
                {/if}
                {#if selectedUser.level}
                  <div class="profile-field">
                    <label><Award size={12} /> Level</label>
                    <p>{selectedUser.level} Level</p>
                  </div>
                {/if}
              </div>
            </div>

            {#if selectedUser.department}
              <div class="profile-section">
                <h4>Academic Information</h4>
                <div class="profile-grid">
                  <div class="profile-field">
                    <label><Building2 size={12} /> Department</label>
                    <p>{selectedUser.department.name}</p>
                  </div>
                  <div class="profile-field">
                    <label><IdCard size={12} /> Department Code</label>
                    <p class="mono">{selectedUser.department.code}</p>
                  </div>
                  {#if selectedUser.department.college}
                    <div class="profile-field">
                      <label><Building2 size={12} /> College / Faculty</label>
                      <p>{selectedUser.department.college.name}</p>
                    </div>
                  {/if}
                </div>
              </div>
            {/if}

            <div class="profile-section">
              <h4>Statistics</h4>
              <div class="stats-grid">
                <div class="stat-item">
                  <FileText size={18} color="#3b82f6" />
                  <div>
                    <p class="stat-value">{selectedUser._count?.examSessions ?? 0}</p>
                    <p class="stat-label">Exam Attempts</p>
                  </div>
                </div>
                <div class="stat-item">
                  <BookMarked size={18} color="#a78bfa" />
                  <div>
                    <p class="stat-value">{selectedUser._count?.courseRegistrations ?? 0}</p>
                    <p class="stat-label">Course Registrations</p>
                  </div>
                </div>
                <div class="stat-item">
                  <Calendar size={18} color="#22c55e" />
                  <div>
                    <p class="stat-value">{formatDate(selectedUser.createdAt)}</p>
                    <p class="stat-label">Joined</p>
                  </div>
                </div>
                <div class="stat-item">
                  <Activity size={18} color={selectedUser.isActive ? '#22c55e' : '#dc2626'} />
                  <div>
                    <p class="stat-value">{selectedUser.isActive ? 'Active' : 'Inactive'}</p>
                    <p class="stat-label">Account Status</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="profile-section">
              <h4>Account Timeline</h4>
              <div class="timeline">
                <div class="timeline-item">
                  <div class="timeline-dot"></div>
                  <div>
                    <p class="timeline-label">Account Created</p>
                    <p class="timeline-date">{formatDateTime(selectedUser.createdAt)}</p>
                  </div>
                </div>
                {#if selectedUser.updatedAt && selectedUser.updatedAt !== selectedUser.createdAt}
                  <div class="timeline-item">
                    <div class="timeline-dot"></div>
                    <div>
                      <p class="timeline-label">Last Updated</p>
                      <p class="timeline-date">{formatDateTime(selectedUser.updatedAt)}</p>
                    </div>
                  </div>
                {/if}
              </div>
            </div>
          </div>
        {/if}

        <div class="modal-footer">
          <button class="btn-ghost" onclick={closeModals} type="button">Close</button>
          <button class="btn-outline" onclick={() => { closeModals(); openEditModal(selectedUser); }} type="button">
            <Edit3 size={14} /> Edit
          </button>
          {#if selectedUser.isActive}
            <button class="btn-danger" onclick={() => { closeModals(); openDeactivateModal(selectedUser); }} type="button">
              <Ban size={14} /> Deactivate
            </button>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  <!-- Deactivate Modal -->
  {#if showDeactivateModal && userToDeactivate}
    <div class="modal-overlay" onclick={closeModals}>
      <div class="modal modal-warning" onclick={(e) => e.stopPropagation()}>
        <div class="modal-header warning">
          <h2><AlertCircle size={20} /> Confirm Deactivation</h2>
          <button class="modal-close" onclick={closeModals} type="button">
            <X size={20} />
          </button>
        </div>
        <div class="modal-body center">
          <div class="warning-icon">
            <Ban size={48} color="#dc2626" />
          </div>
          <p class="warning-title">Deactivate <strong>{userToDeactivate.fullName}</strong>?</p>
          <p class="warning-text">This user will immediately lose access to the platform.</p>
          <p class="warning-meta">{userToDeactivate.email} · {userToDeactivate.role}</p>
        </div>
        <div class="modal-footer">
          <button class="btn-ghost" onclick={closeModals} type="button">Cancel</button>
          <form method="POST" action="?/deactivate" use:enhance style="display:inline" onsubmit={() => { closeModals(); }}>
            <input type="hidden" name="id" value={userToDeactivate.id} />
            <button type="submit" class="btn-danger">
              <Ban size={14} /> Confirm Deactivate
            </button>
          </form>
        </div>
      </div>
    </div>
  {/if}

</div>
<!-- END: .page -->

<style>
  .page {
    padding: 2rem 2.5rem 3rem;
    max-width: 1400px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    font-family: 'DM Sans', system-ui, sans-serif;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--color-border);
  }
  .header-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .header-icon {
    width: 48px;
    height: 48px;
    border-radius: 0.75rem;
    background: rgba(59, 130, 246, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  h1 {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--color-text);
    margin: 0;
  }
  .subtitle {
    font-size: 0.8rem;
    color: var(--color-muted);
    margin: 0.25rem 0 0;
  }
  .header-right {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: #3b82f6;
    border: 1px solid #3b82f6;
    border-radius: 0.5rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: white;
    cursor: pointer;
    transition: all 0.15s;
  }
  .btn-primary:hover {
    background: #1d4ed8;
    border-color: #1d4ed8;
  }
  .btn-outline {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--color-text);
    cursor: pointer;
    transition: all 0.15s;
  }
  .btn-outline:hover {
    border-color: #3b82f6;
    color: #3b82f6;
  }
  .btn-ghost {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--color-text);
    cursor: pointer;
  }
  .btn-ghost:hover {
    background: var(--color-bg);
  }
  .btn-danger {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: #dc2626;
    border: 1px solid #dc2626;
    border-radius: 0.5rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: white;
    cursor: pointer;
    transition: all 0.15s;
  }
  .btn-danger:hover {
    background: #b91c1c;
    border-color: #b91c1c;
  }
  .icon-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-muted);
    padding: 0.25rem;
    border-radius: 0.25rem;
  }
  .icon-btn:hover {
    color: var(--color-text);
    background: var(--color-bg);
  }
  .spin {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .alert {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.85rem;
    animation: fadeUp 0.3s ease;
  }
  .alert.error {
    background: #fee2e2;
    color: #dc2626;
    border: 1px solid #fecaca;
  }
  .alert.success {
    background: #dcfce7;
    color: #16a34a;
    border: 1px solid #bbf7d0;
  }

  .create-form {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    overflow: hidden;
    animation: fadeUp 0.4s ease;
  }
  .form-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg);
  }
  .form-header h2 {
    font-size: 1rem;
    font-weight: 700;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--color-text);
  }
  .field-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1rem;
    padding: 1.25rem;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .field label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .req {
    color: #dc2626;
  }
  .field input,
  .field select {
    padding: 0.6rem 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-bg);
    color: var(--color-text);
    font-size: 0.85rem;
    transition: border-color 0.15s;
  }
  .field input:focus,
  .field select:focus {
    outline: none;
    border-color: #3b82f6;
  }
  .form-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    border-top: 1px solid var(--color-border);
    background: var(--color-bg);
  }

  /* Custom Dropdown */
  .custom-dropdown {
    position: relative;
  }
  .dropdown-trigger {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.6rem 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-bg);
    color: var(--color-text);
    font-size: 0.85rem;
    cursor: pointer;
    transition: border-color 0.15s;
  }
  .dropdown-trigger:hover {
    border-color: #3b82f6;
  }
  .dropdown-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    box-shadow: 0 10px 40px rgba(0,0,0,0.15);
    z-index: 100;
    max-height: 300px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .dropdown-search {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--color-border);
  }
  .dropdown-search input {
    flex: 1;
    border: none;
    background: none;
    outline: none;
    font-size: 0.8rem;
    color: var(--color-text);
  }
  .dropdown-items {
    overflow-y: auto;
    max-height: 240px;
    padding: 0.25rem;
  }
  .dropdown-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border: none;
    background: none;
    border-radius: 0.35rem;
    font-size: 0.8rem;
    color: var(--color-text);
    cursor: pointer;
    text-align: left;
    transition: background 0.1s;
  }
  .dropdown-item:hover,
  .dropdown-item.selected {
    background: var(--color-bg);
  }
  .item-code {
    font-weight: 700;
    color: #3b82f6;
    min-width: 50px;
  }
  .item-name {
    flex: 1;
  }
  .item-meta {
    font-size: 0.7rem;
    color: var(--color-muted);
  }

  /* Toolbar */
  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
  }
  .role-tabs {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .tab {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 1rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 2rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-muted);
    cursor: pointer;
    transition: all 0.15s;
  }
  .tab:hover {
    color: var(--color-text);
    border-color: #3b82f6;
  }
  .tab.active {
    background: #3b82f6;
    border-color: #3b82f6;
    color: white;
  }
  .tab-count {
    font-size: 0.7rem;
    opacity: 0.8;
    background: rgba(0,0,0,0.1);
    padding: 0.1rem 0.4rem;
    border-radius: 999px;
  }
  .search-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }
  .search-wrap :global(svg:first-child) {
    position: absolute;
    left: 0.75rem;
    color: var(--color-muted);
    pointer-events: none;
  }
  .search {
    padding: 0.5rem 0.75rem 0.5rem 2.25rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-surface);
    color: var(--color-text);
    font-size: 0.85rem;
    width: 280px;
    transition: border-color 0.15s;
  }
  .search:focus {
    outline: none;
    border-color: #3b82f6;
  }
  .search-clear {
    position: absolute;
    right: 0.5rem;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-muted);
    padding: 0.2rem;
    border-radius: 0.25rem;
  }
  .search-clear:hover {
    color: var(--color-text);
  }

  /* Table */
  .table-container {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    overflow-x: auto;
    overflow-y: visible;
    animation: fadeUp 0.45s ease;
    -webkit-overflow-scrolling: touch;
  }
  .table-container::-webkit-scrollbar {
    height: 6px;
  }
  .table-container::-webkit-scrollbar-track {
    background: transparent;
  }
  .table-container::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: 3px;
  }
  .table-container::-webkit-scrollbar-thumb:hover {
    background: var(--color-muted);
  }
  .users-table {
    width: 100%;
    min-width: 900px;
    border-collapse: collapse;
    font-size: 0.85rem;
  }
  .users-table th {
    padding: 0.75rem 1rem;
    text-align: left;
    font-size: 0.68rem;
    font-weight: 700;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
    white-space: nowrap;
  }
  .users-table th.actions {
    text-align: center;
  }
  .users-table td {
    padding: 0.875rem 1rem;
    border-bottom: 1px solid var(--color-border);
    vertical-align: middle;
    white-space: nowrap;
  }
  .users-table td.user-cell,
  .users-table td:first-child {
    white-space: normal;
    min-width: 220px;
  }
  .users-table tr:hover td {
    background: var(--color-bg);
  }
  .users-table tr.inactive {
    opacity: 0.6;
  }
  .users-table tr.inactive:hover {
    opacity: 0.8;
  }
  .user-cell {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .user-avatar-small {
    width: 36px;
    height: 36px;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .user-info-cell {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }
  .user-name {
    font-weight: 600;
    color: var(--color-text);
  }
  .user-email {
    font-size: 0.75rem;
    color: var(--color-muted);
  }
  .role-badge {
    padding: 0.2rem 0.6rem;
    border-radius: 0.25rem;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .status-badge {
    padding: 0.2rem 0.6rem;
    border-radius: 0.25rem;
    font-size: 0.7rem;
    font-weight: 700;
  }
  .status-badge.active {
    background: #dcfce7;
    color: #16a34a;
  }
  .status-badge:not(.active) {
    background: #fee2e2;
    color: #dc2626;
  }
  .mono {
    font-family: 'SF Mono', monospace;
    font-size: 0.8rem;
    color: var(--color-muted);
  }
  .date {
    font-size: 0.8rem;
    color: var(--color-muted);
  }
  .actions {
    text-align: center;
  }
  .action-btns {
    display: flex;
    gap: 0.25rem;
    justify-content: center;
  }
  .action-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: var(--color-bg);
    border-radius: 0.4rem;
    cursor: pointer;
    color: var(--color-muted);
    transition: all 0.15s;
  }
  .action-btn:hover {
    background: var(--color-border);
    color: var(--color-text);
  }
  .action-btn.danger:hover {
    background: #fee2e2;
    color: #dc2626;
  }
  .action-btn.success:hover {
    background: #dcfce7;
    color: #16a34a;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 4rem 2rem;
    color: var(--color-muted);
    text-align: center;
  }

  /* Pagination */
  .pagination {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    padding: 1rem 0;
  }
  .pag-info {
    font-size: 0.8rem;
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
    color: var(--color-text);
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 600;
    transition: all 0.15s;
  }
  .pag-btn:hover:not(:disabled) {
    border-color: #3b82f6;
    color: #3b82f6;
  }
  .pag-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .pag-btn.current {
    background: #3b82f6;
    border-color: #3b82f6;
    color: white;
  }
  .pag-ellipsis {
    padding: 0 0.5rem;
    color: var(--color-muted);
    font-size: 0.8rem;
  }
  .pag-size select {
    padding: 0.4rem 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-surface);
    color: var(--color-text);
    font-size: 0.8rem;
    cursor: pointer;
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
    animation: fadeIn 0.2s ease;
  }
  .modal {
    background: var(--color-surface);
    border-radius: 1rem;
    max-width: 600px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 25px 50px rgba(0,0,0,0.25);
    animation: slideUp 0.3s ease;
  }
  .modal-large {
    max-width: 720px;
  }
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid var(--color-border);
  }
  .modal-header.warning {
    background: #fef3c7;
    border-bottom-color: #fde68a;
  }
  .modal-header h2 {
    font-size: 1rem;
    font-weight: 700;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--color-text);
  }
  .modal-close {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-muted);
    padding: 0.25rem;
    border-radius: 0.25rem;
    transition: all 0.15s;
  }
  .modal-close:hover {
    color: var(--color-text);
    background: var(--color-bg);
  }
  .modal-body {
    padding: 1.5rem;
  }
  .modal-body.center {
    text-align: center;
    padding: 2rem 1.5rem;
  }
  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--color-border);
    background: var(--color-bg);
  }
  .modal-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    gap: 1rem;
    color: var(--color-muted);
  }
  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--color-border);
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  /* Profile */
  .profile-header {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    padding-bottom: 1.25rem;
    margin-bottom: 1.25rem;
    border-bottom: 1px solid var(--color-border);
  }
  .profile-avatar {
    width: 80px;
    height: 80px;
    border-radius: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .profile-header-info h3 {
    font-size: 1.25rem;
    font-weight: 800;
    margin: 0 0 0.5rem;
    color: var(--color-text);
  }
  .profile-badges {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .profile-role {
    padding: 0.25rem 0.75rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 700;
  }
  .profile-status {
    padding: 0.25rem 0.75rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 700;
  }
  .profile-status.active {
    background: #dcfce7;
    color: #16a34a;
  }
  .profile-status:not(.active) {
    background: #fee2e2;
    color: #dc2626;
  }
  .profile-section {
    margin-bottom: 1.5rem;
  }
  .profile-section h4 {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--color-border);
  }
  .profile-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }
  .profile-field label {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--color-muted);
    margin-bottom: 0.35rem;
  }
  .profile-field p {
    font-size: 0.9rem;
    margin: 0;
    color: var(--color-text);
    font-weight: 500;
  }
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 1rem;
  }
  .stat-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: var(--color-bg);
    border-radius: 0.75rem;
    border: 1px solid var(--color-border);
  }
  .stat-value {
    font-size: 1.25rem;
    font-weight: 800;
    margin: 0;
    color: var(--color-text);
    line-height: 1;
  }
  .stat-label {
    font-size: 0.7rem;
    color: var(--color-muted);
    margin: 0.15rem 0 0;
  }
  .timeline {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding-left: 0.5rem;
  }
  .timeline-item {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    position: relative;
    padding-left: 1.25rem;
  }
  .timeline-item::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0.5rem;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #3b82f6;
  }
  .timeline-item:not(:last-child)::after {
    content: '';
    position: absolute;
    left: 3.5px;
    top: 1rem;
    width: 1px;
    height: calc(100% + 0.5rem);
    background: var(--color-border);
  }
  .timeline-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-muted);
    margin: 0;
  }
  .timeline-date {
    font-size: 0.85rem;
    margin: 0.15rem 0 0;
    color: var(--color-text);
    font-weight: 500;
  }

  /* Warning */
  .warning-icon {
    margin-bottom: 1rem;
  }
  .warning-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0 0 0.5rem;
  }
  .warning-text {
    font-size: 0.9rem;
    color: var(--color-muted);
    margin: 0 0 0.25rem;
  }
  .warning-meta {
    font-size: 0.8rem;
    color: var(--color-muted);
    margin: 0;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @media (max-width: 768px) {
    .page { padding: 1.25rem 1rem; }
    .field-grid { grid-template-columns: 1fr; }
    .toolbar { flex-direction: column; align-items: stretch; }
    .search { width: 100%; }
    .pagination { flex-direction: column; align-items: stretch; }
    .profile-grid { grid-template-columns: 1fr; }
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
  }
</style>