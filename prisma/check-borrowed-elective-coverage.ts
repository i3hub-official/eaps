// prisma/check-borrowed-elective-coverage.ts
//
// Run: pnpm tsx prisma/check-borrowed-elective-coverage.ts
//
// Answers: does ANY borrowed/elective curriculum exist in the DB at all?
// If zero everywhere -> nobody has configured borrowed courses yet (a content
// task, not a bug). If some exist but not for this student's department ->
// same fan-out gap pattern as GST, needs a similar targeted fix.

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

async function main() {
  console.log('🔍 Checking borrowed/elective curriculum coverage...\n');

  const borrowedRows = await db.curriculum.findMany({
    where: { type: 'borrowed', isActive: true },
    include: {
      course: { select: { code: true, title: true, departmentId: true } },
      department: { select: { name: true, code: true } },
    },
  });
  const electiveRows = await db.curriculum.findMany({
    where: { type: 'elective', isActive: true },
    include: {
      course: { select: { code: true, title: true } },
      department: { select: { name: true, code: true } },
    },
  });

  console.log(`Curriculum rows with type='borrowed': ${borrowedRows.length}`);
  if (borrowedRows.length > 0) {
    console.log('  Sample:');
    borrowedRows.slice(0, 10).forEach(r =>
      console.log(`    ${r.course.code} -> borrowed by ${r.department.code} (level ${r.levelId}, sem ${r.semester})`)
    );
  }

  console.log(`\nCurriculum rows with type='elective': ${electiveRows.length}`);
  if (electiveRows.length > 0) {
    console.log('  Sample:');
    electiveRows.slice(0, 10).forEach(r =>
      console.log(`    ${r.course.code} -> elective for ${r.department.code} (level ${r.levelId}, sem ${r.semester})`)
    );
  }

  // Also check: are there ANY courses whose Course.departmentId differs from
  // ALL departments that reference it in Curriculum — i.e. genuinely
  // cross-department courses that exist in the catalog but were never wired
  // into any borrowing department's curriculum at all?
  const allCourses = await db.course.findMany({
    select: { id: true, code: true, title: true, departmentId: true },
  });
  const curriculumByCourse = await db.curriculum.groupBy({
    by: ['courseId'],
    _count: true,
  });
  const coveredCourseIds = new Set(curriculumByCourse.map(c => c.courseId));
  const uncoveredCourses = allCourses.filter(c => !coveredCourseIds.has(c.id));

  console.log(`\n${uncoveredCourses.length} of ${allCourses.length} total courses have ZERO Curriculum rows anywhere (not registerable by anyone yet).`);
  if (uncoveredCourses.length > 0 && uncoveredCourses.length <= 20) {
    uncoveredCourses.forEach(c => console.log(`    ${c.code} — ${c.title}`));
  } else if (uncoveredCourses.length > 20) {
    console.log('    (too many to list — this suggests curriculum was only ever configured for a handful of departments)');
  }

  console.log('\n========================================');
  if (borrowedRows.length === 0 && electiveRows.length === 0) {
    console.log('✅ No borrowed/elective curriculum exists ANYWHERE in the DB.');
    console.log('   This is a content gap, not a fanout bug — nobody has configured borrowed courses yet.');
  } else {
    console.log('⚠️  Borrowed/elective curriculum exists for SOME departments but apparently not this student\'s.');
    console.log('   Worth checking whether the departments that DO have it were manually configured,');
    console.log('   or whether this is the same silent-skip pattern as GST for a different reason.');
  }
}

main().finally(() => db.$disconnect());