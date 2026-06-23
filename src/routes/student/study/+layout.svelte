<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { 
    BookOpen, Brain, Zap, Target,
    Home, ArrowLeft, ChevronRight,
    BarChart3, Users, GraduationCap
  } from '@lucide/svelte';

  let activeTab = $derived(() => {
    const path = $page.url.pathname;
    if (path.includes('/practice')) return 'practice';
    if (path.includes('/flashcards')) return 'flashcards';
    if (path.includes('/quiz')) return 'quiz';
    return 'study';
  });
</script>

<div class="study-layout">
  <!-- Sidebar Navigation -->
  <aside class="sidebar">
    <div class="sidebar-header">
      <h2 class="sidebar-title">Study</h2>
      <span class="sidebar-sub">MOUAU Exam Portal</span>
    </div>

    <nav class="sidebar-nav">
      <a href="/student/study" class="nav-item" class:active={activeTab() === 'study'}>
        <BookOpen size={18} />
        <span>Study Center</span>
      </a>
      <a href="/student/study/practice" class="nav-item" class:active={activeTab() === 'practice'}>
        <Zap size={18} />
        <span>Practice</span>
      </a>
      <a href="/student/study/flashcards" class="nav-item" class:active={activeTab() === 'flashcards'}>
        <Brain size={18} />
        <span>Flashcards</span>
      </a>
    </nav>

    <div class="sidebar-footer">
      <a href="/student/dashboard" class="nav-item">
        <Home size={18} />
        <span>Dashboard</span>
      </a>
    </div>
  </aside>

  <!-- Main Content -->
  <main class="main-content">
    <slot />
  </main>
</div>

<style>
  .study-layout {
    display: flex;
    min-height: 100vh;
    background: var(--color-bg);
  }

  /* Sidebar */
  .sidebar {
    width: 240px;
    background: var(--color-surface);
    border-right: 1px solid var(--color-border);
    padding: 1.5rem 1rem;
    display: flex;
    flex-direction: column;
    position: sticky;
    top: 0;
    height: 100vh;
    overflow-y: auto;
  }

  .sidebar-header {
    padding-bottom: 1.5rem;
    margin-bottom: 1.5rem;
    border-bottom: 1px solid var(--color-border);
  }

  .sidebar-title {
    font-size: 1.25rem;
    font-weight: 900;
    color: var(--color-text);
    margin: 0 0 0.25rem;
  }

  .sidebar-sub {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .sidebar-nav {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.6rem 0.8rem;
    border-radius: 0.5rem;
    color: var(--color-muted);
    text-decoration: none;
    font-size: 0.85rem;
    font-weight: 600;
    transition: all 0.15s;
  }

  .nav-item:hover {
    background: var(--lc-soft, rgba(79,70,229,0.06));
    color: var(--color-text);
  }

  .nav-item.active {
    background: var(--lc-soft, rgba(79,70,229,0.08));
    color: var(--lc-600, #4f46e5);
  }

  .nav-item.active::before {
    content: '';
    width: 3px;
    height: 20px;
    background: var(--lc-600, #4f46e5);
    border-radius: 999px;
    margin-left: -0.8rem;
  }

  .sidebar-footer {
    padding-top: 1.5rem;
    margin-top: 1.5rem;
    border-top: 1px solid var(--color-border);
  }

  /* Main Content */
  .main-content {
    flex: 1;
    min-width: 0;
    padding: 0;
  }

  /* Mobile Responsive */
  @media (max-width: 768px) {
    .study-layout {
      flex-direction: column;
    }

    .sidebar {
      width: 100%;
      height: auto;
      position: relative;
      padding: 1rem;
      border-right: none;
      border-bottom: 1px solid var(--color-border);
      flex-direction: row;
      align-items: center;
      flex-wrap: wrap;
    }

    .sidebar-header {
      padding: 0;
      margin: 0;
      border: none;
      flex: 1;
    }

    .sidebar-title {
      font-size: 1rem;
    }

    .sidebar-sub {
      display: none;
    }

    .sidebar-nav {
      flex-direction: row;
      gap: 0.25rem;
      flex: 2;
      justify-content: flex-end;
    }

    .nav-item {
      padding: 0.4rem 0.6rem;
      font-size: 0.75rem;
    }

    .nav-item span {
      display: none;
    }

    .nav-item.active::before {
      display: none;
    }

    .nav-item.active {
      background: var(--lc-soft, rgba(79,70,229,0.08));
      color: var(--lc-600, #4f46e5);
    }

    .sidebar-footer {
      display: none;
    }

    .main-content {
      padding: 0;
    }
  }
</style>