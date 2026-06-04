<!-- src/routes/admin/manage/course-registrations/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';
  import { UserPlus, Plus, Edit, Trash2, X, Check, AlertCircle, Search, Eye, User, BookOpen } from 'lucide-svelte';

  let { data, form }: { data: PageData; form: any } = $props();

  let showCreateModal = $state(false);
  let showEditModal = $state(false);
  let showDeleteModal = $state(false);
  let showViewModal = $state(false);
  let selectedRegistration = $state<any>(null);
  let searchQuery = $state('');
  let loading = $state(false);

  const SESSIONS = ['2022/2023', '2023/2024', '2024/2025', '2025/2026', '2026/2027'];
  const SEMESTERS = [{ value: 1, label: 'First Semester' }, { value: 2, label: 'Second Semester' }];

  const registrations = $derived(
    data.registrations?.filter((r: any) =>
      r.student?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.student?.matricNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.course?.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.course?.title?.toLowerCase().includes(searchQuery.toLowerCase())
    ) ?? []
  );

  function openView(reg: any) {
    selectedRegistration = reg;
    showViewModal = true;
  }

  function openEdit(reg: any) {
    selectedRegistration = reg;
    showEditModal = true;
  }

  function openDelete(reg: any) {
    selectedRegistration = reg;
    showDeleteModal = true;
  }

  function closeModals() {
    showCreateModal = false;
    showEditModal = false;
    showDeleteModal = false;
    showViewModal = false;
    selectedRegistration = null;
  }
</script>

<svelte:head><title>Manage Course Registrations — MOUAU eTest Admin</title></svelte:head>

<div class="manage-page">
  <div class="page-toolbar">
    <div class="search-box">
      <Search size={16} />
      <input type="text" placeholder="Search by student name, matric number, or course..." bind:value={searchQuery} />
    </div>
    <button class="btn-primary" onclick={() => showCreateModal = true}>
      <Plus size={16} />
      Add Registration
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
          <th>Student</th>
          <th>Matric No</th>
          <th>Course</th>
          <th>Department</th>
          <th>Session</th>
          <th>Semester</th>
          <th>Registered</th>
          <th class="actions">Actions</th>
        </tr>
      </thead>
      <tbody>
        {#if registrations.length === 0}
          <tr><td colspan="8" class="empty">No course registrations found.</td></tr>
        {:else}
          {#each registrations as reg}
            <tr>
              <td>
                <div class="student-cell">
                  <div class="student-avatar">{reg.student?.fullName?.charAt(0)?.toUpperCase() ?? 'S'}</div>
                  <span class="student-name">{reg.student?.fullName || '—'}</span>
                </div>
              </td>
              <td><span class="matric">{reg.student?.matricNumber || '—'}</span></td>
              <td>
                <div class="course-cell">
                  <div class="course-code">{reg.course?.code}</div>
                  <div class="course-title">{reg.course?.title}</div>
                </div>
              </td>
              <td>{reg.course?.department?.name || '—'}</td>
              <td><span class="session-badge">{reg.session}</span></td>
              <td><span class="semester-badge">{reg.semester === 1 ? 'First' : 'Second'}</span></td>
              <td class="date-cell">{new Date(reg.createdAt).toLocaleDateString()}</td>
              <td class="actions">
                <button class="action-btn view" onclick={() => openView(reg)} title="View">
                  <Eye size={16} />
                </button>
                <button class="action-btn edit" onclick={() => openEdit(reg)} title="Edit">
                  <Edit size={16} />
                </button>
                <button class="action-btn delete" onclick={() => openDelete(reg)} title="Delete">
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
      <div class="modal modal-large" onclick={(e) => e.stopPropagation()}>
        <div class="modal-header">
          <h2><UserPlus size={18} /> Add Course Registration</h2>
          <button class="modal-close" onclick={closeModals}><X size={18} /></button>
        </div>
        <form method="POST" action="?/create" use:enhance={() => { loading = true; return async ({ update }) => { loading = false; await update(); closeModals(); }; }}>
          <div class="form-row">
            <div class="form-group">
              <label>Student <span class="req">*</span></label>
              <select name="studentId" required>
                <option value="">Select a student...</option>
                {#each data.students as student}
                  <option value={student.id}>{student.fullName} ({student.matricNumber})</option>
                {/each}
              </select>
            </div>
            <div class="form-group">
              <label>Course <span class="req">*</span></label>
              <select name="courseId" required>
                <option value="">Select a course...</option>
                {#each data.courses as course}
                  <option value={course.id}>{course.code} - {course.title}</option>
                {/each}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Session <span class="req">*</span></label>
              <select name="session" required>
                <option value="">Select session...</option>
                {#each SESSIONS as session}
                  <option value={session}>{session}</option>
                {/each}
              </select>
            </div>
            <div class="form-group">
              <label>Semester <span class="req">*</span></label>
              <select name="semester" required>
                <option value="">Select semester...</option>
                {#each SEMESTERS as sem}
                  <option value={sem.value}>{sem.label}</option>
                {/each}
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-secondary" onclick={closeModals}>Cancel</button>
            <button type="submit" class="btn-primary" disabled={loading}>
              {#if loading}<span class="spin">⟳</span> Creating...{:else}<Check size={14} /> Create Registration{/if}
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}

  <!-- Edit Modal -->
  {#if showEditModal && selectedRegistration}
    <div class="modal-overlay" onclick={closeModals}>
      <div class="modal modal-large" onclick={(e) => e.stopPropagation()}>
        <div class="modal-header">
          <h2><Edit size={18} /> Edit Course Registration</h2>
          <button class="modal-close" onclick={closeModals}><X size={18} /></button>
        </div>
        <form method="POST" action="?/edit" use:enhance={() => { loading = true; return async ({ update }) => { loading = false; await update(); closeModals(); }; }}>
          <input type="hidden" name="id" value={selectedRegistration.id} />
          <div class="form-row">
            <div class="form-group">
              <label>Student <span class="req">*</span></label>
              <select name="studentId" required>
                <option value="">Select a student...</option>
                {#each data.students as student}
                  <option value={student.id} selected={selectedRegistration.studentId === student.id}>
                    {student.fullName} ({student.matricNumber})
                  </option>
                {/each}
              </select>
            </div>
            <div class="form-group">
              <label>Course <span class="req">*</span></label>
              <select name="courseId" required>
                <option value="">Select a course...</option>
                {#each data.courses as course}
                  <option value={course.id} selected={selectedRegistration.courseId === course.id}>
                    {course.code} - {course.title}
                  </option>
                {/each}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Session <span class="req">*</span></label>
              <select name="session" required>
                <option value="">Select session...</option>
                {#each SESSIONS as session}
                  <option value={session} selected={selectedRegistration.session === session}>
                    {session}
                  </option>
                {/each}
              </select>
            </div>
            <div class="form-group">
              <label>Semester <span class="req">*</span></label>
              <select name="semester" required>
                <option value="">Select semester...</option>
                {#each SEMESTERS as sem}
                  <option value={sem.value} selected={selectedRegistration.semester === sem.value}>
                    {sem.label}
                  </option>
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

  <!-- View Modal -->
  {#if showViewModal && selectedRegistration}
    <div class="modal-overlay" onclick={closeModals}>
      <div class="modal modal-large" onclick={(e) => e.stopPropagation()}>
        <div class="modal-header">
          <h2><Eye size={18} /> Registration Details</h2>
          <button class="modal-close" onclick={closeModals}><X size={18} /></button>
        </div>
        <div class="view-content">
          <div class="view-section">
            <h3>Student Information</h3>
            <div class="view-row"><span class="view-label">Full Name:</span><span>{selectedRegistration.student?.fullName}</span></div>
            <div class="view-row"><span class="view-label">Matric Number:</span><span>{selectedRegistration.student?.matricNumber || '—'}</span></div>
            <div class="view-row"><span class="view-label">Email:</span><span>{selectedRegistration.student?.email}</span></div>
            <div class="view-row"><span class="view-label">Level:</span><span>{selectedRegistration.student?.level || '—'}</span></div>
          </div>
          <div class="view-section">
            <h3>Course Information</h3>
            <div class="view-row"><span class="view-label">Course Code:</span><span>{selectedRegistration.course?.code}</span></div>
            <div class="view-row"><span class="view-label">Course Title:</span><span>{selectedRegistration.course?.title}</span></div>
            <div class="view-row"><span class="view-label">Credit Units:</span><span>{selectedRegistration.course?.creditUnits}</span></div>
            <div class="view-row"><span class="view-label">Department:</span><span>{selectedRegistration.course?.department?.name}</span></div>
          </div>
          <div class="view-section">
            <h3>Registration Details</h3>
            <div class="view-row"><span class="view-label">Session:</span><span>{selectedRegistration.session}</span></div>
            <div class="view-row"><span class="view-label">Semester:</span><span>{selectedRegistration.semester === 1 ? 'First Semester' : 'Second Semester'}</span></div>
            <div class="view-row"><span class="view-label">Registered On:</span><span>{new Date(selectedRegistration.createdAt).toLocaleString()}</span></div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" onclick={closeModals}>Close</button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Delete Modal -->
  {#if showDeleteModal && selectedRegistration}
    <div class="modal-overlay" onclick={closeModals}>
      <div class="modal delete-modal" onclick={(e) => e.stopPropagation()}>
        <div class="modal-icon-wrap warning"><AlertCircle size={24} /></div>
        <h2>Delete Registration?</h2>
        <p>Are you sure you want to remove <strong>{selectedRegistration.student?.fullName}</strong> from <strong>{selectedRegistration.course?.code}</strong>?</p>
        <p class="warning-text">This action cannot be undone and may affect grade calculations.</p>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" onclick={closeModals}>Cancel</button>
          <form method="POST" action="?/delete" use:enhance={() => { loading = true; return async ({ update }) => { loading = false; await update(); closeModals(); }; }}>
            <input type="hidden" name="id" value={selectedRegistration.id} />
            <button type="submit" class="btn-danger" disabled={loading}>
              {#if loading}<span class="spin">⟳</span> Deleting...{:else}<Trash2 size={14} /> Delete Registration{/if}
            </button>
          </form>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
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
  .student-cell { display: flex; align-items: center; gap: 0.5rem; }
  .student-avatar { width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #1d4ed8); display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.7rem; color: white; flex-shrink: 0; }
  .student-name { font-weight: 600; color: var(--color-text); }
  .matric { font-size: 0.75rem; color: var(--color-muted); font-family: monospace; }
  .course-cell { display: flex; flex-direction: column; }
  .course-code { font-weight: 600; font-size: 0.8rem; color: var(--color-text); }
  .course-title { font-size: 0.7rem; color: var(--color-muted); }
  .session-badge { display: inline-block; padding: 0.2rem 0.5rem; background: rgba(99,102,241,0.1); color: #6366f1; border-radius: 0.375rem; font-size: 0.7rem; font-weight: 600; }
  .semester-badge { display: inline-block; padding: 0.2rem 0.5rem; background: rgba(22,163,74,0.1); color: #16a34a; border-radius: 0.375rem; font-size: 0.7rem; font-weight: 600; }
  .date-cell { color: var(--color-muted); font-size: 0.75rem; }
  .actions { text-align: center; width: 100px; }
  .action-btn { background: none; border: none; cursor: pointer; padding: 0.25rem; margin: 0 0.125rem; border-radius: 0.25rem; }
  .action-btn.view:hover { color: #6366f1; background: rgba(99,102,241,0.1); }
  .action-btn.edit:hover { color: #3b82f6; background: rgba(59,130,246,0.1); }
  .action-btn.delete:hover { color: #dc2626; background: rgba(220,38,38,0.1); }
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
  .modal { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; }
  .modal-large { max-width: 650px; }
  .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; border-bottom: 1px solid var(--color-border); }
  .modal-header h2 { display: flex; align-items: center; gap: 0.5rem; font-size: 1rem; font-weight: 700; margin: 0; }
  .modal-close { background: none; border: none; cursor: pointer; color: var(--color-muted); padding: 0.25rem; border-radius: 0.25rem; }
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
  .view-content { padding: 1.25rem; display: flex; flex-direction: column; gap: 1.5rem; }
  .view-section h3 { font-size: 0.85rem; font-weight: 700; color: var(--color-text); margin: 0 0 0.75rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--color-border); }
  .view-row { display: flex; margin-bottom: 0.5rem; }
  .view-label { width: 140px; flex-shrink: 0; font-size: 0.75rem; color: var(--color-muted); font-weight: 600; }
  .view-row span:last-child { font-size: 0.875rem; color: var(--color-text); }
  @media (max-width: 640px) { .form-row { grid-template-columns: 1fr; } .page-toolbar { flex-direction: column; } .search-box { width: 100%; } .btn-primary { width: 100%; justify-content: center; } .view-row { flex-direction: column; gap: 0.25rem; } .view-label { width: auto; } }
</style>