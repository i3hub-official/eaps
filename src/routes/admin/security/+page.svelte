<!-- src/routes/(admin)/security/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import {
    ShieldAlert, Lock, Eye, EyeOff, History, Users,
    Activity, AlertTriangle, CheckCircle, XCircle,
    RefreshCw, Download, Filter, Search, Calendar,
    Server, Database, Wifi, Shield
  } from 'lucide-svelte';

  let { data }: { data: PageData } = $props();

  let activeTab = $state('overview');
  let dateRange = $state('7d');
  let searchQuery = $state('');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: ShieldAlert },
    { id: 'audit', label: 'Audit Log', icon: History },
    { id: 'sessions', label: 'Active Sessions', icon: Users },
    { id: 'violations', label: 'Violations', icon: AlertTriangle },
  ];

  function formatDate(date: string | Date) {
    return new Date(date).toLocaleString();
  }

  function formatTimeShort(date: string | Date) {
    const now = Date.now();
    const diff = now - new Date(date).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  function getSeverityColor(severity: string) {
    switch (severity) {
      case 'high': return '#dc2626';
      case 'medium': return '#f59e0b';
      case 'low': return '#16a34a';
      default: return '#64748b';
    }
  }

  function getActionClass(action: string) {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('create')) return 'action-created';
    if (actionLower.includes('update')) return 'action-updated';
    if (actionLower.includes('delete')) return 'action-deleted';
    if (actionLower.includes('login')) return 'action-login';
    return 'action-default';
  }
</script>

<svelte:head><title>Security — MOUAU eTest Admin</title></svelte:head>

