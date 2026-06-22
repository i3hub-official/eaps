<!-- src/routes/lecturer/results/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import Chart from 'chart.js/auto';
  import {
    BarChart2, Users, CheckCircle, XCircle, TrendingUp,
    Search, Filter, Download, Grid3X3, List, ChevronDown,
    BookOpen, Clock, Award, AlertTriangle, FileText,
    GraduationCap, Building2, Layers, ArrowUpDown,
    ChevronRight, ChevronLeft, X, PieChart, Activity
  } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();

  // ── View & sort state ─────────────────────────────────────────
  let viewMode   = $state<'grid' | 'list'>('list');
  let sortField  = $state<'name' | 'score' | 'grade' | 'date' | 'course'>('date');
  let sortDir    = $state<'asc' | 'desc'>('desc');
  let groupBy    = $state<'none' | 'exam' | 'college' | 'department'>('none');
  let showFilters = $state(false);
  let activeChartTab = $state<'overview' | 'college' | 'department' | 'exam'>('overview');

  // ── Chart instances ──────────────────────────────────────────
  let chartInstances: Record<string, Chart | null> = {
    overview: null,
    college: null,
    department: null,
    exam: null
  };
  let chartContainers: Record<string, HTMLCanvasElement | null> = {
    overview: null,
    college: null,
    department: null,
    exam: null
  };

  // ── Filters (local, applied via URL) ─────────────────────────
  let localSearch   = $state(data.filters.search);
  let searchTimer: ReturnType<typeof setTimeout>;

  function pushFilter(key: string, value: string) {
    const p = new URLSearchParams($page.url.searchParams);
    if (value === 'all' || value === '') p.delete(key);
    else p.set(key, value);
    goto(`?${p.toString()}`, { replaceState: true, keepFocus: true });
  }

  function onSearchInput(e: Event) {
    localSearch = (e.target as HTMLInputElement).value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => pushFilter('q', localSearch), 380);
  }

  function clearAllFilters() {
    localSearch = '';
    goto('/lecturer/results', { replaceState: true });
  }

  const hasActiveFilters = $derived(
    data.filters.filterSemester !== 'all' ||
    data.filters.filterCourse   !== 'all' ||
    data.filters.filterCollege  !== 'all' ||
    data.filters.filterDept     !== 'all' ||
    data.filters.filterGrade    !== 'all' ||
    data.filters.search         !== ''
  );

  // ── Derived analytics data ──────────────────────────────────
  const collegePerformance = $derived(() => {
    const map = new Map();
    for (const r of data.results) {
      const id = r.student.college?.id?.toString() ?? 'none';
      if (!map.has(id)) {
        map.set(id, {
          name: r.student.college?.name ?? 'No College',
          abbr: r.student.college?.abbreviation ?? 'NC',
          total: 0,
          passed: 0,
          sumScore: 0,
          results: []
        });
      }
      const entry = map.get(id);
      entry.total++;
      if (r.passed) entry.passed++;
      entry.sumScore += (r.percentage ?? 0);
      entry.results.push(r);
    }
    return Array.from(map.values()).map(c => ({
      ...c,
      avgScore: c.total > 0 ? c.sumScore / c.total : 0,
      passRate: c.total > 0 ? (c.passed / c.total) * 100 : 0
    }));
  });

  const departmentPerformance = $derived(() => {
    const map = new Map();
    for (const r of data.results) {
      const id = r.student.department?.id ?? 'none';
      if (!map.has(id)) {
        map.set(id, {
          name: r.student.department?.name ?? 'No Department',
          college: r.student.college?.name ?? '',
          total: 0,
          passed: 0,
          sumScore: 0,
          results: []
        });
      }
      const entry = map.get(id);
      entry.total++;
      if (r.passed) entry.passed++;
      entry.sumScore += (r.percentage ?? 0);
      entry.results.push(r);
    }
    return Array.from(map.values()).map(d => ({
      ...d,
      avgScore: d.total > 0 ? d.sumScore / d.total : 0,
      passRate: d.total > 0 ? (d.passed / d.total) * 100 : 0
    }));
  });

  const examPerformance = $derived(() => {
    const map = new Map();
    for (const r of data.results) {
      const id = r.exam.id;
      if (!map.has(id)) {
        map.set(id, {
          id: r.exam.id,
          title: r.exam.title,
          courseCode: r.exam.course.code,
          courseTitle: r.exam.course.title,
          session: r.exam.session,
          semester: r.exam.semester,
          total: 0,
          passed: 0,
          sumScore: 0,
          results: []
        });
      }
      const entry = map.get(id);
      entry.total++;
      if (r.passed) entry.passed++;
      entry.sumScore += (r.percentage ?? 0);
      entry.results.push(r);
    }
    return Array.from(map.values()).map(e => ({
      ...e,
      avgScore: e.total > 0 ? e.sumScore / e.total : 0,
      passRate: e.total > 0 ? (e.passed / e.total) * 100 : 0
    }));
  });

  // ── Chart color palette ─────────────────────────────────────
  const COLORS = [
    '#4f46e5', '#7c3aed', '#2563eb', '#0891b2', 
    '#059669', '#16a34a', '#ca8a04', '#d97706',
    '#dc2626', '#db2777', '#6b7280', '#8b5cf6'
  ];

  function getColor(index: number, opacity = 1) {
    return COLORS[index % COLORS.length];
  }

  // ── Chart creation ──────────────────────────────────────────
  function createOverviewChart() {
    const ctx = chartContainers.overview?.getContext('2d');
    if (!ctx) return;

    if (chartInstances.overview) {
      chartInstances.overview.destroy();
    }

    const gradeData = data.gradeDistribution;
    const labels = gradeData.map(g => g.grade);
    const values = gradeData.map(g => g.count);

    chartInstances.overview = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: ['#16a34a', '#2563eb', '#7c3aed', '#d97706', '#ea580c', '#dc2626'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 16,
              usePointStyle: true,
              pointStyle: 'circle',
              font: { size: 11 }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((context.parsed / total) * 100).toFixed(1);
                return `${context.label}: ${context.parsed} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }

  function createCollegeChart() {
    const ctx = chartContainers.college?.getContext('2d');
    if (!ctx) return;

    if (chartInstances.college) {
      chartInstances.college.destroy();
    }

    const data = collegePerformance();
    const sorted = [...data].sort((a, b) => b.avgScore - a.avgScore);
    const labels = sorted.map(c => c.abbr);
    const avgScores = sorted.map(c => Math.round(c.avgScore * 10) / 10);
    const passRates = sorted.map(c => Math.round(c.passRate * 10) / 10);

    chartInstances.college = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Average Score (%)',
            data: avgScores,
            backgroundColor: 'rgba(79, 70, 229, 0.7)',
            borderColor: '#4f46e5',
            borderWidth: 2,
            borderRadius: 4
          },
          {
            label: 'Pass Rate (%)',
            data: passRates,
            backgroundColor: 'rgba(22, 163, 74, 0.7)',
            borderColor: '#16a34a',
            borderWidth: 2,
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              padding: 12,
              usePointStyle: true,
              pointStyle: 'circle',
              font: { size: 11 }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.dataset.label}: ${context.parsed.y}%`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: function(value) { return value + '%'; }
            }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
  }

  function createDepartmentChart() {
    const ctx = chartContainers.department?.getContext('2d');
    if (!ctx) return;

    if (chartInstances.department) {
      chartInstances.department.destroy();
    }

    const data = departmentPerformance();
    // Show top 10 departments by average score
    const sorted = [...data].sort((a, b) => b.avgScore - a.avgScore).slice(0, 10);
    const labels = sorted.map(d => d.name.length > 20 ? d.name.substring(0, 20) + '...' : d.name);
    const avgScores = sorted.map(d => Math.round(d.avgScore * 10) / 10);
    const passRates = sorted.map(d => Math.round(d.passRate * 10) / 10);

    chartInstances.department = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Average Score (%)',
            data: avgScores,
            backgroundColor: 'rgba(124, 58, 237, 0.7)',
            borderColor: '#7c3aed',
            borderWidth: 2,
            borderRadius: 4
          },
          {
            label: 'Pass Rate (%)',
            data: passRates,
            backgroundColor: 'rgba(22, 163, 74, 0.7)',
            borderColor: '#16a34a',
            borderWidth: 2,
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: {
            position: 'top',
            labels: {
              padding: 12,
              usePointStyle: true,
              pointStyle: 'circle',
              font: { size: 11 }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.dataset.label}: ${context.parsed.x}%`;
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: function(value) { return value + '%'; }
            }
          },
          y: {
            grid: { display: false }
          }
        }
      }
    });
  }

  function createExamChart() {
    const ctx = chartContainers.exam?.getContext('2d');
    if (!ctx) return;

    if (chartInstances.exam) {
      chartInstances.exam.destroy();
    }

    const data = examPerformance();
    const sorted = [...data].sort((a, b) => b.avgScore - a.avgScore).slice(0, 8);
    const labels = sorted.map(e => e.courseCode);
    const avgScores = sorted.map(e => Math.round(e.avgScore * 10) / 10);
    const passRates = sorted.map(e => Math.round(e.passRate * 10) / 10);
    const totals = sorted.map(e => e.total);

    chartInstances.exam = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Average Score (%)',
            data: avgScores,
            backgroundColor: 'rgba(37, 99, 235, 0.7)',
            borderColor: '#2563eb',
            borderWidth: 2,
            borderRadius: 4,
            order: 1
          },
          {
            label: 'Pass Rate (%)',
            data: passRates,
            backgroundColor: 'rgba(22, 163, 74, 0.7)',
            borderColor: '#16a34a',
            borderWidth: 2,
            borderRadius: 4,
            order: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              padding: 12,
              usePointStyle: true,
              pointStyle: 'circle',
              font: { size: 11 }
            }
          },
          tooltip: {
            callbacks: {
              afterBody: function(context) {
                const idx = context[0].dataIndex;
                return `Students: ${totals[idx]}`;
              },
              label: function(context) {
                return `${context.dataset.label}: ${context.parsed.y}%`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: function(value) { return value + '%'; }
            }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
  }

  // ── Initialize charts on mount and when data changes ──────
  onMount(() => {
    // Wait for DOM to render
    setTimeout(() => {
      if (chartContainers.overview) createOverviewChart();
      if (chartContainers.college) createCollegeChart();
      if (chartContainers.department) createDepartmentChart();
      if (chartContainers.exam) createExamChart();
    }, 100);
  });

  // ── Recreate charts when tab changes ──────────────────────
  $effect(() => {
    const tab = activeChartTab;
    setTimeout(() => {
      if (tab === 'overview' && chartContainers.overview) createOverviewChart();
      else if (tab === 'college' && chartContainers.college) createCollegeChart();
      else if (tab === 'department' && chartContainers.department) createDepartmentChart();
      else if (tab === 'exam' && chartContainers.exam) createExamChart();
    }, 50);
  });

  // ── Sorted results ────────────────────────────────────────────
  const sorted = $derived((() => {
    const r = [...data.results];
    r.sort((a, b) => {
      let v = 0;
      if (sortField === 'name')   v = a.student.fullName.localeCompare(b.student.fullName);
      if (sortField === 'score')  v = (a.percentage ?? 0) - (b.percentage ?? 0);
      if (sortField === 'grade')  v = (a.grade ?? '').localeCompare(b.grade ?? '');
      if (sortField === 'date')   v = new Date(a.submittedAt ?? 0).getTime() - new Date(b.submittedAt ?? 0).getTime();
      if (sortField === 'course') v = (a.exam?.course?.code ?? '').localeCompare(b.exam?.course?.code ?? '');
      return sortDir === 'asc' ? v : -v;
    });
    return r;
  })());

  // ── Grouped results ───────────────────────────────────────────
  const grouped = $derived((() => {
    if (groupBy === 'none') return [{ key: 'all', label: '', items: sorted }];

    const map = new Map<string, { key: string; label: string; items: typeof sorted }>();
    for (const r of sorted) {
      let key = '';
      let label = '';
      if (groupBy === 'exam') {
        key   = r.exam.id;
        label = `${r.exam.course.code} — ${r.exam.title} (${r.exam.session}, Sem ${r.exam.semester})`;
      } else if (groupBy === 'college') {
        key   = r.student.college?.id?.toString() ?? '__none__';
        label = r.student.college?.name ?? 'No College';
      } else if (groupBy === 'department') {
        key   = r.student.department?.id ?? '__none__';
        label = r.student.department?.name ?? 'No Department';
      }
      if (!map.has(key)) map.set(key, { key, label, items: [] });
      map.get(key)!.items.push(r);
    }
    return Array.from(map.values());
  })());

  // ── Pagination ────────────────────────────────────────────────
  let currentPage = $state(1);
  const pageSize  = 25;

  $effect(() => { void sorted; currentPage = 1; });

  const pagedSorted = $derived(
    groupBy === 'none'
      ? sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)
      : sorted
  );
  const totalPages = $derived(Math.max(1, Math.ceil(sorted.length / pageSize)));

  // ── Sort toggle ───────────────────────────────────────────────
  function toggleSort(field: typeof sortField) {
    if (sortField === field) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    else { sortField = field; sortDir = 'desc'; }
  }

  // ── Helpers ───────────────────────────────────────────────────
  function pct(n: number) { return `${n.toFixed(1)}%`; }

  function fmtDate(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function fmtTime(secs: number | null) {
    if (!secs) return '—';
    const m = Math.floor(secs / 60), s = secs % 60;
    return `${m}m ${s}s`;
  }

  function initials(name: string) {
    return name.trim().split(/\s+/).filter(Boolean)
      .reduce((a, w, i, arr) => (i === 0 || i === arr.length - 1) ? a + w[0] : a, '')
      .toUpperCase().slice(0, 2);
  }

  const GRADE_META: Record<string, { color: string; bg: string; label: string }> = {
    'A':  { color: '#16a34a', bg: 'rgba(22,163,74,0.1)',   label: 'Excellent' },
    'B':  { color: '#2563eb', bg: 'rgba(37,99,235,0.08)',  label: 'Good' },
    'C':  { color: '#7c3aed', bg: 'rgba(124,58,237,0.08)', label: 'Average' },
    'D':  { color: '#d97706', bg: 'rgba(217,119,6,0.08)',  label: 'Below Avg' },
    'E':  { color: '#ea580c', bg: 'rgba(234,88,12,0.08)',  label: 'Poor' },
    'F':  { color: '#dc2626', bg: 'rgba(220,38,38,0.1)',   label: 'Fail' },
    'N/A':{ color: '#64748b', bg: 'rgba(100,116,139,0.1)', label: 'N/A' },
  };
  function gradeMeta(g: string | null) { return GRADE_META[g ?? 'N/A'] ?? GRADE_META['N/A']; }

  const GRADE_OPTIONS = ['A', 'B', 'C', 'D', 'E', 'F'];

  function groupStats(items: typeof sorted) {
    const gPass = items.filter(r => r.passed).length;
    const gAvg  = items.length
      ? items.reduce((s, r) => s + (r.percentage ?? 0), 0) / items.length
      : 0;
    return { gPass, gAvg, gFail: items.length - gPass };
  }

  // ── CSV Export ────────────────────────────────────────────────
  function exportCSV() {
    const rows = [
      ['Student', 'Matric No.', 'College', 'Department', 'Level', 'Course', 'Exam', 'Session', 'Sem', 'Score', '%', 'Grade', 'Passed', 'Correct', 'Violations', 'Time Taken', 'Submitted'],
      ...sorted.map(r => [
        r.student.fullName,
        r.student.matricNumber ?? '',
        r.student.college?.name ?? '',
        r.student.department?.name ?? '',
        r.student.level?.level ?? '',
        r.exam.course.code,
        r.exam.title,
        r.exam.session,
        r.exam.semester,
        r.score,
        r.percentage,
        r.grade ?? '',
        r.passed ? 'Yes' : 'No',
        r.correct ?? '',
        r.violationCount,
        fmtTime(r.timeTakenSecs),
        fmtDate(r.submittedAt),
      ])
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `results-${Date.now()}.csv`; a.click();
  }
</script>

<svelte:head><title>Results — MOUAU eTest Lecturer</title></svelte:head>

<div class="lc-page results-page">

  <!-- ── Page header ────────────────────────────────────────── -->
  <div class="lc-head">
    <div>
      <h1>Student Results</h1>
      <p>All submissions across your exams · {data.summary.total} total records</p>
    </div>
    <div class="lc-actions">
      <button class="lc-btn" onclick={() => showFilters = !showFilters} type="button">
        <Filter size={14} />
        Filters
        {#if hasActiveFilters}<span class="filter-dot"></span>{/if}
      </button>
      <button class="lc-btn" onclick={exportCSV} type="button" disabled={!data.results.length}>
        <Download size={14} /> Export CSV
      </button>
    </div>
  </div>

  <!-- ── Summary stat cards ──────────────────────────────────── -->
  <div class="lc-stats stats-5">
    <div class="lc-stat">
      <span class="lc-stat-label">Total Submissions</span>
      <span class="lc-stat-value">{data.summary.total}</span>
      <span class="lc-stat-sub">across {data.exams.length} exam{data.exams.length !== 1 ? 's' : ''}</span>
    </div>
    <div class="lc-stat green">
      <span class="lc-stat-label">Passed</span>
      <span class="lc-stat-value">{data.summary.passed}</span>
      <span class="lc-stat-sub">{data.summary.passRate}% pass rate</span>
    </div>
    <div class="lc-stat red">
      <span class="lc-stat-label">Failed</span>
      <span class="lc-stat-value">{data.summary.failed}</span>
      <span class="lc-stat-sub">{data.summary.total ? (100 - data.summary.passRate) : 0}% fail rate</span>
    </div>
    <div class="lc-stat accent">
      <span class="lc-stat-label">Avg Score</span>
      <span class="lc-stat-value">{data.summary.avgPct}%</span>
      <span class="lc-stat-sub">class average</span>
    </div>
    <div class="lc-stat">
      <span class="lc-stat-label">Grade Spread</span>
      <div class="grade-mini-strip">
        {#each data.gradeDistribution as g}
          <div class="grade-mini-bar" title="{g.grade}: {g.count}" style="height:{Math.max(8, g.pct * 0.5)}px; background:{gradeMeta(g.grade).color}; opacity:0.8;"></div>
        {/each}
      </div>
      <span class="lc-stat-sub">{data.gradeDistribution.length} grade{data.gradeDistribution.length !== 1 ? 's' : ''} active</span>
    </div>
  </div>

  <!-- ── Analytics Dashboard ────────────────────────────────── -->
  {#if data.results.length > 0}
    <div class="analytics-section lc-card">
      <div class="analytics-header">
        <div class="analytics-title">
          <Activity size={18} />
          <h2>Performance Analytics</h2>
        </div>
        <div class="analytics-tabs">
          <button 
            class="analytics-tab" class:active={activeChartTab === 'overview'}
            onclick={() => activeChartTab = 'overview'}
            type="button"
          >
            <PieChart size={14} /> Overview
          </button>
          <button 
            class="analytics-tab" class:active={activeChartTab === 'college'}
            onclick={() => activeChartTab = 'college'}
            type="button"
          >
            <Building2 size={14} /> Colleges
          </button>
          <button 
            class="analytics-tab" class:active={activeChartTab === 'department'}
            onclick={() => activeChartTab = 'department'}
            type="button"
          >
            <Layers size={14} /> Departments
          </button>
          <button 
            class="analytics-tab" class:active={activeChartTab === 'exam'}
            onclick={() => activeChartTab = 'exam'}
            type="button"
          >
            <BookOpen size={14} /> Exams
          </button>
        </div>
      </div>

      <div class="analytics-chart-wrapper">
        {#if activeChartTab === 'overview'}
          <div class="chart-container">
            <div class="chart-header">
              <span class="chart-title">Grade Distribution</span>
              <span class="chart-subtitle">{data.gradeDistribution.reduce((a, b) => a + b.count, 0)} total grades</span>
            </div>
            <div class="chart-body">
              <canvas bind:this={chartContainers.overview}></canvas>
            </div>
          </div>
        {:else if activeChartTab === 'college'}
          <div class="chart-container">
            <div class="chart-header">
              <span class="chart-title">College Performance</span>
              <span class="chart-subtitle">{collegePerformance().length} colleges · Avg score vs Pass rate</span>
            </div>
            <div class="chart-body">
              <canvas bind:this={chartContainers.college}></canvas>
            </div>
          </div>
        {:else if activeChartTab === 'department'}
          <div class="chart-container">
            <div class="chart-header">
              <span class="chart-title">Department Performance</span>
              <span class="chart-subtitle">Top {Math.min(10, departmentPerformance().length)} departments by avg score</span>
            </div>
            <div class="chart-body">
              <canvas bind:this={chartContainers.department}></canvas>
            </div>
          </div>
        {:else if activeChartTab === 'exam'}
          <div class="chart-container">
            <div class="chart-header">
              <span class="chart-title">Exam Performance</span>
              <span class="chart-subtitle">Top {Math.min(8, examPerformance().length)} exams by avg score</span>
            </div>
            <div class="chart-body">
              <canvas bind:this={chartContainers.exam}></canvas>
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- ── Grade distribution row (keep existing) ─────────────── -->
  {#if data.gradeDistribution.length > 0 && activeChartTab === 'overview'}
    <!-- This is replaced by the chart now -->
  {/if}

  <!-- ── Filter panel ────────────────────────────────────────── -->
  {#if showFilters}
    <div class="filter-panel lc-card">
      <div class="filter-panel-head">
        <span class="filter-panel-title"><Filter size={14} /> Filters</span>
        {#if hasActiveFilters}
          <button class="lc-btn lc-btn-sm lc-btn-ghost" onclick={clearAllFilters} type="button">
            <X size={12} /> Clear all
          </button>
        {/if}
      </div>
      <div class="filter-grid">
        <!-- Semester -->
        <div class="lc-field">
          <label class="lc-label" for="f-semester">Semester</label>
          <select id="f-semester" class="lc-select"
            value={data.filters.filterSemester}
            onchange={e => pushFilter('semester', (e.target as HTMLSelectElement).value)}>
            <option value="all">All semesters</option>
            {#each data.semesters as s}
              <option value={s.value}>{s.label}</option>
            {/each}
          </select>
        </div>

        <!-- Course -->
        <div class="lc-field">
          <label class="lc-label" for="f-course">Course</label>
          <select id="f-course" class="lc-select"
            value={data.filters.filterCourse}
            onchange={e => pushFilter('course', (e.target as HTMLSelectElement).value)}>
            <option value="all">All courses</option>
            {#each data.courses as c}
              <option value={c.id}>{c.code} — {c.title}</option>
            {/each}
          </select>
        </div>

        <!-- College -->
        <div class="lc-field">
          <label class="lc-label" for="f-college">College</label>
          <select id="f-college" class="lc-select"
            value={data.filters.filterCollege}
            onchange={e => pushFilter('college', (e.target as HTMLSelectElement).value)}>
            <option value="all">All colleges</option>
            {#each data.colleges as c}
              <option value={c.id}>{c.abbreviation ?? c.name}</option>
            {/each}
          </select>
        </div>

        <!-- Department -->
        <div class="lc-field">
          <label class="lc-label" for="f-dept">Department</label>
          <select id="f-dept" class="lc-select"
            value={data.filters.filterDept}
            onchange={e => pushFilter('dept', (e.target as HTMLSelectElement).value)}>
            <option value="all">All departments</option>
            {#each data.departments as d}
              <option value={d.id}>{d.name}</option>
            {/each}
          </select>
        </div>

        <!-- Grade -->
        <div class="lc-field">
          <label class="lc-label" for="f-grade">Grade</label>
          <select id="f-grade" class="lc-select"
            value={data.filters.filterGrade}
            onchange={e => pushFilter('grade', (e.target as HTMLSelectElement).value)}>
            <option value="all">All grades</option>
            {#each GRADE_OPTIONS as g}
              <option value={g}>{g}</option>
            {/each}
          </select>
        </div>
      </div>
    </div>
  {/if}

  <!-- ── Toolbar: search · group · view mode ─────────────────── -->
  <div class="results-toolbar">
    <div class="lc-search" style="flex:1; min-width:220px; max-width:380px;">
      <Search size={14} />
      <input
        class="lc-input"
        type="search"
        placeholder="Search student name or matric no."
        value={localSearch}
        oninput={onSearchInput}
      />
    </div>

    <div class="toolbar-right">
      <!-- Group by -->
      <div class="lc-field" style="flex-direction:row; align-items:center; gap:0.5rem;">
        <label class="lc-label" style="white-space:nowrap;" for="group-select">Group by</label>
        <select id="group-select" class="lc-select" style="min-width:130px;"
          bind:value={groupBy}>
          <option value="none">No grouping</option>
          <option value="exam">Exam / Course</option>
          <option value="college">College</option>
          <option value="department">Department</option>
        </select>
      </div>

      <!-- View toggle -->
      <div class="view-toggle">
        <button
          class="view-btn" class:active={viewMode === 'list'}
          onclick={() => viewMode = 'list'} type="button" title="List view"
        ><List size={15} /></button>
        <button
          class="view-btn" class:active={viewMode === 'grid'}
          onclick={() => viewMode = 'grid'} type="button" title="Grid view"
        ><Grid3X3 size={15} /></button>
      </div>
    </div>
  </div>

  <!-- ── Result count / active filter chips ─────────────────── -->
  {#if hasActiveFilters || data.results.length !== sorted.length}
    <div class="result-meta-row">
      <span class="result-count">
        {sorted.length} result{sorted.length !== 1 ? 's' : ''}
        {#if hasActiveFilters} — filtered{/if}
      </span>
      {#if data.filters.filterSemester !== 'all'}
        <span class="active-chip">
          Sem: {data.semesters.find(s => s.value === data.filters.filterSemester)?.label ?? data.filters.filterSemester}
          <button onclick={() => pushFilter('semester', 'all')} type="button"><X size={10} /></button>
        </span>
      {/if}
      {#if data.filters.filterCourse !== 'all'}
        <span class="active-chip">
          Course: {data.courses.find(c => c.id === data.filters.filterCourse)?.code ?? ''}
          <button onclick={() => pushFilter('course', 'all')} type="button"><X size={10} /></button>
        </span>
      {/if}
      {#if data.filters.filterGrade !== 'all'}
        <span class="active-chip">
          Grade: {data.filters.filterGrade}
          <button onclick={() => pushFilter('grade', 'all')} type="button"><X size={10} /></button>
        </span>
      {/if}
    </div>
  {/if}

  <!-- ── Empty state ────────────────────────────────────────── -->
  {#if sorted.length === 0}
    <div class="lc-empty lc-card" style="border-style: dashed;">
      {#if data.exams.length === 0}
        <BarChart2 size={40} strokeWidth={1.2} />
        <h3>No exams created yet</h3>
        <p>Create an exam first, then results will appear here once students submit.</p>
        <a href="/lecturer/exams/create" class="lc-btn lc-btn-primary">
          <FileText size={14} /> Create Exam
        </a>
      {:else}
        <Search size={40} strokeWidth={1.2} />
        <h3>No results match your filters</h3>
        <p>Try adjusting your search or filter criteria.</p>
        <button class="lc-btn" onclick={clearAllFilters} type="button">Clear filters</button>
      {/if}
    </div>

  <!-- ── LIST VIEW ──────────────────────────────────────────── -->
  {:else if viewMode === 'list'}
    {#each grouped as group}
      {#if groupBy !== 'none'}
        <div class="group-header">
          <div class="group-header-inner">
            {#if groupBy === 'exam'}<BookOpen size={14} />{/if}
            {#if groupBy === 'college'}<Building2 size={14} />{/if}
            {#if groupBy === 'department'}<Layers size={14} />{/if}
            <span>{group.label}</span>
            <span class="group-count">{group.items.length}</span>
          </div>
          <div class="group-mini-stats">
            <span class="gms green">{groupStats(group.items).gPass} passed</span>
            <span class="gms red">{groupStats(group.items).gFail} failed</span>
            <span class="gms">avg {groupStats(group.items).gAvg.toFixed(1)}%</span>
          </div>
        </div>
      {/if}

      <div class="lc-table-wrap">
        <table class="lc-table">
          <thead>
            <tr>
              <th>
                <button class="sort-btn" onclick={() => toggleSort('name')} type="button">
                  Student <ArrowUpDown size={11} />
                </button>
              </th>
              {#if groupBy !== 'exam'}
                <th>
                  <button class="sort-btn" onclick={() => toggleSort('course')} type="button">
                    Course <ArrowUpDown size={11} />
                  </button>
                </th>
              {/if}
              {#if groupBy === 'none'}<th>College / Dept</th>{/if}
              <th>Level</th>
              <th class="num">
                <button class="sort-btn" onclick={() => toggleSort('score')} type="button">
                  Score <ArrowUpDown size={11} />
                </button>
              </th>
              <th class="num">
                <button class="sort-btn" onclick={() => toggleSort('grade')} type="button">
                  Grade <ArrowUpDown size={11} />
                </button>
              </th>
              <th class="num">Correct</th>
              <th class="num">Violations</th>
              <th class="num">Time</th>
              <th>
                <button class="sort-btn" onclick={() => toggleSort('date')} type="button">
                  Submitted <ArrowUpDown size={11} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {#each (groupBy === 'none' ? pagedSorted : group.items) as r (r.id)}
              {@const gm = gradeMeta(r.grade)}
              <tr>
                <!-- Student -->
                <td>
                  <div class="student-cell">
                    <div class="student-avatar">{initials(r.student.fullName)}</div>
                    <div class="student-info">
                      <span class="student-name">{r.student.fullName}</span>
                      <span class="student-sub">{r.student.matricNumber ?? '—'}</span>
                    </div>
                    {#if r.passed}
                      <CheckCircle size={14} class="pass-icon" />
                    {:else if r.passed === false}
                      <XCircle size={14} class="fail-icon" />
                    {/if}
                  </div>
                </td>

                <!-- Course (when not grouped by exam) -->
                {#if groupBy !== 'exam'}
                  <td>
                    <div class="course-cell">
                      <span class="course-code-badge">{r.exam.course.code}</span>
                      <span class="muted" style="font-size:0.75rem;">{r.exam.session} · S{r.exam.semester}</span>
                    </div>
                  </td>
                {/if}

                <!-- College / Dept -->
                {#if groupBy === 'none'}
                  <td>
                    <div style="display:flex; flex-direction:column; gap:0.1rem;">
                      <span style="font-size:0.75rem; font-weight:600; color:var(--color-text);">{r.student.college?.abbreviation ?? r.student.college?.name ?? '—'}</span>
                      <span class="muted" style="font-size:0.7rem;">{r.student.department?.name ?? '—'}</span>
                    </div>
                  </td>
                {/if}

                <!-- Level -->
                <td>
                  {#if r.student.level}
                    <span class="level-chip">{r.student.level.level}L</span>
                  {:else}
                    <span class="muted">—</span>
                  {/if}
                </td>

                <!-- Score -->
                <td class="num">
                  <div class="score-cell">
                    <span class="score-pct" class:score-good={r.percentage >= 50} class:score-bad={r.percentage < 50}>
                      {pct(r.percentage ?? 0)}
                    </span>
                    <div class="score-bar-mini">
                      <div class="score-bar-fill"
                        style="width:{r.percentage ?? 0}%; background:{(r.percentage ?? 0) >= 70 ? '#16a34a' : (r.percentage ?? 0) >= 50 ? '#4f46e5' : '#dc2626'};">
                      </div>
                    </div>
                  </div>
                </td>

                <!-- Grade -->
                <td class="num">
                  <span class="grade-badge" style="background:{gm.bg}; color:{gm.color};">{r.grade ?? '—'}</span>
                </td>

                <!-- Correct -->
                <td class="num muted">
                  {#if r.correct !== null && r.totalQuestions}
                    {r.correct}/{r.totalQuestions}
                  {:else}—{/if}
                </td>

                <!-- Violations -->
                <td class="num">
                  {#if r.violationCount > 0}
                    <span class="violation-badge">
                      <AlertTriangle size={11} /> {r.violationCount}
                    </span>
                  {:else}
                    <span class="muted">0</span>
                  {/if}
                </td>

                <!-- Time -->
                <td class="num muted">{fmtTime(r.timeTakenSecs)}</td>

                <!-- Submitted -->
                <td class="muted" style="font-size:0.75rem; white-space:nowrap;">{fmtDate(r.submittedAt)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/each}

    <!-- Pagination (only in non-grouped mode) -->
    {#if groupBy === 'none' && totalPages > 1}
      <div class="lc-pagination">
        <span>Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, sorted.length)} of {sorted.length}</span>
        <div class="lc-page-btns">
          <button class="lc-btn lc-btn-sm" onclick={() => currentPage--} disabled={currentPage === 1} type="button">
            <ChevronLeft size={13} /> Prev
          </button>
          {#each Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            const offset = Math.max(0, Math.min(currentPage - 3, totalPages - 5));
            return i + 1 + offset;
          }) as p}
            <button
              class="lc-btn lc-btn-sm"
              class:lc-btn-primary={p === currentPage}
              onclick={() => currentPage = p}
              type="button"
            >{p}</button>
          {/each}
          <button class="lc-btn lc-btn-sm" onclick={() => currentPage++} disabled={currentPage === totalPages} type="button">
            Next <ChevronRight size={13} />
          </button>
        </div>
      </div>
    {/if}

  <!-- ── GRID VIEW ───────────────────────────────────────────── -->
  {:else}
    {#each grouped as group}
      {#if groupBy !== 'none'}
        <div class="group-header">
          <div class="group-header-inner">
            {#if groupBy === 'exam'}<BookOpen size={14} />{/if}
            {#if groupBy === 'college'}<Building2 size={14} />{/if}
            {#if groupBy === 'department'}<Layers size={14} />{/if}
            <span>{group.label}</span>
            <span class="group-count">{group.items.length}</span>
          </div>
        </div>
      {/if}

      <div class="results-grid">
        {#each (groupBy === 'none' ? pagedSorted : group.items) as r (r.id)}
          {@const gm = gradeMeta(r.grade)}
          <div class="result-card" class:result-card-pass={r.passed} class:result-card-fail={r.passed === false}>
            <!-- Grade accent stripe -->
            <div class="card-stripe" style="background:{gm.color};"></div>

            <div class="rc-top">
              <div class="student-avatar lg">{initials(r.student.fullName)}</div>
              <div class="rc-top-info">
                <span class="student-name">{r.student.fullName}</span>
                <span class="student-sub">{r.student.matricNumber ?? '—'}</span>
                {#if r.student.department}
                  <span class="student-sub" style="margin-top:0.1rem;">{r.student.department.name}</span>
                {/if}
              </div>
              <div class="rc-grade" style="background:{gm.bg}; color:{gm.color};">{r.grade ?? '?'}</div>
            </div>

            <div class="rc-course-row">
              <span class="course-code-badge">{r.exam.course.code}</span>
              <span class="rc-exam-title">{r.exam.title}</span>
            </div>

            <div class="rc-score-block">
              <div class="rc-pct" class:score-good={r.percentage >= 50} class:score-bad={r.percentage < 50}>
                {pct(r.percentage ?? 0)}
              </div>
              <div class="lc-bar" style="margin-top:0.4rem;">
                <div class="lc-bar-fill" style="width:{r.percentage ?? 0}%; background:{gm.color};"></div>
              </div>
              <div class="rc-score-sub">
                {r.score?.toFixed(1) ?? '—'} / {r.exam.totalMarks} marks
                · pass ≥ {r.exam.passMark}
              </div>
            </div>

            <div class="rc-stats">
              <div class="rc-stat">
                <CheckCircle size={12} />
                <span>{r.correct ?? '—'}/{r.totalQuestions ?? '—'}</span>
                <span class="rc-stat-label">Correct</span>
              </div>
              <div class="rc-stat">
                <Clock size={12} />
                <span>{fmtTime(r.timeTakenSecs)}</span>
                <span class="rc-stat-label">Time</span>
              </div>
              {#if r.violationCount > 0}
                <div class="rc-stat" style="color:#dc2626;">
                  <AlertTriangle size={12} />
                  <span>{r.violationCount}</span>
                  <span class="rc-stat-label">Flags</span>
                </div>
              {/if}
            </div>

            <div class="rc-footer">
              {#if r.passed}
                <span class="pass-chip"><CheckCircle size={11} /> Passed</span>
              {:else if r.passed === false}
                <span class="fail-chip"><XCircle size={11} /> Failed</span>
              {:else}
                <span class="muted" style="font-size:0.72rem;">Ungraded</span>
              {/if}
              <span class="muted" style="font-size:0.7rem;">{fmtDate(r.submittedAt)}</span>
            </div>
          </div>
        {/each}
      </div>
    {/each}

    <!-- Pagination (non-grouped) -->
    {#if groupBy === 'none' && totalPages > 1}
      <div class="lc-pagination">
        <span>Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, sorted.length)} of {sorted.length}</span>
        <div class="lc-page-btns">
          <button class="lc-btn lc-btn-sm" onclick={() => currentPage--} disabled={currentPage === 1} type="button">
            <ChevronLeft size={13} /> Prev
          </button>
          <button class="lc-btn lc-btn-sm" onclick={() => currentPage++} disabled={currentPage === totalPages} type="button">
            Next <ChevronRight size={13} />
          </button>
        </div>
      </div>
    {/if}
  {/if}

</div>

<style>
  @import '$lib/styles/lecturer.css';

  /* ── Page-specific overrides ─────────────────────────────────── */
  .results-page { max-width: 1400px; }

  /* ── 5-col stats grid ────────────────────────────────────────── */
  .stats-5 { grid-template-columns: repeat(5, 1fr); }
  @media (max-width: 1100px) { .stats-5 { grid-template-columns: repeat(3, 1fr); } }
  @media (max-width: 640px)  { .stats-5 { grid-template-columns: repeat(2, 1fr); } }

  /* ── Mini grade sparkbar (inside stat card) ──────────────────── */
  .grade-mini-strip { display: flex; align-items: flex-end; gap: 3px; height: 24px; margin: 0.25rem 0 0.1rem; }
  .grade-mini-bar { width: 14px; border-radius: 3px 3px 0 0; transition: height 0.3s; }

  /* ── Analytics Section ───────────────────────────────────────── */
  .analytics-section { padding: 1.25rem; margin-bottom: 1.5rem; }
  .analytics-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1.25rem; }
  .analytics-title { display: flex; align-items: center; gap: 0.5rem; }
  .analytics-title h2 { font-size: 1.1rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .analytics-title :global(svg) { color: var(--lc600); }

  .analytics-tabs { display: flex; gap: 0.25rem; background: var(--color-bg); padding: 0.2rem; border-radius: 8px; border: 1px solid var(--color-border); }
  .analytics-tab { display: flex; align-items: center; gap: 0.4rem; padding: 0.35rem 0.8rem; background: none; border: none; border-radius: 6px; font-size: 0.78rem; font-weight: 600; color: var(--color-muted); cursor: pointer; transition: all 0.15s; font-family: inherit; }
  .analytics-tab:hover { background: var(--color-surface); color: var(--color-text); }
  .analytics-tab.active { background: var(--lc-soft); color: var(--lc600); }
  .analytics-tab :global(svg) { flex-shrink: 0; }

  .analytics-chart-wrapper { min-height: 320px; }
  .chart-container { height: 320px; }
  .chart-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; }
  .chart-title { font-size: 0.85rem; font-weight: 700; color: var(--color-text); }
  .chart-subtitle { font-size: 0.72rem; color: var(--color-muted); }
  .chart-body { height: calc(100% - 30px); position: relative; }
  .chart-body canvas { width: 100% !important; height: 100% !important; }

  /* ── Filter panel ────────────────────────────────────────────── */
  .filter-panel { padding: 1rem 1.125rem; }
  .filter-panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.875rem; }
  .filter-panel-title { display: flex; align-items: center; gap: 0.4rem; font-size: 0.83rem; font-weight: 700; color: var(--color-text); }
  .filter-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 0.75rem; }
  .filter-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--lc600); flex-shrink: 0; }

  /* ── Toolbar ─────────────────────────────────────────────────── */
  .results-toolbar { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
  .toolbar-right { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; margin-left: auto; }
  .view-toggle { display: flex; border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden; }
  .view-btn { display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; background: var(--color-bg); border: none; cursor: pointer; color: var(--color-muted); transition: background 0.15s, color 0.15s; }
  .view-btn + .view-btn { border-left: 1px solid var(--color-border); }
  .view-btn.active { background: var(--lc-soft); color: var(--lc600); }
  .view-btn:hover:not(.active) { background: var(--color-surface); color: var(--color-text); }

  /* ── Active filter chips row ─────────────────────────────────── */
  .result-meta-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; font-size: 0.78rem; }
  .result-count { color: var(--color-muted); font-weight: 600; }
  .active-chip { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.2rem 0.5rem 0.2rem 0.65rem; background: var(--lc-soft); border: 1px solid rgba(79,70,229,0.2); border-radius: 20px; font-size: 0.7rem; font-weight: 600; color: var(--lc600); }
  .active-chip button { display: flex; align-items: center; justify-content: center; background: none; border: none; cursor: pointer; color: var(--lc600); padding: 0; width: 14px; height: 14px; }

  /* ── Sortable column buttons ─────────────────────────────────── */
  .sort-btn { display: inline-flex; align-items: center; gap: 0.3rem; background: none; border: none; cursor: pointer; font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-muted); font-family: inherit; padding: 0; white-space: nowrap; }
  .sort-btn:hover { color: var(--color-text); }

  /* ── Table cell components ───────────────────────────────────── */
  .student-cell { display: flex; align-items: center; gap: 0.6rem; }
  .student-avatar { width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0; background: linear-gradient(135deg, var(--lc700), var(--lc500)); color: #fff; font-size: 0.62rem; font-weight: 800; display: flex; align-items: center; justify-content: center; }
  .student-avatar.lg { width: 42px; height: 42px; font-size: 0.75rem; }
  .student-info { display: flex; flex-direction: column; gap: 0.05rem; min-width: 0; }
  .student-name { font-size: 0.82rem; font-weight: 700; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .student-sub  { font-size: 0.68rem; color: var(--color-muted); }
  :global(.pass-icon) { color: #16a34a; flex-shrink: 0; }
  :global(.fail-icon) { color: #dc2626; flex-shrink: 0; }

  .course-cell { display: flex; flex-direction: column; gap: 0.15rem; }
  .course-code-badge { display: inline-block; font-size: 0.68rem; font-weight: 800; padding: 0.15rem 0.5rem; border-radius: 20px; background: var(--lc-soft); color: var(--lc600); letter-spacing: 0.03em; width: fit-content; }
  .level-chip { display: inline-block; font-size: 0.68rem; font-weight: 700; padding: 0.15rem 0.45rem; border-radius: 6px; background: var(--color-bg); border: 1px solid var(--color-border); color: var(--color-muted); }

  .score-cell { display: flex; flex-direction: column; align-items: flex-end; gap: 0.2rem; }
  .score-pct { font-size: 0.85rem; font-weight: 800; font-variant-numeric: tabular-nums; }
  .score-good { color: var(--lc600); }
  .score-bad  { color: #dc2626; }
  .score-bar-mini { width: 60px; height: 4px; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 4px; overflow: hidden; }
  .score-bar-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }

  .grade-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 28px; height: 24px; padding: 0 0.4rem; border-radius: 6px; font-size: 0.78rem; font-weight: 800; }
  .violation-badge { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.15rem 0.45rem; border-radius: 6px; background: rgba(220,38,38,0.08); color: #dc2626; font-size: 0.72rem; font-weight: 700; }

  /* ── Group headers ───────────────────────────────────────────── */
  .group-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.5rem 0; flex-wrap: wrap; border-bottom: 2px solid var(--color-border); margin-top: 0.5rem; }
  .group-header-inner { display: flex; align-items: center; gap: 0.5rem; font-size: 0.88rem; font-weight: 700; color: var(--color-text); }
  .group-header-inner :global(svg) { color: var(--lc600); flex-shrink: 0; }
  .group-count { font-size: 0.65rem; font-weight: 700; padding: 0.1rem 0.5rem; background: var(--lc-soft); color: var(--lc600); border-radius: 20px; }
  .group-mini-stats { display: flex; gap: 0.625rem; }
  .gms { font-size: 0.72rem; font-weight: 600; color: var(--color-muted); }
  .gms.green { color: #16a34a; }
  .gms.red   { color: #dc2626; }

  /* ── Grid view cards ─────────────────────────────────────────── */
  .results-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 0.875rem; }

  .result-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 14px; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; position: relative; overflow: hidden; transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s; }
  .result-card:hover { border-color: rgba(79,70,229,0.25); box-shadow: 0 4px 20px rgba(0,0,0,0.06); transform: translateY(-1px); }
  .result-card-pass { border-color: rgba(22,163,74,0.15); }
  .result-card-fail { border-color: rgba(220,38,38,0.12); }
  .card-stripe { position: absolute; top: 0; left: 0; right: 0; height: 3px; border-radius: 3px 3px 0 0; opacity: 0.8; }

  .rc-top { display: flex; align-items: flex-start; gap: 0.625rem; margin-top: 0.25rem; }
  .rc-top-info { display: flex; flex-direction: column; gap: 0.1rem; flex: 1; min-width: 0; }
  .rc-grade { flex-shrink: 0; width: 36px; height: 36px; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 1rem; font-weight: 900; }
  .rc-course-row { display: flex; align-items: center; gap: 0.5rem; }
  .rc-exam-title { font-size: 0.72rem; color: var(--color-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
  .rc-score-block { display: flex; flex-direction: column; }
  .rc-pct { font-size: 1.6rem; font-weight: 900; line-height: 1; letter-spacing: -0.04em; }
  .rc-score-sub { font-size: 0.68rem; color: var(--color-muted); margin-top: 0.3rem; }
  .rc-stats { display: flex; gap: 0.75rem; padding: 0.5rem 0.625rem; background: var(--color-bg); border-radius: 8px; border: 1px solid var(--color-border); }
  .rc-stat { display: flex; align-items: center; gap: 0.3rem; font-size: 0.75rem; font-weight: 600; color: var(--color-text); }
  .rc-stat :global(svg) { color: var(--color-muted); flex-shrink: 0; }
  .rc-stat-label { font-size: 0.65rem; color: var(--color-muted); margin-left: 0.1rem; }
  .rc-footer { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; padding-top: 0.25rem; border-top: 1px solid var(--color-border); margin-top: auto; }

  .pass-chip { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.7rem; font-weight: 700; color: #16a34a; background: rgba(22,163,74,0.1); padding: 0.2rem 0.55rem; border-radius: 20px; }
  .fail-chip { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.7rem; font-weight: 700; color: #dc2626; background: rgba(220,38,38,0.08); padding: 0.2rem 0.55rem; border-radius: 20px; }

  /* ── Responsive ───────────────────────────────────────────────── */
  @media (max-width: 768px) {
    .analytics-header { flex-direction: column; align-items: stretch; }
    .analytics-tabs { flex-wrap: wrap; }
    .analytics-tab { flex: 1; justify-content: center; font-size: 0.7rem; padding: 0.3rem 0.5rem; }
    .chart-container { height: 260px; }
    .analytics-chart-wrapper { min-height: 260px; }
  }

  @media (max-width: 480px) {
    .chart-container { height: 220px; }
    .analytics-chart-wrapper { min-height: 220px; }
  }
</style>