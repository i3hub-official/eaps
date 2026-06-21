<!-- src/routes/lecturer/students/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { 
    Search, Users, UserCheck, UserX, UserCog, 
    AlertTriangle, ChevronRight, Clock, 
    FileText, TrendingUp, BarChart3, User,
    BookOpen, GraduationCap, Mail, Hash
  } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();

  let searchQuery = $state('');
  let selectedCourse = $state<string>('all');
  let selectedLevel = $state<string>('all');

  const filteredStudents = $derived(() => {
    let students = data.students;
    
    if (selectedCourse !== 'all') {
      students = students.filter(s => s.courseIds?.includes(selectedCourse));
    }
    
    if (selectedLevel !== 'all') {
      students = students.filter(s => s.level === parseInt(selectedLevel));
    }
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      students = students.filter(s => 
        s.fullName.toLowerCase().includes(q) ||
        s.matricNumber?.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
      );
    }
    
    return students;
  });

  // Stats
  const stats = $derived(() => {
    const students = filteredStudents();
    const total = students.length;
    const active = students.filter(s => s.isActive).length;
    const suspended = students.filter(s => s.isSuspended).length;
    const withViolations = students.filter(s => (s.violationCount || 0) > 0).length;
    
    return { total, active, suspended, withViolations };
  });
</script>

