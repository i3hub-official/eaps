/// <reference types="node" />
// prisma/seed.ts
// Run: pnpm prisma db seed
//
// Bootstraps:
//   1. University record
//   2. All permission definitions
//   3. System roles with permission assignments
//   4. Level definitions (100–700)
//   5. Current academic session + semesters
//   6. Super admin account
//   7. Grade scale (Domain 2)

import 'dotenv/config'          // ← must be the very first import

import { PrismaClient, StaffRole, SemesterType, AcademicSessionStatus } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

// ─── Permissions ────────────────────────────────────────────────────────────

const PERMISSIONS = [
  // Examination
  { name: 'exam:create',          group: 'Examination', description: 'Create examinations' },
  { name: 'exam:edit',            group: 'Examination', description: 'Edit examinations' },
  { name: 'exam:delete',          group: 'Examination', description: 'Delete examinations' },
  { name: 'exam:publish',         group: 'Examination', description: 'Publish examinations' },
  { name: 'exam:view',            group: 'Examination', description: 'View examinations' },
  { name: 'exam:schedule',        group: 'Examination', description: 'Schedule examinations' },
  { name: 'exam:assign_invigilator', group: 'Examination', description: 'Assign invigilators to exams' },
  { name: 'exam:monitor_live',    group: 'Examination', description: 'Monitor live examination sessions' },

  // Test
  { name: 'test:create',          group: 'Test', description: 'Create tests' },
  { name: 'test:edit',            group: 'Test', description: 'Edit tests' },
  { name: 'test:delete',          group: 'Test', description: 'Delete tests' },
  { name: 'test:publish',         group: 'Test', description: 'Publish tests' },
  { name: 'test:view',            group: 'Test', description: 'View tests' },

  // Assignment
  { name: 'assignment:create',    group: 'Assignment', description: 'Create assignments' },
  { name: 'assignment:edit',      group: 'Assignment', description: 'Edit assignments' },
  { name: 'assignment:delete',    group: 'Assignment', description: 'Delete assignments' },
  { name: 'assignment:grade',     group: 'Assignment', description: 'Grade assignment submissions' },

  // Questions
  { name: 'question:create',      group: 'Question Bank', description: 'Create questions' },
  { name: 'question:edit',        group: 'Question Bank', description: 'Edit questions' },
  { name: 'question:delete',      group: 'Question Bank', description: 'Delete questions' },
  { name: 'question:import',      group: 'Question Bank', description: 'Import questions in bulk' },
  { name: 'question:export',      group: 'Question Bank', description: 'Export questions' },
  { name: 'question:view_bank',   group: 'Question Bank', description: 'View question bank' },

  // Results
  { name: 'result:view',          group: 'Result', description: 'View results' },
  { name: 'result:release',       group: 'Result', description: 'Release results to students' },
  { name: 'result:approve',       group: 'Result', description: 'Approve results' },
  { name: 'result:revise',        group: 'Result', description: 'Create result revisions' },
  { name: 'result:print',         group: 'Result', description: 'Print results' },
  { name: 'result:export',        group: 'Result', description: 'Export results' },

  // Students
  { name: 'student:view',         group: 'Student', description: 'View student records' },
  { name: 'student:create',       group: 'Student', description: 'Create student accounts' },
  { name: 'student:edit',         group: 'Student', description: 'Edit student records' },
  { name: 'student:suspend',      group: 'Student', description: 'Suspend/restore student accounts' },
  { name: 'student:promote',      group: 'Student', description: 'Promote students to next level' },

  // Course Registration
  { name: 'registration:view',    group: 'Registration', description: 'View course registrations' },
  { name: 'registration:approve', group: 'Registration', description: 'Approve/reject course registrations' },
  { name: 'registration:manage',  group: 'Registration', description: 'Open/close registration windows' },

  // Courses
  { name: 'course:create',        group: 'Course', description: 'Create courses' },
  { name: 'course:edit',          group: 'Course', description: 'Edit courses' },
  { name: 'course:delete',        group: 'Course', description: 'Delete courses' },
  { name: 'course:assign_lecturer', group: 'Course', description: 'Assign lecturers to courses' },

  // Reports & Analytics
  { name: 'report:view',          group: 'Reports', description: 'View reports' },
  { name: 'report:print',         group: 'Reports', description: 'Print reports' },
  { name: 'report:export',        group: 'Reports', description: 'Export reports' },
  { name: 'analytics:view',       group: 'Reports', description: 'View analytics dashboard' },

  // Violations
  { name: 'violation:view',       group: 'Security', description: 'View violation reports' },
  { name: 'violation:dismiss',    group: 'Security', description: 'Dismiss violation flags' },

  // Staff Management
  { name: 'staff:create',         group: 'Staff', description: 'Create staff accounts' },
  { name: 'staff:edit',           group: 'Staff', description: 'Edit staff records' },
  { name: 'staff:assign_role',    group: 'Staff', description: 'Assign roles to staff' },

  // System
  { name: 'system:settings',      group: 'System', description: 'Manage system settings' },
  { name: 'system:audit_logs',    group: 'System', description: 'View audit logs' },
  { name: 'system:backup',        group: 'System', description: 'Manage backups' },
]

