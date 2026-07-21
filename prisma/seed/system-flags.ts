// prisma/seed/system-flags.ts
// Run via: npx ts-node prisma/seed/system-flags.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding SystemFlag records...');

  const flags = [
    { key: 'maintenance', value: 'false' },
    { key: 'shutdown', value: 'false' },
  ];

  for (const flag of flags) {
    const existing = await prisma.systemFlag.findUnique({
      where: { key: flag.key },
    });

    if (existing) {
      console.log(`  ✓ ${flag.key} already exists`);
    } else {
      await prisma.systemFlag.create({
        data: flag,
      });
      console.log(`  ✓ Created ${flag.key} = ${flag.value}`);
    }
  }

  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });