<!-- src/lib/components/exam/views/EssayView.svelte -->
<script lang="ts">
  import type { Question, StudentAnswerInput } from '$lib/types/exam.js';

  interface Props {
    question: Question;
    answer: StudentAnswerInput | null;
    mode: 'exam' | 'review' | 'preview';
    onAnswer: (ans: StudentAnswerInput) => void;
  }

  let { question, answer, mode, onAnswer }: Props = $props();

  const isReview = $derived(mode === 'review');
  const isPreview = $derived(mode === 'preview');

  let textValue = $state(answer?.textAnswer ?? '');
  let charCount = $derived(textValue.length);

  function submit() {
    if (isReview || isPreview) return;
    onAnswer({ selectedOption: null, textAnswer: textValue });
  }
</script>

<div class="essay-view">
  <div class="question-body">
    {#if question.imageUrl}
      <img src={question.imageUrl} alt="Question" class="q-image" />
    {/if}
    <p class="body-text">{question.body}</p>
    {#if question.topic}
      <span class="topic-tag">{question.topic}</span>
    {/if}
    <span class="marks-badge">{question.marks} marks</span>
  </div>

  <div class="textarea-wrap">
    <textarea
      bind:value={textValue}
      onchange={submit}
      disabled={isReview || isPreview}
      placeholder="Write your essay here..."
      rows={8}
      maxlength={5000}
    ></textarea>
    <span class="char-count" class:near-limit={charCount > 4500}>
      {charCount.toLocaleString()} / 5,000
    </span>
  </div>

  {#if isReview && answer?.textAnswer}
    <div class="review-note">
      <strong>Your response ({answer.textAnswer.length.toLocaleString()} chars):</strong>
      <p class="response-text">{answer.textAnswer}</p>
    </div>
  {/if}
</div>

<style>
  .essay-view { display: flex; flex-direction: column; gap: 1.25rem; }

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
  .marks-badge {
    align-self: flex-start;
    padding: 0.2rem 0.5rem;
    background: #eff6ff;
    color: #1d4ed8;
    font-size: 0.7rem; font-weight: 700;
    border-radius: 0.375rem;
  }

  .textarea-wrap { position: relative; }
  .textarea-wrap textarea {
    width: 100%;
    padding: 1rem;
    border: 2px solid var(--color-border, #e5e7eb);
    border-radius: 0.75rem;
    font-size: 0.95rem;
    line-height: 1.6;
    background: var(--color-surface, white);
    color: var(--color-text, #111827);
    resize: vertical;
    min-height: 160px;
    transition: border-color 0.15s;
    font-family: inherit;
  }
  .textarea-wrap textarea:focus { outline: none; border-color: var(--g500, #22c55e); box-shadow: 0 0 0 3px rgba(34,197,94,0.12); }
  .textarea-wrap textarea:disabled { background: var(--color-bg, #f9fafb); color: var(--color-muted, #6b7280); cursor: not-allowed; }

  .char-count {
    position: absolute;
    bottom: 0.75rem; right: 0.875rem;
    font-size: 0.72rem;
    color: var(--color-muted, #9ca3af);
    font-weight: 600;
    background: rgba(255,255,255,0.9);
    padding: 0.15rem 0.4rem;
    border-radius: 0.25rem;
  }
  .char-count.near-limit { color: #ef4444; }

  .review-note {
    padding: 1rem;
    background: #f0fdfa;
    border: 1px solid #ccfbf1;
    border-radius: 0.5rem;
    font-size: 0.85rem;
    color: #0f766e;
  }
  .response-text {
    margin-top: 0.5rem;
    white-space: pre-wrap;
    line-height: 1.6;
    color: var(--color-text, #374151);
  }
</style>