<!-- src/routes/+error.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
</script>

<svelte:head>
  <title>{$page.status} — MOUAU eTest</title>
</svelte:head>

<div class="error-page">
  <div class="error-card">
    <span class="status-code">{$page.status}</span>
    <h1>{$page.status === 404 ? 'Page Not Found' : $page.status === 403 ? 'Access Denied' : 'Something Went Wrong'}</h1>
    <p class="message">
      {#if $page.status === 404}
        The page you're looking for doesn't exist.
      {:else if $page.status === 403}
        You don't have permission to access this page.
      {:else if $page.error?.message}
        {$page.error.message}
      {:else}
        An unexpected error occurred. Please try again.
      {/if}
    </p>
    <div class="actions">
      <a href="/" class="btn-primary">Go Home</a>
      <button onclick={() => history.back()} class="btn-outline" type="button">Go Back</button>
    </div>
  </div>
</div>

<style>
  .error-page {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    padding: 2rem; background: var(--color-bg);
  }
  .error-card {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 1.25rem; padding: 3rem 2rem; max-width: 440px; width: 100%;
    text-align: center; display: flex; flex-direction: column; align-items: center; gap: 1rem;
  }
  .status-code { font-size: 4rem; font-weight: 900; color: var(--color-primary); line-height: 1; }
  h1     { font-size: 1.4rem; font-weight: 700; margin: 0; }
  .message { color: var(--color-muted); margin: 0; line-height: 1.6; }
  .actions { display: flex; gap: 0.75rem; flex-wrap: wrap; justify-content: center; margin-top: 0.5rem; }
  .btn-primary {
    padding: 0.65rem 1.5rem; background: var(--color-primary); color: #fff;
    border: none; border-radius: 0.5rem; font-weight: 600; text-decoration: none;
    font-size: 0.9rem; cursor: pointer;
  }
  .btn-outline {
    padding: 0.65rem 1.5rem; border: 1px solid var(--color-border);
    border-radius: 0.5rem; font-weight: 600; color: var(--color-text);
    background: none; font-size: 0.9rem; cursor: pointer;
  }
</style>