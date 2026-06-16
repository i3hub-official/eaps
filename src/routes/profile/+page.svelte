<!-- src/routes/shared/profile/+page.svelte
 -->

 <script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  const { profile } = data;
</script>

<svelte:head>
  <title>My Profile — MOUAU eTest</title>
</svelte:head>

<div class="profile-page">
  <div class="profile-header">
    <div class="avatar">
      {profile.fullName?.[0]?.toUpperCase() ?? '?'}
    </div>
    <div>
      <h1>{profile.fullName}</h1>
      <p>{profile.email}</p>
      <span class="role-badge">{data.role}</span>
    </div>
  </div>

  <div class="profile-grid">
    <div class="profile-card">
      <h2>Personal Information</h2>
      <div class="info-rows">
        <div class="info-row">
          <span>Full Name</span>
          <span>{profile.fullName ?? '—'}</span>
        </div>
        <div class="info-row">
          <span>Email</span>
          <span>{profile.email ?? '—'}</span>
        </div>
        <div class="info-row">
          <span>Matric / Staff No.</span>
          <span>{profile.matricNumber ?? profile.staffId ?? '—'}</span>
        </div>
        <div class="info-row">
          <span>Department</span>
          <span>{profile.department?.name ?? '—'}</span>
        </div>
        <div class="info-row">
          <span>College</span>
          <span>{profile.college?.name ?? '—'}</span>
        </div>
        <div class="info-row">
          <span>Level</span>
          <span>{profile.level?.name ?? '—'}</span>
        </div>
        <div class="info-row">
          <span>Phone</span>
          <span>{profile.phone ?? '—'}</span>
        </div>
        <div class="info-row">
          <span>Member since</span>
          <span>{profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</span>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .profile-page {
    padding: 1.75rem 2rem 4rem;
    max-width: 900px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .profile-header {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    padding-bottom: 1.5rem;
    border-bottom: 1.5px solid var(--color-border, #e5e7eb);
  }

  .avatar {
    width: 72px; height: 72px;
    border-radius: 50%;
    background: var(--g-soft, rgba(22,163,74,0.1));
    color: var(--g600, #16a34a);
    display: flex; align-items: center; justify-content: center;
    font-size: 1.75rem;
    font-weight: 900;
    flex-shrink: 0;
  }

  .profile-header h1 {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--color-text, #111827);
    margin: 0 0 0.25rem;
  }

  .profile-header p {
    font-size: 0.85rem;
    color: var(--color-muted, #6b7280);
    margin: 0 0 0.5rem;
  }

  .role-badge {
    display: inline-block;
    padding: 0.2rem 0.625rem;
    background: var(--g-soft, rgba(22,163,74,0.1));
    color: var(--g600, #16a34a);
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .profile-grid {
    display: grid;
    gap: 1.25rem;
  }

  .profile-card {
    background: var(--color-surface, white);
    border: 1.5px solid var(--color-border, #e5e7eb);
    border-radius: 1rem;
    overflow: hidden;
  }

  .profile-card h2 {
    font-size: 0.78rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-muted, #6b7280);
    padding: 0.875rem 1.25rem;
    background: var(--color-bg, #f9fafb);
    border-bottom: 1px solid var(--color-border, #e5e7eb);
    margin: 0;
  }

  .info-rows { padding: 0.5rem; }

  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.6rem 0.75rem;
    border-radius: 0.5rem;
    gap: 1rem;
    font-size: 0.85rem;
  }

  .info-row:hover { background: var(--g-soft, rgba(22,163,74,0.04)); }

  .info-row span:first-child {
    color: var(--color-muted, #6b7280);
    font-weight: 500;
    white-space: nowrap;
  }

  .info-row span:last-child {
    font-weight: 600;
    color: var(--color-text, #111827);
    text-align: right;
  }
</style>