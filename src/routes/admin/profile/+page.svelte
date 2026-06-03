<!-- src/routes/admin/profile/+page.svelte -->
<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import {
    User, Mail, Phone, Lock, Shield, Activity,
    Calendar, CheckCircle, AlertCircle, Edit, Key,
    Building2, BookOpen, Hash, Clock
  } from 'lucide-svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  const { user, recentActivity } = data;

  let editingProfile = $state(false);
  let loadingProfile = $state(false);
  let loadingPassword = $state(false);

  function fmt(d: Date | string | null, withTime = false) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-NG', {
      day: '2-digit', month: 'short', year: 'numeric',
      ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    });
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
</script>

<div class="profile-page">

  <!-- Page header -->
  <div class="page-header">
    <div class="ph-icon"><User size={20} /></div>
    <div>
      <h1>My Profile</h1>
      <p>Manage your account details and security settings</p>
    </div>
  </div>

  <div class="two-col">

    <!-- ── Left column ──────────────────────────────────────── -->
    <div class="left-col">

      <!-- Identity card -->
      <div class="identity-card">
        <div class="id-avatar">{user?.fullName?.charAt(0)?.toUpperCase() ?? 'A'}</div>
        <div class="id-name">{user?.fullName}</div>
        <div class="id-email">{user?.email}</div>
        <div class="id-badges">
          <span class="badge badge-admin"><Shield size={11} /> Administrator</span>
          <span class="badge badge-active">Active</span>
        </div>
        <div class="id-stats">
          <div class="id-stat">
            <span class="is-val">{user?._count.auditLogs ?? 0}</span>
            <span class="is-lbl">Actions logged</span>
          </div>
          <div class="id-stat">
            <span class="is-val">{fmt(user?.createdAt)}</span>
            <span class="is-lbl">Member since</span>
          </div>
        </div>
      </div>

      <!-- Quick info -->
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
            { icon: Clock,     label: 'Updated',    val: fmt(user?.updatedAt) },
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

    <!-- ── Right column ─────────────────────────────────────── -->
    <div class="right-col">

      <!-- Edit profile -->
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
            use:enhance={() => {
              loadingProfile = true;
              return async ({ update }) => { loadingProfile = false; editingProfile = false; await update(); };
            }}
            class="card-form"
          >
            <div class="field">
              <label for="fullName">Full Name</label>
              <input id="fullName" name="fullName" value={user?.fullName} required />
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
          <div class="card-placeholder">
            <p>Click <strong>Edit</strong> to update your name and phone number.</p>
          </div>
        {/if}
      </div>

      <!-- Change password -->
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

      <!-- Recent activity -->
      <div class="card">
        <div class="card-head"><Activity size={14} /> Recent Activity</div>
        {#if recentActivity.length === 0}
          <p class="card-empty">No recent activity.</p>
        {:else}
          <div class="activity-list">
            {#each recentActivity as log}
              <div class="activity-item">
                <div class="ai-dot"></div>
                <div class="ai-content">
                  <span class="ai-action">{log.action}</span>
                  {#if log.entity}<span class="ai-entity">{log.entity}{log.entityId ? ` · ${log.entityId.slice(0,8)}…` : ''}</span>{/if}
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
  .ph-icon {
    width: 44px; height: 44px; border-radius: .75rem;
    background: linear-gradient(135deg,#6366f1,#4f46e5);
    display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0;
  }
  h1 { font-size: 1.2rem; font-weight: 800; color: var(--color-text); }
  p  { font-size: .8rem; color: var(--color-muted); }

  /* Layout */
  .two-col { display: grid; grid-template-columns: 280px 1fr; gap: 1.25rem; align-items: start; }
  .left-col, .right-col { display: flex; flex-direction: column; gap: 1rem; }

  /* Identity card */
  .identity-card {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: .875rem; padding: 1.75rem 1.25rem;
    display: flex; flex-direction: column; align-items: center; gap: .625rem; text-align: center;
  }
  .id-avatar {
    width: 64px; height: 64px; border-radius: 50%;
    background: linear-gradient(135deg,#6366f1,#4f46e5);
    display: flex; align-items: center; justify-content: center;
    font-weight: 800; font-size: 1.6rem; color: white;
  }
  .id-name  { font-size: 1rem; font-weight: 800; color: var(--color-text); }
  .id-email { font-size: .75rem; color: var(--color-muted); }
  .id-badges { display: flex; gap: .375rem; flex-wrap: wrap; justify-content: center; }
  .badge { font-size: .65rem; font-weight: 700; padding: .25rem .625rem; border-radius: 2rem; }
  .badge-admin  { background: rgba(220,38,38,.1);  color: #dc2626; }
  .badge-active { background: rgba(22,163,74,.1);  color: #16a34a; }
  .id-stats { display: flex; gap: 1.5rem; margin-top: .5rem; }
  .id-stat { display: flex; flex-direction: column; gap: .15rem; }
  .is-val { font-size: .85rem; font-weight: 700; color: var(--color-text); }
  .is-lbl { font-size: .65rem; color: var(--color-muted); }

  /* Card */
  .card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: .875rem; overflow: hidden; }
  .card-head {
    display: flex; align-items: center; gap: .5rem;
    padding: .875rem 1.25rem; border-bottom: 1px solid var(--color-border);
    font-size: .85rem; font-weight: 700; color: var(--color-text); background: var(--color-bg);
  }
  .head-toggle {
    margin-left: auto; background: none; border: 1px solid var(--color-border); border-radius: .375rem;
    padding: .2rem .625rem; font-size: .72rem; font-weight: 600; cursor: pointer; font-family: inherit; color: var(--color-text);
  }
  .head-toggle:hover { background: var(--color-surface-hover); }
  .card-empty { padding: 1.25rem; font-size: .82rem; color: var(--color-muted); text-align: center; }
  .card-placeholder { padding: 1.25rem; font-size: .82rem; color: var(--color-muted); }

  /* Detail rows */
  .detail-rows { display: flex; flex-direction: column; }
  .detail-row {
    display: flex; align-items: center; gap: .75rem;
    padding: .6rem 1.25rem; font-size: .8rem;
    border-bottom: 1px solid var(--color-border);
    transition: background .1s;
  }
  .detail-row:last-child { border-bottom: none; }
  .detail-row:hover { background: var(--color-surface-hover); }
  .detail-row :global(svg) { color: var(--color-muted); flex-shrink: 0; }
  .dr-label { color: var(--color-muted); font-size: .73rem; min-width: 80px; }
  .dr-val   { color: var(--color-text); font-size: .8rem; }

  /* Form */
  .card-form { display: flex; flex-direction: column; gap: 1rem; padding: 1.25rem; }
  .field { display: flex; flex-direction: column; gap: .35rem; }
  label { font-size: .78rem; font-weight: 600; color: var(--color-text); }
  input {
    padding: .6rem .875rem; background: var(--color-bg);
    border: 1px solid var(--color-border); border-radius: .5rem;
    font-size: .82rem; color: var(--color-text); font-family: inherit; outline: none;
    transition: border-color .15s;
  }
  input:focus { border-color: #6366f1; }
  .form-foot { display: flex; justify-content: flex-end; padding-top: .25rem; }

  /* Buttons */
  .btn-primary {
    display: flex; align-items: center; gap: .5rem;
    padding: .575rem 1.25rem; background: #6366f1; color: white;
    border: none; border-radius: .5rem; font-size: .82rem; font-weight: 600;
    cursor: pointer; font-family: inherit; transition: background .15s;
  }
  .btn-primary:hover { background: #4f46e5; }
  .btn-primary:disabled { opacity: .5; cursor: not-allowed; }

  /* Toast */
  .toast {
    display: flex; align-items: center; gap: .5rem;
    margin: .75rem 1.25rem 0; padding: .625rem .875rem;
    border-radius: .5rem; font-size: .78rem;
  }
  .toast-ok  { background: rgba(22,163,74,.08);  border: 1px solid rgba(22,163,74,.25);  color: #16a34a; }
  .toast-err { background: rgba(220,38,38,.08);  border: 1px solid rgba(220,38,38,.25);  color: #dc2626; }

  /* Activity */
  .activity-list { display: flex; flex-direction: column; padding: .5rem 0; max-height: 320px; overflow-y: auto; }
  .activity-item { display: flex; align-items: center; gap: .75rem; padding: .6rem 1.25rem; transition: background .1s; }
  .activity-item:hover { background: var(--color-surface-hover); }
  .ai-dot { width: 6px; height: 6px; border-radius: 50%; background: #6366f1; flex-shrink: 0; }
  .ai-content { flex: 1; min-width: 0; }
  .ai-action { font-size: .8rem; font-weight: 600; color: var(--color-text); display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ai-entity { font-size: .7rem; color: var(--color-muted); }
  .ai-time { font-size: .7rem; color: var(--color-muted); white-space: nowrap; flex-shrink: 0; }

  @media (max-width: 900px) {
    .two-col { grid-template-columns: 1fr; }
  }
</style>