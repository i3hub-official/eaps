<!-- src/lib/components/admin/SystemFlagsManager.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';

  interface SystemFlags {
    maintenance: boolean;
    shutdown: boolean;
  }

  let flags: SystemFlags | null = null;
  let loading = true;
  let error: string | null = null;
  let updating: Record<string, boolean> = {};
  let successMessage: string | null = null;

  onMount(async () => {
    await fetchFlags();
  });

  async function fetchFlags() {
    loading = true;
    error = null;
    try {
      const res = await fetch('/api/admin/system-flags');
      if (!res.ok) throw new Error(`Failed to fetch flags: ${res.statusText}`);
      flags = await res.json();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      console.error('Fetch flags error:', err);
    } finally {
      loading = false;
    }
  }

  async function toggleFlag(key: 'maintenance' | 'shutdown') {
    if (!flags) return;

    const newValue = !flags[key];
    updating[key] = true;
    error = null;
    successMessage = null;

    try {
      const res = await fetch('/api/admin/system-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: newValue }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to update flag: ${text}`);
      }

      const updated = await res.json();
      flags = updated;
      successMessage = `${key} set to ${newValue}`;

      // Clear message after 3s
      setTimeout(() => {
        successMessage = null;
      }, 3000);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      console.error('Toggle flag error:', err);
    } finally {
      updating[key] = false;
    }
  }

  async function clearCache() {
    error = null;
    successMessage = null;

    try {
      const res = await fetch('/api/admin/system-flags/cache', {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error(`Failed to clear cache: ${res.statusText}`);
      }

      successMessage = 'Cache cleared. Flags will re-check from DB on next request.';
      setTimeout(() => {
        successMessage = null;
      }, 3000);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      console.error('Clear cache error:', err);
    }
  }
</script>

<div class="system-flags-manager">
  <h2>System Flags</h2>

  {#if error}
    <div class="alert alert-error">
      {error}
    </div>
  {/if}

  {#if successMessage}
    <div class="alert alert-success">
      {successMessage}
    </div>
  {/if}

  {#if loading}
    <p>Loading system flags...</p>
  {:else if flags}
    <div class="flags-container">
      <!-- Maintenance Flag -->
      <div class="flag-card">
        <div class="flag-header">
          <h3>Maintenance Mode</h3>
          <p class="status" class:active={flags.maintenance}>
            {flags.maintenance ? '🔴 Active' : '🟢 Inactive'}
          </p>
        </div>
        <p class="description">
          When active, all non-admin users are redirected to the maintenance screen.
        </p>
        <button
          on:click={() => toggleFlag('maintenance')}
          disabled={updating['maintenance']}
          class={flags.maintenance ? 'btn-danger' : 'btn-primary'}
        >
          {updating['maintenance'] ? 'Updating...' : flags.maintenance ? 'Disable' : 'Enable'}
        </button>
      </div>

      <!-- Shutdown Flag -->
      <div class="flag-card">
        <div class="flag-header">
          <h3>Shutdown Mode</h3>
          <p class="status" class:active={flags.shutdown}>
            {flags.shutdown ? '🔴 Active' : '🟢 Inactive'}
          </p>
        </div>
        <p class="description">
          When active, all non-admin users see a shutdown notice and cannot access the system.
        </p>
        <button
          on:click={() => toggleFlag('shutdown')}
          disabled={updating['shutdown']}
          class={flags.shutdown ? 'btn-danger' : 'btn-primary'}
        >
          {updating['shutdown'] ? 'Updating...' : flags.shutdown ? 'Disable' : 'Enable'}
        </button>
      </div>
    </div>

    <div class="cache-section">
      <h3>Cache Management</h3>
      <p class="description">
        Flags are cached for 15 seconds per instance. If you update the database directly,
        click below to clear the cache immediately.
      </p>
      <button on:click={clearCache} class="btn-secondary">Clear Cache</button>
    </div>
  {/if}
</div>

<style>
  .system-flags-manager {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  }

  h2 {
    margin-bottom: 20px;
    font-size: 1.5rem;
    font-weight: 600;
  }

  .alert {
    padding: 12px 16px;
    border-radius: 6px;
    margin-bottom: 16px;
    font-size: 0.9rem;
  }

  .alert-error {
    background-color: #fee;
    color: #c33;
    border: 1px solid #fcc;
  }

  .alert-success {
    background-color: #efe;
    color: #3c3;
    border: 1px solid #cfc;
  }

  .flags-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 16px;
    margin-bottom: 32px;
  }

  .flag-card {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 16px;
    background-color: #f9f9f9;
  }

  .flag-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .flag-header h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
  }

  .status {
    margin: 0;
    font-size: 0.85rem;
    font-weight: 500;
  }

  .status.active {
    color: #c33;
  }

  .description {
    margin: 8px 0 16px;
    font-size: 0.85rem;
    color: #666;
    line-height: 1.4;
  }

  button {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.2s;
  }

  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-primary {
    background-color: #007bff;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background-color: #0056b3;
  }

  .btn-danger {
    background-color: #dc3545;
    color: white;
  }

  .btn-danger:hover:not(:disabled) {
    background-color: #c82333;
  }

  .btn-secondary {
    background-color: #6c757d;
    color: white;
  }

  .btn-secondary:hover:not(:disabled) {
    background-color: #5a6268;
  }

  .cache-section {
    border-top: 1px solid #e0e0e0;
    padding-top: 20px;
  }

  .cache-section h3 {
    margin: 0 0 8px;
    font-size: 1rem;
    font-weight: 600;
  }
</style>