<!-- src/routes/admin/exams/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import {
    ClipboardList, Plus, Search, Filter, Eye, Clock,
    Users, BookOpen, CheckCircle, XCircle, AlertCircle,
    Calendar, Hash, ChevronRight, BarChart3, Edit,
    PlayCircle, PauseCircle, FileText
  } from 'lucide-svelte';

  let { data }: { data: PageData } = $props();

  let search = $state(data.search);
  let status = $state(data.statusFilter);

  function applyFilters() {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (status !== 'all') params.set('status', status);
    goto(`/admin/exams?${params}`);
  }

  function statusIcon(s: string) {
    return s === 'active' ? PlayCircle
      : s === 'completed' ? CheckCircle
      : s === 'scheduled' ? Calendar
      : s === 'cancelled' ? XCircle
      : FileText; // draft
  }

  function statusColor(s: string) {
    return s === 'active'    ? 'es-active'
      : s === 'completed' ? 'es-completed'
      : s === 'scheduled' ? 'es-scheduled'
      : s === 'cancelled' ? 'es-cancelled'
      : 'es-draft';
  }

  function formatDate(d: string | Date | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  const STATUSES = ['all','draft','scheduled','active','completed','cancelled'];
</script>

<div class="exams-page">
  <div class="page-header">
    <div class="page-header-left">
      <div class="page-icon"><ClipboardList size={22} /></div>
      <div>
        <h1 class="page-title">Exams</h1>
        <p class="page-sub">Manage all system exams</p>
      </div>
    </div>
    <a href="/admin/exams/create" class="btn-primary"><Plus size={15} /> New Exam</a>
  </div>

  <!-- Status summary -->
  <div class="status-bar">
    {#each [
      { key: 'draft',     label: 'Draft',     icon: FileText,     cls: 'sb-draft' },
      { key: 'scheduled', label: 'Scheduled',  icon: Calendar,     cls: 'sb-scheduled' },
      { key: 'active',    label: 'Active',     icon: PlayCircle,   cls: 'sb-active' },
      { key: 'completed', label: 'Completed',  icon: CheckCircle,  cls: 'sb-completed' },
      { key: 'cancelled', label: 'Cancelled',  icon: XCircle,      cls: 'sb-cancelled' },
    ] as item}
      <button
        class="sb-chip {item.cls}"
        class:sb-selected={status === item.key}
        onclick={() => { status = item.key; applyFilters(); }}
      >
        <item.icon size={13} />
        {item.label}
        <span class="sb-count">{data.stats[item.key] ?? 0}</span>
      </button>
    {/each}
  </div>

  <!-- Search + filter bar -->
  <div class="filter-bar">
    <div class="search-wrap">
      <Search size={13} />
      <input
        class="search-input"
        placeholder="Search exams, course codes…"
        bind:value={search}
        onkeydown={(e) => e.key === 'Enter' && applyFilters()}
      />
    </div>
    <button class="btn-ghost" onclick={applyFilters}><Filter size={14} /> Apply</button>
  </div>

  <!-- Table -->
  <div class="table-wrap">
    {#if data.exams.length === 0}
      <div class="empty">
        <ClipboardList size={32} />
        <p>No exams found</p>
        <a href="/admin/exams/create" class="btn-primary"><Plus size={14} /> Create Exam</a>
      </div>
    {:else}
      <table class="exams-table">
        <thead>
          <tr>
            <th>Exam</th>
            <th>Course</th>
            <th>Lecturer</th>
            <th>Status</th>
            <th>Duration</th>
            <th>Questions</th>
            <th>Sessions</th>
            <th>Scheduled</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each data.exams as exam (exam.id)}
            {@const Icon = statusIcon(exam.status)}
            <tr onclick={() => goto(`/admin/exams/${exam.id}`)} class="exam-row">
              <td>
                <div class="exam-title">{exam.title}</div>
                <div class="exam-meta">
                  <span class="exam-session">{exam.session}</span>
                  {#if exam.levels?.length}<span>· Lvl {exam.levels.join(', ')}</span>{/if}
                </div>
              </td>
              <td>
                <div class="course-code">{exam.course.code}</div>
                <div class="course-title">{exam.course.title}</div>
              </td>
              <td class="td-muted">{exam.lecturer.fullName}</td>
              <td>
                <span class="exam-status {statusColor(exam.status)}">
                  <Icon size={11} /> {exam.status}
                </span>
              </td>
              <td class="td-muted"><Clock size={12} /> {exam.durationMinutes}m</td>
              <td class="td-muted">{exam._count.questions}</td>
              <td class="td-muted">{exam._count.examSessions}</td>
              <td class="td-muted">{formatDate(exam.scheduledStart)}</td>
              <td>
                <ChevronRight size={14} class="row-chevron" />
              </td>
            </tr>
          {/each}
        </tbody>
      </table>

      <!-- Pagination -->
      {#if data.total > data.limit}
        <div class="pagination">
          <button
            class="page-btn"
            disabled={data.page <= 1}
            onclick={() => goto(`/admin/exams?page=${data.page - 1}&q=${search}&status=${status}`)}
          >← Prev</button>
          <span class="page-info">Page {data.page} of {Math.ceil(data.total / data.limit)}</span>
          <button
            class="page-btn"
            disabled={data.page * data.limit >= data.total}
            onclick={() => goto(`/admin/exams?page=${data.page + 1}&q=${search}&status=${status}`)}
          >Next →</button>
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .exams-page { display: flex; flex-direction: column; gap: 1.25rem; }
  .page-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
  .page-header-left { display: flex; align-items: center; gap: .875rem; }
  .page-icon {
    width: 44px; height: 44px; border-radius: .75rem;
    background: linear-gradient(135deg,#0ea5e9,#0284c7);
    display: flex; align-items: center; justify-content: center; color: white;
  }
  .page-title { font-size: 1.25rem; font-weight: 800; color: var(--color-text); }
  .page-sub { font-size: .8rem; color: var(--color-muted); }

  .btn-primary {
    display: flex; align-items: center; gap: .5rem;
    padding: .55rem 1.1rem; background: #16a34a; color: white;
    border: none; border-radius: .5rem; font-size: .82rem; font-weight: 600;
    cursor: pointer; font-family: inherit; text-decoration: none; transition: background .15s;
  }
  .btn-primary:hover { background: #15803d; }
  .btn-ghost {
    display: flex; align-items: center; gap: .5rem;
    padding: .5rem .875rem; background: transparent;
    border: 1px solid var(--color-border); color: var(--color-text);
    border-radius: .5rem; font-size: .8rem; font-weight: 600; cursor: pointer; font-family: inherit;
  }
  .btn-ghost:hover { background: var(--color-surface-hover); }

  /* Status bar */
  .status-bar { display: flex; gap: .5rem; flex-wrap: wrap; }
  .sb-chip {
    display: flex; align-items: center; gap: .375rem;
    padding: .4rem .875rem; border-radius: 2rem;
    border: 1.5px solid transparent; font-size: .75rem; font-weight: 600;
    cursor: pointer; font-family: inherit; transition: all .15s;
    background: var(--color-surface); color: var(--color-muted);
  }
  .sb-count { font-size: .65rem; background: rgba(0,0,0,.1); padding: .1rem .4rem; border-radius: 2rem; }
  .sb-chip:hover { color: var(--color-text); }
  .sb-active.sb-selected, .sb-active:hover    { border-color: #22c55e; color: #16a34a; background: rgba(22,163,74,.08); }
  .sb-completed.sb-selected, .sb-completed:hover { border-color: #3b82f6; color: #3b82f6; background: rgba(59,130,246,.08); }
  .sb-scheduled.sb-selected, .sb-scheduled:hover { border-color: #a855f7; color: #a855f7; background: rgba(168,85,247,.08); }
  .sb-cancelled.sb-selected, .sb-cancelled:hover { border-color: #ef4444; color: #ef4444; background: rgba(239,68,68,.08); }
  .sb-draft.sb-selected, .sb-draft:hover { border-color: var(--color-border); color: var(--color-text); }
  .sb-selected .sb-count { background: currentColor; color: white; opacity: .9; }

  /* Search */
  .filter-bar { display: flex; gap: .75rem; align-items: center; }
  .search-wrap {
    flex: 1; display: flex; align-items: center; gap: .5rem;
    padding: .5rem .875rem; background: var(--color-surface);
    border: 1px solid var(--color-border); border-radius: .5rem;
  }
  .search-wrap svg { color: var(--color-muted); flex-shrink: 0; }
  .search-input { background: none; border: none; outline: none; font-size: .82rem; color: var(--color-text); width: 100%; font-family: inherit; }

  /* Table */
  .table-wrap { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: .875rem; overflow: hidden; }
  .exams-table { width: 100%; border-collapse: collapse; }
  .exams-table th { padding: .75rem 1rem; background: var(--color-bg); font-size: .7rem; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--color-muted); text-align: left; border-bottom: 1px solid var(--color-border); white-space: nowrap; }
  .exams-table td { padding: .875rem 1rem; border-bottom: 1px solid var(--color-border); vertical-align: middle; }
  .exam-row { cursor: pointer; transition: background .1s; }
  .exam-row:hover { background: var(--color-surface-hover); }
  .exam-row:last-child td { border-bottom: none; }
  .exam-title { font-weight: 600; font-size: .85rem; color: var(--color-text); }
  .exam-meta { font-size: .7rem; color: var(--color-muted); margin-top: .2rem; display: flex; gap: .375rem; }
  .exam-session { font-weight: 500; }
  .course-code { font-weight: 700; font-size: .8rem; color: var(--color-text); }
  .course-title { font-size: .7rem; color: var(--color-muted); }
  .td-muted { color: var(--color-muted); font-size: .8rem; white-space: nowrap; }
  .td-muted :global(svg) { display: inline; vertical-align: middle; margin-right: .25rem; }

  .exam-status {
    display: inline-flex; align-items: center; gap: .3rem;
    font-size: .68rem; font-weight: 700; padding: .25rem .625rem;
    border-radius: 2rem; text-transform: capitalize; white-space: nowrap;
  }
  .es-active    { background: rgba(22,163,74,.12); color: #16a34a; }
  .es-completed { background: rgba(59,130,246,.12); color: #3b82f6; }
  .es-scheduled { background: rgba(168,85,247,.12); color: #a855f7; }
  .es-cancelled { background: rgba(239,68,68,.12);  color: #ef4444; }
  .es-draft     { background: var(--color-bg); color: var(--color-muted); border: 1px solid var(--color-border); }

  .row-chevron { color: var(--color-muted); }

  /* Pagination */
  .pagination { display: flex; align-items: center; justify-content: center; gap: 1rem; padding: 1rem; border-top: 1px solid var(--color-border); }
  .page-btn { padding: .4rem .875rem; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: .375rem; font-size: .78rem; cursor: pointer; font-family: inherit; color: var(--color-text); }
  .page-btn:disabled { opacity: .4; cursor: not-allowed; }
  .page-info { font-size: .78rem; color: var(--color-muted); }

  /* Empty */
  .empty { padding: 4rem; display: flex; flex-direction: column; align-items: center; gap: 1rem; color: var(--color-muted); }

  @media (max-width: 768px) {
    .exams-table th:nth-child(n+4), .exams-table td:nth-child(n+4) { display: none; }
    .exams-table th:nth-child(3), .exams-table td:nth-child(3) { display: none; }
  }
</style>