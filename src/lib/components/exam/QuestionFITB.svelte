<!-- src/lib/components/exam/QuestionFITB.svelte -->
<script lang="ts">
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
  let isFocused = $state(false);
  let debounce: ReturnType<typeof setTimeout> | null = null;  // ← fixed

  function handleInput(e: Event) {
    value = (e.target as HTMLInputElement).value;
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => onAnswer(questionId, value), 400);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      if (debounce) clearTimeout(debounce);
      onAnswer(questionId, value);
    }
  }
</script>

<div class="question-card">
  <header class="question-header">
    <div class="progress-track">
      <div class="progress-fill" style="width: {((displayIndex + 1) / total) * 100}%"></div>
    </div>
    <div class="header-row">
      <span class="question-number">Question {displayIndex + 1}</span>
      <span class="question-total">of {total}</span>
      {#if value.trim()}
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

  <div class="input-section" class:focused={isFocused}>
    <label for="fitb-{questionId}" class="input-label">
      Your answer
      <span class="input-hint">Press Enter to confirm</span>
    </label>
    <div class="input-wrapper">
      <input
        id="fitb-{questionId}"
        type="text"
        class="fitb-input"
        class:has-value={value.trim().length > 0}
        placeholder="Type your answer here…"
        value={value}
        oninput={handleInput}
        onkeydown={handleKeydown}
        onfocus={() => isFocused = true}
        onblur={() => isFocused = false}
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
      />
      {#if value.trim()}
        <div class="input-status" class:dirty={value !== textAnswer}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
      {/if}
    </div>
    <div class="char-count" class:visible={value.length > 0}>
      {value.length} character{value.length !== 1 ? 's' : ''}
    </div>
  </div>
</div>

<style>
  .question-card { display: flex; flex-direction: column; gap: 2rem; max-width: 720px; margin: 0 auto; padding: 0 1rem; }
  .question-header { display: flex; flex-direction: column; gap: 0.75rem; }
  .progress-track { height: 3px; background: var(--color-border); border-radius: 2px; overflow: hidden; }
  .progress-fill { height: 100%; background: linear-gradient(90deg, var(--color-primary), var(--color-primary-light)); border-radius: 2px; transition: width 0.4s ease; }
  .header-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
  .question-number { font-size: 0.875rem; font-weight: 700; color: var(--color-text); }
  .question-total { font-size: 0.875rem; color: var(--color-muted); }
  .status-badge { font-size: 0.7rem; font-weight: 700; padding: 0.2rem 0.6rem; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.04em; margin-left: auto; }
  .status-badge.answered { background: var(--green-soft); color: var(--green-700); }
  .status-badge.unanswered { background: var(--color-bg); color: var(--color-muted); border: 1px solid var(--color-border); }
  .question-body { display: flex; flex-direction: column; gap: 1.25rem; }
  .image-container { margin: 0; border-radius: var(--radius-card); overflow: hidden; border: 1px solid var(--color-border); background: var(--color-surface); }
  .image-container img { width: 100%; height: auto; display: block; object-fit: contain; max-height: 320px; }
  .body-text { font-size: 1.15rem; line-height: 1.7; color: var(--color-text); font-weight: 400; }
  .input-section { display: flex; flex-direction: column; gap: 0.5rem; padding: 1.5rem; border-radius: var(--radius-card); border: 2px solid var(--color-border); background: var(--color-surface); transition: all 0.15s ease; }
  .input-section.focused { border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-glow); }
  .input-label { display: flex; align-items: center; justify-content: space-between; font-size: 0.85rem; font-weight: 600; color: var(--color-text); text-transform: uppercase; letter-spacing: 0.04em; }
  .input-hint { font-size: 0.75rem; font-weight: 500; color: var(--color-muted); text-transform: none; letter-spacing: 0; }
  .input-wrapper { position: relative; display: flex; align-items: center; }
  .fitb-input { width: 100%; padding: 1rem 1.25rem; padding-right: 3rem; font-size: 1.1rem; font-family: 'JetBrains Mono', 'Fira Code', monospace; border: 2px solid var(--color-border); border-radius: var(--radius-card); background: var(--color-bg); color: var(--color-text); outline: none; transition: all 0.15s ease; box-sizing: border-box; }
  .fitb-input:focus { border-color: var(--color-primary); }
  .fitb-input.has-value { border-color: var(--color-primary); background: var(--color-primary-subtle); }
  .input-status { position: absolute; right: 1rem; width: 1.5rem; height: 1.5rem; border-radius: 50%; background: var(--color-primary); color: #fff; display: flex; align-items: center; justify-content: center; opacity: 0.5; transition: opacity 0.15s; }
  .input-status.dirty { opacity: 1; }
  .char-count { font-size: 0.75rem; color: var(--color-muted); text-align: right; opacity: 0; transition: opacity 0.15s; height: 1.2em; }
  .char-count.visible { opacity: 1; }
</style>