// src/routes/(admin)/seed/+page.server.ts
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireAdmin } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';
import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import { progressBroadcaster } from '$lib/server/progress-broadcaster';

const scryptAsync = promisify(scrypt);

// Helper functions
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
    counts: {
      users: userCount,
      colleges: collegeCount,
      departments: departmentCount,
      courses: courseCount,
      exams: examCount,
      levels: levelCount
    },
    isFirstRun: userCount === 0,
  };
};

export const actions: Actions = {
  seed: async ({ locals }) => {
    const userCount = await prisma.user.count();
    if (userCount > 0) requireAdmin(locals.user);

    try {
      const results: string[] = [];

      // ============================================
      // 1. LEVELS - Bulk insert
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
// 1b. ACADEMIC SEMESTERS - Seed both semesters
// ============================================
progressBroadcaster.broadcastProgress('semesters', 'Creating academic semesters...', '2 semesters', '📅');

await prisma.academicSemester.createMany({
  data: [
    {
      session:   '2025/2026',
      semester:  1,
      label:     'First Semester 2025/2026',
      startDate: new Date('2025-09-01T00:00:00Z'),
      endDate:   new Date('2026-01-31T23:59:59Z'),
      isActive:  true,   // ← currently active
      regOpen:   true,
    },
    {
      session:   '2025/2026',
      semester:  2,
      label:     'Second Semester 2025/2026',
      startDate: new Date('2026-02-01T00:00:00Z'),
      endDate:   new Date('2026-07-31T23:59:59Z'),
      isActive:  false,
      regOpen:   false,
    },
  ],
  skipDuplicates: true,
});

results.push('✓ 2 academic semesters (2025/2026)');
progressBroadcaster.broadcastProgress('semesters', 'Level/Semester credit caps created', '2025/2026 Sem 1 & 2', '📅✅');

      //  ===========================================
      // 1c. LEVEL SEMESTER
      //  ===========================================

      progressBroadcaster.broadcastProgress('Credit Unit', 'Credit units created', '2025/2026 Sem 1 & 2', '📅✅');
// ── Level credit caps per semester ──────────────────────────────────────────
// Typical MOUAU structure — adjust as needed
const creditCaps = [
  // 100L — lighter load, no carry-over yet
  { levelNum: 100, semester: 1, maxCredits: 20, maxCarryOver: 0, maxBorrowed: 6 },
  { levelNum: 100, semester: 2, maxCredits: 20, maxCarryOver: 0, maxBorrowed: 6 },
  // 200–400L — full load
  { levelNum: 200, semester: 1, maxCredits: 24, maxCarryOver: 6, maxBorrowed: 6 },
  { levelNum: 200, semester: 2, maxCredits: 24, maxCarryOver: 6, maxBorrowed: 6 },
  { levelNum: 300, semester: 1, maxCredits: 24, maxCarryOver: 6, maxBorrowed: 6 },
  { levelNum: 300, semester: 2, maxCredits: 24, maxCarryOver: 6, maxBorrowed: 6 },
  { levelNum: 400, semester: 1, maxCredits: 24, maxCarryOver: 6, maxBorrowed: 6 },
  { levelNum: 400, semester: 2, maxCredits: 24, maxCarryOver: 6, maxBorrowed: 6 },
  // 500–600L (professional/postgrad)
  { levelNum: 500, semester: 1, maxCredits: 21, maxCarryOver: 6, maxBorrowed: 6 },
  { levelNum: 500, semester: 2, maxCredits: 21, maxCarryOver: 6, maxBorrowed: 6 },
  { levelNum: 600, semester: 1, maxCredits: 21, maxCarryOver: 6, maxBorrowed: 6 },
  { levelNum: 600, semester: 2, maxCredits: 21, maxCarryOver: 6, maxBorrowed: 6 },
  // 700–800L (research heavy)
  { levelNum: 700, semester: 1, maxCredits: 18, maxCarryOver: 6, maxBorrowed: 6 },
  { levelNum: 700, semester: 2, maxCredits: 18, maxCarryOver: 6, maxBorrowed: 6 },
  { levelNum: 800, semester: 1, maxCredits: 16, maxCarryOver: 6, maxBorrowed: 6 },
  { levelNum: 800, semester: 2, maxCredits: 16, maxCarryOver: 6, maxBorrowed: 6 },
];

await prisma.levelSemesterConfig.createMany({
  data: creditCaps.map(c => ({
    levelId:      getLevel(c.levelNum).id,
    semester:     c.semester,
    maxCredits:   c.maxCredits,
    maxCarryOver: c.maxCarryOver,
    maxBorrowed:  c.maxBorrowed,
  })),
  skipDuplicates: true,
});
results.push(`✓ ${creditCaps.length} level/semester credit caps`);

      // ============================================
      // 2. COLLEGES - Bulk insert
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
      // 3. DEPARTMENTS - Bulk insert
      // ============================================
      progressBroadcaster.broadcastProgress('departments', 'Creating departments...', '57 departments', '🏢');
      
      const deptData = [
        // CAERSE
        { name: 'Agribusiness and Management', code: 'ABM', collegeCode: 'CAERSE' },
        { name: 'Agricultural Economics', code: 'AEC', collegeCode: 'CAERSE' },
        { name: 'Agricultural Extension and Rural Sociology', code: 'AERS', collegeCode: 'CAERSE' },
        // CASAP
        { name: 'Animal Breeding and Physiology', code: 'ABP', collegeCode: 'CASAP' },
        { name: 'Animal Nutrition and Forage Science', code: 'ANF', collegeCode: 'CASAP' },
        { name: 'Animal Production and Livestock Management', code: 'APL', collegeCode: 'CASAP' },
        // CAFST
        { name: 'Human Nutrition and Dietetics', code: 'HND', collegeCode: 'CAFST' },
        { name: 'Home Science, Hospitality Management & Tourism', code: 'HHT', collegeCode: 'CAFST' },
        { name: 'Food Science and Technology', code: 'FST', collegeCode: 'CAFST' },
        // CCSS
        { name: 'Agronomy', code: 'AGR', collegeCode: 'CCSS' },
        { name: 'Plant Health Management', code: 'PHM', collegeCode: 'CCSS' },
        { name: 'Soil Science and Meteorology', code: 'SSM', collegeCode: 'CCSS' },
        { name: 'Water Resources Management and Agrometeorology', code: 'WRM', collegeCode: 'CCSS' },
        // COED
        { name: 'Adult and Continuing Education', code: 'ACE', collegeCode: 'COED' },
        { name: 'Agricultural/Home Science Education', code: 'AHE', collegeCode: 'COED' },
        { name: 'Business Education', code: 'BED', collegeCode: 'COED' },
        { name: 'Economics Education', code: 'ECE', collegeCode: 'COED' },
        { name: 'Education Management', code: 'EDM', collegeCode: 'COED' },
        { name: 'Industrial Technology Education', code: 'ITE', collegeCode: 'COED' },
        { name: 'Library and Information Science', code: 'LIS', collegeCode: 'COED' },
        { name: 'Guidance and Counselling', code: 'GCA', collegeCode: 'COED' },
        { name: 'Integrated Science Education', code: 'ISE', collegeCode: 'COED' },
        // CEET
        { name: 'Agricultural and Bioresources Engineering', code: 'ABE', collegeCode: 'CEET' },
        { name: 'Civil Engineering', code: 'CVE', collegeCode: 'CEET' },
        { name: 'Chemical Engineering', code: 'CHE', collegeCode: 'CEET' },
        { name: 'Computer Engineering', code: 'CPE', collegeCode: 'CEET' },
        { name: 'Electrical and Electronics Engineering', code: 'EEE', collegeCode: 'CEET' },
        { name: 'Mechanical Engineering', code: 'MCE', collegeCode: 'CEET' },
        // COLMAS
        { name: 'Industrial Relations and Personnel Management', code: 'IRP', collegeCode: 'COLMAS' },
        { name: 'Human Resource Management', code: 'HRM', collegeCode: 'COLMAS' },
        { name: 'Business Administration', code: 'BUS', collegeCode: 'COLMAS' },
        { name: 'Accounting', code: 'ACC', collegeCode: 'COLMAS' },
        { name: 'Entrepreneurial Studies', code: 'ENT', collegeCode: 'COLMAS' },
        // CNREM
        { name: 'Environment Management and Toxicology', code: 'EMT', collegeCode: 'CNREM' },
        { name: 'Fisheries and Aquatic Resources Management', code: 'FAR', collegeCode: 'CNREM' },
        { name: 'Forestry and Environmental Management', code: 'FEM', collegeCode: 'CNREM' },
        // COLNAS
        { name: 'Biochemistry', code: 'BCH', collegeCode: 'COLNAS' },
        { name: 'Microbiology', code: 'MCB', collegeCode: 'COLNAS' },
        { name: 'Plant Science and Biotechnology', code: 'PSB', collegeCode: 'COLNAS' },
        { name: 'Zoology and Environmental Biology', code: 'ZEB', collegeCode: 'COLNAS' },
        // COLPAS
        { name: 'Chemistry', code: 'CHM', collegeCode: 'COLPAS' },
        { name: 'Computer Science', code: 'CSC', collegeCode: 'COLPAS' },
        { name: 'Geology', code: 'GLG', collegeCode: 'COLPAS' },
        { name: 'Mathematics', code: 'MTH', collegeCode: 'COLPAS' },
        { name: 'Physics', code: 'PHY', collegeCode: 'COLPAS' },
        { name: 'Statistics', code: 'STA', collegeCode: 'COLPAS' },
        // CVM
        { name: 'Theriogenology', code: 'THR', collegeCode: 'CVM' },
        { name: 'Veterinary Anatomy', code: 'VAM', collegeCode: 'CVM' },
        { name: 'Veterinary Medicine', code: 'VET', collegeCode: 'CVM' },
        { name: 'Veterinary Microbiology', code: 'VMB', collegeCode: 'CVM' },
        { name: 'Veterinary Public Health and Preventive Medicine', code: 'VPH', collegeCode: 'CVM' },
        { name: 'Veterinary Surgery and Radiology', code: 'VSR', collegeCode: 'CVM' },
        // SGS
        { name: 'English', code: 'ENG', collegeCode: 'SGS' },
        { name: 'French', code: 'FRN', collegeCode: 'SGS' },
        { name: 'German', code: 'GER', collegeCode: 'SGS' },
        { name: 'History', code: 'HIS', collegeCode: 'SGS' },
        { name: 'Social Science', code: 'SOC', collegeCode: 'SGS' },
        { name: 'Physical and Health Education', code: 'PHE', collegeCode: 'SGS' },
        { name: 'Philosophy', code: 'PHL', collegeCode: 'SGS' },
        { name: 'Peace and Conflict Studies', code: 'PCS', collegeCode: 'SGS' },
      ];
      
      const deptCreateData = deptData.map(d => ({
        name: d.name,
        code: d.code,
        collegeId: getCollege(d.collegeCode).id,
      }));
      
      await prisma.department.createMany({ data: deptCreateData, skipDuplicates: true });
      const departments = await prisma.department.findMany();
      results.push(`✓ ${departments.length} departments`);
      progressBroadcaster.broadcastProgress('departments', 'Departments created', '57 departments', '🏢✅');

      const getDept = (code: string) => {
        const d = departments.find(d => d.code === code);
        if (!d) throw new Error(`Department not found: ${code}`);
        return d;
      };

      // ============================================
      // 4. PASSWORDS - Pre-hash
      // ============================================
      const [adminPass, lecturerPass, invigilatorPass, studentPass] = await Promise.all([
        hashPassword('admin123'),
        hashPassword('lecturer123'),
        hashPassword('invigilator123'),
        hashPassword('student123'),
      ]);

      // ============================================
      // 5. USERS - Bulk insert all at once
      // ============================================
      progressBroadcaster.broadcastProgress('users', 'Creating user accounts...', 'Admins, Lecturers, Invigilators, Students', '👥');
      
      const allUsersToCreate: any[] = [];
      
      // Admins
      const adminData = [
        { email: 'admin@mouau.edu.ng', fullName: 'Admin One', staffId: 'SU310449', role: 'admin' },
        { email: 'admin2@mouau.edu.ng', fullName: 'Admin Two', staffId: 'ADM002', role: 'admin' },
        { email: 'admin3@mouau.edu.ng', fullName: 'Admin Three', staffId: 'ADM003', role: 'admin' },
        { email: 'ogwogp@mmouau.edu.ng', fullName: 'Ogwo GP', staffId: 'ADM310449', role: 'admin'}
      ];
      
      adminData.forEach(a => {
        allUsersToCreate.push({
          email: a.email,
          fullName: a.fullName,
          passwordHash: adminPass,
          role: 'admin',
          staffId: a.staffId,
          session: '2025/2026',
        });
      });
      
      // Lecturers
      const lecturerData = [
        // COLPAS
        { email: 'dr.okafor@mouau.edu.ng', fullName: 'Dr. Emeka Okafor', staffId: 'LCT001', deptCode: 'CSC' },
        { email: 'prof.nwosu@mouau.edu.ng', fullName: 'Prof. Adaeze Nwosu', staffId: 'LCT002', deptCode: 'MTH' },
        { email: 'dr.uche@mouau.edu.ng', fullName: 'Dr. Uche Anyanwu', staffId: 'LCT003', deptCode: 'STA' },
        { email: 'dr.okoro@mouau.edu.ng', fullName: 'Dr. Chika Okoro', staffId: 'LCT004', deptCode: 'PHY' },
        { email: 'prof.obiora@mouau.edu.ng', fullName: 'Prof. Obiora Kalu', staffId: 'LCT005', deptCode: 'CHM' },
        { email: 'dr.agbo@mouau.edu.ng', fullName: 'Dr. Ifenna Agbo', staffId: 'LCT006', deptCode: 'GLG' },
        // CEET
        { email: 'dr.adekunle@mouau.edu.ng', fullName: 'Dr. Adekunle Williams', staffId: 'LCT007', deptCode: 'EEE' },
        { email: 'prof.obi@mouau.edu.ng', fullName: 'Prof. Eze Obi', staffId: 'LCT008', deptCode: 'CVE' },
        { email: 'dr.nwafor@mouau.edu.ng', fullName: 'Dr. Kelechi Nwafor', staffId: 'LCT009', deptCode: 'MCE' },
        { email: 'dr.onuoha@mouau.edu.ng', fullName: 'Dr. Sylvester Onuoha', staffId: 'LCT010', deptCode: 'CHE' },
        { email: 'dr.ikenna@mouau.edu.ng', fullName: 'Dr. Ikenna Ozoemena', staffId: 'LCT011', deptCode: 'CPE' },
        { email: 'prof.ani@mouau.edu.ng', fullName: 'Prof. Basil Ani', staffId: 'LCT012', deptCode: 'ABE' },
        // COLMAS
        { email: 'prof.ekwueme@mouau.edu.ng', fullName: 'Prof. Ngozi Ekwueme', staffId: 'LCT013', deptCode: 'HRM' },
        { email: 'dr.onyekachi@mouau.edu.ng', fullName: 'Dr. Onyekachi Mbah', staffId: 'LCT014', deptCode: 'ACC' },
        { email: 'dr.okonkwo@mouau.edu.ng', fullName: 'Dr. Amaka Okonkwo', staffId: 'LCT015', deptCode: 'BUS' },
        { email: 'dr.nweze@mouau.edu.ng', fullName: 'Dr. Fabian Nweze', staffId: 'LCT016', deptCode: 'IRP' },
        { email: 'dr.chukwudi@mouau.edu.ng', fullName: 'Dr. Chukwudi Okeke', staffId: 'LCT017', deptCode: 'ENT' },
        // COLNAS
        { email: 'dr.ibrahim@mouau.edu.ng', fullName: 'Dr. Musa Ibrahim', staffId: 'LCT018', deptCode: 'BCH' },
        { email: 'dr.eze@mouau.edu.ng', fullName: 'Dr. Ogechukwu Eze', staffId: 'LCT019', deptCode: 'MCB' },
        { email: 'dr.ugwu@mouau.edu.ng', fullName: 'Dr. Chibuike Ugwu', staffId: 'LCT020', deptCode: 'ZEB' },
        { email: 'dr.odum@mouau.edu.ng', fullName: 'Dr. Stella Odum', staffId: 'LCT021', deptCode: 'PSB' },
        // CAFST
        { email: 'prof.amadi@mouau.edu.ng', fullName: 'Prof. Chidinma Amadi', staffId: 'LCT022', deptCode: 'FST' },
        { email: 'dr.okafor2@mouau.edu.ng', fullName: 'Dr. Ngozi Okafor', staffId: 'LCT023', deptCode: 'HND' },
        { email: 'dr.agu@mouau.edu.ng', fullName: 'Dr. Chinwe Agu', staffId: 'LCT024', deptCode: 'HHT' },
        // CAERSE
        { email: 'prof.onwumere@mouau.edu.ng', fullName: 'Prof. Joseph Onwumere', staffId: 'LCT025', deptCode: 'AEC' },
        { email: 'dr.nwachukwu@mouau.edu.ng', fullName: 'Dr. Uchenna Nwachukwu', staffId: 'LCT026', deptCode: 'ABM' },
        { email: 'dr.nwankwo@mouau.edu.ng', fullName: 'Dr. Victor Nwankwo', staffId: 'LCT027', deptCode: 'AERS' },
        // CASAP
        { email: 'prof.nwachukwu2@mouau.edu.ng', fullName: 'Prof. Gerald Nwachukwu', staffId: 'LCT028', deptCode: 'ABP' },
        { email: 'dr.ofor@mouau.edu.ng', fullName: 'Dr. Patricia Ofor', staffId: 'LCT029', deptCode: 'ANF' },
        { email: 'dr.egbe@mouau.edu.ng', fullName: 'Dr. Emmanuel Egbe', staffId: 'LCT030', deptCode: 'APL' },
        // CCSS
        { email: 'prof.obiefune@mouau.edu.ng', fullName: 'Prof. Isaac Obiefune', staffId: 'LCT031', deptCode: 'AGR' },
        { email: 'dr.onwudiwe@mouau.edu.ng', fullName: 'Dr. Chinyere Onwudiwe', staffId: 'LCT032', deptCode: 'PHM' },
        { email: 'dr.okeke@mouau.edu.ng', fullName: 'Dr. Michael Okeke', staffId: 'LCT033', deptCode: 'SSM' },
        { email: 'dr.ibekwe@mouau.edu.ng', fullName: 'Dr. Emmanuel Ibekwe', staffId: 'LCT034', deptCode: 'WRM' },
        // COED
        { email: 'prof.nwosu2@mouau.edu.ng', fullName: 'Prof. Rose Nwosu', staffId: 'LCT035', deptCode: 'ACE' },
        { email: 'dr.ugochukwu@mouau.edu.ng', fullName: 'Dr. Ugo Ugochukwu', staffId: 'LCT036', deptCode: 'LIS' },
        { email: 'dr.obasi@mouau.edu.ng', fullName: 'Dr. Ngozi Obasi', staffId: 'LCT037', deptCode: 'GCA' },
        { email: 'dr.dibia@mouau.edu.ng', fullName: 'Dr. Ikechukwu Dibia', staffId: 'LCT038', deptCode: 'ISE' },
        // CNREM
        { email: 'prof.okeke2@mouau.edu.ng', fullName: 'Prof. Vincent Okeke', staffId: 'LCT039', deptCode: 'EMT' },
        { email: 'dr.ezeji@mouau.edu.ng', fullName: 'Dr. Chinyelu Ezeji', staffId: 'LCT040', deptCode: 'FAR' },
        { email: 'dr.nwite@mouau.edu.ng', fullName: 'Dr. John Nwite', staffId: 'LCT041', deptCode: 'FEM' },
        // CVM
        { email: 'prof.cvm@mouau.edu.ng', fullName: 'Prof. Samuel Onyekachi', staffId: 'LCT042', deptCode: 'VET' },
        { email: 'dr.okoye@mouau.edu.ng', fullName: 'Dr. Anthony Okoye', staffId: 'LCT043', deptCode: 'VAM' },
        { email: 'dr.ohiri@mouau.edu.ng', fullName: 'Dr. Ifeanyi Ohiri', staffId: 'LCT044', deptCode: 'VMB' },
        // SGS
        { email: 'dr.nzeka@mouau.edu.ng', fullName: 'Dr. Nnamdi Nzeka', staffId: 'LCT045', deptCode: 'ENG' },
        { email: 'dr.fourier@mouau.edu.ng', fullName: 'Dr. Jean Fourier', staffId: 'LCT046', deptCode: 'FRN' },
        { email: 'dr.braun@mouau.edu.ng', fullName: 'Dr. Klaus Braun', staffId: 'LCT047', deptCode: 'GER' },
        { email: 'dr.okoro2@mouau.edu.ng', fullName: 'Dr. Emmanuel Okoro', staffId: 'LCT048', deptCode: 'HIS' },
        { email: 'dr.osuji@mouau.edu.ng', fullName: 'Dr. Pamela Osuji', staffId: 'LCT049', deptCode: 'PHL' },
      ];
      
      lecturerData.forEach(l => {
        const dept = getDept(l.deptCode);
        allUsersToCreate.push({
          email: l.email,
          fullName: l.fullName,
          passwordHash: lecturerPass,
          role: 'lecturer',
          staffId: l.staffId,
          collegeId: dept.collegeId,
          departmentId: dept.id,
          session: '2025/2026',
        });
      });
      
      // Invigilators
      const invigilatorData = [
        { email: 'invig1@mouau.edu.ng', fullName: 'Mr. Chidi Eze', staffId: 'INV001', deptCode: 'CSC' },
        { email: 'invig2@mouau.edu.ng', fullName: 'Mrs. Ngozi Obi', staffId: 'INV002', deptCode: 'EEE' },
        { email: 'invig3@mouau.edu.ng', fullName: 'Mr. Emeka Nwachukwu', staffId: 'INV003', deptCode: 'MCB' },
        { email: 'invig4@mouau.edu.ng', fullName: 'Mrs. Funke Adeniyi', staffId: 'INV004', deptCode: 'HRM' },
        { email: 'invig5@mouau.edu.ng', fullName: 'Mr. John Doe', staffId: 'INV005', deptCode: 'CSC' },
        { email: 'invig6@mouau.edu.ng', fullName: 'Mrs. Jane Smith', staffId: 'INV006', deptCode: 'EEE' },
        { email: 'invig7@mouau.edu.ng', fullName: 'Mr. David Johnson', staffId: 'INV007', deptCode: 'PHY' },
        { email: 'invig8@mouau.edu.ng', fullName: 'Mrs. Adaora Nnaji', staffId: 'INV008', deptCode: 'FST' },
        { email: 'invig9@mouau.edu.ng', fullName: 'Mr. Obinna Eze', staffId: 'INV009', deptCode: 'ACC' },
        { email: 'invig10@mouau.edu.ng', fullName: 'Ms. Amaka Ude', staffId: 'INV010', deptCode: 'VET' },
      ];
      
      invigilatorData.forEach(i => {
        const dept = getDept(i.deptCode);
        allUsersToCreate.push({
          email: i.email,
          fullName: i.fullName,
          passwordHash: invigilatorPass,
          role: 'invigilator',
          staffId: i.staffId,
          collegeId: dept.collegeId,
          departmentId: dept.id,
          session: '2025/2026',
        });
      });
      
      // Students
      const studentData = [
        // 100L Students - PHY
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
        // 100L Students - CSC
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
        // 100L Students - CHM, MTH, STA, GLG
        { email: 'nnamdi.agu05@student.mouau.edu.ng', fullName: 'Nnamdi Agu', deptCode: 'CHM', matric: 'MOUAU/CHM/25/141516', levelNum: 100, session: '2025/2026' },
        { email: 'obinna.obi06@student.mouau.edu.ng', fullName: 'Obinna Obi', deptCode: 'MTH', matric: 'MOUAU/MTH/25/151617', levelNum: 100, session: '2025/2026' },
        { email: 'patience.aka07@student.mouau.edu.ng', fullName: 'Patience Aka', deptCode: 'STA', matric: 'MOUAU/STA/25/161718', levelNum: 100, session: '2025/2026' },
        { email: 'queen.etuk08@student.mouau.edu.ng', fullName: 'Queen Etuk', deptCode: 'GLG', matric: 'MOUAU/GLG/25/171819', levelNum: 100, session: '2025/2026' },
        // 200-400L Students - CSC
        { email: 'alice.obi@student.mouau.edu.ng', fullName: 'Alice Obi', deptCode: 'CSC', matric: '2021/CSC/001', levelNum: 300, session: '2025/2026' },
        { email: 'bob.nwachukwu@student.mouau.edu.ng', fullName: 'Bob Nwachukwu', deptCode: 'CSC', matric: '2021/CSC/002', levelNum: 300, session: '2025/2026' },
        { email: 'chidi.okeke@student.mouau.edu.ng', fullName: 'Chidi Okeke', deptCode: 'CSC', matric: '2021/CSC/003', levelNum: 300, session: '2025/2026' },
        { email: 'emeka.agu@student.mouau.edu.ng', fullName: 'Emeka Agu', deptCode: 'CSC', matric: '2022/CSC/001', levelNum: 200, session: '2025/2026' },
        { email: 'funke.adeyemi@student.mouau.edu.ng', fullName: 'Funke Adeyemi', deptCode: 'CSC', matric: '2022/CSC/002', levelNum: 200, session: '2025/2026' },
        { email: 'grace.uko@student.mouau.edu.ng', fullName: 'Grace Uko', deptCode: 'CSC', matric: '2020/CSC/001', levelNum: 400, session: '2025/2026' },
        { email: 'ifeoma.ogu@student.mouau.edu.ng', fullName: 'Ifeoma Ogu', deptCode: 'CSC', matric: '2023/CSC/001', levelNum: 100, session: '2025/2026' },
        // Previous sessions
        { email: 'dalu.eze@student.mouau.edu.ng', fullName: 'Dalu Eze', deptCode: 'CSC', matric: '2021/CSC/004', levelNum: 300, session: '2024/2025' },
        { email: 'henry.dim@student.mouau.edu.ng', fullName: 'Henry Dim', deptCode: 'CSC', matric: '2020/CSC/002', levelNum: 400, session: '2024/2025' },
        { email: 'james.oti@student.mouau.edu.ng', fullName: 'James Oti', deptCode: 'CSC', matric: '2023/CSC/002', levelNum: 100, session: '2024/2025' },
        // Other departments
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
      ];
      
      studentData.forEach(s => {
        const dept = getDept(s.deptCode);
        const level = getLevel(s.levelNum);
        allUsersToCreate.push({
          email: s.email,
          fullName: s.fullName,
          passwordHash: studentPass,
          role: 'student',
          matricNumber: s.matric,
          collegeId: dept.collegeId,
          departmentId: dept.id,
          levelId: level.id,
          session: s.session,
        });
      });
      
      // Bulk insert all users at once
      await prisma.user.createMany({ data: allUsersToCreate, skipDuplicates: true });
      const allUsers = await prisma.user.findMany();
      const students = allUsers.filter(u => u.role === 'student');
      const lecturers = allUsers.filter(u => u.role === 'lecturer');
      const invigilators = allUsers.filter(u => u.role === 'invigilator');
      const admins = allUsers.filter(u => u.role === 'admin');
      
      results.push(`✓ ${admins.length} admins, ${lecturers.length} lecturers, ${invigilators.length} invigilators, ${students.length} students`);
      progressBroadcaster.broadcastProgress('users', 'User accounts created', `${allUsers.length} total users`, '👥✅');

      // ============================================
      // 6. COURSES - Bulk insert by department with semester
      // ============================================
      progressBroadcaster.broadcastProgress('courses', 'Creating courses...', 'Building course list', '📚');
      
      const allCoursesToCreate: any[] = [];
      
      // Helper to add courses with explicit semester
      const addCourses = (deptCode: string, courses: Array<{code: string, title: string, level: number, credits?: number, semester: number}>) => {
        const dept = getDept(deptCode);
        courses.forEach(c => {
          allCoursesToCreate.push({
            code: c.code,
            title: c.title,
            departmentId: dept.id,
            creditUnits: c.credits || courseCredits(deptCode, c.level),
            level: c.level,
            semester: c.semester, // Explicit semester from the course definition
          });
        });
      };
      
      // CSC Courses with explicit semesters
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
      
      // MTH Courses with explicit semesters
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
      
      // PHY Courses with explicit semesters
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
      
      // CHM Courses with explicit semesters
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
      
      // STA Courses with explicit semesters
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
      
      // GLG Courses with explicit semesters
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
      
      // EEE Courses with explicit semesters
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
      
      // CVE Courses with explicit semesters
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
      
      // MCE Courses with explicit semesters
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
      
      // CHE Courses with explicit semesters
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
      
      // CPE Courses with explicit semesters
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
      
      // ACC Courses with explicit semesters
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
      
      // HRM Courses with explicit semesters
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
      
      // BUS Courses with explicit semesters
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
      
      // BCH Courses with explicit semesters
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
      
      // MCB Courses with explicit semesters
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
      
      // GST Courses (General Studies) with explicit semesters
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
        allCoursesToCreate.push({
          code: c.code,
          title: c.title,
          departmentId: gstDept.id,
          creditUnits: c.credits,
          level: c.level,
          semester: c.semester,
        });
      });
      
      // Add more departments as needed (ABM, AEC, AERS, ABP, ANF, APL, FST, HND, HHT, AGR, PHM, SSM, WRM, etc.)
      // For brevity, I'm showing key departments - add the rest following the same pattern
      
      // Bulk insert all courses
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
      // 7. COURSE REGISTRATIONS - Bulk insert with semester
      // ============================================
      progressBroadcaster.broadcastProgress('registrations', 'Registering students for courses...', 'Building registrations', '📋');
      
      const registrationData: any[] = [];
      
      for (const student of students) {
        const studentLevel = student.levelId;
        const studentLevelNum = levels.find(l => l.id === studentLevel)?.level || 100;
        
        // Get courses for student's department
        const deptCourses = courses.filter(c => c.departmentId === student.departmentId);
        
        for (const course of deptCourses) {
          const diff = studentLevelNum - course.level;
          // Allow same level, levels below (carry-over)
          if (diff === 0 || (diff > 0 && diff <= 100)) {
            const regType = diff === 0 ? 'normal' : 'carry_over';
            const status = regType === 'normal' ? 'approved' : 'pending';
            
            // Register for the specific semester the course belongs to
            registrationData.push({
              studentId: student.id,
              courseId: course.id,
              session: student.session,
              semester: course.semester, // Use the course's semester
              levelId: studentLevel,
              registrationType: regType,
              status: status,
            });
          }
        }
        
        // Add GST courses for matching level and semester
        const studentGstCourses = gstCourses.filter(g => g.level === studentLevelNum);
        for (const gst of studentGstCourses) {
          const gstCourse = courses.find(c => c.code === gst.code);
          if (gstCourse) {
            registrationData.push({
              studentId: student.id,
              courseId: gstCourse.id,
              session: student.session,
              semester: gstCourse.semester,
              levelId: studentLevel,
              registrationType: 'normal',
              status: 'approved',
            });
          }
        }
      }
      
      // Bulk insert registrations
      await prisma.courseRegistration.createMany({ data: registrationData, skipDuplicates: true });
      results.push(`✓ ${registrationData.length} course registrations`);
      progressBroadcaster.broadcastProgress('registrations', 'Registrations completed', `${registrationData.length} registrations`, '📋✅');

      // ============================================
      // 8. EXAM - Create exam records
      // ============================================
      progressBroadcaster.broadcastProgress('exam', 'Creating exam records...', 'Setting up exams', '📝');
      
      const EXAM_ID = '00000000-0000-0000-0000-000000000001';
      const cscLecturer = lecturers.find(l => l.departmentId === getDept('CSC').id) || lecturers[0];
      
      const exam = await prisma.exam.upsert({
        where: { id: EXAM_ID },
        update: {},
        create: {
          id: EXAM_ID,
          courseId: getCourse('CSC301').id,
          createdBy: cscLecturer.id,
          title: 'CSC301 — First Semester Examination',
          instructions: 'Answer all questions. No external resources. Time limit strictly enforced.',
          durationMinutes: 60,
          totalMarks: 40,
          passMark: 20,
          status: 'active',
          scheduledStart: new Date(),
          scheduledEnd: new Date(Date.now() + 2 * 60 * 60 * 1000),
          randomizeQuestions: true,
          randomizeOptions: true,
          questionsToPresent: 12,
          showResultAfter: true,
          maxViolations: 5,
          session: '2025/2026',
          semester: 1,
          levels: {
            connect: [getLevel(300), getLevel(400)].map(l => ({ id: l.id })),
          },
        },
      });
      
      // Second exam
      const EXAM_ID_2 = '00000000-0000-0000-0000-000000000002';
      const accLecturer = lecturers.find(l => l.departmentId === getDept('ACC').id) || lecturers[0];
      
      await prisma.exam.upsert({
        where: { id: EXAM_ID_2 },
        update: {},
        create: {
          id: EXAM_ID_2,
          courseId: getCourse('ACC201').id,
          createdBy: accLecturer.id,
          title: 'ACC201 — Management Accounting Mid-Semester',
          instructions: 'Answer all questions. Calculators not permitted.',
          durationMinutes: 45,
          totalMarks: 30,
          passMark: 15,
          status: 'scheduled',
          scheduledStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
          scheduledEnd: new Date(Date.now() + 26 * 60 * 60 * 1000),
          randomizeQuestions: true,
          randomizeOptions: true,
          questionsToPresent: 10,
          showResultAfter: false,
          maxViolations: 3,
          session: '2025/2026',
          semester: 1,
          levels: {
            connect: [getLevel(200)].map(l => ({ id: l.id })),
          },
        },
      });
      
      if (invigilators.length > 0) {
        await prisma.examInvigilator.upsert({
          where: { examId_invigilatorId: { examId: exam.id, invigilatorId: invigilators[0].id } },
          update: {},
          create: { examId: exam.id, invigilatorId: invigilators[0].id },
        });
      }
      
      progressBroadcaster.broadcastProgress('exam', 'Exams created', '2 exams', '📝✅');

      // ============================================
      // 9. QUESTIONS - Bulk insert for exam
      // ============================================
      progressBroadcaster.broadcastProgress('questions', 'Creating exam questions...', 'Generating questions', '❓');
      
      const mcqData = [
        { body: 'Which data structure uses LIFO (Last In First Out) ordering?', topic: 'Data Structures', options: ['Queue', 'Stack', 'Linked List', 'Binary Tree'], correct: 1, marks: 3 },
        { body: 'What is the time complexity of binary search on a sorted array?', topic: 'Algorithms', options: ['O(n)', 'O(n²)', 'O(log n)', 'O(1)'], correct: 2, marks: 3 },
        { body: 'Which sorting algorithm has the best average-case time complexity?', topic: 'Sorting', options: ['Bubble Sort', 'Insertion Sort', 'Merge Sort', 'Selection Sort'], correct: 2, marks: 3 },
        { body: 'A graph with no cycles is called a ___.', topic: 'Graph Theory', options: ['Complete Graph', 'Tree', 'Bipartite Graph', 'Directed Graph'], correct: 1, marks: 3 },
        { body: 'Which traversal visits nodes in Left → Root → Right order?', topic: 'Trees', options: ['Preorder', 'Postorder', 'Inorder', 'Level Order'], correct: 2, marks: 3 },
        { body: 'What is the worst-case time complexity of QuickSort?', topic: 'Sorting', options: ['O(n log n)', 'O(n)', 'O(n²)', 'O(log n)'], correct: 2, marks: 3 },
        { body: 'Which data structure is used for implementing BFS?', topic: 'Graph Theory', options: ['Stack', 'Queue', 'Heap', 'Priority Queue'], correct: 1, marks: 3 },
        { body: 'In a max-heap, the root node contains the ___ element.', topic: 'Data Structures', options: ['Smallest', 'Median', 'Largest', 'Random'], correct: 2, marks: 3 },
        { body: 'What is the space complexity of merge sort?', topic: 'Sorting', options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], correct: 2, marks: 3 },
        { body: 'Which of these is a self-balancing binary search tree?', topic: 'Trees', options: ['Red-Black Tree', 'Complete Binary Tree', 'Min Heap', 'Trie'], correct: 0, marks: 3 },
      ];
      
      let qCount = 0;
      for (let i = 0; i < mcqData.length; i++) {
        const q = mcqData[i];
        const exists = await prisma.question.findFirst({
          where: { examId: exam.id, body: q.body }
        });
        
        if (!exists) {
          await prisma.question.create({
            data: {
              examId: exam.id,
              type: 'mcq',
              body: q.body,
              marks: q.marks,
              topic: q.topic,
              orderIndex: i,
              options: {
                create: q.options.map((text, j) => ({
                  optionText: text,
                  isCorrect: j === q.correct,
                  orderIndex: j
                })),
              },
            },
          });
          qCount++;
        }
      }
      
      results.push(`✓ ${qCount} questions`);
      progressBroadcaster.broadcastProgress('questions', 'Questions created', `${qCount} questions`, '❓✅');

      // ============================================
      // 10. NOTIFICATIONS - Bulk insert
      // ============================================
      progressBroadcaster.broadcastProgress('notifications', 'Creating welcome notifications...', 'For all users', '🔔');
      
      const notificationData = allUsers.map(user => ({
        userId: user.id,
        title: 'Welcome to MOUAU eTest',
        message: `Welcome, ${user.fullName}! Your account is ready. Log in to get started.`,
      }));
      
      await prisma.notification.createMany({ data: notificationData, skipDuplicates: true });
      results.push(`✓ ${notificationData.length} welcome notifications`);
      progressBroadcaster.broadcastProgress('notifications', 'Notifications created', `${notificationData.length} notifications`, '🔔✅');

      // ============================================
      // 11. USER PREFERENCES - Bulk insert
      // ============================================
      progressBroadcaster.broadcastProgress('preferences', 'Setting user preferences...', 'Default settings', '⚙️');
      
      const preferenceData = allUsers.map(user => ({
        userId: user.id,
        prefs: { theme: 'system', language: 'en', emailNotifications: true, fontSize: 'medium' },
      }));
      
      await prisma.userPreference.createMany({ data: preferenceData, skipDuplicates: true });
      results.push(`✓ ${preferenceData.length} user preferences`);
      progressBroadcaster.broadcastProgress('preferences', 'Preferences configured', `${preferenceData.length} preferences`, '⚙️✅');

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

    try {
      progressBroadcaster.broadcastProgress('reset', 'Resetting database...', 'Clearing all tables', '🗑️');
      
      // Delete in correct order to respect foreign key constraints
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
        prisma.course.deleteMany(),
        prisma.faceDescriptor.deleteMany(),
        prisma.passwordReset.deleteMany(),
        prisma.authSession.deleteMany(),
        prisma.notification.deleteMany(),
        prisma.userPreference.deleteMany(),
        prisma.auditLog.deleteMany(),
        prisma.apiAccessLog.deleteMany(),
        prisma.apiKey.deleteMany(),
        prisma.user.deleteMany(),
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