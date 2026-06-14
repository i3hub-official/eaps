<script lang="ts">
  import { BookMarked, Users, TrendingUp, TrendingDown, GraduationCap, Award, Search } from '@lucide/svelte';

  let courses = $state([]);

  let searchQuery = $state('');
  let filtered = $derived(courses.filter(c => c.code.toLowerCase().includes(searchQuery.toLowerCase()) || c.title.toLowerCase().includes(searchQuery.toLowerCase()) || c.dept.toLowerCase().includes(searchQuery.toLowerCase())));
</script>

<svelte:head><title>Course Enrollment — MOUAU eTest</title></svelte:head>

<div class="page">
  <header class="page-header">
    <h1>Course Enrollment</h1>
    <p class="subtitle">Registration trends, capacity utilization, and enrollment analytics</p>
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
          <th>Course</th>
          <th>Department</th>
          <th>Session</th>
          <th>Semester</th>
          <th>Enrolled</th>
          <th>Capacity</th>
          <th>Utilization</th>
          <th>Trend</th>
        </tr>
      </thead>
      <tbody>
        {#each filtered as course}
          {@const utilization = ((course.enrolled / course.capacity) * 100).toFixed(1)}
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
            <td>{course.session}</td>
            <td>{course.semester}</td>
            <td>{course.enrolled}</td>
            <td>{course.capacity}</td>
            <td>
              <div class="util-bar">
                <div class="util-fill" style="width: {utilization}%" class:high={parseFloat(utilization) >= 80} class:medium={parseFloat(utilization) >= 50 && parseFloat(utilization) < 80} class:low={parseFloat(utilization) < 50}></div>
                <span>{utilization}%</span>
              </div>
            </td>
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

  .util-bar { display: flex; align-items: center; gap: 0.5rem; }
  .util-fill { height: 8px; border-radius: 4px; min-width: 20px; transition: width 0.5s ease; }
  .util-fill.high { background: #3b82f6; }
  .util-fill.medium { background: #f59e0b; }
  .util-fill.low { background: #ef4444; }
  .util-bar span { font-size: 0.8rem; font-weight: 600; color: var(--color-text); min-width: 40px; }

  .trend-icon { display: flex; align-items: center; justify-content: center; }
  .trend-icon.up { color: #16a34a; }
  .trend-icon.down { color: #ef4444; transform: rotate(180deg); }
  .trend-icon.stable { color: var(--color-muted); }
</style>