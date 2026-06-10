<!-- src/routes/student/courses/+page.svelte -->
<script lang="ts">
  import {
    BookMarked, BookOpen, GraduationCap, Calendar,
    ArrowRight, Clock, AlertCircle, Search,
    CheckCircle2, Plus
  } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let search = $state('');

  const registrations = data?.registrations ?? [];
  const meta          = data?.meta ?? { session: '—', semester: 0, totalCredits: 0 };

  const filtered = $derived(
    !search.trim()
      ? registrations
      : registrations.filter(r => {
          const q = search.toLowerCase();
          return r.courseCode.toLowerCase().includes(q) || r.courseTitle.toLowerCase().includes(q);
        }),
  );

  function statusBadge(status: string) {
    switch (status) {
      case 'active':    return { text: 'Active',    cls: 'badge-green' };
      case 'scheduled': return { text: 'Scheduled', cls: 'badge-blue'  };
      case 'completed': return { text: 'Done',      cls: 'badge-gray'  };
      default:          return { text: status,      cls: 'badge-gray'  };
    }
  }

  function regBadge(type: string, status: string) {
    if (status === 'pending') return { text: 'Pending', cls: 'badge-amber' };
    if (status === 'rejected') return { text: 'Rejected', cls: 'badge-red' };
    switch (type) {
      case 'carry_over': return { text: 'Carry Over', cls: 'badge-amber' };
      case 'borrowed':   return { text: 'Borrowed',   cls: 'badge-blue'  };
      default:           return { text: 'Normal',     cls: 'badge-green' };
    }
  }

  function fmtDate(d: Date | string | null) {
    if (!d) return 'TBD';
    try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }
    catch { return '—'; }
  }
</script>

<div class="courses-page">

  <!-- ── Header ────────────────────────────────────────────────────────── -->
  <div class="page-header">
    <div>
      <h1>My Courses</h1>
      <p class="page-sub">
        {meta.session} · Semester {meta.semester} ·
        <strong>{meta.totalCredits}</strong> credit units
      </p>
    </div>
    <a href="/student/courses/register" class="btn-register">
      <Plus size={14} /> Register Courses
    </a>
  </div>

  <!-- ── Search ─────────────────────────────────────────────────────────── -->
  <div class="search-wrap">
    <Search size={13} />
    <input
      type="text"
      placeholder="Search by code or title…"
      bind:value={search}
    />
    {#if search}
      <button class="clear-btn" onclick={() => (search = '')}>×</button>
    {/if}
  </div>

  <!-- ── Course cards ───────────────────────────────────────────────────── -->
  {#if filtered.length === 0}
    <div class="empty-state">
      <BookOpen size={36} strokeWidth={1.5} />
      <p>
        {search ? 'No courses match your search.' : 'No courses registered for this semester.'}
      </p>
      {#if !search}
        <a href="/student/courses/register">Register your first course →</a>
      {/if}
    </div>
  {:else}
    <div class="course-grid">
      {#each filtered as reg (reg.id)}
        {@const rb = regBadge(reg.registrationType, reg.status)}
        <div class="course-card">

          <div class="card-top">
            <div class="card-icon"><BookMarked size={17} /></div>
            <div class="card-meta">
              <span class="course-code">{reg.courseCode}</span>
              <span class="course-cu">{reg.creditUnits} CU</span>
            </div>
            <span class="badge {rb.cls}">{rb.text}</span>
          </div>

          <h3 class="course-title">{reg.courseTitle}</h3>

          <div class="course-chips">
            <span><GraduationCap size={10} /> {reg.level} Level</span>
            <span><Calendar size={10} /> {reg.department}</span>
          </div>

          <!-- Exams for this course -->
          {#if reg.exams.length > 0}
            <div class="exams-list">
              {#each reg.exams as exam}
                {@const eb = statusBadge(exam.status)}
                <div class="exam-row">
                  <span class="badge {eb.cls}">{eb.text}</span>
                  <span class="exam-title">{exam.title}</span>
                  {#if exam.scheduledStart}
                    <span class="exam-date">{fmtDate(exam.scheduledStart)}</span>
                  {/if}
                  {#if exam.status === 'active'}
                    <a href="/student/exam/{exam.id}" class="exam-cta">
                      Start <ArrowRight size={9} />
                    </a>
                  {:else if exam.status === 'scheduled'}
                    <span class="exam-cta muted"><Clock size={9} /> Soon</span>
                  {/if}
                </div>
              {/each}
            </div>
          {:else}
            <p class="no-exam"><AlertCircle size={11} /> No exam scheduled yet</p>
          {/if}

        </div>
      {/each}
    </div>
  {/if}

</div>

<style>
  .courses-page { display: flex; flex-direction: column; gap: 1.25rem; }

  /* header */
  .page-header {
    display: flex; align-items: flex-end;
    justify-content: space-between; gap: 1rem; flex-wrap: wrap;
  }
  .page-header h1 { font-size: 1.25rem; font-weight: 800; color: var(--color-text); margin: 0; }
  .page-sub { font-size: 0.78rem; color: var(--color-muted); margin: 0.2rem 0 0; }

  .btn-register {
    display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.55rem 1rem; border-radius: 0.5rem;
    background: var(--green-600); color: #fff;
    font-size: 0.8rem; font-weight: 700; text-decoration: none;
    transition: background 0.15s;
  }
  .btn-register:hover { background: var(--green-700); }

  /* search */
  .search-wrap {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.55rem 0.875rem; border-radius: 0.6rem;
    background: var(--color-surface); border: 1px solid var(--color-border);
    max-width: 380px; color: var(--color-muted);
  }
  .search-wrap input {
    flex: 1; border: none; background: none; outline: none;
    font-size: 0.82rem; color: var(--color-text); font-family: inherit;
  }
  .search-wrap input::placeholder { color: var(--color-muted); }
  .clear-btn {
    width: 18px; height: 18px; border-radius: 50%;
    border: none; background: var(--color-border); color: var(--color-muted);
    font-size: 0.7rem; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
  }

  /* grid */
  .course-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 0.875rem;
  }

  .course-card {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: var(--radius-card); padding: 1rem;
    display: flex; flex-direction: column; gap: 0.625rem;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .course-card:hover {
    border-color: var(--green-600);
    box-shadow: 0 4px 14px rgba(0,0,0,0.05);
  }

  .card-top { display: flex; align-items: center; gap: 0.625rem; }
  .card-icon {
    width: 34px; height: 34px; border-radius: 0.45rem; flex-shrink: 0;
    background: var(--green-soft); color: var(--green-600);
    display: flex; align-items: center; justify-content: center;
  }
  .card-meta { display: flex; flex-direction: column; flex: 1; min-width: 0; }
  .course-code { font-size: 0.78rem; font-weight: 800; color: var(--color-text); font-family: monospace; }
  .course-cu   { font-size: 0.66rem; color: var(--color-muted); }

  .course-title {
    font-size: 0.875rem; font-weight: 700; color: var(--color-text);
    margin: 0; line-height: 1.35;
  }

  .course-chips { display: flex; flex-wrap: wrap; gap: 0.4rem; }
  .course-chips span {
    display: inline-flex; align-items: center; gap: 0.2rem;
    font-size: 0.66rem; color: var(--color-muted);
    padding: 0.15rem 0.4rem; border-radius: 0.25rem;
    background: var(--color-bg);
  }

  /* exams */
  .exams-list { display: flex; flex-direction: column; gap: 0.35rem; margin-top: 0.1rem; }
  .exam-row {
    display: flex; align-items: center; gap: 0.4rem;
    padding: 0.375rem 0.5rem; border-radius: 0.375rem;
    background: var(--color-bg); border: 1px solid var(--color-border);
    font-size: 0.71rem;
  }
  .exam-title {
    flex: 1; min-width: 0; overflow: hidden;
    text-overflow: ellipsis; white-space: nowrap;
    font-weight: 600; color: var(--color-text);
  }
  .exam-date { color: var(--color-muted); white-space: nowrap; }
  .exam-cta {
    display: inline-flex; align-items: center; gap: 0.2rem;
    padding: 0.15rem 0.4rem; border-radius: 0.25rem;
    background: var(--green-600); color: #fff;
    font-size: 0.64rem; font-weight: 700;
    text-decoration: none; white-space: nowrap;
    transition: background 0.15s;
  }
  .exam-cta:hover { background: var(--green-700); }
  .exam-cta.muted {
    background: var(--color-border); color: var(--color-muted); cursor: default;
  }

  .no-exam {
    display: flex; align-items: center; gap: 0.3rem;
    font-size: 0.7rem; color: var(--color-muted);
  }

  /* empty state */
  .empty-state {
    display: flex; flex-direction: column; align-items: center; gap: 0.625rem;
    padding: 3.5rem 1rem; color: var(--color-muted); text-align: center;
  }
  .empty-state p   { margin: 0; font-size: 0.82rem; }
  .empty-state a   { color: var(--green-600); font-weight: 700; text-decoration: none; font-size: 0.8rem; }
  .empty-state a:hover { text-decoration: underline; }

  /* badges */
  .badge {
    display: inline-flex; padding: 0.1rem 0.35rem; border-radius: 0.2rem;
    font-size: 0.6rem; font-weight: 800; text-transform: uppercase; white-space: nowrap;
  }
  .badge-green { background: var(--green-soft);  color: var(--green-700); }
  .badge-blue  { background: var(--blue-soft);   color: var(--blue-500);  }
  .badge-amber { background: rgba(245,158,11,.12); color: #d97706;        }
  .badge-red   { background: rgba(220,38,38,.1);  color: #dc2626;         }
  .badge-gray  { background: var(--color-bg);     color: var(--color-muted); border: 1px solid var(--color-border); }
</style>