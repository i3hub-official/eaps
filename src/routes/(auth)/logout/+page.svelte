<!-- src/routes/(auth)/logout/+page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let countdown = $state(3);
  let timer: ReturnType<typeof setInterval>;

  onMount(() => {
    timer = setInterval(() => {
      countdown--;
      if (countdown <= 0) {
        clearInterval(timer);
        const form = document.querySelector('form') as HTMLFormElement;
        if (form) form.requestSubmit();
      }
    }, 1000);
    return () => { if (timer) clearInterval(timer); };
  });
</script>

<div class="logout-container">
  <div class="logout-card">
    <div class="logout-icon">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    </div>

    <h2>Sign Out</h2>
    <p class="logout-message">Are you sure you want to sign out?</p>
    <p class="logout-warning">You'll need to verify your face again when you return.</p>

    <form method="POST" use:enhance>
      <button type="submit" class="logout-btn">
        Sign Out ({countdown})
      </button>
    </form>

    <a href={data.cancelHref} class="cancel-btn">Cancel</a>
  </div>
</div>

<style>
  .logout-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    background: var(--color-bg);
  }

  .logout-card {
    max-width: 380px;
    width: 100%;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    padding: 2rem;
    text-align: center;
    animation: fade-in 0.3s ease;
  }

  @keyframes fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .logout-icon {
    width: 64px;
    height: 64px;
    margin: 0 auto 1rem;
    background: rgba(239, 68, 68, 0.1);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ef4444;
  }

  h2 {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
    color: var(--color-text);
  }

  .logout-message {
    color: var(--color-muted);
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
  }

  .logout-warning {
    color: #f59e0b;
    font-size: 0.75rem;
    margin-bottom: 1.5rem;
    background: rgba(245, 158, 11, 0.1);
    padding: 0.5rem;
    border-radius: 0.5rem;
  }

  .logout-btn {
    width: 100%;
    padding: 0.75rem 1.5rem;
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-weight: 600;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
    margin-bottom: 0.75rem;
  }

  .logout-btn:hover  { background: #dc2626; transform: translateY(-1px); }
  .logout-btn:active { transform: translateY(0); }

  .cancel-btn {
    display: inline-block;
    background: none;
    color: var(--color-muted);
    text-decoration: none;
    font-size: 0.875rem;
    transition: color 0.15s;
  }

  .cancel-btn:hover { color: var(--color-text); }

  :global(.dark) .logout-warning { background: rgba(245, 158, 11, 0.15); }
</style>