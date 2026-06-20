<!-- src/routes/hod/departments/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { GraduationCap, BookOpen, Layers } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();
  const dept = data.department;
</script>

{#if dept}
  <div class="page-header">
    <div class="page-header-text">
      <h1>{dept.name}</h1>
      <p>{dept.college?.name ?? ''} · Code: {dept.code}</p>
    </div>
  </div>

  <div class="dept-stats">
    <div class="stat-card"><div class="stat-icon"><BookOpen size={16} /></div><div class="stat-value">{dept._count.courses}</div><div class="stat-label">Courses</div></div>
    <div class="stat-card"><div class="stat-icon"><GraduationCap size={16} /></div><div class="stat-value">{dept._count.programmes}</div><div class="stat-label">Programmes</div></div>
    <div class="stat-card"><div class="stat-icon"><Layers size={16} /></div><div class="stat-value">{dept._count.users}</div><div class="stat-label">Users</div></div>
  </div>

  <div class="two-col">
    <!-- Courses -->
    <div class="table-card">
      <div class="table-head-row"><span class="table-title">Courses</span></div>
      <table class="data-table">
        <thead><tr><th>Code</th><th>Title</th><th>Level</th><th>Credits</th></tr></thead>
        <tbody>
          {#each dept.courses as c}
            <tr>
              <td><span class="code-chip">{c.code}</span></td>
              <td>{c.title}</td>
              <td>{c.level ? `${c.level}L` : '—'}</td>
              <td>{c.creditUnits}</td>
            </tr>
          {:else}
            <tr><td colspan="4" class="empty-row">No courses.</td></tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Programmes -->
    <div class="table-card">
      <div class="table-head-row"><span class="table-title">Programmes</span></div>
      <table class="data-table">
        <thead><tr><th>Name</th><th>Code</th><th>Duration</th></tr></thead>
        <tbody>
          {#each dept.programmes as p}
            <tr>
              <td>{p.name}</td>
              <td>{p.code ?? '—'}</td>
              <td>{p.durationYears} yrs</td>
            </tr>
          {:else}
            <tr><td colspan="3" class="empty-row">No programmes.</td></tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
{:else}
  <div class="empty-row">Department not found.</div>
{/if}

<style>
 @import '$lib/styles/portals.css';
  .dept-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:1rem; margin-bottom:1.5rem; }
  .two-col { display:grid; grid-template-columns:1fr 1fr; gap:1.25rem; }
  .code-chip { font-size:.74rem; font-weight:700; color:#3b82f6; }
  @media(max-width:860px){ .two-col,.dept-stats{grid-template-columns:1fr;} }
</style>
