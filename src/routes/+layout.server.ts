// src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { getPrismaClient } from '$lib/server/db/index.js';

// Must stay in sync with admin-access/+page.server.ts
const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'] as const;

// ── helpers ────────────────────────────────────────────────────────────────

async function getSystemFlags(): Promise<{ maintenance: boolean; shutdown: boolean }> {
    if (process.env.SYSTEM_SHUTDOWN === 'true')    return { shutdown: true,  maintenance: false };
    if (process.env.SYSTEM_MAINTENANCE === 'true') return { shutdown: false, maintenance: true  };

    try {
        const prisma = await getPrismaClient();
        const flags  = await prisma.systemFlag.findMany({
            where:  { key: { in: ['maintenance', 'shutdown'] } },
            select: { key: true, value: true },
        });
        const get = (k: string) => flags.find((f) => f.key === k)?.value === 'true';
        return { shutdown: get('shutdown'), maintenance: get('maintenance') };
    } catch {
        return { shutdown: false, maintenance: true };
    }
}

async function isVpnOrProxy(ip: string): Promise<boolean> {
    if (!ip) return true;

    try {
        const res = await fetch(
            `https://vpnapi.io/api/${ip}?key=${process.env.VPNAPI_KEY}`,
            { signal: AbortSignal.timeout(4000) }
        );
        if (!res.ok) return true;
        const data = await res.json();
        return !!(data.security?.vpn || data.security?.proxy || data.security?.tor);
    } catch {
        return true;
    }
}

function getClientIp(request: Request): string {
    return (
        request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
        request.headers.get('x-real-ip') ??
        ''
    );
}

// ── load ───────────────────────────────────────────────────────────────────

export const load: LayoutServerLoad = async ({ request, url, locals }) => {
    // Hidden admin login route always bypasses system screens
    if (url.pathname.startsWith('/sys/admin-access')) {
        return { systemState: null, detectedIp: null };
    }

    // Permitted admin roles bypass all screens so they can operate during maintenance
    if (locals.user?.role && (ADMIN_ROLES as readonly string[]).includes(locals.user.role)) {
        return { systemState: null, detectedIp: null };
    }

    const ip = getClientIp(request);
    const { shutdown, maintenance } = await getSystemFlags();

    if (shutdown)    return { systemState: 'shutdown'    as const, detectedIp: ip };
    if (maintenance) return { systemState: 'maintenance' as const, detectedIp: ip };

    const vpnBlocked = await isVpnOrProxy(ip);
    if (vpnBlocked)  return { systemState: 'vpn_blocked' as const, detectedIp: ip };

    return { systemState: null, detectedIp: ip };
};