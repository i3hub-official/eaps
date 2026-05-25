<!-- src/routes/(admin)/admin/reports/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import {
    FileText, Download, Calendar, TrendingUp, Users,
    AlertTriangle, CheckCircle, BarChart3, PieChart,
    ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight,
    BookOpen, GraduationCap, ShieldCheck, Clock,
    RefreshCw, Filter, Search, Eye
  } from 'lucide-svelte';
  import { tick } from 'svelte';

  let { data }: { data: PageData } = $props();

  let isExporting = $state(false);
  let dateRange = $state(data.meta?.range ?? '14d');
  let searchQuery = $state('');

  const ranges = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '14d', label: 'Last 14 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: 'all', label: 'All Time' },
  ];

  // Derived filtered exam stats
  let filteredExamStats = $derived(
    data.examStats?.filter((e: any) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return e.exam_title?.toLowerCase().includes(q) ||
             e.course_code?.toLowerCase().includes(q);
    }) ?? []
  );

  // Chart calculations
  const maxDay = $derived(Math.max(...(data.dailyActivity?.map((d: any) => d.sessions) ?? [1]), 1));
  const maxViolations = $derived(Math.max(...(data.violationBreakdown?.map((v: any) => v.count) ?? [1]), 1));

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  function formatDateFull(dateStr: string) {
    return new Date(dateStr).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' });
  }

  // PDF Export
  async function exportToPDF() {
    isExporting = true;
    await tick();
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const element = document.getElementById('reports-export-container');
      if (!element) return;
      const canvas = await html2canvas(element, {
        scale: 2, useCORS: true, logging: false,
        backgroundColor: '#ffffff',
        windowWidth: element.scrollWidth,
        width: element.scrollWidth,
        height: element.scrollHeight
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      let scaledHeight = imgHeight * ratio;
      let scaledWidth = imgWidth * ratio;
      let position = 20;
      let heightLeft = scaledHeight;
      pdf.setFontSize(16);
      pdf.setTextColor(22, 163, 74);
      pdf.text('MOUAU eTest — Reports', pdfWidth / 2, 12, { align: 'center' });
      pdf.setFontSize(9);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Range: ${ranges.find(r => r.value === dateRange)?.label} · Generated: ${new Date().toLocaleString()}`, pdfWidth / 2, 18, { align: 'center' });
      pdf.addImage(imgData, 'PNG', imgX, position, scaledWidth, scaledHeight);
      heightLeft -= (pdfHeight - 20);
      while (heightLeft > 0) {
        position = heightLeft - scaledHeight + 20;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', imgX, position, scaledWidth, scaledHeight);
        heightLeft -= pdfHeight;
      }
      pdf.save(`reports-${dateRange}-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('Failed to export PDF.');
    } finally {
      isExporting = false;
    }
  }

  function changeRange(newRange: string) {
    dateRange = newRange;
    const url = new URL(window.location.href);
    url.searchParams.set('range', newRange);
    window.location.href = url.toString();
  }
</script>

<svelte:head><title>Reports — MOUAU eTest Admin</title></svelte:head>

<div class="page">

  <!-- Header -->
  <header class="page-header">
    <div class="header-left">
      <div class="header-icon">
        <FileText size={24} color="#16a34a" />
      </div>
      <div>
        <h1>System Reports</h1>
        <p class="subtitle">Analytics, performance metrics & violation tracking</p>
      </div>
    </div>
    <div class="header-right">
      <div class="range-selector">
        <Calendar size={14} />
        <select bind:value={dateRange} onchange={() => changeRange(dateRange)}>
          {#each ranges as r}
            <option value={r.value}>{r.label}</option>
          {/each}
        </select>
      </div>
      <button class="btn-primary" onclick={exportToPDF} disabled={isExporting}>
        {#if isExporting}
          <RefreshCw size={14} class="spin" />
          Exporting...
        {:else}
          <Download size={14} />
          Export PDF
        {/if}
      </button>
    </div>
  </header>

  <!-- Summary Cards -->
  <section class="summary-cards">
    <div class="summary-card">
      <div class="summary-icon blue"><BookOpen size={18} /></div>
      <div class="summary-info">
        <span class="summary-value">{data.summary?.total_exams ?? 0}</span>
        <span class="summary-label">Exams</span>
      </div>
    </div>
    <div class="summary-card">
      <div class="summary-icon green"><Users size={18} /></div>
      <div class="summary-info">
        <span class="summary-value">{data.summary?.total_sessions ?? 0}</span>
        <span class="summary-label">Sessions</span>
      </div>
    </div>
    <div class="summary-card">
      <div class="summary-icon teal"><CheckCircle size={18} /></div>
      <div class="summary-info">
        <span class="summary-value">{data.summary?.total_submissions ?? 0}</span>
        <span class="summary-label">Submissions</span>
      </div>
    </div>
    <div class="summary-card">
      <div class="summary-icon amber"><TrendingUp size={18} /></div>
      <div class="summary-info">
        <span class="summary-value">{data.summary?.overall_avg ?? 0}%</span>
        <span class="summary-label">Avg Score</span>
      </div>
    </div>
    <div class="summary-card">
      <div class="summary-icon red"><AlertTriangle size={18} /></div>
      <div class="summary-info">
        <span class="summary-value">{data.summary?.total_violations ?? 0}</span>
        <span class="summary-label">Violations</span>
      </div>
    </div>
    <div class="summary-card">
      <div class="summary-icon purple"><Clock size={18} /></div>
      <div class="summary-info">
        <span class="summary-value">{data.summary?.active_today ?? 0}</span>
        <span class="summary-label">Active Today</span>
      </div>
    </div>
  </section>

  <div id="reports-export-container">

    <!-- Charts Row -->
    <section class="charts-row">
      <!-- Daily Activity Chart -->
      <div class="chart-card wide">
        <div class="chart-header">
          <div class="chart-title-wrap">
            <BarChart3 size={16} color="#16a34a" />
            <h3>Daily Activity</h3>
          </div>
          <div class="chart-legend">
            <span class="legend-item"><span class="legend-dot sessions"></span>Sessions</span>
            <span class="legend-item"><span class="legend-dot submissions"></span>Submissions</span>
            <span class="legend-item"><span class="legend-dot avg"></span>Avg Score</span>
          </div>
        </div>
        <div class="chart-body">
          {#if !data.dailyActivity?.length}
            <div class="empty-chart">No activity data for selected range.</div>
          {:else}
            <div class="bar-chart">
              {#each data.dailyActivity as d}
                <div class="day-col">
                  <div class="bar-stack">
                    <div class="bar sessions" style="height: {(d.sessions / maxDay) * 140}px" title="{d.sessions} sessions"></div>
                    <div class="bar submissions" style="height: {(d.submissions / maxDay) * 140}px" title="{d.submissions} submissions"></div>
                  </div>
                  <span class="day-label">{formatDate(d.day)}</span>
                  {#if d.avg_score > 0}
                    <span class="day-score">{d.avg_score}%</span>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <!-- Course Distribution -->
      <div class="chart-card">
        <div class="chart-header">
          <div class="chart-title-wrap">
            <PieChart size={16} color="#a78bfa" />
            <h3>Course Distribution</h3>
          </div>
        </div>
        <div class="chart-body pie-body">
          {#if !data.courseDistribution?.length}
            <div class="empty-chart">No course data.</div>
          {:else}
            {@const totalExams = data.courseDistribution.reduce((a: number, b: any) => a + b.exam_count, 0)}
            <div class="pie-chart">
              <svg viewBox="0 0 100 100" class="pie-svg">
                {#each data.courseDistribution as c, i}
                  {@const prevPct = data.courseDistribution.slice(0, i).reduce((a: number, b: any) => a + (totalExams > 0 ? b.exam_count / totalExams : 0), 0)}
                  {@const pct = totalExams > 0 ? c.exam_count / totalExams : 0}
                  {@const startAngle = prevPct * 360}
                  {@const endAngle = (prevPct + pct) * 360}
                  {@const x1 = 50 + 38 * Math.cos((startAngle - 90) * Math.PI / 180)}
                  {@const y1 = 50 + 38 * Math.sin((startAngle - 90) * Math.PI / 180)}
                  {@const x2 = 50 + 38 * Math.cos((endAngle - 90) * Math.PI / 180)}
                  {@const y2 = 50 + 38 * Math.sin((endAngle - 90) * Math.PI / 180)}
                  {@const largeArc = endAngle - startAngle > 180 ? 1 : 0}
                  {@const colors = ['#22c55e', '#3b82f6', '#a78bfa', '#f59e0b', '#ef4444', '#14b8a6', '#64748b', '#f97316']}
                  <path 
                    d="M 50 50 L {x1} {y1} A 38 38 0 {largeArc} 1 {x2} {y2} Z" 
                    fill={colors[i % colors.length]}
                    opacity="0.85"
                    stroke="white"
                    stroke-width="2"
                  />
                {/each}
                <circle cx="50" cy="50" r="22" fill="var(--color-surface, white)" />
                <text x="50" y="47" text-anchor="middle" font-size="11" font-weight="700" fill="var(--color-text, #1a1a1a)">{totalExams}</text>
                <text x="50" y="57" text-anchor="middle" font-size="5" fill="var(--color-muted, #94a3b8)">Exams</text>
              </svg>
            </div>
            <div class="pie-legend compact">
              {#each data.courseDistribution as c, i}
                {@const colors = ['#22c55e', '#3b82f6', '#a78bfa', '#f59e0b', '#ef4444', '#14b8a6', '#64748b', '#f97316']}
                {@const pct = totalExams > 0 ? Math.round((c.exam_count / totalExams) * 100) : 0}
                <div class="pie-legend-item">
                  <span class="pie-legend-dot" style="background: {colors[i % colors.length]}"></span>
                  <span class="pie-legend-label">{c.course_code}</span>
                  <span class="pie-legend-value">{c.exam_count} ({pct}%)</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </section>

    <!-- Main Grid -->
    <div class="main-grid">

      <!-- Exam Performance Table -->
      <section class="panel panel-exams">
        <div class="panel-head">
          <div class="panel-title-wrap">
            <BookOpen size={15} />
            <h2>Exam Performance</h2>
          </div>
          <div class="panel-actions">
            <div class="search-box">
              <Search size={13} />
              <input type="text" placeholder="Search exams..." bind:value={searchQuery} />
            </div>
            <span class="panel-count">{filteredExamStats.length} results</span>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Course</th>
                <th>Exam</th>
                <th class="num">Students</th>
                <th class="num">Submitted</th>
                <th class="num">Completion</th>
                <th class="num">Passed</th>
                <th class="num">Pass Rate</th>
                <th class="num">Avg Score</th>
              </tr>
            </thead>
            <tbody>
              {#if filteredExamStats.length === 0}
                <tr><td colspan="8" class="empty">No exam data for selected range.</td></tr>
              {:else}
                {#each filteredExamStats as e}
                  <tr>
                    <td><span class="badge">{e.course_code}</span></td>
                    <td class="title-cell">{e.exam_title}</td>
                    <td class="num">{e.total}</td>
                    <td class="num">{e.submitted}</td>
                    <td class="num">
                      <div class="mini-bar-wrap">
                        <div class="mini-bar" style="width: {e.completion_rate}%"></div>
                      </div>
                      <span class="mini-bar-label">{e.completion_rate}%</span>
                    </td>
                    <td class="num">{e.passed}</td>
                    <td class="num">
                      <span class="pass-rate" class:good={e.pass_rate >= 50} class:bad={e.pass_rate < 40}>
                        {e.pass_rate}%
                      </span>
                    </td>
                    <td class="num">
                      <span class="score" class:good={e.avg_pct >= 50} class:bad={e.avg_pct < 40}>
                        {e.avg_pct}%
                      </span>
                    </td>
                  </tr>
                {/each}
              {/if}
            </tbody>
          </table>
        </div>
      </section>

      <!-- Right Column -->
      <div class="right-col">

        <!-- Top Students -->
        <section class="panel panel-students">
          <div class="panel-head">
            <div class="panel-title-wrap">
              <GraduationCap size={15} />
              <h2>Top 10 Students</h2>
            </div>
          </div>
          <div class="table-wrap">
            <table class="compact-table">
              <thead>
                <tr><th class="num">#</th><th>Student</th><th class="num">Avg</th></tr>
              </thead>
              <tbody>
                {#if !data.topStudents?.length}
                  <tr><td colspan="3" class="empty">No results yet.</td></tr>
                {:else}
                  {#each data.topStudents as s, i}
                    <tr>
                      <td class="num rank">{i + 1}</td>
                      <td class="name-cell">
                        <div class="student-name">{s.student_name}</div>
                        <div class="student-meta">{s.matric_number ?? '—'} · {s.exams_taken} exams</div>
                      </td>
                      <td class="num">
                        <span class="score good">{s.avg_pct}%</span>
                      </td>
                    </tr>
                  {/each}
                {/if}
              </tbody>
            </table>
          </div>
        </section>

        <!-- Violation Breakdown -->
        <section class="panel panel-violations">
          <div class="panel-head">
            <div class="panel-title-wrap">
              <AlertTriangle size={15} />
              <h2>Violations</h2>
              <span class="panel-badge">{data.meta?.totalViolations ?? 0}</span>
            </div>
          </div>
          <div class="violation-bars">
            {#if !data.violationBreakdown?.length}
              <p class="empty">No violations recorded.</p>
            {:else}
              {#each data.violationBreakdown as v}
                <div class="v-row">
                  <div class="v-info">
                    <span class="v-label">{data.flagLabels?.[v.flag_type] ?? v.flag_type}</span>
                    <span class="v-pct">{v.pct_of_total}%</span>
                  </div>
                  <div class="v-bar-wrap">
                    <div class="v-bar" style="width: {(v.count / maxViolations) * 100}%"></div>
                  </div>
                  <span class="v-count">{v.count}</span>
                </div>
              {/each}
            {/if}
          </div>
        </section>

      </div>
    </div>

  </div>

  <!-- Footer Meta -->
  <footer class="page-footer">
    <span>Generated in {data.meta?.loadTimeMs ?? 0}ms · {formatDateFull(data.meta?.generatedAt ?? new Date().toISOString())}</span>
    {#if data.meta?.error}
      <span class="error-badge">Error: {data.meta.error}</span>
    {/if}
  </footer>

</div>

<style>
  .page {
    padding: 2rem 2.5rem 3rem;
    max-width: 1400px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 2rem;
    font-family: 'DM Sans', system-ui, sans-serif;
  }

  /* ── Header ──────────────────────────────────────────── */
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--color-border);
  }
  .header-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .header-icon {
    width: 48px;
    height: 48px;
    border-radius: 0.75rem;
    background: rgba(22, 163, 74, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  h1 {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--color-text);
    margin: 0;
  }
  .subtitle {
    font-size: 0.8rem;
    color: var(--color-muted);
    margin: 0.25rem 0 0;
  }
  .header-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  .range-selector {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.75rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    color: var(--color-text);
  }
  .range-selector select {
    border: none;
    background: none;
    outline: none;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-text);
    cursor: pointer;
  }
  .btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: #16a34a;
    border: 1px solid #16a34a;
    border-radius: 0.5rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: white;
    cursor: pointer;
    transition: all 0.15s;
  }
  .btn-primary:hover {
    background: #15803d;
    border-color: #15803d;
  }
  .btn-primary:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  .spin {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* ── Summary Cards ───────────────────────────────────── */
  .summary-cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 1rem;
  }
  .summary-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    padding: 1.25rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    transition: transform 0.15s, box-shadow 0.15s;
    animation: fadeUp 0.4s ease both;
  }
  .summary-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.08);
  }
  .summary-icon {
    width: 40px;
    height: 40px;
    border-radius: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .summary-icon.blue { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
  .summary-icon.green { background: rgba(22, 163, 74, 0.1); color: #16a34a; }
  .summary-icon.teal { background: rgba(20, 184, 166, 0.1); color: #14b8a6; }
  .summary-icon.amber { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
  .summary-icon.red { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
  .summary-icon.purple { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
  .summary-info {
    display: flex;
    flex-direction: column;
  }
  .summary-value {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--color-text);
    line-height: 1;
  }
  .summary-label {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-muted);
  }

  /* ── Charts Row ──────────────────────────────────────── */
  .charts-row {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 1.25rem;
  }
  @media (max-width: 1024px) {
    .charts-row { grid-template-columns: 1fr; }
  }
  .chart-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    overflow: hidden;
    animation: fadeUp 0.45s ease both;
  }
  .chart-card.wide {
    grid-column: 1;
  }
  .chart-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .chart-title-wrap {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .chart-title-wrap h3 {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0;
  }
  .chart-legend {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.7rem;
    color: var(--color-muted);
    font-weight: 500;
  }
  .legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 2px;
  }
  .legend-dot.sessions { background: #16a34a; }
  .legend-dot.submissions { background: #3b82f6; }
  .legend-dot.avg { background: #f59e0b; }
  .chart-body {
    padding: 1.25rem;
  }
  .pie-body {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }
  .empty-chart {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 160px;
    color: var(--color-muted);
    font-size: 0.85rem;
  }

  /* Bar Chart */
  .bar-chart {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 0.5rem;
    height: 160px;
    padding: 0 0.5rem;
  }
  .day-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
    height: 100%;
  }
  .bar-stack {
    flex: 1;
    width: 100%;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 2px;
  }
  .bar {
    width: 10px;
    border-radius: 3px 3px 0 0;
    transition: height 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    min-height: 4px;
  }
  .bar.sessions { background: #16a34a; }
  .bar.submissions { background: #3b82f6; }
  .day-label {
    font-size: 0.62rem;
    color: var(--color-muted);
    font-weight: 600;
    white-space: nowrap;
  }
  .day-score {
    font-size: 0.6rem;
    color: #f59e0b;
    font-weight: 700;
  }

  /* Pie Chart */
  .pie-chart {
    width: 120px;
    height: 120px;
    flex-shrink: 0;
  }
  .pie-svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }
  .pie-legend {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .pie-legend.compact {
    gap: 0.4rem;
  }
  .pie-legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .pie-legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 2px;
    flex-shrink: 0;
  }
  .pie-legend-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text);
  }
  .pie-legend-value {
    font-size: 0.7rem;
    color: var(--color-muted);
    margin-left: auto;
  }

  /* ── Main Grid ───────────────────────────────────────── */
  .main-grid {
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: 1.25rem;
    align-items: start;
  }
  @media (max-width: 1024px) {
    .main-grid { grid-template-columns: 1fr; }
  }

  /* ── Panels ──────────────────────────────────────────── */
  .panel {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    overflow: hidden;
    animation: fadeUp 0.45s ease both;
  }
  .panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .panel-title-wrap {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--color-muted);
  }
  .panel-title-wrap h2 {
    font-size: 0.82rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-text);
    margin: 0;
  }
  .panel-badge {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--color-muted);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
  }
  .panel-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .search-box {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.35rem 0.75rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
  }
  .search-box input {
    border: none;
    background: none;
    outline: none;
    font-size: 0.8rem;
    width: 160px;
    color: var(--color-text);
  }
  .panel-count {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--color-muted);
  }

  /* ── Tables ──────────────────────────────────────────── */
  .table-wrap {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
  }
  th {
    padding: 0.65rem 1rem;
    text-align: left;
    font-size: 0.68rem;
    font-weight: 700;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    background: var(--color-bg);
  }
  td {
    padding: 0.65rem 1rem;
    border-top: 1px solid var(--color-border);
  }
  tr:hover td {
    background: var(--color-bg);
  }
  .num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .badge {
    font-size: 0.7rem;
    font-weight: 700;
    padding: 0.2rem 0.5rem;
    background: rgba(22, 163, 74, 0.1);
    color: #16a34a;
    border-radius: 999px;
  }
  .title-cell {
    font-weight: 500;
    max-width: 240px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .rank {
    color: var(--color-muted);
    font-weight: 700;
  }
  .score {
    font-weight: 700;
  }
  .score.good { color: #16a34a; }
  .score.bad { color: #dc2626; }
  .pass-rate {
    font-weight: 700;
    font-size: 0.8rem;
  }
  .pass-rate.good { color: #16a34a; }
  .pass-rate.bad { color: #dc2626; }
  .empty {
    text-align: center;
    color: var(--color-muted);
    padding: 2rem;
  }

  /* Mini progress bars in table */
  .mini-bar-wrap {
    width: 60px;
    height: 4px;
    background: var(--color-border);
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 0.2rem;
  }
  .mini-bar {
    height: 100%;
    background: #16a34a;
    border-radius: 2px;
    transition: width 0.6s ease;
  }
  .mini-bar-label {
    font-size: 0.65rem;
    color: var(--color-muted);
    font-weight: 600;
  }

  /* Compact table for students */
  .compact-table {
    font-size: 0.8rem;
  }
  .compact-table th,
  .compact-table td {
    padding: 0.5rem 0.875rem;
  }
  .student-name {
    font-weight: 600;
    font-size: 0.82rem;
    color: var(--color-text);
  }
  .student-meta {
    font-size: 0.7rem;
    color: var(--color-muted);
    margin-top: 0.1rem;
  }

  /* ── Violation Bars ────────────────────────────────── */
  .violation-bars {
    padding: 1rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
  }
  .v-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .v-info {
    display: flex;
    flex-direction: column;
    width: 120px;
    flex-shrink: 0;
  }
  .v-label {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--color-text);
  }
  .v-pct {
    font-size: 0.65rem;
    color: var(--color-muted);
  }
  .v-bar-wrap {
    flex: 1;
    height: 6px;
    background: var(--color-border);
    border-radius: 999px;
    overflow: hidden;
  }
  .v-bar {
    height: 100%;
    background: #ef4444;
    border-radius: 999px;
    transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    min-width: 2px;
  }
  .v-count {
    font-size: 0.8rem;
    font-weight: 700;
    width: 32px;
    text-align: right;
    color: var(--color-text);
  }

  /* ── Right Column ──────────────────────────────────── */
  .right-col {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  /* ── Footer ────────────────────────────────────────── */
  .page-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 0;
    border-top: 1px solid var(--color-border);
    font-size: 0.7rem;
    color: var(--color-muted);
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .error-badge {
    color: #dc2626;
    background: rgba(220, 38, 38, 0.1);
    padding: 0.2rem 0.5rem;
    border-radius: 0.25rem;
    font-weight: 600;
  }

  /* ── Animations ────────────────────────────────────── */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── Responsive ────────────────────────────────────── */
  @media (max-width: 768px) {
    .page { padding: 1.25rem 1rem; }
    .summary-cards { grid-template-columns: repeat(2, 1fr); }
    .charts-row { grid-template-columns: 1fr; }
    .main-grid { grid-template-columns: 1fr; }
    .header-right { flex-direction: column; align-items: stretch; }
    .pie-body { flex-direction: column; }
  }
  @media (max-width: 480px) {
    .summary-cards { grid-template-columns: 1fr 1fr; }
    .panel-actions { flex-direction: column; align-items: stretch; }
    .search-box input { width: 100%; }
  }
</style>