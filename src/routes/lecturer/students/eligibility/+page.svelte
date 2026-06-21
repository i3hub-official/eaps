<!-- src/routes/lecturer/students/eligibility/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { 
    Search, Users, CheckCircle, XCircle, 
    Clock, ChevronDown, ChevronRight 
  } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();

  let searchQuery = $state('');
  let selectedCourse = $state<string>('all');
  let selectedStatus = $state<string>('all');
  let expandedExams = $state<Set<string>>(new Set());

  const filteredData = $derived(() => {
    let data = {
      exams: data.exams,
      students: data.students
    };
    
    if (selectedCourse !== 'all') {
      data.exams = data.exams.filter(e => e.courseId === selectedCourse);
    }
    
    if (selectedStatus !== 'all') {
      // Filter exams by status
    }
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data.students = data.students.filter(s => 
        s.fullName.toLowerCase().includes(q) ||
        s.matricNumber?.toLowerCase().includes(q)
      );
    }
    
    return data;
  });

  function toggleExam(examId: string) {
    if (expandedExams.has(examId)) {
      expandedExams.delete(examId);
    } else {
      expandedExams.add(examId);
    }
    expandedExams = new Set(expandedExams);
  }

  function getStatusBadge(status: string): string {
    const map: Record<string, string> = {
      draft: 'badge-draft',
      scheduled: 'badge-scheduled',
      active: 'badge-active',
      completed: 'badge-completed',
      cancelled: 'badge-cancelled'
    };
    return map[status] || 'badge-draft';
  }

  function getStatusLabel(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  function isStudentEligible(student: any, exam: any): boolean {
    // Check level eligibility
    if (exam.levels && exam.levels.length > 0) {
      if (!exam.levels.includes(student.level)) return false;
    }
    
    // Check department eligibility
    if (exam.departments && exam.departments.length > 0) {
      if (!exam.departments.includes(student.departmentId)) return false;
    }
    
    return true;
  }
</script>

<div class="page">
  <div class="filters">
    <div class="filter-group">
      <div class="filter-item">
        <Search size={14} />
        <input
          type="text"
          placeholder="Search by name, matric..."
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

      <select bind:value={selectedStatus}>
        <option value="all">All Status</option>
        <option value="scheduled">Scheduled</option>
        <option value="active">Active</option>
        <option value="completed">Completed</option>
      </select>
    </div>
  </div>

  {#if filteredData().exams.length === 0}
    <div class="empty-state">
      <div class="empty-icon">🎯</div>
      <p class="empty-title">No exams found</p>
      <p class="empty-sub">Create an exam to check student eligibility.</p>
    </div>
  {:else}
    <div class="exam-list">
      {#each filteredData().exams as exam}
        <div class="exam-group">
          <div
            class="exam-header"
            onclick={() => toggleExam(exam.id)}
            role="button"
            tabindex="0"
            onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExam(exam.id); } }}
          >
            <div class="exam-info">
              {#if expandedExams.has(exam.id)}
                <ChevronDown size={16} />
              {:else}
                <ChevronRight size={16} />
              {/if}
              <span class="exam-title">{exam.title}</span>
              <span class="course-code">{exam.courseCode}</span>
              <span class="status-badge {getStatusBadge(exam.status)}">{getStatusLabel(exam.status)}</span>
              <span class="student-count">
                {exam.eligibleCount || 0} eligible
              </span>
            </div>
          </div>

          {#if expandedExams.has(exam.id)}
            <div class="exam-details">
              <table>
                <thead>
                  <tr>
                    <th>S/N</th>
                    <th>Student</th>
                    <th>Matric No.</th>
                    <th>Level</th>
                    <th>Department</th>
                    <th>Eligibility</th>
                  </tr>
                </thead>
                <tbody>
                  {#each filteredData().students as s, i}
                    {@const eligible = isStudentEligible(s, exam)}
                    <tr>
                      <td>{i + 1}</td>
                      <td>{s.fullName}</td>
                      <td>{s.matricNumber || '—'}</td>
                      <td>{s.level || '—'}</td>
                      <td>{s.departmentName || '—'}</td>
                      <td>
                        {#if eligible}
                          <span class="badge success">
                            <CheckCircle size={12} /> Eligible
                          </span>
                        {:else}
                          <span class="badge danger">
                            <XCircle size={12} /> Not Eligible
                          </span>
                        {/if}
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .page {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
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
    font-size: 3rem;
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

  .exam-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .exam-group {
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    overflow: hidden;
    background: var(--color-surface);
  }

  .exam-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0.875rem 1rem;
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    text-align: left;
    transition: background 0.12s;
  }

  .exam-header:hover {
    background: var(--color-bg);
  }

  .exam-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    min-width: 0;
    flex-wrap: wrap;
    color: var(--color-text);
  }

  .exam-title {
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--color-text);
  }

  .course-code {
    font-weight: 700;
    color: var(--lc-600, #4f46e5);
    font-size: 0.78rem;
    background: var(--lc-soft, rgba(79,70,229,0.06));
    padding: 0.1rem 0.4rem;
    border-radius: 0.3rem;
  }

  .status-badge {
    font-size: 0.6rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.1rem 0.5rem;
    border-radius: 999px;
  }

  .badge-draft { background: var(--color-bg); color: var(--color-muted); border: 1px solid var(--color-border); }
  .badge-scheduled { background: rgba(59,130,246,0.1); color: #2563eb; }
  .badge-active { background: rgba(34,197,94,0.12); color: #15803d; }
  .badge-completed { background: rgba(107,114,128,0.12); color: var(--color-muted); }
  .badge-cancelled { background: rgba(239,68,68,0.1); color: #ef4444; }

  .student-count {
    font-size: 0.72rem;
    color: var(--color-muted);
    background: var(--color-bg);
    padding: 0.1rem 0.5rem;
    border-radius: 999px;
  }

  .exam-details {
    padding: 0 1rem 1rem;
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
  }

  thead {
    background: var(--color-bg);
  }

  th {
    text-align: left;
    padding: 0.625rem 0.75rem;
    font-weight: 700;
    color: var(--color-muted);
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border-bottom: 1.5px solid var(--color-border);
  }

  td {
    padding: 0.625rem 0.75rem;
    border-bottom: 1px solid var(--color-border);
    color: var(--color-text);
  }

  tr:last-child td {
    border-bottom: none;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
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

    .exam-info {
      flex-wrap: wrap;
    }
  }
</style>