// prisma/seed.ts
// Run: pnpm prisma db seed

import 'dotenv/config'
import { PrismaClient, StaffRole, SemesterType, AcademicSessionStatus, ProgrammeType } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

// ─── Data ────────────────────────────────────────────────────────────────────

const COLLEGES = [
  { code: 'CAERSE', name: 'College of Agricultural Economics, Rural Sociology & Extension', shortName: 'CAERSE' },
  { code: 'CASAP', name: 'College Of Animal Science & Animal Production', shortName: 'CASAP' },
  { code: 'CAFST', name: 'College Of Applied Food Science & Tourism', shortName: 'CAFST' },
  { code: 'CCSS', name: 'College Of Crop & Soil Sciences', shortName: 'CCSS' },
  { code: 'COED', name: 'College Of Education', shortName: 'COED' },
  { code: 'CEET', name: 'College Of Engineering & Engineering Technology', shortName: 'CEET' },
  { code: 'COLMAS', name: 'College Of Management Science', shortName: 'COLMAS' },
  { code: 'CNREM', name: 'College Of Natural Resources & Environmental Management', shortName: 'CNREM' },
  { code: 'COLNAS', name: 'College Of Natural Science', shortName: 'COLNAS' },
  { code: 'COLPAS', name: 'College Of Physical & Applied Science', shortName: 'COLPAS' },
  { code: 'CVM', name: 'College Of Veterinary Medicine', shortName: 'CVM' },
  { code: 'SGS', name: 'School Of General Studies', shortName: 'SGS' },
]

