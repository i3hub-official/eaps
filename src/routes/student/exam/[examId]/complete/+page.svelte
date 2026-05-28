<!-- src/routes/exam/[examId]/complete/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  let { params } = $props();
  
  onMount(() => {
    // Use setTimeout to avoid immediate navigation conflicts
    setTimeout(() => {
      goto(`/student/exam/${params.examId}/complete`, { replaceState: true });
    }, 100);
  });
</script>

<div class="redirecting">
  <div class="spinner"></div>
  <p>Loading your results...</p>
</div>

<style>
  .redirecting {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    gap: 1rem;
    background: var(--color-bg);
    color: var(--color-text);
    font-family: system-ui, sans-serif;
  }
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--color-border);
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  p {
    color: var(--color-muted);
    font-size: 0.875rem;
  }
</style>