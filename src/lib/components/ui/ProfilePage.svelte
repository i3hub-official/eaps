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
    AlertCircle, CheckCircle, Loader2, BarChart3, CalendarDays
  } from '@lucide/svelte';

  // Map icon strings to components
  const iconMap = {
    User, Users, UserCog, GraduationCap, BookOpen, Clock,
    Award, FileText, CreditCard, Globe,
    Camera, Edit3, Save, X, Shield, BadgeCheck,
    AlertCircle, CheckCircle, Loader2, BarChart3, CalendarDays,
    Calendar, MapPin, Building, Mail, Phone
  };

  interface ProfileData {
    id: string;
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
    bio?: string;
    department?: string;
    faculty?: string;
    college?: string;
    level?: string;
    matricNumber?: string;
    staffId?: string;
    joinDate?: string;
    courses?: { id: string; title: string; code: string }[];
    stats?: {
      label: string;
      value: string | number;
      icon: string;
    }[];
    socialLinks?: {
      linkedin?: string;
      github?: string;
      twitter?: string;
      website?: string;
    };
    isVerified?: boolean;
    isActive?: boolean;
    lastActive?: string;
  }

  interface Props {
    profile: ProfileData;
    isEditing?: boolean;
  }

  let { profile, isEditing = false }: Props = $props();

  // Get role from context
  const contextRole = getContext<string | undefined>(ROLE_CONTEXT_KEY);
  
  let currentRole = $derived.by(() => {
    if (contextRole) return contextRole;
    const path = $page.url.pathname;
    if (path.startsWith('/admin')) return 'admin';
    if (path.startsWith('/lecturer')) return 'lecturer';
    if (path.startsWith('/invigilator')) return 'invigilator';
    if (path.startsWith('/student')) return 'student';
    return 'default';
  });

  // Role configurations with design variants
  const roleDesigns = {
    admin: {
      name: 'Admin',
      icon: UserCog,
      color: '#6366f1',
      colorVar: 'var(--admin-accent, #6366f1)',
      bgVar: 'var(--admin-accent-bg, rgba(99,102,241,0.1))',
      gradient: 'from-indigo-500 to-purple-600',
      cardStyle: 'glass-premium',
      badgeStyle: 'premium',
      statStyle: 'elevated',
      layout: 'centered',
      primaryAction: 'Manage Users',
      secondaryAction: 'System Settings'
    },
    lecturer: {
      name: 'Lecturer',
      icon: Users,
      color: '#8b5cf6',
      colorVar: 'var(--lecturer-accent, #8b5cf6)',
      bgVar: 'var(--lecturer-accent-bg, rgba(139,92,246,0.1))',
      gradient: 'from-violet-500 to-purple-500',
      cardStyle: 'glass-elegant',
      badgeStyle: 'elegant',
      statStyle: 'minimal',
      layout: 'split',
      primaryAction: 'Create Exam',
      secondaryAction: 'View Results'
    },
    invigilator: {
      name: 'Invigilator',
      icon: User,
      color: '#f59e0b',
      colorVar: 'var(--invigilator-accent, #f59e0b)',
      bgVar: 'var(--invigilator-accent-bg, rgba(245,158,11,0.1))',
      gradient: 'from-amber-500 to-yellow-500',
      cardStyle: 'glass-warm',
      badgeStyle: 'warm',
      statStyle: 'compact',
      layout: 'centered',
      primaryAction: 'View Schedule',
      secondaryAction: 'Report Issues'
    },
    student: {
      name: 'Student',
      icon: GraduationCap,
      color: '#10b981',
      colorVar: 'var(--student-accent, #10b981)',
      bgVar: 'var(--student-accent-bg, rgba(16,185,129,0.1))',
      gradient: 'from-emerald-500 to-teal-500',
      cardStyle: 'glass-fresh',
      badgeStyle: 'fresh',
      statStyle: 'modern',
      layout: 'split',
      primaryAction: 'View Results',
      secondaryAction: 'Register Courses'
    },
    default: {
      name: 'User',
      icon: User,
      color: '#22c55e',
      colorVar: 'var(--g500, #22c55e)',
      bgVar: 'rgba(34,197,94,0.1)',
      gradient: 'from-green-500 to-emerald-500',
      cardStyle: 'glass-default',
      badgeStyle: 'default',
      statStyle: 'default',
      layout: 'centered',
      primaryAction: 'View Profile',
      secondaryAction: 'Settings'
    }
  };

  const design = $derived(roleDesigns[currentRole] || roleDesigns.default);

  let editing = $state(isEditing);
  let formData = $state({ ...profile });
  let isSaving = $state(false);
  let saveSuccess = $state(false);
  let saveError = $state<string | null>(null);

  function getInitials(name: string): string {
    return name
      .split(' ')
      .map(word => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  function formatDate(date?: string): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
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
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  // Get the icon component
  function getIcon(iconName: string) {
    return iconMap[iconName as keyof typeof iconMap] || User;
  }

  // Handler for form submission with enhance
  async function handleSubmit(event: Event) {
    isSaving = true;
    saveError = null;
    saveSuccess = false;
  }

  // Reset form state when editing starts
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

  // Handle avatar file upload
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

  // Handle click outside modal
  function handleOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      cancelEdit();
    }
  }

  // Handle modal click to stop propagation
  function handleModalClick(event: MouseEvent) {
    event.stopPropagation();
  }
