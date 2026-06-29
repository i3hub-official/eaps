<!-- src/routes/lecturer/questions/favorites/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import {
    Star, ChevronLeft, Search, X, Heart,
    BookOpen, FileText, HelpCircle, CheckCircle,
    AlertCircle, BarChart2, Clock, Users,
    Eye, Edit, Trash2, Copy, Link2
  } from '@lucide/svelte';
  import { fly } from 'svelte/transition';

  let { data }: { data: PageData } = $props();
  const { favorites, stats, totalFavorites } = data;

  // ── State ──────────────────────────────────────────────────────────────────
  let searchQuery = $state('');
  let selectedType = $state('all');

  // ── Toast system ──────────────────────────────────────────────────────────
  type Toast = { id: number; message: string; type: 'info' | 'warn' | 'success' };
  let toasts = $state<Toast[]>([]);
  let toastId = 0;

  function showToast(message: string, type: Toast['type'] = 'info', duration = 2600) {
    const id = ++toastId;
    toasts = [...toasts, { id, message, type }];
    setTimeout(() => { toasts = toasts.filter(t => t.id !== id); }, duration);
  }

  // ── Filtered Favorites ────────────────────────────────────────────────────
  const filteredFavorites = $derived(() => {
    let result = [...favorites];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(q =>
        q.body.toLowerCase().includes(query) ||
        q.topic?.toLowerCase().includes(query) ||
        q.courseCode?.toLowerCase().includes(query) ||
        q.examTitle?.toLowerCase().includes(query)
      );
    }

    if (selectedType !== 'all') {
      result = result.filter(q => q.type === selectedType);
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
      true_false: 'True/False',
      fill_in_the_blank: 'Fill in the Blank',
      essay: 'Essay'
    };
    return labels[type] || type;
  }

  function formatDate(d: string | Date) {
    return new Date(d).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  function truncateText(text: string, maxLength: number = 120) {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  }

  function removeFavorite(questionId: string) {
    if (!confirm('Remove this question from favorites?')) return;
    showToast('Removed from favorites', 'success');
  }

  function copyQuestion(body: string) {
    navigator.clipboard?.writeText(body).then(() => {
      showToast('Question copied!', 'success');
    }).catch(() => {
      showToast('Failed to copy', 'warn');
    });
  }
</script>

<svelte:head><title>Favorite Questions — MOUAU eTest</title></svelte:head>

<!-- ── Toast stack ─────────────────────────────────────────────────────────── -->
<div class="toast-stack" aria-live="polite">
  {#each toasts as t (t.id)}
    <div class="toast toast-{t.type}"
      in:fly={{ y: 10, duration: 200 }}
      out:fly={{ y: -6, duration: 160 }}>
      {#if t.type === 'warn'}<AlertCircle size={13} />
      {:else if t.type === 'success'}<CheckCircle size={13} />
      {:else}<Star size={13} />{/if}
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
          <Star size={16} />
          <span>Favorites</span>
        </div>
        <h1>Favorite Questions</h1>
        <p class="subtitle">{totalFavorites} favorite question{totalFavorites !== 1 ? 's' : ''}</p>
      </div>
    </div>
  </div>

  <!-- Stats -->
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(245,158,11,0.1); color: #d97706;">
        <Star size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{totalFavorites}</span>
        <span class="stat-label">Total Favorites</span>
      </div>
    </div>
    {#each stats as stat}
      <div class="stat-card">
        <div class="stat-icon" style="background:{getTypeColor(stat.byType)}15; color:{getTypeColor(stat.byType)};">
          <HelpCircle size={18} />
        </div>
        <div class="stat-content">
          <span class="stat-value">{stat.count}</span>
          <span class="stat-label">{getTypeLabel(stat.byType)}</span>
        </div>
      </div>
    {/each}
  </div>

  <!-- Controls -->
  <div class="controls">
    <div class="controls-left">
      <div class="search-wrap">
        <Search size={14} />
        <input
          type="text"
          placeholder="Search favorites..."
          bind:value={searchQuery}
        />
        {#if searchQuery}
          <button class="clear-btn" onclick={() => searchQuery = ''}>
            <X size={14} />
          </button>
        {/if}
      </div>

      <div class="filter-group">
        <select bind:value={selectedType}>
          <option value="all">All Types</option>
          <option value="mcq">MCQ</option>
          <option value="true_false">True/False</option>
          <option value="fill_in_the_blank">Fill in the Blank</option>
          <option value="essay">Essay</option>
        </select>
      </div>
    </div>

    <div class="controls-right">
      <span class="results-count">{filteredFavorites().length} questions</span>
    </div>
  </div>

  <!-- Favorites List -->
  {#if filteredFavorites().length === 0}
    <div class="empty-state">
      <div class="empty-icon"><Star size={36} strokeWidth={1.2} /></div>
      <p class="empty-title">
        {searchQuery || selectedType !== 'all' ? 'No matching favorites' : 'No favorite questions yet'}
      </p>
      <p class="empty-sub">
        {searchQuery || selectedType !== 'all' 
          ? 'Try adjusting your search or filters.'
          : 'Star questions you use frequently for quick access.'}
      </p>
      <a href="/lecturer/questions" class="btn-primary">
        Browse Questions
      </a>
    </div>
  {:else}
    <div class="favorites-list">
      {#each filteredFavorites() as q}
        <div class="favorite-item">
          <div class="favorite-left">
            <div class="favorite-header">
              <span class="question-type" style="color:{getTypeColor(q.type)};">
                {getTypeLabel(q.type)}
              </span>
              <span class="favorite-badge">
                <Star size={11} fill="#d97706" color="#d97706" />
                Favorite
              </span>
              <span class="question-marks">{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
            </div>
            <p class="question-body">{truncateText(q.body)}</p>
            <div class="question-meta">
              <span class="meta-tag">
                <BookOpen size={10} /> {q.courseCode}
              </span>
              <span class="meta-tag">
                <FileText size={10} /> {q.examTitle}
              </span>
              {#if q.topic}
                <span class="meta-tag">
                  <Tag size={10} /> {q.topic}
                </span>
              {/if}
              <span class="meta-tag">
                <Clock size={10} /> Added {formatDate(q.favoritedAt)}
              </span>
              <span class="meta-tag">
                <BarChart2 size={10} /> Used {q.usageCount || 0} times
              </span>
            </div>
          </div>
          <div class="favorite-actions">
            <a href={`/lecturer/questions/${q.id}`} class="action-btn" title="View">
              <Eye size={13} />
            </a>
            <a href={`/lecturer/questions/${q.id}/edit`} class="action-btn" title="Edit">
              <Edit size={13} />
            </a>
            <button class="action-btn" onclick={() => copyQuestion(q.body)} title="Copy">
              <Copy size={13} />
            </button>
            <button class="action-btn danger" onclick={() => removeFavorite(q.id)} title="Remove favorite">
              <Heart size={13} fill="#dc2626" color="#dc2626" />
            </button>
          </div>
        </div>
      {/each}
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
    background: rgba(245,158,11,0.1);
    border-radius: 999px;
    margin-bottom: 0.5rem;
  }

  .header-main h1 {
    font-size: 1.5rem; font-weight: 800; color: var(--color-text);
    margin: 0;
  }

  .subtitle {
    font-size: 0.8rem; color: var(--color-muted); margin: 0.2rem 0 0;
  }

  .btn-primary {
    display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.55rem 1.1rem;
    background: var(--lc-600); color: white;
    border: none; border-radius: 0.6rem;
    font-size: 0.82rem; font-weight: 700;
    text-decoration: none; cursor: pointer;
    transition: background 0.15s, transform 0.15s;
  }
  .btn-primary:hover { background: var(--lc-700); transform: translateY(-1px); }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 0.75rem;
  }

  .stat-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 1rem;
    display: flex; align-items: center; gap: 0.75rem;
  }

  .stat-icon {
    width: 36px; height: 36px; border-radius: 0.5rem;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }

  .stat-content {
    display: flex; flex-direction: column;
  }

  .stat-value {
    font-size: 1.1rem; font-weight: 800; color: var(--color-text);
    line-height: 1.2;
  }

  .stat-label {
    font-size: 0.6rem; font-weight: 600; color: var(--color-muted);
    text-transform: uppercase; letter-spacing: 0.04em;
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

  .controls-left {
    display: flex; align-items: center; gap: 0.75rem;
    flex-wrap: wrap;
    flex: 1;
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

  .filter-group select {
    padding: 0.35rem 0.6rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-bg);
    color: var(--color-text);
    font-size: 0.78rem;
    font-family: inherit;
    outline: none;
    cursor: pointer;
  }
  .filter-group select:focus {
    border-color: var(--lc-600);
    box-shadow: 0 0 0 3px var(--lc-soft);
  }

  .controls-right {
    display: flex; align-items: center; gap: 0.5rem;
  }

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
    background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.15);
    display: flex; align-items: center; justify-content: center;
    color: #d97706; margin-bottom: 0.25rem;
  }

  .empty-title { font-size: 1rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .empty-sub { font-size: 0.82rem; color: var(--color-muted); margin: 0; }

  .favorites-list {
    display: flex; flex-direction: column; gap: 0.75rem;
  }

  .favorite-item {
    display: flex; justify-content: space-between; align-items: flex-start;
    padding: 1rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    transition: border-color 0.15s, box-shadow 0.15s;
    gap: 1rem;
  }
  .favorite-item:hover {
    border-color: rgba(245,158,11,0.3);
    box-shadow: 0 2px 12px rgba(0,0,0,0.04);
  }

  .favorite-left { flex: 1; min-width: 0; }

  .favorite-header {
    display: flex; align-items: center; gap: 0.5rem;
    flex-wrap: wrap;
    margin-bottom: 0.4rem;
  }

  .question-type {
    font-size: 0.7rem; font-weight: 700; padding: 0.15rem 0.5rem;
    border-radius: 999px;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
  }

  .favorite-badge {
    display: inline-flex; align-items: center; gap: 0.2rem;
    font-size: 0.65rem; font-weight: 700; color: #d97706;
    background: rgba(245,158,11,0.08);
    padding: 0.1rem 0.4rem;
    border-radius: 999px;
  }

  .question-marks {
    font-size: 0.7rem; font-weight: 700; color: var(--color-muted);
    padding: 0.1rem 0.4rem;
    background: var(--color-bg);
    border-radius: 0.3rem;
    border: 1px solid var(--color-border);
  }

  .question-body {
    font-size: 0.85rem; color: var(--color-text); margin: 0 0 0.5rem;
    line-height: 1.5;
  }

  .question-meta {
    display: flex; gap: 0.5rem; flex-wrap: wrap;
  }

  .meta-tag {
    display: inline-flex; align-items: center; gap: 0.2rem;
    font-size: 0.65rem; font-weight: 600; color: var(--color-muted);
    background: var(--color-bg); padding: 0.15rem 0.4rem;
    border-radius: 999px; border: 1px solid var(--color-border);
  }

  .favorite-actions {
    display: flex; align-items: center; gap: 0.3rem;
    flex-shrink: 0;
  }

  .action-btn {
    width: 32px; height: 32px;
    border-radius: 0.4rem;
    border: 1px solid var(--color-border);
    background: var(--color-bg);
    color: var(--color-muted);
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s;
    text-decoration: none;
  }
  .action-btn:hover { border-color: var(--lc-600); color: var(--lc-600); }
  .action-btn.danger:hover { border-color: #dc2626; color: #dc2626; }

  @media (max-width: 768px) {
    .page { padding: 1rem; }
    .favorite-item { flex-direction: column; align-items: stretch; }
    .favorite-actions { justify-content: flex-end; }
    .controls { flex-direction: column; align-items: stretch; }
    .controls-left { flex-direction: column; }
    .search-wrap { min-width: 100%; }
    .header-top { flex-direction: column; align-items: stretch; gap: 0.5rem; }
  }
</style>