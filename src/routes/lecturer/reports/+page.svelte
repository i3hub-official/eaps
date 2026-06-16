<!-- src/routes/admin/reports/+page.svelte -->

<script lang="ts">
  import type { PageData } from './$types';
  import {
    BarChart3, Search, FileText, Calendar,
    Download, ChevronRight, TrendingUp
  } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();

  const CATEGORY_MAP: Record<string, string[]> = {
    'Academic Performance': [
      'grade-distribution', 'pass-fail', 'exam-performance',
      'student-performance', 'level-analysis', 'time-score',
    ],
    'People': [
      'student-demographics', 'user-overview', 'lecturer-activity',
      'invigilator-assignments', 'suspended-users', 'registration-trends',
    ],
    'Courses & Exams': [
      'course-analysis', 'course-enrollment', 'exam-scheduling',
      'college-performance', 'department-performance', 'session-semester',
      'question-analysis',
    ],
    'Security & Audit': [
      'violations', 'violation-trends', 'flagged-sessions',
      'security-incidents', 'action-analysis', 'audit-logs',
      'login-history',
    ],
    'System': [
      'overview', 'system-activity', 'notification-analytics',
    ],
  };

  let search = $state('');

  const filtered = $derived(
    search.trim()
      ? data.reports.filter(r =>
          r.label.toLowerCase().includes(search.toLowerCase()) ||
          r.description.toLowerCase().includes(search.toLowerCase())
        )
      : data.reports
  );

  function reportsInCategory(ids: string[]) {
    return filtered.filter(r => ids.includes(r.id));
  }

  const totalReports = data.reports.length;
  const exportable   = data.reports.filter(r => r.exportable).length;
</script>

<svelte:head>
  <title>Reports — MOUAU eTest Admin</title>
</svelte:head>

