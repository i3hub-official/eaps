// prisma/fix-gst-department-fanout.ts
//
// Run: pnpm tsx prisma/fix-gst-department-fanout.ts
//
// Fixes the GST backfill gap:
//   1. Corrects Curriculum.type from 'core' -> 'gst' for GST-coded courses
//      (backfill branched on Course.isGeneral, which was false in seed data).
//   2. Attaches every department to each existing CourseOffering for these
//      courses via CourseOfferingDepartment (backfill only attached the
//      course's own home department).
//   3. Creates missing Curriculum rows for departments that had none at all.
//   4. Flips Course.isGeneral to true for hygiene (not required for
//      eligibility logic, which reads Curriculum.type, not this flag —
//      but other reports may filter on it).
//
// Idempotent — safe to re-run.

import { PrismaClient, CurriculumType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

async function main() {
  console.log('🔧 Fixing GST department fan-out...\n');

  const gstCourses = await db.course.findMany({
    where: { code: { startsWith: 'GST' } },
    select: { id: true, code: true, title: true, level: true, semester: true, departmentId: true },
  });

  if (gstCourses.length === 0) {
    console.log('❌ No GST-coded courses found. Nothing to fix.');
    return;
  }

  const allDepartments = await db.department.findMany({ select: { id: true, code: true } });
  console.log(`Found ${gstCourses.length} GST course(s), ${allDepartments.length} department(s) total.\n`);

  for (const course of gstCourses) {
    console.log(`── ${course.code} — ${course.title} (level ${course.level}, semester ${course.semester})`);

    if (course.level === null || course.semester === null) {
      console.log(`   ❌ Skipping: level or semester is null.`);
      continue;
    }

    const level = await db.level.findUnique({ where: { level: course.level } });
    if (!level) {
      console.log(`   ❌ Skipping: no Level row for level=${course.level}.`);
      continue;
    }

    // 1. Fix Curriculum.type on whatever rows already exist for this course
    const typeFix = await db.curriculum.updateMany({
      where: { courseId: course.id, type: { not: CurriculumType.gst } },
      data: { type: CurriculumType.gst },
    });
    if (typeFix.count > 0) console.log(`   ✅ Corrected type -> gst on ${typeFix.count} existing Curriculum row(s).`);

    // 2. Create missing Curriculum rows for every department that doesn't have one
    const existingCurriculumDepts = await db.curriculum.findMany({
      where: { courseId: course.id, levelId: level.id, semester: course.semester },
      select: { departmentId: true },
    });
    const existingDeptIds = new Set(existingCurriculumDepts.map(c => c.departmentId));
    const missingDepts = allDepartments.filter(d => !existingDeptIds.has(d.id));

    if (missingDepts.length > 0) {
      await db.curriculum.createMany({
        data: missingDepts.map(d => ({
          departmentId: d.id,
          levelId: level.id,
          semester: course.semester!,
          courseId: course.id,
          type: CurriculumType.gst,
          isActive: true,
        })),
        skipDuplicates: true,
      });
      console.log(`   ✅ Created ${missingDepts.length} missing Curriculum row(s).`);
    }

    // 3. Fan out CourseOfferingDepartment on every existing offering for this course
    const offerings = await db.courseOffering.findMany({
      where: { courseId: course.id },
      include: { departments: { select: { departmentId: true } } },
    });

    for (const offering of offerings) {
      const attachedIds = new Set(offering.departments.map(d => d.departmentId));
      const toAttach = allDepartments.filter(d => !attachedIds.has(d.id));

      if (toAttach.length > 0) {
        await db.courseOfferingDepartment.createMany({
          data: toAttach.map(d => ({ offeringId: offering.id, departmentId: d.id, isPrimary: d.id === course.departmentId })),
          skipDuplicates: true,
        });
        console.log(`   ✅ Attached ${toAttach.length} department(s) to offering [${offering.id}] (semesterId=${offering.academicSemesterId}).`);
      }

      if (offering.status !== 'open') {
        await db.courseOffering.update({ where: { id: offering.id }, data: { status: 'open' } });
        console.log(`   ✅ Flipped offering [${offering.id}] status -> open (was '${offering.status}').`);
      }
    }

    if (offerings.length === 0) {
      console.log(`   ⚠️  No CourseOffering exists yet for this course at all — nothing to fan out. Run the offering backfill for this course first.`);
    }

    // 4. Hygiene: flip isGeneral (not read by eligibility logic, but corrects the source data)
    await db.course.update({ where: { id: course.id }, data: { isGeneral: true } });

    console.log('');
  }

  console.log('✅ Done.');
}

main().finally(() => db.$disconnect());