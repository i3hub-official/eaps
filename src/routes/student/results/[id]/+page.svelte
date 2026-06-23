<!-- src/routes/student/results/[id]/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { 
    ArrowLeft, Award, TrendingUp, TrendingDown, 
    BarChart3, Clock, CheckCircle, 
    XCircle, AlertCircle, ChevronRight, 
    BookOpen, Target, Brain, Star, 
    Calendar, FileText, Zap, Users, GraduationCap,
    Check, X, CircleOff, ThumbsUp, ThumbsDown
  } from '@lucide/svelte';
  import { error } from '@sveltejs/kit';

  let { data }: { data: PageData } = $props();

  if (!data || !data.result) {
    throw error(404, 'Result not found');
  }

  const result = data.result;
  const exam = data.exam;
  const student = data.student;
  const topicAnalysis = data.topicAnalysis || [];

  // Calculate performance metrics
  const overallScore = result.score || 0;
  const totalMarks = result.totalMarks || 1;
  const percentage = totalMarks > 0 ? (overallScore / totalMarks) * 100 : 0;
  const timeSpent = result.timeSpent || 0;

  // Determine performance level
  function getPerformanceLevel(pct: number): { label: string; color: string; icon: any } {
    if (pct >= 80) return { label: 'Excellent', color: '#16a34a', icon: Star };
    if (pct >= 60) return { label: 'Good', color: '#2563eb', icon: TrendingUp };
    if (pct >= 40) return { label: 'Average', color: '#d97706', icon: AlertCircle };
    return { label: 'Needs Improvement', color: '#dc2626', icon: TrendingDown };
  }

  const performance = getPerformanceLevel(percentage);

  // Sort topics by performance
  const sortedTopics = [...topicAnalysis].sort((a, b) => (a.percentage || 0) - (b.percentage || 0));
  const strengths = sortedTopics.filter(t => (t.percentage || 0) >= 60).slice(0, 3);
  const weaknesses = sortedTopics.filter(t => (t.percentage || 0) < 40).slice(0, 3);

  // Format helpers
  function formatDate(d: string | Date | null | undefined) {
    if (!d) return 'N/A';
    const date = typeof d === 'string' ? new Date(d) : d;
    return new Intl.DateTimeFormat('en-NG', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  function formatTime(seconds: number): string {
    if (!seconds || seconds === 0) return 'N/A';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
  }

  function getScoreColor(pct: number): string {
    if (pct >= 80) return '#16a34a';
    if (pct >= 60) return '#2563eb';
    if (pct >= 40) return '#d97706';
    return '#dc2626';
  }

  // MOUAU Grade system
  function getGradeInfo(percentage: number) {
    if (percentage >= 70) return { grade: 'A', points: 5, label: 'Excellent', passed: true };
    if (percentage >= 60) return { grade: 'B', points: 4, label: 'Very Good', passed: true };
    if (percentage >= 50) return { grade: 'C', points: 3, label: 'Good', passed: true };
    if (percentage >= 45) return { grade: 'D', points: 2, label: 'Fair', passed: true };
    if (percentage >= 40) return { grade: 'E', points: 1, label: 'Pass', passed: true };
    return { grade: 'F', points: 0, label: 'Fail', passed: false };
  }

  const gradeInfo = getGradeInfo(percentage);
</script>

<svelte:head>
  <title>Results — {exam?.title || 'Exam'}</title>
</svelte:head>

<div class="page">
  <!-- Back Navigation -->
  <div class="back-nav">
    <a href="/student/results" class="back-link">
      <ArrowLeft size={16} />
      Back to Results
    </a>
  </div>

  <!-- Header -->
  <div class="header">
    <div>
      <div class="exam-badge">
        <span class="course-code">{exam?.courseCode || 'Course'}</span>
        <span class="exam-status" class:status-passed={result.passed} class:status-failed={!result.passed}>
          {#if result.passed}
            <Check size={12} /> Passed
          {:else}
            <X size={12} /> Failed
          {/if}
        </span>
      </div>
      <h1 class="exam-title">{exam?.title || 'Exam Results'}</h1>
      <div class="subtitle">
        <span class="student-name">{student?.fullName || 'Student'}</span>
        <span class="matric">{student?.matricNumber || 'N/A'}</span>
        {#if result.submittedAt}
          <span class="submitted-date">
            <Calendar size={12} />
            {formatDate(result.submittedAt)}
          </span>
        {/if}
      </div>
    </div>
    <div class="header-actions">
      {#if result.passed}
  <a href={`/student/results/${result.id}/certificate`} class="btn-primary">
    <FileText size={14} /> Certificate
  </a>
{/if}
    </div>
  </div>

  <!-- Score Overview -->
  <div class="score-overview">
    <div class="score-circle">
      <div class="score-ring" style={`--percentage: ${Math.min(percentage, 100)}%`}>
        <div class="score-content">
          <span class="score-value">{Math.round(percentage)}%</span>
          <span class="score-label">Overall</span>
        </div>
      </div>
      <div class="grade-display">
        <span class="grade-letter" style="color: {getScoreColor(percentage)}">{gradeInfo.grade}</span>
        <span class="grade-label">{gradeInfo.label}</span>
      </div>
    </div>

    <div class="score-details">
      <div class="detail-item">
        <span class="detail-label">Marks</span>
        <span class="detail-value">{overallScore} / {totalMarks}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Performance</span>
        <span class="detail-value" style="color: {performance.color}">
          <performance.icon size={14} />
          {performance.label}
        </span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Time Spent</span>
        <span class="detail-value"><Clock size={14} /> {formatTime(timeSpent)}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Questions</span>
        <span class="detail-value">{result.totalQuestions || 0} Questions</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Pass Mark</span>
        <span class="detail-value">{exam?.passMark || 40}%</span>
      </div>
      {#if result.violationCount > 0}
        <div class="detail-item">
          <span class="detail-label">Violations</span>
          <span class="detail-value" style="color: #f59e0b;">
            <AlertCircle size={14} /> {result.violationCount}
          </span>
        </div>
      {/if}
    </div>
  </div>

  <!-- Quick Stats -->
  <div class="quick-stats">
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(22,163,74,0.1); color: #16a34a;">
        <CheckCircle size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{result.correctAnswers || 0}</span>
        <span class="stat-label">Correct</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(220,38,38,0.1); color: #dc2626;">
        <XCircle size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{result.wrongAnswers || 0}</span>
        <span class="stat-label">Wrong</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(37,99,235,0.08); color: #2563eb;">
        <Zap size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{result.avgTimePerQuestion || 0}s</span>
        <span class="stat-label">Avg Time/Question</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(124,58,237,0.08); color: #7c3aed;">
        <Target size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{result.answered || 0}/{result.totalQuestions || 0}</span>
        <span class="stat-label">Answered</span>
      </div>
    </div>
  </div>

  <!-- Topic Analysis -->
  {#if topicAnalysis && topicAnalysis.length > 0}
    <div class="topic-analysis">
      <div class="section-header">
        <div class="section-title">
          <Brain size={18} />
          <h2>Topic Performance</h2>
        </div>
        <span class="section-badge">{topicAnalysis.length} Topics</span>
      </div>

      <div class="topic-grid">
        {#each topicAnalysis as topic}
          {@const pct = topic.percentage || 0}
          {@const color = getScoreColor(pct)}
          <div class="topic-card">
            <div class="topic-header">
              <span class="topic-name">{topic.name}</span>
              <span class="topic-score" style="color: {color}">
                {Math.round(pct)}%
              </span>
            </div>
            <div class="progress-bar">
              <div 
                class="progress-fill" 
                style="width: {Math.min(pct, 100)}%; background: {color};"
              ></div>
            </div>
            <div class="topic-details">
              <span class="detail">
                <CheckCircle size={10} /> {topic.correct || 0}
              </span>
              <span class="detail">
                <XCircle size={10} /> {topic.wrong || 0}
              </span>
              <span class="detail">
                <Clock size={10} /> {topic.avgTime || 0}s
              </span>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Strengths & Weaknesses -->
    <div class="strengths-weaknesses">
      <div class="strengths">
        <div class="section-header">
          <div class="section-title">
            <TrendingUp size={18} style="color: #16a34a;" />
            <h3>Strengths</h3>
          </div>
          <span class="badge success">{strengths.length} Topics</span>
        </div>
        {#if strengths.length > 0}
          <ul class="topic-list">
            {#each strengths as topic}
              <li>
                <CheckCircle size={14} style="color: #16a34a;" />
                <span class="topic-name">{topic.name}</span>
                <span class="score">{Math.round(topic.percentage || 0)}%</span>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="empty-text">Keep practicing to identify your strengths!</p>
        {/if}
      </div>

      <div class="weaknesses">
        <div class="section-header">
          <div class="section-title">
            <TrendingDown size={18} style="color: #dc2626;" />
            <h3>Areas for Improvement</h3>
          </div>
          <span class="badge danger">{weaknesses.length} Topics</span>
        </div>
        {#if weaknesses.length > 0}
          <ul class="topic-list">
            {#each weaknesses as topic}
              <li>
                <XCircle size={14} style="color: #dc2626;" />
                <span class="topic-name">{topic.name}</span>
                <span class="score">{Math.round(topic.percentage || 0)}%</span>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="empty-text success">Great job! No significant weaknesses identified.</p>
        {/if}
      </div>
    </div>

    <!-- Recommendations -->
    {#if weaknesses.length > 0}
      <div class="recommendations">
        <div class="section-header">
          <div class="section-title">
            <Target size={18} />
            <h2>Recommendations</h2>
          </div>
        </div>
        <div class="recommendation-grid">
          {#each weaknesses as topic}
            <div class="recommendation-card">
              <div class="rec-icon" style="background: rgba(220,38,38,0.08); color: #dc2626;">
                <BookOpen size={16} />
              </div>
              <div class="rec-content">
                <h4>Review {topic.name}</h4>
                <p>Focus on understanding the core concepts in this topic. Consider revisiting your notes and practicing more questions.</p>
                <a href={`/student/study/${topic.id}`} class="rec-link">
                  Study Now <ChevronRight size={12} />
                </a>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {:else}
    <div class="empty-state">
      <div class="empty-icon"><BarChart3 size={48} strokeWidth={1.2} /></div>
      <p class="empty-title">No topic analysis available</p>
      <p class="empty-sub">Detailed topic breakdown will appear here once available.</p>
    </div>
  {/if}
</div>

<style>
  .page {
    max-width: 1100px;
    margin: 0 auto;
    padding: 2rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  /* Back Navigation */
  .back-nav {
    margin-bottom: 0.5rem;
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

  /* Header */
  .header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .exam-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .course-code {
    font-size: 0.7rem;
    font-weight: 800;
    padding: 0.2rem 0.6rem;
    background: var(--lc-soft, rgba(79,70,229,0.08));
    color: var(--lc-600, #4f46e5);
    border-radius: 999px;
  }

  .exam-status {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.65rem;
    font-weight: 700;
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
  }

  .status-passed {
    background: rgba(22,163,74,0.1);
    color: #16a34a;
  }

  .status-failed {
    background: rgba(220,38,38,0.1);
    color: #dc2626;
  }

  .exam-title {
    font-size: 1.5rem;
    font-weight: 900;
    color: var(--color-text);
    margin: 0 0 0.5rem;
  }

  .subtitle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .student-name {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .matric {
    font-size: 0.78rem;
    color: var(--color-muted);
  }

  .submitted-date {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    font-size: 0.78rem;
    color: var(--color-muted);
  }

  .header-actions {
    flex-shrink: 0;
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
    text-decoration: none;
    transition: all 0.15s;
  }

  .btn-primary:hover {
    background: var(--lc-700, #4338ca);
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(79,70,229,0.3);
  }

  /* Score Overview */
  .score-overview {
    display: flex;
    align-items: center;
    gap: 3rem;
    padding: 2rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
  }

  .score-circle {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .score-ring {
    width: 140px;
    height: 140px;
    border-radius: 50%;
    background: conic-gradient(
      var(--lc-600) calc(var(--percentage) * 1%),
      var(--color-border) calc(var(--percentage) * 1%)
    );
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .score-ring::after {
    content: '';
    position: absolute;
    width: 110px;
    height: 110px;
    border-radius: 50%;
    background: var(--color-surface);
  }

  .score-content {
    position: relative;
    z-index: 1;
    text-align: center;
  }

  .score-value {
    display: block;
    font-size: 2rem;
    font-weight: 900;
    color: var(--color-text);
    line-height: 1;
  }

  .score-label {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .grade-display {
    text-align: center;
  }

  .grade-letter {
    display: block;
    font-size: 2rem;
    font-weight: 900;
    line-height: 1;
  }

  .grade-label {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--color-muted);
  }

  .score-details {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    flex: 1;
  }

  .detail-item {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .detail-label {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .detail-value {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 1.1rem;
    font-weight: 800;
    color: var(--color-text);
  }

  /* Quick Stats */
  .quick-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.75rem;
  }

  .stat-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
  }

  .stat-icon {
    width: 38px;
    height: 38px;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .stat-content {
    display: flex;
    flex-direction: column;
  }

  .stat-value {
    font-size: 1.1rem;
    font-weight: 800;
    color: var(--color-text);
    line-height: 1.2;
  }

  .stat-label {
    font-size: 0.65rem;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-weight: 600;
  }

  /* Section Header */
  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .section-title h2,
  .section-title h3 {
    font-size: 1rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0;
  }

  .section-badge {
    font-size: 0.7rem;
    font-weight: 700;
    padding: 0.15rem 0.6rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 999px;
    color: var(--color-muted);
  }

  .badge {
    font-size: 0.65rem;
    font-weight: 700;
    padding: 0.1rem 0.5rem;
    border-radius: 999px;
  }

  .badge.success {
    color: #16a34a;
    background: rgba(22,163,74,0.1);
  }

  .badge.danger {
    color: #dc2626;
    background: rgba(220,38,38,0.1);
  }

  /* Topic Analysis */
  .topic-analysis {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    padding: 1.5rem;
  }

  .topic-grid {
    display: grid;
    gap: 1rem;
  }

  .topic-card {
    padding: 0.75rem 1rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.625rem;
  }

  .topic-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.4rem;
  }

  .topic-name {
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--color-text);
  }

  .topic-score {
    font-weight: 800;
    font-size: 0.85rem;
  }

  .progress-bar {
    width: 100%;
    height: 6px;
    background: var(--color-border);
    border-radius: 999px;
    overflow: hidden;
    margin-bottom: 0.4rem;
  }

  .progress-fill {
    height: 100%;
    border-radius: 999px;
    transition: width 0.6s ease;
  }

  .topic-details {
    display: flex;
    gap: 1rem;
    font-size: 0.7rem;
    color: var(--color-muted);
  }

  .detail {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
  }

  /* Strengths & Weaknesses */
  .strengths-weaknesses {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }

  .strengths,
  .weaknesses {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    padding: 1.5rem;
  }

  .topic-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .topic-list li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: var(--color-bg);
    border-radius: 0.5rem;
  }

  .topic-list .topic-name {
    flex: 1;
  }

  .topic-list .score {
    font-weight: 700;
    font-size: 0.8rem;
  }

  .empty-text {
    color: var(--color-muted);
    font-size: 0.85rem;
    margin: 0.5rem 0;
  }

  .empty-text.success {
    color: #16a34a;
  }

  /* Recommendations */
  .recommendations {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    padding: 1.5rem;
  }

  .recommendation-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
  }

  .recommendation-card {
    display: flex;
    gap: 0.75rem;
    padding: 1rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    transition: border-color 0.15s;
  }

  .recommendation-card:hover {
    border-color: var(--lc-600, #4f46e5);
  }

  .rec-icon {
    width: 36px;
    height: 36px;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .rec-content {
    flex: 1;
  }

  .rec-content h4 {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0 0 0.2rem;
  }

  .rec-content p {
    font-size: 0.78rem;
    color: var(--color-muted);
    margin: 0 0 0.5rem;
  }

  .rec-link {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--lc-600, #4f46e5);
    text-decoration: none;
    transition: color 0.15s;
  }

  .rec-link:hover {
    color: var(--lc-700, #4338ca);
  }

  /* Empty State */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 4rem 2rem;
    text-align: center;
    background: var(--color-surface);
    border: 1.5px dashed var(--color-border);
    border-radius: 1rem;
  }

  .empty-icon {
    width: 64px;
    height: 64px;
    border-radius: 1rem;
    background: var(--lc-soft, rgba(79,70,229,0.08));
    border: 1px solid rgba(79,70,229,0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--lc-600, #4f46e5);
  }

  .empty-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0;
  }

  .empty-sub {
    font-size: 0.85rem;
    color: var(--color-muted);
    margin: 0;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .page {
      padding: 1rem;
    }

    .score-overview {
      flex-direction: column;
      gap: 2rem;
      text-align: center;
      padding: 1.5rem;
    }

    .score-details {
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      width: 100%;
    }

    .strengths-weaknesses {
      grid-template-columns: 1fr;
    }

    .header {
      flex-direction: column;
    }

    .header-actions {
      width: 100%;
    }

    .header-actions .btn-primary {
      width: 100%;
      justify-content: center;
    }
  }

  @media (max-width: 480px) {
    .score-details {
      grid-template-columns: 1fr;
    }

    .quick-stats {
      grid-template-columns: 1fr 1fr;
    }

    .recommendation-grid {
      grid-template-columns: 1fr;
    }
  }
</style>