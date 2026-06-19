<!-- src/routes/admin/reports/+page.svelte -->
<script lang="ts">
  import {
    FileText, Search, BarChart3, ShieldCheck, Users, BookOpen,
    GraduationCap, AlertTriangle, TrendingUp, Clock, ChevronRight,
    LayoutDashboard, Flag, Lock, Activity, Sparkles, Filter,
    Download, Calendar, SearchCheck, X
  } from '@lucide/svelte';

  // These would come from your load function in +page.server.ts
  // For now, using the registry data structure
  interface ReportMeta {
    id: string;
    label: string;
    description: string;
    category: string;
    supportsSearch: boolean;
    supportsDateRange: boolean;
    exportable: boolean;
  }

  // This would be loaded from the server
  let { data } = $props<{ data: { reports: ReportMeta[] } }>();

  let searchQuery = $state('');
  let selectedCategory = $state('all');

  // Category mapping with icons
  const categories: Record<string, { label: string; icon: typeof FileText; color: string }> = {
    all:           { label: 'All Reports',   icon: LayoutDashboard, color: '#3b82f6' },
    academic:      { label: 'Academic',      icon: BookOpen,        color: '#16a34a' },
    administrative:{ label: 'Administrative',icon: ShieldCheck,     color: '#6366f1' },
    analytics:     { label: 'Analytics',     icon: BarChart3,       color: '#f59e0b' },
    compliance:    { label: 'Compliance',    icon: Lock,            color: '#ef4444' },
  };

  // Fallback reports data if none provided from server
  const fallbackReports: ReportMeta[] = [
    { id: 'overview',            label: 'Overview',            description: 'System-wide stats and recent activity',                  category: 'analytics',      supportsSearch: false, supportsDateRange: false, exportable: false },
    { id: 'exam-performance',    label: 'Exam Performance',    description: 'Per-exam scores, pass rates and sessions',               category: 'academic',       supportsSearch: false, supportsDateRange: false, exportable: true },
    { id: 'grade-distribution',  label: 'Grade Distribution',  description: 'Breakdown of student scores across grade bands',           category: 'academic',       supportsSearch: false, supportsDateRange: false, exportable: true },
    { id: 'student-performance', label: 'Student Performance', description: 'Per-student exam results and averages',                  category: 'academic',       supportsSearch: false, supportsDateRange: false, exportable: true },
    { id: 'audit-logs',          label: 'Audit Logs',          description: 'System activity log with user tracking',                   category: 'administrative', supportsSearch: true,  supportsDateRange: true,  exportable: true },
    { id: 'violations',          label: 'Violations',          description: 'All recorded exam violations',                           category: 'compliance',     supportsSearch: true,  supportsDateRange: false, exportable: true },
    { id: 'action-analysis',     label: 'Action Analysis',     description: 'Actions taken in response to violations',                  category: 'compliance',     supportsSearch: false, supportsDateRange: false, exportable: true },
    { id: 'user-overview',       label: 'User Overview',       description: 'User counts and role distribution',                      category: 'administrative', supportsSearch: false, supportsDateRange: false, exportable: true },
    { id: 'college-performance', label: 'College Performance', description: 'Performance metrics across colleges and departments',    category: 'analytics',      supportsSearch: false, supportsDateRange: false, exportable: true },
    { id: 'department-performance', label: 'Department Performance', description: 'Department-level academic performance trends',        category: 'analytics',      supportsSearch: false, supportsDateRange: false, exportable: true },
    { id: 'course-analysis',     label: 'Course Analysis',     description: 'Course enrollment, completion and success rates',        category: 'academic',       supportsSearch: false, supportsDateRange: false, exportable: true },
    { id: 'lecturer-activity',   label: 'Lecturer Activity',   description: 'Lecturer engagement and assessment activity',            category: 'administrative', supportsSearch: false, supportsDateRange: false, exportable: true },
    { id: 'login-history',       label: 'Login History',       description: 'User authentication events and session tracking',        category: 'administrative', supportsSearch: true,  supportsDateRange: true,  exportable: true },
    { id: 'system-activity',     label: 'System Activity',     description: 'Server health, uptime and resource utilization',         category: 'analytics',      supportsSearch: false, supportsDateRange: true,  exportable: true },
    { id: 'security-incidents',  label: 'Security Incidents',  description: 'Detected threats and security anomaly reports',          category: 'compliance',     supportsSearch: true,  supportsDateRange: true,  exportable: true },
    { id: 'suspended-users',     label: 'Suspended Users',     description: 'Accounts under review or temporary suspension',          category: 'compliance',     supportsSearch: true,  supportsDateRange: false, exportable: true },
  ];

  const reports = $derived(data?.reports ?? fallbackReports);

  const filteredReports = $derived(
    reports.filter(r => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = !q ||
        r.label.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q);
      const matchesCategory = selectedCategory === 'all' || r.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
  );

  const activeCount = $derived(
    selectedCategory === 'all'
      ? reports.length
      : reports.filter(r => r.category === selectedCategory).length
  );

  function getReportIcon(id: string) {
    const iconMap: Record<string, typeof FileText> = {
      'overview': LayoutDashboard,
      'exam-performance': BarChart3,
      'grade-distribution': GraduationCap,
      'student-performance': Users,
      'audit-logs': ShieldCheck,
      'violations': Flag,
      'action-analysis': Activity,
      'user-overview': Users,
      'college-performance': TrendingUp,
      'department-performance': TrendingUp,
      'course-analysis': BookOpen,
      'lecturer-activity': Users,
      'login-history': Clock,
      'system-activity': Activity,
      'security-incidents': AlertTriangle,
      'suspended-users': Lock,
    };
    return iconMap[id] ?? FileText;
  }

  function getReportColor(id: string): string {
    const colorMap: Record<string, string> = {
      'overview': '#3b82f6',
      'exam-performance': '#16a34a',
      'grade-distribution': '#f59e0b',
      'student-performance': '#8b5cf6',
      'audit-logs': '#6366f1',
      'violations': '#ef4444',
      'action-analysis': '#14b8a6',
      'user-overview': '#3b82f6',
      'college-performance': '#0ea5e9',
      'department-performance': '#06b6d4',
      'course-analysis': '#22c55e',
      'lecturer-activity': '#a855f7',
      'login-history': '#64748b',
      'system-activity': '#f97316',
      'security-incidents': '#dc2626',
      'suspended-users': '#7c3aed',
    };
    return colorMap[id] ?? '#6b7280';
  }

  function getCategoryLabel(cat: string) {
    return categories[cat]?.label ?? cat;
  }

  function getCategoryColor(cat: string) {
    return categories[cat]?.color ?? '#6b7280';
  }
