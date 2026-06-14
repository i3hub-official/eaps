<!-- src/routes/student/exam/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import KioskShell from '$lib/components/exam/KioskShell.svelte';
  import ExamShell from '$lib/components/exam/ExamShell.svelte';
  import ViolationWarning from '$lib/components/exam/ViolationWarning.svelte';
  import Watermark from '$lib/components/exam/Watermark.svelte';
  import FaceMonitor from '$lib/components/exam/FaceMonitor.svelte';
  import type { FlagType, ViolationAction } from '$lib/types/exam.js';

  let { data }: { data: PageData } = $props();

  interface ActiveViolation {
    count: number;
    max: number;
    action: ViolationAction;
    flagType: FlagType;
  }

  let activeViolation = $state<ActiveViolation | null>(null);

  async function reportViolation(flagType: string, meta?: Record<string, unknown>) {
    try {
      const res = await fetch(`/api/exam/${data.exam.id}/violation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flagType,
          ...(meta ? { note: JSON.stringify(meta) } : {}),
        }),
      });
      if (!res.ok) return;
      const result = await res.json();

      activeViolation = {
        count: result.violationCount,
        max: result.maxViolations ?? data.exam.maxViolations,
        action: result.action,
        flagType: result.flagType,
      };

      if (result.action === 'auto_submitted') {
        goto(
          `/student/results?examId=${data.exam.id}&notice=${encodeURIComponent(
            'Your exam was auto-submitted due to repeated violations.'
          )}`
        );
      } else if (result.action === 'exam_paused') {
        // Fatal/non-dismissable in ViolationWarning — give the student a
        // moment to read it, then move them off the locked page.
        setTimeout(() => {
          goto(
            `/student?notice=${encodeURIComponent(
              'Your exam session has been paused pending invigilator review.'
            )}`
          );
        }, 3000);
      }
    } catch {
      // Offline — KioskShell/FaceMonitor keep enforcing locally regardless;
      // this event just won't be recorded server-side until connectivity returns.
    }
  }

  async function handleForceSubmit() {
    try {
      await fetch(`/api/exam/${data.exam.id}/submit`, { method: 'POST' });
    } catch {
      // Best effort — the expired-session cron job will catch this too.
    }
    goto(
      `/student/results?examId=${data.exam.id}&notice=${encodeURIComponent(
        'Your exam was auto-submitted due to repeated face-verification issues.'
      )}`
    );
  }

  function dismissViolation() {
    activeViolation = null;
  }
</script>

<svelte:head>
  <title>{data.exam.title} — Exam</title>
</svelte:head>

<KioskShell onViolation={reportViolation}>
  <Watermark text={data.watermarkText} />

  <ExamShell
    examId={data.exam.id}
    config={data.exam}
    session={data.session}
    questions={data.questions}
    initialAnswers={data.savedAnswers}
    faceVerified={true}
    needsStart={false}
  />

  <FaceMonitor
    sessionId={data.session.id}
    examId={data.exam.id}
    enrolledDescriptor={data.enrolledFaceDescriptor}
    onViolation={reportViolation}
    onForceSubmit={handleForceSubmit}
    onCameraError={(msg) => console.warn('[FaceMonitor]', msg)}
  />
</KioskShell>

{#if activeViolation}
  <ViolationWarning
    count={activeViolation.count}
    max={activeViolation.max}
    action={activeViolation.action}
    flagType={activeViolation.flagType}
    onDismiss={dismissViolation}
  />
{/if}