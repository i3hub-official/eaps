<!-- src/routes/lecturer/questions/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import {
    HelpCircle, PlusCircle, Search, Filter,
    FileText, Clock, Eye, Edit, Trash2,
    Copy, Link2, BarChart2, ChevronRight,
    CheckCircle, AlertCircle, XCircle,
    BookOpen, Layers, Zap, TrendingUp,
    List, Grid, Download, Upload,
    Tag, BookMarked, FileCheck
  } from '@lucide/svelte';
  import { fly } from 'svelte/transition';

  let { data }: { data: PageData } = $props();
  const { questions, typeCounts, topicCounts, examCounts, stats, totalQuestions } = data;

  // ── Toast system ──────────────────────────────────────────────────────────
  type Toast = { id: number; message: string; type: 'info' | 'warn' | 'success' };
  let toasts = $state<Toast[]>([]);
  let toastId = 0;

  function showToast(message: string, type: Toast['type'] = 'info', duration = 2600) {
    const id = ++toastId;
    toasts = [...toasts, { id, message, type }];
    setTimeout(() => { toasts = toasts.filter(t => t.id !== id); }, duration);
  }

  // ── State ──────────────────────────────────────────────────────────────────
  let searchQuery = $state('');
  let selectedType = $state<string>('all');
  let viewMode = $state<'list' | 'grid'>('list');
  let sortBy = $state<'newest' | 'oldest' | 'most-used' | 'least-used'>('newest');

  // ── Filtered Questions ────────────────────────────────────────────────────
  const filteredQuestions = $derived(() => {
    let result = [...questions];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(q =>
        q.body.toLowerCase().includes(query) ||
        q.topic?.toLowerCase().includes(query) ||
        q.courseCode?.toLowerCase().includes(query) ||
        q.examTitle?.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (selectedType !== 'all') {
      result = result.filter(q => q.type === selectedType);
    }

    // Sort
    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'most-used':
        result.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
        break;
      case 'least-used':
        result.sort((a, b) => (a.usageCount || 0) - (b.usageCount || 0));
        break;
    }

    return result;
  });

  const filteredData = $derived(filteredQuestions());

  // ── Type colors ────────────────────────────────────────────────────────────
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

  function getTypeIcon(type: string) {
    const icons: Record<string, any> = {
      mcq: List,
      true_false: CheckCircle,
      fill_in_the_blank: FileText,
      essay: FileCheck
    };
    return icons[type] || HelpCircle;
  }

  function formatDate(d: string | Date) {
    return new Date(d).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  function truncateText(text: string, maxLength: number = 100) {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  }

  // ── Copy question ──────────────────────────────────────────────────────────
  function copyQuestion(body: string) {
    navigator.clipboard?.writeText(body).then(() => {
      showToast('Question copied to clipboard!', 'success');
    }).catch(() => {
      showToast('Failed to copy', 'warn');
    });
  }

  // ── Delete question ──────────────────────────────────────────────────────
  function deleteQuestion(id: string) {
    if (!confirm('Delete this question? This action cannot be undone.')) return;
    showToast('Question deleted', 'success');
  }
</script>

<svelte:head><title>Question Bank — MOUAU eTest</title></svelte:head>

<!-- ── Toast stack ─────────────────────────────────────────────────────────── -->
<div class="toast-stack" aria-live="polite">
  {#each toasts as t (t.id)}
    <div class="toast toast-{t.type}"
      in:fly={{ y: 10, duration: 200 }}
      out:fly={{ y: -6, duration: 160 }}>
      {#if t.type === 'warn'}<AlertCircle size={13} />
      {:else if t.type === 'success'}<CheckCircle size={13} />
      {:else}<HelpCircle size={13} />{/if}
      {t.message}
    </div>
  {/each}
</div>

<div class="page">
  <!-- Header -->
  <div class="page-header">
    <div class="header-main">
      <div>
        <div class="header-badge">
          <HelpCircle size={16} />
          <span>Question Bank</span>
        </div>
        <h1>My Questions</h1>
        <p class="subtitle">{totalQuestions} question{totalQuestions !== 1 ? 's' : ''} across {stats.totalExams} exam{stats.totalExams !== 1 ? 's' : ''}</p>
      </div>
      <div class="header-actions">
        <a href="/lecturer/questions/create" class="btn-secondary">
          <PlusCircle size={14} /> Create Question
        </a>
        <a href="/lecturer/questions/import" class="btn-secondary">
          <Upload size={14} /> Import
        </a>
        <a href="/lecturer/questions/export" class="btn-secondary">
          <Download size={14} /> Export
        </a>
      </div>
    </div>
  </div>

  <!-- Stats -->
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(99,102,241,0.1); color: #4f46e5;">
        <HelpCircle size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{stats.totalQuestions}</span>
        <span class="stat-label">Total Questions</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(37,99,235,0.1); color: #2563eb;">
        <List size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{stats.totalMcq}</span>
        <span class="stat-label">MCQ</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(124,58,237,0.1); color: #7c3aed;">
        <CheckCircle size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{stats.totalTrueFalse}</span>
        <span class="stat-label">True/False</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(22,163,74,0.1); color: #16a34a;">
        <FileText size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{stats.totalFitb}</span>
        <span class="stat-label">Fill in the Blank</span>
      </div>
    </div>
  </div>

  <!-- Type Distribution -->
  <div class="type-distribution">
    {#each typeCounts as type}
      <div class="type-item">
        <span class="type-dot" style="background:{getTypeColor(type.type)};"></span>
        <span class="type-label">{getTypeLabel(type.type)}</span>
        <span class="type-count">{type.count}</span>
        <div class="type-bar-track">
          <div 
            class="type-bar-fill" 
            style="width:{stats.totalQuestions > 0 ? (type.count / stats.totalQuestions * 100) : 0}%; background:{getTypeColor(type.type)};"
          ></div>
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
          placeholder="Search questions..."
          bind:value={searchQuery}
        />
        {#if searchQuery}
          <button class="clear-btn" onclick={() => searchQuery = ''}>
            <XCircle size={14} />
          </button>
        {/if}
      </div>

      <div class="filter-group">
        <Filter size={14} />
        <select bind:value={selectedType}>
          <option value="all">All Types</option>
          {#each typeCounts as type}
            <option value={type.type}>{getTypeLabel(type.type)} ({type.count})</option>
          {/each}
        </select>
      </div>

      <div class="sort-group">
        <select bind:value={sortBy}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="most-used">Most Used</option>
          <option value="least-used">Least Used</option>
        </select>
      </div>
    </div>

    <div class="controls-right">
      <button 
        class="view-toggle" 
        class:active={viewMode === 'list'}
        onclick={() => viewMode = 'list'}
        title="List view"
      >
        <List size={14} />
      </button>
      <button 
        class="view-toggle" 
        class:active={viewMode === 'grid'}
        onclick={() => viewMode = 'grid'}
        title="Grid view"
      >
        <Grid size={14} />
      </button>
      <span class="results-count">{filteredData.length} questions</span>
    </div>
  </div>

  <!-- Questions List -->
  {#if filteredData.length === 0}
    <div class="empty-state">
      <div class="empty-icon"><HelpCircle size={36} strokeWidth={1.2} /></div>
      <p class="empty-title">
        {searchQuery || selectedType !== 'all' ? 'No matching questions' : 'No questions yet'}
      </p>
      <p class="empty-sub">
        {searchQuery || selectedType !== 'all' 
          ? 'Try adjusting your search or filters.'
          : 'Create your first question to get started.'}
      </p>
      <a href="/lecturer/questions/create" class="btn-primary">
        <PlusCircle size={14} /> Create Question
      </a>
    </div>
  {:else if viewMode === 'list'}
    <div class="questions-list">
      {#each filteredData as q}
        <div class="question-item">
          <div class="question-left">
            <span class="question-type" style="color:{getTypeColor(q.type)};">
              <svelte:component this={getTypeIcon(q.type)} size={14} />
              {getTypeLabel(q.type)}
            </span>
            <p class="question-body">{truncateText(q.body, 150)}</p>
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
                <Clock size={10} /> {formatDate(q.createdAt)}
              </span>
              <span class="meta-tag">
                <BarChart2 size={10} /> Used {q.usageCount || 0} times
              </span>
            </div>
          </div>
          <div class="question-actions">
            <span class="question-marks">{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
            <a href={`/lecturer/questions/${q.id}`} class="action-btn outline" title="View">
              <Eye size={13} />
            </a>
            <a href={`/lecturer/questions/${q.id}/edit`} class="action-btn outline" title="Edit">
              <Edit size={13} />
            </a>
            <button class="action-btn outline" onclick={() => copyQuestion(q.body)} title="Copy">
              <Copy size={13} />
            </button>
            <button class="action-btn outline danger" onclick={() => deleteQuestion(q.id)} title="Delete">
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="questions-grid">
      {#each filteredData as q}
        <div class="question-card">
          <div class="card-header">
            <span class="question-type" style="color:{getTypeColor(q.type)};">
              <svelte:component this={getTypeIcon(q.type)} size={14} />
              {getTypeLabel(q.type)}
            </span>
            <span class="question-marks">{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
          </div>
          <p class="question-body">{truncateText(q.body, 120)}</p>
          <div class="question-meta">
            <span class="meta-tag">{q.courseCode}</span>
            <span class="meta-tag">{q.examTitle}</span>
            {#if q.topic}
              <span class="meta-tag">{q.topic}</span>
            {/if}
          </div>
          <div class="card-footer">
            <span class="usage-info">Used {q.usageCount || 0} times</span>
            <div class="card-actions">
              <a href={`/lecturer/questions/${q.id}`} class="action-btn outline" title="View">
                <Eye size={12} />
              </a>
              <a href={`/lecturer/questions/${q.id}/edit`} class="action-btn outline" title="Edit">
                <Edit size={12} />
              </a>
              <button class="action-btn outline" onclick={() => copyQuestion(q.body)} title="Copy">
                <Copy size={12} />
              </button>
            </div>
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
    max-width: 1400px;
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

  .header-badge {
    display: inline-flex; align-items: center; gap: 0.4rem;
    font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.05em; color: var(--color-muted);
    padding: 0.2rem 0.6rem;
    background: var(--color-bg); border-radius: 999px;
    margin-bottom: 0.5rem;
  }

  .header-main {
    display: flex; justify-content: space-between; align-items: center;
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

  .btn-secondary {
    display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.55rem 1.1rem;
    background: var(--color-bg); color: var(--color-text);
    border: 1px solid var(--color-border); border-radius: 0.6rem;
    font-size: 0.82rem; font-weight: 700;
    text-decoration: none; cursor: pointer;
    transition: all 0.15s;
  }
  .btn-secondary:hover { border-color: var(--lc-600); color: var(--lc-600); background: var(--lc-soft); }

  .header-actions {
    display: flex; gap: 0.5rem;
    flex-wrap: wrap;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
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

  .type-distribution {
    display: flex; flex-wrap: wrap; gap: 0.75rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 0.75rem 1rem;
  }

  .type-item {
    display: flex; align-items: center; gap: 0.5rem;
    flex: 1;
    min-width: 120px;
  }

  .type-dot {
    width: 8px; height: 8px; border-radius: 50%;
    flex-shrink: 0;
  }

  .type-label {
    font-size: 0.75rem; font-weight: 600; color: var(--color-text);
  }

  .type-count {
    font-size: 0.7rem; font-weight: 700; color: var(--color-muted);
    min-width: 20px;
  }

  .type-bar-track {
    flex: 1; height: 4px; background: var(--color-border); border-radius: 2px;
    overflow: hidden;
  }

  .type-bar-fill {
    height: 100%; border-radius: 2px; transition: width 0.5s ease;
  }

  .controls {
    display: flex; justify-content: space-between; align-items: center;
    gap: 1rem; flex-wrap: wrap;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 0.75rem 1rem;
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

  .filter-group {
    display: flex; align-items: center; gap: 0.4rem;
    color: var(--color-muted);
  }
  .filter-group select,
  .sort-group select {
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
  .filter-group select:focus,
  .sort-group select:focus {
    border-color: var(--lc-600);
    box-shadow: 0 0 0 3px var(--lc-soft);
  }

  .controls-right {
    display: flex; align-items: center; gap: 0.5rem;
  }

  .view-toggle {
    padding: 0.3rem 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: 0.4rem;
    background: var(--color-bg);
    color: var(--color-muted);
    cursor: pointer;
    transition: all 0.15s;
  }
  .view-toggle:hover { border-color: var(--lc-600); color: var(--lc-600); }
  .view-toggle.active {
    background: var(--lc-soft); border-color: var(--lc-600); color: var(--lc-600);
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
    background: var(--lc-soft); border: 1px solid rgba(79,70,229,0.15);
    display: flex; align-items: center; justify-content: center;
    color: var(--lc-600); margin-bottom: 0.25rem;
  }

  .empty-title { font-size: 1rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .empty-sub { font-size: 0.82rem; color: var(--color-muted); margin: 0; }

  .questions-list {
    display: flex; flex-direction: column; gap: 0.75rem;
  }

  .question-item {
    display: flex; justify-content: space-between; align-items: flex-start;
    padding: 1rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    transition: border-color 0.15s, box-shadow 0.15s;
    gap: 1rem;
  }
  .question-item:hover {
    border-color: rgba(79,70,229,0.25);
    box-shadow: 0 2px 12px rgba(0,0,0,0.04);
  }

  .question-left {
    flex: 1; min-width: 0;
  }

  .question-type {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-size: 0.7rem; font-weight: 700;
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    margin-bottom: 0.4rem;
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

  .question-actions {
    display: flex; align-items: center; gap: 0.3rem;
    flex-shrink: 0;
  }

  .question-marks {
    font-size: 0.7rem; font-weight: 700; color: var(--color-muted);
    padding: 0.2rem 0.4rem;
    background: var(--color-bg); border-radius: 0.3rem;
    border: 1px solid var(--color-border);
  }

  .action-btn {
    display: inline-flex; align-items: center; justify-content: center;
    width: 32px; height: 32px;
    border-radius: 0.4rem;
    border: 1px solid var(--color-border);
    background: var(--color-bg);
    color: var(--color-muted);
    cursor: pointer;
    transition: all 0.15s;
    text-decoration: none;
  }
  .action-btn:hover { border-color: var(--lc-600); color: var(--lc-600); }
  .action-btn.danger:hover { border-color: #dc2626; color: #dc2626; }
  .action-btn.outline { background: transparent; }

  .questions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
  }

  .question-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 1rem;
    display: flex; flex-direction: column; gap: 0.5rem;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .question-card:hover {
    border-color: rgba(79,70,229,0.25);
    box-shadow: 0 2px 12px rgba(0,0,0,0.04);
  }

  .card-header {
    display: flex; justify-content: space-between; align-items: center;
  }

  .card-footer {
    display: flex; justify-content: space-between; align-items: center;
    margin-top: auto;
    padding-top: 0.5rem;
    border-top: 1px solid var(--color-border);
  }

  .usage-info {
    font-size: 0.65rem; color: var(--color-muted);
  }

  .card-actions {
    display: flex; gap: 0.3rem;
  }
  .card-actions .action-btn {
    width: 28px; height: 28px;
  }

  @media (max-width: 768px) {
    .page { padding: 1rem; }
    .header-main { flex-direction: column; align-items: stretch; gap: 0.75rem; }
    .header-actions { flex-wrap: wrap; }
    .header-actions .btn-primary,
    .header-actions .btn-secondary { flex: 1; justify-content: center; }
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
    .controls { flex-direction: column; align-items: stretch; }
    .controls-left { flex-direction: column; }
    .search-wrap { min-width: 100%; }
    .question-item { flex-direction: column; align-items: stretch; }
    .question-actions { justify-content: flex-end; }
    .questions-grid { grid-template-columns: 1fr; }
    .type-distribution { flex-direction: column; }
    .type-item { min-width: 100%; }
  }

  @media (max-width: 480px) {
    .stats-grid { grid-template-columns: 1fr; }
  }
</style>