<!-- src/routes/lecturer/exams/[examId]/questions/+page.svelte -->
<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import QuestionBuilder from '$lib/components/exam/QuestionBuilder.svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  const marksAllocated = $derived(data.exam.questions.reduce((s: number, q: { marks: number }) => s + q.marks, 0));
  const editable = $derived(data.exam.status === 'draft' || data.exam.status === 'scheduled');
</script>

<svelte:head><title>Questions — {data.exam.course.code} | Lecturer</title></svelte:head>

<QuestionBuilder
  exam={data.exam}
  questions={data.exam.questions}
  marksAllocated={marksAllocated}
  backHref="/lecturer/exams/{data.exam.id}"
  editable={editable}
  form={form}
/>