const DEPARTMENTS = [
  // CAERSE - College of Agricultural Economics, Rural Sociology & Extension
  { name: 'Agribusiness and Management', shortName: 'Agribusiness', code: 'AGB', collegeCode: 'CAERSE' },
  { name: 'Agricultural Economics', shortName: 'Ag Econ', code: 'AGE', collegeCode: 'CAERSE' },
  { name: 'Agricultural Extension and Rural Sociology', shortName: 'Ag Ext', code: 'AGX', collegeCode: 'CAERSE' },
  
  // CASAP - College of Animal Science & Animal Production
  { name: 'Animal Breeding And Physiology', shortName: 'Animal Breeding', code: 'ABP', collegeCode: 'CASAP' },
  { name: 'Animal Nutrition And Forage Science', shortName: 'Animal Nutrition', code: 'ANF', collegeCode: 'CASAP' },
  { name: 'Animal Production and Livestock Management', shortName: 'Animal Prod', code: 'APL', collegeCode: 'CASAP' },
  
  // CAFST - College of Applied Food Science & Tourism
  { name: 'Human Nutrition and Dietetics', shortName: 'Human Nutrition', code: 'HND', collegeCode: 'CAFST' },
  { name: 'Home Science/Hospitality Management & Tourism', shortName: 'Home Science', code: 'HSM', collegeCode: 'CAFST' },
  { name: 'Food Science and Technology', shortName: 'Food Sci', code: 'FST', collegeCode: 'CAFST' },
  
  // CCSS - College of Crop & Soil Sciences
  { name: 'Agronomy', shortName: 'Agronomy', code: 'AGR', collegeCode: 'CCSS' },
  { name: 'Plant Health Management', shortName: 'Plant Health', code: 'PHM', collegeCode: 'CCSS' },
  { name: 'Soil Science and Meteorology', shortName: 'Soil Sci', code: 'SSM', collegeCode: 'CCSS' },
  { name: 'Water Resources Management and Agrometeorology', shortName: 'Water Res', code: 'WRM', collegeCode: 'CCSS' },
  
  // COED - College of Education
  { name: 'Adult and Continuing Education', shortName: 'Adult Ed', code: 'ACE', collegeCode: 'COED' },
  { name: 'Agricultural/Home Science Education', shortName: 'Ag Ed', code: 'AHE', collegeCode: 'COED' },
  { name: 'Business Education', shortName: 'Bus Ed', code: 'BED', collegeCode: 'COED' },
  { name: 'Economics Education', shortName: 'Econ Ed', code: 'EED', collegeCode: 'COED' },
  { name: 'Education Management', shortName: 'Edu Mgmt', code: 'EDM', collegeCode: 'COED' },
  { name: 'Industrial Technology Education', shortName: 'Ind Tech', code: 'ITE', collegeCode: 'COED' },
  { name: 'Library and Information Science', shortName: 'Library Sci', code: 'LIS', collegeCode: 'COED' },
  { name: 'Guidance and Counselling', shortName: 'Guidance', code: 'GAC', collegeCode: 'COED' },
  { name: 'Integrated Science Education', shortName: 'Int Sci', code: 'ISE', collegeCode: 'COED' },
  
  // CEET - College of Engineering & Engineering Technology
  { name: 'Agricultural and Bioresources Engineering', shortName: 'Ag Eng', code: 'ABE', collegeCode: 'CEET' },
  { name: 'Civil Engineering', shortName: 'Civ Eng', code: 'CVE', collegeCode: 'CEET' },
  { name: 'Chemical Engineering', shortName: 'Chem Eng', code: 'CHE', collegeCode: 'CEET' },
  { name: 'Computer Engineering', shortName: 'Comp Eng', code: 'CPE', collegeCode: 'CEET' },
  { name: 'Electrical and Electronics Engineering', shortName: 'EEE', code: 'EEE', collegeCode: 'CEET' },
  { name: 'Mechanical Engineering', shortName: 'Mech Eng', code: 'MEE', collegeCode: 'CEET' },
  
  // COLMAS - College of Management Science
  { name: 'Marketing', shortName: 'Marketing', code: 'MKT', collegeCode: 'COLMAS' },
  { name: 'Accounting', shortName: 'Accounting', code: 'ACC', collegeCode: 'COLMAS' },
  { name: 'Banking and Finance', shortName: 'Banking', code: 'BNK', collegeCode: 'COLMAS' },
  { name: 'Economics', shortName: 'Economics', code: 'ECO', collegeCode: 'COLMAS' },
  { name: 'Industrial Relations and Personnel Management', shortName: 'IRPM', code: 'IRP', collegeCode: 'COLMAS' },
  { name: 'Entrepreneurial Studies', shortName: 'Entrepreneur', code: 'ENT', collegeCode: 'COLMAS' },
  { name: 'Business Administration', shortName: 'Bus Admin', code: 'BUS', collegeCode: 'COLMAS' },
  
  // CNREM - College of Natural Resources & Environmental Management
  { name: 'Environment Management and Toxicology', shortName: 'Env Tox', code: 'EMT', collegeCode: 'CNREM' },
  { name: 'Fisheries and Aquatic Resources Management', shortName: 'Fisheries', code: 'FAR', collegeCode: 'CNREM' },
  { name: 'Forestry and Environmental Management', shortName: 'Forestry', code: 'FRY', collegeCode: 'CNREM' },
  
  // COLNAS - College of Natural Science
  { name: 'Biochemistry', shortName: 'Biochem', code: 'BCH', collegeCode: 'COLNAS' },
  { name: 'Microbiology', shortName: 'Microbio', code: 'MCB', collegeCode: 'COLNAS' },
  { name: 'Plant Science and Biotechnology', shortName: 'Plant Sci', code: 'PSB', collegeCode: 'COLNAS' },
  { name: 'Zoology and Environmental Biology', shortName: 'Zoology', code: 'ZEB', collegeCode: 'COLNAS' },
  
  // COLPAS - College of Physical & Applied Science
  { name: 'Chemistry', shortName: 'Chemistry', code: 'CHM', collegeCode: 'COLPAS' },
  { name: 'Computer Science', shortName: 'Comp Sci', code: 'CSC', collegeCode: 'COLPAS' },
  { name: 'Geology', shortName: 'Geology', code: 'GEO', collegeCode: 'COLPAS' },
  { name: 'Mathematics', shortName: 'Maths', code: 'MTH', collegeCode: 'COLPAS' },
  { name: 'Physics', shortName: 'Physics', code: 'PHY', collegeCode: 'COLPAS' },
  { name: 'Statistics', shortName: 'Stats', code: 'STA', collegeCode: 'COLPAS' },
  
  // CVM - College of Veterinary Medicine
  { name: 'Theriogenology', shortName: 'Theriogenology', code: 'THE', collegeCode: 'CVM' },
  { name: 'Veterinary Anatomy', shortName: 'Vet Anatomy', code: 'VAN', collegeCode: 'CVM' },
  { name: 'Veterinary Medicine', shortName: 'Vet Medicine', code: 'VME', collegeCode: 'CVM' },
  { name: 'Veterinary Microbiology', shortName: 'Vet Microbio', code: 'VMB', collegeCode: 'CVM' },
  { name: 'Veterinary Public Health and Preventive Medicine', shortName: 'Vet Public Health', code: 'VPH', collegeCode: 'CVM' },
  { name: 'Veterinary Surgery and Radiology', shortName: 'Vet Surgery', code: 'VSR', collegeCode: 'CVM' },
  
  // SGS - School of General Studies
  { name: 'English', shortName: 'English', code: 'ENG', collegeCode: 'SGS' },
  { name: 'French', shortName: 'French', code: 'FRE', collegeCode: 'SGS' },
  { name: 'German', shortName: 'German', code: 'GER', collegeCode: 'SGS' },
  { name: 'History', shortName: 'History', code: 'HIS', collegeCode: 'SGS' },
  { name: 'Social Science', shortName: 'Soc Sci', code: 'SOS', collegeCode: 'SGS' },
  { name: 'Physical and Health', shortName: 'Phys Ed', code: 'PHE', collegeCode: 'SGS' },
  { name: 'Philosophy', shortName: 'Philosophy', code: 'PHL', collegeCode: 'SGS' },
  { name: 'Peace and Conflict', shortName: 'Peace', code: 'PEC', collegeCode: 'SGS' },
]

