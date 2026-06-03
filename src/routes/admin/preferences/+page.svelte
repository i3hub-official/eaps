<!-- src/routes/admin/preferences/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { onMount } from 'svelte';
  import {
    Settings, Monitor, Bell, Shield, Layout, Palette,
    CheckCircle, Save, RefreshCw, Sun, Moon, Eye,
    BellOff, BellRing, ToggleLeft, Sliders
  } from 'lucide-svelte';

  let { data }: { data: PageData } = $props();

  // ── Default preferences ──────────────────────────────────────────
  type Prefs = {
    theme: 'light' | 'dark' | 'system';
    sidebarCompact: boolean;
    showQuickActions: boolean;
    animationsReduced: boolean;
    tableRowDensity: 'comfortable' | 'compact' | 'spacious';
    defaultDateFormat: 'DMY' | 'MDY' | 'YMD';
    notifyOnViolation: boolean;
    notifyOnExamStart: boolean;
    notifyOnNewUser: boolean;
    notifyOnFailedLogin: boolean;
    sessionTimeoutMinutes: number;
    requireConfirmOnDelete: boolean;
    showBreadcrumbs: boolean;
    defaultReportsRange: '7d' | '30d' | '90d' | '1y';
  };

  const DEFAULTS: Prefs = {
    theme: 'system',
    sidebarCompact: false,
    showQuickActions: true,
    animationsReduced: false,
    tableRowDensity: 'comfortable',
    defaultDateFormat: 'DMY',
    notifyOnViolation: true,
    notifyOnExamStart: true,
    notifyOnNewUser: false,
    notifyOnFailedLogin: true,
    sessionTimeoutMinutes: 30,
    requireConfirmOnDelete: true,
    showBreadcrumbs: true,
    defaultReportsRange: '30d',
  };

  let prefs = $state<Prefs>({ ...DEFAULTS });
  let saved = $state(false);
  let dirty = $state(false);

  onMount(() => {
    try {
      const stored = localStorage.getItem('admin:preferences');
      if (stored) Object.assign(prefs, JSON.parse(stored));
    } catch {}
  });

  function save() {
    try { localStorage.setItem('admin:preferences', JSON.stringify(prefs)); }
    catch {}
    saved = true;
    dirty = false;
    setTimeout(() => saved = false, 2500);
  }

  function reset() {
    prefs = { ...DEFAULTS };
    dirty = true;
  }

  function touch() { dirty = true; }

  // Toggle helper for boolean prefs
  function toggle(key: keyof Prefs) {
    (prefs as any)[key] = !(prefs as any)[key];
    touch();
  }
</script>

