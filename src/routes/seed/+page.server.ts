// src/routes/(admin)/seed/+page.server.ts
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireAdmin } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import { progressBroadcaster } from '$lib/server/progress-broadcaster';

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString('hex')}`;
}

function courseCredits(deptCode: string, level: number): number {
  const stem = ['CSC', 'STA', 'MTH', 'PHY', 'CHM', 'BCH', 'MCB', 'PSB', 'ZEB', 'GLG', 'ABE', 'CVE', 'CHE', 'CPE', 'EEE', 'MCE'];
  if (level === 100) {
    return stem.includes(deptCode) ? [2, 3, 2, 3, 2, 3][Math.floor(Math.random() * 6)] : [1, 2, 1, 2, 1, 2][Math.floor(Math.random() * 6)];
  }
  return [2, 3, 1, 2, 3, 2, 1, 3][Math.floor(Math.random() * 8)];
}

export const load: PageServerLoad = async ({ locals }) => {
  const prisma = await getPrismaClient();

  const userCount = await prisma.user.count();
  if (userCount > 0) requireAdmin(locals.user);

  const [collegeCount, departmentCount, courseCount, examCount, levelCount] = await Promise.all([
    prisma.college.count(),
    prisma.department.count(),
    prisma.course.count(),
    prisma.exam.count(),
    prisma.level.count(),
  ]);

  return {
    counts: { users: userCount, colleges: collegeCount, departments: departmentCount, courses: courseCount, exams: examCount, levels: levelCount },
    isFirstRun: userCount === 0,
  };
};

export const actions: Actions = {
  seed: async ({ locals }) => {
    const prisma = await getPrismaClient();

    const userCount = await prisma.user.count();
    if (userCount > 0) requireAdmin(locals.user);

    try {
      const results: string[] = [];

      // ============================================
      // 1. LEVELS
      // ============================================
      progressBroadcaster.broadcastProgress('levels', 'Creating levels...', '8 levels', '📊');

      const levelData = [
        { level: 100, name: '100 Level', order: 0, isDefault: true },
        { level: 200, name: '200 Level', order: 1, isDefault: true },
        { level: 300, name: '300 Level', order: 2, isDefault: true },
        { level: 400, name: '400 Level', order: 3, isDefault: true },
        { level: 500, name: '500 Level', order: 4, isDefault: true },
        { level: 600, name: '600 Level', order: 5, isDefault: true },
        { level: 700, name: '700 Level', order: 6, isDefault: false },
        { level: 800, name: '800 Level', order: 7, isDefault: false },
      ];

      await prisma.level.createMany({ data: levelData, skipDuplicates: true });
      const levels = await prisma.level.findMany();
      results.push(`✓ ${levels.length} levels`);
      progressBroadcaster.broadcastProgress('levels', 'Levels created', '8 levels', '📊✅');

      const getLevel = (levelNum: number) => {
        const lvl = levels.find(l => l.level === levelNum);
        if (!lvl) throw new Error(`Level not found: ${levelNum}`);
        return lvl;
      };

      // ============================================
      // 1b. ACADEMIC SEMESTERS
      // ============================================
      progressBroadcaster.broadcastProgress('semesters', 'Creating academic semesters...', '2 semesters', '📅');

      await prisma.academicSemester.createMany({
        data: [
          {
            session: '2025/2026', semester: 1,
            label: 'First Semester 2025/2026',
            startDate: new Date('2025-09-01T00:00:00Z'),
            endDate: new Date('2026-01-31T23:59:59Z'),
            isActive: false, regOpen: false,
          },
          {
            session: '2025/2026', semester: 2,
            label: 'Second Semester 2025/2026',
            startDate: new Date('2026-02-01T00:00:00Z'),
            endDate: new Date('2026-07-31T23:59:59Z'),
            isActive: true, regOpen: true,
          },
        ],
        skipDuplicates: true,
      });

      results.push('✓ 2 academic semesters (2025/2026)');
      progressBroadcaster.broadcastProgress('semesters', 'Semesters created', '2025/2026 Sem 1 & 2', '📅✅');

      // ============================================
      // 1c. LEVEL SEMESTER CONFIGS
      // ============================================
      progressBroadcaster.broadcastProgress('Credit Unit', 'Credit units created', '2025/2026 Sem 1 & 2', '📅✅');

      const creditCaps = [
        { levelNum: 100, semester: 1, maxCredits: 20, maxCarryOver: 0, maxBorrowed: 6 },
        { levelNum: 100, semester: 2, maxCredits: 20, maxCarryOver: 0, maxBorrowed: 6 },
        { levelNum: 200, semester: 1, maxCredits: 24, maxCarryOver: 6, maxBorrowed: 6 },
        { levelNum: 200, semester: 2, maxCredits: 24, maxCarryOver: 6, maxBorrowed: 6 },
        { levelNum: 300, semester: 1, maxCredits: 24, maxCarryOver: 6, maxBorrowed: 6 },
        { levelNum: 300, semester: 2, maxCredits: 24, maxCarryOver: 6, maxBorrowed: 6 },
        { levelNum: 400, semester: 1, maxCredits: 24, maxCarryOver: 6, maxBorrowed: 6 },
        { levelNum: 400, semester: 2, maxCredits: 24, maxCarryOver: 6, maxBorrowed: 6 },
        { levelNum: 500, semester: 1, maxCredits: 21, maxCarryOver: 6, maxBorrowed: 6 },
        { levelNum: 500, semester: 2, maxCredits: 21, maxCarryOver: 6, maxBorrowed: 6 },
        { levelNum: 600, semester: 1, maxCredits: 21, maxCarryOver: 6, maxBorrowed: 6 },
        { levelNum: 600, semester: 2, maxCredits: 21, maxCarryOver: 6, maxBorrowed: 6 },
        { levelNum: 700, semester: 1, maxCredits: 18, maxCarryOver: 6, maxBorrowed: 6 },
        { levelNum: 700, semester: 2, maxCredits: 18, maxCarryOver: 6, maxBorrowed: 6 },
        { levelNum: 800, semester: 1, maxCredits: 16, maxCarryOver: 6, maxBorrowed: 6 },
        { levelNum: 800, semester: 2, maxCredits: 16, maxCarryOver: 6, maxBorrowed: 6 },
      ];

      await prisma.levelSemesterConfig.createMany({
        data: creditCaps.map(c => ({
          levelId: getLevel(c.levelNum).id,
          semester: c.semester,
          maxCredits: c.maxCredits,
          maxCarryOver: c.maxCarryOver,
          maxBorrowed: c.maxBorrowed,
        })),
        skipDuplicates: true,
      });
      results.push(`✓ ${creditCaps.length} level/semester credit caps`);

      // ============================================
      // 2. COLLEGES
      // ============================================
      progressBroadcaster.broadcastProgress('colleges', 'Creating colleges...', '12 colleges', '🏛️');

      const collegeData = [
        { name: 'College of Agricultural Economics, Rural Sociology & Extension', code: 'CAERSE', abbreviation: 'CAERSE' },
        { name: 'College of Animal Science & Animal Production', code: 'CASAP', abbreviation: 'CASAP' },
        { name: 'College of Applied Food Science & Tourism', code: 'CAFST', abbreviation: 'CAFST' },
        { name: 'College of Crop & Soil Sciences', code: 'CCSS', abbreviation: 'CCSS' },
        { name: 'College of Education', code: 'COED', abbreviation: 'COED' },
        { name: 'College of Engineering & Engineering Technology', code: 'CEET', abbreviation: 'CEET' },
        { name: 'College of Management Science', code: 'COLMAS', abbreviation: 'COLMAS' },
        { name: 'College of Natural Resources & Environmental Management', code: 'CNREM', abbreviation: 'CNREM' },
        { name: 'College of Natural Science', code: 'COLNAS', abbreviation: 'COLNAS' },
        { name: 'College of Physical & Applied Science', code: 'COLPAS', abbreviation: 'COLPAS' },
        { name: 'College of Veterinary Medicine', code: 'CVM', abbreviation: 'CVM' },
        { name: 'School of General Studies', code: 'SGS', abbreviation: 'SGS' },
      ];

      await prisma.college.createMany({ data: collegeData, skipDuplicates: true });
      const colleges = await prisma.college.findMany();
      results.push(`✓ ${colleges.length} colleges`);
      progressBroadcaster.broadcastProgress('colleges', 'Colleges created', '12 colleges', '🏛️✅');

      const getCollege = (code: string) => {
        const c = colleges.find(c => c.code === code);
        if (!c) throw new Error(`College not found: ${code}`);
        return c;
      };

      // ============================================
      // 3. DEPARTMENTS
      // ============================================
      progressBroadcaster.broadcastProgress('departments', 'Creating departments...', '57 departments', '🏢');

      const deptData = [
        { name: 'Agribusiness and Management', code: 'ABM', collegeCode: 'CAERSE' },
        { name: 'Agricultural Economics', code: 'AEC', collegeCode: 'CAERSE' },
        { name: 'Agricultural Extension and Rural Sociology', code: 'AERS', collegeCode: 'CAERSE' },
        { name: 'Animal Breeding and Physiology', code: 'ABP', collegeCode: 'CASAP' },
        { name: 'Animal Nutrition and Forage Science', code: 'ANF', collegeCode: 'CASAP' },
        { name: 'Animal Production and Livestock Management', code: 'APL', collegeCode: 'CASAP' },
        { name: 'Human Nutrition and Dietetics', code: 'HND', collegeCode: 'CAFST' },
        { name: 'Home Science, Hospitality Management & Tourism', code: 'HHT', collegeCode: 'CAFST' },
        { name: 'Food Science and Technology', code: 'FST', collegeCode: 'CAFST' },
        { name: 'Agronomy', code: 'AGR', collegeCode: 'CCSS' },
        { name: 'Plant Health Management', code: 'PHM', collegeCode: 'CCSS' },
        { name: 'Soil Science and Meteorology', code: 'SSM', collegeCode: 'CCSS' },
        { name: 'Water Resources Management and Agrometeorology', code: 'WRM', collegeCode: 'CCSS' },
        { name: 'Adult and Continuing Education', code: 'ACE', collegeCode: 'COED' },
        { name: 'Agricultural/Home Science Education', code: 'AHE', collegeCode: 'COED' },
        { name: 'Business Education', code: 'BED', collegeCode: 'COED' },
        { name: 'Economics Education', code: 'ECE', collegeCode: 'COED' },
        { name: 'Education Management', code: 'EDM', collegeCode: 'COED' },
        { name: 'Industrial Technology Education', code: 'ITE', collegeCode: 'COED' },
        { name: 'Library and Information Science', code: 'LIS', collegeCode: 'COED' },
        { name: 'Guidance and Counselling', code: 'GCA', collegeCode: 'COED' },
        { name: 'Integrated Science Education', code: 'ISE', collegeCode: 'COED' },
        { name: 'Agricultural and Bioresources Engineering', code: 'ABE', collegeCode: 'CEET' },
        { name: 'Civil Engineering', code: 'CVE', collegeCode: 'CEET' },
        { name: 'Chemical Engineering', code: 'CHE', collegeCode: 'CEET' },
        { name: 'Computer Engineering', code: 'CPE', collegeCode: 'CEET' },
        { name: 'Electrical and Electronics Engineering', code: 'EEE', collegeCode: 'CEET' },
        { name: 'Mechanical Engineering', code: 'MCE', collegeCode: 'CEET' },
        { name: 'Industrial Relations and Personnel Management', code: 'IRP', collegeCode: 'COLMAS' },
        { name: 'Human Resource Management', code: 'HRM', collegeCode: 'COLMAS' },
        { name: 'Business Administration', code: 'BUS', collegeCode: 'COLMAS' },
        { name: 'Accounting', code: 'ACC', collegeCode: 'COLMAS' },
        { name: 'Entrepreneurial Studies', code: 'ENT', collegeCode: 'COLMAS' },
        { name: 'Environment Management and Toxicology', code: 'EMT', collegeCode: 'CNREM' },
        { name: 'Fisheries and Aquatic Resources Management', code: 'FAR', collegeCode: 'CNREM' },
        { name: 'Forestry and Environmental Management', code: 'FEM', collegeCode: 'CNREM' },
        { name: 'Biochemistry', code: 'BCH', collegeCode: 'COLNAS' },
        { name: 'Microbiology', code: 'MCB', collegeCode: 'COLNAS' },
        { name: 'Plant Science and Biotechnology', code: 'PSB', collegeCode: 'COLNAS' },
        { name: 'Zoology and Environmental Biology', code: 'ZEB', collegeCode: 'COLNAS' },
        { name: 'Chemistry', code: 'CHM', collegeCode: 'COLPAS' },
        { name: 'Computer Science', code: 'CSC', collegeCode: 'COLPAS' },
        { name: 'Geology', code: 'GLG', collegeCode: 'COLPAS' },
        { name: 'Mathematics', code: 'MTH', collegeCode: 'COLPAS' },
        { name: 'Physics', code: 'PHY', collegeCode: 'COLPAS' },
        { name: 'Statistics', code: 'STA', collegeCode: 'COLPAS' },
        { name: 'Theriogenology', code: 'THR', collegeCode: 'CVM' },
        { name: 'Veterinary Anatomy', code: 'VAM', collegeCode: 'CVM' },
        { name: 'Veterinary Medicine', code: 'VET', collegeCode: 'CVM' },
        { name: 'Veterinary Microbiology', code: 'VMB', collegeCode: 'CVM' },
        { name: 'Veterinary Public Health and Preventive Medicine', code: 'VPH', collegeCode: 'CVM' },
        { name: 'Veterinary Surgery and Radiology', code: 'VSR', collegeCode: 'CVM' },
        { name: 'English', code: 'ENG', collegeCode: 'SGS' },
        { name: 'French', code: 'FRN', collegeCode: 'SGS' },
        { name: 'German', code: 'GER', collegeCode: 'SGS' },
        { name: 'History', code: 'HIS', collegeCode: 'SGS' },
        { name: 'Social Science', code: 'SOC', collegeCode: 'SGS' },
        { name: 'Physical and Health Education', code: 'PHE', collegeCode: 'SGS' },
        { name: 'Philosophy', code: 'PHL', collegeCode: 'SGS' },
        { name: 'Peace and Conflict Studies', code: 'PCS', collegeCode: 'SGS' },
      ];

      await prisma.department.createMany({
        data: deptData.map(d => ({ name: d.name, code: d.code, collegeId: getCollege(d.collegeCode).id })),
        skipDuplicates: true,
      });
      const departments = await prisma.department.findMany();
      results.push(`✓ ${departments.length} departments`);
      progressBroadcaster.broadcastProgress('departments', 'Departments created', '57 departments', '🏢✅');

      const getDept = (code: string) => {
        const d = departments.find(d => d.code === code);
        if (!d) throw new Error(`Department not found: ${code}`);
        return d;
      };

      // ============================================
      // 4. PASSWORDS
      // ============================================
      const [adminPass, lecturerPass, invigilatorPass, studentPass, hodPass, deanPass, examOfficerPass, vcDvcPass] = await Promise.all([
        hashPassword('admin123'),
        hashPassword('lecturer123'),
        hashPassword('invigilator123'),
        hashPassword('student123'),
        hashPassword('hod123'),
        hashPassword('dean123'),
        hashPassword('examofficer123'),
        hashPassword('vcdvc123'),
      ]);

      // ============================================
      // 5. USERS
      // ============================================
      progressBroadcaster.broadcastProgress('users', 'Creating user accounts...', 'All roles', '👥');

      const allUsersToCreate: any[] = [];

      // ── Admins ──────────────────────────────────────────────────────────────
      const adminData = [
        { email: 'admin@mouau.edu.ng',       fullName: 'Admin One',               staffId: 'SU310449' },
        { email: 'admin2@mouau.edu.ng',      fullName: 'Admin Two',               staffId: 'ADM002' },
        { email: 'admin3@mouau.edu.ng',      fullName: 'Admin Three',             staffId: 'ADM003' },
        { email: 'admin_ogwo@mouau.edu.ng',  fullName: 'Ogwo Godspower Chinaza',  staffId: 'ADM310449' },
      ];
      adminData.forEach(a => allUsersToCreate.push({ email: a.email, fullName: a.fullName, passwordHash: adminPass, role: 'admin', staffId: a.staffId, session: '2025/2026' }));

      // ── HODs ────────────────────────────────────────────────────────────────
      // Each HOD is assigned to their department; some also lecture (tracked via UserRoleAssignment)
      const hodData = [
        { email: 'hod.csc@mouau.edu.ng',     fullName: 'Prof. Amara Obi (HOD CSC)',    staffId: 'HOD001', deptCode: 'CSC',    alsoLectures: true },
        { email: 'hod.mth@mouau.edu.ng',     fullName: 'Prof. Emeka Nwosu (HOD MTH)',  staffId: 'HOD002', deptCode: 'MTH',    alsoLectures: true },
        { email: 'hod.phy@mouau.edu.ng',     fullName: 'Prof. Ngozi Eze (HOD PHY)',    staffId: 'HOD003', deptCode: 'PHY',    alsoLectures: true },
        { email: 'hod.chm@mouau.edu.ng',     fullName: 'Dr. Kelechi Ofor (HOD CHM)',   staffId: 'HOD004', deptCode: 'CHM',    alsoLectures: false },
        { email: 'hod.eee@mouau.edu.ng',     fullName: 'Prof. Basil Ani (HOD EEE)',    staffId: 'HOD005', deptCode: 'EEE',    alsoLectures: true },
        { email: 'hod.hrm@mouau.edu.ng',     fullName: 'Dr. Adaeze Okon (HOD HRM)',    staffId: 'HOD006', deptCode: 'HRM',    alsoLectures: false },
        { email: 'hod.bcch@mouau.edu.ng',    fullName: 'Dr. Chidi Agu (HOD BCH)',      staffId: 'HOD007', deptCode: 'BCH',    alsoLectures: true },
        { email: 'hod.mcb@mouau.edu.ng',     fullName: 'Prof. Stella Nwachukwu (HOD MCB)', staffId: 'HOD008', deptCode: 'MCB', alsoLectures: false },
        { email: 'hod_ogwo@mouau.edu.ng',    fullName: 'Ogwo Godspower Chinaza (HOD)', staffId: 'HOD310449', deptCode: 'CSC', alsoLectures: true },
      ];
      hodData.forEach(h => {
        const dept = getDept(h.deptCode);
        allUsersToCreate.push({ email: h.email, fullName: h.fullName, passwordHash: hodPass, role: 'hod', staffId: h.staffId, collegeId: dept.collegeId, departmentId: dept.id, session: '2025/2026' });
      });

      // ── Deans ───────────────────────────────────────────────────────────────
      const deanData = [
        { email: 'dean.colpas@mouau.edu.ng',  fullName: 'Prof. Victor Okeke (Dean COLPAS)',  staffId: 'DEN001', collegeCode: 'COLPAS' },
        { email: 'dean.ceet@mouau.edu.ng',    fullName: 'Prof. James Eze (Dean CEET)',        staffId: 'DEN002', collegeCode: 'CEET' },
        { email: 'dean.colmas@mouau.edu.ng',  fullName: 'Prof. Rose Nwosu (Dean COLMAS)',    staffId: 'DEN003', collegeCode: 'COLMAS' },
        { email: 'dean.colnas@mouau.edu.ng',  fullName: 'Prof. Samuel Obi (Dean COLNAS)',    staffId: 'DEN004', collegeCode: 'COLNAS' },
        { email: 'dean.cvm@mouau.edu.ng',     fullName: 'Prof. Patricia Eke (Dean CVM)',     staffId: 'DEN005', collegeCode: 'CVM' },
        { email: 'dean_ogwo@mouau.edu.ng',    fullName: 'Ogwo Godspower Chinaza (Dean)',     staffId: 'DEN310449', collegeCode: 'COLPAS' },
      ];
      deanData.forEach(d => {
        const college = getCollege(d.collegeCode);
        allUsersToCreate.push({ email: d.email, fullName: d.fullName, passwordHash: deanPass, role: 'dean', staffId: d.staffId, collegeId: college.id, session: '2025/2026' });
      });

      // ── Exam Officers ────────────────────────────────────────────────────────
      const examOfficerData = [
        { email: 'examofficer1@mouau.edu.ng',   fullName: 'Mr. Chukwuemeka Obi',        staffId: 'EXO001' },
        { email: 'examofficer2@mouau.edu.ng',   fullName: 'Mrs. Ngozi Nnaji',            staffId: 'EXO002' },
        { email: 'examofficer_ogwo@mouau.edu.ng', fullName: 'Ogwo Godspower Chinaza (EO)', staffId: 'EXO310449' },
      ];
      examOfficerData.forEach(e => allUsersToCreate.push({ email: e.email, fullName: e.fullName, passwordHash: examOfficerPass, role: 'exam_officer', staffId: e.staffId, session: '2025/2026' }));

      // ── VC / DVC ─────────────────────────────────────────────────────────────
      const vcDvcData = [
        { email: 'vc@mouau.edu.ng',      fullName: 'Prof. Ikechukwu Nwachukwu (VC)',   staffId: 'VC001' },
        { email: 'dvc@mouau.edu.ng',     fullName: 'Prof. Adaora Okonkwo (DVC)',        staffId: 'DVC001' },
        { email: 'vcdvc_ogwo@mouau.edu.ng', fullName: 'Ogwo Godspower Chinaza (VC)',   staffId: 'VC310449' },
      ];
      vcDvcData.forEach(v => allUsersToCreate.push({ email: v.email, fullName: v.fullName, passwordHash: vcDvcPass, role: 'vc_dvc', staffId: v.staffId, session: '2025/2026' }));

      // ── Lecturers ────────────────────────────────────────────────────────────
      const lecturerData = [
        { email: 'dr.okafor@mouau.edu.ng',       fullName: 'Dr. Emeka Okafor',         staffId: 'LCT001', deptCode: 'CSC' },
        { email: 'prof.nwosu@mouau.edu.ng',      fullName: 'Prof. Adaeze Nwosu',        staffId: 'LCT002', deptCode: 'MTH' },
        { email: 'dr.uche@mouau.edu.ng',         fullName: 'Dr. Uche Anyanwu',          staffId: 'LCT003', deptCode: 'STA' },
        { email: 'dr.okoro@mouau.edu.ng',        fullName: 'Dr. Chika Okoro',           staffId: 'LCT004', deptCode: 'PHY' },
        { email: 'prof.obiora@mouau.edu.ng',     fullName: 'Prof. Obiora Kalu',         staffId: 'LCT005', deptCode: 'CHM' },
        { email: 'dr.agbo@mouau.edu.ng',         fullName: 'Dr. Ifenna Agbo',           staffId: 'LCT006', deptCode: 'GLG' },
        { email: 'lec_ogwo@mouau.edu.ng',        fullName: 'Ogwo Godspower Chinaza',    staffId: 'PHY310449', deptCode: 'PHY' },
        { email: 'dr.adekunle@mouau.edu.ng',     fullName: 'Dr. Adekunle Williams',     staffId: 'LCT007', deptCode: 'EEE' },
        { email: 'prof.obi@mouau.edu.ng',        fullName: 'Prof. Eze Obi',             staffId: 'LCT008', deptCode: 'CVE' },
        { email: 'dr.nwafor@mouau.edu.ng',       fullName: 'Dr. Kelechi Nwafor',        staffId: 'LCT009', deptCode: 'MCE' },
        { email: 'dr.onuoha@mouau.edu.ng',       fullName: 'Dr. Sylvester Onuoha',      staffId: 'LCT010', deptCode: 'CHE' },
        { email: 'dr.ikenna@mouau.edu.ng',       fullName: 'Dr. Ikenna Ozoemena',       staffId: 'LCT011', deptCode: 'CPE' },
        { email: 'prof.ani@mouau.edu.ng',        fullName: 'Prof. Basil Ani',           staffId: 'LCT012', deptCode: 'ABE' },
        { email: 'prof.ekwueme@mouau.edu.ng',    fullName: 'Prof. Ngozi Ekwueme',       staffId: 'LCT013', deptCode: 'HRM' },
        { email: 'dr.onyekachi@mouau.edu.ng',    fullName: 'Dr. Onyekachi Mbah',        staffId: 'LCT014', deptCode: 'ACC' },
        { email: 'dr.okonkwo@mouau.edu.ng',      fullName: 'Dr. Amaka Okonkwo',         staffId: 'LCT015', deptCode: 'BUS' },
        { email: 'dr.nweze@mouau.edu.ng',        fullName: 'Dr. Fabian Nweze',          staffId: 'LCT016', deptCode: 'IRP' },
        { email: 'dr.chukwudi@mouau.edu.ng',     fullName: 'Dr. Chukwudi Okeke',        staffId: 'LCT017', deptCode: 'ENT' },
        { email: 'dr.ibrahim@mouau.edu.ng',      fullName: 'Dr. Musa Ibrahim',          staffId: 'LCT018', deptCode: 'BCH' },
        { email: 'dr.eze@mouau.edu.ng',          fullName: 'Dr. Ogechukwu Eze',         staffId: 'LCT019', deptCode: 'MCB' },
        { email: 'dr.ugwu@mouau.edu.ng',         fullName: 'Dr. Chibuike Ugwu',         staffId: 'LCT020', deptCode: 'ZEB' },
        { email: 'dr.odum@mouau.edu.ng',         fullName: 'Dr. Stella Odum',           staffId: 'LCT021', deptCode: 'PSB' },
        { email: 'prof.amadi@mouau.edu.ng',      fullName: 'Prof. Chidinma Amadi',      staffId: 'LCT022', deptCode: 'FST' },
        { email: 'dr.okafor2@mouau.edu.ng',      fullName: 'Dr. Ngozi Okafor',          staffId: 'LCT023', deptCode: 'HND' },
        { email: 'dr.agu@mouau.edu.ng',          fullName: 'Dr. Chinwe Agu',            staffId: 'LCT024', deptCode: 'HHT' },
        { email: 'prof.onwumere@mouau.edu.ng',   fullName: 'Prof. Joseph Onwumere',     staffId: 'LCT025', deptCode: 'AEC' },
        { email: 'dr.nwachukwu@mouau.edu.ng',    fullName: 'Dr. Uchenna Nwachukwu',    staffId: 'LCT026', deptCode: 'ABM' },
        { email: 'dr.nwankwo@mouau.edu.ng',      fullName: 'Dr. Victor Nwankwo',        staffId: 'LCT027', deptCode: 'AERS' },
        { email: 'prof.nwachukwu2@mouau.edu.ng', fullName: 'Prof. Gerald Nwachukwu',   staffId: 'LCT028', deptCode: 'ABP' },
        { email: 'dr.ofor@mouau.edu.ng',         fullName: 'Dr. Patricia Ofor',         staffId: 'LCT029', deptCode: 'ANF' },
        { email: 'dr.egbe@mouau.edu.ng',         fullName: 'Dr. Emmanuel Egbe',         staffId: 'LCT030', deptCode: 'APL' },
        { email: 'prof.obiefune@mouau.edu.ng',   fullName: 'Prof. Isaac Obiefune',      staffId: 'LCT031', deptCode: 'AGR' },
        { email: 'dr.onwudiwe@mouau.edu.ng',     fullName: 'Dr. Chinyere Onwudiwe',    staffId: 'LCT032', deptCode: 'PHM' },
        { email: 'dr.okeke@mouau.edu.ng',        fullName: 'Dr. Michael Okeke',         staffId: 'LCT033', deptCode: 'SSM' },
        { email: 'dr.ibekwe@mouau.edu.ng',       fullName: 'Dr. Emmanuel Ibekwe',       staffId: 'LCT034', deptCode: 'WRM' },
        { email: 'prof.nwosu2@mouau.edu.ng',     fullName: 'Prof. Rose Nwosu',          staffId: 'LCT035', deptCode: 'ACE' },
        { email: 'dr.ugochukwu@mouau.edu.ng',    fullName: 'Dr. Ugo Ugochukwu',         staffId: 'LCT036', deptCode: 'LIS' },
        { email: 'dr.obasi@mouau.edu.ng',        fullName: 'Dr. Ngozi Obasi',           staffId: 'LCT037', deptCode: 'GCA' },
        { email: 'dr.dibia@mouau.edu.ng',        fullName: 'Dr. Ikechukwu Dibia',       staffId: 'LCT038', deptCode: 'ISE' },
        { email: 'prof.okeke2@mouau.edu.ng',     fullName: 'Prof. Vincent Okeke',       staffId: 'LCT039', deptCode: 'EMT' },
        { email: 'dr.ezeji@mouau.edu.ng',        fullName: 'Dr. Chinyelu Ezeji',        staffId: 'LCT040', deptCode: 'FAR' },
        { email: 'dr.nwite@mouau.edu.ng',        fullName: 'Dr. John Nwite',            staffId: 'LCT041', deptCode: 'FEM' },
        { email: 'prof.cvm@mouau.edu.ng',        fullName: 'Prof. Samuel Onyekachi',    staffId: 'LCT042', deptCode: 'VET' },
        { email: 'dr.okoye@mouau.edu.ng',        fullName: 'Dr. Anthony Okoye',         staffId: 'LCT043', deptCode: 'VAM' },
        { email: 'dr.ohiri@mouau.edu.ng',        fullName: 'Dr. Ifeanyi Ohiri',         staffId: 'LCT044', deptCode: 'VMB' },
        { email: 'dr.nzeka@mouau.edu.ng',        fullName: 'Dr. Nnamdi Nzeka',          staffId: 'LCT045', deptCode: 'ENG' },
        { email: 'dr.fourier@mouau.edu.ng',      fullName: 'Dr. Jean Fourier',          staffId: 'LCT046', deptCode: 'FRN' },
        { email: 'dr.braun@mouau.edu.ng',        fullName: 'Dr. Klaus Braun',           staffId: 'LCT047', deptCode: 'GER' },
        { email: 'dr.okoro2@mouau.edu.ng',       fullName: 'Dr. Emmanuel Okoro',        staffId: 'LCT048', deptCode: 'HIS' },
        { email: 'dr.osuji@mouau.edu.ng',        fullName: 'Dr. Pamela Osuji',          staffId: 'LCT049', deptCode: 'PHL' },
      ];
      lecturerData.forEach(l => {
        const dept = getDept(l.deptCode);
        allUsersToCreate.push({ email: l.email, fullName: l.fullName, passwordHash: lecturerPass, role: 'lecturer', staffId: l.staffId, collegeId: dept.collegeId, departmentId: dept.id, session: '2025/2026' });
      });

      // ── Invigilators ─────────────────────────────────────────────────────────
      const invigilatorData = [
        { email: 'invig1@mouau.edu.ng',       fullName: 'Mr. Chidi Eze',              staffId: 'INV001', deptCode: 'CSC' },
        { email: 'invig2@mouau.edu.ng',       fullName: 'Mrs. Ngozi Obi',             staffId: 'INV002', deptCode: 'EEE' },
        { email: 'invig3@mouau.edu.ng',       fullName: 'Mr. Emeka Nwachukwu',        staffId: 'INV003', deptCode: 'MCB' },
        { email: 'invig4@mouau.edu.ng',       fullName: 'Mrs. Funke Adeniyi',         staffId: 'INV004', deptCode: 'HRM' },
        { email: 'invig5@mouau.edu.ng',       fullName: 'Mr. John Doe',               staffId: 'INV005', deptCode: 'CSC' },
        { email: 'invig6@mouau.edu.ng',       fullName: 'Mrs. Jane Smith',            staffId: 'INV006', deptCode: 'EEE' },
        { email: 'invig7@mouau.edu.ng',       fullName: 'Mr. David Johnson',          staffId: 'INV007', deptCode: 'PHY' },
        { email: 'invig8@mouau.edu.ng',       fullName: 'Mrs. Adaora Nnaji',          staffId: 'INV008', deptCode: 'FST' },
        { email: 'invig9@mouau.edu.ng',       fullName: 'Mr. Obinna Eze',             staffId: 'INV009', deptCode: 'ACC' },
        { email: 'invig10@mouau.edu.ng',      fullName: 'Ms. Amaka Ude',              staffId: 'INV010', deptCode: 'VET' },
        { email: 'invig_ogwo@mouau.edu.ng',   fullName: 'Ogwo Godspower Chinaza',     staffId: 'INV310449', deptCode: 'PHY' },
      ];
      invigilatorData.forEach(i => {
        const dept = getDept(i.deptCode);
        allUsersToCreate.push({ email: i.email, fullName: i.fullName, passwordHash: invigilatorPass, role: 'invigilator', staffId: i.staffId, collegeId: dept.collegeId, departmentId: dept.id, session: '2025/2026' });
      });

      // ── Students (unchanged from original) ───────────────────────────────────
      const studentData = [
        { email: 'ade.adeleke12@student.mouau.edu.ng', fullName: 'Ade Adeleke', deptCode: 'PHY', matric: 'MOUAU/PHY/25/123456', levelNum: 100, session: '2025/2026' },
        { email: 'bimbo.oshodi34@student.mouau.edu.ng', fullName: 'Bimbo Oshodi', deptCode: 'PHY', matric: 'MOUAU/PHY/25/234567', levelNum: 100, session: '2025/2026' },
        { email: 'chuka.obi56@student.mouau.edu.ng', fullName: 'Chuka Obi', deptCode: 'PHY', matric: 'MOUAU/PHY/25/345678', levelNum: 100, session: '2025/2026' },
        { email: 'damola.ayeni78@student.mouau.edu.ng', fullName: 'Damola Ayeni', deptCode: 'PHY', matric: 'MOUAU/PHY/25/456789', levelNum: 100, session: '2025/2026' },
        { email: 'ebuka.nweke90@student.mouau.edu.ng', fullName: 'Ebuka Nweke', deptCode: 'PHY', matric: 'MOUAU/PHY/25/567890', levelNum: 100, session: '2025/2026' },
        { email: 'funmi.ade12@student.mouau.edu.ng', fullName: 'Funmi Ade', deptCode: 'PHY', matric: 'MOUAU/PHY/25/678901', levelNum: 100, session: '2025/2026' },
        { email: 'goke.ibrahim34@student.mouau.edu.ng', fullName: 'Goke Ibrahim', deptCode: 'PHY', matric: 'MOUAU/PHY/25/789012', levelNum: 100, session: '2025/2026' },
        { email: 'hauwa.musa56@student.mouau.edu.ng', fullName: 'Hauwa Musa', deptCode: 'PHY', matric: 'MOUAU/PHY/25/890123', levelNum: 100, session: '2025/2026' },
        { email: 'ifeanyi.okpara78@student.mouau.edu.ng', fullName: 'Ifeanyi Okpara', deptCode: 'PHY', matric: 'MOUAU/PHY/25/901234', levelNum: 100, session: '2025/2026' },
        { email: 'jide.akinyemi90@student.mouau.edu.ng', fullName: 'Jide Akinyemi', deptCode: 'PHY', matric: 'MOUAU/PHY/25/012345', levelNum: 100, session: '2025/2026' },
        { email: 'kemi.adeola11@student.mouau.edu.ng', fullName: 'Kemi Adeola', deptCode: 'PHY', matric: 'MOUAU/PHY/25/112233', levelNum: 100, session: '2025/2026' },
        { email: 'ladi.balogun22@student.mouau.edu.ng', fullName: 'Ladi Balogun', deptCode: 'PHY', matric: 'MOUAU/PHY/25/223344', levelNum: 100, session: '2025/2026' },
        { email: 'ogwo_phy@mouau.edu.ng', fullName: 'Ogwo Godspower Chinaza', deptCode: 'PHY', matric: 'MOUAU/PHY/25/128468', levelNum: 100, session: '2025/2026' },
        { email: 'chinedu.eke33@student.mouau.edu.ng', fullName: 'Chinedu Eke', deptCode: 'CSC', matric: 'MOUAU/CSC/25/334455', levelNum: 100, session: '2025/2026' },
        { email: 'damilola.adebayo44@student.mouau.edu.ng', fullName: 'Damilola Adebayo', deptCode: 'CSC', matric: 'MOUAU/CSC/25/445566', levelNum: 100, session: '2025/2026' },
        { email: 'emeka.ogu55@student.mouau.edu.ng', fullName: 'Emeka Ogu', deptCode: 'CSC', matric: 'MOUAU/CSC/25/556677', levelNum: 100, session: '2025/2026' },
        { email: 'femi.akin66@student.mouau.edu.ng', fullName: 'Femi Akin', deptCode: 'CSC', matric: 'MOUAU/CSC/25/667788', levelNum: 100, session: '2025/2026' },
        { email: 'gloria.umoh77@student.mouau.edu.ng', fullName: 'Gloria Umoh', deptCode: 'CSC', matric: 'MOUAU/CSC/25/778899', levelNum: 100, session: '2025/2026' },
        { email: 'haruna.bello88@student.mouau.edu.ng', fullName: 'Haruna Bello', deptCode: 'CSC', matric: 'MOUAU/CSC/25/889900', levelNum: 100, session: '2025/2026' },
        { email: 'idris.yusuf99@student.mouau.edu.ng', fullName: 'Idris Yusuf', deptCode: 'CSC', matric: 'MOUAU/CSC/25/990011', levelNum: 100, session: '2025/2026' },
        { email: 'joy.onyeka01@student.mouau.edu.ng', fullName: 'Joy Onyeka', deptCode: 'CSC', matric: 'MOUAU/CSC/25/101112', levelNum: 100, session: '2025/2026' },
        { email: 'kayode.oguns02@student.mouau.edu.ng', fullName: 'Kayode Oguns', deptCode: 'CSC', matric: 'MOUAU/CSC/25/111213', levelNum: 100, session: '2025/2026' },
        { email: 'lola.oyedeji03@student.mouau.edu.ng', fullName: 'Lola Oyedeji', deptCode: 'CSC', matric: 'MOUAU/CSC/25/121314', levelNum: 100, session: '2025/2026' },
        { email: 'maureen.ekwu04@student.mouau.edu.ng', fullName: 'Maureen Ekwu', deptCode: 'CSC', matric: 'MOUAU/CSC/25/131415', levelNum: 100, session: '2025/2026' },
        { email: '8digitskomputers@gmail.com', fullName: 'Prince Odinakachi', deptCode: 'CSC', matric: 'MOUAU/CMP/25/130844', levelNum: 100, session: '2025/2026' },
        { email: 'chinemeremhumphery@gmail.com', fullName: 'Humphrey Confidence Chinemerem', deptCode: 'CSC', matric: 'MOUAU/CMP/25/130845', levelNum: 100, session: '2025/2026' },
        { email: 'ogwo_csc@mouau.edu.ng', fullName: 'Ogwo Godspower Chinaza', deptCode: 'CSC', matric: 'MOUAU/PHY/25/128469', levelNum: 100, session: '2025/2026' },
        { email: 'nnamdi.agu05@student.mouau.edu.ng', fullName: 'Nnamdi Agu', deptCode: 'CHM', matric: 'MOUAU/CHM/25/141516', levelNum: 100, session: '2025/2026' },
        { email: 'obinna.obi06@student.mouau.edu.ng', fullName: 'Obinna Obi', deptCode: 'MTH', matric: 'MOUAU/MTH/25/151617', levelNum: 100, session: '2025/2026' },
        { email: 'patience.aka07@student.mouau.edu.ng', fullName: 'Patience Aka', deptCode: 'STA', matric: 'MOUAU/STA/25/161718', levelNum: 100, session: '2025/2026' },
        { email: 'queen.etuk08@student.mouau.edu.ng', fullName: 'Queen Etuk', deptCode: 'GLG', matric: 'MOUAU/GLG/25/171819', levelNum: 100, session: '2025/2026' },
        { email: 'ogwo_sta@mouau.edu.ng', fullName: 'Ogwo Godspower Chinaza', deptCode: 'STA', matric: 'MOUAU/PHY/25/128470', levelNum: 100, session: '2025/2026' },
        { email: 'ogwo_glg@mouau.edu.ng', fullName: 'Ogwo Godspower Chinaza', deptCode: 'GLG', matric: 'MOUAU/PHY/25/128471', levelNum: 100, session: '2025/2026' },
        { email: 'ogwo_chm@mouau.edu.ng', fullName: 'Ogwo Godspower Chinaza', deptCode: 'CHM', matric: 'MOUAU/PHY/25/128472', levelNum: 100, session: '2025/2026' },
        { email: 'ogwo_mth@mouau.edu.ng', fullName: 'Ogwo Godspower Chinaza', deptCode: 'MTH', matric: 'MOUAU/PHY/25/128473', levelNum: 100, session: '2025/2026' },
        { email: 'alice.obi@student.mouau.edu.ng', fullName: 'Alice Obi', deptCode: 'CSC', matric: '2021/CSC/001', levelNum: 300, session: '2025/2026' },
        { email: 'bob.nwachukwu@student.mouau.edu.ng', fullName: 'Bob Nwachukwu', deptCode: 'CSC', matric: '2021/CSC/002', levelNum: 300, session: '2025/2026' },
        { email: 'chidi.okeke@student.mouau.edu.ng', fullName: 'Chidi Okeke', deptCode: 'CSC', matric: '2021/CSC/003', levelNum: 300, session: '2025/2026' },
        { email: 'emeka.agu@student.mouau.edu.ng', fullName: 'Emeka Agu', deptCode: 'CSC', matric: '2022/CSC/001', levelNum: 200, session: '2025/2026' },
        { email: 'funke.adeyemi@student.mouau.edu.ng', fullName: 'Funke Adeyemi', deptCode: 'CSC', matric: '2022/CSC/002', levelNum: 200, session: '2025/2026' },
        { email: 'grace.uko@student.mouau.edu.ng', fullName: 'Grace Uko', deptCode: 'CSC', matric: '2020/CSC/001', levelNum: 400, session: '2025/2026' },
        { email: 'ifeoma.ogu@student.mouau.edu.ng', fullName: 'Ifeoma Ogu', deptCode: 'CSC', matric: '2023/CSC/001', levelNum: 100, session: '2025/2026' },
        { email: 'dalu.eze@student.mouau.edu.ng', fullName: 'Dalu Eze', deptCode: 'CSC', matric: '2021/CSC/004', levelNum: 300, session: '2024/2025' },
        { email: 'henry.dim@student.mouau.edu.ng', fullName: 'Henry Dim', deptCode: 'CSC', matric: '2020/CSC/002', levelNum: 400, session: '2024/2025' },
        { email: 'james.oti@student.mouau.edu.ng', fullName: 'James Oti', deptCode: 'CSC', matric: '2023/CSC/002', levelNum: 100, session: '2024/2025' },
        { email: 'ada.mba@student.mouau.edu.ng', fullName: 'Ada Mba', deptCode: 'MTH', matric: '2021/MTH/005', levelNum: 300, session: '2025/2026' },
        { email: 'chioma.igwe@student.mouau.edu.ng', fullName: 'Chioma Igwe', deptCode: 'MTH', matric: '2022/MTH/003', levelNum: 200, session: '2025/2026' },
        { email: 'esther.nwosu@student.mouau.edu.ng', fullName: 'Esther Nwosu', deptCode: 'MTH', matric: '2020/MTH/003', levelNum: 400, session: '2025/2026' },
        { email: 'faith.ogbonna@student.mouau.edu.ng', fullName: 'Faith Ogbonna', deptCode: 'STA', matric: '2022/STA/001', levelNum: 200, session: '2025/2026' },
        { email: 'godwin.nkem@student.mouau.edu.ng', fullName: 'Godwin Nkem', deptCode: 'STA', matric: '2021/STA/001', levelNum: 300, session: '2025/2026' },
        { email: 'isaac.udoh@student.mouau.edu.ng', fullName: 'Isaac Udoh', deptCode: 'PHY', matric: '2021/PHY/007', levelNum: 300, session: '2025/2026' },
        { email: 'joy.akan@student.mouau.edu.ng', fullName: 'Joy Akan', deptCode: 'PHY', matric: '2022/PHY/005', levelNum: 200, session: '2025/2026' },
        { email: 'kelechi.ofor@student.mouau.edu.ng', fullName: 'Kelechi Ofor', deptCode: 'CHM', matric: '2022/CHM/001', levelNum: 200, session: '2025/2026' },
        { email: 'linda.ani@student.mouau.edu.ng', fullName: 'Linda Ani', deptCode: 'CHM', matric: '2021/CHM/002', levelNum: 300, session: '2025/2026' },
        { email: 'michael.abu@student.mouau.edu.ng', fullName: 'Michael Abu', deptCode: 'GLG', matric: '2021/GLG/001', levelNum: 300, session: '2025/2026' },
        { email: 'peter.okpara@student.mouau.edu.ng', fullName: 'Peter Okpara', deptCode: 'EEE', matric: '2021/EEE/009', levelNum: 300, session: '2025/2026' },
        { email: 'samuel.udo@student.mouau.edu.ng', fullName: 'Samuel Udo', deptCode: 'EEE', matric: '2020/EEE/006', levelNum: 400, session: '2025/2026' },
        { email: 'nnamdi.obi@student.mouau.edu.ng', fullName: 'Nnamdi Obi', deptCode: 'CPE', matric: '2021/CPE/001', levelNum: 300, session: '2025/2026' },
        { email: 'obiageli.ezea@student.mouau.edu.ng', fullName: 'Obiageli Ezea', deptCode: 'CVE', matric: '2022/CVE/001', levelNum: 200, session: '2025/2026' },
        { email: 'paul.okonkwo@student.mouau.edu.ng', fullName: 'Paul Okonkwo', deptCode: 'MCE', matric: '2021/MCE/001', levelNum: 300, session: '2025/2026' },
        { email: 'xavier.otu@student.mouau.edu.ng', fullName: 'Xavier Otu', deptCode: 'HRM', matric: '2021/HRM/011', levelNum: 300, session: '2025/2026' },
        { email: 'zainab.bello@student.mouau.edu.ng', fullName: 'Zainab Bello', deptCode: 'HRM', matric: '2020/HRM/007', levelNum: 400, session: '2025/2026' },
        { email: 'amara.nwosu@student.mouau.edu.ng', fullName: 'Amara Nwosu', deptCode: 'ACC', matric: '2022/ACC/001', levelNum: 200, session: '2025/2026' },
        { email: 'basil.ochu@student.mouau.edu.ng', fullName: 'Basil Ochu', deptCode: 'ACC', matric: '2021/ACC/002', levelNum: 300, session: '2025/2026' },
        { email: 'chidera.nweke@student.mouau.edu.ng', fullName: 'Chidera Nweke', deptCode: 'BUS', matric: '2022/BUS/001', levelNum: 200, session: '2025/2026' },
        { email: 'blessing.okon@student.mouau.edu.ng', fullName: 'Blessing Okon', deptCode: 'BCH', matric: '2022/BCH/010', levelNum: 200, session: '2025/2026' },
        { email: 'charles.ekpo@student.mouau.edu.ng', fullName: 'Charles Ekpo', deptCode: 'BCH', matric: '2021/BCH/012', levelNum: 300, session: '2025/2026' },
        { email: 'doris.onyia@student.mouau.edu.ng', fullName: 'Doris Onyia', deptCode: 'MCB', matric: '2022/MCB/001', levelNum: 200, session: '2025/2026' },
        { email: 'elvis.nwagba@student.mouau.edu.ng', fullName: 'Elvis Nwagba', deptCode: 'ZEB', matric: '2021/ZEB/001', levelNum: 300, session: '2025/2026' },
        { email: 'edwin.chukwu@student.mouau.edu.ng', fullName: 'Edwin Chukwu', deptCode: 'FST', matric: '2022/FST/011', levelNum: 200, session: '2025/2026' },
        { email: 'florence.obi@student.mouau.edu.ng', fullName: 'Florence Obi', deptCode: 'FST', matric: '2020/FST/008', levelNum: 400, session: '2025/2026' },
        { email: 'gifty.asare@student.mouau.edu.ng', fullName: 'Gifty Asare', deptCode: 'HND', matric: '2022/HND/001', levelNum: 200, session: '2025/2026' },
        { email: 'helen.uzochukwu@student.mouau.edu.ng', fullName: 'Helen Uzochukwu', deptCode: 'AGR', matric: '2022/AGR/012', levelNum: 200, session: '2025/2026' },
        { email: 'ifeanyi.nwankwo@student.mouau.edu.ng', fullName: 'Ifeanyi Nwankwo', deptCode: 'AGR', matric: '2021/AGR/014', levelNum: 300, session: '2025/2026' },
        { email: 'james.ugwu@student.mouau.edu.ng', fullName: 'James Ugwu', deptCode: 'SSM', matric: '2022/SSM/001', levelNum: 200, session: '2025/2026' },
        { email: 'kalu.ibe@student.mouau.edu.ng', fullName: 'Kalu Ibe', deptCode: 'AEC', matric: '2022/AEC/001', levelNum: 200, session: '2025/2026' },
        { email: 'loveth.uche@student.mouau.edu.ng', fullName: 'Loveth Uche', deptCode: 'APL', matric: '2022/APL/001', levelNum: 200, session: '2025/2026' },
        { email: 'mark.ibeh@student.mouau.edu.ng', fullName: 'Mark Ibeh', deptCode: 'FAR', matric: '2021/FAR/001', levelNum: 300, session: '2025/2026' },
        { email: 'kenneth.abara@student.mouau.edu.ng', fullName: 'Kenneth Abara', deptCode: 'VET', matric: '2021/VET/015', levelNum: 300, session: '2025/2026' },
        { email: 'lucy.okezie@student.mouau.edu.ng', fullName: 'Lucy Okezie', deptCode: 'VET', matric: '2020/VET/010', levelNum: 400, session: '2025/2026' },
        { email: 'ogwo_others@mouau.edu.ng', fullName: 'Ogwo Godspower Chinaza', deptCode: 'VET', matric: 'MOUAU/PHY/25/128473', levelNum: 300, session: '2025/2026' },
      ];
      studentData.forEach(s => {
        const dept = getDept(s.deptCode);
        const level = getLevel(s.levelNum);
        allUsersToCreate.push({ email: s.email, fullName: s.fullName, passwordHash: studentPass, role: 'student', matricNumber: s.matric, collegeId: dept.collegeId, departmentId: dept.id, levelId: level.id, session: s.session });
      });

      await prisma.user.createMany({ data: allUsersToCreate, skipDuplicates: true });
      const allUsers = await prisma.user.findMany();
      const students    = allUsers.filter(u => u.role === 'student');
      const lecturers   = allUsers.filter(u => u.role === 'lecturer');
      const invigilators = allUsers.filter(u => u.role === 'invigilator');
      const admins      = allUsers.filter(u => u.role === 'admin');
      const hods        = allUsers.filter(u => u.role === 'hod');
      const deans       = allUsers.filter(u => u.role === 'dean');
      const examOfficers = allUsers.filter(u => u.role === 'exam_officer');
      const vcDvcs      = allUsers.filter(u => u.role === 'vc_dvc');

      results.push(`✓ ${admins.length} admins, ${hods.length} HODs, ${deans.length} deans, ${examOfficers.length} exam officers, ${vcDvcs.length} VC/DVCs, ${lecturers.length} lecturers, ${invigilators.length} invigilators, ${students.length} students`);
      progressBroadcaster.broadcastProgress('users', 'User accounts created', `${allUsers.length} total users`, '👥✅');

      // ============================================
      // 5b. SECONDARY ROLE ASSIGNMENTS (HODs who lecture)
      // ============================================
      progressBroadcaster.broadcastProgress('roles', 'Assigning secondary roles...', 'HODs who also lecture', '🎓');

      const roleAssignments: any[] = [];
      for (const hodDef of hodData.filter(h => h.alsoLectures)) {
        const hodUser = allUsers.find(u => u.email === hodDef.email);
        if (hodUser) {
          roleAssignments.push({ userId: hodUser.id, role: 'lecturer' });
        }
      }

      await prisma.userRoleAssignment.createMany({ data: roleAssignments, skipDuplicates: true });
      results.push(`✓ ${roleAssignments.length} secondary role assignments (HODs who lecture)`);
      progressBroadcaster.broadcastProgress('roles', 'Secondary roles assigned', `${roleAssignments.length} assignments`, '🎓✅');

      // ============================================
      // 6. COURSES
      // ============================================
      progressBroadcaster.broadcastProgress('courses', 'Creating courses...', 'Building course list', '📚');

      const allCoursesToCreate: any[] = [];

      const addCourses = (deptCode: string, courses: Array<{ code: string; title: string; level: number; credits?: number; semester: number }>) => {
        const dept = getDept(deptCode);
        courses.forEach(c => {
          allCoursesToCreate.push({ code: c.code, title: c.title, departmentId: dept.id, creditUnits: c.credits || courseCredits(deptCode, c.level), level: c.level, semester: c.semester });
        });
      };

      addCourses('CSC', [
        { code: 'CSC101', title: 'Introduction to Computer Science', level: 100, credits: 3, semester: 1 },
        { code: 'CSC102', title: 'Introduction to Programming', level: 100, credits: 2, semester: 2 },
        { code: 'CSC201', title: 'Object Oriented Programming', level: 200, credits: 3, semester: 1 },
        { code: 'CSC202', title: 'Discrete Mathematics', level: 200, credits: 3, semester: 2 },
        { code: 'CSC203', title: 'Computer Organization', level: 200, credits: 2, semester: 1 },
        { code: 'CSC204', title: 'Assembly Language Programming', level: 200, credits: 2, semester: 2 },
        { code: 'CSC301', title: 'Data Structures & Algorithms', level: 300, credits: 3, semester: 1 },
        { code: 'CSC302', title: 'Database Management Systems', level: 300, credits: 3, semester: 2 },
        { code: 'CSC303', title: 'Operating Systems', level: 300, credits: 3, semester: 1 },
        { code: 'CSC304', title: 'Web Technologies', level: 300, credits: 2, semester: 2 },
        { code: 'CSC401', title: 'Software Engineering', level: 400, credits: 3, semester: 1 },
        { code: 'CSC402', title: 'Artificial Intelligence', level: 400, credits: 3, semester: 2 },
        { code: 'CSC403', title: 'Computer Networks', level: 400, credits: 3, semester: 1 },
        { code: 'CSC404', title: 'Project Management', level: 400, credits: 2, semester: 2 },
      ]);
      addCourses('MTH', [
        { code: 'MTH101', title: 'Calculus I', level: 100, credits: 3, semester: 1 },
        { code: 'MTH102', title: 'Algebra and Number Theory', level: 100, credits: 2, semester: 2 },
        { code: 'MTH103', title: 'Trigonometry', level: 100, credits: 2, semester: 1 },
        { code: 'MTH201', title: 'Calculus II', level: 200, credits: 3, semester: 1 },
        { code: 'MTH202', title: 'Mathematical Methods', level: 200, credits: 3, semester: 2 },
        { code: 'MTH203', title: 'Differential Equations', level: 200, credits: 2, semester: 1 },
        { code: 'MTH301', title: 'Linear Algebra', level: 300, credits: 3, semester: 1 },
        { code: 'MTH302', title: 'Numerical Analysis', level: 300, credits: 3, semester: 2 },
        { code: 'MTH303', title: 'Real Analysis I', level: 300, credits: 2, semester: 1 },
        { code: 'MTH401', title: 'Real Analysis II', level: 400, credits: 3, semester: 1 },
        { code: 'MTH402', title: 'Complex Analysis', level: 400, credits: 3, semester: 2 },
        { code: 'MTH403', title: 'Topology', level: 400, credits: 2, semester: 1 },
      ]);
      addCourses('PHY', [
        { code: 'PHY101', title: 'General Physics I (Mechanics)', level: 100, credits: 3, semester: 1 },
        { code: 'PHY102', title: 'General Physics II (Waves & Optics)', level: 100, credits: 2, semester: 2 },
        { code: 'PHY103', title: 'General Physics III (Thermal Physics)', level: 100, credits: 2, semester: 1 },
        { code: 'PHY201', title: 'Classical Mechanics', level: 200, credits: 3, semester: 1 },
        { code: 'PHY202', title: 'Waves and Optics', level: 200, credits: 3, semester: 2 },
        { code: 'PHY203', title: 'Heat and Thermodynamics', level: 200, credits: 2, semester: 1 },
        { code: 'PHY301', title: 'Quantum Mechanics I', level: 300, credits: 3, semester: 1 },
        { code: 'PHY302', title: 'Electromagnetism', level: 300, credits: 3, semester: 2 },
        { code: 'PHY303', title: 'Mathematical Methods for Physicists', level: 300, credits: 2, semester: 1 },
        { code: 'PHY401', title: 'Solid State Physics', level: 400, credits: 3, semester: 1 },
        { code: 'PHY402', title: 'Nuclear and Particle Physics', level: 400, credits: 3, semester: 2 },
        { code: 'PHY403', title: 'Quantum Mechanics II', level: 400, credits: 2, semester: 1 },
      ]);
      addCourses('CHM', [
        { code: 'CHM101', title: 'General Chemistry I', level: 100, credits: 3, semester: 1 },
        { code: 'CHM102', title: 'General Chemistry II', level: 100, credits: 2, semester: 2 },
        { code: 'CHM103', title: 'Practical Chemistry I', level: 100, credits: 1, semester: 1 },
        { code: 'CHM201', title: 'Organic Chemistry I', level: 200, credits: 3, semester: 1 },
        { code: 'CHM202', title: 'Analytical Chemistry', level: 200, credits: 3, semester: 2 },
        { code: 'CHM203', title: 'Inorganic Chemistry I', level: 200, credits: 2, semester: 1 },
        { code: 'CHM301', title: 'Physical Chemistry I', level: 300, credits: 3, semester: 1 },
        { code: 'CHM302', title: 'Inorganic Chemistry II', level: 300, credits: 3, semester: 2 },
        { code: 'CHM303', title: 'Organic Chemistry II', level: 300, credits: 2, semester: 1 },
        { code: 'CHM401', title: 'Industrial Chemistry', level: 400, credits: 3, semester: 1 },
        { code: 'CHM402', title: 'Environmental Chemistry', level: 400, credits: 3, semester: 2 },
        { code: 'CHM403', title: 'Physical Chemistry II', level: 400, credits: 2, semester: 1 },
      ]);
      addCourses('STA', [
        { code: 'STA101', title: 'Introduction to Statistics', level: 100, credits: 3, semester: 1 },
        { code: 'STA102', title: 'Probability Theory I', level: 100, credits: 2, semester: 2 },
        { code: 'STA201', title: 'Statistical Inference I', level: 200, credits: 3, semester: 1 },
        { code: 'STA202', title: 'Probability Theory II', level: 200, credits: 3, semester: 2 },
        { code: 'STA203', title: 'Descriptive Statistics', level: 200, credits: 2, semester: 1 },
        { code: 'STA301', title: 'Regression Analysis', level: 300, credits: 3, semester: 1 },
        { code: 'STA302', title: 'Sampling Theory', level: 300, credits: 3, semester: 2 },
        { code: 'STA303', title: 'Experimental Design', level: 300, credits: 2, semester: 1 },
        { code: 'STA401', title: 'Time Series Analysis', level: 400, credits: 3, semester: 1 },
        { code: 'STA402', title: 'Multivariate Analysis', level: 400, credits: 3, semester: 2 },
        { code: 'STA403', title: 'Nonparametric Statistics', level: 400, credits: 2, semester: 1 },
      ]);
      addCourses('GLG', [
        { code: 'GLG101', title: 'Introduction to Geology', level: 100, credits: 3, semester: 1 },
        { code: 'GLG102', title: 'Physical Geology', level: 100, credits: 2, semester: 2 },
        { code: 'GLG201', title: 'Mineralogy', level: 200, credits: 3, semester: 1 },
        { code: 'GLG202', title: 'Stratigraphy and Palaeontology', level: 200, credits: 3, semester: 2 },
        { code: 'GLG203', title: 'Petrology', level: 200, credits: 2, semester: 1 },
        { code: 'GLG301', title: 'Structural Geology', level: 300, credits: 3, semester: 1 },
        { code: 'GLG302', title: 'Hydrogeology', level: 300, credits: 3, semester: 2 },
        { code: 'GLG303', title: 'Geomorphology', level: 300, credits: 2, semester: 1 },
        { code: 'GLG401', title: 'Economic Geology', level: 400, credits: 3, semester: 1 },
        { code: 'GLG402', title: 'Environmental Geology', level: 400, credits: 3, semester: 2 },
        { code: 'GLG403', title: 'Geophysics', level: 400, credits: 2, semester: 1 },
      ]);
      addCourses('EEE', [
        { code: 'EEE101', title: 'Introduction to Electrical Engineering', level: 100, credits: 3, semester: 1 },
        { code: 'EEE102', title: 'Engineering Mathematics for EEE', level: 100, credits: 2, semester: 2 },
        { code: 'EEE201', title: 'Circuit Theory I', level: 200, credits: 3, semester: 1 },
        { code: 'EEE202', title: 'Electromagnetic Fields and Waves', level: 200, credits: 3, semester: 2 },
        { code: 'EEE203', title: 'Electronic Devices', level: 200, credits: 2, semester: 1 },
        { code: 'EEE301', title: 'Electronics I', level: 300, credits: 3, semester: 1 },
        { code: 'EEE302', title: 'Control Systems Engineering', level: 300, credits: 3, semester: 2 },
        { code: 'EEE303', title: 'Power Systems I', level: 300, credits: 2, semester: 1 },
        { code: 'EEE401', title: 'Power Systems Analysis', level: 400, credits: 3, semester: 1 },
        { code: 'EEE402', title: 'Industrial Electronics', level: 400, credits: 3, semester: 2 },
        { code: 'EEE403', title: 'Digital Signal Processing', level: 400, credits: 2, semester: 1 },
      ]);
      addCourses('CVE', [
        { code: 'CVE101', title: 'Engineering Mathematics I', level: 100, credits: 3, semester: 1 },
        { code: 'CVE102', title: 'Technical Drawing and CAD', level: 100, credits: 2, semester: 2 },
        { code: 'CVE201', title: 'Structural Mechanics', level: 200, credits: 3, semester: 1 },
        { code: 'CVE202', title: 'Fluid Mechanics', level: 200, credits: 3, semester: 2 },
        { code: 'CVE203', title: 'Engineering Materials', level: 200, credits: 2, semester: 1 },
        { code: 'CVE301', title: 'Soil Mechanics', level: 300, credits: 3, semester: 1 },
        { code: 'CVE302', title: 'Highway and Transportation Engineering', level: 300, credits: 3, semester: 2 },
        { code: 'CVE303', title: 'Hydrology and Water Resources', level: 300, credits: 2, semester: 1 },
        { code: 'CVE401', title: 'Structural Analysis and Design', level: 400, credits: 3, semester: 1 },
        { code: 'CVE402', title: 'Environmental Engineering', level: 400, credits: 3, semester: 2 },
        { code: 'CVE403', title: 'Construction Management', level: 400, credits: 2, semester: 1 },
      ]);
      addCourses('MCE', [
        { code: 'MCE101', title: 'Introduction to Mechanical Engineering', level: 100, credits: 3, semester: 1 },
        { code: 'MCE102', title: 'Workshop Practice', level: 100, credits: 2, semester: 2 },
        { code: 'MCE201', title: 'Engineering Mechanics', level: 200, credits: 3, semester: 1 },
        { code: 'MCE202', title: 'Thermodynamics I', level: 200, credits: 3, semester: 2 },
        { code: 'MCE203', title: 'Fluid Mechanics I', level: 200, credits: 2, semester: 1 },
        { code: 'MCE301', title: 'Machine Design I', level: 300, credits: 3, semester: 1 },
        { code: 'MCE302', title: 'Manufacturing Technology', level: 300, credits: 3, semester: 2 },
        { code: 'MCE303', title: 'Thermodynamics II', level: 300, credits: 2, semester: 1 },
        { code: 'MCE401', title: 'Industrial Engineering and Management', level: 400, credits: 3, semester: 1 },
        { code: 'MCE402', title: 'Mechatronics', level: 400, credits: 3, semester: 2 },
        { code: 'MCE403', title: 'Machine Design II', level: 400, credits: 2, semester: 1 },
      ]);
      addCourses('CHE', [
        { code: 'CHE101', title: 'Engineering Chemistry', level: 100, credits: 3, semester: 1 },
        { code: 'CHE102', title: 'Introduction to Chemical Engineering', level: 100, credits: 2, semester: 2 },
        { code: 'CHE201', title: 'Thermodynamics I', level: 200, credits: 3, semester: 1 },
        { code: 'CHE202', title: 'Material and Energy Balances', level: 200, credits: 3, semester: 2 },
        { code: 'CHE203', title: 'Chemical Process Principles', level: 200, credits: 2, semester: 1 },
        { code: 'CHE301', title: 'Chemical Reaction Engineering I', level: 300, credits: 3, semester: 1 },
        { code: 'CHE302', title: 'Heat and Mass Transfer', level: 300, credits: 3, semester: 2 },
        { code: 'CHE303', title: 'Unit Operations I', level: 300, credits: 2, semester: 1 },
        { code: 'CHE401', title: 'Process Control and Instrumentation', level: 400, credits: 3, semester: 1 },
        { code: 'CHE402', title: 'Plant Design and Economics', level: 400, credits: 3, semester: 2 },
        { code: 'CHE403', title: 'Chemical Reaction Engineering II', level: 400, credits: 2, semester: 1 },
      ]);
      addCourses('CPE', [
        { code: 'CPE101', title: 'Introduction to Computer Engineering', level: 100, credits: 3, semester: 1 },
        { code: 'CPE102', title: 'Fundamentals of Programming', level: 100, credits: 2, semester: 2 },
        { code: 'CPE201', title: 'Digital Logic Design', level: 200, credits: 3, semester: 1 },
        { code: 'CPE202', title: 'Data Structures for Engineers', level: 200, credits: 3, semester: 2 },
        { code: 'CPE203', title: 'Computer Programming II', level: 200, credits: 2, semester: 1 },
        { code: 'CPE301', title: 'Computer Architecture', level: 300, credits: 3, semester: 1 },
        { code: 'CPE302', title: 'Embedded Systems Design', level: 300, credits: 3, semester: 2 },
        { code: 'CPE303', title: 'Microprocessors', level: 300, credits: 2, semester: 1 },
        { code: 'CPE401', title: 'VLSI Design', level: 400, credits: 3, semester: 1 },
        { code: 'CPE402', title: 'Network Architecture and Security', level: 400, credits: 3, semester: 2 },
        { code: 'CPE403', title: 'Robotics', level: 400, credits: 2, semester: 1 },
      ]);
      addCourses('ACC', [
        { code: 'ACC101', title: 'Principles of Accounting I', level: 100, credits: 3, semester: 1 },
        { code: 'ACC102', title: 'Business Mathematics', level: 100, credits: 2, semester: 2 },
        { code: 'ACC201', title: 'Financial Accounting I', level: 200, credits: 3, semester: 1 },
        { code: 'ACC202', title: 'Management Accounting I', level: 200, credits: 3, semester: 2 },
        { code: 'ACC203', title: 'Principles of Accounting II', level: 200, credits: 2, semester: 1 },
        { code: 'ACC301', title: 'Cost Accounting', level: 300, credits: 3, semester: 1 },
        { code: 'ACC302', title: 'Taxation I', level: 300, credits: 3, semester: 2 },
        { code: 'ACC303', title: 'Financial Accounting II', level: 300, credits: 2, semester: 1 },
        { code: 'ACC401', title: 'Auditing and Assurance', level: 400, credits: 3, semester: 1 },
        { code: 'ACC402', title: 'Advanced Financial Reporting', level: 400, credits: 3, semester: 2 },
        { code: 'ACC403', title: 'Management Accounting II', level: 400, credits: 2, semester: 1 },
      ]);
      addCourses('HRM', [
        { code: 'HRM101', title: 'Introduction to Human Resource Management', level: 100, credits: 3, semester: 1 },
        { code: 'HRM102', title: 'Organisational Behaviour Foundations', level: 100, credits: 2, semester: 2 },
        { code: 'HRM201', title: 'Principles of Management', level: 200, credits: 3, semester: 1 },
        { code: 'HRM202', title: 'Recruitment and Selection', level: 200, credits: 3, semester: 2 },
        { code: 'HRM203', title: 'Employment Law', level: 200, credits: 2, semester: 1 },
        { code: 'HRM301', title: 'Organisational Behaviour', level: 300, credits: 3, semester: 1 },
        { code: 'HRM302', title: 'Compensation and Benefits', level: 300, credits: 3, semester: 2 },
        { code: 'HRM303', title: 'Performance Management', level: 300, credits: 2, semester: 1 },
        { code: 'HRM401', title: 'Strategic Human Resource Management', level: 400, credits: 3, semester: 1 },
        { code: 'HRM402', title: 'Labour Relations and Employment Law', level: 400, credits: 3, semester: 2 },
        { code: 'HRM403', title: 'International HRM', level: 400, credits: 2, semester: 1 },
      ]);
      addCourses('BUS', [
        { code: 'BUS101', title: 'Introduction to Business', level: 100, credits: 3, semester: 1 },
        { code: 'BUS102', title: 'Principles of Economics for Business', level: 100, credits: 2, semester: 2 },
        { code: 'BUS201', title: 'Business Ethics and Law', level: 200, credits: 3, semester: 1 },
        { code: 'BUS202', title: 'Marketing Management', level: 200, credits: 3, semester: 2 },
        { code: 'BUS203', title: 'Business Statistics', level: 200, credits: 2, semester: 1 },
        { code: 'BUS301', title: 'Entrepreneurship and SME Management', level: 300, credits: 3, semester: 1 },
        { code: 'BUS302', title: 'Operations Management', level: 300, credits: 3, semester: 2 },
        { code: 'BUS303', title: 'Consumer Behaviour', level: 300, credits: 2, semester: 1 },
        { code: 'BUS401', title: 'Strategic Management', level: 400, credits: 3, semester: 1 },
        { code: 'BUS402', title: 'Business Research Methods', level: 400, credits: 3, semester: 2 },
        { code: 'BUS403', title: 'International Business', level: 400, credits: 2, semester: 1 },
      ]);
      addCourses('BCH', [
        { code: 'BCH101', title: 'General Biochemistry I', level: 100, credits: 3, semester: 1 },
        { code: 'BCH102', title: 'Chemistry for Biochemists', level: 100, credits: 2, semester: 2 },
        { code: 'BCH201', title: 'Intermediary Metabolism', level: 200, credits: 3, semester: 1 },
        { code: 'BCH202', title: 'Biochemical Techniques', level: 200, credits: 3, semester: 2 },
        { code: 'BCH203', title: 'General Biochemistry II', level: 200, credits: 2, semester: 1 },
        { code: 'BCH301', title: 'Enzymology', level: 300, credits: 3, semester: 1 },
        { code: 'BCH302', title: 'Molecular Biology', level: 300, credits: 3, semester: 2 },
        { code: 'BCH303', title: 'Biophysical Chemistry', level: 300, credits: 2, semester: 1 },
        { code: 'BCH401', title: 'Clinical Biochemistry', level: 400, credits: 3, semester: 1 },
        { code: 'BCH402', title: 'Biotechnology and Genetic Engineering', level: 400, credits: 3, semester: 2 },
        { code: 'BCH403', title: 'Plant Biochemistry', level: 400, credits: 2, semester: 1 },
      ]);
      addCourses('MCB', [
        { code: 'MCB101', title: 'General Microbiology', level: 100, credits: 3, semester: 1 },
        { code: 'MCB102', title: 'Microbial World', level: 100, credits: 2, semester: 2 },
        { code: 'MCB201', title: 'Bacteriology', level: 200, credits: 3, semester: 1 },
        { code: 'MCB202', title: 'Virology', level: 200, credits: 3, semester: 2 },
        { code: 'MCB203', title: 'Mycology', level: 200, credits: 2, semester: 1 },
        { code: 'MCB301', title: 'Immunology', level: 300, credits: 3, semester: 1 },
        { code: 'MCB302', title: 'Industrial Microbiology', level: 300, credits: 3, semester: 2 },
        { code: 'MCB303', title: 'Microbial Genetics', level: 300, credits: 2, semester: 1 },
        { code: 'MCB401', title: 'Medical Microbiology', level: 400, credits: 3, semester: 1 },
        { code: 'MCB402', title: 'Microbial Ecology', level: 400, credits: 3, semester: 2 },
        { code: 'MCB403', title: 'Food Microbiology', level: 400, credits: 2, semester: 1 },
      ]);

      // GST courses
      const gstDept = getDept('ENG');
      const gstCourses = [
        { code: 'GST101', title: 'Communication in English', level: 100, credits: 2, semester: 1 },
        { code: 'GST102', title: 'Use of Library and Study Skills', level: 100, credits: 1, semester: 1 },
        { code: 'GST103', title: 'Nigerian Peoples and Culture', level: 100, credits: 2, semester: 2 },
        { code: 'GST104', title: 'Logic, Philosophy and Human Existence', level: 100, credits: 2, semester: 2 },
        { code: 'GST201', title: 'Peace Studies and Conflict Resolution', level: 200, credits: 2, semester: 1 },
        { code: 'GST202', title: 'Introduction to Entrepreneurship', level: 200, credits: 2, semester: 2 },
        { code: 'GST203', title: 'Gender and Development Studies', level: 200, credits: 2, semester: 1 },
        { code: 'GST301', title: 'Research Methodology', level: 300, credits: 2, semester: 1 },
        { code: 'GST302', title: 'Entrepreneurship and Innovation', level: 300, credits: 2, semester: 2 },
        { code: 'GST303', title: 'Leadership and Governance', level: 300, credits: 2, semester: 1 },
        { code: 'GST401', title: 'Project Management', level: 400, credits: 2, semester: 1 },
        { code: 'GST402', title: 'Business Development', level: 400, credits: 2, semester: 2 },
      ];
      gstCourses.forEach(c => {
        allCoursesToCreate.push({ code: c.code, title: c.title, departmentId: gstDept.id, creditUnits: c.credits, level: c.level, semester: c.semester });
      });

      await prisma.course.createMany({ data: allCoursesToCreate, skipDuplicates: true });
      const courses = await prisma.course.findMany();
      results.push(`✓ ${courses.length} courses`);
      progressBroadcaster.broadcastProgress('courses', 'Courses created', `${courses.length} courses`, '📚✅');

      const getCourse = (code: string) => {
        const c = courses.find(c => c.code === code);
        if (!c) throw new Error(`Course not found: ${code}`);
        return c;
      };

      // ============================================
      // 7. COURSE REGISTRATIONS
      // ============================================
      progressBroadcaster.broadcastProgress('registrations', 'Registering students for courses...', 'Building registrations', '📋');

      const registrationData: any[] = [];
      for (const student of students) {
        const studentLevelNum = levels.find(l => l.id === student.levelId)?.level || 100;
        const deptCourses = courses.filter(c => c.departmentId === student.departmentId);

        for (const course of deptCourses) {
          const diff = studentLevelNum - (course.level ?? 0);
          if (diff === 0 || (diff > 0 && diff <= 100)) {
            registrationData.push({
              studentId: student.id,
              courseId: course.id,
              session: student.session,
              semester: course.semester,
              levelId: student.levelId,
              registrationType: diff === 0 ? 'normal' : 'carry_over',
              status: diff === 0 ? 'approved' : 'pending',
            });
          }
        }

        const studentGstCourses = gstCourses.filter(g => g.level === studentLevelNum);
        for (const gst of studentGstCourses) {
          const gstCourse = courses.find(c => c.code === gst.code);
          if (gstCourse) {
            registrationData.push({
              studentId: student.id,
              courseId: gstCourse.id,
              session: student.session,
              semester: gstCourse.semester,
              levelId: student.levelId,
              registrationType: 'normal',
              status: 'approved',
            });
          }
        }
      }

      await prisma.courseRegistration.createMany({ data: registrationData, skipDuplicates: true });
      results.push(`✓ ${registrationData.length} course registrations`);
      progressBroadcaster.broadcastProgress('registrations', 'Registrations completed', `${registrationData.length} registrations`, '📋✅');

      // ============================================
      // 8. EXAMS
      // ============================================
      progressBroadcaster.broadcastProgress('exam', 'Creating exam records...', 'Setting up exams', '📝');

      function createDate(day: number, month: number, year: number, hour: number, minute: number): Date {
        return new Date(year, month - 1, day, hour, minute, 0, 0);
      }

      const startDate1 = createDate(16, 6, 2026, 23, 0);
      const endDate1   = createDate(20, 6, 2026, 23, 59);
      const startDate2 = createDate(16, 6, 2026, 23, 0);
      const endDate2   = createDate(20, 6, 2026, 23, 59);

      const cscLecturer = lecturers.find(l => l.departmentId === getDept('CSC').id) || lecturers[0];
      const phyLecturer = lecturers.find(l => l.departmentId === getDept('PHY').id) || lecturers[0];
      const mthLecturer = lecturers.find(l => l.departmentId === getDept('MTH').id) || lecturers[0];
      const engLecturer = lecturers.find(l => l.departmentId === getDept('ENG').id) || lecturers[0];

      const EXAM_ID_1 = '00000000-0000-0000-0000-000000000001';
      const EXAM_ID_2 = '00000000-0000-0000-0000-000000000002';
      const EXAM_ID_3 = '00000000-0000-0000-0000-000000000003';
      const EXAM_ID_4 = '00000000-0000-0000-0000-000000000004';
      // New true/false exams
      const EXAM_ID_5 = '00000000-0000-0000-0000-000000000005';
      const EXAM_ID_6 = '00000000-0000-0000-0000-000000000006';

      const exam1 = await prisma.exam.upsert({
        where: { id: EXAM_ID_1 }, update: {},
        create: {
          id: EXAM_ID_1, courseId: getCourse('CSC301').id, createdBy: cscLecturer.id,
          title: 'CSC301 — Comprehensive Examination (All Levels)',
          instructions: 'Answer all questions. No external resources. Time limit strictly enforced.',
          durationMinutes: 120, totalMarks: 100, passMark: 40, status: 'scheduled',
          scheduledStart: startDate1, scheduledEnd: endDate1,
          randomizeQuestions: true, randomizeOptions: true, questionsToPresent: 20,
          showResultAfter: true, maxViolations: 5, session: '2025/2026', semester: 2,
          levels: { connect: [getLevel(100), getLevel(200), getLevel(300), getLevel(400), getLevel(500), getLevel(600)].map(l => ({ id: l.id })) },
        },
      });

      const exam2 = await prisma.exam.upsert({
        where: { id: EXAM_ID_2 }, update: {},
        create: {
          id: EXAM_ID_2, courseId: getCourse('PHY101').id, createdBy: phyLecturer.id,
          title: 'PHY101 — General Physics Examination',
          instructions: 'Answer all questions. Show your working where applicable.',
          durationMinutes: 90, totalMarks: 60, passMark: 24, status: 'scheduled',
          scheduledStart: startDate2, scheduledEnd: endDate2,
          randomizeQuestions: true, randomizeOptions: true, questionsToPresent: 15,
          showResultAfter: true, maxViolations: 3, session: '2025/2026', semester: 2,
          levels: { connect: [getLevel(100), getLevel(200)].map(l => ({ id: l.id })) },
        },
      });

      const exam3 = await prisma.exam.upsert({
        where: { id: EXAM_ID_3 }, update: {},
        create: {
          id: EXAM_ID_3, courseId: getCourse('MTH101').id, createdBy: mthLecturer.id,
          title: 'MTH101 — Calculus I Examination',
          instructions: 'Answer all questions. Scientific calculators are NOT permitted.',
          durationMinutes: 90, totalMarks: 70, passMark: 28, status: 'scheduled',
          scheduledStart: startDate2, scheduledEnd: endDate2,
          randomizeQuestions: true, randomizeOptions: false, questionsToPresent: 10,
          showResultAfter: true, maxViolations: 3, session: '2025/2026', semester: 2,
          levels: { connect: [getLevel(100), getLevel(200)].map(l => ({ id: l.id })) },
        },
      });

      const exam4 = await prisma.exam.upsert({
        where: { id: EXAM_ID_4 }, update: {},
        create: {
          id: EXAM_ID_4, courseId: getCourse('GST101').id, createdBy: engLecturer.id,
          title: 'GST101 — Communication in English Examination',
          instructions: 'Answer all questions. Pay attention to grammar and punctuation.',
          durationMinutes: 60, totalMarks: 40, passMark: 16, status: 'scheduled',
          scheduledStart: startDate1, scheduledEnd: endDate1,
          randomizeQuestions: true, randomizeOptions: true, questionsToPresent: 12,
          showResultAfter: true, maxViolations: 5, session: '2025/2026', semester: 2,
          levels: { connect: [getLevel(100), getLevel(200), getLevel(300), getLevel(400), getLevel(500), getLevel(600)].map(l => ({ id: l.id })) },
        },
      });

      // ── Exam 5: True/False — PHY101 (100 & 200 levels) ──────────────────────
      const exam5 = await prisma.exam.upsert({
        where: { id: EXAM_ID_5 }, update: {},
        create: {
          id: EXAM_ID_5, courseId: getCourse('PHY101').id, createdBy: phyLecturer.id,
          title: 'PHY101 — True/False Physics Quiz',
          instructions: 'For each statement, select True or False. There is no negative marking.',
          durationMinutes: 30, totalMarks: 20, passMark: 10, status: 'scheduled',
          scheduledStart: startDate1, scheduledEnd: endDate1,
          randomizeQuestions: true, randomizeOptions: false, questionsToPresent: 10,
          showResultAfter: true, maxViolations: 3, session: '2025/2026', semester: 2,
          levels: { connect: [getLevel(100), getLevel(200)].map(l => ({ id: l.id })) },
        },
      });

      // ── Exam 6: True/False — CSC301 (all levels) ────────────────────────────
      const exam6 = await prisma.exam.upsert({
        where: { id: EXAM_ID_6 }, update: {},
        create: {
          id: EXAM_ID_6, courseId: getCourse('CSC301').id, createdBy: cscLecturer.id,
          title: 'CSC301 — True/False Algorithms Quiz',
          instructions: 'For each statement, select True or False. Read carefully before answering.',
          durationMinutes: 25, totalMarks: 15, passMark: 8, status: 'scheduled',
          scheduledStart: startDate2, scheduledEnd: endDate2,
          randomizeQuestions: true, randomizeOptions: false, questionsToPresent: 15,
          showResultAfter: true, maxViolations: 3, session: '2025/2026', semester: 2,
          levels: { connect: [getLevel(100), getLevel(200), getLevel(300), getLevel(400), getLevel(500), getLevel(600)].map(l => ({ id: l.id })) },
        },
      });

      if (invigilators.length > 0) {
        await prisma.examInvigilator.createMany({
          data: [
            { examId: exam1.id, invigilatorId: invigilators[0].id },
            { examId: exam2.id, invigilatorId: invigilators[1]?.id ?? invigilators[0].id },
            { examId: exam3.id, invigilatorId: invigilators[0].id },
            { examId: exam4.id, invigilatorId: invigilators[1]?.id ?? invigilators[0].id },
            { examId: exam5.id, invigilatorId: invigilators[2]?.id ?? invigilators[0].id },
            { examId: exam6.id, invigilatorId: invigilators[3]?.id ?? invigilators[0].id },
          ],
          skipDuplicates: true,
        });
      }

      results.push(`✓ 6 exams created (4 MCQ, 2 True/False)`);
      progressBroadcaster.broadcastProgress('exam', 'Exams created', '6 exams with invigilators', '📝✅');

      // ============================================
      // 9. QUESTIONS
      // ============================================
      progressBroadcaster.broadcastProgress('questions', 'Creating exam questions...', 'MCQ + True/False', '❓');

      // ── MCQ questions (exams 1–4) — unchanged from original ─────────────────
      const mcqDataExam1 = [
        { body: 'Which data structure uses LIFO (Last In First Out) ordering?', topic: 'Data Structures', options: ['Queue', 'Stack', 'Linked List', 'Binary Tree'], correct: 1, marks: 5 },
        { body: 'What is the time complexity of binary search on a sorted array?', topic: 'Algorithms', options: ['O(n)', 'O(n²)', 'O(log n)', 'O(1)'], correct: 2, marks: 5 },
        { body: 'Which sorting algorithm has the best average-case time complexity?', topic: 'Sorting', options: ['Bubble Sort', 'Insertion Sort', 'Merge Sort', 'Selection Sort'], correct: 2, marks: 5 },
        { body: 'A graph with no cycles is called a ___.', topic: 'Graph Theory', options: ['Complete Graph', 'Tree', 'Bipartite Graph', 'Directed Graph'], correct: 1, marks: 5 },
        { body: 'Which traversal visits nodes in Left → Root → Right order?', topic: 'Trees', options: ['Preorder', 'Postorder', 'Inorder', 'Level Order'], correct: 2, marks: 5 },
        { body: 'What is the worst-case time complexity of QuickSort?', topic: 'Sorting', options: ['O(n log n)', 'O(n)', 'O(n²)', 'O(log n)'], correct: 2, marks: 5 },
        { body: 'Which data structure is used for implementing BFS?', topic: 'Graph Theory', options: ['Stack', 'Queue', 'Heap', 'Priority Queue'], correct: 1, marks: 5 },
        { body: 'In a max-heap, the root node contains the ___ element.', topic: 'Data Structures', options: ['Smallest', 'Median', 'Largest', 'Random'], correct: 2, marks: 5 },
        { body: 'What is the space complexity of merge sort?', topic: 'Sorting', options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], correct: 2, marks: 5 },
        { body: 'Which of these is a self-balancing binary search tree?', topic: 'Trees', options: ['Red-Black Tree', 'Complete Binary Tree', 'Min Heap', 'Trie'], correct: 0, marks: 5 },
        { body: 'What is the purpose of the "finally" block in exception handling?', topic: 'Programming', options: ['Handle exceptions', 'Clean up resources', 'Throw exceptions', 'Return values'], correct: 1, marks: 5 },
        { body: 'Which database model uses tables with rows and columns?', topic: 'Databases', options: ['Relational', 'NoSQL', 'Graph', 'Key-Value'], correct: 0, marks: 5 },
        { body: 'What does the acronym HTML stand for?', topic: 'Web', options: ['High Tech Markup Language', 'Hypertext Markup Language', 'Hyper Transfer Markup Language', 'High Text Markup Language'], correct: 1, marks: 5 },
        { body: 'Which layer of the OSI model handles routing?', topic: 'Networking', options: ['Physical', 'Data Link', 'Network', 'Transport'], correct: 2, marks: 5 },
        { body: 'What is polymorphism in OOP?', topic: 'Programming', options: ['Multiple inheritance', 'One interface, multiple implementations', 'Data hiding', 'Encapsulation'], correct: 1, marks: 5 },
      ];

      const mcqDataExam2 = [
        { body: 'What is the SI unit of force?', topic: 'Mechanics', options: ['Newton', 'Joule', 'Watt', 'Pascal'], correct: 0, marks: 4 },
        { body: 'Which of the following is a scalar quantity?', topic: 'Mechanics', options: ['Velocity', 'Force', 'Speed', 'Acceleration'], correct: 2, marks: 4 },
        { body: 'What is the acceleration due to gravity on Earth approximately?', topic: 'Mechanics', options: ['8.9 m/s²', '9.8 m/s²', '10.8 m/s²', '7.8 m/s²'], correct: 1, marks: 4 },
        { body: 'The first law of thermodynamics is a statement of:', topic: 'Thermodynamics', options: ['Energy conservation', 'Entropy', 'Heat transfer', 'Work'], correct: 0, marks: 4 },
        { body: 'Which type of wave requires a medium to travel?', topic: 'Waves', options: ['Light wave', 'Sound wave', 'Radio wave', 'X-ray'], correct: 1, marks: 4 },
        { body: 'What is the wavelength of a wave with frequency 50 Hz and speed 340 m/s?', topic: 'Waves', options: ['6.8 m', '7.8 m', '8.8 m', '5.8 m'], correct: 0, marks: 4 },
        { body: "An object at rest will remain at rest unless acted upon by an external force. This is:", topic: 'Mechanics', options: ["Newton's First Law", "Newton's Second Law", "Newton's Third Law", 'Law of Gravitation'], correct: 0, marks: 4 },
        { body: 'What is the power of a device that uses 100 J of energy in 5 seconds?', topic: 'Mechanics', options: ['5 W', '20 W', '50 W', '100 W'], correct: 1, marks: 4 },
        { body: 'The process of converting solid directly to gas is called:', topic: 'Thermodynamics', options: ['Condensation', 'Evaporation', 'Sublimation', 'Melting'], correct: 2, marks: 4 },
        { body: 'Which particle has a negative charge?', topic: 'Physics', options: ['Proton', 'Neutron', 'Electron', 'Photon'], correct: 2, marks: 4 },
      ];

      const mcqDataExam3 = [
        { body: 'What is the derivative of x²?', topic: 'Calculus', options: ['2x', 'x', '2x²', 'x²/2'], correct: 0, marks: 5 },
        { body: 'The integral of 1/x is:', topic: 'Calculus', options: ['ln x', 'e^x', 'x', '1/x²'], correct: 0, marks: 5 },
        { body: 'What is the slope of the line y = 3x + 2?', topic: 'Algebra', options: ['2', '3', '5', '1'], correct: 1, marks: 5 },
        { body: 'Solve for x: 2x + 5 = 13', topic: 'Algebra', options: ['2', '3', '4', '5'], correct: 2, marks: 5 },
        { body: 'What is the value of sin(90°)?', topic: 'Trigonometry', options: ['0', '0.5', '1', 'Undefined'], correct: 2, marks: 5 },
        { body: 'The area of a circle with radius r is:', topic: 'Geometry', options: ['πr', '2πr', 'πr²', '2πr²'], correct: 2, marks: 5 },
        { body: 'What is the logarithm of 100 to base 10?', topic: 'Algebra', options: ['1', '2', '10', '100'], correct: 1, marks: 5 },
        { body: 'The derivative of e^x is:', topic: 'Calculus', options: ['e^x', 'x e^x', 'e^{x-1}', 'ln x'], correct: 0, marks: 5 },
        { body: 'What is the sum of angles in a triangle?', topic: 'Geometry', options: ['90°', '180°', '270°', '360°'], correct: 1, marks: 5 },
        { body: 'The factorial of 5 is:', topic: 'Algebra', options: ['60', '100', '120', '24'], correct: 2, marks: 5 },
      ];

      const mcqDataExam4 = [
        { body: 'Which of the following is a complete sentence?', topic: 'Grammar', options: ['Running fast.', 'She runs fast.', 'Fast running.', 'Run fast.'], correct: 1, marks: 4 },
        { body: 'What is the plural of "child"?', topic: 'Grammar', options: ['Childs', 'Children', 'Childrens', 'Child'], correct: 1, marks: 4 },
        { body: 'Which word is a synonym for "happy"?', topic: 'Vocabulary', options: ['Sad', 'Angry', 'Joyful', 'Tired'], correct: 2, marks: 4 },
        { body: 'The correct spelling is:', topic: 'Spelling', options: ['Accomodate', 'Acommodate', 'Accommodate', 'Acomodate'], correct: 2, marks: 4 },
        { body: 'Which punctuation mark is used to show possession?', topic: 'Punctuation', options: ['Comma', 'Apostrophe', 'Period', 'Question mark'], correct: 1, marks: 4 },
        { body: 'Identify the adverb in: "She sings beautifully."', topic: 'Grammar', options: ['She', 'Sings', 'Beautifully', 'The'], correct: 2, marks: 4 },
        { body: 'Which of these is a conjunction?', topic: 'Grammar', options: ['And', 'Run', 'Beautiful', 'Quickly'], correct: 0, marks: 4 },
        { body: 'The correct article to use before "hour" is:', topic: 'Grammar', options: ['a', 'an', 'the', 'none'], correct: 1, marks: 4 },
        { body: 'What is the past tense of "go"?', topic: 'Grammar', options: ['Goed', 'Gone', 'Went', 'Going'], correct: 2, marks: 4 },
        { body: 'Which word is an antonym of "difficult"?', topic: 'Vocabulary', options: ['Hard', 'Easy', 'Tough', 'Complex'], correct: 1, marks: 4 },
      ];

      // ── True/False questions — stored as MCQ with two options: True, False ───
      // correct: 0 = True is correct, correct: 1 = False is correct
      const tfDataExam5 = [
        { body: 'The SI unit of force is the Newton.', topic: 'Mechanics', correct: 0, marks: 2 },
        { body: 'Sound waves can travel through a vacuum.', topic: 'Waves', correct: 1, marks: 2 },
        { body: 'Acceleration due to gravity on Earth is approximately 9.8 m/s².', topic: 'Mechanics', correct: 0, marks: 2 },
        { body: 'Energy can be created and destroyed according to the first law of thermodynamics.', topic: 'Thermodynamics', correct: 1, marks: 2 },
        { body: 'Electrons carry a positive charge.', topic: 'Electricity', correct: 1, marks: 2 },
        { body: 'The process of a solid converting directly to gas is called sublimation.', topic: 'Thermodynamics', correct: 0, marks: 2 },
        { body: 'Velocity is a scalar quantity.', topic: 'Mechanics', correct: 1, marks: 2 },
        { body: 'Light is an example of a transverse wave.', topic: 'Waves', correct: 0, marks: 2 },
        { body: "Newton's Second Law states that F = ma.", topic: 'Mechanics', correct: 0, marks: 2 },
        { body: 'The wavelength of a wave increases as its frequency increases.', topic: 'Waves', correct: 1, marks: 2 },
      ];

      const tfDataExam6 = [
        { body: 'A stack uses FIFO (First In First Out) ordering.', topic: 'Data Structures', correct: 1, marks: 1 },
        { body: 'Binary search has a time complexity of O(log n).', topic: 'Algorithms', correct: 0, marks: 1 },
        { body: 'Merge sort has a worst-case time complexity of O(n²).', topic: 'Sorting', correct: 1, marks: 1 },
        { body: 'A tree is a graph with no cycles.', topic: 'Graph Theory', correct: 0, marks: 1 },
        { body: 'Inorder traversal visits nodes in Left → Root → Right order.', topic: 'Trees', correct: 0, marks: 1 },
        { body: 'QuickSort always performs in O(n log n) time.', topic: 'Sorting', correct: 1, marks: 1 },
        { body: 'BFS uses a queue for implementation.', topic: 'Graph Theory', correct: 0, marks: 1 },
        { body: 'In a min-heap, the root contains the largest element.', topic: 'Data Structures', correct: 1, marks: 1 },
        { body: 'The space complexity of merge sort is O(n).', topic: 'Sorting', correct: 0, marks: 1 },
        { body: 'A Red-Black tree is a self-balancing binary search tree.', topic: 'Trees', correct: 0, marks: 1 },
        { body: 'HTML stands for Hypertext Markup Language.', topic: 'Web', correct: 0, marks: 1 },
        { body: 'The Network layer of the OSI model handles routing.', topic: 'Networking', correct: 0, marks: 1 },
        { body: 'Polymorphism means one interface with multiple implementations.', topic: 'OOP', correct: 0, marks: 1 },
        { body: 'A relational database stores data in key-value pairs.', topic: 'Databases', correct: 1, marks: 1 },
        { body: 'The "finally" block in exception handling is used to clean up resources.', topic: 'Programming', correct: 0, marks: 1 },
      ];

      async function createMcqQuestions(examId: string, mcqData: any[]) {
        let count = 0;
        for (let i = 0; i < mcqData.length; i++) {
          const q = mcqData[i];
          const exists = await prisma.question.findFirst({ where: { examId, body: q.body } });
          if (!exists) {
            await prisma.question.create({
              data: {
                examId, type: 'mcq', body: q.body, marks: q.marks, topic: q.topic, orderIndex: i,
                options: {
                  create: q.options.map((text: string, j: number) => ({ optionText: text, isCorrect: j === q.correct, orderIndex: j })),
                },
              },
            });
            count++;
          }
        }
        return count;
      }

      async function createTfQuestions(examId: string, tfData: any[]) {
        // True/False is stored as MCQ with exactly two options: "True" and "False"
        let count = 0;
        for (let i = 0; i < tfData.length; i++) {
          const q = tfData[i];
          const exists = await prisma.question.findFirst({ where: { examId, body: q.body } });
          if (!exists) {
            await prisma.question.create({
              data: {
                examId, type: 'mcq', body: q.body, marks: q.marks, topic: q.topic, orderIndex: i,
                options: {
                  create: [
                    { optionText: 'True',  isCorrect: q.correct === 0, orderIndex: 0 },
                    { optionText: 'False', isCorrect: q.correct === 1, orderIndex: 1 },
                  ],
                },
              },
            });
            count++;
          }
        }
        return count;
      }

      const qCount1 = await createMcqQuestions(exam1.id, mcqDataExam1);
      const qCount2 = await createMcqQuestions(exam2.id, mcqDataExam2);
      const qCount3 = await createMcqQuestions(exam3.id, mcqDataExam3);
      const qCount4 = await createMcqQuestions(exam4.id, mcqDataExam4);
      const qCount5 = await createTfQuestions(exam5.id, tfDataExam5);
      const qCount6 = await createTfQuestions(exam6.id, tfDataExam6);

      const totalQuestions = qCount1 + qCount2 + qCount3 + qCount4 + qCount5 + qCount6;
      results.push(`✓ ${totalQuestions} questions (${qCount1 + qCount2 + qCount3 + qCount4} MCQ, ${qCount5 + qCount6} True/False)`);
      progressBroadcaster.broadcastProgress('questions', 'Questions created', `${totalQuestions} questions`, '❓✅');

      // ============================================
      // 10. NOTIFICATIONS
      // ============================================
      progressBroadcaster.broadcastProgress('notifications', 'Creating exam notifications...', 'For all students', '🔔');

      const allLevelStudents = students.filter(s => { const l = levels.find(x => x.id === s.levelId); return l && l.level >= 100 && l.level <= 600; });
      const level100_200Students = students.filter(s => { const l = levels.find(x => x.id === s.levelId); return l && (l.level === 100 || l.level === 200); });

      const notificationData = [
        ...allLevelStudents.map(s => ({ userId: s.id, title: '📝 CSC301 Examination Scheduled', message: `CSC301 Comprehensive Examination has been scheduled for ${startDate1.toLocaleDateString()}. Check your dashboard.`, isRead: false })),
        ...level100_200Students.map(s => ({ userId: s.id, title: '📝 PHY101 Examination Scheduled', message: `PHY101 General Physics Examination has been scheduled for ${startDate2.toLocaleDateString()}. Check your dashboard.`, isRead: false })),
        ...level100_200Students.map(s => ({ userId: s.id, title: '📝 MTH101 Examination Scheduled', message: `MTH101 Calculus I Examination has been scheduled for ${startDate2.toLocaleDateString()}. Check your dashboard.`, isRead: false })),
        ...allLevelStudents.map(s => ({ userId: s.id, title: '📝 GST101 Examination Scheduled', message: `GST101 Communication in English Examination has been scheduled for ${startDate1.toLocaleDateString()}. Check your dashboard.`, isRead: false })),
        ...level100_200Students.map(s => ({ userId: s.id, title: '📝 PHY101 True/False Quiz Scheduled', message: `PHY101 True/False Physics Quiz has been scheduled for ${startDate1.toLocaleDateString()}. Check your dashboard.`, isRead: false })),
        ...allLevelStudents.map(s => ({ userId: s.id, title: '📝 CSC301 True/False Quiz Scheduled', message: `CSC301 True/False Algorithms Quiz has been scheduled for ${startDate2.toLocaleDateString()}. Check your dashboard.`, isRead: false })),
      ];

      await prisma.notification.createMany({ data: notificationData, skipDuplicates: true });
      results.push(`✓ ${notificationData.length} exam notifications created`);
      progressBroadcaster.broadcastProgress('notifications', 'Notifications created', `${notificationData.length} notifications`, '🔔✅');

      // ============================================
      // 11. USER PREFERENCES
      // ============================================
      progressBroadcaster.broadcastProgress('preferences', 'Setting user preferences...', 'Default settings', '⚙️');

      await prisma.userPreference.createMany({
        data: allUsers.map(user => ({
          userId: user.id,
          prefs: { theme: 'system', language: 'en', emailNotifications: true, fontSize: 'medium' },
        })),
        skipDuplicates: true,
      });
      results.push(`✓ ${allUsers.length} user preferences`);
      progressBroadcaster.broadcastProgress('preferences', 'Preferences configured', `${allUsers.length} preferences`, '⚙️✅');

      results.push('✓ Seed complete');
      progressBroadcaster.broadcastComplete('Database seeding completed successfully!');
      return { success: true, results };

    } catch (err) {
      console.error('[Seed] Failed:', err);
      progressBroadcaster.broadcastError(err instanceof Error ? err.message : 'Seed failed');
      return fail(500, { error: err instanceof Error ? err.message : 'Seed failed' });
    }
  },

  reset: async ({ locals }) => {
    requireAdmin(locals.user);
    const prisma = await getPrismaClient();

    try {
      progressBroadcaster.broadcastProgress('reset', 'Resetting database...', 'Clearing all tables', '🗑️');

      await prisma.$transaction([
        prisma.faceSimilarity.deleteMany(),
        prisma.faceVerificationLog.deleteMany(),
        prisma.examResult.deleteMany(),
        prisma.studentAnswer.deleteMany(),
        prisma.sessionOptionOrder.deleteMany(),
        prisma.sessionQuestionOrder.deleteMany(),
        prisma.violation.deleteMany(),
        prisma.examSession.deleteMany(),
        prisma.examInvigilator.deleteMany(),
        prisma.examLevel.deleteMany(),
        prisma.examDepartment.deleteMany(),
        prisma.question.deleteMany(),
        prisma.exam.deleteMany(),
        prisma.courseRegistration.deleteMany(),
        prisma.lecturerCourse.deleteMany(),
        prisma.course.deleteMany(),
        prisma.faceDescriptor.deleteMany(),
        prisma.passwordReset.deleteMany(),
        prisma.authSession.deleteMany(),
        prisma.notification.deleteMany(),
        prisma.userPreference.deleteMany(),
        prisma.auditLog.deleteMany(),
        prisma.apiAccessLog.deleteMany(),
        prisma.apiKey.deleteMany(),
        prisma.userRoleAssignment.deleteMany(),
        prisma.user.deleteMany(),
        prisma.programme.deleteMany(),
        prisma.department.deleteMany(),
        prisma.college.deleteMany(),
        prisma.academicSemester.deleteMany(),
        prisma.levelSemesterConfig.deleteMany(),
        prisma.level.deleteMany(),
      ]);

      progressBroadcaster.broadcastComplete('Database reset completed successfully!');
      return { success: true, results: ['✓ All data cleared'] };

    } catch (err) {
      console.error('[Reset] Failed:', err);
      progressBroadcaster.broadcastError(err instanceof Error ? err.message : 'Reset failed');
      return fail(500, { error: err instanceof Error ? err.message : 'Reset failed' });
    }
  },
};
