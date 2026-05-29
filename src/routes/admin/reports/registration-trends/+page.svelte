<script lang="ts">
  import { UserPlus, Users, TrendingUp, TrendingDown, GraduationCap, BookOpen, ShieldCheck, Calendar } from 'lucide-svelte';

  let monthlyData = $state([
    { month: 'Oct 2025', newUsers: 234, students: 198, lecturers: 18, invigilators: 12, total: 1247 },
    { month: 'Nov 2025', newUsers: 189, students: 156, lecturers: 15, invigilators: 8, total: 1436 },
    { month: 'Dec 2025', newUsers: 145, students: 123, lecturers: 12, invigilators: 5, total: 1581 },
    { month: 'Jan 2026', newUsers: 312, students: 267, lecturers: 22, invigilators: 15, total: 1893 },
    { month: 'Feb 2026', newUsers: 278, students: 234, lecturers: 20, invigilators: 12, total: 2171 },
    { month: 'Mar 2026', newUsers: 198, students: 167, lecturers: 14, invigilators: 9, total: 2369 },
    { month: 'Apr 2026', newUsers: 156, students: 134, lecturers: 11, invigilators: 7, total: 2525 },
    { month: 'May 2026', newUsers: 89, students: 78, lecturers: 6, invigilators: 4, total: 2614 },
  ]);

  let courseRegistrations = $state([
    { session: '2024/2025', semester: 1, count: 1245 },
    { session: '2024/2025', semester: 2, count: 1189 },
    { session: '2025/2026', semester: 1, count: 1345 },
    { session: '2025/2026', semester: 2, count: 1289 },
  ]);
</script>

<svelte:head><title>Registration Trends — MOUAU eTest</title></svelte:head>

<div class="page">
  <header class="page-header">
    <h1>Registration Trends</h1>
    <p class="subtitle">User registration growth and course enrollment patterns over time</p>
  </header>

  <section class="trend-chart-section">
    <h3><Calendar size={16} /> Monthly User Registration</h3>
    <div class="trend-chart">
      {#each monthlyData as month}
        <div class="trend-bar-group">
          <div class="trend-bar-stack">
            <div class="trend-segment students" style="height: {(month.students / 300) * 100}%"></div>
            <div class="trend-segment lecturers" style="height: {(month.lecturers / 300) * 100}%"></div>
            <div class="trend-segment invigilators" style="height: {(month.invigilators / 300) * 100}%"></div>
          </div>
          <span class="trend-month">{month.month}</span>
          <span class="trend-total">{month.newUsers}</span>
        </div>
      {/each}
    </div>
    <div class="trend-legend">
      <span><span class="legend-dot students"></span> Students</span>
      <span><span class="legend-dot lecturers"></span> Lecturers</span>
      <span><span class="legend-dot invigilators"></span> Invigilators</span>
    </div>
  </section>

  <section class="course-reg-section">
    <h3><BookOpen size={16} /> Course Registration by Session</h3>
    <div class="reg-grid">
      {#each courseRegistrations as reg}
        <div class="reg-card">
          <div class="reg-header">
            <span class="reg-session">{reg.session}</span>
            <span class="reg-semester">Semester {reg.semester}</span>
          </div>
          <div class="reg-count">{reg.count.toLocaleString()}</div>
          <div class="reg-label">registrations</div>
          <div class="reg-bar-container">
            <div class="reg-bar" style="width: {(reg.count / 1345) * 100}%"></div>
          </div>
        </div>
      {/each}
    </div>
  </section>
</div>

<style>
  .page { max-width: 1200px; }
  .page-header { margin-bottom: 1.5rem; }
  .page-header h1 { font-size: 1.5rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .subtitle { color: var(--color-muted); font-size: 0.9rem; margin-top: 0.25rem; }

  .trend-chart-section { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; padding: 1.5rem; margin-bottom: 1.5rem; }
  .trend-chart-section h3 { font-size: 1rem; font-weight: 600; color: var(--color-text); margin: 0 0 1.25rem 0; display: flex; align-items: center; gap: 0.5rem; }

  .trend-chart { display: flex; align-items: flex-end; gap: 1rem; height: 200px; padding-bottom: 2.5rem; position: relative; }
  .trend-bar-group { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.375rem; position: relative; }
  .trend-bar-stack { width: 100%; display: flex; flex-direction: column-reverse; align-items: center; border-radius: 0.25rem; overflow: hidden; }
  .trend-segment { width: 100%; min-height: 2px; transition: height 0.5s ease; }
  .trend-segment.students { background: #16a34a; }
  .trend-segment.lecturers { background: #3b82f6; }
  .trend-segment.invigilators { background: #f59e0b; }
  .trend-month { font-size: 0.7rem; color: var(--color-muted); position: absolute; bottom: -1.75rem; white-space: nowrap; }
  .trend-total { font-size: 0.75rem; font-weight: 700; color: var(--color-text); position: absolute; top: -1.25rem; }

  .trend-legend { display: flex; gap: 1.5rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--color-border); }
  .trend-legend span { display: flex; align-items: center; gap: 0.375rem; font-size: 0.8rem; color: var(--color-text); }
  .legend-dot { width: 10px; height: 10px; border-radius: 50%; }
  .legend-dot.students { background: #16a34a; }
  .legend-dot.lecturers { background: #3b82f6; }
  .legend-dot.invigilators { background: #f59e0b; }

  .course-reg-section { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; padding: 1.5rem; }
  .course-reg-section h3 { font-size: 1rem; font-weight: 600; color: var(--color-text); margin: 0 0 1.25rem 0; display: flex; align-items: center; gap: 0.5rem; }

  .reg-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
  @media (max-width: 768px) { .reg-grid { grid-template-columns: repeat(2, 1fr); } }

  .reg-card { padding: 1.25rem; background: var(--color-bg); border-radius: 0.5rem; border: 1px solid var(--color-border); }
  .reg-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
  .reg-session { font-weight: 700; color: var(--color-text); font-size: 0.875rem; }
  .reg-semester { font-size: 0.75rem; color: var(--color-muted); background: var(--color-surface); padding: 0.125rem 0.375rem; border-radius: 0.25rem; }
  .reg-count { font-size: 1.5rem; font-weight: 700; color: #16a34a; }
  .reg-label { font-size: 0.75rem; color: var(--color-muted); margin-bottom: 0.75rem; }
  .reg-bar-container { height: 6px; background: var(--color-surface); border-radius: 3px; overflow: hidden; }
  .reg-bar { height: 100%; background: #16a34a; border-radius: 3px; transition: width 0.5s ease; }
</style>