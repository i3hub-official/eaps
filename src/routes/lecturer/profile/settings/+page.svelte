<!-- src/routes/lecturer/profile/settings/+page.svelte -->
<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import {
    ChevronLeft, User, Settings, Bell, Lock,
    Moon, Sun, Monitor, Globe, Mail,
    AlertCircle, CheckCircle, Save, Eye, EyeOff,
    UserCircle, Phone, Briefcase, FileText,
    Shield,
    BellRing, BellOff, Volume2, VolumeX,
    Palette, Type, LogOut, Key, X, Link
  } from '@lucide/svelte';
  import { fly } from 'svelte/transition';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  const { user, preferences } = data;

  // ── Toast system ──────────────────────────────────────────────────────────
  type Toast = { id: number; message: string; type: 'info' | 'warn' | 'success' };
  let toasts = $state<Toast[]>([]);
  let toastId = 0;

  function showToast(message: string, type: Toast['type'] = 'info', duration = 3000) {
    const id = ++toastId;
    toasts = [...toasts, { id, message, type }];
    setTimeout(() => { toasts = toasts.filter(t => t.id !== id); }, duration);
  }

  // ── Tab state ─────────────────────────────────────────────────────────────
  type Tab = 'profile' | 'preferences' | 'notifications' | 'security';
  let activeTab = $state<Tab>('profile');

  // ── Form state ────────────────────────────────────────────────────────────
  let showCurrentPassword = $state(false);
  let showNewPassword = $state(false);
  let showConfirmPassword = $state(false);

  // ── Handle form responses ─────────────────────────────────────────────────
  $effect(() => {
    if (form) {
      if (form.success) {
        showToast(form.message || 'Updated successfully!', 'success');
      } else if (form.error) {
        showToast(form.error, 'warn');
      }
    }
  });

  // ── Tabs configuration ────────────────────────────────────────────────────
  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'preferences', label: 'Preferences', icon: Settings },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield }
  ];

  // ── Theme options ─────────────────────────────────────────────────────────
  const themeOptions = [
    { value: 'system', label: 'System', icon: Monitor },
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon }
  ];

  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'fr', label: 'French' },
    { value: 'es', label: 'Spanish' }
  ];

  const fontSizeOptions = [
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' }
  ];

  // ── Helpers ──────────────────────────────────────────────────────────────
  function getInitials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
</script>

<svelte:head><title>Settings — MOUAU eTest</title></svelte:head>

