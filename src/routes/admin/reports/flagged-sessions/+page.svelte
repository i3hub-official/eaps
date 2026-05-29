<script lang="ts">
  import { EyeOff, Shield, AlertTriangle, Clock, UserX, CheckCircle2 } from 'lucide-svelte';

  let sessions = $state([
    { id: 'S001', student: 'Ibrahim Musa', matric: 'MOUAU/2022/112', exam: 'MTH 101', flags: 8, status: 'force_submitted', invigilator: 'Dr. Adeyemi', duration: '45 min', score: 32 },
    { id: 'S002', student: 'Oluwaseun Adeyemi', matric: 'MOUAU/2022/156', exam: 'PHY 102', flags: 15, status: 'flagged', invigilator: 'Prof. Okonkwo', duration: '62 min', score: 28 },
    { id: 'S003', student: 'Fatima Bello', matric: 'MOUAU/2023/089', exam: 'CHM 201', flags: 3, status: 'submitted', invigilator: 'Dr. Nwosu', duration: '55 min', score: 68 },
    { id: 'S004', student: 'Chinedu Obi', matric: 'MOUAU/2023/234', exam: 'CSC 201', flags: 6, status: 'flagged', invigilator: 'Prof. Ibrahim', duration: '38 min', score: 45 },
  ]);

  let summary = $state({ total: 23, forceSubmitted: 8, underReview: 12, cleared: 3 });

  function getStatusColor(s: string) {
    return { force_submitted: 'status-force', flagged: 'status-flagged', submitted: 'status-submitted' }[s] || 'status-flagged';
  }
</script>

<svelte:head><title>Flagged Sessions — MOUAU eTest</title></svelte:head>

<div class="page">
  <header class="page-header">
    <h1>Flagged Sessions</h1>
    <p class="subtitle">Exam sessions with multiple violations requiring review</p>
  </header>

  <section class="summary-row">
    <div class="summary-card alert">
      <EyeOff size={20} />
      <div>
        <span class="summary-value">{summary.total}</span>
        <span class="summary-label">Flagged Sessions</span>
      </div>
    </div>
    <div class="summary-card critical">
      <UserX size={20} />
      <div>
        <span class="summary-value">{summary.forceSubmitted}</span>
        <span class="summary-label">Force Submitted</span>
      </div>
    </div>
    <div class="summary-card">
      <AlertTriangle size={20} />
      <div>
        <span class="summary-value">{summary.underReview}</span>
        <span class="summary-label">Under Review</span>
      </div>
    </div>
    <div class="summary-card success">
      <CheckCircle2 size={20} />
      <div>
        <span class="summary-value">{summary.cleared}</span>
        <span class="summary-label">Cleared</span>
      </div>
    </div>
  </section>

  <section class="table-section">
    <table class="data-table">
      <thead>
        <tr>
          <th>Session ID</th>
          <th>Student</th>
          <th>Exam</th>
          <th>Flags</th>
          <th>Status</th>
          <th>Invigilator</th>
          <th>Duration</th>
          <th>Score</th>
        </tr>
      </thead>
      <tbody>
        {#each sessions as s}
          <tr>
            <td><span class="session-id">{s.id}</span></td>
            <td>
              <div class="student-cell">
                <span class="student-name">{s.student}</span>
                <span class="student-matric">{s.matric}</span>
              </div>
            </td>
            <td>{s.exam}</td>
            <td>
              <span class="flag-count" class:critical={s.flags > 10} class:high={s.flags > 5 && s.flags <= 10}>
                <AlertTriangle size={12} />
                {s.flags}
              </span>
            </td>
            <td><span class="status-badge {getStatusColor(s.status)}">{s.status.replace('_', ' ')}</span></td>
            <td>{s.invigilator}</td>
            <td>{s.duration}</td>
            <td><span class="score" class:fail={s.score < 40}>{s.score}%</span></td>
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

  .summary-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
  @media (max-width: 768px) { .summary-row { grid-template-columns: repeat(2, 1fr); } }

  .summary-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; padding: 1rem; display: flex; align-items: center; gap: 0.75rem; color: #f59e0b; }
  .summary-card.alert { color: #ef4444; }
  .summary-card.critical { color: #dc2626; }
  .summary-card.success { color: #16a34a; }
  .summary-card div { display: flex; flex-direction: column; }
  .summary-value { font-size: 1.25rem; font-weight: 700; color: var(--color-text); }
  .summary-label { font-size: 0.75rem; color: var(--color-muted); }

  .table-section { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; overflow: hidden; }
  .data-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  .data-table th { text-align: left; padding: 0.875rem 1rem; color: var(--color-muted); font-weight: 500; border-bottom: 1px solid var(--color-border); background: var(--color-bg); white-space: nowrap; }
  .data-table td { padding: 1rem; border-bottom: 1px solid var(--color-border); color: var(--color-text); }
  .data-table tr:last-child td { border-bottom: none; }
  .data-table tr:hover td { background: var(--color-surface-hover); }

  .session-id { font-family: monospace; font-size: 0.8rem; color: var(--color-muted); background: var(--color-bg); padding: 0.25rem 0.5rem; border-radius: 0.25rem; }

  .student-cell { display: flex; flex-direction: column; }
  .student-name { font-weight: 600; color: var(--color-text); }
  .student-matric { font-size: 0.75rem; color: var(--color-muted); }

  .flag-count { display: flex; align-items: center; gap: 0.25rem; font-size: 0.8rem; font-weight: 700; padding: 0.25rem 0.5rem; border-radius: 0.375rem; background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
  .flag-count.high { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
  .flag-count.critical { background: rgba(220, 38, 38, 0.15); color: #dc2626; }

  .status-badge { padding: 0.25rem 0.625rem; border-radius: 2rem; font-size: 0.75rem; font-weight: 600; text-transform: capitalize; }
  .status-force { background: rgba(220, 38, 38, 0.15); color: #dc2626; }
  .status-flagged { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
  .status-submitted { background: rgba(22, 163, 74, 0.1); color: #16a34a; }

  .score { font-weight: 700; }
  .score.fail { color: #ef4444; }
</style>