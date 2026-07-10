// src/routes/api/admin/seed-missing/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPrismaClient } from '$lib/server/db/index.js';
import {
  protectEmail,
  protectPhone,
  protectText,
  protectStaffData,
} from '$lib/security/dataProtection.js';
import { hashPassword } from '$lib/server/auth/index.js';
import {
  COLLEGES,
  DEPARTMENTS,
  COURSES,
  LEVELS,
  ROLES,
  GRADE_SCALE,
} from '$lib/seed-data/index.js';

// ============================================================
// CONSTANTS
// ============================================================

const STAFF_DEFAULT_PASSWORD = 'Admin123';
const STUDENT_DEFAULT_PASSWORD = 'Student123';

const STAFF_DATA = [
  { staffNumber: 'STAFF-001', email: 'super.admin@mouau.edu.ng', firstName: 'Super', lastName: 'Admin', primaryRole: 'SUPER_ADMIN' },
  { staffNumber: 'STAFF-002', email: 'registrar@mouau.edu.ng', firstName: 'University', lastName: 'Registrar', primaryRole: 'REGISTRAR' },
  { staffNumber: 'STAFF-003', email: 'university.exam@mouau.edu.ng', firstName: 'University', lastName: 'Exam Officer', primaryRole: 'UNIVERSITY_EXAM_OFFICER' },
  { staffNumber: 'STAFF-004', email: 'college.exam@cpas.mouau.edu.ng', firstName: 'College', lastName: 'Exam Officer', primaryRole: 'COLLEGE_EXAM_OFFICER' },
  { staffNumber: 'STAFF-005', email: 'dept.exam@csc.mouau.edu.ng', firstName: 'Department', lastName: 'Exam Officer', primaryRole: 'DEPARTMENT_EXAM_OFFICER' },
  { staffNumber: 'STAFF-006', email: 'hod@csc.mouau.edu.ng', firstName: 'Head', lastName: 'Of Department', primaryRole: 'HOD' },
  { staffNumber: 'STAFF-007', email: 'lecturer1@csc.mouau.edu.ng', firstName: 'John', lastName: 'Lecturer', primaryRole: 'LECTURER' },
  { staffNumber: 'STAFF-008', email: 'lecturer2@csc.mouau.edu.ng', firstName: 'Jane', lastName: 'Instructor', primaryRole: 'LECTURER' },
  { staffNumber: 'STAFF-009', email: 'invigilator@csc.mouau.edu.ng', firstName: 'David', lastName: 'Invigilator', primaryRole: 'INVIGILATOR' },
  { staffNumber: 'STAFF-010', email: 'lecturer3@csc.mouau.edu.ng', firstName: 'Sarah', lastName: 'Professor', primaryRole: 'LECTURER' },
];

