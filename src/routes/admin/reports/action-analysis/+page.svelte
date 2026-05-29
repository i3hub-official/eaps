<script lang="ts">
  import { FileBarChart, AlertTriangle, Shield, PauseCircle, Send, TrendingUp } from 'lucide-svelte';

  let actions = $state({});

  let actionHistory = $state([]);

  function getActionIcon(action: string) {
    const icons = { warning: AlertTriangle, invigilator_alerted: Shield, exam_paused: PauseCircle, auto_submitted: Send };
    return icons[action as keyof typeof icons] || AlertTriangle;
  }
</script>

<svelte:head><title>Action Taken Analysis — MOUAU eTest</title></svelte:head>

<div class="page">
  <header class="page-header">
    <h1>Action Taken Analysis</h1>
    <p class="subtitle">Effectiveness of violation response actions and intervention outcomes</p>
  </header>

  <section class="actions-grid">
    {#each Object.entries(actions) as [action, data]}
      {@const Icon = getActionIcon(action)}
      <div class="action-card">
        <div class="action-header">
          <div class="action-icon">
            <Icon size={20} />
          </div>
          <div class="action-title">
            <span class="action-name">{action.replace('_', ' ')}</span>
            <span class="action-trend {data.trend}">{data.trend}</span>
          </div>
        </div>
        <div class="action-stats">
          <div class="action-stat">
            <span class="action-value">{data.count}</span>
            <span class="action-label">Times Used</span>
          </div>
          <div class="action-stat">
            <span class="action-value">{data.percentage}%</span>
            <span class="action-label">of Total</span>
          </div>
          <div class="action-stat">
            <span class="action-value">{data.avgResponseTime}</span>
            <span class="action-label">Avg Response</span>
          </div>
        </div>
        <div class="action-bar-container">
          <div class="action-bar" style="width: {data.percentage}%"></div>
        </div>
      </div>
    {/each}
  </section>

  <section class="table-section">
    <h3>Action Effectiveness</h3>
    <table class="data-table">
      <thead>
        <tr>
          <th>Action</th>
          <th>Total Applied</th>
          <th>Effective</th>
          <th>Ineffective</th>
          <th>Effectiveness Rate</th>
        </tr>
      </thead>
      <tbody>
        {#each actionHistory as ah}
          <tr>
            <td><span class="action-badge">{ah.action.replace('_', ' ')}</span></td>
            <td>{ah.count}</td>
            <td><span class="count effective">{ah.effective}</span></td>
            <td><span class="count ineffective">{ah.ineffective}</span></td>
            <td>
              <div class="effect-bar">
                <div class="effect-fill" style="width: {ah.effectiveness}%"></div>
                <span>{ah.effectiveness}%</span>
              </div>
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

  .actions-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
  @media (max-width: 768px) { .actions-grid { grid-template-columns: 1fr; } }

  .action-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; padding: 1.25rem; }
  .action-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; }
  .action-icon { width: 40px; height: 40px; border-radius: 0.5rem; background: rgba(22, 163, 74, 0.1); color: #16a34a; display: flex; align-items: center; justify-content: center; }
  .action-title { display: flex; flex-direction: column; }
  .action-name { font-weight: 700; color: var(--color-text); text-transform: capitalize; }
  .action-trend { font-size: 0.75rem; font-weight: 600; text-transform: capitalize; }
  .action-trend.up { color: #16a34a; }
  .action-trend.down { color: #ef4444; }
  .action-trend.stable { color: var(--color-muted); }

  .action-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 1rem; }
  .action-stat { display: flex; flex-direction: column; }
  .action-value { font-size: 1.125rem; font-weight: 700; color: var(--color-text); }
  .action-label { font-size: 0.7rem; color: var(--color-muted); }

  .action-bar-container { height: 6px; background: var(--color-bg); border-radius: 3px; overflow: hidden; }
  .action-bar { height: 100%; background: #16a34a; border-radius: 3px; transition: width 0.5s ease; }

  .table-section { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; padding: 1.5rem; }
  .table-section h3 { font-size: 1rem; font-weight: 600; color: var(--color-text); margin: 0 0 1.25rem 0; }
  .data-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  .data-table th { text-align: left; padding: 0.875rem 1rem; color: var(--color-muted); font-weight: 500; border-bottom: 1px solid var(--color-border); background: var(--color-bg); white-space: nowrap; }
  .data-table td { padding: 1rem; border-bottom: 1px solid var(--color-border); color: var(--color-text); }
  .data-table tr:last-child td { border-bottom: none; }
  .data-table tr:hover td { background: var(--color-surface-hover); }

  .action-badge { padding: 0.25rem 0.5rem; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 600; background: var(--color-bg); color: var(--color-text); text-transform: capitalize; }
  .count { font-weight: 700; }
  .count.effective { color: #16a34a; }
  .count.ineffective { color: #ef4444; }

  .effect-bar { display: flex; align-items: center; gap: 0.5rem; }
  .effect-fill { height: 8px; background: linear-gradient(90deg, #16a34a, #22c55e); border-radius: 4px; min-width: 20px; }
  .effect-bar span { font-size: 0.8rem; font-weight: 700; color: var(--color-text); min-width: 40px; }
</style>