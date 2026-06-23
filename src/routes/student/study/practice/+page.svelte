<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { 
    ArrowLeft, CheckCircle, XCircle, 
    AlertCircle, ChevronRight, ChevronLeft,
    Clock, Zap, Target, Brain,
    BarChart3, Home, RefreshCw,
    BookOpen, Star, Award
  } from '@lucide/svelte';

  let currentQuestion = $state(0);
  let selectedAnswer = $state<string | null>(null);
  let showResult = $state(false);
  let score = $state(0);
  let answers = $state<string[]>([]);
  let timeLeft = $state(60);
  let timer: any = null;

  // Mock questions - replace with actual API data
  const questions = [
    {
      id: 1,
      question: "What is the value of x in the equation 2x + 5 = 13?",
      options: ["3", "4", "5", "6"],
      correct: 1,
      explanation: "Subtract 5 from both sides: 2x = 8, then divide by 2: x = 4"
    },
    {
      id: 2,
      question: "What is the derivative of x²?",
      options: ["x", "2x", "x²", "2"],
      correct: 1,
      explanation: "The derivative of x² is 2x using the power rule."
    },
    {
      id: 3,
      question: "What is the mean of 2, 4, 6, 8, 10?",
      options: ["4", "5", "6", "7"],
      correct: 2,
      explanation: "Sum = 30, count = 5, mean = 30/5 = 6"
    },
    {
      id: 4,
      question: "What is the area of a circle with radius 3?",
      options: ["9π", "6π", "3π", "12π"],
      correct: 0,
      explanation: "Area = πr² = π(3)² = 9π"
    },
    {
      id: 5,
      question: "Solve for y: 3y - 7 = 14",
      options: ["5", "7", "9", "11"],
      correct: 1,
      explanation: "Add 7 to both sides: 3y = 21, divide by 3: y = 7"
    }
  ];

  $effect(() => {
    // Start timer
    if (!showResult && questions.length > 0) {
      timer = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
          clearInterval(timer);
          submitQuiz();
        }
      }, 1000);
    }

    return () => clearInterval(timer);
  });

  function selectAnswer(index: number) {
    if (selectedAnswer !== null || showResult) return;
    selectedAnswer = questions[currentQuestion].options[index];
    answers[currentQuestion] = questions[currentQuestion].options[index];
    
    if (index === questions[currentQuestion].correct) {
      score++;
    }
  }

  function nextQuestion() {
    if (currentQuestion < questions.length - 1) {
      currentQuestion++;
      selectedAnswer = null;
    } else {
      submitQuiz();
    }
  }

  function previousQuestion() {
    if (currentQuestion > 0) {
      currentQuestion--;
      selectedAnswer = answers[currentQuestion] || null;
    }
  }

  function submitQuiz() {
    clearInterval(timer);
    showResult = true;
  }

  function restartQuiz() {
    currentQuestion = 0;
    selectedAnswer = null;
    showResult = false;
    score = 0;
    answers = [];
    timeLeft = 60;
    clearInterval(timer);
  }

  function getScoreColor(score: number, total: number): string {
    const pct = (score / total) * 100;
    if (pct >= 80) return '#16a34a';
    if (pct >= 60) return '#2563eb';
    if (pct >= 40) return '#d97706';
    return '#dc2626';
  }

  function getScoreLabel(score: number, total: number): string {
    const pct = (score / total) * 100;
    if (pct >= 80) return 'Excellent! 🌟';
    if (pct >= 60) return 'Good job! 💪';
    if (pct >= 40) return 'Keep practicing! 📚';
    return 'Need more practice 🎯';
  }
</script>

<svelte:head>
  <title>Practice - MOUAU Exam Portal</title>
</svelte:head>

