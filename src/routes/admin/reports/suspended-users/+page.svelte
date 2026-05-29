<script lang="ts">
  import { UserX, Clock, AlertTriangle, Shield, Search, GraduationCap, BookOpen, ShieldCheck } from 'lucide-svelte';

  let suspended = $state([
    { id: 'U001', name: 'Ibrahim Musa', matric: 'MOUAU/2022/112', role: 'student', reason: 'Multiple exam violations (8 incidents)', suspendedAt: '2026-05-18', suspendedBy: 'Admin', duration: '30 days', status: 'active' },
    { id: 'U002', name: 'Oluwaseun Adeyemi', matric: 'MOUAU/2022/156', role: 'student', reason: 'Copy attempt and fullscreen exit (15 incidents)', suspendedAt: '2026-05-20', suspendedBy: 'Dr. Adeyemi', duration: '60 days', status: 'active' },
    { id: 'U003', name: 'Chinedu Obi', matric: 'MOUAU/2023/234', role: 'student', reason: 'Screenshot attempt during exam', suspendedAt: '2026-05-22', suspendedBy: 'Prof. Okonkwo', duration: '14 days', status: 'active' },
    { id: 'U004', name: 'John Doe', matric: 'MOUAU/2023/567', role: 'student', reason: 'No face detected for extended period', suspendedAt: '2026-05-15', suspendedBy: 'Admin', duration: '7 days', status: 'expired' },
  ]);

  let searchQuery = $state('');
  let filtered = $derived(suspended.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.matric.toLowerCase().includes(searchQuery.toLowerCase())));

  function getRoleIcon(role: string) {
    return { student: GraduationCap, lecturer: BookOpen, invigilator: ShieldCheck, admin: Shield }[role] || GraduationCap;
  }
</script>

<svelte:head><title>Suspended Users — MOUAU eTest</title></svelte:head>

<div class="page">
  <header class="page-header">
    <h1>Suspended Users</h1>
    <p class="subtitle">User suspension log with reasons, duration, and status tracking</p>
  </header>

  <section class="filters-bar">
    <div class="search-box">
      <Search size={16} />
      <input type="text" placeholder="Search suspended users..." bind:value={searchQuery} />
    </div>
  </section>

  <section class="table-section">
    <table class="data-table">
      <thead>
        <tr>
          <th>User</th>
          <th>Role</th>
          <th>Reason</th>
          <th>Suspended By</th>
          <th>Date</th>
          <th>Duration</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {#each filtered as user}
          {@const RoleIcon = getRoleIcon(user.role)}
          <tr>
            <td>
              <div class="user-cell">
                <div class="user-avatar">{user.name.charAt(0)}</div>
                <div>
                  <span class="user-name">{user.name}</span>
                  <span class="user-matric">{user.matric}</span>
                </div>
              </div>
            </td>
            <td>
              <span class="role-badge {user.role}">
                <RoleIcon size={12} />
                {user.role}
              </span>
            </td>
            <td class="reason-cell">{user.reason}</td>
            <td>{user.suspendedBy}</td>
            <td>{user.suspendedAt}</td>
            <td>{user.duration}</td>
            <td>
              <span class="status-badge {user.status}">{user.status}</span>
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

  .user-cell { display: flex; align-items: center; gap: 0.75rem; }
  .user-avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #ef4444, #dc2626); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem; color: white; flex-shrink: 0; }
  .user-name { font-weight: 600; color: var(--color-text); display: block; }
  .user-matric { font-size: 0.75rem; color: var(--color-muted); }

  .role-badge { display: flex; align-items: center; gap: 0.25rem; padding: 0.25rem 0.5rem; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 600; text-transform: capitalize; }
  .role-badge.student { background: rgba(22, 163, 74, 0.1); color: #16a34a; }
  .role-badge.lecturer { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
  .role-badge.invigilator { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
  .role-badge.admin { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

  .reason-cell { max-width: 300px; font-size: 0.8rem; line-height: 1.4; }

  .status-badge { padding: 0.25rem 0.625rem; border-radius: 2rem; font-size: 0.75rem; font-weight: 600; text-transform: capitalize; }
  .status-badge.active { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
  .status-badge.expired { background: rgba(22, 163, 74, 0.1); color: #16a34a; }
</style>