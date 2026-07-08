// prisma/seed.ts
// Run: pnpm prisma db seed
//
// Bootstraps:
//   1. MOUAU University
//   2. Colleges
//   3. Departments
//   4. Courses (with levels)
//   5. 3 Admin accounts (fully verified)

import 'dotenv/config'
import { PrismaClient, StaffRole, SemesterType, AcademicSessionStatus } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

// ─── Data ────────────────────────────────────────────────────────────────────

const COLLEGES = [
  { name: 'College of Agricultural Economics, Extension and Rural Development', shortName: 'CAEERD', code: 'CAE' },
  { name: 'College of Natural Resources and Environmental Management', shortName: 'CNREM', code: 'CNR' },
  { name: 'College of Physical and Applied Sciences', shortName: 'CPAS', code: 'CPA' },
  { name: 'College of Engineering and Engineering Technology', shortName: 'CEET', code: 'CEE' },
  { name: 'College of Management Sciences', shortName: 'COMS', code: 'COM' },
  { name: 'College of Postgraduate Studies', shortName: 'COPS', code: 'COP' },
]

const DEPARTMENTS = [
  // CAEERD
  { name: 'Agricultural Economics', shortName: 'Ag Econ', code: 'AGE', collegeCode: 'CAE' },
  { name: 'Agricultural Extension', shortName: 'Ag Ext', code: 'AGX', collegeCode: 'CAE' },
  { name: 'Rural Development', shortName: 'Rural Dev', code: 'RUD', collegeCode: 'CAE' },
  
  // CNREM
  { name: 'Forestry and Environmental Management', shortName: 'Forestry', code: 'FRY', collegeCode: 'CNR' },
  { name: 'Environmental Management', shortName: 'Env Mgmt', code: 'ENV', collegeCode: 'CNR' },
  
  // CPAS
  { name: 'Computer Science', shortName: 'Comp Sci', code: 'CSC', collegeCode: 'CPA' },
  { name: 'Mathematics', shortName: 'Maths', code: 'MTH', collegeCode: 'CPA' },
  { name: 'Physics', shortName: 'Physics', code: 'PHY', collegeCode: 'CPA' },
  { name: 'Chemistry', shortName: 'Chemistry', code: 'CHM', collegeCode: 'CPA' },
  { name: 'Statistics', shortName: 'Stats', code: 'STA', collegeCode: 'CPA' },
  
  // CEET
  { name: 'Agricultural Engineering', shortName: 'Ag Eng', code: 'AGE', collegeCode: 'CEE' },
  { name: 'Electrical and Electronic Engineering', shortName: 'EEE', code: 'EEE', collegeCode: 'CEE' },
  { name: 'Mechanical Engineering', shortName: 'Mech Eng', code: 'MEE', collegeCode: 'CEE' },
  { name: 'Civil Engineering', shortName: 'Civ Eng', code: 'CVE', collegeCode: 'CEE' },
  
  // COMS
  { name: 'Business Administration', shortName: 'Bus Admin', code: 'BUS', collegeCode: 'COM' },
  { name: 'Accounting', shortName: 'Accounting', code: 'ACC', collegeCode: 'COM' },
  { name: 'Economics', shortName: 'Economics', code: 'ECO', collegeCode: 'COM' },
  { name: 'Banking and Finance', shortName: 'Banking', code: 'BNK', collegeCode: 'COM' },
  
  // COPS
  { name: 'Postgraduate Studies', shortName: 'PG Studies', code: 'PGS', collegeCode: 'COP' },
]

