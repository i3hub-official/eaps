<!-- src/lib/components/ui/ProfilePage.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import { getContext } from 'svelte';
  import { enhance } from '$app/forms';
  import { ROLE_CONTEXT_KEY } from '$lib/constants/context';
  import { 
    User, Mail, Phone, Calendar, MapPin, Building, 
    GraduationCap, Users, UserCog, BookOpen, Clock,
    Award, FileText, CreditCard, Globe,
    Camera, Edit3, Save, X, Shield, BadgeCheck,
    AlertCircle, CheckCircle, Loader2, BarChart3, CalendarDays,
    ClipboardList, Crown, Building2, ShieldCheck
  } from '@lucide/svelte';

  const iconMap = {
    User, Users, UserCog, GraduationCap, BookOpen, Clock,
    Award, FileText, CreditCard, Globe,
    Camera, Edit3, Save, X, Shield, BadgeCheck,
    AlertCircle, CheckCircle, Loader2, BarChart3, CalendarDays,
    Calendar, MapPin, Building, Mail, Phone,
    ClipboardList, Crown, Building2, ShieldCheck
  };

  import type { ProfileData } from '$lib/types/user'



  interface Props {
    profile: ProfileData;
    isEditing?: boolean;
  }

  let { profile, isEditing = false }: Props = $props();

  const contextRole = getContext<string | undefined>(ROLE_CONTEXT_KEY);
  
  let currentRole = $derived.by(() => {
    if (contextRole) return contextRole;
    const path = $page.url.pathname;
    if (path.startsWith('/admin'))        return 'admin';
    if (path.startsWith('/lecturer'))     return 'lecturer';
    if (path.startsWith('/hod'))          return 'hod';
    if (path.startsWith('/dean'))         return 'dean';
    if (path.startsWith('/exam-officer')) return 'exam_officer';
    if (path.startsWith('/vc-dvc'))       return 'vc_dvc';
    if (path.startsWith('/invigilator'))  return 'invigilator';
    if (path.startsWith('/student'))      return 'student';
    return 'default';
  });

  const roleDesigns = {
    admin: {
      name: 'Admin',
      icon: UserCog,
      color: '#6366f1',
      colorVar: 'var(--admin-accent, #6366f1)',
      bgVar: 'var(--admin-accent-bg, rgba(99,102,241,0.1))',
      cardStyle: 'glass-premium',
      statStyle: 'elevated',
      layout: 'centered',
      primaryAction: 'Manage Users',
      secondaryAction: 'System Settings',
    },
    lecturer: {
      name: 'Lecturer',
      icon: BookOpen,
      color: '#8b5cf6',
      colorVar: 'var(--lecturer-accent, #8b5cf6)',
      bgVar: 'var(--lecturer-accent-bg, rgba(139,92,246,0.1))',
      cardStyle: 'glass-elegant',
      statStyle: 'minimal',
      layout: 'split',
      primaryAction: 'Create Exam',
      secondaryAction: 'View Results',
    },
    hod: {
      name: 'Head of Department',
      icon: Users,
      color: '#7c3aed',
      colorVar: 'var(--hod-accent, #7c3aed)',
      bgVar: 'var(--hod-accent-bg, rgba(124,58,237,0.1))',
      cardStyle: 'glass-hod',
      statStyle: 'elevated',
      layout: 'split',
      primaryAction: 'Department Overview',
      secondaryAction: 'Manage Lecturers',
    },
    dean: {
      name: 'Dean',
      icon: Building2,
      color: '#0ea5e9',
      colorVar: 'var(--dean-accent, #0ea5e9)',
      bgVar: 'var(--dean-accent-bg, rgba(14,165,233,0.1))',
      cardStyle: 'glass-dean',
      statStyle: 'modern',
      layout: 'split',
      primaryAction: 'Faculty Overview',
      secondaryAction: 'View Reports',
    },
    exam_officer: {
      name: 'Exam Officer',
      icon: ClipboardList,
      color: '#f97316',
      colorVar: 'var(--exam-officer-accent, #f97316)',
      bgVar: 'var(--exam-officer-accent-bg, rgba(249,115,22,0.1))',
      cardStyle: 'glass-warm',
      statStyle: 'compact',
      layout: 'split',
      primaryAction: 'Manage Schedules',
      secondaryAction: 'View Results',
    },
    vc_dvc: {
      name: 'VC / DVC',
      icon: Crown,
      color: '#e11d48',
      colorVar: 'var(--vc-dvc-accent, #e11d48)',
      bgVar: 'var(--vc-dvc-accent-bg, rgba(225,29,72,0.1))',
      cardStyle: 'glass-executive',
      statStyle: 'executive',
      layout: 'centered',
      primaryAction: 'University Overview',
      secondaryAction: 'View Reports',
    },
    invigilator: {
      name: 'Invigilator',
      icon: ShieldCheck,
      color: '#f59e0b',
      colorVar: 'var(--invigilator-accent, #f59e0b)',
      bgVar: 'var(--invigilator-accent-bg, rgba(245,158,11,0.1))',
      cardStyle: 'glass-warm',
      statStyle: 'compact',
      layout: 'centered',
      primaryAction: 'View Schedule',
      secondaryAction: 'Report Issues',
    },
    student: {
      name: 'Student',
      icon: GraduationCap,
      color: '#10b981',
      colorVar: 'var(--student-accent, #10b981)',
      bgVar: 'var(--student-accent-bg, rgba(16,185,129,0.1))',
      cardStyle: 'glass-fresh',
      statStyle: 'modern',
      layout: 'split',
      primaryAction: 'View Results',
      secondaryAction: 'Register Courses',
    },
    default: {
      name: 'User',
      icon: User,
      color: '#10b981',
      colorVar: 'var(--accent, #10b981)',
      bgVar: 'rgba(16,185,129,0.1)',
      cardStyle: 'glass-default',
      statStyle: 'default',
      layout: 'centered',
      primaryAction: 'View Profile',
      secondaryAction: 'Settings',
    },
  };

  const design = $derived(roleDesigns[currentRole] || roleDesigns.default);

  let editing = $state(isEditing);
  let formData = $state({ ...profile });
  let isSaving = $state(false);
  let saveSuccess = $state(false);
  let saveError = $state<string | null>(null);

  function getInitials(name: string): string {
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  function formatDate(date?: string): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  function formatTimeAgo(date?: string): string {
    if (!date) return 'N/A';
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  function getIcon(iconName: string) {
    return iconMap[iconName as keyof typeof iconMap] || User;
  }

  function handleSubmit() {
    isSaving = true;
    saveError = null;
    saveSuccess = false;
  }

  function startEditing() {
    formData = { ...profile };
    editing = true;
    saveError = null;
    saveSuccess = false;
  }

  function cancelEdit() {
    formData = { ...profile };
    editing = false;
    saveError = null;
  }

  function handleAvatarChange(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const form = input.closest('form');
        if (form && ev.target?.result) {
          const hiddenInput = document.createElement('input');
          hiddenInput.type = 'hidden';
          hiddenInput.name = 'avatar';
          hiddenInput.value = ev.target.result as string;
          form.appendChild(hiddenInput);
          form.requestSubmit();
        }
      };
      reader.readAsDataURL(file);
    }
  }

  function handleOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget) cancelEdit();
  }

  function handleModalClick(event: MouseEvent) {
    event.stopPropagation();
  }

  // Role-specific quick action links
  const quickActions: Record<string, { label: string; href: string; icon: typeof User }[]> = {
    admin: [
      { label: 'Manage Users',    href: '/admin/users',    icon: Users },
      { label: 'System Settings', href: '/admin/security', icon: Shield },
      { label: 'View Reports',    href: '/admin/reports',  icon: FileText },
    ],
    hod: [
      { label: 'Department',      href: '/hod/department', icon: Building2 },
      { label: 'Lecturers',       href: '/hod/lecturers',  icon: Users },
      { label: 'Exam Reports',    href: '/hod/reports',    icon: BarChart3 },
    ],
    dean: [
      { label: 'Faculty Overview', href: '/dean/faculty',  icon: Building2 },
      { label: 'Departments',      href: '/dean/departments', icon: Building },
      { label: 'Reports',          href: '/dean/reports',  icon: BarChart3 },
    ],
    exam_officer: [
      { label: 'Exam Schedules',  href: '/exam-officer/schedules', icon: CalendarDays },
      { label: 'Results',         href: '/exam-officer/results',   icon: BarChart3 },
      { label: 'Reports',         href: '/exam-officer/reports',   icon: FileText },
    ],
    vc_dvc: [
      { label: 'University Stats', href: '/vc-dvc/overview', icon: BarChart3 },
      { label: 'Reports',          href: '/vc-dvc/reports',  icon: FileText },
    ],
    invigilator: [],
    lecturer: [],
    student: [],
    default: [],
  };
