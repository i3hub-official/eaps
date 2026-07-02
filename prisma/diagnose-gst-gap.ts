// prisma/diagnose-gst-gap.ts
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  console.log('Please set DATABASE_URL in your .env file');
  console.log('Example: DATABASE_URL="postgresql://postgres:password@localhost:5432/mouau_etest"');
  process.exit(1);
}

// Create connection pool for local PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
});

const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

async function main() {
  console.log('🔍 Diagnosing GST registration gaps...\n');
  
  try {
    await db.$connect();
    console.log('✅ Connected to database\n');

    // 1. Get all 100-level students
    const level100 = await db.level.findUnique({ where: { level: 100 } });
    if (!level100) {
      console.log('❌ 100 Level not found');
      return;
    }

    const students = await db.user.findMany({
      where: {
        role: 'student',
        levelId: level100.id,
      },
      include: {
        department: true,
        level: true,
        courseRegistrations: {
          include: {
            course: true,
          },
        },
      },
    });

    console.log(`📊 Found ${students.length} 100-level students\n`);

    // 2. GST courses that should be taken by all 100-level students
    const gstCourses = await db.course.findMany({
      where: {
        isGeneral: true,
        level: 100,
      },
      select: {
        code: true,
        title: true,
        semester: true,
      },
    });

    console.log('📚 GST Courses for 100 Level:');
    gstCourses.forEach(c => {
      console.log(`  - ${c.code}: ${c.title} (Semester ${c.semester})`);
    });
    console.log();

    // 3. Check each student for missing GST registrations
    let studentsWithGaps = 0;
    let totalMissingRegistrations = 0;

    for (const student of students) {
      const registeredCourses = student.courseRegistrations.map(r => r.course.code);
      const missingGST = gstCourses
        .filter(gst => !registeredCourses.includes(gst.code))
        .map(gst => gst.code);

      if (missingGST.length > 0) {
        studentsWithGaps++;
        totalMissingRegistrations += missingGST.length;
        
        console.log(`⚠️ ${student.fullName} (${student.matricNumber})`);
        console.log(`   Department: ${student.department?.name || 'Unknown'}`);
        console.log(`   Missing GST: ${missingGST.join(', ')}`);
        console.log();
      }
    }

    // 4. Summary
    console.log('📊 ========== SUMMARY ==========');
    console.log(`✅ Students with complete GST registration: ${students.length - studentsWithGaps}`);
    console.log(`⚠️ Students with missing GST courses: ${studentsWithGaps}`);
    console.log(`📚 Total missing registrations: ${totalMissingRegistrations}`);
    console.log('================================\n');

    // 5. Check if there are any students with NO registrations at all
    const studentsWithNoRegistrations = students.filter(s => s.courseRegistrations.length === 0);
    if (studentsWithNoRegistrations.length > 0) {
      console.log('🚨 Students with ZERO registrations:');
      studentsWithNoRegistrations.forEach(s => {
        console.log(`  - ${s.fullName} (${s.matricNumber})`);
      });
      console.log();
    }

    // 6. Check department distribution
    console.log('🏛️ Students by department:');
    const deptCounts = students.reduce((acc, s) => {
      const deptName = s.department?.name || 'Unknown';
      acc[deptName] = (acc[deptName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(deptCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([dept, count]) => {
        console.log(`  - ${dept}: ${count} students`);
      });

    console.log('\n✅ Diagnosis complete!');

  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  } finally {
    await db.$disconnect();
    console.log('\n🔌 Database disconnected');
  }
}

main()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });