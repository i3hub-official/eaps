// src/routes/(admin)/seed/+page.server.ts
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireAdmin } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';
import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import { progressBroadcaster } from '$lib/server/progress-broadcaster';


const scryptAsync = promisify(scrypt);

// ── Guard ─────────────────────────────────────────────────────────────────────
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
    counts: { users: userCount, colleges: collegeCount, departments: departmentCount, courses: courseCount, exams: examCount, levels: levelCount },
    isFirstRun: userCount === 0,
  };
};

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString('hex')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Credit-unit helpers
// ─────────────────────────────────────────────────────────────────────────────
function credits100L(deptCode: string): number {
  const stem100 = ['CSC','STA','MTH','PHY','CHM','BCH','MCB','PSB','ZEB','GLG','ABE','CVE','CHE','CPE','EEE','MCE'];
  if (stem100.includes(deptCode)) return [2,2,3,3][Math.floor(Math.random() * 4)];
  return [1,1,2,2][Math.floor(Math.random() * 4)];
}

function creditsOther(): number {
  return [1,2,2,3,3][Math.floor(Math.random() * 5)];
}

function courseCredits(deptCode: string, level: number): number {
  return level === 100 ? credits100L(deptCode) : creditsOther();
}

export const actions: Actions = {
  seed: async ({ locals }) => {
    const userCount = await prisma.user.count();
    if (userCount > 0) requireAdmin(locals.user);

    try {
      const results: string[] = [];

      // ── Levels ────────────────────────────────────────────────────────────
      progressBroadcaster.broadcastProgress('levels', 'Creating levels...', '8 levels', '📊');
      const levelData = [
        { level: 100, name: '100 Level', order: 0, isDefault: true  },
        { level: 200, name: '200 Level', order: 1, isDefault: true  },
        { level: 300, name: '300 Level', order: 2, isDefault: true  },
        { level: 400, name: '400 Level', order: 3, isDefault: true  },
        { level: 500, name: '500 Level', order: 4, isDefault: true  },
        { level: 600, name: '600 Level', order: 5, isDefault: true  },
        { level: 700, name: '700 Level', order: 6, isDefault: false },
        { level: 800, name: '800 Level', order: 7, isDefault: false },
      ];

      const levels: any[] = [];
      for (const l of levelData) {
        const level = await prisma.level.upsert({
          where:  { level: l.level },
          update: {},
          create: l,
        });
        levels.push(level);
      }
      results.push(`✓ ${levels.length} levels`);
      progressBroadcaster.broadcastProgress('levels', 'Levels created', '8 levels', '📊✅');

      const getLevel = (levelNum: number) => {
        const lvl = levels.find(l => l.level === levelNum);
        if (!lvl) throw new Error(`Level not found: ${levelNum}`);
        return lvl;
      };

      // ── Colleges ──────────────────────────────────────────────────────────
      progressBroadcaster.broadcastProgress('colleges', 'Creating colleges...', '12 colleges', '🏛️');
      const collegeData = [
        { name: 'College of Agricultural Economics, Rural Sociology & Extension', code: 'CAERSE', abbreviation: 'CAERSE' },
        { name: 'College of Animal Science & Animal Production',                  code: 'CASAP',  abbreviation: 'CASAP'  },
        { name: 'College of Applied Food Science & Tourism',                      code: 'CAFST',  abbreviation: 'CAFST'  },
        { name: 'College of Crop & Soil Sciences',                                code: 'CCSS',   abbreviation: 'CCSS'   },
        { name: 'College of Education',                                           code: 'COED',   abbreviation: 'COED'   },
        { name: 'College of Engineering & Engineering Technology',                code: 'CEET',   abbreviation: 'CEET'   },
        { name: 'College of Management Science',                                  code: 'COLMAS', abbreviation: 'COLMAS' },
        { name: 'College of Natural Resources & Environmental Management',        code: 'CNREM',  abbreviation: 'CNREM'  },
        { name: 'College of Natural Science',                                     code: 'COLNAS', abbreviation: 'COLNAS' },
        { name: 'College of Physical & Applied Science',                          code: 'COLPAS', abbreviation: 'COLPAS' },
        { name: 'College of Veterinary Medicine',                                 code: 'CVM',    abbreviation: 'CVM'    },
        { name: 'School of General Studies',                                      code: 'SGS',    abbreviation: 'SGS'    },
      ];

      const colleges: any[] = [];
      for (const c of collegeData) {
        const college = await prisma.college.upsert({
          where:  { name: c.name },
          update: {},
          create: c,
        });
        colleges.push(college);
      }
      results.push(`✓ ${colleges.length} colleges`);
      progressBroadcaster.broadcastProgress('colleges', 'Colleges created', '12 colleges', '🏛️✅');

      const getCollege = (code: string) => {
        const c = colleges.find(c => c.code === code);
        if (!c) throw new Error(`College not found: ${code}`);
        return c;
      };

      // ── Departments ───────────────────────────────────────────────────────
      progressBroadcaster.broadcastProgress('departments', 'Creating departments...', '57 departments', '🏢');
      const deptData = [
        // CAERSE
        { name: 'Agribusiness and Management',                      code: 'ABM',  collegeCode: 'CAERSE' },
        { name: 'Agricultural Economics',                           code: 'AEC',  collegeCode: 'CAERSE' },
        { name: 'Agricultural Extension and Rural Sociology',       code: 'AERS', collegeCode: 'CAERSE' },
        // CASAP
        { name: 'Animal Breeding and Physiology',                   code: 'ABP',  collegeCode: 'CASAP' },
        { name: 'Animal Nutrition and Forage Science',              code: 'ANF',  collegeCode: 'CASAP' },
        { name: 'Animal Production and Livestock Management',       code: 'APL',  collegeCode: 'CASAP' },
        // CAFST
        { name: 'Human Nutrition and Dietetics',                    code: 'HND',  collegeCode: 'CAFST' },
        { name: 'Home Science, Hospitality Management & Tourism',   code: 'HHT',  collegeCode: 'CAFST' },
        { name: 'Food Science and Technology',                      code: 'FST',  collegeCode: 'CAFST' },
        // CCSS
        { name: 'Agronomy',                                         code: 'AGR',  collegeCode: 'CCSS' },
        { name: 'Plant Health Management',                          code: 'PHM',  collegeCode: 'CCSS' },
        { name: 'Soil Science and Meteorology',                     code: 'SSM',  collegeCode: 'CCSS' },
        { name: 'Water Resources Management and Agrometeorology',   code: 'WRM',  collegeCode: 'CCSS' },
        // COED
        { name: 'Adult and Continuing Education',                   code: 'ACE',  collegeCode: 'COED' },
        { name: 'Agricultural/Home Science Education',              code: 'AHE',  collegeCode: 'COED' },
        { name: 'Business Education',                               code: 'BED',  collegeCode: 'COED' },
        { name: 'Economics Education',                              code: 'ECE',  collegeCode: 'COED' },
        { name: 'Education Management',                             code: 'EDM',  collegeCode: 'COED' },
        { name: 'Industrial Technology Education',                  code: 'ITE',  collegeCode: 'COED' },
        { name: 'Library and Information Science',                  code: 'LIS',  collegeCode: 'COED' },
        { name: 'Guidance and Counselling',                         code: 'GCA',  collegeCode: 'COED' },
        { name: 'Integrated Science Education',                     code: 'ISE',  collegeCode: 'COED' },
        // CEET
        { name: 'Agricultural and Bioresources Engineering',        code: 'ABE',  collegeCode: 'CEET' },
        { name: 'Civil Engineering',                                code: 'CVE',  collegeCode: 'CEET' },
        { name: 'Chemical Engineering',                             code: 'CHE',  collegeCode: 'CEET' },
        { name: 'Computer Engineering',                             code: 'CPE',  collegeCode: 'CEET' },
        { name: 'Electrical and Electronics Engineering',           code: 'EEE',  collegeCode: 'CEET' },
        { name: 'Mechanical Engineering',                           code: 'MCE',  collegeCode: 'CEET' },
        // COLMAS
        { name: 'Industrial Relations and Personnel Management',    code: 'IRP',  collegeCode: 'COLMAS' },
        { name: 'Human Resource Management',                        code: 'HRM',  collegeCode: 'COLMAS' },
        { name: 'Business Administration',                          code: 'BUS',  collegeCode: 'COLMAS' },
        { name: 'Accounting',                                       code: 'ACC',  collegeCode: 'COLMAS' },
        { name: 'Entrepreneurial Studies',                          code: 'ENT',  collegeCode: 'COLMAS' },
        // CNREM
        { name: 'Environment Management and Toxicology',            code: 'EMT',  collegeCode: 'CNREM' },
        { name: 'Fisheries and Aquatic Resources Management',       code: 'FAR',  collegeCode: 'CNREM' },
        { name: 'Forestry and Environmental Management',            code: 'FEM',  collegeCode: 'CNREM' },
        // COLNAS
        { name: 'Biochemistry',                                     code: 'BCH',  collegeCode: 'COLNAS' },
        { name: 'Microbiology',                                     code: 'MCB',  collegeCode: 'COLNAS' },
        { name: 'Plant Science and Biotechnology',                  code: 'PSB',  collegeCode: 'COLNAS' },
        { name: 'Zoology and Environmental Biology',                code: 'ZEB',  collegeCode: 'COLNAS' },
        // COLPAS
        { name: 'Chemistry',                                        code: 'CHM',  collegeCode: 'COLPAS' },
        { name: 'Computer Science',                                 code: 'CSC',  collegeCode: 'COLPAS' },
        { name: 'Geology',                                          code: 'GLG',  collegeCode: 'COLPAS' },
        { name: 'Mathematics',                                      code: 'MTH',  collegeCode: 'COLPAS' },
        { name: 'Physics',                                          code: 'PHY',  collegeCode: 'COLPAS' },
        { name: 'Statistics',                                       code: 'STA',  collegeCode: 'COLPAS' },
        // CVM
        { name: 'Theriogenology',                                   code: 'THR',  collegeCode: 'CVM' },
        { name: 'Veterinary Anatomy',                               code: 'VAM',  collegeCode: 'CVM' },
        { name: 'Veterinary Medicine',                              code: 'VET',  collegeCode: 'CVM' },
        { name: 'Veterinary Microbiology',                          code: 'VMB',  collegeCode: 'CVM' },
        { name: 'Veterinary Public Health and Preventive Medicine', code: 'VPH',  collegeCode: 'CVM' },
        { name: 'Veterinary Surgery and Radiology',                 code: 'VSR',  collegeCode: 'CVM' },
        // SGS
        { name: 'English',                                          code: 'ENG',  collegeCode: 'SGS' },
        { name: 'French',                                           code: 'FRN',  collegeCode: 'SGS' },
        { name: 'German',                                           code: 'GER',  collegeCode: 'SGS' },
        { name: 'History',                                          code: 'HIS',  collegeCode: 'SGS' },
        { name: 'Social Science',                                   code: 'SOC',  collegeCode: 'SGS' },
        { name: 'Physical and Health Education',                    code: 'PHE',  collegeCode: 'SGS' },
        { name: 'Philosophy',                                       code: 'PHL',  collegeCode: 'SGS' },
        { name: 'Peace and Conflict Studies',                       code: 'PCS',  collegeCode: 'SGS' },
      ];

      const departments: any[] = [];
      for (const d of deptData) {
        const department = await prisma.department.upsert({
          where:  { code: d.code },
          update: {},
          create: { name: d.name, code: d.code, collegeId: getCollege(d.collegeCode).id },
        });
        departments.push(department);
      }
      results.push(`✓ ${departments.length} departments`);
      progressBroadcaster.broadcastProgress('departments', 'Departments created', '57 departments', '🏢✅');

      const getDept = (code: string) => {
        const d = departments.find(d => d.code === code);
        if (!d) throw new Error(`Department not found: ${code}`);
        return d;
      };

      // ── Passwords ─────────────────────────────────────────────────────────
      const [adminPass, lecturerPass, invigilatorPass, studentPass] = await Promise.all([
        hashPassword('admin123'),
        hashPassword('lecturer123'),
        hashPassword('invigilator123'),
        hashPassword('student123'),
      ]);

      // ── Admins ────────────────────────────────────────────────────────────
      progressBroadcaster.broadcastProgress('staff', 'Creating admin accounts...', '3 admins', '👥');
      const adminData = [
        { email: 'admin@mouau.edu.ng',  fullName: 'Ogwo GP',     staffId: 'SU310449' },
        { email: 'admin2@mouau.edu.ng', fullName: 'Admin Two',   staffId: 'ADM002'   },
        { email: 'admin3@mouau.edu.ng', fullName: 'Admin Three', staffId: 'ADM003'   },
      ];

      const admins: any[] = [];
      for (const a of adminData) {
        const admin = await prisma.user.upsert({
          where:  { email: a.email },
          update: {},
          create: {
            email: a.email, fullName: a.fullName,
            passwordHash: adminPass, role: 'admin',
            staffId: a.staffId, session: '2025/2026',
          },
        });
        admins.push(admin);
      }

      // ── Lecturers ─────────────────────────────────────────────────────────
      const lecturerData = [
        // COLPAS
        { email: 'dr.okafor@mouau.edu.ng',       fullName: 'Dr. Emeka Okafor',        staffId: 'LCT001', collegeCode: 'COLPAS', deptCode: 'CSC' },
        { email: 'prof.nwosu@mouau.edu.ng',      fullName: 'Prof. Adaeze Nwosu',      staffId: 'LCT002', collegeCode: 'COLPAS', deptCode: 'MTH' },
        { email: 'dr.uche@mouau.edu.ng',         fullName: 'Dr. Uche Anyanwu',        staffId: 'LCT003', collegeCode: 'COLPAS', deptCode: 'STA' },
        { email: 'dr.okoro@mouau.edu.ng',        fullName: 'Dr. Chika Okoro',         staffId: 'LCT004', collegeCode: 'COLPAS', deptCode: 'PHY' },
        { email: 'prof.obiora@mouau.edu.ng',     fullName: 'Prof. Obiora Kalu',       staffId: 'LCT005', collegeCode: 'COLPAS', deptCode: 'CHM' },
        { email: 'dr.agbo@mouau.edu.ng',         fullName: 'Dr. Ifenna Agbo',         staffId: 'LCT006', collegeCode: 'COLPAS', deptCode: 'GLG' },
        // CEET
        { email: 'dr.adekunle@mouau.edu.ng',     fullName: 'Dr. Adekunle Williams',   staffId: 'LCT007', collegeCode: 'CEET',   deptCode: 'EEE' },
        { email: 'prof.obi@mouau.edu.ng',        fullName: 'Prof. Eze Obi',           staffId: 'LCT008', collegeCode: 'CEET',   deptCode: 'CVE' },
        { email: 'dr.nwafor@mouau.edu.ng',       fullName: 'Dr. Kelechi Nwafor',      staffId: 'LCT009', collegeCode: 'CEET',   deptCode: 'MCE' },
        { email: 'dr.onuoha@mouau.edu.ng',       fullName: 'Dr. Sylvester Onuoha',    staffId: 'LCT010', collegeCode: 'CEET',   deptCode: 'CHE' },
        { email: 'dr.ikenna@mouau.edu.ng',       fullName: 'Dr. Ikenna Ozoemena',     staffId: 'LCT011', collegeCode: 'CEET',   deptCode: 'CPE' },
        { email: 'prof.ani@mouau.edu.ng',        fullName: 'Prof. Basil Ani',         staffId: 'LCT012', collegeCode: 'CEET',   deptCode: 'ABE' },
        // COLMAS
        { email: 'prof.ekwueme@mouau.edu.ng',    fullName: 'Prof. Ngozi Ekwueme',     staffId: 'LCT013', collegeCode: 'COLMAS', deptCode: 'HRM' },
        { email: 'dr.onyekachi@mouau.edu.ng',    fullName: 'Dr. Onyekachi Mbah',      staffId: 'LCT014', collegeCode: 'COLMAS', deptCode: 'ACC' },
        { email: 'dr.okonkwo@mouau.edu.ng',      fullName: 'Dr. Amaka Okonkwo',       staffId: 'LCT015', collegeCode: 'COLMAS', deptCode: 'BUS' },
        { email: 'dr.nweze@mouau.edu.ng',        fullName: 'Dr. Fabian Nweze',        staffId: 'LCT016', collegeCode: 'COLMAS', deptCode: 'IRP' },
        { email: 'dr.chukwudi@mouau.edu.ng',     fullName: 'Dr. Chukwudi Okeke',      staffId: 'LCT017', collegeCode: 'COLMAS', deptCode: 'ENT' },
        // COLNAS
        { email: 'dr.ibrahim@mouau.edu.ng',      fullName: 'Dr. Musa Ibrahim',        staffId: 'LCT018', collegeCode: 'COLNAS', deptCode: 'BCH' },
        { email: 'dr.eze@mouau.edu.ng',          fullName: 'Dr. Ogechukwu Eze',       staffId: 'LCT019', collegeCode: 'COLNAS', deptCode: 'MCB' },
        { email: 'dr.ugwu@mouau.edu.ng',         fullName: 'Dr. Chibuike Ugwu',       staffId: 'LCT020', collegeCode: 'COLNAS', deptCode: 'ZEB' },
        { email: 'dr.odum@mouau.edu.ng',         fullName: 'Dr. Stella Odum',         staffId: 'LCT021', collegeCode: 'COLNAS', deptCode: 'PSB' },
        // CAFST
        { email: 'prof.amadi@mouau.edu.ng',      fullName: 'Prof. Chidinma Amadi',    staffId: 'LCT022', collegeCode: 'CAFST',  deptCode: 'FST' },
        { email: 'dr.okafor2@mouau.edu.ng',      fullName: 'Dr. Ngozi Okafor',        staffId: 'LCT023', collegeCode: 'CAFST',  deptCode: 'HND' },
        { email: 'dr.agu@mouau.edu.ng',          fullName: 'Dr. Chinwe Agu',          staffId: 'LCT024', collegeCode: 'CAFST',  deptCode: 'HHT' },
        // CAERSE
        { email: 'prof.onwumere@mouau.edu.ng',   fullName: 'Prof. Joseph Onwumere',   staffId: 'LCT025', collegeCode: 'CAERSE', deptCode: 'AEC' },
        { email: 'dr.nwachukwu@mouau.edu.ng',    fullName: 'Dr. Uchenna Nwachukwu',   staffId: 'LCT026', collegeCode: 'CAERSE', deptCode: 'ABM' },
        { email: 'dr.nwankwo@mouau.edu.ng',      fullName: 'Dr. Victor Nwankwo',      staffId: 'LCT027', collegeCode: 'CAERSE', deptCode: 'AERS' },
        // CASAP
        { email: 'prof.nwachukwu2@mouau.edu.ng', fullName: 'Prof. Gerald Nwachukwu',  staffId: 'LCT028', collegeCode: 'CASAP',  deptCode: 'ABP' },
        { email: 'dr.ofor@mouau.edu.ng',         fullName: 'Dr. Patricia Ofor',       staffId: 'LCT029', collegeCode: 'CASAP',  deptCode: 'ANF' },
        { email: 'dr.egbe@mouau.edu.ng',         fullName: 'Dr. Emmanuel Egbe',       staffId: 'LCT030', collegeCode: 'CASAP',  deptCode: 'APL' },
        // CCSS
        { email: 'prof.obiefune@mouau.edu.ng',   fullName: 'Prof. Isaac Obiefune',    staffId: 'LCT031', collegeCode: 'CCSS',   deptCode: 'AGR' },
        { email: 'dr.onwudiwe@mouau.edu.ng',     fullName: 'Dr. Chinyere Onwudiwe',   staffId: 'LCT032', collegeCode: 'CCSS',   deptCode: 'PHM' },
        { email: 'dr.okeke@mouau.edu.ng',        fullName: 'Dr. Michael Okeke',       staffId: 'LCT033', collegeCode: 'CCSS',   deptCode: 'SSM' },
        { email: 'dr.ibekwe@mouau.edu.ng',       fullName: 'Dr. Emmanuel Ibekwe',     staffId: 'LCT034', collegeCode: 'CCSS',   deptCode: 'WRM' },
        // COED
        { email: 'prof.nwosu2@mouau.edu.ng',     fullName: 'Prof. Rose Nwosu',        staffId: 'LCT035', collegeCode: 'COED',   deptCode: 'ACE' },
        { email: 'dr.ugochukwu@mouau.edu.ng',    fullName: 'Dr. Ugo Ugochukwu',       staffId: 'LCT036', collegeCode: 'COED',   deptCode: 'LIS' },
        { email: 'dr.obasi@mouau.edu.ng',        fullName: 'Dr. Ngozi Obasi',         staffId: 'LCT037', collegeCode: 'COED',   deptCode: 'GCA' },
        { email: 'dr.dibia@mouau.edu.ng',        fullName: 'Dr. Ikechukwu Dibia',     staffId: 'LCT038', collegeCode: 'COED',   deptCode: 'ISE' },
        // CNREM
        { email: 'prof.okeke2@mouau.edu.ng',     fullName: 'Prof. Vincent Okeke',     staffId: 'LCT039', collegeCode: 'CNREM',  deptCode: 'EMT' },
        { email: 'dr.ezeji@mouau.edu.ng',        fullName: 'Dr. Chinyelu Ezeji',      staffId: 'LCT040', collegeCode: 'CNREM',  deptCode: 'FAR' },
        { email: 'dr.nwite@mouau.edu.ng',        fullName: 'Dr. John Nwite',          staffId: 'LCT041', collegeCode: 'CNREM',  deptCode: 'FEM' },
        // CVM
        { email: 'prof.cvm@mouau.edu.ng',        fullName: 'Prof. Samuel Onyekachi',  staffId: 'LCT042', collegeCode: 'CVM',    deptCode: 'VET' },
        { email: 'dr.okoye@mouau.edu.ng',        fullName: 'Dr. Anthony Okoye',       staffId: 'LCT043', collegeCode: 'CVM',    deptCode: 'VAM' },
        { email: 'dr.ohiri@mouau.edu.ng',        fullName: 'Dr. Ifeanyi Ohiri',       staffId: 'LCT044', collegeCode: 'CVM',    deptCode: 'VMB' },
        // SGS
        { email: 'dr.nzeka@mouau.edu.ng',        fullName: 'Dr. Nnamdi Nzeka',        staffId: 'LCT045', collegeCode: 'SGS',    deptCode: 'ENG' },
        { email: 'dr.fourier@mouau.edu.ng',      fullName: 'Dr. Jean Fourier',        staffId: 'LCT046', collegeCode: 'SGS',    deptCode: 'FRN' },
        { email: 'dr.braun@mouau.edu.ng',        fullName: 'Dr. Klaus Braun',         staffId: 'LCT047', collegeCode: 'SGS',    deptCode: 'GER' },
        { email: 'dr.okoro2@mouau.edu.ng',       fullName: 'Dr. Emmanuel Okoro',      staffId: 'LCT048', collegeCode: 'SGS',    deptCode: 'HIS' },
        { email: 'dr.osuji@mouau.edu.ng',        fullName: 'Dr. Pamela Osuji',        staffId: 'LCT049', collegeCode: 'SGS',    deptCode: 'PHL' },
      ];

      const lecturers: any[] = [];
      for (const l of lecturerData) {
        const lecturer = await prisma.user.upsert({
          where:  { email: l.email },
          update: {},
          create: {
            email: l.email, fullName: l.fullName,
            passwordHash: lecturerPass, role: 'lecturer', staffId: l.staffId,
            collegeId: getCollege(l.collegeCode).id,
            departmentId: getDept(l.deptCode).id,
            session: '2025/2026',
          },
        });
        lecturers.push(lecturer);
      }

      // ── Invigilators ──────────────────────────────────────────────────────
      const invigilatorData = [
        { email: 'invig1@mouau.edu.ng', fullName: 'Mr. Chidi Eze',         staffId: 'INV001', collegeCode: 'COLPAS', deptCode: 'CSC' },
        { email: 'invig2@mouau.edu.ng', fullName: 'Mrs. Ngozi Obi',        staffId: 'INV002', collegeCode: 'CEET',   deptCode: 'EEE' },
        { email: 'invig3@mouau.edu.ng', fullName: 'Mr. Emeka Nwachukwu',   staffId: 'INV003', collegeCode: 'COLNAS', deptCode: 'MCB' },
        { email: 'invig4@mouau.edu.ng', fullName: 'Mrs. Funke Adeniyi',    staffId: 'INV004', collegeCode: 'COLMAS', deptCode: 'HRM' },
        { email: 'invig5@mouau.edu.ng', fullName: 'Mr. John Doe',          staffId: 'INV005', collegeCode: 'COLPAS', deptCode: 'CSC' },
        { email: 'invig6@mouau.edu.ng', fullName: 'Mrs. Jane Smith',       staffId: 'INV006', collegeCode: 'CEET',   deptCode: 'EEE' },
        { email: 'invig7@mouau.edu.ng', fullName: 'Mr. David Johnson',     staffId: 'INV007', collegeCode: 'COLPAS', deptCode: 'PHY' },
        { email: 'invig8@mouau.edu.ng', fullName: 'Mrs. Adaora Nnaji',     staffId: 'INV008', collegeCode: 'CAFST',  deptCode: 'FST' },
        { email: 'invig9@mouau.edu.ng', fullName: 'Mr. Obinna Eze',        staffId: 'INV009', collegeCode: 'COLMAS', deptCode: 'ACC' },
        { email: 'invig10@mouau.edu.ng',fullName: 'Ms. Amaka Ude',         staffId: 'INV010', collegeCode: 'CVM',    deptCode: 'VET' },
      ];

      const invigilators: any[] = [];
      for (const i of invigilatorData) {
        const invigilator = await prisma.user.upsert({
          where:  { email: i.email },
          update: {},
          create: {
            email: i.email, fullName: i.fullName,
            passwordHash: invigilatorPass, role: 'invigilator', staffId: i.staffId,
            collegeId: getCollege(i.collegeCode).id,
            departmentId: getDept(i.deptCode).id,
            session: '2025/2026',
          },
        });
        invigilators.push(invigilator);
      }

      results.push(`✓ ${admins.length} admins, ${lecturers.length} lecturers, ${invigilators.length} invigilators`);
      progressBroadcaster.broadcastProgress('staff', 'Staff accounts created', `${admins.length + lecturers.length + invigilators.length} total`, '👥✅');

      // ── Students ──────────────────────────────────────────────────────────
      progressBroadcaster.broadcastProgress('students', 'Creating students...', '450+ students (100L focused)', '🎓');
      const studentData = [
        // COLPAS departments (PHY, CSC, CHM, MTH, STA, GLG) → 6 depts × 12 = 72 students
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

        { email: 'nnamdi.agu05@student.mouau.edu.ng', fullName: 'Nnamdi Agu', deptCode: 'CHM', matric: 'MOUAU/CHM/25/141516', levelNum: 100, session: '2025/2026' },
        { email: 'obinna.obi06@student.mouau.edu.ng', fullName: 'Obinna Obi', deptCode: 'MTH', matric: 'MOUAU/MTH/25/151617', levelNum: 100, session: '2025/2026' },
        { email: 'patience.aka07@student.mouau.edu.ng', fullName: 'Patience Aka', deptCode: 'STA', matric: 'MOUAU/STA/25/161718', levelNum: 100, session: '2025/2026' },
        { email: 'queen.etuk08@student.mouau.edu.ng', fullName: 'Queen Etuk', deptCode: 'GLG', matric: 'MOUAU/GLG/25/171819', levelNum: 100, session: '2025/2026' },

        // COLPAS — CSC (current)
        { email: 'alice.obi@student.mouau.edu.ng',          fullName: 'Alice Obi',           deptCode: 'CSC', matric: '2021/CSC/001', levelNum: 300, session: '2025/2026' },
        { email: 'bob.nwachukwu@student.mouau.edu.ng',      fullName: 'Bob Nwachukwu',       deptCode: 'CSC', matric: '2021/CSC/002', levelNum: 300, session: '2025/2026' },
        { email: 'chidi.okeke@student.mouau.edu.ng',        fullName: 'Chidi Okeke',         deptCode: 'CSC', matric: '2021/CSC/003', levelNum: 300, session: '2025/2026' },
        { email: 'emeka.agu@student.mouau.edu.ng',          fullName: 'Emeka Agu',           deptCode: 'CSC', matric: '2022/CSC/001', levelNum: 200, session: '2025/2026' },
        { email: 'funke.adeyemi@student.mouau.edu.ng',      fullName: 'Funke Adeyemi',       deptCode: 'CSC', matric: '2022/CSC/002', levelNum: 200, session: '2025/2026' },
        { email: 'grace.uko@student.mouau.edu.ng',          fullName: 'Grace Uko',           deptCode: 'CSC', matric: '2020/CSC/001', levelNum: 400, session: '2025/2026' },
        { email: 'ifeoma.ogu@student.mouau.edu.ng',         fullName: 'Ifeoma Ogu',          deptCode: 'CSC', matric: '2023/CSC/001', levelNum: 100, session: '2025/2026' },
        // COLPAS — CSC (previous)
        { email: 'dalu.eze@student.mouau.edu.ng',           fullName: 'Dalu Eze',            deptCode: 'CSC', matric: '2021/CSC/004', levelNum: 300, session: '2024/2025' },
        { email: 'henry.dim@student.mouau.edu.ng',          fullName: 'Henry Dim',           deptCode: 'CSC', matric: '2020/CSC/002', levelNum: 400, session: '2024/2025' },
        { email: 'james.oti@student.mouau.edu.ng',          fullName: 'James Oti',           deptCode: 'CSC', matric: '2023/CSC/002', levelNum: 100, session: '2024/2025' },
        // COLPAS — MTH
        { email: 'ada.mba@student.mouau.edu.ng',            fullName: 'Ada Mba',             deptCode: 'MTH', matric: '2021/MTH/005', levelNum: 300, session: '2025/2026' },
        { email: 'chioma.igwe@student.mouau.edu.ng',        fullName: 'Chioma Igwe',         deptCode: 'MTH', matric: '2022/MTH/003', levelNum: 200, session: '2025/2026' },
        { email: 'esther.nwosu@student.mouau.edu.ng',       fullName: 'Esther Nwosu',        deptCode: 'MTH', matric: '2020/MTH/003', levelNum: 400, session: '2025/2026' },
        // COLPAS — STA
        { email: 'faith.ogbonna@student.mouau.edu.ng',      fullName: 'Faith Ogbonna',       deptCode: 'STA', matric: '2022/STA/001', levelNum: 200, session: '2025/2026' },
        { email: 'godwin.nkem@student.mouau.edu.ng',        fullName: 'Godwin Nkem',         deptCode: 'STA', matric: '2021/STA/001', levelNum: 300, session: '2025/2026' },
        // COLPAS — PHY
        { email: 'isaac.udoh@student.mouau.edu.ng',         fullName: 'Isaac Udoh',          deptCode: 'PHY', matric: '2021/PHY/007', levelNum: 300, session: '2025/2026' },
        { email: 'joy.akan@student.mouau.edu.ng',           fullName: 'Joy Akan',            deptCode: 'PHY', matric: '2022/PHY/005', levelNum: 200, session: '2025/2026' },
        // COLPAS — CHM
        { email: 'kelechi.ofor@student.mouau.edu.ng',       fullName: 'Kelechi Ofor',        deptCode: 'CHM', matric: '2022/CHM/001', levelNum: 200, session: '2025/2026' },
        { email: 'linda.ani@student.mouau.edu.ng',          fullName: 'Linda Ani',           deptCode: 'CHM', matric: '2021/CHM/002', levelNum: 300, session: '2025/2026' },
        // COLPAS — GLG
        { email: 'michael.abu@student.mouau.edu.ng',        fullName: 'Michael Abu',         deptCode: 'GLG', matric: '2021/GLG/001', levelNum: 300, session: '2025/2026' },
        // CEET — EEE
        { email: 'peter.okpara@student.mouau.edu.ng',       fullName: 'Peter Okpara',        deptCode: 'EEE', matric: '2021/EEE/009', levelNum: 300, session: '2025/2026' },
        { email: 'samuel.udo@student.mouau.edu.ng',         fullName: 'Samuel Udo',          deptCode: 'EEE', matric: '2020/EEE/006', levelNum: 400, session: '2025/2026' },
        // CEET — CPE
        { email: 'nnamdi.obi@student.mouau.edu.ng',         fullName: 'Nnamdi Obi',          deptCode: 'CPE', matric: '2021/CPE/001', levelNum: 300, session: '2025/2026' },
        // CEET — CVE
        { email: 'obiageli.ezea@student.mouau.edu.ng',      fullName: 'Obiageli Ezea',       deptCode: 'CVE', matric: '2022/CVE/001', levelNum: 200, session: '2025/2026' },
        // CEET — MCE
        { email: 'paul.okonkwo@student.mouau.edu.ng',       fullName: 'Paul Okonkwo',        deptCode: 'MCE', matric: '2021/MCE/001', levelNum: 300, session: '2025/2026' },
        // COLMAS — HRM
        { email: 'xavier.otu@student.mouau.edu.ng',         fullName: 'Xavier Otu',          deptCode: 'HRM', matric: '2021/HRM/011', levelNum: 300, session: '2025/2026' },
        { email: 'zainab.bello@student.mouau.edu.ng',       fullName: 'Zainab Bello',        deptCode: 'HRM', matric: '2020/HRM/007', levelNum: 400, session: '2025/2026' },
        // COLMAS — ACC
        { email: 'amara.nwosu@student.mouau.edu.ng',        fullName: 'Amara Nwosu',         deptCode: 'ACC', matric: '2022/ACC/001', levelNum: 200, session: '2025/2026' },
        { email: 'basil.ochu@student.mouau.edu.ng',         fullName: 'Basil Ochu',          deptCode: 'ACC', matric: '2021/ACC/002', levelNum: 300, session: '2025/2026' },
        // COLMAS — BUS
        { email: 'chidera.nweke@student.mouau.edu.ng',      fullName: 'Chidera Nweke',       deptCode: 'BUS', matric: '2022/BUS/001', levelNum: 200, session: '2025/2026' },
        // COLNAS — BCH
        { email: 'blessing.okon@student.mouau.edu.ng',      fullName: 'Blessing Okon',       deptCode: 'BCH', matric: '2022/BCH/010', levelNum: 200, session: '2025/2026' },
        { email: 'charles.ekpo@student.mouau.edu.ng',       fullName: 'Charles Ekpo',        deptCode: 'BCH', matric: '2021/BCH/012', levelNum: 300, session: '2025/2026' },
        // COLNAS — MCB
        { email: 'doris.onyia@student.mouau.edu.ng',        fullName: 'Doris Onyia',         deptCode: 'MCB', matric: '2022/MCB/001', levelNum: 200, session: '2025/2026' },
        // COLNAS — ZEB
        { email: 'elvis.nwagba@student.mouau.edu.ng',       fullName: 'Elvis Nwagba',        deptCode: 'ZEB', matric: '2021/ZEB/001', levelNum: 300, session: '2025/2026' },
        // CAFST — FST
        { email: 'edwin.chukwu@student.mouau.edu.ng',       fullName: 'Edwin Chukwu',        deptCode: 'FST', matric: '2022/FST/011', levelNum: 200, session: '2025/2026' },
        { email: 'florence.obi@student.mouau.edu.ng',       fullName: 'Florence Obi',        deptCode: 'FST', matric: '2020/FST/008', levelNum: 400, session: '2025/2026' },
        // CAFST — HND
        { email: 'gifty.asare@student.mouau.edu.ng',        fullName: 'Gifty Asare',         deptCode: 'HND', matric: '2022/HND/001', levelNum: 200, session: '2025/2026' },
        // CCSS — AGR
        { email: 'helen.uzochukwu@student.mouau.edu.ng',    fullName: 'Helen Uzochukwu',     deptCode: 'AGR', matric: '2022/AGR/012', levelNum: 200, session: '2025/2026' },
        { email: 'ifeanyi.nwankwo@student.mouau.edu.ng',    fullName: 'Ifeanyi Nwankwo',     deptCode: 'AGR', matric: '2021/AGR/014', levelNum: 300, session: '2025/2026' },
        // CCSS — SSM
        { email: 'james.ugwu@student.mouau.edu.ng',         fullName: 'James Ugwu',          deptCode: 'SSM', matric: '2022/SSM/001', levelNum: 200, session: '2025/2026' },
        // CAERSE — AEC
        { email: 'kalu.ibe@student.mouau.edu.ng',           fullName: 'Kalu Ibe',            deptCode: 'AEC', matric: '2022/AEC/001', levelNum: 200, session: '2025/2026' },
        // CASAP — APL
        { email: 'loveth.uche@student.mouau.edu.ng',        fullName: 'Loveth Uche',         deptCode: 'APL', matric: '2022/APL/001', levelNum: 200, session: '2025/2026' },
        // CNREM — FAR
        { email: 'mark.ibeh@student.mouau.edu.ng',          fullName: 'Mark Ibeh',           deptCode: 'FAR', matric: '2021/FAR/001', levelNum: 300, session: '2025/2026' },
        // CVM — VET
        { email: 'kenneth.abara@student.mouau.edu.ng',      fullName: 'Kenneth Abara',       deptCode: 'VET', matric: '2021/VET/015', levelNum: 300, session: '2025/2026' },
        { email: 'lucy.okezie@student.mouau.edu.ng',        fullName: 'Lucy Okezie',         deptCode: 'VET', matric: '2020/VET/010', levelNum: 400, session: '2025/2026' },
      ];

      const students: any[] = [];
      for (const s of studentData) {
        const dept    = getDept(s.deptCode);
        const levelId = getLevel(s.levelNum).id;
        const student = await prisma.user.upsert({
          where:  { email: s.email },
          update: {},
          create: {
            email: s.email, fullName: s.fullName,
            passwordHash: studentPass, role: 'student',
            matricNumber: s.matric, collegeId: dept.collegeId,
            departmentId: dept.id, levelId, session: s.session,
          },
        });
        students.push({ ...student, levelNum: s.levelNum, session: s.session });
      }
      results.push(`✓ ${students.length} students`);
      progressBroadcaster.broadcastProgress('students', 'Students created', `${students.length} students (450+ 100L)`, '🎓✅');

      // ── Courses ───────────────────────────────────────────────────────────
      progressBroadcaster.broadcastProgress('courses', 'Creating courses...', '~370 courses', '📚');
           // ── Courses ───────────────────────────────────────────────────────────
      //
      // Format: { code, title, deptCode, level, credits? }
      // If credits is omitted it is computed from courseCredits(deptCode, level)
      // at seed time so each run produces the same deterministic values
      // (we use a fixed lookup table, not runtime random, to keep upserts stable).
      //
      // Fixed credit map: dept → level → [c1, c2, c3, c4, c5 ...]
      // Position matches course index within that level bucket.
      //
      type CourseEntry = { code: string; title: string; deptCode: string; level: number; credits: number; semester?: number };

      // Helper: pick fixed credit units deterministically from dept + level + index
      function fixedCredits(deptCode: string, level: number, idx: number): number {
        const stem = ['CSC','STA','MTH','PHY','CHM','BCH','MCB','PSB','ZEB','GLG','ABE','CVE','CHE','CPE','EEE','MCE'];
        if (level === 100) {
          return stem.includes(deptCode) ? [2,3,2,3,2,3][idx % 6] : [1,2,1,2,1,2][idx % 6];
        }
        return [2,3,1,2,3,2,1,3][idx % 8];
      }

      // ── CAERSE ────────────────────────────────────────────────────────────
      const caerseABM: CourseEntry[] = [
        { code:'ABM101',title:'Introduction to Agribusiness',                    deptCode:'ABM', level:100, credits: fixedCredits('ABM',100,0) },
        { code:'ABM102',title:'Principles of Farm Management',                   deptCode:'ABM', level:100, credits: fixedCredits('ABM',100,1) },
        { code:'ABM201',title:'Farm Business Analysis',                          deptCode:'ABM', level:200, credits: fixedCredits('ABM',200,0) },
        { code:'ABM202',title:'Agricultural Marketing',                          deptCode:'ABM', level:200, credits: fixedCredits('ABM',200,1) },
        { code:'ABM301',title:'Agribusiness Finance',                            deptCode:'ABM', level:300, credits: fixedCredits('ABM',300,0) },
        { code:'ABM302',title:'Project Analysis in Agriculture',                 deptCode:'ABM', level:300, credits: fixedCredits('ABM',300,1) },
        { code:'ABM401',title:'Strategic Agribusiness Management',               deptCode:'ABM', level:400, credits: fixedCredits('ABM',400,0) },
        { code:'ABM402',title:'Agribusiness Entrepreneurship',                   deptCode:'ABM', level:400, credits: fixedCredits('ABM',400,1) },
      ];
      const caerseAEC: CourseEntry[] = [
        { code:'AEC101',title:'Introduction to Agricultural Economics',          deptCode:'AEC', level:100, credits: fixedCredits('AEC',100,0) },
        { code:'AEC102',title:'Principles of Economics',                         deptCode:'AEC', level:100, credits: fixedCredits('AEC',100,1) },
        { code:'AEC201',title:'Microeconomics for Agriculture',                  deptCode:'AEC', level:200, credits: fixedCredits('AEC',200,0) },
        { code:'AEC202',title:'Agricultural Production Economics',               deptCode:'AEC', level:200, credits: fixedCredits('AEC',200,1) },
        { code:'AEC301',title:'Macroeconomics and Agriculture',                  deptCode:'AEC', level:300, credits: fixedCredits('AEC',300,0) },
        { code:'AEC302',title:'Agricultural Policy and Trade',                   deptCode:'AEC', level:300, credits: fixedCredits('AEC',300,1) },
        { code:'AEC401',title:'Agricultural Development Economics',              deptCode:'AEC', level:400, credits: fixedCredits('AEC',400,0) },
        { code:'AEC402',title:'Econometrics for Agriculture',                    deptCode:'AEC', level:400, credits: fixedCredits('AEC',400,1) },
      ];
      const caerseAERS: CourseEntry[] = [
        { code:'AERS101',title:'Introduction to Extension Education',            deptCode:'AERS',level:100, credits: fixedCredits('AERS',100,0) },
        { code:'AERS102',title:'Rural Sociology',                                deptCode:'AERS',level:100, credits: fixedCredits('AERS',100,1) },
        { code:'AERS201',title:'Extension Methods and Approaches',               deptCode:'AERS',level:200, credits: fixedCredits('AERS',200,0) },
        { code:'AERS202',title:'Rural Development',                              deptCode:'AERS',level:200, credits: fixedCredits('AERS',200,1) },
        { code:'AERS301',title:'Communication for Development',                  deptCode:'AERS',level:300, credits: fixedCredits('AERS',300,0) },
        { code:'AERS302',title:'Gender and Agriculture',                         deptCode:'AERS',level:300, credits: fixedCredits('AERS',300,1) },
        { code:'AERS401',title:'Programme Planning in Extension',                deptCode:'AERS',level:400, credits: fixedCredits('AERS',400,0) },
        { code:'AERS402',title:'Participatory Rural Appraisal',                  deptCode:'AERS',level:400, credits: fixedCredits('AERS',400,1) },
      ];

      // ── CASAP ─────────────────────────────────────────────────────────────
      const casapABP: CourseEntry[] = [
        { code:'ABP101',title:'Fundamentals of Animal Science',                  deptCode:'ABP', level:100, credits: fixedCredits('ABP',100,0) },
        { code:'ABP102',title:'Introduction to Animal Genetics',                 deptCode:'ABP', level:100, credits: fixedCredits('ABP',100,1) },
        { code:'ABP201',title:'Animal Genetics and Breeding',                    deptCode:'ABP', level:200, credits: fixedCredits('ABP',200,0) },
        { code:'ABP202',title:'Reproductive Physiology',                         deptCode:'ABP', level:200, credits: fixedCredits('ABP',200,1) },
        { code:'ABP301',title:'Quantitative Genetics',                           deptCode:'ABP', level:300, credits: fixedCredits('ABP',300,0) },
        { code:'ABP302',title:'Endocrinology in Animals',                        deptCode:'ABP', level:300, credits: fixedCredits('ABP',300,1) },
        { code:'ABP401',title:'Breeding Programme Design',                       deptCode:'ABP', level:400, credits: fixedCredits('ABP',400,0) },
        { code:'ABP402',title:'Molecular Genetics in Animal Breeding',           deptCode:'ABP', level:400, credits: fixedCredits('ABP',400,1) },
      ];
      const casapANF: CourseEntry[] = [
        { code:'ANF101',title:'Fundamentals of Animal Nutrition',                deptCode:'ANF', level:100, credits: fixedCredits('ANF',100,0) },
        { code:'ANF102',title:'Introduction to Forage Crops',                    deptCode:'ANF', level:100, credits: fixedCredits('ANF',100,1) },
        { code:'ANF201',title:'Feed Formulation and Technology',                 deptCode:'ANF', level:200, credits: fixedCredits('ANF',200,0) },
        { code:'ANF202',title:'Pasture Management',                              deptCode:'ANF', level:200, credits: fixedCredits('ANF',200,1) },
        { code:'ANF301',title:'Ruminant Nutrition',                              deptCode:'ANF', level:300, credits: fixedCredits('ANF',300,0) },
        { code:'ANF302',title:'Monogastric Nutrition',                           deptCode:'ANF', level:300, credits: fixedCredits('ANF',300,1) },
        { code:'ANF401',title:'Feed Quality Control',                            deptCode:'ANF', level:400, credits: fixedCredits('ANF',400,0) },
        { code:'ANF402',title:'Advanced Forage Science',                         deptCode:'ANF', level:400, credits: fixedCredits('ANF',400,1) },
      ];
      const casapAPL: CourseEntry[] = [
        { code:'APL101',title:'Introduction to Livestock Production',            deptCode:'APL', level:100, credits: fixedCredits('APL',100,0) },
        { code:'APL102',title:'Principles of Animal Management',                 deptCode:'APL', level:100, credits: fixedCredits('APL',100,1) },
        { code:'APL201',title:'Poultry Production',                              deptCode:'APL', level:200, credits: fixedCredits('APL',200,0) },
        { code:'APL202',title:'Swine and Small Ruminant Production',             deptCode:'APL', level:200, credits: fixedCredits('APL',200,1) },
        { code:'APL301',title:'Beef and Dairy Cattle Production',                deptCode:'APL', level:300, credits: fixedCredits('APL',300,0) },
        { code:'APL302',title:'Livestock Farm Management',                       deptCode:'APL', level:300, credits: fixedCredits('APL',300,1) },
        { code:'APL401',title:'Animal Products Processing',                      deptCode:'APL', level:400, credits: fixedCredits('APL',400,0) },
        { code:'APL402',title:'Livestock Enterprise Development',                deptCode:'APL', level:400, credits: fixedCredits('APL',400,1) },
      ];

      // ── CAFST ─────────────────────────────────────────────────────────────
      const cafstFST: CourseEntry[] = [
        { code:'FST101',title:'Introduction to Food Science',                    deptCode:'FST', level:100, credits: fixedCredits('FST',100,0) },
        { code:'FST102',title:'Food Safety and Hygiene',                         deptCode:'FST', level:100, credits: fixedCredits('FST',100,1) },
        { code:'FST201',title:'Food Chemistry',                                  deptCode:'FST', level:200, credits: fixedCredits('FST',200,0) },
        { code:'FST202',title:'Food Microbiology',                               deptCode:'FST', level:200, credits: fixedCredits('FST',200,1) },
        { code:'FST301',title:'Food Analysis and Quality Control',               deptCode:'FST', level:300, credits: fixedCredits('FST',300,0) },
        { code:'FST302',title:'Food Preservation and Processing',                deptCode:'FST', level:300, credits: fixedCredits('FST',300,1) },
        { code:'FST401',title:'Food Process Engineering',                        deptCode:'FST', level:400, credits: fixedCredits('FST',400,0) },
        { code:'FST402',title:'New Product Development',                         deptCode:'FST', level:400, credits: fixedCredits('FST',400,1) },
      ];
      const cafstHND: CourseEntry[] = [
        { code:'HND101',title:'Introduction to Nutrition',                       deptCode:'HND', level:100, credits: fixedCredits('HND',100,0) },
        { code:'HND102',title:'Fundamentals of Dietetics',                       deptCode:'HND', level:100, credits: fixedCredits('HND',100,1) },
        { code:'HND201',title:'Nutritional Biochemistry',                        deptCode:'HND', level:200, credits: fixedCredits('HND',200,0) },
        { code:'HND202',title:'Community Nutrition',                             deptCode:'HND', level:200, credits: fixedCredits('HND',200,1) },
        { code:'HND301',title:'Clinical Nutrition',                              deptCode:'HND', level:300, credits: fixedCredits('HND',300,0) },
        { code:'HND302',title:'Maternal and Child Nutrition',                    deptCode:'HND', level:300, credits: fixedCredits('HND',300,1) },
        { code:'HND401',title:'Advanced Dietetic Practice',                      deptCode:'HND', level:400, credits: fixedCredits('HND',400,0) },
        { code:'HND402',title:'Nutrition in Disease Management',                 deptCode:'HND', level:400, credits: fixedCredits('HND',400,1) },
      ];
      const cafstHHT: CourseEntry[] = [
        { code:'HHT101',title:'Introduction to Home Science',                    deptCode:'HHT', level:100, credits: fixedCredits('HHT',100,0) },
        { code:'HHT102',title:'Fundamentals of Tourism',                         deptCode:'HHT', level:100, credits: fixedCredits('HHT',100,1) },
        { code:'HHT201',title:'Hotel and Lodging Management',                    deptCode:'HHT', level:200, credits: fixedCredits('HHT',200,0) },
        { code:'HHT202',title:'Travel and Tour Operations',                      deptCode:'HHT', level:200, credits: fixedCredits('HHT',200,1) },
        { code:'HHT301',title:'Food Service Management',                         deptCode:'HHT', level:300, credits: fixedCredits('HHT',300,0) },
        { code:'HHT302',title:'Event Management',                                deptCode:'HHT', level:300, credits: fixedCredits('HHT',300,1) },
        { code:'HHT401',title:'Ecotourism and Sustainable Development',          deptCode:'HHT', level:400, credits: fixedCredits('HHT',400,0) },
        { code:'HHT402',title:'Hospitality Marketing',                           deptCode:'HHT', level:400, credits: fixedCredits('HHT',400,1) },
      ];

      // ── CCSS ──────────────────────────────────────────────────────────────
      const ccssAGR: CourseEntry[] = [
        { code:'AGR101',title:'Introduction to Agronomy',                        deptCode:'AGR', level:100, credits: fixedCredits('AGR',100,0) },
        { code:'AGR102',title:'Fundamentals of Crop Science',                    deptCode:'AGR', level:100, credits: fixedCredits('AGR',100,1) },
        { code:'AGR201',title:'Crop Physiology',                                 deptCode:'AGR', level:200, credits: fixedCredits('AGR',200,0) },
        { code:'AGR202',title:'Cropping Systems and Practices',                  deptCode:'AGR', level:200, credits: fixedCredits('AGR',200,1) },
        { code:'AGR301',title:'Weed Science',                                    deptCode:'AGR', level:300, credits: fixedCredits('AGR',300,0) },
        { code:'AGR302',title:'Dryland Farming',                                 deptCode:'AGR', level:300, credits: fixedCredits('AGR',300,1) },
        { code:'AGR401',title:'Seed Science and Technology',                     deptCode:'AGR', level:400, credits: fixedCredits('AGR',400,0) },
        { code:'AGR402',title:'Precision Agriculture',                           deptCode:'AGR', level:400, credits: fixedCredits('AGR',400,1) },
      ];
      const ccssPHM: CourseEntry[] = [
        { code:'PHM101',title:'Introduction to Plant Pathology',                 deptCode:'PHM', level:100, credits: fixedCredits('PHM',100,0) },
        { code:'PHM102',title:'Agricultural Entomology',                         deptCode:'PHM', level:100, credits: fixedCredits('PHM',100,1) },
        { code:'PHM201',title:'Fungal Diseases of Crops',                        deptCode:'PHM', level:200, credits: fixedCredits('PHM',200,0) },
        { code:'PHM202',title:'Integrated Pest Management',                      deptCode:'PHM', level:200, credits: fixedCredits('PHM',200,1) },
        { code:'PHM301',title:'Plant Disease Diagnosis',                         deptCode:'PHM', level:300, credits: fixedCredits('PHM',300,0) },
        { code:'PHM302',title:'Pesticide Chemistry and Use',                     deptCode:'PHM', level:300, credits: fixedCredits('PHM',300,1) },
        { code:'PHM401',title:'Biocontrol of Plant Pathogens',                   deptCode:'PHM', level:400, credits: fixedCredits('PHM',400,0) },
        { code:'PHM402',title:'Post-Harvest Pathology',                          deptCode:'PHM', level:400, credits: fixedCredits('PHM',400,1) },
      ];
      const ccssSSM: CourseEntry[] = [
        { code:'SSM101',title:'Introduction to Soil Science',                    deptCode:'SSM', level:100, credits: fixedCredits('SSM',100,0) },
        { code:'SSM102',title:'Weather and Climate Basics',                      deptCode:'SSM', level:100, credits: fixedCredits('SSM',100,1) },
        { code:'SSM201',title:'Soil Chemistry and Fertility',                    deptCode:'SSM', level:200, credits: fixedCredits('SSM',200,0) },
        { code:'SSM202',title:'Agrometeorology',                                 deptCode:'SSM', level:200, credits: fixedCredits('SSM',200,1) },
        { code:'SSM301',title:'Soil Physics',                                    deptCode:'SSM', level:300, credits: fixedCredits('SSM',300,0) },
        { code:'SSM302',title:'Climatology',                                     deptCode:'SSM', level:300, credits: fixedCredits('SSM',300,1) },
        { code:'SSM401',title:'Soil Survey and Classification',                  deptCode:'SSM', level:400, credits: fixedCredits('SSM',400,0) },
        { code:'SSM402',title:'Soil Pollution and Remediation',                  deptCode:'SSM', level:400, credits: fixedCredits('SSM',400,1) },
      ];
      const ccssWRM: CourseEntry[] = [
        { code:'WRM101',title:'Introduction to Water Resources',                 deptCode:'WRM', level:100, credits: fixedCredits('WRM',100,0) },
        { code:'WRM102',title:'Hydrology Basics',                                deptCode:'WRM', level:100, credits: fixedCredits('WRM',100,1) },
        { code:'WRM201',title:'Irrigation and Drainage Engineering',             deptCode:'WRM', level:200, credits: fixedCredits('WRM',200,0) },
        { code:'WRM202',title:'Watershed Management',                            deptCode:'WRM', level:200, credits: fixedCredits('WRM',200,1) },
        { code:'WRM301',title:'Groundwater Hydrology',                           deptCode:'WRM', level:300, credits: fixedCredits('WRM',300,0) },
        { code:'WRM302',title:'Water Quality Analysis',                          deptCode:'WRM', level:300, credits: fixedCredits('WRM',300,1) },
        { code:'WRM401',title:'Water Resources Planning and Policy',             deptCode:'WRM', level:400, credits: fixedCredits('WRM',400,0) },
        { code:'WRM402',title:'Remote Sensing for Water Resources',              deptCode:'WRM', level:400, credits: fixedCredits('WRM',400,1) },
      ];

      // ── COED ──────────────────────────────────────────────────────────────
      const buildCOED = (deptCode: string, shortName: string): CourseEntry[] => [
        { code:`${deptCode}101`,title:`Introduction to ${shortName}`,            deptCode, level:100, credits: fixedCredits(deptCode,100,0) },
        { code:`${deptCode}102`,title:`Foundations of Education`,                deptCode, level:100, credits: fixedCredits(deptCode,100,1) },
        { code:`${deptCode}201`,title:`Curriculum Development in ${shortName}`,  deptCode, level:200, credits: fixedCredits(deptCode,200,0) },
        { code:`${deptCode}202`,title:`Teaching Methods in ${shortName}`,        deptCode, level:200, credits: fixedCredits(deptCode,200,1) },
        { code:`${deptCode}301`,title:`Assessment and Evaluation`,               deptCode, level:300, credits: fixedCredits(deptCode,300,0) },
        { code:`${deptCode}302`,title:`Research Methods in Education`,           deptCode, level:300, credits: fixedCredits(deptCode,300,1) },
        { code:`${deptCode}401`,title:`Educational Administration`,              deptCode, level:400, credits: fixedCredits(deptCode,400,0) },
        { code:`${deptCode}402`,title:`Seminar and Project in ${shortName}`,     deptCode, level:400, credits: fixedCredits(deptCode,400,1) },
      ];
      const coedACE = buildCOED('ACE','Adult Education');
      const coedAHE = buildCOED('AHE','Agric/Home Science Education');
      const coedBED = buildCOED('BED','Business Education');
      const coedECE = buildCOED('ECE','Economics Education');
      const coedEDM = buildCOED('EDM','Educational Management');
      const coedITE = buildCOED('ITE','Industrial Technology Education');
      const coedLIS = buildCOED('LIS','Library and Information Science');
      const coedGCA = buildCOED('GCA','Guidance and Counselling');
      const coedISE = buildCOED('ISE','Integrated Science Education');

      // ── CEET ──────────────────────────────────────────────────────────────
      const ceetABE: CourseEntry[] = [
        { code:'ABE101',title:'Introduction to Engineering',                     deptCode:'ABE', level:100, credits: fixedCredits('ABE',100,0) },
        { code:'ABE102',title:'Engineering Drawing',                             deptCode:'ABE', level:100, credits: fixedCredits('ABE',100,1) },
        { code:'ABE201',title:'Agricultural Machinery and Power',                deptCode:'ABE', level:200, credits: fixedCredits('ABE',200,0) },
        { code:'ABE202',title:'Farm Structures and Environmental Control',       deptCode:'ABE', level:200, credits: fixedCredits('ABE',200,1) },
        { code:'ABE301',title:'Soil and Water Engineering',                      deptCode:'ABE', level:300, credits: fixedCredits('ABE',300,0) },
        { code:'ABE302',title:'Post-Harvest Engineering',                        deptCode:'ABE', level:300, credits: fixedCredits('ABE',300,1) },
        { code:'ABE401',title:'Renewable Energy in Agriculture',                 deptCode:'ABE', level:400, credits: fixedCredits('ABE',400,0) },
        { code:'ABE402',title:'Agricultural Process Engineering',                deptCode:'ABE', level:400, credits: fixedCredits('ABE',400,1) },
      ];
      const ceetCVE: CourseEntry[] = [
        { code:'CVE101',title:'Engineering Mathematics I',                       deptCode:'CVE', level:100, credits: fixedCredits('CVE',100,0) },
        { code:'CVE102',title:'Technical Drawing and CAD',                       deptCode:'CVE', level:100, credits: fixedCredits('CVE',100,1) },
        { code:'CVE201',title:'Structural Mechanics',                            deptCode:'CVE', level:200, credits: fixedCredits('CVE',200,0) },
        { code:'CVE202',title:'Fluid Mechanics',                                 deptCode:'CVE', level:200, credits: fixedCredits('CVE',200,1) },
        { code:'CVE301',title:'Soil Mechanics',                                  deptCode:'CVE', level:300, credits: fixedCredits('CVE',300,0) },
        { code:'CVE302',title:'Highway and Transportation Engineering',          deptCode:'CVE', level:300, credits: fixedCredits('CVE',300,1) },
        { code:'CVE401',title:'Structural Analysis and Design',                  deptCode:'CVE', level:400, credits: fixedCredits('CVE',400,0) },
        { code:'CVE402',title:'Environmental Engineering',                       deptCode:'CVE', level:400, credits: fixedCredits('CVE',400,1) },
      ];
      const ceetCHE: CourseEntry[] = [
        { code:'CHE101',title:'Engineering Chemistry',                           deptCode:'CHE', level:100, credits: fixedCredits('CHE',100,0) },
        { code:'CHE102',title:'Introduction to Chemical Engineering',            deptCode:'CHE', level:100, credits: fixedCredits('CHE',100,1) },
        { code:'CHE201',title:'Thermodynamics I',                                deptCode:'CHE', level:200, credits: fixedCredits('CHE',200,0) },
        { code:'CHE202',title:'Material and Energy Balances',                    deptCode:'CHE', level:200, credits: fixedCredits('CHE',200,1) },
        { code:'CHE301',title:'Chemical Reaction Engineering',                   deptCode:'CHE', level:300, credits: fixedCredits('CHE',300,0) },
        { code:'CHE302',title:'Heat and Mass Transfer',                          deptCode:'CHE', level:300, credits: fixedCredits('CHE',300,1) },
        { code:'CHE401',title:'Process Control and Instrumentation',             deptCode:'CHE', level:400, credits: fixedCredits('CHE',400,0) },
        { code:'CHE402',title:'Plant Design and Economics',                      deptCode:'CHE', level:400, credits: fixedCredits('CHE',400,1) },
      ];
      const ceetCPE: CourseEntry[] = [
        { code:'CPE101',title:'Introduction to Computer Engineering',            deptCode:'CPE', level:100, credits: fixedCredits('CPE',100,0) },
        { code:'CPE102',title:'Fundamentals of Programming',                     deptCode:'CPE', level:100, credits: fixedCredits('CPE',100,1) },
        { code:'CPE201',title:'Digital Logic Design',                            deptCode:'CPE', level:200, credits: fixedCredits('CPE',200,0) },
        { code:'CPE202',title:'Data Structures for Engineers',                   deptCode:'CPE', level:200, credits: fixedCredits('CPE',200,1) },
        { code:'CPE301',title:'Computer Architecture',                           deptCode:'CPE', level:300, credits: fixedCredits('CPE',300,0) },
        { code:'CPE302',title:'Embedded Systems Design',                         deptCode:'CPE', level:300, credits: fixedCredits('CPE',300,1) },
        { code:'CPE401',title:'VLSI Design',                                     deptCode:'CPE', level:400, credits: fixedCredits('CPE',400,0) },
        { code:'CPE402',title:'Network Architecture and Security',               deptCode:'CPE', level:400, credits: fixedCredits('CPE',400,1) },
      ];
      const ceetEEE: CourseEntry[] = [
        { code:'EEE101',title:'Introduction to Electrical Engineering',          deptCode:'EEE', level:100, credits: fixedCredits('EEE',100,0) },
        { code:'EEE102',title:'Engineering Mathematics for EEE',                 deptCode:'EEE', level:100, credits: fixedCredits('EEE',100,1) },
        { code:'EEE201',title:'Circuit Theory',                                  deptCode:'EEE', level:200, credits: fixedCredits('EEE',200,0) },
        { code:'EEE202',title:'Electromagnetic Fields and Waves',                deptCode:'EEE', level:200, credits: fixedCredits('EEE',200,1) },
        { code:'EEE301',title:'Electronics I',                                   deptCode:'EEE', level:300, credits: fixedCredits('EEE',300,0) },
        { code:'EEE302',title:'Control Systems Engineering',                     deptCode:'EEE', level:300, credits: fixedCredits('EEE',300,1) },
        { code:'EEE401',title:'Power Systems Analysis',                          deptCode:'EEE', level:400, credits: fixedCredits('EEE',400,0) },
        { code:'EEE402',title:'Industrial Electronics',                          deptCode:'EEE', level:400, credits: fixedCredits('EEE',400,1) },
      ];
      const ceetMCE: CourseEntry[] = [
        { code:'MCE101',title:'Introduction to Mechanical Engineering',          deptCode:'MCE', level:100, credits: fixedCredits('MCE',100,0) },
        { code:'MCE102',title:'Workshop Practice',                               deptCode:'MCE', level:100, credits: fixedCredits('MCE',100,1) },
        { code:'MCE201',title:'Engineering Mechanics',                           deptCode:'MCE', level:200, credits: fixedCredits('MCE',200,0) },
        { code:'MCE202',title:'Thermodynamics',                                  deptCode:'MCE', level:200, credits: fixedCredits('MCE',200,1) },
        { code:'MCE301',title:'Machine Design',                                  deptCode:'MCE', level:300, credits: fixedCredits('MCE',300,0) },
        { code:'MCE302',title:'Manufacturing Technology',                        deptCode:'MCE', level:300, credits: fixedCredits('MCE',300,1) },
        { code:'MCE401',title:'Industrial Engineering and Management',           deptCode:'MCE', level:400, credits: fixedCredits('MCE',400,0) },
        { code:'MCE402',title:'Mechatronics',                                    deptCode:'MCE', level:400, credits: fixedCredits('MCE',400,1) },
      ];

      // ── COLMAS ────────────────────────────────────────────────────────────
      const colmasACC: CourseEntry[] = [
        { code:'ACC101',title:'Principles of Accounting',                        deptCode:'ACC', level:100, credits: fixedCredits('ACC',100,0) },
        { code:'ACC102',title:'Business Mathematics',                            deptCode:'ACC', level:100, credits: fixedCredits('ACC',100,1) },
        { code:'ACC201',title:'Financial Accounting',                            deptCode:'ACC', level:200, credits: fixedCredits('ACC',200,0) },
        { code:'ACC202',title:'Management Accounting',                           deptCode:'ACC', level:200, credits: fixedCredits('ACC',200,1) },
        { code:'ACC301',title:'Cost Accounting',                                 deptCode:'ACC', level:300, credits: fixedCredits('ACC',300,0) },
        { code:'ACC302',title:'Taxation',                                        deptCode:'ACC', level:300, credits: fixedCredits('ACC',300,1) },
        { code:'ACC401',title:'Auditing and Assurance',                          deptCode:'ACC', level:400, credits: fixedCredits('ACC',400,0) },
        { code:'ACC402',title:'Advanced Financial Reporting',                    deptCode:'ACC', level:400, credits: fixedCredits('ACC',400,1) },
      ];
      const colmasBUS: CourseEntry[] = [
        { code:'BUS101',title:'Introduction to Business',                        deptCode:'BUS', level:100, credits: fixedCredits('BUS',100,0) },
        { code:'BUS102',title:'Principles of Economics for Business',            deptCode:'BUS', level:100, credits: fixedCredits('BUS',100,1) },
        { code:'BUS201',title:'Business Ethics and Law',                         deptCode:'BUS', level:200, credits: fixedCredits('BUS',200,0) },
        { code:'BUS202',title:'Marketing Management',                            deptCode:'BUS', level:200, credits: fixedCredits('BUS',200,1) },
        { code:'BUS301',title:'Entrepreneurship and SME Management',             deptCode:'BUS', level:300, credits: fixedCredits('BUS',300,0) },
        { code:'BUS302',title:'Operations Management',                           deptCode:'BUS', level:300, credits: fixedCredits('BUS',300,1) },
        { code:'BUS401',title:'Strategic Management',                            deptCode:'BUS', level:400, credits: fixedCredits('BUS',400,0) },
        { code:'BUS402',title:'Business Research Methods',                       deptCode:'BUS', level:400, credits: fixedCredits('BUS',400,1) },
      ];
      const colmasHRM: CourseEntry[] = [
        { code:'HRM101',title:'Introduction to Human Resource Management',       deptCode:'HRM', level:100, credits: fixedCredits('HRM',100,0) },
        { code:'HRM102',title:'Organisational Behaviour Foundations',            deptCode:'HRM', level:100, credits: fixedCredits('HRM',100,1) },
        { code:'HRM201',title:'Principles of Management',                        deptCode:'HRM', level:200, credits: fixedCredits('HRM',200,0) },
        { code:'HRM202',title:'Recruitment and Selection',                       deptCode:'HRM', level:200, credits: fixedCredits('HRM',200,1) },
        { code:'HRM301',title:'Organisational Behaviour',                        deptCode:'HRM', level:300, credits: fixedCredits('HRM',300,0) },
        { code:'HRM302',title:'Compensation and Benefits',                       deptCode:'HRM', level:300, credits: fixedCredits('HRM',300,1) },
        { code:'HRM401',title:'Strategic Human Resource Management',             deptCode:'HRM', level:400, credits: fixedCredits('HRM',400,0) },
        { code:'HRM402',title:'Labour Relations and Employment Law',             deptCode:'HRM', level:400, credits: fixedCredits('HRM',400,1) },
      ];
      const colmasIRP: CourseEntry[] = [
        { code:'IRP101',title:'Introduction to Industrial Relations',            deptCode:'IRP', level:100, credits: fixedCredits('IRP',100,0) },
        { code:'IRP102',title:'Fundamentals of Personnel Management',            deptCode:'IRP', level:100, credits: fixedCredits('IRP',100,1) },
        { code:'IRP201',title:'Labour Law',                                      deptCode:'IRP', level:200, credits: fixedCredits('IRP',200,0) },
        { code:'IRP202',title:'Trade Unions and Collective Bargaining',          deptCode:'IRP', level:200, credits: fixedCredits('IRP',200,1) },
        { code:'IRP301',title:'Conflict Resolution in Organisations',            deptCode:'IRP', level:300, credits: fixedCredits('IRP',300,0) },
        { code:'IRP302',title:'Employee Welfare and Safety',                     deptCode:'IRP', level:300, credits: fixedCredits('IRP',300,1) },
        { code:'IRP401',title:'Public Sector Industrial Relations',              deptCode:'IRP', level:400, credits: fixedCredits('IRP',400,0) },
        { code:'IRP402',title:'Personnel Administration',                        deptCode:'IRP', level:400, credits: fixedCredits('IRP',400,1) },
      ];
      const colmasENT: CourseEntry[] = [
        { code:'ENT101',title:'Introduction to Entrepreneurship',                deptCode:'ENT', level:100, credits: fixedCredits('ENT',100,0) },
        { code:'ENT102',title:'Business Idea Generation',                        deptCode:'ENT', level:100, credits: fixedCredits('ENT',100,1) },
        { code:'ENT201',title:'Venture Creation',                                deptCode:'ENT', level:200, credits: fixedCredits('ENT',200,0) },
        { code:'ENT202',title:'Small Business Finance',                          deptCode:'ENT', level:200, credits: fixedCredits('ENT',200,1) },
        { code:'ENT301',title:'Innovation and Technology Management',            deptCode:'ENT', level:300, credits: fixedCredits('ENT',300,0) },
        { code:'ENT302',title:'Social Entrepreneurship',                         deptCode:'ENT', level:300, credits: fixedCredits('ENT',300,1) },
        { code:'ENT401',title:'Business Scaling and Growth',                     deptCode:'ENT', level:400, credits: fixedCredits('ENT',400,0) },
        { code:'ENT402',title:'Entrepreneurship Policy and Environment',         deptCode:'ENT', level:400, credits: fixedCredits('ENT',400,1) },
      ];

      // ── CNREM ─────────────────────────────────────────────────────────────
      const cnremEMT: CourseEntry[] = [
        { code:'EMT101',title:'Introduction to Environmental Science',           deptCode:'EMT', level:100, credits: fixedCredits('EMT',100,0) },
        { code:'EMT102',title:'Fundamentals of Toxicology',                      deptCode:'EMT', level:100, credits: fixedCredits('EMT',100,1) },
        { code:'EMT201',title:'Environmental Chemistry',                         deptCode:'EMT', level:200, credits: fixedCredits('EMT',200,0) },
        { code:'EMT202',title:'Environmental Monitoring',                        deptCode:'EMT', level:200, credits: fixedCredits('EMT',200,1) },
        { code:'EMT301',title:'Pollution Control Technology',                    deptCode:'EMT', level:300, credits: fixedCredits('EMT',300,0) },
        { code:'EMT302',title:'Environmental Impact Assessment',                 deptCode:'EMT', level:300, credits: fixedCredits('EMT',300,1) },
        { code:'EMT401',title:'Environmental Law and Policy',                    deptCode:'EMT', level:400, credits: fixedCredits('EMT',400,0) },
        { code:'EMT402',title:'Hazardous Waste Management',                      deptCode:'EMT', level:400, credits: fixedCredits('EMT',400,1) },
      ];
      const cnremFAR: CourseEntry[] = [
        { code:'FAR101',title:'Introduction to Fisheries',                       deptCode:'FAR', level:100, credits: fixedCredits('FAR',100,0) },
        { code:'FAR102',title:'Aquatic Ecology',                                 deptCode:'FAR', level:100, credits: fixedCredits('FAR',100,1) },
        { code:'FAR201',title:'Fish Biology and Physiology',                     deptCode:'FAR', level:200, credits: fixedCredits('FAR',200,0) },
        { code:'FAR202',title:'Aquaculture Technology',                          deptCode:'FAR', level:200, credits: fixedCredits('FAR',200,1) },
        { code:'FAR301',title:'Fisheries Management',                            deptCode:'FAR', level:300, credits: fixedCredits('FAR',300,0) },
        { code:'FAR302',title:'Seafood Processing',                              deptCode:'FAR', level:300, credits: fixedCredits('FAR',300,1) },
        { code:'FAR401',title:'Marine Resource Economics',                       deptCode:'FAR', level:400, credits: fixedCredits('FAR',400,0) },
        { code:'FAR402',title:'Fish Health Management',                          deptCode:'FAR', level:400, credits: fixedCredits('FAR',400,1) },
      ];
      const cnremFEM: CourseEntry[] = [
        { code:'FEM101',title:'Introduction to Forestry',                        deptCode:'FEM', level:100, credits: fixedCredits('FEM',100,0) },
        { code:'FEM102',title:'Dendrology and Forest Ecology',                   deptCode:'FEM', level:100, credits: fixedCredits('FEM',100,1) },
        { code:'FEM201',title:'Forest Mensuration',                              deptCode:'FEM', level:200, credits: fixedCredits('FEM',200,0) },
        { code:'FEM202',title:'Forest Products and Industries',                  deptCode:'FEM', level:200, credits: fixedCredits('FEM',200,1) },
        { code:'FEM301',title:'Silviculture',                                    deptCode:'FEM', level:300, credits: fixedCredits('FEM',300,0) },
        { code:'FEM302',title:'Wildlife Management',                             deptCode:'FEM', level:300, credits: fixedCredits('FEM',300,1) },
        { code:'FEM401',title:'Forest Policy and Administration',                deptCode:'FEM', level:400, credits: fixedCredits('FEM',400,0) },
        { code:'FEM402',title:'Remote Sensing and GIS in Forestry',             deptCode:'FEM', level:400, credits: fixedCredits('FEM',400,1) },
      ];

      // ── COLNAS ────────────────────────────────────────────────────────────
      const colnasBCH: CourseEntry[] = [
        { code:'BCH101',title:'General Biochemistry I',                          deptCode:'BCH', level:100, credits: fixedCredits('BCH',100,0) },
        { code:'BCH102',title:'Chemistry for Biochemists',                       deptCode:'BCH', level:100, credits: fixedCredits('BCH',100,1) },
        { code:'BCH201',title:'Intermediary Metabolism',                         deptCode:'BCH', level:200, credits: fixedCredits('BCH',200,0) },
        { code:'BCH202',title:'Biochemical Techniques',                          deptCode:'BCH', level:200, credits: fixedCredits('BCH',200,1) },
        { code:'BCH301',title:'Enzymology',                                      deptCode:'BCH', level:300, credits: fixedCredits('BCH',300,0) },
        { code:'BCH302',title:'Molecular Biology',                               deptCode:'BCH', level:300, credits: fixedCredits('BCH',300,1) },
        { code:'BCH401',title:'Clinical Biochemistry',                           deptCode:'BCH', level:400, credits: fixedCredits('BCH',400,0) },
        { code:'BCH402',title:'Biotechnology and Genetic Engineering',           deptCode:'BCH', level:400, credits: fixedCredits('BCH',400,1) },
      ];
      const colnasMCB: CourseEntry[] = [
        { code:'MCB101',title:'General Microbiology',                            deptCode:'MCB', level:100, credits: fixedCredits('MCB',100,0) },
        { code:'MCB102',title:'Microbial World',                                 deptCode:'MCB', level:100, credits: fixedCredits('MCB',100,1) },
        { code:'MCB201',title:'Bacteriology',                                    deptCode:'MCB', level:200, credits: fixedCredits('MCB',200,0) },
        { code:'MCB202',title:'Virology',                                        deptCode:'MCB', level:200, credits: fixedCredits('MCB',200,1) },
        { code:'MCB301',title:'Immunology',                                      deptCode:'MCB', level:300, credits: fixedCredits('MCB',300,0) },
        { code:'MCB302',title:'Industrial Microbiology',                         deptCode:'MCB', level:300, credits: fixedCredits('MCB',300,1) },
        { code:'MCB401',title:'Medical Microbiology',                            deptCode:'MCB', level:400, credits: fixedCredits('MCB',400,0) },
        { code:'MCB402',title:'Microbial Ecology',                               deptCode:'MCB', level:400, credits: fixedCredits('MCB',400,1) },
      ];
      const colnasPSB: CourseEntry[] = [
        { code:'PSB101',title:'Introduction to Plant Science',                   deptCode:'PSB', level:100, credits: fixedCredits('PSB',100,0) },
        { code:'PSB102',title:'Plant Cell Biology',                              deptCode:'PSB', level:100, credits: fixedCredits('PSB',100,1) },
        { code:'PSB201',title:'Plant Physiology',                                deptCode:'PSB', level:200, credits: fixedCredits('PSB',200,0) },
        { code:'PSB202',title:'Plant Taxonomy',                                  deptCode:'PSB', level:200, credits: fixedCredits('PSB',200,1) },
        { code:'PSB301',title:'Plant Ecology',                                   deptCode:'PSB', level:300, credits: fixedCredits('PSB',300,0) },
        { code:'PSB302',title:'Plant Biotechnology',                             deptCode:'PSB', level:300, credits: fixedCredits('PSB',300,1) },
        { code:'PSB401',title:'Advanced Plant Genetics',                         deptCode:'PSB', level:400, credits: fixedCredits('PSB',400,0) },
        { code:'PSB402',title:'Ethnobotany and Economic Botany',                 deptCode:'PSB', level:400, credits: fixedCredits('PSB',400,1) },
      ];
      const colnasZEB: CourseEntry[] = [
        { code:'ZEB101',title:'Introduction to Zoology',                         deptCode:'ZEB', level:100, credits: fixedCredits('ZEB',100,0) },
        { code:'ZEB102',title:'Animal Diversity',                                deptCode:'ZEB', level:100, credits: fixedCredits('ZEB',100,1) },
        { code:'ZEB201',title:'Comparative Vertebrate Anatomy',                  deptCode:'ZEB', level:200, credits: fixedCredits('ZEB',200,0) },
        { code:'ZEB202',title:'Invertebrate Zoology',                            deptCode:'ZEB', level:200, credits: fixedCredits('ZEB',200,1) },
        { code:'ZEB301',title:'Animal Physiology',                               deptCode:'ZEB', level:300, credits: fixedCredits('ZEB',300,0) },
        { code:'ZEB302',title:'Environmental Biology',                           deptCode:'ZEB', level:300, credits: fixedCredits('ZEB',300,1) },
        { code:'ZEB401',title:'Wildlife Biology and Conservation',               deptCode:'ZEB', level:400, credits: fixedCredits('ZEB',400,0) },
        { code:'ZEB402',title:'Parasitology',                                    deptCode:'ZEB', level:400, credits: fixedCredits('ZEB',400,1) },
      ];

      // ── COLPAS ────────────────────────────────────────────────────────────
      const colpasCHM: CourseEntry[] = [
        { code:'CHM101',title:'General Chemistry I',                             deptCode:'CHM', level:100, credits: fixedCredits('CHM',100,0) },
        { code:'CHM102',title:'General Chemistry II',                            deptCode:'CHM', level:100, credits: fixedCredits('CHM',100,1) },
        { code:'CHM201',title:'Organic Chemistry I',                             deptCode:'CHM', level:200, credits: fixedCredits('CHM',200,0) },
        { code:'CHM202',title:'Analytical Chemistry',                            deptCode:'CHM', level:200, credits: fixedCredits('CHM',200,1) },
        { code:'CHM301',title:'Physical Chemistry',                              deptCode:'CHM', level:300, credits: fixedCredits('CHM',300,0) },
        { code:'CHM302',title:'Inorganic Chemistry',                             deptCode:'CHM', level:300, credits: fixedCredits('CHM',300,1) },
        { code:'CHM401',title:'Industrial Chemistry',                            deptCode:'CHM', level:400, credits: fixedCredits('CHM',400,0) },
        { code:'CHM402',title:'Environmental Chemistry',                         deptCode:'CHM', level:400, credits: fixedCredits('CHM',400,1) },
      ];
      const colpasCSC: CourseEntry[] = [
        { code:'CSC101',title:'Introduction to Computer Science',                deptCode:'CSC', level:100, credits: 3 },
        { code:'CSC102',title:'Introduction to Programming',                     deptCode:'CSC', level:100, credits: 2 },
        { code:'CSC201',title:'Object Oriented Programming',                     deptCode:'CSC', level:200, credits: fixedCredits('CSC',200,0) },
        { code:'CSC202',title:'Discrete Mathematics',                            deptCode:'CSC', level:200, credits: fixedCredits('CSC',200,1) },
        { code:'CSC301',title:'Data Structures & Algorithms',                    deptCode:'CSC', level:300, credits: fixedCredits('CSC',300,0) },
        { code:'CSC302',title:'Database Management Systems',                     deptCode:'CSC', level:300, credits: fixedCredits('CSC',300,1) },
        { code:'CSC303',title:'Operating Systems',                               deptCode:'CSC', level:300, credits: fixedCredits('CSC',300,2) },
        { code:'CSC401',title:'Software Engineering',                            deptCode:'CSC', level:400, credits: fixedCredits('CSC',400,0) },
        { code:'CSC402',title:'Artificial Intelligence',                         deptCode:'CSC', level:400, credits: fixedCredits('CSC',400,1) },
        { code:'CSC403',title:'Computer Networks',                               deptCode:'CSC', level:400, credits: fixedCredits('CSC',400,2) },
      ];
      const colpasGLG: CourseEntry[] = [
        { code:'GLG101',title:'Introduction to Geology',                         deptCode:'GLG', level:100, credits: fixedCredits('GLG',100,0) },
        { code:'GLG102',title:'Physical Geology',                                deptCode:'GLG', level:100, credits: fixedCredits('GLG',100,1) },
        { code:'GLG201',title:'Mineralogy',                                      deptCode:'GLG', level:200, credits: fixedCredits('GLG',200,0) },
        { code:'GLG202',title:'Stratigraphy and Palaeontology',                  deptCode:'GLG', level:200, credits: fixedCredits('GLG',200,1) },
        { code:'GLG301',title:'Structural Geology',                              deptCode:'GLG', level:300, credits: fixedCredits('GLG',300,0) },
        { code:'GLG302',title:'Hydrogeology',                                    deptCode:'GLG', level:300, credits: fixedCredits('GLG',300,1) },
        { code:'GLG401',title:'Economic Geology',                                deptCode:'GLG', level:400, credits: fixedCredits('GLG',400,0) },
        { code:'GLG402',title:'Environmental Geology',                           deptCode:'GLG', level:400, credits: fixedCredits('GLG',400,1) },
      ];
      const colpasMTH: CourseEntry[] = [
        { code:'MTH101',title:'Calculus I',                                      deptCode:'MTH', level:100, credits: 3 },
        { code:'MTH102',title:'Algebra and Number Theory',                       deptCode:'MTH', level:100, credits: 2 },
        { code:'MTH201',title:'Calculus II',                                     deptCode:'MTH', level:200, credits: fixedCredits('MTH',200,0) },
        { code:'MTH202',title:'Mathematical Methods',                            deptCode:'MTH', level:200, credits: fixedCredits('MTH',200,1) },
        { code:'MTH301',title:'Linear Algebra',                                  deptCode:'MTH', level:300, credits: fixedCredits('MTH',300,0) },
        { code:'MTH302',title:'Numerical Analysis',                              deptCode:'MTH', level:300, credits: fixedCredits('MTH',300,1) },
        { code:'MTH401',title:'Real Analysis',                                   deptCode:'MTH', level:400, credits: fixedCredits('MTH',400,0) },
        { code:'MTH402',title:'Complex Analysis',                                deptCode:'MTH', level:400, credits: fixedCredits('MTH',400,1) },
      ];
      const colpasPHY: CourseEntry[] = [
        { code:'PHY101',title:'General Physics I',                               deptCode:'PHY', level:100, credits: 3 },
        { code:'PHY102',title:'General Physics II',                              deptCode:'PHY', level:100, credits: 2 },
        { code:'PHY201',title:'Classical Mechanics',                             deptCode:'PHY', level:200, credits: fixedCredits('PHY',200,0) },
        { code:'PHY202',title:'Waves and Optics',                                deptCode:'PHY', level:200, credits: fixedCredits('PHY',200,1) },
        { code:'PHY301',title:'Quantum Mechanics',                               deptCode:'PHY', level:300, credits: fixedCredits('PHY',300,0) },
        { code:'PHY302',title:'Electromagnetism',                                deptCode:'PHY', level:300, credits: fixedCredits('PHY',300,1) },
        { code:'PHY401',title:'Solid State Physics',                             deptCode:'PHY', level:400, credits: fixedCredits('PHY',400,0) },
        { code:'PHY402',title:'Nuclear and Particle Physics',                    deptCode:'PHY', level:400, credits: fixedCredits('PHY',400,1) },
      ];
      const colpasSTA: CourseEntry[] = [
        { code:'STA101',title:'Introduction to Statistics',                      deptCode:'STA', level:100, credits: 3 },
        { code:'STA102',title:'Probability Theory I',                            deptCode:'STA', level:100, credits: 2 },
        { code:'STA201',title:'Statistical Inference',                           deptCode:'STA', level:200, credits: fixedCredits('STA',200,0) },
        { code:'STA202',title:'Probability Theory II',                           deptCode:'STA', level:200, credits: fixedCredits('STA',200,1) },
        { code:'STA301',title:'Regression Analysis',                             deptCode:'STA', level:300, credits: fixedCredits('STA',300,0) },
        { code:'STA302',title:'Sampling Theory',                                 deptCode:'STA', level:300, credits: fixedCredits('STA',300,1) },
        { code:'STA401',title:'Time Series Analysis',                            deptCode:'STA', level:400, credits: fixedCredits('STA',400,0) },
        { code:'STA402',title:'Multivariate Analysis',                           deptCode:'STA', level:400, credits: fixedCredits('STA',400,1) },
      ];

      // ── CVM ───────────────────────────────────────────────────────────────
      // Veterinary programmes run 300–600 level
      const cvmVAM: CourseEntry[] = [
        { code:'VAM101',title:'Gross Anatomy of Domestic Animals I',             deptCode:'VAM', level:100, credits: fixedCredits('VAM',100,0) },
        { code:'VAM102',title:'Histology and Embryology I',                      deptCode:'VAM', level:100, credits: fixedCredits('VAM',100,1) },
        { code:'VAM201',title:'Gross Anatomy of Domestic Animals II',            deptCode:'VAM', level:200, credits: fixedCredits('VAM',200,0) },
        { code:'VAM202',title:'Neuroanatomy',                                    deptCode:'VAM', level:200, credits: fixedCredits('VAM',200,1) },
        { code:'VAM301',title:'Applied Anatomy',                                 deptCode:'VAM', level:300, credits: fixedCredits('VAM',300,0) },
        { code:'VAM302',title:'Topographic Anatomy',                             deptCode:'VAM', level:300, credits: fixedCredits('VAM',300,1) },
        { code:'VAM401',title:'Anatomical Pathology',                            deptCode:'VAM', level:400, credits: fixedCredits('VAM',400,0) },
        { code:'VAM501',title:'Advanced Anatomy Seminars',                       deptCode:'VAM', level:500, credits: fixedCredits('VAM',500,0) },
      ];
      const cvmVET: CourseEntry[] = [
        { code:'VET101',title:'Introduction to Veterinary Medicine',             deptCode:'VET', level:100, credits: fixedCredits('VET',100,0) },
        { code:'VET102',title:'Veterinary Orientation',                          deptCode:'VET', level:100, credits: fixedCredits('VET',100,1) },
        { code:'VET201',title:'Veterinary Pharmacology I',                       deptCode:'VET', level:200, credits: fixedCredits('VET',200,0) },
        { code:'VET202',title:'Clinical Examination of Animals',                 deptCode:'VET', level:200, credits: fixedCredits('VET',200,1) },
        { code:'VET301',title:'Veterinary Pathology',                            deptCode:'VET', level:300, credits: fixedCredits('VET',300,0) },
        { code:'VET302',title:'Veterinary Medicine I',                           deptCode:'VET', level:300, credits: fixedCredits('VET',300,1) },
        { code:'VET401',title:'Clinical Medicine',                               deptCode:'VET', level:400, credits: fixedCredits('VET',400,0) },
        { code:'VET402',title:'Veterinary Toxicology',                           deptCode:'VET', level:400, credits: fixedCredits('VET',400,1) },
        { code:'VET501',title:'Veterinary Medicine II',                          deptCode:'VET', level:500, credits: fixedCredits('VET',500,0) },
        { code:'VET601',title:'Clinical Rotations',                              deptCode:'VET', level:600, credits: 4 },
      ];
      const cvmVMB: CourseEntry[] = [
        { code:'VMB101',title:'Introduction to Veterinary Microbiology',         deptCode:'VMB', level:100, credits: fixedCredits('VMB',100,0) },
        { code:'VMB201',title:'Veterinary Bacteriology',                         deptCode:'VMB', level:200, credits: fixedCredits('VMB',200,0) },
        { code:'VMB301',title:'Veterinary Virology',                             deptCode:'VMB', level:300, credits: fixedCredits('VMB',300,0) },
        { code:'VMB302',title:'Veterinary Mycology',                             deptCode:'VMB', level:300, credits: fixedCredits('VMB',300,1) },
        { code:'VMB401',title:'Veterinary Immunology',                           deptCode:'VMB', level:400, credits: fixedCredits('VMB',400,0) },
        { code:'VMB501',title:'Diagnostic Veterinary Microbiology',              deptCode:'VMB', level:500, credits: fixedCredits('VMB',500,0) },
      ];
      const cvmVPH: CourseEntry[] = [
        { code:'VPH101',title:'Introduction to Veterinary Public Health',        deptCode:'VPH', level:100, credits: fixedCredits('VPH',100,0) },
        { code:'VPH201',title:'Epidemiology and Biostatistics',                  deptCode:'VPH', level:200, credits: fixedCredits('VPH',200,0) },
        { code:'VPH301',title:'Meat Hygiene and Technology',                     deptCode:'VPH', level:300, credits: fixedCredits('VPH',300,0) },
        { code:'VPH302',title:'Milk and Dairy Hygiene',                          deptCode:'VPH', level:300, credits: fixedCredits('VPH',300,1) },
        { code:'VPH401',title:'Zoonoses',                                        deptCode:'VPH', level:400, credits: fixedCredits('VPH',400,0) },
        { code:'VPH501',title:'One Health Approaches',                           deptCode:'VPH', level:500, credits: fixedCredits('VPH',500,0) },
      ];
      const cvmVSR: CourseEntry[] = [
        { code:'VSR101',title:'Introduction to Veterinary Surgery',              deptCode:'VSR', level:100, credits: fixedCredits('VSR',100,0) },
        { code:'VSR201',title:'Veterinary Anaesthesiology',                      deptCode:'VSR', level:200, credits: fixedCredits('VSR',200,0) },
        { code:'VSR301',title:'General Veterinary Surgery',                      deptCode:'VSR', level:300, credits: fixedCredits('VSR',300,0) },
        { code:'VSR302',title:'Veterinary Radiology',                            deptCode:'VSR', level:300, credits: fixedCredits('VSR',300,1) },
        { code:'VSR401',title:'Orthopaedic Surgery',                             deptCode:'VSR', level:400, credits: fixedCredits('VSR',400,0) },
        { code:'VSR501',title:'Soft Tissue Surgery',                             deptCode:'VSR', level:500, credits: fixedCredits('VSR',500,0) },
      ];
      const cvmTHR: CourseEntry[] = [
        { code:'THR101',title:'Introduction to Animal Reproduction',             deptCode:'THR', level:100, credits: fixedCredits('THR',100,0) },
        { code:'THR201',title:'Reproductive Anatomy',                            deptCode:'THR', level:200, credits: fixedCredits('THR',200,0) },
        { code:'THR301',title:'Reproductive Physiology',                         deptCode:'THR', level:300, credits: fixedCredits('THR',300,0) },
        { code:'THR302',title:'Obstetrics in Large Animals',                     deptCode:'THR', level:300, credits: fixedCredits('THR',300,1) },
        { code:'THR401',title:'Assisted Reproductive Technology',                deptCode:'THR', level:400, credits: fixedCredits('THR',400,0) },
        { code:'THR501',title:'Advanced Theriogenology',                         deptCode:'THR', level:500, credits: fixedCredits('THR',500,0) },
      ];

      // ── SGS ───────────────────────────────────────────────────────────────
      const buildSGS = (deptCode: string, subject: string): CourseEntry[] => [
        { code:`${deptCode}101`,title:`Introduction to ${subject}`,              deptCode, level:100, credits: fixedCredits(deptCode,100,0) },
        { code:`${deptCode}102`,title:`${subject} for Academic Purposes`,        deptCode, level:100, credits: fixedCredits(deptCode,100,1) },
        { code:`${deptCode}201`,title:`Intermediate ${subject}`,                 deptCode, level:200, credits: fixedCredits(deptCode,200,0) },
        { code:`${deptCode}202`,title:`${subject} Literature`,                   deptCode, level:200, credits: fixedCredits(deptCode,200,1) },
        { code:`${deptCode}301`,title:`Advanced ${subject}`,                     deptCode, level:300, credits: fixedCredits(deptCode,300,0) },
        { code:`${deptCode}302`,title:`Research Methods in ${subject}`,          deptCode, level:300, credits: fixedCredits(deptCode,300,1) },
        { code:`${deptCode}401`,title:`Seminar in ${subject}`,                   deptCode, level:400, credits: fixedCredits(deptCode,400,0) },
        { code:`${deptCode}402`,title:`${subject} Project`,                      deptCode, level:400, credits: fixedCredits(deptCode,400,1) },
      ];
      const sgsENG = buildSGS('ENG','English Studies');
      const sgsFRN = buildSGS('FRN','French');
      const sgsGER = buildSGS('GER','German');
      const sgsHIS = buildSGS('HIS','History');
      const sgsSOC = buildSGS('SOC','Social Science');
      const sgsPHE = buildSGS('PHE','Physical and Health Education');
      const sgsPHL = buildSGS('PHL','Philosophy');
      const sgsPCS = buildSGS('PCS','Peace and Conflict Studies');

      // ── GST (General Studies — cross-cutting) ────────────────────────────
      // These are offered by SGS but taken by all students
      const gstCourses: CourseEntry[] = [
        { code:'GST101',title:'Communication in English',          deptCode:'ENG', level:100, credits:2, semester:1 },
        { code:'GST102',title:'Use of Library and Study Skills',   deptCode:'LIS', level:100, credits:1, semester:1 },
        { code:'GST111',title:'Nigerian People and Culture',       deptCode:'HIS', level:100, credits:2, semester:2 },
        { code:'GST112',title:'Philosophy and Logic',              deptCode:'PHL', level:100, credits:2, semester:2 },
        { code:'GST201',title:'Logic, Philosophy and Human Existence', deptCode:'PHL', level:200, credits:2, semester:1 },
        { code:'GST202',title:'Introduction to Entrepreneurship',  deptCode:'ENT', level:200, credits:2, semester:2 },
        { code:'GST301',title:'Peace and Conflict Resolution',     deptCode:'PCS', level:300, credits:2, semester:1 },
        { code:'GST302',title:'Entrepreneurship and Innovation',   deptCode:'ENT', level:300, credits:2, semester:2 },
      ];

      // ── Assemble all courses ──────────────────────────────────────────────
      const allCoursesRaw: CourseEntry[] = [
        ...caerseABM, ...caerseAEC, ...caerseAERS,
        ...casapABP,  ...casapANF,  ...casapAPL,
        ...cafstFST,  ...cafstHND,  ...cafstHHT,
        ...ccssAGR,   ...ccssPHM,   ...ccssSSM,   ...ccssWRM,
        ...coedACE,   ...coedAHE,   ...coedBED,   ...coedECE, ...coedEDM,
        ...coedITE,   ...coedLIS,   ...coedGCA,   ...coedISE,
        ...ceetABE,   ...ceetCVE,   ...ceetCHE,   ...ceetCPE, ...ceetEEE, ...ceetMCE,
        ...colmasACC, ...colmasBUS, ...colmasHRM,  ...colmasIRP, ...colmasENT,
        ...cnremEMT,  ...cnremFAR,  ...cnremFEM,
        ...colnasBCH, ...colnasMCB, ...colnasPSB,  ...colnasZEB,
        ...colpasCHM, ...colpasCSC, ...colpasGLG,  ...colpasMTH, ...colpasPHY, ...colpasSTA,
        ...cvmVAM,    ...cvmVET,    ...cvmVMB,    ...cvmVPH,   ...cvmVSR,   ...cvmTHR,
        ...sgsENG,    ...sgsFRN,    ...sgsGER,    ...sgsHIS,
        ...sgsSOC,    ...sgsPHE,    ...sgsPHL,    ...sgsPCS,
        ...gstCourses,
      ];

      const courses: any[] = [];
      for (const c of allCoursesRaw) {
        const course = await prisma.course.upsert({
          where:  { code: c.code },
          update: {},
          create: {
            code:         c.code,
            title:        c.title,
            departmentId: getDept(c.deptCode).id,
            creditUnits:  c.credits,
            level:        c.level,
            semester:     c.semester ?? (c.code.endsWith('2') ? 2 : 1),
          },
        });
        courses.push(course);
      }
      results.push(`✓ ${courses.length} courses`);

      const getCourse = (code: string) => {
        const c = courses.find(c => c.code === code);
        if (!c) throw new Error(`Course not found: ${code}`);
        return c;
      };
      
      // After courses are created:
      results.push(`✓ ${courses.length} courses`);
      progressBroadcaster.broadcastProgress('courses', 'Courses created', `${courses.length} courses`, '📚✅');

      // ── Course registrations ──────────────────────────────────────────────
      progressBroadcaster.broadcastProgress('registrations', 'Registering students for courses...', 'Processing registrations', '📋');
     
      // ── Course registrations ──────────────────────────────────────────────
      let regCount = 0;
      const allDeptCodes = deptData.map(d => d.code);

      for (const deptCode of allDeptCodes) {
        const dept         = getDept(deptCode);
        const deptStudents = students.filter(s => s.departmentId === dept.id);
        const deptCourses  = courses.filter(c => c.departmentId === dept.id);

        for (const student of deptStudents) {
          for (const course of deptCourses) {
            const diff = (student.levelNum ?? 100) - (course.level ?? 100);
            // Own level + one below (carry-over) + one above (borrowed)
            if (diff === 0 || diff === 100 || diff === -100) {
              const regType: 'normal' | 'carry_over' | 'borrowed' =
                diff === 0   ? 'normal'     :
                diff === 100 ? 'carry_over' : 'borrowed';
              for (const sem of [1, 2]) {
                try {
                  await prisma.courseRegistration.upsert({
                    where: {
                      studentId_courseId_session_semester: {
                        studentId: student.id,
                        courseId:  course.id,
                        session:   student.session,
                        semester:  sem,
                      },
                    },
                    update: {},
                    create: {
                      studentId:        student.id,
                      courseId:         course.id,
                      session:          student.session,
                      semester:         sem,
                      levelId:          getLevel(student.levelNum).id,
                      registrationType: regType,
                      status:           regType === 'normal' ? 'approved' : 'pending',
                    },
                  });
                  regCount++;
                } catch { /* skip duplicate */ }
              }
            }
          }

          // Also register GST courses for all students (both semesters)
          for (const gst of gstCourses) {
            const levelDiff = (student.levelNum ?? 100) - (gst.level ?? 100);
            if (levelDiff === 0) {
              const gstCourse = courses.find(c => c.code === gst.code);
              if (!gstCourse) continue;
              for (const sem of [1, 2]) {
                try {
                  await prisma.courseRegistration.upsert({
                    where: {
                      studentId_courseId_session_semester: {
                        studentId: student.id,
                        courseId:  gstCourse.id,
                        session:   student.session,
                        semester:  sem,
                      },
                    },
                    update: {},
                    create: {
                      studentId:        student.id,
                      courseId:         gstCourse.id,
                      session:          student.session,
                      semester:         sem,
                      levelId:          getLevel(student.levelNum).id,
                      registrationType: 'normal',
                      status:           'approved',
                    },
                  });
                  regCount++;
                } catch { /* skip */ }
              }
            }
          }
        }
      }
      results.push(`✓ ${regCount} course registrations`);

      
      progressBroadcaster.broadcastProgress('registrations', 'Registrations completed', `${regCount} registrations`, '📋✅');

      // ── Exam ──────────────────────────────────────────────────────────────
      progressBroadcaster.broadcastProgress('exam', 'Creating exam records...', 'Setting up exams', '📝');
      // ── Exam ──────────────────────────────────────────────────────────────
      const EXAM_ID = '00000000-0000-0000-0000-000000000001';
      const cscLecturer = lecturers.find(l => l.departmentId === getDept('CSC').id) ?? lecturers[0];

      const exam = await prisma.exam.upsert({
        where:  { id: EXAM_ID },
        update: {},
        create: {
          id:                EXAM_ID,
          courseId:          getCourse('CSC301').id,
          createdBy:         cscLecturer.id,
          title:             'CSC301 — First Semester Examination',
          instructions:      'Answer all questions. No external resources. Time limit strictly enforced.',
          durationMinutes:   60,
          totalMarks:        40,
          passMark:          20,
          status:            'active',
          scheduledStart:    new Date(),
          scheduledEnd:      new Date(Date.now() + 2 * 60 * 60 * 1000),
          randomizeQuestions: true,
          randomizeOptions:   true,
          questionsToPresent: 12,
          showResultAfter:    true,
          maxViolations:      5,
          session:            '2025/2026',
          semester:           1,
          levels: {
            connect: [getLevel(300), getLevel(400)].map(l => ({ id: l.id })),
          },
        },
      });

      // Second demo exam — ACC201
      const EXAM_ID_2 = '00000000-0000-0000-0000-000000000002';
      const accLecturer = lecturers.find(l => l.departmentId === getDept('ACC').id) ?? lecturers[0];

      await prisma.exam.upsert({
        where:  { id: EXAM_ID_2 },
        update: {},
        create: {
          id:                EXAM_ID_2,
          courseId:          getCourse('ACC201').id,
          createdBy:         accLecturer.id,
          title:             'ACC201 — Management Accounting Mid-Semester',
          instructions:      'Answer all questions. Calculators not permitted.',
          durationMinutes:   45,
          totalMarks:        30,
          passMark:          15,
          status:            'scheduled',
          scheduledStart:    new Date(Date.now() + 24 * 60 * 60 * 1000),
          scheduledEnd:      new Date(Date.now() + 26 * 60 * 60 * 1000),
          randomizeQuestions: true,
          randomizeOptions:   true,
          questionsToPresent: 10,
          showResultAfter:    false,
          maxViolations:      3,
          session:            '2025/2026',
          semester:           1,
          levels: {
            connect: [getLevel(200)].map(l => ({ id: l.id })),
          },
        },
      });

      await prisma.examInvigilator.upsert({
        where:  { examId_invigilatorId: { examId: exam.id, invigilatorId: invigilators[0].id } },
        update: {},
        create: { examId: exam.id, invigilatorId: invigilators[0].id },
      });      
      progressBroadcaster.broadcastProgress('exam', 'Exams created', '2 exams', '📝✅');

      // ── Questions ─────────────────────────────────────────────────────────
      progressBroadcaster.broadcastProgress('questions', 'Creating exam questions...', 'Generating questions', '❓');


      // ── Questions (CSC301) ────────────────────────────────────────────────
      const mcqData = [
        { body: 'Which data structure uses LIFO (Last In First Out) ordering?',         topic:'Data Structures',   options: ['Queue', 'Stack', 'Linked List', 'Binary Tree'],                   correct: 1 },
        { body: 'What is the time complexity of binary search on a sorted array?',      topic:'Algorithms',        options: ['O(n)', 'O(n²)', 'O(log n)', 'O(1)'],                              correct: 2 },
        { body: 'Which sorting algorithm has the best average-case time complexity?',   topic:'Sorting',           options: ['Bubble Sort', 'Insertion Sort', 'Merge Sort', 'Selection Sort'],   correct: 2 },
        { body: 'A graph with no cycles is called a ___.',                              topic:'Graph Theory',      options: ['Complete Graph', 'Tree', 'Bipartite Graph', 'Directed Graph'],     correct: 1 },
        { body: 'Which traversal visits nodes in Left → Root → Right order?',          topic:'Trees',             options: ['Preorder', 'Postorder', 'Inorder', 'Level Order'],                 correct: 2 },
        { body: 'What is the worst-case time complexity of QuickSort?',                 topic:'Sorting',           options: ['O(n log n)', 'O(n)', 'O(n²)', 'O(log n)'],                        correct: 2 },
        { body: 'Which data structure is used for implementing BFS?',                  topic:'Graph Theory',      options: ['Stack', 'Queue', 'Heap', 'Priority Queue'],                        correct: 1 },
        { body: 'In a max-heap, the root node contains the ___ element.',              topic:'Data Structures',   options: ['Smallest', 'Median', 'Largest', 'Random'],                        correct: 2 },
        { body: 'What is the space complexity of merge sort?',                         topic:'Sorting',           options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],                         correct: 2 },
        { body: 'Which of these is a self-balancing binary search tree?',              topic:'Trees',             options: ['Red-Black Tree', 'Complete Binary Tree', 'Min Heap', 'Trie'],      correct: 0 },
        { body: 'What does the head pointer of a singly linked list point to?',       topic:'Data Structures',   options: ['Last node', 'Middle node', 'First node', 'NULL'],                  correct: 2 },
        { body: 'Which algorithm is used to detect a cycle in a linked list?',        topic:'Algorithms',        options: ['BFS', "Floyd's algorithm", 'Dijkstra', 'Kruskal'],                 correct: 1 },
        { body: 'In Big-O notation, O(1) means ___.',                                  topic:'Algorithms',        options: ['Linear time', 'Logarithmic time', 'Constant time', 'Quadratic'], correct: 2 },
        { body: 'A stack is typically implemented using which underlying structure?',  topic:'Data Structures',   options: ['Queue', 'Array or Linked List', 'Graph', 'Hash Table'],            correct: 1 },
        { body: 'Which graph algorithm finds the minimum spanning tree?',              topic:'Graph Theory',      options: ['Dijkstra', 'BFS', "Kruskal's", 'Topological Sort'],               correct: 2 },
        { body: "Depth-first search uses which data structure internally?",            topic:'Graph Theory',      options: ['Queue', 'Stack', 'Heap', 'Deque'],                                correct: 1 },
        { body: 'What is the average-case time complexity of hash table lookup?',     topic:'Hashing',           options: ['O(n)', 'O(n log n)', 'O(1)', 'O(log n)'],                         correct: 2 },
        { body: 'Binary search requires the array to be ___.',                         topic:'Algorithms',        options: ['Sorted', 'Unsorted', 'Unique', 'Reversed'],                       correct: 0 },
        { body: 'Which of these sorting algorithms is NOT comparison-based?',         topic:'Sorting',           options: ['Merge Sort', 'Radix Sort', 'Heap Sort', 'Quick Sort'],             correct: 1 },
        { body: 'The height of a balanced binary tree with n nodes is ___.',          topic:'Trees',             options: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'],                              correct: 1 },
      ];

      const fitbData = [
        { body: 'The process of removing an element from a stack is called ___.',            topic:'Data Structures', answer: 'popping'    },
        { body: 'A hash table resolves collisions using chaining or open ___.',             topic:'Hashing',         answer: 'addressing' },
        { body: 'The number of edges in a complete graph with n vertices is n(n-1)/___.', topic:'Graph Theory',    answer: '2'          },
        { body: "Dijkstra's algorithm finds the ___ path between nodes in a graph.",        topic:'Graph Theory',    answer: 'shortest'   },
        { body: 'In a queue, insertion happens at the ___ and deletion at the front.',      topic:'Data Structures', answer: 'rear'       },
        { body: 'A tree with exactly two children per node is called a ___ tree.',          topic:'Trees',           answer: 'binary'     },
        { body: 'The process of rearranging elements in a heap to maintain the heap property is called ___-ifying.', topic:'Data Structures', answer: 'heap' },
        { body: 'The inorder traversal of a Binary Search Tree yields elements in ___ order.', topic:'Trees',        answer: 'sorted'     },
      ];

      let qCount = 0;
      for (const [i, q] of mcqData.entries()) {
        const exists = await prisma.question.findFirst({ where: { examId: exam.id, body: q.body } });
        if (!exists) {
          await prisma.question.create({
            data: {
              examId: exam.id, type: 'mcq', body: q.body, marks: 3,
              topic: q.topic, orderIndex: i,
              options: {
                create: q.options.map((text, j) => ({ optionText: text, isCorrect: j === q.correct, orderIndex: j })),
              },
            },
          });
          qCount++;
        }
      }

      for (const [i, q] of fitbData.entries()) {
        const exists = await prisma.question.findFirst({ where: { examId: exam.id, body: q.body } });
        if (!exists) {
          await prisma.question.create({
            data: {
              examId: exam.id, type: 'fill_in_the_blank', body: q.body, marks: 4,
              topic: q.topic, orderIndex: mcqData.length + i,
              fitbAnswers: { create: [{ acceptedAnswer: q.answer, isPrimary: true }] },
            },
          });
          qCount++;
        }
      }
      results.push(`✓ ${qCount} questions`);
      
      progressBroadcaster.broadcastProgress('questions', 'Questions created', `${qCount} questions`, '❓✅');

      // ── Notifications ─────────────────────────────────────────────────────
      progressBroadcaster.broadcastProgress('notifications', 'Creating welcome notifications...', 'For all users', '🔔');

           // ── Notifications ─────────────────────────────────────────────────────
      progressBroadcaster.broadcastProgress('notifications', 'Creating welcome notifications...', 'For all users', '🔔');
      
      const allStaff = [...admins, ...lecturers, ...invigilators];
      let notifCount = 0;
      for (const user of allStaff) {
        try {
          await prisma.notification.create({
            data: {
              userId:  user.id,
              title:   'Welcome to MOUAU eTest',
              message: `Welcome, ${user.fullName}! Your account is ready. Log in to get started.`,
            },
          });
          notifCount++;
        } catch { /* skip */ }
      }
      for (const student of students) {
        try {
          await prisma.notification.create({
            data: {
              userId:  student.id,
              title:   'Welcome to MOUAU eTest',
              message: `Welcome, ${student.fullName}! Your courses have been pre-registered for the 2025/2026 session.`,
            },
          });
          notifCount++;
        } catch { /* skip */ }
      }
      results.push(`✓ ${notifCount} welcome notifications`);
      progressBroadcaster.broadcastProgress('notifications', 'Notifications created', `${notifCount} notifications`, '🔔✅');

      // ── User preferences ──────────────────────────────────────────────────
      progressBroadcaster.broadcastProgress('preferences', 'Setting user preferences...', 'Default settings', '⚙️');
      
      const allUsers = [...admins, ...lecturers, ...invigilators, ...students];
      let prefCount = 0;
      for (const user of allUsers) {
        try {
          await prisma.userPreference.upsert({
            where:  { userId: user.id },
            update: {},
            create: {
              userId: user.id,
              prefs:  { theme: 'system', language: 'en', emailNotifications: true, fontSize: 'medium' },
            },
          });
          prefCount++;
        } catch { /* skip */ }
      }
      results.push(`✓ ${prefCount} user preferences`);
      progressBroadcaster.broadcastProgress('preferences', 'Preferences configured', `${prefCount} preferences`, '⚙️✅');

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
      
      await prisma.faceSimilarity.deleteMany();
      await prisma.faceVerificationLog.deleteMany();
      await prisma.examResult.deleteMany();
      await prisma.studentAnswer.deleteMany();
      await prisma.sessionOptionOrder.deleteMany();
      await prisma.sessionQuestionOrder.deleteMany();
      await prisma.violation.deleteMany();
      await prisma.examSession.deleteMany();
      await prisma.examInvigilator.deleteMany();
      await prisma.examLevel.deleteMany();
      await prisma.examDepartment.deleteMany();
      await prisma.question.deleteMany();
      await prisma.exam.deleteMany();
      await prisma.courseRegistration.deleteMany();
      await prisma.course.deleteMany();
      await prisma.faceDescriptor.deleteMany();
      await prisma.passwordReset.deleteMany();
      await prisma.authSession.deleteMany();
      await prisma.notification.deleteMany();
      await prisma.userPreference.deleteMany();
      await prisma.auditLog.deleteMany();
      await prisma.apiAccessLog.deleteMany();
      await prisma.apiKey.deleteMany();
      await prisma.user.deleteMany();
      await prisma.department.deleteMany();
      await prisma.college.deleteMany();
      await prisma.level.deleteMany();

      progressBroadcaster.broadcastComplete('Database reset completed successfully!');
      return { success: true, results: ['✓ All data cleared'] };
      
    } catch (err) {
      progressBroadcaster.broadcastError(err instanceof Error ? err.message : 'Reset failed');
      return fail(500, { error: err instanceof Error ? err.message : 'Reset failed' });
    }
  },
};