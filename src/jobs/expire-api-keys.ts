import { getPrismaClient } from '$lib/server/db/index.js';

export async function expireApiKeys() {
    const prisma = await getPrismaClient();

  const result = await prisma.apiKey.updateMany({
    where: {
      status: 'active',
      expiresAt: { lt: new Date() },
    },
    data: { status: 'expired' },
  });

  if (result.count > 0) {
    console.log(`[API Keys] Expired ${result.count} keys`);
  }

  return result;
}