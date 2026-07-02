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

export const load: PageServerLoad = async ({ locals }) => {
  const prisma = await getPrismaClient();
  const userCount = await prisma.user.count();
  if (userCount > 0) requireAdmin(locals.user);
  const [collegeCount, departmentCount, courseCount, levelCount, offeringCount] = await Promise.all([
    prisma.college.count(),
    prisma.department.count(),
    prisma.course.count(),
    prisma.level.count(),
    prisma.courseOffering.count(),
  ]);
  return {
    counts: {
      users: userCount,
      colleges: collegeCount,
      departments: departmentCount,
      courses: courseCount,
      levels: levelCount,
      offerings: offeringCount,
    },
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

      // ══════════════════════════════════════════════════════════════════════
      // 1. LEVELS — 100L and 200L only
      // ══════════════════════════════════════════════════════════════════════
      progressBroadcaster.broadcastProgress('levels', 'Creating levels...', '2 levels', '📊');
      const levelData = [
        { level: 100, name: '100 Level', order: 0, isDefault: true },
        { level: 200, name: '200 Level', order: 1, isDefault: true },
      ];
      await prisma.level.createMany({ data: levelData, skipDuplicates: true });
      const levels = await prisma.level.findMany();
      const getLevel = (n: number) => {
        const l = levels.find(x => x.level === n);
        if (!l) throw new Error(`Level not found: ${n}`);
        return l;
      };
      results.push(`✓ ${levels.length} levels`);
      progressBroadcaster.broadcastProgress('levels', 'Levels created', '2 levels', '📊✅');

      // ══════════════════════════════════════════════════════════════════════
      // 2. ACADEMIC SEMESTERS
      // ══════════════════════════════════════════════════════════════════════
      progressBroadcaster.broadcastProgress('semesters', 'Creating semesters...', '2 semesters', '📅');
      await prisma.academicSemester.createMany({
        data: [
          {
            session: '2025/2026', semester: 1,
            label: 'First Semester 2025/2026',
            startDate: new Date('2025-09-01'), endDate: new Date('2026-01-31'),
            isActive: false, regOpen: false,
          },
          {
            session: '2025/2026', semester: 2,
            label: 'Second Semester 2025/2026',
            startDate: new Date('2026-02-01'), endDate: new Date('2026-07-31'),
            isActive: true, regOpen: true,
          },
        ],
        skipDuplicates: true,
      });
      const semesters = await prisma.academicSemester.findMany();
      const getSemester = (session: string, semester: number) => {
        const s = semesters.find(x => x.session === session && x.semester === semester);
        if (!s) throw new Error(`Semester not found: ${session} - ${semester}`);
        return s;
      };
      results.push('✓ 2 academic semesters');
      progressBroadcaster.broadcastProgress('semesters', 'Semesters created', '2025/2026', '📅✅');

      // ══════════════════════════════════════════════════════════════════════
      // 3. LEVEL SEMESTER CONFIGS — 100L + 200L only
      // ══════════════════════════════════════════════════════════════════════
      const creditCaps = [
        { levelNum: 100, semester: 1, maxCredits: 27, maxCarryOver: 0, maxBorrowed: 6 },
        { levelNum: 100, semester: 2, maxCredits: 27, maxCarryOver: 0, maxBorrowed: 6 },
        { levelNum: 200, semester: 1, maxCredits: 24, maxCarryOver: 6, maxBorrowed: 6 },
        { levelNum: 200, semester: 2, maxCredits: 24, maxCarryOver: 6, maxBorrowed: 6 },
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

      // ══════════════════════════════════════════════════════════════════════
      // 4. COLLEGES
      // ══════════════════════════════════════════════════════════════════════
      progressBroadcaster.broadcastProgress('colleges', 'Creating colleges...', '12 colleges', '🏛️');
      await prisma.college.createMany({
        data: [
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
        ],
        skipDuplicates: true,
      });
      const colleges = await prisma.college.findMany();
      const getCollege = (code: string) => {
        const c = colleges.find(x => x.code === code);
        if (!c) throw new Error(`College not found: ${code}`);
        return c;
      };
      results.push(`✓ ${colleges.length} colleges`);
      progressBroadcaster.broadcastProgress('colleges', 'Colleges created', '12 colleges', '🏛️✅');

      // ══════════════════════════════════════════════════════════════════════
      // 5. DEPARTMENTS
      // ══════════════════════════════════════════════════════════════════════
      progressBroadcaster.broadcastProgress('departments', 'Creating departments...', 'All colleges', '🏢');
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
        { name: 'Accounting', code: 'ACC', collegeCode: 'COLMAS' },
        { name: 'Banking and Finance', code: 'BNF', collegeCode: 'COLMAS' },
        { name: 'Business Administration', code: 'BUS', collegeCode: 'COLMAS' },
        { name: 'Economics', code: 'ECN', collegeCode: 'COLMAS' },
        { name: 'Entrepreneurial Studies', code: 'ENT', collegeCode: 'COLMAS' },
        { name: 'Human Resource Management', code: 'HRM', collegeCode: 'COLMAS' },
        { name: 'Industrial Relations and Personnel Management', code: 'IRP', collegeCode: 'COLMAS' },
        { name: 'Marketing', code: 'MKT', collegeCode: 'COLMAS' },
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
      await prisma.department.createMany({
        data: deptData.map(d => ({
          name: d.name, code: d.code,
          collegeId: getCollege(d.collegeCode).id,
        })),
        skipDuplicates: true,
      });
      const departments = await prisma.department.findMany();
      const getDept = (code: string) => {
        const d = departments.find(x => x.code === code);
        if (!d) throw new Error(`Department not found: ${code}`);
        return d;
      };
      results.push(`✓ ${departments.length} departments`);
      progressBroadcaster.broadcastProgress('departments', 'Departments created', `${departments.length} depts`, '🏢✅');

      // ══════════════════════════════════════════════════════════════════════
      // 5b. PROGRAMMES
      // ══════════════════════════════════════════════════════════════════════
      progressBroadcaster.broadcastProgress('programmes', 'Creating programmes...', 'All departments', '🎓');

      const programmeData = departments.map(dept => ({
        name: 'Full Time Regular',
        code: `${dept.code}-FTR`,
        departmentId: dept.id,
        durationYears: 4,
      }));

      await prisma.programme.createMany({
        data: programmeData,
        skipDuplicates: true,
      });

      const programmes = await prisma.programme.findMany();
      const getProgramme = (deptCode: string) => {
        const p = programmes.find(x => x.code === `${deptCode}-FTR`);
        if (!p) throw new Error(`Programme not found for dept: ${deptCode}`);
        return p;
      };
      results.push(`✓ ${programmes.length} programmes`);
      progressBroadcaster.broadcastProgress('programmes', 'Programmes created', `${programmes.length}`, '🎓✅');

      // ══════════════════════════════════════════════════════════════════════
      // 6. COURSES — 100L + 200L only (5 per semester)
      // ══════════════════════════════════════════════════════════════════════
      progressBroadcaster.broadcastProgress('courses', 'Creating courses...', 'All departments', '📚');

      const allCourses: {
        code: string; title: string; departmentId: string;
        creditUnits: number; level: number; semester: number; isGeneral?: boolean;
      }[] = [];

      function addC(
        deptCode: string,
        code: string, title: string,
        level: number, semester: number, credits: number, isGeneral = false
      ) {
        allCourses.push({
          code, title,
          departmentId: getDept(deptCode).id,
          creditUnits: credits,
          level, semester,
          isGeneral,
        });
      }

      // ─── SGS / GST Universal courses ──────────────────────────────────────
      addC('ENG', 'GST111', 'Communication in English I', 100, 1, 2, true);
      addC('HIS', 'GST112', 'Nigerian History and Culture', 100, 1, 2, true);
      addC('ENG', 'GST121', 'Communication in English II', 100, 2, 2, true);
      addC('PHL', 'GST211', 'Logic, Philosophy and Human Existence', 200, 1, 2, true);
      addC('PCS', 'GST212', 'Peace Studies and Conflict Resolution', 200, 1, 2, true);
      addC('ENG', 'GST221', 'Technical Report Writing', 200, 2, 2, true);

      // ─── COLPAS — Computer Science (CSC) ──────────────────────────────────
      addC('CSC', 'CSC111', 'Introduction to Computer Science', 100, 1, 3);
      addC('CSC', 'CSC112', 'Introduction to Programming I', 100, 1, 3);
      addC('CSC', 'CSC113', 'Discrete Mathematics I', 100, 1, 2);
      addC('MTH', 'CSC114', 'Elementary Mathematics I', 100, 1, 2);
      addC('PHY', 'CSC115', 'General Physics for CS I', 100, 1, 2);
      addC('CSC', 'CSC121', 'Introduction to Programming II', 100, 2, 3);
      addC('CSC', 'CSC122', 'Computer Organization I', 100, 2, 2);
      addC('CSC', 'CSC123', 'Discrete Mathematics II', 100, 2, 2);
      addC('MTH', 'CSC124', 'Elementary Mathematics II', 100, 2, 2);
      addC('CSC', 'CSC125', 'Web Fundamentals', 100, 2, 2);
      addC('CSC', 'CSC211', 'Object-Oriented Programming I', 200, 1, 3);
      addC('CSC', 'CSC212', 'Data Structures I', 200, 1, 3);
      addC('CSC', 'CSC213', 'Operating Systems I', 200, 1, 2);
      addC('CSC', 'CSC214', 'Systems Analysis and Design', 200, 1, 2);
      addC('MTH', 'CSC215', 'Calculus for CS', 200, 1, 2);
      addC('CSC', 'CSC221', 'Object-Oriented Programming II', 200, 2, 3);
      addC('CSC', 'CSC222', 'Data Structures II', 200, 2, 3);
      addC('CSC', 'CSC223', 'Database Management Systems I', 200, 2, 2);
      addC('CSC', 'CSC224', 'Computer Networks I', 200, 2, 2);
      addC('CSC', 'CSC225', 'Software Engineering I', 200, 2, 2);

      // ─── COLPAS — Physics (PHY) ────────────────────────────────────────────
      addC('PHY', 'PHY111', 'General Physics I (Mechanics)', 100, 1, 3);
      addC('PHY', 'PHY112', 'General Physics II (Waves)', 100, 1, 2);
      addC('PHY', 'PHY113', 'Physics Practical I', 100, 1, 1);
      addC('PHY', 'PHY114', 'Mathematical Methods I', 100, 1, 2);
      addC('MTH', 'PHY115', 'Elementary Calculus for Physics', 100, 1, 2);
      addC('PHY', 'PHY121', 'General Physics III (Thermodynamics)', 100, 2, 3);
      addC('PHY', 'PHY122', 'General Physics IV (Optics)', 100, 2, 2);
      addC('PHY', 'PHY123', 'Physics Practical II', 100, 2, 1);
      addC('PHY', 'PHY124', 'Mathematical Methods II', 100, 2, 2);
      addC('PHY', 'PHY125', 'Electronics I', 100, 2, 2);
      addC('PHY', 'PHY211', 'Classical Mechanics', 200, 1, 3);
      addC('PHY', 'PHY212', 'Waves and Optics', 200, 1, 2);
      addC('PHY', 'PHY213', 'Heat and Thermodynamics', 200, 1, 2);
      addC('PHY', 'PHY214', 'Mathematical Physics I', 200, 1, 2);
      addC('PHY', 'PHY215', 'Electronics III', 200, 1, 2);
      addC('PHY', 'PHY221', 'Electromagnetism I', 200, 2, 3);
      addC('PHY', 'PHY222', 'Quantum Mechanics I', 200, 2, 2);
      addC('PHY', 'PHY223', 'Mathematical Physics II', 200, 2, 2);
      addC('PHY', 'PHY224', 'Solid State Physics I', 200, 2, 2);
      addC('PHY', 'PHY225', 'Physics Practical IV', 200, 2, 1);

      // ─── COLPAS — Mathematics (MTH) ───────────────────────────────────────
      addC('MTH', 'MTH111', 'Calculus I', 100, 1, 3);
      addC('MTH', 'MTH112', 'Algebra and Number Theory I', 100, 1, 2);
      addC('MTH', 'MTH113', 'Trigonometry', 100, 1, 2);
      addC('MTH', 'MTH114', 'Sets, Logic and Algebra', 100, 1, 2);
      addC('MTH', 'MTH115', 'Elementary Statistics', 100, 1, 2);
      addC('MTH', 'MTH121', 'Calculus II', 100, 2, 3);
      addC('MTH', 'MTH122', 'Algebra and Number Theory II', 100, 2, 2);
      addC('MTH', 'MTH123', 'Vector Calculus', 100, 2, 2);
      addC('MTH', 'MTH124', 'Intro to Real Analysis', 100, 2, 2);
      addC('MTH', 'MTH125', 'Abstract Algebra I', 100, 2, 2);
      addC('MTH', 'MTH211', 'Calculus III', 200, 1, 3);
      addC('MTH', 'MTH212', 'Linear Algebra I', 200, 1, 2);
      addC('MTH', 'MTH213', 'Real Analysis I', 200, 1, 2);
      addC('MTH', 'MTH214', 'Differential Equations I', 200, 1, 2);
      addC('MTH', 'MTH215', 'Probability Theory II', 200, 1, 2);
      addC('MTH', 'MTH221', 'Calculus IV (Complex Variables)', 200, 2, 3);
      addC('MTH', 'MTH222', 'Linear Algebra II', 200, 2, 2);
      addC('MTH', 'MTH223', 'Real Analysis II', 200, 2, 2);
      addC('MTH', 'MTH224', 'Differential Equations II', 200, 2, 2);
      addC('MTH', 'MTH225', 'Numerical Methods I', 200, 2, 2);

      // ─── COLPAS — Chemistry (CHM) ──────────────────────────────────────────
      addC('CHM', 'CHM111', 'General Chemistry I', 100, 1, 3);
      addC('CHM', 'CHM112', 'Inorganic Chemistry I', 100, 1, 2);
      addC('CHM', 'CHM113', 'Practical Chemistry I', 100, 1, 1);
      addC('CHM', 'CHM114', 'Atomic Structure and Bonding', 100, 1, 2);
      addC('PHY', 'CHM115', 'Physics for Chemists I', 100, 1, 2);
      addC('CHM', 'CHM121', 'General Chemistry II', 100, 2, 3);
      addC('CHM', 'CHM122', 'Organic Chemistry I', 100, 2, 2);
      addC('CHM', 'CHM123', 'Practical Chemistry II', 100, 2, 1);
      addC('CHM', 'CHM124', 'Physical Chemistry I', 100, 2, 2);
      addC('CHM', 'CHM125', 'Analytical Chemistry I', 100, 2, 2);
      addC('CHM', 'CHM211', 'Organic Chemistry II', 200, 1, 3);
      addC('CHM', 'CHM212', 'Inorganic Chemistry II', 200, 1, 2);
      addC('CHM', 'CHM213', 'Physical Chemistry II', 200, 1, 2);
      addC('CHM', 'CHM214', 'Analytical Chemistry II', 200, 1, 2);
      addC('CHM', 'CHM215', 'Practical Chemistry III', 200, 1, 1);
      addC('CHM', 'CHM221', 'Organic Chemistry III', 200, 2, 3);
      addC('CHM', 'CHM222', 'Inorganic Chemistry III', 200, 2, 2);
      addC('CHM', 'CHM223', 'Physical Chemistry III', 200, 2, 2);
      addC('CHM', 'CHM224', 'Spectroscopy I', 200, 2, 2);
      addC('CHM', 'CHM225', 'Practical Chemistry IV', 200, 2, 1);

      // ─── COLPAS — Statistics (STA) ─────────────────────────────────────────
      addC('STA', 'STA111', 'Introduction to Statistics I', 100, 1, 3);
      addC('STA', 'STA112', 'Probability Theory I', 100, 1, 2);
      addC('STA', 'STA113', 'Descriptive Statistics', 100, 1, 2);
      addC('MTH', 'STA114', 'Calculus for Statistics', 100, 1, 2);
      addC('STA', 'STA115', 'Statistical Computing I', 100, 1, 2);
      addC('STA', 'STA121', 'Introduction to Statistics II', 100, 2, 3);
      addC('STA', 'STA122', 'Probability Theory II', 100, 2, 2);
      addC('STA', 'STA123', 'Linear Algebra for Statistics', 100, 2, 2);
      addC('STA', 'STA124', 'Statistical Computing II', 100, 2, 2);
      addC('STA', 'STA125', 'Sampling Theory I', 100, 2, 2);
      addC('STA', 'STA211', 'Statistical Inference I', 200, 1, 3);
      addC('STA', 'STA212', 'Probability Distributions', 200, 1, 2);
      addC('STA', 'STA213', 'Regression Analysis I', 200, 1, 2);
      addC('STA', 'STA214', 'Sampling Theory II', 200, 1, 2);
      addC('STA', 'STA215', 'Experimental Design I', 200, 1, 2);
      addC('STA', 'STA221', 'Statistical Inference II', 200, 2, 3);
      addC('STA', 'STA222', 'Regression Analysis II', 200, 2, 2);
      addC('STA', 'STA223', 'Time Series I', 200, 2, 2);
      addC('STA', 'STA224', 'Experimental Design II', 200, 2, 2);
      addC('STA', 'STA225', 'Multivariate Analysis I', 200, 2, 2);

      // ─── COLPAS — Geology (GLG) ────────────────────────────────────────────
      addC('GLG', 'GLG111', 'Introduction to Geology', 100, 1, 3);
      addC('GLG', 'GLG112', 'Physical Geology', 100, 1, 2);
      addC('GLG', 'GLG113', 'Mineralogy I', 100, 1, 2);
      addC('GLG', 'GLG114', 'Map Reading and Interpretation', 100, 1, 2);
      addC('CHM', 'GLG115', 'Chemistry for Geologists', 100, 1, 2);
      addC('GLG', 'GLG121', 'Historical Geology', 100, 2, 3);
      addC('GLG', 'GLG122', 'Mineralogy II', 100, 2, 2);
      addC('GLG', 'GLG123', 'Petrology I', 100, 2, 2);
      addC('GLG', 'GLG124', 'Stratigraphy I', 100, 2, 2);
      addC('GLG', 'GLG125', 'Geological Field Methods I', 100, 2, 2);
      addC('GLG', 'GLG211', 'Structural Geology I', 200, 1, 3);
      addC('GLG', 'GLG212', 'Petrology II', 200, 1, 2);
      addC('GLG', 'GLG213', 'Stratigraphy II', 200, 1, 2);
      addC('GLG', 'GLG214', 'Geophysics I', 200, 1, 2);
      addC('GLG', 'GLG215', 'Geochemistry I', 200, 1, 2);
      addC('GLG', 'GLG221', 'Structural Geology II', 200, 2, 3);
      addC('GLG', 'GLG222', 'Economic Geology I', 200, 2, 2);
      addC('GLG', 'GLG223', 'Geophysics II', 200, 2, 2);
      addC('GLG', 'GLG224', 'Hydrogeology I', 200, 2, 2);
      addC('GLG', 'GLG225', 'Palaeontology I', 200, 2, 2);

      // ─── CEET — Computer Engineering (CPE) ────────────────────────────────
      addC('CPE', 'CPE111', 'Introduction to Computer Engineering', 100, 1, 3);
      addC('CPE', 'CPE112', 'Engineering Mathematics I', 100, 1, 2);
      addC('CPE', 'CPE113', 'Fundamentals of Programming', 100, 1, 2);
      addC('CPE', 'CPE114', 'Digital Fundamentals', 100, 1, 2);
      addC('CPE', 'CPE115', 'Technical Drawing I', 100, 1, 2);
      addC('CPE', 'CPE121', 'Digital Logic Design', 100, 2, 3);
      addC('CPE', 'CPE122', 'Engineering Mathematics II', 100, 2, 2);
      addC('CPE', 'CPE123', 'Computer Programming I', 100, 2, 2);
      addC('CPE', 'CPE124', 'Circuit Theory I', 100, 2, 2);
      addC('CPE', 'CPE125', 'Electronic Devices I', 100, 2, 2);
      addC('CPE', 'CPE211', 'Data Structures', 200, 1, 3);
      addC('CPE', 'CPE212', 'Computer Architecture I', 200, 1, 3);
      addC('CPE', 'CPE213', 'Circuit Theory II', 200, 1, 2);
      addC('CPE', 'CPE214', 'Signals and Systems', 200, 1, 2);
      addC('CPE', 'CPE215', 'Microprocessors I', 200, 1, 2);
      addC('CPE', 'CPE221', 'Computer Architecture II', 200, 2, 3);
      addC('CPE', 'CPE222', 'Operating Systems', 200, 2, 2);
      addC('CPE', 'CPE223', 'Microprocessors II', 200, 2, 2);
      addC('CPE', 'CPE224', 'Computer Networks I', 200, 2, 2);
      addC('CPE', 'CPE225', 'Embedded Systems I', 200, 2, 2);

      // ─── CEET — Electrical and Electronics Engineering (EEE) ──────────────
      addC('EEE', 'EEE111', 'Intro to Electrical Engineering', 100, 1, 3);
      addC('EEE', 'EEE112', 'Engineering Mathematics I', 100, 1, 2);
      addC('EEE', 'EEE113', 'Electric Circuits I', 100, 1, 2);
      addC('EEE', 'EEE114', 'Digital Electronics I', 100, 1, 2);
      addC('EEE', 'EEE115', 'Technical Drawing I', 100, 1, 2);
      addC('EEE', 'EEE121', 'Electric Circuits II', 100, 2, 3);
      addC('EEE', 'EEE122', 'Engineering Mathematics II', 100, 2, 2);
      addC('EEE', 'EEE123', 'Electronic Devices II', 100, 2, 2);
      addC('EEE', 'EEE124', 'Signals and Systems I', 100, 2, 2);
      addC('EEE', 'EEE125', 'Electromagnetic Fields I', 100, 2, 2);
      addC('EEE', 'EEE211', 'Circuit Theory I', 200, 1, 3);
      addC('EEE', 'EEE212', 'Electronics I', 200, 1, 3);
      addC('EEE', 'EEE213', 'Electromagnetic Fields II', 200, 1, 2);
      addC('EEE', 'EEE214', 'Electrical Machines I', 200, 1, 2);
      addC('EEE', 'EEE215', 'Power Systems I', 200, 1, 2);
      addC('EEE', 'EEE221', 'Circuit Theory II', 200, 2, 3);
      addC('EEE', 'EEE222', 'Electronics II', 200, 2, 2);
      addC('EEE', 'EEE223', 'Electrical Machines II', 200, 2, 2);
      addC('EEE', 'EEE224', 'Power Systems II', 200, 2, 2);
      addC('EEE', 'EEE225', 'Control Systems I', 200, 2, 2);

      // ─── CEET — Civil Engineering (CVE) ────────────────────────────────────
      addC('CVE', 'CVE111', 'Intro to Civil Engineering', 100, 1, 3);
      addC('CVE', 'CVE112', 'Engineering Mathematics I', 100, 1, 2);
      addC('CVE', 'CVE113', 'Technical Drawing and CAD I', 100, 1, 2);
      addC('CVE', 'CVE114', 'Engineering Mechanics I', 100, 1, 2);
      addC('CVE', 'CVE115', 'Surveying I', 100, 1, 2);
      addC('CVE', 'CVE121', 'Engineering Mechanics II', 100, 2, 3);
      addC('CVE', 'CVE122', 'Engineering Mathematics II', 100, 2, 2);
      addC('CVE', 'CVE123', 'Surveying II', 100, 2, 2);
      addC('CVE', 'CVE124', 'Fluid Mechanics I', 100, 2, 2);
      addC('CVE', 'CVE125', 'Structural Analysis I', 100, 2, 2);
      addC('CVE', 'CVE211', 'Structural Analysis II', 200, 1, 3);
      addC('CVE', 'CVE212', 'Fluid Mechanics II', 200, 1, 2);
      addC('CVE', 'CVE213', 'Soil Mechanics I', 200, 1, 2);
      addC('CVE', 'CVE214', 'Highway Engineering I', 200, 1, 2);
      addC('CVE', 'CVE215', 'Hydrology I', 200, 1, 2);
      addC('CVE', 'CVE221', 'Structural Analysis III', 200, 2, 3);
      addC('CVE', 'CVE222', 'Foundation Engineering', 200, 2, 2);
      addC('CVE', 'CVE223', 'Water Resources Engineering I', 200, 2, 2);
      addC('CVE', 'CVE224', 'Concrete Technology I', 200, 2, 2);
      addC('CVE', 'CVE225', 'Construction Management I', 200, 2, 2);

      // ─── COLMAS — Accounting (ACC) ─────────────────────────────────────────
      addC('ACC', 'ACC111', 'Principles of Accounting I', 100, 1, 3);
      addC('ACC', 'ACC112', 'Business Mathematics I', 100, 1, 2);
      addC('ACC', 'ACC113', 'Intro to Economics', 100, 1, 2);
      addC('ACC', 'ACC114', 'Business Communication I', 100, 1, 2);
      addC('ACC', 'ACC115', 'Commercial Law I', 100, 1, 2);
      addC('ACC', 'ACC121', 'Principles of Accounting II', 100, 2, 3);
      addC('ACC', 'ACC122', 'Business Mathematics II', 100, 2, 2);
      addC('ACC', 'ACC123', 'Microeconomics', 100, 2, 2);
      addC('ACC', 'ACC124', 'Business Statistics I', 100, 2, 2);
      addC('ACC', 'ACC125', 'Financial Accounting I', 100, 2, 2);
      addC('ACC', 'ACC211', 'Financial Accounting II', 200, 1, 3);
      addC('ACC', 'ACC212', 'Management Accounting I', 200, 1, 3);
      addC('ACC', 'ACC213', 'Cost Accounting I', 200, 1, 2);
      addC('ACC', 'ACC214', 'Macroeconomics', 200, 1, 2);
      addC('ACC', 'ACC215', 'Financial Management I', 200, 1, 2);
      addC('ACC', 'ACC221', 'Financial Accounting III', 200, 2, 3);
      addC('ACC', 'ACC222', 'Management Accounting II', 200, 2, 2);
      addC('ACC', 'ACC223', 'Cost Accounting II', 200, 2, 2);
      addC('ACC', 'ACC224', 'Financial Management II', 200, 2, 2);
      addC('ACC', 'ACC225', 'Auditing I', 200, 2, 2);

      // ─── COLMAS — Business Administration (BUS) ────────────────────────────
      addC('BUS', 'BUS111', 'Introduction to Business', 100, 1, 3);
      addC('BUS', 'BUS112', 'Principles of Management I', 100, 1, 2);
      addC('BUS', 'BUS113', 'Business Mathematics I', 100, 1, 2);
      addC('BUS', 'BUS114', 'Micro Economics', 100, 1, 2);
      addC('BUS', 'BUS115', 'Business Communication I', 100, 1, 2);
      addC('BUS', 'BUS121', 'Principles of Management II', 100, 2, 3);
      addC('BUS', 'BUS122', 'Macro Economics', 100, 2, 2);
      addC('BUS', 'BUS123', 'Business Mathematics II', 100, 2, 2);
      addC('BUS', 'BUS124', 'Business Statistics I', 100, 2, 2);
      addC('BUS', 'BUS125', 'Intro to Accounting', 100, 2, 2);
      addC('BUS', 'BUS211', 'Organisational Behaviour I', 200, 1, 3);
      addC('BUS', 'BUS212', 'Financial Management I', 200, 1, 3);
      addC('BUS', 'BUS213', 'Marketing Management I', 200, 1, 2);
      addC('BUS', 'BUS214', 'Operations Management I', 200, 1, 2);
      addC('BUS', 'BUS215', 'Management Information Systems', 200, 1, 2);
      addC('BUS', 'BUS221', 'Organisational Behaviour II', 200, 2, 3);
      addC('BUS', 'BUS222', 'Financial Management II', 200, 2, 2);
      addC('BUS', 'BUS223', 'Marketing Management II', 200, 2, 2);
      addC('BUS', 'BUS224', 'Operations Management II', 200, 2, 2);
      addC('BUS', 'BUS225', 'Business Research Methods I', 200, 2, 2);

      // ─── COLMAS — Human Resource Management (HRM) ─────────────────────────
      addC('HRM', 'HRM111', 'Intro to Human Resource Management', 100, 1, 3);
      addC('HRM', 'HRM112', 'Organisational Behaviour Basics', 100, 1, 2);
      addC('HRM', 'HRM113', 'Business Mathematics', 100, 1, 2);
      addC('HRM', 'HRM114', 'Micro Economics', 100, 1, 2);
      addC('HRM', 'HRM115', 'Business Communication', 100, 1, 2);
      addC('HRM', 'HRM121', 'Principles of Management', 100, 2, 3);
      addC('HRM', 'HRM122', 'Macro Economics', 100, 2, 2);
      addC('HRM', 'HRM123', 'Organisational Theory', 100, 2, 2);
      addC('HRM', 'HRM124', 'Business Law', 100, 2, 2);
      addC('HRM', 'HRM125', 'Recruitment and Selection Basics', 100, 2, 2);
      addC('HRM', 'HRM211', 'Principles of Management II', 200, 1, 3);
      addC('HRM', 'HRM212', 'Recruitment and Selection', 200, 1, 3);
      addC('HRM', 'HRM213', 'Training and Development', 200, 1, 2);
      addC('HRM', 'HRM214', 'Employment Law I', 200, 1, 2);
      addC('HRM', 'HRM215', 'Compensation and Benefits I', 200, 1, 2);
      addC('HRM', 'HRM221', 'Organisational Behaviour', 200, 2, 3);
      addC('HRM', 'HRM222', 'Compensation and Benefits II', 200, 2, 2);
      addC('HRM', 'HRM223', 'Employment Law II', 200, 2, 2);
      addC('HRM', 'HRM224', 'Performance Management I', 200, 2, 2);
      addC('HRM', 'HRM225', 'Labour Relations I', 200, 2, 2);

      // ─── COLMAS — Marketing (MKT) ──────────────────────────────────────────
      addC('MKT', 'MKT111', 'Principles of Marketing I', 100, 1, 3);
      addC('MKT', 'MKT112', 'Business Mathematics', 100, 1, 2);
      addC('MKT', 'MKT113', 'Intro to Economics', 100, 1, 2);
      addC('MKT', 'MKT114', 'Business Communication', 100, 1, 2);
      addC('MKT', 'MKT115', 'Consumer Behaviour Basics', 100, 1, 2);
      addC('MKT', 'MKT121', 'Principles of Marketing II', 100, 2, 3);
      addC('MKT', 'MKT122', 'Macro Economics', 100, 2, 2);
      addC('MKT', 'MKT123', 'Marketing Research I', 100, 2, 2);
      addC('MKT', 'MKT124', 'Business Statistics', 100, 2, 2);
      addC('MKT', 'MKT125', 'Salesmanship', 100, 2, 2);
      addC('MKT', 'MKT211', 'Marketing Management I', 200, 1, 3);
      addC('MKT', 'MKT212', 'Consumer Behaviour', 200, 1, 3);
      addC('MKT', 'MKT213', 'Marketing Research II', 200, 1, 2);
      addC('MKT', 'MKT214', 'Sales Management', 200, 1, 2);
      addC('MKT', 'MKT215', 'Advertising and Promotion I', 200, 1, 2);
      addC('MKT', 'MKT221', 'Marketing Management II', 200, 2, 3);
      addC('MKT', 'MKT222', 'International Marketing I', 200, 2, 2);
      addC('MKT', 'MKT223', 'Brand Management', 200, 2, 2);
      addC('MKT', 'MKT224', 'Digital Marketing I', 200, 2, 2);
      addC('MKT', 'MKT225', 'Retail Management', 200, 2, 2);

      // ─── COLNAS — Biochemistry (BCH) ───────────────────────────────────────
      addC('BCH', 'BCH111', 'General Biochemistry I', 100, 1, 3);
      addC('BCH', 'BCH112', 'General Chemistry I', 100, 1, 2);
      addC('BCH', 'BCH113', 'General Biology I', 100, 1, 2);
      addC('BCH', 'BCH114', 'Cell Biology I', 100, 1, 2);
      addC('BCH', 'BCH115', 'Mathematics for Biochemists', 100, 1, 2);
      addC('BCH', 'BCH121', 'General Biochemistry II', 100, 2, 3);
      addC('BCH', 'BCH122', 'General Chemistry II', 100, 2, 2);
      addC('BCH', 'BCH123', 'General Biology II', 100, 2, 2);
      addC('BCH', 'BCH124', 'Cell Biology II', 100, 2, 2);
      addC('BCH', 'BCH125', 'Enzymology Basics', 100, 2, 2);
      addC('BCH', 'BCH211', 'Intermediary Metabolism I', 200, 1, 3);
      addC('BCH', 'BCH212', 'Biochemical Techniques I', 200, 1, 3);
      addC('BCH', 'BCH213', 'Molecular Biology I', 200, 1, 2);
      addC('BCH', 'BCH214', 'Enzymology I', 200, 1, 2);
      addC('BCH', 'BCH215', 'Nutritional Biochemistry I', 200, 1, 2);
      addC('BCH', 'BCH221', 'Intermediary Metabolism II', 200, 2, 3);
      addC('BCH', 'BCH222', 'Biochemical Techniques II', 200, 2, 3);
      addC('BCH', 'BCH223', 'Molecular Biology II', 200, 2, 2);
      addC('BCH', 'BCH224', 'Enzymology II', 200, 2, 2);
      addC('BCH', 'BCH225', 'Clinical Biochemistry I', 200, 2, 2);

      // ─── COLNAS — Microbiology (MCB) ───────────────────────────────────────
      addC('MCB', 'MCB111', 'General Microbiology I', 100, 1, 3);
      addC('MCB', 'MCB112', 'General Chemistry for Microbiology', 100, 1, 2);
      addC('MCB', 'MCB113', 'General Biology', 100, 1, 2);
      addC('MCB', 'MCB114', 'Cell Biology', 100, 1, 2);
      addC('MCB', 'MCB115', 'Intro to Biochemistry', 100, 1, 2);
      addC('MCB', 'MCB121', 'General Microbiology II', 100, 2, 3);
      addC('MCB', 'MCB122', 'Bacteriology I', 100, 2, 2);
      addC('MCB', 'MCB123', 'Virology I', 100, 2, 2);
      addC('MCB', 'MCB124', 'Mycology I', 100, 2, 2);
      addC('MCB', 'MCB125', 'Parasitology I', 100, 2, 2);
      addC('MCB', 'MCB211', 'Bacteriology II', 200, 1, 3);
      addC('MCB', 'MCB212', 'Virology II', 200, 1, 3);
      addC('MCB', 'MCB213', 'Immunology I', 200, 1, 2);
      addC('MCB', 'MCB214', 'Microbial Genetics I', 200, 1, 2);
      addC('MCB', 'MCB215', 'Environmental Microbiology I', 200, 1, 2);
      addC('MCB', 'MCB221', 'Medical Microbiology I', 200, 2, 3);
      addC('MCB', 'MCB222', 'Immunology II', 200, 2, 3);
      addC('MCB', 'MCB223', 'Microbial Genetics II', 200, 2, 2);
      addC('MCB', 'MCB224', 'Industrial Microbiology I', 200, 2, 2);
      addC('MCB', 'MCB225', 'Food Microbiology I', 200, 2, 2);

      // ─── CAERSE — Agribusiness (ABM) ──────────────────────────────────────
      addC('ABM', 'ABM111', 'Intro to Agribusiness', 100, 1, 3);
      addC('ABM', 'ABM112', 'Farm Management Basics', 100, 1, 2);
      addC('ABM', 'ABM113', 'Agricultural Economics I', 100, 1, 2);
      addC('ABM', 'ABM114', 'Business Mathematics', 100, 1, 2);
      addC('ABM', 'ABM115', 'Introduction to Agriculture', 100, 1, 2);
      addC('ABM', 'ABM121', 'Principles of Agribusiness', 100, 2, 3);
      addC('ABM', 'ABM122', 'Agricultural Marketing', 100, 2, 2);
      addC('ABM', 'ABM123', 'Business Statistics', 100, 2, 2);
      addC('ABM', 'ABM124', 'Farm Records and Accounts', 100, 2, 2);
      addC('ABM', 'ABM125', 'Supply Chain in Agriculture', 100, 2, 2);
      addC('ABM', 'ABM211', 'Farm Business Management', 200, 1, 3);
      addC('ABM', 'ABM212', 'Agricultural Project Appraisal', 200, 1, 3);
      addC('ABM', 'ABM213', 'Agri-Finance I', 200, 1, 2);
      addC('ABM', 'ABM214', 'Agricultural Marketing II', 200, 1, 2);
      addC('ABM', 'ABM215', 'Value Chain Analysis', 200, 1, 2);
      addC('ABM', 'ABM221', 'Agri-Finance II', 200, 2, 3);
      addC('ABM', 'ABM222', 'Agricultural Insurance', 200, 2, 2);
      addC('ABM', 'ABM223', 'International Agribusiness', 200, 2, 2);
      addC('ABM', 'ABM224', 'Food Policy I', 200, 2, 2);
      addC('ABM', 'ABM225', 'Cooperative Finance', 200, 2, 2);

      // ─── CASAP — Animal Production (APL) ──────────────────────────────────
      addC('APL', 'APL111', 'Intro to Animal Production', 100, 1, 3);
      addC('APL', 'APL112', 'General Animal Science', 100, 1, 2);
      addC('APL', 'APL113', 'Animal Biology I', 100, 1, 2);
      addC('APL', 'APL114', 'Livestock Husbandry Basics', 100, 1, 2);
      addC('APL', 'APL115', 'Introduction to Agriculture', 100, 1, 2);
      addC('APL', 'APL121', 'Livestock Production Systems I', 100, 2, 3);
      addC('APL', 'APL122', 'Animal Nutrition I', 100, 2, 2);
      addC('APL', 'APL123', 'Poultry Science I', 100, 2, 2);
      addC('APL', 'APL124', 'Animal Genetics Basics', 100, 2, 2);
      addC('APL', 'APL125', 'Pasture and Forage I', 100, 2, 2);
      addC('APL', 'APL211', 'Livestock Production Systems II', 200, 1, 3);
      addC('APL', 'APL212', 'Animal Nutrition II', 200, 1, 3);
      addC('APL', 'APL213', 'Poultry Science II', 200, 1, 2);
      addC('APL', 'APL214', 'Animal Breeding I', 200, 1, 2);
      addC('APL', 'APL215', 'Animal Physiology I', 200, 1, 2);
      addC('APL', 'APL221', 'Livestock Production Systems III', 200, 2, 3);
      addC('APL', 'APL222', 'Animal Nutrition III', 200, 2, 2);
      addC('APL', 'APL223', 'Animal Breeding II', 200, 2, 2);
      addC('APL', 'APL224', 'Animal Physiology II', 200, 2, 2);
      addC('APL', 'APL225', 'Feed Technology', 200, 2, 2);

      // ─── CAFST — Food Science (FST) ──────────────────────────────────────
      addC('FST', 'FST111', 'Intro to Food Science', 100, 1, 3);
      addC('FST', 'FST112', 'General Chemistry for Food Science', 100, 1, 2);
      addC('FST', 'FST113', 'General Biology for Food Science', 100, 1, 2);
      addC('FST', 'FST114', 'Food and Nutrition Basics', 100, 1, 2);
      addC('FST', 'FST115', 'Food Safety Basics', 100, 1, 2);
      addC('FST', 'FST121', 'Food Chemistry I', 100, 2, 3);
      addC('FST', 'FST122', 'Food Microbiology I', 100, 2, 2);
      addC('FST', 'FST123', 'Food Processing I', 100, 2, 2);
      addC('FST', 'FST124', 'Post-Harvest Technology I', 100, 2, 2);
      addC('FST', 'FST125', 'Food Quality Basics', 100, 2, 2);
      addC('FST', 'FST211', 'Food Chemistry II', 200, 1, 3);
      addC('FST', 'FST212', 'Food Microbiology II', 200, 1, 3);
      addC('FST', 'FST213', 'Food Processing II', 200, 1, 2);
      addC('FST', 'FST214', 'Food Engineering I', 200, 1, 2);
      addC('FST', 'FST215', 'Cereals and Legumes Technology', 200, 1, 2);
      addC('FST', 'FST221', 'Food Chemistry III', 200, 2, 3);
      addC('FST', 'FST222', 'Food Microbiology III', 200, 2, 2);
      addC('FST', 'FST223', 'Food Processing III', 200, 2, 2);
      addC('FST', 'FST224', 'Food Engineering II', 200, 2, 2);
      addC('FST', 'FST225', 'Food Quality Management I', 200, 2, 2);

      // ─── CCSS — Agronomy (AGR) ────────────────────────────────────────────
      addC('AGR', 'AGR111', 'Intro to Agronomy', 100, 1, 3);
      addC('AGR', 'AGR112', 'General Botany', 100, 1, 2);
      addC('AGR', 'AGR113', 'General Chemistry', 100, 1, 2);
      addC('AGR', 'AGR114', 'Introduction to Soil Science', 100, 1, 2);
      addC('AGR', 'AGR115', 'Introduction to Agriculture', 100, 1, 2);
      addC('AGR', 'AGR121', 'Crop Production I', 100, 2, 3);
      addC('AGR', 'AGR122', 'General Botany II', 100, 2, 2);
      addC('AGR', 'AGR123', 'Soil Science I', 100, 2, 2);
      addC('AGR', 'AGR124', 'Weed Science Basics', 100, 2, 2);
      addC('AGR', 'AGR125', 'Crop Protection Basics', 100, 2, 2);
      addC('AGR', 'AGR211', 'Crop Production II', 200, 1, 3);
      addC('AGR', 'AGR212', 'Soil Fertility and Management', 200, 1, 3);
      addC('AGR', 'AGR213', 'Weed Science I', 200, 1, 2);
      addC('AGR', 'AGR214', 'Crop Physiology I', 200, 1, 2);
      addC('AGR', 'AGR215', 'Irrigation and Drainage I', 200, 1, 2);
      addC('AGR', 'AGR221', 'Crop Production III', 200, 2, 3);
      addC('AGR', 'AGR222', 'Soil Fertility II', 200, 2, 2);
      addC('AGR', 'AGR223', 'Weed Science II', 200, 2, 2);
      addC('AGR', 'AGR224', 'Crop Physiology II', 200, 2, 2);
      addC('AGR', 'AGR225', 'Sustainable Agriculture', 200, 2, 2);

      // ─── CNREM — Environment Management (EMT) ─────────────────────────────
      addC('EMT', 'EMT111', 'Introduction to Environmental Science', 100, 1, 3);
      addC('EMT', 'EMT112', 'General Chemistry', 100, 1, 2);
      addC('EMT', 'EMT113', 'General Biology', 100, 1, 2);
      addC('EMT', 'EMT114', 'Ecology Basics', 100, 1, 2);
      addC('EMT', 'EMT115', 'Environmental Policy Basics', 100, 1, 2);
      addC('EMT', 'EMT121', 'Environmental Chemistry I', 100, 2, 3);
      addC('EMT', 'EMT122', 'Environmental Biology', 100, 2, 2);
      addC('EMT', 'EMT123', 'Toxicology Basics', 100, 2, 2);
      addC('EMT', 'EMT124', 'Waste Management Basics', 100, 2, 2);
      addC('EMT', 'EMT125', 'Air Quality Basics', 100, 2, 2);
      addC('EMT', 'EMT211', 'Environmental Chemistry II', 200, 1, 3);
      addC('EMT', 'EMT212', 'Toxicology I', 200, 1, 3);
      addC('EMT', 'EMT213', 'Environmental Monitoring I', 200, 1, 2);
      addC('EMT', 'EMT214', 'Waste Management I', 200, 1, 2);
      addC('EMT', 'EMT215', 'GIS Applications', 200, 1, 2);
      addC('EMT', 'EMT221', 'Toxicology II', 200, 2, 3);
      addC('EMT', 'EMT222', 'Environmental Monitoring II', 200, 2, 2);
      addC('EMT', 'EMT223', 'Waste Management II', 200, 2, 2);
      addC('EMT', 'EMT224', 'Water Quality Management I', 200, 2, 2);
      addC('EMT', 'EMT225', 'Environmental Law I', 200, 2, 2);

      // ─── CVM — Veterinary Medicine (VET) ──────────────────────────────────
      addC('VET', 'VET111', 'Intro to Veterinary Medicine', 100, 1, 3);
      addC('VET', 'VET112', 'Veterinary Chemistry', 100, 1, 2);
      addC('VET', 'VET113', 'Animal Biology I', 100, 1, 2);
      addC('VET', 'VET114', 'Animal Anatomy I', 100, 1, 2);
      addC('VET', 'VET115', 'Animal Physiology I', 100, 1, 2);
      addC('VET', 'VET121', 'Animal Biology II', 100, 2, 3);
      addC('VET', 'VET122', 'Animal Anatomy II', 100, 2, 2);
      addC('VET', 'VET123', 'Animal Physiology II', 100, 2, 2);
      addC('VET', 'VET124', 'Veterinary Microbiology I', 100, 2, 2);
      addC('VET', 'VET125', 'Parasitology I', 100, 2, 2);
      addC('VET', 'VET211', 'Veterinary Anatomy III', 200, 1, 3);
      addC('VET', 'VET212', 'Veterinary Physiology I', 200, 1, 3);
      addC('VET', 'VET213', 'Veterinary Microbiology II', 200, 1, 2);
      addC('VET', 'VET214', 'Veterinary Pharmacology I', 200, 1, 2);
      addC('VET', 'VET215', 'Parasitology II', 200, 1, 2);
      addC('VET', 'VET221', 'Veterinary Physiology II', 200, 2, 3);
      addC('VET', 'VET222', 'Veterinary Pharmacology II', 200, 2, 2);
      addC('VET', 'VET223', 'Veterinary Pathology I', 200, 2, 2);
      addC('VET', 'VET224', 'Clinical Skills I', 200, 2, 2);
      addC('VET', 'VET225', 'Animal Nutrition', 200, 2, 2);

      // ─── COED — Adult Education (ACE) ─────────────────────────────────────
      addC('ACE', 'ACE111', 'Foundations of Education', 100, 1, 3);
      addC('ACE', 'ACE112', 'Adult Education Basics', 100, 1, 2);
      addC('ACE', 'ACE113', 'Educational Psychology I', 100, 1, 2);
      addC('ACE', 'ACE114', 'Sociology of Education', 100, 1, 2);
      addC('ACE', 'ACE115', 'Philosophy of Education', 100, 1, 2);
      addC('ACE', 'ACE121', 'History of Education', 100, 2, 3);
      addC('ACE', 'ACE122', 'Educational Psychology II', 100, 2, 2);
      addC('ACE', 'ACE123', 'Curriculum Development Basics', 100, 2, 2);
      addC('ACE', 'ACE124', 'Adult Learning Theories', 100, 2, 2);
      addC('ACE', 'ACE125', 'Community Development Basics', 100, 2, 2);
      addC('ACE', 'ACE211', 'Adult Education Principles', 200, 1, 3);
      addC('ACE', 'ACE212', 'Community Development I', 200, 1, 3);
      addC('ACE', 'ACE213', 'Non-Formal Education I', 200, 1, 2);
      addC('ACE', 'ACE214', 'Educational Research Methods I', 200, 1, 2);
      addC('ACE', 'ACE215', 'Curriculum Theory I', 200, 1, 2);
      addC('ACE', 'ACE221', 'Community Development II', 200, 2, 3);
      addC('ACE', 'ACE222', 'Non-Formal Education II', 200, 2, 2);
      addC('ACE', 'ACE223', 'Educational Research Methods II', 200, 2, 2);
      addC('ACE', 'ACE224', 'Curriculum Theory II', 200, 2, 2);
      addC('ACE', 'ACE225', 'Educational Technology I', 200, 2, 2);

      await prisma.course.createMany({ data: allCourses, skipDuplicates: true });
      const courses = await prisma.course.findMany();
      results.push(`✓ ${courses.length} courses created`);
      progressBroadcaster.broadcastProgress('courses', 'Courses created', `${courses.length} courses`, '📚✅');

      // ══════════════════════════════════════════════════════════════════════
      // 6b. COURSE OFFERINGS — Create offerings for each course
      // ══════════════════════════════════════════════════════════════════════
      progressBroadcaster.broadcastProgress('offerings', 'Creating course offerings...', 'All courses', '📋');

      let offeringCount = 0;
      for (const course of courses) {
        if (!course.level || !course.semester) continue;

        const level = getLevel(course.level);
        const sem = getSemester('2025/2026', course.semester);

        // Create offering
        const offering = await prisma.courseOffering.upsert({
          where: {
            courseId_academicSemesterId_levelId: {
              courseId: course.id,
              academicSemesterId: sem.id,
              levelId: level.id,
            }
          },
          create: {
            courseId: course.id,
            academicSemesterId: sem.id,
            levelId: level.id,
            status: 'open',
            capacity: 100,
          },
          update: {},
        });
        offeringCount++;

        // Link to department
        await prisma.courseOfferingDepartment.upsert({
          where: {
            offeringId_departmentId: {
              offeringId: offering.id,
              departmentId: course.departmentId,
            }
          },
          create: {
            offeringId: offering.id,
            departmentId: course.departmentId,
            isPrimary: true,
          },
          update: {},
        });

        // Create curriculum
        await prisma.curriculum.upsert({
          where: {
            departmentId_levelId_semester_courseId: {
              departmentId: course.departmentId,
              levelId: level.id,
              semester: course.semester,
              courseId: course.id,
            }
          },
          create: {
            departmentId: course.departmentId,
            levelId: level.id,
            semester: course.semester,
            courseId: course.id,
            type: course.isGeneral ? 'gst' : 'core',
          },
          update: {},
        });
      }

      results.push(`✓ ${offeringCount} course offerings created`);
      progressBroadcaster.broadcastProgress('offerings', 'Offerings created', `${offeringCount} offerings`, '📋✅');

      // ══════════════════════════════════════════════════════════════════════
      // 7. PASSWORDS
      // ══════════════════════════════════════════════════════════════════════
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

      // ══════════════════════════════════════════════════════════════════════
      // 8. USERS
      // ══════════════════════════════════════════════════════════════════════
      progressBroadcaster.broadcastProgress('users', 'Creating users...', 'All roles', '👥');
      const allUsersToCreate: any[] = [];

      // ── Admins ────────────────────────────────────────────────────────────
      [
        { email: 'admin@mouau.edu.ng', fullName: 'Admin One', staffId: 'SU310449' },
        { email: 'admin2@mouau.edu.ng', fullName: 'Admin Two', staffId: 'ADM002' },
        { email: 'admin_ogwo@mouau.edu.ng', fullName: 'Ogwo Godspower Chinaza', staffId: 'ADM310449' },
      ].forEach(a => allUsersToCreate.push({ email: a.email, fullName: a.fullName, passwordHash: adminPass, role: 'admin', staffId: a.staffId, session: '2025/2026' }));

      // ── HODs for ALL Departments ─────────────────────────────────────────────
      const hodData = [
        // COLPAS
        { email: 'hod.csc@mouau.edu.ng', fullName: 'Prof. Amara Obi', staffId: 'HOD001', deptCode: 'CSC' },
        { email: 'hod.mth@mouau.edu.ng', fullName: 'Prof. Emeka Nwosu', staffId: 'HOD002', deptCode: 'MTH' },
        { email: 'hod.phy@mouau.edu.ng', fullName: 'Prof. Ngozi Eze', staffId: 'HOD003', deptCode: 'PHY' },
        { email: 'hod.chm@mouau.edu.ng', fullName: 'Prof. Chinedu Okonkwo', staffId: 'HOD004', deptCode: 'CHM' },
        { email: 'hod.sta@mouau.edu.ng', fullName: 'Prof. Uche Okafor', staffId: 'HOD012', deptCode: 'STA' },
        { email: 'hod.glg@mouau.edu.ng', fullName: 'Prof. Kelechi Ogbonna', staffId: 'HOD013', deptCode: 'GLG' },

        // CEET
        { email: 'hod.eee@mouau.edu.ng', fullName: 'Prof. Basil Ani', staffId: 'HOD005', deptCode: 'EEE' },
        { email: 'hod.cpe@mouau.edu.ng', fullName: 'Dr. Ikenna Ozoemena', staffId: 'HOD008', deptCode: 'CPE' },
        { email: 'hod.cve@mouau.edu.ng', fullName: 'Prof. Eze Obi', staffId: 'HOD009', deptCode: 'CVE' },
        { email: 'hod.abe@mouau.edu.ng', fullName: 'Dr. Chidi Nwachukwu', staffId: 'HOD014', deptCode: 'ABE' },
        { email: 'hod.che@mouau.edu.ng', fullName: 'Dr. Adaobi Eze', staffId: 'HOD015', deptCode: 'CHE' },
        { email: 'hod.mce@mouau.edu.ng', fullName: 'Prof. Okechukwu Eze', staffId: 'HOD016', deptCode: 'MCE' },

        // COLMAS
        { email: 'hod.acc@mouau.edu.ng', fullName: 'Dr. Adaeze Okon', staffId: 'HOD006', deptCode: 'ACC' },
        { email: 'hod.bus@mouau.edu.ng', fullName: 'Dr. Amaka Okonkwo', staffId: 'HOD010', deptCode: 'BUS' },
        { email: 'hod.hrm@mouau.edu.ng', fullName: 'Prof. Ngozi Ekwueme', staffId: 'HOD007', deptCode: 'HRM' },
        { email: 'hod.mkt@mouau.edu.ng', fullName: 'Dr. Chukwudum Eze', staffId: 'HOD011', deptCode: 'MKT' },
        { email: 'hod.bnf@mouau.edu.ng', fullName: 'Dr. Obiageli Okafor', staffId: 'HOD017', deptCode: 'BNF' },
        { email: 'hod.ecn@mouau.edu.ng', fullName: 'Dr. Chidi Agu', staffId: 'HOD018', deptCode: 'ECN' },
        { email: 'hod.ent@mouau.edu.ng', fullName: 'Dr. Nnamdi Obi', staffId: 'HOD019', deptCode: 'ENT' },
        { email: 'hod.irp@mouau.edu.ng', fullName: 'Dr. Ebere Nwosu', staffId: 'HOD020', deptCode: 'IRP' },

        // COLNAS
        { email: 'hod.bch@mouau.edu.ng', fullName: 'Dr. Chidi Agu', staffId: 'HOD021', deptCode: 'BCH' },
        { email: 'hod.mcb@mouau.edu.ng', fullName: 'Dr. Ogechukwu Eze', staffId: 'HOD022', deptCode: 'MCB' },
        { email: 'hod.psb@mouau.edu.ng', fullName: 'Dr. Chiamaka Nwosu', staffId: 'HOD023', deptCode: 'PSB' },
        { email: 'hod.zeb@mouau.edu.ng', fullName: 'Dr. Adaeze Obi', staffId: 'HOD024', deptCode: 'ZEB' },

        // CAERSE
        { email: 'hod.abm@mouau.edu.ng', fullName: 'Dr. Peter Ugwu', staffId: 'HOD025', deptCode: 'ABM' },
        { email: 'hod.aec@mouau.edu.ng', fullName: 'Dr. Chuka Nwankwo', staffId: 'HOD026', deptCode: 'AEC' },
        { email: 'hod.aers@mouau.edu.ng', fullName: 'Dr. Ngozi Eze', staffId: 'HOD027', deptCode: 'AERS' },

        // CASAP
        { email: 'hod.apl@mouau.edu.ng', fullName: 'Dr. Emeka Okafor', staffId: 'HOD028', deptCode: 'APL' },
        { email: 'hod.abp@mouau.edu.ng', fullName: 'Dr. Ada Eze', staffId: 'HOD029', deptCode: 'ABP' },
        { email: 'hod.anf@mouau.edu.ng', fullName: 'Dr. Chidi Okonkwo', staffId: 'HOD030', deptCode: 'ANF' },

        // CAFST
        { email: 'hod.fst@mouau.edu.ng', fullName: 'Dr. Chidinma Amadi', staffId: 'HOD031', deptCode: 'FST' },
        { email: 'hod.hnd@mouau.edu.ng', fullName: 'Dr. Ezinne Nwachukwu', staffId: 'HOD032', deptCode: 'HND' },
        { email: 'hod.hht@mouau.edu.ng', fullName: 'Dr. Tunde Bello', staffId: 'HOD033', deptCode: 'HHT' },

        // CCSS
        { email: 'hod.agr@mouau.edu.ng', fullName: 'Dr. Ugwu Okafor', staffId: 'HOD034', deptCode: 'AGR' },
        { email: 'hod.phm@mouau.edu.ng', fullName: 'Dr. Chijioke Obi', staffId: 'HOD035', deptCode: 'PHM' },
        { email: 'hod.ssm@mouau.edu.ng', fullName: 'Dr. Funmilayo Adebayo', staffId: 'HOD036', deptCode: 'SSM' },
        { email: 'hod.wrm@mouau.edu.ng', fullName: 'Dr. Ken Okafor', staffId: 'HOD037', deptCode: 'WRM' },

        // CNREM
        { email: 'hod.emt@mouau.edu.ng', fullName: 'Dr. Chinwe Okonkwo', staffId: 'HOD038', deptCode: 'EMT' },
        { email: 'hod.far@mouau.edu.ng', fullName: 'Dr. Olu Adeyemi', staffId: 'HOD039', deptCode: 'FAR' },
        { email: 'hod.fem@mouau.edu.ng', fullName: 'Dr. Nkechi Obi', staffId: 'HOD040', deptCode: 'FEM' },

        // COED
        { email: 'hod.ace@mouau.edu.ng', fullName: 'Dr. Grace Nwosu', staffId: 'HOD041', deptCode: 'ACE' },
        { email: 'hod.ahe@mouau.edu.ng', fullName: 'Dr. Bisi Oladipo', staffId: 'HOD042', deptCode: 'AHE' },
        { email: 'hod.bed@mouau.edu.ng', fullName: 'Dr. Chidi Okafor', staffId: 'HOD043', deptCode: 'BED' },
        { email: 'hod.ece@mouau.edu.ng', fullName: 'Dr. Ada Eze', staffId: 'HOD044', deptCode: 'ECE' },
        { email: 'hod.edm@mouau.edu.ng', fullName: 'Dr. Emeka Nwosu', staffId: 'HOD045', deptCode: 'EDM' },
        { email: 'hod.ite@mouau.edu.ng', fullName: 'Dr. Chukwudi Okonkwo', staffId: 'HOD046', deptCode: 'ITE' },
        { email: 'hod.lis@mouau.edu.ng', fullName: 'Dr. Joy Okafor', staffId: 'HOD047', deptCode: 'LIS' },
        { email: 'hod.gca@mouau.edu.ng', fullName: 'Dr. Patience Obi', staffId: 'HOD048', deptCode: 'GCA' },
        { email: 'hod.ise@mouau.edu.ng', fullName: 'Dr. Ken Eze', staffId: 'HOD049', deptCode: 'ISE' },

        // CVM
        { email: 'hod.vet@mouau.edu.ng', fullName: 'Prof. Samuel Onyekachi', staffId: 'HOD050', deptCode: 'VET' },
        { email: 'hod.thr@mouau.edu.ng', fullName: 'Dr. Okechukwu Nwosu', staffId: 'HOD051', deptCode: 'THR' },
        { email: 'hod.vam@mouau.edu.ng', fullName: 'Dr. Ngozi Eze', staffId: 'HOD052', deptCode: 'VAM' },
        { email: 'hod.vmb@mouau.edu.ng', fullName: 'Dr. Ikenna Obi', staffId: 'HOD053', deptCode: 'VMB' },
        { email: 'hod.vph@mouau.edu.ng', fullName: 'Dr. Adaobi Okonkwo', staffId: 'HOD054', deptCode: 'VPH' },
        { email: 'hod.vsr@mouau.edu.ng', fullName: 'Dr. Emeka Eze', staffId: 'HOD055', deptCode: 'VSR' },

        // SGS
        { email: 'hod.eng@mouau.edu.ng', fullName: 'Dr. Nnamdi Nzeka', staffId: 'HOD056', deptCode: 'ENG' },
        { email: 'hod.frn@mouau.edu.ng', fullName: 'Dr. Chidi French', staffId: 'HOD057', deptCode: 'FRN' },
        { email: 'hod.ger@mouau.edu.ng', fullName: 'Dr. Ulrike Schmidt', staffId: 'HOD058', deptCode: 'GER' },
        { email: 'hod.his@mouau.edu.ng', fullName: 'Dr. Chukwuma History', staffId: 'HOD059', deptCode: 'HIS' },
        { email: 'hod.soc@mouau.edu.ng', fullName: 'Dr. Bola Ogunleye', staffId: 'HOD060', deptCode: 'SOC' },
        { email: 'hod.phe@mouau.edu.ng', fullName: 'Dr. Kayode Ogun', staffId: 'HOD061', deptCode: 'PHE' },
        { email: 'hod.phl@mouau.edu.ng', fullName: 'Dr. Uchenna Philosophy', staffId: 'HOD062', deptCode: 'PHL' },
        { email: 'hod.pcs@mouau.edu.ng', fullName: 'Dr. Ijeoma Peace', staffId: 'HOD063', deptCode: 'PCS' },

        // CAERSE
        { email: 'hod.aec@mouau.edu.ng', fullName: 'Prof. Chuka Nwankwo', staffId: 'HOD064', deptCode: 'AEC' },
        { email: 'hod.aers@mouau.edu.ng', fullName: 'Prof. Ngozi Eze', staffId: 'HOD065', deptCode: 'AERS' },

        // CASAP
        { email: 'hod.abp@mouau.edu.ng', fullName: 'Prof. Ada Eze', staffId: 'HOD066', deptCode: 'ABP' },
        { email: 'hod.anf@mouau.edu.ng', fullName: 'Prof. Chidi Okonkwo', staffId: 'HOD067', deptCode: 'ANF' },

        // CAFST
        { email: 'hod.hnd@mouau.edu.ng', fullName: 'Prof. Ezinne Nwachukwu', staffId: 'HOD068', deptCode: 'HND' },
        { email: 'hod.hht@mouau.edu.ng', fullName: 'Prof. Tunde Bello', staffId: 'HOD069', deptCode: 'HHT' },

        // CCSS
        { email: 'hod.phm@mouau.edu.ng', fullName: 'Prof. Chijioke Obi', staffId: 'HOD070', deptCode: 'PHM' },
        { email: 'hod.ssm@mouau.edu.ng', fullName: 'Prof. Funmilayo Adebayo', staffId: 'HOD071', deptCode: 'SSM' },
        { email: 'hod.wrm@mouau.edu.ng', fullName: 'Prof. Ken Okafor', staffId: 'HOD072', deptCode: 'WRM' },

        // CNREM
        { email: 'hod.far@mouau.edu.ng', fullName: 'Prof. Olu Adeyemi', staffId: 'HOD073', deptCode: 'FAR' },
        { email: 'hod.fem@mouau.edu.ng', fullName: 'Prof. Nkechi Obi', staffId: 'HOD074', deptCode: 'FEM' },

        // COLNAS
        { email: 'hod.psb@mouau.edu.ng', fullName: 'Prof. Chiamaka Nwosu', staffId: 'HOD075', deptCode: 'PSB' },
        { email: 'hod.zeb@mouau.edu.ng', fullName: 'Prof. Adaeze Obi', staffId: 'HOD076', deptCode: 'ZEB' },

        // CEET
        { email: 'hod.abe@mouau.edu.ng', fullName: 'Prof. Chidi Nwachukwu', staffId: 'HOD077', deptCode: 'ABE' },
        { email: 'hod.che@mouau.edu.ng', fullName: 'Prof. Adaobi Eze', staffId: 'HOD078', deptCode: 'CHE' },
        { email: 'hod.mce@mouau.edu.ng', fullName: 'Prof. Okechukwu Eze', staffId: 'HOD079', deptCode: 'MCE' },

        // COLMAS
        { email: 'hod.bnf@mouau.edu.ng', fullName: 'Prof. Obiageli Okafor', staffId: 'HOD080', deptCode: 'BNF' },
        { email: 'hod.ecn@mouau.edu.ng', fullName: 'Prof. Chidi Agu', staffId: 'HOD081', deptCode: 'ECN' },
        { email: 'hod.ent@mouau.edu.ng', fullName: 'Prof. Nnamdi Obi', staffId: 'HOD082', deptCode: 'ENT' },
        { email: 'hod.irp@mouau.edu.ng', fullName: 'Prof. Ebere Nwosu', staffId: 'HOD083', deptCode: 'IRP' },

        // CVM
        { email: 'hod.thr@mouau.edu.ng', fullName: 'Prof. Okechukwu Nwosu', staffId: 'HOD084', deptCode: 'THR' },
        { email: 'hod.vam@mouau.edu.ng', fullName: 'Prof. Ngozi Eze', staffId: 'HOD085', deptCode: 'VAM' },
        { email: 'hod.vmb@mouau.edu.ng', fullName: 'Prof. Ikenna Obi', staffId: 'HOD086', deptCode: 'VMB' },
        { email: 'hod.vph@mouau.edu.ng', fullName: 'Prof. Adaobi Okonkwo', staffId: 'HOD087', deptCode: 'VPH' },
        { email: 'hod.vsr@mouau.edu.ng', fullName: 'Prof. Emeka Eze', staffId: 'HOD088', deptCode: 'VSR' },

        // SGS
        { email: 'hod.frn@mouau.edu.ng', fullName: 'Prof. Chidi French', staffId: 'HOD089', deptCode: 'FRN' },
        { email: 'hod.ger@mouau.edu.ng', fullName: 'Prof. Ulrike Schmidt', staffId: 'HOD090', deptCode: 'GER' },
        { email: 'hod.soc@mouau.edu.ng', fullName: 'Prof. Bola Ogunleye', staffId: 'HOD091', deptCode: 'SOC' },
        { email: 'hod.phe@mouau.edu.ng', fullName: 'Prof. Kayode Ogun', staffId: 'HOD092', deptCode: 'PHE' },

        // Additional HOD
        { email: 'hod_ogwo@mouau.edu.ng', fullName: 'Ogwo Godspower (HOD)', staffId: 'HOD310449', deptCode: 'CSC' },
      ];

      hodData.forEach(h => {
        const dept = getDept(h.deptCode);
        allUsersToCreate.push({
          email: h.email,
          fullName: h.fullName,
          passwordHash: hodPass,
          role: 'hod',
          staffId: h.staffId,
          collegeId: dept.collegeId,
          departmentId: dept.id,
          session: '2025/2026'
        });
      });

      // ── Deans for ALL Colleges ─────────────────────────────────────────────
      [
        { email: 'dean.colpas@mouau.edu.ng', fullName: 'Prof. Victor Okeke (Dean COLPAS)', staffId: 'DEN001', collegeCode: 'COLPAS' },
        { email: 'dean.ceet@mouau.edu.ng', fullName: 'Prof. James Eze (Dean CEET)', staffId: 'DEN002', collegeCode: 'CEET' },
        { email: 'dean.colmas@mouau.edu.ng', fullName: 'Prof. Rose Nwosu (Dean COLMAS)', staffId: 'DEN003', collegeCode: 'COLMAS' },
        { email: 'dean.colnas@mouau.edu.ng', fullName: 'Prof. Samuel Obi (Dean COLNAS)', staffId: 'DEN004', collegeCode: 'COLNAS' },
        { email: 'dean.caerse@mouau.edu.ng', fullName: 'Prof. Chidi Nwankwo (Dean CAERSE)', staffId: 'DEN005', collegeCode: 'CAERSE' },
        { email: 'dean.casap@mouau.edu.ng', fullName: 'Prof. Ada Eze (Dean CASAP)', staffId: 'DEN006', collegeCode: 'CASAP' },
        { email: 'dean.cafst@mouau.edu.ng', fullName: 'Prof. Emeka Okafor (Dean CAFST)', staffId: 'DEN007', collegeCode: 'CAFST' },
        { email: 'dean.ccss@mouau.edu.ng', fullName: 'Prof. Chijioke Obi (Dean CCSS)', staffId: 'DEN008', collegeCode: 'CCSS' },
        { email: 'dean.cnrem@mouau.edu.ng', fullName: 'Prof. Nkechi Okonkwo (Dean CNREM)', staffId: 'DEN009', collegeCode: 'CNREM' },
        { email: 'dean.coed@mouau.edu.ng', fullName: 'Prof. Grace Nwosu (Dean COED)', staffId: 'DEN010', collegeCode: 'COED' },
        { email: 'dean.cvm@mouau.edu.ng', fullName: 'Prof. Samuel Onyekachi (Dean CVM)', staffId: 'DEN011', collegeCode: 'CVM' },
        { email: 'dean.sgs@mouau.edu.ng', fullName: 'Prof. Nnamdi Nzeka (Dean SGS)', staffId: 'DEN012', collegeCode: 'SGS' },
        { email: 'dean_ogwo@mouau.edu.ng', fullName: 'Ogwo Godspower (Dean)', staffId: 'DEN310449', collegeCode: 'COLPAS' },
      ].forEach(d => {
        allUsersToCreate.push({
          email: d.email,
          fullName: d.fullName,
          passwordHash: deanPass,
          role: 'dean',
          staffId: d.staffId,
          collegeId: getCollege(d.collegeCode).id,
          session: '2025/2026'
        });
      });

      // ── Exam Officers ──────────────────────────────────────────────────────
      [
        { email: 'examofficer1@mouau.edu.ng', fullName: 'Mr. Chukwuemeka Obi', staffId: 'EXO001' },
        { email: 'examofficer2@mouau.edu.ng', fullName: 'Mrs. Ngozi Eze', staffId: 'EXO002' },
        { email: 'examofficer_ogwo@mouau.edu.ng', fullName: 'Ogwo Godspower (EO)', staffId: 'EXO310449' },
      ].forEach(e => allUsersToCreate.push({
        email: e.email,
        fullName: e.fullName,
        passwordHash: examOfficerPass,
        role: 'exam_officer',
        staffId: e.staffId,
        session: '2025/2026'
      }));

      // ── VC/DVC ────────────────────────────────────────────────────────────
      [
        { email: 'vc@mouau.edu.ng', fullName: 'Prof. Ikechukwu Nwachukwu (VC)', staffId: 'VC001' },
        { email: 'dvc@mouau.edu.ng', fullName: 'Prof. Ada Obi (DVC)', staffId: 'DVC001' },
        { email: 'vcdvc_ogwo@mouau.edu.ng', fullName: 'Ogwo Godspower (VC)', staffId: 'VC310449' },
      ].forEach(v => allUsersToCreate.push({
        email: v.email,
        fullName: v.fullName,
        passwordHash: vcDvcPass,
        role: 'vc_dvc',
        staffId: v.staffId,
        session: '2025/2026'
      }));

      // ── Lecturers (2 per department/course) ─────────────────────────────────────────
      const lecturerData = [
        // COLPAS Departments
        { email: 'dr.okafor.csc@mouau.edu.ng', fullName: 'Dr. Emeka Okafor', staffId: 'LCT001', deptCode: 'CSC' },
        { email: 'prof.adaeze.csc@mouau.edu.ng', fullName: 'Prof. Adaeze Nwosu', staffId: 'LCT002', deptCode: 'CSC' },
        { email: 'dr.maths1@mouau.edu.ng', fullName: 'Dr. Chidi Okafor', staffId: 'LCT003', deptCode: 'MTH' },
        { email: 'prof.maths2@mouau.edu.ng', fullName: 'Prof. Ngozi Eze', staffId: 'LCT004', deptCode: 'MTH' },
        { email: 'dr.uche.phy@mouau.edu.ng', fullName: 'Dr. Uche Anyanwu', staffId: 'LCT005', deptCode: 'PHY' },
        { email: 'prof.obiora.phy@mouau.edu.ng', fullName: 'Prof. Obiora Kalu', staffId: 'LCT006', deptCode: 'PHY' },
        { email: 'dr.agbo.chm@mouau.edu.ng', fullName: 'Dr. Ifenna Agbo', staffId: 'LCT007', deptCode: 'CHM' },
        { email: 'prof.chm2@mouau.edu.ng', fullName: 'Prof. Chioma Obi', staffId: 'LCT008', deptCode: 'CHM' },
        { email: 'dr.stats1@mouau.edu.ng', fullName: 'Dr. Emmanuel Nwachukwu', staffId: 'LCT009', deptCode: 'STA' },
        { email: 'dr.stats2@mouau.edu.ng', fullName: 'Dr. Joy Okafor', staffId: 'LCT010', deptCode: 'STA' },
        { email: 'dr.geology1@mouau.edu.ng', fullName: 'Dr. Godwin Okonkwo', staffId: 'LCT011', deptCode: 'GLG' },
        { email: 'dr.geology2@mouau.edu.ng', fullName: 'Dr. Mercy Eze', staffId: 'LCT012', deptCode: 'GLG' },

        // CEET
        { email: 'dr.adekunle.eee@mouau.edu.ng', fullName: 'Dr. Adekunle Williams', staffId: 'LCT013', deptCode: 'EEE' },
        { email: 'prof.eee2@mouau.edu.ng', fullName: 'Prof. Kingsley Okafor', staffId: 'LCT014', deptCode: 'EEE' },
        { email: 'dr.ikenna.cpe@mouau.edu.ng', fullName: 'Dr. Ikenna Ozoemena', staffId: 'LCT015', deptCode: 'CPE' },
        { email: 'dr.cpe2@mouau.edu.ng', fullName: 'Dr. Adaeze Ani', staffId: 'LCT016', deptCode: 'CPE' },
        { email: 'prof.obi.cve@mouau.edu.ng', fullName: 'Prof. Eze Obi', staffId: 'LCT017', deptCode: 'CVE' },
        { email: 'dr.cve2@mouau.edu.ng', fullName: 'Dr. Chidi Nwachukwu', staffId: 'LCT018', deptCode: 'CVE' },
        { email: 'dr.abe1@mouau.edu.ng', fullName: 'Dr. Ugwu Okafor', staffId: 'LCT019', deptCode: 'ABE' },
        { email: 'dr.abe2@mouau.edu.ng', fullName: 'Dr. Ngozi Obi', staffId: 'LCT020', deptCode: 'ABE' },
        { email: 'dr.che1@mouau.edu.ng', fullName: 'Dr. Chukwudi Eze', staffId: 'LCT021', deptCode: 'CHE' },
        { email: 'dr.che2@mouau.edu.ng', fullName: 'Dr. Adaobi Nwosu', staffId: 'LCT022', deptCode: 'CHE' },
        { email: 'dr.mce1@mouau.edu.ng', fullName: 'Dr. Okechukwu Obi', staffId: 'LCT023', deptCode: 'MCE' },
        { email: 'dr.mce2@mouau.edu.ng', fullName: 'Dr. Chinwe Eze', staffId: 'LCT024', deptCode: 'MCE' },

        // COLMAS
        { email: 'dr.onyekachi.acc@mouau.edu.ng', fullName: 'Dr. Onyekachi Mbah', staffId: 'LCT025', deptCode: 'ACC' },
        { email: 'prof.acc2@mouau.edu.ng', fullName: 'Prof. Amara Nwosu', staffId: 'LCT026', deptCode: 'ACC' },
        { email: 'dr.okonkwo.bus@mouau.edu.ng', fullName: 'Dr. Amaka Okonkwo', staffId: 'LCT027', deptCode: 'BUS' },
        { email: 'prof.bus2@mouau.edu.ng', fullName: 'Prof. Chidi Obi', staffId: 'LCT028', deptCode: 'BUS' },
        { email: 'prof.ekwueme.hrm@mouau.edu.ng', fullName: 'Prof. Ngozi Ekwueme', staffId: 'LCT029', deptCode: 'HRM' },
        { email: 'dr.hrm2@mouau.edu.ng', fullName: 'Dr. Emeka Nwachukwu', staffId: 'LCT030', deptCode: 'HRM' },
        { email: 'dr.mkt1@mouau.edu.ng', fullName: 'Dr. Chukwudum Eze', staffId: 'LCT031', deptCode: 'MKT' },
        { email: 'dr.mkt2@mouau.edu.ng', fullName: 'Dr. Nkechi Okafor', staffId: 'LCT032', deptCode: 'MKT' },
        { email: 'dr.bnf1@mouau.edu.ng', fullName: 'Dr. Obiageli Okafor', staffId: 'LCT033', deptCode: 'BNF' },
        { email: 'dr.bnf2@mouau.edu.ng', fullName: 'Dr. Chidi Agu', staffId: 'LCT034', deptCode: 'BNF' },
        { email: 'dr.ecn1@mouau.edu.ng', fullName: 'Dr. Nnamdi Obi', staffId: 'LCT035', deptCode: 'ECN' },
        { email: 'dr.ecn2@mouau.edu.ng', fullName: 'Dr. Ebere Nwosu', staffId: 'LCT036', deptCode: 'ECN' },
        { email: 'dr.ent1@mouau.edu.ng', fullName: 'Dr. Tunde Bello', staffId: 'LCT037', deptCode: 'ENT' },
        { email: 'dr.ent2@mouau.edu.ng', fullName: 'Dr. Funmi Adebayo', staffId: 'LCT038', deptCode: 'ENT' },
        { email: 'dr.irp1@mouau.edu.ng', fullName: 'Dr. James Okafor', staffId: 'LCT039', deptCode: 'IRP' },
        { email: 'dr.irp2@mouau.edu.ng', fullName: 'Dr. Mary Eze', staffId: 'LCT040', deptCode: 'IRP' },

        // COLNAS
        { email: 'dr.ibrahim.bch@mouau.edu.ng', fullName: 'Dr. Musa Ibrahim', staffId: 'LCT041', deptCode: 'BCH' },
        { email: 'dr.bch2@mouau.edu.ng', fullName: 'Dr. Ngozi Obi', staffId: 'LCT042', deptCode: 'BCH' },
        { email: 'dr.eze.mcb@mouau.edu.ng', fullName: 'Dr. Ogechukwu Eze', staffId: 'LCT043', deptCode: 'MCB' },
        { email: 'dr.mcb2@mouau.edu.ng', fullName: 'Dr. Chidi Okafor', staffId: 'LCT044', deptCode: 'MCB' },
        { email: 'dr.psb1@mouau.edu.ng', fullName: 'Dr. Chiamaka Nwosu', staffId: 'LCT045', deptCode: 'PSB' },
        { email: 'dr.psb2@mouau.edu.ng', fullName: 'Dr. Adaeze Obi', staffId: 'LCT046', deptCode: 'PSB' },
        { email: 'dr.zeb1@mouau.edu.ng', fullName: 'Dr. Chinedu Okafor', staffId: 'LCT047', deptCode: 'ZEB' },
        { email: 'dr.zeb2@mouau.edu.ng', fullName: 'Dr. Ngozi Nwachukwu', staffId: 'LCT048', deptCode: 'ZEB' },

        // CAERSE
        { email: 'dr.abm1@mouau.edu.ng', fullName: 'Dr. Peter Ugwu', staffId: 'LCT049', deptCode: 'ABM' },
        { email: 'dr.abm2@mouau.edu.ng', fullName: 'Dr. Chuka Nwankwo', staffId: 'LCT050', deptCode: 'ABM' },
        { email: 'dr.aec1@mouau.edu.ng', fullName: 'Dr. Ngozi Eze', staffId: 'LCT051', deptCode: 'AEC' },
        { email: 'dr.aec2@mouau.edu.ng', fullName: 'Dr. Emeka Okafor', staffId: 'LCT052', deptCode: 'AEC' },
        { email: 'dr.aers1@mouau.edu.ng', fullName: 'Dr. Ada Eze', staffId: 'LCT053', deptCode: 'AERS' },
        { email: 'dr.aers2@mouau.edu.ng', fullName: 'Dr. Chidi Okonkwo', staffId: 'LCT054', deptCode: 'AERS' },

        // CASAP
        { email: 'dr.apl1@mouau.edu.ng', fullName: 'Dr. Emeka Okafor', staffId: 'LCT055', deptCode: 'APL' },
        { email: 'dr.apl2@mouau.edu.ng', fullName: 'Dr. Ada Eze', staffId: 'LCT056', deptCode: 'APL' },
        { email: 'dr.abp1@mouau.edu.ng', fullName: 'Dr. Chidi Okonkwo', staffId: 'LCT057', deptCode: 'ABP' },
        { email: 'dr.abp2@mouau.edu.ng', fullName: 'Dr. Ngozi Obi', staffId: 'LCT058', deptCode: 'ABP' },
        { email: 'dr.anf1@mouau.edu.ng', fullName: 'Dr. Uche Nwachukwu', staffId: 'LCT059', deptCode: 'ANF' },
        { email: 'dr.anf2@mouau.edu.ng', fullName: 'Dr. Chiamaka Eze', staffId: 'LCT060', deptCode: 'ANF' },

        // CAFST
        { email: 'dr.amadi.fst@mouau.edu.ng', fullName: 'Dr. Chidinma Amadi', staffId: 'LCT061', deptCode: 'FST' },
        { email: 'dr.fst2@mouau.edu.ng', fullName: 'Dr. Ezinne Nwachukwu', staffId: 'LCT062', deptCode: 'FST' },
        { email: 'dr.hnd1@mouau.edu.ng', fullName: 'Dr. Tunde Bello', staffId: 'LCT063', deptCode: 'HND' },
        { email: 'dr.hnd2@mouau.edu.ng', fullName: 'Dr. Funmi Adebayo', staffId: 'LCT064', deptCode: 'HND' },
        { email: 'dr.hht1@mouau.edu.ng', fullName: 'Dr. Bisi Oladipo', staffId: 'LCT065', deptCode: 'HHT' },
        { email: 'dr.hht2@mouau.edu.ng', fullName: 'Dr. Kemi Ogunleye', staffId: 'LCT066', deptCode: 'HHT' },

        // CCSS
        { email: 'dr.agr1@mouau.edu.ng', fullName: 'Dr. Ugwu Okafor', staffId: 'LCT067', deptCode: 'AGR' },
        { email: 'dr.agr2@mouau.edu.ng', fullName: 'Dr. Chijioke Obi', staffId: 'LCT068', deptCode: 'AGR' },
        { email: 'dr.phm1@mouau.edu.ng', fullName: 'Dr. Funmilayo Adebayo', staffId: 'LCT069', deptCode: 'PHM' },
        { email: 'dr.phm2@mouau.edu.ng', fullName: 'Dr. Ken Okafor', staffId: 'LCT070', deptCode: 'PHM' },
        { email: 'dr.ssm1@mouau.edu.ng', fullName: 'Dr. Chidi Nwachukwu', staffId: 'LCT071', deptCode: 'SSM' },
        { email: 'dr.ssm2@mouau.edu.ng', fullName: 'Dr. Ngozi Obi', staffId: 'LCT072', deptCode: 'SSM' },
        { email: 'dr.wrm1@mouau.edu.ng', fullName: 'Dr. Olu Adeyemi', staffId: 'LCT073', deptCode: 'WRM' },
        { email: 'dr.wrm2@mouau.edu.ng', fullName: 'Dr. Nkechi Okonkwo', staffId: 'LCT074', deptCode: 'WRM' },

        // CNREM
        { email: 'dr.emt1@mouau.edu.ng', fullName: 'Dr. Chinwe Okonkwo', staffId: 'LCT075', deptCode: 'EMT' },
        { email: 'dr.emt2@mouau.edu.ng', fullName: 'Dr. Olu Adeyemi', staffId: 'LCT076', deptCode: 'EMT' },
        { email: 'dr.far1@mouau.edu.ng', fullName: 'Dr. Nkechi Obi', staffId: 'LCT077', deptCode: 'FAR' },
        { email: 'dr.far2@mouau.edu.ng', fullName: 'Dr. Chidi Eze', staffId: 'LCT078', deptCode: 'FAR' },
        { email: 'dr.fem1@mouau.edu.ng', fullName: 'Dr. Grace Nwosu', staffId: 'LCT079', deptCode: 'FEM' },
        { email: 'dr.fem2@mouau.edu.ng', fullName: 'Dr. Bisi Oladipo', staffId: 'LCT080', deptCode: 'FEM' },

        // COED
        { email: 'dr.ace1@mouau.edu.ng', fullName: 'Dr. Grace Nwosu', staffId: 'LCT081', deptCode: 'ACE' },
        { email: 'dr.ace2@mouau.edu.ng', fullName: 'Dr. Bisi Oladipo', staffId: 'LCT082', deptCode: 'ACE' },
        { email: 'dr.ahe1@mouau.edu.ng', fullName: 'Dr. Chidi Okafor', staffId: 'LCT083', deptCode: 'AHE' },
        { email: 'dr.ahe2@mouau.edu.ng', fullName: 'Dr. Ada Eze', staffId: 'LCT084', deptCode: 'AHE' },
        { email: 'dr.bed1@mouau.edu.ng', fullName: 'Dr. Emeka Nwosu', staffId: 'LCT085', deptCode: 'BED' },
        { email: 'dr.bed2@mouau.edu.ng', fullName: 'Dr. Chukwudi Okonkwo', staffId: 'LCT086', deptCode: 'BED' },
        { email: 'dr.ece1@mouau.edu.ng', fullName: 'Dr. Joy Okafor', staffId: 'LCT087', deptCode: 'ECE' },
        { email: 'dr.ece2@mouau.edu.ng', fullName: 'Dr. Patience Obi', staffId: 'LCT088', deptCode: 'ECE' },
        { email: 'dr.edm1@mouau.edu.ng', fullName: 'Dr. Ken Eze', staffId: 'LCT089', deptCode: 'EDM' },
        { email: 'dr.edm2@mouau.edu.ng', fullName: 'Dr. Nkechi Okafor', staffId: 'LCT090', deptCode: 'EDM' },
        { email: 'dr.ite1@mouau.edu.ng', fullName: 'Dr. Chidi Obi', staffId: 'LCT091', deptCode: 'ITE' },
        { email: 'dr.ite2@mouau.edu.ng', fullName: 'Dr. Ada Okonkwo', staffId: 'LCT092', deptCode: 'ITE' },
        { email: 'dr.lis1@mouau.edu.ng', fullName: 'Dr. Grace Eze', staffId: 'LCT093', deptCode: 'LIS' },
        { email: 'dr.lis2@mouau.edu.ng', fullName: 'Dr. Chidi Nwachukwu', staffId: 'LCT094', deptCode: 'LIS' },
        { email: 'dr.gca1@mouau.edu.ng', fullName: 'Dr. Ngozi Obi', staffId: 'LCT095', deptCode: 'GCA' },
        { email: 'dr.gca2@mouau.edu.ng', fullName: 'Dr. Emeka Okafor', staffId: 'LCT096', deptCode: 'GCA' },
        { email: 'dr.ise1@mouau.edu.ng', fullName: 'Dr. Ada Eze', staffId: 'LCT097', deptCode: 'ISE' },
        { email: 'dr.ise2@mouau.edu.ng', fullName: 'Dr. Chidi Okonkwo', staffId: 'LCT098', deptCode: 'ISE' },

        // CVM
        { email: 'prof.vet1@mouau.edu.ng', fullName: 'Prof. Samuel Onyekachi', staffId: 'LCT099', deptCode: 'VET' },
        { email: 'dr.vet2@mouau.edu.ng', fullName: 'Dr. Chidi Nwosu', staffId: 'LCT100', deptCode: 'VET' },
        { email: 'dr.thr1@mouau.edu.ng', fullName: 'Dr. Okechukwu Nwosu', staffId: 'LCT101', deptCode: 'THR' },
        { email: 'dr.thr2@mouau.edu.ng', fullName: 'Dr. Ngozi Eze', staffId: 'LCT102', deptCode: 'THR' },
        { email: 'dr.vam1@mouau.edu.ng', fullName: 'Dr. Ikenna Obi', staffId: 'LCT103', deptCode: 'VAM' },
        { email: 'dr.vam2@mouau.edu.ng', fullName: 'Dr. Adaobi Okonkwo', staffId: 'LCT104', deptCode: 'VAM' },
        { email: 'dr.vmb1@mouau.edu.ng', fullName: 'Dr. Emeka Eze', staffId: 'LCT105', deptCode: 'VMB' },
        { email: 'dr.vmb2@mouau.edu.ng', fullName: 'Dr. Chioma Okafor', staffId: 'LCT106', deptCode: 'VMB' },
        { email: 'dr.vph1@mouau.edu.ng', fullName: 'Dr. Chidi Obi', staffId: 'LCT107', deptCode: 'VPH' },
        { email: 'dr.vph2@mouau.edu.ng', fullName: 'Dr. Ngozi Nwachukwu', staffId: 'LCT108', deptCode: 'VPH' },
        { email: 'dr.vsr1@mouau.edu.ng', fullName: 'Dr. Emeka Okafor', staffId: 'LCT109', deptCode: 'VSR' },
        { email: 'dr.vsr2@mouau.edu.ng', fullName: 'Dr. Ada Eze', staffId: 'LCT110', deptCode: 'VSR' },

        // SGS
        { email: 'dr.nzeka.eng@mouau.edu.ng', fullName: 'Dr. Nnamdi Nzeka', staffId: 'LCT111', deptCode: 'ENG' },
        { email: 'dr.eng2@mouau.edu.ng', fullName: 'Dr. Chidi English', staffId: 'LCT112', deptCode: 'ENG' },
        { email: 'dr.frn1@mouau.edu.ng', fullName: 'Dr. Chidi French', staffId: 'LCT113', deptCode: 'FRN' },
        { email: 'dr.frn2@mouau.edu.ng', fullName: 'Dr. Ulrike Schmidt', staffId: 'LCT114', deptCode: 'FRN' },
        { email: 'dr.ger1@mouau.edu.ng', fullName: 'Dr. Ulrike Schmidt', staffId: 'LCT115', deptCode: 'GER' },
        { email: 'dr.ger2@mouau.edu.ng', fullName: 'Dr. Chidi German', staffId: 'LCT116', deptCode: 'GER' },
        { email: 'dr.his1@mouau.edu.ng', fullName: 'Dr. Chukwuma History', staffId: 'LCT117', deptCode: 'HIS' },
        { email: 'dr.his2@mouau.edu.ng', fullName: 'Dr. Ngozi History', staffId: 'LCT118', deptCode: 'HIS' },
        { email: 'dr.soc1@mouau.edu.ng', fullName: 'Dr. Bola Ogunleye', staffId: 'LCT119', deptCode: 'SOC' },
        { email: 'dr.soc2@mouau.edu.ng', fullName: 'Dr. Funke Adebayo', staffId: 'LCT120', deptCode: 'SOC' },
        { email: 'dr.phe1@mouau.edu.ng', fullName: 'Dr. Kayode Ogun', staffId: 'LCT121', deptCode: 'PHE' },
        { email: 'dr.phe2@mouau.edu.ng', fullName: 'Dr. Bisi Oladipo', staffId: 'LCT122', deptCode: 'PHE' },
        { email: 'dr.phl1@mouau.edu.ng', fullName: 'Dr. Uchenna Philosophy', staffId: 'LCT123', deptCode: 'PHL' },
        { email: 'dr.phl2@mouau.edu.ng', fullName: 'Dr. Ijeoma Philosophy', staffId: 'LCT124', deptCode: 'PHL' },
        { email: 'dr.pcs1@mouau.edu.ng', fullName: 'Dr. Ijeoma Peace', staffId: 'LCT125', deptCode: 'PCS' },
        { email: 'dr.pcs2@mouau.edu.ng', fullName: 'Dr. Chidi Peace', staffId: 'LCT126', deptCode: 'PCS' },

        { email: 'lec_ogwo@mouau.edu.ng', fullName: 'Ogwo Godspower', staffId: 'PHY310449', deptCode: 'PHY' },
        { email: 'lec_ogwo_csc@mouau.edu.ng', fullName: 'Ogwo Godspower (CSC)', staffId: 'CSC310449', deptCode: 'CSC' },
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
          session: '2025/2026'
        });
      });

      // ── Invigilators ──────────────────────────────────────────────────────
      [
        { email: 'invig1@mouau.edu.ng', fullName: 'Mr. Chidi Eze', staffId: 'INV001', deptCode: 'CSC' },
        { email: 'invig2@mouau.edu.ng', fullName: 'Mrs. Ngozi Obi', staffId: 'INV002', deptCode: 'EEE' },
        { email: 'invig3@mouau.edu.ng', fullName: 'Mr. Emeka Nwachukwu', staffId: 'INV003', deptCode: 'MCB' },
        { email: 'invig4@mouau.edu.ng', fullName: 'Mrs. Funke Adeniyi', staffId: 'INV004', deptCode: 'HRM' },
        { email: 'invig5@mouau.edu.ng', fullName: 'Mr. Okechukwu Obi', staffId: 'INV005', deptCode: 'CVE' },
        { email: 'invig6@mouau.edu.ng', fullName: 'Mrs. Ada Eze', staffId: 'INV006', deptCode: 'ACC' },
        { email: 'invig7@mouau.edu.ng', fullName: 'Mr. Chidi Okafor', staffId: 'INV007', deptCode: 'BCH' },
        { email: 'invig8@mouau.edu.ng', fullName: 'Mrs. Grace Nwosu', staffId: 'INV008', deptCode: 'MTH' },
        { email: 'invig9@mouau.edu.ng', fullName: 'Mr. Bisi Oladipo', staffId: 'INV009', deptCode: 'PHY' },
        { email: 'invig10@mouau.edu.ng', fullName: 'Mrs. Kemi Ogunleye', staffId: 'INV010', deptCode: 'STA' },
        { email: 'invig_ogwo@mouau.edu.ng', fullName: 'Ogwo Godspower', staffId: 'INV310449', deptCode: 'PHY' },
      ].forEach(i => {
        const dept = getDept(i.deptCode);
        allUsersToCreate.push({
          email: i.email,
          fullName: i.fullName,
          passwordHash: invigilatorPass,
          role: 'invigilator',
          staffId: i.staffId,
          collegeId: dept.collegeId,
          departmentId: dept.id,
          session: '2025/2026'
        });
      });

      // ── Students — 100L and 200L only ─────────────────────────────────────
      const studentData: Array<{
        email: string; fullName: string; deptCode: string;
        matric: string; levelNum: number; session: string;
      }> = [
          // CSC — 100L (5 students)
          { email: 'adebayo.adekunle@student.mouau.edu.ng', fullName: 'Adebayo Adekunle', deptCode: 'CSC', matric: 'MOUAU/CSC/25/111213', levelNum: 100, session: '2025/2026' },
          { email: 'chioma.eke@student.mouau.edu.ng', fullName: 'Chioma Eke', deptCode: 'CSC', matric: 'MOUAU/CSC/25/334455', levelNum: 100, session: '2025/2026' },
          { email: 'damilola.adebayo@student.mouau.edu.ng', fullName: 'Damilola Adebayo', deptCode: 'CSC', matric: 'MOUAU/CSC/25/445566', levelNum: 100, session: '2025/2026' },
          { email: 'emeka.ogu@student.mouau.edu.ng', fullName: 'Emeka Ogu', deptCode: 'CSC', matric: 'MOUAU/CSC/25/556677', levelNum: 100, session: '2025/2026' },
          { email: 'gloria.umoh@student.mouau.edu.ng', fullName: 'Gloria Umoh', deptCode: 'CSC', matric: 'MOUAU/CSC/25/778899', levelNum: 100, session: '2025/2026' },
          // CSC — 200L (3 students)
          { email: 'alice.obi@student.mouau.edu.ng', fullName: 'Alice Obi', deptCode: 'CSC', matric: 'MOUAU/CSC/24/001', levelNum: 200, session: '2025/2026' },
          { email: 'bob.nwachukwu@student.mouau.edu.ng', fullName: 'Bob Nwachukwu', deptCode: 'CSC', matric: 'MOUAU/CSC/24/002', levelNum: 200, session: '2025/2026' },
          { email: 'emeka.agu@student.mouau.edu.ng', fullName: 'Emeka Agu', deptCode: 'CSC', matric: 'MOUAU/CSC/24/003', levelNum: 200, session: '2025/2026' },

          // PHY — 100L (4 students)
          { email: 'ogwo.godspower@student.mouau.edu.ng', fullName: 'Ogwo Godspower', deptCode: 'PHY', matric: 'MOUAU/PHY/25/128468', levelNum: 100, session: '2025/2026' },
          { email: 'ade.adeleke@student.mouau.edu.ng', fullName: 'Ade Adeleke', deptCode: 'PHY', matric: 'MOUAU/PHY/25/123456', levelNum: 100, session: '2025/2026' },
          { email: 'bimbo.oshodi@student.mouau.edu.ng', fullName: 'Bimbo Oshodi', deptCode: 'PHY', matric: 'MOUAU/PHY/25/234567', levelNum: 100, session: '2025/2026' },
          { email: 'chuka.obi@student.mouau.edu.ng', fullName: 'Chuka Obi', deptCode: 'PHY', matric: 'MOUAU/PHY/25/345678', levelNum: 100, session: '2025/2026' },
          // PHY — 200L (2 students)
          { email: 'isaac.udoh@student.mouau.edu.ng', fullName: 'Isaac Udoh', deptCode: 'PHY', matric: 'MOUAU/PHY/24/007', levelNum: 200, session: '2025/2026' },
          { email: 'joy.akan@student.mouau.edu.ng', fullName: 'Joy Akan', deptCode: 'PHY', matric: 'MOUAU/PHY/24/008', levelNum: 200, session: '2025/2026' },

          // CHM — 100L (4 students)
          { email: 'nnamdi.agu@student.mouau.edu.ng', fullName: 'Nnamdi Agu', deptCode: 'CHM', matric: 'MOUAU/CHM/25/141516', levelNum: 100, session: '2025/2026' },
          { email: 'chioma.ike@student.mouau.edu.ng', fullName: 'Chioma Ike', deptCode: 'CHM', matric: 'MOUAU/CHM/25/141517', levelNum: 100, session: '2025/2026' },
          { email: 'david.okonkwo@student.mouau.edu.ng', fullName: 'David Okonkwo', deptCode: 'CHM', matric: 'MOUAU/CHM/25/141518', levelNum: 100, session: '2025/2026' },
          { email: 'esther.udoh@student.mouau.edu.ng', fullName: 'Esther Udoh', deptCode: 'CHM', matric: 'MOUAU/CHM/25/141519', levelNum: 100, session: '2025/2026' },
          // CHM — 200L (2 students)
          { email: 'kelechi.ofor@student.mouau.edu.ng', fullName: 'Kelechi Ofor', deptCode: 'CHM', matric: 'MOUAU/CHM/24/001', levelNum: 200, session: '2025/2026' },
          { email: 'amaka.nwosu@student.mouau.edu.ng', fullName: 'Amaka Nwosu', deptCode: 'CHM', matric: 'MOUAU/CHM/24/002', levelNum: 200, session: '2025/2026' },

          // MTH — 100L (4 students)
          { email: 'obinna.obi@student.mouau.edu.ng', fullName: 'Obinna Obi', deptCode: 'MTH', matric: 'MOUAU/MTH/25/151617', levelNum: 100, session: '2025/2026' },
          { email: 'ada.mba@student.mouau.edu.ng', fullName: 'Ada Mba', deptCode: 'MTH', matric: 'MOUAU/MTH/25/151618', levelNum: 100, session: '2025/2026' },
          { email: 'chinua.achebe@student.mouau.edu.ng', fullName: 'Chinua Achebe', deptCode: 'MTH', matric: 'MOUAU/MTH/25/151619', levelNum: 100, session: '2025/2026' },
          { email: 'bisi.oladipo@student.mouau.edu.ng', fullName: 'Bisi Oladipo', deptCode: 'MTH', matric: 'MOUAU/MTH/25/151620', levelNum: 100, session: '2025/2026' },
          // MTH — 200L (2 students)
          { email: 'chidi.okafor@student.mouau.edu.ng', fullName: 'Chidi Okafor', deptCode: 'MTH', matric: 'MOUAU/MTH/24/001', levelNum: 200, session: '2025/2026' },
          { email: 'emeka.nwachukwu@student.mouau.edu.ng', fullName: 'Emeka Nwachukwu', deptCode: 'MTH', matric: 'MOUAU/MTH/24/002', levelNum: 200, session: '2025/2026' },

          // STA — 100L (4 students)
          { email: 'patience.aka@student.mouau.edu.ng', fullName: 'Patience Aka', deptCode: 'STA', matric: 'MOUAU/STA/25/161718', levelNum: 100, session: '2025/2026' },
          { email: 'tolu.adebayo@student.mouau.edu.ng', fullName: 'Tolu Adebayo', deptCode: 'STA', matric: 'MOUAU/STA/25/161719', levelNum: 100, session: '2025/2026' },
          { email: 'samuel.ogbe@student.mouau.edu.ng', fullName: 'Samuel Ogbe', deptCode: 'STA', matric: 'MOUAU/STA/25/161720', levelNum: 100, session: '2025/2026' },
          { email: 'victoria.edeh@student.mouau.edu.ng', fullName: 'Victoria Edeh', deptCode: 'STA', matric: 'MOUAU/STA/25/161721', levelNum: 100, session: '2025/2026' },
          // STA — 200L (2 students)
          { email: 'faith.obasi@student.mouau.edu.ng', fullName: 'Faith Obasi', deptCode: 'STA', matric: 'MOUAU/STA/24/001', levelNum: 200, session: '2025/2026' },
          { email: 'gabriel.udo@student.mouau.edu.ng', fullName: 'Gabriel Udo', deptCode: 'STA', matric: 'MOUAU/STA/24/002', levelNum: 200, session: '2025/2026' },

          // GLG — 100L (4 students)
          { email: 'queen.etuk@student.mouau.edu.ng', fullName: 'Queen Etuk', deptCode: 'GLG', matric: 'MOUAU/GLG/25/171819', levelNum: 100, session: '2025/2026' },
          { email: 'ndidi.efiong@student.mouau.edu.ng', fullName: 'Ndidi Efiong', deptCode: 'GLG', matric: 'MOUAU/GLG/25/171820', levelNum: 100, session: '2025/2026' },
          { email: 'kenneth.obiora@student.mouau.edu.ng', fullName: 'Kenneth Obiora', deptCode: 'GLG', matric: 'MOUAU/GLG/25/171821', levelNum: 100, session: '2025/2026' },
          { email: 'mercy.ekpo@student.mouau.edu.ng', fullName: 'Mercy Ekpo', deptCode: 'GLG', matric: 'MOUAU/GLG/25/171822', levelNum: 100, session: '2025/2026' },
          // GLG — 200L (2 students)
          { email: 'juliet.akan@student.mouau.edu.ng', fullName: 'Juliet Akan', deptCode: 'GLG', matric: 'MOUAU/GLG/24/001', levelNum: 200, session: '2025/2026' },
          { email: 'solomon.isaac@student.mouau.edu.ng', fullName: 'Solomon Isaac', deptCode: 'GLG', matric: 'MOUAU/GLG/24/002', levelNum: 200, session: '2025/2026' },

          // EEE — 100L (4 students)
          { email: 'tunde.adeyemi@student.mouau.edu.ng', fullName: 'Tunde Adeyemi', deptCode: 'EEE', matric: 'MOUAU/EEE/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'ngozi.eze@student.mouau.edu.ng', fullName: 'Ngozi Eze', deptCode: 'EEE', matric: 'MOUAU/EEE/25/111002', levelNum: 100, session: '2025/2026' },
          { email: 'ike.obi@student.mouau.edu.ng', fullName: 'Ike Obi', deptCode: 'EEE', matric: 'MOUAU/EEE/25/111003', levelNum: 100, session: '2025/2026' },
          { email: 'uche.okonkwo@student.mouau.edu.ng', fullName: 'Uche Okonkwo', deptCode: 'EEE', matric: 'MOUAU/EEE/25/111004', levelNum: 100, session: '2025/2026' },
          // EEE — 200L (2 students)
          { email: 'peter.okpara@student.mouau.edu.ng', fullName: 'Peter Okpara', deptCode: 'EEE', matric: 'MOUAU/EEE/24/009', levelNum: 200, session: '2025/2026' },
          { email: 'david.otu@student.mouau.edu.ng', fullName: 'David Otu', deptCode: 'EEE', matric: 'MOUAU/EEE/24/010', levelNum: 200, session: '2025/2026' },

          // CPE — 100L (4 students)
          { email: 'adaora.chukwu@student.mouau.edu.ng', fullName: 'Adaora Chukwu', deptCode: 'CPE', matric: 'MOUAU/CPE/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'chukwuma.eze@student.mouau.edu.ng', fullName: 'Chukwuma Eze', deptCode: 'CPE', matric: 'MOUAU/CPE/25/111002', levelNum: 100, session: '2025/2026' },
          { email: 'nnamdi.okonkwo@student.mouau.edu.ng', fullName: 'Nnamdi Okonkwo', deptCode: 'CPE', matric: 'MOUAU/CPE/25/111003', levelNum: 100, session: '2025/2026' },
          { email: 'chinwe.eze@student.mouau.edu.ng', fullName: 'Chinwe Eze', deptCode: 'CPE', matric: 'MOUAU/CPE/25/111004', levelNum: 100, session: '2025/2026' },
          // CPE — 200L (2 students)
          { email: 'nnamdi.obi@student.mouau.edu.ng', fullName: 'Nnamdi Obi', deptCode: 'CPE', matric: 'MOUAU/CPE/24/001', levelNum: 200, session: '2025/2026' },
          { email: 'ifeanyi.okafor@student.mouau.edu.ng', fullName: 'Ifeanyi Okafor', deptCode: 'CPE', matric: 'MOUAU/CPE/24/002', levelNum: 200, session: '2025/2026' },

          // CVE — 100L (4 students)
          { email: 'emeka.onyekwelu@student.mouau.edu.ng', fullName: 'Emeka Onyekwelu', deptCode: 'CVE', matric: 'MOUAU/CVE/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'obinna.okafor@student.mouau.edu.ng', fullName: 'Obinna Okafor', deptCode: 'CVE', matric: 'MOUAU/CVE/25/111002', levelNum: 100, session: '2025/2026' },
          { email: 'michael.nwankwo@student.mouau.edu.ng', fullName: 'Michael Nwankwo', deptCode: 'CVE', matric: 'MOUAU/CVE/25/111003', levelNum: 100, session: '2025/2026' },
          { email: 'chidi.okeke@student.mouau.edu.ng', fullName: 'Chidi Okeke', deptCode: 'CVE', matric: 'MOUAU/CVE/25/111004', levelNum: 100, session: '2025/2026' },
          // CVE — 200L (2 students)
          { email: 'obiageli.ezea@student.mouau.edu.ng', fullName: 'Obiageli Ezea', deptCode: 'CVE', matric: 'MOUAU/CVE/24/001', levelNum: 200, session: '2025/2026' },
          { email: 'chinedu.nweke@student.mouau.edu.ng', fullName: 'Chinedu Nweke', deptCode: 'CVE', matric: 'MOUAU/CVE/24/002', levelNum: 200, session: '2025/2026' },

          // ACC — 100L (4 students)
          { email: 'chisom.okafor@student.mouau.edu.ng', fullName: 'Chisom Okafor', deptCode: 'ACC', matric: 'MOUAU/ACC/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'dike.nwosu@student.mouau.edu.ng', fullName: 'Dike Nwosu', deptCode: 'ACC', matric: 'MOUAU/ACC/25/111002', levelNum: 100, session: '2025/2026' },
          { email: 'chinwe.obi@student.mouau.edu.ng', fullName: 'Chinwe Obi', deptCode: 'ACC', matric: 'MOUAU/ACC/25/111003', levelNum: 100, session: '2025/2026' },
          { email: 'ifeanyi.eze@student.mouau.edu.ng', fullName: 'Ifeanyi Eze', deptCode: 'ACC', matric: 'MOUAU/ACC/25/111004', levelNum: 100, session: '2025/2026' },
          // ACC — 200L (2 students)
          { email: 'amara.nwosu@student.mouau.edu.ng', fullName: 'Amara Nwosu', deptCode: 'ACC', matric: 'MOUAU/ACC/24/001', levelNum: 200, session: '2025/2026' },
          { email: 'nkechi.obi@student.mouau.edu.ng', fullName: 'Nkechi Obi', deptCode: 'ACC', matric: 'MOUAU/ACC/24/002', levelNum: 200, session: '2025/2026' },

          // BUS — 100L (4 students)
          { email: 'eze.okonkwo@student.mouau.edu.ng', fullName: 'Eze Okonkwo', deptCode: 'BUS', matric: 'MOUAU/BUS/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'adaobi.nweke@student.mouau.edu.ng', fullName: 'Adaobi Nweke', deptCode: 'BUS', matric: 'MOUAU/BUS/25/111002', levelNum: 100, session: '2025/2026' },
          { email: 'chukwudi.okeke@student.mouau.edu.ng', fullName: 'Chukwudi Okeke', deptCode: 'BUS', matric: 'MOUAU/BUS/25/111003', levelNum: 100, session: '2025/2026' },
          { email: 'uchenna.eze@student.mouau.edu.ng', fullName: 'Uchenna Eze', deptCode: 'BUS', matric: 'MOUAU/BUS/25/111004', levelNum: 100, session: '2025/2026' },
          // BUS — 200L (2 students)
          { email: 'chidera.nweke@student.mouau.edu.ng', fullName: 'Chidera Nweke', deptCode: 'BUS', matric: 'MOUAU/BUS/24/001', levelNum: 200, session: '2025/2026' },
          { email: 'dibia.ugwu@student.mouau.edu.ng', fullName: 'Dibia Ugwu', deptCode: 'BUS', matric: 'MOUAU/BUS/24/002', levelNum: 200, session: '2025/2026' },

          // HRM — 100L (4 students)
          { email: 'fatima.bello@student.mouau.edu.ng', fullName: 'Fatima Bello', deptCode: 'HRM', matric: 'MOUAU/HRM/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'amina.ahmed@student.mouau.edu.ng', fullName: 'Amina Ahmed', deptCode: 'HRM', matric: 'MOUAU/HRM/25/111002', levelNum: 100, session: '2025/2026' },
          { email: 'zainab.lawal@student.mouau.edu.ng', fullName: 'Zainab Lawal', deptCode: 'HRM', matric: 'MOUAU/HRM/25/111003', levelNum: 100, session: '2025/2026' },
          { email: 'hassan.ali@student.mouau.edu.ng', fullName: 'Hassan Ali', deptCode: 'HRM', matric: 'MOUAU/HRM/25/111004', levelNum: 100, session: '2025/2026' },
          // HRM — 200L (2 students)
          { email: 'xavier.otu@student.mouau.edu.ng', fullName: 'Xavier Otu', deptCode: 'HRM', matric: 'MOUAU/HRM/24/011', levelNum: 200, session: '2025/2026' },
          { email: 'faith.isaac@student.mouau.edu.ng', fullName: 'Faith Isaac', deptCode: 'HRM', matric: 'MOUAU/HRM/24/012', levelNum: 200, session: '2025/2026' },

          // MKT — 100L (4 students)
          { email: 'adaeze.okafor@student.mouau.edu.ng', fullName: 'Adaeze Okafor', deptCode: 'MKT', matric: 'MOUAU/MKT/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'chukwuma.eze@student.mouau.edu.ng', fullName: 'Chukwuma Eze', deptCode: 'MKT', matric: 'MOUAU/MKT/25/111002', levelNum: 100, session: '2025/2026' },
          { email: 'onyinyechi.okonkwo@student.mouau.edu.ng', fullName: 'Onyinyechi Okonkwo', deptCode: 'MKT', matric: 'MOUAU/MKT/25/111003', levelNum: 100, session: '2025/2026' },
          { email: 'chidiebere.nwachukwu@student.mouau.edu.ng', fullName: 'Chidiebere Nwachukwu', deptCode: 'MKT', matric: 'MOUAU/MKT/25/111004', levelNum: 100, session: '2025/2026' },
          // MKT — 200L (2 students)
          { email: 'ngozi.marketing@student.mouau.edu.ng', fullName: 'Ngozi Obi', deptCode: 'MKT', matric: 'MOUAU/MKT/24/001', levelNum: 200, session: '2025/2026' },
          { email: 'chidi.marketing@student.mouau.edu.ng', fullName: 'Chidi Okafor', deptCode: 'MKT', matric: 'MOUAU/MKT/24/002', levelNum: 200, session: '2025/2026' },

          // EMT — 100L (4 students)
          { email: 'kachi.udoka@student.mouau.edu.ng', fullName: 'Kachi Udoka', deptCode: 'EMT', matric: 'MOUAU/EMT/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'lola.ajayi@student.mouau.edu.ng', fullName: 'Lola Ajayi', deptCode: 'EMT', matric: 'MOUAU/EMT/25/111002', levelNum: 100, session: '2025/2026' },
          { email: 'chidi.ekwueme@student.mouau.edu.ng', fullName: 'Chidi Ekuweme', deptCode: 'EMT', matric: 'MOUAU/EMT/25/111003', levelNum: 100, session: '2025/2026' },
          { email: 'obiageli.okanwa@student.mouau.edu.ng', fullName: 'Obiageli Okanwa', deptCode: 'EMT', matric: 'MOUAU/EMT/25/111004', levelNum: 100, session: '2025/2026' },
          // EMT — 200L (2 students)
          { email: 'musa.env@student.mouau.edu.ng', fullName: 'Musa Abdullahi', deptCode: 'EMT', matric: 'MOUAU/EMT/24/001', levelNum: 200, session: '2025/2026' },
          { email: 'sarah.env@student.mouau.edu.ng', fullName: 'Sarah Okafor', deptCode: 'EMT', matric: 'MOUAU/EMT/24/002', levelNum: 200, session: '2025/2026' },

          // BCH — 100L (4 students)
          { email: 'uche.nwosu@student.mouau.edu.ng', fullName: 'Uche Nwosu', deptCode: 'BCH', matric: 'MOUAU/BCH/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'gift.obi@student.mouau.edu.ng', fullName: 'Gift Obi', deptCode: 'BCH', matric: 'MOUAU/BCH/25/111002', levelNum: 100, session: '2025/2026' },
          { email: 'chidiebere.ike@student.mouau.edu.ng', fullName: 'Chidiebere Ike', deptCode: 'BCH', matric: 'MOUAU/BCH/25/111003', levelNum: 100, session: '2025/2026' },
          { email: 'simon.akan@student.mouau.edu.ng', fullName: 'Simon Akan', deptCode: 'BCH', matric: 'MOUAU/BCH/25/111004', levelNum: 100, session: '2025/2026' },
          // BCH — 200L (2 students)
          { email: 'blessing.okon@student.mouau.edu.ng', fullName: 'Blessing Okon', deptCode: 'BCH', matric: 'MOUAU/BCH/24/010', levelNum: 200, session: '2025/2026' },
          { email: 'victor.udofia@student.mouau.edu.ng', fullName: 'Victor Udofia', deptCode: 'BCH', matric: 'MOUAU/BCH/24/011', levelNum: 200, session: '2025/2026' },

          // MCB — 100L (4 students)
          { email: 'ikenna.micro@student.mouau.edu.ng', fullName: 'Ikenna Okonkwo', deptCode: 'MCB', matric: 'MOUAU/MCB/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'adaobi.micro@student.mouau.edu.ng', fullName: 'Adaobi Eze', deptCode: 'MCB', matric: 'MOUAU/MCB/25/111002', levelNum: 100, session: '2025/2026' },
          { email: 'chukwudi.micro@student.mouau.edu.ng', fullName: 'Chukwudi Nwachukwu', deptCode: 'MCB', matric: 'MOUAU/MCB/25/111003', levelNum: 100, session: '2025/2026' },
          { email: 'nkechi.micro@student.mouau.edu.ng', fullName: 'Nkechi Obiora', deptCode: 'MCB', matric: 'MOUAU/MCB/25/111004', levelNum: 100, session: '2025/2026' },
          // MCB — 200L (2 students)
          { email: 'doris.onyia@student.mouau.edu.ng', fullName: 'Doris Onyia', deptCode: 'MCB', matric: 'MOUAU/MCB/24/001', levelNum: 200, session: '2025/2026' },
          { email: 'emmanuel.madu@student.mouau.edu.ng', fullName: 'Emmanuel Madu', deptCode: 'MCB', matric: 'MOUAU/MCB/24/002', levelNum: 200, session: '2025/2026' },

          // FST — 100L (4 students)
          { email: 'adanna.food@student.mouau.edu.ng', fullName: 'Adanna Okonkwo', deptCode: 'FST', matric: 'MOUAU/FST/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'bolu.food@student.mouau.edu.ng', fullName: 'Bolu Adebayo', deptCode: 'FST', matric: 'MOUAU/FST/25/111002', levelNum: 100, session: '2025/2026' },
          { email: 'chiamaka.food@student.mouau.edu.ng', fullName: 'Chiamaka Eze', deptCode: 'FST', matric: 'MOUAU/FST/25/111003', levelNum: 100, session: '2025/2026' },
          { email: 'david.food@student.mouau.edu.ng', fullName: 'David Okafor', deptCode: 'FST', matric: 'MOUAU/FST/25/111004', levelNum: 100, session: '2025/2026' },
          // FST — 200L (2 students)
          { email: 'edwin.chukwu@student.mouau.edu.ng', fullName: 'Edwin Chukwu', deptCode: 'FST', matric: 'MOUAU/FST/24/011', levelNum: 200, session: '2025/2026' },
          { email: 'faith.obi@student.mouau.edu.ng', fullName: 'Faith Obi', deptCode: 'FST', matric: 'MOUAU/FST/24/012', levelNum: 200, session: '2025/2026' },

          // AGR — 100L (4 students)
          { email: 'chibuzo.agronomy@student.mouau.edu.ng', fullName: 'Chibuzo Okonkwo', deptCode: 'AGR', matric: 'MOUAU/AGR/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'dami.agronomy@student.mouau.edu.ng', fullName: 'Dami Adebayo', deptCode: 'AGR', matric: 'MOUAU/AGR/25/111002', levelNum: 100, session: '2025/2026' },
          { email: 'obinna.agronomy@student.mouau.edu.ng', fullName: 'Obinna Eze', deptCode: 'AGR', matric: 'MOUAU/AGR/25/111003', levelNum: 100, session: '2025/2026' },
          { email: 'chioma.agronomy@student.mouau.edu.ng', fullName: 'Chioma Okafor', deptCode: 'AGR', matric: 'MOUAU/AGR/25/111004', levelNum: 100, session: '2025/2026' },
          // AGR — 200L (2 students)
          { email: 'eze.agronomy@student.mouau.edu.ng', fullName: 'Eze Okonkwo', deptCode: 'AGR', matric: 'MOUAU/AGR/24/001', levelNum: 200, session: '2025/2026' },
          { email: 'nnenna.agronomy@student.mouau.edu.ng', fullName: 'Nnenna Ugwu', deptCode: 'AGR', matric: 'MOUAU/AGR/24/002', levelNum: 200, session: '2025/2026' },

          // ABM — 100L (4 students)
          { email: 'favour.agribusiness@student.mouau.edu.ng', fullName: 'Favour Okonkwo', deptCode: 'ABM', matric: 'MOUAU/ABM/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'gift.agribusiness@student.mouau.edu.ng', fullName: 'Gift Eze', deptCode: 'ABM', matric: 'MOUAU/ABM/25/111002', levelNum: 100, session: '2025/2026' },
          { email: 'chidimma.agribusiness@student.mouau.edu.ng', fullName: 'Chidimma Okafor', deptCode: 'ABM', matric: 'MOUAU/ABM/25/111003', levelNum: 100, session: '2025/2026' },
          { email: 'emmanuel.agribusiness@student.mouau.edu.ng', fullName: 'Emmanuel Obi', deptCode: 'ABM', matric: 'MOUAU/ABM/25/111004', levelNum: 100, session: '2025/2026' },
          // ABM — 200L (2 students)
          { email: 'habib.agribusiness@student.mouau.edu.ng', fullName: 'Habib Abdullahi', deptCode: 'ABM', matric: 'MOUAU/ABM/24/001', levelNum: 200, session: '2025/2026' },
          { email: 'nkechi.agribusiness@student.mouau.edu.ng', fullName: 'Nkechi Nwosu', deptCode: 'ABM', matric: 'MOUAU/ABM/24/002', levelNum: 200, session: '2025/2026' },

          // APL — 100L (4 students)
          { email: 'ifechi.animal@student.mouau.edu.ng', fullName: 'Ifechi Okonkwo', deptCode: 'APL', matric: 'MOUAU/APL/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'john.animal@student.mouau.edu.ng', fullName: 'John Eze', deptCode: 'APL', matric: 'MOUAU/APL/25/111002', levelNum: 100, session: '2025/2026' },
          { email: 'chiamaka.animal@student.mouau.edu.ng', fullName: 'Chiamaka Okafor', deptCode: 'APL', matric: 'MOUAU/APL/25/111003', levelNum: 100, session: '2025/2026' },
          { email: 'paul.animal@student.mouau.edu.ng', fullName: 'Paul Obi', deptCode: 'APL', matric: 'MOUAU/APL/25/111004', levelNum: 100, session: '2025/2026' },
          // APL — 200L (2 students)
          { email: 'uche.animal@student.mouau.edu.ng', fullName: 'Uche Nwachukwu', deptCode: 'APL', matric: 'MOUAU/APL/24/001', levelNum: 200, session: '2025/2026' },
          { email: 'amara.animal@student.mouau.edu.ng', fullName: 'Amara Ugwu', deptCode: 'APL', matric: 'MOUAU/APL/24/002', levelNum: 200, session: '2025/2026' },

          // VET — 100L (4 students)
          { email: 'pat.veterinary@student.mouau.edu.ng', fullName: 'Patience Okonkwo', deptCode: 'VET', matric: 'MOUAU/VET/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'queen.veterinary@student.mouau.edu.ng', fullName: 'Queen Eze', deptCode: 'VET', matric: 'MOUAU/VET/25/111002', levelNum: 100, session: '2025/2026' },
          { email: 'chukwudi.veterinary@student.mouau.edu.ng', fullName: 'Chukwudi Okafor', deptCode: 'VET', matric: 'MOUAU/VET/25/111003', levelNum: 100, session: '2025/2026' },
          { email: 'chioma.veterinary@student.mouau.edu.ng', fullName: 'Chioma Obi', deptCode: 'VET', matric: 'MOUAU/VET/25/111004', levelNum: 100, session: '2025/2026' },
          // VET — 200L (2 students)
          { email: 'david.veterinary@student.mouau.edu.ng', fullName: 'David Nwosu', deptCode: 'VET', matric: 'MOUAU/VET/24/001', levelNum: 200, session: '2025/2026' },
          { email: 'mercy.veterinary@student.mouau.edu.ng', fullName: 'Mercy Nwachukwu', deptCode: 'VET', matric: 'MOUAU/VET/24/002', levelNum: 200, session: '2025/2026' },

          // ACE — 100L (4 students)
          { email: 'nkechi.education@student.mouau.edu.ng', fullName: 'Nkechi Okafor', deptCode: 'ACE', matric: 'MOUAU/ACE/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'ola.education@student.mouau.edu.ng', fullName: 'Ola Adeyemi', deptCode: 'ACE', matric: 'MOUAU/ACE/25/111002', levelNum: 100, session: '2025/2026' },
          { email: 'chidi.education@student.mouau.edu.ng', fullName: 'Chidi Okonkwo', deptCode: 'ACE', matric: 'MOUAU/ACE/25/111003', levelNum: 100, session: '2025/2026' },
          { email: 'bisi.education@student.mouau.edu.ng', fullName: 'Bisi Oladipo', deptCode: 'ACE', matric: 'MOUAU/ACE/25/111004', levelNum: 100, session: '2025/2026' },
          // ACE — 200L (2 students)
          { email: 'tunde.education@student.mouau.edu.ng', fullName: 'Tunde Ogun', deptCode: 'ACE', matric: 'MOUAU/ACE/24/001', levelNum: 200, session: '2025/2026' },
          { email: 'funke.education@student.mouau.edu.ng', fullName: 'Funke Adebayo', deptCode: 'ACE', matric: 'MOUAU/ACE/24/002', levelNum: 200, session: '2025/2026' },

          // ENG — 100L (4 students)
          { email: 'chidi.english@student.mouau.edu.ng', fullName: 'Chidi Okafor', deptCode: 'ENG', matric: 'MOUAU/ENG/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'ada.english@student.mouau.edu.ng', fullName: 'Ada Eze', deptCode: 'ENG', matric: 'MOUAU/ENG/25/111002', levelNum: 100, session: '2025/2026' },
          { email: 'emeka.english@student.mouau.edu.ng', fullName: 'Emeka Obi', deptCode: 'ENG', matric: 'MOUAU/ENG/25/111003', levelNum: 100, session: '2025/2026' },
          { email: 'nkechi.english@student.mouau.edu.ng', fullName: 'Nkechi Okonkwo', deptCode: 'ENG', matric: 'MOUAU/ENG/25/111004', levelNum: 100, session: '2025/2026' },
          // ENG — 200L (2 students)
          { email: 'uche.english@student.mouau.edu.ng', fullName: 'Uche Nwosu', deptCode: 'ENG', matric: 'MOUAU/ENG/24/001', levelNum: 200, session: '2025/2026' },
          { email: 'amara.english@student.mouau.edu.ng', fullName: 'Amara Nwachukwu', deptCode: 'ENG', matric: 'MOUAU/ENG/24/002', levelNum: 200, session: '2025/2026' },
          // ─── CAERSE ──────────────────────────────────────────────────────────────
          { email: 'uche.agric@student.mouau.edu.ng', fullName: 'Uche Okonkwo', deptCode: 'AEC', matric: 'MOUAU/AEC/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'amara.agric@student.mouau.edu.ng', fullName: 'Amara Nwosu', deptCode: 'AEC', matric: 'MOUAU/AEC/24/001', levelNum: 200, session: '2025/2026' },
          { email: 'emeka.ext@student.mouau.edu.ng', fullName: 'Emeka Obi', deptCode: 'AERS', matric: 'MOUAU/AERS/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'ngozi.ext@student.mouau.edu.ng', fullName: 'Ngozi Eze', deptCode: 'AERS', matric: 'MOUAU/AERS/24/001', levelNum: 200, session: '2025/2026' },

          // ─── CASAP ──────────────────────────────────────────────────────────────
          { email: 'chidi.breeding@student.mouau.edu.ng', fullName: 'Chidi Okafor', deptCode: 'ABP', matric: 'MOUAU/ABP/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'ada.breeding@student.mouau.edu.ng', fullName: 'Ada Eze', deptCode: 'ABP', matric: 'MOUAU/ABP/24/001', levelNum: 200, session: '2025/2026' },
          { email: 'ifeanyi.nutrition@student.mouau.edu.ng', fullName: 'Ifeanyi Nwachukwu', deptCode: 'ANF', matric: 'MOUAU/ANF/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'chioma.nutrition@student.mouau.edu.ng', fullName: 'Chioma Okonkwo', deptCode: 'ANF', matric: 'MOUAU/ANF/24/001', levelNum: 200, session: '2025/2026' },

          // ─── CAFST ──────────────────────────────────────────────────────────────
          { email: 'david.dietetics@student.mouau.edu.ng', fullName: 'David Nwosu', deptCode: 'HND', matric: 'MOUAU/HND/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'grace.dietetics@student.mouau.edu.ng', fullName: 'Grace Obi', deptCode: 'HND', matric: 'MOUAU/HND/24/001', levelNum: 200, session: '2025/2026' },
          { email: 'tunde.hospitality@student.mouau.edu.ng', fullName: 'Tunde Bello', deptCode: 'HHT', matric: 'MOUAU/HHT/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'funke.hospitality@student.mouau.edu.ng', fullName: 'Funke Adebayo', deptCode: 'HHT', matric: 'MOUAU/HHT/24/001', levelNum: 200, session: '2025/2026' },

          // ─── CCSS ──────────────────────────────────────────────────────────────
          { email: 'kenneth.plant@student.mouau.edu.ng', fullName: 'Kenneth Okafor', deptCode: 'PHM', matric: 'MOUAU/PHM/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'mercy.plant@student.mouau.edu.ng', fullName: 'Mercy Eze', deptCode: 'PHM', matric: 'MOUAU/PHM/24/001', levelNum: 200, session: '2025/2026' },
          { email: 'chidi.soil@student.mouau.edu.ng', fullName: 'Chidi Nwachukwu', deptCode: 'SSM', matric: 'MOUAU/SSM/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'nkechi.soil@student.mouau.edu.ng', fullName: 'Nkechi Obi', deptCode: 'SSM', matric: 'MOUAU/SSM/24/001', levelNum: 200, session: '2025/2026' },
          { email: 'emeka.water@student.mouau.edu.ng', fullName: 'Emeka Okonkwo', deptCode: 'WRM', matric: 'MOUAU/WRM/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'ada.water@student.mouau.edu.ng', fullName: 'Ada Eze', deptCode: 'WRM', matric: 'MOUAU/WRM/24/001', levelNum: 200, session: '2025/2026' },

          // ─── CNREM ──────────────────────────────────────────────────────────────
          { email: 'james.fisheries@student.mouau.edu.ng', fullName: 'James Okafor', deptCode: 'FAR', matric: 'MOUAU/FAR/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'joy.fisheries@student.mouau.edu.ng', fullName: 'Joy Nwachukwu', deptCode: 'FAR', matric: 'MOUAU/FAR/24/001', levelNum: 200, session: '2025/2026' },
          { email: 'chuka.forestry@student.mouau.edu.ng', fullName: 'Chuka Obi', deptCode: 'FEM', matric: 'MOUAU/FEM/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'amaka.forestry@student.mouau.edu.ng', fullName: 'Amaka Eze', deptCode: 'FEM', matric: 'MOUAU/FEM/24/001', levelNum: 200, session: '2025/2026' },

          // ─── COLNAS ──────────────────────────────────────────────────────────────
          { email: 'uche.plantbiotech@student.mouau.edu.ng', fullName: 'Uche Okonkwo', deptCode: 'PSB', matric: 'MOUAU/PSB/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'chioma.plantbiotech@student.mouau.edu.ng', fullName: 'Chioma Nwosu', deptCode: 'PSB', matric: 'MOUAU/PSB/24/001', levelNum: 200, session: '2025/2026' },
          { email: 'emeka.zoology@student.mouau.edu.ng', fullName: 'Emeka Okafor', deptCode: 'ZEB', matric: 'MOUAU/ZEB/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'ngozi.zoology@student.mouau.edu.ng', fullName: 'Ngozi Eze', deptCode: 'ZEB', matric: 'MOUAU/ZEB/24/001', levelNum: 200, session: '2025/2026' },

          // ─── CEET ──────────────────────────────────────────────────────────────
          { email: 'chidi.agroeng@student.mouau.edu.ng', fullName: 'Chidi Nwachukwu', deptCode: 'ABE', matric: 'MOUAU/ABE/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'ada.agroeng@student.mouau.edu.ng', fullName: 'Ada Obi', deptCode: 'ABE', matric: 'MOUAU/ABE/24/001', levelNum: 200, session: '2025/2026' },
          { email: 'ifeanyi.chemeng@student.mouau.edu.ng', fullName: 'Ifeanyi Okonkwo', deptCode: 'CHE', matric: 'MOUAU/CHE/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'grace.chemeng@student.mouau.edu.ng', fullName: 'Grace Eze', deptCode: 'CHE', matric: 'MOUAU/CHE/24/001', levelNum: 200, session: '2025/2026' },
          { email: 'david.mech@student.mouau.edu.ng', fullName: 'David Okafor', deptCode: 'MCE', matric: 'MOUAU/MCE/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'faith.mech@student.mouau.edu.ng', fullName: 'Faith Nwachukwu', deptCode: 'MCE', matric: 'MOUAU/MCE/24/001', levelNum: 200, session: '2025/2026' },

          // ─── COLMAS ──────────────────────────────────────────────────────────────
          { email: 'ken.banking@student.mouau.edu.ng', fullName: 'Ken Okafor', deptCode: 'BNF', matric: 'MOUAU/BNF/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'mercy.banking@student.mouau.edu.ng', fullName: 'Mercy Eze', deptCode: 'BNF', matric: 'MOUAU/BNF/24/001', levelNum: 200, session: '2025/2026' },
          { email: 'chuka.economics@student.mouau.edu.ng', fullName: 'Chuka Obi', deptCode: 'ECN', matric: 'MOUAU/ECN/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'amaka.economics@student.mouau.edu.ng', fullName: 'Amaka Nwosu', deptCode: 'ECN', matric: 'MOUAU/ECN/24/001', levelNum: 200, session: '2025/2026' },
          { email: 'uche.entrepreneur@student.mouau.edu.ng', fullName: 'Uche Okonkwo', deptCode: 'ENT', matric: 'MOUAU/ENT/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'chioma.entrepreneur@student.mouau.edu.ng', fullName: 'Chioma Eze', deptCode: 'ENT', matric: 'MOUAU/ENT/24/001', levelNum: 200, session: '2025/2026' },
          { email: 'emeka.industrial@student.mouau.edu.ng', fullName: 'Emeka Nwachukwu', deptCode: 'IRP', matric: 'MOUAU/IRP/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'ngozi.industrial@student.mouau.edu.ng', fullName: 'Ngozi Obi', deptCode: 'IRP', matric: 'MOUAU/IRP/24/001', levelNum: 200, session: '2025/2026' },

          // ─── CVM ──────────────────────────────────────────────────────────────
          { email: 'samuel.therio@student.mouau.edu.ng', fullName: 'Samuel Okafor', deptCode: 'THR', matric: 'MOUAU/THR/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'joy.therio@student.mouau.edu.ng', fullName: 'Joy Eze', deptCode: 'THR', matric: 'MOUAU/THR/24/001', levelNum: 200, session: '2025/2026' },
          { email: 'chidi.anatomy@student.mouau.edu.ng', fullName: 'Chidi Nwachukwu', deptCode: 'VAM', matric: 'MOUAU/VAM/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'ada.anatomy@student.mouau.edu.ng', fullName: 'Ada Obi', deptCode: 'VAM', matric: 'MOUAU/VAM/24/001', levelNum: 200, session: '2025/2026' },
          { email: 'ifeanyi.microbio@student.mouau.edu.ng', fullName: 'Ifeanyi Okonkwo', deptCode: 'VMB', matric: 'MOUAU/VMB/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'grace.microbio@student.mouau.edu.ng', fullName: 'Grace Eze', deptCode: 'VMB', matric: 'MOUAU/VMB/24/001', levelNum: 200, session: '2025/2026' },
          { email: 'david.publichealth@student.mouau.edu.ng', fullName: 'David Okafor', deptCode: 'VPH', matric: 'MOUAU/VPH/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'faith.publichealth@student.mouau.edu.ng', fullName: 'Faith Nwachukwu', deptCode: 'VPH', matric: 'MOUAU/VPH/24/001', levelNum: 200, session: '2025/2026' },
          { email: 'ken.surgery@student.mouau.edu.ng', fullName: 'Ken Obi', deptCode: 'VSR', matric: 'MOUAU/VSR/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'mercy.surgery@student.mouau.edu.ng', fullName: 'Mercy Eze', deptCode: 'VSR', matric: 'MOUAU/VSR/24/001', levelNum: 200, session: '2025/2026' },

          // ─── SGS ──────────────────────────────────────────────────────────────
          { email: 'chidi.french@student.mouau.edu.ng', fullName: 'Chidi Okafor', deptCode: 'FRN', matric: 'MOUAU/FRN/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'ada.french@student.mouau.edu.ng', fullName: 'Ada Eze', deptCode: 'FRN', matric: 'MOUAU/FRN/24/001', levelNum: 200, session: '2025/2026' },
          { email: 'emeka.german@student.mouau.edu.ng', fullName: 'Emeka Nwachukwu', deptCode: 'GER', matric: 'MOUAU/GER/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'ngozi.german@student.mouau.edu.ng', fullName: 'Ngozi Obi', deptCode: 'GER', matric: 'MOUAU/GER/24/001', levelNum: 200, session: '2025/2026' },
          { email: 'uche.history@student.mouau.edu.ng', fullName: 'Uche Okonkwo', deptCode: 'HIS', matric: 'MOUAU/HIS/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'chioma.history@student.mouau.edu.ng', fullName: 'Chioma Eze', deptCode: 'HIS', matric: 'MOUAU/HIS/24/001', levelNum: 200, session: '2025/2026' },
          { email: 'tunde.social@student.mouau.edu.ng', fullName: 'Tunde Bello', deptCode: 'SOC', matric: 'MOUAU/SOC/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'funke.social@student.mouau.edu.ng', fullName: 'Funke Adebayo', deptCode: 'SOC', matric: 'MOUAU/SOC/24/001', levelNum: 200, session: '2025/2026' },
          { email: 'kayode.phe@student.mouau.edu.ng', fullName: 'Kayode Ogun', deptCode: 'PHE', matric: 'MOUAU/PHE/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'bisi.phe@student.mouau.edu.ng', fullName: 'Bisi Oladipo', deptCode: 'PHE', matric: 'MOUAU/PHE/24/001', levelNum: 200, session: '2025/2026' },
          { email: 'uchenna.philosophy@student.mouau.edu.ng', fullName: 'Uchenna Obi', deptCode: 'PHL', matric: 'MOUAU/PHL/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'ijeoma.philosophy@student.mouau.edu.ng', fullName: 'Ijeoma Eze', deptCode: 'PHL', matric: 'MOUAU/PHL/24/001', levelNum: 200, session: '2025/2026' },
          { email: 'chidi.peace@student.mouau.edu.ng', fullName: 'Chidi Okonkwo', deptCode: 'PCS', matric: 'MOUAU/PCS/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'ngozi.peace@student.mouau.edu.ng', fullName: 'Ngozi Nwachukwu', deptCode: 'PCS', matric: 'MOUAU/PCS/24/001', levelNum: 200, session: '2025/2026' },

          // ─── COED ──────────────────────────────────────────────────────────────
          { email: 'chidi.aghome@student.mouau.edu.ng', fullName: 'Chidi Okafor', deptCode: 'AHE', matric: 'MOUAU/AHE/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'ada.aghome@student.mouau.edu.ng', fullName: 'Ada Eze', deptCode: 'AHE', matric: 'MOUAU/AHE/24/001', levelNum: 200, session: '2025/2026' },
          { email: 'emeka.bused@student.mouau.edu.ng', fullName: 'Emeka Nwachukwu', deptCode: 'BED', matric: 'MOUAU/BED/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'ngozi.bused@student.mouau.edu.ng', fullName: 'Ngozi Obi', deptCode: 'BED', matric: 'MOUAU/BED/24/001', levelNum: 200, session: '2025/2026' },
          { email: 'uche.econed@student.mouau.edu.ng', fullName: 'Uche Okonkwo', deptCode: 'ECE', matric: 'MOUAU/ECE/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'chioma.econed@student.mouau.edu.ng', fullName: 'Chioma Eze', deptCode: 'ECE', matric: 'MOUAU/ECE/24/001', levelNum: 200, session: '2025/2026' },
          { email: 'david.edmgmt@student.mouau.edu.ng', fullName: 'David Okafor', deptCode: 'EDM', matric: 'MOUAU/EDM/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'faith.edmgmt@student.mouau.edu.ng', fullName: 'Faith Nwachukwu', deptCode: 'EDM', matric: 'MOUAU/EDM/24/001', levelNum: 200, session: '2025/2026' },
          { email: 'ken.ite@student.mouau.edu.ng', fullName: 'Ken Obi', deptCode: 'ITE', matric: 'MOUAU/ITE/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'mercy.ite@student.mouau.edu.ng', fullName: 'Mercy Eze', deptCode: 'ITE', matric: 'MOUAU/ITE/24/001', levelNum: 200, session: '2025/2026' },
          { email: 'chuka.lis@student.mouau.edu.ng', fullName: 'Chuka Okafor', deptCode: 'LIS', matric: 'MOUAU/LIS/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'amaka.lis@student.mouau.edu.ng', fullName: 'Amaka Nwosu', deptCode: 'LIS', matric: 'MOUAU/LIS/24/001', levelNum: 200, session: '2025/2026' },
          { email: 'emeka.gca@student.mouau.edu.ng', fullName: 'Emeka Okonkwo', deptCode: 'GCA', matric: 'MOUAU/GCA/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'ngozi.gca@student.mouau.edu.ng', fullName: 'Ngozi Eze', deptCode: 'GCA', matric: 'MOUAU/GCA/24/001', levelNum: 200, session: '2025/2026' },
          { email: 'uche.ise@student.mouau.edu.ng', fullName: 'Uche Nwachukwu', deptCode: 'ISE', matric: 'MOUAU/ISE/25/111001', levelNum: 100, session: '2025/2026' },
          { email: 'chioma.ise@student.mouau.edu.ng', fullName: 'Chioma Obi', deptCode: 'ISE', matric: 'MOUAU/ISE/24/001', levelNum: 200, session: '2025/2026' },

        ];

      studentData.forEach(s => {
        const dept = getDept(s.deptCode);
        const level = getLevel(s.levelNum);
        const prog = getProgramme(s.deptCode);
        allUsersToCreate.push({
          email: s.email,
          fullName: s.fullName,
          passwordHash: studentPass,
          role: 'student',
          matricNumber: s.matric,
          collegeId: dept.collegeId,
          departmentId: dept.id,
          levelId: level.id,
          programmeId: prog.id,
          session: s.session,
        });
      });

      await prisma.user.createMany({ data: allUsersToCreate, skipDuplicates: true });
      const allUsers = await prisma.user.findMany();
      const students = allUsers.filter(u => u.role === 'student');
      results.push(`✓ ${allUsers.length} users (${students.length} students)`);
      progressBroadcaster.broadcastProgress('users', 'Users created', `${allUsers.length} total`, '👥✅');

      // ── Secondary Role Assignments (HODs who also lecture) ──────────────
      const hodsWhoLecture = allUsers.filter(u => u.role === 'hod' && u.departmentId);
      for (const hod of hodsWhoLecture) {
        await prisma.userRoleAssignment.upsert({
          where: {
            userId_role: {
              userId: hod.id,
              role: 'lecturer',
            }
          },
          create: {
            userId: hod.id,
            role: 'lecturer',
            assignedById: allUsers.find(u => u.role === 'admin')?.id,
          },
          update: {},
        });
      }
      results.push(`✓ ${hodsWhoLecture.length} HODs assigned secondary lecturer role`);

      // ──────────────────────────────────────────────────────────────────────
      // After creating all users, create TeachingAssignments
      // ──────────────────────────────────────────────────────────────────────
      progressBroadcaster.broadcastProgress('assignments', 'Creating teaching assignments...', 'Lecturers to offerings', '👨‍🏫');

      // Get all lecturers
      const assignmentUsers = await prisma.user.findMany();
      const lecturers = assignmentUsers.filter(u => u.role === 'lecturer');
      let assignmentCount = 0;

      // For each lecturer, assign them to offerings in their department
      for (const lecturer of lecturers) {
        if (!lecturer.departmentId) continue;

        // Get offerings for this department
        const deptOfferings = await prisma.courseOffering.findMany({
          where: {
            course: {
              departmentId: lecturer.departmentId,
            },
          },
          take: 5, // Assign each lecturer to up to 5 offerings
        });

        for (const offering of deptOfferings) {
          await prisma.teachingAssignment.upsert({
            where: {
              offeringId_lecturerId: {
                offeringId: offering.id,
                lecturerId: lecturer.id,
              }
            },
            create: {
              offeringId: offering.id,
              lecturerId: lecturer.id,
              assignedById: allUsers.find(u => u.role === 'admin')?.id,
            },
            update: {},
          });
          assignmentCount++;
        }
      }

      results.push(`✓ ${assignmentCount} teaching assignments created`);
      progressBroadcaster.broadcastProgress('assignments', 'Assignments created', `${assignmentCount}`, '👨‍🏫✅');

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
        prisma.teachingAssignment.deleteMany(),
        prisma.curriculum.deleteMany(),
        prisma.courseOfferingDepartment.deleteMany(),
        prisma.courseOffering.deleteMany(),
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
      progressBroadcaster.broadcastComplete('Database reset completed!');
      return { success: true, results: ['✓ All data cleared'] };
    } catch (err) {
      console.error('[Reset] Failed:', err);
      progressBroadcaster.broadcastError(err instanceof Error ? err.message : 'Reset failed');
      return fail(500, { error: err instanceof Error ? err.message : 'Reset failed' });
    }
  },
};