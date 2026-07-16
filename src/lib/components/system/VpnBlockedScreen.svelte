<!-- src/lib/components/system/VpnBlockedScreen.svelte -->
<script lang="ts">
    import ShieldOffIcon from '@lucide/svelte/icons/shield-off';
    import WifiOffIcon from '@lucide/svelte/icons/wifi-off';
    import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';

    interface Props {
        detectedIp?: string;
        onRetry?: () => void;
    }

    let { detectedIp = '', onRetry }: Props = $props();

    let checking = $state(false);

    async function handleRetry() {
        if (!onRetry) {
            checking = true;
            await new Promise((r) => setTimeout(r, 1200));
            checking = false;
            window.location.reload();
            return;
        }
        onRetry();
    }
</script>

<div class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-6">
    <!-- Ambient grid backdrop -->
    <div
        class="pointer-events-none absolute inset-0 opacity-[0.03]"
        style="background-image: linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px); background-size: 40px 40px;"
    ></div>

    <div class="relative flex w-full max-w-md flex-col items-center gap-8 text-center">
        <!-- Stacked icon badge -->
        <div class="relative flex h-20 w-20 items-center justify-center">
            <div class="absolute inset-0 rounded-2xl border border-destructive/20 bg-destructive/5"></div>
            <ShieldOffIcon class="h-9 w-9 text-destructive/70" strokeWidth={1.5} />
        </div>

        <!-- Heading block -->
        <div class="flex flex-col gap-3">
            <div class="text-xs font-semibold uppercase tracking-[0.18em] text-destructive/70">
                Access Denied
            </div>
            <h1 class="text-2xl font-bold tracking-tight text-foreground">
                VPN or Proxy Detected
            </h1>
            <p class="text-sm leading-relaxed text-muted-foreground">
                This platform does not permit access through VPN, proxy, or anonymising services.
                Disable your VPN and connect directly to proceed.
            </p>
        </div>

        <!-- Info cards -->
        <div class="grid w-full gap-3">
            <div class="flex items-start gap-3 rounded-xl border border-border bg-muted/50 p-4 text-left">
                <WifiOffIcon class="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div class="flex flex-col gap-0.5">
                    <span class="text-xs font-semibold text-foreground">Why is this blocked?</span>
                    <span class="text-xs leading-relaxed text-muted-foreground">
                        Examination integrity requires a verified, institution-traceable connection.
                        VPNs mask your location and are not permitted during assessments.
                    </span>
                </div>
            </div>

            {#if detectedIp}
                <div class="flex items-center justify-between rounded-xl border border-border bg-muted/50 px-4 py-3 text-left">
                    <span class="text-xs text-muted-foreground">Detected IP</span>
                    <span class="font-mono text-xs font-medium text-foreground">{detectedIp}</span>
                </div>
            {/if}
        </div>

        <!-- Retry -->
        <button
            onclick={handleRetry}
            disabled={checking}
            class="flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted disabled:opacity-60"
        >
            <RefreshCwIcon class="h-3.5 w-3.5 {checking ? 'animate-spin' : ''}" />
            {checking ? 'Checking connection…' : 'Retry after disabling VPN'}
        </button>

        <!-- Footer -->
        <div class="w-full border-t border-border pt-6">
            <p class="text-xs text-muted-foreground">
                EA Proctoring System &mdash; Michael Okpara University of Agriculture, Umudike
            </p>
        </div>
    </div>
</div>