const STUDENT_FIRST_NAMES = [
  // English names
  'John', 'Mary', 'Peter', 'Grace', 'Michael', 'Ruth', 'Daniel', 'Faith',
  'Samuel', 'Joy', 'Emmanuel', 'Blessing', 'David', 'Precious', 'Joseph',
  'Comfort', 'James', 'Patience', 'Paul', 'Mercy', 'Andrew', 'Gift',
  'Stephen', 'Favour', 'Victor', 'Joshua', 'Esther', 'Solomon', 'Hannah',
  'Timothy', 'Deborah', 'Jonathan', 'Elizabeth', 'Nathaniel', 'Sarah',
  
  // Igbo names
  'Chidinma', 'Kingsley', 'Ifeoma', 'Chukwuemeka', 'Amara', 'Obinna',
  'Chiamaka', 'Ikechukwu', 'Nkechi', 'Uchenna', 'Adaobi', 'Chibuzor',
  'Ogechi', 'Ngozi', 'Chinonso', 'Onyinye', 'Chukwudi', 'Uchechi',
  'Somto', 'Kenechukwu', 'Chioma', 'Emeka', 'Nneka', 'Chukwuma',
  'Adaeze', 'Chinedu', 'Ifeanyi', 'Nneoma', 'Obinna', 'Uzochukwu',
  
  // Yoruba names
  'Oluwafemi', 'Olayinka', 'Adebayo', 'Foluke', 'Oluwaseun', 'Ayomide',
  'Oluwadamilola', 'Temitayo', 'Abimbola', 'Olayemi', 'Oluwatoyin',
  'Adekunle', 'Olufemi', 'Funmilayo', 'Oluwaseyi', 'Tolulope',
  'Oluwadamilare', 'Folashade', 'Oluwabusayo', 'Adeola', 'Oluwakemi',
  
  // Hausa names
  'Aisha', 'Fatima', 'Aminu', 'Zainab', 'Bello', 'Musa', 'Hadiza',
  'Sani', 'Rabi', 'Usman', 'Hauwa', 'Suleiman', 'Amina', 'Adamu',
  'Jamila', 'Yusuf', 'Mariya', 'Abdullahi', 'Maimuna', 'Haruna',
  
  // More diverse names
  'Ibrahim', 'Damilola', 'Chukwuma', 'Oyindamola', 'Somtochukwu',
  'Oluwanifemi', 'Chiedozie', 'Temitope', 'Nduka', 'Oluwatosin',
  'Kachi', 'Oreoluwa', 'Chijindu', 'Ebuka', 'Ifeanyi', 'Oluwatobiloba',
  'Chidi', 'Olabisi', 'Chimamanda', 'Oluwashina', 'Onyekachi',
];

const STUDENT_LAST_NAMES = [
  // Common Nigerian surnames
  'Okafor', 'Eze', 'Nwosu', 'Okoro', 'Chukwu', 'Obi', 'Nwachukwu',
  'Adeyemi', 'Okonkwo', 'Uzoma', 'Anyanwu', 'Nnamdi', 'Okeke', 'Igwe',
  'Onyekwere', 'Ejiofor', 'Nwankwo', 'Chukwuma', 'Onuoha', 'Amadi',
  'Iwu', 'Nnadi', 'Okorie', 'Chibueze', 'Madu', 'Ogunleye', 'Adewale',
  
  // More Nigerian surnames
  'Adebayo', 'Ogunlade', 'Oladipo', 'Akinlade', 'Ogunbiyi', 'Olatunji',
  'Ogundeji', 'Adebisi', 'Fadipe', 'Onabanjo', 'Ogunyemi', 'Akinwale',
  'Oladunjoye', 'Akinmuyide', 'Ogunbanjo', 'Akintola', 'Ogunbayo',
  'Fasanya', 'Ogunbiyi', 'Ogunlade', 'Akinola', 'Ogunyemi', 'Adesola',
  
  // Other Nigerian names
  'Abdullahi', 'Bello', 'Garba', 'Muhammad', 'Musa', 'Umar', 'Adamu',
  'Suleiman', 'Yusuf', 'Hassan', 'Aliyu', 'Ibrahim', 'Umaru', 'Danjuma',
  'Usman', 'Bala', 'Malami', 'Lawan', 'Abdulrahman', 'Abubakar',
  
  // Southern names
  'Ezeh', 'Nnamdi', 'Ogbonna', 'Ukaegbu', 'Nwankpa', 'Ibe', 'Nwoke',
  'Uche', 'Nwokocha', 'Eke', 'Okpara', 'Onyejiaka', 'Nwogu', 'Okereke',
  'Ezeani', 'Nwosu', 'Ohakwe', 'Okogwu', 'Nwabueze', 'Ezeokonkwo',
  'Okafor', 'Mbah', 'Onyeje', 'Nwaiwu', 'Opara', 'Nwogwugwu',
];

// ============================================================
// TYPES
// ============================================================

interface ResultBlock {
  created: number;
  skipped: number;
  total: number;
}

