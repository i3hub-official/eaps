<!-- src/routes/admin/manage/courses/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';
  import { BookMarked, Plus, Edit, Trash2, X, Check, AlertCircle, Search } from 'lucide-svelte';

  let { data, form }: { data: PageData; form: any } = $props();

  let showCreateModal = $state(false);
  let showEditModal = $state(false);
  let showDeleteModal = $state(false);
  let selectedCourse = $state<any>(null);
  let searchQuery = $state('');
  let loading = $state(false);

  const courses = $derived(
    data.courses?.filter((c: any) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.department?.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) ?? []
  );

  function openEdit(course: any) {
    selectedCourse = course;
    showEditModal = true;
  }

  function openDelete(course: any) {
    selectedCourse = course;
    showDeleteModal = true;
  }

  function closeModals() {
    showCreateModal = false;
    showEditModal = false;
    showDeleteModal = false;
    selectedCourse = null;
  }

  const LEVELS = [100, 200, 300, 400, 500, 600];
</script>

<svelte:head><title>Manage Courses — MOUAU eTest Admin</title></svelte:head>

<div class="manage-page">
  <div class="page-toolbar">
    <div class="search-box">
      <Search size={16} />
      <input type="text" placeholder="Search courses..." bind:value={searchQuery} />
    </div>
    <button class="btn-primary" onclick={() => showCreateModal = true}>
      <Plus size={16} />
      Add Course
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
          <th>Title</th>
          <th>Department</th>
          <th>College</th>
          <th>Level</th>
          <th>Credit Units</th>
          <th>Created</th>
          <th class="actions">Actions</th>
        </tr>
      </thead>
      <tbody>
        {#if courses.length === 0}
          <tr><td colspan="8" class="empty">No courses found.</td></tr>
        {:else}
          {#each courses as course}
            <tr>
              <td><span class="badge">{course.code}</span></td>
              <td class="name-cell">{course.title}</td>
              <td><span class="dept-badge">{course.department?.name || '—'}</span></td>
              <td><span class="college-badge">{course.department?.college?.name || '—'}</span></td>
              <td><span class="level-badge">{course.level || '—'}</span></td>
              <td>{course.creditUnits}</td>
              <td class="date-cell">{new Date(course.createdAt).toLocaleDateString()}</td>
              <td class="actions">
                <button class="action-btn edit" onclick={() => openEdit(course)} title="Edit">
                  <Edit size={16} />
                </button>
                <button class="action-btn delete" onclick={() => openDelete(course)} title="Delete">
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
          <h2><Plus size={18} /> Add Course</h2>
          <button class="modal-close" onclick={closeModals}><X size={18} /></button>
        </div>
        <form method="POST" action="?/create" use:enhance={() => { loading = true; return async ({ update }) => { loading = false; await update(); closeModals(); }; }}>
          <div class="form-group">
            <label>Department <span class="req">*</span></label>
            <select name="departmentId" required>
              <option value="">Select a department...</option>
              {#each data.departments as dept}
                <option value={dept.id}>{dept.code} - {dept.name} ({dept.college?.name})</option>
              {/each}
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Code <span class="req">*</span></label>
              <input type="text" name="code" placeholder="e.g., CSC101" required />
            </div>
            <div class="form-group">
              <label>Credit Units <span class="req">*</span></label>
              <input type="number" name="creditUnits" value="2" min="1" max="6" required />
            </div>
          </div>
          <div class="form-group">
            <label>Title <span class="req">*</span></label>
            <input type="text" name="title" placeholder="e.g., Introduction to Computer Science" required />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Level</label>
              <select name="level">
                <option value="">Select level...</option>
                {#each LEVELS as level}
                  <option value={level}>{level} Level</option>
                {/each}
              </select>
            </div>
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
  {#if showEditModal && selectedCourse}
    <div class="modal-overlay" onclick={closeModals}>
      <div class="modal" onclick={(e) => e.stopPropagation()}>
        <div class="modal-header">
          <h2><Edit size={18} /> Edit Course</h2>
          <button class="modal-close" onclick={closeModals}><X size={18} /></button>
        </div>
        <form method="POST" action="?/edit" use:enhance={() => { loading = true; return async ({ update }) => { loading = false; await update(); closeModals(); }; }}>
          <input type="hidden" name="id" value={selectedCourse.id} />
          <div class="form-group">
            <label>Department <span class="req">*</span></label>
            <select name="departmentId" required>
              <option value="">Select a department...</option>
              {#each data.departments as dept}
                <option value={dept.id} selected={selectedCourse.departmentId === dept.id}>
                  {dept.code} - {dept.name}
                </option>
              {/each}
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Code <span class="req">*</span></label>
              <input type="text" name="code" value={selectedCourse.code} required />
            </div>
            <div class="form-group">
              <label>Credit Units <span class="req">*</span></label>
              <input type="number" name="creditUnits" value={selectedCourse.creditUnits} min="1" max="6" required />
            </div>
          </div>
          <div class="form-group">
            <label>Title <span class="req">*</span></label>
            <input type="text" name="title" value={selectedCourse.title} required />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Level</label>
              <select name="level">
                <option value="">Select level...</option>
                {#each LEVELS as level}
                  <option value={level} selected={selectedCourse.level === level}>{level} Level</option>
                {/each}
              </select>
            </div>
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
  {#if showDeleteModal && selectedCourse}
    <div class="modal-overlay" onclick={closeModals}>
      <div class="modal delete-modal" onclick={(e) => e.stopPropagation()}>
        <div class="modal-icon-wrap warning"><AlertCircle size={24} /></div>
        <h2>Delete Course?</h2>
        <p>Are you sure you want to delete <strong>{selectedCourse.code} - {selectedCourse.title}</strong>?</p>
        <p class="warning-text">This will also delete all exam records and registrations for this course.</p>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" onclick={closeModals}>Cancel</button>
          <form method="POST" action="?/delete" use:enhance={() => { loading = true; return async ({ update }) => { loading = false; await update(); closeModals(); }; }}>
            <input type="hidden" name="id" value={selectedCourse.id} />
            <button type="submit" class="btn-danger" disabled={loading}>
              {#if loading}<span class="spin">⟳</span> Deleting...{:else}<Trash2 size={14} /> Delete{/if}
            </button>
          </form>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  /* Same styles as colleges page */
  .manage-page { display: flex; flex-direction: column; gap: 1rem; }
  .page-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
  .search-box { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 0.5rem; flex: 1; min-width: 200px; }
  .search-box input { border: none; background: none; outline: none; width: 100%; color: var(--color-text); }
  .btn-primary { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 600; cursor: pointer; }
  .btn-primary:hover { background: #1d4ed8; }
  .btn-secondary { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: transparent; border: 1px solid var(--color-border); border-radius: 0.5rem; color: var(--color-text); cursor: pointer; }
  .btn-secondary:hover { background: var(--color-bg); }
  .btn-danger { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: #dc2626; color: white; border: none; border-radius: 0.5rem; cursor: pointer; }
  .btn-danger:hover { background: #b91c1c; }
  .toast { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; border-radius: 0.5rem; font-size: 0.875rem; }
  .toast.error { background: rgba(220,38,38,0.1); color: #dc2626; border: 1px solid rgba(220,38,38,0.2); }
  .toast.success { background: rgba(34,197,94,0.1); color: #16a34a; border: 1px solid rgba(34,197,94,0.2); }
  .table-wrap { overflow-x: auto; }
  .data-table { width: 100%; border-collapse: collapse; }
  .data-table th, .data-table td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid var(--color-border); }
  .data-table th { color: var(--color-muted); font-size: 0.75rem; font-weight: 600; text-transform: uppercase; background: var(--color-bg); }
  .data-table tr:hover td { background: var(--color-bg); }
  .name-cell { font-weight: 600; color: var(--color-text); }
  .date-cell { color: var(--color-muted); font-size: 0.8rem; }
  .badge { display: inline-block; padding: 0.2rem 0.5rem; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 0.375rem; font-size: 0.75rem; font-family: monospace; }
  .dept-badge { display: inline-block; padding: 0.2rem 0.5rem; background: rgba(99,102,241,0.1); color: #6366f1; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 600; }
  .college-badge { display: inline-block; padding: 0.2rem 0.5rem; background: rgba(59,130,246,0.1); color: #3b82f6; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 600; }
  .level-badge { display: inline-block; padding: 0.2rem 0.5rem; background: rgba(245,158,11,0.1); color: #d97706; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 600; }
  .actions { text-align: center; width: 80px; }
  .action-btn { background: none; border: none; cursor: pointer; padding: 0.25rem; margin: 0 0.25rem; border-radius: 0.25rem; }
  .action-btn.edit:hover { color: #3b82f6; background: rgba(59,130,246,0.1); }
  .action-btn.delete:hover { color: #dc2626; background: rgba(220,38,38,0.1); }
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
  .modal { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; }
  .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; border-bottom: 1px solid var(--color-border); }
  .modal-header h2 { display: flex; align-items: center; gap: 0.5rem; font-size: 1rem; font-weight: 700; margin: 0; }
  .modal-close { background: none; border: none; cursor: pointer; color: var(--color-muted); padding: 0.25rem; border-radius: 0.25rem; }
  .modal-icon-wrap { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; }
  .modal-icon-wrap.warning { background: rgba(245,158,11,0.1); color: #f59e0b; }
  form { padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }
  .form-group { display: flex; flex-direction: column; gap: 0.35rem; }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  label { font-size: 0.75rem; font-weight: 600; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.05em; }
  .req { color: #dc2626; }
  input, select { padding: 0.6rem 0.75rem; border: 1px solid var(--color-border); border-radius: 0.5rem; background: var(--color-bg); color: var(--color-text); font-size: 0.875rem; width: 100%; }
  input:focus, select:focus { outline: none; border-color: #3b82f6; }
  .modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; padding-top: 0.5rem; margin-top: 0.5rem; border-top: 1px solid var(--color-border); }
  .delete-modal { text-align: center; max-width: 400px; }
  .delete-modal p { margin: 0.5rem 0; color: var(--color-text); }
  .warning-text { color: #f59e0b !important; font-size: 0.8rem !important; }
  .empty { text-align: center; color: var(--color-muted); padding: 2rem; }
  .spin { display: inline-block; animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (max-width: 640px) { .form-row { grid-template-columns: 1fr; } .page-toolbar { flex-direction: column; } .search-box { width: 100%; } .btn-primary { width: 100%; justify-content: center; } }
</style>