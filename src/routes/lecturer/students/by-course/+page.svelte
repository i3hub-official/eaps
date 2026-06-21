<!-- src/routes/lecturer/students/by-course/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { 
    Search, Users, ChevronDown, ChevronRight, 
    FileSpreadsheet, FileText, UserCheck, UserX,
    BookOpen, AlertCircle, User
  } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();

  let searchQuery = $state('');
  let selectedCourse = $state<string>('all');
  let expandedCourses = $state<Set<string>>(new Set());

  const filteredData = $derived(() => {
    let students = data.students;
    
    if (selectedCourse !== 'all') {
      students = students.filter(s => s.courseIds?.includes(selectedCourse));
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

  // Group by course
  const groupedStudents = $derived(() => {
    const groups: Record<string, { courseId: string; courseCode: string; courseTitle: string; students: any[] }> = {};
    
    for (const s of filteredData()) {
      for (const courseId of (s.courseIds || [])) {
        const course = data.courseMap?.[courseId];
        if (!course) continue;
        
        if (!groups[courseId]) {
          groups[courseId] = {
            courseId: courseId,
            courseCode: course.code,
            courseTitle: course.title,
            students: []
          };
        }
        // Avoid duplicates
        if (!groups[courseId].students.find(st => st.id === s.id)) {
          groups[courseId].students.push(s);
        }
      }
    }
    
    return Object.values(groups);
  });

  function toggleCourse(courseId: string) {
    if (expandedCourses.has(courseId)) {
      expandedCourses.delete(courseId);
    } else {
      expandedCourses.add(courseId);
    }
    expandedCourses = new Set(expandedCourses);
  }

  function exportCourse(courseId: string, format: 'excel' | 'pdf') {
    goto(`/lecturer/students/export?courseId=${courseId}&format=${format}`);
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
    </div>
  </div>

  {#if groupedStudents().length === 0}
    <div class="empty-state">
      <div class="empty-icon">
        <BookOpen size={36} strokeWidth={1.2} />
      </div>
      <p class="empty-title">No students found</p>
      <p class="empty-sub">Try adjusting your filters or check back later.</p>
    </div>
  {:else}
    <div class="student-list">
      {#each groupedStudents() as group}
        <div class="course-group">
          <div
            class="course-header"
            onclick={() => toggleCourse(group.courseId)}
            role="button"
            tabindex="0"
            onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCourse(group.courseId); } }}
          >
            <div class="course-info">
              {#if expandedCourses.has(group.courseId)}
                <ChevronDown size={16} />
              {:else}
                <ChevronRight size={16} />
              {/if}
              <span class="course-code">{group.courseCode}</span>
              <span class="course-title">{group.courseTitle}</span>
              <span class="student-count">
                <Users size={12} />
                {group.students.length} student{group.students.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div class="course-actions" onclick={(e) => e.stopPropagation()}>
              <button
                class="btn-icon"
                onclick={() => exportCourse(group.courseId, 'excel')}
                title="Export to Excel"
                type="button"
              >
                <FileSpreadsheet size={14} />
              </button>
              <button
                class="btn-icon"
                onclick={() => exportCourse(group.courseId, 'pdf')}
                title="Export to PDF"
                type="button"
              >
                <FileText size={14} />
              </button>
            </div>
          </div>

          {#if expandedCourses.has(group.courseId)}
            <div class="course-details">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Student</th>
                    <th>Matric No.</th>
                    <th>Email</th>
                    <th>Level</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {#each group.students as s, i}
                    <tr>
                      <td>{i + 1}</td>
                      <td>
                        <User size={12} />
                        {s.fullName}
                      </td>
                      <td>{s.matricNumber || '—'}</td>
                      <td>{s.email}</td>
                      <td>{s.level || '—'}</td>
                      <td>
                        {#if s.isSuspended}
                          <span class="badge danger">
                            <UserX size={12} />
                            Suspended
                          </span>
                        {:else}
                          <span class="badge success">
                            <UserCheck size={12} />
                            Active
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
    padding: 2rem 1.5rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .filters {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
    flex-wrap: wrap;
    align-items: center;
  }

  .filter-group {
    flex: 1;
    min-width: 200px;
  }

  .filter-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    padding: 0.5rem 0.75rem;
    transition: border-color 0.15s;
  }

  .filter-item:focus-within {
    border-color: var(--lc-500);
    box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
  }

  .filter-item input {
    border: none;
    background: transparent;
    font-size: 0.875rem;
    width: 100%;
    outline: none;
    color: var(--color-text);
  }

  .filter-item input::placeholder {
    color: var(--color-muted);
  }

  .filter-group select {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-surface);
    color: var(--color-text);
    font-size: 0.875rem;
    cursor: pointer;
    outline: none;
    transition: border-color 0.15s;
  }

  .filter-group select:focus {
    border-color: var(--lc-500);
    box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 4rem 2rem;
    text-align: center;
    background: var(--color-surface);
    border: 1.5px dashed var(--color-border);
    border-radius: 0.875rem;
  }

  .empty-icon {
    width: 64px;
    height: 64px;
    border-radius: 1rem;
    background: rgba(99,102,241,0.08);
    border: 1px solid rgba(99,102,241,0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--lc-600);
    margin-bottom: 0.25rem;
  }

  .empty-title {
    font-size: 1rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0;
  }

  .empty-sub {
    font-size: 0.82rem;
    color: var(--color-muted);
    margin: 0;
  }

  .student-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .course-group {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    overflow: hidden;
    transition: box-shadow 0.15s;
  }

  .course-group:hover {
    box-shadow: 0 2px 12px rgba(0,0,0,0.05);
  }

  .course-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.875rem 1.25rem;
    cursor: pointer;
    user-select: none;
    transition: background 0.15s;
  }

  .course-header:hover {
    background: var(--color-bg);
  }

  .course-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .course-code {
    font-size: 0.8rem;
    font-weight: 700;
    padding: 0.2rem 0.6rem;
    background: rgba(99,102,241,0.08);
    color: var(--lc-600);
    border-radius: 999px;
    letter-spacing: 0.04em;
  }

  .course-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .student-count {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-muted);
    padding: 0.15rem 0.6rem;
    background: var(--color-bg);
    border-radius: 999px;
    border: 1px solid var(--color-border);
  }

  .course-actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.35rem;
    border: 1px solid var(--color-border);
    border-radius: 0.4rem;
    background: transparent;
    color: var(--color-muted);
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-icon:hover {
    background: var(--color-bg);
    border-color: var(--lc-500);
    color: var(--lc-600);
  }

  .course-details {
    padding: 0 1.25rem 1.25rem;
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  thead {
    background: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
  }

  th {
    text-align: left;
    padding: 0.75rem 0.75rem;
    font-weight: 600;
    color: var(--color-muted);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  td {
    padding: 0.75rem;
    border-bottom: 1px solid var(--color-border);
    color: var(--color-text);
  }

  tr:last-child td {
    border-bottom: none;
  }

  td:first-child,
  th:first-child {
    padding-left: 0;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 600;
  }

  .badge.success {
    background: rgba(22,163,74,0.08);
    color: #16a34a;
  }

  .badge.danger {
    background: rgba(220,38,38,0.08);
    color: #dc2626;
  }

  @media (max-width: 768px) {
    .page {
      padding: 1rem;
    }

    .filters {
      flex-direction: column;
    }

    .filter-group {
      width: 100%;
    }

    .course-header {
      flex-direction: column;
      align-items: stretch;
      gap: 0.5rem;
    }

    .course-actions {
      justify-content: flex-start;
    }

    .course-info {
      flex-wrap: wrap;
    }

    table {
      font-size: 0.75rem;
    }

    th,
    td {
      padding: 0.5rem;
    }
  }

  @media (max-width: 480px) {
    .course-title {
      font-size: 0.8rem;
    }

    .course-code {
      font-size: 0.7rem;
    }

    td {
      padding: 0.4rem;
    }
  }
</style>