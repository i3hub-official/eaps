<!-- src/routes/invigilator/profile/+page.svelte -->
<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import {
    User, Mail, Phone, Key, Building2, BookOpen,
    Hash, Calendar, CheckCircle, AlertCircle, Camera, Edit, ShieldCheck
  } from 'lucide-svelte';

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

<div class="profile-page">

  <div class="page-header">
    <div class="ph-icon"><ShieldCheck size={20} /></div>
    <div>
      <h1>My Profile</h1>
      <p>Manage your account details and security</p>
    </div>
  </div>

  <div class="two-col">
    <div class="left-col">
      <div class="identity-card">
        <div class="avatar-wrap">
          {#if photoPreview || user?.photoUrl}
            <img src={photoPreview ?? user?.photoUrl} alt="Profile" class="avatar-img" />
          {:else}
            <div class="avatar-placeholder">{user?.fullName?.charAt(0)?.toUpperCase() ?? 'I'}</div>
          {/if}
        </div>
        <div class="id-name">{displayName}</div>
        <div class="id-email">{user?.email}</div>
        <div class="id-badges">
          <span class="badge badge-invig">Invigilator</span>
          <span class="badge badge-active">Active</span>
        </div>
        <div class="id-stats">
          <div class="id-stat">
            <span class="is-val">{fmt(user?.createdAt)}</span>
            <span class="is-lbl">Member since</span>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><Hash size={14} /> Account Details</div>
        <div class="detail-rows">
          {#each [
            { icon: Mail,      label: 'Email',      val: user?.email },
            { icon: Phone,     label: 'Phone',      val: user?.phone ?? 'Not set' },
            { icon: Building2, label: 'College',    val: user?.college?.name ?? '—' },
            { icon: BookOpen,  label: 'Department', val: user?.department?.name ?? '—' },
            { icon: Hash,      label: 'Staff ID',   val: user?.staffId ?? '—' },
            { icon: Calendar,  label: 'Joined',     val: fmt(user?.createdAt) },
          ] as row}
            <div class="detail-row">
              <row.icon size={13} />
              <span class="dr-label">{row.label}</span>
              <span class="dr-val">{row.val}</span>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <div class="right-col">
      <div class="card">
        <div class="card-head">
          <Edit size={14} /> Edit Profile
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
              <label class="photo-upload-btn">
                <Camera size={13} /> Change photo
                <input type="file" name="photo" accept="image/*" class="sr-only" onchange={onPhotoChange} />
              </label>
              <span class="photo-hint">Max 5 MB · JPG, PNG, WEBP</span>
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
      </div>

      <div class="card">
        <div class="card-head"><Key size={14} /> Change Password</div>

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
      </div>

      <div class="card">
        <div class="card-head"><Calendar size={14} /> Recent Activity</div>
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
      </div>
    </div>
  </div>
</div>

