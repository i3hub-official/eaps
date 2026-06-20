<!-- src/routes/admin/manage/courses/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';
  import { BookMarked, Plus, Pencil, Trash2, X, Check, AlertCircle, Search, Loader2 } from '@lucide/svelte';

  let { data, form }: { data: PageData; form: any } = $props();

  let showCreateModal = $state(false);
  let showEditModal = $state(false);
  let showDeleteModal = $state(false);
  let selectedCourse = $state<any>(null);
  let searchQuery = $state('');
  let loadingAction = $state<string | null>(null);

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
    loadingAction = null;
  }

  function handleEnhance(action: string) {
    return () => {
      loadingAction = action;
      return async ({ update }: { update: () => Promise<void> }) => {
        await update();
        loadingAction = null;
        closeModals();
      };
    };
  }

   // ── Levels (DB-aware, lecturer-assigned) ──────────────────────────────────
  const LEVELS = $derived(
    (data.levels ?? []).map(l => l.value).sort((a, b) => a - b)
  );
</script>

<svelte:head><title>Manage Courses — MOUAU eTest Admin</title></svelte:head>

<div class="manage-page">
  <div class="page-header">
    <div class="page-title">
      <BookMarked size={22} class="title-icon" />
      <div>
        <h1>Courses</h1>
        <p class="subtitle">{courses.length} course{courses.length !== 1 ? 's' : ''} across all departments</p>
      </div>
    </div>
    <button class="btn-primary" onclick={() => showCreateModal = true}>
      <Plus size={16} />
      Add Course
    </button>
  </div>

  <div class="page-toolbar">
    <div class="search-box">
      <Search size={16} />
      <input type="text" placeholder="Search by code, title, or department..." bind:value={searchQuery} />
      {#if searchQuery}
        <button class="search-clear" onclick={() => searchQuery = ''}><X size={14} /></button>
      {/if}
    </div>
  </div>

  {#if form?.error}
    <div class="toast error" role="alert">
      <AlertCircle size={16} />
      <span>{form.error}</span>
      <button class="toast-close" onclick={() => form = null}><X size={14} /></button>
    </div>
  {/if}
  {#if form?.success}
    <div class="toast success" role="status">
      <Check size={16} />
      <span>{form.message}</span>
      <button class="toast-close" onclick={() => form = null}><X size={14} /></button>
    </div>
  {/if}

  <div class="table-card">
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Title</th>
            <th>Department</th>
            <th>College</th>
            <th class="numeric">Level</th>
            <th class="numeric">Credits</th>
            <th>Created</th>
            <th class="actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#if courses.length === 0}
            <tr>
              <td colspan="8" class="empty">
                <div class="empty-state">
                  <BookMarked size={40} class="empty-icon" />
                  <p class="empty-title">No courses found</p>
                  <p class="empty-desc">{searchQuery ? 'Try adjusting your search terms.' : 'Get started by adding your first course.'}</p>
                  {#if !searchQuery}
                    <button class="btn-primary btn-sm" onclick={() => showCreateModal = true}>
                      <Plus size={14} /> Add Course
                    </button>
                  {/if}
                </div>
              </td>
            </tr>
          {:else}
            {#each courses as course}
              <tr>
                <td><span class="badge code-badge">{course.code}</span></td>
                <td class="name-cell">{course.title}</td>
                <td><span class="dept-badge">{course.department?.name || '—'}</span></td>
                <td><span class="college-badge">{course.department?.college?.name || '—'}</span></td>
                <td class="numeric"><span class="level-badge">{course.level || '—'}</span></td>
                <td class="numeric"><span class="count-badge">{course.creditUnits}</span></td>
                <td class="date-cell">{new Date(course.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                <td class="actions">
                  <div class="action-group">
                    <button class="action-btn edit" onclick={() => openEdit(course)} title="Edit course">
                      <Pencil size={15} />
                    </button>
                    <button class="action-btn delete" onclick={() => openDelete(course)} title="Delete course">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </div>

  <!-- Create Modal -->
  {#if showCreateModal}
    <div class="modal-overlay" onclick={closeModals} role="dialog" aria-modal="true" aria-labelledby="create-title">
      <div class="modal" onclick={(e) => e.stopPropagation()}>
        <div class="modal-header">
          <div class="modal-title-wrap">
            <div class="modal-icon blue"><Plus size={18} /></div>
            <h2 id="create-title">Add Course</h2>
          </div>
          <button class="modal-close" onclick={closeModals} aria-label="Close modal"><X size={18} /></button>
        </div>
        <form method="POST" action="?/create" use:enhance={handleEnhance('create')}>
          <div class="form-body">
            <div class="form-group">
              <label for="create-dept">Department <span class="req">*</span></label>
              <select id="create-dept" name="departmentId" required>
                <option value="">Select a department...</option>
                {#each data.departments as dept}
                  <option value={dept.id}>{dept.code} — {dept.name} ({dept.college?.name})</option>
                {/each}
              </select>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="create-code">Code <span class="req">*</span></label>
                <input id="create-code" type="text" name="code" placeholder="e.g., CSC101" required maxlength="10" />
              </div>
              <div class="form-group">
                <label for="create-credits">Credit Units <span class="req">*</span></label>
                <input id="create-credits" type="number" name="creditUnits" value="2" min="1" max="6" required />
              </div>
            </div>
            <div class="form-group">
              <label for="create-title-input">Title <span class="req">*</span></label>
              <input id="create-title-input" type="text" name="title" placeholder="e.g., Introduction to Computer Science" required />
            </div>
            <div class="form-group">
              <label for="create-level">Level</label>
              <select id="create-level" name="level">
                <option value="">Select level...</option>
                {#each LEVELS as level}
                  <option value={level}>{level} Level</option>
                {/each}
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-secondary" onclick={closeModals}>Cancel</button>
            <button type="submit" class="btn-primary" disabled={loadingAction === 'create'}>
              {#if loadingAction === 'create'}
                <Loader2 size={14} class="spin" /> Creating...
              {:else}
                <Plus size={14} /> Create Course
              {/if}
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}

  <!-- Edit Modal -->
  {#if showEditModal && selectedCourse}
    <div class="modal-overlay" onclick={closeModals} role="dialog" aria-modal="true" aria-labelledby="edit-title">
      <div class="modal" onclick={(e) => e.stopPropagation()}>
        <div class="modal-header">
          <div class="modal-title-wrap">
            <div class="modal-icon blue"><Pencil size={18} /></div>
            <h2 id="edit-title">Edit Course</h2>
          </div>
          <button class="modal-close" onclick={closeModals} aria-label="Close modal"><X size={18} /></button>
        </div>
        <form method="POST" action="?/edit" use:enhance={handleEnhance('edit')}>
          <input type="hidden" name="id" value={selectedCourse.id} />
          <div class="form-body">
            <div class="form-group">
              <label for="edit-dept">Department <span class="req">*</span></label>
              <select id="edit-dept" name="departmentId" required>
                <option value="">Select a department...</option>
                {#each data.departments as dept}
                  <option value={dept.id} selected={selectedCourse.departmentId === dept.id}>
                    {dept.code} — {dept.name}
                  </option>
                {/each}
              </select>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="edit-code">Code <span class="req">*</span></label>
                <input id="edit-code" type="text" name="code" value={selectedCourse.code} required maxlength="10" />
              </div>
              <div class="form-group">
                <label for="edit-credits">Credit Units <span class="req">*</span></label>
                <input id="edit-credits" type="number" name="creditUnits" value={selectedCourse.creditUnits} min="1" max="6" required />
              </div>
            </div>
            <div class="form-group">
              <label for="edit-title-input">Title <span class="req">*</span></label>
              <input id="edit-title-input" type="text" name="title" value={selectedCourse.title} required />
            </div>
            <div class="form-group">
              <label for="edit-level">Level</label>
              <select id="edit-level" name="level">
                <option value="">Select level...</option>
                {#each LEVELS as level}
                  <option value={level} selected={selectedCourse.level === level}>{level} Level</option>
                {/each}
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-secondary" onclick={closeModals}>Cancel</button>
            <button type="submit" class="btn-primary" disabled={loadingAction === 'edit'}>
              {#if loadingAction === 'edit'}
                <Loader2 size={14} class="spin" /> Saving...
              {:else}
                <Check size={14} /> Save Changes
              {/if}
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}

  <!-- Delete Modal -->
  {#if showDeleteModal && selectedCourse}
    <div class="modal-overlay" onclick={closeModals} role="dialog" aria-modal="true" aria-labelledby="delete-title">
      <div class="modal delete-modal" onclick={(e) => e.stopPropagation()}>
        <div class="modal-icon-wrap danger"><AlertCircle size={28} /></div>
        <h2 id="delete-title">Delete Course?</h2>
        <p class="delete-target">Are you sure you want to delete <strong>{selectedCourse.code}</strong> — {selectedCourse.title}?</p>
        <div class="warning-box">
          <AlertCircle size={16} />
          <span>This will also delete all exam records and registrations for this course. This action cannot be undone.</span>
        </div>
        <div class="modal-footer center">
          <button type="button" class="btn-secondary" onclick={closeModals}>Cancel</button>
          <form method="POST" action="?/delete" use:enhance={handleEnhance('delete')} style="display:contents">
            <input type="hidden" name="id" value={selectedCourse.id} />
            <button type="submit" class="btn-danger" disabled={loadingAction === 'delete'}>
              {#if loadingAction === 'delete'}
                <Loader2 size={14} class="spin" /> Deleting...
              {:else}
                <Trash2 size={14} /> Yes, Delete
              {/if}
            </button>
          </form>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .manage-page { display: flex; flex-direction: column; gap: 1.25rem; }

  /* ── Page Header ─────────────────────────────────────────────── */
  .page-header {
    display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap;
  }
  .page-title { display: flex; align-items: center; gap: 0.875rem; }
  .page-title :global(.title-icon) { color: #3b82f6; flex-shrink: 0; }
  .page-title h1 { font-size: 1.35rem; font-weight: 700; color: var(--color-text); line-height: 1.2; margin: 0; }
  .subtitle { font-size: 0.8rem; color: var(--color-muted); margin-top: 0.15rem; }

  /* ── Toolbar ─────────────────────────────────────────────────── */
  .page-toolbar { display: flex; align-items: center; gap: 1rem; }
  .search-box {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.55rem 0.875rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.625rem;
    flex: 1; max-width: 400px;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .search-box:focus-within { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
  .search-box input { border: none; background: none; outline: none; width: 100%; color: var(--color-text); font-size: 0.875rem; }
  .search-box :global(svg) { color: var(--color-muted); flex-shrink: 0; }
  .search-clear {
    background: none; border: none; cursor: pointer; color: var(--color-muted);
    padding: 0.15rem; border-radius: 0.25rem; display: flex; align-items: center;
    transition: color 0.15s;
  }
  .search-clear:hover { color: var(--color-text); }

  /* ── Buttons ─────────────────────────────────────────────────── */
  .btn-primary {
    display: inline-flex; align-items: center; gap: 0.5rem;
    padding: 0.55rem 1.1rem;
    background: #3b82f6; color: white;
    border: none; border-radius: 0.5rem;
    font-size: 0.875rem; font-weight: 600; cursor: pointer;
    transition: background 0.15s, transform 0.1s;
    white-space: nowrap;
  }
  .btn-primary:hover:not(:disabled) { background: #2563eb; }
  .btn-primary:active:not(:disabled) { transform: translateY(1px); }
  .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
  .btn-sm { padding: 0.4rem 0.875rem; font-size: 0.8rem; }

  .btn-secondary {
    display: inline-flex; align-items: center; gap: 0.5rem;
    padding: 0.55rem 1.1rem;
    background: transparent;
    border: 1px solid var(--color-border); border-radius: 0.5rem;
    color: var(--color-text); font-size: 0.875rem; font-weight: 600;
    cursor: pointer; transition: all 0.15s;
  }
  .btn-secondary:hover { background: var(--color-bg); border-color: var(--color-text); }

  .btn-danger {
    display: inline-flex; align-items: center; gap: 0.5rem;
    padding: 0.55rem 1.1rem;
    background: #dc2626; color: white;
    border: none; border-radius: 0.5rem;
    font-size: 0.875rem; font-weight: 600; cursor: pointer;
    transition: background 0.15s, transform 0.1s;
  }
  .btn-danger:hover:not(:disabled) { background: #b91c1c; }
  .btn-danger:active:not(:disabled) { transform: translateY(1px); }
  .btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }

  /* ── Toasts ──────────────────────────────────────────────────── */
  .toast {
    display: flex; align-items: center; gap: 0.625rem;
    padding: 0.875rem 1rem;
    border-radius: 0.625rem;
    font-size: 0.875rem; font-weight: 500;
    animation: slideIn 0.2s ease;
  }
  .toast.error {
    background: rgba(220,38,38,0.08);
    color: #dc2626;
    border: 1px solid rgba(220,38,38,0.15);
  }
  .toast.success {
    background: rgba(34,197,94,0.08);
    color: #16a34a;
    border: 1px solid rgba(34,197,94,0.15);
  }
  .toast-close {
    margin-left: auto;
    background: none; border: none; cursor: pointer;
    color: currentColor; opacity: 0.5; padding: 0.15rem;
    border-radius: 0.25rem; display: flex; align-items: center;
    transition: opacity 0.15s;
  }
  .toast-close:hover { opacity: 1; }
  @keyframes slideIn {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── Table ───────────────────────────────────────────────────── */
  .table-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    overflow: hidden;
  }
  .table-wrap { overflow-x: auto; }
  .data-table { width: 100%; border-collapse: collapse; }
  .data-table th, .data-table td {
    padding: 0.85rem 1.125rem;
    text-align: left;
    border-bottom: 1px solid var(--color-border);
  }
  .data-table th {
    color: var(--color-muted);
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    background: var(--color-bg);
    white-space: nowrap;
  }
  .data-table tbody tr { transition: background 0.1s; }
  .data-table tbody tr:hover td { background: var(--color-bg); }
  .data-table tbody tr:last-child td { border-bottom: none; }

  .name-cell { font-weight: 600; color: var(--color-text); }
  .date-cell { color: var(--color-muted); font-size: 0.8rem; white-space: nowrap; }
  .numeric { text-align: center; }

  .badge {
    display: inline-flex; align-items: center;
    padding: 0.25rem 0.625rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-family: ui-monospace, SFMono-Regular, monospace;
    font-weight: 600;
  }
  .code-badge { color: #3b82f6; border-color: rgba(59,130,246,0.2); background: rgba(59,130,246,0.06); }
  .dept-badge {
    display: inline-flex; align-items: center;
    padding: 0.25rem 0.625rem;
    background: rgba(99,102,241,0.08);
    color: #6366f1;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 600;
  }
  .college-badge {
    display: inline-flex; align-items: center;
    padding: 0.25rem 0.625rem;
    background: rgba(59,130,246,0.08);
    color: #3b82f6;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 600;
  }
  .level-badge {
    display: inline-flex; align-items: center;
    padding: 0.25rem 0.625rem;
    background: rgba(245,158,11,0.08);
    color: #d97706;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 600;
  }
  .count-badge {
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 28px;
    padding: 0.2rem 0.5rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-muted);
  }

  .actions { text-align: center; width: 100px; white-space: nowrap; }
  .action-group {
    display: inline-flex; align-items: center; gap: 0.25rem;
    opacity: 0.6;
    transition: opacity 0.15s;
  }
  .data-table tbody tr:hover .action-group { opacity: 1; }
  .action-btn {
    display: inline-flex; align-items: center; justify-content: center;
    width: 32px; height: 32px;
    background: none; border: none; cursor: pointer;
    color: var(--color-muted);
    border-radius: 0.375rem;
    transition: all 0.15s;
  }
  .action-btn:hover { color: var(--color-text); background: var(--color-bg); }
  .action-btn.edit:hover { color: #3b82f6; background: rgba(59,130,246,0.1); }
  .action-btn.delete:hover { color: #dc2626; background: rgba(220,38,38,0.1); }

  /* ── Empty State ─────────────────────────────────────────────── */
  .empty { padding: 0 !important; }
  .empty-state {
    display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
    padding: 3rem 1.5rem; text-align: center;
  }
  .empty-state :global(.empty-icon) { color: var(--color-border); }
  .empty-title { font-size: 0.95rem; font-weight: 600; color: var(--color-text); margin: 0; }
  .empty-desc { font-size: 0.8rem; color: var(--color-muted); margin: 0; }

  /* ── Modal ───────────────────────────────────────────────────── */
  .modal-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.45);
    backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000;
    padding: 1rem;
    animation: fadeIn 0.15s ease;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

  .modal {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.875rem;
    width: 100%; max-width: 520px;
    max-height: 90vh;
    overflow: hidden;
    display: flex; flex-direction: column;
    animation: modalUp 0.2s cubic-bezier(.16,1,.3,1);
    box-shadow: 0 20px 60px rgba(0,0,0,0.2);
  }
  @keyframes modalUp {
    from { opacity: 0; transform: translateY(16px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  .modal-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 1.125rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }
  .modal-title-wrap { display: flex; align-items: center; gap: 0.75rem; }
  .modal-icon {
    width: 36px; height: 36px; border-radius: 0.5rem;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .modal-icon.blue { background: rgba(59,130,246,0.1); color: #3b82f6; }
  .modal-header h2 { font-size: 1.05rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .modal-close {
    background: none; border: none; cursor: pointer;
    color: var(--color-muted); padding: 0.35rem;
    border-radius: 0.375rem; display: flex; align-items: center;
    transition: all 0.15s;
  }
  .modal-close:hover { color: var(--color-text); background: var(--color-bg); }

  .form-body {
    padding: 1.25rem;
    display: flex; flex-direction: column; gap: 1rem;
    overflow-y: auto;
  }
  .form-group { display: flex; flex-direction: column; gap: 0.4rem; }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  label { font-size: 0.72rem; font-weight: 700; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.06em; }
  .req { color: #dc2626; }
  input, select {
    padding: 0.65rem 0.875rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-bg);
    color: var(--color-text);
    font-size: 0.875rem;
    width: 100%;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  input:focus, select:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
  input::placeholder { color: var(--color-muted); opacity: 0.6; }

  .modal-footer {
    display: flex; justify-content: flex-end; gap: 0.75rem;
    padding: 1rem 1.25rem;
    border-top: 1px solid var(--color-border);
    flex-shrink: 0;
  }
  .modal-footer.center { justify-content: center; }

  /* ── Delete Modal ────────────────────────────────────────────── */
  .delete-modal { max-width: 420px; text-align: center; padding: 2rem 1.5rem 1.5rem; }
  .delete-modal .modal-icon-wrap {
    width: 56px; height: 56px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 1rem;
  }
  .delete-modal .modal-icon-wrap.danger { background: rgba(220,38,38,0.1); color: #dc2626; }
  .delete-modal h2 { font-size: 1.1rem; font-weight: 700; color: var(--color-text); margin: 0 0 0.5rem; }
  .delete-target { color: var(--color-muted); font-size: 0.875rem; margin: 0 0 1rem; }
  .delete-target strong { color: var(--color-text); }
  .warning-box {
    display: flex; align-items: flex-start; gap: 0.625rem;
    padding: 0.875rem 1rem;
    background: rgba(245,158,11,0.08);
    border: 1px solid rgba(245,158,11,0.2);
    border-radius: 0.5rem;
    color: #b45309;
    font-size: 0.8rem;
    text-align: left;
    margin-bottom: 1.25rem;
  }
  .warning-box :global(svg) { flex-shrink: 0; margin-top: 0.1rem; }

  /* ── Spin ────────────────────────────────────────────────────── */
  :global(.spin) { animation: spin 0.7s linear infinite; display: inline-block; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Responsive ──────────────────────────────────────────────── */
  @media (max-width: 640px) {
    .page-header { flex-direction: column; align-items: stretch; }
    .page-title { justify-content: center; text-align: center; }
    .page-toolbar { flex-direction: column; }
    .search-box { max-width: none; width: 100%; }
    .form-row { grid-template-columns: 1fr; }
    .data-table th, .data-table td { padding: 0.75rem 0.75rem; }
    .actions { width: 80px; }
    .modal-footer { flex-direction: column-reverse; }
    .modal-footer :global(.btn-secondary), .modal-footer :global(.btn-primary), .modal-footer :global(.btn-danger) { width: 100%; justify-content: center; }
  }
</style>