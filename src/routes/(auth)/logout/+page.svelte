<!-- src/routes/(auth)/logout/+page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
</script>

<div style="min-height: 100vh; display: flex; align-items: center; justify-content: center;">
  <form method="POST" use:enhance>
    <p style="color: var(--text-muted); margin-bottom: 1rem;">Signing out...</p>
    <button type="submit" style="
      padding: 0.75rem 2rem;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 0.5rem;
      font-weight: 600;
      cursor: pointer;
    ">
      Confirm Logout
    </button>
  </form>
</div>