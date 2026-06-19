<!-- src/routes/admin/reports/+page.svelte -->
<script lang="ts">
  import {
    FileText, Search, BarChart3, ShieldCheck, Users, BookOpen,
    GraduationCap, AlertTriangle, TrendingUp, Clock, ChevronRight,
    LayoutDashboard, Flag, Lock, Activity
  } from '@lucide/svelte';

  interface ReportMeta {
    id: string;
    label: string;
    description: string;
    category: string;           // Added for proper filtering
    supportsSearch: boolean;
    supportsDateRange: boolean;
    exportable: boolean;
  }

  let { data } = $props<{ data: { reports: ReportMeta[] } }>();

  let searchQuery = $state('');
  let selectedCategory = $state('all');

  // Category mapping with icons
  const categories: Record<string, { label: string; icon: typeof FileText; color: string }> = {
    all: { label: 'All Reports', icon: LayoutDashboard, color: '#3b82f6' },
    academic: { label: 'Academic', icon: BookOpen, color: '#16a34a' },
    administrative: { label: 'Administrative', icon: ShieldCheck, color: '#6366f1' },
    analytics: { label: 'Analytics', icon: BarChart3, color: '#f59e0b' },
    compliance: { label: 'Compliance', icon: Lock, color: '#ef4444' },
  };

  // Fallback reports with proper category assignment
  const fallbackReports: ReportMeta[] = [
    { 
      id: 'overview', 
      label: 'Overview', 
      description: 'System-wide stats and recent activity',
      category: 'analytics',
      supportsSearch: false, 
      supportsDateRange: false, 
      exportable: false 
    },
    { 
      id: 'exam-performance', 
      label: 'Exam Performance', 
      description: 'Per-exam scores, pass rates and sessions',
      category: 'academic',
      supportsSearch: false, 
      supportsDateRange: false, 
      exportable: true 
    },
    { 
      id: 'grade-distribution', 
      label: 'Grade Distribution', 
      description: 'Breakdown of student scores across grade bands',
      category: 'academic',
      supportsSearch: false, 
      supportsDateRange: false, 
      exportable: true 
    },
    { 
      id: 'student-performance', 
      label: 'Student Performance', 
      description: 'Per-student exam results and averages',
      category: 'academic',
      supportsSearch: false, 
      supportsDateRange: false, 
      exportable: true 
    },
    { 
      id: 'audit-logs', 
      label: 'Audit Logs', 
      description: 'System activity log with user tracking',
      category: 'compliance',
      supportsSearch: true, 
      supportsDateRange: true, 
      exportable: true 
    },
    { 
      id: 'violations', 
      label: 'Violations', 
      description: 'All recorded exam violations',
      category: 'compliance',
      supportsSearch: true, 
      supportsDateRange: false, 
      exportable: true 
    },
    { 
      id: 'action-analysis', 
      label: 'Action Analysis', 
      description: 'Actions taken in response to violations',
      category: 'compliance',
      supportsSearch: false, 
      supportsDateRange: false, 
      exportable: true 
    },
    { 
      id: 'user-overview', 
      label: 'User Overview', 
      description: 'User counts and role distribution',
      category: 'administrative',
      supportsSearch: false, 
      supportsDateRange: false, 
      exportable: true 
    },
  ];

  const reports = $derived(data?.reports ?? fallbackReports);

  // Fixed sorter/filtering logic
  const filteredReports = $derived(
    reports.filter(r => {
      const matchesSearch = !searchQuery ||
        r.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || r.category === selectedCategory;
      
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
        <BarChart3 size={28} />
      </div>
      <div class="header-text">
        <h1>Reports</h1>
        <p class="description">Comprehensive analytics, performance metrics, and system insights for MOUAU eTest</p>
      </div>
    </div>
  </header>

  <!-- Controls -->
  <div class="controls">
    <!-- Search -->
    <div class="search-bar">
      <div class="search-input-wrap">
        <Search size={18} />
        <input
          type="search"
          placeholder="Search reports by name or description..."
          bind:value={searchQuery}
        />
      </div>
      {#if searchQuery}
        <button class="clear-btn" onclick={() => searchQuery = ''}>Clear</button>
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
          <Icon size={16} />
          <span>{cat.label}</span>
        </button>
      {/each}
    </div>
  </div>

  <!-- Results Info -->
  <div class="results-info">
    <p>
      Showing <strong>{filteredReports.length}</strong> 
      {#if selectedCategory !== 'all'} {categories[selectedCategory].label} {/if}
      report{filteredReports.length === 1 ? '' : 's'}
    </p>
  </div>

  <!-- Reports Grid -->
  <div class="reports-grid">
    {#each filteredReports as report}
      {@const Icon = getReportIcon(report.id)}
      {@const color = getReportColor(report.id)}
      <a href="/admin/reports/{report.id}" class="report-card">
        <div class="card-icon" style="background: {color}10; color: {color}">
          <Icon size={28} />
        </div>
        <div class="card-content">
          <div class="card-header">
            <h3>{report.label}</h3>
            <ChevronRight size={18} class="arrow" />
          </div>
          <p class="card-desc">{report.description}</p>
          
          <div class="card-badges">
            {#if report.supportsSearch}
              <span class="badge search">Search</span>
            {/if}
            {#if report.supportsDateRange}
              <span class="badge date">Date Range</span>
            {/if}
            {#if report.exportable}
              <span class="badge export">Export</span>
            {/if}
          </div>
        </div>
      </a>
    {/each}
  </div>

  {#if filteredReports.length === 0}
    <div class="empty-state">
      <FileText size={48} />
      <h3>No matching reports</h3>
      <p>Try adjusting your search term or filter selection.</p>
    </div>
  {/if}
</div>

<style>
  .reports-index {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    padding: 2rem;
    max-width: 1280px;
    margin: 0 auto;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    min-height: 100vh;
  }

  /* Header */
  .page-header {
    padding-bottom: 1.25rem;
    border-bottom: 2px solid var(--color-border, #e5e7eb);
  }

  .header-main {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .header-icon {
    width: 56px;
    height: 56px;
    border-radius: 1rem;
    background: rgba(59, 130, 246, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #3b82f6;
    flex-shrink: 0;
  }

  .header-text h1 {
    font-size: 1.75rem;
    font-weight: 800;
    letter-spacing: -0.025em;
    color: var(--color-text, #111827);
    margin: 0;
  }

  .description {
    font-size: 0.95rem;
    color: var(--color-muted, #6b7280);
    margin: 0;
  }

  /* Controls */
  .controls {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .search-bar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .search-input-wrap {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
    max-width: 480px;
    padding: 0.75rem 1rem;
    background: var(--color-surface, white);
    border: 1.5px solid var(--color-border, #e5e7eb);
    border-radius: 0.75rem;
    transition: all 0.2s ease;
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
    font-size: 0.95rem;
    color: var(--color-text, #111827);
  }

  .clear-btn {
    padding: 0.75rem 1.25rem;
    background: none;
    border: 1.5px solid var(--color-border, #e5e7eb);
    border-radius: 0.75rem;
    font-weight: 600;
    color: var(--color-muted, #6b7280);
    cursor: pointer;
    transition: all 0.2s;
  }

  .clear-btn:hover {
    border-color: #ef4444;
    color: #ef4444;
  }

  /* Category Tabs */
  .category-tabs {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .cat-tab {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.65rem 1.125rem;
    border: 1.5px solid var(--color-border, #e5e7eb);
    border-radius: 0.75rem;
    background: var(--color-surface, white);
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-muted, #6b7280);
    cursor: pointer;
    transition: all 0.2s ease;
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
  }

  /* Results Info */
  .results-info {
    font-size: 0.875rem;
    color: var(--color-muted, #6b7280);
  }

  /* Reports Grid */
  .reports-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 1.25rem;
  }

  .report-card {
    display: flex;
    align-items: flex-start;
    gap: 1.25rem;
    padding: 1.5rem;
    background: var(--color-surface, white);
    border: 1.5px solid var(--color-border, #e5e7eb);
    border-radius: 1.25rem;
    text-decoration: none;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .report-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
    border-color: #d1d5db;
  }

  .report-card:hover .arrow {
    transform: translateX(5px);
    color: #3b82f6;
  }

  .card-icon {
    width: 52px;
    height: 52px;
    border-radius: 1rem;
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
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .card-header h3 {
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--color-text, #111827);
    margin: 0;
    line-height: 1.3;
  }

  .arrow {
    color: var(--color-muted, #9ca3af);
    transition: all 0.2s ease;
    flex-shrink: 0;
  }

  .card-desc {
    font-size: 0.875rem;
    color: var(--color-muted, #6b7280);
    line-height: 1.45;
    margin-bottom: 1rem;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .card-badges {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .badge {
    padding: 0.2rem 0.65rem;
    border-radius: 9999px;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .badge.search { background: #dbeafe; color: #1e40af; }
  .badge.date { background: #fef3c7; color: #92400e; }
  .badge.export { background: #d1fae5; color: #065f46; }

  /* Empty State */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 5rem 2rem;
    text-align: center;
    color: var(--color-muted, #9ca3af);
  }

  .empty-state h3 {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-text, #374151);
    margin: 0;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .reports-index { padding: 1.25rem; }
    .reports-grid { grid-template-columns: 1fr; }
    .header-text h1 { font-size: 1.5rem; }
    .controls { gap: 1rem; }
  }
</style>