<!-- src/routes/(invigilator)/monitor/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';

  let { data }: { data: PageData } = $props();

  // Redirect to a specific exam if needed, or show list of active exams
  function openExam(examId: string) {
    goto(`/invigilator/${examId}`);
  }
</script>

<div class="monitor-dashboard">
  <h1>Live Monitoring</h1>
  <p class="subtitle">Select an ongoing exam to monitor</p>

  <div class="exam-grid">
    {#each data.exams as exam}
      <div class="exam-card" on:click={() => openExam(exam.id)}>
        <h3>{exam.title}</h3>
        <p>{exam.course?.code} • {exam.startTime}</p>
        <div class="stats">
          <span>{exam.liveCount} live</span>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .monitor-dashboard { padding: 2rem; }
  .exam-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1.5rem;
  }
  .exam-card {
    padding: 1.5rem;
    border: 1px solid var(--color-border);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .exam-card:hover {
    border-color: var(--color-primary);
    transform: translateY(-2px);
  }
</style>