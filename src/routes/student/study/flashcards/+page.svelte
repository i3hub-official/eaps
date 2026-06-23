<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { 
    ArrowLeft, Brain, ChevronLeft, 
    ChevronRight, Shuffle, RotateCw,
    CheckCircle, XCircle, Home,
    BookOpen, Zap, Target
  } from '@lucide/svelte';

  let currentCard = $state(0);
  let isFlipped = $state(false);
  let knownCards = $state<Set<number>>(new Set());
  let unknownCards = $state<Set<number>>(new Set());
  let isShuffled = $state(false);

  // Mock flashcards - replace with actual API data
  const flashcards = [
    { id: 1, front: "What is a function?", back: "A relation that maps each input to exactly one output." },
    { id: 2, front: "What is the derivative of sin(x)?", back: "cos(x)" },
    { id: 3, front: "What is the integral of 1/x?", back: "ln|x| + C" },
    { id: 4, front: "What is the quadratic formula?", back: "x = (-b ± √(b² - 4ac)) / 2a" },
    { id: 5, front: "What is the chain rule?", back: "d/dx[f(g(x))] = f'(g(x)) * g'(x)" },
    { id: 6, front: "What is a limit?", back: "The value that a function approaches as input approaches a value." },
    { id: 7, front: "What is the derivative of e^x?", back: "e^x" },
    { id: 8, front: "What is the Pythagorean theorem?", back: "a² + b² = c²" }
  ];

  let displayCards = $derived(() => {
    if (isShuffled) {
      const shuffled = [...flashcards];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }
    return flashcards;
  });

  function nextCard() {
    if (currentCard < displayCards().length - 1) {
      currentCard++;
      isFlipped = false;
    }
  }

  function prevCard() {
    if (currentCard > 0) {
      currentCard--;
      isFlipped = false;
    }
  }

  function flipCard() {
    isFlipped = !isFlipped;
  }

  function markKnown() {
    const card = displayCards()[currentCard];
    knownCards.add(card.id);
    unknownCards.delete(card.id);
    if (currentCard < displayCards().length - 1) {
      nextCard();
    }
  }

  function markUnknown() {
    const card = displayCards()[currentCard];
    unknownCards.add(card.id);
    knownCards.delete(card.id);
    if (currentCard < displayCards().length - 1) {
      nextCard();
    }
  }

  function resetCards() {
    currentCard = 0;
    isFlipped = false;
    knownCards.clear();
    unknownCards.clear();
  }

  function toggleShuffle() {
    isShuffled = !isShuffled;
    currentCard = 0;
    isFlipped = false;
  }

  function getProgress() {
    return Math.round((knownCards.size / flashcards.length) * 100);
  }
</script>

<svelte:head>
  <title>Flashcards - MOUAU Exam Portal</title>
</svelte:head>

<div class="flashcards-page">
  <!-- Header -->
  <div class="flashcards-header">
    <a href="/student/study" class="back-link">
      <ArrowLeft size={16} />
      Back to Study
    </a>
    <div class="header-info">
      <span class="topic-label">Mathematics Flashcards</span>
      <span class="card-counter">{currentCard + 1} of {displayCards().length}</span>
    </div>
  </div>

  <!-- Progress -->
  <div class="progress-section">
    <div class="progress-info">
      <span class="progress-label">Progress</span>
      <span class="progress-value">{getProgress()}%</span>
    </div>
    <div class="progress-bar">
      <div class="progress-fill" style="width: {getProgress()}%;"></div>
    </div>
    <div class="progress-stats">
      <span class="stat known">
        <CheckCircle size={12} /> Known: {knownCards.size}
      </span>
      <span class="stat unknown">
        <XCircle size={12} /> Need Review: {unknownCards.size}
      </span>
      <span class="stat total">
        <BookOpen size={12} /> Total: {flashcards.length}
      </span>
    </div>
  </div>

  <!-- Flashcard -->
  <div class="flashcard-container">
    <div class="flashcard" class:flipped={isFlipped} onclick={flipCard}>
      <div class="flashcard-inner">
        <div class="flashcard-front">
          <div class="card-label">Question</div>
          <div class="card-content">{displayCards()[currentCard].front}</div>
          <div class="card-hint">Click to flip</div>
        </div>
        <div class="flashcard-back">
          <div class="card-label">Answer</div>
          <div class="card-content">{displayCards()[currentCard].back}</div>
          <div class="card-hint">Click to flip back</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Controls -->
  <div class="controls">
    <button class="control-btn" onclick={prevCard} disabled={currentCard === 0}>
      <ChevronLeft size={20} />
    </button>
    <div class="control-group">
      <button class="control-btn action unknown-btn" onclick={markUnknown} title="Need Review">
        <XCircle size={18} /> Need Review
      </button>
      <button class="control-btn action known-btn" onclick={markKnown} title="I Know This">
        <CheckCircle size={18} /> I Know This
      </button>
    </div>
    <button class="control-btn" onclick={nextCard} disabled={currentCard === displayCards().length - 1}>
      <ChevronRight size={20} />
    </button>
  </div>

  <!-- Bottom Actions -->
  <div class="bottom-actions">
    <button class="btn-secondary" onclick={toggleShuffle}>
      <Shuffle size={14} />
      {isShuffled ? 'Unshuffle' : 'Shuffle'}
    </button>
    <button class="btn-secondary" onclick={resetCards}>
      <RotateCw size={14} />
      Reset Progress
    </button>
    <button class="btn-primary" onclick={() => goto('/student/study')}>
      <Home size={14} />
      Back to Study
    </button>
  </div>

  <!-- Tips -->
  <div class="tips">
    <Brain size={16} />
    <span>Tips: Flip the card to check your answer. Mark cards you know to track your progress.</span>
  </div>