<div class="page">
  <!-- Stats Cards -->
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-icon"><Users size={20} /></div>
      <div class="stat-content">
        <span class="stat-value">{stats().total}</span>
        <span class="stat-label">Total Students</span>
      </div>
    </div>
    <div class="stat-card success">
      <div class="stat-icon"><UserCheck size={20} /></div>
      <div class="stat-content">
        <span class="stat-value">{stats().active}</span>
        <span class="stat-label">Active</span>
      </div>
    </div>
    <div class="stat-card danger">
      <div class="stat-icon"><UserX size={20} /></div>
      <div class="stat-content">
        <span class="stat-value">{stats().suspended}</span>
        <span class="stat-label">Suspended</span>
      </div>
    </div>
    <div class="stat-card warning">
      <div class="stat-icon"><AlertTriangle size={20} /></div>
      <div class="stat-content">
        <span class="stat-value">{stats().withViolations}</span>
        <span class="stat-label">With Violations</span>
      </div>
    </div>
  </div>

  <!-- Filters -->
  <div class="filters">
    <div class="filter-group">
      <div class="filter-item">
        <Search size={14} />
        <input
          type="text"
          placeholder="Search by name, matric, email..."
          bind:value={searchQuery}
        />
      </div>
    </div>

    <div class="filter-group">
      <select bind:value={selectedCourse}>
        <option value="all">All Courses</option>
        {#each data.courses as course}
          <option value={course.id}>{course.code} - {course.title}</option>
        {/each}
      </select>

      <select bind:value={selectedLevel}>
        <option value="all">All Levels</option>
        {#each data.levels as level}
          <option value={level}>{level}L</option>
        {/each}
      </select>
    </div>
  </div>

  <!-- Student List -->
  {#if filteredStudents().length === 0}
    <div class="empty-state">
      <div class="empty-icon">
        <User size={48} strokeWidth={1.2} />
      </div>
      <p class="empty-title">No students found</p>
      <p class="empty-sub">Try adjusting your filters or check back later.</p>
    </div>
  {:else}
    <div class="student-list">
      {#each filteredStudents() as student}
        <div class="student-card">
          <div class="student-info">
            <div class="student-avatar">
              {student.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div class="student-details">
              <div class="student-name">{student.fullName}</div>
              <div class="student-meta">
                <span class="meta-item">
                  <Hash size={10} />
                  {student.matricNumber || 'No matric'}
                </span>
                <span class="meta-dot">·</span>
                <span class="meta-item">
                  <Mail size={10} />
                  {student.email}
                </span>
                {#if student.level}
                  <span class="meta-dot">·</span>
                  <span class="meta-item">
                    <GraduationCap size={10} />
                    {student.level}L
                  </span>
                {/if}
              </div>
              <div class="student-courses">
                {#each student.courseCodes || [] as code}
                  <span class="course-tag">{code}</span>
                {/each}
              </div>
            </div>
          </div>
          <div class="student-stats">
            <div class="stat-item">
              <span class="stat-label">Violations</span>
              <span class="stat-value" class:stat-warn={(student.violationCount || 0) > 3}>
                {student.violationCount || 0}
              </span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Exams Taken</span>
              <span class="stat-value">{student.examCount || 0}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Avg Score</span>
              <span class="stat-value">{student.avgScore?.toFixed(1) || '—'}</span>
            </div>
          </div>
          <div class="student-status">
            {#if student.isSuspended}
              <span class="badge danger">Suspended</span>
            {:else}
              <span class="badge success">Active</span>
            {/if}
            <a 
              href="/lecturer/students/report?studentId={student.id}" 
              class="btn-small"
            >
              View Details <ChevronRight size={12} />
            </a>
          </div>
        </div>
      {/each}
    </div>

    <div class="pagination">
      <span class="page-info">Showing {filteredStudents().length} students</span>
    </div>
  {/if}
</div>

<style>
  .page {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
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
    width: 36px;
    height: 36px;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--lc-soft, rgba(79,70,229,0.08));
    color: var(--lc-600, #4f46e5);
  }

  .stat-card.success .stat-icon {
    background: rgba(6,95,70,0.08);
    color: #065f46;
  }

  .stat-card.danger .stat-icon {
    background: rgba(220,38,38,0.08);
    color: #dc2626;
  }

  .stat-card.warning .stat-icon {
    background: rgba(217,119,6,0.08);
    color: #d97706;
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

  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: center;
    padding: 1rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
  }

  .filter-group {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    flex: 1;
  }

  .filter-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    min-width: 200px;
    padding: 0.375rem 0.75rem;
    border: 1.5px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-bg);
    color: var(--color-muted);
    transition: border-color 0.15s;
  }

  .filter-item:focus-within {
    border-color: var(--lc-600, #4f46e5);
  }

  .filter-item input {
    border: none;
    background: none;
    outline: none;
    font-size: 0.82rem;
    color: var(--color-text);
    font-family: inherit;
    width: 100%;
  }

  .filter-group select {
    padding: 0.5rem 2rem 0.5rem 0.75rem;
    border: 1.5px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-bg);
    color: var(--color-text);
    font-size: 0.82rem;
    font-family: inherit;
    cursor: pointer;
    outline: none;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.75rem center;
    min-width: 150px;
  }

  .filter-group select:focus {
    border-color: var(--lc-600, #4f46e5);
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 4rem 2rem;
    text-align: center;
    color: var(--color-muted);
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
    margin-bottom: 0.25rem;
  }

  .empty-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0;
  }

  .empty-sub {
    font-size: 0.875rem;
    margin: 0;
  }

  .student-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .student-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.25rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .student-card:hover {
    border-color: var(--lc-600, #4f46e5);
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  }

  .student-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
    min-width: 0;
  }

  .student-avatar {
    width: 40px;
    height: 40px;
    border-radius: 0.5rem;
    background: linear-gradient(135deg, var(--lc-700, #4338ca), var(--lc-600, #4f46e5));
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    font-weight: 800;
    color: #fff;
    flex-shrink: 0;
  }

  .student-details {
    flex: 1;
    min-width: 0;
  }

  .student-name {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--color-text);
    margin-bottom: 0.15rem;
  }

  .student-meta {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    flex-wrap: wrap;
    font-size: 0.72rem;
    color: var(--color-muted);
  }

  .meta-item {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
  }

  .meta-dot {
    color: var(--color-border);
  }

  .student-courses {
    display: flex;
    gap: 0.25rem;
    flex-wrap: wrap;
    margin-top: 0.25rem;
  }

  .course-tag {
    font-size: 0.6rem;
    font-weight: 700;
    padding: 0.1rem 0.4rem;
    border-radius: 0.25rem;
    background: var(--lc-soft, rgba(79,70,229,0.06));
    color: var(--lc-600, #4f46e5);
  }

  .student-stats {
    display: flex;
    gap: 1.5rem;
    padding: 0 1rem;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.05rem;
  }

  .stat-item .stat-label {
    font-size: 0.58rem;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-weight: 600;
  }

  .stat-item .stat-value {
    font-size: 0.85rem;
    font-weight: 800;
    color: var(--color-text);
  }

  .stat-item .stat-value.stat-warn {
    color: #dc2626;
  }

  .student-status {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.25rem;
    flex-shrink: 0;
  }

  .badge {
    display: inline-block;
    padding: 0.1rem 0.5rem;
    border-radius: 999px;
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .badge.success {
    color: #065f46;
    background: rgba(6,95,70,0.1);
  }

  .badge.danger {
    color: #dc2626;
    background: rgba(220,38,38,0.1);
  }

  .btn-small {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    font-size: 0.68rem;
    font-weight: 600;
    color: var(--lc-600, #4f46e5);
    text-decoration: none;
    transition: color 0.15s;
  }

  .btn-small:hover {
    color: var(--lc-700, #4338ca);
  }

  .pagination {
    display: flex;
    justify-content: center;
    padding: 0.5rem;
  }

  .page-info {
    font-size: 0.78rem;
    color: var(--color-muted);
  }

  @media (max-width: 640px) {
    .filters {
      flex-direction: column;
    }

    .filter-group {
      width: 100%;
    }

    .filter-item {
      min-width: unset;
    }

    .filter-group select {
      flex: 1;
      min-width: unset;
    }

    .student-card {
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .student-stats {
      flex: 1;
      padding: 0;
      gap: 0.75rem;
    }

    .student-status {
      flex-direction: row;
      justify-content: space-between;
      width: 100%;
    }

    .stats-grid {
      grid-template-columns: 1fr 1fr;
    }
  }
</style>