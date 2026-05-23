<!-- src/lib/components/ui/Navbar.svelte -->
<script lang="ts">
  import ThemeToggle from './ThemeToggle.svelte';
  import { GraduationCap, LogOut, User } from 'lucide-svelte';
  import type { SessionUser } from '$lib/types/user.js';

  let { user }: { user: SessionUser } = $props();

  const roleLabel: Record<string, string> = {
    student: 'Student',
    lecturer: 'Lecturer',
    invigilator: 'Invigilator',
    admin: 'Administrator',
  };
</script>

<nav style="
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
  padding: 0 1.5rem;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 40;
  box-shadow: var(--shadow);
">
  <!-- Left: Logo -->
  <a href="/" style="display:flex; align-items:center; gap:0.6rem; text-decoration:none;">
    <span style="
      background: var(--primary);
      color: var(--primary-fg);
      border-radius: 0.5rem;
      width: 32px; height: 32px;
      display: flex; align-items: center; justify-content: center;
    ">
      <GraduationCap size={18} />
    </span>
    <div>
      <p style="font-weight:700; font-size:0.875rem; color:var(--text); margin:0; line-height:1.2;">MOUAU eTest</p>
      <p style="font-size:0.65rem; color:var(--text-muted); margin:0;">{roleLabel[user.role]}</p>
    </div>
  </a>

  <!-- Right: User + Theme -->
  <div style="display:flex; align-items:center; gap:0.75rem;">
    <div style="display:flex; align-items:center; gap:0.5rem; font-size:0.8rem;">
      <span style="
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: 9999px;
        width: 30px; height: 30px;
        display: flex; align-items: center; justify-content: center;
        color: var(--text-muted);
      ">
        <User size={14} />
      </span>
      <div style="line-height:1.2;">
        <p style="font-weight:600; color:var(--text); margin:0; font-size:0.8rem;">{user.full_name}</p>
        <p style="color:var(--text-muted); margin:0; font-size:0.7rem; font-family:monospace;">
          {user.matric_number ?? user.staff_id ?? ''}
        </p>
      </div>
    </div>

    <ThemeToggle />

    <!-- ✅ Logout form instead of link -->
    <form action="/logout" method="POST" style="display: inline;">
      <button type="submit" title="Sign out" style="
        display: inline-flex; align-items: center; gap: 0.35rem;
        font-size: 0.78rem; color: var(--text-muted);
        border: 1px solid var(--border); border-radius: 0.5rem;
        padding: 0.35rem 0.65rem; transition: color 0.15s;
        background: transparent; cursor: pointer;
      ">
        <LogOut size={14} />
        Logout
      </button>
    </form>
  </div>
</nav>