</div>

<style>
  .flashcards-page {
    max-width: 700px;
    margin: 0 auto;
    padding: 2rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .flashcards-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 0;
    border-bottom: 1px solid var(--color-border);
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-muted);
    text-decoration: none;
    transition: color 0.15s;
  }

  .back-link:hover {
    color: var(--lc-600, #4f46e5);
  }

  .header-info {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .topic-label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .card-counter {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-muted);
    padding: 0.2rem 0.6rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 999px;
  }

  .progress-section {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 1rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .progress-info {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .progress-label {
    color: var(--color-muted);
  }

  .progress-value {
    color: var(--color-text);
  }

  .progress-bar {
    width: 100%;
    height: 6px;
    background: var(--color-bg);
    border-radius: 999px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--lc-600, #4f46e5);
    border-radius: 999px;
    transition: width 0.6s ease;
  }

  .progress-stats {
    display: flex;
    gap: 1rem;
    font-size: 0.75rem;
  }

  .stat {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    font-weight: 600;
  }

  .stat.known {
    color: #16a34a;
  }

  .stat.unknown {
    color: #dc2626;
  }

  .stat.total {
    color: var(--color-muted);
  }

  .flashcard-container {
    perspective: 1000px;
    height: 350px;
  }

  .flashcard {
    width: 100%;
    height: 100%;
    cursor: pointer;
    position: relative;
    transform-style: preserve-3d;
    transition: transform 0.6s;
  }

  .flashcard.flipped {
    transform: rotateY(180deg);
  }

  .flashcard-inner {
    width: 100%;
    height: 100%;
    position: relative;
  }

  .flashcard-front,
  .flashcard-back {
    position: absolute;
    width: 100%;
    height: 100%;
    backface-visibility: hidden;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 2rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    text-align: center;
  }

  .flashcard-back {
    transform: rotateY(180deg);
    background: var(--lc-soft, rgba(79,70,229,0.04));
    border-color: var(--lc-600, #4f46e5);
  }

  .card-label {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 1rem;
  }

  .card-content {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-text);
    line-height: 1.6;
    flex: 1;
    display: flex;
    align-items: center;
  }

  .card-hint {
    font-size: 0.7rem;
    color: var(--color-muted);
    margin-top: 1rem;
  }

  .controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }

  .control-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border: 1px solid var(--color-border);
    border-radius: 50%;
    background: var(--color-surface);
    color: var(--color-text);
    cursor: pointer;
    transition: all 0.15s;
  }

  .control-btn:hover:not(:disabled) {
    border-color: var(--lc-600, #4f46e5);
    color: var(--lc-600, #4f46e5);
  }

  .control-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .control-group {
    display: flex;
    gap: 0.5rem;
    flex: 1;
    justify-content: center;
  }

  .control-btn.action {
    width: auto;
    padding: 0 1rem;
    border-radius: 0.5rem;
    gap: 0.4rem;
    font-size: 0.8rem;
    font-weight: 700;
    border-width: 2px;
  }

  .control-btn.action.known-btn {
    border-color: #16a34a;
    color: #16a34a;
  }

  .control-btn.action.known-btn:hover {
    background: rgba(22,163,74,0.08);
  }

  .control-btn.action.unknown-btn {
    border-color: #dc2626;
    color: #dc2626;
  }

  .control-btn.action.unknown-btn:hover {
    background: rgba(220,38,38,0.08);
  }

  .bottom-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
    flex-wrap: wrap;
  }

  .btn-secondary {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 1rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-text);
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-secondary:hover {
    border-color: var(--lc-600, #4f46e5);
    color: var(--lc-600, #4f46e5);
  }

  .btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 1rem;
    background: var(--lc-600, #4f46e5);
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-primary:hover {
    background: var(--lc-700, #4338ca);
    transform: translateY(-1px);
  }

  .tips {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    font-size: 0.8rem;
    color: var(--color-muted);
  }

  /* Responsive */
  @media (max-width: 768px) {
    .flashcards-page {
      padding: 1rem;
      gap: 1.5rem;
    }

    .flashcard-container {
      height: 280px;
    }

    .flashcard-front,
    .flashcard-back {
      padding: 1.5rem;
    }

    .card-content {
      font-size: 1rem;
    }

    .controls {
      flex-wrap: wrap;
      justify-content: center;
    }

    .control-group {
      order: -1;
      flex: 1 1 100%;
    }

    .bottom-actions {
      flex-direction: column;
    }

    .bottom-actions .btn-primary,
    .bottom-actions .btn-secondary {
      justify-content: center;
    }
  }

  @media (max-width: 480px) {
    .flashcards-header {
      flex-direction: column;
      gap: 0.5rem;
      align-items: flex-start;
    }

    .control-btn.action {
      font-size: 0.7rem;
      padding: 0 0.75rem;
    }

    .progress-stats {
      flex-wrap: wrap;
    }
  }
</style>