<div class="prefs-page">

  <!-- Header -->
  <div class="page-header">
    <div class="ph-icon"><Settings size={20} /></div>
    <div>
      <h1>Preferences</h1>
      <p>Customize your admin panel experience. Settings are saved locally.</p>
    </div>
    <div class="ph-actions">
      {#if saved}
        <div class="save-confirm"><CheckCircle size={14} /> Saved</div>
      {/if}
      <button class="btn-ghost" onclick={reset}><RefreshCw size={13} /> Reset defaults</button>
      <button class="btn-primary" onclick={save} disabled={!dirty && !saved}>
        <Save size={14} /> Save Preferences
      </button>
    </div>
  </div>

  <div class="prefs-grid">

    <!-- Appearance -->
    <div class="card">
      <div class="card-head"><Palette size={15} /> Appearance</div>
      <div class="pref-rows">

        <div class="pref-row">
          <div class="pr-label">
            <span>Theme</span>
            <span class="pr-desc">Light, dark, or follow system setting</span>
          </div>
          <div class="segmented">
            {#each [
              { val: 'light',  icon: Sun,     label: 'Light'  },
              { val: 'system', icon: Monitor, label: 'System' },
              { val: 'dark',   icon: Moon,    label: 'Dark'   },
            ] as opt}
              <button
                class="seg-btn"
                class:seg-active={prefs.theme === opt.val}
                onclick={() => { prefs.theme = opt.val as any; touch(); }}
              >
                <opt.icon size={13} /> {opt.label}
              </button>
            {/each}
          </div>
        </div>

        <div class="pref-row">
          <div class="pr-label">
            <span>Table row density</span>
            <span class="pr-desc">Controls spacing in data tables</span>
          </div>
          <div class="segmented">
            {#each ['compact','comfortable','spacious'] as d}
              <button
                class="seg-btn"
                class:seg-active={prefs.tableRowDensity === d}
                onclick={() => { prefs.tableRowDensity = d as any; touch(); }}
              >{d.charAt(0).toUpperCase() + d.slice(1)}</button>
            {/each}
          </div>
        </div>

        <div class="pref-row">
          <div class="pr-label">
            <span>Reduce animations</span>
            <span class="pr-desc">Disables transitions and motion effects</span>
          </div>
          <button class="toggle" class:on={prefs.animationsReduced} onclick={() => toggle('animationsReduced')} aria-label="Toggle">
            <div class="toggle-thumb"></div>
          </button>
        </div>

      </div>
    </div>

    <!-- Layout -->
    <div class="card">
      <div class="card-head"><Layout size={15} /> Layout & Navigation</div>
      <div class="pref-rows">

        <div class="pref-row">
          <div class="pr-label">
            <span>Compact sidebar</span>
            <span class="pr-desc">Show only icons in the sidebar</span>
          </div>
          <button class="toggle" class:on={prefs.sidebarCompact} onclick={() => toggle('sidebarCompact')} aria-label="Toggle">
            <div class="toggle-thumb"></div>
          </button>
        </div>

        <div class="pref-row">
          <div class="pr-label">
            <span>Show quick actions</span>
            <span class="pr-desc">Floating action buttons at the bottom right</span>
          </div>
          <button class="toggle" class:on={prefs.showQuickActions} onclick={() => toggle('showQuickActions')} aria-label="Toggle">
            <div class="toggle-thumb"></div>
          </button>
        </div>

        <div class="pref-row">
          <div class="pr-label">
            <span>Show breadcrumbs</span>
            <span class="pr-desc">Navigation trail in the top bar</span>
          </div>
          <button class="toggle" class:on={prefs.showBreadcrumbs} onclick={() => toggle('showBreadcrumbs')} aria-label="Toggle">
            <div class="toggle-thumb"></div>
          </button>
        </div>

        <div class="pref-row">
          <div class="pr-label">
            <span>Default date format</span>
            <span class="pr-desc">How dates display throughout the panel</span>
          </div>
          <select bind:value={prefs.defaultDateFormat} onchange={touch}>
            <option value="DMY">DD/MM/YYYY</option>
            <option value="MDY">MM/DD/YYYY</option>
            <option value="YMD">YYYY-MM-DD</option>
          </select>
        </div>

        <div class="pref-row">
          <div class="pr-label">
            <span>Default reports range</span>
            <span class="pr-desc">Pre-selected time range on report pages</span>
          </div>
          <select bind:value={prefs.defaultReportsRange} onchange={touch}>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last 1 year</option>
          </select>
        </div>

      </div>
    </div>

    <!-- Notifications -->
    <div class="card">
      <div class="card-head"><Bell size={15} /> Notification Preferences</div>
      <div class="pref-rows">
        {#each [
          { key: 'notifyOnViolation',   label: 'Exam violations',      desc: 'Alert when a student exceeds violation threshold' },
          { key: 'notifyOnExamStart',   label: 'Exam starts',          desc: 'Alert when a scheduled exam goes live' },
          { key: 'notifyOnNewUser',     label: 'New user registration', desc: 'Alert when a new account is created' },
          { key: 'notifyOnFailedLogin', label: 'Failed login attempts', desc: 'Alert on suspicious login activity' },
        ] as item}
          <div class="pref-row">
            <div class="pr-label">
              <span>{item.label}</span>
              <span class="pr-desc">{item.desc}</span>
            </div>
            <button
              class="toggle"
              class:on={(prefs as any)[item.key]}
              onclick={() => toggle(item.key as keyof Prefs)}
              aria-label="Toggle"
            >
              <div class="toggle-thumb"></div>
            </button>
          </div>
        {/each}
      </div>
    </div>

    <!-- Security -->
    <div class="card">
      <div class="card-head"><Shield size={15} /> Security & Safety</div>
      <div class="pref-rows">

        <div class="pref-row">
          <div class="pr-label">
            <span>Session timeout</span>
            <span class="pr-desc">Auto-logout after inactivity (minutes)</span>
          </div>
          <div class="number-input-wrap">
            <button onclick={() => { if (prefs.sessionTimeoutMinutes > 5) { prefs.sessionTimeoutMinutes -= 5; touch(); } }}>−</button>
            <span class="number-val">{prefs.sessionTimeoutMinutes}</span>
            <button onclick={() => { if (prefs.sessionTimeoutMinutes < 120) { prefs.sessionTimeoutMinutes += 5; touch(); } }}>+</button>
          </div>
        </div>

        <div class="pref-row">
          <div class="pr-label">
            <span>Confirm before deleting</span>
            <span class="pr-desc">Show a confirmation dialog for destructive actions</span>
          </div>
          <button class="toggle" class:on={prefs.requireConfirmOnDelete} onclick={() => toggle('requireConfirmOnDelete')} aria-label="Toggle">
            <div class="toggle-thumb"></div>
          </button>
        </div>

      </div>
    </div>

  </div>
