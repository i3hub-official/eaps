<!-- src/routes/student/profile/+page.svelte -->
<script lang="ts">
  import {
    UserCircle, Hash, IdCard, Phone, MapPin, Flag,
    VenusAndMars, Cake, Building2, School, BookOpen,
    GraduationCap, Layers, Calendar, ShieldCheck,
    CheckCircle2, XCircle, Fingerprint, Eye, Timer,
    TrendingUp, ClipboardList, Award, FileText,
    Pencil, Save, X, Camera
  } from 'lucide-svelte';
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let editing = $state(false);
  let phone = $state(data.user.phone ?? '');
  let address = $state(data.user.address ?? '');
  let gender = $state(data.user.gender ?? '');

  const initials = $derived(() => {
    const parts = data.user.fullName.trim().split(/\\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  });

  function formatDate(d: Date | string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  const sections = $derived([
    {
      title: 'Personal Information',
      icon: UserCircle,
      fields: [
        { label: 'Full Name', value: data.user.fullName, icon: UserCircle },
        { label: 'Email', value: data.user.email, icon: FileText },
        { label: 'Phone', value: data.user.phone ?? '—', icon: Phone, editable: true },
        { label: 'Gender', value: data.user.gender ?? '—', icon: VenusAndMars, editable: true },
        { label: 'Date of Birth', value: formatDate(data.user.dateOfBirth), icon: Cake },
      ].filter(f => f.value !== '—' || f.editable),
    },
    {
      title: 'Academic Information',
      icon: GraduationCap,
      fields: [
        { label: 'Matric Number', value: data.user.matricNumber ?? '—', icon: Hash },
        { label: 'JAMB Reg. No', value: data.user.jambRegNo ?? '—', icon: IdCard },
        { label: 'Level', value: data.user.level ? `${data.user.level.level ?? data.user.level.name} Level` : '—', icon: TrendingUp },
        { label: 'Academic Session', value: data.user.session ?? '—', icon: Calendar },
        { label: 'Department', value: data.user.department?.name ?? '—', icon: BookOpen },
        { label: 'College', value: data.user.college?.name ?? '—', icon: School },
        { label: 'Programme', value: data.user.programme?.name ?? '—', icon: Layers },
      ].filter(f => f.value !== '—'),
    },
    {
      title: 'Location',
      icon: MapPin,
      fields: [
        { label: 'Nationality', value: data.user.nationality ?? '—', icon: Flag },
        { label: 'State of Origin', value: data.user.stateOfOrigin ?? '—', icon: MapPin },
        { label: 'LGA', value: data.user.lga ?? '—', icon: Building2 },
        { label: 'Address', value: data.user.address ?? '—', icon: MapPin, editable: true },
      ].filter(f => f.value !== '—' || f.editable),
    },
    {
      title: 'Account Details',
      icon: ShieldCheck,
      fields: [
        { label: 'Account Created', value: formatDate(data.user.createdAt), icon: Calendar },
        { label: 'Last Updated', value: formatDate(data.user.updatedAt), icon: Timer },
        { label: 'Status', value: data.user.isActive ? 'Active' : 'Inactive', icon: data.user.isActive ? CheckCircle2 : XCircle },
        { label: 'Face Enrollment', value: data.user.enrolled ? 'Enrolled' : 'Not Enrolled', icon: data.user.enrolled ? Fingerprint : Eye },
        { label: 'Enrolled At', value: data.user.enrolledAt ? formatDate(data.user.enrolledAt) : '—', icon: Calendar },
      ].filter(f => f.value !== '—'),
    },
  ]);
</script>

<div class="profile-page">
  <!-- Header card -->
  <div class="profile-header">
    <div class="profile-avatar-wrap">
      <div class="profile-avatar"><span>{initials()}</span></div>
      {#if data.user.enrolled}
        <div class="profile-verified" title="Face enrolled"><ShieldCheck size={11} /></div>
      {/if}
    </div>
    <div class="profile-info">
      <h1>{data.user.fullName}</h1>
      <div class="profile-chips">
        <span class="chip chip-green"><GraduationCap size={10} /> Student</span>
        <span class="chip" class:chip-active={data.user.isActive} class:chip-inactive={!data.user.isActive}>
          <ShieldCheck size={10} /> {data.user.isActive ? 'Active' : 'Inactive'}
        </span>
        {#if data.user.level}
          <span class="chip chip-blue"><Layers size={10} /> {data.user.level?.level ?? data.user.level?.name ?? '—'} LEVEL</span>
        {/if}
        {#if data.user.enrolled}
          <span class="chip chip-teal"><Fingerprint size={10} /> Face Enrolled</span>
        {/if}
        {#if data.user.isSuspended}
          <span class="chip chip-red"><XCircle size={10} /> Suspended</span>
        {/if}
      </div>
      <p class="profile-meta">{data.user.matricNumber ?? '—'} · {data.user.department?.name ?? '—'}</p>
    </div>
    <div class="profile-actions">
      {#if !editing}
        <button class="btn-edit" onclick={() => editing = true}>
          <Pencil size={13} /> Edit
        </button>
      {/if}
    </div>
  </div>

  <!-- Stats strip -->
  <div class="profile-stats">
    <div class="p-stat">
      <ClipboardList size={16} />
      <span class="p-stat-value">{data.stats.totalRegistrations}</span>
      <span class="p-stat-label">Courses</span>
    </div>
    <div class="p-stat">
      <FileText size={16} />
      <span class="p-stat-value">{data.stats.totalExamSessions}</span>
      <span class="p-stat-label">Sessions</span>
    </div>
    <div class="p-stat">
      <Award size={16} />
      <span class="p-stat-value">{data.stats.totalResults}</span>
      <span class="p-stat-label">Results</span>
    </div>
  </div>

  <!-- Edit form -->
  {#if editing}
    <form method="POST" action="?/updateProfile" class="edit-form" use:enhance={() => {
      return async ({ update }) => { editing = false; update(); };
    }}>
      <div class="edit-head">
        <h3>Edit Profile</h3>
        <button type="button" class="edit-close" onclick={() => editing = false}><X size={14} /></button>
      </div>
      <div class="edit-fields">
        <label>
          <span>Phone</span>
          <input type="tel" name="phone" bind:value={phone} placeholder="Phone number" />
        </label>
        <label>
          <span>Gender</span>
          <select name="gender" bind:value={gender}>
            <option value="">Select</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </label>
        <label>
          <span>Address</span>
          <textarea name="address" bind:value={address} rows="2" placeholder="Residential address"></textarea>
        </label>
      </div>
      <div class="edit-actions">
        <button type="button" class="btn-cancel" onclick={() => editing = false}>Cancel</button>
        <button type="submit" class="btn-save"><Save size={13} /> Save Changes</button>
      </div>
      {#if form?.success}
        <p class="form-success"><CheckCircle2 size={12} /> Profile updated successfully</p>
      {/if}
    </form>
  {/if}

  <!-- Info sections -->
  <div class="profile-sections">
    {#each sections as section}
      <div class="profile-section">
        <div class="section-header">
          <svelte:component this={section.icon} size={15} />
          <h2>{section.title}</h2>
        </div>
        <div class="section-grid">
          {#each section.fields as field}
            <div class="info-field">
              <div class="info-icon">
                <svelte:component this={field.icon} size={13} />
              </div>
              <div class="info-content">
                <span class="info-label">{field.label}</span>
                <span class="info-value" class:mono={field.label === 'Matric Number' || field.label === 'JAMB Reg. No'}>
                  {field.value}
                </span>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>

  <!-- Recent sessions -->
  {#if data.recentSessions.length > 0}
    <div class="profile-section">
      <div class="section-header">
        <ClipboardList size={15} />
        <h2>Recent Exam Sessions</h2>
      </div>
      <div class="session-list">
        {#each data.recentSessions as session}
          <div class="session-row">
            <div class="session-info">
              <span class="session-title">{session.examTitle}</span>
              <span class="session-code">{session.courseCode}</span>
            </div>
            <div class="session-meta">
              <span class="session-status" class:done={session.status === 'submitted'} class:active={session.status === 'active'}>
                {session.status.replace('_', ' ')}
              </span>
              {#if session.score !== null}
                <span class="session-score">{session.score}%</span>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  :root {
    --green-400: #4ade80;
    --green-500: #22c55e;
    --green-600: #16a34a;
    --green-700: #15803d;
    --green-soft: rgba(34,197,94,0.08);
    --blue-500: #3b82f6;
    --blue-soft: rgba(59,130,246,0.08);
    --teal-500: #14b8a6;
    --teal-soft: rgba(20,184,166,0.08);
    --radius-card: 0.875rem;
  }

  .profile-page { display: flex; flex-direction: column; gap: 1.25rem; }

  .profile-header {
    display: flex; align-items: flex-start; gap: 1rem;
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: var(--radius-card); padding: 1.25rem;
  }
  .profile-avatar-wrap { position: relative; flex-shrink: 0; }
  .profile-avatar {
    width: 64px; height: 64px; border-radius: 50%;
    background: linear-gradient(135deg, var(--green-700), var(--green-500));
    display: flex; align-items: center; justify-content: center;
  }
  .profile-avatar span { font-size: 1.25rem; font-weight: 800; color: #fff; }
  .profile-verified {
    position: absolute; bottom: 0; right: 0;
    width: 20px; height: 20px; border-radius: 50%;
    background: var(--green-600); color: white;
    display: flex; align-items: center; justify-content: center;
    border: 2px solid var(--color-surface);
  }
  .profile-info { flex: 1; min-width: 0; }
  .profile-info h1 { font-size: 1.1rem; font-weight: 800; color: var(--color-text); margin: 0 0 0.5rem; }
  .profile-chips { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 0.375rem; }
  .chip {
    display: inline-flex; align-items: center; gap: 0.25rem;
    font-size: 0.62rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
    padding: 0.18rem 0.5rem; border-radius: 999px;
    background: var(--color-bg); border: 1px solid var(--color-border); color: var(--color-muted);
  }
  .chip-green  { background: var(--green-soft); border-color: rgba(34,197,94,0.3); color: var(--green-700); }
  .chip-active { background: var(--green-soft); border-color: rgba(34,197,94,0.3); color: var(--green-700); }
  .chip-inactive { background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.2); color: #dc2626; }
  .chip-blue   { background: var(--blue-soft); border-color: rgba(59,130,246,0.3); color: var(--blue-500); }
  .chip-teal   { background: var(--teal-soft); border-color: rgba(20,184,166,0.3); color: var(--teal-500); }
  .chip-red    { background: rgba(220,38,38,0.08); border-color: rgba(220,38,38,0.2); color: #dc2626; }
  .profile-meta { font-size: 0.78rem; color: var(--color-muted); margin: 0; }
  .profile-actions { flex-shrink: 0; }
  .btn-edit {
    display: inline-flex; align-items: center; gap: 0.35rem;
    padding: 0.4rem 0.75rem; border-radius: 0.4rem;
    border: 1px solid var(--color-border); background: var(--color-bg);
    color: var(--color-muted); font-size: 0.78rem; font-weight: 600;
    cursor: pointer; font-family: inherit; transition: all 0.15s;
  }
  .btn-edit:hover { border-color: var(--green-600); color: var(--green-600); }

  .profile-stats {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem;
  }
  .p-stat {
    display: flex; flex-direction: column; align-items: center; gap: 0.25rem;
    padding: 1rem; border-radius: var(--radius-card);
    background: var(--color-surface); border: 1px solid var(--color-border);
    color: var(--color-muted);
  }
  .p-stat-value { font-size: 1.25rem; font-weight: 800; color: var(--color-text); }
  .p-stat-label { font-size: 0.68rem; font-weight: 600; }

  .edit-form {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: var(--radius-card); padding: 1rem 1.25rem;
    display: flex; flex-direction: column; gap: 0.75rem;
    animation: scale-in 0.15s ease;
  }
  @keyframes scale-in { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
  .edit-head { display: flex; align-items: center; justify-content: space-between; }
  .edit-head h3 { margin: 0; font-size: 0.9rem; font-weight: 700; color: var(--color-text); }
  .edit-close {
    width: 26px; height: 26px; border-radius: 50%;
    border: 1px solid var(--color-border); background: none;
    color: var(--color-muted); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
  }
  .edit-fields { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
  @media (max-width: 560px) { .edit-fields { grid-template-columns: 1fr; } }
  .edit-fields label { display: flex; flex-direction: column; gap: 0.3rem; }
  .edit-fields label span { font-size: 0.72rem; font-weight: 600; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.03em; }
  .edit-fields input, .edit-fields select, .edit-fields textarea {
    padding: 0.5rem 0.625rem; border-radius: 0.4rem;
    border: 1px solid var(--color-border); background: var(--color-bg);
    color: var(--color-text); font-size: 0.82rem; font-family: inherit;
    outline: none; transition: border-color 0.15s;
  }
  .edit-fields input:focus, .edit-fields select:focus, .edit-fields textarea:focus { border-color: var(--green-600); }
  .edit-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
  .btn-cancel {
    padding: 0.5rem 1rem; border-radius: 0.4rem;
    border: 1px solid var(--color-border); background: none;
    color: var(--color-muted); font-size: 0.8rem; font-weight: 600;
    cursor: pointer; font-family: inherit;
  }
  .btn-save {
    display: inline-flex; align-items: center; gap: 0.35rem;
    padding: 0.5rem 1rem; border-radius: 0.4rem;
    background: var(--green-600); color: white; border: none;
    font-size: 0.8rem; font-weight: 700; cursor: pointer; font-family: inherit;
    transition: background 0.15s;
  }
  .btn-save:hover { background: var(--green-700); }
  .form-success { font-size: 0.78rem; color: var(--green-600); display: flex; align-items: center; gap: 0.3rem; margin: 0; }

  .profile-sections { display: flex; flex-direction: column; gap: 1rem; }
  .profile-section {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: var(--radius-card); overflow: hidden;
  }
  .section-header {
    display: flex; align-items: center; gap: 0.4rem;
    padding: 0.875rem 1.125rem; border-bottom: 1px solid var(--color-border);
    font-size: 0.8rem; font-weight: 700; color: var(--color-text);
    text-transform: uppercase; letter-spacing: 0.04em;
  }
  .section-header h2 { margin: 0; font-size: inherit; font-weight: inherit; }
  .section-grid {
    display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem;
    padding: 0.75rem 1.125rem;
  }
  @media (max-width: 640px) { .section-grid { grid-template-columns: 1fr; } }
  .info-field {
    display: flex; align-items: flex-start; gap: 0.625rem;
    padding: 0.625rem; border-radius: 0.5rem;
    background: var(--color-bg); border: 1px solid var(--color-border);
    transition: border-color 0.15s;
  }
  .info-field:hover { border-color: var(--green-600); }
  .info-icon {
    width: 28px; height: 28px; border-radius: 0.4rem; flex-shrink: 0;
    background: var(--green-soft); color: var(--green-600);
    display: flex; align-items: center; justify-content: center;
  }
  .info-content { min-width: 0; display: flex; flex-direction: column; gap: 0.1rem; }
  .info-label { font-size: 0.65rem; font-weight: 600; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.03em; }
  .info-value { font-size: 0.8rem; font-weight: 700; color: var(--color-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .info-value.mono { font-family: monospace; }

  .session-list { display: flex; flex-direction: column; padding: 0.5rem 0; }
  .session-row {
    display: flex; align-items: center; justify-content: space-between;
    gap: 1rem; padding: 0.625rem 1.125rem;
    border-bottom: 1px solid var(--color-border);
    transition: background 0.1s;
  }
  .session-row:last-child { border-bottom: none; }
  .session-row:hover { background: var(--color-bg); }
  .session-info { display: flex; flex-direction: column; min-width: 0; }
  .session-title { font-size: 0.82rem; font-weight: 600; color: var(--color-text); }
  .session-code { font-size: 0.7rem; color: var(--color-muted); font-family: monospace; }
  .session-meta { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }
  .session-status {
    font-size: 0.65rem; font-weight: 700; text-transform: uppercase;
    padding: 0.15rem 0.4rem; border-radius: 0.25rem;
    background: var(--color-bg); color: var(--color-muted); border: 1px solid var(--color-border);
  }
  .session-status.done { background: var(--green-soft); color: var(--green-700); border-color: rgba(34,197,94,0.2); }
  .session-status.active { background: var(--blue-soft); color: var(--blue-500); border-color: rgba(59,130,246,0.2); }
  .session-score { font-size: 0.82rem; font-weight: 800; color: var(--color-text); }
</style>