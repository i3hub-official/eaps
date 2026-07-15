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

const STAFF_DEFAULT_PASSWORD   = 'Admin123';
const STUDENT_DEFAULT_PASSWORD = 'Student123';

// ============================================================
// TYPES
// ============================================================

interface ResultBlock {
    created: number;
    skipped: number;
    total:   number;
}

interface CredentialRecord {
    type:       'staff' | 'student';
    identifier: string; // staffNumber or matricNumber
    role:       string;
    email:      string;
    password:   string;
}

interface SeedResults {
    systemFlags:          ResultBlock;
    university:           { created: boolean; skipped: boolean };
    colleges:             ResultBlock;
    departments:          ResultBlock;
    levels:               ResultBlock;
    programmes:           ResultBlock;
    session:              { created: boolean; skipped: boolean };
    semesters:            ResultBlock;
    courses:              ResultBlock;
    offerings:            ResultBlock;
    gradeScale:           ResultBlock;
    roles:                ResultBlock;
    staff:                ResultBlock;
    students:             ResultBlock;
    lecturerAssignments:  ResultBlock;
    credentials:          CredentialRecord[];
    totalCreated:         number;
    totalSkipped:         number;
}

interface LecturerPoolEntry {
    staffId:        string;
    levels:         number[];
    maxCourseLoad:  number;
    assignedCount:  number;
}

// ============================================================
// STAFF DATA
// ============================================================

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

// Counter starts above the last hand-authored staff number (STAFF-030)
// so auto-generated entries never collide with hand-authored ones.
let staffAutoCounter = 30;
let staffNameCursor  = 0;

function nextStaffNumber(): string {
    return `STAFF-${String(++staffAutoCounter).padStart(3, '0')}`;
}

function nextStaffName(): { firstName: string; lastName: string } {
    return {
        firstName: STAFF_FIRST_NAMES[staffNameCursor   % STAFF_FIRST_NAMES.length],
        lastName:  STAFF_LAST_NAMES[staffNameCursor++ % STAFF_LAST_NAMES.length],
    };
}

interface StaffSeedEntry {
    staffNumber:   string;
    email:         string;
    firstName:     string;
    lastName:      string;
    primaryRole:   string;
    deptCode?:     string;
    collegeCode?:  string;
    levels?:       number[];
    maxCourseLoad?: number;
}

const UNIVERSITY_WIDE_STAFF: StaffSeedEntry[] = [
    { staffNumber: 'STAFF-001', email: 'super.admin@mouau.edu.ng',        firstName: 'Super',       lastName: 'Admin',          primaryRole: 'SUPER_ADMIN' },
    { staffNumber: 'STAFF-002', email: 'registrar@mouau.edu.ng',          firstName: 'University',  lastName: 'Registrar',      primaryRole: 'REGISTRAR' },
    { staffNumber: 'STAFF-003', email: 'university.exam@mouau.edu.ng',    firstName: 'University',  lastName: 'Exam Officer',   primaryRole: 'UNIVERSITY_EXAM_OFFICER' },
    { staffNumber: 'STAFF-011', email: 'vc1@mouau.edu.ng',                firstName: 'Chukwuemeka', lastName: 'Nwosu',          primaryRole: 'VC' },
    { staffNumber: 'STAFF-012', email: 'vc2@mouau.edu.ng',                firstName: 'Adaeze',      lastName: 'Okonkwo',        primaryRole: 'VC' },
    { staffNumber: 'STAFF-013', email: 'dvc1@mouau.edu.ng',               firstName: 'Ibrahim',     lastName: 'Musa',           primaryRole: 'DVC' },
    { staffNumber: 'STAFF-014', email: 'dvc2@mouau.edu.ng',               firstName: 'Folake',      lastName: 'Adeyemi',        primaryRole: 'DVC' },
    { staffNumber: 'STAFF-015', email: 'uni.coordinator1@mouau.edu.ng',   firstName: 'Emeka',       lastName: 'Obiora',         primaryRole: 'UNIVERSITY_COURSE_COORDINATOR' },
    { staffNumber: 'STAFF-016', email: 'uni.coordinator2@mouau.edu.ng',   firstName: 'Ngozi',       lastName: 'Eze',            primaryRole: 'UNIVERSITY_COURSE_COORDINATOR' },
];

