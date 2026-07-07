<script lang="ts">
  // src/lib/components/exam/QuestionRenderer.svelte
  // Renders any question type with appropriate input controls

  interface Option { id: string; body: string; imageUrl: string | null }
  interface MatchPair { id: string; leftItem: string }
  interface Question {
    id: string
    type: string
    body: string
    imageUrl: string | null
    audioUrl: string | null
    videoUrl: string | null
    marks: number
    options: Option[]
    matchPairs: MatchPair[]
    explanation: string | null
  }

  interface AnswerPayload {
    selectedOptions?: string[]
    textAnswer?: string
    orderAnswer?: string[]
    matchAnswer?: Record<string, string>
  }

  let {
    question,
    questionNumber,
    totalQuestions,
    currentAnswer,
    onAnswer,
  }: {
    question: Question
    questionNumber: number
    totalQuestions: number
    currentAnswer: unknown
    onAnswer: (payload: AnswerPayload) => void
  } = $props()

  const answer = $derived((currentAnswer ?? {}) as AnswerPayload)

  // ─── Single / True-False ──────────────────────────────────────────────────
  function selectSingle(optId: string) {
    onAnswer({ selectedOptions: [optId] })
  }

  // ─── Multiple choice ──────────────────────────────────────────────────────
  function toggleMultiple(optId: string) {
    const current = answer.selectedOptions ?? []
    const next = current.includes(optId)
      ? current.filter(id => id !== optId)
      : [...current, optId]
    onAnswer({ selectedOptions: next })
  }

  // ─── Fill blank ───────────────────────────────────────────────────────────
  function handleText(e: Event) {
    onAnswer({ textAnswer: (e.target as HTMLInputElement).value })
  }

  // ─── Matching ─────────────────────────────────────────────────────────────
  // Right-side items (shuffled separately)
  const rightItems = $derived(
    question.matchPairs.map(p => ({ id: p.id, body: '' })) // rightItem is hidden
    // We need the actual right-side options from the options array for matching
    // Convention: for MATCHING type, options[i] corresponds to matchPairs[i].rightItem
  )

  function setMatch(leftId: string, rightId: string) {
    const current = answer.matchAnswer ?? {}
    onAnswer({ matchAnswer: { ...current, [leftId]: rightId } })
  }

  // ─── Ordering ─────────────────────────────────────────────────────────────
  let dragSrc = $state<number | null>(null)
  const ordering = $derived<string[]>(
    answer.orderAnswer ?? question.options.map(o => o.id)
  )

  function onDragStart(i: number) { dragSrc = i }
  function onDrop(i: number) {
    if (dragSrc === null || dragSrc === i) return
    const arr = [...ordering]
    const [item] = arr.splice(dragSrc, 1)
    arr.splice(i, 0, item)
    dragSrc = null
    onAnswer({ orderAnswer: arr })
  }
</script>