interface CredentialRecord {
  type: 'staff' | 'student';
  identifier: string; // staffNumber or matricNumber
  role: string;       // primaryRole or "STUDENT"
  email: string;
  password: string;
}

interface SeedResults {
  university: { created: boolean; skipped: boolean };
  colleges: ResultBlock;
  departments: ResultBlock;
  levels: ResultBlock;
  programmes: ResultBlock;
  session: { created: boolean; skipped: boolean };
  semesters: ResultBlock;
  courses: ResultBlock;
  offerings: ResultBlock;
  gradeScale: ResultBlock;
  roles: ResultBlock;
  staff: ResultBlock;
  students: ResultBlock;
  credentials: CredentialRecord[];
  totalCreated: number;
  totalSkipped: number;
}

// ============================================================
// HELPERS
// ============================================================

function getAcademicSession(now: Date) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const startYear = month >= 8 ? year : year - 1;
  const endYear = startYear + 1;

  return {
    name: `${startYear}/${endYear}`,
    startDate: new Date(startYear, 8, 1),
    endDate: new Date(endYear, 7, 31),
  };
}

function getSemesterWindows(startYear: number, endYear: number, now: Date) {
  const first = {
    type: 'FIRST' as const,
    startDate: new Date(startYear, 8, 16),
    endDate: new Date(endYear, 0, 31),
    regOpenAt: new Date(startYear, 8, 1),
    regCloseAt: new Date(startYear, 8, 30),
  };

  const second = {
    type: 'SECOND' as const,
    startDate: new Date(endYear, 1, 10),
    endDate: new Date(endYear, 5, 30),
    regOpenAt: new Date(endYear, 1, 1),
    regCloseAt: new Date(endYear, 1, 28),
  };

  const inFirst = now >= first.startDate && now <= first.endDate;
  const inSecond = now >= second.startDate && now <= second.endDate;

  let currentType: 'FIRST' | 'SECOND';
  if (inFirst) currentType = 'FIRST';
  else if (inSecond) currentType = 'SECOND';
  else currentType = now > second.endDate ? 'SECOND' : 'FIRST';

  return [
    { ...first, isCurrent: currentType === 'FIRST' },
    { ...second, isCurrent: currentType === 'SECOND' },
  ];
}

/** COLPAS gets 5 students per department; every other college gets 2. */
function studentCountForDept(collegeCode: string): number {
  return collegeCode === 'COLPAS' ? 5 : 2;
}

const TOTAL_STUDENTS_PLANNED = DEPARTMENTS.reduce(
  (sum, d) => sum + studentCountForDept(d.collegeCode),
  0,
);

function slugName(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, '');
}

/**
 * Builds a dot-separated student email, e.g. john.doe@student.mouau.edu.ng.
 * On collision (duplicate first+last name across the whole run) appends a
 * numeric suffix before the @, e.g. john.doe.1@student.mouau.edu.ng, so the
 * seed stays deterministic and idempotent across department loops.
 */
function buildStudentEmail(firstName: string, lastName: string, usedEmails: Set<string>): string {
  const base = `${slugName(firstName)}.${slugName(lastName)}`;
  let email = `${base}@student.mouau.edu.ng`;
  let suffix = 1;
  while (usedEmails.has(email)) {
    email = `${base}.${suffix}@student.mouau.edu.ng`;
    suffix++;
  }
  usedEmails.add(email);
  return email;
}

function buildMatricNumber(deptCode: string, index: number): string {
  return `MOUAU/${deptCode}/${String(index).padStart(3, '0')}`;
}

function buildJambRegNo(deptCode: string, index: number, entryYear: number): string {
  return `${entryYear}${deptCode}${String(index).padStart(3, '0')}JB`;
}

// ============================================================
// HANDLER
// ============================================================