const COLLEGE_STAFF: StaffSeedEntry[] = [
    { staffNumber: 'STAFF-004', email: 'college.exam@colpas.mouau.edu.ng',        firstName: 'College',     lastName: 'Exam Officer',   primaryRole: 'COLLEGE_EXAM_OFFICER',   collegeCode: 'COLPAS' },
    { staffNumber: 'STAFF-017', email: 'dean.colpas@colpas.mouau.edu.ng',         firstName: 'Oluwaseun',   lastName: 'Bakare',         primaryRole: 'DEAN',                   collegeCode: 'COLPAS' },
    { staffNumber: 'STAFF-018', email: 'dean.ceet@ceet.mouau.edu.ng',             firstName: 'Uchenna',     lastName: 'Madu',           primaryRole: 'DEAN',                   collegeCode: 'CEET' },
    { staffNumber: 'STAFF-019', email: 'college.coord.colpas@colpas.mouau.edu.ng',firstName: 'Amina',       lastName: 'Bello',          primaryRole: 'COLLEGE_COORDINATOR',    collegeCode: 'COLPAS' },
    { staffNumber: 'STAFF-020', email: 'college.coord.ceet@ceet.mouau.edu.ng',    firstName: 'Damilola',    lastName: 'Ogunbiyi',       primaryRole: 'COLLEGE_COORDINATOR',    collegeCode: 'CEET' },
];

const CSC_STAFF: StaffSeedEntry[] = [
    { staffNumber: 'STAFF-005', email: 'dept.exam@csc.mouau.edu.ng',   firstName: 'Department', lastName: 'Exam Officer',  primaryRole: 'DEPARTMENT_EXAM_OFFICER', deptCode: 'CSC' },
    { staffNumber: 'STAFF-006', email: 'hod@csc.mouau.edu.ng',         firstName: 'Head',       lastName: 'Of Department', primaryRole: 'HOD',                    deptCode: 'CSC' },
    { staffNumber: 'STAFF-007', email: 'lecturer1@csc.mouau.edu.ng',   firstName: 'John',       lastName: 'Lecturer',      primaryRole: 'LECTURER',               deptCode: 'CSC', levels: [100, 200], maxCourseLoad: 3 },
    { staffNumber: 'STAFF-008', email: 'lecturer2@csc.mouau.edu.ng',   firstName: 'Jane',       lastName: 'Instructor',    primaryRole: 'LECTURER',               deptCode: 'CSC', levels: [200, 300], maxCourseLoad: 3 },
    { staffNumber: 'STAFF-009', email: 'invigilator@csc.mouau.edu.ng', firstName: 'David',      lastName: 'Invigilator',   primaryRole: 'INVIGILATOR',            deptCode: 'CSC' },
    { staffNumber: 'STAFF-010', email: 'lecturer3@csc.mouau.edu.ng',   firstName: 'Sarah',      lastName: 'Professor',     primaryRole: 'LECTURER',               deptCode: 'CSC', levels: [300, 400], maxCourseLoad: 3 },
    { staffNumber: 'STAFF-021', email: 'dept.coord@csc.mouau.edu.ng',  firstName: 'Kelechi',    lastName: 'Nnamdi',        primaryRole: 'DEPARTMENT_COORDINATOR', deptCode: 'CSC' },
];

const PHY_STAFF: StaffSeedEntry[] = [
    { staffNumber: 'STAFF-023', email: 'hod@phy.mouau.edu.ng',          firstName: 'Chukwuma',  lastName: 'Ibeh',       primaryRole: 'HOD',                    deptCode: 'PHY' },
    { staffNumber: 'STAFF-024', email: 'lecturer1@phy.mouau.edu.ng',    firstName: 'Ngozi',     lastName: 'Okafor',     primaryRole: 'LECTURER',               deptCode: 'PHY', levels: [100, 200], maxCourseLoad: 3 },
    { staffNumber: 'STAFF-025', email: 'dept.exam@phy.mouau.edu.ng',    firstName: 'Ifeanyi',   lastName: 'Nwachukwu',  primaryRole: 'DEPARTMENT_EXAM_OFFICER', deptCode: 'PHY' },
    { staffNumber: 'STAFF-026', email: 'dept.coord@phy.mouau.edu.ng',   firstName: 'Adaobi',    lastName: 'Eze',        primaryRole: 'DEPARTMENT_COORDINATOR', deptCode: 'PHY' },
    { staffNumber: 'STAFF-027', email: 'invigilator@phy.mouau.edu.ng',  firstName: 'Chidinma',  lastName: 'Anyanwu',    primaryRole: 'INVIGILATOR',            deptCode: 'PHY' },
    { staffNumber: 'STAFF-028', email: 'lecturer2@phy.mouau.edu.ng',    firstName: 'Obinna',    lastName: 'Nwokolo',    primaryRole: 'LECTURER',               deptCode: 'PHY', levels: [100, 200], maxCourseLoad: 3 },
    { staffNumber: 'STAFF-029', email: 'lecturer3@phy.mouau.edu.ng',    firstName: 'Amarachi',  lastName: 'Chukwuma',   primaryRole: 'LECTURER',               deptCode: 'PHY', levels: [100, 200], maxCourseLoad: 3 },
    { staffNumber: 'STAFF-030', email: 'lecturer4@phy.mouau.edu.ng',    firstName: 'Uchenna',   lastName: 'Ibekwe',     primaryRole: 'LECTURER',               deptCode: 'PHY', levels: [100, 200], maxCourseLoad: 3 },
];

