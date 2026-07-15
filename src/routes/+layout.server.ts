// src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ request }) => {
    // --- Maintenance / Shutdown: set these from env or DB ---
    const maintenance = process.env.SYSTEM_MAINTENANCE === 'true';
    const shutdown    = process.env.SYSTEM_SHUTDOWN === 'true';

    // --- VPN detection: check the connecting IP ---
    const ip =
        request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
        request.headers.get('x-real-ip') ??
        '';

    const vpnBlocked = await isVpnOrProxy(ip); // your detection logic

    const systemState = shutdown
        ? 'shutdown'
        : maintenance
        ? 'maintenance'
        : vpnBlocked
        ? 'vpn_blocked'
        : null;

    return { systemState, detectedIp: ip };
};

async function isVpnOrProxy(ip: string): Promise<boolean> {
    if (!ip) return false;
    // Option A: free API check
    try {
        const res = await fetch(`https://vpnapi.io/api/${ip}?key=${process.env.VPNAPI_KEY}`);
        const data = await res.json();
        return data.security?.vpn || data.security?.proxy || data.security?.tor;
    } catch {
        return false; // fail open — don't block if the check itself fails
    }
}