<!-- src/routes/lecturer/questions/tags/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import {
    Tag, ChevronLeft, Search, X, Plus,
    Edit, Trash2, BookOpen, FileText,
    HelpCircle, CheckCircle, AlertCircle,
    BarChart2, Clock, Users, Eye
  } from '@lucide/svelte';
  import { fly } from 'svelte/transition';

  let { data }: { data: PageData } = $props();
  const { tags, totalTags, totalQuestions } = data;

  // ── State ──────────────────────────────────────────────────────────────────
  let searchQuery = $state('');
  let selectedTag = $state<string | null>(null);
  let showEditModal = $state(false);
  let editingTag = $state<string>('');
  let newTagName = $state('');

  // ── Toast system ──────────────────────────────────────────────────────────
  type Toast = { id: number; message: string; type: 'info' | 'warn' | 'success' };
  let toasts = $state<Toast[]>([]);
  let toastId = 0;

  function showToast(message: string, type: Toast['type'] = 'info', duration = 2600) {
    const id = ++toastId;
    toasts = [...toasts, { id, message, type }];
    setTimeout(() => { toasts = toasts.filter(t => t.id !== id); }, duration);
  }

  // ── Filtered Tags ─────────────────────────────────────────────────────────
  const filteredTags = $derived(() => {
    let result = [...tags];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.tag.toLowerCase().includes(query)
      );
    }
    return result;
  });

  // ── Helpers ──────────────────────────────────────────────────────────────
  function getTypeColor(type: string) {
    const colors: Record<string, string> = {
      mcq: '#2563eb',
      true_false: '#7c3aed',
      fill_in_the_blank: '#16a34a',
      essay: '#d97706'
    };
    return colors[type] || '#64748b';
  }

  function getTypeLabel(type: string) {
    const labels: Record<string, string> = {
      mcq: 'MCQ',
      true_false: 'T/F',
      fill_in_the_blank: 'FIB',
      essay: 'Essay'
    };
    return labels[type] || type;
  }

  function getTagColor(tag: string) {
    const colors = [
      '#2563eb', '#7c3aed', '#16a34a', '#d97706',
      '#dc2626', '#0891b2', '#8b5cf6', '#059669',
      '#e11d48', '#0d9488', '#f59e0b', '#6366f1'
    ];
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
      hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  function truncateText(text: string, maxLength: number = 80) {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  }

  // ── Edit tag ──────────────────────────────────────────────────────────────
  function openEditTag(tag: string) {
    editingTag = tag;
    newTagName = tag;
    showEditModal = true;
  }

  function saveTag() {
    if (!newTagName.trim()) {
      showToast('Tag name cannot be empty', 'warn');
      return;
    }
    // This would call an API to update the tag
    showToast(`Tag "${editingTag}" renamed to "${newTagName}"`, 'success');
    showEditModal = false;
  }

  function deleteTag(tag: string) {
    if (!confirm(`Delete tag "${tag}"? This will remove it from all questions.`)) return;
    showToast(`Tag "${tag}" deleted`, 'success');
  }
</script>

<svelte:head><title>Question Tags — MOUAU eTest</title></svelte:head>

<!-- ── Toast stack ─────────────────────────────────────────────────────────── -->
<div class="toast-stack" aria-live="polite">
  {#each toasts as t (t.id)}
    <div class="toast toast-{t.type}"
      in:fly={{ y: 10, duration: 200 }}
      out:fly={{ y: -6, duration: 160 }}>
      {#if t.type === 'warn'}<AlertCircle size={13} />
      {:else if t.type === 'success'}<CheckCircle size={13} />
      {:else}<Tag size={13} />{/if}
      {t.message}
    </div>
  {/each}
</div>

<div class="page">
  <!-- Header -->
  <div class="page-header">
    <div class="header-top">
      <a href="/lecturer/questions" class="back-link">
        <ChevronLeft size={14} /> Back to Question Bank
      </a>
    </div>
    <div class="header-main">
      <div>
        <div class="header-badge">
          <Tag size={16} />
          <span>Tags</span>
        </div>
        <h1>Question Tags</h1>
        <p class="subtitle">{totalTags} tags • {totalQuestions} questions organized</p>
      </div>
    </div>
  </div>

  <!-- Controls -->
  <div class="controls">
    <div class="search-wrap">
      <Search size={14} />
      <input
        type="text"
        placeholder="Search tags..."
        bind:value={searchQuery}
      />
      {#if searchQuery}
        <button class="clear-btn" onclick={() => searchQuery = ''}>
          <X size={14} />
        </button>
      {/if}
    </div>
    <span class="results-count">{filteredTags().length} tags</span>
  </div>

  <!-- Tags Grid -->
  {#if filteredTags().length === 0}
    <div class="empty-state">
      <div class="empty-icon"><Tag size={36} strokeWidth={1.2} /></div>
      <p class="empty-title">
        {searchQuery ? 'No matching tags' : 'No tags yet'}
      </p>
      <p class="empty-sub">
        {searchQuery ? 'Try adjusting your search.' : 'Tags are automatically created from question topics.'}
      </p>
    </div>
  {:else}
    <div class="tags-grid">
      {#each filteredTags() as tag}
        <div class="tag-card">
          <div class="tag-header">
            <div class="tag-info">
              <span class="tag-color" style="background:{getTagColor(tag.tag)};"></span>
              <h3 class="tag-name">{tag.tag}</h3>
              <span class="tag-count">{tag.count} question{tag.count !== 1 ? 's' : ''}</span>
            </div>
            <div class="tag-actions">
              <button class="action-btn" onclick={() => openEditTag(tag.tag)} title="Edit tag">
                <Edit size={13} />
              </button>
              <button class="action-btn danger" onclick={() => deleteTag(tag.tag)} title="Delete tag">
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          {#if tag.questions && tag.questions.length > 0}
            <div class="tag-questions">
              {#each tag.questions as q}
                <div class="question-item">
                  <span class="question-type" style="color:{getTypeColor(q.type)};">
                    {getTypeLabel(q.type)}
                  </span>
                  <span class="question-body">{truncateText(q.body)}</span>
                  <span class="question-meta">
                    <BookOpen size={10} /> {q.courseCode}
                    <span class="question-marks">{q.marks}m</span>
                  </span>
                </div>
              {/each}
              {#if tag.count > 5}
                <a href={`/lecturer/questions?tag=${encodeURIComponent(tag.tag)}`} class="view-all-link">
                  View all {tag.count} questions →
                </a>
              {/if}
            </div>
          {:else}
            <p class="no-questions">No questions with this tag</p>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  <!-- Edit Modal -->
  {#if showEditModal}
    <div class="modal-overlay" onclick={() => showEditModal = false}>
      <div class="modal" onclick={(e) => e.stopPropagation()}>
        <div class="modal-header">
          <h3>Edit Tag</h3>
          <button class="modal-close" onclick={() => showEditModal = false}>
            <X size={18} />
          </button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label for="tagName">Tag Name</label>
            <input
              id="tagName"
              type="text"
              bind:value={newTagName}
              placeholder="Enter new tag name"
              onkeydown={(e) => { if (e.key === 'Enter') saveTag(); }}
              autofocus
            />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-ghost" onclick={() => showEditModal = false}>
            Cancel
          </button>
          <button class="btn-primary" onclick={saveTag}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .toast-stack {
    position: fixed; bottom: 1.5rem; right: 1.5rem;
    z-index: 9999; display: flex; flex-direction: column; gap: .35rem;
    pointer-events: none;
  }
  .toast {
    display: inline-flex; align-items: center; gap: .45rem;
    padding: .5rem .9rem; border-radius: .55rem;
    font-size: .79rem; font-weight: 600; white-space: nowrap;
    box-shadow: 0 4px 14px rgba(0,0,0,.1); max-width: 300px;
    pointer-events: auto;
  }
  .toast-info { background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); }
  .toast-warn { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
  .toast-success { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }

  .page {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .page-header {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    padding: 1.5rem;
  }

  .header-top {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 0.75rem;
  }

  .back-link {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-size: 0.8rem; font-weight: 600; color: var(--color-muted);
    text-decoration: none; transition: color 0.15s;
  }
  .back-link:hover { color: var(--color-text); }

  .header-badge {
    display: inline-flex; align-items: center; gap: 0.4rem;
    font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.05em; color: var(--color-muted);
    padding: 0.2rem 0.6rem;
    background: var(--color-bg); border-radius: 999px;
    margin-bottom: 0.5rem;
  }

  .header-main h1 {
    font-size: 1.5rem; font-weight: 800; color: var(--color-text);
    margin: 0;
  }

  .subtitle {
    font-size: 0.8rem; color: var(--color-muted); margin: 0.2rem 0 0;
  }

  .controls {
    display: flex; justify-content: space-between; align-items: center;
    gap: 1rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 0.75rem 1rem;
    flex-wrap: wrap;
  }

  .search-wrap {
    display: flex; align-items: center; gap: 0.4rem;
    padding: 0.35rem 0.6rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    flex: 1; min-width: 200px;
    color: var(--color-muted);
  }
  .search-wrap input {
    flex: 1; background: none; border: none; outline: none;
    font-size: 0.8rem; color: var(--color-text); font-family: inherit;
  }
  .clear-btn {
    background: none; border: none; cursor: pointer;
    color: var(--color-muted); padding: 0.1rem;
  }
  .clear-btn:hover { color: var(--color-text); }

  .results-count {
    font-size: 0.7rem; font-weight: 600; color: var(--color-muted);
  }

  .empty-state {
    display: flex; flex-direction: column; align-items: center;
    gap: 0.75rem; padding: 4rem 2rem; text-align: center;
    background: var(--color-surface); border: 1.5px dashed var(--color-border);
    border-radius: 0.875rem;
  }

  .empty-icon {
    width: 64px; height: 64px; border-radius: 1rem;
    background: var(--lc-soft); border: 1px solid rgba(79,70,229,0.15);
    display: flex; align-items: center; justify-content: center;
    color: var(--lc-600); margin-bottom: 0.25rem;
  }

  .empty-title { font-size: 1rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .empty-sub { font-size: 0.82rem; color: var(--color-muted); margin: 0; }

  .tags-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 1rem;
  }

  .tag-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.875rem;
    padding: 1rem;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .tag-card:hover {
    border-color: rgba(79,70,229,0.25);
    box-shadow: 0 2px 12px rgba(0,0,0,0.04);
  }

  .tag-header {
    display: flex; justify-content: space-between; align-items: flex-start;
    margin-bottom: 0.75rem;
  }

  .tag-info {
    display: flex; align-items: center; gap: 0.5rem;
    flex-wrap: wrap;
  }

  .tag-color {
    width: 12px; height: 12px; border-radius: 50%;
    flex-shrink: 0;
  }

  .tag-name {
    font-size: 0.9rem; font-weight: 700; color: var(--color-text);
    margin: 0;
  }

  .tag-count {
    font-size: 0.7rem; font-weight: 600; color: var(--color-muted);
    background: var(--color-bg);
    padding: 0.1rem 0.5rem;
    border-radius: 999px;
    border: 1px solid var(--color-border);
  }

  .tag-actions {
    display: flex; gap: 0.3rem;
  }

  .action-btn {
    width: 28px; height: 28px;
    border-radius: 0.4rem;
    border: 1px solid var(--color-border);
    background: var(--color-bg);
    color: var(--color-muted);
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s;
  }
  .action-btn:hover { border-color: var(--lc-600); color: var(--lc-600); }
  .action-btn.danger:hover { border-color: #dc2626; color: #dc2626; }

  .tag-questions {
    display: flex; flex-direction: column; gap: 0.4rem;
  }

  .question-item {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.3rem 0.5rem;
    background: var(--color-bg);
    border-radius: 0.4rem;
    border: 1px solid var(--color-border);
    font-size: 0.78rem;
  }

  .question-type {
    font-size: 0.6rem; font-weight: 700; padding: 0.1rem 0.3rem;
    border-radius: 999px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .question-body {
    flex: 1; color: var(--color-text);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }

  .question-meta {
    display: flex; align-items: center; gap: 0.3rem;
    font-size: 0.6rem; color: var(--color-muted);
    flex-shrink: 0;
  }

  .question-marks {
    font-weight: 700; color: var(--color-text);
  }

  .no-questions {
    font-size: 0.78rem; color: var(--color-muted);
    text-align: center;
    padding: 0.5rem;
    background: var(--color-bg);
    border-radius: 0.4rem;
    border: 1px solid var(--color-border);
  }

  .view-all-link {
    font-size: 0.7rem; font-weight: 600; color: var(--lc-600);
    text-decoration: none;
    text-align: center;
    padding: 0.3rem;
    display: block;
  }
  .view-all-link:hover { text-decoration: underline; }

  /* Modal */
  .modal-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.5);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
  }

  .modal {
    background: var(--color-surface);
    border-radius: 1rem;
    max-width: 400px; width: 90%;
    padding: 1.5rem;
    box-shadow: 0 20px 60px rgba(0,0,0,0.2);
  }

  .modal-header {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 1rem;
  }

  .modal-header h3 {
    font-size: 1.1rem; font-weight: 700; color: var(--color-text);
    margin: 0;
  }

  .modal-close {
    background: none; border: none; cursor: pointer;
    color: var(--color-muted); padding: 0.2rem;
  }
  .modal-close:hover { color: var(--color-text); }

  .modal-body { padding: 0.5rem 0; }

  .field {
    display: flex; flex-direction: column; gap: 0.35rem;
  }
  .field label {
    font-size: 0.8rem; font-weight: 600; color: var(--color-text);
  }
  .field input {
    padding: 0.575rem 0.875rem;
    border: 1px solid var(--color-border);
    border-radius: 0.6rem;
    background: var(--color-bg);
    color: var(--color-text);
    font-size: 0.875rem;
    font-family: inherit;
    outline: none;
    width: 100%;
    box-sizing: border-box;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .field input:focus {
    border-color: var(--lc-600);
    box-shadow: 0 0 0 3px var(--lc-soft);
  }

  .modal-footer {
    display: flex; gap: 0.5rem; justify-content: flex-end;
    padding-top: 1rem;
    border-top: 1px solid var(--color-border);
  }

  .btn-ghost {
    padding: 0.5rem 1rem;
    border: 1.5px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-bg);
    color: var(--color-text);
    font-size: 0.82rem; font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
  }
  .btn-ghost:hover { border-color: var(--lc-600); color: var(--lc-600); }

  .btn-primary {
    padding: 0.5rem 1rem;
    background: var(--lc-600); color: white;
    border: none; border-radius: 0.5rem;
    font-size: 0.82rem; font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.15s;
  }
  .btn-primary:hover { background: var(--lc-700); }

  @media (max-width: 768px) {
    .page { padding: 1rem; }
    .tags-grid { grid-template-columns: 1fr; }
    .header-top { flex-direction: column; align-items: stretch; gap: 0.5rem; }
  }
</style>