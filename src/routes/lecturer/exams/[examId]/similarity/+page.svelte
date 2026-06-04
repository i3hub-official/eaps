<!-- src/routes/(lecturer)/exams/[examId]/similarity/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
  const { exam, fitbAnswers, mcqSuspicious } = data;

  // Group FITB answers by question
  const fitbByQuestion = $derived(() => {
    const map = new Map<string, { body: string; answers: typeof fitbAnswers }>();
    for (const a of fitbAnswers) {
      if (!map.has(a.question_id)) map.set(a.question_id, { body: a.question_body, answers: [] });
      map.get(a.question_id)!.answers.push(a);
    }
    return [...map.values()];
  });

  // Find duplicate FITB answers (same text, same question)
  const fitbDuplicates = $derived(() => {
    const dupes: { body: string; answer: string; students: string[] }[] = [];
    for (const q of fitbByQuestion()) {
      const answerMap = new Map<string, string[]>();
      for (const a of q.answers) {
        const key = (a.text_answer ?? '').trim().toLowerCase();
        if (!answerMap.has(key)) answerMap.set(key, []);
        answerMap.get(key)!.push(a.student_name);
      }
      for (const [answer, students] of answerMap) {
        if (students.length >= 2) {
          dupes.push({ body: q.body, answer, students });
        }
      }
    }
    return dupes;
  });
</script>

<svelte:head><title>Similarity Report — {exam.title}</title></svelte:head>

<div class="page">
  <div class="page-header">
    <a href="/lecturer/exams" class="back">← Exams</a>
    <div>
      <h1>Answer Similarity Report</h1>
      <p class="sub">{exam.title} · {exam.course.code}</p>
    </div>
  </div>

  <!-- MCQ suspicious patterns -->
  <section class="section">
    <h2>
      Suspicious MCQ Patterns
      <span class="badge">{mcqSuspicious.length}</span>
    </h2>
    <p class="section-desc">Students who chose the same wrong answer for the same question (≥2 students).</p>

    {#if mcqSuspicious.length === 0}
      <div class="empty">No suspicious MCQ patterns detected.</div>
    {:else}
      <div class="card-list">
        {#each mcqSuspicious as item}
          <div class="item suspicious">
            <div class="item-header">
              <span class="count-badge">{item.count} students</span>
            </div>
            <p class="q-body">{item.question_body}</p>
            <p class="wrong-answer">Wrong answer chosen: <strong>"{item.option_text}"</strong></p>
            <p class="students">Students: {item.student_names}</p>
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <!-- FITB duplicate answers -->
  <section class="section">
    <h2>
      Identical FITB Answers
      <span class="badge">{fitbDuplicates().length}</span>
    </h2>
    <p class="section-desc">Students who gave the exact same fill-in-the-blank answer (≥2 students).</p>

    {#if fitbDuplicates().length === 0}
      <div class="empty">No identical FITB answers found.</div>
    {:else}
      <div class="card-list">
        {#each fitbDuplicates() as item}
          <div class="item" class:correct-dup={item.answer.length > 0}>
            <p class="q-body">{item.body}</p>
            <p class="dup-answer">Answer: <strong>"{item.answer}"</strong></p>
            <div class="student-pills">
              {#each item.students as s}
                <span class="pill">{s}</span>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <!-- All FITB answers per question -->
  <section class="section">
    <h2>All FITB Answers by Question</h2>
    {#if fitbByQuestion().length === 0}
      <div class="empty">No fill-in-the-blank answers recorded.</div>
    {:else}
      {#each fitbByQuestion() as q}
        <div class="fitb-group">
          <p class="q-body">{q.body}</p>
          <table>
            <thead>
              <tr><th>Student</th><th>Matric</th><th>Answer</th><th>Result</th></tr>
            </thead>
            <tbody>
              {#each q.answers as a}
                <tr>
                  <td>{a.student_name}</td>
                  <td class="mono">{a.matric_number ?? '—'}</td>
                  <td class="answer-cell">{a.text_answer}</td>
                  <td>
                    <span class="result-dot" class:correct={a.is_correct} class:wrong={!a.is_correct}>
                      {a.is_correct ? '✓' : '✗'}
                    </span>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/each}
    {/if}
  </section>
</div>
<style>
  .page { padding: 2rem; max-width: 960px; margin: 0 auto; display: flex; flex-direction: column; gap: 2rem; }
  .page-header { display: flex; align-items: flex-start; gap: 1rem; }
  .back { color: var(--lc-600); text-decoration: none; font-size: 0.875rem; margin-top: 0.3rem; }
  h1   { font-size: 1.3rem; font-weight: 700; margin: 0; }
  .sub { font-size: 0.85rem; color: var(--color-muted); margin: 0.2rem 0 0; }

  .section { display: flex; flex-direction: column; gap: 1rem; }
  h2 { font-size: 1rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 0.5rem; }
  .badge {
    font-size: 0.72rem; font-weight: 700; padding: 0.15rem 0.5rem;
    background: var(--lc-soft); color: var(--lc-600); border-radius: 999px;
  }
  .section-desc { font-size: 0.85rem; color: var(--color-muted); margin: 0; }

  .card-list { display: flex; flex-direction: column; gap: 0.75rem; }
  .item {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.75rem; padding: 1rem; display: flex; flex-direction: column; gap: 0.5rem;
  }
  .item.suspicious { border-color: #f59e0b; background: #fffbeb; }

  .item-header { display: flex; gap: 0.5rem; }
  .count-badge {
    font-size: 0.72rem; font-weight: 700; padding: 0.2rem 0.5rem;
    background: #fee2e2; color: #dc2626; border-radius: 999px;
  }
  .q-body       { font-size: 0.9rem; font-weight: 500; margin: 0; }
  .wrong-answer { font-size: 0.85rem; color: #dc2626; margin: 0; }
  .dup-answer   { font-size: 0.85rem; color: var(--color-muted); margin: 0; }
  .students     { font-size: 0.82rem; color: var(--color-muted); margin: 0; }

  .student-pills { display: flex; gap: 0.35rem; flex-wrap: wrap; }
  .pill {
    font-size: 0.75rem; padding: 0.2rem 0.6rem;
    background: var(--lc-soft); color: var(--lc-600);
    border-radius: 999px;
  }

  .fitb-group {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.75rem; overflow: hidden; margin-bottom: 0.75rem;
  }
  .fitb-group .q-body {
    padding: 0.875rem 1rem; border-bottom: 1px solid var(--color-border);
    background: var(--color-bg); font-weight: 600; margin: 0;
  }
  table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  th { padding: 0.6rem 1rem; text-align: left; font-size: 0.72rem; font-weight: 600; color: var(--color-muted); text-transform: uppercase; background: var(--color-bg); }
  td { padding: 0.6rem 1rem; border-top: 1px solid var(--color-border); }
  tr:hover td { background: var(--color-bg); }
  .mono { font-family: monospace; font-size: 0.82rem; }
  .answer-cell { font-style: italic; }
  .result-dot { font-weight: 700; font-size: 1rem; }
  .result-dot.correct { color: #16a34a; }
  .result-dot.wrong   { color: #dc2626; }
  .empty { color: var(--color-muted); font-size: 0.875rem; padding: 1.5rem; text-align: center; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; }
</style>