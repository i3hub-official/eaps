<script lang="ts">
  import { BrainCircuit, Search, ArrowUpDown, CheckCircle2, XCircle, Clock, AlertTriangle, BarChart3 } from 'lucide-svelte';

  let questions = $state([
    { id: 'Q1', exam: 'CSC 201', body: 'What is the time complexity of binary search?', type: 'mcq', attempts: 145, correct: 132, accuracy: 91, avgTime: 45, difficulty: 'easy', discrimination: 0.82 },
    { id: 'Q2', exam: 'CSC 201', body: 'Explain the difference between stack and heap memory allocation.', type: 'fill_in_the_blank', attempts: 145, correct: 89, accuracy: 61, avgTime: 120, difficulty: 'medium', discrimination: 0.65 },
    { id: 'Q3', exam: 'MTH 101', body: 'Find the derivative of f(x) = x³ + 2x² - 5x + 1', type: 'mcq', attempts: 203, correct: 156, accuracy: 77, avgTime: 85, difficulty: 'medium', discrimination: 0.71 },
    { id: 'Q4', exam: 'MTH 101', body: 'Evaluate the integral ∫(2x + 3)dx from 0 to 4', type: 'mcq', attempts: 203, correct: 98, accuracy: 48, avgTime: 140, difficulty: 'hard', discrimination: 0.58 },
    { id: 'Q5', exam: 'PHY 102', body: 'State Newton's Second Law of Motion', type: 'fill_in_the_blank', attempts: 178, correct: 165, accuracy: 93, avgTime: 35, difficulty: 'easy', discrimination: 0.88 },
  ]);

  let searchQuery = $state('');
  let filtered = $derived(questions.filter(q => q.body.toLowerCase().includes(searchQuery.toLowerCase()) || q.exam.toLowerCase().includes(searchQuery.toLowerCase())));

  function getDifficultyColor(d: string) {
    return { easy: 'diff-easy', medium: 'diff-medium', hard: 'diff-hard' }[d] || 'diff-medium';
  }
</script>

<svelte:head><title>Question Analysis — MOUAU eTest</title></svelte:head>

<div class="page">
  <header class="page-header">
    <h1>Question Analysis</h1>
    <p class="subtitle">Difficulty index, discrimination coefficient, and accuracy per question</p>
  </header>

  <section class="filters-bar">
    <div class="search-box">
      <Search size={16} />
      <input type="text" placeholder="Search questions..." bind:value={searchQuery} />
    </div>
  </section>

  <section class="table-section">
    <table class="data-table">
      <thead>
        <tr>
          <th>Question <ArrowUpDown size={14} /></th>
          <th>Exam</th>
          <th>Type</th>
          <th>Attempts</th>
          <th>Accuracy</th>
          <th>Avg Time</th>
          <th>Difficulty</th>
          <th>Discrimination</th>
        </tr>
      </thead>
      <tbody>
        {#each filtered as q}
          <tr>
            <td>
              <div class="question-cell">
                <div class="question-icon"><BrainCircuit size={16} /></div>
                <span class="question-body">{q.body}</span>
              </div>
            </td>
            <td>{q.exam}</td>
            <td><span class="type-badge {q.type}">{q.type === 'mcq' ? 'MCQ' : 'Fill-in'}</span></td>
            <td>{q.attempts}</td>
            <td>
              <div class="accuracy-bar">
                <div class="accuracy-fill" style="width: {q.accuracy}%"></div>
                <span>{q.accuracy}%</span>
              </div>
            </td>
            <td>{q.avgTime}s</td>
            <td><span class="diff-badge {getDifficultyColor(q.difficulty)}">{q.difficulty}</span></td>
            <td>
              <div class="disc-bar">
                <div class="disc-fill" style="width: {q.discrimination * 100}%"></div>
                <span>{q.discrimination.toFixed(2)}</span>
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </section>
</div>

<style>
  .page { max-width: 1200px; }
  .page-header { margin-bottom: 1.5rem; }
  .page-header h1 { font-size: 1.5rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .subtitle { color: var(--color-muted); font-size: 0.9rem; margin-top: 0.25rem; }

  .filters-bar { display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; }
  .search-box { display: flex; align-items: center; gap: 0.5rem; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.5rem; padding: 0.5rem 0.75rem; flex: 1; min-width: 200px; }
  .search-box input { border: none; background: none; outline: none; color: var(--color-text); font-size: 0.875rem; width: 100%; }
  .search-box :global(svg) { color: var(--color-muted); flex-shrink: 0; }

  .table-section { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; overflow: hidden; }
  .data-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  .data-table th { text-align: left; padding: 0.875rem 1rem; color: var(--color-muted); font-weight: 500; border-bottom: 1px solid var(--color-border); background: var(--color-bg); white-space: nowrap; }
  .data-table td { padding: 1rem; border-bottom: 1px solid var(--color-border); color: var(--color-text); }
  .data-table tr:last-child td { border-bottom: none; }
  .data-table tr:hover td { background: var(--color-surface-hover); }

  .question-cell { display: flex; align-items: flex-start; gap: 0.75rem; max-width: 400px; }
  .question-icon { width: 32px; height: 32px; border-radius: 0.5rem; background: rgba(139, 92, 246, 0.1); color: #8b5cf6; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px; }
  .question-body { font-size: 0.875rem; color: var(--color-text); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

  .type-badge { padding: 0.25rem 0.5rem; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 600; }
  .type-badge.mcq { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
  .type-badge.fill_in_the_blank { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }

  .accuracy-bar { display: flex; align-items: center; gap: 0.5rem; }
  .accuracy-fill { height: 6px; background: #16a34a; border-radius: 3px; min-width: 20px; }
  .accuracy-bar span { font-size: 0.8rem; font-weight: 600; color: var(--color-text); min-width: 36px; }

  .diff-badge { padding: 0.25rem 0.5rem; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 600; text-transform: capitalize; }
  .diff-easy { background: rgba(22, 163, 74, 0.1); color: #16a34a; }
  .diff-medium { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
  .diff-hard { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

  .disc-bar { display: flex; align-items: center; gap: 0.5rem; }
  .disc-fill { height: 6px; background: #8b5cf6; border-radius: 3px; min-width: 20px; }
  .disc-bar span { font-size: 0.8rem; font-weight: 600; color: var(--color-text); min-width: 40px; }
</style>