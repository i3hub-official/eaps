<!-- src/routes/invigilator/profile/+page.svelte -->
<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import {
    User, Mail, Phone, Key, Building2, BookOpen,
    Hash, Calendar, CheckCircle, AlertCircle, Camera,
    Edit, ShieldCheck, IdCard, Lock, Activity
  } from '@lucide/svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  const { user, recentActivity, titles } = data;

  let editingProfile  = $state(false);
  let loadingProfile  = $state(false);
  let loadingPassword = $state(false);
  let photoPreview    = $state<string | null>(null);

  function fmt(d: Date | string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function relative(d: Date | string) {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  function onPhotoChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { photoPreview = reader.result as string; };
    reader.readAsDataURL(file);
  }

  $effect(() => {
    if (form?.success) { editingProfile = false; loadingProfile = false; loadingPassword = false; }
  });

  const displayName = $derived([user?.title, user?.fullName].filter(Boolean).join(' '));
</script>

<svelte:head><title>My Profile — MOUAU eTest</title></svelte:head>

<div class="profile-page">

  <!-- ── Header ── -->
  <div class="page-header">
    <div class="ph-icon"><ShieldCheck size={20} /></div>
    <div>
      <h1>My Profile</h1>
      <p>Manage your account details and security</p>
    </div>
  </div>

  <!-- ── Hero identity banner ── -->
  <div class="identity-banner">
    <div class="banner-left">
      <div class="avatar-wrap">
        {#if photoPreview || user?.photoUrl}
          <img src={photoPreview ?? user?.photoUrl} alt="Profile" class="avatar-img" />
        {:else}
          <div class="avatar-placeholder">{user?.fullName?.charAt(0)?.toUpperCase() ?? 'I'}</div>
        {/if}
      </div>
      <div class="banner-identity">
        <div class="banner-name">{displayName}</div>
        <div class="banner-email">{user?.email}</div>
        <div class="banner-badges">
          <span class="badge badge-invig">Invigilator</span>
          <span class="badge badge-active">Active</span>
        </div>
      </div>
    </div>
    <div class="banner-stats">
      <div class="bstat">
        <span class="bstat-val">{fmt(user?.createdAt)}</span>
        <span class="bstat-lbl">Member since</span>
      </div>
      {#if user?.staffId}
        <div class="bstat-divider"></div>
        <div class="bstat">
          <span class="bstat-val">{user.staffId}</span>
          <span class="bstat-lbl">Staff ID</span>
        </div>
      {/if}
      {#if user?.department?.name}
        <div class="bstat-divider"></div>
        <div class="bstat">
          <span class="bstat-val">{user.department.name}</span>
          <span class="bstat-lbl">Department</span>
        </div>
      {/if}
    </div>
  </div>

  <!-- ── Main grid ── -->
  <div class="main-grid">

    <!-- ── Bio Data ── -->
    <section class="card span-full">
      <div class="card-head">
        <IdCard size={15} />
        <span>Bio Data</span>
      </div>
      <div class="biodata-grid">
        <div class="bio-field">
          <span class="bio-label"><Mail size={13} /> Email Address</span>
          <span class="bio-value">{user?.email ?? '—'}</span>
        </div>
        <div class="bio-field">
          <span class="bio-label"><Phone size={13} /> Phone Number</span>
          <span class="bio-value">{user?.phone ?? '—'}</span>
        </div>
        <div class="bio-field">
          <span class="bio-label"><Hash size={13} /> Staff ID</span>
          <span class="bio-value">{user?.staffId ?? '—'}</span>
        </div>
        <div class="bio-field">
          <span class="bio-label"><User size={13} /> Title</span>
          <span class="bio-value">{user?.title ?? '—'}</span>
        </div>
        <div class="bio-field">
          <span class="bio-label"><Building2 size={13} /> College</span>
          <span class="bio-value">{user?.college?.name ?? '—'}</span>
        </div>
        <div class="bio-field">
          <span class="bio-label"><BookOpen size={13} /> Department</span>
          <span class="bio-value">{user?.department?.name ?? '—'}</span>
        </div>
        <div class="bio-field">
          <span class="bio-label"><Calendar size={13} /> Date Joined</span>
          <span class="bio-value">{fmt(user?.createdAt)}</span>
        </div>
        <div class="bio-field">
          <span class="bio-label"><ShieldCheck size={13} /> Role</span>
          <span class="bio-value bio-role">Invigilator</span>
        </div>
      </div>
    </section>

    <!-- ── Edit Profile ── -->
    <section class="card">
      <div class="card-head">
        <Edit size={15} />
        <span>Edit Profile</span>
        <button class="head-toggle" onclick={() => editingProfile = !editingProfile}>
          {editingProfile ? 'Cancel' : 'Edit'}
        </button>
      </div>

      {#if form?.field === 'profile' && form?.success}
        <div class="toast toast-ok"><CheckCircle size={13} /> {form.message}</div>
      {/if}
      {#if form?.field === 'profile' && form?.error}
        <div class="toast toast-err"><AlertCircle size={13} /> {form.error}</div>
      {/if}

      {#if editingProfile}
        <form
          method="POST"
          action="?/updateProfile"
          enctype="multipart/form-data"
          use:enhance={() => {
            loadingProfile = true;
            return async ({ update }) => { loadingProfile = false; await update(); };
          }}
          class="card-form"
        >
          <div class="photo-upload-row">
            <div class="photo-thumb">
              {#if photoPreview || user?.photoUrl}
                <img src={photoPreview ?? user?.photoUrl} alt="Preview" />
              {:else}
                <div class="photo-init">{user?.fullName?.charAt(0)?.toUpperCase() ?? 'I'}</div>
              {/if}
            </div>
            <div class="photo-right">
              <label class="photo-upload-btn">
                <Camera size={13} /> Change photo
                <input type="file" name="photo" accept="image/*" class="sr-only" onchange={onPhotoChange} />
              </label>
              <span class="photo-hint">Max 5 MB · JPG, PNG, WEBP</span>
            </div>
          </div>

          <div class="form-row">
            <div class="field">
              <label for="title">Title</label>
              <select id="title" name="title">
                {#each titles as t}
                  <option value={t} selected={user?.title === t}>{t || '— None —'}</option>
                {/each}
              </select>
            </div>
            <div class="field field-grow">
              <label for="fullName">Full Name <span class="req">*</span></label>
              <input id="fullName" name="fullName" value={user?.fullName} required />
            </div>
          </div>
          <div class="field">
            <label for="phone">Phone Number</label>
            <input id="phone" name="phone" type="tel" value={user?.phone ?? ''} placeholder="+234 000 000 0000" />
          </div>
          <div class="form-foot">
            <button type="submit" class="btn-primary" disabled={loadingProfile}>
              {loadingProfile ? '⟳ Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      {:else}
        <p class="card-placeholder">Click <strong>Edit</strong> to update your name, title, phone, and profile photo.</p>
      {/if}
    </section>

    <!-- ── Change Password ── -->
    <section class="card">
      <div class="card-head">
        <Lock size={15} />
        <span>Change Password</span>
      </div>

      {#if form?.field === 'password' && form?.success}
        <div class="toast toast-ok"><CheckCircle size={13} /> {form.message}</div>
      {/if}
      {#if form?.field === 'password' && form?.error}
        <div class="toast toast-err"><AlertCircle size={13} /> {form.error}</div>
      {/if}

      <form
        method="POST"
        action="?/changePassword"
        use:enhance={() => {
          loadingPassword = true;
          return async ({ update }) => { loadingPassword = false; await update(); };
        }}
        class="card-form"
      >
        <div class="field">
          <label for="currentPassword">Current Password</label>
          <input id="currentPassword" name="currentPassword" type="password" required />
        </div>
        <div class="field">
          <label for="newPassword">New Password</label>
          <input id="newPassword" name="newPassword" type="password" minlength="8" required placeholder="Min. 8 characters" />
        </div>
        <div class="field">
          <label for="confirmPassword">Confirm New Password</label>
          <input id="confirmPassword" name="confirmPassword" type="password" minlength="8" required />
        </div>
        <div class="form-foot">
          <button type="submit" class="btn-primary" disabled={loadingPassword}>
            {loadingPassword ? '⟳ Updating…' : 'Change Password'}
          </button>
        </div>
      </form>
    </section>

    <!-- ── Recent Activity ── -->
    <section class="card span-full">
      <div class="card-head">
        <Activity size={15} />
        <span>Recent Activity</span>
      </div>
      {#if recentActivity.length === 0}
        <p class="card-empty">No recent activity.</p>
      {:else}
        <div class="activity-list">
          {#each recentActivity as log}
            <div class="activity-item">
              <div class="ai-dot"></div>
              <div class="ai-content">
                <span class="ai-action">{log.action}</span>
                {#if log.entity}<span class="ai-entity">{log.entity}</span>{/if}
              </div>
              <span class="ai-time">{relative(log.createdAt)}</span>
            </div>
          {/each}
        </div>
      {/if}
    </section>

  </div>
</div>

<style>
  /* ── Page shell ── */
  .profile-page { display: flex; flex-direction: column; gap: 1.75rem; }

  .page-header { display: flex; align-items: center; gap: .875rem; }
  .ph-icon {
    width: 44px; height: 44px; border-radius: .75rem;
    background: linear-gradient(135deg, var(--iv-400), var(--iv-600));
    display: flex; align-items: center; justify-content: center;
    color: white; flex-shrink: 0;
  }
  h1 { font-size: 1.2rem; font-weight: 800; color: var(--color-text); margin: 0; }
  p  { font-size: .8rem; color: var(--color-muted); margin: 0; }

  /* ── Identity banner ── */
  .identity-banner {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    padding: 2rem 2.25rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2rem;
    flex-wrap: wrap;
  }
  .banner-left { display: flex; align-items: center; gap: 1.5rem; }
  .avatar-img {
    width: 80px; height: 80px; border-radius: 50%;
    object-fit: cover; border: 3px solid var(--color-border);
    flex-shrink: 0;
  }
  .avatar-placeholder {
    width: 80px; height: 80px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg, var(--iv-400), var(--iv-600));
    display: flex; align-items: center; justify-content: center;
    font-weight: 800; font-size: 2rem; color: white;
  }
  .banner-name  { font-size: 1.2rem; font-weight: 800; color: var(--color-text); line-height: 1.2; }
  .banner-email { font-size: .82rem; color: var(--color-muted); margin: .25rem 0 .5rem; }
  .banner-badges { display: flex; gap: .375rem; flex-wrap: wrap; }
  .badge { font-size: .65rem; font-weight: 700; padding: .275rem .7rem; border-radius: 2rem; }
  .badge-invig  { background: var(--iv-soft); color: var(--iv-600); }
  .badge-active { background: rgba(22,163,74,.12); color: #16a34a; }

  .banner-stats {
    display: flex; align-items: center; gap: 2.5rem; flex-wrap: wrap;
  }
  .bstat { display: flex; flex-direction: column; gap: .25rem; }
  .bstat-val { font-size: .92rem; font-weight: 700; color: var(--color-text); }
  .bstat-lbl { font-size: .68rem; color: var(--color-muted); text-transform: uppercase; letter-spacing: .05em; }
  .bstat-divider { width: 1px; height: 36px; background: var(--color-border); }

  /* ── Main grid ── */
  .main-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.25rem;
  }
  .span-full { grid-column: 1 / -1; }

  /* ── Cards ── */
  .card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    overflow: hidden;
  }
  .card-head {
    display: flex; align-items: center; gap: .625rem;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--color-border);
    font-size: .875rem; font-weight: 700; color: var(--color-text);
    background: var(--color-bg);
  }
  .card-head :global(svg) { color: var(--iv-500); flex-shrink: 0; }
  .head-toggle {
    margin-left: auto;
    background: none; border: 1px solid var(--color-border);
    border-radius: .375rem; padding: .25rem .75rem;
    font-size: .72rem; font-weight: 600; cursor: pointer;
    font-family: inherit; color: var(--color-text);
    transition: all .15s;
  }
  .head-toggle:hover { background: var(--color-surface-hover); border-color: var(--iv-500); color: var(--iv-600); }

  /* ── Bio data grid ── */
  .biodata-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0;
  }
  .bio-field {
    display: flex; flex-direction: column; gap: .5rem;
    padding: 1.5rem 1.75rem;
    border-right: 1px solid var(--color-border);
    border-bottom: 1px solid var(--color-border);
    transition: background .1s;
  }
  .bio-field:hover { background: var(--color-surface-hover); }
  /* remove right border on every 4th child */
  .bio-field:nth-child(4n) { border-right: none; }
  /* remove bottom border on last row */
  .bio-field:nth-last-child(-n+4) { border-bottom: none; }

  .bio-label {
    display: flex; align-items: center; gap: .4rem;
    font-size: .7rem; font-weight: 600;
    color: var(--color-muted);
    text-transform: uppercase; letter-spacing: .05em;
  }
  .bio-label :global(svg) { color: var(--iv-500); flex-shrink: 0; }
  .bio-value {
    font-size: .92rem; font-weight: 600; color: var(--color-text);
    word-break: break-word;
  }
  .bio-role {
    display: inline-flex; align-items: center;
    background: var(--iv-soft); color: var(--iv-600);
    font-size: .75rem; padding: .2rem .6rem;
    border-radius: 2rem; font-weight: 700;
    width: fit-content;
  }

  /* ── Forms ── */
  .card-form { display: flex; flex-direction: column; gap: 1.125rem; padding: 1.5rem; }
  .form-row  { display: flex; gap: .75rem; align-items: flex-end; }
  .field { display: flex; flex-direction: column; gap: .4rem; }
  .field-grow { flex: 1; }
  label { font-size: .78rem; font-weight: 600; color: var(--color-text); }
  .req  { color: #dc2626; }
  input, select {
    padding: .7rem 1rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: .5rem;
    font-size: .85rem; color: var(--color-text);
    font-family: inherit; outline: none;
    -webkit-appearance: none;
    transition: border-color .15s;
  }
  input:focus, select:focus { border-color: var(--iv-500); }
  .form-foot { display: flex; justify-content: flex-end; padding-top: .25rem; }

  .photo-upload-row { display: flex; align-items: center; gap: 1rem; }
  .photo-right { display: flex; flex-direction: column; gap: .35rem; }
  .photo-thumb {
    width: 52px; height: 52px; border-radius: 50%;
    overflow: hidden; flex-shrink: 0;
    border: 2px solid var(--color-border);
  }
  .photo-thumb img { width: 100%; height: 100%; object-fit: cover; }
  .photo-init {
    width: 100%; height: 100%;
    background: linear-gradient(135deg, var(--iv-400), var(--iv-600));
    display: flex; align-items: center; justify-content: center;
    color: white; font-weight: 700; font-size: 1rem;
  }
  .photo-upload-btn {
    display: inline-flex; align-items: center; gap: .375rem;
    padding: .425rem .875rem;
    border: 1px solid var(--color-border);
    border-radius: .5rem; font-size: .78rem; font-weight: 600;
    cursor: pointer; font-family: inherit; color: var(--color-text);
    background: var(--color-bg); transition: all .15s;
  }
  .photo-upload-btn:hover { border-color: var(--iv-500); color: var(--iv-600); }
  .photo-hint { font-size: .68rem; color: var(--color-muted); }
  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }

  .btn-primary {
    display: flex; align-items: center; gap: .5rem;
    padding: .625rem 1.5rem;
    background: var(--iv-500); color: white;
    border: none; border-radius: .5rem;
    font-size: .85rem; font-weight: 600;
    cursor: pointer; font-family: inherit;
    transition: background .15s;
  }
  .btn-primary:hover    { background: var(--iv-600); }
  .btn-primary:disabled { opacity: .5; cursor: not-allowed; }

  .card-empty, .card-placeholder {
    padding: 1.5rem;
    font-size: .82rem; color: var(--color-muted);
  }

  /* ── Toasts ── */
  .toast {
    display: flex; align-items: center; gap: .5rem;
    margin: 1rem 1.5rem 0;
    padding: .7rem 1rem;
    border-radius: .5rem; font-size: .8rem;
  }
  .toast-ok  { background: rgba(22,163,74,.08);  border: 1px solid rgba(22,163,74,.25);  color: #16a34a; }
  .toast-err { background: rgba(220,38,38,.08);  border: 1px solid rgba(220,38,38,.25);  color: #dc2626; }

  /* ── Activity ── */
  .activity-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    padding: .75rem 0;
    max-height: 320px;
    overflow-y: auto;
  }
  .activity-item {
    display: flex; align-items: center; gap: .875rem;
    padding: .875rem 1.75rem;
    transition: background .1s;
  }
  .activity-item:hover { background: var(--color-surface-hover); }
  .ai-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: var(--iv-500); flex-shrink: 0;
  }
  .ai-content { flex: 1; min-width: 0; }
  .ai-action {
    font-size: .83rem; font-weight: 600; color: var(--color-text);
    display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .ai-entity { font-size: .72rem; color: var(--color-muted); }
  .ai-time   { font-size: .72rem; color: var(--color-muted); white-space: nowrap; flex-shrink: 0; }

  /* ── Responsive ── */
  @media (max-width: 1024px) {
    .biodata-grid { grid-template-columns: repeat(2, 1fr); }
    .bio-field:nth-child(4n)       { border-right: revert; }
    .bio-field:nth-last-child(-n+4){ border-bottom: revert; }
    .bio-field:nth-child(2n)       { border-right: none; }
    .bio-field:nth-last-child(-n+2){ border-bottom: none; }
    .bstat-divider { display: none; }
  }
  @media (max-width: 768px) {
    .main-grid { grid-template-columns: 1fr; }
    .identity-banner { flex-direction: column; align-items: flex-start; padding: 1.5rem; }
    .banner-stats { gap: 1.5rem; }
    .biodata-grid { grid-template-columns: 1fr 1fr; }
    .activity-list { grid-template-columns: 1fr; }
  }
  @media (max-width: 480px) {
    .biodata-grid { grid-template-columns: 1fr; }
    .bio-field:nth-child(2n)       { border-right: revert; }
    .bio-field:nth-last-child(-n+2){ border-bottom: revert; }
    .bio-field:nth-child(n)        { border-right: none; }
    .bio-field:last-child          { border-bottom: none; }
    .banner-left { flex-direction: column; align-items: flex-start; gap: 1rem; }
  }
</style>
