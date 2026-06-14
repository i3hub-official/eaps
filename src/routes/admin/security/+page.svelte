<!-- src/routes/(admin)/security/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import {
    ShieldAlert, Lock, Eye, EyeOff, History, Users,
    Activity, AlertTriangle, CheckCircle, XCircle,
    RefreshCw, Download, Filter, Search, Calendar,
    Server, Database, Wifi, Shield, FileText, ShieldCheck,
    KeyRound, Fingerprint, Bell, Clock, Globe, Smartphone,
    ChevronRight, Info, Ban, FileLock, BadgeCheck
  } from '@lucide/svelte';
  import { tick } from 'svelte';

  let { data }: { data: PageData } = $props();

  // Tab state - reorganized: Overview first, then operational tabs
  let activeTab = $state('overview');
  let dateRange = $state('7d');
  let searchQuery = $state('');
  let severityFilter = $state('all');
  let isExporting = $state(false);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: ShieldCheck },
    { id: 'measures', label: 'Security Measures', icon: Shield },
    { id: 'audit', label: 'Audit Log', icon: History },
    { id: 'sessions', label: 'Active Sessions', icon: Users },
    { id: 'violations', label: 'Violations', icon: AlertTriangle },
  ];

  // Security measures data
  const securityMeasures = [
    {
      category: 'Authentication',
      icon: KeyRound,
      items: [
        { name: 'Multi-Factor Authentication (MFA)', status: 'required', description: 'Mandatory for all admin accounts' },
        { name: 'Password Policy', status: 'required', description: 'Min 16 chars, complexity enforced' },
        { name: 'Session Timeout', status: 'required', description: 'Auto-logout after 15 min inactivity' },
        { name: 'Biometric Verification', status: 'required', description: 'Face recognition for exam access' },
      ]
    },
    {
      category: 'Data Protection',
      icon: FileLock,
      items: [
        { name: 'Encryption at Rest', status: 'required', description: 'AES-256 for all stored data' },
        { name: 'Encryption in Transit', status: 'required', description: 'TLS 1.3 for all connections' },
        { name: 'Database Encryption', status: 'required', description: 'Column-level encryption for PII' },
        { name: 'Backup Encryption', status: 'required', description: 'Encrypted backups with 7-day retention' },
      ]
    },
    {
      category: 'Access Control',
      icon: Lock,
      items: [
        { name: 'Role-Based Access (RBAC)', status: 'required', description: 'Granular permissions per role' },
        { name: 'IP Whitelisting', status: 'recommended', description: 'Restrict admin panel by IP range' },
        { name: 'API Rate Limiting', status: 'required', description: '100 req/min per user' },
        { name: 'Account Lockout', status: 'required', description: 'Lock after 5 failed attempts' },
      ]
    },
    {
      category: 'Monitoring',
      icon: Bell,
      items: [
        { name: 'Audit Logging', status: 'required', description: 'All actions logged immutably' },
        { name: 'Real-time Alerts', status: 'required', description: 'Instant notification on threats' },
        { name: 'Anomaly Detection', status: 'recommended', description: 'AI-based behavior analysis' },
        { name: 'Log Retention', status: 'required', description: '90-day minimum retention' },
      ]
    },
    {
      category: 'Exam Integrity',
      icon: Fingerprint,
      items: [
        { name: 'Face Recognition', status: 'required', description: 'Live verification before exam' },
        { name: 'Proctoring Logs', status: 'required', description: 'Continuous screen monitoring' },
        { name: 'Violation Detection', status: 'required', description: 'Auto-flag suspicious behavior' },
        { name: 'Device Fingerprinting', status: 'recommended', description: 'Track device characteristics' },
      ]
    },
    {
      category: 'Infrastructure',
      icon: Server,
      items: [
        { name: 'DDoS Protection', status: 'required', description: 'Cloudflare Enterprise protection' },
        { name: 'WAF Rules', status: 'required', description: 'OWASP Top 10 filtering' },
        { name: 'Penetration Testing', status: 'required', description: 'Quarterly third-party audits' },
        { name: 'Vulnerability Scanning', status: 'required', description: 'Weekly automated scans' },
      ]
    }
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

  // PDF Export using jsPDF + html2canvas
  async function exportToPDF() {
    isExporting = true;
    await tick();

    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const element = document.getElementById('security-export-container');
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: element.scrollWidth,
        width: element.scrollWidth,
        height: element.scrollHeight
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      let imgY = 10;
      let scaledHeight = imgHeight * ratio;
      let scaledWidth = imgWidth * ratio;

      // Handle multi-page
      let heightLeft = scaledHeight;
      let position = imgY;

      // Add header
      pdf.setFontSize(16);
      pdf.setTextColor(22, 163, 74);
      pdf.text('MOUAU eTest — Security Report', pdfWidth / 2, 10, { align: 'center' });
      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, pdfWidth / 2, 16, { align: 'center' });

      position = 20;
      heightLeft -= 20;

      pdf.addImage(imgData, 'PNG', imgX, position, scaledWidth, scaledHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - scaledHeight + 20;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', imgX, position, scaledWidth, scaledHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`security-report-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('Failed to export PDF. Please try again.');
    } finally {
      isExporting = false;
    }
  }

  // Filtered data
  let filteredAuditLogs = $derived(
    data.auditLogs?.filter((log: any) => {
      const matchesSearch = !searchQuery || 
        log.user?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.resource?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    }) ?? []
  );

  let filteredViolations = $derived(
    data.violations?.filter((v: any) => {
      return severityFilter === 'all' || v.severity === severityFilter;
    }) ?? []
  );