const COURSES = [
  // Computer Science (CSC) - 100 Level
  { code: 'CSC101', title: 'Introduction to Computer Science', creditUnits: 2, deptCode: 'CSC', level: 100 },
  { code: 'CSC102', title: 'Programming Fundamentals', creditUnits: 3, deptCode: 'CSC', level: 100 },
  { code: 'CSC103', title: 'Discrete Mathematics', creditUnits: 2, deptCode: 'CSC', level: 100 },
  
  // Computer Science - 200 Level
  { code: 'CSC201', title: 'Data Structures and Algorithms', creditUnits: 3, deptCode: 'CSC', level: 200 },
  { code: 'CSC202', title: 'Database Management Systems', creditUnits: 3, deptCode: 'CSC', level: 200 },
  { code: 'CSC203', title: 'Operating Systems', creditUnits: 3, deptCode: 'CSC', level: 200 },
  { code: 'CSC204', title: 'Object-Oriented Programming', creditUnits: 3, deptCode: 'CSC', level: 200 },
  { code: 'CSC205', title: 'Computer Architecture', creditUnits: 2, deptCode: 'CSC', level: 200 },
  
  // Mathematics (MTH) - 100 Level
  { code: 'MTH101', title: 'Algebra and Trigonometry', creditUnits: 3, deptCode: 'MTH', level: 100 },
  { code: 'MTH102', title: 'Calculus I', creditUnits: 3, deptCode: 'MTH', level: 100 },
  
  // Mathematics - 200 Level
  { code: 'MTH201', title: 'Calculus II', creditUnits: 3, deptCode: 'MTH', level: 200 },
  { code: 'MTH202', title: 'Linear Algebra', creditUnits: 3, deptCode: 'MTH', level: 200 },
  { code: 'MTH203', title: 'Differential Equations', creditUnits: 3, deptCode: 'MTH', level: 200 },
  
  // Physics (PHY) - 100 Level
  { code: 'PHY101', title: 'General Physics I', creditUnits: 3, deptCode: 'PHY', level: 100 },
  { code: 'PHY102', title: 'General Physics II', creditUnits: 3, deptCode: 'PHY', level: 100 },
  
  // Physics - 200 Level
  { code: 'PHY201', title: 'Classical Mechanics', creditUnits: 3, deptCode: 'PHY', level: 200 },
  { code: 'PHY202', title: 'Electromagnetism', creditUnits: 3, deptCode: 'PHY', level: 200 },
  { code: 'PHY203', title: 'Thermodynamics', creditUnits: 2, deptCode: 'PHY', level: 200 },
  
  // Chemistry (CHM) - 100 Level
  { code: 'CHM101', title: 'General Chemistry I', creditUnits: 3, deptCode: 'CHM', level: 100 },
  { code: 'CHM102', title: 'General Chemistry II', creditUnits: 3, deptCode: 'CHM', level: 100 },
  
  // Chemistry - 200 Level
  { code: 'CHM201', title: 'Organic Chemistry I', creditUnits: 3, deptCode: 'CHM', level: 200 },
  { code: 'CHM202', title: 'Inorganic Chemistry I', creditUnits: 3, deptCode: 'CHM', level: 200 },
  { code: 'CHM203', title: 'Physical Chemistry I', creditUnits: 3, deptCode: 'CHM', level: 200 },
  
  // Statistics (STA) - 100 Level
  { code: 'STA101', title: 'Introduction to Statistics', creditUnits: 3, deptCode: 'STA', level: 100 },
  
  // Statistics - 200 Level
  { code: 'STA201', title: 'Probability Theory', creditUnits: 3, deptCode: 'STA', level: 200 },
  { code: 'STA202', title: 'Statistical Inference', creditUnits: 3, deptCode: 'STA', level: 200 },
  
  // Agricultural Economics (AGE) - 100 Level
  { code: 'AGE101', title: 'Introduction to Agricultural Economics', creditUnits: 2, deptCode: 'AGE', level: 100 },
  
  // Agricultural Economics - 200 Level
  { code: 'AGE201', title: 'Microeconomic Theory', creditUnits: 3, deptCode: 'AGE', level: 200 },
  { code: 'AGE202', title: 'Agricultural Production Economics', creditUnits: 3, deptCode: 'AGE', level: 200 },
  
  // Agricultural Extension (AGX) - 100 Level
  { code: 'AGX101', title: 'Introduction to Agricultural Extension', creditUnits: 2, deptCode: 'AGX', level: 100 },
  
  // Agricultural Extension - 200 Level
  { code: 'AGX201', title: 'Agricultural Communication', creditUnits: 3, deptCode: 'AGX', level: 200 },
  { code: 'AGX202', title: 'Extension Program Planning', creditUnits: 2, deptCode: 'AGX', level: 200 },
  
  // Business Administration (BUS) - 100 Level
  { code: 'BUS101', title: 'Introduction to Business', creditUnits: 2, deptCode: 'BUS', level: 100 },
  
  // Business Administration - 200 Level
  { code: 'BUS201', title: 'Management Principles', creditUnits: 3, deptCode: 'BUS', level: 200 },
  { code: 'BUS202', title: 'Organizational Behavior', creditUnits: 3, deptCode: 'BUS', level: 200 },
  
  // Accounting (ACC) - 100 Level
  { code: 'ACC101', title: 'Introduction to Accounting', creditUnits: 2, deptCode: 'ACC', level: 100 },
  
  // Accounting - 200 Level
  { code: 'ACC201', title: 'Financial Accounting', creditUnits: 3, deptCode: 'ACC', level: 200 },
  { code: 'ACC202', title: 'Management Accounting', creditUnits: 3, deptCode: 'ACC', level: 200 },
  
  // Economics (ECO) - 100 Level
  { code: 'ECO101', title: 'Introduction to Economics', creditUnits: 2, deptCode: 'ECO', level: 100 },
  
  // Economics - 200 Level
  { code: 'ECO201', title: 'Microeconomics', creditUnits: 3, deptCode: 'ECO', level: 200 },
  { code: 'ECO202', title: 'Macroeconomics', creditUnits: 3, deptCode: 'ECO', level: 200 },
  
  // General Courses
  { code: 'GSS101', title: 'General Studies: Communication Skills', creditUnits: 2, deptCode: 'CSC', level: 100 },
  { code: 'GSS102', title: 'General Studies: Nigerian People and Culture', creditUnits: 2, deptCode: 'CSC', level: 100 },
]

