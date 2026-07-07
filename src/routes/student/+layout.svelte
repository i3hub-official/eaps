<script lang="ts">
  // src/routes/student/+layout.svelte

  import { page } from '$app/stores'

  let { data, children } = $props()
  const { student, unreadCount } = data

  const nav = [
    { href: '/student',              label: 'Dashboard',    icon: '⊞' },
    { href: '/student/courses',      label: 'My Courses',   icon: '📚' },
    { href: '/student/register',     label: 'Registration', icon: '✏️' },
    { href: '/student/exams',        label: 'Exams',        icon: '📝' },
    { href: '/student/results',      label: 'Results',      icon: '📊' },
    { href: '/student/enroll',       label: 'Face ID',      icon: '👤' },
    { href: '/student/notifications',label: 'Notifications',icon: '🔔', badge: unreadCount },
    { href: '/student/profile',      label: 'Profile',      icon: '⚙️' },
  ]

  const currentPath = $derived($page.url.pathname)

  function isActive(href: string) {
    if (href === '/student') return currentPath === '/student'
    return currentPath.startsWith(href)
  }

  let sidebarOpen = $state(false)
</script>

<div class="portal">
  <!-- ── Sidebar ────────────────────────────────────────────────────────── -->
  <aside class="sidebar" class:open={sidebarOpen}>
    <div class="sidebar-header">
      <div class="brand">
        <div class="brand-mark">e<span>T</span></div>
        <div class="brand-text">
          <span class="brand-name">eTest</span>
          <span class="brand-sub">Student Portal</span>
        </div>
      </div>
    </div>

    <div class="student-card">
      <div class="avatar">
        {#if student.avatar}
          <img src={student.avatar} alt={student.firstName} />
        {:else}
          <span>{student.firstName[0]}{student.lastName[0]}</span>
        {/if}
      </div>
      <div class="student-info">
        <span class="student-name">{student.firstName} {student.lastName}</span>
        <span class="student-matric">{student.matricNumber}</span>
<span class="student-level">
  {student.level ? `${student.level} Level` : 'Level not set'} · {student.department}
</span>
      </div>
    </div>

    <nav class="nav-list">
      {#each nav as item}
        <a
          href={item.href}
          class="nav-item"
          class:active={isActive(item.href)}
          onclick={() => sidebarOpen = false}
        >
          <span class="nav-icon">{item.icon}</span>
          <span class="nav-label">{item.label}</span>
          {#if item.badge && item.badge > 0}
            <span class="nav-badge">{item.badge > 99 ? '99+' : item.badge}</span>
          {/if}
        </a>
      {/each}
    </nav>

    <div class="sidebar-footer">
      {#if !student.faceEnrolledAt}
        <a href="/student/enroll" class="enroll-alert">
          ⚠ Face not enrolled — required for exams
        </a>
      {/if}
<form method="POST" action="/logout">
        <button type="submit" class="logout-btn">Sign out</button>
      </form>
    </div>
  </aside>

  <!-- Mobile overlay -->
  {#if sidebarOpen}
    <div class="overlay" onclick={() => sidebarOpen = false} role="presentation"></div>
  {/if}

  <!-- ── Main ───────────────────────────────────────────────────────────── -->
  <main class="main">
    <!-- Mobile topbar -->
    <div class="mobile-topbar">
      <button class="menu-btn" onclick={() => sidebarOpen = !sidebarOpen} aria-label="Menu">
        <span></span><span></span><span></span>
      </button>
      <span class="mobile-title">MOUAU eTest</span>
      <a href="/student/notifications" class="notif-btn" aria-label="Notifications">
        🔔
        {#if unreadCount > 0}
          <span class="notif-dot"></span>
        {/if}
      </a>
    </div>

    <div class="main-content">
      {@render children()}
    </div>
  </main>
</div>

<style>
  .portal {
    display: flex;
    height: 100vh;
    overflow: hidden;
    background: var(--color-bg);
  }

  /* ── Sidebar ─────────────────────────────────────────────────────────── */
  .sidebar {
    width: 260px;
    flex-shrink: 0;
    background: #0B1E3D;
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow-y: auto;
    transition: transform 0.25s ease;
    z-index: 40;
  }

  .sidebar-header {
    padding: 1.25rem 1.25rem 0.75rem;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 0.625rem;
  }

  .brand-mark {
    width: 36px; height: 36px;
    background: #059669;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.95rem; font-weight: 900;
    color: white;
    font-family: 'Arial Black', sans-serif;
    letter-spacing: -1px;
    flex-shrink: 0;
  }

  .brand-mark span { color: #F59E0B; }
  .brand-name { color: white; font-weight: 700; font-size: 0.9rem; display: block; line-height: 1; }
  .brand-sub  { color: #475569; font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.08em; display: block; }

  /* Student card */
  .student-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }

  .avatar {
    width: 40px; height: 40px;
    border-radius: 50%;
    background: #059669;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.875rem; font-weight: 700; color: white;
    flex-shrink: 0; overflow: hidden;
  }

  .avatar img { width: 100%; height: 100%; object-fit: cover; }

  .student-info { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .student-name   { color: white; font-weight: 600; font-size: 0.825rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .student-matric { color: #64748B; font-size: 0.7rem; font-family: monospace; }
  .student-level  { color: #475569; font-size: 0.65rem; }

  /* Nav */
  .nav-list {
    flex: 1;
    padding: 0.75rem 0.625rem;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.625rem 0.75rem;
    border-radius: 8px;
    color: #64748B;
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.15s;
    position: relative;
  }

  .nav-item:hover { background: rgba(255,255,255,0.05); color: #94A3B8; }
  .nav-item.active { background: rgba(5,150,105,0.15); color: #34D399; }
  .nav-item.active .nav-icon { filter: none; }

  .nav-icon  { font-size: 1rem; flex-shrink: 0; }
  .nav-label { flex: 1; }

  .nav-badge {
    background: #ef4444;
    color: white;
    font-size: 0.65rem;
    font-weight: 700;
    padding: 0.1rem 0.4rem;
    border-radius: 999px;
    line-height: 1.4;
  }

  /* Footer */
  .sidebar-footer {
    padding: 0.75rem 1rem 1.25rem;
    border-top: 1px solid rgba(255,255,255,0.06);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .enroll-alert {
    background: rgba(245,158,11,0.12);
    border: 1px solid rgba(245,158,11,0.25);
    color: #F59E0B;
    font-size: 0.72rem;
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    text-decoration: none;
    line-height: 1.4;
    transition: background 0.15s;
  }
  .enroll-alert:hover { background: rgba(245,158,11,0.2); }

  .logout-btn {
    width: 100%;
    padding: 0.5rem;
    background: transparent;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 6px;
    color: #475569;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
  }
  .logout-btn:hover { background: rgba(255,255,255,0.05); color: #94A3B8; }

  /* ── Main ────────────────────────────────────────────────────────────── */
  .main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;
  }

  .main-content {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem 2rem;
  }

  /* Mobile topbar */
  .mobile-topbar {
    display: none;
    align-items: center;
    justify-content: space-between;
    padding: 0.875rem 1.25rem;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .menu-btn {
    background: none; border: none; cursor: pointer;
    display: flex; flex-direction: column; gap: 4px; padding: 4px;
  }
  .menu-btn span {
    display: block; width: 20px; height: 2px;
    background: var(--color-text); border-radius: 999px;
  }

  .mobile-title { font-weight: 700; font-size: 0.95rem; }

  .notif-btn {
    position: relative; font-size: 1.1rem;
    text-decoration: none; padding: 4px;
  }
  .notif-dot {
    position: absolute; top: 2px; right: 2px;
    width: 8px; height: 8px;
    background: #ef4444; border-radius: 50%;
    border: 2px solid var(--color-surface);
  }

  .overlay {
    display: none;
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 30;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .sidebar {
      position: fixed;
      top: 0; left: 0; bottom: 0;
      transform: translateX(-100%);
    }
    .sidebar.open { transform: translateX(0); }
    .mobile-topbar { display: flex; }
    .overlay { display: block; }
    .main-content { padding: 1.25rem; }
  }
</style>