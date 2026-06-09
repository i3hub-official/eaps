<!-- src/routes/student/courses/+page.svelte -->
<script lang="ts">
  import {
    BookMarked, BookOpen, GraduationCap, Calendar,
    ArrowRight, CheckCircle2, Clock, AlertCircle,
    Hash, Layers, Search, Filter
  } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let search = $state('');
  let showAvailable = $state(false);

  // Add null checks
  const registrations = data?.registrations ?? [];
  const availableCourses = data?.availableCourses ?? [];
  const meta = data?.meta ?? {
    session: 'Loading...',
    semester: 0
  };

  const filteredRegistrations = $derived(() => {
    if (!search.trim()) return registrations;
    const q = search.toLowerCase();
    return registrations.filter(r =>
      r.courseCode.toLowerCase().includes(q) ||
      r.courseTitle.toLowerCase().includes(q)
    );
  });

  const totalCredits = $derived(
    registrations.reduce((sum, r) => sum + (r.creditUnits || 0), 0)
  );

  function statusBadge(status: string) {
    switch (status) {
      case 'active': return { text: 'Active', class: 'badge-green' };
      case 'scheduled': return { text: 'Scheduled', class: 'badge-blue' };
      case 'completed': return { text: 'Done', class: 'badge-gray' };
      default: return { text: status || 'Unknown', class: 'badge-gray' };
    }
  }

  function formatDate(d: Date | string | null) {
    if (!d) return 'TBD';
    try {
      return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch (e) {
      return 'Invalid date';
    }
  }
</script>

<div class="courses-page">
  <div class="page-header">
    <div>
      <h1>My Courses</h1>
      <p class="page-sub">{meta.session} · Semester {meta.semester} · {totalCredits} Credits</p>
    </div>
    <a href="/student/courses/register" class="btn-primary">
      <BookOpen size={14} /> Register Courses
    </a>
  </div>

  <!-- Search -->
  <div class="search-bar">
    <Search size={14} />
    <input type="text" placeholder="Search registered courses..." bind:value={search} />
    {#if search}
      <button class="search-clear" onclick={() => search = ''}>×</button>
    {/if}
  </div>

  <!-- Registered courses -->
  <div class="course-grid">
    {#each filteredRegistrations() as reg (reg.id)}
      <div class="course-card">
        <div class="course-card-top">
          <div class="course-icon"><BookMarked size={18} /></div>
          <div class="course-meta">
            <span class="course-code">{reg.courseCode}</span>
            <span class="course-credits">{reg.creditUnits} CU</span>
          </div>
        </div>
        <h3 class="course-title">{reg.courseTitle}</h3>
        <div class="course-details">
          <span><Layers size={11} /> {reg.department}</span>
          <span><GraduationCap size={11} /> {reg.level} Level</span>
          <span><Calendar size={11} /> {reg.registrationType}</span>
        </div>
        {#if reg.exams && reg.exams.length > 0}
          <div class="course-exams">
            {#each reg.exams as exam}
              {@const badge = statusBadge(exam.status)}
              <div class="exam-tag">
                <span class="badge {badge.class}">{badge.text}</span>
                <span class="exam-title">{exam.title}</span>
                {#if exam.scheduledStart}
                  <span class="exam-date">{formatDate(exam.scheduledStart)}</span>
                {/if}
                {#if exam.status === 'active'}
                  <a href="/student/exam/{exam.id}" class="exam-action">Start <ArrowRight size={10} /></a>
                {:else if exam.status === 'scheduled'}
                  <span class="exam-action muted"><Clock size={10} /> Upcoming</span>
                {/if}
              </div>
            {/each}
          </div>
        {:else}
          <div class="no-exam">
            <AlertCircle size={12} /> No exam scheduled yet
          </div>
        {/if}
      </div>
    {:else}
      <div class="empty-courses">
        <BookOpen size={32} strokeWidth={1.5} />
        <p>No courses registered for this semester.</p>
        <a href="/student/courses/register">Register now →</a>
      </div>
    {/each}
  </div>

  <!-- Available courses toggle -->
  {#if availableCourses.length > 0}
    <div class="available-section">
      <button class="toggle-btn" onclick={() => showAvailable = !showAvailable}>
        <Filter size={13} />
        {showAvailable ? 'Hide' : 'Show'} available courses ({availableCourses.length})
      </button>
      {#if showAvailable}
        <div class="available-list">
          {#each availableCourses as course}
            <div class="available-row">
              <div class="available-info">
                <span class="available-code">{course.code}</span>
                <span class="available-title">{course.title}</span>
                <span class="available-meta">{course.creditUnits} CU · {course.department}</span>
              </div>
              <a href="/student/courses/register?course={course.id}" class="available-action">
                Register <ArrowRight size={10} />
              </a>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .courses-page { display: flex; flex-direction: column; gap: 1.25rem; }
  .page-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
  .page-header h1 { font-size: 1.25rem; font-weight: 800; color: var(--color-text); margin: 0; }
  .page-sub { font-size: 0.78rem; color: var(--color-muted); margin: 0.25rem 0 0; }
  .btn-primary {
    display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.55rem 1rem; border-radius: 0.5rem;
    background: var(--green-600); color: white;
    font-size: 0.8rem; font-weight: 700; text-decoration: none;
    transition: background 0.15s; border: none; cursor: pointer; font-family: inherit;
  }
  .btn-primary:hover { background: var(--green-700); }

  .search-bar {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.55rem 0.875rem; border-radius: 0.6rem;
    background: var(--color-surface); border: 1px solid var(--color-border);
    max-width: 400px;
  }
  .search-bar input {
    flex: 1; border: none; background: none; outline: none;
    font-size: 0.82rem; color: var(--color-text); font-family: inherit;
  }
  .search-bar input::placeholder { color: var(--color-muted); }
  .search-clear {
    width: 18px; height: 18px; border-radius: 50%;
    border: none; background: var(--color-border); color: var(--color-muted);
    font-size: 0.7rem; cursor: pointer; display: flex; align-items: center; justify-content: center;
  }

  .course-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 0.875rem;
  }
  .course-card {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: var(--radius-card); padding: 1rem;
    display: flex; flex-direction: column; gap: 0.625rem;
    transition: all 0.15s;
  }
  .course-card:hover { border-color: var(--green-600); box-shadow: 0 4px 12px rgba(0,0,0,0.04); }
  .course-card-top { display: flex; align-items: center; gap: 0.625rem; }
  .course-icon {
    width: 36px; height: 36px; border-radius: 0.5rem;
    background: var(--green-soft); color: var(--green-600);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .course-meta { display: flex; flex-direction: column; }
  .course-code { font-size: 0.78rem; font-weight: 800; color: var(--color-text); font-family: monospace; }
  .course-credits { font-size: 0.68rem; color: var(--color-muted); }
  .course-title { font-size: 0.88rem; font-weight: 700; color: var(--color-text); margin: 0; line-height: 1.3; }
  .course-details { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .course-details span {
    display: inline-flex; align-items: center; gap: 0.25rem;
    font-size: 0.68rem; color: var(--color-muted);
    padding: 0.15rem 0.4rem; border-radius: 0.25rem; background: var(--color-bg);
  }
  .course-exams { display: flex; flex-direction: column; gap: 0.375rem; margin-top: 0.25rem; }
  .exam-tag {
    display: flex; align-items: center; gap: 0.4rem;
    padding: 0.4rem 0.5rem; border-radius: 0.4rem;
    background: var(--color-bg); border: 1px solid var(--color-border);
    font-size: 0.72rem;
  }
  .badge {
    display: inline-flex; padding: 0.1rem 0.35rem; border-radius: 0.2rem;
    font-size: 0.6rem; font-weight: 800; text-transform: uppercase;
  }
  .badge-green { background: var(--green-soft); color: var(--green-700); }
  .badge-blue { background: var(--blue-soft); color: var(--blue-500); }
  .badge-gray { background: var(--color-bg); color: var(--color-muted); border: 1px solid var(--color-border); }
  .exam-title { font-weight: 600; color: var(--color-text); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .exam-date { color: var(--color-muted); white-space: nowrap; }
  .exam-action {
    display: inline-flex; align-items: center; gap: 0.2rem;
    padding: 0.15rem 0.4rem; border-radius: 0.25rem;
    background: var(--green-600); color: white;
    font-size: 0.65rem; font-weight: 700; text-decoration: none; white-space: nowrap;
    transition: background 0.15s;
  }
  .exam-action:hover { background: var(--green-700); }
  .exam-action.muted { background: var(--color-border); color: var(--color-muted); cursor: default; }
  .no-exam {
    display: flex; align-items: center; gap: 0.35rem;
    font-size: 0.72rem; color: var(--color-muted); padding: 0.25rem 0;
  }
  .empty-courses {
    grid-column: 1 / -1;
    display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
    padding: 3rem 1rem; color: var(--color-muted); text-align: center;
  }
  .empty-courses p { margin: 0; font-size: 0.82rem; }
  .empty-courses a { color: var(--green-600); font-weight: 700; text-decoration: none; font-size: 0.8rem; }
  .empty-courses a:hover { text-decoration: underline; }

  .available-section { margin-top: 0.5rem; }
  .toggle-btn {
    display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.45rem 0.75rem; border-radius: 0.4rem;
    background: var(--color-bg); border: 1px solid var(--color-border);
    font-size: 0.78rem; font-weight: 600; color: var(--color-muted);
    cursor: pointer; font-family: inherit; transition: all 0.15s;
  }
  .toggle-btn:hover { border-color: var(--green-600); color: var(--green-600); }
  .available-list {
    margin-top: 0.75rem;
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: var(--radius-card); overflow: hidden;
  }
  .available-row {
    display: flex; align-items: center; justify-content: space-between;
    gap: 1rem; padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--color-border);
    transition: background 0.1s;
  }
  .available-row:last-child { border-bottom: none; }
  .available-row:hover { background: var(--color-bg); }
  .available-info { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; }
  .available-code { font-size: 0.78rem; font-weight: 800; color: var(--color-text); font-family: monospace; }
  .available-title { font-size: 0.82rem; font-weight: 600; color: var(--color-text); }
  .available-meta { font-size: 0.68rem; color: var(--color-muted); }
  .available-action {
    display: inline-flex; align-items: center; gap: 0.25rem;
    padding: 0.35rem 0.625rem; border-radius: 0.35rem;
    background: var(--green-soft); color: var(--green-700);
    font-size: 0.72rem; font-weight: 700; text-decoration: none;
    white-space: nowrap; transition: all 0.15s; flex-shrink: 0;
  }
  .available-action:hover { background: var(--green-600); color: white; }
</style>