</div>

<style>
  .prefs-page { display: flex; flex-direction: column; gap: 1.5rem; }

  .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
  .ph-icon { width: 44px; height: 44px; border-radius: .75rem; background: linear-gradient(135deg,#8b5cf6,#7c3aed); display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; }
  h1 { font-size: 1.2rem; font-weight: 800; color: var(--color-text); }
  p  { font-size: .8rem; color: var(--color-muted); }
  .ph-actions { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }

  .btn-primary { display: flex; align-items: center; gap: .5rem; padding: .55rem 1.1rem; background: #8b5cf6; color: white; border: none; border-radius: .5rem; font-size: .82rem; font-weight: 600; cursor: pointer; font-family: inherit; transition: background .15s; }
  .btn-primary:hover { background: #7c3aed; }
  .btn-primary:disabled { opacity: .5; cursor: not-allowed; }
  .btn-ghost { display: flex; align-items: center; gap: .5rem; padding: .5rem .875rem; background: transparent; border: 1px solid var(--color-border); color: var(--color-text); border-radius: .5rem; font-size: .8rem; font-weight: 600; cursor: pointer; font-family: inherit; }
  .btn-ghost:hover { background: var(--color-surface-hover); }

  .save-confirm { display: flex; align-items: center; gap: .375rem; font-size: .8rem; font-weight: 600; color: #16a34a; }

  .prefs-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(420px, 1fr)); gap: 1rem; }

  /* Card */
  .card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: .875rem; overflow: hidden; }
  .card-head { display: flex; align-items: center; gap: .5rem; padding: .875rem 1.25rem; border-bottom: 1px solid var(--color-border); font-size: .85rem; font-weight: 700; color: var(--color-text); background: var(--color-bg); }

  /* Preference rows */
  .pref-rows { display: flex; flex-direction: column; }
  .pref-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: .875rem 1.25rem; border-bottom: 1px solid var(--color-border); }
  .pref-row:last-child { border-bottom: none; }
  .pr-label { display: flex; flex-direction: column; gap: .2rem; flex: 1; min-width: 0; }
  .pr-label span:first-child { font-size: .83rem; font-weight: 600; color: var(--color-text); }
  .pr-desc { font-size: .72rem; color: var(--color-muted); line-height: 1.35; }

  /* Segmented control */
  .segmented { display: flex; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: .5rem; padding: .2rem; gap: .1rem; }
  .seg-btn { display: flex; align-items: center; gap: .35rem; padding: .35rem .625rem; border: none; background: none; border-radius: .375rem; font-size: .72rem; font-weight: 500; color: var(--color-muted); cursor: pointer; font-family: inherit; transition: all .15s; white-space: nowrap; }
  .seg-btn:hover { color: var(--color-text); }
  .seg-active { background: var(--color-surface); color: var(--color-text); font-weight: 700; box-shadow: 0 1px 4px rgba(0,0,0,.1); }

  /* Toggle switch */
  .toggle {
    width: 40px; height: 22px; border-radius: 11px;
    background: var(--color-border); border: none; cursor: pointer;
    position: relative; transition: background .2s; flex-shrink: 0; padding: 0;
  }
  .toggle.on { background: #8b5cf6; }
  .toggle-thumb {
    position: absolute; top: 2px; left: 2px;
    width: 18px; height: 18px; border-radius: 50%;
    background: white; transition: transform .2s;
    box-shadow: 0 1px 4px rgba(0,0,0,.2);
  }
  .toggle.on .toggle-thumb { transform: translateX(18px); }

  /* Select */
  select { padding: .4rem .75rem; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: .5rem; font-size: .78rem; color: var(--color-text); font-family: inherit; cursor: pointer; outline: none; -webkit-appearance: none; min-width: 140px; }
  select:focus { border-color: #8b5cf6; }

  /* Number input */
  .number-input-wrap { display: flex; align-items: center; gap: .5rem; }
  .number-input-wrap button { width: 28px; height: 28px; border-radius: .375rem; border: 1px solid var(--color-border); background: var(--color-bg); font-size: 1.1rem; cursor: pointer; font-family: inherit; color: var(--color-text); display: flex; align-items: center; justify-content: center; line-height: 1; transition: all .15s; }
  .number-input-wrap button:hover { background: var(--color-surface-hover); border-color: #8b5cf6; }
  .number-val { font-size: .85rem; font-weight: 700; color: var(--color-text); min-width: 32px; text-align: center; }

  @media (max-width: 640px) {
    .prefs-grid { grid-template-columns: 1fr; }
    .pref-row { flex-direction: column; align-items: flex-start; }
  }
</style>