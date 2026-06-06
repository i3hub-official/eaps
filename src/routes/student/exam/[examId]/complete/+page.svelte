<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  onMount(async () => {
    // Clear face verification after exam completion
    try {
      await fetch('/api/face/clear-verification', { method: 'POST' });
    } catch {
      // ignore
    }
    // Redirect handled by server or parent
  });
</script>

<div class="complete">
  <h1>Exam Submitted</h1>
  <p>Your answers have been recorded.</p>
</div>