// ─── Helper Functions ───────────────────────────────────────────────────────

function getAcademicSession(now: Date) {
  const year = now.getFullYear()
  const month = now.getMonth()
  const startYear = month >= 8 ? year : year - 1
  const endYear = startYear + 1
  
  return {
    name: `${startYear}/${endYear}`,
    startDate: new Date(startYear, 8, 1),
    endDate: new Date(endYear, 7, 31),
  }
}

function getSemesterWindows(startYear: number, endYear: number, now: Date) {
  const first = {
    type: SemesterType.FIRST,
    startDate: new Date(startYear, 8, 16),
    endDate: new Date(endYear, 0, 31),
    regOpenAt: new Date(startYear, 8, 1),
    regCloseAt: new Date(startYear, 8, 30),
  }

  const second = {
    type: SemesterType.SECOND,
    startDate: new Date(endYear, 1, 10),
    endDate: new Date(endYear, 5, 30),
    regOpenAt: new Date(endYear, 1, 1),
    regCloseAt: new Date(endYear, 1, 28),
  }

  const inFirst = now >= first.startDate && now <= first.endDate
  const inSecond = now >= second.startDate && now <= second.endDate

  let currentType: SemesterType
  if (inFirst) currentType = SemesterType.FIRST
  else if (inSecond) currentType = SemesterType.SECOND
  else currentType = now > second.endDate ? SemesterType.SECOND : SemesterType.FIRST

  return [
    { ...first, isCurrent: currentType === SemesterType.FIRST },
    { ...second, isCurrent: currentType === SemesterType.SECOND },
  ]
}

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
      where: {
        universityId_shortName: {
          universityId: university.id,
          shortName: college.shortName
        }
      },
      create: {
        universityId: university.id,
        name: college.name,
        shortName: college.shortName,
        code: college.code,
      },
      update: {
        name: college.name,
        code: college.code,
      },
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
      where: {
        collegeId_shortName: {
          collegeId: college.id,
          shortName: dept.shortName
        }
      },
      create: {
        collegeId: college.id,
        name: dept.name,
        shortName: dept.shortName,
        code: dept.code,
      },
      update: {
        name: dept.name,
        code: dept.code,
      },
    })
    deptMap.set(dept.code, created)
    console.log(`     ✓ ${dept.shortName} (${dept.code})`)
  }

  // 4. Levels
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

  // 5. Programmes for each department (Regular, CEC, PG)
  console.log('\n  → Programmes...')
  const programmeTypes = [
    { type: ProgrammeType.UNDERGRADUATE, shortName: 'UND-REG', duration: 4 },
    { type: ProgrammeType.UNDERGRADUATE, shortName: 'CEC', duration: 4 },
    { type: ProgrammeType.POSTGRADUATE_DIPLOMA, shortName: 'PG', duration: 2 },
  ]

  let programmeCount = 0
  for (const [deptCode, dept] of deptMap) {
    for (const prog of programmeTypes) {
      const progName = `${dept.name} (${prog.shortName})`
      const progShortName = `${dept.shortName}-${prog.shortName}`
      
      await prisma.programme.upsert({
        where: {
          departmentId_shortName: {
            departmentId: dept.id,
            shortName: progShortName
          }
        },
        create: {
          departmentId: dept.id,
          name: progName,
          shortName: progShortName,
          type: prog.type,
          durationYears: prog.duration,
          isActive: true,
        },
        update: {
          name: progName,
          type: prog.type,
          durationYears: prog.duration,
          isActive: true,
        },
      })
      programmeCount++
    }
  }
  console.log(`     ✓ ${programmeCount} programmes created (Regular, CEC, PG for each department)`)

  // 6. Academic session
  console.log('\n  → Academic session...')
  const now = new Date()
  const { name: sessionName, startDate: sessionStart, endDate: sessionEnd } = getAcademicSession(now)

  const session = await prisma.academicSession.upsert({
    where: { name: sessionName },
    create: {
      name: sessionName,
      startDate: sessionStart,
      endDate: sessionEnd,
      status: AcademicSessionStatus.ACTIVE,
      isCurrent: true,
    },
    update: {},
  })

  const startYear = sessionStart.getFullYear()
  const endYear = sessionEnd.getFullYear()

  for (const sem of getSemesterWindows(startYear, endYear, now)) {
    await prisma.semester.upsert({
      where: { sessionId_type: { sessionId: session.id, type: sem.type } },
      create: {
        sessionId: session.id,
        type: sem.type,
        startDate: sem.startDate,
        endDate: sem.endDate,
        regOpenAt: sem.regOpenAt,
        regCloseAt: sem.regCloseAt,
        isCurrent: sem.isCurrent,
      },
      update: { isCurrent: sem.isCurrent },
    })
    console.log(`     ✓ ${sem.type} Semester`)
  }
  console.log(`     ✓ Session: ${session.name}`)

  // 7. Admin accounts
  console.log('\n  → Admin accounts...')
  const admins = [
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

  for (const adminData of admins) {
    const passwordHash = await bcrypt.hash('Admin@1234', 12)
    
    const admin = await prisma.staff.upsert({
      where: { emailHash: adminData.email },
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

    console.log(`     ✓ ${adminData.email} / Admin@1234 (${adminData.primaryRole})`)
  }

  // 8. Examiners
  console.log('\n  → Examiners & Examination Officers...')
  const examiners = [
    {
      email: 'dr.adebayo@mouau.edu.ng',
      staffNumber: 'MOUAU/EXAM/002',
      firstName: 'Adebayo',
      lastName: 'Ogunleye',
      primaryRole: StaffRole.DEPARTMENT_EXAM_OFFICER,
      role: 'DEPARTMENT_EXAM_OFFICER',
      department: 'CSC',
    },
    {
      email: 'dr.okechukwu@mouau.edu.ng',
      staffNumber: 'MOUAU/EXAM/003',
      firstName: 'Okechukwu',
      lastName: 'Nwosu',
      primaryRole: StaffRole.DEPARTMENT_EXAM_OFFICER,
      role: 'DEPARTMENT_EXAM_OFFICER',
      department: 'MTH',
    },
    {
      email: 'dr.chioma@mouau.edu.ng',
      staffNumber: 'MOUAU/EXAM/004',
      firstName: 'Chioma',
      lastName: 'Eze',
      primaryRole: StaffRole.DEPARTMENT_EXAM_OFFICER,
      role: 'DEPARTMENT_EXAM_OFFICER',
      department: 'PHY',
    },
    {
      email: 'dr.ibrahim@mouau.edu.ng',
      staffNumber: 'MOUAU/EXAM/005',
      firstName: 'Ibrahim',
      lastName: 'Bello',
      primaryRole: StaffRole.COLLEGE_EXAM_OFFICER,
      role: 'COLLEGE_EXAM_OFFICER',
      department: 'CSC',
    },
    {
      email: 'dr.fatima@mouau.edu.ng',
      staffNumber: 'MOUAU/EXAM/006',
      firstName: 'Fatima',
      lastName: 'Mohammed',
      primaryRole: StaffRole.LECTURER,
      role: 'LECTURER',
      department: 'CSC',
    },
  ]

  for (const examiner of examiners) {
    const passwordHash = await bcrypt.hash('Examiner@1234', 12)
    
    let departmentId = null
    if (examiner.department) {
      const dept = deptMap.get(examiner.department)
      if (dept) departmentId = dept.id
    }

    const staff = await prisma.staff.upsert({
      where: { emailHash: examiner.email },
      create: {
        staffNumber: examiner.staffNumber,
        email: examiner.email,
        emailHash: examiner.email,
        passwordHash,
        firstName: examiner.firstName,
        lastName: examiner.lastName,
        primaryRole: examiner.primaryRole,
        departmentId: departmentId,
        status: 'ACTIVE',
        mustChangePassword: true,
      },
      update: {},
    })

    const role = await prisma.role.findUnique({
      where: { name: examiner.role },
    })

    if (role) {
      await prisma.staffRoleAssignment.upsert({
        where: { staffId_roleId: { staffId: staff.id, roleId: role.id } },
        create: { staffId: staff.id, roleId: role.id, isActive: true },
        update: {},
      })
    }

    console.log(`     ✓ ${examiner.email} / Examiner@1234 (${examiner.primaryRole})`)
  }

  // 9. Grade scale
  console.log('\n  → Grade scale...')
  const GRADE_SCALE = [
    { label: 'A' as const, minPercent: 70, maxPercent: 100, points: 5.0, description: 'Excellent' },
    { label: 'B' as const, minPercent: 60, maxPercent: 69.99, points: 4.0, description: 'Very Good' },
    { label: 'C' as const, minPercent: 50, maxPercent: 59.99, points: 3.0, description: 'Good' },
    { label: 'D' as const, minPercent: 45, maxPercent: 49.99, points: 2.0, description: 'Fair' },
    { label: 'E' as const, minPercent: 40, maxPercent: 44.99, points: 1.0, description: 'Pass' },
    { label: 'F' as const, minPercent: 0, maxPercent: 39.99, points: 0.0, description: 'Fail' },
  ]
  
  for (const tier of GRADE_SCALE) {
    await prisma.gradeScale.upsert({
      where: { label: tier.label },
      create: tier,
      update: tier,
    })
  }
  console.log(`     ✓ ${GRADE_SCALE.length} grade scales seeded`)

  console.log('\n✅ Seed complete!\n')
  console.log(`   🏫 ${COLLEGES.length} Colleges`)
  console.log(`   📚 ${DEPARTMENTS.length} Departments`)
  console.log(`   📖 Levels: 100-700`)
  console.log(`   📚 ${programmeCount} Programmes (Regular, CEC, PG for each department)`)
  console.log(`   📅 Session: ${sessionName}\n`)
  
  console.log('   ─── Admin Accounts ───')
  console.log('   📧 admin@mouau.edu.ng      → Super Administrator')
  console.log('   📧 registrar@mouau.edu.ng  → Registrar')
  console.log('   📧 exam@mouau.edu.ng       → University Examination Officer')
  console.log('   🔑 Password: Admin@1234 (CHANGE ON FIRST LOGIN)\n')
  
  console.log('   ─── Examiners ───')
  console.log('   📧 dr.adebayo@mouau.edu.ng   → Department Examination Officer (CSC)')
  console.log('   📧 dr.okechukwu@mouau.edu.ng → Department Examination Officer (MTH)')
  console.log('   📧 dr.chioma@mouau.edu.ng    → Department Examination Officer (PHY)')
  console.log('   📧 dr.ibrahim@mouau.edu.ng   → College Examination Officer')
  console.log('   📧 dr.fatima@mouau.edu.ng    → Lecturer (CSC)')
  console.log('   🔑 Password: Examiner@1234 (CHANGE ON FIRST LOGIN)\n')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())