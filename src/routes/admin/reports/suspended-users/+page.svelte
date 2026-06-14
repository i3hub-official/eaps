<script lang="ts">
  import type { PageData } from './$types';
  import { UserX, Search, GraduationCap, BookOpen, ShieldCheck, Shield } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();

  let searchQuery = $state('');

  const filtered = $derived(
    data.suspended.filter((u: any) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.matric.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  function getRoleIcon(role: string) {
    const map: Record<string, any> = {
      student:     GraduationCap,
      lecturer:    BookOpen,
      invigilator: ShieldCheck,
      admin:       Shield,
    };
    return map[role] ?? GraduationCap;
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
    {#if filtered.length === 0}
      <div class="empty">
        <UserX size={28} />
        <p>{data.suspended.length === 0 ? 'No suspended users.' : 'No results found.'}</p>
      </div>
    {:else}
      <div class="table-wrap">
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
                <td class="muted">{user.suspendedBy}</td>
                <td class="muted">{user.suspendedAt}</td>
                <td class="muted">{user.duration}</td>
                <td>
                  <span class="status-badge {user.status}">{user.status}</span>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>
</div>
<style>
  .page { max-width: 1200px; }
  .page-header { margin-bottom: 1.5rem; }
  .page-header h1 { font-size: 1.5rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .subtitle { color: var(--color-muted); font-size: 0.9rem; margin-top: 0.25rem; }

  .filters-bar { display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; }
  .search-box {
    display: flex; align-items: center; gap: 0.5rem;
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.5rem; padding: 0.5rem 0.75rem;
    flex: 1; min-width: 200px;
  }
  .search-box input {
    border: none; background: none; outline: none;
    color: var(--color-text); font-size: 0.875rem; width: 100%;
  }
  .search-box :global(svg) { color: var(--color-muted); flex-shrink: 0; }

  .table-section {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.75rem; overflow: hidden;
  }
  .table-wrap { overflow-x: auto; }

  .data-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  .data-table th {
    text-align: left; padding: 0.875rem 1rem;
    color: var(--color-muted); font-size: 0.75rem; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.04em;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg); white-space: nowrap;
  }
  .data-table td {
    padding: 0.875rem 1rem; border-bottom: 1px solid var(--color-border);
    color: var(--color-text);
  }
  .data-table tr:last-child td { border-bottom: none; }
  .data-table tr:hover td { background: var(--color-bg); }

  .muted { color: var(--color-muted); font-size: 0.8rem; }

  .user-cell { display: flex; align-items: center; gap: 0.65rem; }
  .user-avatar {
    width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 0.75rem; color: #fff;
  }
  .user-name { font-weight: 600; color: var(--color-text); display: block; font-size: 0.875rem; }
  .user-matric { font-size: 0.72rem; color: var(--color-muted); font-family: monospace; }

  .role-badge {
    display: inline-flex; align-items: center; gap: 0.3rem;
    padding: 0.2rem 0.55rem; border-radius: 0.375rem;
    font-size: 0.72rem; font-weight: 700; text-transform: capitalize;
  }
  .role-badge.student     { background: rgba(22,163,74,0.1);  color: #16a34a; }
  .role-badge.lecturer    { background: rgba(59,130,246,0.1); color: #3b82f6; }
  .role-badge.invigilator { background: rgba(245,158,11,0.1); color: #f59e0b; }
  .role-badge.admin       { background: rgba(239,68,68,0.1);  color: #ef4444; }

  .reason-cell { max-width: 280px; font-size: 0.8rem; color: var(--color-muted); line-height: 1.4; }

  .status-badge {
    padding: 0.2rem 0.6rem; border-radius: 999px;
    font-size: 0.72rem; font-weight: 700; text-transform: capitalize;
  }
  .status-badge.active  { background: rgba(239,68,68,0.1); color: #ef4444; }
  .status-badge.expired { background: rgba(59,130,246,0.1);  color: #3b82f6; }

  .empty {
    display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
    padding: 3rem 2rem; color: var(--color-muted); text-align: center;
  }
  .empty p { margin: 0; font-size: 0.875rem; }
</style>