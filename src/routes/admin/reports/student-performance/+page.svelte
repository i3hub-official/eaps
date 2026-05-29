<script lang="ts">
  import {
    TrendingUp, Search, Filter, ArrowUpDown, Award, Clock,
    AlertTriangle, GraduationCap, ChevronDown
  } from 'lucide-svelte';

  let students = $state([
    { id: '1', name: 'Chukwuemeka Okafor', matric: 'MOUAU/2023/001', dept: 'Computer Science', level: 200, examsTaken: 5, avgScore: 78.5, highest: 92, lowest: 65, passRate: 100, violations: 0, trend: 'up' },
    { id: '2', name: 'Ngozi Adeleke', matric: 'MOUAU/2023/045', dept: 'Mathematics', level: 200, examsTaken: 5, avgScore: 84.2, highest: 95, lowest: 72, passRate: 100, violations: 1, trend: 'up' },
    { id: '3', name: 'Ibrahim Musa', matric: 'MOUAU/2022/112', dept: 'Physics', level: 300, examsTaken: 4, avgScore: 52.3, highest: 68, lowest: 41, passRate: 50, violations: 8, trend: 'down' },
    { id: '4', name: 'Fatima Bello', matric: 'MOUAU/2023/089', dept: 'Chemistry', level: 200, examsTaken: 5, avgScore: 71.8, highest: 85, lowest: 60, passRate: 80, violations: 2, trend: 'up' },
    { id: '5', name: 'Oluwaseun Adeyemi', matric: 'MOUAU/2022/156', dept: 'Engineering', level: 300, examsTaken: 3, avgScore: 45.1, highest: 58, lowest: 32, passRate: 33, violations: 15, trend: 'down' },
  ]);

  let searchQuery = $state('');
  let levelFilter = $state('all');

  let filtered = $derived(
    students.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.matric.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLevel = levelFilter === 'all' || s.level.toString() === levelFilter;
      return matchesSearch && matchesLevel;
    })
  );
</script>

<svelte:head>
  <title>Student Performance — MOUAU eTest</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <h1>Student Performance</h1>
    <p class="subtitle">Individual student analytics, strengths, and weaknesses</p>
  </header>

  <section class="filters-bar">
    <div class="search-box">
      <Search size={16} />
      <input type="text" placeholder="Search by name or matric..." bind:value={searchQuery} />
    </div>
    <select bind:value={levelFilter} class="filter-select">
      <option value="all">All Levels</option>
      <option value="100">100 Level</option>
      <option value="200">200 Level</option>
      <option value="300">300 Level</option>
      <option value="400">400 Level</option>
      <option value="500">500 Level</option>
    </select>
  </section>

  <section class="table-section">
    <table class="data-table">
      <thead>
        <tr>
          <th>Student <ArrowUpDown size={14} /></th>
          <th>Department</th>
          <th>Level</th>
          <th>Exams</th>
          <th>Avg Score</th>
          <th>Highest</th>
          <th>Lowest</th>
          <th>Pass Rate</th>
          <th>Violations</th>
          <th>Trend</th>
        </tr>
      </thead>
      <tbody>
        {#each filtered as student}
          <tr>
            <td>
              <div class="student-cell">
                <div class="student-avatar">{student.name.charAt(0)}</div>
                <div>
                  <span class="student-name">{student.name}</span>
                  <span class="student-matric">{student.matric}</span>
                </div>
              </div>
            </td>
            <td>{student.dept}</td>
            <td>{student.level}L</td>
            <td>{student.examsTaken}</td>
            <td>
              <span class="score-badge" class:high={student.avgScore >= 70} class:medium={student.avgScore >= 50 && student.avgScore < 70} class:low={student.avgScore < 50}>
                {student.avgScore}%
              </span>
            </td>
            <td><span class="score-high">{student.highest}%</span></td>
            <td><span class="score-low">{student.lowest}%</span></td>
            <td>
              <div class="pass-bar">
                <div class="pass-fill" style="width: {student.passRate}%"></div>
                <span>{student.passRate}%</span>
              </div>
            </td>
            <td>
              <span class="violation-count" class:alert={student.violations > 5}>
                <AlertTriangle size={12} />
                {student.violations}
              </span>
            </td>
            <td>
              <span class="trend-icon" class:up={student.trend === 'up'} class:down={student.trend === 'down'}>
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
  .search-box {
    display: flex; align-items: center; gap: 0.5rem;
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.5rem; padding: 0.5rem 0.75rem; flex: 1; min-width: 200px;
  }
  .search-box input { border: none; background: none; outline: none; color: var(--color-text); font-size: 0.875rem; width: 100%; }
  .search-box :global(svg) { color: var(--color-muted); flex-shrink: 0; }
  .filter-select {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.5rem; padding: 0.5rem 0.75rem; color: var(--color-text);
    font-size: 0.875rem; cursor: pointer;
  }

  .table-section { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; overflow: hidden; }
  .data-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  .data-table th { text-align: left; padding: 0.875rem 1rem; color: var(--color-muted); font-weight: 500; border-bottom: 1px solid var(--color-border); background: var(--color-bg); white-space: nowrap; }
  .data-table td { padding: 1rem; border-bottom: 1px solid var(--color-border); color: var(--color-text); }
  .data-table tr:last-child td { border-bottom: none; }
  .data-table tr:hover td { background: var(--color-surface-hover); }

  .student-cell { display: flex; align-items: center; gap: 0.75rem; }
  .student-avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #16a34a, #15803d); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem; color: white; flex-shrink: 0; }
  .student-name { font-weight: 600; color: var(--color-text); display: block; }
  .student-matric { font-size: 0.75rem; color: var(--color-muted); }

  .score-badge { padding: 0.25rem 0.5rem; border-radius: 0.375rem; font-size: 0.8rem; font-weight: 600; }
  .score-badge.high { background: rgba(22, 163, 74, 0.1); color: #16a34a; }
  .score-badge.medium { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
  .score-badge.low { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
  .score-high { color: #16a34a; font-weight: 600; }
  .score-low { color: #ef4444; font-weight: 600; }

  .pass-bar { display: flex; align-items: center; gap: 0.5rem; }
  .pass-fill { height: 6px; background: #16a34a; border-radius: 3px; min-width: 20px; }
  .pass-bar span { font-size: 0.8rem; font-weight: 600; color: var(--color-text); min-width: 36px; }

  .violation-count { display: flex; align-items: center; gap: 0.25rem; font-size: 0.8rem; font-weight: 600; color: var(--color-muted); }
  .violation-count.alert { color: #ef4444; }

  .trend-icon { display: flex; align-items: center; justify-content: center; }
  .trend-icon.up { color: #16a34a; }
  .trend-icon.down { color: #ef4444; transform: rotate(180deg); }
</style>