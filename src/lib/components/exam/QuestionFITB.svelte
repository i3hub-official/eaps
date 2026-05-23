<!-- src/lib/components/exam/QuestionFITB.svelte -->
<script lang="ts">
  import { tick } from 'svelte';

  interface Props {
    questionId: string;
    body: string;
    imageUrl?: string | null;
    textAnswer?: string;
    displayIndex: number;
    total: number;
    onAnswer: (questionId: string, text: string) => void;
  }

  let { questionId, body, imageUrl, textAnswer = '', displayIndex, total, onAnswer }: Props = $props();

  let value = $state(textAnswer);
  let debounce: ReturnType<typeof setTimeout>;

  function handleInput(e: Event) {
    value = (e.target as HTMLInputElement).value;
    clearTimeout(debounce);
    debounce = setTimeout(() => onAnswer(questionId, value), 600);
  }
</script>

<div class="question">
  <p class="meta">Question {displayIndex + 1} of {total}</p>

  <div class="body">
    {#if imageUrl}
      <img src={imageUrl} alt="Question illustration" class="q-image" />
    {/if}
    <p>{body}</p>
  </div>

  <div class="input-wrap">
    <label for="fitb-{questionId}" class="sr-only">Your answer</label>
    <input
      id="fitb-{questionId}"
      type="text"
      class="fitb-input"
      placeholder="Type your answer here…"
      value={value}
      oninput={handleInput}
      autocomplete="off"
      autocorrect="off"
      autocapitalize="off"
      spellcheck="false"
    />
    {#if value}
      <span class="answered-badge">Answered</span>
    {/if}
  </div>
</div>

<style>
  .question { display: flex; flex-direction: column; gap: 1.5rem; }

  .meta {
    font-size: 0.8rem;
    color: var(--color-muted);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .body { font-size: 1.1rem; line-height: 1.6; color: var(--color-text); }

  .q-image { max-width: 100%; border-radius: 0.5rem; margin-bottom: 1rem; }

  .input-wrap { position: relative; }

  .fitb-input {
    width: 100%;
    padding: 0.875rem 1.25rem;
    font-size: 1rem;
    border: 2px solid var(--color-border);
    border-radius: 0.75rem;
    background: var(--color-surface);
    color: var(--color-text);
    outline: none;
    transition: border-color 0.15s;
    box-sizing: border-box;
  }

  .fitb-input:focus { border-color: var(--color-primary); }

  .answered-badge {
    position: absolute;
    right: 1rem;
    top: 50%;
    transform: translateY(-50%);
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-primary);
    background: var(--color-primary-subtle);
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
  }

  .sr-only {
    position: absolute; width: 1px; height: 1px;
    padding: 0; margin: -1px; overflow: hidden;
    clip: rect(0,0,0,0); border: 0;
  }
</style>
