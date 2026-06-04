// src/routes/(admin)/seed/+page.server.ts
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireAdmin } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';
import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

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

export const actions: Actions = {
  seed: async ({ locals }) => {
    const userCount = await prisma.user.count();
    if (userCount > 0) requireAdmin(locals.user);

    try {
      const results: string[] = [];

      // ── Levels ────────────────────────────────────────────────────────────
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

      // Helper — called AFTER levels is populated
      const getLevel = (levelNum: number) => {
        const lvl = levels.find(l => l.level === levelNum);
        if (!lvl) throw new Error(`Level not found: ${levelNum}`);
        return lvl;
      };

      // ── Colleges ──────────────────────────────────────────────────────────
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

      const getCollege = (code: string) => {
        const c = colleges.find(c => c.code === code);
        if (!c) throw new Error(`College not found: ${code}`);
        return c;
      };

      // ── Departments ───────────────────────────────────────────────────────
      const deptData = [
        // CAERSE
        { name: 'Agribusiness and Management',                    code: 'ABM',  collegeCode: 'CAERSE' },
        { name: 'Agricultural Economics',                         code: 'AEC',  collegeCode: 'CAERSE' },
        { name: 'Agricultural Extension and Rural Sociology',     code: 'AERS', collegeCode: 'CAERSE' },
        // CASAP
        { name: 'Animal Breeding and Physiology',                 code: 'ABP',  collegeCode: 'CASAP' },
        { name: 'Animal Nutrition and Forage Science',            code: 'ANF',  collegeCode: 'CASAP' },
        { name: 'Animal Production and Livestock Management',     code: 'APL',  collegeCode: 'CASAP' },
        // CAFST
        { name: 'Human Nutrition and Dietetics',                  code: 'HND',  collegeCode: 'CAFST' },
        { name: 'Home Science, Hospitality Management & Tourism', code: 'HHT',  collegeCode: 'CAFST' },
        { name: 'Food Science and Technology',                    code: 'FST',  collegeCode: 'CAFST' },
        // CCSS
        { name: 'Agronomy',                                       code: 'AGR',  collegeCode: 'CCSS' },
        { name: 'Plant Health Management',                        code: 'PHM',  collegeCode: 'CCSS' },
        { name: 'Soil Science and Meteorology',                   code: 'SSM',  collegeCode: 'CCSS' },
        { name: 'Water Resources Management and Agrometeorology', code: 'WRM',  collegeCode: 'CCSS' },
        // COED
        { name: 'Adult and Continuing Education',                 code: 'ACE',  collegeCode: 'COED' },
        { name: 'Agricultural/Home Science Education',            code: 'AHE',  collegeCode: 'COED' },
        { name: 'Business Education',                             code: 'BED',  collegeCode: 'COED' },
        { name: 'Economics Education',                            code: 'ECE',  collegeCode: 'COED' },
        { name: 'Education Management',                           code: 'EDM',  collegeCode: 'COED' },
        { name: 'Industrial Technology Education',                code: 'ITE',  collegeCode: 'COED' },
        { name: 'Library and Information Science',                code: 'LIS',  collegeCode: 'COED' },
        { name: 'Guidance and Counselling',                       code: 'GCA',  collegeCode: 'COED' },
        { name: 'Integrated Science Education',                   code: 'ISE',  collegeCode: 'COED' },
        // CEET
        { name: 'Agricultural and Bioresources Engineering',      code: 'ABE',  collegeCode: 'CEET' },
        { name: 'Civil Engineering',                              code: 'CVE',  collegeCode: 'CEET' },
        { name: 'Chemical Engineering',                           code: 'CHE',  collegeCode: 'CEET' },
        { name: 'Computer Engineering',                           code: 'CPE',  collegeCode: 'CEET' },
        { name: 'Electrical and Electronics Engineering',         code: 'EEE',  collegeCode: 'CEET' },
        { name: 'Mechanical Engineering',                         code: 'MCE',  collegeCode: 'CEET' },
        // COLMAS
        { name: 'Industrial Relations and Personnel Management',  code: 'IRP',  collegeCode: 'COLMAS' },
        { name: 'Human Resource Management',                      code: 'HRM',  collegeCode: 'COLMAS' },
        { name: 'Business Administration',                        code: 'BUS',  collegeCode: 'COLMAS' },
        { name: 'Accounting',                                     code: 'ACC',  collegeCode: 'COLMAS' },
        // CNREM
        { name: 'Environment Management and Toxicology',          code: 'EMT',  collegeCode: 'CNREM' },
        { name: 'Fisheries and Aquatic Resources Management',     code: 'FAR',  collegeCode: 'CNREM' },
        { name: 'Forestry and Environmental Management',          code: 'FEM',  collegeCode: 'CNREM' },
        // COLNAS
        { name: 'Biochemistry',                                   code: 'BCH',  collegeCode: 'COLNAS' },
        { name: 'Microbiology',                                   code: 'MCB',  collegeCode: 'COLNAS' },
        { name: 'Plant Science and Biotechnology',                code: 'PSB',  collegeCode: 'COLNAS' },
        { name: 'Zoology and Environmental Biology',              code: 'ZEB',  collegeCode: 'COLNAS' },
        // COLPAS
        { name: 'Chemistry',                                      code: 'CHM',  collegeCode: 'COLPAS' },
        { name: 'Computer Science',                               code: 'CSC',  collegeCode: 'COLPAS' },
        { name: 'Geology',                                        code: 'GLG',  collegeCode: 'COLPAS' },
        { name: 'Mathematics',                                    code: 'MTH',  collegeCode: 'COLPAS' },
        { name: 'Physics',                                        code: 'PHY',  collegeCode: 'COLPAS' },
        { name: 'Statistics',                                     code: 'STA',  collegeCode: 'COLPAS' },
        // CVM
        { name: 'Theriogenology',                                 code: 'THR',  collegeCode: 'CVM' },
        { name: 'Veterinary Anatomy',                             code: 'VAM',  collegeCode: 'CVM' },
        { name: 'Veterinary Medicine',                            code: 'VET',  collegeCode: 'CVM' },
        { name: 'Veterinary Microbiology',                        code: 'VMB',  collegeCode: 'CVM' },
        { name: 'Veterinary Public Health and Preventive Medicine', code: 'VPH', collegeCode: 'CVM' },
        { name: 'Veterinary Surgery and Radiology',               code: 'VSR',  collegeCode: 'CVM' },
        // SGS
        { name: 'English',                                        code: 'ENG',  collegeCode: 'SGS' },
        { name: 'French',                                         code: 'FRN',  collegeCode: 'SGS' },
        { name: 'German',                                         code: 'GER',  collegeCode: 'SGS' },
        { name: 'History',                                        code: 'HIS',  collegeCode: 'SGS' },
        { name: 'Social Science',                                 code: 'SOC',  collegeCode: 'SGS' },
        { name: 'Physical and Health Education',                  code: 'PHE',  collegeCode: 'SGS' },
        { name: 'Philosophy',                                     code: 'PHL',  collegeCode: 'SGS' },
        { name: 'Peace and Conflict Studies',                     code: 'PCS',  collegeCode: 'SGS' },
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
        { email: 'dr.okafor@mouau.edu.ng',    fullName: 'Dr. Emeka Okafor',      staffId: 'LCT001', collegeCode: 'COLPAS', deptCode: 'CSC' },
        { email: 'prof.nwosu@mouau.edu.ng',   fullName: 'Prof. Adaeze Nwosu',    staffId: 'LCT002', collegeCode: 'COLPAS', deptCode: 'MTH' },
        { email: 'dr.adekunle@mouau.edu.ng',  fullName: 'Dr. Adekunle Williams', staffId: 'LCT003', collegeCode: 'CEET',   deptCode: 'EEE' },
        { email: 'prof.ekwueme@mouau.edu.ng', fullName: 'Prof. Ngozi Ekwueme',   staffId: 'LCT004', collegeCode: 'COLMAS', deptCode: 'HRM' },
        { email: 'dr.ibrahim@mouau.edu.ng',   fullName: 'Dr. Musa Ibrahim',      staffId: 'LCT005', collegeCode: 'COLNAS', deptCode: 'BCH' },
        { email: 'prof.amadi@mouau.edu.ng',   fullName: 'Prof. Chidinma Amadi',  staffId: 'LCT006', collegeCode: 'CAFST',  deptCode: 'FST' },
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
        { email: 'invig1@mouau.edu.ng', fullName: 'Mr. Chidi Eze',       staffId: 'INV001', collegeCode: 'COLPAS', deptCode: 'CSC' },
        { email: 'invig2@mouau.edu.ng', fullName: 'Mrs. Ngozi Obi',      staffId: 'INV002', collegeCode: 'CEET',   deptCode: 'EEE' },
        { email: 'invig3@mouau.edu.ng', fullName: 'Mr. Emeka Nwachukwu', staffId: 'INV003', collegeCode: 'COLNAS', deptCode: 'MCB' },
        { email: 'invig4@mouau.edu.ng', fullName: 'Mrs. Funke Adeniyi',  staffId: 'INV004', collegeCode: 'COLMAS', deptCode: 'HRM' },
        { email: 'invig5@mouau.edu.ng', fullName: 'Mr. John Doe',        staffId: 'INV005', collegeCode: 'COLPAS', deptCode: 'CSC' },
        { email: 'invig6@mouau.edu.ng', fullName: 'Mrs. Jane Smith',     staffId: 'INV006', collegeCode: 'CEET',   deptCode: 'EEE' },
        { email: 'invig7@mouau.edu.ng', fullName: 'Mr. David Johnson',   staffId: 'INV007', collegeCode: 'COLPAS', deptCode: 'PHY' },
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

      // ── Students ──────────────────────────────────────────────────────────
      // NOTE: getLevel() is called here — after `levels` is fully populated above.
      const studentData = [
        // COLPAS — CSC (current session)
        { email: 'alice.obi@student.mouau.edu.ng',       fullName: 'Alice Obi',       deptCode: 'CSC', matric: '2021/CSC/001', levelNum: 300, session: '2025/2026' },
        { email: 'bob.nwachukwu@student.mouau.edu.ng',   fullName: 'Bob Nwachukwu',   deptCode: 'CSC', matric: '2021/CSC/002', levelNum: 300, session: '2025/2026' },
        { email: 'chidi.okeke@student.mouau.edu.ng',     fullName: 'Chidi Okeke',     deptCode: 'CSC', matric: '2021/CSC/003', levelNum: 300, session: '2025/2026' },
        { email: 'emeka.agu@student.mouau.edu.ng',       fullName: 'Emeka Agu',       deptCode: 'CSC', matric: '2022/CSC/001', levelNum: 200, session: '2025/2026' },
        { email: 'funke.adeyemi@student.mouau.edu.ng',   fullName: 'Funke Adeyemi',   deptCode: 'CSC', matric: '2022/CSC/002', levelNum: 200, session: '2025/2026' },
        { email: 'grace.uko@student.mouau.edu.ng',       fullName: 'Grace Uko',       deptCode: 'CSC', matric: '2020/CSC/001', levelNum: 400, session: '2025/2026' },
        { email: 'ifeoma.ogu@student.mouau.edu.ng',      fullName: 'Ifeoma Ogu',      deptCode: 'CSC', matric: '2023/CSC/001', levelNum: 100, session: '2025/2026' },
        // COLPAS — CSC (previous session)
        { email: 'dalu.eze@student.mouau.edu.ng',        fullName: 'Dalu Eze',        deptCode: 'CSC', matric: '2021/CSC/004', levelNum: 300, session: '2024/2025' },
        { email: 'henry.dim@student.mouau.edu.ng',       fullName: 'Henry Dim',       deptCode: 'CSC', matric: '2020/CSC/002', levelNum: 400, session: '2024/2025' },
        { email: 'james.oti@student.mouau.edu.ng',       fullName: 'James Oti',       deptCode: 'CSC', matric: '2023/CSC/002', levelNum: 100, session: '2024/2025' },
        // COLPAS — MTH
        { email: 'ada.mba@student.mouau.edu.ng',         fullName: 'Ada Mba',         deptCode: 'MTH', matric: '2021/MTH/005', levelNum: 300, session: '2025/2026' },
        { email: 'chioma.igwe@student.mouau.edu.ng',     fullName: 'Chioma Igwe',     deptCode: 'MTH', matric: '2022/MTH/003', levelNum: 200, session: '2025/2026' },
        { email: 'esther.nwosu@student.mouau.edu.ng',    fullName: 'Esther Nwosu',    deptCode: 'MTH', matric: '2020/MTH/003', levelNum: 400, session: '2025/2026' },
        // COLPAS — PHY
        { email: 'isaac.udoh@student.mouau.edu.ng',      fullName: 'Isaac Udoh',      deptCode: 'PHY', matric: '2021/PHY/007', levelNum: 300, session: '2025/2026' },
        { email: 'joy.akan@student.mouau.edu.ng',        fullName: 'Joy Akan',        deptCode: 'PHY', matric: '2022/PHY/005', levelNum: 200, session: '2025/2026' },
        // CEET — EEE
        { email: 'peter.okpara@student.mouau.edu.ng',    fullName: 'Peter Okpara',    deptCode: 'EEE', matric: '2021/EEE/009', levelNum: 300, session: '2025/2026' },
        { email: 'samuel.udo@student.mouau.edu.ng',      fullName: 'Samuel Udo',      deptCode: 'EEE', matric: '2020/EEE/006', levelNum: 400, session: '2025/2026' },
        // COLMAS — HRM
        { email: 'xavier.otu@student.mouau.edu.ng',      fullName: 'Xavier Otu',      deptCode: 'HRM', matric: '2021/HRM/011', levelNum: 300, session: '2025/2026' },
        { email: 'zainab.bello@student.mouau.edu.ng',    fullName: 'Zainab Bello',    deptCode: 'HRM', matric: '2020/HRM/007', levelNum: 400, session: '2025/2026' },
        // COLNAS — BCH
        { email: 'blessing.okon@student.mouau.edu.ng',   fullName: 'Blessing Okon',   deptCode: 'BCH', matric: '2022/BCH/010', levelNum: 200, session: '2025/2026' },
        { email: 'charles.ekpo@student.mouau.edu.ng',    fullName: 'Charles Ekpo',    deptCode: 'BCH', matric: '2021/BCH/012', levelNum: 300, session: '2025/2026' },
        // CAFST — FST
        { email: 'edwin.chukwu@student.mouau.edu.ng',    fullName: 'Edwin Chukwu',    deptCode: 'FST', matric: '2022/FST/011', levelNum: 200, session: '2025/2026' },
        { email: 'florence.obi@student.mouau.edu.ng',    fullName: 'Florence Obi',    deptCode: 'FST', matric: '2020/FST/008', levelNum: 400, session: '2025/2026' },
        // CCSS — AGR
        { email: 'helen.uzochukwu@student.mouau.edu.ng', fullName: 'Helen Uzochukwu', deptCode: 'AGR', matric: '2022/AGR/012', levelNum: 200, session: '2025/2026' },
        { email: 'ifeanyi.nwankwo@student.mouau.edu.ng', fullName: 'Ifeanyi Nwankwo', deptCode: 'AGR', matric: '2021/AGR/014', levelNum: 300, session: '2025/2026' },
        // CVM — VET
        { email: 'kenneth.abara@student.mouau.edu.ng',   fullName: 'Kenneth Abara',   deptCode: 'VET', matric: '2021/VET/015', levelNum: 300, session: '2025/2026' },
        { email: 'lucy.okezie@student.mouau.edu.ng',     fullName: 'Lucy Okezie',     deptCode: 'VET', matric: '2020/VET/010', levelNum: 400, session: '2025/2026' },
      ];

      const students: any[] = [];
      for (const s of studentData) {
        const dept    = getDept(s.deptCode);
        const levelId = getLevel(s.levelNum).id;   // safe — levels array is populated
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

      // ── Courses ───────────────────────────────────────────────────────────
      const coursesData = [
        // CSC
        { code: 'CSC101', title: 'Introduction to Computer Science',   deptCode: 'CSC', credits: 2, level: 100 },
        { code: 'CSC201', title: 'Object Oriented Programming',        deptCode: 'CSC', credits: 3, level: 200 },
        { code: 'CSC301', title: 'Data Structures & Algorithms',       deptCode: 'CSC', credits: 3, level: 300 },
        { code: 'CSC302', title: 'Database Management Systems',        deptCode: 'CSC', credits: 3, level: 300 },
        { code: 'CSC401', title: 'Software Engineering',               deptCode: 'CSC', credits: 3, level: 400 },
        { code: 'CSC402', title: 'Artificial Intelligence',            deptCode: 'CSC', credits: 3, level: 400 },
        // MTH
        { code: 'MTH101', title: 'Calculus I',                         deptCode: 'MTH', credits: 2, level: 100 },
        { code: 'MTH201', title: 'Mathematical Methods',               deptCode: 'MTH', credits: 3, level: 200 },
        { code: 'MTH301', title: 'Linear Algebra',                     deptCode: 'MTH', credits: 3, level: 300 },
        { code: 'MTH402', title: 'Real Analysis',                      deptCode: 'MTH', credits: 3, level: 400 },
        // PHY
        { code: 'PHY101', title: 'General Physics I',                  deptCode: 'PHY', credits: 3, level: 100 },
        { code: 'PHY201', title: 'Waves and Optics',                   deptCode: 'PHY', credits: 3, level: 200 },
        { code: 'PHY301', title: 'Quantum Mechanics',                  deptCode: 'PHY', credits: 3, level: 300 },
        // EEE
        { code: 'EEE201', title: 'Circuit Theory',                     deptCode: 'EEE', credits: 3, level: 200 },
        { code: 'EEE301', title: 'Electronics I',                      deptCode: 'EEE', credits: 3, level: 300 },
        { code: 'EEE401', title: 'Power Systems',                      deptCode: 'EEE', credits: 3, level: 400 },
        // CPE
        { code: 'CPE201', title: 'Digital Logic Design',               deptCode: 'CPE', credits: 3, level: 200 },
        { code: 'CPE301', title: 'Computer Architecture',              deptCode: 'CPE', credits: 3, level: 300 },
        // HRM
        { code: 'HRM201', title: 'Principles of Management',           deptCode: 'HRM', credits: 3, level: 200 },
        { code: 'HRM301', title: 'Organisational Behaviour',           deptCode: 'HRM', credits: 3, level: 300 },
        { code: 'HRM401', title: 'Strategic Human Resource Management',deptCode: 'HRM', credits: 3, level: 400 },
        // BCH
        { code: 'BCH101', title: 'General Biochemistry I',             deptCode: 'BCH', credits: 2, level: 100 },
        { code: 'BCH201', title: 'Intermediary Metabolism',            deptCode: 'BCH', credits: 3, level: 200 },
        { code: 'BCH301', title: 'Enzymology',                         deptCode: 'BCH', credits: 3, level: 300 },
        // FST
        { code: 'FST101', title: 'Introduction to Food Science',       deptCode: 'FST', credits: 2, level: 100 },
        { code: 'FST201', title: 'Food Chemistry',                     deptCode: 'FST', credits: 3, level: 200 },
        { code: 'FST401', title: 'Food Process Engineering',           deptCode: 'FST', credits: 3, level: 400 },
        // AGR
        { code: 'AGR101', title: 'Introduction to Agronomy',           deptCode: 'AGR', credits: 2, level: 100 },
        { code: 'AGR201', title: 'Crop Physiology',                    deptCode: 'AGR', credits: 3, level: 200 },
        { code: 'AGR301', title: 'Weed Science',                       deptCode: 'AGR', credits: 3, level: 300 },
        // VET
        { code: 'VET301', title: 'Veterinary Pathology',               deptCode: 'VET', credits: 3, level: 300 },
        { code: 'VET401', title: 'Clinical Medicine',                  deptCode: 'VET', credits: 4, level: 400 },
        // BUS
        { code: 'BUS101', title: 'Introduction to Business',           deptCode: 'BUS', credits: 2, level: 100 },
        { code: 'BUS201', title: 'Business Ethics',                    deptCode: 'BUS', credits: 3, level: 200 },
        { code: 'BUS301', title: 'Entrepreneurship',                   deptCode: 'BUS', credits: 3, level: 300 },
        // ACC
        { code: 'ACC101', title: 'Principles of Accounting',           deptCode: 'ACC', credits: 2, level: 100 },
        { code: 'ACC201', title: 'Financial Accounting',               deptCode: 'ACC', credits: 3, level: 200 },
        { code: 'ACC301', title: 'Cost Accounting',                    deptCode: 'ACC', credits: 3, level: 300 },
        // SGS — General Studies
        { code: 'GST101', title: 'Communication in English',           deptCode: 'ENG', credits: 2, level: 100 },
        { code: 'GST201', title: 'Logic and Philosophy',               deptCode: 'PHL', credits: 2, level: 200 },
        { code: 'GST301', title: 'Peace and Conflict Resolution',      deptCode: 'PCS', credits: 2, level: 300 },
      ];

      const courses: any[] = [];
      for (const c of coursesData) {
        const course = await prisma.course.upsert({
          where:  { code: c.code },
          update: {},
          create: {
            code: c.code, title: c.title,
            departmentId: getDept(c.deptCode).id,
            creditUnits: c.credits, level: c.level,
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

      // ── Course registrations ──────────────────────────────────────────────
      let regCount = 0;
      const deptCodesToRegister = ['CSC','MTH','PHY','EEE','CPE','HRM','BCH','FST','AGR','VET','BUS','ACC'];

      for (const deptCode of deptCodesToRegister) {
        const dept         = getDept(deptCode);
        const deptStudents = students.filter(s => s.departmentId === dept.id);
        const deptCourses  = courses.filter(c => c.departmentId === dept.id);

        for (const student of deptStudents) {
          for (const course of deptCourses) {
            const diff = (student.levelNum ?? 100) - (course.level ?? 100);
            // Register for current level, one level up, and one level down
            if (diff === 0 || diff === 100 || diff === -100) {
              try {
                await prisma.courseRegistration.upsert({
                  where: {
                    studentId_courseId_session_semester: {
                      studentId: student.id,
                      courseId:  course.id,
                      session:   student.session,
                      semester:  1,
                    },
                  },
                  update: {},
                  create: {
                    studentId: student.id,
                    courseId:  course.id,
                    session:   student.session,
                    semester:  1,
                    levelId:   getLevel(student.levelNum).id,
                  },
                });
                regCount++;
              } catch { /* skip duplicate */ }
            }
          }
        }
      }
      results.push(`✓ ${regCount} course registrations`);

      // ── Exam ──────────────────────────────────────────────────────────────
      const EXAM_ID = '00000000-0000-0000-0000-000000000001';

      const exam = await prisma.exam.upsert({
        where:  { id: EXAM_ID },
        update: {},
        create: {
          id:                EXAM_ID,
          courseId:          getCourse('CSC301').id,
          createdBy:         lecturers[0].id,
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
          showResultAfter:    true,
          maxViolations:      5,
          session:            '2025/2026',
          semester:           1,
          levels: {
            connect: [getLevel(300), getLevel(400)].map(l => ({ id: l.id })),
          },
        },
      });

      await prisma.examInvigilator.upsert({
        where:  { examId_invigilatorId: { examId: exam.id, invigilatorId: invigilators[0].id } },
        update: {},
        create: { examId: exam.id, invigilatorId: invigilators[0].id },
      });

      // ── Questions ─────────────────────────────────────────────────────────
      const mcqData = [
        { body: 'Which data structure uses LIFO (Last In First Out) ordering?',       options: ['Queue', 'Stack', 'Linked List', 'Binary Tree'],                 correct: 1 },
        { body: 'What is the time complexity of binary search on a sorted array?',    options: ['O(n)', 'O(n²)', 'O(log n)', 'O(1)'],                            correct: 2 },
        { body: 'Which sorting algorithm has the best average-case time complexity?', options: ['Bubble Sort', 'Insertion Sort', 'Merge Sort', 'Selection Sort'], correct: 2 },
        { body: 'A graph with no cycles is called a ___.',                            options: ['Complete Graph', 'Tree', 'Bipartite Graph', 'Directed Graph'],   correct: 1 },
        { body: 'Which traversal visits nodes in Left → Root → Right order?',        options: ['Preorder', 'Postorder', 'Inorder', 'Level Order'],               correct: 2 },
        { body: 'What is the worst-case time complexity of QuickSort?',               options: ['O(n log n)', 'O(n)', 'O(n²)', 'O(log n)'],                      correct: 2 },
        { body: 'Which data structure is used for implementing BFS?',                 options: ['Stack', 'Queue', 'Heap', 'Priority Queue'],                      correct: 1 },
        { body: 'In a max-heap, the root node contains the ___ element.',             options: ['Smallest', 'Median', 'Largest', 'Random'],                      correct: 2 },
      ];

      const fitbData = [
        { body: 'The process of removing an element from a stack is called ___.',           answer: 'popping'    },
        { body: 'A hash table resolves collisions using chaining or open ___.',             answer: 'addressing' },
        { body: 'The number of edges in a complete graph with n vertices is n(n-1)/___.', answer: '2'          },
        { body: "Dijkstra's algorithm finds the ___ path between nodes in a graph.",        answer: 'shortest'   },
      ];

      let qCount = 0;
      for (const [i, q] of mcqData.entries()) {
        const exists = await prisma.question.findFirst({ where: { examId: exam.id, body: q.body } });
        if (!exists) {
          await prisma.question.create({
            data: {
              examId: exam.id, type: 'mcq', body: q.body, marks: 3, orderIndex: i,
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
              examId: exam.id, type: 'fill_in_the_blank', body: q.body, marks: 4, orderIndex: mcqData.length + i,
              fitbAnswers: { create: [{ acceptedAnswer: q.answer, isPrimary: true }] },
            },
          });
          qCount++;
        }
      }
      results.push(`✓ ${qCount} questions`);
      results.push('✓ Seed complete');

      return { success: true, results };

    } catch (err) {
      console.error('[Seed] Failed:', err);
      return fail(500, { error: err instanceof Error ? err.message : 'Seed failed' });
    }
  },

  reset: async ({ locals }) => {
    requireAdmin(locals.user);

    try {
      // Delete in strict FK-safe order (children before parents)
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

      return { success: true, results: ['✓ All data cleared'] };
    } catch (err) {
      return fail(500, { error: err instanceof Error ? err.message : 'Reset failed' });
    }
  },
};