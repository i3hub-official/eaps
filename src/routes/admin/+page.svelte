<script lang="ts">
  import type { PageData } from './$types'
  import { 
    Users, 
    BookOpen, 
    ClipboardList, 
    AlertCircle, 
    Activity,
    Clock,
    CheckCircle,
    TrendingUp,
    Award,
    AlertTriangle,
    UserPlus
  } from '@lucide/svelte'

  let { data }: { data: PageData } = $props()

  // Map icon names to components
  const iconMap = {
    'Users': Users,
    'BookOpen': BookOpen,
    'ClipboardList': ClipboardList,
    'AlertCircle': AlertCircle,
    'Activity': Activity,
    'Clock': Clock,
    'CheckCircle': CheckCircle,
    'TrendingUp': TrendingUp,
    'Award': Award,
    'AlertTriangle': AlertTriangle,
    'UserPlus': UserPlus,
  }

  // Stats configuration with colors and icon components
  const statsWithColors = data.stats.map(stat => {
    const colors = {
      'Total Users': { bg: 'var(--blue-soft)', text: 'var(--blue-accent)' },
      'Active Students': { bg: 'var(--green-soft)', text: 'var(--green-accent)' },
      'Active Staff': { bg: 'var(--purple-soft)', text: 'var(--purple-accent)' },
      'Courses': { bg: 'var(--orange-soft)', text: 'var(--orange-accent)' },
      'Assessments': { bg: 'var(--pink-soft)', text: 'var(--pink-accent)' },
      'Pending Reviews': { bg: 'var(--red-soft)', text: 'var(--red-accent)' },
    }
    return {
      ...stat,
      iconComponent: iconMap[stat.icon] || Activity,
      bgColor: colors[stat.label]?.bg || 'var(--ad-soft)',
      textColor: colors[stat.label]?.text || 'var(--ad-accent)',
    }
  })

  // Quick actions with icon components
  const quickActions = [
    { label: 'Create User', href: '/admin/users/create', icon: UserPlus },
    { label: 'Create Course', href: '/admin/structure/courses/create', icon: BookOpen },
    { label: 'Create Assessment', href: '/admin/assessments/create', icon: ClipboardList },
    { label: 'View Audit Logs', href: '/admin/audit', icon: Activity },
  ]

  function getIconForAction(action: string) {
    const icons = {
      'ASSESSMENT_STARTED': Clock,
      'ASSESSMENT_SUBMITTED': CheckCircle,
      'RESULT_RELEASED': Award,
      'COURSE_REGISTERED': BookOpen,
      'LOGIN': Users,
      'USER_CREATED': UserPlus,
    }
    return icons[action] || Activity
  }
</script>

