<!-- src/lib/components/exam/QuestionMCQ.svelte -->

<script lang="ts">
  interface Option {
    id: string;
    option_text: string;
    display_index: number;
  }

  interface Props {
    questionId: string;
    body: string;
    imageUrl?: string | null;
    options: Option[];
    selected?: string | null;
    displayIndex: number;
    total: number;
    onAnswer: (questionId: string, optionId: string) => void;
  }

  let { questionId, body, imageUrl, options, selected = null, displayIndex, total, onAnswer }: Props = $props();

  const letters = ['A','B','C','D','E'];
</script>

<div class="question">
  <p class="meta">Question {displayIndex + 1} of {total}</p>

  <div class="body">
    {#if imageUrl}
      <img src={imageUrl} alt="Question illustration" class="q-image" />
    {/if}
    <p>{body}</p>
  </div>

  <ul class="options" role="radiogroup" aria-label="Answer options">
    {#each options as opt, i}
      <li>
        <button
          class="option"
          class:selected={selected === opt.id}
          role="radio"
          aria-checked={selected === opt.id}
          onclick={() => onAnswer(questionId, opt.id)}
          type="button"
        >
          <span class="letter">{letters[i] ?? i + 1}</span>
          <span class="text">{opt.option_text}</span>
          {#if selected === opt.id}
            <span class="check" aria-hidden="true">✓</span>
          {/if}
        </button>
      </li>
    {/each}
  </ul>
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

  .body {
    font-size: 1.1rem;
    line-height: 1.6;
    color: var(--color-text);
  }

  .q-image {
    max-width: 100%;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
  }

  .options {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .option {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.875rem 1.25rem;
    border: 2px solid var(--color-border);
    border-radius: 0.75rem;
    background: var(--color-surface);
    color: var(--color-text);
    cursor: pointer;
    text-align: left;
    transition: border-color 0.15s, background 0.15s;
    font-size: 1rem;
  }

  .option:hover { border-color: var(--color-primary); background: var(--color-surface-hover); }
  .option.selected { border-color: var(--color-primary); background: var(--color-primary-subtle); }

  .letter {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    background: var(--color-border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.85rem;
    flex-shrink: 0;
  }

  .option.selected .letter { background: var(--color-primary); color: #fff; }

  .text  { flex: 1; }
  .check { margin-left: auto; color: var(--color-primary); font-weight: 700; }
</style>