<div class="security-page">
  
  <!-- Header -->
  <div class="page-header">
    <div>
      <h1>Security Centre</h1>
      <p class="subtitle">Monitor system security, audit logs, and active sessions</p>
    </div>
    <div class="header-actions">
      <button class="btn-outline" onclick={() => window.location.reload()}>
        <RefreshCw size={14} />
        Refresh
      </button>
      <button class="btn-outline">
        <Download size={14} />
        Export Report
      </button>
    </div>
  </div>

  <!-- Security Status Cards -->
  <div class="status-grid">
    <div class="status-card">
      <div class="status-icon green">
        <Shield size={24} />
      </div>
      <div class="status-info">
        <span class="status-label">System Security</span>
        <span class="status-value">Active</span>
      </div>
      <div class="status-badge success">Protected</div>
    </div>

    <div class="status-card">
      <div class="status-icon blue">
        <Lock size={24} />
      </div>
      <div class="status-info">
        <span class="status-label">Encryption</span>
        <span class="status-value">AES-256</span>
      </div>
      <div class="status-badge success">Enabled</div>
    </div>

    <div class="status-card">
      <div class="status-icon amber">
        <Activity size={24} />
      </div>
      <div class="status-info">
        <span class="status-label">Active Threats</span>
        <span class="status-value">{data.threatCount ?? 0}</span>
      </div>
      <div class="status-badge" class:warning={(data.threatCount ?? 0) > 0}>
        {(data.threatCount ?? 0) === 0 ? 'None' : 'Detected'}
      </div>
    </div>

    <div class="status-card">
      <div class="status-icon purple">
        <Users size={24} />
      </div>
      <div class="status-info">
        <span class="status-label">Active Sessions</span>
        <span class="status-value">{data.activeSessions ?? 0}</span>
      </div>
      <div class="status-badge info">Live</div>
    </div>
  </div>

  <!-- Tabs -->
  <div class="tabs">
    {#each tabs as tab}
      <button
        class="tab"
        class:active={activeTab === tab.id}
        onclick={() => activeTab = tab.id}
      >
        <tab.icon size={16} />
        <span>{tab.label}</span>
      </button>
    {/each}
  </div>

  <!-- Tab Content -->
  <div class="tab-content">

    <!-- Overview Tab -->
    {#if activeTab === 'overview'}
      <div class="overview-grid">
        
        <!-- System Health -->
        <div class="card">
          <div class="card-header">
            <h3>System Health</h3>
            <div class="health-dot live"></div>
          </div>
          <div class="health-list">
            <div class="health-item">
              <Server size={16} />
              <span>API Server</span>
              <span class="health-status ok">Operational</span>
            </div>
            <div class="health-item">
              <Database size={16} />
              <span>Database</span>
              <span class="health-status ok">Connected</span>
            </div>
            <div class="health-item">
              <Wifi size={16} />
              <span>WebSocket</span>
              <span class="health-status ok">Active</span>
            </div>
            <div class="health-item">
              <Lock size={16} />
              <span>Face Recognition</span>
              <span class="health-status ok">Ready</span>
            </div>
          </div>
        </div>

        <!-- Security Metrics -->
        <div class="card">
          <div class="card-header">
            <h3>Security Metrics</h3>
          </div>
          <div class="metrics-list">
            <div class="metric">
              <span class="metric-label">Failed Logins (24h)</span>
              <span class="metric-value">{data.failedLogins ?? 0}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Suspicious Activities</span>
              <span class="metric-value">{data.suspiciousActivities ?? 0}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Blocked Attempts</span>
              <span class="metric-value">{data.blockedAttempts ?? 0}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Face Verification Failures</span>
              <span class="metric-value">{data.faceFailures ?? 0}</span>
            </div>
          </div>
        </div>

        <!-- Recent Alerts -->
        <div class="card full-width">
          <div class="card-header">
            <h3>Recent Security Alerts</h3>
            <span class="alert-count">{data.recentAlerts?.length ?? 0}</span>
          </div>
          {#if !data.recentAlerts?.length}
            <div class="empty-state">
              <CheckCircle size={32} />
              <p>No recent security alerts</p>
            </div>
          {:else}
            <div class="alerts-list">
              {#each data.recentAlerts as alert}
                <div class="alert-item" class:high={alert.severity === 'high'}>
                  <div class="alert-icon">
                    {#if alert.severity === 'high'}
                      <AlertTriangle size={16} color="#dc2626" />
                    {:else}
                      <Shield size={16} color="#f59e0b" />
                    {/if}
                  </div>
                  <div class="alert-content">
                    <div class="alert-title">{alert.title}</div>
                    <div class="alert-desc">{alert.description}</div>
                    <div class="alert-time">{formatTimeShort(alert.timestamp)}</div>
                  </div>
                  <div class="alert-severity" style="color:{getSeverityColor(alert.severity)}">
                    {alert.severity}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>

      </div>
    {/if}

    <!-- Audit Log Tab -->
    {#if activeTab === 'audit'}
      <div class="card">
        <div class="card-header">
          <h3>Audit Trail</h3>
          <div class="filter-controls">
            <div class="search-box">
              <Search size={14} />
              <input type="text" placeholder="Search logs..." bind:value={searchQuery} />
            </div>
            <select bind:value={dateRange} class="date-select">
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>
        <div class="table-wrapper">
          <table class="audit-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Resource</th>
                <th>IP Address</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {#if !data.auditLogs?.length}
                <tr>
                  <td colspan="6" class="empty-row">
                    <div class="empty-state-small">
                      <History size={24} />
                      <p>No audit logs found</p>
                    </div>
                  </td>
                </tr>
              {:else}
                {#each data.auditLogs as log}
                  <tr>
                    <td class="mono">{formatDate(log.timestamp)}</td>
                    <td>{log.user}</td>
                    <td>
                      <span class="action-badge {getActionClass(log.action)}">
                        {log.action}
                      </span>
                    </td>
                    <td>{log.resource}</td>
                    <td class="mono">{log.ip}</td>
                    <td>
                      {#if log.status === 'success'}
                        <CheckCircle size={14} class="status-icon success" />
                      {:else}
                        <XCircle size={14} class="status-icon error" />
                      {/if}
                    </td>
                  </tr>
                {/each}
              {/if}
            </tbody>
          </table>
        </div>
      </div>
    {/if}

    <!-- Active Sessions Tab -->
    {#if activeTab === 'sessions'}
      <div class="card">
        <div class="card-header">
          <h3>Active Sessions</h3>
          <button class="btn-small" onclick={() => window.location.reload()}>
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>
        <div class="table-wrapper">
          <table class="sessions-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Login Time</th>
                <th>Last Activity</th>
                <th>IP Address</th>
                <th>Device</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {#if !data.activeSessionsList?.length}
                <tr>
                  <td colspan="7" class="empty-row">
                    <div class="empty-state-small">
                      <Users size={24} />
                      <p>No active sessions</p>
                    </div>
                  </td>
                </tr>
              {:else}
                {#each data.activeSessionsList as session}
                  <tr>
                    <td class="user-cell">
                      <div class="user-avatar-small">{session.user.charAt(0)}</div>
                      {session.user}
                    </td>
                    <td><span class="role-badge">{session.role}</span></td>
                    <td class="mono">{formatDate(session.loginTime)}</td>
                    <td class="mono">{formatTimeShort(session.lastActivity)}</td>
                    <td class="mono">{session.ip}</td>
                    <td>{session.device}</td>
                    <td>
                      <button class="btn-danger-small" title="Terminate Session">
                        <XCircle size={14} />
                      </button>
                    </td>
                  </tr>
                {/each}
              {/if}
            </tbody>
          </table>
        </div>
      </div>
    {/if}

    <!-- Violations Tab -->
    {#if activeTab === 'violations'}
      <div class="card">
        <div class="card-header">
          <h3>Exam Violations</h3>
          <div class="filter-controls">
            <select class="severity-select">
              <option value="all">All Severities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
        <div class="table-wrapper">
          <table class="violations-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Student</th>
                <th>Exam</th>
                <th>Violation Type</th>
                <th>Severity</th>
                <th>Action Taken</th>
              </tr>
            </thead>
            <tbody>
              {#if !data.violations?.length}
                <tr>
                  <td colspan="6" class="empty-row">
                    <div class="empty-state-small">
                      <Shield size={24} />
                      <p>No violations recorded</p>
                    </div>
                  </td>
                </tr>
              {:else}
                {#each data.violations as violation}
                  <tr>
                    <td class="mono">{formatDate(violation.timestamp)}</td>
                    <td>{violation.student}</td>
                    <td>{violation.exam}</td>
                    <td>{violation.type.replace(/_/g, ' ')}</td>
                    <td>
                      <span class="severity-badge severity-{violation.severity}">
                        {violation.severity}
                      </span>
                    </td>
                    <td>{violation.action.replace(/_/g, ' ')}</td>
                  </tr>
                {/each}
              {/if}
            </tbody>
          </table>
        </div>
      </div>
    {/if}

  </div>

</div>

<style>
  .security-page {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  /* Header */
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 1rem;
  }

  h1 {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--color-text);
    margin: 0;
  }

  .subtitle {
    font-size: 0.8rem;
    color: var(--color-muted);
    margin: 0.25rem 0 0;
  }

  .header-actions {
    display: flex;
    gap: 0.75rem;
  }

  .btn-outline {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--color-text);
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-outline:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
  }

  /* Status Cards */
  .status-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 1rem;
  }

  .status-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 1.25rem;
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .status-icon {
    width: 48px;
    height: 48px;
    border-radius: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .status-icon.green { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
  .status-icon.blue { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
  .status-icon.amber { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
  .status-icon.purple { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }

  .status-info {
    flex: 1;
  }

  .status-label {
    display: block;
    font-size: 0.7rem;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .status-value {
    display: block;
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--color-text);
  }

  .status-badge {
    padding: 0.2rem 0.6rem;
    border-radius: 0.25rem;
    font-size: 0.7rem;
    font-weight: 600;
  }

  .status-badge.success {
    background: #dcfce7;
    color: #16a34a;
  }

  .status-badge.warning {
    background: #fef3c7;
    color: #f59e0b;
  }

  .status-badge.info {
    background: #dbeafe;
    color: #3b82f6;
  }

  /* Tabs */
  .tabs {
    display: flex;
    gap: 0.5rem;
    border-bottom: 1px solid var(--color-border);
    padding-bottom: 0;
  }

  .tab {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 1.25rem;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-muted);
    cursor: pointer;
    transition: all 0.15s;
  }

  .tab:hover {
    color: var(--color-text);
  }

  .tab.active {
    color: #16a34a;
    border-bottom-color: #16a34a;
  }

  /* Tab Content */
  .tab-content {
    margin-top: 1.5rem;
  }

  .overview-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 1.25rem;
  }

  .full-width {
    grid-column: 1 / -1;
  }

  /* Cards */
  .card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    overflow: hidden;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
  }

  .card-header h3 {
    font-size: 0.9rem;
    font-weight: 700;
    margin: 0;
    color: var(--color-text);
  }

  .health-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .health-dot.live {
    background: #22c55e;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
  }

  .health-list, .metrics-list {
    padding: 1rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .health-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.85rem;
    color: var(--color-text);
  }

  .health-status {
    margin-left: auto;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .health-status.ok {
    color: #22c55e;
  }

  .metric {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--color-border);
  }

  .metric:last-child {
    border-bottom: none;
  }

  .metric-label {
    font-size: 0.85rem;
    color: var(--color-text);
  }

  .metric-value {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--color-text);
  }

  .alert-count {
    font-size: 0.7rem;
    padding: 0.15rem 0.5rem;
    background: var(--color-bg);
    border-radius: 0.25rem;
    color: var(--color-muted);
  }

  .alerts-list {
    max-height: 300px;
    overflow-y: auto;
  }

  .alert-item {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
  }

  .alert-item.high {
    background: rgba(220, 38, 38, 0.03);
  }

  .alert-content {
    flex: 1;
  }

  .alert-title {
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--color-text);
    margin-bottom: 0.2rem;
  }

  .alert-desc {
    font-size: 0.75rem;
    color: var(--color-muted);
  }

  .alert-time {
    font-size: 0.65rem;
    color: var(--color-muted);
    margin-top: 0.2rem;
  }

  .alert-severity {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  /* Tables */
  .table-wrapper {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8rem;
  }

  th, td {
    padding: 0.75rem 1rem;
    text-align: left;
    border-bottom: 1px solid var(--color-border);
  }

  th {
    font-weight: 600;
    color: var(--color-muted);
    background: var(--color-bg);
  }

  .mono {
    font-family: monospace;
    font-size: 0.75rem;
  }

  .empty-row {
    text-align: center;
    padding: 2rem;
  }

  .empty-state-small {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    color: var(--color-muted);
  }

  /* Filter Controls */
  .filter-controls {
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }

  .search-box {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.35rem 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
  }

  .search-box input {
    border: none;
    background: none;
    outline: none;
    font-size: 0.8rem;
    width: 200px;
  }

  .date-select, .severity-select {
    padding: 0.35rem 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-surface);
    color: var(--color-text);
    font-size: 0.8rem;
  }

  .btn-small {
    padding: 0.25rem 0.6rem;
    font-size: 0.7rem;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: 0.25rem;
    cursor: pointer;
  }

  .action-badge {
    padding: 0.2rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.7rem;
    font-weight: 600;
  }

  .action-created { background: #dcfce7; color: #16a34a; }
  .action-updated { background: #dbeafe; color: #3b82f6; }
  .action-deleted { background: #fee2e2; color: #dc2626; }
  .action-login { background: #f3e8ff; color: #9333ea; }
  .action-default { background: var(--color-border); color: var(--color-muted); }

  .status-icon.success { color: #16a34a; }
  .status-icon.error { color: #dc2626; }

  .user-avatar-small {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: linear-gradient(135deg, #16a34a, #15803d);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    font-size: 0.75rem;
    margin-right: 0.5rem;
  }

  .user-cell {
    display: flex;
    align-items: center;
  }

  .role-badge {
    padding: 0.2rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.7rem;
    font-weight: 600;
    background: var(--color-bg);
  }

  .btn-danger-small {
    background: none;
    border: none;
    color: #dc2626;
    cursor: pointer;
    padding: 0.25rem;
  }

  .severity-badge {
    padding: 0.2rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.7rem;
    font-weight: 600;
  }

  .severity-high { background: #fee2e2; color: #dc2626; }
  .severity-medium { background: #fef3c7; color: #f59e0b; }
  .severity-low { background: #dcfce7; color: #16a34a; }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 3rem;
    color: var(--color-muted);
    text-align: center;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .overview-grid {
      grid-template-columns: 1fr;
    }

    .filter-controls {
      flex-direction: column;
      align-items: stretch;
    }

    .search-box input {
      width: 100%;
    }
  }
</style>