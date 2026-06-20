<!-- src/routes/dean/departments/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
</script>
<div class="page-header"><div class="page-header-text"><h1>Departments</h1><p>All departments within your faculty.</p></div></div>
<div class="table-card">
  <table class="data-table">
    <thead><tr><th>Name</th><th>Code</th><th>Staff</th><th>Courses</th></tr></thead>
    <tbody>
      {#each data.departments as d}
        <tr>
          <td class="fw">{d.name}</td>
          <td><span class="code">{d.code}</span></td>
          <td>{d._count.users}</td>
          <td>{d._count.courses}</td>
        </tr>
      {:else}
        <tr><td colspan="4" class="empty-row">No departments found.</td></tr>
      {/each}
    </tbody>
  </table>
</div>
<style>
 @import '$lib/styles/portals.css';
.fw{font-weight:600;}
.code{font-size:.74rem;font-weight:700;color:#3b82f6;}
</style>
