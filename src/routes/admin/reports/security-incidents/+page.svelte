<script lang="ts">
  import { Shield, AlertTriangle, EyeOff, Clock, TrendingUp, UserX, Monitor } from 'lucide-svelte';

  let incidents = $state([
    { id: 'INC-001', type: 'multiple_faces', description: 'Multiple faces detected during exam session', severity: 'high', exam: 'PHY 102', student: 'Fatima Bello', detectedAt: '2026-05-22 11:20', status: 'resolved', action: 'invigilator_alerted' },
    { id: 'INC-002', type: 'copy_attempt', description: 'Copy-paste attempt detected 3 times', severity: 'critical', exam: 'MTH 101', student: 'Ibrahim Musa', detectedAt: '2026-05-18 14:45', status: 'resolved', action: 'exam_paused' },
    { id: 'INC-003', type: 'devtools_open', description: 'Browser developer tools opened during exam', severity: 'high', exam: 'CSC 201', student: 'Unknown', detectedAt: '2026-05-20 09:15', status: 'investigating', action: 'warning' },
    { id: 'INC-004', type: 'screenshot_attempt', description: 'Screenshot hotkey detected', severity: 'medium', exam: 'CHM 201', student: 'Chinedu Obi', detectedAt: '2026-05-22 10:30', status: 'resolved', action: 'warning' },
    { id: 'INC-005', type: 'no_face_detected', description: 'Face not visible for extended period', severity: 'high', exam: 'ENG 101', student: 'Ngozi Adeleke', detectedAt: '2026-05-21 13:45', status: 'resolved', action: 'invigilator_alerted' },
  ]);

  function getSeverityColor(s: string) {
    return { low: 'sev-low', medium: 'sev-medium', high: 'sev-high', critical: 'sev-critical' }[s] || 'sev-medium';
  }
  function getStatusColor(s: string) {
    return { resolved: 'status-resolved', investigating: 'status-investigating', open: 'status-open' }[s] || 'status-open';
  }
</script>

<svelte:head><title>Security Incidents — MOUAU eTest</title></svelte:head>

<div class="page">
  <header class="page-header">
    <h1>Security Incidents</h1>
    <p class="subtitle">Detailed security event log with incident classification</p>
  </header>

  <section class="table-section">
    <table class="data-table">
      <thead>
        <tr>
          <th>Incident ID</th>
          <th>Type</th>
          <th>Description</th>
          <th>Severity</th>
          <th>Exam</th>
          <th>Student</th>
          <th>Detected</th>
          <th>Status</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {#each incidents as inc}
          <tr>
            <td><span class="incident-id">{inc.id}</span></td>
            <td><span class="type-badge">{inc.type.replace('_', ' ')}</span></td>
            <td class="desc-cell">{inc.description}</td>
            <td><span class="severity-badge {getSeverityColor(inc.severity)}">{inc.severity}</span></td>
            <td>{inc.exam}</td>
            <td>{inc.student}</td>
            <td class="time-cell">{inc.detectedAt}</td>
            <td><span class="status-badge {getStatusColor(inc.status)}">{inc.status}</span></td>
            <td><span class="action-badge">{inc.action.replace('_', ' ')}</span></td>
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

  .table-section { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; overflow: hidden; }
  .data-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  .data-table th { text-align: left; padding: 0.875rem 1rem; color: var(--color-muted); font-weight: 500; border-bottom: 1px solid var(--color-border); background: var(--color-bg); white-space: nowrap; }
  .data-table td { padding: 1rem; border-bottom: 1px solid var(--color-border); color: var(--color-text); }
  .data-table tr:last-child td { border-bottom: none; }
  .data-table tr:hover td { background: var(--color-surface-hover); }

  .incident-id { font-family: monospace; font-size: 0.8rem; color: var(--color-muted); background: var(--color-bg); padding: 0.25rem 0.5rem; border-radius: 0.25rem; }
  .type-badge { padding: 0.25rem 0.5rem; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 600; background: var(--color-bg); color: var(--color-text); text-transform: capitalize; }
  .desc-cell { max-width: 300px; font-size: 0.8rem; line-height: 1.4; }

  .severity-badge { padding: 0.25rem 0.5rem; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 600; text-transform: capitalize; }
  .sev-low { background: rgba(22, 163, 74, 0.1); color: #16a34a; }
  .sev-medium { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
  .sev-high { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
  .sev-critical { background: rgba(220, 38, 38, 0.15); color: #dc2626; }

  .status-badge { padding: 0.25rem 0.5rem; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 600; text-transform: capitalize; }
  .status-resolved { background: rgba(22, 163, 74, 0.1); color: #16a34a; }
  .status-investigating { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
  .status-open { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

  .action-badge { padding: 0.25rem 0.5rem; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 600; background: var(--color-bg); color: var(--color-text); text-transform: capitalize; }
  .time-cell { font-size: 0.8rem; color: var(--color-muted); font-family: monospace; }
</style>