</script>

<div
  class="profile-page"
  data-role={currentRole}
  style="--role-color: {design.colorVar}; --role-bg: {design.bgVar};"
>
  <div class="profile-bg"></div>

  <div class="profile-container">
    <!-- Header -->
    <div class="profile-header layout-{design.layout}">
      <!-- Avatar -->
      <div class="avatar-section">
        <div class="avatar-wrapper">
          {#if profile.avatar}
            <img src={profile.avatar} alt={profile.name} class="avatar-image" />
          {:else}
            <div class="avatar-placeholder">
              <span>{getInitials(profile.name)}</span>
            </div>
          {/if}

          {#if editing}
            <form method="POST" action="?/update_avatar" use:enhance class="avatar-form">
              <button
                class="avatar-edit-btn"
                type="button"
                onclick={() => document.getElementById('avatar-upload')?.click()}
              >
                <Camera size={16} />
              </button>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                style="display:none"
                onchange={handleAvatarChange}
              />
            </form>
          {/if}

          {#if profile.isVerified}
            <div class="verified-badge">
              <BadgeCheck size={18} />
            </div>
          {/if}
        </div>

        <div class="role-indicator">
          <svelte:component this={design.icon} size={14} />
          <span>{design.name}</span>
        </div>
      </div>

      <!-- Info -->
      <div class="user-info">
        <div class="info-header">
          <h1>{profile.name}</h1>
          <div class="status-badge">
            {#if profile.isActive}
              <CheckCircle size={14} /><span>Active</span>
            {:else}
              <AlertCircle size={14} /><span>Inactive</span>
            {/if}
          </div>
        </div>

        <div class="info-details">
          <div class="detail-item"><Mail size={16} /><span>{profile.email}</span></div>
          {#if profile.phone}
            <div class="detail-item"><Phone size={16} /><span>{profile.phone}</span></div>
          {/if}
          {#if profile.lastActive}
            <div class="detail-item">
              <Clock size={16} /><span>Last active: {formatTimeAgo(profile.lastActive)}</span>
            </div>
          {/if}
        </div>

        {#if profile.bio}
          <p class="user-bio">{profile.bio}</p>
        {/if}

        <div class="action-buttons">
          {#if !editing}
            <button class="btn-primary" onclick={startEditing}>
              <Edit3 size={16} />Edit Profile
            </button>
            <a
              href={currentRole === 'default' ? '/' : `/${currentRole === 'exam_officer' ? 'exam-officer' : currentRole === 'vc_dvc' ? 'vc-dvc' : currentRole}`}
              class="btn-secondary"
            >
              Dashboard
            </a>
          {/if}
        </div>
      </div>
    </div>

    <!-- Content Grid -->
    <div class="profile-grid layout-{design.layout}">
      <div class="profile-left">
        <!-- Stats -->
        {#if profile.stats && profile.stats.length > 0}
          <div class="stats-grid style-{design.statStyle}">
            {#each profile.stats as stat}
              <div class="stat-card">
                <div class="stat-icon">
                  <svelte:component this={getIcon(stat.icon)} size={20} />
                </div>
                <div class="stat-content">
                  <span class="stat-value">{stat.value}</span>
                  <span class="stat-label">{stat.label}</span>
                </div>
              </div>
            {/each}
          </div>
        {/if}

        <!-- Personal Info -->
        <div class="info-card style-{design.cardStyle}">
          <h3>Personal Information</h3>
          <div class="info-grid">
            {#if profile.college}
              <div class="info-row">
                <GraduationCap size={16} />
                <span>College: <strong>{profile.college}</strong></span>
              </div>
            {/if}
            {#if profile.department}
              <div class="info-row">
                <Building size={16} />
                <span>Department: <strong>{profile.department}</strong></span>
              </div>
            {/if}
            {#if profile.level}
              <div class="info-row">
                <Award size={16} />
                <span>Level: <strong>{profile.level}</strong></span>
              </div>
            {/if}
            {#if profile.matricNumber}
              <div class="info-row">
                <CreditCard size={16} />
                <span>Matric No.: <strong>{profile.matricNumber}</strong></span>
              </div>
            {/if}
            {#if profile.staffId}
              <div class="info-row">
                <FileText size={16} />
                <span>Staff ID: <strong>{profile.staffId}</strong></span>
              </div>
            {/if}
            {#if profile.joinDate}
              <div class="info-row">
                <Calendar size={16} />
                <span>Joined: <strong>{formatDate(profile.joinDate)}</strong></span>
              </div>
            {/if}
          </div>
        </div>

        <!-- Social Links -->
        {#if profile.socialLinks && Object.values(profile.socialLinks).some(v => v)}
          <div class="info-card style-{design.cardStyle}">
            <h3>Connect</h3>
            <div class="social-links">
              {#each Object.entries(profile.socialLinks).filter(([, v]) => v) as [, url]}
                <a href={url} target="_blank" rel="noopener noreferrer" class="social-link">
                  <Globe size={18} />
                </a>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <div class="profile-right">
        <!-- Courses (lecturer / student) -->
        {#if profile.courses && profile.courses.length > 0}
          <div class="info-card style-{design.cardStyle}">
            <div class="card-header">
              <h3>
                {#if currentRole === 'lecturer' || currentRole === 'hod'}
                  Teaching Courses
                {:else if currentRole === 'student'}
                  Enrolled Courses
                {:else}
                  Courses
                {/if}
              </h3>
              <span class="course-count">{profile.courses.length}</span>
            </div>
            <div class="course-list">
              {#each profile.courses as course}
                <div class="course-item">
                  <div class="course-code">{course.code}</div>
                  <div class="course-title">{course.title}</div>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Quick Actions (admin, hod, dean, exam_officer, vc_dvc) -->
        {#if quickActions[currentRole]?.length}
          <div class="info-card style-{design.cardStyle}">
            <h3>Quick Actions</h3>
            <div class="quick-actions">
              {#each quickActions[currentRole] as action}
                <a href={action.href} class="quick-btn">
                  <svelte:component this={action.icon} size={16} />
                  {action.label}
                </a>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Invigilator schedule preview -->
        {#if currentRole === 'invigilator'}
          <div class="info-card style-{design.cardStyle}">
            <h3>Upcoming Invigilation</h3>
            <div class="invigilation-list">
              <div class="invigilation-item">
                <div class="invigilation-date">Today, 2:00 PM</div>
                <div class="invigilation-details">Exam: CSC 301 — Hall B</div>
              </div>
              <div class="invigilation-item">
                <div class="invigilation-date">Tomorrow, 10:00 AM</div>
                <div class="invigilation-details">Exam: MTH 205 — Hall A</div>
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>

    <!-- Edit Modal -->
    {#if editing}
      <div class="edit-overlay" onclick={handleOverlayClick}>
        <div class="edit-modal" onclick={handleModalClick}>
          <div class="modal-header">
            <h2>Edit Profile</h2>
            <button class="modal-close" onclick={cancelEdit} type="button">
              <X size={20} />
            </button>
          </div>

          <form method="POST" action="?/update_profile" use:enhance onsubmit={handleSubmit}>
            {#if ['lecturer', 'hod', 'dean', 'exam_officer', 'vc_dvc', 'invigilator'].includes(currentRole)}
              <div class="form-group">
                <label>Title (e.g. Dr., Prof., Mr.)</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title || ''}
                  placeholder="Enter your title"
                  oninput={(e) => formData.title = e.currentTarget.value}
                />
              </div>
            {/if}

            <div class="form-group">
              <label>Bio</label>
              <textarea
                name="bio"
                placeholder="Tell us about yourself"
                rows={4}
                oninput={(e) => formData.bio = e.currentTarget.value}
              >{formData.bio || ''}</textarea>
            </div>

            <div class="form-group">
              <label>Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone || ''}
                placeholder="Enter your phone number"
                oninput={(e) => formData.phone = e.currentTarget.value}
              />
            </div>

            <div class="form-group">
              <label>Address</label>
              <input
                type="text"
                name="address"
                value={formData.address || ''}
                placeholder="Enter your address"
                oninput={(e) => formData.address = e.currentTarget.value}
              />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>State</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state || ''}
                  placeholder="State"
                  oninput={(e) => formData.state = e.currentTarget.value}
                />
              </div>
              <div class="form-group">
                <label>LGA</label>
                <input
                  type="text"
                  name="lga"
                  value={formData.lga || ''}
                  placeholder="LGA"
                  oninput={(e) => formData.lga = e.currentTarget.value}
                />
              </div>
            </div>

            <div class="form-actions">
              <button type="button" class="btn-secondary" onclick={cancelEdit}>Cancel</button>
              <button type="submit" class="btn-primary" disabled={isSaving}>
                {#if isSaving}
                  <Loader2 size={16} class="spinning" />Saving...
                {:else}
                  <Save size={16} />Save Changes
                {/if}
              </button>
            </div>

            {#if saveSuccess}
              <div class="toast success">
                <CheckCircle size={20} />Profile updated successfully!
              </div>
            {/if}
            {#if saveError}
              <div class="toast error">
                <AlertCircle size={20} />{saveError}
              </div>
            {/if}
          </form>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .profile-page {
    position: relative;
    background: var(--color-bg);
  }

  .profile-bg {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 280px;
    background: radial-gradient(ellipse at 60% 0%, var(--role-color), transparent 70%);
    opacity: 0.06;
    pointer-events: none;
  }

  .profile-container {
    max-width: 1200px;
    margin: 0 auto;
    position: relative;
  }

  /* ── Header ──────────────────────────────────────────────────────── */
  .profile-header {
    display: flex;
    gap: 2.5rem;
    background: var(--color-surface);
    border-radius: 1.5rem;
    padding: 2rem;
    margin-bottom: 2rem;
    border: 1px solid var(--color-border);
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
    transition: box-shadow 0.3s ease;
  }

  .profile-header:hover {
    box-shadow: 0 8px 16px -2px rgb(0 0 0 / 0.08);
  }

  .profile-header.layout-centered {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .profile-header.layout-split {
    flex-direction: row;
    align-items: flex-start;
  }

  /* ── Avatar ──────────────────────────────────────────────────────── */
  .avatar-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    flex-shrink: 0;
  }

  .avatar-wrapper {
    position: relative;
    width: 120px;
    height: 120px;
    border-radius: 50%;
    border: 4px solid var(--role-color);
    box-shadow: 0 0 0 8px var(--role-bg);
    overflow: hidden;
    flex-shrink: 0;
  }

  .avatar-image {
    width: 100%; height: 100%;
    object-fit: cover;
  }

  .avatar-placeholder {
    width: 100%; height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.5rem;
    font-weight: 700;
    color: white;
    background: var(--role-color);
  }

  .avatar-form {
    position: absolute;
    bottom: 4px; right: 4px;
  }

  .avatar-edit-btn {
    width: 32px; height: 32px;
    border-radius: 50%;
    border: 2px solid white;
    background: var(--role-color);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.2s;
  }

  .avatar-edit-btn:hover { transform: scale(1.1); }

  .verified-badge {
    position: absolute;
    bottom: 4px; right: 4px;
    color: var(--role-color);
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
  }

  .role-indicator {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.25rem 0.75rem;
    background: var(--role-bg);
    color: var(--role-color);
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* ── User Info ───────────────────────────────────────────────────── */
  .user-info { flex: 1; min-width: 0; }

  .info-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 0.75rem;
  }

  .profile-header.layout-centered .info-header { justify-content: center; }

  .info-header h1 {
    font-size: 1.75rem;
    font-weight: 800;
    margin: 0;
    color: var(--color-text);
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.2rem 0.6rem;
    background: var(--role-bg);
    color: var(--role-color);
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 600;
  }

  .info-details {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem 1.5rem;
    margin-bottom: 0.75rem;
  }

  .profile-header.layout-centered .info-details { justify-content: center; }

  .detail-item {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    color: var(--color-muted);
    font-size: 0.9rem;
  }

  .detail-item :global(svg) { flex-shrink: 0; opacity: 0.7; }

  .user-bio {
    color: var(--color-muted);
    font-size: 0.95rem;
    line-height: 1.6;
    margin: 0 0 1rem;
    max-width: 600px;
  }

  .profile-header.layout-centered .user-bio {
    margin-left: auto;
    margin-right: auto;
  }

  .action-buttons {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .profile-header.layout-centered .action-buttons { justify-content: center; }

  /* ── Buttons ─────────────────────────────────────────────────────── */
  .btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.6rem 1.25rem;
    background: var(--role-color);
    color: white;
    border: none;
    border-radius: 0.625rem;
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;
    text-decoration: none;
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px color-mix(in srgb, var(--role-color) 40%, transparent);
    filter: brightness(0.95);
  }

  .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

  .btn-secondary {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.6rem 1.25rem;
    background: transparent;
    color: var(--role-color);
    border: 1.5px solid var(--role-color);
    border-radius: 0.625rem;
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;
    text-decoration: none;
  }

  .btn-secondary:hover { background: var(--role-bg); }

  /* ── Grid ────────────────────────────────────────────────────────── */
  .profile-grid { display: grid; gap: 1.5rem; }
  .profile-grid.layout-split { grid-template-columns: 1.2fr 0.8fr; }
  .profile-grid.layout-centered { grid-template-columns: 1fr; max-width: 800px; margin: 0 auto; }

  .profile-left,
  .profile-right {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  /* ── Stats ───────────────────────────────────────────────────────── */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
  }

  .stat-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    transition: all 0.2s;
  }

  .stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgb(0 0 0 / 0.05);
  }

  .stat-icon {
    width: 40px; height: 40px;
    border-radius: 0.5rem;
    background: var(--role-bg);
    color: var(--role-color);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .stat-content { display: flex; flex-direction: column; }
  .stat-value { font-size: 1.25rem; font-weight: 700; color: var(--color-text); }
  .stat-label { font-size: 0.75rem; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.05em; }

  /* stat style variants */
  .stats-grid.style-elevated .stat-card { box-shadow: 0 2px 4px rgb(0 0 0 / 0.04); border: none; }
  .stats-grid.style-minimal  .stat-card { border: none; padding: 0.5rem; background: transparent; }
  .stats-grid.style-compact  .stat-card { padding: 0.75rem; }
  .stats-grid.style-modern   .stat-card { background: var(--color-bg); border: 2px solid transparent; }
  .stats-grid.style-modern   .stat-card:hover { border-color: var(--role-color); }
  .stats-grid.style-executive .stat-card {
    border: none;
    background: linear-gradient(135deg, var(--color-surface), var(--role-bg));
    box-shadow: 0 4px 12px rgb(0 0 0 / 0.06);
  }

  /* ── Info Cards ──────────────────────────────────────────────────── */
  .info-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    padding: 1.5rem;
    transition: box-shadow 0.3s ease;
  }

  .info-card:hover { box-shadow: 0 4px 12px rgb(0 0 0 / 0.04); }

  .info-card h3 {
    font-size: 1rem;
    font-weight: 700;
    margin: 0 0 1rem;
    color: var(--color-text);
  }

  /* card style variants */
  .info-card.style-glass-premium  { backdrop-filter: blur(8px); }
  .info-card.style-glass-elegant  { background: rgba(139,92,246,0.04);  border-color: rgba(139,92,246,0.15); }
  .info-card.style-glass-hod      { background: rgba(124,58,237,0.04);  border-color: rgba(124,58,237,0.15); }
  .info-card.style-glass-dean     { background: rgba(14,165,233,0.04);  border-color: rgba(14,165,233,0.15); }
  .info-card.style-glass-warm     { background: rgba(245,158,11,0.04);  border-color: rgba(245,158,11,0.15); }
  .info-card.style-glass-fresh    { background: rgba(16,185,129,0.04);  border-color: rgba(16,185,129,0.15); }
  .info-card.style-glass-executive {
    background: linear-gradient(135deg, var(--color-surface), rgba(225,29,72,0.03));
    border-color: rgba(225,29,72,0.15);
    box-shadow: 0 4px 16px rgb(0 0 0 / 0.06);
  }

  .info-grid { display: grid; grid-template-columns: 1fr; gap: 0.5rem; }

  .info-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    color: var(--color-text);
    font-size: 0.9rem;
    padding: 0.3rem 0;
  }

  .info-row :global(svg) { flex-shrink: 0; opacity: 0.6; }
  .info-row strong { font-weight: 600; }

  /* ── Social Links ────────────────────────────────────────────────── */
  .social-links { display: flex; gap: 0.75rem; }

  .social-link {
    width: 40px; height: 40px;
    border-radius: 50%;
    border: 1.5px solid var(--color-border);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-muted);
    transition: all 0.2s;
    text-decoration: none;
  }

  .social-link:hover {
    border-color: var(--role-color);
    color: var(--role-color);
    transform: translateY(-2px);
  }

  /* ── Courses ─────────────────────────────────────────────────────── */
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .course-count {
    padding: 0.15rem 0.6rem;
    background: var(--role-bg);
    color: var(--role-color);
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 700;
  }

  .course-list { display: flex; flex-direction: column; gap: 0.5rem; }

  .course-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 0.8rem;
    border-radius: 0.5rem;
    background: var(--color-bg);
    border-left: 3px solid var(--role-color);
    transition: transform 0.2s;
  }

  .course-item:hover { transform: translateX(4px); }

  .course-code {
    font-weight: 700;
    font-size: 0.8rem;
    color: var(--role-color);
    background: var(--role-bg);
    padding: 0.15rem 0.5rem;
    border-radius: 0.25rem;
    flex-shrink: 0;
  }

  .course-title { font-size: 0.9rem; color: var(--color-text); }

  /* ── Quick Actions ───────────────────────────────────────────────── */
  .quick-actions {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 0.75rem;
  }

  .quick-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 1rem;
    border: 1.5px solid var(--color-border);
    border-radius: 0.5rem;
    background: transparent;
    color: var(--color-text);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    text-decoration: none;
  }

  .quick-btn:hover {
    border-color: var(--role-color);
    color: var(--role-color);
    background: var(--role-bg);
  }

  /* ── Invigilation ────────────────────────────────────────────────── */
  .invigilation-list { display: flex; flex-direction: column; gap: 0.75rem; }

  .invigilation-item {
    padding: 0.75rem;
    border-radius: 0.5rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
  }

  .invigilation-date { font-weight: 700; color: var(--role-color); font-size: 0.85rem; }
  .invigilation-details { font-size: 0.85rem; color: var(--color-muted); margin-top: 0.15rem; }

  /* ── Edit Modal ──────────────────────────────────────────────────── */
  .edit-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1.5rem;
    animation: fade-in 0.2s ease;
  }

  @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }

  .edit-modal {
    background: var(--color-surface);
    border-radius: 1.5rem;
    padding: 2rem;
    max-width: 500px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    animation: slide-up 0.3s ease;
  }

  @keyframes slide-up {
    from { transform: translateY(20px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .modal-header h2 { font-size: 1.25rem; font-weight: 700; margin: 0; }

  .modal-close {
    width: 36px; height: 36px;
    border-radius: 50%;
    border: none;
    background: var(--color-bg);
    color: var(--color-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
  }

  .modal-close:hover { background: var(--color-border); color: var(--color-text); }

  .form-group { margin-bottom: 1rem; }

  .form-group label {
    display: block;
    font-weight: 600;
    font-size: 0.85rem;
    margin-bottom: 0.3rem;
    color: var(--color-text);
  }

  .form-group input,
  .form-group textarea {
    width: 100%;
    padding: 0.6rem 0.8rem;
    border: 1.5px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-bg);
    color: var(--color-text);
    font-size: 0.9rem;
    transition: all 0.2s;
    font-family: inherit;
    box-sizing: border-box;
  }

  .form-group input:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: var(--role-color);
    box-shadow: 0 0 0 3px var(--role-bg);
  }

  .form-group textarea { resize: vertical; }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  .form-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 1.5rem;
  }

  .form-actions .btn-primary,
  .form-actions .btn-secondary {
    flex: 1;
    justify-content: center;
  }

  .spinning { animation: spin 1s linear infinite; }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  .toast {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    margin-top: 1rem;
    font-weight: 600;
    font-size: 0.9rem;
    animation: slide-up 0.3s ease;
  }

  .toast.success { background: #d1fae5; color: #065f46; }
  .toast.error   { background: #fee2e2; color: #991b1b; }

  /* ── Responsive ──────────────────────────────────────────────────── */
  @media (max-width: 768px) {
    .profile-header,
    .profile-header.layout-split {
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 1.5rem;
    }

    .profile-grid.layout-split { grid-template-columns: 1fr; }
    .info-header, .info-details, .action-buttons { justify-content: center; }
    .quick-actions { grid-template-columns: 1fr 1fr; }
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
    .edit-modal { padding: 1.5rem; }
    .avatar-wrapper { width: 100px; height: 100px; }
  }

  @media (max-width: 480px) {
    .stats-grid, .quick-actions, .form-row { grid-template-columns: 1fr; }
    .info-header h1 { font-size: 1.4rem; }
    .form-actions { flex-direction: column; }
  }

  /* ── Reduced motion ──────────────────────────────────────────────── */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
</style>