<div class="admin-dashboard">
  <!-- Header -->
  <div class="admin-header">
    <h1 class="admin-title">Admin Dashboard</h1>
    <p class="admin-subtitle">
      System overview and analytics
      <span class="admin-timestamp">
        • Last updated: {new Date(data.loadedAt).toLocaleTimeString()}
      </span>
    </p>
  </div>

  <!-- Stats Grid -->
  <div class="admin-stats-grid">
    {#each statsWithColors as stat (stat.label)}
      <a href={stat.href} class="admin-stat-card">
        <div class="admin-stat-content">
          <div>
            <p class="admin-stat-label">{stat.label}</p>
            <p class="admin-stat-value">{stat.value}</p>
          </div>
          <div class="admin-stat-icon" style="background: {stat.bgColor}; color: {stat.textColor};">
            <svelte:component this={stat.iconComponent} size={20} />
          </div>
        </div>
      </a>
    {/each}
  </div>

  <!-- Quick Actions -->
  <div class="admin-section">
    <h2 class="admin-section-title">Quick Actions</h2>
    <div class="admin-actions-grid">
      {#each quickActions as action (action.label)}
        <a href={action.href} class="admin-action-card">
          <svelte:component this={action.icon} size={18} class="admin-action-icon" />
          <p class="admin-action-label">{action.label}</p>
        </a>
      {/each}
    </div>
  </div>

  <!-- Two Column Layout -->
  <div class="admin-two-column">
    <!-- Left Column -->
    <div>
      <!-- Recent Activity -->
      <div>
        <h2 class="admin-section-title">Recent Activity</h2>
        {#if data.recentActivity && data.recentActivity.length > 0}
          <div class="admin-activity-container">
            <div class="admin-activity-list">
              {#each data.recentActivity.slice(0, 5) as log (log.id)}
                <div class="admin-activity-item">
                  <div class="admin-activity-icon-wrapper">
                    <svelte:component 
                      this={getIconForAction(log.action)} 
                      size={16} 
                      class="admin-activity-icon" 
                    />
                  </div>
                  <div class="admin-activity-content">
                    <p class="admin-activity-action">{log.action.replace(/_/g, ' ')}</p>
                    <p class="admin-activity-meta">
                      {log.entity} • {log.actorName}
                    </p>
                  </div>
                  <span class="admin-activity-date">
                    {new Date(log.createdAt).toLocaleDateString()}
                  </span>
                </div>
              {/each}
            </div>
          </div>
        {:else}
          <div class="admin-empty-state">
            <div class="admin-empty-icon">
              <Activity size={32} />
            </div>
            <p class="admin-empty-text">No recent activity</p>
          </div>
        {/if}
      </div>

      <!-- Pending Registrations -->
      <div class="admin-margin-top">
        <h2 class="admin-section-title">
          Pending Registrations
          <span class="admin-badge-count">
            ({data.registrationStats.pending})
          </span>
        </h2>
        {#if data.recentRegistrations && data.recentRegistrations.length > 0}
          <div class="admin-activity-container">
            <div class="admin-activity-list">
              {#each data.recentRegistrations as reg (reg.id)}
                <div class="admin-registration-item">
                  <div>
                    <p class="admin-registration-name">{reg.studentName}</p>
                    <p class="admin-registration-course">
                      {reg.courseCode} - {reg.courseTitle}
                    </p>
                  </div>
                  <span class="admin-registration-badge">
                    {reg.semester} • {reg.session}
                  </span>
                </div>
              {/each}
            </div>
          </div>
        {:else}
          <div class="admin-empty-state admin-empty-small">
            <p class="admin-empty-text">No pending registrations</p>
          </div>
        {/if}
      </div>
    </div>

    <!-- Right Column -->
    <div>
      <!-- System Health -->
      <div>
        <h2 class="admin-section-title">System Health</h2>
        <div class="admin-health-grid">
          <div class="admin-health-card">
            <p class="admin-health-label">Completion Rate</p>
            <p class="admin-health-value-green">
              {data.systemHealth.completionRate}%
            </p>
            <p class="admin-health-meta">
              {data.systemHealth.totalAttempted} total attempts
            </p>
          </div>
          <div class="admin-health-card">
            <p class="admin-health-label">Active Sessions</p>
            <p class="admin-health-value-yellow">
              {data.systemHealth.activeSessions}
            </p>
            <p class="admin-health-meta">
              {data.systemHealth.inProgress} in progress
            </p>
          </div>
          <div class="admin-health-card">
            <p class="admin-health-label">Pending Registrations</p>
            <p class="admin-health-value-orange">
              {data.systemHealth.pendingRegistrations}
            </p>
          </div>
          <div class="admin-health-card">
            <p class="admin-health-label">Violations (7d)</p>
            <p class="admin-health-value-red">
              {data.recentViolations.length}
            </p>
          </div>
        </div>
      </div>

      <!-- Top Students -->
      <div class="admin-margin-top">
        <h2 class="admin-section-title">Top Performing Students</h2>
        {#if data.topStudents && data.topStudents.length > 0}
          <div class="admin-activity-container">
            <div class="admin-activity-list">
              {#each data.topStudents as student (student.matricNumber)}
                <div class="admin-student-item">
                  <div>
                    <p class="admin-student-name">{student.name}</p>
                    <p class="admin-student-meta">
                      {student.matricNumber} • {student.department || 'N/A'}
                    </p>
                  </div>
                  <span class="admin-student-percentage">
                    {student.percentage}%
                  </span>
                </div>
              {/each}
            </div>
          </div>
        {:else}
          <div class="admin-empty-state admin-empty-small">
            <p class="admin-empty-text">No top performers yet</p>
          </div>
        {/if}
      </div>

      <!-- Recent Violations -->
      <div class="admin-margin-top">
        <h2 class="admin-section-title">Recent Violations</h2>
        {#if data.recentViolations && data.recentViolations.length > 0}
          <div class="admin-activity-container">
            <div class="admin-activity-list">
              {#each data.recentViolations as violation (violation.id)}
                <div class="admin-violation-item">
                  <AlertTriangle size={16} class="admin-violation-icon" />
                  <div class="admin-violation-content">
                    <p class="admin-violation-type">{violation.type.replace(/_/g, ' ')}</p>
                    <p class="admin-violation-meta">
                      {violation.studentName} • {violation.assessment}
                    </p>
                  </div>
                  <span class="admin-violation-severity">
                    Severity {violation.severity}
                  </span>
                </div>
              {/each}
            </div>
          </div>
        {:else}
          <div class="admin-empty-state admin-empty-small">
            <p class="admin-empty-text">No recent violations</p>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Bottom Row - Top Courses -->
  <div class="admin-section admin-margin-top">
    <h2 class="admin-section-title">Top Courses by Enrollment</h2>
    {#if data.topCourses && data.topCourses.length > 0}
      <div class="admin-courses-grid">
        {#each data.topCourses as course (course.code)}
          <div class="admin-course-card">
            <p class="admin-course-code">{course.code}</p>
            <p class="admin-course-title">{course.title}</p>
            <p class="admin-course-count">{course.count} students</p>
            <p class="admin-course-department">{course.department}</p>
          </div>
        {/each}
      </div>
    {:else}
      <div class="admin-empty-state admin-empty-small">
        <p class="admin-empty-text">No course enrollment data available</p>
      </div>
    {/if}
  </div>
</div>

<style>
  /* Admin Dashboard Styles - Uses CSS variables from app.css */
  .admin-dashboard {
    font-family: system-ui, -apple-system, sans-serif;
  }

  /* Header */
  .admin-header {
    margin-bottom: 2rem;
  }

  .admin-title {
    font-size: 1.875rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
    color: var(--color-text);
  }

  .admin-subtitle {
    color: var(--color-muted);
  }

  .admin-timestamp {
    color: var(--color-muted);
    opacity: 0.7;
    font-size: 0.875rem;
    margin-left: 0.5rem;
  }

  /* Stats Grid */
  .admin-stats-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  @media (min-width: 768px) {
    .admin-stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (min-width: 1024px) {
    .admin-stats-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  .admin-stat-card {
    display: block;
    padding: 1rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-surface);
    transition: all 0.2s;
    text-decoration: none;
  }

  .admin-stat-card:hover {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  .admin-stat-content {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
  }

  .admin-stat-label {
    color: var(--color-muted);
    font-size: 0.875rem;
    font-weight: 500;
    margin: 0;
  }

  .admin-stat-value {
    font-size: 1.875rem;
    font-weight: 700;
    margin-top: 0.5rem;
    color: var(--color-text);
  }

  .admin-stat-icon {
    padding: 0.5rem;
    border-radius: 0.5rem;
    flex-shrink: 0;
  }

  /* Section */
  .admin-section {
    margin-top: 2rem;
  }

  .admin-section-title {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 1rem;
    color: var(--color-text);
  }

  /* Quick Actions */
  .admin-actions-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  @media (min-width: 768px) {
    .admin-actions-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (min-width: 1024px) {
    .admin-actions-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  .admin-action-card {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 1rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-surface);
    text-decoration: none;
    transition: all 0.2s;
  }

  .admin-action-card:hover {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    transform: scale(1.02);
  }

  .admin-action-icon {
    color: var(--ad-accent);
  }

  .admin-action-label {
    font-weight: 500;
    color: var(--ad-accent);
    margin: 0;
  }

  /* Two Column Layout */
  .admin-two-column {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
    margin-top: 2rem;
  }

  @media (min-width: 1024px) {
    .admin-two-column {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  /* Containers */
  .admin-activity-container {
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    overflow: hidden;
    background: var(--color-surface);
  }

  .admin-activity-list {
    display: flex;
    flex-direction: column;
  }

  .admin-activity-list > * + * {
    border-top: 1px solid var(--color-border);
  }

  /* Activity Items */
  .admin-activity-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
  }

  .admin-activity-icon-wrapper {
    padding: 0.5rem;
    border-radius: 9999px;
    flex-shrink: 0;
    background: var(--ad-soft);
  }

  .admin-activity-icon {
    color: var(--ad-accent);
  }

  .admin-activity-content {
    flex: 1;
    min-width: 0;
  }

  .admin-activity-action {
    font-weight: 500;
    color: var(--color-text);
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .admin-activity-meta {
    color: var(--color-muted);
    font-size: 0.875rem;
    margin: 0.25rem 0 0 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .admin-activity-date {
    color: var(--color-muted);
    opacity: 0.7;
    font-size: 0.75rem;
    white-space: nowrap;
  }

  /* Registration Items */
  .admin-registration-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 1rem;
  }

  .admin-registration-name {
    font-weight: 500;
    color: var(--color-text);
    margin: 0;
  }

  .admin-registration-course {
    color: var(--color-muted);
    font-size: 0.875rem;
    margin: 0.25rem 0 0 0;
  }

  .admin-registration-badge {
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
    background: var(--orange-soft);
    color: var(--orange-accent);
    white-space: nowrap;
  }

  .admin-badge-count {
    color: var(--color-muted);
    font-size: 0.875rem;
    margin-left: 0.5rem;
  }

  /* Health Grid */
  .admin-health-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .admin-health-card {
    padding: 1rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-surface);
  }

  .admin-health-label {
    color: var(--color-muted);
    font-size: 0.875rem;
    margin: 0;
  }

  .admin-health-value-green {
    font-size: 1.5rem;
    font-weight: 700;
    margin-top: 0.25rem;
    color: var(--green-accent);
  }

  .admin-health-value-yellow {
    font-size: 1.5rem;
    font-weight: 700;
    margin-top: 0.25rem;
    color: var(--yellow-accent);
  }

  .admin-health-value-orange {
    font-size: 1.5rem;
    font-weight: 700;
    margin-top: 0.25rem;
    color: var(--orange-accent);
  }

  .admin-health-value-red {
    font-size: 1.5rem;
    font-weight: 700;
    margin-top: 0.25rem;
    color: var(--red-accent);
  }

  .admin-health-meta {
    color: var(--color-muted);
    opacity: 0.7;
    font-size: 0.75rem;
    margin-top: 0.25rem;
  }

  /* Student Items */
  .admin-student-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
  }

  .admin-student-name {
    font-weight: 500;
    color: var(--color-text);
    margin: 0;
  }

  .admin-student-meta {
    color: var(--color-muted);
    font-size: 0.875rem;
    margin: 0.25rem 0 0 0;
  }

  .admin-student-percentage {
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--green-accent);
  }

  /* Violation Items */
  .admin-violation-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
  }

  .admin-violation-icon {
    color: var(--red-accent);
    flex-shrink: 0;
  }

  .admin-violation-content {
    flex: 1;
  }

  .admin-violation-type {
    font-weight: 500;
    color: var(--color-text);
    margin: 0;
  }

  .admin-violation-meta {
    color: var(--color-muted);
    font-size: 0.875rem;
    margin: 0.25rem 0 0 0;
  }

  .admin-violation-severity {
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    background: var(--red-soft);
    color: var(--red-accent);
    white-space: nowrap;
  }

  /* Courses Grid */
  .admin-courses-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  @media (min-width: 768px) {
    .admin-courses-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (min-width: 1024px) {
    .admin-courses-grid {
      grid-template-columns: repeat(5, 1fr);
    }
  }

  .admin-course-card {
    padding: 1rem;
    text-align: center;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-surface);
  }

  .admin-course-code {
    font-weight: 700;
    font-size: 1.125rem;
    color: var(--color-text);
    margin: 0;
  }

  .admin-course-title {
    color: var(--color-muted);
    font-size: 0.875rem;
    margin: 0.25rem 0 0 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .admin-course-count {
    font-size: 0.875rem;
    margin-top: 0.5rem;
    color: var(--ad-accent);
  }

  .admin-course-department {
    color: var(--color-muted);
    opacity: 0.7;
    font-size: 0.75rem;
    margin: 0.25rem 0 0 0;
  }

  /* Empty States */
  .admin-empty-state {
    padding: 2rem;
    text-align: center;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-surface);
  }

  .admin-empty-small {
    padding: 1.5rem;
  }

  .admin-empty-icon {
    display: flex;
    justify-content: center;
    margin-bottom: 0.75rem;
    color: var(--color-muted);
    opacity: 0.5;
  }

  .admin-empty-text {
    font-weight: 500;
    color: var(--color-muted);
    margin: 0;
  }

  /* Utilities */
  .admin-margin-top {
    margin-top: 1.5rem;
  }

  /* Dark mode overrides - these work automatically with CSS variables */
  @media (prefers-color-scheme: dark) {
    .admin-stat-card:hover,
    .admin-action-card:hover {
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
    }
  }
</style>