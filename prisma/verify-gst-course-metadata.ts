// prisma/verify-gst-course-metadata.ts
//
// Run: pnpm tsx prisma/verify-gst-course-metadata.ts
//
// Confirms whether GST courses have the level/semester/isGeneral metadata
// the backfill script needed. If level or semester is null, that's why
// backfill-offerings.ts silently skipped them (its `if (!course.level ||
// !course.semester) continue;` guard).

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

async function main() {
  console.log('🔍 Checking Course metadata for likely GST courses...\n');

  const candidates = await db.course.findMany({
    where: {
      OR: [
        { code: { startsWith: 'GST' } },
        { isGeneral: true },
      ],
    },
    select: {
      code: true, title: true, level: true, semester: true,
      isGeneral: true, isActive: true, departmentId: true,
    },
    orderBy: { code: 'asc' },
  });

  if (candidates.length === 0) {
    console.log('❌ No courses found matching code "GST*" or isGeneral=true. GST courses may not exist in the Course table at all.');
    return;
  }

  console.log(`Found ${candidates.length} candidate GST course(s):\n`);
  for (const c of candidates) {
    const problems: string[] = [];
    if (c.level === null) problems.push('level is NULL');
    if (c.semester === null) problems.push('semester is NULL');
    if (!c.isGeneral) problems.push('isGeneral is FALSE');
    if (!c.isActive) problems.push('isActive is FALSE');

    const status = problems.length > 0 ? `❌ ${problems.join(', ')}` : '✅ OK';
    console.log(`  ${c.code} — ${c.title}`);
    console.log(`    level=${c.level}  semester=${c.semester}  isGeneral=${c.isGeneral}  isActive=${c.isActive}`);
    console.log(`    ${status}\n`);
  }

  const brokenCount = candidates.filter(c => c.level === null || c.semester === null).length;
  console.log('========================================');
  console.log(`${brokenCount} of ${candidates.length} GST course(s) have null level or semester.`);
  console.log(brokenCount > 0
    ? 'This confirms the backfill script skipped them. Fix the Course rows first, then re-run backfill for just these courses.'
    : 'Metadata looks fine — the gap is elsewhere (check CourseOfferingDepartment attachment or offering status next).');
}

main().finally(() => db.$disconnect());