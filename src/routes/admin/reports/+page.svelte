<!-- src/routes/admin/reports/+page.svelte -->
<script lang="ts">
  import {
    FileText, Search, BarChart3, ShieldCheck, Users, BookOpen,
    GraduationCap, AlertTriangle, TrendingUp, Clock, ChevronRight,
    LayoutDashboard, Flag, Lock, Activity
  } from '@lucide/svelte';

  // These would come from your load function in +page.server.ts
  // For now, using the registry data structure
  interface ReportMeta {
    id: string;
    label: string;
    description: string;
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
    all:          { label: 'All Reports', icon: LayoutDashboard, color: '#3b82f6' },
    academic:     { label: 'Academic', icon: BookOpen, color: '#16a34a' },
    administrative:{ label: 'Administrative', icon: ShieldCheck, color: '#6366f1' },
    analytics:    { label: 'Analytics', icon: BarChart3, color: '#f59e0b' },
    compliance:   { label: 'Compliance', icon: Lock, color: '#ef4444' },
  };

  // Fallback reports data if none provided from server
  const fallbackReports: ReportMeta[] = [
    { id: 'overview', label: 'Overview', description: 'System-wide stats and recent activity', supportsSearch: false, supportsDateRange: false, exportable: false },
    { id: 'exam-performance', label: 'Exam Performance', description: 'Per-exam scores, pass rates and sessions', supportsSearch: false, supportsDateRange: false, exportable: true },
    { id: 'grade-distribution', label: 'Grade Distribution', description: 'Breakdown of student scores across grade bands', supportsSearch: false, supportsDateRange: false, exportable: true },
    { id: 'student-performance', label: 'Student Performance', description: 'Per-student exam results and averages', supportsSearch: false, supportsDateRange: false, exportable: true },
    { id: 'audit-logs', label: 'Audit Logs', description: 'System activity log with user tracking', supportsSearch: true, supportsDateRange: true, exportable: true },
    { id: 'violations', label: 'Violations', description: 'All recorded exam violations', supportsSearch: true, supportsDateRange: false, exportable: true },
    { id: 'action-analysis', label: 'Action Analysis', description: 'Actions taken in response to violations', supportsSearch: false, supportsDateRange: false, exportable: true },
    { id: 'user-overview', label: 'User Overview', description: 'User counts and role distribution', supportsSearch: false, supportsDateRange: false, exportable: true },
  ];

  const reports = $derived(data?.reports ?? fallbackReports);

  const filteredReports = $derived(
    reports.filter(r => {
      const matchesSearch = !searchQuery ||
        r.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || true; // Add category field to meta if needed
      return matchesSearch && matchesCategory;
    })
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
    };
    return colorMap[id] ?? '#6b7280';
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
  </header>

  <!-- Search -->
  <div class="search-bar">
    <div class="search-input-wrap">
      <Search size={16} />
      <input
        type="search"
        placeholder="Search reports..."
        bind:value={searchQuery}
      />
    </div>
    {#if searchQuery}
      <button class="clear-btn" onclick={() => searchQuery = ''}>
        Clear
      </button>
    {/if}
  </div>

  <!-- Category Tabs -->
  <div class="category-tabs">
    {#each Object.entries(categories) as [key, cat]}
      {@const Icon = cat.icon}
      <button
        class="cat-tab"
        class:active={selectedCategory === key}
        onclick={() => selectedCategory = key}
      >
        <Icon size={14} />
        <span>{cat.label}</span>
      </button>
    {/each}
  </div>

  <!-- Reports Grid -->
  <div class="reports-grid">
    {#each filteredReports as report}
      {@const Icon = getReportIcon(report.id)}
      {@const color = getReportColor(report.id)}
      <a href="/admin/reports/{report.id}" class="report-card">
        <div class="card-icon" style="background: {color}15; color: {color}">
          <Icon size={22} />
        </div>
        <div class="card-content">
          <div class="card-header">
            <h3>{report.label}</h3>
            <ChevronRight size={16} class="arrow" />
          </div>
          <p class="card-desc">{report.description}</p>
          <div class="card-badges">
            {#if report.supportsSearch}
              <span class="badge">Search</span>
            {/if}
            {#if report.supportsDateRange}
              <span class="badge">Date Range</span>
            {/if}
            {#if report.exportable}
              <span class="badge">Export</span>
            {/if}
          </div>
        </div>
      </a>
    {/each}
  </div>

  {#if filteredReports.length === 0}
    <div class="empty-state">
      <FileText size={40} />
      <h3>No reports found</h3>
      <p>Try adjusting your search query.</p>
    </div>
  {/if}
</div>

<style>
  .reports-index {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 1.5rem;
    max-width: 1200px;
    margin: 0 auto;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    min-height: 100vh;
  }

  /* Header */
  .page-header {
    padding-bottom: 1rem;
    border-bottom: 1.5px solid var(--color-border, #e5e7eb);
  }

  .header-main {
    display: flex;
    align-items: center;
    gap: 0.875rem;
  }

  .header-icon {
    width: 48px;
    height: 48px;
    border-radius: 1rem;
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

  /* Search */
  .search-bar {
    display: flex;
    align-items: center;
    gap: 0.625rem;
  }

  .search-input-wrap {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    max-width: 400px;
    padding: 0.55rem 0.875rem;
    background: var(--color-surface, white);
    border: 1.5px solid var(--color-border, #e5e7eb);
    border-radius: 0.625rem;
    transition: border-color 0.15s;
  }

  .search-input-wrap:focus-within { border-color: #3b82f6; }

  .search-input-wrap input {
    flex: 1;
    border: none;
    background: none;
    outline: none;
    font-size: 0.85rem;
    color: var(--color-text, #111827);
  }

  .clear-btn {
    padding: 0.55rem 1rem;
    background: none;
    border: 1.5px solid var(--color-border, #e5e7eb);
    border-radius: 0.625rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-muted, #6b7280);
    cursor: pointer;
    transition: all 0.15s;
  }

  .clear-btn:hover { border-color: #ef4444; color: #ef4444; }

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
    padding: 0.5rem 0.875rem;
    border: 1.5px solid var(--color-border, #e5e7eb);
    border-radius: 0.5rem;
    background: var(--color-surface, white);
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-muted, #6b7280);
    cursor: pointer;
    transition: all 0.15s;
  }

  .cat-tab:hover { border-color: #3b82f6; color: #3b82f6; }
  .cat-tab.active { background: #3b82f6; border-color: #3b82f6; color: white; }

  /* Reports Grid */
  .reports-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
  }

  .report-card {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    padding: 1.125rem;
    background: var(--color-surface, white);
    border: 1.5px solid var(--color-border, #e5e7eb);
    border-radius: 1rem;
    text-decoration: none;
    transition: all 0.2s ease;
  }

  .report-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    border-color: var(--color-border-hover, #d1d5db);
  }

  .report-card:hover .arrow {
    transform: translateX(3px);
    color: #3b82f6;
  }

  .card-icon {
    width: 44px;
    height: 44px;
    border-radius: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .card-content { flex: 1; min-width: 0; }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.35rem;
  }

  .card-header h3 {
    font-size: 0.95rem;
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
    font-size: 0.8rem;
    color: var(--color-muted, #6b7280);
    line-height: 1.4;
    margin: 0 0 0.625rem;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .card-badges {
    display: flex;
    gap: 0.375rem;
    flex-wrap: wrap;
  }

  .badge {
    display: inline-block;
    padding: 0.15rem 0.5rem;
    background: var(--color-bg, #f3f4f6);
    border-radius: 0.25rem;
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-muted, #6b7280);
  }

  /* Empty State */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 4rem 2rem;
    text-align: center;
    color: var(--color-muted, #9ca3af);
  }

  .empty-state h3 { font-size: 1.125rem; font-weight: 700; color: var(--color-text, #374151); margin: 0; }
  .empty-state p { font-size: 0.875rem; margin: 0; }

  /* Responsive */
  @media (max-width: 640px) {
    .reports-index { padding: 1rem; }
    .reports-grid { grid-template-columns: 1fr; }
    .header-text h1 { font-size: 1.25rem; }
  }
</style>
