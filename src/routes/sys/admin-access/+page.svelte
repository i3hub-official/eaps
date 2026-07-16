<!-- src/routes/sys/admin-access/+page.svelte -->
<script lang="ts">
    import type { ActionData } from './$types';
    import { enhance } from '$app/forms';
    import LoaderIcon from '@lucide/svelte/icons/loader';
    import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';

    let { form }: { form: ActionData } = $props();
    let loading = $state(false);
</script>

<div class="fixed inset-0 flex items-center justify-center bg-background px-6">
    <div class="w-full max-w-sm">
        <!-- Header -->
        <div class="mb-8 flex flex-col items-center gap-3 text-center">
            <div class="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted">
                <ShieldCheckIcon class="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <div>
                <h1 class="text-lg font-semibold text-foreground">Administrator Access</h1>
                <p class="mt-1 text-xs text-muted-foreground">Restricted — authorised personnel only</p>
            </div>
        </div>

        <!-- Form -->
        <form
            method="POST"
            use:enhance={() => {
                loading = true;
                return async ({ update }) => { await update(); loading = false; };
            }}
            class="flex flex-col gap-4"
        >
            {#if form?.error}
                <p class="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-xs text-destructive">
                    {form.error}
                </p>
            {/if}

            <div class="flex flex-col gap-1.5">
                <label for="identifier" class="text-xs font-medium text-foreground">
                    Staff ID or Email
                </label>
                <input
                    id="identifier"
                    name="identifier"
                    type="text"
                    autocomplete="username"
                    required
                    class="rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
            </div>

            <div class="flex flex-col gap-1.5">
                <label for="password" class="text-xs font-medium text-foreground">Password</label>
                <input
                    id="password"
                    name="password"
                    type="password"
                    autocomplete="current-password"
                    required
                    class="rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                class="mt-2 flex items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
            >
                {#if loading}
                    <LoaderIcon class="h-4 w-4 animate-spin" />
                    Verifying…
                {:else}
                    Sign in
                {/if}
            </button>
        </form>

        <p class="mt-8 text-center text-xs text-muted-foreground">
            EA Proctoring System &mdash; Michael Okpara University of Agriculture, Umudike
        </p>
    </div>
</div>