// One of each department role for every department not hand-authored above.
const DEPARTMENT_STAFF: StaffSeedEntry[] = DEPARTMENTS
    .filter((d) => d.code !== 'CSC' && d.code !== 'PHY')
    .flatMap((dept) => {
        const slug = dept.code.toLowerCase();
        return [
            { staffNumber: nextStaffNumber(), email: `dept.exam@${slug}.mouau.edu.ng`,  ...nextStaffName(), primaryRole: 'DEPARTMENT_EXAM_OFFICER',  deptCode: dept.code },
            { staffNumber: nextStaffNumber(), email: `hod@${slug}.mouau.edu.ng`,         ...nextStaffName(), primaryRole: 'HOD',                      deptCode: dept.code },
            { staffNumber: nextStaffNumber(), email: `dept.coord@${slug}.mouau.edu.ng`, ...nextStaffName(), primaryRole: 'DEPARTMENT_COORDINATOR',   deptCode: dept.code },
            { staffNumber: nextStaffNumber(), email: `invigilator@${slug}.mouau.edu.ng`,...nextStaffName(), primaryRole: 'INVIGILATOR',              deptCode: dept.code },
            { staffNumber: nextStaffNumber(), email: `lecturer1@${slug}.mouau.edu.ng`,  ...nextStaffName(), primaryRole: 'LECTURER', deptCode: dept.code, levels: [100, 200], maxCourseLoad: 3 },
            { staffNumber: nextStaffNumber(), email: `lecturer2@${slug}.mouau.edu.ng`,  ...nextStaffName(), primaryRole: 'LECTURER', deptCode: dept.code, levels: [200, 300], maxCourseLoad: 3 },
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
    'John', 'Mary', 'Peter', 'Grace', 'Michael', 'Ruth', 'Daniel', 'Faith',
    'Samuel', 'Joy', 'Emmanuel', 'Blessing', 'David', 'Precious', 'Joseph',
    'Comfort', 'James', 'Patience', 'Paul', 'Mercy', 'Andrew', 'Gift',
    'Stephen', 'Favour', 'Victor', 'Joshua', 'Esther', 'Solomon', 'Hannah',
    'Timothy', 'Deborah', 'Jonathan', 'Elizabeth', 'Nathaniel', 'Sarah',
    'Chidinma', 'Kingsley', 'Ifeoma', 'Chukwuemeka', 'Amara', 'Obinna',
    'Chiamaka', 'Ikechukwu', 'Nkechi', 'Uchenna', 'Adaobi', 'Chibuzor',
    'Ogechi', 'Ngozi', 'Chinonso', 'Onyinye', 'Chukwudi', 'Uchechi',
    'Somto', 'Kenechukwu', 'Chioma', 'Emeka', 'Nneka', 'Chukwuma',
    'Adaeze', 'Chinedu', 'Ifeanyi', 'Nneoma', 'Uzochukwu',
    'Oluwafemi', 'Olayinka', 'Adebayo', 'Foluke', 'Oluwaseun', 'Ayomide',
    'Oluwadamilola', 'Temitayo', 'Abimbola', 'Olayemi', 'Oluwatoyin',
    'Adekunle', 'Olufemi', 'Funmilayo', 'Oluwaseyi', 'Tolulope',
    'Aisha', 'Fatima', 'Aminu', 'Zainab', 'Bello', 'Musa', 'Hadiza',
    'Sani', 'Rabi', 'Usman', 'Hauwa', 'Suleiman', 'Amina', 'Adamu',
    'Ibrahim', 'Damilola', 'Oyindamola', 'Somtochukwu', 'Oluwanifemi',
    'Chiedozie', 'Temitope', 'Nduka', 'Oluwatosin', 'Kachi',
    'Oreoluwa', 'Chijindu', 'Ebuka', 'Oluwatobiloba', 'Chidi',
    'Olabisi', 'Chimamanda', 'Oluwashina', 'Onyekachi',
];

const STUDENT_LAST_NAMES = [
    'Okafor', 'Eze', 'Nwosu', 'Okoro', 'Chukwu', 'Obi', 'Nwachukwu',
    'Adeyemi', 'Okonkwo', 'Uzoma', 'Anyanwu', 'Nnamdi', 'Okeke', 'Igwe',
    'Onyekwere', 'Ejiofor', 'Nwankwo', 'Chukwuma', 'Onuoha', 'Amadi',
    'Iwu', 'Nnadi', 'Okorie', 'Chibueze', 'Madu', 'Ogunleye', 'Adewale',
    'Adebayo', 'Ogunlade', 'Oladipo', 'Akinlade', 'Ogunbiyi', 'Olatunji',
    'Ogundeji', 'Adebisi', 'Fadipe', 'Onabanjo', 'Ogunyemi', 'Akinwale',
    'Oladunjoye', 'Akinmuyide', 'Ogunbanjo', 'Akintola', 'Fasanya',
    'Akinola', 'Adesola', 'Abdullahi', 'Bello', 'Garba', 'Muhammad',
    'Musa', 'Umar', 'Adamu', 'Suleiman', 'Yusuf', 'Hassan', 'Aliyu',
    'Ibrahim', 'Umaru', 'Danjuma', 'Usman', 'Bala', 'Malami', 'Lawan',
    'Abdulrahman', 'Abubakar', 'Ezeh', 'Ogbonna', 'Ukaegbu', 'Nwankpa',
    'Ibe', 'Nwoke', 'Uche', 'Nwokocha', 'Eke', 'Okpara', 'Onyejiaka',
    'Nwogu', 'Okereke', 'Ezeani', 'Ohakwe', 'Okogwu', 'Nwabueze',
    'Ezeokonkwo', 'Mbah', 'Onyeje', 'Nwaiwu', 'Opara', 'Nwogwugwu',
];

const STUDENT_LEVELS = [100, 200] as const;
const TOTAL_STUDENTS_PLANNED = DEPARTMENTS.length * STUDENT_LEVELS.length;

// ============================================================
// HELPERS — academic calendar
// ============================================================

function getAcademicSession(now: Date) {
    const year      = now.getFullYear();
    const month     = now.getMonth();
    const startYear = month >= 8 ? year : year - 1;
    const endYear   = startYear + 1;
    return {
        name:      `${startYear}/${endYear}`,
        startDate: new Date(startYear, 8, 1),
        endDate:   new Date(endYear,   7, 31),
    };
}

function getSemesterWindows(startYear: number, endYear: number, now: Date) {
    const first = {
        type:         'FIRST' as const,
        startDate:    new Date(startYear, 8, 16),
        endDate:      new Date(endYear,   0, 31),
        regOpenAt:    new Date(startYear, 8,  1),
        regCloseAt:   new Date(startYear, 8, 30),
    };
    const second = {
        type:         'SECOND' as const,
        startDate:    new Date(endYear, 1, 10),
        endDate:      new Date(endYear, 5, 30),
        regOpenAt:    new Date(endYear, 1,  1),
        regCloseAt:   new Date(endYear, 1, 28),
    };

    const inFirst  = now >= first.startDate  && now <= first.endDate;
    const inSecond = now >= second.startDate && now <= second.endDate;

    let currentType: 'FIRST' | 'SECOND';
    if      (inFirst)  currentType = 'FIRST';
    else if (inSecond) currentType = 'SECOND';
    else               currentType = now > second.endDate ? 'SECOND' : 'FIRST';

    return [
        { ...first,  isCurrent: currentType === 'FIRST'  },
        { ...second, isCurrent: currentType === 'SECOND' },
    ];
}

// ============================================================
// HELPERS — student identifiers
// ============================================================

function slugName(name: string): string {
    return name.toLowerCase().replace(/[^a-z]/g, '');
}

function buildStudentEmail(firstName: string, lastName: string, usedEmails: Set<string>): string {
    const base = `${slugName(firstName)}.${slugName(lastName)}`;
    let email  = `${base}@student.mouau.edu.ng`;
    let suffix = 1;
    while (usedEmails.has(email)) {
        email = `${base}.${suffix++}@student.mouau.edu.ng`;
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
// HELPERS — result tracking
// ============================================================

function makeBlock(total = 0): ResultBlock {
    return { created: 0, skipped: 0, total };
}

function bump(block: ResultBlock, created: boolean) {
    if (created) block.created++;
    else         block.skipped++;
}

// ============================================================
// HANDLER
// ============================================================

export const POST: RequestHandler = async () => {
    try {
        const prisma = await getPrismaClient();
        const now    = new Date();

        // Shared password hashes — computed once, reused across all rows.
        const [staffPasswordHash, studentPasswordHash] = await Promise.all([
            hashPassword(STAFF_DEFAULT_PASSWORD),
            hashPassword(STUDENT_DEFAULT_PASSWORD),
        ]);

        let totalCreated = 0;
        let totalSkipped = 0;

        const results: SeedResults = {
            systemFlags:         makeBlock(2),
            university:          { created: false, skipped: false },
            colleges:            makeBlock(COLLEGES.length),
            departments:         makeBlock(DEPARTMENTS.length),
            levels:              makeBlock(LEVELS.length),
            programmes:          makeBlock(),
            session:             { created: false, skipped: false },
            semesters:           makeBlock(),
            courses:             makeBlock(COURSES.length),
            offerings:           makeBlock(),
            gradeScale:          makeBlock(GRADE_SCALE.length),
            roles:               makeBlock(ROLES.length),
            staff:               makeBlock(STAFF_DATA.length),
            students:            makeBlock(TOTAL_STUDENTS_PLANNED),
            lecturerAssignments: makeBlock(),
            credentials:         [],
            totalCreated:        0,
            totalSkipped:        0,
        };

        // Convenience wrappers so every step increments the global totals
        // automatically alongside the per-entity block.
        function track(block: ResultBlock, created: boolean) {
            bump(block, created);
            if (created) totalCreated++;
            else         totalSkipped++;
        }
        function trackBool(block: { created: boolean; skipped: boolean }, created: boolean) {
            block.created = created;
            block.skipped = !created;
            if (created) totalCreated++;
            else         totalSkipped++;
        }

        // ── 0. System Flags ─────────────────────────────────────────────
        // Seeded first so the layout server can query them on every request.
        // createManyAndReturn tells us exactly how many were new vs already present.
        const createdFlags = await prisma.systemFlag.createManyAndReturn({
            data: [
                { key: 'maintenance', value: 'false' },
                { key: 'shutdown',    value: 'false' },
            ],
            skipDuplicates: true,
        });
        results.systemFlags.created = createdFlags.length;
        results.systemFlags.skipped = 2 - createdFlags.length;
        totalCreated += createdFlags.length;
        totalSkipped += 2 - createdFlags.length;

        // ── 1. University ────────────────────────────────────────────────
        let university = await prisma.university.findUnique({ where: { shortName: 'MOUAU' } });

        if (!university) {
            const [name, shortName, address, emailData, phoneData] = await Promise.all([
                protectText('Michael Okpara University of Agriculture, Umudike'),
                protectText('MOUAU'),
                protectText('Umudike, Abia State, Nigeria'),
                protectEmail('info@mouau.edu.ng'),
                protectPhone('+2348000000000'),
            ]);

            university = await prisma.university.create({
                data: {
                    name,
                    shortName,
                    address,
                    email:   emailData.encrypted,
                    phone:   phoneData.encrypted,
                    website: 'https://mouau.edu.ng',
                },
            });
            trackBool(results.university, true);
        } else {
            trackBool(results.university, false);
        }

        if (!university) throw error(500, 'Failed to create or find university');

        // ── 2. Colleges ──────────────────────────────────────────────────
        const collegeMap = new Map<string, { id: string; shortName: string }>();

        for (const c of COLLEGES) {
            const existing = await prisma.college.findFirst({
                where: { universityId: university.id, shortName: c.shortName },
            });

            if (!existing) {
                const created = await prisma.college.create({
                    data: { universityId: university.id, name: c.name, shortName: c.shortName, code: c.code },
                });
                collegeMap.set(c.code, created);
                track(results.colleges, true);
            } else {
                collegeMap.set(c.code, existing);
                track(results.colleges, false);
            }
        }

        // ── 3. Departments ───────────────────────────────────────────────
        // Map value includes collegeId so staff seeding can resolve both
        // departmentId and collegeId from a single deptCode lookup.
        const deptMap = new Map<string, { id: string; shortName: string; name: string; collegeId: string }>();

        for (const d of DEPARTMENTS) {
            const college = collegeMap.get(d.collegeCode);
            if (!college) continue;

            const existing = await prisma.department.findFirst({
                where: { collegeId: college.id, shortName: d.shortName },
            });

            if (!existing) {
                const created = await prisma.department.create({
                    data: { collegeId: college.id, name: d.name, shortName: d.shortName, code: d.code },
                });
                deptMap.set(d.code, { ...created, collegeId: college.id });
                track(results.departments, true);
            } else {
                deptMap.set(d.code, { ...existing, collegeId: college.id });
                track(results.departments, false);
            }
        }

        // Reverse lookup used in step 13 to match a course offering back
        // to its deptCode for lecturer assignment.
        const deptIdToCode = new Map<string, string>(
            [...deptMap.entries()].map(([code, dept]) => [dept.id, code])
        );

        // ── 4. Levels ────────────────────────────────────────────────────
        const levelMap = new Map<number, { id: string; name: number }>();

        for (const lvl of LEVELS) {
            const existing = await prisma.level.findUnique({ where: { name: lvl.name } });

            if (!existing) {
                const created = await prisma.level.create({ data: { name: lvl.name, label: lvl.label } });
                levelMap.set(lvl.name, created);
                track(results.levels, true);
            } else {
                levelMap.set(lvl.name, existing);
                track(results.levels, false);
            }
        }

        // ── 5. Programmes ────────────────────────────────────────────────
        const programmeTypes = [
            { type: 'UNDERGRADUATE',        shortName: 'UND-REG', duration: 4 },
            { type: 'UNDERGRADUATE',        shortName: 'CEC',     duration: 4 },
            { type: 'POSTGRADUATE_DIPLOMA', shortName: 'PG',      duration: 2 },
        ];
        results.programmes.total = deptMap.size * programmeTypes.length;

        // Tracks the UND-REG programme id per department for student seeding.
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
                            type:          prog.type as any,
                            durationYears: prog.duration,
                            isActive:      true,
                        },
                    });
                    programmeId = created.id;
                    track(results.programmes, true);
                } else {
                    programmeId = existing.id;
                    track(results.programmes, false);
                }

                if (prog.shortName === 'UND-REG') {
                    undergradProgrammeMap.set(deptCode, programmeId);
                }
            }
        }

        // ── 6. Academic Session ──────────────────────────────────────────
        const { name: sessionName, startDate: sessionStart, endDate: sessionEnd } = getAcademicSession(now);

        let session = await prisma.academicSession.findUnique({ where: { name: sessionName } });

        if (!session) {
            session = await prisma.academicSession.create({
                data: { name: sessionName, startDate: sessionStart, endDate: sessionEnd, status: 'ACTIVE', isCurrent: true },
            });
            trackBool(results.session, true);
        } else {
            trackBool(results.session, false);
        }

        // ── 7. Semesters ─────────────────────────────────────────────────
        const semesterData = getSemesterWindows(sessionStart.getFullYear(), sessionEnd.getFullYear(), now);
        results.semesters.total = semesterData.length;

        for (const sem of semesterData) {
            const existing = await prisma.semester.findUnique({
                where: { sessionId_type: { sessionId: session.id, type: sem.type } },
            });

            if (!existing) {
                await prisma.semester.create({
                    data: {
                        sessionId:            session.id,
                        type:                 sem.type,
                        startDate:            sem.startDate,
                        endDate:              sem.endDate,
                        regOpenAt:            sem.regOpenAt,
                        regCloseAt:           sem.regCloseAt,
                        isCurrent:            sem.isCurrent,
                        registrationEnabled:  true,
                    },
                });
                track(results.semesters, true);
            } else {
                // Heal isCurrent drift on re-runs without counting as a creation.
                if (existing.isCurrent !== sem.isCurrent) {
                    await prisma.semester.update({
                        where: { id: existing.id },
                        data:  { isCurrent: sem.isCurrent },
                    });
                }
                track(results.semesters, false);
            }
        }

        // ── 8. Courses ───────────────────────────────────────────────────
        for (const courseData of COURSES) {
            const dept  = deptMap.get(courseData.deptCode);
            const level = levelMap.get(courseData.level);
            if (!dept || !level) continue;

            const existing = await prisma.course.findUnique({ where: { code: courseData.code } });

            if (!existing) {
                await prisma.course.create({
                    data: {
                        code:         courseData.code,
                        title:        courseData.title,
                        creditUnits:  courseData.creditUnits,
                        type:         courseData.type,
                        status:       'ACTIVE',
                        departmentId: dept.id,
                        levelId:      level.id,
                        description:  `${courseData.title} - ${courseData.creditUnits} credit unit(s)`,
                    },
                });
                track(results.courses, true);
            } else {
                track(results.courses, false);
            }
        }

        // ── 9. Course Offerings ──────────────────────────────────────────
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
                    track(results.offerings, true);
                } else {
                    track(results.offerings, false);
                }
            }
        }

        // ── 10. Grade Scale ──────────────────────────────────────────────
        for (const tier of GRADE_SCALE) {
            const existing = await prisma.gradeScale.findUnique({ where: { label: tier.label } });

            if (!existing) {
                await prisma.gradeScale.create({ data: tier });
                track(results.gradeScale, true);
            } else {
                track(results.gradeScale, false);
            }
        }

        // ── 11. Roles ────────────────────────────────────────────────────
        for (const roleData of ROLES) {
            const existing = await prisma.role.findUnique({ where: { name: roleData.name } });

            if (!existing) {
                await prisma.role.create({
                    data: { name: roleData.name, displayName: roleData.displayName, description: roleData.description, isSystem: true },
                });
                track(results.roles, true);
            } else {
                track(results.roles, false);
            }
        }

        // ── 12. Staff ────────────────────────────────────────────────────
        // Lecturer pool is populated for both new and existing staff so
        // step 13 can assign offerings correctly on re-runs.
        const lecturersByDept = new Map<string, LecturerPoolEntry[]>();

        function registerLecturer(entry: StaffSeedEntry, staffId: string) {
            if (entry.primaryRole !== 'LECTURER' || !entry.deptCode) return;
            const pool = lecturersByDept.get(entry.deptCode) ?? [];
            pool.push({ staffId, levels: entry.levels ?? [], maxCourseLoad: entry.maxCourseLoad ?? 3, assignedCount: 0 });
            lecturersByDept.set(entry.deptCode, pool);
        }

        for (const entry of STAFF_DATA) {
            // Always emit credentials so the seed page shows the full list on every run.
            results.credentials.push({
                type:       'staff',
                identifier: entry.staffNumber,
                role:       entry.primaryRole,
                email:      entry.email,
                password:   STAFF_DEFAULT_PASSWORD,
            });

            // Resolve scope ids from deptCode (preferred) or collegeCode.
            let departmentId: string | null = null;
            let collegeId:    string | null = null;
            if (entry.deptCode) {
                const dept = deptMap.get(entry.deptCode);
                if (dept) { departmentId = dept.id; collegeId = dept.collegeId; }
            } else if (entry.collegeCode) {
                const college = collegeMap.get(entry.collegeCode);
                if (college) collegeId = college.id;
            }

            const existing = await prisma.staff.findUnique({ where: { staffNumber: entry.staffNumber } });

            if (!existing) {
                try {
                    const protected_ = await protectStaffData({
                        email:       entry.email,
                        phone:       null,
                        firstName:   entry.firstName,
                        lastName:    entry.lastName,
                        otherNames:  null,
                        staffNumber: entry.staffNumber,
                    });

                    const created = await prisma.staff.create({
                        data: {
                            staffNumber:    entry.staffNumber,
                            email:          protected_.email,
                            emailHash:      protected_.emailHash,
                            firstName:      protected_.firstName,
                            firstNameHash:  protected_.firstNameHash,
                            lastName:       protected_.lastName,
                            lastNameHash:   protected_.lastNameHash,
                            otherNames:     protected_.otherNames,
                            otherNamesHash: protected_.otherNamesHash,
                            passwordHash:   staffPasswordHash,
                            primaryRole:    entry.primaryRole as any,
                            status:         'ACTIVE',
                            mustChangePassword: true,
                            collegeId,
                            departmentId,
                            phone:          null,
                            phoneHash:      null,
                            gender:         null,
                            avatar:         null,
                            lastLoginAt:    null,
                        },
                    });

                    const role = await prisma.role.findUnique({ where: { name: entry.primaryRole } });
                    if (role) {
                        await prisma.staffRoleAssignment.create({
                            data: { staffId: created.id, roleId: role.id, isActive: true },
                        });
                    }

                    registerLecturer(entry, created.id);
                    track(results.staff, true);
                } catch (err) {
                    console.error(`[seed] Failed to create staff ${entry.staffNumber}:`, err);
                    continue;
                }
            } else {
                // Heal scope ids on rows created before these fields were wired.
                const needsUpdate =
                    (collegeId    !== null && existing.collegeId    !== collegeId) ||
                    (departmentId !== null && existing.departmentId !== departmentId);

                if (needsUpdate) {
                    await prisma.staff.update({
                        where: { id: existing.id },
                        data:  { collegeId, departmentId },
                    });
                }

                registerLecturer(entry, existing.id);
                track(results.staff, false);
            }
        }

        // ── 13. Lecturer Assignments ─────────────────────────────────────
        // Assigns the lightest-loaded eligible lecturer to every unassigned
        // offering in the current semester. Eligible = same department AND
        // the course's level is in the lecturer's `levels` list AND they
        // haven't hit their maxCourseLoad. Offerings with no eligible
        // lecturer are left unassigned and counted as skipped.
        if (currentSemester) {
            const unassigned = await prisma.courseOffering.findMany({
                where:   { semesterId: currentSemester.id, lecturerId: null },
                include: { course: { include: { level: true } } },
            });
            results.lecturerAssignments.total = unassigned.length;

            for (const offering of unassigned) {
                const deptCode   = deptIdToCode.get(offering.course.departmentId);
                const pool       = deptCode ? lecturersByDept.get(deptCode) : undefined;
                const courseLevel = offering.course.level.name;

                const eligible = (pool ?? [])
                    .filter((l) => l.levels.includes(courseLevel) && l.assignedCount < l.maxCourseLoad)
                    .sort((a, b) => a.assignedCount - b.assignedCount);

                if (!eligible.length) {
                    track(results.lecturerAssignments, false);
                    continue;
                }

                const chosen = eligible[0];
                await prisma.courseOffering.update({
                    where: { id: offering.id },
                    data:  { lecturerId: chosen.staffId },
                });
                chosen.assignedCount++;
                track(results.lecturerAssignments, true);
            }
        }

        // ── 14. Students ─────────────────────────────────────────────────
        // Structure mirrors the real signup action: same protectStudentRegistration()
        // call, same dedup checks, same field shape — seeded students are
        // indistinguishable in structure from self-registered ones.
        const entryYear        = now.getFullYear();
        const usedStudentEmails = new Set<string>();
        let globalNameIndex    = 0;

        for (const deptData of DEPARTMENTS) {
            const dept        = deptMap.get(deptData.code);
            const programmeId = undergradProgrammeMap.get(deptData.code);
            if (!dept || !programmeId) continue;

            for (let i = 0; i < STUDENT_LEVELS.length; i++) {
                const levelName = STUDENT_LEVELS[i];
                const level     = levelMap.get(levelName);
                if (!level) {
                    console.error(`[seed] Level ${levelName} not found — skipping ${deptData.code} ${levelName}L student`);
                    continue;
                }

                const firstName      = STUDENT_FIRST_NAMES[globalNameIndex % STUDENT_FIRST_NAMES.length];
                const lastName       = STUDENT_LAST_NAMES[globalNameIndex % STUDENT_LAST_NAMES.length];
                globalNameIndex++;

                const matricIndex    = i + 1;
                const studentYear    = entryYear - i;
                const matricNumber   = buildMatricNumber(deptData.code, matricIndex);
                const jambRegNo      = buildJambRegNo(deptData.code, matricIndex, studentYear);
                const email          = buildStudentEmail(firstName, lastName, usedStudentEmails);

                results.credentials.push({
                    type:       'student',
                    identifier: matricNumber,
                    role:       'STUDENT',
                    email,
                    password:   STUDENT_DEFAULT_PASSWORD,
                });

                const protected_ = await protectStudentRegistration({
                    email,
                    phone:      null,
                    firstName,
                    lastName,
                    otherNames: null,
                    matricNumber,
                    jambRegNo,
                    receiptNo:  null,
                    receiptRef: null,
                });

                const [dupEmail, dupMatric, dupJamb, dupPhone] = await Promise.all([
                    prisma.student.findUnique({ where: { emailHash:    protected_.emailHash } }),
                    prisma.student.findUnique({ where: { matricNumber: protected_.matricNumber } }),
                    prisma.student.findUnique({ where: { jambRegNo:    protected_.jambRegNo } }),
                    protected_.phoneHash
                        ? prisma.student.findUnique({ where: { phoneHash: protected_.phoneHash } })
                        : Promise.resolve(null),
                ]);

                if (dupEmail || dupMatric || dupJamb || dupPhone) {
                    track(results.students, false);
                    continue;
                }

                try {
                    await prisma.student.create({
                        data: {
                            matricNumber:        protected_.matricNumber,
                            jambRegNo:           protected_.jambRegNo,
                            email:               protected_.email,
                            emailHash:           protected_.emailHash,
                            passwordHash:        studentPasswordHash,
                            firstName:           protected_.firstName,
                            lastName:            protected_.lastName,
                            otherNames:          protected_.otherNames,
                            phone:               protected_.phone,
                            phoneHash:           protected_.phoneHash,
                            receiptNo:           protected_.receiptNo,
                            receiptRef:          protected_.receiptRef,
                            receiptSource:       'SEED',
                            registrationSession: sessionName,
                            departmentId:        dept.id,
                            programmeId,
                            currentLevelId:      level.id,
                            entryYear:           studentYear,
                            status:              'ACTIVE',
                            mustChangePassword:  true,
                        },
                    });
                    track(results.students, true);
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    console.error(`[seed] Failed to create student ${matricNumber}:`, msg);
                    continue;
                }
            }
        }

        // ── 15. Audit Log ────────────────────────────────────────────────
        try {
            await prisma.auditLog.create({
                data: {
                    actorType: 'system',
                    action:    'SEED_DATABASE',
                    entity:    'System',
                    afterData: {
                        // Redact plaintext passwords before persisting.
                        results: {
                            ...results,
                            credentials: results.credentials.map(({ password: _, ...rest }) => rest),
                        },
                        timestamp: now.toISOString(),
                    },
                },
            });
        } catch (auditErr) {
            // Never fail the whole seed over a missing audit log entry.
            console.error('[seed] Failed to write audit log:', auditErr);
        }

        results.totalCreated = totalCreated;
        results.totalSkipped = totalSkipped;

        return json({ success: true, message: 'Database seeded successfully', results });

    } catch (err) {
        console.error('[seed] Fatal error:', err);

        // Re-throw SvelteKit HttpErrors as-is; wrap everything else in a 500.
        if (err && typeof err === 'object' && 'status' in err && 'body' in err) {
            throw err;
        }
        throw error(500, err instanceof Error ? err.message : 'Failed to seed database');
    }
};