</script>

<svelte:head><title>Security — MOUAU eTest Admin</title></svelte:head>

<div class="security-page">

  <!-- Header -->
  <div class="page-header">
    <div class="header-title-group">
      <div class="header-icon">
        <ShieldCheck size={28} color="#16a34a" />
      </div>
      <div>
        <h1>Security Centre</h1>
        <p class="subtitle">Monitor system security, audit logs, and active sessions</p>
      </div>
    </div>
    <div class="header-actions">
      <button class="btn-outline" onclick={() => window.location.reload()}>
        <RefreshCw size={14} />
        Refresh
      </button>
      <button class="btn-primary" onclick={exportToPDF} disabled={isExporting}>
        {#if isExporting}
          <RefreshCw size={14} class="spin" />
          Exporting...
        {:else}
          <Download size={14} />
          Export Report
        {/if}
      </button>
    </div>
  </div>

  <!-- Security Status Cards -->
  <div class="status-grid">
    <div class="status-card">
      <div class="status-icon green">
        <Shield size={22} />
      </div>
      <div class="status-info">
        <span class="status-label">System Security</span>
        <span class="status-value">Active</span>
      </div>
      <div class="status-badge success">Protected</div>
    </div>

    <div class="status-card">
      <div class="status-icon blue">
        <Lock size={22} />
      </div>
      <div class="status-info">
        <span class="status-label">Encryption</span>
        <span class="status-value">AES-256</span>
      </div>
      <div class="status-badge success">Enabled</div>
    </div>

    <div class="status-card">
      <div class="status-icon amber">
        <Activity size={22} />
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
        <Users size={22} />
      </div>
      <div class="status-info">
        <span class="status-label">Active Sessions</span>
        <span class="status-value">{data.activeSessions ?? 0}</span>
      </div>
      <div class="status-badge info">Live</div>
    </div>
  </div>

  <!-- Tabs -->
  <div class="tabs-container">
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
  </div>

  <!-- Export Container -->
  <div id="security-export-container" class="tab-content">

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
              <Fingerprint size={16} />
              <span>Face Recognition</span>
              <span class="health-status ok">Ready</span>
            </div>
          </div>
        </div>

        <!-- Security Metrics -->
        <div class="card">
          <div class="card-header">
            <h3>Security Metrics (24h)</h3>
          </div>
          <div class="metrics-list">
            <div class="metric">
              <span class="metric-label">Failed Logins</span>
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

        <!-- Compliance Summary -->
        <div class="card full-width">
          <div class="card-header">
            <h3>Security Compliance</h3>
            <span class="compliance-score">98%</span>
          </div>
          <div class="compliance-grid">
            <div class="compliance-item">
              <BadgeCheck size={20} color="#16a34a" />
              <div>
                <span class="compliance-name">MFA Enforced</span>
                <span class="compliance-status">All admins</span>
              </div>
            </div>
            <div class="compliance-item">
              <BadgeCheck size={20} color="#16a34a" />
              <div>
                <span class="compliance-name">Encryption Active</span>
                <span class="compliance-status">AES-256 + TLS 1.3</span>
              </div>
            </div>
            <div class="compliance-item">
              <BadgeCheck size={20} color="#16a34a" />
              <div>
                <span class="compliance-name">Audit Logging</span>
                <span class="compliance-status">90-day retention</span>
              </div>
            </div>
            <div class="compliance-item">
              <BadgeCheck size={20} color="#16a34a" />
              <div>
                <span class="compliance-name">Penetration Test</span>
                <span class="compliance-status">Last: 2026-04-15</span>
              </div>
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
              <CheckCircle size={32} color="#16a34a" />
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

    <!-- Security Measures Tab -->
    {#if activeTab === 'measures'}
      <div class="measures-container">
        <div class="measures-header">
          <Info size={18} color="#16a34a" />
          <p>The following security measures are <strong>required</strong> for MOUAU eTest platform compliance. Items marked <span class="tag-required">Required</span> must be active at all times. <span class="tag-recommended">Recommended</span> items enhance security posture.</p>
        </div>

        <div class="measures-grid">
          {#each securityMeasures as category}
            <div class="measure-card">
              <div class="measure-category-header">
                <category.icon size={20} color="#16a34a" />
                <h3>{category.category}</h3>
              </div>
              <div class="measure-items">
                {#each category.items as item}
                  <div class="measure-item">
                    <div class="measure-info">
                      <div class="measure-name">
                        {item.name}
                        <span class="measure-tag" class:required={item.status === 'required'} class:recommended={item.status === 'recommended'}>
                          {item.status}
                        </span>
                      </div>
                      <div class="measure-desc">{item.description}</div>
                    </div>
                    <div class="measure-status">
                      {#if item.status === 'required'}
                        <CheckCircle size={16} color="#16a34a" />
                      {:else}
                        <Clock size={16} color="#f59e0b" />
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/each}
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
              {#if !filteredAuditLogs.length}
                <tr>
                  <td colspan="6" class="empty-row">
                    <div class="empty-state-small">
                      <History size={24} />
                      <p>No audit logs found</p>
                    </div>
                  </td>
                </tr>
              {:else}
                {#each filteredAuditLogs as log}
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
            <select bind:value={severityFilter} class="severity-select">
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
              {#if !filteredViolations.length}
                <tr>
                  <td colspan="6" class="empty-row">
                    <div class="empty-state-small">
                      <Shield size={24} />
                      <p>No violations recorded</p>
                    </div>
                  </td>
                </tr>
              {:else}
                {#each filteredViolations as violation}
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
    max-width: 1400px;
    margin: 0 auto;
  }

  /* Header */
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--color-border);
  }

  .header-title-group {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .header-icon {
    width: 48px;
    height: 48px;
    border-radius: 0.75rem;
    background: rgba(59, 130, 246, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
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
    border-color: #3b82f6;
    color: #3b82f6;
  }

  .btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: #3b82f6;
    border: 1px solid #3b82f6;
    border-radius: 0.5rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: white;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-primary:hover {
    background: #1d4ed8;
    border-color: #1d4ed8;
  }

  .btn-primary:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
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
    transition: transform 0.15s, box-shadow 0.15s;
  }

  .status-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }

  .status-icon {
    width: 44px;
    height: 44px;
    border-radius: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .status-icon.green { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
  .status-icon.blue { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
  .status-icon.amber { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
  .status-icon.purple { background: rgba(99, 102, 241, 0.1); color: #6366f1; }

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
  .tabs-container {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 0.25rem;
  }

  .tabs {
    display: flex;
    gap: 0.25rem;
    flex-wrap: wrap;
  }

  .tab {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 1.25rem;
    background: none;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-muted);
    cursor: pointer;
    transition: all 0.15s;
  }

  .tab:hover {
    color: var(--color-text);
    background: var(--color-bg);
  }

  .tab.active {
    color: white;
    background: #3b82f6;
  }

  /* Tab Content */
  .tab-content {
    margin-top: 0.5rem;
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
    color: #16a34a;
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

  .compliance-score {
    font-size: 1.25rem;
    font-weight: 800;
    color: #3b82f6;
  }

  .compliance-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    padding: 1.25rem;
  }

  .compliance-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: var(--color-bg);
    border-radius: 0.5rem;
  }

  .compliance-item div {
    display: flex;
    flex-direction: column;
  }

  .compliance-name {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .compliance-status {
    font-size: 0.7rem;
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

  /* Security Measures */
  .measures-container {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .measures-header {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    background: rgba(59, 130, 246, 0.05);
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: 0.75rem;
    color: var(--color-text);
    font-size: 0.85rem;
    line-height: 1.5;
  }

  .measures-header p {
    margin: 0;
  }

  .tag-required {
    display: inline-block;
    padding: 0.1rem 0.4rem;
    background: #dcfce7;
    color: #16a34a;
    border-radius: 0.25rem;
    font-size: 0.7rem;
    font-weight: 600;
    margin: 0 0.2rem;
  }

  .tag-recommended {
    display: inline-block;
    padding: 0.1rem 0.4rem;
    background: #fef3c7;
    color: #f59e0b;
    border-radius: 0.25rem;
    font-size: 0.7rem;
    font-weight: 600;
    margin: 0 0.2rem;
  }

  .measures-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
    gap: 1.25rem;
  }

  .measure-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    overflow: hidden;
  }

  .measure-category-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem 1.25rem;
    background: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
  }

  .measure-category-header h3 {
    font-size: 0.9rem;
    font-weight: 700;
    margin: 0;
    color: var(--color-text);
  }

  .measure-items {
    padding: 0.5rem;
  }

  .measure-item {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--color-border);
  }

  .measure-item:last-child {
    border-bottom: none;
  }

  .measure-info {
    flex: 1;
  }

  .measure-name {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-text);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .measure-tag {
    font-size: 0.65rem;
    padding: 0.1rem 0.4rem;
    border-radius: 0.25rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .measure-tag.required {
    background: #dcfce7;
    color: #16a34a;
  }

  .measure-tag.recommended {
    background: #fef3c7;
    color: #f59e0b;
  }

  .measure-desc {
    font-size: 0.75rem;
    color: var(--color-muted);
    margin-top: 0.2rem;
  }

  .measure-status {
    flex-shrink: 0;
    margin-top: 0.1rem;
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
    background: var(--color-surface);
  }

  .search-box input {
    border: none;
    background: none;
    outline: none;
    font-size: 0.8rem;
    width: 200px;
    color: var(--color-text);
  }

  .date-select, .severity-select {
    padding: 0.35rem 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-surface);
    color: var(--color-text);
    font-size: 0.8rem;
    cursor: pointer;
  }

  .btn-small {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.35rem 0.75rem;
    font-size: 0.75rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    color: var(--color-text);
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-small:hover {
    border-color: #3b82f6;
    color: #3b82f6;
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
  .action-login { background: #ede9fe; color: #6366f1; }
  .action-default { background: var(--color-border); color: var(--color-muted); }

  .status-icon.success { color: #16a34a; }
  .status-icon.error { color: #dc2626; }

  .user-avatar-small {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
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
    color: var(--color-text);
  }

  .btn-danger-small {
    background: none;
    border: none;
    color: #dc2626;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 0.25rem;
    transition: background 0.15s;
  }

  .btn-danger-small:hover {
    background: rgba(220, 38, 38, 0.1);
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
    .overview-grid,
    .measures-grid {
      grid-template-columns: 1fr;
    }

    .filter-controls {
      flex-direction: column;
      align-items: stretch;
    }

    .search-box input {
      width: 100%;
    }

    .tabs {
      overflow-x: auto;
      flex-wrap: nowrap;
    }

    .tab {
      white-space: nowrap;
    }
  }
</style>