<div class="practice-page">
  <!-- Header -->
  <div class="practice-header">
    <a href="/student/study" class="back-link">
      <ArrowLeft size={16} />
      Back to Study
    </a>
    <div class="header-info">
      <span class="topic-label">Mathematics Practice</span>
      <span class="question-counter">{currentQuestion + 1} of {questions.length}</span>
    </div>
  </div>

  {#if !showResult}
    <!-- Active Quiz -->
    <div class="quiz-container">
      <!-- Timer and Progress -->
      <div class="quiz-topbar">
        <div class="timer" class:urgent={timeLeft <= 10}>
          <Clock size={16} />
          <span>{timeLeft}s</span>
        </div>
        <div class="progress-dots">
          {#each questions as q, i}
            <span 
              class="dot" 
              class:answered={answers[i] !== undefined}
              class:active={i === currentQuestion}
            ></span>
          {/each}
        </div>
      </div>

      <!-- Question -->
      <div class="question-container">
        <div class="question-number">Question {currentQuestion + 1}</div>
        <h3 class="question-text">{questions[currentQuestion].question}</h3>
        
        <div class="options">
          {#each questions[currentQuestion].options as option, index}
            <button 
              class="option"
              class:selected={selectedAnswer === option}
              class:correct={showResult && index === questions[currentQuestion].correct}
              class:wrong={showResult && selectedAnswer === option && index !== questions[currentQuestion].correct}
              onclick={() => selectAnswer(index)}
              disabled={selectedAnswer !== null}
            >
              <span class="option-letter">{String.fromCharCode(65 + index)}</span>
              <span class="option-text">{option}</span>
              {#if showResult && index === questions[currentQuestion].correct}
                <CheckCircle size={16} class="option-icon correct" />
              {:else if showResult && selectedAnswer === option && index !== questions[currentQuestion].correct}
                <XCircle size={16} class="option-icon wrong" />
              {/if}
            </button>
          {/each}
        </div>

        {#if selectedAnswer !== null && !showResult}
          <div class="feedback">
            <AlertCircle size={16} />
            <span>Select an answer to continue</span>
          </div>
        {/if}
      </div>

      <!-- Navigation -->
      <div class="quiz-nav">
        <button 
          class="nav-btn prev" 
          onclick={previousQuestion}
          disabled={currentQuestion === 0}
        >
          <ChevronLeft size={16} /> Previous
        </button>
        <button 
          class="nav-btn next" 
          onclick={nextQuestion}
          disabled={selectedAnswer === null}
        >
          {currentQuestion === questions.length - 1 ? 'Submit' : 'Next'}
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  {:else}
    <!-- Results -->
    <div class="results-container">
      <div class="results-card">
        <div class="results-icon" style="background: {getScoreColor(score, questions.length)}20; color: {getScoreColor(score, questions.length)};">
          <Award size={48} />
        </div>
        <h2 class="results-title">{getScoreLabel(score, questions.length)}</h2>
        <div class="results-score">
          <span class="score-number">{score}</span>
          <span class="score-total">/ {questions.length}</span>
        </div>
        <div class="results-percentage" style="color: {getScoreColor(score, questions.length)};">
          {Math.round((score / questions.length) * 100)}%
        </div>

        <div class="results-stats">
          <div class="stat-item">
            <span class="stat-label">Correct</span>
            <span class="stat-value correct">{score}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Wrong</span>
            <span class="stat-value wrong">{questions.length - score}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Time</span>
            <span class="stat-value">{60 - timeLeft}s</span>
          </div>
        </div>

        <div class="results-actions">
          <button class="btn-primary" onclick={restartQuiz}>
            <RefreshCw size={14} /> Retry
          </button>
          <button class="btn-secondary" onclick={() => goto('/student/study')}>
            <Home size={14} /> Back to Study
          </button>
        </div>
      </div>

      <!-- Review Answers -->
      <div class="review-section">
        <h3 class="review-title">Review Answers</h3>
        <div class="review-list">
          {#each questions as q, i}
            <div class="review-item">
              <div class="review-header">
                <span class="review-number">Q{i + 1}</span>
                <span class="review-status">
                  {#if answers[i] === q.options[q.correct]}
                    <CheckCircle size={14} style="color: #16a34a;" />
                  {:else}
                    <XCircle size={14} style="color: #dc2626;" />
                  {/if}
                </span>
              </div>
              <p class="review-question">{q.question}</p>
              <div class="review-answer">
                <span class="label">Your answer:</span>
                <span class="value" class:correct={answers[i] === q.options[q.correct]} class:wrong={answers[i] !== q.options[q.correct]}>
                  {answers[i] || 'Not answered'}
                </span>
              </div>
              <div class="review-explanation">
                <span class="label">Explanation:</span>
                <span>{q.explanation}</span>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .practice-page {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem 1.5rem;
  }

  .practice-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 0;
    margin-bottom: 2rem;
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

  .question-counter {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-muted);
    padding: 0.2rem 0.6rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 999px;
  }

  .quiz-container {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    padding: 2rem;
  }

  .quiz-topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  .timer {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--color-text);
    padding: 0.4rem 0.8rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
  }

  .timer.urgent {
    color: #dc2626;
    border-color: #dc2626;
    animation: pulse 1s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .progress-dots {
    display: flex;
    gap: 0.3rem;
  }

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--color-border);
    transition: all 0.3s;
  }

  .dot.answered {
    background: #16a34a;
  }

  .dot.active {
    background: var(--lc-600, #4f46e5);
    transform: scale(1.3);
    box-shadow: 0 0 0 3px rgba(79,70,229,0.2);
  }

  .question-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .question-number {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .question-text {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--color-text);
    margin: 0;
  }

  .options {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .option {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: var(--color-bg);
    border: 2px solid var(--color-border);
    border-radius: 0.625rem;
    cursor: pointer;
    transition: all 0.15s;
    text-align: left;
  }

  .option:hover:not(:disabled) {
    border-color: var(--lc-600, #4f46e5);
    background: var(--lc-soft, rgba(79,70,229,0.04));
  }

  .option:disabled {
    cursor: not-allowed;
    opacity: 0.8;
  }

  .option.selected {
    border-color: var(--lc-600, #4f46e5);
    background: var(--lc-soft, rgba(79,70,229,0.08));
  }

  .option.correct {
    border-color: #16a34a;
    background: rgba(22,163,74,0.08);
  }

  .option.wrong {
    border-color: #dc2626;
    background: rgba(220,38,38,0.08);
  }

  .option-letter {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-border);
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--color-muted);
    flex-shrink: 0;
  }

  .option.selected .option-letter {
    background: var(--lc-600, #4f46e5);
    color: white;
  }

  .option.correct .option-letter {
    background: #16a34a;
    color: white;
  }

  .option.wrong .option-letter {
    background: #dc2626;
    color: white;
  }

  .option-text {
    flex: 1;
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--color-text);
  }

  .option-icon {
    flex-shrink: 0;
  }

  .option-icon.correct {
    color: #16a34a;
  }

  .option-icon.wrong {
    color: #dc2626;
  }

  .feedback {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: rgba(245,158,11,0.08);
    border: 1px solid rgba(245,158,11,0.2);
    border-radius: 0.5rem;
    color: #d97706;
    font-size: 0.85rem;
    font-weight: 500;
  }

  .quiz-nav {
    display: flex;
    justify-content: space-between;
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--color-border);
  }

  .nav-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
  }

  .nav-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .nav-btn.prev {
    background: var(--color-bg);
    color: var(--color-text);
  }

  .nav-btn.prev:hover:not(:disabled) {
    background: var(--color-border);
  }

  .nav-btn.next {
    background: var(--lc-600, #4f46e5);
    color: white;
  }

  .nav-btn.next:hover:not(:disabled) {
    background: var(--lc-700, #4338ca);
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(79,70,229,0.3);
  }

  /* Results */
  .results-container {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .results-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    padding: 3rem 2rem;
    text-align: center;
  }

  .results-icon {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 1.5rem;
  }

  .results-title {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--color-text);
    margin: 0 0 0.5rem;
  }

  .results-score {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 0.3rem;
    margin-bottom: 0.25rem;
  }

  .score-number {
    font-size: 3rem;
    font-weight: 900;
    color: var(--color-text);
  }

  .score-total {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-muted);
  }

  .results-percentage {
    font-size: 1.25rem;
    font-weight: 800;
    margin-bottom: 2rem;
  }

  .results-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-bottom: 2rem;
    padding: 1rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
  }

  .stat-item .stat-label {
    font-size: 0.65rem;
    font-weight: 600;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .stat-item .stat-value {
    font-size: 1.25rem;
    font-weight: 800;
  }

  .stat-value.correct {
    color: #16a34a;
  }

  .stat-value.wrong {
    color: #dc2626;
  }

  .results-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
  }

  .btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 1.5rem;
    background: var(--lc-600, #4f46e5);
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-primary:hover {
    background: var(--lc-700, #4338ca);
    transform: translateY(-1px);
  }

  .btn-secondary {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 1.5rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-text);
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-secondary:hover {
    border-color: var(--lc-600, #4f46e5);
    color: var(--lc-600, #4f46e5);
  }

  /* Review Section */
  .review-section {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    padding: 1.5rem;
  }

  .review-title {
    font-size: 1rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0 0 1rem;
  }

  .review-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .review-item {
    padding: 1rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.625rem;
  }

  .review-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .review-number {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--color-muted);
  }

  .review-question {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--color-text);
    margin: 0 0 0.5rem;
  }

  .review-answer {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    margin-bottom: 0.5rem;
  }

  .review-answer .label {
    color: var(--color-muted);
    font-weight: 600;
  }

  .review-answer .value.correct {
    color: #16a34a;
    font-weight: 700;
  }

  .review-answer .value.wrong {
    color: #dc2626;
    font-weight: 700;
  }

  .review-explanation {
    display: flex;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: var(--color-muted);
    padding-top: 0.5rem;
    border-top: 1px solid var(--color-border);
  }

  .review-explanation .label {
    font-weight: 600;
    color: var(--color-text);
  }

  /* Responsive */
  @media (max-width: 768px) {
    .practice-page {
      padding: 1rem;
    }

    .quiz-container {
      padding: 1.25rem;
    }

    .quiz-topbar {
      flex-direction: column;
      gap: 1rem;
      align-items: stretch;
    }

    .progress-dots {
      justify-content: center;
    }

    .results-stats {
      grid-template-columns: 1fr 1fr;
    }

    .results-actions {
      flex-direction: column;
    }

    .results-actions .btn-primary,
    .results-actions .btn-secondary {
      justify-content: center;
    }
  }

  @media (max-width: 480px) {
    .practice-header {
      flex-direction: column;
      gap: 0.5rem;
      align-items: flex-start;
    }

    .results-stats {
      grid-template-columns: 1fr;
    }

    .results-card {
      padding: 2rem 1rem;
    }

    .score-number {
      font-size: 2.5rem;
    }
  }
</style>