export const POST: RequestHandler = async () => {
  try {
    const prisma = await getPrismaClient();

    let totalCreated = 0;
    let totalSkipped = 0;

    const results: SeedResults = {
      university: { created: false, skipped: false },
      colleges: { created: 0, skipped: 0, total: COLLEGES.length },
      departments: { created: 0, skipped: 0, total: DEPARTMENTS.length },
      levels: { created: 0, skipped: 0, total: LEVELS.length },
      programmes: { created: 0, skipped: 0, total: 0 },
      session: { created: false, skipped: false },
      semesters: { created: 0, skipped: 0, total: 0 },
      courses: { created: 0, skipped: 0, total: COURSES.length },
      offerings: { created: 0, skipped: 0, total: 0 },
      gradeScale: { created: 0, skipped: 0, total: GRADE_SCALE.length },
      roles: { created: 0, skipped: 0, total: ROLES.length },
      staff: { created: 0, skipped: 0, total: STAFF_DATA.length },
      students: { created: 0, skipped: 0, total: TOTAL_STUDENTS_PLANNED },
      credentials: [],
      totalCreated: 0,
      totalSkipped: 0,
    };

    // ─── 1. University ──────────────────────────────────────────────────
    let university = await prisma.university.findUnique({
      where: { shortName: 'MOUAU' },
    });

    if (!university) {
      const [universityName, universityShortName, universityAddress, universityEmail, universityPhone] = await Promise.all([
        protectText('Michael Okpara University of Agriculture, Umudike'),
        protectText('MOUAU'),
        protectText('Umudike, Abia State, Nigeria'),
        protectEmail('info@mouau.edu.ng'),
        protectPhone('+2348000000000'),
      ]);

      university = await prisma.university.create({
        data: {
          name: universityName,
          shortName: universityShortName,
          address: universityAddress,
          email: universityEmail.encrypted,
          phone: universityPhone.encrypted,
          website: 'https://mouau.edu.ng',
        },
      });
      results.university.created = true;
      totalCreated++;
    } else {
      results.university.skipped = true;
      totalSkipped++;
    }

    if (!university) {
      throw error(500, 'Failed to create or find university');
    }

    // ─── 2. Colleges ────────────────────────────────────────────────────
    const collegeMap = new Map<string, { id: string; shortName: string }>();
    for (const collegeData of COLLEGES) {
      const existing = await prisma.college.findFirst({
        where: { universityId: university.id, shortName: collegeData.shortName },
      });

      if (!existing) {
        const [name, shortName, code] = await Promise.all([
          protectText(collegeData.name),
          protectText(collegeData.shortName),
          protectText(collegeData.code),
        ]);

        const created = await prisma.college.create({
          data: { universityId: university.id, name, shortName, code },
        });
        collegeMap.set(collegeData.code, created);
        results.colleges.created++;
        totalCreated++;
      } else {
        collegeMap.set(collegeData.code, existing);
        results.colleges.skipped++;
        totalSkipped++;
      }
    }

    // ─── 3. Departments ─────────────────────────────────────────────────
    const deptMap = new Map<string, { id: string; shortName: string; name: string }>();
    for (const deptData of DEPARTMENTS) {
      const college = collegeMap.get(deptData.collegeCode);
      if (!college) continue;

      const existing = await prisma.department.findFirst({
        where: { collegeId: college.id, shortName: deptData.shortName },
      });

      if (!existing) {
        const [name, shortName, code] = await Promise.all([
          protectText(deptData.name),
          protectText(deptData.shortName),
          protectText(deptData.code),
        ]);

        const created = await prisma.department.create({
          data: { collegeId: college.id, name, shortName, code },
        });
        deptMap.set(deptData.code, created);
        results.departments.created++;
        totalCreated++;
      } else {
        deptMap.set(deptData.code, existing);
        results.departments.skipped++;
        totalSkipped++;
      }
    }

    // ─── 4. Levels ──────────────────────────────────────────────────────
    const levelMap = new Map<number, { id: string; name: number }>();
    for (const lvl of LEVELS) {
      const existing = await prisma.level.findUnique({ where: { name: lvl.name } });

      if (!existing) {
        const created = await prisma.level.create({
          data: { name: lvl.name, label: lvl.label },
        });
        levelMap.set(lvl.name, created);
        results.levels.created++;
        totalCreated++;
      } else {
        levelMap.set(lvl.name, existing);
        results.levels.skipped++;
        totalSkipped++;
      }
    }

    // ─── 5. Programmes ──────────────────────────────────────────────────
    const programmeTypes = [
      { type: 'UNDERGRADUATE', shortName: 'UND-REG', duration: 4 },
      { type: 'UNDERGRADUATE', shortName: 'CEC', duration: 4 },
      { type: 'POSTGRADUATE_DIPLOMA', shortName: 'PG', duration: 2 },
    ];

    // Track the UND-REG programme id per department for student seeding below
    const undergradProgrammeMap = new Map<string, string>();

    for (const [deptCode, dept] of deptMap) {
      for (const prog of programmeTypes) {
        const progShortName = `${dept.shortName}-${prog.shortName}`;

        const existing = await prisma.programme.findFirst({
          where: { departmentId: dept.id, shortName: progShortName },
        });

        let programmeId: string;

        if (!existing) {
          const [name, shortName] = await Promise.all([
            protectText(`${dept.name} (${prog.shortName})`),
            protectText(progShortName),
          ]);

          const created = await prisma.programme.create({
            data: {
              departmentId: dept.id,
              name,
              shortName,
              type: prog.type as any,
              durationYears: prog.duration,
              isActive: true,
            },
          });
          programmeId = created.id;
          results.programmes.created++;
          totalCreated++;
        } else {
          programmeId = existing.id;
          results.programmes.skipped++;
          totalSkipped++;
        }

        if (prog.shortName === 'UND-REG') {
          undergradProgrammeMap.set(deptCode, programmeId);
        }
      }
    }
    results.programmes.total = deptMap.size * programmeTypes.length;

    // ─── 6. Academic Session ────────────────────────────────────────────
    const now = new Date();
    const { name: sessionName, startDate: sessionStart, endDate: sessionEnd } = getAcademicSession(now);

    let session = await prisma.academicSession.findUnique({ where: { name: sessionName } });

    if (!session) {
      session = await prisma.academicSession.create({
        data: {
          name: sessionName,
          startDate: sessionStart,
          endDate: sessionEnd,
          status: 'ACTIVE',
          isCurrent: true,
        },
      });
      results.session.created = true;
      totalCreated++;
    } else {
      results.session.skipped = true;
      totalSkipped++;
    }

    // ─── 7. Semesters ───────────────────────────────────────────────────
    const startYear = sessionStart.getFullYear();
    const endYear = sessionEnd.getFullYear();
    const semesterData = getSemesterWindows(startYear, endYear, now);
    results.semesters.total = semesterData.length;

    for (const sem of semesterData) {
      const existing = await prisma.semester.findUnique({
        where: { sessionId_type: { sessionId: session.id, type: sem.type } },
      });

      if (!existing) {
        await prisma.semester.create({
          data: {
            sessionId: session.id,
            type: sem.type,
            startDate: sem.startDate,
            endDate: sem.endDate,
            regOpenAt: sem.regOpenAt,
            regCloseAt: sem.regCloseAt,
            isCurrent: sem.isCurrent,
            registrationEnabled: true,
          },
        });
        results.semesters.created++;
        totalCreated++;
      } else {
        if (existing.isCurrent !== sem.isCurrent) {
          await prisma.semester.update({
            where: { id: existing.id },
            data: { isCurrent: sem.isCurrent },
          });
        }
        results.semesters.skipped++;
        totalSkipped++;
      }
    }

    // ─── 8. Courses ─────────────────────────────────────────────────────
    for (const courseData of COURSES) {
      const dept = deptMap.get(courseData.deptCode);
      if (!dept) continue;

      const level = levelMap.get(courseData.level);
      if (!level) continue;

      const existing = await prisma.course.findUnique({ where: { code: courseData.code } });

      if (!existing) {
        await prisma.course.create({
          data: {
            code: courseData.code,
            title: courseData.title,
            creditUnits: courseData.creditUnits,
            type: courseData.type,
            status: 'ACTIVE',
            departmentId: dept.id,
            levelId: level.id,
            description: `${courseData.title} - ${courseData.creditUnits} credit unit(s)`,
          },
        });
        results.courses.created++;
        totalCreated++;
      } else {
        results.courses.skipped++;
        totalSkipped++;
      }
    }

    // ─── 9. Course Offerings ────────────────────────────────────────────
    const currentSemester = await prisma.semester.findFirst({
      where: { sessionId: session.id, isCurrent: true },
    });

    if (currentSemester) {
      const allCourses = await prisma.course.findMany();
      results.offerings.total = allCourses.length;

      for (const course of allCourses) {
        const existing = await prisma.courseOffering.findUnique({
          where: { courseId_semesterId: { courseId: course.id, semesterId: currentSemester.id } },
        });

        if (!existing) {
          await prisma.courseOffering.create({
            data: { courseId: course.id, semesterId: currentSemester.id },
          });
          results.offerings.created++;
          totalCreated++;
        } else {
          results.offerings.skipped++;
          totalSkipped++;
        }
      }
    }

    // ─── 10. Grade Scale ────────────────────────────────────────────────
    for (const tier of GRADE_SCALE) {
      const existing = await prisma.gradeScale.findUnique({ where: { label: tier.label } });

      if (!existing) {
        await prisma.gradeScale.create({ data: tier });
        results.gradeScale.created++;
        totalCreated++;
      } else {
        results.gradeScale.skipped++;
        totalSkipped++;
      }
    }

    // ─── 11. Roles ──────────────────────────────────────────────────────
    for (const roleData of ROLES) {
      const existing = await prisma.role.findUnique({ where: { name: roleData.name } });

      if (!existing) {
        await prisma.role.create({
          data: {
            name: roleData.name,
            displayName: roleData.displayName,
            description: roleData.description,
            isSystem: true,
          },
        });
        results.roles.created++;
        totalCreated++;
      } else {
        results.roles.skipped++;
        totalSkipped++;
      }
    }

    // ─── 12. Staff Users ────────────────────────────────────────────────
    const staffPasswordHash = await hashPassword(STAFF_DEFAULT_PASSWORD);

    for (const staff of STAFF_DATA) {
      // Always surface the credential, whether newly created or already existing,
      // so the seed page can display/download the full login list every run.
      results.credentials.push({
        type: 'staff',
        identifier: staff.staffNumber,
        role: staff.primaryRole,
        email: staff.email,
        password: STAFF_DEFAULT_PASSWORD,
      });

      const existing = await prisma.staff.findUnique({ where: { staffNumber: staff.staffNumber } });

      if (!existing) {
        try {
          const protectedData = await protectStaffData({
            email: staff.email,
            firstName: staff.firstName,
            lastName: staff.lastName,
            staffNumber: staff.staffNumber,
          });

          const createdStaff = await prisma.staff.create({
            data: {
              staffNumber: staff.staffNumber,
              email: protectedData.email,
              emailHash: protectedData.emailHash,
              firstName: protectedData.firstName,
              firstNameHash: protectedData.firstNameHash,
              lastName: protectedData.lastName,
              lastNameHash: protectedData.lastNameHash,
              otherNames: protectedData.otherNames,
              otherNamesHash: protectedData.otherNamesHash,
              passwordHash: staffPasswordHash,
              primaryRole: staff.primaryRole as any,
              status: 'ACTIVE',
              mustChangePassword: true,
              collegeId: null,
              departmentId: null,
              phone: null,
              phoneHash: null,
              gender: null,
              avatar: null,
              lastLoginAt: null,
            },
          });

          const role = await prisma.role.findUnique({ where: { name: staff.primaryRole } });

          if (role && createdStaff) {
            await prisma.staffRoleAssignment.create({
              data: { staffId: createdStaff.id, roleId: role.id, isActive: true },
            });
          }

          results.staff.created++;
          totalCreated++;
        } catch (staffErr) {
          console.error(`Failed to create staff ${staff.staffNumber}:`, staffErr);
          continue;
        }
      } else {
        results.staff.skipped++;
        totalSkipped++;
      }
    }

    // ─── 13. Students ───────────────────────────────────────────────────
    const studentPasswordHash = await hashPassword(STUDENT_DEFAULT_PASSWORD);
    const entryYear = new Date().getFullYear();
    const usedStudentEmails = new Set<string>();
    const level100 = levelMap.get(100);
    let globalNameIndex = 0;

    if (!level100) {
      console.error('Level 100 not found — skipping student seeding.');
    } else {
      for (const deptData of DEPARTMENTS) {
        const dept = deptMap.get(deptData.code);
        const programmeId = undergradProgrammeMap.get(deptData.code);
        if (!dept || !programmeId) continue;

        const count = studentCountForDept(deptData.collegeCode);

        for (let i = 1; i <= count; i++) {
          const firstName = STUDENT_FIRST_NAMES[globalNameIndex % STUDENT_FIRST_NAMES.length];
          const lastName = STUDENT_LAST_NAMES[globalNameIndex % STUDENT_LAST_NAMES.length];
          globalNameIndex++;

          const matricNumber = buildMatricNumber(deptData.code, i);
          const jambRegNo = buildJambRegNo(deptData.code, i, entryYear);
          const email = buildStudentEmail(firstName, lastName, usedStudentEmails);

          // Always surface the credential, whether newly created or already existing.
          results.credentials.push({
            type: 'student',
            identifier: matricNumber,
            role: 'STUDENT',
            email,
            password: STUDENT_DEFAULT_PASSWORD,
          });

          const existing = await prisma.student.findUnique({ where: { matricNumber } });

          if (!existing) {
            try {
              const emailProtect = await protectEmail(email);

              await prisma.student.create({
                data: {
                  matricNumber,
                  jambRegNo,
                  email: emailProtect.encrypted,
                  emailHash: emailProtect.hash,
                  passwordHash: studentPasswordHash,
                  firstName,
                  lastName,
                  departmentId: dept.id,
                  programmeId,
                  currentLevelId: level100.id,
                  entryYear,
                  status: 'ACTIVE',
                  mustChangePassword: true,
                },
              });

              results.students.created++;
              totalCreated++;
            } catch (studentErr) {
              console.error(`Failed to create student ${matricNumber}:`, studentErr);
              continue;
            }
          } else {
            results.students.skipped++;
            totalSkipped++;
          }
        }
      }
    }

    // ─── 14. Audit Log ──────────────────────────────────────────────────
    try {
      await prisma.auditLog.create({
        data: {
          actorType: 'system',
          action: 'SEED_DATABASE',
          entity: 'System',
          afterData: {
            results: {
              ...results,
              // Redact plaintext passwords before persisting audit snapshot
              credentials: results.credentials.map(({ password, ...rest }) => rest),
            },
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (auditErr) {
      console.error('Failed to create audit log:', auditErr);
    }

    results.totalCreated = totalCreated;
    results.totalSkipped = totalSkipped;

    return json({
      success: true,
      message: 'Database seeded successfully',
      results,
    });
  } catch (err) {
    console.error('Seed error:', err);
    if (err && typeof err === 'object' && 'status' in err && 'body' in err) {
      const httpErr = err as { status: number; body: { message: string } };
      throw error(httpErr.status, httpErr.body.message);
    }
    throw error(500, err instanceof Error ? err.message : 'Failed to seed database');
  }
};