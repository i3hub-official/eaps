<!-- src/routes/student/results/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { onMount } from 'svelte';
  import {
    Award, TrendingUp, CheckCircle2, XCircle,
    Clock, Calendar, Target, ChevronRight, AlertTriangle, BarChart3,
    LineChart, Activity, BarChart, PieChart, GraduationCap
  } from '@lucide/svelte';
  import Chart from 'chart.js/auto';

  let { data }: { data: PageData } = $props();

  const results = $derived(data.results ?? []);
  const summary = $derived(data.summary ?? {});

  let filter = $state<'all' | 'passed' | 'failed'>('all');

  // ── Chart refs ──────────────────────────────────────────────────────────
  let trendCanvas: HTMLCanvasElement;
  let subjectCanvas: HTMLCanvasElement;
  let timelineCanvas: HTMLCanvasElement;
  let comparisonCanvas: HTMLCanvasElement;

  let trendChart: Chart | null = null;
  let subjectChart: Chart | null = null;
  let timelineChart: Chart | null = null;
  let comparisonChart: Chart | null = null;

  const filtered = $derived(
    filter === 'all'    ? results :
    filter === 'passed' ? results.filter(r => r.passed) :
                          results.filter(r => !r.passed && r.passed !== null)
  );

  // ── MOUAU Grade system ──────────────────────────────────────────────────
  const MOUAU_GRADES = {
    A: { min: 70, max: 100, points: 5, label: 'Excellent', color: 'grade-a' },
    B: { min: 60, max: 69,  points: 4, label: 'Very Good', color: 'grade-b' },
    C: { min: 50, max: 59,  points: 3, label: 'Good',      color: 'grade-c' },
    D: { min: 45, max: 49,  points: 2, label: 'Fair',      color: 'grade-d' },
    E: { min: 40, max: 44,  points: 1, label: 'Pass',      color: 'grade-e' },
    F: { min: 0,  max: 39,  points: 0, label: 'Fail',      color: 'grade-f' }
  } as const;

  type GradeKey = keyof typeof MOUAU_GRADES;

  function getGradeInfo(percentage: number): { grade: GradeKey; points: number; label: string; passed: boolean } {
    for (const [grade, info] of Object.entries(MOUAU_GRADES)) {
      if (percentage >= info.min && percentage <= info.max) {
        return { grade: grade as GradeKey, points: info.points, label: info.label, passed: grade !== 'F' };
      }
    }
    return { grade: 'F', points: 0, label: 'Fail', passed: false };
  }

  function gradeColor(pct: number) {
    if (pct >= 70) return 'grade-a';
    if (pct >= 60) return 'grade-b';
    if (pct >= 50) return 'grade-c';
    if (pct >= 45) return 'grade-d';
    if (pct >= 40) return 'grade-e';
    return 'grade-f';
  }

  // ── Past / Current / Future classification ───────────────────────────────
  function classifyExam(result: (typeof results)[number]): 'past' | 'current' | 'future' {
    const now = new Date();
    const scheduledStart = result.exam?.scheduledStart ? new Date(result.exam.scheduledStart) : null;
    const scheduledEnd   = result.exam?.scheduledEnd   ? new Date(result.exam.scheduledEnd)   : null;
    const submittedAt    = result.submittedAt ? new Date(result.submittedAt) : null;

    // Has scheduled dates — use them
    if (scheduledStart) {
      if (scheduledEnd && scheduledEnd < now) return 'past';
      if (scheduledStart <= now && (!scheduledEnd || scheduledEnd >= now)) return 'current';
      if (scheduledStart > now) return 'future';
    }

    // Fallback: use submission date
    if (submittedAt) {
      const daysDiff = (now.getTime() - submittedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > 7) return 'past';
      return 'current';
    }

    return 'current';
  }

  // ── Chart data prep ───────────────────────────────────────────────────────
  const sortedByDate = $derived([...results].sort((a, b) => {
    const dA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
    const dB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
    return dA - dB;
  }));

  const courseGroups = $derived(() => {
    const map = new Map<string, { scores: number[]; name: string }>();
    for (const r of results) {
      const code = r.exam?.course?.code ?? 'Unknown';
      const name = r.exam?.course?.title ?? code;
      if (!map.has(code)) map.set(code, { scores: [], name });
      map.get(code)!.scores.push(Number(r.percentage ?? 0));
    }
    return map;
  });

  const monthlyTrend = $derived(() => {
    const map = new Map<string, { total: number; count: number; passed: number }>();
    for (const r of sortedByDate) {
      const d = new Date(r.submittedAt ?? r.generatedAt ?? Date.now());
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const existing = map.get(key) ?? { total: 0, count: 0, passed: 0 };
      existing.total += Number(r.percentage ?? 0);
      existing.count++;
      if (r.passed) existing.passed++;
      map.set(key, existing);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => ({
        label: new Date(key + '-01').toLocaleDateString('en-NG', { month: 'short', year: 'numeric' }),
        avg: Math.round(v.total / v.count),
        count: v.count,
        passRate: Math.round((v.passed / v.count) * 100),
      }));
  });

  // ── Chart helpers ─────────────────────────────────────────────────────────
  function getThemeColors() {
    const style = getComputedStyle(document.documentElement);
    return {
      accent: style.getPropertyValue('--accent').trim() || '#10b981',
      text: style.getPropertyValue('--color-text').trim() || '#1f2937',
      muted: style.getPropertyValue('--color-muted').trim() || '#6b7280',
      border: style.getPropertyValue('--color-border').trim() || '#e5e7eb',
      isDark: document.documentElement.classList.contains('dark'),
    };
  }

  function hexToRGB(hex: string): string {
    const clean = hex.replace('#', '');
    const bigint = parseInt(clean, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `${r}, ${g}, ${b}`;
  }

  // ── Render charts ─────────────────────────────────────────────────────────
  function renderCharts() {
    const { accent, text, muted, border, isDark } = getThemeColors();
    const accentRGB = hexToRGB(accent);
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';

    // 1. Performance Trend (Line)
    if (trendCanvas && sortedByDate.length > 1) {
      if (trendChart) trendChart.destroy();
      trendChart = new Chart(trendCanvas, {
        type: 'line',
        data: {
          labels: sortedByDate.map((r, i) => {
            const code = r.exam?.course?.code ?? `E${i+1}`;
            return code;
          }),
          datasets: [{
            label: 'Your Score',
            data: sortedByDate.map(r => Math.round(Number(r.percentage ?? 0))),
            borderColor: accent,
            backgroundColor: `rgba(${accentRGB}, 0.08)`,
            borderWidth: 2.5,
            tension: 0.35,
            fill: true,
            pointBackgroundColor: accent,
            pointBorderColor: isDark ? '#1f2937' : '#fff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
          }, {
            label: 'Pass Mark (40%)',
            data: sortedByDate.map(() => 40),
            borderColor: '#ef4444',
            borderWidth: 2,
            borderDash: [6, 4],
            tension: 0.35,
            pointRadius: 0,
            fill: false,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { intersect: false, mode: 'index' },
          plugins: {
            legend: {
              display: true,
              position: 'top',
              align: 'end',
              labels: {
                usePointStyle: true,
                pointStyle: 'circle',
                padding: 16,
                color: text,
                font: { size: 11, weight: '600' },
              },
            },
            tooltip: {
              backgroundColor: isDark ? '#1f2937' : '#fff',
              titleColor: text,
              bodyColor: muted,
              borderColor: border,
              borderWidth: 1,
              padding: 10,
              cornerRadius: 8,
              displayColors: true,
              callbacks: {
                title: (items) => {
                  const idx = items[0].dataIndex;
                  const r = sortedByDate[idx];
                  return `${r.exam?.course?.code ?? 'Exam'} — ${r.exam?.title ?? 'Untitled'}`;
                },
                label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}%`,
                afterBody: (items) => {
                  const idx = items[0].dataIndex;
                  const r = sortedByDate[idx];
                  const gi = getGradeInfo(Math.round(Number(r.percentage ?? 0)));
                  const type = classifyExam(r);
                  return [
                    `Grade: ${r.grade ?? gi.grade} (${gi.label})`,
                    `Date: ${formatDate(r.submittedAt)}`,
                    `${type === 'past' ? '📚' : type === 'current' ? '📝' : '🔮'} ${type.charAt(0).toUpperCase() + type.slice(1)}`,
                  ];
                },
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: muted, font: { size: 10, weight: '600' } },
              border: { display: false },
            },
            y: {
              min: 0,
              max: 100,
              grid: { color: gridColor },
              ticks: { color: muted, font: { size: 10, weight: '600' }, stepSize: 20, callback: (v) => `${v}%` },
              border: { display: false },
            },
          },
        },
      });
    }

    // 2. By Subject (Bar)
    const cg = courseGroups();
    if (subjectCanvas && cg.size > 0) {
      if (subjectChart) subjectChart.destroy();
      const entries = Array.from(cg.entries());
      subjectChart = new Chart(subjectCanvas, {
        type: 'bar',
        data: {
          labels: entries.map(([code]) => code),
          datasets: [{
            label: 'Best Score',
            data: entries.map(([, v]) => Math.max(...v.scores)),
            backgroundColor: accent,
            borderRadius: 6,
            borderSkipped: false,
          }, {
            label: 'Average',
            data: entries.map(([, v]) => Math.round(v.scores.reduce((a, b) => a + b, 0) / v.scores.length)),
            backgroundColor: `rgba(${accentRGB}, 0.35)`,
            borderRadius: 6,
            borderSkipped: false,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top',
              align: 'end',
              labels: {
                usePointStyle: true,
                pointStyle: 'rectRounded',
                padding: 16,
                color: text,
                font: { size: 11, weight: '600' },
              },
            },
            tooltip: {
              backgroundColor: isDark ? '#1f2937' : '#fff',
              titleColor: text,
              bodyColor: muted,
              borderColor: border,
              borderWidth: 1,
              padding: 10,
              cornerRadius: 8,
              callbacks: {
                title: (items) => {
                  const [, v] = entries[items[0].dataIndex];
                  return v.name;
                },
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: muted, font: { size: 10, weight: '600' } },
              border: { display: false },
            },
            y: {
              min: 0,
              max: 100,
              grid: { color: gridColor },
              ticks: { color: muted, font: { size: 10, weight: '600' }, stepSize: 20, callback: (v) => `${v}%` },
              border: { display: false },
            },
          },
        },
      });
    }

    // 3. Monthly Timeline (Line + Bar)
    const mt = monthlyTrend();
    if (timelineCanvas && mt.length > 0) {
      if (timelineChart) timelineChart.destroy();
      timelineChart = new Chart(timelineCanvas, {
        type: 'line',
        data: {
          labels: mt.map(m => m.label),
          datasets: [{
            label: 'Avg Score',
            data: mt.map(m => m.avg),
            borderColor: accent,
            backgroundColor: `rgba(${accentRGB}, 0.06)`,
            borderWidth: 2.5,
            tension: 0.4,
            fill: true,
            pointBackgroundColor: accent,
            pointBorderColor: isDark ? '#1f2937' : '#fff',
            pointBorderWidth: 2,
            pointRadius: 5,
            yAxisID: 'y',
          }, {
            label: 'Exams Taken',
            data: mt.map(m => m.count),
            type: 'bar',
            backgroundColor: `rgba(${accentRGB}, 0.15)`,
            borderRadius: 4,
            borderSkipped: false,
            yAxisID: 'y1',
            barThickness: 20,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { intersect: false, mode: 'index' },
          plugins: {
            legend: {
              display: true,
              position: 'top',
              align: 'end',
              labels: {
                usePointStyle: true,
                pointStyle: 'circle',
                padding: 16,
                color: text,
                font: { size: 11, weight: '600' },
              },
            },
            tooltip: {
              backgroundColor: isDark ? '#1f2937' : '#fff',
              titleColor: text,
              bodyColor: muted,
              borderColor: border,
              borderWidth: 1,
              padding: 10,
              cornerRadius: 8,
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: muted, font: { size: 10, weight: '600' } },
              border: { display: false },
            },
            y: {
              min: 0,
              max: 100,
              grid: { color: gridColor },
              ticks: { color: muted, font: { size: 10, weight: '600' }, stepSize: 20, callback: (v) => `${v}%` },
              border: { display: false },
            },
            y1: {
              position: 'right',
              min: 0,
              grid: { display: false },
              ticks: { color: muted, font: { size: 10, weight: '600' }, stepSize: 1 },
              border: { display: false },
            },
          },
        },
      });
    }

    // 4. Pass/Fail Distribution (Doughnut)
    if (comparisonCanvas && results.length > 0) {
      if (comparisonChart) comparisonChart.destroy();
      const passed = results.filter(r => r.passed).length;
      const failed = results.filter(r => !r.passed && r.passed !== null).length;
      const pending = results.filter(r => r.passed === null).length;

      comparisonChart = new Chart(comparisonCanvas, {
        type: 'doughnut',
        data: {
          labels: ['Passed', 'Failed', 'Pending'],
          datasets: [{
            data: [passed, failed, pending],
            backgroundColor: ['#10b981', '#ef4444', '#f59e0b'],
            borderWidth: 0,
            hoverOffset: 6,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '68%',
          plugins: {
            legend: {
              display: true,
              position: 'bottom',
              labels: {
                usePointStyle: true,
                pointStyle: 'circle',
                padding: 20,
                color: text,
                font: { size: 11, weight: '600' },
              },
            },
            tooltip: {
              backgroundColor: isDark ? '#1f2937' : '#fff',
              titleColor: text,
              bodyColor: muted,
              borderColor: border,
              borderWidth: 1,
              padding: 10,
              cornerRadius: 8,
              callbacks: {
                label: (ctx) => `${ctx.label}: ${ctx.parsed} exam${ctx.parsed !== 1 ? 's' : ''}`,
              },
            },
          },
        },
      });
    }
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  onMount(() => {
    if (results.length > 0) {
      // Small delay to ensure DOM is ready and CSS vars are computed
      requestAnimationFrame(() => renderCharts());
    }
    return () => {
      trendChart?.destroy();
      subjectChart?.destroy();
      timelineChart?.destroy();
      comparisonChart?.destroy();
    };
  });

  // Re-render on results change (e.g. filter shouldn't trigger this, but data fetch might)
  $effect(() => {
    if (results.length > 0) {
      requestAnimationFrame(() => renderCharts());
    }
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  function formatDate(d: string | Date | null | undefined) {
    if (!d) return '—';
    const date = typeof d === 'string' ? new Date(d) : d;
    return new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  }

  function formatTime(secs: number | null | undefined) {
    if (!secs) return '—';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  }
</script>

<div class="page">

  <div class="page-header">
    <div>
      <h1 class="page-title">My Results</h1>
      <p class="page-sub">{summary.total ?? 0} exam{(summary.total ?? 0) !== 1 ? 's' : ''} taken</p>
    </div>
    <div class="grade-legend">
      <span class="legend-item grade-a">A</span>
      <span class="legend-item grade-b">B</span>
      <span class="legend-item grade-c">C</span>
      <span class="legend-item grade-d">D</span>
      <span class="legend-item grade-e">E</span>
      <span class="legend-item grade-f">F</span>
    </div>
  </div>

  
  <!-- ── Summary cards ─────────────────────────────────────── -->
  {#if (summary.total ?? 0) > 0}
    <div class="summary-row">
      <div class="sum-card">
        <div class="sum-icon avg-icon"><BarChart3 size={16} /></div>
        <div class="sum-body">
          <span class="sum-val">{summary.avgPct}%</span>
          <span class="sum-lbl">Average score</span>
        </div>
      </div>
      <div class="sum-card">
        <div class="sum-icon best-icon"><TrendingUp size={16} /></div>
        <div class="sum-body">
          <span class="sum-val good">{summary.bestPct}%</span>
          <span class="sum-lbl">Best score</span>
        </div>
      </div>
      <div class="sum-card">
        <div class="sum-icon pass-icon"><CheckCircle2 size={16} /></div>
        <div class="sum-body">
          <span class="sum-val good">{summary.passed}</span>
          <span class="sum-lbl">Passed</span>
        </div>
      </div>
      <div class="sum-card">
        <div class="sum-icon fail-icon"><XCircle size={16} /></div>
        <div class="sum-body">
          <span class="sum-val" class:bad={summary.failed > 0}>{summary.failed}</span>
          <span class="sum-lbl">Failed</span>
        </div>
      </div>
    </div>
  {/if}

  
  <!-- ── Filter tabs ────────────────────────────────────────── -->
  <div class="filter-bar">
    {#each [['all','All'], ['passed','Passed'], ['failed','Failed']] as [val, label]}
      <button
        class="filter-btn"
        class:active={filter === val}
        onclick={() => filter = val as any}
        type="button"
      >{label}</button>
    {/each}
  </div>

  <!-- ── Results list ───────────────────────────────────────── -->
  {#if filtered.length === 0}
    <div class="empty">
      <Award size={36} strokeWidth={1.2} />
      <h3>No results yet</h3>
      <p>Complete an exam to see your results here.</p>
    </div>
  {:else}
    <div class="results-list">
      {#each filtered as result}
        {@const pct = Math.round(Number(result.percentage ?? 0))}
        {@const gradeInfo = getGradeInfo(pct)}
        {@const examType = classifyExam(result)}
        <div class="result-card">
          <div class="result-left">
            <div class="grade-circle {gradeColor(pct)}">
              {result.grade ?? '?'}
            </div>
            <div class="grade-points">{gradeInfo.points} pts</div>
            <div class="exam-type-badge type-{examType}">
              {examType === 'past' ? '📚' : examType === 'current' ? '📝' : '🔮'}
            </div>
          </div>
          <div class="result-main">
            <div class="result-top">
              <div class="result-title-row">
                <span class="course-code">{result.exam?.course?.code}</span>
                <h3 class="result-title">{result.exam?.title}</h3>
                <span class="grade-label">{gradeInfo.label}</span>
              </div>
              <div class="result-score">
                <span class="score-big {gradeColor(pct)}">{pct}%</span>
                <span class="score-raw">{result.correct ?? '—'}/{result.totalQuestions ?? '—'} correct</span>
              </div>
            </div>

            <div class="result-bar-wrap">
              <div class="result-bar">
                <div class="result-fill {gradeColor(pct)}-fill" style="width:{pct}%"></div>
                <!-- MOUAU Pass mark line (40%) -->
                <div class="pass-line" style="left:40%"></div>
                <!-- Grade markers -->
                <div class="grade-markers">
                  <span class="marker" style="left:70%">A</span>
                  <span class="marker" style="left:60%">B</span>
                  <span class="marker" style="left:50%">C</span>
                  <span class="marker" style="left:45%">D</span>
                  <span class="marker" style="left:40%">E</span>
                </div>
              </div>
            </div>

            <div class="result-meta">
              <span class="meta-item">
                <Calendar size={11} />{formatDate(result.submittedAt)}
              </span>
              <span class="meta-item">
                <Clock size={11} />{formatTime(result.timeTakenSecs)}
              </span>
              <span class="meta-item">
                <Target size={11} />{result.answered ?? 0}/{result.totalQuestions ?? 0} answered
              </span>
              {#if result.violationCount > 0}
                <span class="meta-item warn-item">
                  <AlertTriangle size={11} />{result.violationCount} violation{result.violationCount !== 1 ? 's' : ''}
                </span>
              {/if}
              <span class="status-chip" class:chip-pass={result.passed} class:chip-fail={!result.passed}>
                {result.passed ? 'Passed' : 'Failed'}
              </span>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- ── Charts Section ────────────────────────────────────── -->
  {#if (summary.total ?? 0) > 0}
    <div class="charts-section">
      <!-- Row 1: Trend + Distribution -->
      <div class="chart-row">
        <div class="chart-card chart-large">
          <div class="chart-header">
            <div class="chart-icon"><LineChart size={14} /></div>
            <div class="chart-title-group">
              <h3 class="chart-title">Performance Trend</h3>
              <p class="chart-sub">Your scores over time vs. pass mark</p>
            </div>
          </div>
          <div class="chart-body" style="height: 260px;">
            {#if sortedByDate.length > 1}
              <canvas bind:this={trendCanvas}></canvas>
            {:else}
              <div class="chart-placeholder">
                <Activity size={24} />
                <span>Complete more exams to see your trend</span>
              </div>
            {/if}
          </div>
        </div>

        <div class="chart-card chart-small">
          <div class="chart-header">
            <div class="chart-icon"><PieChart size={14} /></div>
            <div class="chart-title-group">
              <h3 class="chart-title">Outcome</h3>
              <p class="chart-sub">Pass / fail breakdown</p>
            </div>
          </div>
          <div class="chart-body" style="height: 260px;">
            {#if results.length > 0}
              <canvas bind:this={comparisonCanvas}></canvas>
            {:else}
              <div class="chart-placeholder">
                <PieChart size={24} />
                <span>No data yet</span>
              </div>
            {/if}
          </div>
        </div>
      </div>

      <!-- Row 2: Subject + Timeline -->
      <div class="chart-row">
        <div class="chart-card chart-medium">
          <div class="chart-header">
            <div class="chart-icon"><BarChart size={14} /></div>
            <div class="chart-title-group">
              <h3 class="chart-title">By Subject</h3>
              <p class="chart-sub">Best and average per course</p>
            </div>
          </div>
          <div class="chart-body" style="height: 240px;">
            {#if courseGroups().size > 0}
              <canvas bind:this={subjectCanvas}></canvas>
            {:else}
              <div class="chart-placeholder">
                <BarChart size={24} />
                <span>No subject data available</span>
              </div>
            {/if}
          </div>
        </div>

        <div class="chart-card chart-medium">
          <div class="chart-header">
            <div class="chart-icon"><Activity size={14} /></div>
            <div class="chart-title-group">
              <h3 class="chart-title">Monthly Activity</h3>
              <p class="chart-sub">Exams taken and average scores</p>
            </div>
          </div>
          <div class="chart-body" style="height: 240px;">
            {#if monthlyTrend().length > 0}
              <canvas bind:this={timelineCanvas}></canvas>
            {:else}
              <div class="chart-placeholder">
                <Calendar size={24} />
                <span>No monthly data yet</span>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  {/if}


</div>

<style>
  .page { display: flex; flex-direction: column; gap: 1.5rem; }
  .page-header { display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; }
  .page-title { font-size: 1.5rem; font-weight: 900; color: var(--color-text); letter-spacing: -0.03em; margin: 0 0 0.2rem; }
  .page-sub { font-size: 0.8rem; color: var(--color-muted); margin: 0; }

  /* Grade Legend */
  .grade-legend { display: flex; gap: 0.3rem; align-items: center; }
  .grade-legend .legend-item {
    width: 28px; height: 28px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.7rem; font-weight: 800; color: #fff;
  }
  .grade-legend .grade-a { background: #065f46; }
  .grade-legend .grade-b { background: #0369a1; }
  .grade-legend .grade-c { background: #92400e; }
  .grade-legend .grade-d { background: #9a3412; }
  .grade-legend .grade-e { background: #854d0e; }
  .grade-legend .grade-f { background: #991b1b; }
  :global(.dark) .grade-legend .grade-a { background: #4ade80; color: #065f46; }
  :global(.dark) .grade-legend .grade-b { background: #38bdf8; color: #0369a1; }
  :global(.dark) .grade-legend .grade-c { background: #fbbf24; color: #92400e; }
  :global(.dark) .grade-legend .grade-d { background: #fb923c; color: #9a3412; }
  :global(.dark) .grade-legend .grade-e { background: #fcd34d; color: #854d0e; }
  :global(.dark) .grade-legend .grade-f { background: #f87171; color: #991b1b; }

  /* ── Charts Section ───────────────────────────────────────────────────── */
  .charts-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .chart-row {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 0.75rem;
  }
  .chart-row:nth-child(2) {
    grid-template-columns: 1fr 1fr;
  }

  @media (max-width: 768px) {
    .chart-row,
    .chart-row:nth-child(2) {
      grid-template-columns: 1fr;
    }
  }

  .chart-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 14px;
    padding: 1rem 1.125rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    transition: border-color 0.15s;
  }
  .chart-card:hover {
    border-color: color-mix(in srgb, var(--accent, #10b981) 25%, var(--color-border));
  }

  .chart-header {
    display: flex;
    align-items: flex-start;
    gap: 0.625rem;
  }

  .chart-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: color-mix(in srgb, var(--accent, #10b981) 10%, transparent);
    color: var(--accent, #10b981);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .chart-title-group {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    min-width: 0;
  }

  .chart-title {
    font-size: 0.88rem;
    font-weight: 800;
    color: var(--color-text);
    margin: 0;
    letter-spacing: -0.01em;
  }

  .chart-sub {
    font-size: 0.72rem;
    color: var(--color-muted);
    margin: 0;
    font-weight: 500;
  }

  .chart-body {
    position: relative;
    width: 100%;
    min-height: 200px;
  }
  .chart-body canvas {
    width: 100% !important;
    height: 100% !important;
  }

  .chart-placeholder {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    color: var(--color-muted);
    font-size: 0.78rem;
    font-weight: 600;
  }

  /* Summary */
  .summary-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; }
  @media (max-width: 640px) { .summary-row { grid-template-columns: repeat(2, 1fr); } }
  .sum-card {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 12px; padding: 0.875rem; display: flex; align-items: center; gap: 0.75rem;
  }
  .sum-icon {
    width: 36px; height: 36px; border-radius: 9px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
  }
  .avg-icon  { background: rgba(99,102,241,0.1); color: #6366f1; }
  .best-icon { background: rgba(16,185,129,0.1); color: #10b981; }
  .pass-icon { background: rgba(22,163,74,0.1);  color: var(--g600); }
  .fail-icon { background: rgba(220,38,38,0.06); color: #dc2626; }
  .sum-body { display: flex; flex-direction: column; }
  .sum-val { font-size: 1.4rem; font-weight: 900; color: var(--color-text); letter-spacing: -0.04em; line-height: 1; }
  .sum-val.good { color: var(--g600); }
  .sum-val.bad  { color: #dc2626; }
  .sum-lbl { font-size: 0.65rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-muted); margin-top: 0.15rem; }

  /* Filter */
  .filter-bar { display: flex; gap: 0.375rem; }
  .filter-btn {
    padding: 0.4rem 0.9rem; border-radius: 8px; font-size: 0.78rem; font-weight: 600;
    border: 1px solid var(--color-border); background: var(--color-surface);
    color: var(--color-muted); cursor: pointer; font-family: inherit; transition: all 0.15s;
  }
  .filter-btn:hover { color: var(--color-text); border-color: var(--g600); }
  .filter-btn.active { background: var(--g600); color: #fff; border-color: var(--g600); }

  /* Results list */
  .results-list { display: flex; flex-direction: column; gap: 0.75rem; }
  .result-card {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 14px; padding: 1.125rem;
    display: flex; gap: 1rem; transition: border-color 0.15s;
  }
  .result-card:hover { border-color: var(--g600); }

  .result-left { display: flex; flex-direction: column; align-items: center; gap: 0.3rem; }
  .grade-circle {
    width: 48px; height: 48px; border-radius: 50%; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 1rem; font-weight: 900;
  }
  .grade-points {
    font-size: 0.6rem; font-weight: 700; color: var(--color-muted);
    text-align: center;
  }
  .exam-type-badge {
    font-size: 0.65rem;
    padding: 0.15rem 0.4rem;
    border-radius: 4px;
    font-weight: 700;
  }
  .type-past { background: rgba(99,102,241,0.1); }
  .type-current { background: rgba(34,197,94,0.1); }
  .type-future { background: rgba(251,191,36,0.1); }

  .grade-a { background: rgba(22,163,74,0.12);  color: #065f46; }
  .grade-b { background: rgba(14,165,233,0.12); color: #0369a1; }
  .grade-c { background: rgba(245,158,11,0.12); color: #92400e; }
  .grade-d { background: rgba(249,115,22,0.12); color: #9a3412; }
  .grade-e { background: rgba(234,179,8,0.12);  color: #854d0e; }
  .grade-f { background: rgba(220,38,38,0.12);  color: #991b1b; }
  :global(.dark) .grade-a { color: #4ade80; background: rgba(22,163,74,0.18); }
  :global(.dark) .grade-b { color: #38bdf8; background: rgba(14,165,233,0.18); }
  :global(.dark) .grade-c { color: #fbbf24; background: rgba(245,158,11,0.18); }
  :global(.dark) .grade-d { color: #fb923c; background: rgba(249,115,22,0.18); }
  :global(.dark) .grade-e { color: #fcd34d; background: rgba(234,179,8,0.18); }
  :global(.dark) .grade-f { color: #f87171; background: rgba(220,38,38,0.18); }

  .result-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.625rem; }
  .result-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
  .result-title-row { display: flex; flex-direction: column; gap: 0.2rem; min-width: 0; }
  .course-code {
    font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em;
    color: var(--g700);
  }
  :global(.dark) .course-code { color: var(--g400); }
  .result-title {
    font-size: 0.9rem; font-weight: 700; color: var(--color-text);
    margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .grade-label {
    font-size: 0.65rem; font-weight: 600; color: var(--color-muted);
    text-transform: uppercase; letter-spacing: 0.05em;
  }
  .result-score { text-align: right; flex-shrink: 0; }
  .score-big {
    display: block; font-size: 1.5rem; font-weight: 900; letter-spacing: -0.04em; line-height: 1;
  }
  .score-raw { font-size: 0.65rem; color: var(--color-muted); }

  .result-bar-wrap { width: 100%; }
  .result-bar {
    height: 6px; background: var(--color-bg); border-radius: 3px;
    overflow: visible; position: relative;
  }
  .result-fill { height: 100%; border-radius: 3px; transition: width 0.8s cubic-bezier(0.4,0,0.2,1); }
  .grade-a-fill { background: var(--g500); }
  .grade-b-fill { background: #38bdf8; }
  .grade-c-fill { background: #f59e0b; }
  .grade-d-fill { background: #f97316; }
  .grade-e-fill { background: #eab308; }
  .grade-f-fill { background: #ef4444; }

  .pass-line {
    position: absolute; top: -3px; bottom: -3px; width: 2px;
    background: rgba(239, 68, 68, 0.8); border-radius: 2px;
    transform: translateX(-50%);
  }

  .grade-markers {
    position: relative;
    width: 100%;
    height: 0;
  }
  .marker {
    position: absolute;
    top: -14px;
    font-size: 0.5rem;
    font-weight: 700;
    color: var(--color-muted);
    transform: translateX(-50%);
    opacity: 0.5;
  }

  .result-meta {
    display: flex; align-items: center; gap: 0.625rem; flex-wrap: wrap;
    font-size: 0.7rem; color: var(--color-muted);
  }
  .meta-item { display: flex; align-items: center; gap: 0.25rem; }
  .warn-item { color: #f59e0b; }
  .status-chip {
    font-size: 0.62rem; font-weight: 800; text-transform: uppercase;
    letter-spacing: 0.05em; padding: 0.18rem 0.55rem; border-radius: 20px;
    margin-left: auto;
  }
  .chip-pass { background: rgba(22,163,74,0.12); color: var(--g700); }
  .chip-fail { background: rgba(220,38,38,0.1);  color: #991b1b; }
  :global(.dark) .chip-pass { color: var(--g400); }
  :global(.dark) .chip-fail { color: #f87171; }

  .empty {
    display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
    padding: 4rem 1rem; color: var(--color-muted); text-align: center;
  }
  .empty h3 { font-size: 1.05rem; font-weight: 800; color: var(--color-text); margin: 0; }
  .empty p  { font-size: 0.8rem; margin: 0; }

  /* Responsive */
  @media (max-width: 640px) {
    .chart-body { height: 220px !important; }
    .result-top { flex-direction: column; }
    .result-score { text-align: left; width: 100%; }
    .result-left { flex-direction: row; gap: 0.5rem; align-items: center; }
    .grade-points { display: none; }
    .grade-legend { display: none; }
  }
</style>