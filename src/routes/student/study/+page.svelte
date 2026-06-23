<script lang="ts">
  import { 
    BookOpen, Brain, Zap, Target, 
    TrendingUp, Clock, ChevronRight,
    Search, Filter, Star, Calendar,
    BarChart3, Users, GraduationCap,
    Play, RefreshCw, CheckCircle,
    AlertCircle, ArrowLeft, Home
  } from '@lucide/svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  // Mock data - replace with actual API call
  let topics = $state([
    {
      id: 'mathematics',
      name: 'Mathematics',
      description: 'Algebra, Calculus, Statistics & more',
      progress: 75,
      totalQuestions: 150,
      completedQuestions: 112,
      averageScore: 68,
      lastStudied: '2024-01-15T10:30:00',
      difficulty: 'Intermediate',
      topics: ['Algebra', 'Calculus', 'Statistics', 'Geometry'],
      icon: '📐'
    },
    {
      id: 'physics',
      name: 'Physics',
      description: 'Mechanics, Optics, Thermodynamics',
      progress: 45,
      totalQuestions: 120,
      completedQuestions: 54,
      averageScore: 72,
      lastStudied: '2024-01-14T14:20:00',
      difficulty: 'Advanced',
      topics: ['Mechanics', 'Optics', 'Thermodynamics', 'Electromagnetism'],
      icon: '⚛️'
    },
    {
      id: 'chemistry',
      name: 'Chemistry',
      description: 'Organic, Inorganic, Physical Chemistry',
      progress: 30,
      totalQuestions: 100,
      completedQuestions: 30,
      averageScore: 55,
      lastStudied: '2024-01-13T09:15:00',
      difficulty: 'Intermediate',
      topics: ['Organic', 'Inorganic', 'Physical'],
      icon: '🧪'
    },
    {
      id: 'biology',
      name: 'Biology',
      description: 'Cell Biology, Genetics, Ecology',
      progress: 60,
      totalQuestions: 90,
      completedQuestions: 54,
      averageScore: 65,
      lastStudied: '2024-01-12T16:45:00',
      difficulty: 'Beginner',
      topics: ['Cell Biology', 'Genetics', 'Ecology', 'Human Anatomy'],
      icon: '🧬'
    }
  ]);

  let searchQuery = $state('');
  let selectedDifficulty = $state('all');
  let sortBy = $state('progress');

  // Filter and sort topics
  let filteredTopics = $derived(() => {
    let filtered = topics;
    
    if (searchQuery) {
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(t => 
        t.difficulty.toLowerCase() === selectedDifficulty.toLowerCase()
      );
    }
    
    // Sort
    switch(sortBy) {
      case 'progress':
        filtered = [...filtered].sort((a, b) => b.progress - a.progress);
        break;
      case 'score':
        filtered = [...filtered].sort((a, b) => b.averageScore - a.averageScore);
        break;
      case 'recent':
        filtered = [...filtered].sort((a, b) => 
          new Date(b.lastStudied).getTime() - new Date(a.lastStudied).getTime()
        );
        break;
      case 'name':
        filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
    
    return filtered;
  });

  // Statistics
  let stats = $derived(() => {
    const totalTopics = topics.length;
    const totalProgress = topics.reduce((sum, t) => sum + t.progress, 0) / totalTopics;
    const totalQuestions = topics.reduce((sum, t) => sum + t.totalQuestions, 0);
    const completedQuestions = topics.reduce((sum, t) => sum + t.completedQuestions, 0);
    const avgScore = topics.reduce((sum, t) => sum + t.averageScore, 0) / totalTopics;
    
    return {
      totalTopics,
      totalProgress: Math.round(totalProgress),
      totalQuestions,
      completedQuestions,
      avgScore: Math.round(avgScore)
    };
  });

  // Study actions
  function startStudy(topicId: string) {
    goto(`/student/study/${topicId}`);
  }

  function startPractice(topicId: string) {
    goto(`/student/study/practice?topic=${topicId}`);
  }

  function viewFlashcards(topicId: string) {
    goto(`/student/study/flashcards?topic=${topicId}`);
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = diff / (1000 * 60 * 60);
    const days = diff / (1000 * 60 * 60 * 24);
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${Math.round(hours)}h ago`;
    if (days < 7) return `${Math.round(days)}d ago`;
    return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
  }

  function getDifficultyColor(difficulty: string) {
    switch(difficulty.toLowerCase()) {
      case 'beginner': return '#16a34a';
      case 'intermediate': return '#d97706';
      case 'advanced': return '#dc2626';
      default: return '#6b7280';
    }
  }

  function getDifficultyBadge(difficulty: string) {
    return `<span style="background: ${getDifficultyColor(difficulty)}20; color: ${getDifficultyColor(difficulty)}; padding: 2px 8px; border-radius: 999px; font-size: 0.65rem; font-weight: 700;">${difficulty}</span>`;
  }
</script>

<svelte:head>
  <title>Study Dashboard - MOUAU Exam Portal</title>
</svelte:head>

<div class="study-dashboard">
  <!-- Header -->
  <div class="header">
    <div class="header-content">
      <div>
        <div class="breadcrumb">
          <a href="/student/dashboard" class="breadcrumb-link">
            <Home size={14} /> Dashboard
          </a>
          <ChevronRight size={14} />
          <span>Study</span>
        </div>
        <h1 class="page-title">Study Center</h1>
        <p class="page-subtitle">Track your progress and master your subjects</p>
      </div>
      <div class="header-actions">
        <button class="btn-outline" onclick={() => goto('/student/results')}>
          <BarChart3 size={16} />
          View Results
        </button>
      </div>
    </div>
  </div>

  <!-- Stats Overview -->
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(79,70,229,0.1); color: #4f46e5;">
        <BookOpen size={20} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{stats.totalTopics}</span>
        <span class="stat-label">Subjects</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(22,163,74,0.1); color: #16a34a;">
        <CheckCircle size={20} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{stats.completedQuestions}/{stats.totalQuestions}</span>
        <span class="stat-label">Questions Completed</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(37,99,235,0.1); color: #2563eb;">
        <Target size={20} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{stats.avgScore}%</span>
        <span class="stat-label">Average Score</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(245,158,11,0.1); color: #f59e0b;">
        <TrendingUp size={20} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{stats.totalProgress}%</span>
        <span class="stat-label">Overall Progress</span>
      </div>
    </div>
  </div>

  <!-- Controls -->
  <div class="controls">
    <div class="search-box">
      <Search size={16} />
      <input 
        type="text" 
        placeholder="Search subjects..." 
        bind:value={searchQuery}
      />
    </div>
    <div class="filters">
      <select bind:value={selectedDifficulty} class="filter-select">
        <option value="all">All Levels</option>
        <option value="beginner">Beginner</option>
        <option value="intermediate">Intermediate</option>
        <option value="advanced">Advanced</option>
      </select>
      <select bind:value={sortBy} class="filter-select">
        <option value="progress">Sort by Progress</option>
        <option value="score">Sort by Score</option>
        <option value="recent">Sort by Recent</option>
        <option value="name">Sort by Name</option>
      </select>
    </div>
  </div>

  <!-- Topics Grid -->
  <div class="topics-grid">
    {#each filteredTopics() as topic}
      <div class="topic-card">
        <div class="topic-header">
          <div class="topic-icon">{topic.icon}</div>
          <div class="topic-info">
            <h3 class="topic-name">{topic.name}</h3>
            <p class="topic-description">{topic.description}</p>
          </div>
          <span class="difficulty-badge" style="background: {getDifficultyColor(topic.difficulty)}20; color: {getDifficultyColor(topic.difficulty)};">
            {topic.difficulty}
          </span>
        </div>

        <div class="topic-progress">
          <div class="progress-header">
            <span class="progress-label">Progress</span>
            <span class="progress-value">{topic.progress}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: {topic.progress}%;"></div>
          </div>
        </div>

        <div class="topic-stats">
          <div class="stat-item">
            <span class="stat-label">Questions</span>
            <span class="stat-value">{topic.completedQuestions}/{topic.totalQuestions}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Avg Score</span>
            <span class="stat-value" style="color: {topic.averageScore >= 70 ? '#16a34a' : topic.averageScore >= 50 ? '#d97706' : '#dc2626'}">
              {topic.averageScore}%
            </span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Last Studied</span>
            <span class="stat-value">
              <Clock size={12} /> {formatDate(topic.lastStudied)}
            </span>
          </div>
        </div>

        <div class="topic-actions">
          <button class="btn-primary" onclick={() => startStudy(topic.id)}>
            <Play size={14} /> Continue Study
          </button>
          <button class="btn-secondary" onclick={() => startPractice(topic.id)}>
            <Zap size={14} /> Practice
          </button>
          <button class="btn-icon" onclick={() => viewFlashcards(topic.id)} title="Flashcards">
            <Brain size={16} />
          </button>
        </div>
      </div>
    {/each}
  </div>

  {#if filteredTopics().length === 0}
    <div class="empty-state">
      <Search size={48} strokeWidth={1.2} />
      <h3>No subjects found</h3>
      <p>Try adjusting your search or filters</p>
    </div>
  {/if}
</div>

<style>
  .study-dashboard {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  /* Header */
  .header {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    padding: 1.5rem 2rem;
  }

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }

  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.8rem;
    color: var(--color-muted);
    margin-bottom: 0.5rem;
  }

  .breadcrumb-link {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    color: var(--color-muted);
    text-decoration: none;
    transition: color 0.15s;
  }

  .breadcrumb-link:hover {
    color: var(--lc-600, #4f46e5);
  }

  .page-title {
    font-size: 1.75rem;
    font-weight: 900;
    color: var(--color-text);
    margin: 0 0 0.25rem;
  }

  .page-subtitle {
    font-size: 0.9rem;
    color: var(--color-muted);
    margin: 0;
  }

  .header-actions {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .btn-outline {
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

  .btn-outline:hover {
    background: var(--color-bg);
    border-color: var(--lc-600, #4f46e5);
    color: var(--lc-600, #4f46e5);
  }

  /* Stats Grid */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
  }

  .stat-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
  }

  .stat-icon {
    width: 40px;
    height: 40px;
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
    font-size: 1.25rem;
    font-weight: 800;
    color: var(--color-text);
    line-height: 1.2;
  }

  .stat-label {
    font-size: 0.65rem;
    font-weight: 600;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  /* Controls */
  .controls {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .search-box {
    flex: 1;
    min-width: 200px;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    color: var(--color-muted);
  }

  .search-box input {
    flex: 1;
    border: none;
    background: transparent;
    font-size: 0.85rem;
    color: var(--color-text);
    outline: none;
  }

  .search-box input::placeholder {
    color: var(--color-muted);
  }

  .filters {
    display: flex;
    gap: 0.5rem;
  }

  .filter-select {
    padding: 0.5rem 1rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-text);
    cursor: pointer;
    outline: none;
    appearance: auto;
  }

  .filter-select:hover {
    border-color: var(--lc-600, #4f46e5);
  }

  /* Topics Grid */
  .topics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 1.5rem;
  }

  .topic-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    transition: all 0.2s;
  }

  .topic-card:hover {
    border-color: var(--lc-600, #4f46e5);
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0,0,0,0.05);
  }

  .topic-header {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
  }

  .topic-icon {
    font-size: 1.5rem;
    line-height: 1;
    flex-shrink: 0;
  }

  .topic-info {
    flex: 1;
    min-width: 0;
  }

  .topic-name {
    font-size: 1rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0 0 0.25rem;
  }

  .topic-description {
    font-size: 0.8rem;
    color: var(--color-muted);
    margin: 0;
  }

  .difficulty-badge {
    font-size: 0.6rem;
    font-weight: 700;
    padding: 0.15rem 0.6rem;
    border-radius: 999px;
    flex-shrink: 0;
  }

  .topic-progress {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .progress-header {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    font-weight: 600;
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

  .topic-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
    padding: 0.75rem 0;
    border-top: 1px solid var(--color-border);
    border-bottom: 1px solid var(--color-border);
  }

  .stat-item {
    display: flex;
    flex-direction: column;
  }

  .stat-item .stat-label {
    font-size: 0.6rem;
    font-weight: 600;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .stat-item .stat-value {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--color-text);
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
  }

  .topic-actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn-primary {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
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

  .btn-icon {
    width: 38px;
    height: 38px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    color: var(--color-muted);
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-icon:hover {
    border-color: var(--lc-600, #4f46e5);
    color: var(--lc-600, #4f46e5);
  }

  /* Empty State */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 4rem 2rem;
    background: var(--color-surface);
    border: 1.5px dashed var(--color-border);
    border-radius: 1rem;
    text-align: center;
  }

  .empty-state h3 {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0;
  }

  .empty-state p {
    font-size: 0.85rem;
    color: var(--color-muted);
    margin: 0;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .study-dashboard {
      padding: 1rem;
      gap: 1.5rem;
    }

    .header {
      padding: 1rem 1.25rem;
    }

    .header-content {
      flex-direction: column;
    }

    .header-actions {
      width: 100%;
    }

    .header-actions .btn-outline {
      width: 100%;
      justify-content: center;
    }

    .controls {
      flex-direction: column;
    }

    .filters {
      width: 100%;
    }

    .filters select {
      flex: 1;
    }

    .topics-grid {
      grid-template-columns: 1fr;
    }

    .topic-stats {
      grid-template-columns: 1fr 1fr;
    }

    .topic-actions {
      flex-wrap: wrap;
    }

    .topic-actions .btn-primary {
      flex: 1 1 100%;
    }
  }

  @media (max-width: 480px) {
    .stats-grid {
      grid-template-columns: 1fr 1fr;
    }

    .topic-stats {
      grid-template-columns: 1fr;
    }
  }
</style>