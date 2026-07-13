// src/routes/api/admin/seed-missing/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPrismaClient } from '$lib/server/db/index.js';
import {
  protectEmail,
  protectPhone,
  protectText,
  protectStaffData,
  protectStudentRegistration,
  protectName,
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

// ============================================================
// STAFF DATA
// ============================================================

// Name pool used only for auto-generated department staff below — large
// enough that names don't feel obviously repeated across departments,
// but this is seed data, not meant to be unique per person.
const STAFF_FIRST_NAMES = [
  'Ugochukwu', 'Ifeanyi', 'Chinwe', 'Emeka', 'Ndidi', 'Chukwuka', 'Amaka', 'Obiora',
  'Ejike', 'Nkiruka', 'Chidi', 'Ozioma', 'Okechukwu', 'Adaugo', 'Ikenna', 'Uju',
  'Chukwuemeka', 'Nneamaka', 'Chibuike', 'Adamma', 'Kelechi', 'Ijeoma', 'Uzoma', 'Chinyere',
  'Chinedu', 'Amarachi', 'Obinna', 'Nkechinyere', 'Chukwudi', 'Ogechukwu',
];
const STAFF_LAST_NAMES = [
  'Anyaoku', 'Ibekwe', 'Nwokolo', 'Achara', 'Okorocha', 'Egwuatu', 'Onyejiaka', 'Nwabuisi',
  'Ekweremadu', 'Ihejirika', 'Nwaubani', 'Okwuosa', 'Emelumba', 'Onwuzuruike', 'Nwadike',
  'Ogbonna', 'Ezekwesili', 'Nwafor', 'Amuchie', 'Ihedigbo', 'Nwokedi', 'Okonji', 'Nzeribe',
  'Iheanacho', 'Okoli', 'Uzodinma', 'Ekwueme', 'Chukwura', 'Nwoye', 'Ogbuewu',
];

// Every staffNumber below STAFF-027 is hand-authored (university-wide
// roles, college-scoped roles, CSC, and PHY blocks). Counter picks up
// from there for auto-generated department staff, so re-running the
// generator never collides with a hand-authored staffNumber.
let staffAutoCounter = 30;
let staffNameCursor = 0;

function nextStaffNumber(): string {
  staffAutoCounter++;
  return `STAFF-${String(staffAutoCounter).padStart(3, '0')}`;
}

function nextStaffName(): { firstName: string; lastName: string } {
  const firstName = STAFF_FIRST_NAMES[staffNameCursor % STAFF_FIRST_NAMES.length];
  const lastName = STAFF_LAST_NAMES[staffNameCursor % STAFF_LAST_NAMES.length];
  staffNameCursor++;
  return { firstName, lastName };
}

// `deptCode` scopes a staff member to a department; `levels` (LECTURER only)
// restricts which course levels they're eligible to teach — a lecturer
// doesn't teach an entire department across every level, just their
// assigned set. `maxCourseLoad` caps how many offerings they can be
// assigned in a single semester.
interface StaffSeedEntry {
  staffNumber: string;
  email: string;
  firstName: string;
  lastName: string;
  primaryRole: string;
  deptCode?: string;
  collegeCode?: string;
  levels?: number[];
  maxCourseLoad?: number;
}

// University-wide roles — no dept/college scope.
const UNIVERSITY_WIDE_STAFF: StaffSeedEntry[] = [
  { staffNumber: 'STAFF-001', email: 'super.admin@mouau.edu.ng', firstName: 'Super', lastName: 'Admin', primaryRole: 'SUPER_ADMIN' },
  { staffNumber: 'STAFF-002', email: 'registrar@mouau.edu.ng', firstName: 'University', lastName: 'Registrar', primaryRole: 'REGISTRAR' },
  { staffNumber: 'STAFF-003', email: 'university.exam@mouau.edu.ng', firstName: 'University', lastName: 'Exam Officer', primaryRole: 'UNIVERSITY_EXAM_OFFICER' },
  { staffNumber: 'STAFF-011', email: 'vc1@mouau.edu.ng', firstName: 'Chukwuemeka', lastName: 'Nwosu', primaryRole: 'VC' },
  { staffNumber: 'STAFF-012', email: 'vc2@mouau.edu.ng', firstName: 'Adaeze', lastName: 'Okonkwo', primaryRole: 'VC' },
  { staffNumber: 'STAFF-013', email: 'dvc1@mouau.edu.ng', firstName: 'Ibrahim', lastName: 'Musa', primaryRole: 'DVC' },
  { staffNumber: 'STAFF-014', email: 'dvc2@mouau.edu.ng', firstName: 'Folake', lastName: 'Adeyemi', primaryRole: 'DVC' },
  { staffNumber: 'STAFF-015', email: 'uni.coordinator1@mouau.edu.ng', firstName: 'Emeka', lastName: 'Obiora', primaryRole: 'UNIVERSITY_COURSE_COORDINATOR' },
  { staffNumber: 'STAFF-016', email: 'uni.coordinator2@mouau.edu.ng', firstName: 'Ngozi', lastName: 'Eze', primaryRole: 'UNIVERSITY_COURSE_COORDINATOR' },
];

// College-scoped roles — kept to COLPAS/CEET as before. Say the word if
// you want DEAN/COLLEGE_EXAM_OFFICER/COLLEGE_COORDINATOR generated for
// every college the same way departments are handled below.
const COLLEGE_STAFF: StaffSeedEntry[] = [
  { staffNumber: 'STAFF-004', email: 'college.exam@colpas.mouau.edu.ng', firstName: 'College', lastName: 'Exam Officer', primaryRole: 'COLLEGE_EXAM_OFFICER', collegeCode: 'COLPAS' },
  { staffNumber: 'STAFF-017', email: 'dean.colpas@colpas.mouau.edu.ng', firstName: 'Oluwaseun', lastName: 'Bakare', primaryRole: 'DEAN', collegeCode: 'COLPAS' },
  { staffNumber: 'STAFF-018', email: 'dean.ceet@ceet.mouau.edu.ng', firstName: 'Uchenna', lastName: 'Madu', primaryRole: 'DEAN', collegeCode: 'CEET' },
  { staffNumber: 'STAFF-019', email: 'college.coord.colpas@colpas.mouau.edu.ng', firstName: 'Amina', lastName: 'Bello', primaryRole: 'COLLEGE_COORDINATOR', collegeCode: 'COLPAS' },
  { staffNumber: 'STAFF-020', email: 'college.coord.ceet@ceet.mouau.edu.ng', firstName: 'Damilola', lastName: 'Ogunbiyi', primaryRole: 'COLLEGE_COORDINATOR', collegeCode: 'CEET' },
];

// Hand-authored CSC block — canonical example for what a fully-staffed
// department looks like (exam officer, HOD, coordinator, invigilator,
// two lecturers).
const CSC_STAFF: StaffSeedEntry[] = [
  { staffNumber: 'STAFF-005', email: 'dept.exam@csc.mouau.edu.ng', firstName: 'Department', lastName: 'Exam Officer', primaryRole: 'DEPARTMENT_EXAM_OFFICER', deptCode: 'CSC' },
  { staffNumber: 'STAFF-006', email: 'hod@csc.mouau.edu.ng', firstName: 'Head', lastName: 'Of Department', primaryRole: 'HOD', deptCode: 'CSC' },
  { staffNumber: 'STAFF-007', email: 'lecturer1@csc.mouau.edu.ng', firstName: 'John', lastName: 'Lecturer', primaryRole: 'LECTURER', deptCode: 'CSC', levels: [100, 200], maxCourseLoad: 3 },
  { staffNumber: 'STAFF-008', email: 'lecturer2@csc.mouau.edu.ng', firstName: 'Jane', lastName: 'Instructor', primaryRole: 'LECTURER', deptCode: 'CSC', levels: [200, 300], maxCourseLoad: 3 },
  { staffNumber: 'STAFF-009', email: 'invigilator@csc.mouau.edu.ng', firstName: 'David', lastName: 'Invigilator', primaryRole: 'INVIGILATOR', deptCode: 'CSC' },
  { staffNumber: 'STAFF-010', email: 'lecturer3@csc.mouau.edu.ng', firstName: 'Sarah', lastName: 'Professor', primaryRole: 'LECTURER', deptCode: 'CSC', levels: [300, 400], maxCourseLoad: 3 },
  { staffNumber: 'STAFF-021', email: 'dept.coord@csc.mouau.edu.ng', firstName: 'Kelechi', lastName: 'Nnamdi', primaryRole: 'DEPARTMENT_COORDINATOR', deptCode: 'CSC' },
];

// Hand-authored PHY block — like CSC, carved out of the generic
// department generator below so these four roles get named entries here.
const PHY_STAFF: StaffSeedEntry[] = [
  { staffNumber: 'STAFF-023', email: 'hod@phy.mouau.edu.ng', firstName: 'Chukwuma', lastName: 'Ibeh', primaryRole: 'HOD', deptCode: 'PHY' },
  { staffNumber: 'STAFF-024', email: 'lecturer1@phy.mouau.edu.ng', firstName: 'Ngozi', lastName: 'Okafor', primaryRole: 'LECTURER', deptCode: 'PHY', levels: [100, 200], maxCourseLoad: 3 },
  { staffNumber: 'STAFF-025', email: 'dept.exam@phy.mouau.edu.ng', firstName: 'Ifeanyi', lastName: 'Nwachukwu', primaryRole: 'DEPARTMENT_EXAM_OFFICER', deptCode: 'PHY' },
  { staffNumber: 'STAFF-026', email: 'dept.coord@phy.mouau.edu.ng', firstName: 'Adaobi', lastName: 'Eze', primaryRole: 'DEPARTMENT_COORDINATOR', deptCode: 'PHY' },
  { staffNumber: 'STAFF-027', email: 'invigilator@phy.mouau.edu.ng', firstName: 'Chidinma', lastName: 'Anyanwu', primaryRole: 'INVIGILATOR', deptCode: 'PHY' },
  { staffNumber: 'STAFF-028', email: 'lecturer2@phy.mouau.edu.ng', firstName: 'Obinna', lastName: 'Nwokolo', primaryRole: 'LECTURER', deptCode: 'PHY', levels: [100, 200], maxCourseLoad: 3 },
  { staffNumber: 'STAFF-029', email: 'lecturer3@phy.mouau.edu.ng', firstName: 'Amarachi', lastName: 'Chukwuma', primaryRole: 'LECTURER', deptCode: 'PHY', levels: [100, 200], maxCourseLoad: 3 },
  { staffNumber: 'STAFF-030', email: 'lecturer4@phy.mouau.edu.ng', firstName: 'Uchenna', lastName: 'Ibekwe', primaryRole: 'LECTURER', deptCode: 'PHY', levels: [100, 200], maxCourseLoad: 3 },
];

// One DEPARTMENT_EXAM_OFFICER, HOD, DEPARTMENT_COORDINATOR, INVIGILATOR,
// and two LECTURERs (100/200-level and 200/300-level) for every
// department other than CSC and PHY, which are hand-authored above.
const DEPARTMENT_STAFF: StaffSeedEntry[] = DEPARTMENTS.filter((d) => d.code !== 'CSC' && d.code !== 'PHY').flatMap((dept) => {
  const slug = dept.code.toLowerCase();

  const examOfficer = nextStaffName();
  const hod = nextStaffName();
  const coordinator = nextStaffName();
  const invigilator = nextStaffName();
  const lecturer1 = nextStaffName();
  const lecturer2 = nextStaffName();

  return [
    { staffNumber: nextStaffNumber(), email: `dept.exam@${slug}.mouau.edu.ng`, firstName: examOfficer.firstName, lastName: examOfficer.lastName, primaryRole: 'DEPARTMENT_EXAM_OFFICER', deptCode: dept.code },
    { staffNumber: nextStaffNumber(), email: `hod@${slug}.mouau.edu.ng`, firstName: hod.firstName, lastName: hod.lastName, primaryRole: 'HOD', deptCode: dept.code },
    { staffNumber: nextStaffNumber(), email: `dept.coord@${slug}.mouau.edu.ng`, firstName: coordinator.firstName, lastName: coordinator.lastName, primaryRole: 'DEPARTMENT_COORDINATOR', deptCode: dept.code },
    { staffNumber: nextStaffNumber(), email: `invigilator@${slug}.mouau.edu.ng`, firstName: invigilator.firstName, lastName: invigilator.lastName, primaryRole: 'INVIGILATOR', deptCode: dept.code },
    { staffNumber: nextStaffNumber(), email: `lecturer1@${slug}.mouau.edu.ng`, firstName: lecturer1.firstName, lastName: lecturer1.lastName, primaryRole: 'LECTURER', deptCode: dept.code, levels: [100, 200], maxCourseLoad: 3 },
    { staffNumber: nextStaffNumber(), email: `lecturer2@${slug}.mouau.edu.ng`, firstName: lecturer2.firstName, lastName: lecturer2.lastName, primaryRole: 'LECTURER', deptCode: dept.code, levels: [200, 300], maxCourseLoad: 3 },
  ];
});

const STAFF_DATA: StaffSeedEntry[] = [
  ...UNIVERSITY_WIDE_STAFF,
  ...COLLEGE_STAFF,
  ...CSC_STAFF,
  ...PHY_STAFF,
  ...DEPARTMENT_STAFF,
];

// ============================================================
// STUDENT DATA
// ============================================================

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

// Every department gets exactly one 100L and one 200L student.
const STUDENT_LEVELS = [100, 200] as const;

const TOTAL_STUDENTS_PLANNED = DEPARTMENTS.length * STUDENT_LEVELS.length;

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
  lecturerAssignments: ResultBlock;
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
      lecturerAssignments: { created: 0, skipped: 0, total: 0 },
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
        const created = await prisma.college.create({
          data: {
            universityId: university.id,
            name: collegeData.name,
            shortName: collegeData.shortName,
            code: collegeData.code,
          },
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
    // Map value carries collegeId so staff seeding (step 12) can resolve
    // both departmentId and collegeId from a single deptCode lookup.
    const deptMap = new Map<string, { id: string; shortName: string; name: string; collegeId: string }>();
    for (const deptData of DEPARTMENTS) {
      const college = collegeMap.get(deptData.collegeCode);
      if (!college) continue;

      const existing = await prisma.department.findFirst({
        where: { collegeId: college.id, shortName: deptData.shortName },
      });

      if (!existing) {
        const created = await prisma.department.create({
          data: {
            collegeId: college.id,
            name: deptData.name,
            shortName: deptData.shortName,
            code: deptData.code,
          },
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

    // Reverse lookup (Department.id -> deptCode) used later to match a
    // course's department back to a deptCode for lecturer assignment.
    const deptIdToCode = new Map<string, string>();
    for (const [code, dept] of deptMap) {
      deptIdToCode.set(dept.id, code);
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

    // Tracks LECTURER staffIds per deptCode, along with which levels each
    // one is eligible to teach and their max course load — populated for
    // both newly-created and pre-existing staff. Used in step 13 to assign
    // lecturerId on CourseOffering rows, matched by department AND level,
    // not department alone.
    interface LecturerPoolEntry {
      staffId: string;
      levels: number[];
      maxCourseLoad: number;
      assignedCount: number;
    }
    const lecturersByDept = new Map<string, LecturerPoolEntry[]>();

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

      // Resolve departmentId/collegeId from deptCode (preferred, gives both)
      // or collegeCode (college-only roles like COLLEGE_EXAM_OFFICER).
      let departmentId: string | null = null;
      let collegeId: string | null = null;
      if (staff.deptCode) {
        const dept = deptMap.get(staff.deptCode);
        if (dept) {
          departmentId = dept.id;
          collegeId = dept.collegeId;
        }
      } else if (staff.collegeCode) {
        const college = collegeMap.get(staff.collegeCode);
        if (college) collegeId = college.id;
      }

      const registerLecturer = (staffId: string) => {
        if (staff.primaryRole !== 'LECTURER' || !staff.deptCode) return;
        const list = lecturersByDept.get(staff.deptCode) ?? [];
        list.push({
          staffId,
          levels: staff.levels ?? [],
          maxCourseLoad: staff.maxCourseLoad ?? 3,
          assignedCount: 0,
        });
        lecturersByDept.set(staff.deptCode, list);
      };

      const existing = await prisma.staff.findUnique({ where: { staffNumber: staff.staffNumber } });

      if (!existing) {
        try {
          // Protect staff data using the dataProtection helper
          const protectedData = await protectStaffData({
            email: staff.email,
            phone: null,
            firstName: staff.firstName,
            lastName: staff.lastName,
            otherNames: null,
            staffNumber: staff.staffNumber,
          });

          const createdStaff = await prisma.staff.create({
            data: {
              // Plain fields for lookup
              staffNumber: staff.staffNumber,
              // Protected fields
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
              collegeId,
              departmentId,
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

          registerLecturer(createdStaff.id);

          results.staff.created++;
          totalCreated++;
        } catch (staffErr) {
          console.error(`Failed to create staff ${staff.staffNumber}:`, staffErr);
          continue;
        }
      } else {
        // Backfill collegeId/departmentId on rows created before this field
        // was wired up, so re-running the seed heals older data instead of
        // leaving it permanently null.
        if ((existing.collegeId !== collegeId || existing.departmentId !== departmentId) &&
            (collegeId !== null || departmentId !== null)) {
          await prisma.staff.update({
            where: { id: existing.id },
            data: { collegeId, departmentId },
          });
        }

        registerLecturer(existing.id);

        results.staff.skipped++;
        totalSkipped++;
      }
    }

    // ─── 13. Assign lecturers to course offerings ──────────────────────
    // For each course offering in the current semester with no lecturerId,
    // assign one lecturer from the course's own department who is also
    // eligible for that course's level (per the lecturer's `levels` list)
    // and hasn't hit their maxCourseLoad — never a department-wide or
    // cross-level assignment. Offerings with no eligible lecturer are
    // left unassigned and reported as skipped, rather than forced onto
    // someone who doesn't teach that level.
    if (currentSemester) {
      const offeringsNeedingLecturer = await prisma.courseOffering.findMany({
        where: { semesterId: currentSemester.id, lecturerId: null },
        include: { course: { include: { level: true } } },
      });
      results.lecturerAssignments.total = offeringsNeedingLecturer.length;

      for (const offering of offeringsNeedingLecturer) {
        const deptCode = deptIdToCode.get(offering.course.departmentId);
        const pool = deptCode ? lecturersByDept.get(deptCode) : undefined;
        const courseLevel = offering.course.level.name;

        const eligible = (pool ?? []).filter(
          (l) => l.levels.includes(courseLevel) && l.assignedCount < l.maxCourseLoad,
        );

        if (eligible.length === 0) {
          results.lecturerAssignments.skipped++;
          totalSkipped++;
          continue;
        }

        // Pick whoever among the eligible lecturers currently has the
        // lightest load, so assignments spread evenly rather than filling
        // one lecturer up before touching the next.
        eligible.sort((a, b) => a.assignedCount - b.assignedCount);
        const chosen = eligible[0];

        await prisma.courseOffering.update({
          where: { id: offering.id },
          data: { lecturerId: chosen.staffId },
        });
        chosen.assignedCount++;

        results.lecturerAssignments.created++;
        totalCreated++;
      }
    }

    // ─── 14. Students ───────────────────────────────────────────────────
    // Mirrors src/routes/(auth)/register/+page.server.ts `signup` action:
    // same protectStudentRegistration() call, same field shape, same
    // dedup checks (emailHash / matricNumber / jambRegNo / phoneHash) —
    // so seeded students are indistinguishable in structure from students
    // who registered themselves. One student per level (100, 200) per
    // department, matching the two levels seeded in LEVELS.
    const studentPasswordHash = await hashPassword(STUDENT_DEFAULT_PASSWORD);
    const entryYear = new Date().getFullYear();
    const usedStudentEmails = new Set<string>();
    let globalNameIndex = 0;

    for (const deptData of DEPARTMENTS) {
      const dept = deptMap.get(deptData.code);
      const programmeId = undergradProgrammeMap.get(deptData.code);
      if (!dept || !programmeId) continue;

      for (let levelIndex = 0; levelIndex < STUDENT_LEVELS.length; levelIndex++) {
        const levelName = STUDENT_LEVELS[levelIndex];
        const level = levelMap.get(levelName);
        if (!level) {
          console.error(`Level ${levelName} not found — skipping ${deptData.code} ${levelName}L student.`);
          continue;
        }

        const firstName = STUDENT_FIRST_NAMES[globalNameIndex % STUDENT_FIRST_NAMES.length];
        const lastName = STUDENT_LAST_NAMES[globalNameIndex % STUDENT_LAST_NAMES.length];
        globalNameIndex++;

        // Index within this department's matric sequence: 1 = 100L, 2 = 200L.
        const matricIndex = levelIndex + 1;
        const matricNumber = buildMatricNumber(deptData.code, matricIndex);
        // Entry year is offset back by how many levels above 100 the
        // student is, so a 200L student's JAMB year reflects an earlier
        // intake than a 100L student in the same department.
        const studentEntryYear = entryYear - levelIndex;
        const jambRegNo = buildJambRegNo(deptData.code, matricIndex, studentEntryYear);
        const email = buildStudentEmail(firstName, lastName, usedStudentEmails);

        // Always surface the credential, whether newly created or already existing.
        results.credentials.push({
          type: 'student',
          identifier: matricNumber,
          role: 'STUDENT',
          email,
          password: STUDENT_DEFAULT_PASSWORD,
        });

        // Same protection call the real signup action uses — encrypts
        // email/phone, hashes email/phone/receipt fields, passes through
        // matricNumber/jambRegNo/names per the schema's actual column set.
        const protectedData = await protectStudentRegistration({
          email,
          phone: null,
          firstName,
          lastName,
          otherNames: null,
          matricNumber,
          jambRegNo,
          receiptNo: null,
          receiptRef: null,
        });

        // Same dedup strategy as the real signup action — check every
        // unique field the schema actually enforces, not just matricNumber.
        const [dupEmail, dupMatric, dupJamb, dupPhone] = await Promise.all([
          prisma.student.findUnique({ where: { emailHash: protectedData.emailHash } }),
          prisma.student.findUnique({ where: { matricNumber: protectedData.matricNumber } }),
          prisma.student.findUnique({ where: { jambRegNo: protectedData.jambRegNo } }),
          protectedData.phoneHash
            ? prisma.student.findUnique({ where: { phoneHash: protectedData.phoneHash } })
            : Promise.resolve(null),
        ]);

        const alreadyExists = dupEmail || dupMatric || dupJamb || dupPhone;

        if (!alreadyExists) {
          try {
            await prisma.student.create({
              data: {
                // Plain fields for lookup
                matricNumber: protectedData.matricNumber,
                jambRegNo: protectedData.jambRegNo,
                // Protected fields
                email: protectedData.email,
                emailHash: protectedData.emailHash,
                passwordHash: studentPasswordHash,
                firstName: protectedData.firstName,
                lastName: protectedData.lastName,
                otherNames: protectedData.otherNames,
                phone: protectedData.phone,
                phoneHash: protectedData.phoneHash,
                // Other fields
                receiptNo: protectedData.receiptNo,
                receiptRef: protectedData.receiptRef,
                receiptSource: 'SEED',
                registrationSession: sessionName,
                departmentId: dept.id,
                programmeId,
                currentLevelId: level.id,
                entryYear: studentEntryYear,
                status: 'ACTIVE',
                // Seeded accounts get a shared default password, unlike
                // real registrants who choose their own — force a change.
                mustChangePassword: true,
              },
            });

            results.students.created++;
            totalCreated++;
          } catch (studentErr) {
            const msg = studentErr instanceof Error ? studentErr.message : String(studentErr);
            console.error(`Failed to create student ${matricNumber}:`, msg);
            continue;
          }
        } else {
          results.students.skipped++;
          totalSkipped++;
        }
      }
    }

    // ─── 15. Audit Log ──────────────────────────────────────────────────
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