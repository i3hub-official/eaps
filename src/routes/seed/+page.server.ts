// src/routes/(admin)/seed/+page.server.ts
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireAdmin } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';
import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

// ── Config: max concurrent DB ops per batch ───────────────────────────────
const BATCH_SIZE = 8;

async function batchAll<T>(items: T[], fn: (item: T) => Promise<unknown>, size = BATCH_SIZE) {
  const results: unknown[] = [];
  for (let i = 0; i < items.length; i += size) {
    const chunk = items.slice(i, i + size);
    const chunkResults = await Promise.all(chunk.map(fn));
    results.push(...chunkResults);
  }
  return results;
}

// ── Guard: only allow in dev OR if no users exist yet ─────────────────────
export const load: PageServerLoad = async ({ locals }) => {
  const userCount = await prisma.user.count();

  if (userCount > 0) {
    requireAdmin(locals.user);
  }

  const collegeCount    = await prisma.college.count();
  const departmentCount = await prisma.department.count();
  const courseCount     = await prisma.course.count();
  const examCount       = await prisma.exam.count();

  return {
    counts: { users: userCount, colleges: collegeCount, departments: departmentCount, courses: courseCount, exams: examCount },
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
    if (userCount > 0) {
      requireAdmin(locals.user);
    }

    try {
      const results: string[] = [];

      // ── Colleges ───────────────────────────────────────────────────────
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

      const colleges = await batchAll(
        collegeData,
        c => prisma.college.upsert({ where: { name: c.name }, update: {}, create: c })
      ) as Awaited<ReturnType<typeof prisma.college.upsert>>[];
      results.push(`✓ ${colleges.length} colleges`);

      const getCollege = (code: string) => {
        const c = colleges.find(c => c.code === code);
        if (!c) throw new Error(`College not found: ${code}`);
        return c;
      };

      // ── Departments ────────────────────────────────────────────────────
      const deptData = [
        // CAERSE
        { name: 'Agribusiness and Management',               code: 'ABM',  collegeCode: 'CAERSE' },
        { name: 'Agricultural Economics',                    code: 'AEC',  collegeCode: 'CAERSE' },
        { name: 'Agricultural Extension and Rural Sociology',code: 'AERS', collegeCode: 'CAERSE' },

        // CASAP
        { name: 'Animal Breeding and Physiology',            code: 'ABP',  collegeCode: 'CASAP' },
        { name: 'Animal Nutrition and Forage Science',       code: 'ANF',  collegeCode: 'CASAP' },
        { name: 'Animal Production and Livestock Management',code: 'APL',  collegeCode: 'CASAP' },

        // CAFST
        { name: 'Human Nutrition and Dietetics',             code: 'HND',  collegeCode: 'CAFST' },
        { name: 'Home Science, Hospitality Management & Tourism', code: 'HHT', collegeCode: 'CAFST' },
        { name: 'Food Science and Technology',               code: 'FST',  collegeCode: 'CAFST' },

        // CCSS
        { name: 'Agronomy',                                  code: 'AGR',  collegeCode: 'CCSS' },
        { name: 'Plant Health Management',                   code: 'PHM',  collegeCode: 'CCSS' },
        { name: 'Soil Science and Meteorology',              code: 'SSM',  collegeCode: 'CCSS' },
        { name: 'Water Resources Management and Agrometeorology', code: 'WRM', collegeCode: 'CCSS' },

        // COED
        { name: 'Adult and Continuing Education',            code: 'ACE',  collegeCode: 'COED' },
        { name: 'Agricultural/Home Science Education',       code: 'AHE',  collegeCode: 'COED' },
        { name: 'Business Education',                        code: 'BED',  collegeCode: 'COED' },
        { name: 'Economics Education',                       code: 'ECE',  collegeCode: 'COED' },
        { name: 'Education Management',                      code: 'EDM',  collegeCode: 'COED' },
        { name: 'Industrial Technology Education',           code: 'ITE',  collegeCode: 'COED' },
        { name: 'Library and Information Science',           code: 'LIS',  collegeCode: 'COED' },
        { name: 'Guidance and Counselling',                  code: 'GCA',  collegeCode: 'COED' },
        { name: 'Integrated Science Education',              code: 'ISE',  collegeCode: 'COED' },

        // CEET
        { name: 'Agricultural and Bioresources Engineering', code: 'ABE',  collegeCode: 'CEET' },
        { name: 'Civil Engineering',                         code: 'CVE',  collegeCode: 'CEET' },
        { name: 'Chemical Engineering',                      code: 'CHE',  collegeCode: 'CEET' },
        { name: 'Computer Engineering',                      code: 'CPE',  collegeCode: 'CEET' },
        { name: 'Electrical and Electronics Engineering',    code: 'EEE',  collegeCode: 'CEET' },
        { name: 'Mechanical Engineering',                    code: 'MCE',  collegeCode: 'CEET' },

        // COLMAS
        { name: 'Industrial Relations and Personnel Management', code: 'IRP', collegeCode: 'COLMAS' },
        { name: 'Human Resource Management',                 code: 'HRM',  collegeCode: 'COLMAS' },

        // CNREM
        { name: 'Environment Management and Toxicology',     code: 'EMT',  collegeCode: 'CNREM' },
        { name: 'Fisheries and Aquatic Resources Management',code: 'FAR',  collegeCode: 'CNREM' },
        { name: 'Forestry and Environmental Management',     code: 'FEM',  collegeCode: 'CNREM' },

        // COLNAS
        { name: 'Biochemistry',                              code: 'BCH',  collegeCode: 'COLNAS' },
        { name: 'Microbiology',                              code: 'MCB',  collegeCode: 'COLNAS' },
        { name: 'Plant Science and Biotechnology',           code: 'PSB',  collegeCode: 'COLNAS' },
        { name: 'Zoology and Environmental Biology',         code: 'ZEB',  collegeCode: 'COLNAS' },

        // COLPAS
        { name: 'Chemistry',                                 code: 'CHM',  collegeCode: 'COLPAS' },
        { name: 'Computer Science',                          code: 'CSC',  collegeCode: 'COLPAS' },
        { name: 'Geology',                                   code: 'GLG',  collegeCode: 'COLPAS' },
        { name: 'Mathematics',                               code: 'MTH',  collegeCode: 'COLPAS' },
        { name: 'Physics',                                   code: 'PHY',  collegeCode: 'COLPAS' },
        { name: 'Statistics',                                code: 'STA',  collegeCode: 'COLPAS' },

        // CVM
        { name: 'Theriogenology',                            code: 'THR',  collegeCode: 'CVM' },
        { name: 'Veterinary Anatomy',                        code: 'VAM',  collegeCode: 'CVM' },
        { name: 'Veterinary Medicine',                       code: 'VET',  collegeCode: 'CVM' },
        { name: 'Veterinary Microbiology',                   code: 'VMB',  collegeCode: 'CVM' },
        { name: 'Veterinary Public Health and Preventive Medicine', code: 'VPH', collegeCode: 'CVM' },
        { name: 'Veterinary Surgery and Radiology',          code: 'VSR',  collegeCode: 'CVM' },

        // SGS
        { name: 'English',                                   code: 'ENG',  collegeCode: 'SGS' },
        { name: 'French',                                    code: 'FRN',  collegeCode: 'SGS' },
        { name: 'German',                                    code: 'GER',  collegeCode: 'SGS' },
        { name: 'History',                                   code: 'HIS',  collegeCode: 'SGS' },
        { name: 'Social Science',                            code: 'SOC',  collegeCode: 'SGS' },
        { name: 'Physical and Health Education',             code: 'PHE',  collegeCode: 'SGS' },
        { name: 'Philosophy',                                code: 'PHL',  collegeCode: 'SGS' },
        { name: 'Peace and Conflict Studies',                code: 'PCS',  collegeCode: 'SGS' },
      ];

      const departments = await batchAll(
        deptData,
        d => prisma.department.upsert({
          where:  { code: d.code },
          update: {},
          create: { name: d.name, code: d.code, collegeId: getCollege(d.collegeCode).id },
        })
      ) as Awaited<ReturnType<typeof prisma.department.upsert>>[];
      results.push(`✓ ${departments.length} departments`);

      const getDept = (code: string) => {
        const d = departments.find(d => d.code === code);
        if (!d) throw new Error(`Department not found: ${code}`);
        return d;
      };

      // ── Users (passwords first, then users in batches) ─────────────────
      const [adminPass, lecturerPass, invigilatorPass, studentPass] = await Promise.all([
        hashPassword('admin123'),
        hashPassword('lecturer123'),
        hashPassword('invigilator123'),
        hashPassword('student123'),
      ]);

      await prisma.user.upsert({
        where:  { email: 'admin@mouau.edu.ng' },
        update: {},
        create: {
          email: 'admin@mouau.edu.ng', fullName: 'System Administrator',
          passwordHash: adminPass, role: 'admin', staffId: 'ADM001',
        },
      });

      const lecturerData = [
        { email: 'dr.okafor@mouau.edu.ng',    fullName: 'Dr. Emeka Okafor',      staffId: 'LCT001', collegeCode: 'COLPAS', deptCode: 'CSC' },
        { email: 'prof.nwosu@mouau.edu.ng',   fullName: 'Prof. Adaeze Nwosu',    staffId: 'LCT002', collegeCode: 'COLPAS', deptCode: 'MTH' },
        { email: 'dr.adekunle@mouau.edu.ng',  fullName: 'Dr. Adekunle Williams', staffId: 'LCT003', collegeCode: 'CEET',   deptCode: 'EEE' },
        { email: 'prof.ekwueme@mouau.edu.ng', fullName: 'Prof. Ngozi Ekwueme',   staffId: 'LCT004', collegeCode: 'COLMAS', deptCode: 'HRM' },
        { email: 'dr.ibrahim@mouau.edu.ng',   fullName: 'Dr. Musa Ibrahim',      staffId: 'LCT005', collegeCode: 'COLNAS', deptCode: 'BCH' },
        { email: 'prof.amadi@mouau.edu.ng',   fullName: 'Prof. Chidinma Amadi',  staffId: 'LCT006', collegeCode: 'CAFST',  deptCode: 'FST' },
      ];

      const lecturers = await batchAll(
        lecturerData,
        l => prisma.user.upsert({
          where:  { email: l.email },
          update: {},
          create: {
            email: l.email, fullName: l.fullName,
            passwordHash: lecturerPass, role: 'lecturer', staffId: l.staffId,
            collegeId: getCollege(l.collegeCode).id, departmentId: getDept(l.deptCode).id,
          },
        })
      ) as Awaited<ReturnType<typeof prisma.user.upsert>>[];

      const invigilatorData = [
        { email: 'invig1@mouau.edu.ng', fullName: 'Mr. Chidi Eze',       staffId: 'INV001', collegeCode: 'COLPAS', deptCode: 'CSC' },
        { email: 'invig2@mouau.edu.ng', fullName: 'Mrs. Ngozi Obi',      staffId: 'INV002', collegeCode: 'CEET',   deptCode: 'EEE' },
        { email: 'invig3@mouau.edu.ng', fullName: 'Mr. Emeka Nwachukwu', staffId: 'INV003', collegeCode: 'COLNAS', deptCode: 'MCB' },
      ];

      const invigilators = await batchAll(
        invigilatorData,
        i => prisma.user.upsert({
          where:  { email: i.email },
          update: {},
          create: {
            email: i.email, fullName: i.fullName,
            passwordHash: invigilatorPass, role: 'invigilator', staffId: i.staffId,
            collegeId: getCollege(i.collegeCode).id, departmentId: getDept(i.deptCode).id,
          },
        })
      ) as Awaited<ReturnType<typeof prisma.user.upsert>>[];

      results.push(`✓ 1 admin, ${lecturers.length} lecturers, ${invigilators.length} invigilators`);

      // ── Students ───────────────────────────────────────────────────────
      const studentData = [
        // COLPAS — CSC
        { email: 'alice.obi@student.mouau.edu.ng',         fullName: 'Alice Obi',          deptCode: 'CSC', matric: '2021/CSC/001', level: 300 },
        { email: 'bob.nwachukwu@student.mouau.edu.ng',     fullName: 'Bob Nwachukwu',       deptCode: 'CSC', matric: '2021/CSC/002', level: 300 },
        { email: 'chidi.okeke@student.mouau.edu.ng',       fullName: 'Chidi Okeke',         deptCode: 'CSC', matric: '2021/CSC/003', level: 300 },
        { email: 'dalu.eze@student.mouau.edu.ng',          fullName: 'Dalu Eze',            deptCode: 'CSC', matric: '2021/CSC/004', level: 300 },
        { email: 'emeka.agu@student.mouau.edu.ng',         fullName: 'Emeka Agu',           deptCode: 'CSC', matric: '2022/CSC/001', level: 200 },
        { email: 'funke.adeyemi@student.mouau.edu.ng',     fullName: 'Funke Adeyemi',       deptCode: 'CSC', matric: '2022/CSC/002', level: 200 },
        { email: 'grace.uko@student.mouau.edu.ng',         fullName: 'Grace Uko',           deptCode: 'CSC', matric: '2020/CSC/001', level: 400 },
        { email: 'henry.dim@student.mouau.edu.ng',         fullName: 'Henry Dim',           deptCode: 'CSC', matric: '2020/CSC/002', level: 400 },
        { email: 'ifeoma.ogu@student.mouau.edu.ng',        fullName: 'Ifeoma Ogu',          deptCode: 'CSC', matric: '2023/CSC/001', level: 100 },
        { email: 'james.oti@student.mouau.edu.ng',         fullName: 'James Oti',           deptCode: 'CSC', matric: '2023/CSC/002', level: 100 },
        // COLPAS — MTH
        { email: 'ada.mba@student.mouau.edu.ng',           fullName: 'Ada Mba',             deptCode: 'MTH', matric: '2021/MTH/005', level: 300 },
        { email: 'ben.ugwu@student.mouau.edu.ng',          fullName: 'Ben Ugwu',            deptCode: 'MTH', matric: '2021/MTH/006', level: 300 },
        { email: 'chioma.igwe@student.mouau.edu.ng',       fullName: 'Chioma Igwe',         deptCode: 'MTH', matric: '2022/MTH/003', level: 200 },
        { email: 'david.okafor@student.mouau.edu.ng',      fullName: 'David Okafor',        deptCode: 'MTH', matric: '2022/MTH/004', level: 200 },
        { email: 'esther.nwosu@student.mouau.edu.ng',      fullName: 'Esther Nwosu',        deptCode: 'MTH', matric: '2020/MTH/003', level: 400 },
        { email: 'frank.eze@student.mouau.edu.ng',         fullName: 'Frank Eze',           deptCode: 'MTH', matric: '2020/MTH/004', level: 400 },
        { email: 'gloria.okonkwo@student.mouau.edu.ng',    fullName: 'Gloria Okonkwo',      deptCode: 'MTH', matric: '2023/MTH/005', level: 100 },
        { email: 'henrietta.ani@student.mouau.edu.ng',     fullName: 'Henrietta Ani',       deptCode: 'MTH', matric: '2023/MTH/006', level: 100 },
        // COLPAS — PHY
        { email: 'isaac.udoh@student.mouau.edu.ng',        fullName: 'Isaac Udoh',          deptCode: 'PHY', matric: '2021/PHY/007', level: 300 },
        { email: 'joy.akan@student.mouau.edu.ng',          fullName: 'Joy Akan',            deptCode: 'PHY', matric: '2022/PHY/005', level: 200 },
        { email: 'kingsley.bassey@student.mouau.edu.ng',   fullName: 'Kingsley Bassey',     deptCode: 'PHY', matric: '2020/PHY/005', level: 400 },
        { email: 'linda.akpan@student.mouau.edu.ng',       fullName: 'Linda Akpan',         deptCode: 'PHY', matric: '2023/PHY/007', level: 100 },
        { email: 'michael.ekong@student.mouau.edu.ng',     fullName: 'Michael Ekong',       deptCode: 'PHY', matric: '2022/PHY/006', level: 200 },
        { email: 'nancy.ekwu@student.mouau.edu.ng',        fullName: 'Nancy Ekwu',          deptCode: 'PHY', matric: '2021/PHY/008', level: 300 },
        // CEET — EEE
        { email: 'peter.okpara@student.mouau.edu.ng',      fullName: 'Peter Okpara',        deptCode: 'EEE', matric: '2021/EEE/009', level: 300 },
        { email: 'queen.etuk@student.mouau.edu.ng',        fullName: 'Queen Etuk',          deptCode: 'EEE', matric: '2022/EEE/007', level: 200 },
        { email: 'samuel.udo@student.mouau.edu.ng',        fullName: 'Samuel Udo',          deptCode: 'EEE', matric: '2020/EEE/006', level: 400 },
        { email: 'tina.offiong@student.mouau.edu.ng',      fullName: 'Tina Offiong',        deptCode: 'EEE', matric: '2023/EEE/008', level: 100 },
        { email: 'victor.akpan@student.mouau.edu.ng',      fullName: 'Victor Akpan',        deptCode: 'EEE', matric: '2022/EEE/009', level: 200 },
        { email: 'wendy.udoh@student.mouau.edu.ng',        fullName: 'Wendy Udoh',          deptCode: 'EEE', matric: '2021/EEE/010', level: 300 },
        // CEET — CSC (Computer Engineering)
        { email: 'uzo.obi@student.mouau.edu.ng',           fullName: 'Uzo Obi',             deptCode: 'CPE', matric: '2021/CPE/001', level: 300 },
        { email: 'kalu.nnaji@student.mouau.edu.ng',        fullName: 'Kalu Nnaji',          deptCode: 'CPE', matric: '2022/CPE/002', level: 200 },
        // COLMAS — HRM
        { email: 'xavier.otu@student.mouau.edu.ng',        fullName: 'Xavier Otu',          deptCode: 'HRM', matric: '2021/HRM/011', level: 300 },
        { email: 'yemi.adebayo@student.mouau.edu.ng',      fullName: 'Yemi Adebayo',        deptCode: 'HRM', matric: '2022/HRM/008', level: 200 },
        { email: 'zainab.bello@student.mouau.edu.ng',      fullName: 'Zainab Bello',        deptCode: 'HRM', matric: '2020/HRM/007', level: 400 },
        { email: 'abiola.ogun@student.mouau.edu.ng',       fullName: 'Abiola Ogun',         deptCode: 'HRM', matric: '2023/HRM/009', level: 100 },
        // COLNAS — BCH
        { email: 'blessing.okon@student.mouau.edu.ng',     fullName: 'Blessing Okon',       deptCode: 'BCH', matric: '2022/BCH/010', level: 200 },
        { email: 'charles.ekpo@student.mouau.edu.ng',      fullName: 'Charles Ekpo',        deptCode: 'BCH', matric: '2021/BCH/012', level: 300 },
        { email: 'dorothy.ndukwe@student.mouau.edu.ng',    fullName: 'Dorothy Ndukwe',      deptCode: 'BCH', matric: '2020/BCH/013', level: 400 },
        // CAFST — FST
        { email: 'edwin.chukwu@student.mouau.edu.ng',      fullName: 'Edwin Chukwu',        deptCode: 'FST', matric: '2022/FST/011', level: 200 },
        { email: 'florence.obi@student.mouau.edu.ng',      fullName: 'Florence Obi',        deptCode: 'FST', matric: '2020/FST/008', level: 400 },
        { email: 'george.okoli@student.mouau.edu.ng',      fullName: 'George Okoli',        deptCode: 'FST', matric: '2023/FST/010', level: 100 },
        // CCSS — AGR
        { email: 'helen.uzochukwu@student.mouau.edu.ng',   fullName: 'Helen Uzochukwu',     deptCode: 'AGR', matric: '2022/AGR/012', level: 200 },
        { email: 'ifeanyi.nwankwo@student.mouau.edu.ng',   fullName: 'Ifeanyi Nwankwo',     deptCode: 'AGR', matric: '2021/AGR/014', level: 300 },
        { email: 'josephine.obi@student.mouau.edu.ng',     fullName: 'Josephine Obi',       deptCode: 'AGR', matric: '2020/AGR/007', level: 400 },
        // CVM — VET
        { email: 'kenneth.abara@student.mouau.edu.ng',     fullName: 'Kenneth Abara',       deptCode: 'VET', matric: '2021/VET/015', level: 300 },
        { email: 'lucy.okezie@student.mouau.edu.ng',       fullName: 'Lucy Okezie',         deptCode: 'VET', matric: '2020/VET/010', level: 400 },
      ];

      const students = await batchAll(
        studentData,
        s => {
          const dept = getDept(s.deptCode);
          return prisma.user.upsert({
            where:  { email: s.email },
            update: {},
            create: {
              email: s.email, fullName: s.fullName,
              passwordHash: studentPass, role: 'student',
              matricNumber: s.matric, collegeId: dept.collegeId,
              departmentId: dept.id, level: s.level, session: '2024/2025',
            },
          });
        }
      ) as Awaited<ReturnType<typeof prisma.user.upsert>>[];
      results.push(`✓ ${students.length} students`);

      // ── Courses ────────────────────────────────────────────────────────
      const coursesData = [
        // COLPAS — CSC
        { code: 'CSC101', title: 'Introduction to Computer Science',  deptCode: 'CSC', credits: 2, level: 100 },
        { code: 'CSC201', title: 'Object Oriented Programming',       deptCode: 'CSC', credits: 3, level: 200 },
        { code: 'CSC301', title: 'Data Structures & Algorithms',      deptCode: 'CSC', credits: 3, level: 300 },
        { code: 'CSC302', title: 'Database Management Systems',       deptCode: 'CSC', credits: 3, level: 300 },
        { code: 'CSC401', title: 'Software Engineering',              deptCode: 'CSC', credits: 3, level: 400 },
        { code: 'CSC402', title: 'Artificial Intelligence',           deptCode: 'CSC', credits: 3, level: 400 },
        // COLPAS — MTH
        { code: 'MTH101', title: 'Calculus I',                        deptCode: 'MTH', credits: 2, level: 100 },
        { code: 'MTH201', title: 'Mathematical Methods',              deptCode: 'MTH', credits: 3, level: 200 },
        { code: 'MTH301', title: 'Linear Algebra',                    deptCode: 'MTH', credits: 3, level: 300 },
        { code: 'MTH402', title: 'Real Analysis',                     deptCode: 'MTH', credits: 3, level: 400 },
        // COLPAS — PHY
        { code: 'PHY101', title: 'General Physics I',                 deptCode: 'PHY', credits: 3, level: 100 },
        { code: 'PHY201', title: 'Waves and Optics',                  deptCode: 'PHY', credits: 3, level: 200 },
        { code: 'PHY301', title: 'Quantum Mechanics',                 deptCode: 'PHY', credits: 3, level: 300 },
        // CEET — EEE
        { code: 'EEE201', title: 'Circuit Theory',                    deptCode: 'EEE', credits: 3, level: 200 },
        { code: 'EEE301', title: 'Electronics I',                     deptCode: 'EEE', credits: 3, level: 300 },
        { code: 'EEE401', title: 'Power Systems',                     deptCode: 'EEE', credits: 3, level: 400 },
        // CEET — CPE
        { code: 'CPE201', title: 'Digital Logic Design',              deptCode: 'CPE', credits: 3, level: 200 },
        { code: 'CPE301', title: 'Computer Architecture',             deptCode: 'CPE', credits: 3, level: 300 },
        // COLMAS — HRM
        { code: 'HRM201', title: 'Principles of Management',          deptCode: 'HRM', credits: 3, level: 200 },
        { code: 'HRM301', title: 'Organisational Behaviour',          deptCode: 'HRM', credits: 3, level: 300 },
        { code: 'HRM401', title: 'Strategic Human Resource Management',deptCode: 'HRM', credits: 3, level: 400 },
        // COLNAS — BCH
        { code: 'BCH101', title: 'General Biochemistry I',            deptCode: 'BCH', credits: 2, level: 100 },
        { code: 'BCH201', title: 'Intermediary Metabolism',           deptCode: 'BCH', credits: 3, level: 200 },
        { code: 'BCH301', title: 'Enzymology',                        deptCode: 'BCH', credits: 3, level: 300 },
        // CAFST — FST
        { code: 'FST101', title: 'Introduction to Food Science',      deptCode: 'FST', credits: 2, level: 100 },
        { code: 'FST201', title: 'Food Chemistry',                    deptCode: 'FST', credits: 3, level: 200 },
        { code: 'FST401', title: 'Food Process Engineering',          deptCode: 'FST', credits: 3, level: 400 },
        // CCSS — AGR
        { code: 'AGR101', title: 'Introduction to Agronomy',          deptCode: 'AGR', credits: 2, level: 100 },
        { code: 'AGR201', title: 'Crop Physiology',                   deptCode: 'AGR', credits: 3, level: 200 },
        { code: 'AGR301', title: 'Weed Science',                      deptCode: 'AGR', credits: 3, level: 300 },
        // CVM — VET
        { code: 'VET301', title: 'Veterinary Pathology',              deptCode: 'VET', credits: 3, level: 300 },
        { code: 'VET401', title: 'Clinical Medicine',                 deptCode: 'VET', credits: 4, level: 400 },
      ];

      const courses = await batchAll(
        coursesData,
        c => prisma.course.upsert({
          where:  { code: c.code },
          update: {},
          create: { code: c.code, title: c.title, departmentId: getDept(c.deptCode).id, creditUnits: c.credits, level: c.level },
        })
      ) as Awaited<ReturnType<typeof prisma.course.upsert>>[];
      results.push(`✓ ${courses.length} courses`);

      const getCourse = (code: string) => {
        const c = courses.find(c => c.code === code);
        if (!c) throw new Error(`Course not found: ${code}`);
        return c;
      };

      // ── Course registrations (sequential — many reads + writes) ────────
      let regCount = 0;
      const deptCodesToRegister = ['CSC', 'MTH', 'PHY', 'EEE', 'CPE', 'HRM', 'BCH', 'FST', 'AGR', 'VET'];

      for (const deptCode of deptCodesToRegister) {
        const dept         = getDept(deptCode);
        const deptStudents = students.filter(s => s.departmentId === dept.id);
        const deptCourses  = courses.filter(c => c.departmentId === dept.id);

        for (const student of deptStudents) {
          for (const course of deptCourses) {
            const levelDiff = (student.level ?? 0) - (course.level ?? 0);
            if (levelDiff === 0 || levelDiff === 100) {
              await prisma.courseRegistration.upsert({
                where:  { studentId_courseId_session_semester: { studentId: student.id, courseId: course.id, session: '2024/2025', semester: 1 } },
                update: {},
                create: { studentId: student.id, courseId: course.id, session: '2024/2025', semester: 1 },
              });
              regCount++;
            }
          }
        }
      }
      results.push(`✓ ${regCount} course registrations`);

      // ── Exam (single record) ───────────────────────────────────────────
      const EXAM_ID = '00000000-0000-0000-0000-000000000001';
      const exam = await prisma.exam.upsert({
        where:  { id: EXAM_ID },
        update: {},
        create: {
          id: EXAM_ID, courseId: getCourse('CSC301').id, createdBy: lecturers[0].id,
          title: 'CSC301 — First Semester Examination',
          instructions: 'Answer all questions. No external resources. Time limit strictly enforced.',
          durationMinutes: 60, totalMarks: 40, passMark: 20, status: 'active',
          scheduledStart: new Date(), scheduledEnd: new Date(Date.now() + 2 * 60 * 60 * 1000),
          randomizeQuestions: true, randomizeOptions: true, showResultAfter: true,
          maxViolations: 5, session: '2024/2025', semester: 1,
        },
      });

      await prisma.examInvigilator.upsert({
        where:  { examId_invigilatorId: { examId: exam.id, invigilatorId: invigilators[0].id } },
        update: {},
        create: { examId: exam.id, invigilatorId: invigilators[0].id },
      });

      // ── Questions (sequential — depends on exam existing) ──────────────
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
        { body: 'The process of removing an element from a stack is called ___.', answer: 'popping'    },
        { body: 'A hash table resolves collisions using chaining or open ___.', answer: 'addressing'  },
        { body: 'The number of edges in a complete graph with n vertices is n(n-1)/___.', answer: '2' },
        { body: "Dijkstra's algorithm finds the ___ path between nodes in a graph.", answer: 'shortest' },
      ];

      let qCount = 0;
      for (const [i, q] of mcqData.entries()) {
        const exists = await prisma.question.findFirst({ where: { examId: exam.id, body: q.body } });
        if (!exists) {
          await prisma.question.create({
            data: {
              examId: exam.id, type: 'mcq', body: q.body, marks: 3, orderIndex: i,
              options: { create: q.options.map((text, j) => ({ optionText: text, isCorrect: j === q.correct, orderIndex: j })) },
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

      return { success: true, results };

    } catch (err) {
      console.error('[Seed] Failed:', err);
      return fail(500, { error: err instanceof Error ? err.message : 'Seed failed' });
    }
  },

  reset: async ({ locals }) => {
    requireAdmin(locals.user);

    try {
      await prisma.examResult.deleteMany();
      await prisma.studentAnswer.deleteMany();
      await prisma.sessionOptionOrder.deleteMany();
      await prisma.sessionQuestionOrder.deleteMany();
      await prisma.violation.deleteMany();
      await prisma.examSession.deleteMany();
      await prisma.examInvigilator.deleteMany();
      await prisma.question.deleteMany();
      await prisma.exam.deleteMany();
      await prisma.courseRegistration.deleteMany();
      await prisma.course.deleteMany();
      await prisma.faceDescriptor.deleteMany();
      await prisma.authSession.deleteMany();
      await prisma.notification.deleteMany();
      await prisma.auditLog.deleteMany();
      await prisma.user.deleteMany();
      await prisma.department.deleteMany();
      await prisma.college.deleteMany();

      return { success: true, results: ['✓ All data cleared'] };
    } catch (err) {
      return fail(500, { error: err instanceof Error ? err.message : 'Reset failed' });
    }
  },
};