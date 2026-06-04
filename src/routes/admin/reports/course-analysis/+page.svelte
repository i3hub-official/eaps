<script lang="ts">
  import { BookMarked, Search, ArrowUpDown, TrendingUp, Users, Award, Clock, AlertTriangle } from 'lucide-svelte';

  let courses = $state([]);

  let searchQuery = $state('');
  let filtered = $derived(courses.filter(c => c.code.toLowerCase().includes(searchQuery.toLowerCase()) || c.title.toLowerCase().includes(searchQuery.toLowerCase())));

  function getDifficultyColor(d: string) {
    return { easy: 'diff-easy', medium: 'diff-medium', hard: 'diff-hard' }[d] || 'diff-medium';
  }
</script>

<svelte:head><title>Course Analysis — MOUAU eTest</title></svelte:head>

<div class="page">
  <header class="page-header">
    <h1>Course Analysis</h1>
    <p class="subtitle">Performance metrics by course, difficulty assessment, and enrollment trends</p>
  </header>

  <section class="filters-bar">
    <div class="search-box">
      <Search size={16} />
      <input type="text" placeholder="Search courses..." bind:value={searchQuery} />
    </div>
  </section>

  <section class="table-section">
    <table class="data-table">
      <thead>
        <tr>
          <th>Course <ArrowUpDown size={14} /></th>
          <th>Department</th>
          <th>Students</th>
          <th>Exams</th>
          <th>Avg Score</th>
          <th>Pass Rate</th>
          <th>Avg Time</th>
          <th>Difficulty</th>
          <th>Trend</th>
        </tr>
      </thead>
      <tbody>
        {#each filtered as course}
          <tr>
            <td>
              <div class="course-cell">
                <div class="course-icon"><BookMarked size={16} /></div>
                <div>
                  <span class="course-code">{course.code}</span>
                  <span class="course-title">{course.title}</span>
                </div>
              </div>
            </td>
            <td>{course.dept}</td>
            <td>{course.students}</td>
            <td>{course.exams}</td>
            <td>
              <span class="score-badge" class:high={course.avgScore >= 70} class:medium={course.avgScore >= 50 && course.avgScore < 70} class:low={course.avgScore < 50}>
                {course.avgScore}%
              </span>
            </td>
            <td>
              <div class="pass-bar">
                <div class="pass-fill" style="width: {course.passRate}%"></div>
                <span>{course.passRate}%</span>
              </div>
            </td>
            <td>{course.avgTime} min</td>
            <td><span class="diff-badge {getDifficultyColor(course.difficulty)}">{course.difficulty}</span></td>
            <td>
              <span class="trend-icon" class:up={course.trend === 'up'} class:down={course.trend === 'down'} class:stable={course.trend === 'stable'}>
                <TrendingUp size={16} />
              </span>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </section>
</div>

<style>
  .page { max-width: 1200px; }
  .page-header { margin-bottom: 1.5rem; }
  .page-header h1 { font-size: 1.5rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .subtitle { color: var(--color-muted); font-size: 0.9rem; margin-top: 0.25rem; }

  .filters-bar { display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; }
  .search-box { display: flex; align-items: center; gap: 0.5rem; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.5rem; padding: 0.5rem 0.75rem; flex: 1; min-width: 200px; }
  .search-box input { border: none; background: none; outline: none; color: var(--color-text); font-size: 0.875rem; width: 100%; }
  .search-box :global(svg) { color: var(--color-muted); flex-shrink: 0; }

  .table-section { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; overflow: hidden; }
  .data-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  .data-table th { text-align: left; padding: 0.875rem 1rem; color: var(--color-muted); font-weight: 500; border-bottom: 1px solid var(--color-border); background: var(--color-bg); white-space: nowrap; }
  .data-table td { padding: 1rem; border-bottom: 1px solid var(--color-border); color: var(--color-text); }
  .data-table tr:last-child td { border-bottom: none; }
  .data-table tr:hover td { background: var(--color-surface-hover); }

  .course-cell { display: flex; align-items: center; gap: 0.75rem; }
  .course-icon { width: 32px; height: 32px; border-radius: 0.5rem; background: rgba(59, 130, 246, 0.1); color: #3b82f6; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .course-code { font-weight: 700; color: var(--color-text); display: block; }
  .course-title { font-size: 0.75rem; color: var(--color-muted); }

  .score-badge { padding: 0.25rem 0.5rem; border-radius: 0.375rem; font-size: 0.8rem; font-weight: 600; }
  .score-badge.high { background: rgba(22, 163, 74, 0.1); color: #16a34a; }
  .score-badge.medium { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
  .score-badge.low { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

  .pass-bar { display: flex; align-items: center; gap: 0.5rem; }
  .pass-fill { height: 6px; background: #3b82f6; border-radius: 3px; min-width: 20px; }
  .pass-bar span { font-size: 0.8rem; font-weight: 600; color: var(--color-text); min-width: 36px; }

  .diff-badge { padding: 0.25rem 0.5rem; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 600; text-transform: capitalize; }
  .diff-easy { background: rgba(22, 163, 74, 0.1); color: #16a34a; }
  .diff-medium { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
  .diff-hard { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

  .trend-icon { display: flex; align-items: center; justify-content: center; }
  .trend-icon.up { color: #16a34a; }
  .trend-icon.down { color: #ef4444; transform: rotate(180deg); }
  .trend-icon.stable { color: var(--color-muted); }
</style>