<!-- src/routes/lecturer/students/by-course/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { 
    Search, Users, ChevronDown, ChevronRight, 
    FileSpreadsheet, FileText, UserCheck, UserX 
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
      <div class="empty-icon">📚</div>
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
              <span class="student-count">{group.students.length} student{group.students.length !== 1 ? 's' : ''}</span>
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
                    <th>S/N</th>
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
                      <td>{s.fullName}</td>
                      <td>{s.matricNumber || '—'}</td>
                      <td>{s.email}</td>
                      <td>{s.level || '—'}</td>
                      <td>
                        {#if s.isSuspended}
                          <span class="badge danger">Suspended</span>
                        {:else}
                          <span class="badge success">Active</span>
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

  .student-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .course-group {
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    overflow: hidden;
    background: var(--color-surface);
  }

  .course-header {
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
    gap: 0.5rem;
  }

  .course-header:hover {
    background: var(--color-bg);
  }

  .course-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    min-width: 0;
    color: var(--color-text);
  }

  .course-code {
    font-weight: 700;
    color: var(--lc-600, #4f46e5);
    font-size: 0.82rem;
  }

  .course-title {
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--color-text);
  }

  .student-count {
    font-size: 0.72rem;
    color: var(--color-muted);
    background: var(--color-bg);
    padding: 0.1rem 0.5rem;
    border-radius: 999px;
  }

  .course-actions {
    display: flex;
    gap: 0.25rem;
    flex-shrink: 0;
  }

  .btn-icon {
    width: 30px;
    height: 30px;
    border-radius: 0.4rem;
    border: 1px solid var(--color-border);
    background: var(--color-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--color-muted);
    transition: all 0.15s;
  }

  .btn-icon:hover {
    color: var(--lc-600, #4f46e5);
    border-color: var(--lc-600, #4f46e5);
    background: var(--lc-soft, rgba(79,70,229,0.06));
  }

  .course-details {
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

    .course-header {
      flex-wrap: wrap;
    }

    .course-info {
      flex-wrap: wrap;
    }

    .course-title {
      width: 100%;
      margin-left: 1.5rem;
    }
  }
</style>