// ─── Role → Permission mappings ──────────────────────────────────────────────

const ROLE_PERMISSIONS: Record<StaffRole, string[]> = {
  SUPER_ADMIN: PERMISSIONS.map(p => p.name), // all permissions

  VC: [
    'exam:view', 'result:view', 'result:approve', 'result:print', 'result:export',
    'report:view', 'report:print', 'report:export', 'analytics:view',
    'student:view', 'staff:view',
  ],

  DVC: [
    'exam:view', 'result:view', 'result:approve',
    'report:view', 'report:print', 'report:export', 'analytics:view',
    'student:view',
  ],

  REGISTRAR: [
    'student:view', 'student:create', 'student:edit', 'student:promote',
    'registration:view', 'registration:approve', 'registration:manage',
    'course:create', 'course:edit', 'course:assign_lecturer',
    'report:view', 'report:print', 'report:export',
    'result:view', 'result:approve',
  ],

  UNIVERSITY_EXAM_OFFICER: [
    'exam:create', 'exam:edit', 'exam:delete', 'exam:publish', 'exam:view',
    'exam:schedule', 'exam:assign_invigilator', 'exam:monitor_live',
    'test:create', 'test:edit', 'test:publish', 'test:view',
    'question:create', 'question:edit', 'question:delete', 'question:import',
    'question:export', 'question:view_bank',
    'result:view', 'result:release', 'result:approve', 'result:revise',
    'result:print', 'result:export',
    'violation:view', 'violation:dismiss',
    'report:view', 'report:print', 'report:export', 'analytics:view',
    'student:view', 'registration:view',
  ],

  UNIVERSITY_COURSE_COORDINATOR: [
    'course:create', 'course:edit', 'course:assign_lecturer',
    'registration:view', 'registration:approve', 'registration:manage',
    'report:view', 'analytics:view', 'student:view',
  ],

  DEAN: [
    'exam:view', 'result:view', 'result:approve',
    'report:view', 'report:print', 'report:export', 'analytics:view',
    'student:view', 'staff:view',
    'registration:view', 'course:view',
  ],

  HOD: [
    'exam:view', 'exam:schedule',
    'result:view', 'result:approve',
    'course:create', 'course:edit', 'course:assign_lecturer',
    'registration:view', 'registration:approve',
    'report:view', 'analytics:view',
    'student:view', 'staff:view',
  ],

  COLLEGE_EXAM_OFFICER: [
    'exam:create', 'exam:edit', 'exam:publish', 'exam:view', 'exam:schedule',
    'exam:assign_invigilator', 'exam:monitor_live',
    'test:create', 'test:edit', 'test:publish', 'test:view',
    'question:view_bank', 'question:create', 'question:edit',
    'result:view', 'result:release', 'result:print', 'result:export',
    'violation:view', 'report:view', 'analytics:view',
  ],

  COLLEGE_COORDINATOR: [
    'course:create', 'course:edit', 'course:assign_lecturer',
    'registration:view', 'registration:approve',
    'report:view', 'analytics:view', 'student:view',
  ],

  DEPARTMENT_EXAM_OFFICER: [
    'exam:create', 'exam:edit', 'exam:publish', 'exam:view',
    'exam:schedule', 'exam:assign_invigilator', 'exam:monitor_live',
    'test:create', 'test:edit', 'test:publish', 'test:view',
    'assignment:create', 'assignment:edit', 'assignment:grade',
    'question:create', 'question:edit', 'question:import', 'question:view_bank',
    'result:view', 'result:release', 'result:print',
    'violation:view', 'report:view', 'analytics:view',
    'registration:view', 'student:view',
  ],

  DEPARTMENT_COORDINATOR: [
    'course:create', 'course:edit', 'course:assign_lecturer',
    'registration:view', 'registration:approve', 'registration:manage',
    'report:view', 'student:view',
  ],

  LECTURER: [
    'exam:create', 'exam:edit', 'exam:publish', 'exam:view', 'exam:monitor_live',
    'test:create', 'test:edit', 'test:publish', 'test:view',
    'assignment:create', 'assignment:edit', 'assignment:delete', 'assignment:grade',
    'question:create', 'question:edit', 'question:delete',
    'question:import', 'question:view_bank',
    'result:view', 'result:release',
    'registration:view', 'student:view',
    'analytics:view',
  ],

  INVIGILATOR: [
    'exam:monitor_live', 'exam:view',
    'violation:view',
    'student:view',
  ],
}

