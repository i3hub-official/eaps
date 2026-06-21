<!-- src/lib/components/exam/views/TrueFalseView.svelte -->
<script lang="ts">
  import type { Question, StudentAnswerInput } from '$lib/types/exam.js';

  interface Props {
    question: Question;
    answer: StudentAnswerInput | null;
    mode: 'exam' | 'review' | 'preview';
    onAnswer: (ans: StudentAnswerInput) => void;
  }

  let { question, answer, mode, onAnswer }: Props = $props();

  const selected  = $derived(answer?.textAnswer ?? null);
  const isReview  = $derived(mode === 'review');
  const isPreview = $derived(mode === 'preview');

  function select(val: 'true' | 'false') {
    if (isReview || isPreview) return;
    onAnswer({
      questionId:     question.id,
      selectedOption: null,
      textAnswer:     val,
    });
  }
</script>

<div class="tf-view">
  <div class="question-body">
    {#if question.imageUrl}
      <img src={question.imageUrl} alt="Question" class="q-image" />
    {/if}
    <p class="body-text">{question.body}</p>
    {#if question.topic}
      <span class="topic-tag">{question.topic}</span>
    {/if}
  </div>

  <div class="tf-options" role="radiogroup" aria-label="True or False">
    <button
      class="tf-btn true"
      class:selected={selected === 'true'}
      class:disabled={isReview || isPreview}
      onclick={() => select('true')}
      role="radio"
      aria-checked={selected === 'true'}
    >
      <span class="tf-icon">✓</span>
      <span class="tf-label">True</span>
    </button>
    <button
      class="tf-btn false"
      class:selected={selected === 'false'}
      class:disabled={isReview || isPreview}
      onclick={() => select('false')}
      role="radio"
      aria-checked={selected === 'false'}
    >
      <span class="tf-icon">✗</span>
      <span class="tf-label">False</span>
    </button>
  </div>

  {#if isReview}
    <div class="review-note">
      {#if answer?.textAnswer}
        You selected: <strong>{answer.textAnswer === 'true' ? 'True' : 'False'}</strong>
      {:else}
        <em>Not answered</em>
      {/if}
      <!-- Correct answer is NEVER shown here — only after official result release. -->
    </div>
  {/if}
</div>

<style>
  .tf-view { display: flex; flex-direction: column; gap: 1.25rem; }

  .question-body { display: flex; flex-direction: column; gap: 0.75rem; }
  .q-image { max-width: 100%; border-radius: 0.5rem; border: 1px solid var(--color-border, #e5e7eb); }
  .body-text { font-size: 1.05rem; line-height: 1.6; color: var(--color-text, #111827); }
  .topic-tag {
    align-self: flex-start;
    padding: 0.25rem 0.625rem;
    background: var(--g50, #f0fdf4);
    color: var(--g700, #15803d);
    font-size: 0.72rem; font-weight: 700;
    border-radius: 0.375rem; text-transform: uppercase; letter-spacing: 0.04em;
  }

  .tf-options { display: flex; gap: 1rem; }
  .tf-btn {
    flex: 1;
    display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
    padding: 1.5rem 1rem;
    border: 2px solid var(--color-border, #e5e7eb);
    border-radius: 0.875rem;
    background: var(--color-surface, white);
    cursor: pointer;
    transition: all 0.15s;
    font-size: 1rem;
  }
  .tf-btn:hover:not(.disabled) { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
  .tf-btn.true:hover:not(.disabled)  { border-color: var(--g400, #4ade80); }
  .tf-btn.false:hover:not(.disabled) { border-color: #f87171; }

  .tf-btn.true.selected  { border-color: var(--g500, #22c55e); background: var(--g50, #f0fdf4); box-shadow: 0 0 0 3px rgba(34,197,94,0.15); }
  .tf-btn.false.selected { border-color: #ef4444; background: #fef2f2; box-shadow: 0 0 0 3px rgba(239,68,68,0.15); }
  .tf-btn.disabled { cursor: default; }

  .tf-icon {
    width: 48px; height: 48px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.5rem; font-weight: 800;
    background: var(--color-bg, #f9fafb);
  }
  .tf-btn.true.selected  .tf-icon { background: var(--g500, #22c55e); color: white; }
  .tf-btn.false.selected .tf-icon { background: #ef4444; color: white; }

  .tf-label { font-weight: 700; color: var(--color-text, #374151); }

  .review-note {
    padding: 0.75rem 1rem;
    background: #fef3c7;
    border: 1px solid #fde68a;
    border-radius: 0.5rem;
    font-size: 0.85rem;
    color: #92400e;
  }
</style>