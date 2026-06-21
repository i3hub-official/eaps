<!-- src/routes/lecturer/exams/[examId]/questions/+page.svelte -->
<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import QuestionBuilder from '$lib/components/exam/QuestionBuilder.svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  const editable = $derived(
    data.exam.status !== 'completed' && data.exam.status !== 'cancelled'
  );
</script>

<svelte:head><title>Question Builder — {data.exam.title}</title></svelte:head>

<QuestionBuilder
  exam={data.exam}
  questions={data.questions}
  marksAllocated={data.marksAllocated}
  backHref="/lecturer/exams/{data.exam.id}"
  {editable}
  {form}
/>