<div class="question-wrap">
  <!-- Question header -->
  <div class="question-header">
    <div class="question-number">
      Question {questionNumber} of {totalQuestions}
    </div>
    <div class="question-marks">
      {question.marks} mark{question.marks !== 1 ? 's' : ''}
    </div>
  </div>

  <!-- Question body -->
  <div class="question-body">
    <p class="question-text">{question.body}</p>

    {#if question.imageUrl}
      <img src={question.imageUrl} alt="Question illustration" class="question-image" />
    {/if}

    {#if question.audioUrl}
      <audio controls src={question.audioUrl} class="question-audio">
        Your browser does not support audio.
      </audio>
    {/if}
  </div>

  <!-- ── Single Choice / True-False ───────────────────────────────────── -->
  {#if question.type === 'SINGLE_CHOICE' || question.type === 'TRUE_FALSE'}
    <div class="options-list" role="radiogroup">
      {#each question.options as option}
        {@const selected = answer.selectedOptions?.includes(option.id)}
        <label class="option" class:selected>
          <input
            type="radio"
            name={question.id}
            value={option.id}
            checked={selected}
            onchange={() => selectSingle(option.id)}
          />
          <span class="option-body">
            {#if option.imageUrl}
              <img src={option.imageUrl} alt="" class="option-image" />
            {/if}
            {option.body}
          </span>
        </label>
      {/each}
    </div>

  <!-- ── Multiple Choice ───────────────────────────────────────────────── -->
  {:else if question.type === 'MULTIPLE_CHOICE'}
    <p class="type-hint">Select all correct answers.</p>
    <div class="options-list" role="group">
      {#each question.options as option}
        {@const checked = answer.selectedOptions?.includes(option.id)}
        <label class="option" class:selected={checked}>
          <input
            type="checkbox"
            value={option.id}
            checked={checked}
            onchange={() => toggleMultiple(option.id)}
          />
          <span class="option-body">{option.body}</span>
        </label>
      {/each}
    </div>

  <!-- ── Fill Blank ────────────────────────────────────────────────────── -->
  {:else if question.type === 'FILL_BLANK'}
    <div class="fill-blank">
      <input
        type="text"
        class="fill-input"
        placeholder="Type your answer here..."
        value={answer.textAnswer ?? ''}
        oninput={handleText}
        autocomplete="off"
        autocorrect="off"
        spellcheck={false}
      />
    </div>

  <!-- ── Essay ─────────────────────────────────────────────────────────── -->
  {:else if question.type === 'ESSAY'}
    <div class="essay-wrap">
      <textarea
        class="essay-input"
        placeholder="Write your answer here..."
        value={answer.textAnswer ?? ''}
        oninput={handleText}
        rows={10}
        spellcheck={false}
      ></textarea>
      <div class="essay-count">
        {(answer.textAnswer ?? '').length} characters
      </div>
    </div>

  <!-- ── Matching ──────────────────────────────────────────────────────── -->
  {:else if question.type === 'MATCHING'}
    <div class="matching-grid">
      <div class="matching-col">
        <div class="col-header">Column A</div>
        {#each question.matchPairs as pair}
          <div class="match-left">{pair.leftItem}</div>
        {/each}
      </div>
      <div class="matching-col">
        <div class="col-header">Match with Column B</div>
        {#each question.matchPairs as pair, i}
          <select
            class="match-select"
            value={answer.matchAnswer?.[pair.id] ?? ''}
            onchange={(e) => setMatch(pair.id, (e.target as HTMLSelectElement).value)}
          >
            <option value="">— select —</option>
            {#each question.options as opt}
              <option value={opt.id}>{opt.body}</option>
            {/each}
          </select>
        {/each}
      </div>
    </div>

  <!-- ── Ordering ──────────────────────────────────────────────────────── -->
  {:else if question.type === 'ORDERING'}
    <p class="type-hint">Drag items into the correct order.</p>
    <div class="ordering-list">
      {#each ordering as optId, i}
        {@const opt = question.options.find(o => o.id === optId)}
        <div
          class="order-item"
          draggable="true"
          ondragstart={() => onDragStart(i)}
          ondragover={(e) => e.preventDefault()}
          ondrop={() => onDrop(i)}
          role="listitem"
        >
          <span class="drag-handle">⠿</span>
          <span class="order-num">{i + 1}</span>
          <span class="order-body">{opt?.body ?? ''}</span>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Explanation (shown only in Practice after answering) -->
  {#if question.explanation}
    <div class="explanation">
      <strong>Explanation:</strong> {question.explanation}
    </div>
  {/if}
</div>

<style>
  .question-wrap {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .question-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.8rem;
    color: var(--color-muted);
    font-weight: 500;
  }

  .question-marks {
    background: var(--g50, #f0fdf4);
    color: var(--g700, #15803d);
    border: 1px solid var(--g200, #bbf7d0);
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .question-text {
    font-size: 1.05rem;
    line-height: 1.7;
    margin: 0;
    font-weight: 500;
  }

  .question-image {
    max-width: 100%;
    border-radius: 0.5rem;
    border: 1px solid var(--color-border);
  }

  .question-audio {
    width: 100%;
  }

  .type-hint {
    font-size: 0.8rem;
    color: var(--color-muted);
    margin: 0;
    font-style: italic;
  }

  /* ── Options ───────────────────────────────────────────────────────── */
  .options-list {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }

  .option {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    border: 2px solid var(--color-border);
    border-radius: 0.625rem;
    cursor: pointer;
    transition: all 0.15s;
    line-height: 1.5;
  }

  .option:hover { border-color: var(--g400, #4ade80); background: var(--g50, #f0fdf4); }
  .option.selected { border-color: var(--g500, #22c55e); background: var(--g50, #f0fdf4); }

  .option input { margin-top: 2px; accent-color: var(--g500, #22c55e); flex-shrink: 0; }
  .option-body { font-size: 0.95rem; display: flex; flex-direction: column; gap: 0.5rem; }
  .option-image { max-width: 200px; border-radius: 0.25rem; }

  /* ── Fill blank ────────────────────────────────────────────────────── */
  .fill-blank { display: flex; }
  .fill-input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 2px solid var(--color-border);
    border-radius: 0.625rem;
    font-size: 1rem;
    background: var(--bg-surface);
    color: var(--color-text);
    transition: border-color 0.15s;
  }
  .fill-input:focus { border-color: var(--g500, #22c55e); outline: none; }

  /* ── Essay ──────────────────────────────────────────────────────────── */
  .essay-wrap { display: flex; flex-direction: column; gap: 0.5rem; }
  .essay-input {
    width: 100%;
    padding: 0.875rem 1rem;
    border: 2px solid var(--color-border);
    border-radius: 0.625rem;
    font-size: 0.95rem;
    font-family: inherit;
    resize: vertical;
    background: var(--bg-surface);
    color: var(--color-text);
    line-height: 1.6;
    min-height: 200px;
  }
  .essay-input:focus { border-color: var(--g500, #22c55e); outline: none; }
  .essay-count { font-size: 0.75rem; color: var(--color-muted); text-align: right; }

  /* ── Matching ────────────────────────────────────────────────────────── */
  .matching-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .matching-col { display: flex; flex-direction: column; gap: 0.5rem; }
  .col-header { font-size: 0.75rem; font-weight: 600; color: var(--color-muted); text-transform: uppercase; padding-bottom: 0.25rem; border-bottom: 1px solid var(--color-border); }
  .match-left { padding: 0.625rem 0.75rem; background: var(--bg-muted); border-radius: 0.5rem; font-size: 0.9rem; min-height: 40px; display: flex; align-items: center; }
  .match-select { padding: 0.5rem 0.75rem; border: 1.5px solid var(--color-border); border-radius: 0.5rem; font-size: 0.9rem; background: var(--bg-surface); color: var(--color-text); }
  .match-select:focus { border-color: var(--g500, #22c55e); outline: none; }

  /* ── Ordering ────────────────────────────────────────────────────────── */
  .ordering-list { display: flex; flex-direction: column; gap: 0.5rem; }
  .order-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border: 1.5px solid var(--color-border);
    border-radius: 0.625rem;
    cursor: grab;
    background: var(--bg-surface);
    transition: all 0.15s;
  }
  .order-item:hover { border-color: var(--g400, #4ade80); background: var(--g50, #f0fdf4); }
  .drag-handle { color: var(--color-muted); font-size: 1rem; cursor: grab; }
  .order-num { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; background: var(--g100, #dcfce7); color: var(--g700, #15803d); border-radius: 50%; font-size: 0.75rem; font-weight: 700; flex-shrink: 0; }
  .order-body { font-size: 0.9rem; }

  /* ── Explanation ─────────────────────────────────────────────────────── */
  .explanation {
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 0.5rem;
    padding: 0.875rem 1rem;
    font-size: 0.875rem;
    color: #1e3a5f;
    line-height: 1.6;
  }
</style>