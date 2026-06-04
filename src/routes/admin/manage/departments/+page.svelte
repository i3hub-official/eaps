<!-- src/routes/admin/manage/departments/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';
  import { Layers, Plus, Edit, Trash2, X, Check, AlertCircle, Search } from 'lucide-svelte';

  let { data, form }: { data: PageData; form: any } = $props();

  let showCreateModal = $state(false);
  let showEditModal = $state(false);
  let showDeleteModal = $state(false);
  let selectedDepartment = $state<any>(null);
  let searchQuery = $state('');
  let loading = $state(false);

  const departments = $derived(
    data.departments?.filter((d: any) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.college?.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) ?? []
  );

  function openEdit(dept: any) {
    selectedDepartment = dept;
    showEditModal = true;
  }

  function openDelete(dept: any) {
    selectedDepartment = dept;
    showDeleteModal = true;
  }

  function closeModals() {
    showCreateModal = false;
    showEditModal = false;
    showDeleteModal = false;
    selectedDepartment = null;
  }
</script>

<svelte:head><title>Manage Departments — MOUAU eTest Admin</title></svelte:head>

<div class="manage-page">
  <div class="page-toolbar">
    <div class="search-box">
      <Search size={16} />
      <input type="text" placeholder="Search departments..." bind:value={searchQuery} />
    </div>
    <button class="btn-primary" onclick={() => showCreateModal = true}>
      <Plus size={16} />
      Add Department
    </button>
  </div>

  {#if form?.error}
    <div class="toast error"><AlertCircle size={14} /> {form.error}</div>
  {/if}
  {#if form?.success}
    <div class="toast success"><Check size={14} /> {form.message}</div>
  {/if}

  <div class="table-wrap">
    <table class="data-table">
      <thead>
        <tr>
          <th>Code</th>
          <th>Name</th>
          <th>College</th>
          <th>Courses</th>
          <th>Created</th>
          <th class="actions">Actions</th>
        </tr>
      </thead>
      <tbody>
        {#if departments.length === 0}
          <tr><td colspan="6" class="empty">No departments found.</td></tr>
        {:else}
          {#each departments as dept}
            <tr>
              <td><span class="badge">{dept.code}</span></td>
              <td class="name-cell">{dept.name}</td>
              <td><span class="college-badge">{dept.college?.name || '—'}</span></td>
              <td><span class="count-badge">{dept._count?.courses ?? 0}</span></td>
              <td class="date-cell">{new Date(dept.createdAt).toLocaleDateString()}</td>
              <td class="actions">
                <button class="action-btn edit" onclick={() => openEdit(dept)} title="Edit">
                  <Edit size={16} />
                </button>
                <button class="action-btn delete" onclick={() => openDelete(dept)} title="Delete">
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>

  <!-- Create Modal -->
  {#if showCreateModal}
    <div class="modal-overlay" onclick={closeModals}>
      <div class="modal" onclick={(e) => e.stopPropagation()}>
        <div class="modal-header">
          <h2><Plus size={18} /> Add Department</h2>
          <button class="modal-close" onclick={closeModals}><X size={18} /></button>
        </div>
        <form method="POST" action="?/create" use:enhance={() => { loading = true; return async ({ update }) => { loading = false; await update(); closeModals(); }; }}>
          <div class="form-group">
            <label>College <span class="req">*</span></label>
            <select name="collegeId" required>
              <option value="">Select a college...</option>
              {#each data.colleges as college}
                <option value={college.id}>{college.name}</option>
              {/each}
            </select>
          </div>
          <div class="form-group">
            <label>Name <span class="req">*</span></label>
            <input type="text" name="name" placeholder="e.g., Computer Science" required />
          </div>
          <div class="form-group">
            <label>Code <span class="req">*</span></label>
            <input type="text" name="code" placeholder="e.g., CSC" required />
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-secondary" onclick={closeModals}>Cancel</button>
            <button type="submit" class="btn-primary" disabled={loading}>
              {#if loading}<span class="spin">⟳</span> Creating...{:else}<Check size={14} /> Create{/if}
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}

  <!-- Edit Modal -->
  {#if showEditModal && selectedDepartment}
    <div class="modal-overlay" onclick={closeModals}>
      <div class="modal" onclick={(e) => e.stopPropagation()}>
        <div class="modal-header">
          <h2><Edit size={18} /> Edit Department</h2>
          <button class="modal-close" onclick={closeModals}><X size={18} /></button>
        </div>
        <form method="POST" action="?/edit" use:enhance={() => { loading = true; return async ({ update }) => { loading = false; await update(); closeModals(); }; }}>
          <input type="hidden" name="id" value={selectedDepartment.id} />
          <div class="form-group">
            <label>College <span class="req">*</span></label>
            <select name="collegeId" required>
              <option value="">Select a college...</option>
              {#each data.colleges as college}
                <option value={college.id} selected={selectedDepartment.collegeId === college.id}>
                  {college.name}
                </option>
              {/each}
            </select>
          </div>
          <div class="form-group">
            <label>Name <span class="req">*</span></label>
            <input type="text" name="name" value={selectedDepartment.name} required />
          </div>
          <div class="form-group">
            <label>Code <span class="req">*</span></label>
            <input type="text" name="code" value={selectedDepartment.code} required />
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-secondary" onclick={closeModals}>Cancel</button>
            <button type="submit" class="btn-primary" disabled={loading}>
              {#if loading}<span class="spin">⟳</span> Saving...{:else}<Check size={14} /> Save Changes{/if}
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}

  <!-- Delete Modal -->
  {#if showDeleteModal && selectedDepartment}
    <div class="modal-overlay" onclick={closeModals}>
      <div class="modal delete-modal" onclick={(e) => e.stopPropagation()}>
        <div class="modal-icon-wrap warning"><AlertCircle size={24} /></div>
        <h2>Delete Department?</h2>
        <p>Are you sure you want to delete <strong>{selectedDepartment.name}</strong>?</p>
        <p class="warning-text">This will also delete all courses under this department.</p>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" onclick={closeModals}>Cancel</button>
          <form method="POST" action="?/delete" use:enhance={() => { loading = true; return async ({ update }) => { loading = false; await update(); closeModals(); }; }}>
            <input type="hidden" name="id" value={selectedDepartment.id} />
            <button type="submit" class="btn-danger" disabled={loading}>
              {#if loading}<span class="spin">⟳</span> Deleting...{:else}<Trash2 size={14} /> Delete{/if}
            </button>
          </form>
        </div>
      </div>
    </div>
  {/if}
</div>