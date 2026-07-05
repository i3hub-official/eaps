<!-- src/routes/exam-officer/exams/create/+page.svelte -->
<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import CreateExamForm from '$lib/components/exam/CreateExamForm.svelte';
  let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<CreateExamForm {data} {form} dashboardHref="/exam-officer" />