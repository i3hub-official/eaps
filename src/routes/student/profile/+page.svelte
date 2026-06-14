<script lang="ts">
  import {
    UserCircle, Hash, IdCard, Phone, MapPin, Flag,
    VenusAndMars, Cake, Building2, School, BookOpen,
    GraduationCap, Layers, Calendar, ShieldCheck,
    CheckCircle2, XCircle, Fingerprint, Eye, Timer,
    TrendingUp, ClipboardList, Award, FileText,
    Pencil, Save, X, Camera, Sparkles, Mail, Globe,
    MapPinned, Activity, ArrowRight, Lock, AlertTriangle,
    CameraOff, RefreshCw, ShieldAlert, MailWarning
  } from '@lucide/svelte';
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import FaceEnrollmentModal from '$lib/components/exam/FaceEnrollmentModal.svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let editing = $state(false);
  let phone = $state(data.user.phone ?? '');
  let address = $state(data.user.address ?? '');
  let gender = $state(data.user.gender ?? '');

  // Modal states
  let showFaceModal = $state(false);
  let resendingEmail = $state(false);
  let emailResent = $state(false);

  const initials = $derived(() => {
    const parts = data.user.fullName.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  });

  function formatDate(d: Date | string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  async function resendVerification() {
    resendingEmail = true;
    try {
      const res = await fetch('/api/auth/resend-verification', { method: 'POST' });
      if (res.ok) {
        emailResent = true;
        setTimeout(() => emailResent = false, 5000);
      }
    } finally {
      resendingEmail = false;
    }
  }

  function handleFaceComplete() {
    showFaceModal = false;
    // Reload to reflect enrolled status
    window.location.reload();
  }

  const sections = $derived([
    {
      title: 'Personal Information',
      icon: UserCircle,
      color: 'var(--green-600)',
      bg: 'var(--green-soft)',
      fields: [
        { label: 'Full Name', value: data.user.fullName, icon: UserCircle },
        { label: 'Email', value: data.user.email, icon: Mail },
        { label: 'Phone', value: data.user.phone ?? '—', icon: Phone, editable: true },
        { label: 'Gender', value: data.user.gender ?? '—', icon: VenusAndMars, editable: true },
        { label: 'Date of Birth', value: formatDate(data.user.dateOfBirth), icon: Cake },
      ].filter(f => f.value !== '—' || f.editable),
    },
    {
      title: 'Academic Information',
      icon: GraduationCap,
      color: 'var(--blue-500)',
      bg: 'var(--blue-soft)',
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
      color: '#f59e0b',
      bg: 'var(--amber-soft)',
      fields: [
        { label: 'Nationality', value: data.user.nationality ?? '—', icon: Globe },
        { label: 'State of Origin', value: data.user.stateoforigin ?? '—', icon: MapPin },
        { label: 'LGA', value: data.user.lga ?? '—', icon: Building2 },
        { label: 'Address', value: data.user.address ?? '—', icon: MapPinned, editable: true },
      ].filter(f => f.value !== '—' || f.editable),
    },
    {
      title: 'Account Details',
      icon: ShieldCheck,
      color: '#8b5cf6',
      bg: 'rgba(139, 92, 246, 0.08)',
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
  <!-- ══ ALERT BANNER: FACE NOT ENROLLED ═══════════════════════ -->
  {#if !data.user.enrolled}
    <div class="alert-banner alert-amber">
      <div class="alert-icon">
        <ShieldAlert size={18} strokeWidth={2.5} />
      </div>
      <div class="alert-content">
        <strong>Face Enrollment Required</strong>
        <p>You haven't enrolled your face yet. Face verification is required to take exams. Please enroll now to avoid issues during exams.</p>
      </div>
      <button class="btn-alert" onclick={() => showFaceModal = true}>
        <Camera size={13} strokeWidth={2.5} />
        Enroll Face
      </button>
    </div>
  {/if}

  <!-- ══ ALERT BANNER: EMAIL NOT VERIFIED ══════════════════════ -->
  {#if !data.user.emailVerified}
    <div class="alert-banner alert-red">
      <div class="alert-icon">
        <MailWarning size={18} strokeWidth={2.5} />
      </div>
      <div class="alert-content">
        <strong>Email Not Verified</strong>
        <p>Your email address hasn't been verified yet. Please check your inbox or resend the verification email.</p>
      </div>
      <button
        class="btn-alert btn-alert-red"
        onclick={resendVerification}
        disabled={resendingEmail}
      >
        {#if resendingEmail}
          <RefreshCw size={13} class="spin" />
          Sending...
        {:else}
          <Mail size={13} strokeWidth={2.5} />
          Resend Email
        {/if}
      </button>
    </div>
  {/if}

  {#if emailResent}
    <div class="toast-banner">
      <CheckCircle2 size={14} />
      <span>Verification email sent! Check your inbox.</span>
    </div>
  {/if}

  <!-- ══ HERO HEADER ═══════════════════════════════════════════ -->
  <header class="profile-hero">
    <div class="hero-bg"></div>
    <div class="hero-content">
      <div class="avatar-wrap">
        <div class="avatar">
          <span>{initials()}</span>
        </div>
        {#if data.user.enrolled}
          <div class="verified-badge" title="Face enrolled">
            <ShieldCheck size={10} strokeWidth={3} />
          </div>
        {/if}
      </div>
      <div class="hero-info">
        <h1>{data.user.fullName}</h1>
        <p class="hero-sub">{data.user.matricNumber ?? '—'} · {data.user.department?.name ?? '—'}</p>
        <div class="hero-chips">
          <span class="chip chip-green">
            <GraduationCap size={10} strokeWidth={2.5} />
            Student
          </span>
          {#if data.user.isActive}
            <span class="chip chip-active">
              <CheckCircle2 size={10} strokeWidth={2.5} />
              Active
            </span>
          {:else}
            <span class="chip chip-inactive">
              <XCircle size={10} strokeWidth={2.5} />
              Inactive
            </span>
          {/if}
          {#if data.user.level}
            <span class="chip chip-blue">
              <Layers size={10} strokeWidth={2.5} />
              {data.user.level?.level ?? data.user.level?.name ?? '—'} Level
            </span>
          {/if}
          {#if data.user.enrolled}
            <span class="chip chip-teal">
              <Fingerprint size={10} strokeWidth={2.5} />
              Face Enrolled
            </span>
          {:else}
            <span class="chip chip-amber">
              <CameraOff size={10} strokeWidth={2.5} />
              Face Missing
            </span>
          {/if}
          {#if data.user.isSuspended}
            <span class="chip chip-red">
              <XCircle size={10} strokeWidth={2.5} />
              Suspended
            </span>
          {/if}
          {#if !data.user.emailVerified}
            <span class="chip chip-amber">
              <MailWarning size={10} strokeWidth={2.5} />
              Unverified
            </span>
          {/if}
        </div>
      </div>
      <div class="hero-actions">
        {#if !editing}
          <button class="btn-primary" onclick={() => editing = true}>
            <Pencil size={13} strokeWidth={2.5} />
            Edit Profile
          </button>
        {/if}
      </div>
    </div>
  </header>

  <!-- ══ QUICK STATS ═══════════════════════════════════════════ -->
  <section class="stats-bar">
    <div class="stat-pill">
      <div class="stat-pill-icon" style="background: var(--green-soft); color: var(--green-600)">
        <ClipboardList size={15} strokeWidth={2} />
      </div>
      <div class="stat-pill-data">
        <span class="stat-pill-value">{data.stats.totalRegistrations}</span>
        <span class="stat-pill-label">Courses</span>
      </div>
    </div>
    <div class="stat-pill">
      <div class="stat-pill-icon" style="background: var(--blue-soft); color: var(--blue-500)">
        <Activity size={15} strokeWidth={2} />
      </div>
      <div class="stat-pill-data">
        <span class="stat-pill-value">{data.stats.totalExamSessions}</span>
        <span class="stat-pill-label">Sessions</span>
      </div>
    </div>
    <div class="stat-pill">
      <div class="stat-pill-icon" style="background: var(--amber-soft); color: #f59e0b">
        <Award size={15} strokeWidth={2} />
      </div>
      <div class="stat-pill-data">
        <span class="stat-pill-value">{data.stats.totalResults}</span>
        <span class="stat-pill-label">Results</span>
      </div>
    </div>
  </section>

  <!-- ══ EDIT FORM ═════════════════════════════════════════════ -->
  {#if editing}
    <form
      method="POST"
      action="?/updateProfile"
      class="edit-panel"
      use:enhance={() => {
        return async ({ update }) => { editing = false; update(); };
      }}
    >
      <div class="edit-panel-header">
        <div class="edit-panel-title">
          <Sparkles size={16} />
          <h3>Edit Profile</h3>
        </div>
        <button type="button" class="edit-panel-close" onclick={() => editing = false}>
          <X size={15} />
        </button>
      </div>
      <div class="edit-panel-body">
        <div class="edit-grid">
          <label class="edit-field">
            <span class="edit-field-label">
              <Phone size={12} />
              Phone Number
            </span>
            <input type="tel" name="phone" bind:value={phone} placeholder="Enter phone number" />
          </label>
          <label class="edit-field">
            <span class="edit-field-label">
              <VenusAndMars size={12} />
              Gender
            </span>
            <select name="gender" bind:value={gender}>
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </label>
          <label class="edit-field full-width">
            <span class="edit-field-label">
              <MapPinned size={12} />
              Residential Address
            </span>
            <textarea name="address" bind:value={address} rows="2" placeholder="Enter your residential address"></textarea>
          </label>
        </div>
      </div>
      <div class="edit-panel-footer">
        <button type="button" class="btn-ghost" onclick={() => editing = false}>
          <X size={13} /> Cancel
        </button>
        <button type="submit" class="btn-primary">
          <Save size={13} strokeWidth={2.5} /> Save Changes
        </button>
      </div>
      {#if form?.success}
        <div class="form-toast">
          <CheckCircle2 size={14} />
          <span>Profile updated successfully</span>
        </div>
      {/if}
    </form>
  {/if}

  <!-- ══ INFO SECTIONS ═════════════════════════════════════════ -->
  <div class="sections-grid">
    {#each sections as section}
      <div class="section-card">
        <div class="section-card-header" style="border-color: {section.color}20">
          <div class="section-card-icon" style="background: {section.bg}; color: {section.color}">
            <svelte:component this={section.icon} size={15} strokeWidth={2.5} />
          </div>
          <h2>{section.title}</h2>
        </div>
        <div class="section-card-body">
          {#each section.fields as field}
            <div class="info-row">
              <div class="info-row-icon" style="background: {section.bg}; color: {section.color}">
                <svelte:component this={field.icon} size={13} strokeWidth={2} />
              </div>
              <div class="info-row-content">
                <span class="info-row-label">{field.label}</span>
                <span class="info-row-value" class:mono={field.label === 'Matric Number' || field.label === 'JAMB Reg. No'}>
                  {field.value}
                </span>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>

  <!-- ══ RECENT SESSIONS ═══════════════════════════════════════ -->
  {#if data.recentSessions.length > 0}
    <section class="sessions-section">
      <div class="section-card-header" style="border-color: rgba(139, 92, 246, 0.12)">
        <div class="section-card-icon" style="background: rgba(139, 92, 246, 0.08); color: #8b5cf6">
          <ClipboardList size={15} strokeWidth={2.5} />
        </div>
        <h2>Recent Exam Sessions</h2>
      </div>
      <div class="sessions-list">
        {#each data.recentSessions as session}
          <div class="session-card">
            <div class="session-card-left">
              <div class="session-icon" class:submitted={session.status === 'submitted'} class:active={session.status === 'active'}>
                {#if session.status === 'submitted'}
                  <CheckCircle2 size={14} strokeWidth={2.5} />
                {:else}
                  <Activity size={14} strokeWidth={2.5} />
                {/if}
              </div>
              <div class="session-info">
                <span class="session-title">{session.examTitle}</span>
                <span class="session-code">{session.courseCode}</span>
              </div>
            </div>
            <div class="session-card-right">
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
    </section>
  {/if}
</div>

<!-- ══ FACE ENROLLMENT MODAL (your existing component) ═══════ -->
<FaceEnrollmentModal
  open={showFaceModal}
  onClose={() => showFaceModal = false}
  onComplete={handleFaceComplete}
/>

<style>
  /* ════════════════════════════════════════════════════════════
     BASE
     ════════════════════════════════════════════════════════════ */
  .profile-page {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 0.75rem;
    max-width: 100%;
  }

  /* ════════════════════════════════════════════════════════════
     ALERT BANNERS
     ════════════════════════════════════════════════════════════ */
  .alert-banner {
    display: flex;
    align-items: flex-start;
    gap: 0.875rem;
    padding: 1rem 1.125rem;
    border-radius: 0.875rem;
    border: 1px solid;
    animation: slideDown 0.3s ease;
  }
  .alert-amber {
    background: var(--amber-soft);
    border-color: rgba(245, 158, 11, 0.2);
    color: #92400e;
  }
  .alert-red {
    background: var(--red-soft);
    border-color: rgba(220, 38, 38, 0.15);
    color: #991b1b;
  }
  .alert-icon {
    flex-shrink: 0;
    margin-top: 1px;
  }
  .alert-amber .alert-icon { color: #f59e0b; }
  .alert-red .alert-icon { color: #dc2626; }
  .alert-content {
    flex: 1;
    min-width: 0;
  }
  .alert-content strong {
    display: block;
    font-size: 0.85rem;
    font-weight: 800;
    margin-bottom: 0.25rem;
  }
  .alert-content p {
    margin: 0;
    font-size: 0.78rem;
    line-height: 1.4;
    opacity: 0.85;
  }
  .btn-alert {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 0.875rem;
    border-radius: 0.625rem;
    background: #fff;
    border: 1px solid rgba(0,0,0,0.08);
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    transition: all 0.15s ease;
  }
  .alert-amber .btn-alert {
    color: #b45309;
  }
  .alert-amber .btn-alert:hover {
    background: #fffbeb;
    border-color: #f59e0b;
  }
  .btn-alert-red {
    color: #dc2626;
  }
  .btn-alert-red:hover {
    background: #fef2f2;
    border-color: #dc2626;
  }
  .btn-alert:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .toast-banner {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: var(--green-soft);
    color: var(--green-700);
    border-radius: 0.625rem;
    font-size: 0.8rem;
    font-weight: 600;
    animation: slideDown 0.3s ease;
  }

  /* ════════════════════════════════════════════════════════════
     HERO HEADER
     ════════════════════════════════════════════════════════════ */
  .profile-hero {
    position: relative;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  }
  .hero-bg {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 60px;
    background: linear-gradient(135deg, var(--green-600), var(--green-700));
    opacity: 0.08;
  }
  .hero-content {
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    padding: 1rem;
    padding-top: 1.25rem;
  }
  .avatar-wrap {
    position: relative;
    flex-shrink: 0;
    margin-top: 8px;
  }
  .avatar {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--green-600), var(--green-700));
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 3px 12px rgba(22, 163, 74, 0.25);
    border: 3px solid var(--color-surface);
  }
  .avatar span {
    font-size: 1.25rem;
    font-weight: 800;
    color: #fff;
  }
  .verified-badge {
    position: absolute;
    bottom: -2px;
    right: -2px;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--green-600);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2.5px solid var(--color-surface);
    box-shadow: 0 1px 4px rgba(22, 163, 74, 0.3);
  }
  .hero-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }
  .hero-info h1 {
    font-size: 1.1rem;
    font-weight: 800;
    color: var(--color-text);
    margin: 0;
    line-height: 1.2;
  }
  .hero-sub {
    font-size: 0.75rem;
    color: var(--color-muted);
    margin: 0;
    font-family: monospace;
  }
  .hero-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-top: 0.25rem;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.6rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    border: 1px solid;
    white-space: nowrap;
  }
  .chip-green {
    background: var(--green-soft);
    border-color: rgba(34, 197, 94, 0.2);
    color: var(--green-700);
  }
  .chip-active {
    background: var(--green-soft);
    border-color: rgba(34, 197, 94, 0.2);
    color: var(--green-700);
  }
  .chip-inactive {
    background: var(--red-soft);
    border-color: rgba(220, 38, 38, 0.15);
    color: #dc2626;
  }
  .chip-blue {
    background: var(--blue-soft);
    border-color: rgba(59, 130, 246, 0.2);
    color: var(--blue-500);
  }
  .chip-teal {
    background: rgba(20, 184, 166, 0.08);
    border-color: rgba(20, 184, 166, 0.2);
    color: #0d9488;
  }
  .chip-amber {
    background: var(--amber-soft);
    border-color: rgba(245, 158, 11, 0.2);
    color: #b45309;
  }
  .chip-red {
    background: var(--red-soft);
    border-color: rgba(220, 38, 38, 0.15);
    color: #dc2626;
  }
  .hero-actions {
    flex-shrink: 0;
    display: flex;
    align-items: flex-start;
  }

  /* Buttons */
  .btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.55rem 1rem;
    border-radius: 0.625rem;
    background: linear-gradient(135deg, var(--green-600), var(--green-700));
    color: #fff;
    border: none;
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.18s ease;
    box-shadow: 0 2px 8px rgba(22, 163, 74, 0.2);
    white-space: nowrap;
  }
  .btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(22, 163, 74, 0.3);
  }
  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .btn-ghost {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.55rem 1rem;
    border-radius: 0.625rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    color: var(--color-muted);
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s ease;
  }
  .btn-ghost:hover {
    border-color: var(--green-400);
    color: var(--green-600);
    background: var(--green-soft);
  }

  /* ════════════════════════════════════════════════════════════
     STATS BAR
     ════════════════════════════════════════════════════════════ */
  .stats-bar {
    display: flex;
    gap: 0.625rem;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    padding: 0.125rem;
    scrollbar-width: none;
  }
  .stats-bar::-webkit-scrollbar { display: none; }
  .stat-pill {
    flex: 1;
    scroll-snap-align: start;
    min-width: 100px;
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.75rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.875rem;
    transition: all 0.18s ease;
  }
  .stat-pill:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }
  .stat-pill-icon {
    width: 36px;
    height: 36px;
    border-radius: 0.625rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .stat-pill-data {
    display: flex;
    flex-direction: column;
    gap: 0.05rem;
  }
  .stat-pill-value {
    font-size: 1.1rem;
    font-weight: 800;
    color: var(--color-text);
    line-height: 1;
  }
  .stat-pill-label {
    font-size: 0.6rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-muted);
  }

  /* ════════════════════════════════════════════════════════════
     EDIT PANEL
     ════════════════════════════════════════════════════════════ */
  .edit-panel {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    overflow: hidden;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
    animation: slideDown 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .edit-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.125rem;
    border-bottom: 1px solid var(--color-border);
    background: linear-gradient(180deg, var(--green-soft), transparent);
  }
  .edit-panel-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--green-700);
  }
  .edit-panel-title h3 {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 800;
    color: var(--color-text);
  }
  .edit-panel-title :global(svg) { color: var(--green-600); }
  .edit-panel-close {
    width: 28px;
    height: 28px;
    border-radius: 0.5rem;
    border: 1px solid var(--color-border);
    background: var(--color-bg);
    color: var(--color-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .edit-panel-close:hover {
    border-color: var(--green-400);
    color: var(--green-600);
    background: var(--green-soft);
  }
  .edit-panel-body {
    padding: 1rem 1.125rem;
  }
  .edit-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.875rem;
  }
  .edit-field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .edit-field-label {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-muted);
  }
  .edit-field-label :global(svg) {
    color: var(--green-600);
    opacity: 0.7;
  }
  .edit-field input,
  .edit-field select,
  .edit-field textarea {
    padding: 0.625rem 0.75rem;
    border-radius: 0.625rem;
    border: 1px solid var(--color-border);
    background: var(--color-bg);
    color: var(--color-text);
    font-size: 0.85rem;
    font-family: inherit;
    outline: none;
    transition: all 0.18s ease;
    width: 100%;
    box-sizing: border-box;
  }
  .edit-field input:focus,
  .edit-field select:focus,
  .edit-field textarea:focus {
    border-color: var(--green-400);
    box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.08);
  }
  .edit-field input::placeholder,
  .edit-field textarea::placeholder {
    color: var(--color-muted);
    opacity: 0.6;
  }
  .edit-field textarea {
    resize: vertical;
    min-height: 60px;
  }
  .edit-panel-footer {
    display: flex;
    gap: 0.625rem;
    justify-content: flex-end;
    padding: 0.875rem 1.125rem;
    border-top: 1px solid var(--color-border);
    background: var(--color-bg);
  }
  .form-toast {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.625rem 1.125rem;
    background: var(--green-soft);
    color: var(--green-700);
    font-size: 0.8rem;
    font-weight: 600;
    border-top: 1px solid rgba(34, 197, 94, 0.1);
  }
  .form-toast :global(svg) { color: var(--green-600); }

  /* ════════════════════════════════════════════════════════════
     SECTIONS GRID
     ════════════════════════════════════════════════════════════ */
  .sections-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  .section-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    transition: all 0.18s ease;
  }
  .section-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }
  .section-card-header {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.875rem 1rem;
    border-bottom: 1px solid;
    border-color: var(--color-border);
  }
  .section-card-icon {
    width: 32px;
    height: 32px;
    border-radius: 0.625rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .section-card-header h2 {
    margin: 0;
    font-size: 0.82rem;
    font-weight: 800;
    color: var(--color-text);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .section-card-body {
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
  }
  .info-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.625rem 0.5rem;
    border-radius: 0.5rem;
    transition: background 0.12s ease;
  }
  .info-row:hover {
    background: var(--color-bg);
  }
  .info-row-icon {
    width: 28px;
    height: 28px;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .info-row-content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }
  .info-row-label {
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-muted);
  }
  .info-row-value {
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .info-row-value.mono {
    font-family: monospace;
    font-size: 0.78rem;
  }

  /* ════════════════════════════════════════════════════════════
     SESSIONS SECTION
     ════════════════════════════════════════════════════════════ */
  .sessions-section {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  }
  .sessions-list {
    display: flex;
    flex-direction: column;
    padding: 0.5rem;
  }
  .session-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.625rem 0.5rem;
    border-radius: 0.5rem;
    transition: all 0.12s ease;
  }
  .session-card:hover {
    background: var(--color-bg);
  }
  .session-card-left {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    flex: 1;
    min-width: 0;
  }
  .session-icon {
    width: 30px;
    height: 30px;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: var(--color-bg);
    color: var(--color-muted);
    border: 1px solid var(--color-border);
  }
  .session-icon.submitted {
    background: var(--green-soft);
    color: var(--green-700);
    border-color: rgba(34, 197, 94, 0.15);
  }
  .session-icon.active {
    background: var(--blue-soft);
    color: var(--blue-500);
    border-color: rgba(59, 130, 246, 0.15);
  }
  .session-info {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    min-width: 0;
  }
  .session-title {
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .session-code {
    font-size: 0.7rem;
    color: var(--color-muted);
    font-family: monospace;
  }
  .session-card-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }
  .session-status {
    font-size: 0.6rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.2rem 0.5rem;
    border-radius: 0.375rem;
    background: var(--color-bg);
    color: var(--color-muted);
    border: 1px solid var(--color-border);
  }
  .session-status.done {
    background: var(--green-soft);
    color: var(--green-700);
    border-color: rgba(34, 197, 94, 0.15);
  }
  .session-status.active {
    background: var(--blue-soft);
    color: var(--blue-500);
    border-color: rgba(59, 130, 246, 0.15);
  }
  .session-score {
    font-size: 0.85rem;
    font-weight: 800;
    color: var(--color-text);
    min-width: 36px;
    text-align: right;
  }

  .spin {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* ════════════════════════════════════════════════════════════
     RESPONSIVE
     ════════════════════════════════════════════════════════════ */
  @media (min-width: 640px) {
    .profile-page {
      padding: 1rem;
      gap: 1.25rem;
    }
    .hero-content {
      padding: 1.25rem;
      padding-top: 1.5rem;
    }
    .avatar {
      width: 72px;
      height: 72px;
    }
    .avatar span { font-size: 1.4rem; }
    .hero-info h1 { font-size: 1.25rem; }
    .hero-sub { font-size: 0.78rem; }
    .chip { font-size: 0.62rem; padding: 0.22rem 0.6rem; }
    .stat-pill { min-width: 120px; padding: 0.875rem; }
    .stat-pill-value { font-size: 1.2rem; }
    .edit-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .edit-field.full-width {
      grid-column: 1 / -1;
    }
    .section-card-header { padding: 1rem 1.125rem; }
    .section-card-header h2 { font-size: 0.85rem; }
    .section-card-body { padding: 0.625rem; }
    .info-row { padding: 0.75rem 0.625rem; }
    .info-row-icon { width: 30px; height: 30px; }
    .info-row-value { font-size: 0.85rem; }
  }

  @media (min-width: 1024px) {
    .profile-page {
      padding: 1.5rem;
      gap: 1.5rem;
      max-width: 1200px;
      margin: 0 auto;
    }
    .hero-bg { height: 80px; }
    .hero-content {
      padding: 1.5rem;
      padding-top: 2rem;
      gap: 1.25rem;
    }
    .avatar {
      width: 80px;
      height: 80px;
    }
    .avatar span { font-size: 1.6rem; }
    .verified-badge {
      width: 24px;
      height: 24px;
    }
    .hero-info h1 { font-size: 1.4rem; }
    .hero-sub { font-size: 0.82rem; }
    .chip { font-size: 0.65rem; }
    .stats-bar {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.875rem;
      overflow: visible;
    }
    .stat-pill {
      min-width: 0;
      scroll-snap-align: none;
    }
    .sections-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }
    .section-card-header { padding: 1rem 1.25rem; }
    .section-card-body { padding: 0.75rem; }
    .info-row { padding: 0.75rem; }
    .sessions-section .section-card-header { padding: 1rem 1.25rem; }
    .sessions-list { padding: 0.75rem; }
    .session-card { padding: 0.75rem; }
  }

  @media (min-width: 1280px) {
    .profile-page { padding: 2rem; }
    .sections-grid { gap: 1.25rem; }
    .hero-content { padding: 1.75rem; padding-top: 2.25rem; }
  }

  @media (max-width: 360px) {
    .hero-content { padding: 0.875rem; padding-top: 1rem; gap: 0.75rem; }
    .avatar { width: 52px; height: 52px; }
    .avatar span { font-size: 1rem; }
    .hero-info h1 { font-size: 0.95rem; }
    .chip { font-size: 0.55rem; padding: 0.15rem 0.4rem; }
    .stat-pill { min-width: 85px; padding: 0.625rem; }
    .stat-pill-icon { width: 32px; height: 32px; }
    .stat-pill-value { font-size: 1rem; }
    .edit-panel-footer { flex-direction: column; }
    .edit-panel-footer .btn-primary,
    .edit-panel-footer .btn-ghost { width: 100%; justify-content: center; }
    .alert-banner { flex-direction: column; gap: 0.75rem; }
    .btn-alert { width: 100%; justify-content: center; }
  }
</style>