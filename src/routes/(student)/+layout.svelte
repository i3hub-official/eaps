<!-- src/routes/(student)/+layout.svelte -->
<script lang="ts">
  import type { LayoutData } from './$types';
  let { data, children }: { data: LayoutData; children: any } = $props();
</script>

<div class="min-h-screen bg-gray-50">
  <!-- Navbar -->
  <nav class="bg-green-800 text-white px-6 py-3 flex items-center justify-between shadow">
    <div class="flex items-center gap-3">
      <span class="text-xl">🎓</span>
      <span class="font-semibold text-sm">MOUAU eTest</span>
    </div>
    <div class="flex items-center gap-4 text-sm">
      <span class="text-green-200">{data.user.full_name}</span>
      <span class="bg-green-700 px-2 py-0.5 rounded text-xs font-mono">
        {data.user.matric_number ?? 'N/A'}
      </span>
      <a href="/logout" class="hover:text-red-300 transition-colors text-xs">Sign out</a>
    </div>
  </nav>

  <!-- Content -->
  <main class="max-w-4xl mx-auto px-4 py-8">
    {@render children()}
  </main>
</div>
