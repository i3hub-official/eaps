<!-- src/lib/components/exam/views/GenericQuestionView.svelte -->
<script lang="ts">
  import type { Question, StudentAnswerInput } from '$lib/types/exam.js';

  interface Props {
    question: Question;
    answer: StudentAnswerInput | null;
    mode: 'exam' | 'review' | 'preview';
    onAnswer: (ans: StudentAnswerInput) => void;
  }

  let { question, answer, mode, onAnswer }: Props = $props();

  let textValue = $state(answer?.textAnswer ?? '');

  function submit() {
    if (mode === 'review' || mode === 'preview') return;
    onAnswer({ selectedOption: null, textAnswer: textValue });
  }
</script>

<div class="generic-view">
  <div class="question-body">
    {#if question.imageUrl}
      <img src={question.imageUrl} alt="Question" class="q-image" />
    {/if}
    <p class="body-text">{question.body}</p>
    <span class="type-badge">{question.type}</span>
  </div>

  <div class="fallback-input">
    <label>Your answer</label>
    <textarea
      bind:value={textValue}
      onchange={submit}
      disabled={mode === 'review' || mode === 'preview'}
      rows={4}
      placeholder="Type your answer..."
    ></textarea>
  </div>
</div>

<style>
  .generic-view { display: flex; flex-direction: column; gap: 1.25rem; }
  .question-body { display: flex; flex-direction: column; gap: 0.75rem; }
  .q-image { max-width: 100%; border-radius: 0.5rem; border: 1px solid var(--color-border, #e5e7eb); }
  .body-text { font-size: 1.05rem; line-height: 1.6; color: var(--color-text, #111827); }
  .type-badge {
    align-self: flex-start;
    padding: 0.25rem 0.625rem;
    background: #f3f4f6;
    color: #6b7280;
    font-size: 0.7rem; font-weight: 700;
    border-radius: 0.375rem; text-transform: uppercase;
  }
  .fallback-input { display: flex; flex-direction: column; gap: 0.5rem; }
  .fallback-input label { font-size: 0.8rem; font-weight: 700; color: var(--color-muted, #6b7280); text-transform: uppercase; letter-spacing: 0.05em; }
  .fallback-input textarea {
    padding: 1rem;
    border: 2px solid var(--color-border, #e5e7eb);
    border-radius: 0.75rem;
    font-size: 0.95rem;
    background: var(--color-surface, white);
    resize: vertical;
    min-height: 100px;
  }
  .fallback-input textarea:focus { outline: none; border-color: var(--g500, #22c55e); }
  .fallback-input textarea:disabled { background: var(--color-bg, #f9fafb); cursor: not-allowed; }
</style>