<!-- src/routes/invigilator/monitor/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import {
    Monitor, Clock, Users, CheckCircle, AlertTriangle,
    ArrowRight, Calendar, BookOpen, Activity
  } from 'lucide-svelte';

  let { data }: { data: PageData } = $props();

  function openExam(examId: string) {
    goto(`/invigilator/monitor/${examId}`);
  }

  function getStatusConfig(status: string) {
    switch (status) {
      case 'active': return { color: '#16a34a', bg: 'rgba(22,163,74,0.08)', label: 'Active', icon: Activity };
      case 'scheduled': return { color: '#2563eb', bg: 'rgba(37,99,235,0.08)', label: 'Scheduled', icon: Calendar };
      case 'completed': return { color: '#64748b', bg: 'rgba(100,116,139,0.08)', label: 'Completed', icon: CheckCircle };
      default: return { color: '#64748b', bg: 'rgba(100,116,139,0.08)', label: status, icon: Clock };
    }
  }

  function formatDate(d: Date | string | null) {
    if (!d) return 'Not scheduled';
    return new Date(d).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }
</script>

<svelte:head><title>Exam Monitor — MOUAU eTest</title></svelte:head>

<div class="page">
  <div class="page-header">
    <div class="header-icon"><Monitor size={22} /></div>
    <div>
      <h1>Live Monitoring</h1>
      <p class="subtitle">Select an exam to monitor student activity in real-time</p>
    </div>
  </div>

  {#if data.exams.length === 0}
    <div class="empty">
      <div class="empty-icon"><Monitor size={28} /></div>
      <h3>No exams assigned</h3>
      <p>You are not currently assigned to invigilate any exams.</p>
    </div>
  {:else}
    <div class="exam-grid">
      {#each data.exams as exam}
        {@const status = getStatusConfig(exam.status)}
        {@const StatusIcon = status.icon}
        <button class="exam-card" onclick={() => openExam(exam.id)}>
          <div class="card-top">
            <div class="course-badge">{exam.course?.code ?? '—'}</div>
            <span class="status-badge" style="color:{status.color};background:{status.bg}">
              <StatusIcon size={12} /> {status.label}
            </span>
          </div>

          <h3 class="exam-title">{exam.title}</h3>
          <p class="exam-course">{exam.course?.title ?? '—'}</p>

          <div class="exam-meta">
            <span class="meta-item"><Calendar size={12} /> {formatDate(exam.scheduledStart)}</span>
            <span class="meta-item"><Clock size={12} /> {exam.durationMinutes} min</span>
          </div>

          <div class="card-footer">
            <div class="stat-group">
              <span class="stat"><Users size={12} /> {exam._count.examSessions} students</span>
            </div>
            <span class="enter-link">
              Monitor <ArrowRight size={14} />
            </span>
          </div>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .page {
    max-width: 1100px; margin: 0 auto; padding: 1.5rem;
    display: flex; flex-direction: column; gap: 1.5rem;
  }

  .page-header {
    display: flex; align-items: center; gap: 0.875rem;
  }
  .header-icon {
    width: 44px; height: 44px; border-radius: 0.75rem; flex-shrink: 0;
    background: linear-gradient(135deg, #4f46e5, #6366f1);
    display: flex; align-items: center; justify-content: center; color: white;
  }
  h1 { font-size: 1.4rem; font-weight: 800; color: var(--color-text); margin: 0; letter-spacing: -0.02em; }
  .subtitle { font-size: 0.8rem; color: var(--color-muted); margin: 0.15rem 0 0; }

  .exam-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1rem;
  }

  .exam-card {
    display: flex; flex-direction: column; gap: 0.75rem;
    padding: 1.25rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    text-align: left;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
  }
  .exam-card:hover {
    border-color: #4f46e5;
    box-shadow: 0 4px 12px rgba(79,70,229,0.08);
    transform: translateY(-2px);
  }

  .card-top {
    display: flex; justify-content: space-between; align-items: center;
  }
  .course-badge {
    padding: 0.25rem 0.6rem; border-radius: 0.4rem;
    background: var(--color-bg); border: 1px solid var(--color-border);
    font-size: 0.72rem; font-weight: 800; color: var(--color-text);
    font-family: monospace;
  }
  .status-badge {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-size: 0.7rem; font-weight: 700;
    padding: 0.2rem 0.5rem; border-radius: 0.3rem;
  }

  .exam-title { font-size: 1rem; font-weight: 700; color: var(--color-text); margin: 0; line-height: 1.3; }
  .exam-course { font-size: 0.78rem; color: var(--color-muted); margin: 0; }

  .exam-meta {
    display: flex; gap: 1rem; flex-wrap: wrap;
    font-size: 0.75rem; color: var(--color-muted);
  }
  .meta-item { display: inline-flex; align-items: center; gap: 0.3rem; }

  .card-footer {
    display: flex; justify-content: space-between; align-items: center;
    margin-top: auto; padding-top: 0.75rem;
    border-top: 1px solid var(--color-border);
  }
  .stat-group { display: flex; gap: 0.75rem; }
  .stat {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-size: 0.75rem; font-weight: 600; color: var(--color-muted);
  }
  .enter-link {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-size: 0.8rem; font-weight: 700; color: #4f46e5;
  }

  .empty {
    display: flex; flex-direction: column; align-items: center;
    gap: 0.75rem; padding: 4rem 2rem; text-align: center;
    color: var(--color-muted);
  }
  .empty-icon {
    width: 56px; height: 56px; border-radius: 50%;
    background: var(--color-bg); border: 1px solid var(--color-border);
    display: flex; align-items: center; justify-content: center; opacity: 0.5;
  }
  .empty h3 { font-size: 1rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .empty p { font-size: 0.83rem; margin: 0; max-width: 360px; }

  @media (max-width: 768px) {
    .page { padding: 1rem; }
    .exam-grid { grid-template-columns: 1fr; }
  }
</style>