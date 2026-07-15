<!-- src/lib/components/system/ShutdownScreen.svelte -->
<script lang="ts">
    import PowerOffIcon from '@lucide/svelte/icons/power-off';
    import CalendarClockIcon from '@lucide/svelte/icons/calendar-clock';

    interface Props {
        reason?: string;
        reopenDate?: string; // e.g. "Monday, 21 July 2025"
        contactEmail?: string;
    }

    let {
        reason = 'The examination platform has been shut down by the administration.',
        reopenDate = '',
        contactEmail = ''
    }: Props = $props();
</script>

<div class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-6">
    <!-- Ambient grid backdrop -->
    <div
        class="pointer-events-none absolute inset-0 opacity-[0.03]"
        style="background-image: linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px); background-size: 40px 40px;"
    ></div>

    <!-- Subtle top bar accent -->
    <div class="absolute left-0 right-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-border to-transparent"></div>

    <div class="relative flex w-full max-w-md flex-col items-center gap-8 text-center">
        <!-- Icon badge -->
        <div class="flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-muted shadow-sm">
            <PowerOffIcon class="h-9 w-9 text-muted-foreground" strokeWidth={1.5} />
        </div>

        <!-- Heading block -->
        <div class="flex flex-col gap-3">
            <div class="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Platform Offline
            </div>
            <h1 class="text-2xl font-bold tracking-tight text-foreground">
                System Shutdown
            </h1>
            <p class="text-sm leading-relaxed text-muted-foreground">
                {reason}
            </p>
        </div>

        <!-- Info cards -->
        <div class="grid w-full gap-3">
            {#if reopenDate}
                <div class="flex items-center gap-3 rounded-xl border border-border bg-muted/50 p-4 text-left">
                    <CalendarClockIcon class="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div class="flex flex-col gap-0.5">
                        <span class="text-xs font-semibold text-foreground">Scheduled to reopen</span>
                        <span class="text-xs text-muted-foreground">{reopenDate}</span>
                    </div>
                </div>
            {/if}

            {#if contactEmail}
                <div class="flex items-center justify-between rounded-xl border border-border bg-muted/50 px-4 py-3 text-left">
                    <span class="text-xs text-muted-foreground">For urgent enquiries</span>
                    <a
                        href="mailto:{contactEmail}"
                        class="text-xs font-medium text-foreground underline-offset-2 hover:underline"
                    >
                        {contactEmail}
                    </a>
                </div>
            {/if}
        </div>

        <!-- Notice box -->
        <div class="w-full rounded-xl border border-border bg-muted/30 px-5 py-4 text-left">
            <p class="text-xs leading-relaxed text-muted-foreground">
                If you were in an active examination session, your progress has been saved automatically.
                Contact your exam officer for further instructions.
            </p>
        </div>

        <!-- Footer -->
        <div class="w-full border-t border-border pt-6">
            <p class="text-xs text-muted-foreground">
                MOUAU e-Test &mdash; Michael Okpara University of Agriculture, Umudike
            </p>
        </div>
    </div>
</div>