</script>

<svelte:head>
  <title>Reports — MOUAU eTest Admin</title>
</svelte:head>

<div class="reports-index">
  <!-- Header -->
  <header class="page-header">
    <div class="header-main">
      <div class="header-icon">
        <BarChart3 size={24} />
      </div>
      <div class="header-text">
        <h1>Reports</h1>
        <p class="description">Analytics, performance metrics & system insights</p>
      </div>
    </div>
    <div class="header-meta">
      <span class="meta-pill">
        <Sparkles size={12} />
        {filteredReports.length} of {reports.length} reports
      </span>
    </div>
  </header>

  <!-- Controls Row -->
  <div class="controls-row">
    <!-- Search -->
    <div class="search-bar">
      <div class="search-input-wrap">
        <Search size={16} />
        <input
          type="search"
          placeholder="Search reports..."
          bind:value={searchQuery}
        />
        {#if searchQuery}
          <button class="search-clear" onclick={() => searchQuery = ''} aria-label="Clear search">
            <X size={14} />
          </button>
        {/if}
      </div>
    </div>

    <!-- Category Tabs -->
    <div class="category-tabs">
      {#each Object.entries(categories) as [key, cat]}
        {@const Icon = cat.icon}
        {@const count = key === 'all' ? reports.length : reports.filter(r => r.category === key).length}
        <button
          class="cat-tab"
          class:active={selectedCategory === key}
          onclick={() => selectedCategory = key}
        >
          <Icon size={14} />
          <span>{cat.label}</span>
          <span class="cat-count" style="background: {selectedCategory === key ? 'rgba(255,255,255,0.25)' : cat.color + '15'}; color: {selectedCategory === key ? 'white' : cat.color}">
            {count}
          </span>
        </button>
      {/each}
    </div>
  </div>

  <!-- Active Filters Summary -->
  {#if searchQuery || selectedCategory !== 'all'}
    <div class="active-filters">
      <Filter size={14} />
      <span>Filtered by:</span>
      {#if selectedCategory !== 'all'}
        <span class="filter-chip">
          Category: {categories[selectedCategory].label}
          <button onclick={() => selectedCategory = 'all'}><X size={12} /></button>
        </span>
      {/if}
      {#if searchQuery}
        <span class="filter-chip">
          Search: "{searchQuery}"
          <button onclick={() => searchQuery = ''}><X size={12} /></button>
        </span>
      {/if}
      <button class="clear-all" onclick={() => { searchQuery = ''; selectedCategory = 'all'; }}>
        Clear all
      </button>
    </div>
  {/if}

  <!-- Reports Grid -->
  <div class="reports-grid" class:empty={filteredReports.length === 0}>
    {#each filteredReports as report (report.id)}
      {@const Icon = getReportIcon(report.id)}
      {@const color = getReportColor(report.id)}
      {@const catColor = getCategoryColor(report.category)}
      <a href="/admin/reports/{report.id}" class="report-card">
        <div class="card-accent" style="background: {color}"></div>
        <div class="card-body">
          <div class="card-icon" style="background: {color}12; color: {color}">
            <Icon size={22} />
          </div>
          <div class="card-content">
            <div class="card-header">
              <h3>{report.label}</h3>
              <ChevronRight size={16} class="arrow" />
            </div>
            <p class="card-desc">{report.description}</p>
            <div class="card-footer">
              <button
                type="button"
                class="cat-tag"
                style="background: {catColor}12; color: {catColor}; border-color: {catColor}25"
                onclick={(e) => { e.preventDefault(); e.stopPropagation(); selectedCategory = report.category; }}
              >
                {getCategoryLabel(report.category)}
              </button>
              <div class="card-badges">
                {#if report.supportsSearch}
                  <span class="badge" title="Supports search"><SearchCheck size={11} /> Search</span>
                {/if}
                {#if report.supportsDateRange}
                  <span class="badge" title="Supports date range"><Calendar size={11} /> Date</span>
                {/if}
                {#if report.exportable}
                  <span class="badge" title="Exportable"><Download size={11} /> Export</span>
                {/if}
              </div>
            </div>
          </div>
        </div>
      </a>
    {/each}
  </div>

  {#if filteredReports.length === 0}
    <div class="empty-state">
      <div class="empty-icon">
        <FileText size={48} />
      </div>
      <h3>No reports found</h3>
      <p>Try adjusting your search or category filter.</p>
      <button class="empty-action" onclick={() => { searchQuery = ''; selectedCategory = 'all'; }}>
        Clear filters
      </button>
    </div>
  {/if}
</div>

<style>
  .reports-index {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding: 1.5rem;
    max-width: 1200px;
    margin: 0 auto;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    min-height: 100vh;
  }

  /* ═══════════════════════════════════════════
     HEADER
     ═══════════════════════════════════════════ */
  .page-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    padding-bottom: 1.25rem;
    border-bottom: 1px solid var(--color-border, #e5e7eb);
  }

  .header-main {
    display: flex;
    align-items: center;
    gap: 0.875rem;
  }

  .header-icon {
    width: 48px;
    height: 48px;
    border-radius: 0.875rem;
    background: rgba(59, 130, 246, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #3b82f6;
    flex-shrink: 0;
  }

  .header-text { display: flex; flex-direction: column; gap: 0.15rem; }
  .header-text h1 { font-size: 1.5rem; font-weight: 800; letter-spacing: -0.02em; color: var(--color-text, #111827); margin: 0; }
  .description { font-size: 0.85rem; color: var(--color-muted, #6b7280); margin: 0; }

  .header-meta { display: flex; align-items: center; gap: 0.5rem; }

  .meta-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.35rem 0.75rem;
    background: rgba(59, 130, 246, 0.08);
    border: 1px solid rgba(59, 130, 246, 0.15);
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    color: #3b82f6;
  }

  /* ═══════════════════════════════════════════
     CONTROLS ROW
     ═══════════════════════════════════════════ */
  .controls-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  /* Search */
  .search-bar { display: flex; align-items: center; gap: 0.5rem; }

  .search-input-wrap {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 320px;
    padding: 0.5rem 0.75rem;
    background: var(--color-surface, white);
    border: 1.5px solid var(--color-border, #e5e7eb);
    border-radius: 0.625rem;
    transition: all 0.15s;
  }

  .search-input-wrap:focus-within {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .search-input-wrap input {
    flex: 1;
    border: none;
    background: none;
    outline: none;
    font-size: 0.85rem;
    color: var(--color-text, #111827);
  }

  .search-input-wrap input::placeholder { color: #9ca3af; }

  .search-clear {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    padding: 0;
    background: #e5e7eb;
    border: none;
    border-radius: 50%;
    color: #6b7280;
    cursor: pointer;
    transition: all 0.15s;
  }

  .search-clear:hover { background: #d1d5db; color: #374151; }

  /* Category Tabs */
  .category-tabs {
    display: flex;
    gap: 0.375rem;
    flex-wrap: wrap;
  }

  .cat-tab {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.45rem 0.75rem;
    border: 1.5px solid var(--color-border, #e5e7eb);
    border-radius: 0.5rem;
    background: var(--color-surface, white);
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-muted, #6b7280);
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }

  .cat-tab:hover {
    border-color: #3b82f6;
    color: #3b82f6;
    transform: translateY(-1px);
  }

  .cat-tab.active {
    background: #3b82f6;
    border-color: #3b82f6;
    color: white;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25);
  }

  .cat-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 0.3rem;
    border-radius: 999px;
    font-size: 0.65rem;
    font-weight: 700;
    transition: all 0.15s;
  }

  /* ═══════════════════════════════════════════
     ACTIVE FILTERS
     ═══════════════════════════════════════════ */
  .active-filters {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    padding: 0.625rem 0.875rem;
    background: rgba(59, 130, 246, 0.04);
    border: 1px dashed rgba(59, 130, 246, 0.2);
    border-radius: 0.5rem;
    font-size: 0.8rem;
    color: var(--color-muted, #6b7280);
    animation: slideDown 0.2s ease;
  }

  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-4px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .filter-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.2rem 0.5rem;
    background: white;
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text, #374151);
  }

  .filter-chip button {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.1rem;
    background: none;
    border: none;
    border-radius: 0.2rem;
    color: #9ca3af;
    cursor: pointer;
    transition: all 0.15s;
  }

  .filter-chip button:hover { background: #fee2e2; color: #ef4444; }

  .clear-all {
    margin-left: auto;
    padding: 0.25rem 0.625rem;
    background: none;
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: #ef4444;
    cursor: pointer;
    transition: all 0.15s;
  }

  .clear-all:hover { background: #fef2f2; border-color: #fecaca; }

  /* ═══════════════════════════════════════════
     REPORTS GRID
     ═══════════════════════════════════════════ */
  .reports-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1rem;
  }

  .reports-grid.empty { display: none; }

  .report-card {
    position: relative;
    display: flex;
    flex-direction: column;
    background: var(--color-surface, white);
    border: 1.5px solid var(--color-border, #e5e7eb);
    border-radius: 0.875rem;
    text-decoration: none;
    overflow: hidden;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .report-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
    border-color: var(--color-border-hover, #d1d5db);
  }

  .report-card:hover .arrow {
    transform: translateX(4px);
    color: #3b82f6;
  }

  .report-card:hover .card-accent {
    width: 4px;
  }

  .card-accent {
    position: absolute;
    top: 0;
    left: 0;
    width: 3px;
    height: 100%;
    transition: width 0.2s;
  }

  .card-body {
    display: flex;
    align-items: flex-start;
    gap: 0.875rem;
    padding: 1.125rem 1.125rem 1.125rem 1.375rem;
  }

  .card-icon {
    width: 42px;
    height: 42px;
    border-radius: 0.625rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: transform 0.2s;
  }

  .report-card:hover .card-icon {
    transform: scale(1.08);
  }

  .card-content { flex: 1; min-width: 0; }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.3rem;
  }

  .card-header h3 {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--color-text, #111827);
    margin: 0;
  }

  .arrow {
    color: var(--color-muted, #9ca3af);
    transition: all 0.2s;
    flex-shrink: 0;
  }

  .card-desc {
    font-size: 0.78rem;
    color: var(--color-muted, #6b7280);
    line-height: 1.45;
    margin: 0 0 0.625rem;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .cat-tag {
    display: inline-flex;
    align-items: center;
    padding: 0.2rem 0.55rem;
    border: 1px solid transparent;
    border-radius: 0.35rem;
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    cursor: pointer;
    transition: all 0.15s;
  }

  .cat-tag:hover {
    filter: brightness(0.9);
    transform: translateY(-1px);
  }

  .card-badges {
    display: flex;
    gap: 0.35rem;
    flex-wrap: wrap;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    padding: 0.2rem 0.45rem;
    background: var(--color-bg, #f3f4f6);
    border-radius: 0.3rem;
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--color-muted, #6b7280);
  }

  /* ═══════════════════════════════════════════
     EMPTY STATE
     ═══════════════════════════════════════════ */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.875rem;
    padding: 4rem 2rem;
    text-align: center;
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .empty-icon {
    width: 80px;
    height: 80px;
    border-radius: 1.25rem;
    background: rgba(59, 130, 246, 0.06);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #3b82f6;
  }

  .empty-state h3 { font-size: 1.125rem; font-weight: 700; color: var(--color-text, #374151); margin: 0; }
  .empty-state p { font-size: 0.875rem; color: var(--color-muted, #9ca3af); margin: 0; }

  .empty-action {
    margin-top: 0.5rem;
    padding: 0.55rem 1.25rem;
    background: #3b82f6;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.8rem;
    font-weight: 700;
    color: white;
    cursor: pointer;
    transition: all 0.15s;
  }

  .empty-action:hover { background: #2563eb; transform: translateY(-1px); }

  /* ═══════════════════════════════════════════
     RESPONSIVE
     ═══════════════════════════════════════════ */
  @media (max-width: 768px) {
    .reports-index { padding: 1rem; gap: 1rem; }
    .page-header { flex-direction: column; align-items: flex-start; }
    .controls-row { flex-direction: column; align-items: stretch; }
    .search-input-wrap { width: 100%; }
    .category-tabs { width: 100%; overflow-x: auto; flex-wrap: nowrap; padding-bottom: 0.25rem; }
    .reports-grid { grid-template-columns: 1fr; }
    .header-text h1 { font-size: 1.25rem; }
    .card-footer { flex-direction: column; align-items: flex-start; }
  }
</style>