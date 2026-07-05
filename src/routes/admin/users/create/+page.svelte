<!-- src/routes/admin/users/create/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import {
    Building2, Mail, IdCard, AlertCircle, Calendar, Clock,
Award, BookMarked, FileText, Activity,
Download, RefreshCw, Filter, ChevronDown,
Edit3, Eye, Ban, CheckCircle, Phone, Briefcase,
    UserCog, UserCheck, Crown, Users, Shield, BookOpen, ShieldCheck, ShieldAlert,
    ArrowRight,CircleAlert,ClipboardList,
  } from '@lucide/svelte';

  let mounted = $state(false);
  onMount(() => requestAnimationFrame(() => { mounted = true; }));

  const roles = [
    {
      href:   '/admin/users/create/lecturer',
      label:  'Lecturer',
      icon:   BookOpen,
      desc:   'Creates and manages course exams.',
      badge:  'Academic',
      accent: '#6366f1',
      bg:     'rgba(99,102,241,0.08)',
    },
    {
      href:   '/admin/users/create/hod',
      label:  'Head of Department',
      icon:   Users,
      desc:   'Manages a department. May also lecture.',
      badge:  'Management',
      accent: '#f59e0b',
      bg:     'rgba(245,158,11,0.08)',
    },
    {
      href:   '/admin/users/create/dean',
      label:  'Dean',
      icon:   Building2,
      desc:   'Oversees a faculty/college.',
      badge:  'Governance',
      accent: '#10b981',
      bg:     'rgba(16,185,129,0.08)',
    },
    {
      href:   '/admin/users/create/exam-officer',
      label:  'Exam Officer',
      icon:   ClipboardList,
      desc:   'Full access to schedules and results.',
      badge:  'Operations',
      accent: '#0ea5e9',
      bg:     'rgba(14,165,233,0.08)',
    },
    {
      href:   '/admin/users/create/invigilator',
      label:  'Invigilator',
      icon:   ShieldCheck,
      desc:   'Monitors live exam sessions.',
      badge:  'Proctoring',
      accent: '#f97316',
      bg:     'rgba(249,115,22,0.08)',
    },
    {
      href:   '/admin/users/create/vc-dvc',
      label:  'VC / DVC',
      icon:   Crown,
      desc:   'Dashboard and reports only.',
      badge:  'Executive',
      accent: '#8b5cf6',
      bg:     'rgba(139,92,246,0.08)',
    },
    {
      href:   '/admin/users/create/admin',
      label:  'Admin',
      icon:   Shield,
      desc:   'Full system access. Manages all users.',
      badge:  'System',
      accent: '#3b82f6',
      bg:     'rgba(59,130,246,0.08)',
    },
  ];
</script>

<div class="hub" class:mounted>
  <div class="hub-header">
    <h1>Create user</h1>
    <p>Select a role to open its creation form.</p>
  </div>

   <div class="role-grid">
    {#each roles as r, i}
      <a                   
        href={r.href}
        class="role-card"
        style="--rc-accent: {r.accent}; --rc-bg: {r.bg}; --delay: {0.05 + i * 0.05}s"
      >
        <div class="rc-top">
          <div class="rc-icon">
            <svelte:component this={r.icon} size={18} />
          </div>
          <div class="rc-arrow-wrap">
            <ArrowRight size={14} />
          </div>
        </div>
        <div class="rc-body">
          <p class="rc-label">{r.label}</p>
          <p class="rc-desc">{r.desc}</p>
        </div>
        <span class="rc-badge">{r.badge}</span>
      </a>                 
    {/each}
  </div>
</div>

<style>
  .hub {
    padding: 1.5rem 0;
    max-width: 900px;
  }

  .hub-header {
    margin-bottom: 1.75rem;
  }

  .hub-header h1 {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0 0 0.25rem;
  }

  .hub-header p {
    font-size: 0.82rem;
    color: var(--color-muted);
    margin: 0;
  }

  .role-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 10px;
  }

  .role-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 1rem 1.1rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.875rem;
    text-decoration: none;
    color: inherit;
    position: relative;
    overflow: hidden;
    opacity: 0;
    transform: translateY(8px);
    transition: border-color 0.15s;
  }

  .hub.mounted .role-card {
    opacity: 1;
    transform: translateY(0);
    transition:
      opacity 0.3s ease var(--delay),
      transform 0.3s ease var(--delay),
      border-color 0.15s;
  }

  .role-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2.5px;
    background: var(--rc-accent);
    opacity: 0;
    transition: opacity 0.15s;
  }

  .role-card:hover {
    border-color: var(--rc-accent);
  }

  .role-card:hover::before {
    opacity: 1;
  }

  .rc-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .rc-icon {
    width: 36px;
    height: 36px;
    border-radius: 0.5rem;
    background: var(--rc-bg);
    color: var(--rc-accent);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .rc-arrow-wrap {
    color: var(--color-muted);
    display: flex;
    transition: transform 0.15s, color 0.15s;
  }

  .role-card:hover .rc-arrow-wrap {
    transform: translateX(3px);
    color: var(--rc-accent);
  }

  .rc-body {
    flex: 1;
  }

  .rc-label {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0 0 0.2rem;
  }

  .rc-desc {
    font-size: 0.78rem;
    color: var(--color-muted);
    line-height: 1.5;
    margin: 0;
  }

  .rc-badge {
    display: inline-block;
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 99px;
    border: 1px solid var(--rc-accent);
    color: var(--rc-accent);
    width: fit-content;
  }
</style>