<script lang="ts">
  import type { ReportMeta, ReportParams, ViewMode } from '$lib/types/reports.js';
  import { formatId, isRawId } from '$lib/utils/formatId.js';
  import {
    User, Award, BookOpen, TrendingUp, TrendingDown, Minus,
    ChevronLeft, ChevronRight, GraduationCap
  } from '@lucide/svelte';
import Pagination     from '$lib/components/ui/Pagination.svelte';
import ReportToolbar  from '$lib/components/ui/ReportToolbar.svelte';
import AlphaGroupTabs from '$lib/components/ui/AlphaGroupTabs.svelte';
import ExportBar      from '$lib/components/ui/ExportBar.svelte';

  interface Student {
    id: string; name: string; matric: string;
    level: string; department: string; college: string;
    examsTaken: number; passed: number;
    avgPct: number | string; lastExam: string;
  }

  interface Props {
    meta:   ReportMeta;
    params: ReportParams;
    data:   Record<string, unknown>;
  }

  let { meta, data }: Props = $props();

  const students = $derived((data.students as Student[]) ?? []);
  const summary  = $derived(data.summary as {
    totalStudents: number; avgPct: number | string;
    totalPassed: number;   totalAttempts: number;
  } | null ?? null);

  // ── UI state ──────────────────────────────────────────────────────────
  let viewMode     = $state<ViewMode>('list');
  let page         = $state(1);
  let pageSize     = $state(20);
  let sortKey      = $state<keyof Student>('name');
  let sortDir      = $state<'asc' | 'desc'>('asc');
  let groupByAlpha = $state(false);
  let activeLetter = $state('');
  let searchTerm   = $state('');
  let carouselIdx  = $state(0);
  let touchStartX = $state(0);

  const AVAILABLE_VIEWS: ViewMode[] = ['list', 'grid', 'card', 'carousel'];

  const SORT_COLS = [
    { key: 'name',       label: 'Name'        },
    { key: 'matric',     label: 'Matric No.'  },
    { key: 'level',      label: 'Level'       },
    { key: 'department', label: 'Department'  },
    { key: 'examsTaken', label: 'Exams Taken' },
    { key: 'passed',     label: 'Passed'      },
    { key: 'avgPct',     label: 'Avg Score'   },
    { key: 'lastExam',   label: 'Last Exam'   },
  ];

  // ── Pipeline ──────────────────────────────────────────────────────────
  const filtered = $derived(
    searchTerm
      ? students.filter(s =>
          s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.matric.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.department.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : students
  );

  const letterFiltered = $derived(
    activeLetter
      ? filtered.filter(s => s.name.toUpperCase().startsWith(activeLetter))
      : filtered
  );

  const sorted = $derived(() => {
    return [...letterFiltered].sort((a, b) => {
      const va = a[sortKey] ?? '';
      const vb = b[sortKey] ?? '';
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  });

  const availableLetters = $derived(
    [...new Set(filtered.map(s => s.name.toUpperCase()[0]).filter(Boolean))].sort()
  );

  const paginated = $derived(sorted().slice((page - 1) * pageSize, page * pageSize));

  // ── Carousel ──────────────────────────────────────────────────────────
  const carouselStudents = $derived(sorted());

  function carouselPrev() {
    carouselIdx = (carouselIdx - 1 + carouselStudents.length) % carouselStudents.length;
  }
  function carouselNext() {
    carouselIdx = (carouselIdx + 1) % carouselStudents.length;
  }

  function carouselOffset(i: number): number {
    const len = carouselStudents.length;
    let offset = i - carouselIdx;
    if (offset > len / 2)  offset -= len;
    if (offset < -len / 2) offset += len;
    return offset;
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  function pct(s: Student) {
    return typeof s.avgPct === 'number' ? s.avgPct : parseFloat(String(s.avgPct)) || 0;
  }

  function passRate(s: Student) {
    return s.examsTaken > 0 ? Math.round((s.passed / s.examsTaken) * 100) : 0;
  }

  function gradeColor(score: number) {
    if (score >= 70) return 'var(--g600, #16a34a)';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  }

  function gradeLetter(score: number) {
    if (score >= 70) return 'A';
    if (score >= 60) return 'B';
    if (score >= 50) return 'C';
    if (score >= 45) return 'D';
    if (score >= 40) return 'E';
    return 'F';
  }

  function displayId(raw: string) {
    if (isRawId(raw)) return formatId(raw);
    return raw.toUpperCase();
  }

  function handlePageChange(p: number, ps: number) { page = p; pageSize = ps; }
  function handleSort(key: string, dir: 'asc' | 'desc') {
    sortKey = key as keyof Student; sortDir = dir; page = 1;
  }
  function handleViewChange(v: ViewMode) { viewMode = v; carouselIdx = 0; }
  function handleGroupToggle() { groupByAlpha = !groupByAlpha; activeLetter = ''; page = 1; }
  function handleLetterSelect(l: string) { activeLetter = l; page = 1; }
</script>

<div class="sp-view">
  <!-- Summary stats -->
  {#if summary}
    <div class="summary-grid">
      <div class="sum-card green">
        <GraduationCap size={20} />
        <div>
          <span class="sum-val">{summary.totalStudents.toLocaleString()}</span>
          <span class="sum-label">Total Students</span>
        </div>
      </div>
      <div class="sum-card blue">
        <BookOpen size={20} />
        <div>
          <span class="sum-val">{summary.totalAttempts.toLocaleString()}</span>
          <span class="sum-label">Total Attempts</span>
        </div>
      </div>
      <div class="sum-card amber">
        <Award size={20} />
        <div>
          <span class="sum-val">{summary.totalPassed.toLocaleString()}</span>
          <span class="sum-label">Total Passed</span>
        </div>
      </div>
      <div class="sum-card teal">
        <TrendingUp size={20} />
        <div>
          <span class="sum-val">{summary.avgPct}%</span>
          <span class="sum-label">Average Score</span>
        </div>
      </div>
    </div>
  {/if}

  <!-- Toolbar -->
  <div class="toolbar-row">
    <ReportToolbar
      {viewMode}
      availableViews={AVAILABLE_VIEWS}
      {sortKey} {sortDir}
      {groupByAlpha}
      sortableColumns={SORT_COLS}
      onViewChange={handleViewChange}
      onSortChange={handleSort}
      onGroupToggle={handleGroupToggle}
    />
    <ExportBar rows={filtered} filename="student-performance" sheetName="Students" />
  </div>

  <!-- Search -->
  <div class="search-row">
    <input
      class="search-input"
      type="search"
      placeholder="Search by name, matric, or department..."
      bind:value={searchTerm}
      oninput={() => { page = 1; }}
    />
    <span class="result-count">{filtered.length.toLocaleString()} students</span>
  </div>

  <!-- Alpha tabs -->
  {#if groupByAlpha}
    <AlphaGroupTabs
      letters={availableLetters}
      activeLetter={activeLetter}
      onselect={handleLetterSelect}
    />
  {/if}

  <!-- ══ VIEWS ════════════════════════════════════════════════════════ -->

  {#if viewMode === 'carousel'}
    <!-- ── CAROUSEL ────────────────────────────────────────────────── -->
    <div class="carousel-wrap">
      <button class="car-nav left"  onclick={carouselPrev} aria-label="Previous">
        <ChevronLeft size={24} />
      </button>

    <div
  class="carousel-stage"
  onpointerdown={(e) => { touchStartX = e.clientX; }}
  onpointerup={(e) => {
    const diff = touchStartX - e.clientX;
    if (Math.abs(diff) > 40) diff > 0 ? carouselNext() : carouselPrev();
  }}
>
  {#each carouselStudents.slice(
    Math.max(0, carouselIdx - 2),
    Math.min(carouselStudents.length, carouselIdx + 3)
  ) as s, localI}
    {@const globalI = Math.max(0, carouselIdx - 2) + localI}
    {@const offset  = globalI - carouselIdx}
    {@const score   = pct(s)}
    {@const isCenter = offset === 0}

    <div
      class="car-card"
      class:center={isCenter}
      class:side1={Math.abs(offset) === 1}
      class:side2={Math.abs(offset) === 2}
      style="
        --offset-x:   {offset * 85}%;
        --offset-scale: {isCenter ? 1 : Math.abs(offset) === 1 ? 0.88 : 0.76};
        --offset-opacity: {isCenter ? 1 : Math.abs(offset) === 1 ? 0.65 : 0.35};
        z-index: {10 - Math.abs(offset)};
      "
      onclick={() => { if (!isCenter) carouselIdx = globalI; }}
    >
      <!-- Avatar with grade-colored ring -->
      <div
        class="car-avatar"
        style="
          --avatar-bg:    {gradeColor(score)}22;
          --avatar-color: {gradeColor(score)};
          --avatar-ring:  {gradeColor(score)};
        "
      >
        <User size={32} />
      </div>

      <div class="car-name">{s.name}</div>
      <div class="car-matric">{displayId(s.matric)}</div>

      <div class="car-score" style="--score-color: {gradeColor(score)}">
        {score}%
        <span
          class="car-grade"
          style="background: {gradeColor(score)}; color: white;"
        >{gradeLetter(score)}</span>
      </div>

      <div class="car-dept">{s.department}</div>
      <div class="car-level">{s.level}</div>

      <div class="car-stats">
        <div class="car-stat">
          <span class="cstat-val">{s.examsTaken}</span>
          <span class="cstat-lbl">Exams</span>
        </div>
        <div class="car-stat">
          <span class="cstat-val" style="color: var(--g600, #16a34a)">{s.passed}</span>
          <span class="cstat-lbl">Passed</span>
        </div>
        <div class="car-stat">
          <span class="cstat-val">{passRate(s)}%</span>
          <span class="cstat-lbl">Pass Rate</span>
        </div>
      </div>

      <!-- Score progress bar -->
      <div class="car-progress-wrap">
        <div
          class="car-progress-bar"
          style="width: {Math.min(score, 100)}%; background: {gradeColor(score)};"
        ></div>
      </div>

      <div class="car-last">Last exam: {s.lastExam}</div>
    </div>
  {/each}
</div>

      <button class="car-nav right" onclick={carouselNext} aria-label="Next">
        <ChevronRight size={24} />
      </button>

      <div class="car-counter">
        {carouselIdx + 1} of {carouselStudents.length}
      </div>
    </div>

  {:else}
    <div class="panel">

      {#if viewMode === 'list'}
        <!-- ── LIST ──────────────────────────────────────────────────── -->
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                {#each SORT_COLS as col}
                  <th
                    onclick={() => handleSort(col.key, sortKey === col.key && sortDir === 'asc' ? 'desc' : 'asc')}
                    class:sorted={sortKey === col.key}
                  >
                    {col.label}
                    {#if sortKey === col.key}
                      <span class="sort-ind">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    {/if}
                  </th>
                {/each}
                <th>Grade</th>
              </tr>
            </thead>
            <tbody>
              {#if paginated.length === 0}
                <tr><td colspan="9" class="empty">No students match your search.</td></tr>
              {:else}
                {#each paginated as s}
                  {@const score = pct(s)}
                  <tr>
                    <td class="name-cell">
                      <div class="name-avatar" style="background: {gradeColor(score)}18; color: {gradeColor(score)}">
                        {s.name[0]}
                      </div>
                      {s.name}
                    </td>
                    <td class="mono">{displayId(s.matric)}</td>
                    <td>{s.level}</td>
                    <td class="dept-cell">{s.department}</td>
                    <td class="num">{s.examsTaken}</td>
                    <td class="num pass">{s.passed}</td>
                    <td class="num">
                      <span class="score-pill" style="background:{gradeColor(score)}18; color:{gradeColor(score)}">
                        {score}%
                      </span>
                    </td>
                    <td class="num date-cell">{s.lastExam}</td>
                    <td>
                      <span class="grade-badge" style="background:{gradeColor(score)}18; color:{gradeColor(score)}">
                        {gradeLetter(score)}
                      </span>
                    </td>
                  </tr>
                {/each}
              {/if}
            </tbody>
          </table>
        </div>

      {:else if viewMode === 'grid'}
        <!-- ── GRID ────────────────────────────────────────────────── -->
        <div class="grid-wrap">
          <div class="s-grid">
            {#each paginated as s}
              {@const score = pct(s)}
              <div class="s-card">
                <div class="s-card-header" style="background:{gradeColor(score)}12">
                  <div class="s-avatar" style="background:{gradeColor(score)}22; color:{gradeColor(score)}">
                    {s.name[0]}
                  </div>
                  <span class="s-grade" style="background:{gradeColor(score)}; color:white">
                    {gradeLetter(score)}
                  </span>
                </div>
                <div class="s-card-body">
                  <div class="s-name">{s.name}</div>
                  <div class="s-matric">{displayId(s.matric)}</div>
                  <div class="s-dept">{s.department} · {s.level}</div>
                  <div class="s-score-row">
                    <span class="s-score" style="color:{gradeColor(score)}">{score}%</span>
                    <div class="s-bar-wrap">
                      <div class="s-bar" style="width:{Math.min(score, 100)}%; background:{gradeColor(score)}"></div>
                    </div>
                  </div>
                  <div class="s-meta-row">
                    <span>{s.examsTaken} exams</span>
                    <span style="color:var(--g600)">{s.passed} passed</span>
                    <span>{passRate(s)}%</span>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>

      {:else if viewMode === 'card'}
        <!-- ── CARD (rich single-col) ─────────────────────────────── -->
        <div class="card-wrap">
          {#each paginated as s}
            {@const score = pct(s)}
            <div class="rich-card">
              <div class="rc-left" style="border-left: 4px solid {gradeColor(score)}">
                <div class="rc-avatar" style="background:{gradeColor(score)}18; color:{gradeColor(score)}">
                  <User size={22} />
                </div>
                <div class="rc-info">
                  <span class="rc-name">{s.name}</span>
                  <span class="rc-matric">{displayId(s.matric)}</span>
                  <span class="rc-dept">{s.department}</span>
                </div>
              </div>
              <div class="rc-center">
                <div class="rc-stat">
                  <span class="rcstat-val">{s.examsTaken}</span>
                  <span class="rcstat-lbl">Exams</span>
                </div>
                <div class="rc-stat">
                  <span class="rcstat-val" style="color:var(--g600)">{s.passed}</span>
                  <span class="rcstat-lbl">Passed</span>
                </div>
                <div class="rc-stat">
                  <span class="rcstat-val">{s.examsTaken - s.passed}</span>
                  <span class="rcstat-lbl">Failed</span>
                </div>
                <div class="rc-stat">
                  <span class="rcstat-val">{s.level}</span>
                  <span class="rcstat-lbl">Level</span>
                </div>
              </div>
              <div class="rc-right">
                <div class="rc-score" style="color:{gradeColor(score)}">{score}%</div>
                <div class="rc-grade-badge" style="background:{gradeColor(score)}18; color:{gradeColor(score)}">
                  Grade {gradeLetter(score)}
                </div>
                <div class="rc-bar-wrap">
                  <div class="rc-bar" style="width:{Math.min(score,100)}%; background:{gradeColor(score)}"></div>
                </div>
                <span class="rc-last">{s.lastExam}</span>
              </div>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Pagination (all non-carousel views) -->
      <Pagination
        {page} {pageSize}
        total={sorted().length}
        onchange={handlePageChange}
      />
    </div>
  {/if}
</div>

<style>
  .sp-view { display: flex; flex-direction: column; gap: 1rem; }

  /* ── Summary ── */
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
  }
  @media (max-width: 760px) { .summary-grid { grid-template-columns: repeat(2, 1fr); } }

  .sum-card {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    padding: 1rem 1.25rem;
    border-radius: 0.875rem;
    border: 1.5px solid transparent;
  }
  .sum-card.green { background: var(--g50, #f0fdf4); border-color: var(--g100, #dcfce7); color: var(--g700, #15803d); }
  .sum-card.blue  { background: #eff6ff; border-color: #dbeafe; color: #1d4ed8; }
  .sum-card.amber { background: #fffbeb; border-color: #fef3c7; color: #b45309; }
  .sum-card.teal  { background: #f0fdfa; border-color: #ccfbf1; color: #0f766e; }

  .sum-val   { display: block; font-size: 1.5rem; font-weight: 800; line-height: 1; }
  .sum-label { display: block; font-size: 0.68rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.7; margin-top: 0.2rem; }

  /* ── Toolbar ── */
  .toolbar-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .search-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .search-input {
    flex: 1;
    padding: 0.55rem 0.875rem;
    border: 1.5px solid var(--color-border, #e5e7eb);
    border-radius: 0.625rem;
    font-size: 0.85rem;
    outline: none;
    background: var(--color-surface, white);
    color: var(--color-text, #111827);
  }
  .search-input:focus { border-color: var(--g500, #22c55e); }

  .result-count { font-size: 0.78rem; color: var(--color-muted, #6b7280); white-space: nowrap; }

  /* ── Panel ── */
  .panel {
    background: var(--color-surface, white);
    border: 1.5px solid var(--color-border, #e5e7eb);
    border-radius: 1rem;
    overflow: hidden;
  }

  /* ── List ── */
  .table-wrap { overflow-x: auto; }

  table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }

  th {
    padding: 0.625rem 0.875rem;
    text-align: left;
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-muted, #6b7280);
    background: var(--color-bg, #f9fafb);
    border-bottom: 1px solid var(--color-border, #e5e7eb);
    white-space: nowrap;
    cursor: pointer;
    user-select: none;
  }
  th:hover, th.sorted { color: var(--g600, #16a34a); }
  .sort-ind { margin-left: 0.25rem; color: var(--g600, #16a34a); font-weight: 800; }

  td {
    padding: 0.6rem 0.875rem;
    border-bottom: 1px solid var(--color-border, #e5e7eb);
    white-space: nowrap;
  }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: var(--g-soft, rgba(22,163,74,0.04)); }

  .name-cell {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    font-weight: 600;
    min-width: 180px;
  }

  .name-avatar {
    width: 28px; height: 28px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.75rem;
    font-weight: 800;
    flex-shrink: 0;
  }

  .mono     { font-family: ui-monospace, monospace; font-size: 0.75rem; color: var(--color-muted, #6b7280); }
  .num      { text-align: right; font-variant-numeric: tabular-nums; }
  .pass     { color: var(--g600, #16a34a); font-weight: 700; }
  .dept-cell{ max-width: 160px; overflow: hidden; text-overflow: ellipsis; }
  .date-cell{ font-size: 0.75rem; color: var(--color-muted, #6b7280); }
  .empty    { text-align: center; padding: 3rem; color: var(--color-muted, #9ca3af); }

  .score-pill {
    display: inline-block;
    padding: 0.2rem 0.5rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 800;
  }

  .grade-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px; height: 28px;
    border-radius: 0.5rem;
    font-size: 0.8rem;
    font-weight: 800;
  }

  /* ── Grid ── */
  .grid-wrap { padding: 1.25rem; }

  .s-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
  }
  @media (max-width: 1100px) { .s-grid { grid-template-columns: repeat(3, 1fr); } }
  @media (max-width: 760px)  { .s-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 480px)  { .s-grid { grid-template-columns: 1fr; } }

  .s-card {
    border: 1.5px solid var(--color-border, #e5e7eb);
    border-radius: 0.875rem;
    overflow: hidden;
    background: var(--color-surface, white);
    transition: all 0.2s;
  }
  .s-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0,0,0,0.08);
  }

  .s-card-header {
    padding: 1rem 1rem 0.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .s-avatar {
    width: 40px; height: 40px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 1rem; font-weight: 800;
  }

  .s-grade {
    width: 28px; height: 28px; border-radius: 0.5rem;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.8rem; font-weight: 800;
  }

  .s-card-body { padding: 0.75rem 1rem 1rem; }
  .s-name  { font-size: 0.9rem; font-weight: 700; color: var(--color-text, #111827); margin-bottom: 0.1rem; }
  .s-matric{ font-size: 0.72rem; font-family: ui-monospace, monospace; color: var(--color-muted, #6b7280); margin-bottom: 0.35rem; }
  .s-dept  { font-size: 0.72rem; color: var(--color-muted, #6b7280); margin-bottom: 0.75rem; }

  .s-score-row { display: flex; align-items: center; gap: 0.625rem; margin-bottom: 0.5rem; }
  .s-score     { font-size: 1.1rem; font-weight: 800; min-width: 44px; }
  .s-bar-wrap  { flex: 1; height: 6px; background: var(--color-border, #e5e7eb); border-radius: 3px; overflow: hidden; }
  .s-bar       { height: 100%; border-radius: 3px; transition: width 0.5s ease; }

  .s-meta-row  { display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--color-muted, #6b7280); font-weight: 600; }

  /* ── Card (rich) ── */
  .card-wrap { display: flex; flex-direction: column; gap: 0.625rem; padding: 1rem; }

  .rich-card {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    padding: 0.875rem 1.25rem;
    border: 1.5px solid var(--color-border, #e5e7eb);
    border-radius: 0.875rem;
    background: var(--color-surface, white);
    transition: all 0.15s;
  }
  .rich-card:hover {
    box-shadow: 0 4px 16px rgba(0,0,0,0.06);
    transform: translateY(-1px);
  }

  .rc-left {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    flex: 2;
    padding-left: 0.75rem;
  }

  .rc-avatar {
    width: 40px; height: 40px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }

  .rc-info { display: flex; flex-direction: column; gap: 0.1rem; }
  .rc-name   { font-size: 0.9rem; font-weight: 700; color: var(--color-text, #111827); }
  .rc-matric { font-size: 0.7rem; font-family: ui-monospace, monospace; color: var(--color-muted, #6b7280); }
  .rc-dept   { font-size: 0.72rem; color: var(--color-muted, #6b7280); }

  .rc-center {
    display: flex;
    gap: 1.5rem;
    flex: 2;
    justify-content: center;
  }

  .rc-stat { display: flex; flex-direction: column; align-items: center; gap: 0.1rem; }
  .rcstat-val { font-size: 1.1rem; font-weight: 800; color: var(--color-text, #111827); }
  .rcstat-lbl { font-size: 0.62rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-muted, #6b7280); }

  .rc-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.35rem;
    flex: 1;
    min-width: 100px;
  }

  .rc-score { font-size: 1.375rem; font-weight: 800; line-height: 1; }

  .rc-grade-badge {
    padding: 0.2rem 0.625rem;
    border-radius: 0.375rem;
    font-size: 0.72rem;
    font-weight: 700;
  }

  .rc-bar-wrap { width: 100%; height: 5px; background: var(--color-border, #e5e7eb); border-radius: 3px; overflow: hidden; }
  .rc-bar      { height: 100%; border-radius: 3px; transition: width 0.5s ease; }
  .rc-last     { font-size: 0.68rem; color: var(--color-muted, #9ca3af); }

  /* ── Carousel stage ── */
  .carousel-stage {
    position: relative;
    width: 100%;
    height: 420px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* ── Base card — position driven by CSS vars set inline ── */
  .car-card {
    position: absolute;
    width: 280px;
    background: var(--color-surface, white);
    border: 2px solid var(--color-border, #e5e7eb);
    border-radius: 1.25rem;
    padding: 1.75rem 1.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.625rem;
    cursor: pointer;
    /* Position + scale from CSS vars — NO animation here so effects don't fight */
    transform: translateX(var(--offset-x)) scale(var(--offset-scale));
    opacity: var(--offset-opacity);
    transition:
      transform  0.45s cubic-bezier(0.16, 1, 0.3, 1),
      opacity    0.45s ease,
      border-color 0.3s ease,
      box-shadow   0.3s ease;
    will-change: transform, opacity;
  }

  /* ── CENTER card effects ── */
  .car-card.center {
    cursor: default;
    border-color: var(--g400, #4ade80);
    box-shadow:
      0 16px 48px rgba(22, 163, 74, 0.18),
      0 0 0 1px rgba(74, 222, 128, 0.3),
      0 0 24px rgba(22, 163, 74, 0.12);
    animation: pulse-ring 2.8s ease-in-out infinite;
  }

  @keyframes pulse-ring {
    0%, 100% {
      box-shadow:
        0 16px 48px rgba(22, 163, 74, 0.18),
        0 0 0 1px rgba(74, 222, 128, 0.3),
        0 0 24px rgba(22, 163, 74, 0.12);
    }
    50% {
      box-shadow:
        0 20px 56px rgba(22, 163, 74, 0.28),
        0 0 0 3px rgba(74, 222, 128, 0.2),
        0 0 40px rgba(22, 163, 74, 0.18);
    }
  }

  /* ── Avatar ── */
  .car-avatar {
    position: relative;
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: var(--avatar-bg, rgba(22,163,74,0.12));
    color: var(--avatar-color, #16a34a);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 0.25rem;
    transition: transform 0.3s ease;
  }

  /* Shimmer ring — only renders on center via parent selector */
  .car-card.center .car-avatar {
    box-shadow: 0 0 0 3px var(--avatar-ring, #4ade80),
                0 0 16px var(--avatar-ring, #4ade80);
    animation: avatar-breathe 2.5s ease-in-out infinite;
  }

  @keyframes avatar-breathe {
    0%, 100% { box-shadow: 0 0 0 3px rgba(74,222,128,0.5), 0 0 16px rgba(22,163,74,0.15); }
    50%       { box-shadow: 0 0 0 5px rgba(74,222,128,0.3), 0 0 28px rgba(22,163,74,0.25); }
  }

  /* ── Score ── */
  .car-score {
    font-size: 2rem;
    font-weight: 900;
    line-height: 1;
    color: var(--score-color, #16a34a);
    display: flex;
    align-items: baseline;
    gap: 0.375rem;
  }

  /* Pop-in when card becomes center */
  .car-card.center .car-score {
    animation: score-pop 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  @keyframes score-pop {
    from { transform: scale(0.7); opacity: 0; }
    to   { transform: scale(1);   opacity: 1; }
  }

  /* ── Grade badge ── */
  .car-grade {
    font-size: 0.85rem;
    font-weight: 800;
    width: 28px;
    height: 28px;
    border-radius: 0.5rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .car-card.center .car-grade {
    animation: badge-flip 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }

  @keyframes badge-flip {
    from { transform: rotateY(90deg) scale(0.5); opacity: 0; }
    to   { transform: rotateY(0deg)  scale(1);   opacity: 1; }
  }

  /* ── Stats row ── */
  .car-stats {
    display: flex;
    gap: 1.5rem;
    padding: 0.75rem 0;
    border-top: 1px solid var(--color-border, #e5e7eb);
    border-bottom: 1px solid var(--color-border, #e5e7eb);
    width: 100%;
    justify-content: center;
  }

  .car-card.center .car-stats {
    animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both;
  }

  @keyframes slide-up {
    from { transform: translateY(10px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }

  .car-card.center .car-stat:nth-child(1) { animation: stat-pop 0.3s 0.15s both; }
  .car-card.center .car-stat:nth-child(2) { animation: stat-pop 0.3s 0.25s both; }
  .car-card.center .car-stat:nth-child(3) { animation: stat-pop 0.3s 0.35s both; }

  @keyframes stat-pop {
    from { transform: scale(0.8) translateY(6px); opacity: 0; }
    to   { transform: scale(1)   translateY(0);   opacity: 1; }
  }

  /* ── Side cards float ── */
  .car-card.side1:first-child { animation: float-left  4s ease-in-out infinite; }
  .car-card.side1:last-child  { animation: float-right 4s ease-in-out 2s infinite; }

  @keyframes float-left  {
    0%, 100% { margin-top: 0;    }
    50%       { margin-top: -6px; }
  }
  @keyframes float-right {
    0%, 100% { margin-top: 0;    }
    50%       { margin-top: -6px; }
  }

  /* ── Progress bar ── */
  .car-progress-wrap {
    width: 100%;
    height: 4px;
    background: var(--color-border, #e5e7eb);
    border-radius: 2px;
    overflow: hidden;
  }

  .car-progress-bar {
    height: 100%;
    border-radius: 2px;
    transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .car-card.center .car-progress-bar {
    animation: bar-fill 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both;
  }

  @keyframes bar-fill {
    from { transform: scaleX(0); transform-origin: left; }
    to   { transform: scaleX(1); transform-origin: left; }
  }

  /* ── Text ── */
  .car-name   { font-size: 1.05rem; font-weight: 800; color: var(--color-text, #111827); text-align: center; }
  .car-matric { font-size: 0.72rem; font-family: ui-monospace, monospace; color: var(--color-muted, #6b7280); }
  .car-dept   { font-size: 0.75rem; color: var(--color-muted, #6b7280); text-align: center; }
  .car-level  { font-size: 0.72rem; font-weight: 600; color: var(--color-muted, #9ca3af); }
  .car-last   { font-size: 0.68rem; color: var(--color-muted, #9ca3af); }

  .car-stat   { display: flex; flex-direction: column; align-items: center; gap: 0.1rem; }
  .cstat-val  { font-size: 1.1rem; font-weight: 800; color: var(--color-text, #111827); }
  .cstat-lbl  { font-size: 0.6rem; font-weight: 600; text-transform: uppercase; color: var(--color-muted, #9ca3af); }

  /* ── Nav buttons ── */
  .car-nav {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 20;
    width: 44px; height: 44px;
    border-radius: 50%;
    border: 2px solid var(--color-border, #e5e7eb);
    background: var(--color-surface, white);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    color: var(--color-text, #374151);
    transition: all 0.2s;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }

  .car-nav:hover {
    border-color: var(--g500, #22c55e);
    color: var(--g600, #16a34a);
    box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.1), 0 4px 16px rgba(22, 163, 74, 0.15);
    transform: translateY(-50%) scale(1.08);
  }

  .car-nav:active {
    transform: translateY(-50%) scale(0.95);
  }

  .car-nav.left  { left: 0.75rem; }
  .car-nav.right { right: 0.75rem; }

  /* ── Counter ── */
  .car-counter {
    margin-top: 1.25rem;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--color-muted, #6b7280);
  }

  /* ── Swipe hint ── */
  .carousel-stage::after {
    content: '‹  swipe  ›';
    position: absolute;
    bottom: -2rem;
    left: 50%;
    transform: translateX(-50%);
    font-size: 0.62rem;
    font-weight: 700;
    color: var(--color-muted, #9ca3af);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    animation: hint-fade 4s 1.5s forwards;
    pointer-events: none;
  }

  @keyframes hint-fade {
    0%   { opacity: 0.6; }
    100% { opacity: 0; }
  }
</style>