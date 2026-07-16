// src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { getPrismaClient } from '$lib/server/db/index.js';
import { isAdminRole } from '$lib/server/auth/roles';
import crypto from 'node:crypto';

const VPN_COOKIE = 'vpn_chk';
const VPN_CACHE_TTL_MS = 15 * 60 * 1000; // recheck every 15 min
const FLAGS_CACHE_TTL_MS = 15 * 1000;    // recheck every 15s

const HMAC_SECRET = process.env.VPN_COOKIE_SECRET ?? '';
if (!HMAC_SECRET && process.env.NODE_ENV === 'production') {
    console.error('[layout] VPN_COOKIE_SECRET is not set — VPN check cache cannot be trusted.');
}

// ── in-memory system flags cache (per warm instance) ────────────────────────

let flagsCache: { shutdown: boolean; maintenance: boolean; expiresAt: number } | null = null;

async function getSystemFlags(): Promise<{ maintenance: boolean; shutdown: boolean }> {
    if (process.env.SYSTEM_SHUTDOWN === 'true')    return { shutdown: true,  maintenance: false };
    if (process.env.SYSTEM_MAINTENANCE === 'true') return { shutdown: false, maintenance: true  };

    const now = Date.now();
    if (flagsCache && flagsCache.expiresAt > now) {
        return { shutdown: flagsCache.shutdown, maintenance: flagsCache.maintenance };
    }

    try {
        const prisma = await getPrismaClient();
        const flags  = await prisma.systemFlag.findMany({
            where:  { key: { in: ['maintenance', 'shutdown'] } },
            select: { key: true, value: true },
        });
        const get = (k: string) => flags.find((f) => f.key === k)?.value === 'true';
        const result = { shutdown: get('shutdown'), maintenance: get('maintenance') };
        flagsCache = { ...result, expiresAt: now + FLAGS_CACHE_TTL_MS };
        return result;
    } catch {
        return { shutdown: false, maintenance: true };
    }
}

// ── VPN check, cached in a signed cookie so we don't call the API every nav ─

function sign(payload: string): string {
    return crypto.createHmac('sha256', HMAC_SECRET).update(payload).digest('hex');
}

function readVpnCookie(raw: string | undefined, ip: string): boolean | null {
    if (!raw || !HMAC_SECRET) return null;
    const [ipPart, resultPart, expPart, sig] = raw.split('.');
    if (!ipPart || !resultPart || !expPart || !sig) return null;
    if (sign(`${ipPart}.${resultPart}.${expPart}`) !== sig) return null;
    if (ipPart !== ip) return null;
    if (Number(expPart) < Date.now()) return null;
    return resultPart === '1';
}

function writeVpnCookie(ip: string, blocked: boolean): string {
    const expiresAt = Date.now() + VPN_CACHE_TTL_MS;
    const payload = `${ip}.${blocked ? '1' : '0'}.${expiresAt}`;
    return `${payload}.${sign(payload)}`;
}

async function checkVpnLive(ip: string): Promise<boolean> {
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

// ── load ───────────────────────────────────────────────────────────────────

export const load: LayoutServerLoad = async ({ request, url, locals, getClientAddress, cookies }) => {
    // Hidden admin login route always bypasses system screens
    if (url.pathname.startsWith('/sys/admin-access')) {
        return { systemState: null, detectedIp: null };
    }

    // Permitted admin roles bypass all screens so they can operate during maintenance.
    // Checks the actual role-assignment set (.roles), not primaryRole — a staff
    // member can hold ADMIN as a secondary role. See guards.ts header comment.
    const userRoles = locals.user?.type === 'staff' ? locals.user.roles : [];
    if (isAdminRole(userRoles)) {
        return { systemState: null, detectedIp: null };
    }

    // Trust the adapter's resolved client IP, not a raw request header —
    // headers are attacker-controlled unless the adapter is configured to
    // strip/overwrite them from a trusted proxy hop (see ADDRESS_HEADER /
    // XFF_DEPTH for adapter-node; adapter-vercel handles this automatically).
    const ip = getClientAddress();

    const { shutdown, maintenance } = await getSystemFlags();
    if (shutdown)    return { systemState: 'shutdown'    as const, detectedIp: ip };
    if (maintenance) return { systemState: 'maintenance' as const, detectedIp: ip };

    let vpnBlocked = readVpnCookie(cookies.get(VPN_COOKIE), ip);
    if (vpnBlocked === null) {
        vpnBlocked = await checkVpnLive(ip);
        cookies.set(VPN_COOKIE, writeVpnCookie(ip, vpnBlocked), {
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: VPN_CACHE_TTL_MS / 1000,
        });
    }

    if (vpnBlocked) return { systemState: 'vpn_blocked' as const, detectedIp: ip };

    return { systemState: null, detectedIp: ip };
};