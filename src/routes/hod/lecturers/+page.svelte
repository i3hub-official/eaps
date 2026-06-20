<!-- src/routes/hod/lecturers/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { Users, BookOpen } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();

  function roleLabel(user: any) {
    const isHod = user.role === 'hod';
    const alsoLectures = user.secondaryRoles?.some((r: any) => r.role === 'lecturer');
    if (isHod && alsoLectures) return 'HOD · Lecturer';
    if (isHod) return 'HOD';
    return 'Lecturer';
  }
</script>

<div class="page-header">
  <div class="page-header-text">
    <h1>Lecturers</h1>
    <p>All active teaching staff in your department.</p>
  </div>
</div>

<div class="table-card">
  <table class="data-table">
    <thead>
      <tr><th>Name</th><th>Staff ID</th><th>Role</th><th>Courses</th><th>Exams created</th></tr>
    </thead>
    <tbody>
      {#each data.lecturers as lec}
        <tr>
          <td>
            <div class="fw">{lec.fullName}</div>
            <div class="sub-text">{lec.email}</div>
          </td>
          <td>{lec.staffId ?? '—'}</td>
          <td><span class="role-chip">{roleLabel(lec)}</span></td>
          <td>
            <div class="course-tags">
              {#each lec.lecturerCourses.slice(0, 3) as lc}
                <span class="course-tag">{lc.course.code}</span>
              {/each}
              {#if lec.lecturerCourses.length > 3}
                <span class="course-tag more">+{lec.lecturerCourses.length - 3}</span>
              {/if}
            </div>
          </td>
          <td>{lec._count.createdExams}</td>
        </tr>
      {:else}
        <tr><td colspan="5" class="empty-row">No lecturers found in this department.</td></tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .fw { font-weight:600; }
  .sub-text { font-size:.72rem; color:var(--color-muted); }
  .role-chip { font-size:.7rem; font-weight:700; padding:.2rem .55rem; border-radius:2rem; background:var(--p-accent-dim); color:var(--p-accent); }
  .course-tags { display:flex; flex-wrap:wrap; gap:.3rem; }
  .course-tag { font-size:.68rem; font-weight:700; padding:.15rem .45rem; border-radius:.3rem; background:rgba(59,130,246,.1); color:#3b82f6; }
  .course-tag.more { background:var(--color-bg); color:var(--color-muted); }
</style>