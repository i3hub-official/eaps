<!-- src/routes/admin/system-flags/+page.svelte -->
<script lang="ts">
  import SystemFlagsManager from '$lib/components/admin/SystemFlagsManager.svelte';
</script>

<svelte:head>
  <title>System Flags - Administration</title>
</svelte:head>

<div class="page-container">
  <div class="page-header">
    <h1>System Flags Management</h1>
    <p class="page-description">
      Control system-wide states like maintenance mode and shutdown. Changes take effect immediately.
    </p>
  </div>

  <SystemFlagsManager />
</div>

<style>
  .page-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
  }

  .page-header {
    margin-bottom: 40px;
  }

  .page-header h1 {
    margin: 0 0 8px;
    font-size: 1.75rem;
    font-weight: 600;
  }

  .page-description {
    margin: 0;
    color: #666;
    font-size: 0.95rem;
    line-height: 1.5;
  }
</style>