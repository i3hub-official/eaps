// prisma/backfill-offerings.ts
import { PrismaClient, CurriculumType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  console.log('Please set DATABASE_URL in your .env file');
  console.log('Example: DATABASE_URL="postgresql://postgres:password@localhost:5432/mouau_etest"');
  process.exit(1);
}

console.log('📡 Connecting to database...');

// Create a connection pool for local PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
});

const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

async function main() {
  console.log('🚀 Starting backfill-offerings script...');
  
  try {
    // Test database connection
    await db.$connect();
    console.log('✅ Database connected successfully');

    // 1. Get all academic semesters
    console.log('📚 Fetching academic semesters...');
    const semesters = await db.academicSemester.findMany();
    console.log(`✅ Found ${semesters.length} academic semesters`);

    // 2. Get all courses
    console.log('📚 Fetching courses...');
    const courses = await db.course.findMany();
    console.log(`✅ Found ${courses.length} courses`);

    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Process each course
    for (const course of courses) {
      try {
        // Skip malformed legacy rows
        if (!course.level || !course.semester) {
          console.log(`⚠️ Skipping course ${course.code} (${course.id}) - missing level or semester`);
          skippedCount++;
          continue;
        }

        // Get the level
        const level = await db.level.findUnique({ 
          where: { level: course.level } 
        });
        
        if (!level) {
          console.log(`⚠️ Skipping course ${course.code} - level ${course.level} not found`);
          skippedCount++;
          continue;
        }

        // Filter semesters for this course's semester
        const courseSemesters = semesters.filter(s => s.semester === course.semester);
        
        if (courseSemesters.length === 0) {
          console.log(`⚠️ Skipping course ${course.code} - no semesters found for semester ${course.semester}`);
          skippedCount++;
          continue;
        }

        console.log(`🔄 Processing course: ${course.code} (${course.title})`);

        // Process each semester
        for (const sem of courseSemesters) {
          try {
            // 1. Create or update CourseOffering
            const offering = await db.courseOffering.upsert({
              where: { 
                courseId_academicSemesterId_levelId: { 
                  courseId: course.id, 
                  academicSemesterId: sem.id, 
                  levelId: level.id 
                } 
              },
              create: { 
                courseId: course.id, 
                academicSemesterId: sem.id, 
                levelId: level.id, 
                status: 'open' 
              },
              update: {},
            });
            console.log(`  ✅ CourseOffering created/updated for ${course.code} - Semester ${sem.semester}`);

            // 2. Create or update CourseOfferingDepartment
            await db.courseOfferingDepartment.upsert({
              where: { 
                offeringId_departmentId: { 
                  offeringId: offering.id, 
                  departmentId: course.departmentId 
                } 
              },
              create: { 
                offeringId: offering.id, 
                departmentId: course.departmentId, 
                isPrimary: true 
              },
              update: {},
            });
            console.log(`  ✅ CourseOfferingDepartment created/updated for ${course.code}`);

            // 3. Create or update Curriculum row
            await db.curriculum.upsert({
              where: { 
                departmentId_levelId_semester_courseId: { 
                  departmentId: course.departmentId, 
                  levelId: level.id, 
                  semester: course.semester, 
                  courseId: course.id 
                } 
              },
              create: { 
                departmentId: course.departmentId, 
                levelId: level.id, 
                semester: course.semester, 
                courseId: course.id, 
                type: course.isGeneral ? CurriculumType.gst : CurriculumType.core 
              },
              update: {},
            });
            console.log(`  ✅ Curriculum created/updated for ${course.code}`);

            // 4. Carry LecturerCourse → TeachingAssignment
            const lecturerLinks = await db.lecturerCourse.findMany({ 
              where: { 
                courseId: course.id, 
                departmentId: course.departmentId 
              } 
            });

            if (lecturerLinks.length > 0) {
              console.log(`  👨‍🏫 Found ${lecturerLinks.length} lecturer assignments for ${course.code}`);
              
              for (const lc of lecturerLinks) {
                await db.teachingAssignment.upsert({
                  where: { 
                    offeringId_lecturerId: { 
                      offeringId: offering.id, 
                      lecturerId: lc.lecturerId 
                    } 
                  },
                  create: { 
                    offeringId: offering.id, 
                    lecturerId: lc.lecturerId, 
                    assignedById: lc.assignedById 
                  },
                  update: {},
                });
              }
              console.log(`  ✅ TeachingAssignments created/updated for ${course.code}`);
            }

            // 5. Backfill offeringId on existing registrations
            const regUpdateResult = await db.courseRegistration.updateMany({
              where: { 
                courseId: course.id, 
                session: sem.session, 
                semester: course.semester, 
                levelId: level.id, 
                offeringId: null 
              },
              data: { offeringId: offering.id },
            });
            
            if (regUpdateResult.count > 0) {
              console.log(`  ✅ Updated ${regUpdateResult.count} registrations with offeringId`);
            }

            // 6. Backfill offeringId on existing exams
            const examUpdateResult = await db.exam.updateMany({
              where: { 
                courseId: course.id, 
                session: sem.session, 
                semester: course.semester, 
                offeringId: null 
              },
              data: { offeringId: offering.id },
            });
            
            if (examUpdateResult.count > 0) {
              console.log(`  ✅ Updated ${examUpdateResult.count} exams with offeringId`);
            }

            processedCount++;
            
          } catch (error) {
            console.error(`  ❌ Error processing ${course.code} for semester ${sem.semester}:`, error);
            errorCount++;
          }
        }
      } catch (error) {
        console.error(`❌ Error processing course ${course.code}:`, error);
        errorCount++;
      }
    }

    // Final summary
    console.log('\n📊 ========== BACKFILL COMPLETE ==========');
    console.log(`✅ Processed courses: ${processedCount}`);
    console.log(`⚠️ Skipped courses: ${skippedCount}`);
    console.log(`❌ Errors encountered: ${errorCount}`);
    console.log('==========================================');

  } catch (error) {
    console.error('❌ Fatal error during backfill:', error);
    throw error;
  } finally {
    await db.$disconnect();
    console.log('🔌 Database disconnected');
  }
}

// Execute the main function with proper error handling
main()
  .then(() => {
    console.log('✅ Backfill completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Backfill failed:', error);
    process.exit(1);
  });