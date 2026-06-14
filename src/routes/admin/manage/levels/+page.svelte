<!-- src/routes/admin/manage/levels/+page.svelte -->
<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import { invalidate } from '$app/navigation';
  import { GraduationCap, Plus, Pencil, Trash2, X, Check, AlertCircle, Search, Loader2, RotateCcw } from '@lucide/svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let editingId = $state<number | null>(null);
  let editedLevel = $state('');
  let searchQuery = $state('');
  let deletingId = $state<number | null>(null);
  let adding = $state(false);
  let resetting = $state(false);
  let showResetModal = $state(false);
  let showAddModal = $state(false);
  let newLevelValue = $state('');

  let levels = $state(data.levels ?? []);

  const filteredLevels = $derived(
    levels.filter((l: any) =>
      l.level.toString().includes(searchQuery) ||
      l.name?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const DEFAULT_LEVELS = [100, 200, 300, 400, 500, 600];

  function startEdit(l: any) {
    editingId = l.id;
    editedLevel = l.level.toString();
  }

  function cancelEdit() {
    editingId = null;
    editedLevel = '';
  }

  function closeAddModal() {
    showAddModal = false;
    newLevelValue = '';
  }

  function closeResetModal() {
    showResetModal = false;
  }

  function formatCount(l: any): string {
    const total = (l._count?.users ?? 0) + (l._count?.exams ?? 0) + (l._count?.registrations ?? 0);
    if (total === 0) return 'No usage';
    return `${l._count?.users ?? 0} students, ${l._count?.exams ?? 0} exams, ${l._count?.registrations ?? 0} registrations`;
  }

  // ── Enhance wrappers ───────────────────────────────────────────────────────

  function handleEditEnhance() {
    return async ({ result, update }: { result: any; update: () => Promise<void> }) => {
      await update();
      if (result.type === 'success') {
        const levelNum = parseInt(editedLevel);
        const idx = levels.findIndex((l: any) => l.id === editingId);
        if (idx !== -1) {
          levels[idx] = { 
            ...levels[idx], 
            level: levelNum, 
            name: `${levelNum} Level`,
            order: levelNum / 100
          };
          levels = [...levels].sort((a: any, b: any) => a.level - b.level);
        }
        editingId = null;
      }
    };
  }

  function handleDeleteEnhance(id: number) {
    deletingId = id;
    return async ({ result, update }: { result: any; update: () => Promise<void> }) => {
      await update();
      if (result.type === 'success') {
        levels = levels.filter((l: any) => l.id !== id);
      }
      deletingId = null;
    };
  }

  function handleAddEnhance() {
    adding = true;
    return async ({ result, update }: { result: any; update: () => Promise<void> }) => {
      await update();
      if (result.type === 'success') {
        // Close modal and refresh data from server
        showAddModal = false;
        newLevelValue = '';
        await invalidate('admin:levels');
      }
      adding = false;
    };
  }

  function handleResetEnhance() {
    resetting = true;
    return async ({ result, update }: { result: any; update: () => Promise<void> }) => {
      await update();
      if (result.type === 'success') {
        showResetModal = false;
        await invalidate('admin:levels');
      }
      resetting = false;
    };
  }
</script>

<svelte:head><title>Manage Levels — MOUAU eTest Admin</title></svelte:head>

<div class="manage-page">
  <div class="page-header">
    <div class="page-title">
      <GraduationCap size={22} class="title-icon" />
      <div>
        <h1>Academic Levels</h1>
        <p class="subtitle">{levels.length} level{levels.length !== 1 ? 's' : ''} configured</p>
      </div>
    </div>
    <div class="header-actions">
      <button class="btn-primary" onclick={() => showAddModal = true}>
        <Plus size={16} /> Add Level
      </button>
      <button class="btn-outline" onclick={() => showResetModal = true}>
        <RotateCcw size={14} /> Reset to Default
      </button>
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

  <div class="page-toolbar">
    <div class="search-box">
      <Search size={16} />
      <input type="text" placeholder="Search levels..." bind:value={searchQuery} />
      {#if searchQuery}
        <button class="search-clear" onclick={() => searchQuery = ''}><X size={14} /></button>
      {/if}
    </div>
  </div>

  {#if filteredLevels.length === 0}
    <div class="empty-state">
      <GraduationCap size={48} class="empty-icon" strokeWidth={1.2} />
      <p class="empty-title">No levels found</p>
      <p class="empty-desc">{searchQuery ? 'Try adjusting your search terms.' : 'Add a custom level to get started.'}</p>
      {#if !searchQuery}
        <button class="btn-primary btn-sm" onclick={() => showAddModal = true}>
          <Plus size={14} /> Add Level
        </button>
      {/if}
    </div>
  {:else}
    <div class="levels-grid">
      {#each filteredLevels as level (level.id)}
        <div class="level-card" class:editing={editingId === level.id} class:default={level.isDefault}>
          {#if editingId === level.id}
            <form method="POST" action="?/edit" use:enhance={handleEditEnhance} class="level-edit">
              <div class="edit-fields">
                <input type="hidden" name="id" value={level.id} />
                <input
                  type="number"
                  name="level"
                  bind:value={editedLevel}
                  min="100"
                  max="800"
                  step="100"
                  placeholder="Level"
                  autofocus
                />
                <span class="auto-name">{editedLevel ? `${editedLevel} Level` : '—'}</span>
              </div>
              <div class="edit-actions">
                <button type="submit" class="save-btn" title="Save">
                  <Check size={14} />
                </button>
                <button type="button" class="cancel-btn" onclick={cancelEdit} title="Cancel">
                  <X size={14} />
                </button>
              </div>
            </form>
          {:else}
            <div class="level-content">
              <span class="level-number">{level.level}</span>
              <span class="level-name">{level.name}</span>
              <span class="level-usage">{formatCount(level)}</span>
              {#if level.isDefault}
                <span class="default-badge">Default</span>
              {/if}
            </div>
            <div class="level-actions">
              <button 
                class="action-btn edit" 
                onclick={() => startEdit(level)} 
                title={level.isDefault ? 'Default levels cannot be edited' : 'Edit level number'}
                disabled={level.isDefault}
              >
                <Pencil size={14} />
              </button>
              <form method="POST" action="?/delete" use:enhance={() => handleDeleteEnhance(level.id)} class="inline-form">
                <input type="hidden" name="id" value={level.id} />
                <button
                  type="submit"
                  class="action-btn delete"
                  title={level.isDefault ? 'Default levels cannot be deleted' : 'Delete level'}
                  disabled={level.isDefault || deletingId === level.id}
                >
                  {#if deletingId === level.id}
                    <Loader2 size={14} class="spin" />
                  {:else}
                    <Trash2 size={14} />
                  {/if}
                </button>
              </form>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  <div class="info-card">
    <div class="info-icon"><AlertCircle size={18} /></div>
    <div class="info-content">
      <strong>About Levels</strong>
      <p>Levels define the academic progression of students. Default levels (100–600) are automatically created and cannot be edited or deleted. Custom levels (700, 800, etc.) can be added and their numbers changed, but names are always auto-generated as "X Level". Levels are always sorted numerically (100, 200, 300...).</p>
    </div>
  </div>

  <!-- Add Level Modal -->
  {#if showAddModal}
    <div class="modal-overlay" onclick={closeAddModal} role="dialog" aria-modal="true" aria-labelledby="add-title">
      <div class="modal" onclick={(e) => e.stopPropagation()}>
        <form method="POST" action="?/create" use:enhance={handleAddEnhance}>
          <div class="modal-header">
            <div class="modal-title-wrap">
              <div class="modal-icon blue"><Plus size={18} /></div>
              <h2 id="add-title">Add New Level</h2>
            </div>
            <button type="button" class="modal-close" onclick={closeAddModal} aria-label="Close modal"><X size={18} /></button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label for="add-level">Level Number <span class="req">*</span></label>
              <input
                id="add-level"
                type="number"
                name="level"
                bind:value={newLevelValue}
                placeholder="e.g., 700"
                min="100"
                max="800"
                step="100"
                autofocus
              />
              <p class="hint">Enter a level between 100 and 800 (must be a multiple of 100). Name will be auto-generated.</p>
            </div>
            <div class="preview-box">
              <span class="preview-label">Auto-generated name:</span>
              <span class="preview-value">{newLevelValue ? `${newLevelValue} Level` : '—'}</span>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-secondary" onclick={closeAddModal}>Cancel</button>
            <button type="submit" class="btn-primary" disabled={adding}>
              {#if adding}
                <Loader2 size={14} class="spin" /> Adding...
              {:else}
                <Plus size={14} /> Add Level
              {/if}
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}

  <!-- Reset Confirmation Modal -->
  {#if showResetModal}
    <div class="modal-overlay" onclick={closeResetModal} role="dialog" aria-modal="true" aria-labelledby="reset-title">
      <div class="modal delete-modal" onclick={(e) => e.stopPropagation()}>
        <form method="POST" action="?/reset" use:enhance={handleResetEnhance}>
          <div class="modal-icon-wrap danger"><AlertCircle size={28} /></div>
          <h2 id="reset-title">Reset to Default Levels?</h2>
          <p class="reset-desc">This will remove all custom levels and reset to:</p>
          <div class="default-levels">
            {#each DEFAULT_LEVELS as lvl}
              <span class="level-chip">{lvl} Level</span>
            {/each}
          </div>
          <div class="warning-box">
            <AlertCircle size={16} />
            <span>Any custom levels you've added will be permanently removed. This action cannot be undone.</span>
          </div>
          <div class="modal-footer center">
            <button type="button" class="btn-secondary" onclick={closeResetModal}>Cancel</button>
            <button type="submit" class="btn-danger" disabled={resetting}>
              {#if resetting}
                <Loader2 size={14} class="spin" /> Resetting...
              {:else}
                <RotateCcw size={14} /> Yes, Reset Levels
              {/if}
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}
</div>

<style>
  .inline-form { display: inline; }
  .spin { animation: spin 0.7s linear infinite; display: inline-block; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .manage-page { display: flex; flex-direction: column; gap: 1.25rem; }

  /* ── Page Header ─────────────────────────────────────────────── */
  .page-header {
    display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap;
  }
  .page-title { display: flex; align-items: center; gap: 0.875rem; }
  .page-title :global(.title-icon) { color: #3b82f6; flex-shrink: 0; }
  .page-title h1 { font-size: 1.35rem; font-weight: 700; color: var(--color-text); line-height: 1.2; margin: 0; }
  .subtitle { font-size: 0.8rem; color: var(--color-muted); margin-top: 0.15rem; }
  .header-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }

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

  .btn-outline {
    display: inline-flex; align-items: center; gap: 0.5rem;
    padding: 0.55rem 1.1rem;
    background: transparent;
    border: 1px solid var(--color-border); border-radius: 0.5rem;
    color: var(--color-muted); font-size: 0.875rem; font-weight: 500;
    cursor: pointer; transition: all 0.15s;
  }
  .btn-outline:hover { border-color: #f59e0b; color: #f59e0b; background: rgba(245,158,11,0.05); }

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

  /* ── Toolbar ─────────────────────────────────────────────────── */
  .page-toolbar { display: flex; align-items: center; gap: 1rem; }
  .search-box {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.55rem 0.875rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.625rem;
    flex: 1; max-width: 300px;
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

  /* ── Empty State ─────────────────────────────────────────────── */
  .empty-state {
    display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
    padding: 3rem 1.5rem; text-align: center;
  }
  .empty-state :global(.empty-icon) { color: var(--color-border); }
  .empty-title { font-size: 0.95rem; font-weight: 600; color: var(--color-text); margin: 0; }
  .empty-desc { font-size: 0.8rem; color: var(--color-muted); margin: 0; }

  /* ── Levels Grid ─────────────────────────────────────────────── */
  .levels-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }

  .level-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 1.125rem 1rem;
    display: flex; justify-content: space-between; align-items: center;
    transition: all 0.2s;
    position: relative;
  }
  .level-card:hover { border-color: rgba(59,130,246,0.3); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
  .level-card.editing { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
  .level-card.default::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0;
    height: 3px;
    background: linear-gradient(90deg, #3b82f6, #1d4ed8);
    border-radius: 0.75rem 0.75rem 0 0;
  }

  .level-content { display: flex; flex-direction: column; align-items: flex-start; gap: 0.15rem; }
  .level-number { font-size: 1.5rem; font-weight: 800; color: var(--color-text); line-height: 1; }
  .level-name { font-size: 0.75rem; color: var(--color-muted); }
  .level-usage { font-size: 0.65rem; color: var(--color-muted); opacity: 0.7; margin-top: 0.25rem; }

  .level-actions { display: flex; gap: 0.25rem; opacity: 0.5; transition: opacity 0.15s; }
  .level-card:hover .level-actions { opacity: 1; }

  .level-edit {
    display: flex; flex-direction: column; gap: 0.5rem;
    width: 100%;
  }
  .edit-fields {
    display: flex; flex-direction: column; gap: 0.35rem;
  }
  .edit-fields input {
    padding: 0.45rem 0.625rem;
    border: 1px solid var(--color-border); border-radius: 0.375rem;
    background: var(--color-bg); color: var(--color-text);
    font-size: 0.8rem; width: 100%;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .edit-fields input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.1); }
  .edit-actions { display: flex; gap: 0.25rem; justify-content: flex-end; }

  .action-btn {
    display: inline-flex; align-items: center; justify-content: center;
    width: 30px; height: 30px;
    background: none; border: none; cursor: pointer;
    color: var(--color-muted);
    border-radius: 0.375rem;
    transition: all 0.15s;
  }
  .action-btn:hover:not(:disabled) { color: var(--color-text); background: var(--color-bg); }
  .action-btn.edit:hover { color: #3b82f6; background: rgba(59,130,246,0.1); }
  .action-btn.delete:hover:not(:disabled) { color: #dc2626; background: rgba(220,38,38,0.1); }
  .action-btn:disabled { opacity: 0.3; cursor: not-allowed; }

  .save-btn, .cancel-btn {
    display: inline-flex; align-items: center; justify-content: center;
    width: 28px; height: 28px;
    background: none; border: none; cursor: pointer;
    border-radius: 0.375rem; transition: all 0.15s;
  }
  .save-btn { color: #16a34a; }
  .save-btn:hover:not(:disabled) { background: rgba(22,163,74,0.1); }
  .save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .cancel-btn { color: var(--color-muted); }
  .cancel-btn:hover { color: #dc2626; background: rgba(220,38,38,0.1); }

  /* ── Info Card ───────────────────────────────────────────────── */
  .info-card {
    display: flex; gap: 0.875rem;
    padding: 1rem 1.125rem;
    background: rgba(59,130,246,0.05);
    border: 1px solid rgba(59,130,246,0.15);
    border-radius: 0.75rem;
  }
  .info-icon { flex-shrink: 0; color: #3b82f6; margin-top: 0.1rem; }
  .info-content strong { display: block; font-size: 0.875rem; color: var(--color-text); margin-bottom: 0.25rem; }
  .info-content p { font-size: 0.8rem; color: var(--color-muted); margin: 0; line-height: 1.55; }

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
    width: 100%; max-width: 420px;
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

  .modal-body {
    padding: 1.25rem;
    display: flex; flex-direction: column;
    gap: 1rem;
    overflow-y: auto;
  }
  .form-group { display: flex; flex-direction: column; gap: 0.4rem; }
  label { font-size: 0.72rem; font-weight: 700; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.06em; }
  .req { color: #dc2626; }
  input {
    padding: 0.65rem 0.875rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-bg);
    color: var(--color-text);
    font-size: 0.875rem;
    width: 100%;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
  input::placeholder { color: var(--color-muted); opacity: 0.6; }
  .hint { font-size: 0.75rem; color: var(--color-muted); margin: 0.25rem 0 0; }

  .modal-footer {
    display: flex; justify-content: flex-end; gap: 0.75rem;
    padding: 1rem 1.25rem;
    border-top: 1px solid var(--color-border);
    flex-shrink: 0;
  }
  .modal-footer.center { justify-content: center; }

  /* ── Delete/Reset Modal ──────────────────────────────────────── */
  .delete-modal { max-width: 420px; text-align: center; padding: 2rem 1.5rem 1.5rem; }
  .delete-modal .modal-icon-wrap {
    width: 56px; height: 56px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 1rem;
  }
  .delete-modal .modal-icon-wrap.danger { background: rgba(220,38,38,0.1); color: #dc2626; }
  .delete-modal h2 { font-size: 1.1rem; font-weight: 700; color: var(--color-text); margin: 0 0 0.5rem; }
  .reset-desc { color: var(--color-muted); font-size: 0.875rem; margin: 0 0 0.75rem; }
  .default-levels {
    display: flex; justify-content: center; gap: 0.5rem;
    padding: 0.75rem;
    margin: 0.5rem 0 1rem;
  }
  .level-chip {
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 44px; padding: 0.4rem 0.625rem;
    background: rgba(59,130,246,0.08);
    color: #3b82f6;
    border-radius: 0.5rem;
    font-size: 0.875rem; font-weight: 700;
  }
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
    .header-actions { justify-content: stretch; }
    .header-actions button { flex: 1; justify-content: center; }
    .search-box { max-width: none; width: 100%; }
    .levels-grid { grid-template-columns: repeat(2, 1fr); }
    .modal-footer { flex-direction: column-reverse; }
    .modal-footer :global(.btn-secondary), .modal-footer :global(.btn-primary), .modal-footer :global(.btn-danger) { width: 100%; justify-content: center; }
  }
</style>