const ADMINS = [
  {
    email: 'admin@mouau.edu.ng',
    staffNumber: 'MOUAU/ADMIN/001',
    firstName: 'System',
    lastName: 'Administrator',
    primaryRole: StaffRole.SUPER_ADMIN,
    role: 'SUPER_ADMIN',
  },
  {
    email: 'registrar@mouau.edu.ng',
    staffNumber: 'MOUAU/REG/001',
    firstName: 'University',
    lastName: 'Registrar',
    primaryRole: StaffRole.REGISTRAR,
    role: 'REGISTRAR',
  },
  {
    email: 'exam@mouau.edu.ng',
    staffNumber: 'MOUAU/EXAM/001',
    firstName: 'University',
    lastName: 'Examination Officer',
    primaryRole: StaffRole.UNIVERSITY_EXAM_OFFICER,
    role: 'UNIVERSITY_EXAM_OFFICER',
  },
]

// ─── Seed ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding MOUAU eTest...\n')

  // 1. University
  console.log('  → University...')
  const university = await prisma.university.upsert({
    where: { shortName: 'MOUAU' },
    create: {
      name: 'Michael Okpara University of Agriculture, Umudike',
      shortName: 'MOUAU',
      website: 'https://mouau.edu.ng',
      email: 'info@mouau.edu.ng',
      address: 'Umudike, Abia State, Nigeria',
    },
    update: {},
  })
  console.log(`     ✓ ${university.name}`)

  // 2. Colleges
  console.log('\n  → Colleges...')
  const collegeMap = new Map()
  for (const college of COLLEGES) {
    const created = await prisma.college.upsert({
      where: { code: college.code },
      create: {
        universityId: university.id,
        name: college.name,
        shortName: college.shortName,
        code: college.code,
      },
      update: {},
    })
    collegeMap.set(college.code, created)
    console.log(`     ✓ ${college.shortName} (${college.code})`)
  }

  // 3. Departments
  console.log('\n  → Departments...')
  const deptMap = new Map()
  for (const dept of DEPARTMENTS) {
    const college = collegeMap.get(dept.collegeCode)
    if (!college) {
      console.warn(`     ⚠️ College ${dept.collegeCode} not found for ${dept.name}`)
      continue
    }
    const created = await prisma.department.upsert({
      where: { code: dept.code },
      create: {
        collegeId: college.id,
        name: dept.name,
        shortName: dept.shortName,
        code: dept.code,
      },
      update: {},
    })
    deptMap.set(dept.code, created)
    console.log(`     ✓ ${dept.shortName} (${dept.code})`)
  }

  // 4. Levels (100-200)
  console.log('\n  → Academic levels...')
  const levelMap = new Map()
  for (const lvl of [100, 200]) {
    const created = await prisma.level.upsert({
      where: { name: lvl },
      create: { name: lvl, label: `${lvl} Level` },
      update: {},
    })
    levelMap.set(lvl, created)
    console.log(`     ✓ ${lvl} Level`)
  }

  // 5. Courses
  console.log('\n  → Courses...')
  for (const course of COURSES) {
    const dept = deptMap.get(course.deptCode)
    const level = levelMap.get(course.level)
    if (!dept) {
      console.warn(`     ⚠️ Department ${course.deptCode} not found for ${course.code}`)
      continue
    }
    if (!level) {
      console.warn(`     ⚠️ Level ${course.level} not found for ${course.code}`)
      continue
    }
    await prisma.course.upsert({
      where: { code: course.code },
      create: {
        departmentId: dept.id,
        levelId: level.id,
        code: course.code,
        title: course.title,
        creditUnits: course.creditUnits,
        type: 'COMPULSORY',
        status: 'ACTIVE',
      },
      update: {},
    })
    console.log(`     ✓ ${course.code}: ${course.title} (${course.creditUnits} units)`)
  }

  // 6. Create academic session (minimal for schema compatibility)
  console.log('\n  → Academic session...')
  const now = new Date()
  const year = now.getFullYear()
  const sessionName = `${year}/${year + 1}`
  
  const session = await prisma.academicSession.upsert({
    where: { name: sessionName },
    create: {
      name: sessionName,
      startDate: new Date(year, 8, 1),
      endDate: new Date(year + 1, 7, 31),
      status: 'ACTIVE',
      isCurrent: true,
    },
    update: {},
  })
  console.log(`     ✓ Session: ${session.name}`)

  // Create semesters
  for (const semType of ['FIRST', 'SECOND'] as const) {
    await prisma.semester.upsert({
      where: { sessionId_type: { sessionId: session.id, type: semType as any } },
      create: {
        sessionId: session.id,
        type: semType as any,
        startDate: new Date(year, semType === 'FIRST' ? 8 : 0, 1),
        endDate: new Date(year + 1, semType === 'FIRST' ? 11 : 5, 31),
        isCurrent: semType === 'FIRST',
      },
      update: {},
    })
    console.log(`     ✓ ${semType} Semester`)
  }

  // 7. Admin accounts
  console.log('\n  → Admin accounts...')
  for (const adminData of ADMINS) {
    const passwordHash = await bcrypt.hash('Admin@1234', 12)
    
    const admin = await prisma.staff.upsert({
      where: { email: adminData.email },
      create: {
        staffNumber: adminData.staffNumber,
        email: adminData.email,
        emailHash: adminData.email,
        passwordHash,
        firstName: adminData.firstName,
        lastName: adminData.lastName,
        primaryRole: adminData.primaryRole,
        status: 'ACTIVE',
        mustChangePassword: true,
      },
      update: {},
    })

    // Get role
    const role = await prisma.role.findUnique({
      where: { name: adminData.role },
    })

    if (role) {
      await prisma.staffRoleAssignment.upsert({
        where: { staffId_roleId: { staffId: admin.id, roleId: role.id } },
        create: { staffId: admin.id, roleId: role.id, isActive: true },
        update: {},
      })
    }

    console.log(`     ✓ ${adminData.email} / Admin@1234  ← CHANGE ON FIRST LOGIN`)
  }

  console.log('\n✅ Seed complete!\n')
  console.log('   Admin Accounts:')
  console.log('   ────────────────')
  console.log('   📧 admin@mouau.edu.ng      → Super Administrator')
  console.log('   📧 registrar@mouau.edu.ng  → Registrar')
  console.log('   📧 exam@mouau.edu.ng       → University Examination Officer')
  console.log('   🔑 Password: Admin@1234 (CHANGE ON FIRST LOGIN)\n')
  console.log('   Next steps:')
  console.log('   1. Update DATABASE_URL in .env')
  console.log('   2. pnpm prisma migrate dev --name init_schema')
  console.log('   3. pnpm prisma db seed')
  console.log('   4. Log in at /login → change password immediately\n')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())