<script lang="ts">
  import { Fingerprint, Search, Shield, Monitor, Smartphone, Globe, Clock, MapPin } from 'lucide-svelte';

  let logins = $state([]);

  let searchQuery = $state('');
  let filtered = $derived(logins.filter(l => l.user.toLowerCase().includes(searchQuery.toLowerCase()) || l.email.toLowerCase().includes(searchQuery.toLowerCase()) || l.ip.includes(searchQuery)));

  function getStatusColor(s: string) {
    return { success: 'status-success', failed: 'status-failed', blocked: 'status-blocked' }[s] || 'status-success';
  }
</script>

<svelte:head><title>Login History — MOUAU eTest</title></svelte:head>

<div class="page">
  <header class="page-header">
    <h1>Login History</h1>
    <p class="subtitle">Authentication events, device tracking, and security monitoring</p>
  </header>

  <section class="filters-bar">
    <div class="search-box">
      <Search size={16} />
      <input type="text" placeholder="Search by user, email, or IP..." bind:value={searchQuery} />
    </div>
  </section>

  <section class="table-section">
    <table class="data-table">
      <thead>
        <tr>
          <th>User</th>
          <th>IP Address</th>
          <th>Device</th>
          <th>Location</th>
          <th>Method</th>
          <th>Status</th>
          <th>Time</th>
        </tr>
      </thead>
      <tbody>
        {#each filtered as login}
          <tr>
            <td>
              <div class="user-cell">
                <div class="user-avatar">{login.user.charAt(0)}</div>
                <div>
                  <span class="user-name">{login.user}</span>
                  <span class="user-email">{login.email}</span>
                </div>
              </div>
            </td>
            <td><span class="ip-badge">{login.ip}</span></td>
            <td>
              <span class="device-badge">
                <Monitor size={12} />
                {login.device}
              </span>
            </td>
            <td>
              <span class="location-badge">
                <MapPin size={12} />
                {login.location}
              </span>
            </td>
            <td><span class="method-badge">{login.method.replace('_', ' ')}</span></td>
            <td><span class="status-badge {getStatusColor(login.status)}">{login.status}</span></td>
            <td class="time-cell">{login.time}</td>
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

  .user-cell { display: flex; align-items: center; gap: 0.75rem; }
  .user-avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #16a34a, #15803d); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem; color: white; flex-shrink: 0; }
  .user-name { font-weight: 600; color: var(--color-text); display: block; }
  .user-email { font-size: 0.75rem; color: var(--color-muted); }

  .ip-badge { font-family: monospace; font-size: 0.75rem; color: var(--color-muted); background: var(--color-bg); padding: 0.25rem 0.5rem; border-radius: 0.25rem; }

  .device-badge { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.25rem 0.5rem; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 600; background: var(--color-bg); color: var(--color-text); }
  .location-badge { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.25rem 0.5rem; border-radius: 0.375rem; font-size: 0.75rem; color: var(--color-muted); }
  .method-badge { padding: 0.25rem 0.5rem; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 600; background: var(--color-bg); color: var(--color-text); text-transform: capitalize; }

  .status-badge { padding: 0.25rem 0.625rem; border-radius: 2rem; font-size: 0.75rem; font-weight: 600; text-transform: capitalize; }
  .status-success { background: rgba(22, 163, 74, 0.1); color: #16a34a; }
  .status-failed { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
  .status-blocked { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

  .time-cell { font-size: 0.8rem; color: var(--color-muted); font-family: monospace; }
</style>