<style>
  .profile-page { display: flex; flex-direction: column; gap: 1.5rem; }
  .page-header { display: flex; align-items: center; gap: .875rem; }
  .ph-icon { width: 44px; height: 44px; border-radius: .75rem; background: linear-gradient(135deg,#14b8a6,#0d9488); display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; }
  h1 { font-size: 1.2rem; font-weight: 800; color: var(--color-text); }
  p  { font-size: .8rem; color: var(--color-muted); }
  .two-col { display: grid; grid-template-columns: 280px 1fr; gap: 1.25rem; align-items: start; }
  .left-col, .right-col { display: flex; flex-direction: column; gap: 1rem; }
  .identity-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: .875rem; padding: 1.75rem 1.25rem; display: flex; flex-direction: column; align-items: center; gap: .625rem; text-align: center; }
  .avatar-img { width: 72px; height: 72px; border-radius: 50%; object-fit: cover; border: 2px solid var(--color-border); }
  .avatar-placeholder { width: 72px; height: 72px; border-radius: 50%; background: linear-gradient(135deg,#14b8a6,#0d9488); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.8rem; color: white; }
  .id-name  { font-size: 1rem; font-weight: 800; color: var(--color-text); }
  .id-email { font-size: .75rem; color: var(--color-muted); }
  .id-badges { display: flex; gap: .375rem; flex-wrap: wrap; justify-content: center; }
  .badge { font-size: .65rem; font-weight: 700; padding: .25rem .625rem; border-radius: 2rem; }
  .badge-invig  { background: rgba(20,184,166,.12); color: #14b8a6; }
  .badge-active { background: rgba(22,163,74,.12);  color: #16a34a; }
  .id-stats { display: flex; gap: 1.5rem; margin-top: .5rem; }
  .id-stat  { display: flex; flex-direction: column; gap: .15rem; align-items: center; }
  .is-val   { font-size: .82rem; font-weight: 700; color: var(--color-text); }
  .is-lbl   { font-size: .65rem; color: var(--color-muted); }
  .card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: .875rem; overflow: hidden; }
  .card-head { display: flex; align-items: center; gap: .5rem; padding: .875rem 1.25rem; border-bottom: 1px solid var(--color-border); font-size: .85rem; font-weight: 700; color: var(--color-text); background: var(--color-bg); }
  .head-toggle { margin-left: auto; background: none; border: 1px solid var(--color-border); border-radius: .375rem; padding: .2rem .625rem; font-size: .72rem; font-weight: 600; cursor: pointer; font-family: inherit; color: var(--color-text); }
  .head-toggle:hover { background: var(--color-surface-hover); }
  .card-empty, .card-placeholder { padding: 1.25rem; font-size: .82rem; color: var(--color-muted); }
  .detail-rows { display: flex; flex-direction: column; }
  .detail-row { display: flex; align-items: center; gap: .75rem; padding: .6rem 1.25rem; font-size: .8rem; border-bottom: 1px solid var(--color-border); }
  .detail-row:last-child { border-bottom: none; }
  .detail-row:hover { background: var(--color-surface-hover); }
  .detail-row :global(svg) { color: var(--color-muted); flex-shrink: 0; }
  .dr-label { color: var(--color-muted); font-size: .73rem; min-width: 80px; }
  .dr-val   { color: var(--color-text); }
  .card-form { display: flex; flex-direction: column; gap: 1rem; padding: 1.25rem; }
  .form-row  { display: flex; gap: .75rem; align-items: flex-end; }
  .field { display: flex; flex-direction: column; gap: .35rem; }
  .field-grow { flex: 1; }
  label { font-size: .78rem; font-weight: 600; color: var(--color-text); }
  .req  { color: #dc2626; }
  input, select { padding: .6rem .875rem; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: .5rem; font-size: .82rem; color: var(--color-text); font-family: inherit; outline: none; -webkit-appearance: none; transition: border-color .15s; }
  input:focus, select:focus { border-color: #14b8a6; }
  .form-foot { display: flex; justify-content: flex-end; }
  .photo-upload-row { display: flex; align-items: center; gap: .875rem; }
  .photo-thumb { width: 44px; height: 44px; border-radius: 50%; overflow: hidden; flex-shrink: 0; border: 1px solid var(--color-border); }
  .photo-thumb img { width: 100%; height: 100%; object-fit: cover; }
  .photo-init { width: 100%; height: 100%; background: linear-gradient(135deg,#14b8a6,#0d9488); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: .9rem; }
  .photo-upload-btn { display: flex; align-items: center; gap: .375rem; padding: .4rem .875rem; border: 1px solid var(--color-border); border-radius: .5rem; font-size: .78rem; font-weight: 600; cursor: pointer; font-family: inherit; color: var(--color-text); background: var(--color-bg); }
  .photo-upload-btn:hover { border-color: #14b8a6; color: #14b8a6; }
  .photo-hint { font-size: .68rem; color: var(--color-muted); }
  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }
  .btn-primary { display: flex; align-items: center; gap: .5rem; padding: .575rem 1.25rem; background: #14b8a6; color: white; border: none; border-radius: .5rem; font-size: .82rem; font-weight: 600; cursor: pointer; font-family: inherit; }
  .btn-primary:hover { background: #0d9488; }
  .btn-primary:disabled { opacity: .5; cursor: not-allowed; }
  .toast { display: flex; align-items: center; gap: .5rem; margin: .75rem 1.25rem 0; padding: .625rem .875rem; border-radius: .5rem; font-size: .78rem; }
  .toast-ok  { background: rgba(22,163,74,.08);  border: 1px solid rgba(22,163,74,.25);  color: #16a34a; }
  .toast-err { background: rgba(220,38,38,.08);  border: 1px solid rgba(220,38,38,.25);  color: #dc2626; }
  .activity-list { display: flex; flex-direction: column; padding: .5rem 0; max-height: 280px; overflow-y: auto; }
  .activity-item { display: flex; align-items: center; gap: .75rem; padding: .6rem 1.25rem; }
  .activity-item:hover { background: var(--color-surface-hover); }
  .ai-dot { width: 6px; height: 6px; border-radius: 50%; background: #14b8a6; flex-shrink: 0; }
  .ai-content { flex: 1; min-width: 0; }
  .ai-action { font-size: .8rem; font-weight: 600; color: var(--color-text); display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ai-entity { font-size: .7rem; color: var(--color-muted); }
  .ai-time { font-size: .7rem; color: var(--color-muted); white-space: nowrap; flex-shrink: 0; }
  @media (max-width: 900px) { .two-col { grid-template-columns: 1fr; } }
</style>