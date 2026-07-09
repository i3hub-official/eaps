// prisma/seed.ts
// Run: pnpm prisma db seed

import 'dotenv/config'
import { PrismaClient, StaffRole, SemesterType, AcademicSessionStatus, ProgrammeType, CourseType, CourseStatus } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

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

// ─── Sample Courses ──────────────────────────────────────────────────────────

// ─── Sample Courses (100 & 200 Levels Only) ──────────────────────────────

const COURSES = [
  // Computer Science Department (CSC)
  // 100 Level - First Semester (second digit = 1)
  { code: 'CSC112', title: 'Introduction to Computer Science', creditUnits: 3, level: 100, deptCode: 'CSC', type: CourseType.COMPULSORY },
  { code: 'CSC114', title: 'Programming Fundamentals', creditUnits: 3, level: 100, deptCode: 'CSC', type: CourseType.COMPULSORY },
  { code: 'CSC117', title: 'Discrete Mathematics', creditUnits: 2, level: 100, deptCode: 'CSC', type: CourseType.COMPULSORY },
  // 100 Level - Second Semester (second digit = 2)
  { code: 'CSC125', title: 'Introduction to Web Technologies', creditUnits: 3, level: 100, deptCode: 'CSC', type: CourseType.COMPULSORY },
  { code: 'CSC128', title: 'Computer Applications', creditUnits: 2, level: 100, deptCode: 'CSC', type: CourseType.COMPULSORY },
  
  // 200 Level - First Semester (second digit = 1)
  { code: 'CSC211', title: 'Data Structures and Algorithms', creditUnits: 3, level: 200, deptCode: 'CSC', type: CourseType.COMPULSORY },
  { code: 'CSC216', title: 'Database Management Systems', creditUnits: 3, level: 200, deptCode: 'CSC', type: CourseType.COMPULSORY },
  { code: 'CSC218', title: 'Object-Oriented Programming', creditUnits: 3, level: 200, deptCode: 'CSC', type: CourseType.COMPULSORY },
  // 200 Level - Second Semester (second digit = 2)
  { code: 'CSC224', title: 'Computer Architecture', creditUnits: 2, level: 200, deptCode: 'CSC', type: CourseType.COMPULSORY },
  { code: 'CSC227', title: 'Operating Systems', creditUnits: 3, level: 200, deptCode: 'CSC', type: CourseType.COMPULSORY },

  // Mathematics Department (MTH)
  // 100 Level - First Semester
  { code: 'MTH111', title: 'Algebra and Trigonometry', creditUnits: 3, level: 100, deptCode: 'MTH', type: CourseType.COMPULSORY },
  { code: 'MTH115', title: 'Calculus I', creditUnits: 3, level: 100, deptCode: 'MTH', type: CourseType.COMPULSORY },
  { code: 'MTH118', title: 'Analytical Geometry', creditUnits: 2, level: 100, deptCode: 'MTH', type: CourseType.COMPULSORY },
  // 100 Level - Second Semester
  { code: 'MTH124', title: 'Calculus II', creditUnits: 3, level: 100, deptCode: 'MTH', type: CourseType.COMPULSORY },
  { code: 'MTH127', title: 'Introduction to Statistics', creditUnits: 2, level: 100, deptCode: 'MTH', type: CourseType.COMPULSORY },
  
  // 200 Level - First Semester
  { code: 'MTH212', title: 'Linear Algebra I', creditUnits: 3, level: 200, deptCode: 'MTH', type: CourseType.COMPULSORY },
  { code: 'MTH216', title: 'Differential Equations', creditUnits: 3, level: 200, deptCode: 'MTH', type: CourseType.COMPULSORY },
  // 200 Level - Second Semester
  { code: 'MTH223', title: 'Linear Algebra II', creditUnits: 3, level: 200, deptCode: 'MTH', type: CourseType.COMPULSORY },
  { code: 'MTH226', title: 'Numerical Analysis', creditUnits: 3, level: 200, deptCode: 'MTH', type: CourseType.COMPULSORY },

  // Physics Department (PHY)
  // 100 Level - First Semester
  { code: 'PHY113', title: 'General Physics I', creditUnits: 3, level: 100, deptCode: 'PHY', type: CourseType.COMPULSORY },
  { code: 'PHY116', title: 'Practical Physics I', creditUnits: 2, level: 100, deptCode: 'PHY', type: CourseType.COMPULSORY },
  // 100 Level - Second Semester
  { code: 'PHY124', title: 'General Physics II', creditUnits: 3, level: 100, deptCode: 'PHY', type: CourseType.COMPULSORY },
  { code: 'PHY126', title: 'Practical Physics II', creditUnits: 2, level: 100, deptCode: 'PHY', type: CourseType.COMPULSORY },
  
  // 200 Level - First Semester
  { code: 'PHY211', title: 'Mechanics and Thermodynamics', creditUnits: 3, level: 200, deptCode: 'PHY', type: CourseType.COMPULSORY },
  { code: 'PHY215', title: 'Electromagnetism', creditUnits: 3, level: 200, deptCode: 'PHY', type: CourseType.COMPULSORY },
  // 200 Level - Second Semester
  { code: 'PHY224', title: 'Optics and Waves', creditUnits: 3, level: 200, deptCode: 'PHY', type: CourseType.COMPULSORY },
  { code: 'PHY228', title: 'Modern Physics', creditUnits: 3, level: 200, deptCode: 'PHY', type: CourseType.COMPULSORY },

  // Agriculture Department (AGR - Agronomy)
  // 100 Level - First Semester
  { code: 'AGR112', title: 'Principles of Crop Production', creditUnits: 3, level: 100, deptCode: 'AGR', type: CourseType.COMPULSORY },
  { code: 'AGR115', title: 'Introduction to Agriculture', creditUnits: 2, level: 100, deptCode: 'AGR', type: CourseType.COMPULSORY },
  // 100 Level - Second Semester
  { code: 'AGR124', title: 'Soil Science Fundamentals', creditUnits: 3, level: 100, deptCode: 'AGR', type: CourseType.COMPULSORY },
  
  // 200 Level - First Semester
  { code: 'AGR213', title: 'Soil Science', creditUnits: 3, level: 200, deptCode: 'AGR', type: CourseType.COMPULSORY },
  { code: 'AGR216', title: 'Crop Physiology', creditUnits: 3, level: 200, deptCode: 'AGR', type: CourseType.COMPULSORY },
  // 200 Level - Second Semester
  { code: 'AGR225', title: 'Agroecology', creditUnits: 3, level: 200, deptCode: 'AGR', type: CourseType.COMPULSORY },
  { code: 'AGR228', title: 'Agricultural Economics', creditUnits: 3, level: 200, deptCode: 'AGR', type: CourseType.COMPULSORY },

  // General Studies (SGS)
  // 100 Level - First Semester
  { code: 'GSE111', title: 'Use of English I', creditUnits: 2, level: 100, deptCode: 'ENG', type: CourseType.GENERAL_STUDIES },
  // 100 Level - Second Semester
  { code: 'GSE122', title: 'Use of English II', creditUnits: 2, level: 100, deptCode: 'ENG', type: CourseType.GENERAL_STUDIES },
  
  // 200 Level - First Semester
  { code: 'GSE213', title: 'Communication Skills', creditUnits: 2, level: 200, deptCode: 'ENG', type: CourseType.GENERAL_STUDIES },
  // 200 Level - Second Semester
  { code: 'GSE224', title: 'Research Methodology', creditUnits: 2, level: 200, deptCode: 'ENG', type: CourseType.GENERAL_STUDIES },
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

async function getOrCreateLevel(name: number, label: string) {
  return prisma.level.upsert({
    where: { name },
    create: { name, label },
    update: {},
  })
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
  const LEVELS = [
    { name: 100, label: '100 Level' },
    { name: 200, label: '200 Level' },
    { name: 300, label: '300 Level' },
    { name: 400, label: '400 Level' },
    { name: 500, label: '500 Level' },
    { name: 600, label: '600 Level' },
    { name: 700, label: '700 Level' },
  ]
  
  for (const lvl of LEVELS) {
    const created = await getOrCreateLevel(lvl.name, lvl.label)
    levelMap.set(lvl.name, created)
    console.log(`     ✓ ${lvl.label}`)
  }

  // 5. Programmes for each department
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
  console.log(`     ✓ ${programmeCount} programmes created`)

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
  const semesters = []

  for (const sem of getSemesterWindows(startYear, endYear, now)) {
    const created = await prisma.semester.upsert({
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
    semesters.push(created)
    console.log(`     ✓ ${sem.type} Semester`)
  }
  console.log(`     ✓ Session: ${session.name}`)

  // 7. Courses
  console.log('\n  → Courses...')
  let courseCount = 0
  const courseMap = new Map()

  for (const courseData of COURSES) {
    const dept = deptMap.get(courseData.deptCode)
    if (!dept) {
      console.warn(`     ⚠️ Department ${courseData.deptCode} not found for course ${courseData.code}`)
      continue
    }

    const level = levelMap.get(courseData.level)
    if (!level) {
      console.warn(`     ⚠️ Level ${courseData.level} not found for course ${courseData.code}`)
      continue
    }

    const created = await prisma.course.upsert({
      where: { code: courseData.code },
      create: {
        code: courseData.code,
        title: courseData.title,
        creditUnits: courseData.creditUnits,
        type: courseData.type,
        status: CourseStatus.ACTIVE,
        departmentId: dept.id,
        levelId: level.id,
        description: `${courseData.title} - ${courseData.creditUnits} credit unit(s)`,
      },
      update: {
        title: courseData.title,
        creditUnits: courseData.creditUnits,
        type: courseData.type,
        status: CourseStatus.ACTIVE,
        description: `${courseData.title} - ${courseData.creditUnits} credit unit(s)`,
      },
    })
    courseMap.set(courseData.code, created)
    courseCount++
    console.log(`     ✓ ${courseData.code} - ${courseData.title} (${courseData.creditUnits} credits)`)
  }
  console.log(`     ✓ ${courseCount} courses created`)

  // 8. Course Offerings (without lecturers - just create offerings)
  console.log('\n  → Course offerings...')
  
  const currentSemester = semesters.find(s => s.isCurrent) || semesters[0]
  let offeringCount = 0

  for (const [code, course] of courseMap) {
    await prisma.courseOffering.upsert({
      where: {
        courseId_semesterId: {
          courseId: course.id,
          semesterId: currentSemester.id,
        }
      },
      create: {
        courseId: course.id,
        semesterId: currentSemester.id,
        // lecturerId is optional - set to null
      },
      update: {},
    })
    offeringCount++
  }
  console.log(`     ✓ ${offeringCount} course offerings created for ${currentSemester.type} semester`)

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

  // 10. Roles (system roles)
  console.log('\n  → System roles...')
  const ROLES = [
    { name: 'SUPER_ADMIN', displayName: 'Super Administrator', description: 'Full system access' },
    { name: 'VC', displayName: 'Vice Chancellor', description: 'University leadership' },
    { name: 'DVC', displayName: 'Deputy Vice Chancellor', description: 'University leadership' },
    { name: 'REGISTRAR', displayName: 'Registrar', description: 'University registrar' },
    { name: 'UNIVERSITY_EXAM_OFFICER', displayName: 'University Examination Officer', description: 'University-level exam oversight' },
    { name: 'UNIVERSITY_COURSE_COORDINATOR', displayName: 'University Course Coordinator', description: 'University-level course coordination' },
    { name: 'DEAN', displayName: 'Dean', description: 'College dean' },
    { name: 'HOD', displayName: 'Head of Department', description: 'Department head' },
    { name: 'COLLEGE_EXAM_OFFICER', displayName: 'College Examination Officer', description: 'College-level exam oversight' },
    { name: 'COLLEGE_COORDINATOR', displayName: 'College Coordinator', description: 'College-level coordination' },
    { name: 'DEPARTMENT_EXAM_OFFICER', displayName: 'Department Examination Officer', description: 'Department-level exam oversight' },
    { name: 'DEPARTMENT_COORDINATOR', displayName: 'Department Coordinator', description: 'Department-level coordination' },
    { name: 'LECTURER', displayName: 'Lecturer', description: 'Teaching staff' },
    { name: 'INVIGILATOR', displayName: 'Invigilator', description: 'Exam invigilator' },
  ]

  for (const roleData of ROLES) {
    await prisma.role.upsert({
      where: { name: roleData.name },
      create: {
        name: roleData.name,
        displayName: roleData.displayName,
        description: roleData.description,
        isSystem: true,
      },
      update: {
        displayName: roleData.displayName,
        description: roleData.description,
      },
    })
  }
  console.log(`     ✓ ${ROLES.length} system roles created`)

  console.log('\n✅ Seed complete!\n')
  console.log(`   🏫 ${COLLEGES.length} Colleges`)
  console.log(`   📚 ${DEPARTMENTS.length} Departments`)
  console.log(`   📖 ${LEVELS.length} Levels`)
  console.log(`   📚 ${programmeCount} Programmes`)
  console.log(`   📅 Session: ${sessionName}`)
  console.log(`   📖 ${courseCount} Courses`)
  console.log(`   📖 ${offeringCount} Course Offerings`)
  console.log(`   👤 ${ROLES.length} System Roles\n`)
  
  console.log('   ─── No user accounts created ───')
  console.log('   To create admin accounts, use the admin panel or run a separate script.\n')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())