</script>

<div class="profile-page" data-role={currentRole} style="--role-color: {design.colorVar}; --role-bg: {design.bgVar};">
  <!-- Background Gradient -->
  <div class="profile-bg" style="--gradient: {design.gradient};"></div>

  <div class="profile-container">
    <!-- Header Section -->
    <div class="profile-header layout-{design.layout}">
      <!-- Avatar Section -->
      <div class="avatar-section">
        <div class="avatar-wrapper" style="--role-color: {design.colorVar};">
          {#if profile.avatar}
            <img src={profile.avatar} alt={profile.name} class="avatar-image" />
          {:else}
            <div class="avatar-placeholder" style="background: {design.colorVar};">
              <span>{getInitials(profile.name)}</span>
            </div>
          {/if}
          
          {#if editing}
            <form method="POST" action="?/update_avatar" use:enhance class="avatar-form">
              <button class="avatar-edit-btn" type="button" style="--role-color: {design.colorVar};" onclick={() => document.getElementById('avatar-upload')?.click()}>
                <Camera size={16} />
              </button>
              <input 
                id="avatar-upload"
                type="file" 
                accept="image/*"
                style="display: none"
                onchange={handleAvatarChange}
              />
            </form>
          {/if}
          
          {#if profile.isVerified}
            <div class="verified-badge" style="--role-color: {design.colorVar};">
              <BadgeCheck size={18} />
            </div>
          {/if}
        </div>

        <div class="role-indicator" style="--role-color: {design.colorVar};">
          <svelte:component this={design.icon} size={16} />
          <span>{design.name}</span>
        </div>
      </div>

      <!-- User Info -->
      <div class="user-info">
        <div class="info-header">
          <h1>{profile.name}</h1>
          <div class="status-badge" style="--role-color: {design.colorVar};">
            {#if profile.isActive}
              <CheckCircle size={14} />
              <span>Active</span>
            {:else}
              <AlertCircle size={14} />
              <span>Inactive</span>
            {/if}
          </div>
        </div>

        <div class="info-details">
          <div class="detail-item">
            <Mail size={16} />
            <span>{profile.email}</span>
          </div>
          {#if profile.phone}
            <div class="detail-item">
              <Phone size={16} />
              <span>{profile.phone}</span>
            </div>
          {/if}
          {#if profile.lastActive}
            <div class="detail-item">
              <Clock size={16} />
              <span>Last active: {formatTimeAgo(profile.lastActive)}</span>
            </div>
          {/if}
        </div>

        {#if profile.bio}
          <p class="user-bio">{profile.bio}</p>
        {/if}

        <div class="action-buttons">
          {#if !editing}
            <button 
              class="btn-primary" 
              onclick={startEditing}
              style="--role-color: {design.colorVar};"
            >
              <Edit3 size={16} />
              Edit Profile
            </button>
            <a href={currentRole === 'default' ? '/' : `/${currentRole}`} class="btn-secondary" style="--role-color: {design.colorVar};">
              Dashboard
            </a>
          {/if}
        </div>
      </div>
    </div>

    <!-- Content Grid -->
    <div class="profile-grid layout-{design.layout}">
      <!-- Left Column: Stats & Info -->
      <div class="profile-left">
        <!-- Stats -->
        {#if profile.stats && profile.stats.length > 0}
          <div class="stats-grid style-{design.statStyle}">
            {#each profile.stats as stat}
              <div class="stat-card" style="--role-color: {design.colorVar};">
                <div class="stat-icon" style="--role-color: {design.colorVar};">
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

       <!-- Academic/Professional Info -->
<div class="info-card style-{design.cardStyle}">
  <h3>Personal Information</h3>
  <div class="info-grid">
    {#if profile.college}
      <div class="info-row">
        <GraduationCap size={16} />
        <span>{currentRole === 'student' ? 'College' : 'College'}: <strong>{profile.college}</strong></span>
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
        <span>Matric Number: <strong>{profile.matricNumber}</strong></span>
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
              {#if profile.socialLinks.linkedin}
                <a href={profile.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" class="social-link">
                  <Globe size={18} />
                </a>
              {/if}
              {#if profile.socialLinks.github}
                <a href={profile.socialLinks.github} target="_blank" rel="noopener noreferrer" class="social-link">
                  <Globe size={18} />
                </a>
              {/if}
              {#if profile.socialLinks.twitter}
                <a href={profile.socialLinks.twitter} target="_blank" rel="noopener noreferrer" class="social-link">
                  <Globe size={18} />
                </a>
              {/if}
            </div>
          </div>
        {/if}
      </div>

      <!-- Right Column: Courses/Additional Info -->
      <div class="profile-right">
        {#if profile.courses && profile.courses.length > 0}
          <div class="info-card style-{design.cardStyle}">
            <div class="card-header">
              <h3>
                {#if currentRole === 'lecturer'}
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
                <div class="course-item" style="--role-color: {design.colorVar};">
                  <div class="course-code">{course.code}</div>
                  <div class="course-title">{course.title}</div>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        {#if currentRole === 'admin'}
          <div class="info-card style-{design.cardStyle}">
            <h3>Admin Actions</h3>
            <div class="admin-actions">
              <a href="/admin/users" class="admin-btn" style="--role-color: {design.colorVar};">
                <Users size={16} />
                Manage Users
              </a>
              <a href="/admin/security" class="admin-btn" style="--role-color: {design.colorVar};">
                <Shield size={16} />
                System Settings
              </a>
              <a href="/admin/reports" class="admin-btn" style="--role-color: {design.colorVar};">
                <FileText size={16} />
                View Reports
              </a>
            </div>
          </div>
        {/if}

        {#if currentRole === 'invigilator'}
          <div class="info-card style-{design.cardStyle}">
            <h3>Upcoming Invigilation</h3>
            <div class="invigilation-list">
              <div class="invigilation-item">
                <div class="invigilation-date">Today, 2:00 PM</div>
                <div class="invigilation-details">Exam: CSC 301</div>
                <div class="invigilation-details">Venue: Hall B</div>
              </div>
              <div class="invigilation-item">
                <div class="invigilation-date">Tomorrow, 10:00 AM</div>
                <div class="invigilation-details">Exam: MTH 205</div>
                <div class="invigilation-details">Venue: Hall A</div>
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

      <form
        method="POST"
        action="?/update_profile"
        use:enhance
        onsubmit={handleSubmit}
      >
        <!-- Title: only lecturer and invigilator -->
        {#if currentRole === 'lecturer' || currentRole === 'invigilator'}
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

        <div class="form-group">
          <label>State</label>
          <input
            type="text"
            name="state"
            value={formData.state || ''}
            placeholder="Enter your state"
            oninput={(e) => formData.state = e.currentTarget.value}
          />
        </div>

        <div class="form-group">
          <label>LGA</label>
          <input
            type="text"
            name="lga"
            value={formData.lga || ''}
            placeholder="Enter your LGA"
            oninput={(e) => formData.lga = e.currentTarget.value}
          />
        </div>

        <div class="form-actions">
          <button type="button" class="btn-secondary" onclick={cancelEdit}>
            Cancel
          </button>
          <button type="submit" class="btn-primary" style="--role-color: {design.colorVar};" disabled={isSaving}>
            {#if isSaving}
              <Loader2 size={16} class="spinning" />
              Saving...
            {:else}
              <Save size={16} />
              Save Changes
            {/if}
          </button>
        </div>

        {#if saveSuccess}
          <div class="toast success">
            <CheckCircle size={20} />
            Profile updated successfully!
          </div>
        {/if}

        {#if saveError}
          <div class="toast error">
            <AlertCircle size={20} />
            {saveError}
          </div>
        {/if}
      </form>
    </div>
  </div>
{/if}
  </div>
</div>

<style>
  /* ... (all the same styles from before) ... */
  .profile-page {
    position: relative;
    background: var(--color-bg);
     }

  .profile-bg {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 300px;
    opacity: 0.08;
    pointer-events: none;
    border-radius: 1rem; /* contain it */
}

  .profile-container {
    max-width: 1200px;
    margin: 0 auto;
    position: relative;
  }

  /* Header */
  .profile-header {
    display: flex;
    gap: 2.5rem;
    background: var(--color-surface);
    border-radius: 1.5rem;
    padding: 2rem;
    margin-bottom: 2rem;
    border: 1px solid var(--color-border);
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
    transition: all 0.3s ease;
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

  /* Avatar */
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
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .avatar-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.5rem;
    font-weight: 700;
    color: white;
  }

  .avatar-form {
    position: absolute;
    bottom: 4px;
    right: 4px;
  }

  .avatar-edit-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 2px solid white;
    background: var(--role-color);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
  }

  .avatar-edit-btn:hover {
    transform: scale(1.1);
  }

  .verified-badge {
    position: absolute;
    bottom: 4px;
    right: 4px;
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

  /* User Info */
  .user-info {
    flex: 1;
    min-width: 0;
  }

  .info-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 0.75rem;
  }

  .profile-header.layout-centered .info-header {
    justify-content: center;
  }

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

  .profile-header.layout-centered .info-details {
    justify-content: center;
  }

  .detail-item {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    color: var(--color-muted);
    font-size: 0.9rem;
  }

  .detail-item :global(svg) {
    flex-shrink: 0;
    opacity: 0.7;
  }

  .user-bio {
    color: var(--color-muted);
    font-size: 0.95rem;
    line-height: 1.6;
    margin: 0 0 1rem 0;
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

  .profile-header.layout-centered .action-buttons {
    justify-content: center;
  }

  /* Buttons */
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

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

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

  .btn-secondary:hover {
    background: var(--role-bg);
  }

  /* Grid */
  .profile-grid {
    display: grid;
    gap: 1.5rem;
  }

  .profile-grid.layout-split {
    grid-template-columns: 1.2fr 0.8fr;
  }

  .profile-grid.layout-centered {
    grid-template-columns: 1fr;
    max-width: 800px;
    margin: 0 auto;
  }

  .profile-left,
  .profile-right {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  /* Stats */
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
    width: 40px;
    height: 40px;
    border-radius: 0.5rem;
    background: var(--role-bg);
    color: var(--role-color);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .stat-content {
    display: flex;
    flex-direction: column;
  }

  .stat-value {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-text);
  }

  .stat-label {
    font-size: 0.75rem;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* Stats Variations */
  .stats-grid.style-elevated .stat-card {
    background: var(--color-surface);
    box-shadow: 0 2px 4px rgb(0 0 0 / 0.04);
    border: none;
  }

  .stats-grid.style-minimal .stat-card {
    border: none;
    padding: 0.5rem;
    background: transparent;
  }

  .stats-grid.style-modern .stat-card {
    background: var(--color-bg);
    border: 2px solid transparent;
  }

  .stats-grid.style-modern .stat-card:hover {
    border-color: var(--role-color);
  }

  /* Info Cards */
  .info-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    padding: 1.5rem;
    transition: all 0.3s ease;
  }

  .info-card:hover {
    box-shadow: 0 4px 12px rgb(0 0 0 / 0.04);
  }

  .info-card h3 {
    font-size: 1rem;
    font-weight: 700;
    margin: 0 0 1rem 0;
    color: var(--color-text);
  }

  /* Card Styles */
  .info-card.style-glass-premium {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    backdrop-filter: blur(8px);
  }

  .info-card.style-glass-elegant {
    background: rgba(139, 92, 246, 0.04);
    border: 1px solid rgba(139, 92, 246, 0.15);
  }

  .info-card.style-glass-warm {
    background: rgba(245, 158, 11, 0.04);
    border: 1px solid rgba(245, 158, 11, 0.15);
  }

  .info-card.style-glass-fresh {
    background: rgba(16, 185, 129, 0.04);
    border: 1px solid rgba(16, 185, 129, 0.15);
  }

  .info-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .info-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    color: var(--color-text);
    font-size: 0.9rem;
    padding: 0.3rem 0;
  }

  .info-row :global(svg) {
    flex-shrink: 0;
    opacity: 0.6;
  }

  .info-row strong {
    font-weight: 600;
  }

  /* Social Links */
  .social-links {
    display: flex;
    gap: 0.75rem;
  }

  .social-link {
    width: 40px;
    height: 40px;
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

  /* Courses */
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

  .course-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .course-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 0.8rem;
    border-radius: 0.5rem;
    background: var(--color-bg);
    border-left: 3px solid var(--role-color);
    transition: all 0.2s;
  }

  .course-item:hover {
    transform: translateX(4px);
  }

  .course-code {
    font-weight: 700;
    font-size: 0.8rem;
    color: var(--role-color);
    background: var(--role-bg);
    padding: 0.15rem 0.5rem;
    border-radius: 0.25rem;
    flex-shrink: 0;
  }

  .course-title {
    font-size: 0.9rem;
    color: var(--color-text);
  }

  /* Admin Actions */
  .admin-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  .admin-btn {
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

  .admin-btn:hover {
    border-color: var(--role-color);
    color: var(--role-color);
    background: var(--role-bg);
  }

  /* Invigilation */
  .invigilation-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .invigilation-item {
    padding: 0.75rem;
    border-radius: 0.5rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
  }

  .invigilation-date {
    font-weight: 700;
    color: var(--role-color);
    font-size: 0.85rem;
  }

  .invigilation-details {
    font-size: 0.85rem;
    color: var(--color-muted);
    margin-top: 0.15rem;
  }

  /* Edit Modal */
  .edit-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1.5rem;
    animation: fade-in 0.2s ease;
  }

  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

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
    to { transform: translateY(0); opacity: 1; }
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .modal-header h2 {
    font-size: 1.25rem;
    font-weight: 700;
    margin: 0;
  }

  .modal-close {
    width: 36px;
    height: 36px;
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

  .modal-close:hover {
    background: var(--color-border);
    color: var(--color-text);
  }

  .form-group {
    margin-bottom: 1rem;
  }

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
  }

  .form-group input:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: var(--role-color);
    box-shadow: 0 0 0 3px var(--role-bg);
  }

  .form-group textarea {
    resize: vertical;
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

  .spinning {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
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

  .toast.success {
    background: #d1fae5;
    color: #065f46;
  }

  .toast.error {
    background: #fee2e2;
    color: #991b1b;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .profile-page {
      padding: 1rem;
    }

    .profile-header {
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 1.5rem;
    }

    .profile-header.layout-split {
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .profile-grid.layout-split {
      grid-template-columns: 1fr;
    }

    .info-header {
      justify-content: center;
    }

    .info-details {
      justify-content: center;
    }

    .action-buttons {
      justify-content: center;
    }

    .admin-actions {
      grid-template-columns: 1fr;
    }

    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .edit-modal {
      padding: 1.5rem;
      margin: 1rem;
    }

    .avatar-wrapper {
      width: 100px;
      height: 100px;
    }
  }

  @media (max-width: 480px) {
    .stats-grid {
      grid-template-columns: 1fr;
    }

    .info-header h1 {
      font-size: 1.4rem;
    }

    .form-actions {
      flex-direction: column;
    }
  }
</style>