<!-- src/routes/admin/manage/levels/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { GraduationCap, Edit, Trash2, X, Check, AlertCircle, Search, Save, RotateCcw } from 'lucide-svelte';

  let { data, form }: { data: PageData; form: any } = $props();

  let editingLevel = $state<number | null>(null);
  let editedValue = $state('');
  let searchQuery = $state('');
  let loading = $state(false);
  let showResetModal = $state(false);
  let showAddModal = $state(false);
  let newLevelValue = $state('');

  // Available levels from config or database
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
      alert('Please enter a valid level between 100 and 800');
      return;
    }
    
    if (levels.includes(newLevel) && newLevel !== originalLevel) {
      alert('Level already exists');
      return;
    }
    
    loading = true;
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
      } else {
        alert(result.error || 'Failed to update level');
      }
    } catch {
      alert('Error updating level');
    } finally {
      loading = false;
    }
  }

  async function deleteLevel(level: number) {
    // Prevent deletion of default levels (100-600)
    if (level >= 100 && level <= 600) {
      alert('Default levels (100-600) cannot be deleted');
      return;
    }
    
    if (!confirm(`Are you sure you want to delete ${level} Level? This may affect existing student records.`)) return;
    
    loading = true;
    try {
      const response = await fetch('/api/admin/levels', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        levels = levels.filter(l => l !== level);
      } else {
        alert(result.error || 'Failed to delete level');
      }
    } catch {
      alert('Error deleting level');
    } finally {
      loading = false;
    }
  }

  async function addLevel() {
    const levelNum = parseInt(newLevelValue);
    if (isNaN(levelNum) || levelNum < 100 || levelNum > 800) {
      alert('Please enter a valid level between 100 and 800');
      return;
    }
    if (levels.includes(levelNum)) {
      alert('Level already exists');
      return;
    }
    
    loading = true;
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
      } else {
        alert(result.error || 'Failed to add level');
      }
    } catch {
      alert('Error adding level');
    } finally {
      loading = false;
    }
  }

  async function resetToDefault() {
    loading = true;
    try {
      const response = await fetch('/api/admin/levels/reset', { method: 'POST' });
      const result = await response.json();
      
      if (response.ok) {
        levels = [...DEFAULT_LEVELS];
        showResetModal = false;
      } else {
        alert(result.error || 'Failed to reset levels');
      }
    } catch {
      alert('Error resetting levels');
    } finally {
      loading = false;
    }
  }

  function openAddModal() {
    newLevelValue = '';
    showAddModal = true;
  }
</script>

<svelte:head><title>Manage Levels — MOUAU eTest Admin</title></svelte:head>

