<!-- src/routes/(auth)/login/+page.svelte -->
<script lang="ts">
  import type { ActionData } from './$types';
  let { form }: { form: ActionData } = $props();
  let loading = $state(false);
</script>

<svelte:head>
  <title>Login — MOUAU eTest</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700 flex items-center justify-center p-4">
  <div class="w-full max-w-md">
    <!-- Logo / Header -->
    <div class="text-center mb-8">
      <div class="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-lg mb-4">
        <span class="text-3xl">🎓</span>
      </div>
      <h1 class="text-3xl font-bold text-white">MOUAU eTest</h1>
      <p class="text-green-200 mt-1 text-sm">Michael Okpara University of Agriculture</p>
    </div>

    <!-- Card -->
    <div class="bg-white rounded-2xl shadow-2xl p-8">
      <h2 class="text-xl font-semibold text-gray-800 mb-6">Sign in to your account</h2>

      {#if form?.error}
        <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          ⚠ {form.error}
        </div>
      {/if}

      <form method="POST" onsubmit={() => (loading = true)}>
        <div class="mb-4">
          <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autocomplete="email"
            placeholder="you@mouau.edu.ng"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition text-sm"
          />
        </div>

        <div class="mb-6">
          <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autocomplete="current-password"
            placeholder="••••••••"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          class="w-full bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <p class="mt-6 text-center text-xs text-gray-500">
        Having trouble? Contact your department exam coordinator.
      </p>
    </div>

    <p class="text-center text-green-300 text-xs mt-6">
      © {new Date().getFullYear()} MOUAU — Secure Examination Platform
    </p>
  </div>
</div>