<!-- ── Toast stack ─────────────────────────────────────────────────────────── -->
<div class="toast-stack" aria-live="polite">
  {#each toasts as t (t.id)}
    <div class="toast toast-{t.type}"
      in:fly={{ y: 10, duration: 200 }}
      out:fly={{ y: -6, duration: 160 }}>
      {#if t.type === 'warn'}<AlertCircle size={13} />
      {:else if t.type === 'success'}<CheckCircle size={13} />
      {:else}<Settings size={13} />{/if}
      {t.message}
    </div>
  {/each}
</div>

<div class="page">
  <!-- Header -->
  <div class="page-header">
    <div class="header-top">
      <a href="/lecturer/profile" class="back-link">
        <ChevronLeft size={14} /> Back to Profile
      </a>
    </div>
    <div class="header-main">
      <div>
        <div class="header-badge">
          <Settings size={16} />
          <span>Settings</span>
        </div>
        <h1>Account Settings</h1>
        <p class="subtitle">Manage your profile, preferences, and security</p>
      </div>
    </div>
  </div>

  <!-- Tabs -->
  <nav class="tabs" aria-label="Settings sections">
    {#each tabs as tab}
      <button
        type="button"
        class="tab"
        class:active={activeTab === tab.id}
        onclick={() => activeTab = tab.id}
      >
        <tab.icon size={14} />
        <span>{tab.label}</span>
      </button>
    {/each}
  </nav>

  <!-- Content -->
  <div class="content">
    <!-- ── Profile Tab ─────────────────────────────────────────────────────── -->
    {#if activeTab === 'profile'}
      <form method="POST" action="?/updateProfile" use:enhance>
        <div class="card">
          <div class="card-header">
            <span class="card-icon"><User size={16} /></span>
            <div>
              <h2>Profile Information</h2>
              <p>Update your personal information</p>
            </div>
          </div>
          <div class="card-body">
            <div class="avatar-section">
              <div class="avatar">
                {getInitials(user?.fullName || 'L')}
              </div>
              <div class="avatar-info">
                <span class="avatar-name">{user?.fullName}</span>
                <span class="avatar-email">{user?.email}</span>
                <span class="avatar-role">Lecturer</span>
              </div>
            </div>

            <div class="two-col">
              <div class="field">
                <label for="fullName">Full Name <span class="req">*</span></label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={user?.fullName || ''}
                  required
                />
              </div>
              <div class="field">
                <label for="title">Title</label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  value={user?.title || ''}
                  placeholder="e.g. Dr., Prof."
                />
              </div>
            </div>

            <div class="two-col">
              <div class="field">
                <label for="phone">Phone Number</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={user?.phone || ''}
                  placeholder="e.g. 08012345678"
                />
              </div>
              <div class="field">
                <label for="bio">Bio</label>
                <textarea
                  id="bio"
                  name="bio"
                  rows="3"
                  placeholder="Tell us about yourself"
                >{user?.bio || ''}</textarea>
              </div>
            </div>

            <div class="field">
              <label>Social Links</label>
              <div class="social-inputs">
                <div class="social-input">
                  <X size={14} />
                  <input
                    name="twitter"
                    type="text"
                    value={user?.twitter || ''}
                    placeholder="X username"
                  />
                </div>
                <div class="social-input">
                  <Link size={14} />
                  <input
                    name="linkedin"
                    type="text"
                    value={user?.linkedin || ''}
                    placeholder="LinkedIn username"
                  />
                </div>
                <div class="social-input">
                  <Link size={14} />
                  <input
                    name="Link"
                    type="text"
                    value={user?.Link || ''}
                    placeholder="Link username"
                  />
                </div>
              </div>
            </div>

            <button type="submit" class="submit-btn">
              <Save size={16} /> Save Profile
            </button>
          </div>
        </div>
      </form>
    {/if}

    <!-- ── Preferences Tab ─────────────────────────────────────────────────── -->
    {#if activeTab === 'preferences'}
      <form method="POST" action="?/updatePreferences" use:enhance>
        <div class="card">
          <div class="card-header">
            <span class="card-icon"><Settings size={16} /></span>
            <div>
              <h2>Appearance & Language</h2>
              <p>Customize your experience</p>
            </div>
          </div>
          <div class="card-body">
            <div class="field">
              <label>Theme</label>
              <div class="option-group">
                {#each themeOptions as option}
                  <label class="option-card" class:selected={preferences?.theme === option.value}>
                    <input
                      type="radio"
                      name="theme"
                      value={option.value}
                      checked={preferences?.theme === option.value}
                    />
                    <option.icon size={20} />
                    <span>{option.label}</span>
                  </label>
                {/each}
              </div>
            </div>

            <div class="field">
              <label>Language</label>
              <select name="language">
                {#each languageOptions as option}
                  <option
                    value={option.value}
                    selected={preferences?.language === option.value}
                  >
                    {option.label}
                  </option>
                {/each}
              </select>
            </div>

            <div class="field">
              <label>Font Size</label>
              <div class="option-group">
                {#each fontSizeOptions as option}
                  <label class="option-card" class:selected={preferences?.fontSize === option.value}>
                    <input
                      type="radio"
                      name="fontSize"
                      value={option.value}
                      checked={preferences?.fontSize === option.value}
                    />
                    <span>{option.label}</span>
                  </label>
                {/each}
              </div>
            </div>

            <button type="submit" class="submit-btn">
              <Save size={16} /> Save Preferences
            </button>
          </div>
        </div>
      </form>
    {/if}

    <!-- ── Notifications Tab ───────────────────────────────────────────────── -->
    {#if activeTab === 'notifications'}
      <form method="POST" action="?/updateNotifications" use:enhance>
        <div class="card">
          <div class="card-header">
            <span class="card-icon"><Bell size={16} /></span>
            <div>
              <h2>Notification Preferences</h2>
              <p>Choose what notifications you receive</p>
            </div>
          </div>
          <div class="card-body">
            <div class="notification-options">
              <label class="toggle-row">
                <div class="toggle-text">
                  <span class="toggle-icon"><BellRing size={14} /></span>
                  <div>
                    <span class="toggle-label">Exam Notifications</span>
                    <span class="toggle-desc">Get notified about exam updates and schedules</span>
                  </div>
                </div>
                <div class="toggle-track" class:on={preferences?.notifications?.exam !== false}>
                  <input
                    type="checkbox"
                    name="examNotifications"
                    checked={preferences?.notifications?.exam !== false}
                  />
                  <span class="toggle-knob"></span>
                </div>
              </label>

              <label class="toggle-row">
                <div class="toggle-text">
                  <span class="toggle-icon"><FileText size={14} /></span>
                  <div>
                    <span class="toggle-label">Result Notifications</span>
                    <span class="toggle-desc">Get notified when results are published</span>
                  </div>
                </div>
                <div class="toggle-track" class:on={preferences?.notifications?.results !== false}>
                  <input
                    type="checkbox"
                    name="resultNotifications"
                    checked={preferences?.notifications?.results !== false}
                  />
                  <span class="toggle-knob"></span>
                </div>
              </label>

              <label class="toggle-row">
                <div class="toggle-text">
                  <span class="toggle-icon"><Shield size={14} /></span>
                  <div>
                    <span class="toggle-label">System Notifications</span>
                    <span class="toggle-desc">Get notified about system updates and alerts</span>
                  </div>
                </div>
                <div class="toggle-track" class:on={preferences?.notifications?.system !== false}>
                  <input
                    type="checkbox"
                    name="systemNotifications"
                    checked={preferences?.notifications?.system !== false}
                  />
                  <span class="toggle-knob"></span>
                </div>
              </label>
            </div>

            <button type="submit" class="submit-btn">
              <Save size={16} /> Save Notification Preferences
            </button>
          </div>
        </div>
      </form>
    {/if}

    <!-- ── Security Tab ────────────────────────────────────────────────────── -->
    {#if activeTab === 'security'}
      <div class="security-grid">
        <!-- Change Password -->
        <form method="POST" action="?/changePassword" use:enhance>
          <div class="card">
            <div class="card-header">
              <span class="card-icon"><Lock size={16} /></span>
              <div>
                <h2>Change Password</h2>
                <p>Update your password regularly to keep your account secure</p>
              </div>
            </div>
            <div class="card-body">
              <div class="field">
                <label for="currentPassword">Current Password <span class="req">*</span></label>
                <div class="password-wrap">
                  <input
                    id="currentPassword"
                    name="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter your current password"
                  />
                  <button
                    type="button"
                    class="toggle-password"
                    onclick={() => showCurrentPassword = !showCurrentPassword}
                  >
                    {#if showCurrentPassword}<EyeOff size={14} />{:else}<Eye size={14} />{/if}
                  </button>
                </div>
              </div>

              <div class="field">
                <label for="newPassword">New Password <span class="req">*</span></label>
                <div class="password-wrap">
                  <input
                    id="newPassword"
                    name="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter your new password"
                    minlength="8"
                  />
                  <button
                    type="button"
                    class="toggle-password"
                    onclick={() => showNewPassword = !showNewPassword}
                  >
                    {#if showNewPassword}<EyeOff size={14} />{:else}<Eye size={14} />{/if}
                  </button>
                </div>
                <span class="field-hint">Password must be at least 8 characters</span>
              </div>

              <div class="field">
                <label for="confirmPassword">Confirm New Password <span class="req">*</span></label>
                <div class="password-wrap">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="Confirm your new password"
                  />
                  <button
                    type="button"
                    class="toggle-password"
                    onclick={() => showConfirmPassword = !showConfirmPassword}
                  >
                    {#if showConfirmPassword}<EyeOff size={14} />{:else}<Eye size={14} />{/if}
                  </button>
                </div>
              </div>

              <button type="submit" class="submit-btn">
                <Key size={16} /> Change Password
              </button>
            </div>
          </div>
        </form>

        <!-- Session Management -->
        <div class="card">
          <div class="card-header">
            <span class="card-icon"><LogOut size={16} /></span>
            <div>
              <h2>Active Sessions</h2>
              <p>Manage your active sessions</p>
            </div>
          </div>
          <div class="card-body">
            <div class="session-item">
              <div class="session-info">
                <span class="session-device">Current Session</span>
                <span class="session-detail">This device • Active now</span>
              </div>
              <span class="session-status active">Active</span>
            </div>
            <div class="session-item">
              <div class="session-info">
                <span class="session-device">Chrome on Windows</span>
                <span class="session-detail">Last active 2 hours ago</span>
              </div>
              <button class="session-end">End</button>
            </div>
            <div class="session-item">
              <div class="session-info">
                <span class="session-device">Safari on iPhone</span>
                <span class="session-detail">Last active 1 day ago</span>
              </div>
              <button class="session-end">End</button>
            </div>
            <button class="end-all-btn">End All Sessions</button>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .toast-stack {
    position: fixed; bottom: 1.5rem; right: 1.5rem;
    z-index: 9999; display: flex; flex-direction: column; gap: .35rem;
    pointer-events: none;
  }
  .toast {
    display: inline-flex; align-items: center; gap: .45rem;
    padding: .5rem .9rem; border-radius: .55rem;
    font-size: .79rem; font-weight: 600; white-space: nowrap;
    box-shadow: 0 4px 14px rgba(0,0,0,.1); max-width: 300px;
    pointer-events: auto;
  }
  .toast-info { background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); }
  .toast-warn { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
  .toast-success { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }

  .page {
    padding: 2rem;
    max-width: 900px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .page-header {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    padding: 1.5rem;
  }

  .header-top {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 0.75rem;
  }

  .back-link {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-size: 0.8rem; font-weight: 600; color: var(--color-muted);
    text-decoration: none; transition: color 0.15s;
  }
  .back-link:hover { color: var(--color-text); }

  .header-badge {
    display: inline-flex; align-items: center; gap: 0.4rem;
    font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.05em; color: var(--color-muted);
    padding: 0.2rem 0.6rem;
    background: var(--color-bg); border-radius: 999px;
    margin-bottom: 0.5rem;
  }

  .header-main h1 {
    font-size: 1.5rem; font-weight: 800; color: var(--color-text);
    margin: 0;
  }

  .subtitle {
    font-size: 0.8rem; color: var(--color-muted); margin: 0.2rem 0 0;
  }

  .tabs {
    display: flex; gap: 0.25rem;
    padding: 0.25rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    flex-wrap: wrap;
  }

  .tab {
    display: flex; align-items: center; gap: 0.4rem;
    padding: 0.55rem 1rem;
    border-radius: 0.5rem;
    border: none; background: none;
    color: var(--color-muted);
    font-size: 0.8rem; font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
  }
  .tab:hover { color: var(--color-text); background: var(--color-bg); }
  .tab.active {
    background: var(--lc-soft);
    color: var(--lc-600);
  }

  .content { display: flex; flex-direction: column; gap: 1.5rem; }

  .card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    overflow: visible;
  }

  .card-header {
    display: flex; align-items: flex-start; gap: 0.75rem;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg);
    border-radius: 1rem 1rem 0 0;
  }

  .card-icon {
    width: 32px; height: 32px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    background: var(--lc-soft); border-radius: 0.5rem;
    color: var(--lc-600);
  }

  .card-header h2 {
    font-size: 0.85rem; font-weight: 700; color: var(--color-text);
    margin: 0 0 0.15rem;
  }
  .card-header p {
    font-size: 0.73rem; color: var(--color-muted); margin: 0;
  }

  .card-body {
    padding: 1.125rem 1.25rem;
    display: flex; flex-direction: column; gap: 0.875rem;
  }

  .field {
    display: flex; flex-direction: column; gap: 0.35rem;
  }
  .field label {
    font-size: 0.8rem; font-weight: 600; color: var(--color-text);
  }

  .req { color: #ef4444; }
  .field-hint {
    font-size: 0.72rem; color: var(--color-muted);
  }

  .two-col {
    display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;
  }

  .field input, .field select, .field textarea {
    padding: 0.575rem 0.875rem;
    border: 1px solid var(--color-border);
    border-radius: 0.6rem;
    background: var(--color-bg);
    color: var(--color-text);
    font-size: 0.875rem;
    font-family: inherit;
    outline: none;
    width: 100%;
    box-sizing: border-box;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .field input:focus, .field select:focus, .field textarea:focus {
    border-color: var(--lc-600);
    box-shadow: 0 0 0 3px var(--lc-soft);
  }

  .avatar-section {
    display: flex; align-items: center; gap: 1rem;
    padding: 1rem;
    background: var(--color-bg);
    border-radius: 0.75rem;
    border: 1px solid var(--color-border);
  }

  .avatar {
    width: 64px; height: 64px; border-radius: 50%;
    background: linear-gradient(135deg, var(--lc-700), var(--lc-600));
    display: flex; align-items: center; justify-content: center;
    font-size: 1.5rem; font-weight: 800; color: white;
    flex-shrink: 0;
  }

  .avatar-info { display: flex; flex-direction: column; }
  .avatar-name { font-size: 1rem; font-weight: 700; color: var(--color-text); }
  .avatar-email { font-size: 0.8rem; color: var(--color-muted); }
  .avatar-role {
    font-size: 0.65rem; font-weight: 600; color: var(--lc-600);
    background: var(--lc-soft); padding: 0.1rem 0.5rem;
    border-radius: 999px; width: fit-content; margin-top: 0.2rem;
  }

  .social-inputs {
    display: flex; flex-direction: column; gap: 0.5rem;
  }

  .social-input {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.3rem 0.6rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    color: var(--color-muted);
  }
  .social-input input {
    flex: 1; background: none; border: none; outline: none;
    padding: 0.3rem 0;
    font-size: 0.8rem; color: var(--color-text);
    font-family: inherit;
  }

  .option-group {
    display: flex; gap: 0.5rem; flex-wrap: wrap;
  }

  .option-card {
    display: flex; align-items: center; gap: 0.4rem;
    padding: 0.5rem 0.875rem;
    border: 2px solid var(--color-border);
    border-radius: 0.6rem;
    background: var(--color-bg);
    cursor: pointer;
    transition: all 0.15s;
    font-size: 0.8rem; font-weight: 600;
    color: var(--color-text);
  }
  .option-card:hover { border-color: var(--lc-600); }
  .option-card.selected {
    border-color: var(--lc-600);
    background: var(--lc-soft);
  }
  .option-card input { display: none; }

  .toggle-row {
    display: flex; align-items: center; justify-content: space-between;
    gap: 1rem; padding: 0.5rem 0;
    border-bottom: 1px solid var(--color-border);
    cursor: pointer;
  }
  .toggle-row:last-child { border-bottom: none; }

  .toggle-text {
    display: flex; align-items: flex-start; gap: 0.75rem;
  }

  .toggle-icon {
    width: 28px; height: 28px; border-radius: 0.4rem;
    flex-shrink: 0; margin-top: 0.05rem;
    display: flex; align-items: center; justify-content: center;
    background: var(--color-bg); border: 1px solid var(--color-border);
    color: var(--color-muted);
  }

  .toggle-label {
    display: block; font-size: 0.83rem; font-weight: 600;
    color: var(--color-text); margin-bottom: 0.1rem;
  }
  .toggle-desc {
    display: block; font-size: 0.73rem; color: var(--color-muted);
  }

  .toggle-track {
    position: relative; width: 40px; height: 22px; flex-shrink: 0;
  }
  .toggle-track input {
    position: absolute; opacity: 0; width: 0; height: 0;
    pointer-events: none;
  }
  .toggle-knob {
    position: absolute; inset: 0; background: var(--color-border);
    border-radius: 999px; transition: background 0.2s; cursor: pointer;
  }
  .toggle-knob::after {
    content: ''; position: absolute; width: 16px; height: 16px;
    top: 3px; left: 3px; background: white; border-radius: 50%;
    transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  }
  .toggle-track.on .toggle-knob { background: var(--lc-600); }
  .toggle-track.on .toggle-knob::after { transform: translateX(18px); }

  .password-wrap {
    position: relative; display: flex; align-items: center;
  }
  .password-wrap input { padding-right: 2.5rem; }
  .toggle-password {
    position: absolute; right: 0.5rem;
    background: none; border: none;
    color: var(--color-muted); cursor: pointer;
    padding: 0.2rem;
  }
  .toggle-password:hover { color: var(--color-text); }

  .submit-btn {
    padding: 0.75rem;
    background: var(--lc-600); color: white;
    border: none; border-radius: 0.6rem;
    font-size: 0.9rem; font-weight: 700;
    cursor: pointer;
    transition: background 0.15s, transform 0.15s;
    display: flex; align-items: center; justify-content: center; gap: 0.5rem;
    margin-top: 0.5rem;
  }
  .submit-btn:hover { background: var(--lc-700); transform: translateY(-1px); }

  .security-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;
  }

  .session-item {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0.5rem 0.75rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
  }

  .session-info { display: flex; flex-direction: column; }
  .session-device { font-weight: 600; color: var(--color-text); }
  .session-detail { font-size: 0.7rem; color: var(--color-muted); }

  .session-status {
    font-size: 0.65rem; font-weight: 700; padding: 0.1rem 0.5rem;
    border-radius: 999px;
  }
  .session-status.active {
    background: rgba(22,163,74,0.08); color: #16a34a;
  }

  .session-end {
    padding: 0.2rem 0.6rem;
    border: 1px solid var(--color-border);
    border-radius: 0.3rem;
    background: var(--color-bg);
    color: var(--color-muted);
    font-size: 0.7rem; font-weight: 600;
    cursor: pointer; font-family: inherit;
    transition: all 0.15s;
  }
  .session-end:hover { border-color: #dc2626; color: #dc2626; }

  .end-all-btn {
    padding: 0.5rem;
    border: 1px solid #dc2626;
    border-radius: 0.4rem;
    background: transparent;
    color: #dc2626;
    font-size: 0.75rem; font-weight: 600;
    cursor: pointer; font-family: inherit;
    transition: all 0.15s;
  }
  .end-all-btn:hover { background: #dc2626; color: white; }

  @media (max-width: 768px) {
    .page { padding: 1rem; }
    .header-top { flex-direction: column; gap: 0.5rem; align-items: stretch; }
    .two-col { grid-template-columns: 1fr; }
    .security-grid { grid-template-columns: 1fr; }
    .tabs { flex-direction: column; }
    .tab { justify-content: center; }
    .option-group { flex-direction: column; }
    .option-card { justify-content: center; }
    .avatar-section { flex-direction: column; text-align: center; }
    .avatar-info { align-items: center; }
  }
</style>