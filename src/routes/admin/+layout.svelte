<!-- src/routes/(admin)/+layout.svelte -->
<script lang="ts">
  import Navbar from '$lib/components/ui/Navbar.svelte';
   import {
    LayoutDashboard, Users, BookOpen, BarChart2, Building2
  } from 'lucide-svelte';
  import type { LayoutData } from './$types';

  let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

    const nav = [
    { href: '/admin/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
    { href: '/admin/users',       label: 'Users',       icon: Users },
    { href: '/admin/departments', label: 'Departments', icon: Building2 },
    { href: '/admin/reports',     label: 'Reports',     icon: BarChart2 },
</script>

<Navbar user={data.user} {nav} />
<main>
  {@render children()}
</main>

<style>
  main { min-height: calc(100vh - 56px); }
</style>