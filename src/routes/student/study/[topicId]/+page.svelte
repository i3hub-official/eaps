<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { 
    ArrowLeft, BookOpen, Brain, Clock, 
    Target, TrendingUp, ChevronRight,
    Play, Zap, FileText, CheckCircle,
    XCircle, AlertCircle, BarChart3,
    Calendar, Users, GraduationCap,
    Star, Award, ListChecks, RefreshCw
  } from '@lucide/svelte';

  let { data } = $props();

  // Mock data - replace with actual API call
  const topicData = $derived(() => ({
    id: 'mathematics',
    name: 'Mathematics',
    description: 'Master algebra, calculus, statistics and geometry',
    progress: 75,
    totalQuestions: 150,
    completedQuestions: 112,
    averageScore: 68,
    timeSpent: 1420, // in minutes
    lastStudied: '2024-01-15T10:30:00',
    difficulty: 'Intermediate',
    subtopics: [
      { id: 'algebra', name: 'Algebra', progress: 85, questions: 40, completed: 34, avgScore: 72 },
      { id: 'calculus', name: 'Calculus', progress: 60, questions: 45, completed: 27, avgScore: 65 },
      { id: 'statistics', name: 'Statistics', progress: 90, questions: 35, completed: 32, avgScore: 78 },
      { id: 'geometry', name: 'Geometry', progress: 55, questions: 30, completed: 19, avgScore: 55 }
    ],
    recentActivity: [
      { type: 'practice', date: '2024-01-15T10:30:00', score: 85, questions: 10 },
      { type: 'quiz', date: '2024-01-14T14:20:00', score: 70, questions: 20 },
      { type: 'practice', date: '2024-01-13T09:15:00', score: 60, questions: 15 }
    ]
  }));

  const topic = topicData();

  function formatTime(minutes: number): string {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  function getScoreColor(score: number): string {
    if (score >= 80) return '#16a34a';
    if (score >= 60) return '#2563eb';
    if (score >= 40) return '#d97706';
    return '#dc2626';
  }

  function startSubTopic(subtopicId: string) {
    goto(`/student/study/practice?topic=${topic.id}&subtopic=${subtopicId}`);
  }

  function startPractice() {
    goto(`/student/study/practice?topic=${topic.id}`);
  }

  function viewFlashcards() {
    goto(`/student/study/flashcards?topic=${topic.id}`);
  }

  function startQuiz() {
    goto(`/student/study/quiz?topic=${topic.id}`);
  }
</script>

<svelte:head>
  <title>{topic.name} - Study - MOUAU Exam Portal</title>
</svelte:head>

<div class="topic-study-page">
  <!-- Navigation -->
  <div class="nav-header">
    <a href="/student/study" class="back-link">
      <ArrowLeft size={16} />
      Back to Study Center
    </a>
  </div>

  <!-- Topic Header -->
  <div class="topic-header">
    <div>
      <div class="topic-badge">
        <span class="topic-icon">📐</span>
        <span class="difficulty-badge" style="background: rgba(217,119,6,0.1); color: #d97706;">
          {topic.difficulty}
        </span>
      </div>
      <h1 class="topic-title">{topic.name}</h1>
      <p class="topic-description">{topic.description}</p>
    </div>
    <div class="header-actions">
      <button class="btn-primary" onclick={startPractice}>
        <Play size={14} /> Practice
      </button>
      <button class="btn-secondary" onclick={viewFlashcards}>
        <Brain size={14} /> Flashcards
      </button>
      <button class="btn-secondary" onclick={startQuiz}>
        <Zap size={14} /> Quick Quiz
      </button>
    </div>
  </div>

  <!-- Progress Overview -->
  <div class="progress-overview">
    <div class="progress-card main">
      <div class="progress-circle">
        <svg viewBox="0 0 36 36" class="circle-chart">
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                fill="none" 
                stroke="var(--color-border)" 
                stroke-width="3" 
                stroke-linecap="round"/>
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                fill="none" 
                stroke="var(--lc-600, #4f46e5)" 
                stroke-width="3" 
                stroke-linecap="round"
                stroke-dasharray="{topic.progress}, 100"
                stroke-dashoffset="0"/>
        </svg>
        <div class="circle-content">
          <span class="percentage">{topic.progress}%</span>
          <span class="label">Progress</span>
        </div>
      </div>
      <div class="progress-stats">
        <div class="stat">
          <span class="stat-label">Completed</span>
          <span class="stat-value">{topic.completedQuestions}/{topic.totalQuestions}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Avg Score</span>
          <span class="stat-value" style="color: {getScoreColor(topic.averageScore)}">
            {topic.averageScore}%
          </span>
        </div>
        <div class="stat">
          <span class="stat-label">Time Spent</span>
          <span class="stat-value"><Clock size={14} /> {formatTime(topic.timeSpent)}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Last Studied</span>
          <span class="stat-value"><Calendar size={14} /> {formatDate(topic.lastStudied)}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Quick Actions -->
  <div class="quick-actions">
    <button class="action-card" onclick={startPractice}>
      <div class="action-icon" style="background: rgba(79,70,229,0.1); color: #4f46e5;">
        <FileText size={20} />
      </div>
      <div class="action-content">
        <h4>Practice Questions</h4>
        <p>Test your knowledge with practice questions</p>
      </div>
      <ChevronRight size={16} class="action-arrow" />
    </button>
    <button class="action-card" onclick={viewFlashcards}>
      <div class="action-icon" style="background: rgba(22,163,74,0.1); color: #16a34a;">
        <Brain size={20} />
      </div>
      <div class="action-content">
        <h4>Flashcards</h4>
        <p>Review key concepts with flashcards</p>
      </div>
      <ChevronRight size={16} class="action-arrow" />
    </button>
    <button class="action-card" onclick={startQuiz}>
      <div class="action-icon" style="background: rgba(245,158,11,0.1); color: #f59e0b;">
        <Zap size={20} />
      </div>
      <div class="action-content">
        <h4>Quick Quiz</h4>
        <p>Challenge yourself with a timed quiz</p>
      </div>
      <ChevronRight size={16} class="action-arrow" />
    </button>
  </div>

  <!-- Subtopics -->
  <div class="section">
    <div class="section-header">
      <div class="section-title">
        <ListChecks size={18} />
        <h2>Subtopics</h2>
      </div>
      <span class="section-badge">{topic.subtopics.length} Topics</span>
    </div>

    <div class="subtopics-grid">
      {#each topic.subtopics as subtopic}
        <div class="subtopic-card" onclick={() => startSubTopic(subtopic.id)}>
          <div class="subtopic-header">
            <div>
              <h4 class="subtopic-name">{subtopic.name}</h4>
              <div class="subtopic-stats">
                <span>{subtopic.completed}/{subtopic.questions} questions</span>
                <span class="dot">•</span>
                <span style="color: {getScoreColor(subtopic.avgScore)}">
                  {subtopic.avgScore}% avg
                </span>
              </div>
            </div>
            <span class="subtopic-progress">{subtopic.progress}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: {subtopic.progress}%;"></div>
          </div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Recent Activity -->
  <div class="section">
    <div class="section-header">
      <div class="section-title">
        <Clock size={18} />
        <h2>Recent Activity</h2>
      </div>
    </div>

    <div class="activity-list">
      {#each topic.recentActivity as activity}
        <div class="activity-item">
          <div class="activity-icon" style="background: {activity.score >= 70 ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)'}; color: {activity.score >= 70 ? '#16a34a' : '#dc2626'};">
            {#if activity.score >= 70}
              <CheckCircle size={16} />
            {:else}
              <XCircle size={16} />
            {/if}
          </div>
          <div class="activity-content">
            <div class="activity-header">
              <span class="activity-type">{activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}</span>
              <span class="activity-score" style="color: {getScoreColor(activity.score)}">
                {activity.score}%
              </span>
            </div>
            <div class="activity-details">
              <span>{activity.questions} questions</span>
              <span class="dot">•</span>
              <span>{formatDate(activity.date)}</span>
            </div>
          </div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Recommendations -->
  <div class="section recommendations">
    <div class="section-header">
      <div class="section-title">
        <Target size={18} />
        <h2>Recommended Focus Areas</h2>
      </div>
    </div>

    <div class="recommendation-grid">
      {#each topic.subtopics.filter(s => s.progress < 70).slice(0, 3) as subtopic}
        <div class="recommendation-card">
          <div class="rec-icon" style="background: rgba(220,38,38,0.08); color: #dc2626;">
            <AlertCircle size={16} />
          </div>
          <div class="rec-content">
            <h4>Review {subtopic.name}</h4>
            <p>Your progress is at {subtopic.progress}%. Focus on understanding the core concepts.</p>
            <button class="rec-link" onclick={() => startSubTopic(subtopic.id)}>
              Start Review <ChevronRight size={12} />
            </button>
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .topic-study-page {
    max-width: 1100px;
    margin: 0 auto;
    padding: 2rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  /* Navigation */
  .nav-header {
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

  /* Topic Header */
  .topic-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    flex-wrap: wrap;
    padding: 1.5rem 2rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
  }

  .topic-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .topic-icon {
    font-size: 1.5rem;
    line-height: 1;
  }

  .difficulty-badge {
    font-size: 0.65rem;
    font-weight: 700;
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
  }

  .topic-title {
    font-size: 1.75rem;
    font-weight: 900;
    color: var(--color-text);
    margin: 0 0 0.25rem;
  }

  .topic-description {
    font-size: 0.9rem;
    color: var(--color-muted);
    margin: 0;
  }

  .header-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
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
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-primary:hover {
    background: var(--lc-700, #4338ca);
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(79,70,229,0.3);
  }

  .btn-secondary {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 1rem;
    background: transparent;
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

  /* Progress Overview */
  .progress-overview {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    padding: 2rem;
  }

  .progress-card {
    display: flex;
    align-items: center;
    gap: 3rem;
  }

  .progress-circle {
    position: relative;
    width: 120px;
    height: 120px;
    flex-shrink: 0;
  }

  .circle-chart {
    width: 120px;
    height: 120px;
    transform: rotate(-90deg);
  }

  .circle-content {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
  }

  .percentage {
    display: block;
    font-size: 1.5rem;
    font-weight: 900;
    color: var(--color-text);
    line-height: 1;
  }

  .label {
    font-size: 0.6rem;
    font-weight: 600;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .progress-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem 2rem;
    flex: 1;
  }

  .stat {
    display: flex;
    flex-direction: column;
  }

  .stat-label {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .stat-value {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 1rem;
    font-weight: 800;
    color: var(--color-text);
  }

  /* Quick Actions */
  .quick-actions {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .action-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    cursor: pointer;
    transition: all 0.15s;
    text-align: left;
  }

  .action-card:hover {
    border-color: var(--lc-600, #4f46e5);
    transform: translateY(-2px);
    box-shadow: 0 4px 14px rgba(0,0,0,0.05);
  }

  .action-icon {
    width: 40px;
    height: 40px;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .action-content {
    flex: 1;
    min-width: 0;
  }

  .action-content h4 {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0 0 0.15rem;
  }

  .action-content p {
    font-size: 0.75rem;
    color: var(--color-muted);
    margin: 0;
  }

  .action-arrow {
    color: var(--color-muted);
    flex-shrink: 0;
  }

  /* Sections */
  .section {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    padding: 1.5rem;
  }

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

  .section-title h2 {
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

  /* Subtopics */
  .subtopics-grid {
    display: grid;
    gap: 0.75rem;
  }

  .subtopic-card {
    padding: 0.75rem 1rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.625rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .subtopic-card:hover {
    border-color: var(--lc-600, #4f46e5);
  }

  .subtopic-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.4rem;
  }

  .subtopic-name {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-text);
    margin: 0 0 0.2rem;
  }

  .subtopic-stats {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.7rem;
    color: var(--color-muted);
  }

  .dot {
    color: var(--color-border);
  }

  .subtopic-progress {
    font-size: 0.8rem;
    font-weight: 800;
    color: var(--color-text);
  }

  .progress-bar {
    width: 100%;
    height: 4px;
    background: var(--color-border);
    border-radius: 999px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--lc-600, #4f46e5);
    border-radius: 999px;
    transition: width 0.6s ease;
  }

  /* Activity List */
  .activity-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .activity-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.625rem;
  }

  .activity-icon {
    width: 32px;
    height: 32px;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .activity-content {
    flex: 1;
  }

  .activity-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .activity-type {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-text);
    text-transform: capitalize;
  }

  .activity-score {
    font-size: 0.85rem;
    font-weight: 800;
  }

  .activity-details {
    font-size: 0.75rem;
    color: var(--color-muted);
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }

  /* Recommendations */
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
    background: none;
    border: none;
    cursor: pointer;
    transition: color 0.15s;
  }

  .rec-link:hover {
    color: var(--lc-700, #4338ca);
  }

  /* Responsive */
  @media (max-width: 768px) {
    .topic-study-page {
      padding: 1rem;
      gap: 1.5rem;
    }

    .topic-header {
      flex-direction: column;
      padding: 1rem 1.25rem;
    }

    .header-actions {
      width: 100%;
    }

    .header-actions .btn-primary,
    .header-actions .btn-secondary {
      flex: 1;
      justify-content: center;
    }

    .progress-card {
      flex-direction: column;
      gap: 1.5rem;
      text-align: center;
    }

    .progress-stats {
      grid-template-columns: 1fr 1fr;
      width: 100%;
      gap: 0.75rem;
    }

    .stat-value {
      justify-content: center;
    }

    .quick-actions {
      grid-template-columns: 1fr;
    }

    .recommendation-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 480px) {
    .progress-stats {
      grid-template-columns: 1fr;
    }

    .header-actions {
      flex-direction: column;
    }

    .subtopic-header {
      flex-direction: column;
      gap: 0.25rem;
    }
  }
</style>