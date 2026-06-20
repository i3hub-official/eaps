
// ═══════════════════════════════════════════════════════════════════════════════
// BONUS: One-time migration script
// src/scripts/migrate-face-descriptors.ts
// ═══════════════════════════════════════════════════════════════════════════════
//
// Run ONCE after the Prisma migration, then delete this file.
// Command:  npx tsx src/scripts/migrate-face-descriptors.ts
//
// Reads every face_descriptors row that still holds a raw JSON array and
// re-saves it as an AES-256-GCM encrypted string. Already-encrypted rows
// (detected by the presence of ':' in the value) are skipped safely.
 

import { getPrismaClient } from '../src/lib/server/db/index.js';
import { encryptSecure }   from '../src/lib/security/encryption.js';
 
async function main() {
  const prisma = await getPrismaClient();
  const rows   = await prisma.faceDescriptor.findMany({
    select: { studentId: true, descriptor: true },
  });
 
  let migrated = 0;
  let skipped  = 0;
 
  for (const row of rows) {
    const stored = row.descriptor;
 
    // Already encrypted — iv:authTag:ciphertext format
    if (typeof stored === 'string' && (stored as string).includes(':')) {
      skipped++;
      continue;
    }
 
    let arr: number[];
 
    if (Array.isArray(stored)) {
      arr = stored as number[];
    } else if (typeof stored === 'string') {
      arr = JSON.parse(stored as string) as number[];
    } else {
      console.warn(`  ✗ student=${row.studentId} — unexpected type, skipping`);
      skipped++;
      continue;
    }
 
    const encrypted = encryptSecure(JSON.stringify(arr));
 
    await prisma.faceDescriptor.update({
      where: { studentId: row.studentId },
      data:  { descriptor: encrypted },
    });
 
    migrated++;
    console.log(`  ✓ student=${row.studentId}`);
  }
 
  console.log(`\nMigration complete.`);
  console.log(`  Migrated : ${migrated}`);
  console.log(`  Skipped  : ${skipped}`);
  process.exit(0);
}
 
main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});