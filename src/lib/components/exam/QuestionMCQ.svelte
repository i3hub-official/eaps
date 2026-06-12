<!-- src/lib/components/exam/QuestionMCQ.svelte -->
<script lang="ts">
  interface Option {
    id: string;
    optionText: string;
    displayIndex?: number;
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

  const letters = ['A','B','C','D','E','F','G','H'];
  let hoveredOption = $state<string | null>(null);
</script>

<div class="question-card">
  <header class="question-header">
    <div class="progress-track">
      <div class="progress-fill" style="width: {((displayIndex + 1) / total) * 100}%"></div>
    </div>
    <div class="header-row">
      <span class="question-number">Question {displayIndex + 1}</span>
      <span class="question-total">of {total}</span>
      {#if selected}
        <span class="status-badge answered">Answered</span>
      {:else}
        <span class="status-badge unanswered">Unanswered</span>
      {/if}
    </div>
  </header>

  <div class="question-body">
    {#if imageUrl}
      <figure class="image-container">
        <img src={imageUrl} alt="Question illustration" loading="lazy" />
      </figure>
    {/if}
    <div class="body-text">{@html body}</div>
  </div>

  <fieldset class="options-fieldset">
    <legend class="sr-only">Select one answer</legend>
    <div class="options-grid" role="radiogroup" aria-label="Answer options">
      {#each options as opt, i}
        {@const isSelected = selected === opt.id}
        {@const isHovered = hoveredOption === opt.id}
        <button
          class="option"
          class:selected={isSelected}
          class:hovered={isHovered}
          role="radio"
          aria-checked={isSelected}
          tabindex={isSelected ? 0 : -1}
          onmouseenter={() => hoveredOption = opt.id}
          onmouseleave={() => hoveredOption = null}
          onclick={() => onAnswer(questionId, opt.id)}
          type="button"
        >
          <div class="option-layout">
            <div class="letter-ring" class:filled={isSelected}>
              <span class="letter">{letters[i] ?? i + 1}</span>
            </div>
            <span class="option-text">{opt.optionText}</span>
            <div class="selection-indicator" class:visible={isSelected}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
          </div>
        </button>
      {/each}
    </div>
  </fieldset>
</div>

<style>
  .question-card { display: flex; flex-direction: column; gap: 2rem; max-width: 720px; margin: 0 auto; padding: 0 1rem; }
  .question-header { display: flex; flex-direction: column; gap: 0.75rem; }
  .progress-track { height: 3px; background: var(--color-border); border-radius: 2px; overflow: hidden; }
  .progress-fill { height: 100%; background: linear-gradient(90deg, #059669, #10b981); border-radius: 2px; transition: width 0.4s ease; }
  .header-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
  .question-number { font-size: 0.875rem; font-weight: 700; color: var(--color-text); }
  .question-total { font-size: 0.875rem; color: var(--color-muted); }
  .status-badge { font-size: 0.7rem; font-weight: 700; padding: 0.2rem 0.6rem; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.04em; margin-left: auto; }
  .status-badge.answered { background: rgba(16, 185, 129, 0.1); color: #047857; }
  .status-badge.unanswered { background: var(--color-bg); color: var(--color-muted); border: 1px solid var(--color-border); }
  .question-body { display: flex; flex-direction: column; gap: 1.25rem; }
  .image-container { margin: 0; border-radius: var(--radius-card); overflow: hidden; border: 1px solid var(--color-border); background: var(--color-surface); }
  .image-container img { width: 100%; height: auto; display: block; object-fit: contain; max-height: 320px; }
  .body-text { font-size: 1.15rem; line-height: 1.7; color: var(--color-text); font-weight: 400; }
  .body-text :global(strong), .body-text :global(b) { font-weight: 700; color: var(--color-text); }
  .body-text :global(code) { background: var(--color-bg); padding: 0.15rem 0.4rem; border-radius: 0.25rem; font-size: 0.9em; font-family: 'JetBrains Mono', monospace; }
  .options-fieldset { border: none; padding: 0; margin: 0; }
  .options-grid { display: grid; grid-template-columns: 1fr; gap: 0.625rem; }
  @media (min-width: 640px) { .options-grid { grid-template-columns: repeat(2, 1fr); } }
  .option { position: relative; width: 100%; padding: 0; border: 2px solid var(--color-border); border-radius: var(--radius-card); background: var(--color-surface); cursor: pointer; text-align: left; transition: all 0.15s ease; overflow: hidden; }
  .option:hover, .option.hovered { border-color: #059669; background: rgba(16, 185, 129, 0.03); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
  .option.selected { border-color: #059669; background: rgba(16, 185, 129, 0.06); box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.12); }
  .option-layout { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem; }
  .letter-ring { width: 2.5rem; height: 2.5rem; border-radius: 50%; border: 2px solid var(--color-border); background: var(--color-bg); display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.15s ease; }
  .letter-ring.filled { border-color: #059669; background: #059669; }
  .letter { font-weight: 700; font-size: 0.9rem; color: var(--color-muted); transition: color 0.15s; }
  .option.selected .letter { color: #fff; }
  .option-text { flex: 1; font-size: 1rem; line-height: 1.5; color: var(--color-text); font-weight: 400; }
  .option.selected .option-text { font-weight: 600; }
  .selection-indicator { width: 2rem; height: 2rem; border-radius: 50%; background: #059669; color: #fff; display: flex; align-items: center; justify-content: center; opacity: 0; transform: scale(0.6); transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); flex-shrink: 0; }
  .selection-indicator.visible { opacity: 1; transform: scale(1); }
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }
</style>