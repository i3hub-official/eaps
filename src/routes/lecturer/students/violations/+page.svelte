<!-- src/routes/lecturer/students/violations/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { 
    Search, AlertTriangle, ShieldAlert, 
    Eye, ChevronDown, ChevronRight,
    FileSpreadsheet, FileText, Shield
  } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();

  let searchQuery = $state('');
  let selectedStudent = $state<string>('all');
  let selectedType = $state<string>('all');
  let expandedStudents = $state<Set<string>>(new Set());

  const filteredData = $derived(() => {
    let students = data.students;
    
    if (selectedStudent !== 'all') {
      students = students.filter(s => s.id === selectedStudent);
    }
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      students = students.filter(s => 
        s.fullName.toLowerCase().includes(q) ||
        s.matricNumber?.toLowerCase().includes(q)
      );
    }
    
    // Filter violations by type
    if (selectedType !== 'all') {
      students = students.map(s => ({
        ...s,
        violations: s.violations?.filter(v => v.flagType === selectedType) || []
      })).filter(s => s.violations.length > 0);
    }
    
    return students.filter(s => (s.violations || []).length > 0);
  });

  function toggleStudent(studentId: string) {
    if (expandedStudents.has(studentId)) {
      expandedStudents.delete(studentId);
    } else {
      expandedStudents.add(studentId);
    }
    expandedStudents = new Set(expandedStudents);
  }

  function getViolationColor(type: string): string {
    const colors: Record<string, string> = {
      tab_switch: 'color-tab',
      window_blur: 'color-blur',
      fullscreen_exit: 'color-fullscreen',
      copy_attempt: 'color-copy',
      devtools_open: 'color-devtools',
      screenshot_attempt: 'color-screenshot',
      multiple_faces: 'color-faces',
      no_face_detected: 'color-no-face',
      face_mismatch: 'color-face-mismatch',
      invigilator_manual: 'color-manual'
    };
    return colors[type] || 'color-default';
  }

  function getViolationLabel(type: string): string {
    const labels: Record<string, string> = {
      tab_switch: 'Tab Switch',
      window_blur: 'Window Blur',
      fullscreen_exit: 'Fullscreen Exit',
      copy_attempt: 'Copy Attempt',
      devtools_open: 'DevTools Open',
      screenshot_attempt: 'Screenshot Attempt',
      multiple_faces: 'Multiple Faces',
      no_face_detected: 'No Face Detected',
      face_mismatch: 'Face Mismatch',
      invigilator_manual: 'Manual Report'
    };
    return labels[type] || type;
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
      <select bind:value={selectedStudent}>
        <option value="all">All Students</option>
        {#each data.students as student}
          <option value={student.id}>{student.fullName} ({student.matricNumber})</option>
        {/each}
      </select>

      <select bind:value={selectedType}>
        <option value="all">All Violation Types</option>
        <option value="tab_switch">Tab Switch</option>
        <option value="window_blur">Window Blur</option>
        <option value="fullscreen_exit">Fullscreen Exit</option>
        <option value="copy_attempt">Copy Attempt</option>
        <option value="devtools_open">DevTools Open</option>
        <option value="screenshot_attempt">Screenshot Attempt</option>
        <option value="multiple_faces">Multiple Faces</option>
        <option value="no_face_detected">No Face Detected</option>
        <option value="face_mismatch">Face Mismatch</option>
        <option value="invigilator_manual">Manual Report</option>
      </select>
    </div>
  </div>

  {#if filteredData().length === 0}
    <div class="empty-state">
      <div class="empty-icon">
        <Shield size={48} strokeWidth={1.2} />
      </div>
      <p class="empty-title">No violations found</p>
      <p class="empty-sub">All students are in good standing.</p>
    </div>
  {:else}
    <div class="violation-list">
      {#each filteredData() as student}
        <div class="student-group">
          <div
            class="student-header"
            onclick={() => toggleStudent(student.id)}
            role="button"
            tabindex="0"
            onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleStudent(student.id); } }}
          >
            <div class="student-info">
              {#if expandedStudents.has(student.id)}
                <ChevronDown size={16} />
              {:else}
                <ChevronRight size={16} />
              {/if}
              <span class="student-name">{student.fullName}</span>
              <span class="student-matric">{student.matricNumber || 'No matric'}</span>
              <span class="violation-count">
                <AlertTriangle size={12} />
                {student.violations.length} violation{student.violations.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div class="student-actions" onclick={(e) => e.stopPropagation()}>
              <a 
                href="/lecturer/students/report?studentId={student.id}" 
                class="btn-small"
                type="button"
              >
                <Eye size={14} /> View
              </a>
            </div>
          </div>

          {#if expandedStudents.has(student.id)}
            <div class="student-details">
              <table>
                <thead>
                  <tr>
                    <th>Date/Time</th>
                    <th>Type</th>
                    <th>Exam</th>
                    <th>Action Taken</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {#each student.violations as v}
                    <tr>
                      <td>{new Date(v.flaggedAt).toLocaleString()}</td>
                      <td>
                        <span class="violation-type {getViolationColor(v.flagType)}">
                          {getViolationLabel(v.flagType)}
                        </span>
                      </td>
                      <td>{v.examTitle || '—'}</td>
                      <td>
                        {#if v.actionTaken}
                          <span class="badge action">{v.actionTaken.replace('_', ' ')}</span>
                        {:else}
                          <span class="badge muted">None</span>
                        {/if}
                      </td>
                      <td>{v.note || '—'}</td>
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

  .violation-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .student-group {
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    overflow: hidden;
    background: var(--color-surface);
  }

  .student-header {
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

  .student-header:hover {
    background: var(--color-bg);
  }

  .student-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    min-width: 0;
    flex-wrap: wrap;
    color: var(--color-text);
  }

  .student-name {
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--color-text);
  }

  .student-matric {
    font-size: 0.72rem;
    color: var(--color-muted);
  }

  .violation-count {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.7rem;
    font-weight: 700;
    color: #dc2626;
    background: rgba(220,38,38,0.08);
    padding: 0.1rem 0.5rem;
    border-radius: 999px;
  }

  .student-actions {
    display: flex;
    gap: 0.25rem;
    flex-shrink: 0;
  }

  .btn-small {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.6rem;
    border-radius: 0.4rem;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--lc-600, #4f46e5);
    background: var(--lc-soft, rgba(79,70,229,0.06));
    border: 1px solid var(--color-border);
    text-decoration: none;
    transition: all 0.15s;
    cursor: pointer;
    font-family: inherit;
  }

  .btn-small:hover {
    background: var(--lc-soft, rgba(79,70,229,0.12));
    border-color: var(--lc-600, #4f46e5);
  }

  .student-details {
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

  .violation-type {
    display: inline-block;
    padding: 0.1rem 0.5rem;
    border-radius: 0.3rem;
    font-size: 0.7rem;
    font-weight: 600;
  }

  .color-tab { background: rgba(59,130,246,0.1); color: #2563eb; }
  .color-blur { background: rgba(139,92,246,0.1); color: #7c3aed; }
  .color-fullscreen { background: rgba(236,72,153,0.1); color: #db2777; }
  .color-copy { background: rgba(239,68,68,0.1); color: #dc2626; }
  .color-devtools { background: rgba(245,158,11,0.1); color: #d97706; }
  .color-screenshot { background: rgba(16,185,129,0.1); color: #065f46; }
  .color-faces { background: rgba(234,179,8,0.1); color: #ca8a04; }
  .color-no-face { background: rgba(107,114,128,0.1); color: #6b7280; }
  .color-face-mismatch { background: rgba(239,68,68,0.1); color: #dc2626; }
  .color-manual { background: rgba(249,115,22,0.1); color: #ea580c; }
  .color-default { background: var(--color-bg); color: var(--color-muted); }

  .badge {
    display: inline-block;
    padding: 0.1rem 0.5rem;
    border-radius: 999px;
    font-size: 0.6rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .badge.action {
    color: var(--lc-600, #4f46e5);
    background: var(--lc-soft, rgba(79,70,229,0.08));
  }

  .badge.muted {
    color: var(--color-muted);
    background: var(--color-bg);
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

    .student-info {
      flex-wrap: wrap;
    }
  }
</style>