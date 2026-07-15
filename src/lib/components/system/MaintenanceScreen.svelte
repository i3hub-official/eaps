<!-- src/lib/components/system/MaintenanceScreen.svelte -->
<script lang="ts">
    import WrenchIcon from '@lucide/svelte/icons/wrench';
    import ClockIcon from '@lucide/svelte/icons/clock';

    interface Props {
        estimatedReturn?: string; // e.g. "2:00 PM WAT"
        message?: string;
    }

    let {
        estimatedReturn = '',
        message = 'We are performing scheduled maintenance to improve the platform. Please check back shortly.'
    }: Props = $props();
</script>

<div class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-6">
    <!-- Ambient grid backdrop -->
    <div
        class="pointer-events-none absolute inset-0 opacity-[0.03]"
        style="background-image: linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px); background-size: 40px 40px;"
    ></div>

    <div class="relative flex w-full max-w-md flex-col items-center gap-8 text-center">
        <!-- Icon badge -->
        <div class="flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-muted shadow-sm">
            <WrenchIcon class="h-9 w-9 text-muted-foreground" strokeWidth={1.5} />
        </div>

        <!-- Heading block -->
        <div class="flex flex-col gap-3">
            <div class="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                System Notice
            </div>
            <h1 class="text-2xl font-bold tracking-tight text-foreground">
                Under Maintenance
            </h1>
            <p class="text-sm leading-relaxed text-muted-foreground">
                {message}
            </p>
        </div>

        <!-- ETA pill -->
        {#if estimatedReturn}
            <div class="flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-2 text-sm text-foreground">
                <ClockIcon class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span>Expected back at <strong class="font-semibold">{estimatedReturn}</strong></span>
            </div>
        {/if}

        <!-- Divider + footer note -->
        <div class="w-full border-t border-border pt-6">
            <p class="text-xs text-muted-foreground">
                MOUAU e-Test &mdash; Michael Okpara University of Agriculture, Umudike
            </p>
        </div>
    </div>
</div>