<div class="manage-page">
  <div class="page-header">
    <div>
      <h1>Academic Levels</h1>
      <p class="subtitle">Manage available academic levels (100-800)</p>
    </div>
    <div class="header-actions">
      <button class="btn-secondary" onclick={openAddModal} disabled={loading}>
        <GraduationCap size={16} /> Add Level
      </button>
      <button class="btn-outline" onclick={() => showResetModal = true}>
        <RotateCcw size={16} /> Reset to Default
      </button>
    </div>
  </div>

  {#if form?.error}
    <div class="toast error"><AlertCircle size={14} /> {form.error}</div>
  {/if}
  {#if form?.success}
    <div class="toast success"><Check size={14} /> {form.message}</div>
  {/if}

  <div class="search-box">
    <Search size={16} />
    <input type="text" placeholder="Search levels..." bind:value={searchQuery} />
  </div>

  <div class="levels-grid">
    {#each filteredLevels as level}
      <div class="level-card">
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
            <button class="save-btn" onclick={() => saveEdit(level)} disabled={loading}>
              <Save size={14} />
            </button>
            <button class="cancel-btn" onclick={cancelEdit}>
              <X size={14} />
            </button>
          </div>
        {:else}
          <div class="level-content">
            <span class="level-number">{level}</span>
            <span class="level-label">Level</span>
          </div>
          <div class="level-actions">
            <button class="action-btn edit" onclick={() => startEdit(level)} title="Edit Level">
              <Edit size={14} />
            </button>
            <button 
              class="action-btn delete" 
              onclick={() => deleteLevel(level)} 
              title="Delete Level" 
              disabled={level >= 100 && level <= 600}
            >
              <Trash2 size={14} />
            </button>
          </div>
        {/if}
      </div>
    {/each}
  </div>

  {#if filteredLevels.length === 0}
    <div class="empty-state">
      <GraduationCap size={48} strokeWidth={1.5} />
      <p>No levels found.</p>
      <button class="btn-primary" onclick={openAddModal}>Add a level</button>
    </div>
  {/if}

  <div class="info-card">
    <div class="info-icon"><AlertCircle size={16} /></div>
    <div class="info-content">
      <strong>About Levels</strong>
      <p>Levels define the academic progression of students. Default levels are 100, 200, 300, 400, 500, and 600. You can add custom levels like 700, 800, or remove existing ones. Note that levels 100-600 are system defaults and cannot be deleted.</p>
    </div>
  </div>

  <!-- Add Level Modal -->
  {#if showAddModal}
    <div class="modal-overlay" onclick={() => showAddModal = false}>
      <div class="modal" onclick={(e) => e.stopPropagation()}>
        <div class="modal-header">
          <h2><GraduationCap size={18} /> Add New Level</h2>
          <button class="modal-close" onclick={() => showAddModal = false}><X size={18} /></button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Level Number <span class="req">*</span></label>
            <input 
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
          <button type="button" class="btn-secondary" onclick={() => showAddModal = false}>Cancel</button>
          <button type="button" class="btn-primary" onclick={addLevel} disabled={loading}>
            {#if loading}<span class="spin">⟳</span> Adding...{:else}<Check size={14} /> Add Level{/if}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Reset Confirmation Modal -->
  {#if showResetModal}
    <div class="modal-overlay" onclick={() => showResetModal = false}>
      <div class="modal delete-modal" onclick={(e) => e.stopPropagation()}>
        <div class="modal-icon-wrap warning"><AlertCircle size={24} /></div>
        <h2>Reset to Default Levels?</h2>
        <p>This will remove all custom levels and reset to:</p>
        <div class="default-levels">100, 200, 300, 400, 500, 600</div>
        <p class="warning-text">Any custom levels you've added will be permanently removed.</p>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" onclick={() => showResetModal = false}>Cancel</button>
          <button type="button" class="btn-danger" onclick={resetToDefault} disabled={loading}>
            {#if loading}<span class="spin">⟳</span> Resetting...{:else}Yes, Reset Levels{/if}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .manage-page { display: flex; flex-direction: column; gap: 1.5rem; }
  .page-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
  .page-header h1 { font-size: 1.5rem; font-weight: 700; margin: 0; color: var(--color-text); }
  .subtitle { color: var(--color-muted); font-size: 0.875rem; margin-top: 0.25rem; }
  .header-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }
  
  .btn-primary { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 600; cursor: pointer; }
  .btn-primary:hover { background: #1d4ed8; }
  .btn-secondary { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.5rem; color: var(--color-text); cursor: pointer; }
  .btn-secondary:hover { background: var(--color-bg); }
  .btn-outline { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: transparent; border: 1px solid var(--color-border); border-radius: 0.5rem; color: var(--color-text); cursor: pointer; }
  .btn-outline:hover { border-color: #f59e0b; color: #f59e0b; }
  .btn-danger { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: #dc2626; color: white; border: none; border-radius: 0.5rem; cursor: pointer; }
  .btn-danger:hover { background: #b91c1c; }
  
  .search-box { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 0.5rem; max-width: 300px; }
  .search-box input { border: none; background: none; outline: none; width: 100%; color: var(--color-text); }
  
  .levels-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 1rem; }
  
  .level-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; padding: 1rem; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s; }
  .level-card:hover { border-color: rgba(59,130,246,0.3); transform: translateY(-2px); }
  
  .level-content { display: flex; flex-direction: column; align-items: flex-start; }
  .level-number { font-size: 1.5rem; font-weight: 800; color: var(--color-text); }
  .level-label { font-size: 0.7rem; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.05em; }
  
  .level-actions { display: flex; gap: 0.25rem; }
  .level-edit { display: flex; gap: 0.5rem; align-items: center; width: 100%; }
  .level-edit input { width: 80px; padding: 0.4rem; border: 1px solid var(--color-border); border-radius: 0.375rem; background: var(--color-bg); color: var(--color-text); font-size: 0.875rem; text-align: center; }
  
  .action-btn { background: none; border: none; cursor: pointer; padding: 0.25rem; border-radius: 0.25rem; }
  .action-btn.edit:hover { color: #3b82f6; background: rgba(59,130,246,0.1); }
  .action-btn.delete:hover { color: #dc2626; background: rgba(220,38,38,0.1); }
  .action-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  
  .save-btn, .cancel-btn { background: none; border: none; cursor: pointer; padding: 0.25rem; border-radius: 0.25rem; display: flex; align-items: center; }
  .save-btn:hover { color: #16a34a; background: rgba(22,163,74,0.1); }
  .cancel-btn:hover { color: #dc2626; background: rgba(220,38,38,0.1); }
  
  .empty-state { text-align: center; padding: 3rem; color: var(--color-muted); display: flex; flex-direction: column; align-items: center; gap: 1rem; }
  
  .info-card { display: flex; gap: 0.75rem; padding: 1rem; background: rgba(59,130,246,0.05); border: 1px solid rgba(59,130,246,0.15); border-radius: 0.75rem; }
  .info-icon { flex-shrink: 0; color: #3b82f6; }
  .info-content strong { display: block; font-size: 0.875rem; color: var(--color-text); margin-bottom: 0.25rem; }
  .info-content p { font-size: 0.8rem; color: var(--color-muted); margin: 0; line-height: 1.5; }
  
  .toast { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; border-radius: 0.5rem; font-size: 0.875rem; margin-bottom: 0.5rem; }
  .toast.error { background: rgba(220,38,38,0.1); color: #dc2626; border: 1px solid rgba(220,38,38,0.2); }
  .toast.success { background: rgba(34,197,94,0.1); color: #16a34a; border: 1px solid rgba(34,197,94,0.2); }
  
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
  .modal { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; width: 100%; max-width: 400px; }
  .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; border-bottom: 1px solid var(--color-border); }
  .modal-header h2 { display: flex; align-items: center; gap: 0.5rem; font-size: 1rem; font-weight: 700; margin: 0; }
  .modal-close { background: none; border: none; cursor: pointer; color: var(--color-muted); padding: 0.25rem; border-radius: 0.25rem; }
  .modal-body { padding: 1.25rem; }
  .delete-modal { text-align: center; padding: 1.5rem; }
  .modal-icon-wrap { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; }
  .modal-icon-wrap.warning { background: rgba(245,158,11,0.1); color: #f59e0b; }
  .default-levels { font-size: 1rem; font-weight: 600; color: #3b82f6; padding: 0.5rem; background: var(--color-bg); border-radius: 0.5rem; margin: 0.5rem 0; }
  .warning-text { color: #f59e0b !important; font-size: 0.8rem !important; }
  .modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; padding: 1rem 1.25rem; border-top: 1px solid var(--color-border); }
  .delete-modal .modal-footer { justify-content: center; }
  
  .form-group { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
  .form-group label { font-size: 0.75rem; font-weight: 600; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.05em; }
  .req { color: #dc2626; }
  .form-group input { padding: 0.6rem 0.75rem; border: 1px solid var(--color-border); border-radius: 0.5rem; background: var(--color-bg); color: var(--color-text); font-size: 0.875rem; width: 100%; }
  .form-group input:focus { outline: none; border-color: #3b82f6; }
  .hint { font-size: 0.7rem; color: var(--color-muted); margin-top: 0.25rem; }
  
  .spin { display: inline-block; animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  
  @media (max-width: 640px) { 
    .page-header { flex-direction: column; align-items: stretch; } 
    .header-actions { justify-content: stretch; } 
    .header-actions button { flex: 1; justify-content: center; }
    .search-box { max-width: 100%; }
  }
</style>