// ─── Grade scale (Domain 2) ──────────────────────────────────────────────────

const GRADE_SCALE = [
  { label: 'A' as const, minPercent: 70, maxPercent: 100,   points: 5.0, description: 'Excellent' },
  { label: 'B' as const, minPercent: 60, maxPercent: 69.99, points: 4.0, description: 'Very Good' },
  { label: 'C' as const, minPercent: 50, maxPercent: 59.99, points: 3.0, description: 'Good' },
  { label: 'D' as const, minPercent: 45, maxPercent: 49.99, points: 2.0, description: 'Fair' },
  { label: 'E' as const, minPercent: 40, maxPercent: 44.99, points: 1.0, description: 'Pass' },
  { label: 'F' as const, minPercent: 0,  maxPercent: 39.99, points: 0.0, description: 'Fail' },
]

// ─── Assessment type defaults (used in the builder UI) ──────────────────────
// Not seeded to the DB — used as defaults in the form. Import from this file
// wherever needed, e.g. `import { ASSESSMENT_DEFAULTS } from '../../prisma/seed'`.
// (If your bundler/runtime doesn't like importing from a script with a
// top-level main()/run-on-import side effect, move this export into its own
// file, e.g. `src/lib/assessment-defaults.ts`, and import it from there instead.)

export const ASSESSMENT_DEFAULTS = {
  PRACTICE: {
    totalMarks: 100,
    passMark: 40,
    maxAttempts: 999,
    shuffleQuestions: true,
    shuffleOptions: true,
    showResultImmediately: true,
    allowReview: true,
    requireFaceVerify: false,
    requireLiveness: false,
    fullscreenRequired: false,
    offlineEnabled: false,
  },
  ASSIGNMENT: {
    totalMarks: 100,
    passMark: 40,
    maxAttempts: 1,
    shuffleQuestions: false,
    shuffleOptions: false,
    showResultImmediately: false,
    allowReview: true,
    requireFaceVerify: false,
    requireLiveness: false,
    fullscreenRequired: false,
    offlineEnabled: false,
  },
  TEST: {
    totalMarks: 30,
    passMark: 12, // 40% of 30
    maxAttempts: 1,
    shuffleQuestions: true,
    shuffleOptions: true,
    showResultImmediately: false,
    allowReview: false,
    requireFaceVerify: true,
    requireLiveness: false,
    fullscreenRequired: true,
    offlineEnabled: false,
  },
  EXAMINATION: {
    totalMarks: 70,
    passMark: 28, // 40% of 70
    maxAttempts: 1,
    shuffleQuestions: true,
    shuffleOptions: true,
    showResultImmediately: false,
    allowReview: false,
    requireFaceVerify: true,
    requireLiveness: true,
    fullscreenRequired: true,
    offlineEnabled: true,
    paperVariants: 3,
  },
}

// ─── Academic session/semester — computed relative to "now" ────────────────
// MOUAU's academic year runs Sept 1 → Aug 31. First semester runs
// mid-Sept → end of Jan; second semester runs early Feb → end of June.
// July/Aug is the inter-session recess (no semester officially "current"
// during that window — we mark the just-finished second semester as
// current until the new session's seed/rollover runs).

function getCurrentAcademicSession(now: Date) {
  const year = now.getFullYear()
  const month = now.getMonth() // 0-indexed; Sept = 8

  // If we're in Sept–Dec, the session that started this year is current.
  // If we're in Jan–Aug, the session that started *last* year is current.
  const startYear = month >= 8 ? year : year - 1
  const endYear = startYear + 1

  return {
    name: `${startYear}/${endYear}`,
    startDate: new Date(startYear, 8, 1),   // Sept 1
    endDate: new Date(endYear, 7, 31),      // Aug 31
  }
}

