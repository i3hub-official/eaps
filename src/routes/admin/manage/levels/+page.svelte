<!-- src/routes/admin/manage/levels/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { GraduationCap, Plus, Pencil, Trash2, X, Check, AlertCircle, Search, Loader2, RotateCcw } from 'lucide-svelte';

  let { data, form }: { data: PageData; form: any } = $props();

  let editingLevel = $state<number | null>(null);
  let editedValue = $state('');
  let searchQuery = $state('');
  let loadingAction = $state<string | null>(null);
  let showResetModal = $state(false);
  let showAddModal = $state(false);
  let newLevelValue = $state('');

  let levels = $state<number[]>(data.levels || [100, 200, 300, 400, 500, 600]);

  const filteredLevels = $derived(
    levels.filter(l => l.toString().includes(searchQuery))
  );

  const DEFAULT_LEVELS = [100, 200, 300, 400, 500, 600];

  function startEdit(level: number) {
    editingLevel = level;
    editedValue = level.toString();
  }

  function cancelEdit() {
    editingLevel = null;
    editedValue = '';
  }

  async function saveEdit(originalLevel: number) {
    const newLevel = parseInt(editedValue);
    if (isNaN(newLevel) || newLevel < 100 || newLevel > 800) {
      form = { error: 'Please enter a valid level between 100 and 800' };
      return;
    }
    if (levels.includes(newLevel) && newLevel !== originalLevel) {
      form = { error: 'Level already exists' };
      return;
    }

    loadingAction = 'edit';
    try {
      const response = await fetch('/api/admin/levels', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ original: originalLevel, updated: newLevel })
      });
      const result = await response.json();
      if (response.ok) {
        const index = levels.indexOf(originalLevel);
        if (index !== -1) levels[index] = newLevel;
        levels = [...levels].sort((a, b) => a - b);
        editingLevel = null;
        form = { success: true, message: `Level updated to ${newLevel}` };
      } else {
        form = { error: result.error || 'Failed to update level' };
      }
    } catch {
      form = { error: 'Error updating level' };
    } finally {
      loadingAction = null;
    }
  }

  async function deleteLevel(level: number) {
    if (level >= 100 && level <= 600) {
      form = { error: 'Default levels (100-600) cannot be deleted' };
      return;
    }

    loadingAction = `delete-${level}`;
    try {
      const response = await fetch('/api/admin/levels', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level })
      });
      const result = await response.json();
      if (response.ok) {
        levels = levels.filter(l => l !== level);
        form = { success: true, message: `Level ${level} deleted` };
      } else {
        form = { error: result.error || 'Failed to delete level' };
      }
    } catch {
      form = { error: 'Error deleting level' };
    } finally {
      loadingAction = null;
    }
  }

  async function addLevel() {
    const levelNum = parseInt(newLevelValue);
    if (isNaN(levelNum) || levelNum < 100 || levelNum > 800) {
      form = { error: 'Please enter a valid level between 100 and 800' };
      return;
    }
    if (levels.includes(levelNum)) {
      form = { error: 'Level already exists' };
      return;
    }

    loadingAction = 'add';
    try {
      const response = await fetch('/api/admin/levels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: levelNum })
      });
      const result = await response.json();
      if (response.ok) {
        levels = [...levels, levelNum].sort((a, b) => a - b);
        showAddModal = false;
        newLevelValue = '';
        form = { success: true, message: `Level ${levelNum} added` };
      } else {
        form = { error: result.error || 'Failed to add level' };
      }
    } catch {
      form = { error: 'Error adding level' };
    } finally {
      loadingAction = null;
    }
  }

  async function resetToDefault() {
    loadingAction = 'reset';
    try {
      const response = await fetch('/api/admin/levels/reset', { method: 'POST' });
      const result = await response.json();
      if (response.ok) {
        levels = [...DEFAULT_LEVELS];
        showResetModal = false;
        form = { success: true, message: 'Levels reset to defaults' };
      } else {
        form = { error: result.error || 'Failed to reset levels' };
      }
    } catch {
      form = { error: 'Error resetting levels' };
    } finally {
      loadingAction = null;
    }
  }

  function closeAddModal() {
    showAddModal = false;
    newLevelValue = '';
  }

  function closeResetModal() {
    showResetModal = false;
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
      {#each filteredLevels as level}
        <div class="level-card" class:editing={editingLevel === level}>
          {#if editingLevel === level}
            <div class="level-edit">
              <input
                type="number"
                bind:value={editedValue}
                min="100"
                max="800"
                step="100"
                autofocus
                onkeypress={(e) => e.key === 'Enter' && saveEdit(level)}
              />
              <div class="edit-actions">
                <button class="save-btn" onclick={() => saveEdit(level)} disabled={loadingAction === 'edit'} title="Save">
                  {#if loadingAction === 'edit'}
                    <Loader2 size={14} class="spin" />
                  {:else}
                    <Check size={14} />
                  {/if}
                </button>
                <button class="cancel-btn" onclick={cancelEdit} title="Cancel">
                  <X size={14} />
                </button>
              </div>
            </div>
          {:else}
            <div class="level-content">
              <span class="level-number">{level}</span>
              <span class="level-label">Level</span>
            </div>
            <div class="level-actions">
              <button class="action-btn edit" onclick={() => startEdit(level)} title="Edit level">
                <Pencil size={14} />
              </button>
              <button
                class="action-btn delete"
                onclick={() => deleteLevel(level)}
                title={level >= 100 && level <= 600 ? 'Default levels cannot be deleted' : 'Delete level'}
                disabled={level >= 100 && level <= 600 || loadingAction === `delete-${level}`}
              >
                {#if loadingAction === `delete-${level}`}
                  <Loader2 size={14} class="spin" />
                {:else}
                  <Trash2 size={14} />
                {/if}
              </button>
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
      <p>Levels define the academic progression of students. Default levels are 100, 200, 300, 400, 500, and 600. You can add custom levels like 700, 800, or remove existing ones. Note that levels 100-600 are system defaults and cannot be deleted.</p>
    </div>
  </div>

  <!-- Add Level Modal -->
  {#if showAddModal}
    <div class="modal-overlay" onclick={closeAddModal} role="dialog" aria-modal="true" aria-labelledby="add-title">
      <div class="modal" onclick={(e) => e.stopPropagation()}>
        <div class="modal-header">
          <div class="modal-title-wrap">
            <div class="modal-icon blue"><Plus size={18} /></div>
            <h2 id="add-title">Add New Level</h2>
          </div>
          <button class="modal-close" onclick={closeAddModal} aria-label="Close modal"><X size={18} /></button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="add-level">Level Number <span class="req">*</span></label>
            <input
              id="add-level"
              type="number"
              bind:value={newLevelValue}
              placeholder="e.g., 700"
              min="100"
              max="800"
              step="100"
              autofocus
              onkeypress={(e) => e.key === 'Enter' && addLevel()}
            />
            <p class="hint">Enter a level between 100 and 800 (must be a multiple of 100)</p>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" onclick={closeAddModal}>Cancel</button>
          <button type="button" class="btn-primary" onclick={addLevel} disabled={loadingAction === 'add'}>
            {#if loadingAction === 'add'}
              <Loader2 size={14} class="spin" /> Adding...
            {:else}
              <Plus size={14} /> Add Level
            {/if}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Reset Confirmation Modal -->
  {#if showResetModal}
    <div class="modal-overlay" onclick={closeResetModal} role="dialog" aria-modal="true" aria-labelledby="reset-title">
      <div class="modal delete-modal" onclick={(e) => e.stopPropagation()}>
        <div class="modal-icon-wrap danger"><AlertCircle size={28} /></div>
        <h2 id="reset-title">Reset to Default Levels?</h2>
        <p class="reset-desc">This will remove all custom levels and reset to:</p>
        <div class="default-levels">
          {#each DEFAULT_LEVELS as lvl, i}
            <span class="level-chip">{lvl}</span>{i < DEFAULT_LEVELS.length - 1 ? '' : ''}
          {/each}
        </div>
        <div class="warning-box">
          <AlertCircle size={16} />
          <span>Any custom levels you've added will be permanently removed. This action cannot be undone.</span>
        </div>
        <div class="modal-footer center">
          <button type="button" class="btn-secondary" onclick={closeResetModal}>Cancel</button>
          <button type="button" class="btn-danger" onclick={resetToDefault} disabled={loadingAction === 'reset'}>
            {#if loadingAction === 'reset'}
              <Loader2 size={14} class="spin" /> Resetting...
            {:else}
              <RotateCcw size={14} /> Yes, Reset Levels
            {/if}
          </button>
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
  .levels-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 1rem; }

  .level-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 1.125rem 1rem;
    display: flex; justify-content: space-between; align-items: center;
    transition: all 0.2s;
  }
  .level-card:hover { border-color: rgba(59,130,246,0.3); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
  .level-card.editing { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }

  .level-content { display: flex; flex-direction: column; align-items: flex-start; }
  .level-number { font-size: 1.5rem; font-weight: 800; color: var(--color-text); line-height: 1; }
  .level-label { font-size: 0.7rem; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-top: 0.25rem; }

  .level-actions { display: flex; gap: 0.25rem; opacity: 0.5; transition: opacity 0.15s; }
  .level-card:hover .level-actions { opacity: 1; }

  .level-edit {
    display: flex; gap: 0.5rem; align-items: center; width: 100%;
  }
  .level-edit input {
    width: 80px; padding: 0.5rem;
    border: 1px solid var(--color-border); border-radius: 0.5rem;
    background: var(--color-bg); color: var(--color-text);
    font-size: 0.875rem; font-weight: 600; text-align: center;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .level-edit input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
  .edit-actions { display: flex; gap: 0.25rem; }

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
    width: 30px; height: 30px;
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
    overflow-y: auto;
  }
  .form-group { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 0.5rem; }
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