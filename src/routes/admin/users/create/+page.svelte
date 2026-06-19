<!-- src/routes/admin/users/create/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import {
    BookOpen, ShieldCheck, Shield, Users,
    GraduationCap, ClipboardList, Crown, ArrowRight
  } from '@lucide/svelte';

  let mounted = $state(false);
  onMount(() => requestAnimationFrame(() => { mounted = true; }));

  const roles = [
    {
      href: '/admin/users/create/lecturer',
      label: 'Lecturer',
      icon: BookOpen,
      desc: 'Creates and manages course exams. Assigned to specific courses.',
      color: '#6366f1',
      bg: 'rgba(99,102,241,0.08)',
    },
    {
      href: '/admin/users/create/hod',
      label: 'Head of Department',
      icon: Users,
      desc: 'Manages a department. Optionally also lectures.',
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.08)',
    },
    {
      href: '/admin/users/create/dean',
      label: 'Dean',
      icon: GraduationCap,
      desc: 'Oversees a faculty/college. Read access to all departmental exams.',
      color: '#10b981',
      bg: 'rgba(16,185,129,0.08)',
    },
    {
      href: '/admin/users/create/exam-officer',
      label: 'Exam Officer',
      icon: ClipboardList,
      desc: 'Full access to exam schedules and results across the university.',
      color: '#0ea5e9',
      bg: 'rgba(14,165,233,0.08)',
    },
    {
      href: '/admin/users/create/invigilator',
      label: 'Invigilator',
      icon: ShieldCheck,
      desc: 'Monitors live exam sessions. Assigned per exam.',
      color: '#f97316',
      bg: 'rgba(249,115,22,0.08)',
    },
    {
      href: '/admin/users/create/vc-dvc',
      label: 'VC / DVC',
      icon: Crown,
      desc: 'Dashboard and reports only. No exam or user management.',
      color: '#8b5cf6',
      bg: 'rgba(139,92,246,0.08)',
    },
    {
      href: '/admin/users/create/admin',
      label: 'Admin',
      icon: Shield,
      desc: 'Full system access. Creates and manages all users.',
      color: '#3b82f6',
      bg: 'rgba(59,130,246,0.08)',
    },
  ];
</script>

<div class="hub" class:mounted>
  <div class="hub-header">
    <h1>Create User</h1>
    <p>Select the role you want to create. Each role has its own form.</p>
  </div>

  <div class="role-grid">
    {#each roles as r, i}
      <a
        href={r.href}
        class="role-card"
        style="--delay: {0.06 + i * 0.05}s; --accent: {r.color}; --accent-bg: {r.bg};"
      >
        <div class="rc-icon">
          <r.icon size={22} />
        </div>
        <div class="rc-body">
          <div class="rc-label">{r.label}</div>
          <div class="rc-desc">{r.desc}</div>
        </div>
        <ArrowRight size={16} class="rc-arrow" />
      </a>
    {/each}
  </div>
</div>

<style>
  .hub {
    max-width: 780px;
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
  }

  .hub-header h1 {
    font-size: 1.2rem;
    font-weight: 800;
    color: var(--color-text);
    margin: 0 0 .3rem;
  }

  .hub-header p {
    font-size: .82rem;
    color: var(--color-muted);
    margin: 0;
  }

  .role-grid {
    display: flex;
    flex-direction: column;
    gap: .625rem;
  }

  .role-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.25rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: .875rem;
    text-decoration: none;
    color: inherit;
    transition: border-color .15s, transform .15s, box-shadow .15s;
    opacity: 0;
    transform: translateY(10px);
  }

  .hub.mounted .role-card {
    opacity: 1;
    transform: translateY(0);
    transition:
      opacity .32s ease var(--delay),
      transform .32s ease var(--delay),
      border-color .15s,
      box-shadow .15s;
  }

  .role-card:hover {
    border-color: var(--accent);
    box-shadow: 0 4px 20px rgba(0,0,0,.08);
    transform: translateY(-1px);
  }

  .rc-icon {
    width: 44px;
    height: 44px;
    border-radius: .625rem;
    background: var(--accent-bg);
    color: var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background .15s;
  }

  .role-card:hover .rc-icon {
    background: color-mix(in srgb, var(--accent) 15%, transparent);
  }

  .rc-body {
    flex: 1;
    min-width: 0;
  }

  .rc-label {
    font-size: .9rem;
    font-weight: 700;
    color: var(--color-text);
    margin-bottom: .2rem;
  }

  .rc-desc {
    font-size: .78rem;
    color: var(--color-muted);
    line-height: 1.4;
  }

  .role-card :global(.rc-arrow) {
    color: var(--color-muted);
    flex-shrink: 0;
    transition: transform .15s, color .15s;
  }

  .role-card:hover :global(.rc-arrow) {
    transform: translateX(3px);
    color: var(--accent);
  }
</style>