function getSemesterWindows(startYear: number, endYear: number, now: Date) {
  const first = {
    type: SemesterType.FIRST,
    startDate: new Date(startYear, 8, 16),   // Sept 16
    endDate: new Date(endYear, 0, 31),        // Jan 31
    regOpenAt: new Date(startYear, 8, 1),
    regCloseAt: new Date(startYear, 8, 30),
  }

  const second = {
    type: SemesterType.SECOND,
    startDate: new Date(endYear, 1, 10),      // Feb 10
    endDate: new Date(endYear, 5, 30),        // Jun 30
    regOpenAt: new Date(endYear, 1, 1),
    regCloseAt: new Date(endYear, 1, 28),
  }

  // Whichever semester's window we're actually inside wins. Outside both
  // (the summer recess), default to the one most recently active.
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

  // 2. Permissions
  console.log('\n  → Permissions...')
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      create: perm,
      update: { description: perm.description, group: perm.group },
    })
  }
  console.log(`     ✓ ${PERMISSIONS.length} permissions seeded`)

  // 3. Roles + permission assignments
  console.log('\n  → Roles & permissions...')
  const roleDisplayNames: Record<StaffRole, string> = {
    SUPER_ADMIN: 'Super Administrator',
    VC: 'Vice Chancellor',
    DVC: 'Deputy Vice Chancellor',
    REGISTRAR: 'Registrar',
    UNIVERSITY_EXAM_OFFICER: 'University Examination Officer',
    UNIVERSITY_COURSE_COORDINATOR: 'University Course Coordinator',
    DEAN: 'Dean',
    HOD: 'Head of Department',
    COLLEGE_EXAM_OFFICER: 'College Examination Officer',
    COLLEGE_COORDINATOR: 'College Coordinator',
    DEPARTMENT_EXAM_OFFICER: 'Department Examination Officer',
    DEPARTMENT_COORDINATOR: 'Department Coordinator',
    LECTURER: 'Lecturer',
    INVIGILATOR: 'Invigilator',
  }

  for (const [roleName, permNames] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      create: {
        name: roleName,
        displayName: roleDisplayNames[roleName as StaffRole],
        isSystem: true,
      },
      update: { displayName: roleDisplayNames[roleName as StaffRole] },
    })

    // fetch permission IDs
    const perms = await prisma.permission.findMany({
      where: { name: { in: permNames } },
      select: { id: true },
    })

    // upsert role↔permission links
    for (const perm of perms) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        create: { roleId: role.id, permissionId: perm.id },
        update: {},
      })
    }
    console.log(`     ✓ ${roleDisplayNames[roleName as StaffRole]} — ${permNames.length} permissions`)
  }

  // 4. Levels (100–200)
  console.log('\n  → Academic levels...')
  const levels = [100, 200]
  for (const lvl of levels) {
    await prisma.level.upsert({
      where: { name: lvl },
      create: { name: lvl, label: `${lvl} Level` },
      update: {},
    })
  }
  console.log(`     ✓ Levels: ${levels.join(', ')}`)

  // 5. Current academic session
  console.log('\n  → Academic session...')
  const now = new Date()
  const { name: sessionName, startDate: sessionStart, endDate: sessionEnd } =
    getCurrentAcademicSession(now)

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
  }
  console.log(`     ✓ Session: ${session.name} (2 semesters, based on ${now.toDateString()})`)

  // 6. Super Admin
  console.log('\n  → Super Admin account...')
  const superAdminRole = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } })
  if (!superAdminRole) throw new Error('SUPER_ADMIN role not found after seeding')

  const passwordHash = await bcrypt.hash('Admin@1234', 12)

  const admin = await prisma.staff.upsert({
    where: { email: 'admin@mouau.edu.ng' },
    create: {
      staffNumber: 'MOUAU/ADMIN/001',
      email: 'admin@mouau.edu.ng',
      passwordHash,
      firstName: 'System',
      lastName: 'Administrator',
      primaryRole: StaffRole.SUPER_ADMIN,
      mustChangePassword: true,
      status: 'ACTIVE',
    },
    update: {},
  })

  await prisma.staffRoleAssignment.upsert({
    where: { staffId_roleId: { staffId: admin.id, roleId: superAdminRole.id } },
    create: { staffId: admin.id, roleId: superAdminRole.id, isActive: true },
    update: {},
  })

  console.log(`     ✓ admin@mouau.edu.ng / Admin@1234  ← CHANGE ON FIRST LOGIN`)

  // 7. Grade scale (Domain 2)
  console.log('\n  → Grade scale...')
  for (const tier of GRADE_SCALE) {
    await prisma.gradeScale.upsert({
      where: { label: tier.label },
      create: tier,
      update: tier,
    })
    console.log(`     ✓ ${tier.label}: ${tier.minPercent}%–${tier.maxPercent}% → ${tier.points} pts`)
  }

  console.log('\n✅ Seed complete.\n')
  console.log('   Next steps:')
  console.log('   1. Update DATABASE_URL in .env')
  console.log('   2. pnpm prisma migrate dev --name init_auth_academic')
  console.log('   3. pnpm prisma db seed')
  console.log('   4. Log in at /admin → change password immediately\n')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())