<div class="reports-index">

  <!-- Header -->
  <div class="page-header">
    <div class="header-left">
      <div class="header-icon">
        <BarChart3 size={24} />
      </div>
      <div>
        <h1>Reports &amp; Analytics</h1>
        <p>Michael Okpara University of Agriculture, Umudike — Examination Intelligence</p>
      </div>
    </div>
    <div class="header-stats">
      <div class="hstat">
        <span class="hstat-val">{totalReports}</span>
        <span class="hstat-lbl">Reports</span>
      </div>
      <div class="hstat">
        <span class="hstat-val">{exportable}</span>
        <span class="hstat-lbl">Exportable</span>
      </div>
    </div>
  </div>

  <!-- Search -->
  <div class="search-wrap">
    <Search size={16} />
    <input
      type="search"
      placeholder="Search reports…"
      bind:value={search}
      class="search-input"
    />
    {#if search}
      <span class="search-count">{filtered.length} found</span>
    {/if}
  </div>

  <!-- Categories -->
  {#if search.trim()}
    <!-- Flat search results -->
    <div class="category-section">
      <h2 class="category-title">Search Results</h2>
      <div class="report-grid">
        {#each filtered as report}
          <a href="/admin/reports/{report.id}" class="report-card">
            <div class="rc-body">
              <div class="rc-icon"><FileText size={18} /></div>
              <div class="rc-info">
                <span class="rc-label">{report.label}</span>
                <span class="rc-desc">{report.description}</span>
              </div>
            </div>
            <div class="rc-footer">
              {#if report.supportsSearch}
                <span class="rc-tag"><Search size={10} /> Searchable</span>
              {/if}
              {#if report.supportsDateRange}
                <span class="rc-tag"><Calendar size={10} /> Date filter</span>
              {/if}
              {#if report.exportable}
                <span class="rc-tag"><Download size={10} /> Export</span>
              {/if}
              <ChevronRight size={14} class="rc-arrow" />
            </div>
          </a>
        {/each}
      </div>
    </div>

  {:else}
    <!-- Categorized view -->
    {#each Object.entries(CATEGORY_MAP) as [category, ids]}
      {@const categoryReports = reportsInCategory(ids)}
      {#if categoryReports.length > 0}
        <div class="category-section">
          <div class="category-header">
            <h2 class="category-title">{category}</h2>
            <span class="category-count">{categoryReports.length} reports</span>
          </div>
          <div class="report-grid">
            {#each categoryReports as report}
              <a href="/admin/reports/{report.id}" class="report-card">
                <div class="rc-body">
                  <div class="rc-icon"><TrendingUp size={18} /></div>
                  <div class="rc-info">
                    <span class="rc-label">{report.label}</span>
                    <span class="rc-desc">{report.description}</span>
                  </div>
                </div>
                <div class="rc-footer">
                  {#if report.supportsSearch}
                    <span class="rc-tag"><Search size={10} /> Searchable</span>
                  {/if}
                  {#if report.supportsDateRange}
                    <span class="rc-tag"><Calendar size={10} /> Date filter</span>
                  {/if}
                  {#if report.exportable}
                    <span class="rc-tag"><Download size={10} /> Export</span>
                  {/if}
                  <ChevronRight size={14} class="rc-arrow" />
                </div>
              </a>
            {/each}
          </div>
        </div>
      {/if}
    {/each}
  {/if}

</div>

<style>
  .reports-index {
    padding: 1.75rem 2rem 4rem;
    max-width: 1400px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  /* ── Header ── */
  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    padding-bottom: 1.5rem;
    border-bottom: 1.5px solid var(--color-border, #e5e7eb);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .header-icon {
    width: 52px; height: 52px;
    border-radius: 1rem;
    background: var(--g-soft, rgba(22,163,74,0.08));
    color: var(--g600, #16a34a);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }

  .header-left h1 {
    font-size: 1.75rem;
    font-weight: 900;
    letter-spacing: -0.03em;
    color: var(--color-text, #111827);
    margin: 0 0 0.2rem;
    line-height: 1;
  }

  .header-left p {
    font-size: 0.8rem;
    color: var(--color-muted, #6b7280);
    margin: 0;
  }

  .header-stats {
    display: flex;
    gap: 1.5rem;
  }

  .hstat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.1rem;
  }

  .hstat-val {
    font-size: 1.75rem;
    font-weight: 900;
    color: var(--g600, #16a34a);
    line-height: 1;
  }

  .hstat-lbl {
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-muted, #6b7280);
  }

  /* ── Search ── */
  .search-wrap {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.625rem 1rem;
    background: var(--color-surface, white);
    border: 1.5px solid var(--color-border, #e5e7eb);
    border-radius: 0.875rem;
    color: var(--color-muted, #9ca3af);
    transition: border-color 0.15s;
  }

  .search-wrap:focus-within {
    border-color: var(--g500, #22c55e);
  }

  .search-input {
    flex: 1;
    border: none;
    background: none;
    outline: none;
    font-size: 0.9rem;
    color: var(--color-text, #111827);
  }

  .search-count {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--g600, #16a34a);
    white-space: nowrap;
  }

  /* ── Category ── */
  .category-section {
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
  }

  .category-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .category-title {
    font-size: 0.8rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--color-muted, #6b7280);
    margin: 0;
  }

  .category-count {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--color-muted, #9ca3af);
    background: var(--color-bg, #f3f4f6);
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
  }

  /* ── Report grid ── */
  .report-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 0.875rem;
  }

  /* ── Report card ── */
  .report-card {
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
    padding: 1.125rem;
    background: var(--color-surface, white);
    border: 1.5px solid var(--color-border, #e5e7eb);
    border-radius: 1rem;
    text-decoration: none;
    transition: all 0.18s;
    cursor: pointer;
  }

  .report-card:hover {
    border-color: var(--g400, #4ade80);
    box-shadow: 0 4px 16px var(--g-soft, rgba(22,163,74,0.08));
    transform: translateY(-2px);
  }

  .rc-body {
    display: flex;
    align-items: flex-start;
    gap: 0.875rem;
  }

  .rc-icon {
    width: 36px; height: 36px;
    border-radius: 0.625rem;
    background: var(--g-soft, rgba(22,163,74,0.08));
    color: var(--g600, #16a34a);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    transition: background 0.15s;
  }

  .report-card:hover .rc-icon {
    background: var(--g-soft2, rgba(22,163,74,0.15));
  }

  .rc-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .rc-label {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--color-text, #111827);
    line-height: 1.2;
  }

  .rc-desc {
    font-size: 0.75rem;
    color: var(--color-muted, #6b7280);
    line-height: 1.4;
  }

  .rc-footer {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    flex-wrap: wrap;
  }

  .rc-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.2rem 0.5rem;
    background: var(--color-bg, #f3f4f6);
    border-radius: 0.375rem;
    font-size: 0.65rem;
    font-weight: 700;
    color: var(--color-muted, #6b7280);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  :global(.rc-arrow) {
    margin-left: auto;
    color: var(--color-muted, #9ca3af);
    transition: transform 0.15s, color 0.15s;
  }

  .report-card:hover :global(.rc-arrow) {
    transform: translateX(3px);
    color: var(--g600, #16a34a);
  }

  @media (max-width: 640px) {
    .reports-index { padding: 1rem 1rem 3rem; }
    .report-grid   { grid-template-columns: 1fr; }
    .header-stats  { display: none; }
  }
</style>