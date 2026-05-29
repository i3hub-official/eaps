<script lang="ts">
  import { Calendar, Clock, CheckCircle2, AlertTriangle, XCircle, Timer, Users, BookOpen } from 'lucide-svelte';

  let exams = $state([
    { id: 'E001', title: 'CSC 201 — Introduction to Programming', date: '2026-05-25', start: '09:00', end: '10:00', duration: 60, status: 'scheduled', students: 145, invigilators: 3, room: 'Online' },
    { id: 'E002', title: 'MTH 101 — Calculus I', date: '2026-05-26', start: '10:30', end: '12:00', duration: 90, status: 'scheduled', students: 203, invigilators: 4, room: 'Online' },
    { id: 'E003', title: 'PHY 102 — General Physics', date: '2026-05-24', start: '14:00', end: '15:15', duration: 75, status: 'active', students: 178, invigilators: 3, room: 'Online' },
    { id: 'E004', title: 'CHM 201 — Organic Chemistry', date: '2026-05-23', start: '09:00', end: '10:00', duration: 60, status: 'completed', students: 134, invigilators: 2, room: 'Online' },
    { id: 'E005', title: 'ENG 101 — Use of English', date: '2026-05-27', start: '08:00', end: '08:45', duration: 45, status: 'scheduled', students: 312, invigilators: 5, room: 'Online' },
    { id: 'E006', title: 'BIO 101 — General Biology', date: '2026-05-22', start: '11:00', end: '12:00', duration: 60, status: 'completed', students: 267, invigilators: 4, room: 'Online' },
  ]);

  let summary = $state({ scheduled: 3, active: 1, completed: 2, cancelled: 0, totalStudents: 1239 });

  function getStatusColor(s: string) {
    return { scheduled: 'status-scheduled', active: 'status-active', completed: 'status-completed', cancelled: 'status-cancelled' }[s] || 'status-scheduled';
  }
</script>

<svelte:head><title>Exam Scheduling — MOUAU eTest</title></svelte:head>

<div class="page">
  <header class="page-header">
    <h1>Exam Scheduling</h1>
    <p class="subtitle">Schedule overview, upcoming exams, and status tracking</p>
  </header>

  <section class="summary-row">
    <div class="summary-card">
      <Calendar size={20} />
      <div>
        <span class="summary-value">{summary.scheduled}</span>
        <span class="summary-label">Scheduled</span>
      </div>
    </div>
    <div class="summary-card active">
      <Clock size={20} />
      <div>
        <span class="summary-value">{summary.active}</span>
        <span class="summary-label">Active Now</span>
      </div>
    </div>
    <div class="summary-card completed">
      <CheckCircle2 size={20} />
      <div>
        <span class="summary-value">{summary.completed}</span>
        <span class="summary-label">Completed</span>
      </div>
    </div>
    <div class="summary-card">
      <Users size={20} />
      <div>
        <span class="summary-value">{summary.totalStudents.toLocaleString()}</span>
        <span class="summary-label">Total Students</span>
      </div>
    </div>
  </section>

  <section class="table-section">
    <table class="data-table">
      <thead>
        <tr>
          <th>Exam</th>
          <th>Date</th>
          <th>Time</th>
          <th>Duration</th>
          <th>Students</th>
          <th>Invigilators</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {#each exams as exam}
          <tr>
            <td>
              <div class="exam-cell">
                <div class="exam-icon"><BookOpen size={16} /></div>
                <span class="exam-title">{exam.title}</span>
              </div>
            </td>
            <td>{exam.date}</td>
            <td>{exam.start} — {exam.end}</td>
            <td>{exam.duration} min</td>
            <td>{exam.students}</td>
            <td>{exam.invigilators}</td>
            <td><span class="status-badge {getStatusColor(exam.status)}">{exam.status}</span></td>
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

  .summary-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; padding: 1rem; display: flex; align-items: center; gap: 0.75rem; color: #3b82f6; }
  .summary-card.active { color: #f59e0b; }
  .summary-card.completed { color: #16a34a; }
  .summary-card div { display: flex; flex-direction: column; }
  .summary-value { font-size: 1.25rem; font-weight: 700; color: var(--color-text); }
  .summary-label { font-size: 0.75rem; color: var(--color-muted); }

  .table-section { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; overflow: hidden; }
  .data-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  .data-table th { text-align: left; padding: 0.875rem 1rem; color: var(--color-muted); font-weight: 500; border-bottom: 1px solid var(--color-border); background: var(--color-bg); white-space: nowrap; }
  .data-table td { padding: 1rem; border-bottom: 1px solid var(--color-border); color: var(--color-text); }
  .data-table tr:last-child td { border-bottom: none; }
  .data-table tr:hover td { background: var(--color-surface-hover); }

  .exam-cell { display: flex; align-items: center; gap: 0.75rem; }
  .exam-icon { width: 32px; height: 32px; border-radius: 0.5rem; background: rgba(59, 130, 246, 0.1); color: #3b82f6; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .exam-title { font-weight: 600; color: var(--color-text); }

  .status-badge { padding: 0.25rem 0.625rem; border-radius: 2rem; font-size: 0.75rem; font-weight: 600; text-transform: capitalize; }
  .status-scheduled { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
  .status-active { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
  .status-completed { background: rgba(22, 163, 74, 0.1); color: #16a34a; }
  .status-cancelled { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
</style>