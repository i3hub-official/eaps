<!-- src/lib/components/exam/QuestionRenderer.svelte -->
<script lang="ts">
  import type { Question, StudentAnswerInput } from '$lib/types/exam.js';
  import McqView          from './views/McqView.svelte';
  import FitbView         from './views/FitbView.svelte';
  import EssayView        from './views/EssayView.svelte';
  import TrueFalseView    from './views/TrueFalseView.svelte';
  import GenericQuestionView from './views/GenericQuestionView.svelte';

  interface Props {
    question: Question;
    answer: StudentAnswerInput | null;
    mode: 'exam' | 'review' | 'preview';
    onAnswer: (ans: StudentAnswerInput) => void;
  }

  let { question, answer, mode, onAnswer }: Props = $props();

  const VIEW_MAP: Record<string, typeof McqView> = {
    mcq:             McqView,
    fill_in_the_blank: FitbView,
    essay:           EssayView,
    true_false:      TrueFalseView,
  };

  const ViewComponent = $derived(VIEW_MAP[question.type] ?? GenericQuestionView);

  function handleAnswer(ans: StudentAnswerInput) {
    onAnswer({ ...ans, questionId: question.id });
  }
</script>

<ViewComponent
  {question}
  {answer}
  {mode}
  onAnswer={handleAnswer}
/>