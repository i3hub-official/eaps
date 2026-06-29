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
      // 6. COURSES — 100L + 200L only
      // ══════════════════════════════════════════════════════════════════════
      progressBroadcaster.broadcastProgress('courses', 'Creating courses...', 'All departments', '📚');

      const allCourses: {
        code: string; title: string; departmentId: string;
        creditUnits: number; level: number; semester: number;
      }[] = [];

      function addC(
        deptCode: string,
        code: string, title: string,
        level: number, semester: number, credits: number
      ) {
        allCourses.push({
          code, title,
          departmentId: getDept(deptCode).id,
          creditUnits: credits,
          level, semester,
        });
      }

      // ─── SGS / GST Universal courses ──────────────────────────────────────
      addC('ENG', 'GST111', 'Communication in English I', 100, 1, 2);
      addC('HIS', 'GST112', 'Nigerian History and Culture', 100, 1, 2);
      addC('ENG', 'GST121', 'Communication in English II', 100, 2, 2);
      addC('PHL', 'GST211', 'Logic, Philosophy and Human Existence', 200, 1, 2);
      addC('PCS', 'GST212', 'Peace Studies and Conflict Resolution', 200, 1, 2);
      addC('ENG', 'GST221', 'Technical Report Writing', 200, 2, 2);

      // ─── COLPAS — Computer Science (CSC) ──────────────────────────────────
      // 100L S1
      addC('CSC', 'CSC111', 'Introduction to Computer Science', 100, 1, 3);
      addC('CSC', 'CSC112', 'Computer Hardware Fundamentals', 100, 1, 2);
      addC('CSC', 'CSC113', 'Introduction to Programming I', 100, 1, 3);
      addC('CSC', 'CSC114', 'Discrete Mathematics I', 100, 1, 3);
      addC('CSC', 'CSC115', 'Computer Applications', 100, 1, 2);
      addC('MTH', 'CSC116', 'Elementary Mathematics I', 100, 1, 3);
      addC('PHY', 'CSC117', 'General Physics for CS I', 100, 1, 2);
      addC('CHM', 'CSC118', 'General Chemistry for CS I', 100, 1, 2);
      // 100L S2
      addC('CSC', 'CSC121', 'Introduction to Programming II', 100, 2, 3);
      addC('CSC', 'CSC122', 'Computer Organization I', 100, 2, 2);
      addC('CSC', 'CSC123', 'Discrete Mathematics II', 100, 2, 3);
      addC('CSC', 'CSC124', 'Data Representation', 100, 2, 2);
      addC('CSC', 'CSC125', 'Web Fundamentals', 100, 2, 2);
      addC('MTH', 'CSC126', 'Elementary Mathematics II', 100, 2, 3);
      addC('PHY', 'CSC127', 'General Physics for CS II', 100, 2, 2);
      addC('CSC', 'CSC128', 'Intro to Database Concepts', 100, 2, 2);
      // 200L S1
      addC('CSC', 'CSC211', 'Object-Oriented Programming I', 200, 1, 3);
      addC('CSC', 'CSC212', 'Data Structures I', 200, 1, 3);
      addC('CSC', 'CSC213', 'Computer Organization II', 200, 1, 2);
      addC('CSC', 'CSC214', 'Operating Systems I', 200, 1, 3);
      addC('CSC', 'CSC215', 'Discrete Structures', 200, 1, 3);
      addC('CSC', 'CSC216', 'Systems Analysis and Design', 200, 1, 2);
      addC('MTH', 'CSC217', 'Calculus for CS', 200, 1, 2);
      addC('CSC', 'CSC218', 'Human-Computer Interaction', 200, 1, 2);
      // 200L S2
      addC('CSC', 'CSC221', 'Object-Oriented Programming II', 200, 2, 3);
      addC('CSC', 'CSC222', 'Data Structures II', 200, 2, 3);
      addC('CSC', 'CSC223', 'Database Management Systems I', 200, 2, 3);
      addC('CSC', 'CSC224', 'Operating Systems II', 200, 2, 2);
      addC('CSC', 'CSC225', 'Computer Networks I', 200, 2, 3);
      addC('CSC', 'CSC226', 'Assembly Language Programming', 200, 2, 2);
      addC('CSC', 'CSC227', 'Software Engineering I', 200, 2, 3);
      addC('CSC', 'CSC228', 'Web Technologies', 200, 2, 2);

      // ─── COLPAS — Physics (PHY) ────────────────────────────────────────────
      // 100L S1
      addC('PHY', 'PHY111', 'General Physics I (Mechanics)', 100, 1, 3);
      addC('PHY', 'PHY112', 'General Physics II (Waves)', 100, 1, 3);
      addC('PHY', 'PHY113', 'Physics Practical I', 100, 1, 1);
      addC('PHY', 'PHY114', 'Mathematical Methods I', 100, 1, 3);
      addC('MTH', 'PHY115', 'Elementary Calculus for Physics', 100, 1, 3);
      addC('CHM', 'PHY116', 'General Chemistry I', 100, 1, 2);
      addC('PHY', 'PHY117', 'Introduction to Modern Physics', 100, 1, 2);
      addC('PHY', 'PHY118', 'Electronics I', 100, 1, 2);
      // 100L S2
      addC('PHY', 'PHY121', 'General Physics III (Thermodynamics)', 100, 2, 3);
      addC('PHY', 'PHY122', 'General Physics IV (Optics)', 100, 2, 3);
      addC('PHY', 'PHY123', 'Physics Practical II', 100, 2, 1);
      addC('PHY', 'PHY124', 'Mathematical Methods II', 100, 2, 3);
      addC('MTH', 'PHY125', 'Elementary Calculus II', 100, 2, 3);
      addC('CHM', 'PHY126', 'General Chemistry II', 100, 2, 2);
      addC('PHY', 'PHY127', 'Electronics II', 100, 2, 2);
      addC('PHY', 'PHY128', 'Energy Physics', 100, 2, 2);
      // 200L S1
      addC('PHY', 'PHY211', 'Classical Mechanics', 200, 1, 3);
      addC('PHY', 'PHY212', 'Waves and Optics', 200, 1, 3);
      addC('PHY', 'PHY213', 'Heat and Thermodynamics', 200, 1, 3);
      addC('PHY', 'PHY214', 'Mathematical Physics I', 200, 1, 3);
      addC('PHY', 'PHY215', 'Electronics III', 200, 1, 2);
      addC('PHY', 'PHY216', 'Physics Practical III', 200, 1, 1);
      addC('PHY', 'PHY217', 'Electrostatics', 200, 1, 3);
      addC('PHY', 'PHY218', 'Computational Physics I', 200, 1, 2);
      // 200L S2
      addC('PHY', 'PHY221', 'Electromagnetism I', 200, 2, 3);
      addC('PHY', 'PHY222', 'Quantum Mechanics I', 200, 2, 3);
      addC('PHY', 'PHY223', 'Mathematical Physics II', 200, 2, 3);
      addC('PHY', 'PHY224', 'Solid State Physics I', 200, 2, 3);
      addC('PHY', 'PHY225', 'Physics Practical IV', 200, 2, 1);
      addC('PHY', 'PHY226', 'Computational Physics II', 200, 2, 2);
      addC('PHY', 'PHY227', 'Statistical Mechanics I', 200, 2, 2);
      addC('PHY', 'PHY228', 'Nuclear Physics I', 200, 2, 2);

      // ─── COLPAS — Mathematics (MTH) ───────────────────────────────────────
      // 100L S1
      addC('MTH', 'MTH111', 'Calculus I', 100, 1, 3);
      addC('MTH', 'MTH112', 'Algebra and Number Theory I', 100, 1, 3);
      addC('MTH', 'MTH113', 'Trigonometry', 100, 1, 3);
      addC('MTH', 'MTH114', 'Sets, Logic and Algebra', 100, 1, 3);
      addC('MTH', 'MTH115', 'Elementary Statistics', 100, 1, 2);
      addC('PHY', 'MTH116', 'Mechanics for Mathematicians', 100, 1, 2);
      addC('CHM', 'MTH117', 'Chemistry for Physical Sciences', 100, 1, 2);
      addC('MTH', 'MTH118', 'Intro to Linear Algebra', 100, 1, 2);
      // 100L S2
      addC('MTH', 'MTH121', 'Calculus II', 100, 2, 3);
      addC('MTH', 'MTH122', 'Algebra and Number Theory II', 100, 2, 3);
      addC('MTH', 'MTH123', 'Vector Calculus', 100, 2, 3);
      addC('MTH', 'MTH124', 'Coordinate Geometry', 100, 2, 3);
      addC('MTH', 'MTH125', 'Intro to Real Analysis', 100, 2, 3);
      addC('MTH', 'MTH126', 'Numerical Methods I', 100, 2, 2);
      addC('MTH', 'MTH127', 'Probability Theory I', 100, 2, 2);
      addC('MTH', 'MTH128', 'Abstract Algebra I', 100, 2, 2);
      // 200L S1
      addC('MTH', 'MTH211', 'Calculus III', 200, 1, 3);
      addC('MTH', 'MTH212', 'Linear Algebra I', 200, 1, 3);
      addC('MTH', 'MTH213', 'Real Analysis I', 200, 1, 3);
      addC('MTH', 'MTH214', 'Differential Equations I', 200, 1, 3);
      addC('MTH', 'MTH215', 'Probability Theory II', 200, 1, 3);
      addC('MTH', 'MTH216', 'Numerical Methods II', 200, 1, 2);
      addC('MTH', 'MTH217', 'Abstract Algebra II', 200, 1, 2);
      addC('MTH', 'MTH218', 'Mathematical Logic', 200, 1, 2);
      // 200L S2
      addC('MTH', 'MTH221', 'Calculus IV (Complex Variables)', 200, 2, 3);
      addC('MTH', 'MTH222', 'Linear Algebra II', 200, 2, 3);
      addC('MTH', 'MTH223', 'Real Analysis II', 200, 2, 3);
      addC('MTH', 'MTH224', 'Differential Equations II', 200, 2, 3);
      addC('MTH', 'MTH225', 'Mathematical Methods', 200, 2, 3);
      addC('MTH', 'MTH226', 'Numerical Methods III', 200, 2, 2);
      addC('MTH', 'MTH227', 'Topology I', 200, 2, 2);
      addC('MTH', 'MTH228', 'Operations Research I', 200, 2, 2);

      // ─── COLPAS — Chemistry (CHM) ──────────────────────────────────────────
      // 100L S1
      addC('CHM', 'CHM111', 'General Chemistry I', 100, 1, 3);
      addC('CHM', 'CHM112', 'Inorganic Chemistry I', 100, 1, 3);
      addC('CHM', 'CHM113', 'Practical Chemistry I', 100, 1, 1);
      addC('CHM', 'CHM114', 'Mathematical Methods for Chemistry', 100, 1, 3);
      addC('CHM', 'CHM115', 'Atomic Structure and Bonding', 100, 1, 3);
      addC('PHY', 'CHM116', 'Physics for Chemists I', 100, 1, 2);
      addC('MTH', 'CHM117', 'Calculus for Chemists', 100, 1, 2);
      addC('CHM', 'CHM118', 'Intro to Organic Chemistry', 100, 1, 2);
      // 100L S2
      addC('CHM', 'CHM121', 'General Chemistry II', 100, 2, 3);
      addC('CHM', 'CHM122', 'Organic Chemistry I', 100, 2, 3);
      addC('CHM', 'CHM123', 'Practical Chemistry II', 100, 2, 1);
      addC('CHM', 'CHM124', 'Physical Chemistry I', 100, 2, 3);
      addC('CHM', 'CHM125', 'Analytical Chemistry I', 100, 2, 3);
      addC('PHY', 'CHM126', 'Physics for Chemists II', 100, 2, 2);
      addC('CHM', 'CHM127', 'Environmental Chemistry I', 100, 2, 2);
      addC('CHM', 'CHM128', 'Chemical Thermodynamics I', 100, 2, 2);
      // 200L S1
      addC('CHM', 'CHM211', 'Organic Chemistry II', 200, 1, 3);
      addC('CHM', 'CHM212', 'Inorganic Chemistry II', 200, 1, 3);
      addC('CHM', 'CHM213', 'Physical Chemistry II', 200, 1, 3);
      addC('CHM', 'CHM214', 'Analytical Chemistry II', 200, 1, 3);
      addC('CHM', 'CHM215', 'Practical Chemistry III', 200, 1, 1);
      addC('CHM', 'CHM216', 'Chemical Thermodynamics II', 200, 1, 3);
      addC('CHM', 'CHM217', 'Spectroscopy I', 200, 1, 2);
      addC('CHM', 'CHM218', 'Industrial Chemistry I', 200, 1, 2);
      // 200L S2
      addC('CHM', 'CHM221', 'Organic Chemistry III', 200, 2, 3);
      addC('CHM', 'CHM222', 'Inorganic Chemistry III', 200, 2, 3);
      addC('CHM', 'CHM223', 'Physical Chemistry III', 200, 2, 3);
      addC('CHM', 'CHM224', 'Electrochemistry', 200, 2, 3);
      addC('CHM', 'CHM225', 'Practical Chemistry IV', 200, 2, 1);
      addC('CHM', 'CHM226', 'Polymer Chemistry', 200, 2, 2);
      addC('CHM', 'CHM227', 'Nuclear Chemistry', 200, 2, 2);
      addC('CHM', 'CHM228', 'Chemical Kinetics', 200, 2, 2);

      // ─── COLPAS — Statistics (STA) ─────────────────────────────────────────
      // 100L S1
      addC('STA', 'STA111', 'Introduction to Statistics I', 100, 1, 3);
      addC('STA', 'STA112', 'Probability Theory I', 100, 1, 3);
      addC('STA', 'STA113', 'Mathematical Methods for Statistics', 100, 1, 3);
      addC('MTH', 'STA114', 'Calculus for Statistics', 100, 1, 3);
      addC('STA', 'STA115', 'Data Collection Methods', 100, 1, 2);
      addC('STA', 'STA116', 'Descriptive Statistics', 100, 1, 2);
      addC('STA', 'STA117', 'Statistical Computing I', 100, 1, 2);
      addC('STA', 'STA118', 'Survey Methods I', 100, 1, 2);
      // 100L S2
      addC('STA', 'STA121', 'Introduction to Statistics II', 100, 2, 3);
      addC('STA', 'STA122', 'Probability Theory II', 100, 2, 3);
      addC('STA', 'STA123', 'Linear Algebra for Statistics', 100, 2, 3);
      addC('STA', 'STA124', 'Survey Methods II', 100, 2, 3);
      addC('STA', 'STA125', 'Statistical Computing II', 100, 2, 2);
      addC('MTH', 'STA126', 'Calculus II for Statistics', 100, 2, 2);
      addC('STA', 'STA127', 'Sampling Theory I', 100, 2, 2);
      addC('STA', 'STA128', 'Time Series I', 100, 2, 2);
      // 200L S1
      addC('STA', 'STA211', 'Statistical Inference I', 200, 1, 3);
      addC('STA', 'STA212', 'Probability Distributions', 200, 1, 3);
      addC('STA', 'STA213', 'Regression Analysis I', 200, 1, 3);
      addC('STA', 'STA214', 'Sampling Theory II', 200, 1, 3);
      addC('STA', 'STA215', 'Statistical Computing III', 200, 1, 2);
      addC('STA', 'STA216', 'Experimental Design I', 200, 1, 2);
      addC('STA', 'STA217', 'Demographic Methods', 200, 1, 2);
      addC('STA', 'STA218', 'Econometrics I', 200, 1, 2);
      // 200L S2
      addC('STA', 'STA221', 'Statistical Inference II', 200, 2, 3);
      addC('STA', 'STA222', 'Regression Analysis II', 200, 2, 3);
      addC('STA', 'STA223', 'Time Series II', 200, 2, 3);
      addC('STA', 'STA224', 'Experimental Design II', 200, 2, 3);
      addC('STA', 'STA225', 'Multivariate Analysis I', 200, 2, 2);
      addC('STA', 'STA226', 'Econometrics II', 200, 2, 2);
      addC('STA', 'STA227', 'Bayesian Statistics I', 200, 2, 2);
      addC('STA', 'STA228', 'Operations Research I', 200, 2, 2);

      // ─── COLPAS — Geology (GLG) ────────────────────────────────────────────
      // 100L S1
      addC('GLG', 'GLG111', 'Introduction to Geology', 100, 1, 3);
      addC('GLG', 'GLG112', 'Physical Geology', 100, 1, 3);
      addC('GLG', 'GLG113', 'Mineralogy I', 100, 1, 3);
      addC('CHM', 'GLG114', 'Chemistry for Geologists', 100, 1, 2);
      addC('PHY', 'GLG115', 'Physics for Geologists', 100, 1, 2);
      addC('MTH', 'GLG116', 'Mathematics for Geologists', 100, 1, 2);
      addC('GLG', 'GLG117', 'Map Reading and Interpretation', 100, 1, 2);
      addC('GLG', 'GLG118', 'Crystallography', 100, 1, 2);
      // 100L S2
      addC('GLG', 'GLG121', 'Historical Geology', 100, 2, 3);
      addC('GLG', 'GLG122', 'Mineralogy II', 100, 2, 3);
      addC('GLG', 'GLG123', 'Petrology I', 100, 2, 3);
      addC('GLG', 'GLG124', 'Stratigraphy I', 100, 2, 3);
      addC('GLG', 'GLG125', 'Geological Field Methods I', 100, 2, 2);
      addC('GLG', 'GLG126', 'Introduction to Geophysics', 100, 2, 2);
      addC('GLG', 'GLG127', 'Sedimentology I', 100, 2, 2);
      addC('GLG', 'GLG128', 'Geochemistry I', 100, 2, 2);
      // 200L S1
      addC('GLG', 'GLG211', 'Structural Geology I', 200, 1, 3);
      addC('GLG', 'GLG212', 'Petrology II', 200, 1, 3);
      addC('GLG', 'GLG213', 'Stratigraphy II', 200, 1, 3);
      addC('GLG', 'GLG214', 'Geophysics I', 200, 1, 3);
      addC('GLG', 'GLG215', 'Geochemistry II', 200, 1, 2);
      addC('GLG', 'GLG216', 'Hydrogeology I', 200, 1, 2);
      addC('GLG', 'GLG217', 'Sedimentology II', 200, 1, 2);
      addC('GLG', 'GLG218', 'Palaeontology I', 200, 1, 2);
      // 200L S2
      addC('GLG', 'GLG221', 'Structural Geology II', 200, 2, 3);
      addC('GLG', 'GLG222', 'Economic Geology I', 200, 2, 3);
      addC('GLG', 'GLG223', 'Geophysics II', 200, 2, 3);
      addC('GLG', 'GLG224', 'Geomorphology', 200, 2, 3);
      addC('GLG', 'GLG225', 'Hydrogeology II', 200, 2, 2);
      addC('GLG', 'GLG226', 'Palaeontology II', 200, 2, 2);
      addC('GLG', 'GLG227', 'Petroleum Geology I', 200, 2, 2);
      addC('GLG', 'GLG228', 'Engineering Geology I', 200, 2, 2);

      // ─── CEET — Computer Engineering (CPE) ────────────────────────────────
      // 100L S1
      addC('CPE', 'CPE111', 'Introduction to Computer Engineering', 100, 1, 3);
      addC('CPE', 'CPE112', 'Engineering Mathematics I', 100, 1, 3);
      addC('CPE', 'CPE113', 'Fundamentals of Programming', 100, 1, 3);
      addC('CPE', 'CPE114', 'Engineering Physics I', 100, 1, 2);
      addC('CPE', 'CPE115', 'Engineering Chemistry', 100, 1, 2);
      addC('CPE', 'CPE116', 'Technical Drawing I', 100, 1, 2);
      addC('CPE', 'CPE117', 'Digital Fundamentals', 100, 1, 2);
      addC('CPE', 'CPE118', 'Introduction to Electronics', 100, 1, 2);
      // 100L S2
      addC('CPE', 'CPE121', 'Engineering Mathematics II', 100, 2, 3);
      addC('CPE', 'CPE122', 'Digital Logic Design', 100, 2, 3);
      addC('CPE', 'CPE123', 'Engineering Physics II', 100, 2, 2);
      addC('CPE', 'CPE124', 'Computer Programming I', 100, 2, 3);
      addC('CPE', 'CPE125', 'Electronic Devices I', 100, 2, 2);
      addC('CPE', 'CPE126', 'Circuit Theory I', 100, 2, 2);
      addC('CPE', 'CPE127', 'Intro to Signals and Systems', 100, 2, 2);
      addC('CPE', 'CPE128', 'Logic Design II', 100, 2, 2);
      // 200L S1
      addC('CPE', 'CPE211', 'Data Structures', 200, 1, 3);
      addC('CPE', 'CPE212', 'Computer Architecture I', 200, 1, 3);
      addC('CPE', 'CPE213', 'Circuit Theory II', 200, 1, 3);
      addC('CPE', 'CPE214', 'Electronic Devices II', 200, 1, 2);
      addC('CPE', 'CPE215', 'Signals and Systems', 200, 1, 3);
      addC('CPE', 'CPE216', 'Engineering Mathematics III', 200, 1, 3);
      addC('CPE', 'CPE217', 'Microprocessors I', 200, 1, 2);
      addC('CPE', 'CPE218', 'Digital Systems Design', 200, 1, 2);
      // 200L S2
      addC('CPE', 'CPE221', 'Computer Architecture II', 200, 2, 3);
      addC('CPE', 'CPE222', 'Operating Systems', 200, 2, 3);
      addC('CPE', 'CPE223', 'Microprocessors II', 200, 2, 3);
      addC('CPE', 'CPE224', 'VLSI Design I', 200, 2, 3);
      addC('CPE', 'CPE225', 'Computer Networks I', 200, 2, 2);
      addC('CPE', 'CPE226', 'Embedded Systems I', 200, 2, 2);
      addC('CPE', 'CPE227', 'Control Systems I', 200, 2, 2);
      addC('CPE', 'CPE228', 'Software Engineering for CE', 200, 2, 2);

      // ─── CEET — Electrical and Electronics Engineering (EEE) ──────────────
      // 100L S1
      addC('EEE', 'EEE111', 'Intro to Electrical Engineering', 100, 1, 3);
      addC('EEE', 'EEE112', 'Engineering Mathematics I', 100, 1, 3);
      addC('EEE', 'EEE113', 'Engineering Physics I', 100, 1, 2);
      addC('EEE', 'EEE114', 'Engineering Chemistry', 100, 1, 2);
      addC('EEE', 'EEE115', 'Technical Drawing I', 100, 1, 2);
      addC('EEE', 'EEE116', 'Electric Circuits I', 100, 1, 2);
      addC('EEE', 'EEE117', 'Digital Electronics I', 100, 1, 2);
      addC('EEE', 'EEE118', 'Electronic Devices I', 100, 1, 2);
      // 100L S2
      addC('EEE', 'EEE121', 'Engineering Mathematics II', 100, 2, 3);
      addC('EEE', 'EEE122', 'Electric Circuits II', 100, 2, 3);
      addC('EEE', 'EEE123', 'Engineering Physics II', 100, 2, 2);
      addC('EEE', 'EEE124', 'Electronic Devices II', 100, 2, 3);
      addC('EEE', 'EEE125', 'Digital Electronics II', 100, 2, 2);
      addC('EEE', 'EEE126', 'Signals and Systems I', 100, 2, 2);
      addC('EEE', 'EEE127', 'Electromagnetic Fields I', 100, 2, 2);
      addC('EEE', 'EEE128', 'Energy Systems I', 100, 2, 2);
      // 200L S1
      addC('EEE', 'EEE211', 'Circuit Theory I', 200, 1, 3);
      addC('EEE', 'EEE212', 'Electronics I', 200, 1, 3);
      addC('EEE', 'EEE213', 'Electromagnetic Fields II', 200, 1, 3);
      addC('EEE', 'EEE214', 'Signals and Systems II', 200, 1, 3);
      addC('EEE', 'EEE215', 'Engineering Mathematics III', 200, 1, 3);
      addC('EEE', 'EEE216', 'Electrical Machines I', 200, 1, 2);
      addC('EEE', 'EEE217', 'Power Systems I', 200, 1, 2);
      addC('EEE', 'EEE218', 'Control Systems I', 200, 1, 2);
      // 200L S2
      addC('EEE', 'EEE221', 'Circuit Theory II', 200, 2, 3);
      addC('EEE', 'EEE222', 'Electronics II', 200, 2, 3);
      addC('EEE', 'EEE223', 'Electrical Machines II', 200, 2, 3);
      addC('EEE', 'EEE224', 'Power Systems II', 200, 2, 3);
      addC('EEE', 'EEE225', 'Control Systems II', 200, 2, 2);
      addC('EEE', 'EEE226', 'Microprocessors', 200, 2, 2);
      addC('EEE', 'EEE227', 'Communication Systems I', 200, 2, 2);
      addC('EEE', 'EEE228', 'Instrumentation I', 200, 2, 2);

      // ─── CEET — Civil Engineering (CVE) ────────────────────────────────────
      // 100L S1
      addC('CVE', 'CVE111', 'Intro to Civil Engineering', 100, 1, 3);
      addC('CVE', 'CVE112', 'Engineering Mathematics I', 100, 1, 3);
      addC('CVE', 'CVE113', 'Engineering Physics', 100, 1, 2);
      addC('CVE', 'CVE114', 'Engineering Chemistry', 100, 1, 2);
      addC('CVE', 'CVE115', 'Technical Drawing and CAD I', 100, 1, 3);
      addC('CVE', 'CVE116', 'Engineering Mechanics I', 100, 1, 2);
      addC('CVE', 'CVE117', 'Surveying I', 100, 1, 2);
      addC('CVE', 'CVE118', 'Engineering Materials I', 100, 1, 2);
      // 100L S2
      addC('CVE', 'CVE121', 'Engineering Mathematics II', 100, 2, 3);
      addC('CVE', 'CVE122', 'Engineering Mechanics II', 100, 2, 3);
      addC('CVE', 'CVE123', 'Technical Drawing and CAD II', 100, 2, 2);
      addC('CVE', 'CVE124', 'Surveying II', 100, 2, 3);
      addC('CVE', 'CVE125', 'Engineering Materials II', 100, 2, 2);
      addC('CVE', 'CVE126', 'Fluid Mechanics I', 100, 2, 2);
      addC('CVE', 'CVE127', 'Structural Analysis I', 100, 2, 2);
      addC('CVE', 'CVE128', 'Soil Mechanics I', 100, 2, 2);
      // 200L S1
      addC('CVE', 'CVE211', 'Structural Analysis II', 200, 1, 3);
      addC('CVE', 'CVE212', 'Fluid Mechanics II', 200, 1, 3);
      addC('CVE', 'CVE213', 'Soil Mechanics II', 200, 1, 3);
      addC('CVE', 'CVE214', 'Highway Engineering I', 200, 1, 3);
      addC('CVE', 'CVE215', 'Engineering Mathematics III', 200, 1, 2);
      addC('CVE', 'CVE216', 'Hydrology I', 200, 1, 2);
      addC('CVE', 'CVE217', 'Concrete Technology I', 200, 1, 2);
      addC('CVE', 'CVE218', 'Construction Management I', 200, 1, 2);
      // 200L S2
      addC('CVE', 'CVE221', 'Structural Analysis III', 200, 2, 3);
      addC('CVE', 'CVE222', 'Foundation Engineering', 200, 2, 3);
      addC('CVE', 'CVE223', 'Water Resources Engineering I', 200, 2, 3);
      addC('CVE', 'CVE224', 'Highway Engineering II', 200, 2, 3);
      addC('CVE', 'CVE225', 'Concrete Technology II', 200, 2, 2);
      addC('CVE', 'CVE226', 'Hydrology II', 200, 2, 2);
      addC('CVE', 'CVE227', 'Environmental Engineering I', 200, 2, 2);
      addC('CVE', 'CVE228', 'Construction Management II', 200, 2, 2);

      // ─── COLMAS — Accounting (ACC) ─────────────────────────────────────────
      // 100L S1
      addC('ACC', 'ACC111', 'Principles of Accounting I', 100, 1, 3);
      addC('ACC', 'ACC112', 'Business Mathematics I', 100, 1, 3);
      addC('ACC', 'ACC113', 'Intro to Economics', 100, 1, 3);
      addC('ACC', 'ACC114', 'Business Communication I', 100, 1, 2);
      addC('ACC', 'ACC115', 'Intro to Management', 100, 1, 2);
      addC('ACC', 'ACC116', 'Commercial Law I', 100, 1, 2);
      addC('ACC', 'ACC117', 'Computer Applications for Accounting', 100, 1, 2);
      addC('ACC', 'ACC118', 'Intro to Finance', 100, 1, 2);
      // 100L S2
      addC('ACC', 'ACC121', 'Principles of Accounting II', 100, 2, 3);
      addC('ACC', 'ACC122', 'Business Mathematics II', 100, 2, 3);
      addC('ACC', 'ACC123', 'Microeconomics', 100, 2, 3);
      addC('ACC', 'ACC124', 'Business Communication II', 100, 2, 2);
      addC('ACC', 'ACC125', 'Business Statistics I', 100, 2, 2);
      addC('ACC', 'ACC126', 'Commercial Law II', 100, 2, 2);
      addC('ACC', 'ACC127', 'Financial Accounting I', 100, 2, 3);
      addC('ACC', 'ACC128', 'Taxation Basics', 100, 2, 2);
      // 200L S1
      addC('ACC', 'ACC211', 'Financial Accounting II', 200, 1, 3);
      addC('ACC', 'ACC212', 'Management Accounting I', 200, 1, 3);
      addC('ACC', 'ACC213', 'Cost Accounting I', 200, 1, 3);
      addC('ACC', 'ACC214', 'Macroeconomics', 200, 1, 3);
      addC('ACC', 'ACC215', 'Business Law', 200, 1, 2);
      addC('ACC', 'ACC216', 'Financial Management I', 200, 1, 2);
      addC('ACC', 'ACC217', 'Auditing I', 200, 1, 2);
      addC('ACC', 'ACC218', 'Taxation I', 200, 1, 2);
      // 200L S2
      addC('ACC', 'ACC221', 'Financial Accounting III', 200, 2, 3);
      addC('ACC', 'ACC222', 'Management Accounting II', 200, 2, 3);
      addC('ACC', 'ACC223', 'Cost Accounting II', 200, 2, 3);
      addC('ACC', 'ACC224', 'Financial Management II', 200, 2, 3);
      addC('ACC', 'ACC225', 'Taxation II', 200, 2, 2);
      addC('ACC', 'ACC226', 'Auditing II', 200, 2, 2);
      addC('ACC', 'ACC227', 'Company Law', 200, 2, 2);
      addC('ACC', 'ACC228', 'Accounting Information Systems', 200, 2, 2);

      // ─── COLMAS — Business Administration (BUS) ────────────────────────────
      // 100L S1
      addC('BUS', 'BUS111', 'Introduction to Business', 100, 1, 3);
      addC('BUS', 'BUS112', 'Principles of Management I', 100, 1, 3);
      addC('BUS', 'BUS113', 'Business Mathematics I', 100, 1, 3);
      addC('BUS', 'BUS114', 'Business Communication I', 100, 1, 2);
      addC('BUS', 'BUS115', 'Micro Economics', 100, 1, 2);
      addC('BUS', 'BUS116', 'Computer Applications for Business', 100, 1, 2);
      addC('BUS', 'BUS117', 'Intro to Accounting', 100, 1, 2);
      addC('BUS', 'BUS118', 'Business Statistics I', 100, 1, 2);
      // 100L S2
      addC('BUS', 'BUS121', 'Principles of Management II', 100, 2, 3);
      addC('BUS', 'BUS122', 'Macro Economics', 100, 2, 3);
      addC('BUS', 'BUS123', 'Business Mathematics II', 100, 2, 3);
      addC('BUS', 'BUS124', 'Business Communication II', 100, 2, 2);
      addC('BUS', 'BUS125', 'Marketing Principles', 100, 2, 2);
      addC('BUS', 'BUS126', 'Business Law I', 100, 2, 2);
      addC('BUS', 'BUS127', 'Financial Accounting Basics', 100, 2, 2);
      addC('BUS', 'BUS128', 'Human Resource Basics', 100, 2, 2);
      // 200L S1
      addC('BUS', 'BUS211', 'Organisational Behaviour I', 200, 1, 3);
      addC('BUS', 'BUS212', 'Financial Management I', 200, 1, 3);
      addC('BUS', 'BUS213', 'Marketing Management I', 200, 1, 3);
      addC('BUS', 'BUS214', 'Operations Management I', 200, 1, 3);
      addC('BUS', 'BUS215', 'Business Research Methods I', 200, 1, 2);
      addC('BUS', 'BUS216', 'Management Information Systems', 200, 1, 2);
      addC('BUS', 'BUS217', 'Entrepreneurship I', 200, 1, 2);
      addC('BUS', 'BUS218', 'Corporate Strategy I', 200, 1, 2);
      // 200L S2
      addC('BUS', 'BUS221', 'Organisational Behaviour II', 200, 2, 3);
      addC('BUS', 'BUS222', 'Financial Management II', 200, 2, 3);
      addC('BUS', 'BUS223', 'Marketing Management II', 200, 2, 3);
      addC('BUS', 'BUS224', 'Operations Management II', 200, 2, 3);
      addC('BUS', 'BUS225', 'Business Research Methods II', 200, 2, 2);
      addC('BUS', 'BUS226', 'Entrepreneurship II', 200, 2, 2);
      addC('BUS', 'BUS227', 'Corporate Strategy II', 200, 2, 2);
      addC('BUS', 'BUS228', 'International Business I', 200, 2, 2);

      // ─── COLMAS — Human Resource Management (HRM) ─────────────────────────
      // 100L S1
      addC('HRM', 'HRM111', 'Intro to Human Resource Management', 100, 1, 3);
      addC('HRM', 'HRM112', 'Organisational Behaviour Basics', 100, 1, 3);
      addC('HRM', 'HRM113', 'Business Mathematics', 100, 1, 2);
      addC('HRM', 'HRM114', 'Business Communication', 100, 1, 2);
      addC('HRM', 'HRM115', 'Micro Economics', 100, 1, 2);
      addC('HRM', 'HRM116', 'Intro to Accounting', 100, 1, 2);
      addC('HRM', 'HRM117', 'Computer Applications for HRM', 100, 1, 2);
      addC('HRM', 'HRM118', 'Nigerian Labour Law Basics', 100, 1, 2);
      // 100L S2
      addC('HRM', 'HRM121', 'Principles of Management', 100, 2, 3);
      addC('HRM', 'HRM122', 'Macro Economics', 100, 2, 3);
      addC('HRM', 'HRM123', 'Organisational Theory', 100, 2, 3);
      addC('HRM', 'HRM124', 'Business Law', 100, 2, 2);
      addC('HRM', 'HRM125', 'Recruitment and Selection Basics', 100, 2, 2);
      addC('HRM', 'HRM126', 'Training and Development Basics', 100, 2, 2);
      addC('HRM', 'HRM127', 'Performance Management Basics', 100, 2, 2);
      addC('HRM', 'HRM128', 'Industrial Relations Basics', 100, 2, 2);
      // 200L S1
      addC('HRM', 'HRM211', 'Principles of Management II', 200, 1, 3);
      addC('HRM', 'HRM212', 'Recruitment and Selection', 200, 1, 3);
      addC('HRM', 'HRM213', 'Training and Development', 200, 1, 3);
      addC('HRM', 'HRM214', 'Employment Law I', 200, 1, 3);
      addC('HRM', 'HRM215', 'Compensation and Benefits I', 200, 1, 2);
      addC('HRM', 'HRM216', 'Performance Management I', 200, 1, 2);
      addC('HRM', 'HRM217', 'HR Information Systems', 200, 1, 2);
      addC('HRM', 'HRM218', 'HR Analytics I', 200, 1, 2);
      // 200L S2
      addC('HRM', 'HRM221', 'Organisational Behaviour', 200, 2, 3);
      addC('HRM', 'HRM222', 'Compensation and Benefits II', 200, 2, 3);
      addC('HRM', 'HRM223', 'Employment Law II', 200, 2, 3);
      addC('HRM', 'HRM224', 'Performance Management II', 200, 2, 3);
      addC('HRM', 'HRM225', 'Labour Relations I', 200, 2, 2);
      addC('HRM', 'HRM226', 'Organisational Development I', 200, 2, 2);
      addC('HRM', 'HRM227', 'HR Analytics II', 200, 2, 2);
      addC('HRM', 'HRM228', 'International HRM I', 200, 2, 2);

      // ─── COLMAS — Marketing (MKT) ──────────────────────────────────────────
      // 100L S1
      addC('MKT', 'MKT111', 'Principles of Marketing I', 100, 1, 3);
      addC('MKT', 'MKT112', 'Business Mathematics', 100, 1, 3);
      addC('MKT', 'MKT113', 'Intro to Economics', 100, 1, 3);
      addC('MKT', 'MKT114', 'Business Communication', 100, 1, 2);
      addC('MKT', 'MKT115', 'Intro to Management', 100, 1, 2);
      addC('MKT', 'MKT116', 'Consumer Behaviour Basics', 100, 1, 2);
      addC('MKT', 'MKT117', 'Business Statistics', 100, 1, 2);
      addC('MKT', 'MKT118', 'Salesmanship', 100, 1, 2);
      // 100L S2
      addC('MKT', 'MKT121', 'Principles of Marketing II', 100, 2, 3);
      addC('MKT', 'MKT122', 'Macro Economics', 100, 2, 3);
      addC('MKT', 'MKT123', 'Marketing Research I', 100, 2, 3);
      addC('MKT', 'MKT124', 'Distribution Management Basics', 100, 2, 2);
      addC('MKT', 'MKT125', 'Brand Management Basics', 100, 2, 2);
      addC('MKT', 'MKT126', 'Public Relations Basics', 100, 2, 2);
      addC('MKT', 'MKT127', 'Social Media Marketing Basics', 100, 2, 2);
      addC('MKT', 'MKT128', 'Product Management Basics', 100, 2, 2);
      // 200L S1
      addC('MKT', 'MKT211', 'Marketing Management I', 200, 1, 3);
      addC('MKT', 'MKT212', 'Consumer Behaviour', 200, 1, 3);
      addC('MKT', 'MKT213', 'Marketing Research II', 200, 1, 3);
      addC('MKT', 'MKT214', 'Sales Management', 200, 1, 3);
      addC('MKT', 'MKT215', 'Advertising and Promotion I', 200, 1, 2);
      addC('MKT', 'MKT216', 'Distribution Management', 200, 1, 2);
      addC('MKT', 'MKT217', 'Brand Management', 200, 1, 2);
      addC('MKT', 'MKT218', 'Digital Marketing I', 200, 1, 2);
      // 200L S2
      addC('MKT', 'MKT221', 'Marketing Management II', 200, 2, 3);
      addC('MKT', 'MKT222', 'International Marketing I', 200, 2, 3);
      addC('MKT', 'MKT223', 'Retail Management', 200, 2, 3);
      addC('MKT', 'MKT224', 'Advertising and Promotion II', 200, 2, 3);
      addC('MKT', 'MKT225', 'Digital Marketing II', 200, 2, 2);
      addC('MKT', 'MKT226', 'Marketing Analytics I', 200, 2, 2);
      addC('MKT', 'MKT227', 'Public Relations', 200, 2, 2);
      addC('MKT', 'MKT228', 'E-Commerce Marketing', 200, 2, 2);

      // ─── COLNAS — Biochemistry (BCH) ───────────────────────────────────────
      // 100L S1
      addC('BCH', 'BCH111', 'General Biochemistry I', 100, 1, 3);
      addC('BCH', 'BCH112', 'General Chemistry I', 100, 1, 3);
      addC('BCH', 'BCH113', 'General Biology I', 100, 1, 3);
      addC('BCH', 'BCH114', 'Mathematics for Biochemists', 100, 1, 2);
      addC('BCH', 'BCH115', 'Physics for Life Sciences', 100, 1, 2);
      addC('BCH', 'BCH116', 'Cell Biology I', 100, 1, 2);
      addC('BCH', 'BCH117', 'Intro to Molecular Biology', 100, 1, 2);
      addC('BCH', 'BCH118', 'Microbiology Basics', 100, 1, 2);
      // 100L S2
      addC('BCH', 'BCH121', 'General Biochemistry II', 100, 2, 3);
      addC('BCH', 'BCH122', 'General Chemistry II', 100, 2, 3);
      addC('BCH', 'BCH123', 'General Biology II', 100, 2, 3);
      addC('BCH', 'BCH124', 'Cell Biology II', 100, 2, 3);
      addC('BCH', 'BCH125', 'Genetics Basics', 100, 2, 2);
      addC('BCH', 'BCH126', 'Enzymology Basics', 100, 2, 2);
      addC('BCH', 'BCH127', 'Intro to Bioinformatics', 100, 2, 2);
      addC('BCH', 'BCH128', 'Plant Biochemistry I', 100, 2, 2);
      // 200L S1
      addC('BCH', 'BCH211', 'Intermediary Metabolism I', 200, 1, 3);
      addC('BCH', 'BCH212', 'Biochemical Techniques I', 200, 1, 3);
      addC('BCH', 'BCH213', 'Molecular Biology I', 200, 1, 3);
      addC('BCH', 'BCH214', 'Enzymology I', 200, 1, 3);
      addC('BCH', 'BCH215', 'Nutritional Biochemistry I', 200, 1, 2);
      addC('BCH', 'BCH216', 'Clinical Biochemistry I', 200, 1, 2);
      addC('BCH', 'BCH217', 'Biochemistry of Hormones', 200, 1, 2);
      addC('BCH', 'BCH218', 'Microbial Biochemistry', 200, 1, 2);
      // 200L S2
      addC('BCH', 'BCH221', 'Intermediary Metabolism II', 200, 2, 3);
      addC('BCH', 'BCH222', 'Biochemical Techniques II', 200, 2, 3);
      addC('BCH', 'BCH223', 'Molecular Biology II', 200, 2, 3);
      addC('BCH', 'BCH224', 'Enzymology II', 200, 2, 3);
      addC('BCH', 'BCH225', 'Nutritional Biochemistry II', 200, 2, 2);
      addC('BCH', 'BCH226', 'Clinical Biochemistry II', 200, 2, 2);
      addC('BCH', 'BCH227', 'Plant Biochemistry II', 200, 2, 2);
      addC('BCH', 'BCH228', 'Protein Chemistry', 200, 2, 2);

      // ─── COLNAS — Microbiology (MCB) ───────────────────────────────────────
      // 100L S1
      addC('MCB', 'MCB111', 'General Microbiology I', 100, 1, 3);
      addC('MCB', 'MCB112', 'General Chemistry for Microbiology', 100, 1, 3);
      addC('MCB', 'MCB113', 'General Biology', 100, 1, 3);
      addC('MCB', 'MCB114', 'Mathematics for Life Sciences', 100, 1, 2);
      addC('MCB', 'MCB115', 'Physics for Life Sciences', 100, 1, 2);
      addC('MCB', 'MCB116', 'Cell Biology', 100, 1, 2);
      addC('MCB', 'MCB117', 'Intro to Biochemistry', 100, 1, 2);
      addC('MCB', 'MCB118', 'Microbial World', 100, 1, 2);
      // 100L S2
      addC('MCB', 'MCB121', 'General Microbiology II', 100, 2, 3);
      addC('MCB', 'MCB122', 'Biochemistry Basics', 100, 2, 3);
      addC('MCB', 'MCB123', 'Bacteriology I', 100, 2, 3);
      addC('MCB', 'MCB124', 'Virology I', 100, 2, 3);
      addC('MCB', 'MCB125', 'Mycology I', 100, 2, 2);
      addC('MCB', 'MCB126', 'Parasitology I', 100, 2, 2);
      addC('MCB', 'MCB127', 'Genetics Basics', 100, 2, 2);
      addC('MCB', 'MCB128', 'Environmental Microbiology I', 100, 2, 2);
      // 200L S1
      addC('MCB', 'MCB211', 'Bacteriology II', 200, 1, 3);
      addC('MCB', 'MCB212', 'Virology II', 200, 1, 3);
      addC('MCB', 'MCB213', 'Mycology II', 200, 1, 3);
      addC('MCB', 'MCB214', 'Immunology I', 200, 1, 3);
      addC('MCB', 'MCB215', 'Microbial Genetics I', 200, 1, 2);
      addC('MCB', 'MCB216', 'Industrial Microbiology I', 200, 1, 2);
      addC('MCB', 'MCB217', 'Environmental Microbiology II', 200, 1, 2);
      addC('MCB', 'MCB218', 'Food Microbiology I', 200, 1, 2);
      // 200L S2
      addC('MCB', 'MCB221', 'Medical Microbiology I', 200, 2, 3);
      addC('MCB', 'MCB222', 'Immunology II', 200, 2, 3);
      addC('MCB', 'MCB223', 'Microbial Genetics II', 200, 2, 3);
      addC('MCB', 'MCB224', 'Industrial Microbiology II', 200, 2, 3);
      addC('MCB', 'MCB225', 'Food Microbiology II', 200, 2, 2);
      addC('MCB', 'MCB226', 'Soil Microbiology', 200, 2, 2);
      addC('MCB', 'MCB227', 'Water Microbiology', 200, 2, 2);
      addC('MCB', 'MCB228', 'Microbial Ecology', 200, 2, 2);

      // ─── Smaller colleges — 100L + 200L only ──────────────────────────────
      // CAERSE — ABM
      // 100L S1
      addC('ABM', 'ABM111', 'Intro to Agribusiness', 100, 1, 3);
      addC('ABM', 'ABM112', 'Farm Management Basics', 100, 1, 3);
      addC('ABM', 'ABM113', 'Agricultural Economics I', 100, 1, 3);
      addC('ABM', 'ABM114', 'Business Mathematics', 100, 1, 2);
      addC('ABM', 'ABM115', 'Business Communication', 100, 1, 2);
      addC('ABM', 'ABM116', 'Principles of Economics', 100, 1, 2);
      addC('ABM', 'ABM117', 'Introduction to Agriculture', 100, 1, 2);
      addC('ABM', 'ABM118', 'Basic Accounting', 100, 1, 2);
      // 100L S2
      addC('ABM', 'ABM121', 'Principles of Agribusiness', 100, 2, 3);
      addC('ABM', 'ABM122', 'Agricultural Marketing', 100, 2, 3);
      addC('ABM', 'ABM123', 'Business Statistics', 100, 2, 3);
      addC('ABM', 'ABM124', 'Farm Records and Accounts', 100, 2, 2);
      addC('ABM', 'ABM125', 'Rural Sociology Basics', 100, 2, 2);
      addC('ABM', 'ABM126', 'Agricultural Finance Basics', 100, 2, 2);
      addC('ABM', 'ABM127', 'Supply Chain in Agriculture', 100, 2, 2);
      addC('ABM', 'ABM128', 'Co-operative Management', 100, 2, 2);
      // 200L S1
      addC('ABM', 'ABM211', 'Farm Business Management', 200, 1, 3);
      addC('ABM', 'ABM212', 'Agricultural Project Appraisal', 200, 1, 3);
      addC('ABM', 'ABM213', 'Agri-Finance I', 200, 1, 3);
      addC('ABM', 'ABM214', 'Agricultural Marketing II', 200, 1, 3);
      addC('ABM', 'ABM215', 'Operations Research for Agribusiness', 200, 1, 2);
      addC('ABM', 'ABM216', 'Rural Development I', 200, 1, 2);
      addC('ABM', 'ABM217', 'Value Chain Analysis', 200, 1, 2);
      addC('ABM', 'ABM218', 'Risk Management in Agriculture', 200, 1, 2);
      // 200L S2
      addC('ABM', 'ABM221', 'Agri-Finance II', 200, 2, 3);
      addC('ABM', 'ABM222', 'Agricultural Insurance', 200, 2, 3);
      addC('ABM', 'ABM223', 'International Agribusiness', 200, 2, 3);
      addC('ABM', 'ABM224', 'Food Policy I', 200, 2, 3);
      addC('ABM', 'ABM225', 'Cooperative Finance', 200, 2, 2);
      addC('ABM', 'ABM226', 'Rural Development II', 200, 2, 2);
      addC('ABM', 'ABM227', 'Commodity Markets', 200, 2, 2);
      addC('ABM', 'ABM228', 'Agribusiness Case Studies', 200, 2, 2);

      // CASAP — APL
      // 100L S1
      addC('APL', 'APL111', 'Intro to Animal Production', 100, 1, 3);
      addC('APL', 'APL112', 'General Animal Science', 100, 1, 3);
      addC('APL', 'APL113', 'Animal Biology I', 100, 1, 3);
      addC('APL', 'APL114', 'Chemistry for Animal Science', 100, 1, 2);
      addC('APL', 'APL115', 'Mathematics for Life Sciences', 100, 1, 2);
      addC('APL', 'APL116', 'Introduction to Agriculture', 100, 1, 2);
      addC('APL', 'APL117', 'Livestock Husbandry Basics', 100, 1, 2);
      addC('APL', 'APL118', 'Animal Nutrition Basics', 100, 1, 2);
      // 100L S2
      addC('APL', 'APL121', 'Livestock Production Systems I', 100, 2, 3);
      addC('APL', 'APL122', 'Animal Biology II', 100, 2, 3);
      addC('APL', 'APL123', 'Animal Nutrition I', 100, 2, 3);
      addC('APL', 'APL124', 'Poultry Science I', 100, 2, 2);
      addC('APL', 'APL125', 'Animal Genetics Basics', 100, 2, 2);
      addC('APL', 'APL126', 'Pasture and Forage I', 100, 2, 2);
      addC('APL', 'APL127', 'Animal Products I', 100, 2, 2);
      addC('APL', 'APL128', 'Farm Management', 100, 2, 2);
      // 200L S1
      addC('APL', 'APL211', 'Livestock Production Systems II', 200, 1, 3);
      addC('APL', 'APL212', 'Animal Nutrition II', 200, 1, 3);
      addC('APL', 'APL213', 'Poultry Science II', 200, 1, 3);
      addC('APL', 'APL214', 'Animal Breeding I', 200, 1, 3);
      addC('APL', 'APL215', 'Animal Physiology I', 200, 1, 2);
      addC('APL', 'APL216', 'Pasture and Forage II', 200, 1, 2);
      addC('APL', 'APL217', 'Animal Products II', 200, 1, 2);
      addC('APL', 'APL218', 'Aquaculture Basics', 200, 1, 2);
      // 200L S2
      addC('APL', 'APL221', 'Livestock Production Systems III', 200, 2, 3);
      addC('APL', 'APL222', 'Animal Nutrition III', 200, 2, 3);
      addC('APL', 'APL223', 'Animal Breeding II', 200, 2, 3);
      addC('APL', 'APL224', 'Animal Physiology II', 200, 2, 3);
      addC('APL', 'APL225', 'Animal Products III', 200, 2, 2);
      addC('APL', 'APL226', 'Feed Technology', 200, 2, 2);
      addC('APL', 'APL227', 'Swine and Small Ruminant Production', 200, 2, 2);
      addC('APL', 'APL228', 'Range Management', 200, 2, 2);

      // FST — Food Science and Technology
      // 100L S1
      addC('FST', 'FST111', 'Intro to Food Science', 100, 1, 3);
      addC('FST', 'FST112', 'General Chemistry for Food Science', 100, 1, 3);
      addC('FST', 'FST113', 'General Biology for Food Science', 100, 1, 3);
      addC('FST', 'FST114', 'Mathematics for Food Science', 100, 1, 2);
      addC('FST', 'FST115', 'Food and Nutrition Basics', 100, 1, 2);
      addC('FST', 'FST116', 'Food Safety Basics', 100, 1, 2);
      addC('FST', 'FST117', 'Introduction to Agriculture', 100, 1, 2);
      addC('FST', 'FST118', 'Entrepreneurship in Food', 100, 1, 2);
      // 100L S2
      addC('FST', 'FST121', 'Food Chemistry I', 100, 2, 3);
      addC('FST', 'FST122', 'Food Microbiology I', 100, 2, 3);
      addC('FST', 'FST123', 'Food Processing I', 100, 2, 3);
      addC('FST', 'FST124', 'Post-Harvest Technology I', 100, 2, 2);
      addC('FST', 'FST125', 'Food Packaging Basics', 100, 2, 2);
      addC('FST', 'FST126', 'Food Quality Basics', 100, 2, 2);
      addC('FST', 'FST127', 'Food Marketing Basics', 100, 2, 2);
      addC('FST', 'FST128', 'Food Laws and Standards', 100, 2, 2);
      // 200L S1
      addC('FST', 'FST211', 'Food Chemistry II', 200, 1, 3);
      addC('FST', 'FST212', 'Food Microbiology II', 200, 1, 3);
      addC('FST', 'FST213', 'Food Processing II', 200, 1, 3);
      addC('FST', 'FST214', 'Food Engineering I', 200, 1, 3);
      addC('FST', 'FST215', 'Cereals and Legumes Technology', 200, 1, 2);
      addC('FST', 'FST216', 'Dairy Technology I', 200, 1, 2);
      addC('FST', 'FST217', 'Sensory Evaluation', 200, 1, 2);
      addC('FST', 'FST218', 'Food Biotechnology I', 200, 1, 2);
      // 200L S2
      addC('FST', 'FST221', 'Food Chemistry III', 200, 2, 3);
      addC('FST', 'FST222', 'Food Microbiology III', 200, 2, 3);
      addC('FST', 'FST223', 'Food Processing III', 200, 2, 3);
      addC('FST', 'FST224', 'Food Engineering II', 200, 2, 3);
      addC('FST', 'FST225', 'Meat Science I', 200, 2, 2);
      addC('FST', 'FST226', 'Fruit and Vegetable Technology', 200, 2, 2);
      addC('FST', 'FST227', 'Food Quality Management I', 200, 2, 2);
      addC('FST', 'FST228', 'Food Biotechnology II', 200, 2, 2);

      // AGR — Agronomy
      // 100L S1
      addC('AGR', 'AGR111', 'Intro to Agronomy', 100, 1, 3);
      addC('AGR', 'AGR112', 'General Botany', 100, 1, 3);
      addC('AGR', 'AGR113', 'General Chemistry', 100, 1, 3);
      addC('AGR', 'AGR114', 'Mathematics for Agriculture', 100, 1, 2);
      addC('AGR', 'AGR115', 'Introduction to Soil Science', 100, 1, 2);
      addC('AGR', 'AGR116', 'Introduction to Agriculture', 100, 1, 2);
      addC('AGR', 'AGR117', 'Crop Physiology Basics', 100, 1, 2);
      addC('AGR', 'AGR118', 'Plant Genetics Basics', 100, 1, 2);
      // 100L S2
      addC('AGR', 'AGR121', 'Crop Production I', 100, 2, 3);
      addC('AGR', 'AGR122', 'General Botany II', 100, 2, 3);
      addC('AGR', 'AGR123', 'Soil Science I', 100, 2, 3);
      addC('AGR', 'AGR124', 'Weed Science Basics', 100, 2, 2);
      addC('AGR', 'AGR125', 'Irrigation Basics', 100, 2, 2);
      addC('AGR', 'AGR126', 'Crop Protection Basics', 100, 2, 2);
      addC('AGR', 'AGR127', 'Post-Harvest Basics', 100, 2, 2);
      addC('AGR', 'AGR128', 'Agricultural Extension Basics', 100, 2, 2);
      // 200L S1
      addC('AGR', 'AGR211', 'Crop Production II', 200, 1, 3);
      addC('AGR', 'AGR212', 'Soil Fertility and Management', 200, 1, 3);
      addC('AGR', 'AGR213', 'Weed Science I', 200, 1, 3);
      addC('AGR', 'AGR214', 'Crop Physiology I', 200, 1, 3);
      addC('AGR', 'AGR215', 'Irrigation and Drainage I', 200, 1, 2);
      addC('AGR', 'AGR216', 'Crop Improvement I', 200, 1, 2);
      addC('AGR', 'AGR217', 'Agroclimatology', 200, 1, 2);
      addC('AGR', 'AGR218', 'Farming Systems', 200, 1, 2);
      // 200L S2
      addC('AGR', 'AGR221', 'Crop Production III', 200, 2, 3);
      addC('AGR', 'AGR222', 'Soil Fertility II', 200, 2, 3);
      addC('AGR', 'AGR223', 'Weed Science II', 200, 2, 3);
      addC('AGR', 'AGR224', 'Crop Physiology II', 200, 2, 3);
      addC('AGR', 'AGR225', 'Irrigation and Drainage II', 200, 2, 2);
      addC('AGR', 'AGR226', 'Crop Improvement II', 200, 2, 2);
      addC('AGR', 'AGR227', 'Sustainable Agriculture', 200, 2, 2);
      addC('AGR', 'AGR228', 'Agroforestry', 200, 2, 2);

      // EMT — Environment Management
      // 100L S1
      addC('EMT', 'EMT111', 'Introduction to Environmental Science', 100, 1, 3);
      addC('EMT', 'EMT112', 'General Chemistry', 100, 1, 3);
      addC('EMT', 'EMT113', 'General Biology', 100, 1, 3);
      addC('EMT', 'EMT114', 'Mathematics for Environmental Science', 100, 1, 2);
      addC('EMT', 'EMT115', 'Ecology Basics', 100, 1, 2);
      addC('EMT', 'EMT116', 'Environmental Policy Basics', 100, 1, 2);
      addC('EMT', 'EMT117', 'Soil Science Basics', 100, 1, 2);
      addC('EMT', 'EMT118', 'Water Resources Basics', 100, 1, 2);
      // 100L S2
      addC('EMT', 'EMT121', 'Environmental Chemistry I', 100, 2, 3);
      addC('EMT', 'EMT122', 'Environmental Biology', 100, 2, 3);
      addC('EMT', 'EMT123', 'Toxicology Basics', 100, 2, 3);
      addC('EMT', 'EMT124', 'Environmental Monitoring Basics', 100, 2, 2);
      addC('EMT', 'EMT125', 'Waste Management Basics', 100, 2, 2);
      addC('EMT', 'EMT126', 'Air Quality Basics', 100, 2, 2);
      addC('EMT', 'EMT127', 'Sustainable Development Basics', 100, 2, 2);
      addC('EMT', 'EMT128', 'Environmental Law Basics', 100, 2, 2);
      // 200L S1
      addC('EMT', 'EMT211', 'Environmental Chemistry II', 200, 1, 3);
      addC('EMT', 'EMT212', 'Toxicology I', 200, 1, 3);
      addC('EMT', 'EMT213', 'Environmental Monitoring I', 200, 1, 3);
      addC('EMT', 'EMT214', 'Waste Management I', 200, 1, 3);
      addC('EMT', 'EMT215', 'GIS Applications', 200, 1, 2);
      addC('EMT', 'EMT216', 'Air Quality Management I', 200, 1, 2);
      addC('EMT', 'EMT217', 'Water Quality Management I', 200, 1, 2);
      addC('EMT', 'EMT218', 'Environmental Policy I', 200, 1, 2);
      // 200L S2
      addC('EMT', 'EMT221', 'Toxicology II', 200, 2, 3);
      addC('EMT', 'EMT222', 'Environmental Monitoring II', 200, 2, 3);
      addC('EMT', 'EMT223', 'Waste Management II', 200, 2, 3);
      addC('EMT', 'EMT224', 'Environmental Law I', 200, 2, 3);
      addC('EMT', 'EMT225', 'Water Quality Management II', 200, 2, 2);
      addC('EMT', 'EMT226', 'Air Quality Management II', 200, 2, 2);
      addC('EMT', 'EMT227', 'Environmental Economics', 200, 2, 2);
      addC('EMT', 'EMT228', 'Climate Change Science I', 200, 2, 2);

      // VET — Veterinary Medicine (100L + 200L only for this seed)
      // 100L S1
      addC('VET', 'VET111', 'Intro to Veterinary Medicine', 100, 1, 3);
      addC('VET', 'VET112', 'Veterinary Chemistry', 100, 1, 3);
      addC('VET', 'VET113', 'Animal Biology I', 100, 1, 3);
      addC('VET', 'VET114', 'Veterinary Mathematics', 100, 1, 2);
      addC('VET', 'VET115', 'Physics for Veterinary Science', 100, 1, 2);
      addC('VET', 'VET116', 'Animal Anatomy I', 100, 1, 2);
      addC('VET', 'VET117', 'Animal Physiology I', 100, 1, 2);
      addC('VET', 'VET118', 'Veterinary Biochemistry I', 100, 1, 2);
      // 100L S2
      addC('VET', 'VET121', 'Animal Biology II', 100, 2, 3);
      addC('VET', 'VET122', 'Animal Anatomy II', 100, 2, 3);
      addC('VET', 'VET123', 'Animal Physiology II', 100, 2, 3);
      addC('VET', 'VET124', 'Veterinary Biochemistry II', 100, 2, 2);
      addC('VET', 'VET125', 'Veterinary Microbiology I', 100, 2, 2);
      addC('VET', 'VET126', 'Parasitology I', 100, 2, 2);
      addC('VET', 'VET127', 'Embryology I', 100, 2, 2);
      addC('VET', 'VET128', 'Livestock Health Basics', 100, 2, 2);
      // 200L S1
      addC('VET', 'VET211', 'Veterinary Anatomy III', 200, 1, 3);
      addC('VET', 'VET212', 'Veterinary Physiology I', 200, 1, 3);
      addC('VET', 'VET213', 'Veterinary Microbiology II', 200, 1, 3);
      addC('VET', 'VET214', 'Veterinary Pharmacology I', 200, 1, 3);
      addC('VET', 'VET215', 'Parasitology II', 200, 1, 2);
      addC('VET', 'VET216', 'Veterinary Pathology I', 200, 1, 2);
      addC('VET', 'VET217', 'Immunology for Vet', 200, 1, 2);
      addC('VET', 'VET218', 'Veterinary Epidemiology I', 200, 1, 2);
      // 200L S2
      addC('VET', 'VET221', 'Veterinary Physiology II', 200, 2, 3);
      addC('VET', 'VET222', 'Veterinary Pharmacology II', 200, 2, 3);
      addC('VET', 'VET223', 'Veterinary Pathology II', 200, 2, 3);
      addC('VET', 'VET224', 'Clinical Skills I', 200, 2, 3);
      addC('VET', 'VET225', 'Animal Nutrition', 200, 2, 2);
      addC('VET', 'VET226', 'Veterinary Epidemiology II', 200, 2, 2);
      addC('VET', 'VET227', 'Food Hygiene I', 200, 2, 2);
      addC('VET', 'VET228', 'Zoonoses I', 200, 2, 2);

      // COED — ACE
      // 100L S1
      addC('ACE', 'ACE111', 'Foundations of Education', 100, 1, 3);
      addC('ACE', 'ACE112', 'Adult Education Basics', 100, 1, 3);
      addC('ACE', 'ACE113', 'Educational Psychology I', 100, 1, 3);
      addC('ACE', 'ACE114', 'Communication Skills', 100, 1, 2);
      addC('ACE', 'ACE115', 'Sociology of Education', 100, 1, 2);
      addC('ACE', 'ACE116', 'Philosophy of Education', 100, 1, 2);
      addC('ACE', 'ACE117', 'Nigerian Educational System', 100, 1, 2);
      addC('ACE', 'ACE118', 'Curriculum Studies Basics', 100, 1, 2);
      // 100L S2
      addC('ACE', 'ACE121', 'History of Education', 100, 2, 3);
      addC('ACE', 'ACE122', 'Educational Psychology II', 100, 2, 3);
      addC('ACE', 'ACE123', 'Curriculum Development Basics', 100, 2, 3);
      addC('ACE', 'ACE124', 'Adult Learning Theories', 100, 2, 2);
      addC('ACE', 'ACE125', 'Educational Research Basics', 100, 2, 2);
      addC('ACE', 'ACE126', 'Community Development Basics', 100, 2, 2);
      addC('ACE', 'ACE127', 'Non-Formal Education Basics', 100, 2, 2);
      addC('ACE', 'ACE128', 'Teaching Methods Basics', 100, 2, 2);
      // 200L S1
      addC('ACE', 'ACE211', 'Adult Education Principles', 200, 1, 3);
      addC('ACE', 'ACE212', 'Community Development I', 200, 1, 3);
      addC('ACE', 'ACE213', 'Non-Formal Education I', 200, 1, 3);
      addC('ACE', 'ACE214', 'Educational Research Methods I', 200, 1, 3);
      addC('ACE', 'ACE215', 'Curriculum Theory I', 200, 1, 2);
      addC('ACE', 'ACE216', 'Educational Statistics I', 200, 1, 2);
      addC('ACE', 'ACE217', 'Literacy Education I', 200, 1, 2);
      addC('ACE', 'ACE218', 'Vocational Education I', 200, 1, 2);
      // 200L S2
      addC('ACE', 'ACE221', 'Community Development II', 200, 2, 3);
      addC('ACE', 'ACE222', 'Non-Formal Education II', 200, 2, 3);
      addC('ACE', 'ACE223', 'Educational Research Methods II', 200, 2, 3);
      addC('ACE', 'ACE224', 'Curriculum Theory II', 200, 2, 3);
      addC('ACE', 'ACE225', 'Vocational Education II', 200, 2, 2);
      addC('ACE', 'ACE226', 'Educational Technology I', 200, 2, 2);
      addC('ACE', 'ACE227', 'Distance Education', 200, 2, 2);
      addC('ACE', 'ACE228', 'Training and Development I', 200, 2, 2);

      await prisma.course.createMany({ data: allCourses, skipDuplicates: true });
      const courses = await prisma.course.findMany();
      const getCourse = (code: string) => {
        const c = courses.find(x => x.code === code);
        if (!c) throw new Error(`Course not found: ${code}`);
        return c;
      };
      results.push(`✓ ${courses.length} courses created`);
      progressBroadcaster.broadcastProgress('courses', 'Courses created', `${courses.length} courses`, '📚✅');

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

      // ── HODs ─────────────────────────────────────────────────────────────
      const hodData = [
        { email: 'hod.csc@mouau.edu.ng', fullName: 'Prof. Amara Obi (HOD CSC)', staffId: 'HOD001', deptCode: 'CSC', alsoLectures: true },
        { email: 'hod.mth@mouau.edu.ng', fullName: 'Prof. Emeka Nwosu (HOD MTH)', staffId: 'HOD002', deptCode: 'MTH', alsoLectures: true },
        { email: 'hod.phy@mouau.edu.ng', fullName: 'Prof. Ngozi Eze (HOD PHY)', staffId: 'HOD003', deptCode: 'PHY', alsoLectures: true },
        { email: 'hod.eee@mouau.edu.ng', fullName: 'Prof. Basil Ani (HOD EEE)', staffId: 'HOD005', deptCode: 'EEE', alsoLectures: true },
        { email: 'hod.acc@mouau.edu.ng', fullName: 'Dr. Adaeze Okon (HOD ACC)', staffId: 'HOD006', deptCode: 'ACC', alsoLectures: false },
        { email: 'hod.bch@mouau.edu.ng', fullName: 'Dr. Chidi Agu (HOD BCH)', staffId: 'HOD007', deptCode: 'BCH', alsoLectures: true },
        { email: 'hod_ogwo@mouau.edu.ng', fullName: 'Ogwo Godspower (HOD)', staffId: 'HOD310449', deptCode: 'CSC', alsoLectures: true },
      ];
      hodData.forEach(h => {
        const dept = getDept(h.deptCode);
        allUsersToCreate.push({ email: h.email, fullName: h.fullName, passwordHash: hodPass, role: 'hod', staffId: h.staffId, collegeId: dept.collegeId, departmentId: dept.id, session: '2025/2026' });
      });

      // ── Deans ─────────────────────────────────────────────────────────────
      [
        { email: 'dean.colpas@mouau.edu.ng', fullName: 'Prof. Victor Okeke (Dean COLPAS)', staffId: 'DEN001', collegeCode: 'COLPAS' },
        { email: 'dean.ceet@mouau.edu.ng', fullName: 'Prof. James Eze (Dean CEET)', staffId: 'DEN002', collegeCode: 'CEET' },
        { email: 'dean.colmas@mouau.edu.ng', fullName: 'Prof. Rose Nwosu (Dean COLMAS)', staffId: 'DEN003', collegeCode: 'COLMAS' },
        { email: 'dean.colnas@mouau.edu.ng', fullName: 'Prof. Samuel Obi (Dean COLNAS)', staffId: 'DEN004', collegeCode: 'COLNAS' },
        { email: 'dean_ogwo@mouau.edu.ng', fullName: 'Ogwo Godspower (Dean)', staffId: 'DEN310449', collegeCode: 'COLPAS' },
      ].forEach(d => {
        allUsersToCreate.push({ email: d.email, fullName: d.fullName, passwordHash: deanPass, role: 'dean', staffId: d.staffId, collegeId: getCollege(d.collegeCode).id, session: '2025/2026' });
      });

      // ── Exam Officers ──────────────────────────────────────────────────────
      [
        { email: 'examofficer1@mouau.edu.ng', fullName: 'Mr. Chukwuemeka Obi', staffId: 'EXO001' },
        { email: 'examofficer_ogwo@mouau.edu.ng', fullName: 'Ogwo Godspower (EO)', staffId: 'EXO310449' },
      ].forEach(e => allUsersToCreate.push({ email: e.email, fullName: e.fullName, passwordHash: examOfficerPass, role: 'exam_officer', staffId: e.staffId, session: '2025/2026' }));

      // ── VC/DVC ────────────────────────────────────────────────────────────
      [
        { email: 'vc@mouau.edu.ng', fullName: 'Prof. Ikechukwu Nwachukwu (VC)', staffId: 'VC001' },
        { email: 'vcdvc_ogwo@mouau.edu.ng', fullName: 'Ogwo Godspower (VC)', staffId: 'VC310449' },
      ].forEach(v => allUsersToCreate.push({ email: v.email, fullName: v.fullName, passwordHash: vcDvcPass, role: 'vc_dvc', staffId: v.staffId, session: '2025/2026' }));

      // ── Lecturers ─────────────────────────────────────────────────────────
      const lecturerData = [
        { email: 'dr.okafor@mouau.edu.ng', fullName: 'Dr. Emeka Okafor', staffId: 'LCT001', deptCode: 'CSC' },
        { email: 'prof.nwosu@mouau.edu.ng', fullName: 'Prof. Adaeze Nwosu', staffId: 'LCT002', deptCode: 'MTH' },
        { email: 'dr.uche@mouau.edu.ng', fullName: 'Dr. Uche Anyanwu', staffId: 'LCT003', deptCode: 'STA' },
        { email: 'dr.okoro@mouau.edu.ng', fullName: 'Dr. Chika Okoro', staffId: 'LCT004', deptCode: 'PHY' },
        { email: 'prof.obiora@mouau.edu.ng', fullName: 'Prof. Obiora Kalu', staffId: 'LCT005', deptCode: 'CHM' },
        { email: 'dr.agbo@mouau.edu.ng', fullName: 'Dr. Ifenna Agbo', staffId: 'LCT006', deptCode: 'GLG' },
        { email: 'lec_ogwo@mouau.edu.ng', fullName: 'Ogwo Godspower', staffId: 'PHY310449', deptCode: 'PHY' },
        { email: 'dr.adekunle@mouau.edu.ng', fullName: 'Dr. Adekunle Williams', staffId: 'LCT007', deptCode: 'EEE' },
        { email: 'prof.obi@mouau.edu.ng', fullName: 'Prof. Eze Obi', staffId: 'LCT008', deptCode: 'CVE' },
        { email: 'dr.ikenna@mouau.edu.ng', fullName: 'Dr. Ikenna Ozoemena', staffId: 'LCT011', deptCode: 'CPE' },
        { email: 'prof.ekwueme@mouau.edu.ng', fullName: 'Prof. Ngozi Ekwueme', staffId: 'LCT013', deptCode: 'HRM' },
        { email: 'dr.onyekachi@mouau.edu.ng', fullName: 'Dr. Onyekachi Mbah', staffId: 'LCT014', deptCode: 'ACC' },
        { email: 'dr.okonkwo@mouau.edu.ng', fullName: 'Dr. Amaka Okonkwo', staffId: 'LCT015', deptCode: 'BUS' },
        { email: 'dr.ibrahim@mouau.edu.ng', fullName: 'Dr. Musa Ibrahim', staffId: 'LCT018', deptCode: 'BCH' },
        { email: 'dr.eze@mouau.edu.ng', fullName: 'Dr. Ogechukwu Eze', staffId: 'LCT019', deptCode: 'MCB' },
        { email: 'dr.amadi@mouau.edu.ng', fullName: 'Dr. Chidinma Amadi', staffId: 'LCT022', deptCode: 'FST' },
        { email: 'dr.nzeka@mouau.edu.ng', fullName: 'Dr. Nnamdi Nzeka', staffId: 'LCT045', deptCode: 'ENG' },
        { email: 'dr.mkt@mouau.edu.ng', fullName: 'Dr. Chukwudum Eze', staffId: 'LCT050', deptCode: 'MKT' },
        { email: 'dr.agr@mouau.edu.ng', fullName: 'Dr. Peter Ugwu', staffId: 'LCT051', deptCode: 'AGR' },
        { email: 'dr.vet@mouau.edu.ng', fullName: 'Prof. Samuel Onyekachi', staffId: 'LCT052', deptCode: 'VET' },
      ];
      lecturerData.forEach(l => {
        const dept = getDept(l.deptCode);
        allUsersToCreate.push({ email: l.email, fullName: l.fullName, passwordHash: lecturerPass, role: 'lecturer', staffId: l.staffId, collegeId: dept.collegeId, departmentId: dept.id, session: '2025/2026' });
      });

      // ── Invigilators ──────────────────────────────────────────────────────
      [
        { email: 'invig1@mouau.edu.ng', fullName: 'Mr. Chidi Eze', staffId: 'INV001', deptCode: 'CSC' },
        { email: 'invig2@mouau.edu.ng', fullName: 'Mrs. Ngozi Obi', staffId: 'INV002', deptCode: 'EEE' },
        { email: 'invig3@mouau.edu.ng', fullName: 'Mr. Emeka Nwachukwu', staffId: 'INV003', deptCode: 'MCB' },
        { email: 'invig4@mouau.edu.ng', fullName: 'Mrs. Funke Adeniyi', staffId: 'INV004', deptCode: 'HRM' },
        { email: 'invig_ogwo@mouau.edu.ng', fullName: 'Ogwo Godspower', staffId: 'INV310449', deptCode: 'PHY' },
      ].forEach(i => {
        const dept = getDept(i.deptCode);
        allUsersToCreate.push({ email: i.email, fullName: i.fullName, passwordHash: invigilatorPass, role: 'invigilator', staffId: i.staffId, collegeId: dept.collegeId, departmentId: dept.id, session: '2025/2026' });
      });

      // ── Students — 100L and 200L only ─────────────────────────────────────
      const studentData: Array<{
        email: string; fullName: string; deptCode: string;
        matric: string; levelNum: number; session: string;
      }> = [
        // CSC — 100L
        { email: 'kayode.oguns@student.mouau.edu.ng', fullName: 'Kayode Oguns', deptCode: 'CSC', matric: 'MOUAU/CSC/25/111213', levelNum: 100, session: '2025/2026' },
        { email: 'chinedu.eke@student.mouau.edu.ng', fullName: 'Chinedu Eke', deptCode: 'CSC', matric: 'MOUAU/CSC/25/334455', levelNum: 100, session: '2025/2026' },
        { email: 'damilola.adebayo@student.mouau.edu.ng', fullName: 'Damilola Adebayo', deptCode: 'CSC', matric: 'MOUAU/CSC/25/445566', levelNum: 100, session: '2025/2026' },
        { email: 'emeka.ogu@student.mouau.edu.ng', fullName: 'Emeka Ogu', deptCode: 'CSC', matric: 'MOUAU/CSC/25/556677', levelNum: 100, session: '2025/2026' },
        { email: 'gloria.umoh@student.mouau.edu.ng', fullName: 'Gloria Umoh', deptCode: 'CSC', matric: 'MOUAU/CSC/25/778899', levelNum: 100, session: '2025/2026' },
        { email: '8digitskomputers@gmail.com', fullName: 'Prince Odinakachi', deptCode: 'CSC', matric: 'MOUAU/CMP/25/130844', levelNum: 100, session: '2025/2026' },
        { email: 'chinemeremhumphery@gmail.com', fullName: 'Humphrey Chinemerem', deptCode: 'CSC', matric: 'MOUAU/CMP/25/130845', levelNum: 100, session: '2025/2026' },
        { email: 'ogwo_csc@mouau.edu.ng', fullName: 'Ogwo Godspower (CSC)', deptCode: 'CSC', matric: 'MOUAU/CSC/25/128469', levelNum: 100, session: '2025/2026' },
        // CSC — 200L
        { email: 'alice.obi@student.mouau.edu.ng', fullName: 'Alice Obi', deptCode: 'CSC', matric: '2024/CSC/001', levelNum: 200, session: '2025/2026' },
        { email: 'bob.nwachukwu@student.mouau.edu.ng', fullName: 'Bob Nwachukwu', deptCode: 'CSC', matric: '2024/CSC/002', levelNum: 200, session: '2025/2026' },
        { email: 'emeka.agu@student.mouau.edu.ng', fullName: 'Emeka Agu', deptCode: 'CSC', matric: '2024/CSC/003', levelNum: 200, session: '2025/2026' },
        // PHY — 100L
        { email: 'ogwo_phy@mouau.edu.ng', fullName: 'Ogwo Godspower (PHY)', deptCode: 'PHY', matric: 'MOUAU/PHY/25/128468', levelNum: 100, session: '2025/2026' },
        { email: 'ade.adeleke@student.mouau.edu.ng', fullName: 'Ade Adeleke', deptCode: 'PHY', matric: 'MOUAU/PHY/25/123456', levelNum: 100, session: '2025/2026' },
        { email: 'bimbo.oshodi@student.mouau.edu.ng', fullName: 'Bimbo Oshodi', deptCode: 'PHY', matric: 'MOUAU/PHY/25/234567', levelNum: 100, session: '2025/2026' },
        { email: 'chuka.obi@student.mouau.edu.ng', fullName: 'Chuka Obi', deptCode: 'PHY', matric: 'MOUAU/PHY/25/345678', levelNum: 100, session: '2025/2026' },
        // PHY — 200L
        { email: 'isaac.udoh@student.mouau.edu.ng', fullName: 'Isaac Udoh', deptCode: 'PHY', matric: '2024/PHY/007', levelNum: 200, session: '2025/2026' },
        { email: 'joy.akan@student.mouau.edu.ng', fullName: 'Joy Akan', deptCode: 'PHY', matric: '2024/PHY/008', levelNum: 200, session: '2025/2026' },
        // MTH — 100L
        { email: 'obinna.obi@student.mouau.edu.ng', fullName: 'Obinna Obi', deptCode: 'MTH', matric: 'MOUAU/MTH/25/151617', levelNum: 100, session: '2025/2026' },
        { email: 'ada.mba@student.mouau.edu.ng', fullName: 'Ada Mba', deptCode: 'MTH', matric: 'MOUAU/MTH/25/151618', levelNum: 100, session: '2025/2026' },
        // CHM — 100L
        { email: 'ogwo_chm@mouau.edu.ng', fullName: 'Ogwo Godspower (CHM)', deptCode: 'CHM', matric: 'MOUAU/CHM/25/128472', levelNum: 100, session: '2025/2026' },
        { email: 'nnamdi.agu@student.mouau.edu.ng', fullName: 'Nnamdi Agu', deptCode: 'CHM', matric: 'MOUAU/CHM/25/141516', levelNum: 100, session: '2025/2026' },
        // CHM — 200L
        { email: 'kelechi.ofor@student.mouau.edu.ng', fullName: 'Kelechi Ofor', deptCode: 'CHM', matric: '2024/CHM/001', levelNum: 200, session: '2025/2026' },
        // STA — 100L
        { email: 'patience.aka@student.mouau.edu.ng', fullName: 'Patience Aka', deptCode: 'STA', matric: 'MOUAU/STA/25/161718', levelNum: 100, session: '2025/2026' },
        { email: 'ogwo_sta@mouau.edu.ng', fullName: 'Ogwo Godspower (STA)', deptCode: 'STA', matric: 'MOUAU/STA/25/128470', levelNum: 100, session: '2025/2026' },
        // GLG — 100L
        { email: 'queen.etuk@student.mouau.edu.ng', fullName: 'Queen Etuk', deptCode: 'GLG', matric: 'MOUAU/GLG/25/171819', levelNum: 100, session: '2025/2026' },
        { email: 'ogwo_glg@mouau.edu.ng', fullName: 'Ogwo Godspower (GLG)', deptCode: 'GLG', matric: 'MOUAU/GLG/25/128471', levelNum: 100, session: '2025/2026' },
        // CEET — EEE
        { email: 'peter.okpara@student.mouau.edu.ng', fullName: 'Peter Okpara', deptCode: 'EEE', matric: '2024/EEE/009', levelNum: 200, session: '2025/2026' },
        { email: 'tunde.adeyemi@student.mouau.edu.ng', fullName: 'Tunde Adeyemi', deptCode: 'EEE', matric: 'MOUAU/EEE/25/111001', levelNum: 100, session: '2025/2026' },
        { email: 'ngozi.eze@student.mouau.edu.ng', fullName: 'Ngozi Eze', deptCode: 'EEE', matric: 'MOUAU/EEE/25/111002', levelNum: 100, session: '2025/2026' },
        // CEET — CPE
        { email: 'nnamdi.obi@student.mouau.edu.ng', fullName: 'Nnamdi Obi', deptCode: 'CPE', matric: '2024/CPE/001', levelNum: 200, session: '2025/2026' },
        { email: 'cpe.100l.a@student.mouau.edu.ng', fullName: 'Adaora Chukwu', deptCode: 'CPE', matric: 'MOUAU/CPE/25/111001', levelNum: 100, session: '2025/2026' },
        // CEET — CVE
        { email: 'obiageli.ezea@student.mouau.edu.ng', fullName: 'Obiageli Ezea', deptCode: 'CVE', matric: '2024/CVE/001', levelNum: 200, session: '2025/2026' },
        { email: 'cve.100l.a@student.mouau.edu.ng', fullName: 'Emeka Onyekwelu', deptCode: 'CVE', matric: 'MOUAU/CVE/25/111001', levelNum: 100, session: '2025/2026' },
        // COLMAS — ACC
        { email: 'amara.nwosu@student.mouau.edu.ng', fullName: 'Amara Nwosu', deptCode: 'ACC', matric: '2024/ACC/001', levelNum: 200, session: '2025/2026' },
        { email: 'acc.100l.a@student.mouau.edu.ng', fullName: 'Chisom Okafor', deptCode: 'ACC', matric: 'MOUAU/ACC/25/111001', levelNum: 100, session: '2025/2026' },
        { email: 'acc.100l.b@student.mouau.edu.ng', fullName: 'Dike Nwosu', deptCode: 'ACC', matric: 'MOUAU/ACC/25/111002', levelNum: 100, session: '2025/2026' },
        // COLMAS — BUS
        { email: 'chidera.nweke@student.mouau.edu.ng', fullName: 'Chidera Nweke', deptCode: 'BUS', matric: '2024/BUS/001', levelNum: 200, session: '2025/2026' },
        { email: 'bus.100l.a@student.mouau.edu.ng', fullName: 'Eze Okonkwo', deptCode: 'BUS', matric: 'MOUAU/BUS/25/111001', levelNum: 100, session: '2025/2026' },
        // COLMAS — HRM
        { email: 'xavier.otu@student.mouau.edu.ng', fullName: 'Xavier Otu', deptCode: 'HRM', matric: '2024/HRM/011', levelNum: 200, session: '2025/2026' },
        { email: 'hrm.100l.a@student.mouau.edu.ng', fullName: 'Fatima Bello', deptCode: 'HRM', matric: 'MOUAU/HRM/25/111001', levelNum: 100, session: '2025/2026' },
        // COLMAS — MKT
        { email: 'mkt.100l.a@student.mouau.edu.ng', fullName: 'Adaeze Marketing', deptCode: 'MKT', matric: 'MOUAU/MKT/25/111001', levelNum: 100, session: '2025/2026' },
        { email: 'mkt.100l.b@student.mouau.edu.ng', fullName: 'Chukwuma Eze', deptCode: 'MKT', matric: 'MOUAU/MKT/25/111002', levelNum: 100, session: '2025/2026' },
        { email: 'mkt.200l.a@student.mouau.edu.ng', fullName: 'Ngozi Marketing', deptCode: 'MKT', matric: '2024/MKT/001', levelNum: 200, session: '2025/2026' },
        // COLNAS — BCH
        { email: 'blessing.okon@student.mouau.edu.ng', fullName: 'Blessing Okon', deptCode: 'BCH', matric: '2024/BCH/010', levelNum: 200, session: '2025/2026' },
        { email: 'bch.100l.a@student.mouau.edu.ng', fullName: 'Uchenna Biochem', deptCode: 'BCH', matric: 'MOUAU/BCH/25/111001', levelNum: 100, session: '2025/2026' },
        // COLNAS — MCB
        { email: 'doris.onyia@student.mouau.edu.ng', fullName: 'Doris Onyia', deptCode: 'MCB', matric: '2024/MCB/001', levelNum: 200, session: '2025/2026' },
        { email: 'mcb.100l.a@student.mouau.edu.ng', fullName: 'Ikenna Micro', deptCode: 'MCB', matric: 'MOUAU/MCB/25/111001', levelNum: 100, session: '2025/2026' },
        // CAFST — FST
        { email: 'edwin.chukwu@student.mouau.edu.ng', fullName: 'Edwin Chukwu', deptCode: 'FST', matric: '2024/FST/011', levelNum: 200, session: '2025/2026' },
        { email: 'fst.100l.a@student.mouau.edu.ng', fullName: 'Adanna Food', deptCode: 'FST', matric: 'MOUAU/FST/25/111001', levelNum: 100, session: '2025/2026' },
        { email: 'fst.100l.b@student.mouau.edu.ng', fullName: 'Bolu Ade', deptCode: 'FST', matric: 'MOUAU/FST/25/111002', levelNum: 100, session: '2025/2026' },
        // CCSS — AGR
        { email: 'agr.100l.a@student.mouau.edu.ng', fullName: 'Chibuzo Agronomy', deptCode: 'AGR', matric: 'MOUAU/AGR/25/111001', levelNum: 100, session: '2025/2026' },
        { email: 'agr.100l.b@student.mouau.edu.ng', fullName: 'Dami Agronomy', deptCode: 'AGR', matric: 'MOUAU/AGR/25/111002', levelNum: 100, session: '2025/2026' },
        { email: 'agr.200l.a@student.mouau.edu.ng', fullName: 'Eze Agronomy', deptCode: 'AGR', matric: '2024/AGR/001', levelNum: 200, session: '2025/2026' },
        // CAERSE — ABM
        { email: 'abm.100l.a@student.mouau.edu.ng', fullName: 'Favour Agribusiness', deptCode: 'ABM', matric: 'MOUAU/ABM/25/111001', levelNum: 100, session: '2025/2026' },
        { email: 'abm.100l.b@student.mouau.edu.ng', fullName: 'Gift Agribusiness', deptCode: 'ABM', matric: 'MOUAU/ABM/25/111002', levelNum: 100, session: '2025/2026' },
        { email: 'abm.200l.a@student.mouau.edu.ng', fullName: 'Habib Agribusiness', deptCode: 'ABM', matric: '2024/ABM/001', levelNum: 200, session: '2025/2026' },
        // CASAP — APL
        { email: 'apl.100l.a@student.mouau.edu.ng', fullName: 'Ifechi Animal', deptCode: 'APL', matric: 'MOUAU/APL/25/111001', levelNum: 100, session: '2025/2026' },
        { email: 'apl.100l.b@student.mouau.edu.ng', fullName: 'John Animal', deptCode: 'APL', matric: 'MOUAU/APL/25/111002', levelNum: 100, session: '2025/2026' },
        // CNREM — EMT
        { email: 'emt.100l.a@student.mouau.edu.ng', fullName: 'Kachi Environment', deptCode: 'EMT', matric: 'MOUAU/EMT/25/111001', levelNum: 100, session: '2025/2026' },
        { email: 'emt.100l.b@student.mouau.edu.ng', fullName: 'Lola Environment', deptCode: 'EMT', matric: 'MOUAU/EMT/25/111002', levelNum: 100, session: '2025/2026' },
        { email: 'emt.200l.a@student.mouau.edu.ng', fullName: 'Musa Environment', deptCode: 'EMT', matric: '2024/EMT/001', levelNum: 200, session: '2025/2026' },
        // COED — ACE
        { email: 'ace.100l.a@student.mouau.edu.ng', fullName: 'Nkechi Education', deptCode: 'ACE', matric: 'MOUAU/ACE/25/111001', levelNum: 100, session: '2025/2026' },
        { email: 'ace.100l.b@student.mouau.edu.ng', fullName: 'Ola Education', deptCode: 'ACE', matric: 'MOUAU/ACE/25/111002', levelNum: 100, session: '2025/2026' },
        // CVM — VET
        { email: 'vet.100l.a@student.mouau.edu.ng', fullName: 'Pat Veterinary', deptCode: 'VET', matric: 'MOUAU/VET/25/111001', levelNum: 100, session: '2025/2026' },
        { email: 'vet.100l.b@student.mouau.edu.ng', fullName: 'Queen Veterinary', deptCode: 'VET', matric: 'MOUAU/VET/25/111002', levelNum: 100, session: '2025/2026' },
      ];

      studentData.forEach(s => {
        const dept = getDept(s.deptCode);
        const level = getLevel(s.levelNum);
        allUsersToCreate.push({
          email: s.email, fullName: s.fullName, passwordHash: studentPass,
          role: 'student', matricNumber: s.matric,
          collegeId: dept.collegeId, departmentId: dept.id,
          levelId: level.id, session: s.session,
        });
      });

      await prisma.user.createMany({ data: allUsersToCreate, skipDuplicates: true });
      const allUsers = await prisma.user.findMany();
      const students = allUsers.filter(u => u.role === 'student');
      const lecturers = allUsers.filter(u => u.role === 'lecturer');
      const invigilators = allUsers.filter(u => u.role === 'invigilator');
      results.push(`✓ ${allUsers.length} users (${students.length} students)`);
      progressBroadcaster.broadcastProgress('users', 'Users created', `${allUsers.length} total`, '👥✅');

      // ── Secondary roles ────────────────────────────────────────────────────
      const roleAssignments: any[] = [];
      for (const h of hodData.filter(x => x.alsoLectures)) {
        const u = allUsers.find(x => x.email === h.email);
        if (u) roleAssignments.push({ userId: u.id, role: 'lecturer' });
      }
      await prisma.userRoleAssignment.createMany({ data: roleAssignments, skipDuplicates: true });
      results.push(`✓ ${roleAssignments.length} secondary role assignments`);

      // ══════════════════════════════════════════════════════════════════════
      // 9. COURSE REGISTRATIONS
      // ══════════════════════════════════════════════════════════════════════
      progressBroadcaster.broadcastProgress('registrations', 'Registering students...', 'Building registrations', '📋');

      const gst111 = getCourse('GST111');
      const gst112 = getCourse('GST112');
      const gst121 = getCourse('GST121');

      const gstBySem: Record<string, Array<{ courseId: string; semester: number }>> = {
        '100-1': [{ courseId: gst111.id, semester: 1 }, { courseId: gst112.id, semester: 1 }],
        '100-2': [{ courseId: gst121.id, semester: 2 }],
        '200-1': [{ courseId: getCourse('GST211').id, semester: 1 }, { courseId: getCourse('GST212').id, semester: 1 }],
        '200-2': [{ courseId: getCourse('GST221').id, semester: 2 }],
      };

      const registrationData: any[] = [];

      const skipStudentEmails = new Set(
        studentData
          .filter((_, i) => i % 3 === 0)
          .map(s => s.email)
      );

      for (const studentDef of studentData) {
        const student = allUsers.find(u => u.email === studentDef.email);
        if (!student) continue;

        const levelNum = studentDef.levelNum;
        const session = studentDef.session;
        const deptId = getDept(studentDef.deptCode).id;
        const shouldSkip = skipStudentEmails.has(studentDef.email);

        const deptCoursesAtLevel = courses.filter(c =>
          c.departmentId === deptId && c.level === levelNum
        );

        const skipCount = shouldSkip ? Math.floor(Math.random() * 3) + 3 : 0;
        const skipSemester = levelNum === 100 ? 2 : 0;
        const candidatesToSkip = deptCoursesAtLevel
          .filter(c => skipSemester === 0 || c.semester === skipSemester);
        const shuffled = [...candidatesToSkip].sort(() => Math.random() - 0.5);
        const skippedCourseIds = new Set(shuffled.slice(0, skipCount).map(c => c.id));

        for (const course of deptCoursesAtLevel) {
          if (skippedCourseIds.has(course.id)) continue;
          registrationData.push({
            studentId: student.id,
            courseId: course.id,
            session,
            semester: course.semester!,
            levelId: student.levelId,
            registrationType: 'normal',
            status: 'approved',
          });
        }

        for (const sem of [1, 2]) {
          const key = `${levelNum}-${sem}`;
          for (const gst of (gstBySem[key] ?? [])) {
            registrationData.push({
              studentId: student.id,
              courseId: gst.courseId,
              session,
              semester: gst.semester,
              levelId: student.levelId,
              registrationType: 'normal',
              status: 'approved',
            });
          }
        }

        // Carry-over: 200L students carry 2 courses from 100L
        if (levelNum === 200) {
          const prevDeptCourses = courses.filter(c =>
            c.departmentId === deptId && c.level === 100
          );
          const carryOver = [...prevDeptCourses]
            .sort(() => Math.random() - 0.5)
            .slice(0, 2);
          for (const co of carryOver) {
            registrationData.push({
              studentId: student.id,
              courseId: co.id,
              session,
              semester: co.semester!,
              levelId: student.levelId,
              registrationType: 'carry_over',
              status: 'pending',
            });
          }
        }
      }

      await prisma.courseRegistration.createMany({ data: registrationData, skipDuplicates: true });
      results.push(`✓ ${registrationData.length} course registrations (with intentional gaps for ${skipStudentEmails.size} students)`);
      progressBroadcaster.broadcastProgress('registrations', 'Registrations done', `${registrationData.length} regs`, '📋✅');

      // ══════════════════════════════════════════════════════════════════════
      // 10. EXAMS — use only 100L/200L course codes and levels
      // ══════════════════════════════════════════════════════════════════════
      progressBroadcaster.broadcastProgress('exam', 'Creating exams...', '6 exams', '📝');

      function D(day: number, mo: number, yr: number, hr: number, mn: number) {
        return new Date(yr, mo - 1, day, hr, mn);
      }

      const s1 = D(28, 6, 2026, 23, 0), e1 = D(31, 12, 2026, 23, 59);
      const s2 = D(28, 6, 2026, 23, 0), e2 = D(31, 12, 2026, 23, 59);

      const cscLec = lecturers.find(l => l.departmentId === getDept('CSC').id) ?? lecturers[0];
      const phyLec = lecturers.find(l => l.departmentId === getDept('PHY').id) ?? lecturers[0];
      const mthLec = lecturers.find(l => l.departmentId === getDept('MTH').id) ?? lecturers[0];
      const engLec = lecturers.find(l => l.departmentId === getDept('ENG').id) ?? lecturers[0];

      const EXAM_ID_1 = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const EXAM_ID_2 = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
      const EXAM_ID_3 = 'c3d4e5f6-a7b8-9012-cdef-123456789012';
      const EXAM_ID_4 = 'd4e5f6a7-b8c9-0123-defa-234567890123';
      const EXAM_ID_5 = 'e5f6a7b8-c9d0-1234-efab-345678901234';
      const EXAM_ID_6 = 'f6a7b8c9-d0e1-2345-fabc-456789012345';

      // Exam 1: CSC211 — 200L course
      const exam1 = await prisma.exam.upsert({
        where: { id: EXAM_ID_1 }, update: {}, create: {
          id: EXAM_ID_1, courseId: getCourse('CSC211').id, createdBy: cscLec.id,
          title: 'CSC211 — Object-Oriented Programming I Exam',
          instructions: 'Answer all questions. No external resources.',
          durationMinutes: 120, totalMarks: 100, passMark: 40, status: 'scheduled',
          scheduledStart: s1, scheduledEnd: e1,
          randomizeQuestions: true, randomizeOptions: true, questionsToPresent: 20,
          showResultAfter: true, maxViolations: 5, session: '2025/2026', semester: 2,
          levels: { connect: [100, 200].map(n => ({ id: getLevel(n).id })) },
        }
      });

      // Exam 2: PHY111 — 100L course
      const exam2 = await prisma.exam.upsert({
        where: { id: EXAM_ID_2 }, update: {}, create: {
          id: EXAM_ID_2, courseId: getCourse('PHY111').id, createdBy: phyLec.id,
          title: 'PHY111 — General Physics I Examination',
          instructions: 'Answer all questions.',
          durationMinutes: 90, totalMarks: 60, passMark: 24, status: 'scheduled',
          scheduledStart: s2, scheduledEnd: e2,
          randomizeQuestions: true, randomizeOptions: true, questionsToPresent: 15,
          showResultAfter: true, maxViolations: 3, session: '2025/2026', semester: 2,
          levels: { connect: [100, 200].map(n => ({ id: getLevel(n).id })) },
        }
      });

      // Exam 3: MTH111 — 100L course
      const exam3 = await prisma.exam.upsert({
        where: { id: EXAM_ID_3 }, update: {}, create: {
          id: EXAM_ID_3, courseId: getCourse('MTH111').id, createdBy: mthLec.id,
          title: 'MTH111 — Calculus I Examination',
          instructions: 'No calculators permitted.',
          durationMinutes: 90, totalMarks: 70, passMark: 28, status: 'scheduled',
          scheduledStart: s2, scheduledEnd: e2,
          randomizeQuestions: true, randomizeOptions: false, questionsToPresent: 10,
          showResultAfter: true, maxViolations: 3, session: '2025/2026', semester: 2,
          levels: { connect: [100, 200].map(n => ({ id: getLevel(n).id })) },
        }
      });

      // Exam 4: GST111
      const exam4 = await prisma.exam.upsert({
        where: { id: EXAM_ID_4 }, update: {}, create: {
          id: EXAM_ID_4, courseId: getCourse('GST111').id, createdBy: engLec.id,
          title: 'GST111 — Communication in English I Examination',
          instructions: 'Answer all questions carefully.',
          durationMinutes: 60, totalMarks: 40, passMark: 16, status: 'scheduled',
          scheduledStart: s1, scheduledEnd: e1,
          randomizeQuestions: true, randomizeOptions: true, questionsToPresent: 12,
          showResultAfter: true, maxViolations: 5, session: '2025/2026', semester: 2,
          levels: { connect: [100, 200].map(n => ({ id: getLevel(n).id })) },
        }
      });

      // Exam 5: PHY111 True/False
      const exam5 = await prisma.exam.upsert({
        where: { id: EXAM_ID_5 }, update: {}, create: {
          id: EXAM_ID_5, courseId: getCourse('PHY111').id, createdBy: phyLec.id,
          title: 'PHY111 — True/False Physics Quiz',
          instructions: 'Select True or False for each statement.',
          durationMinutes: 30, totalMarks: 20, passMark: 10, status: 'scheduled',
          scheduledStart: s1, scheduledEnd: e1,
          randomizeQuestions: true, randomizeOptions: false, questionsToPresent: 10,
          showResultAfter: true, maxViolations: 3, session: '2025/2026', semester: 2,
          levels: { connect: [100, 200].map(n => ({ id: getLevel(n).id })) },
        }
      });

      // Exam 6: CSC211 True/False
      const exam6 = await prisma.exam.upsert({
        where: { id: EXAM_ID_6 }, update: {}, create: {
          id: EXAM_ID_6, courseId: getCourse('CSC211').id, createdBy: cscLec.id,
          title: 'CSC211 — True/False OOP Quiz',
          instructions: 'Read carefully before answering.',
          durationMinutes: 25, totalMarks: 15, passMark: 8, status: 'scheduled',
          scheduledStart: s2, scheduledEnd: e2,
          randomizeQuestions: true, randomizeOptions: false, questionsToPresent: 15,
          showResultAfter: true, maxViolations: 3, session: '2025/2026', semester: 2,
          levels: { connect: [100, 200].map(n => ({ id: getLevel(n).id })) },
        }
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
      results.push('✓ 6 exams created (4 MCQ, 2 True/False)');
      progressBroadcaster.broadcastProgress('exam', 'Exams created', '6 exams', '📝✅');

      // ══════════════════════════════════════════════════════════════════════
      // 11. QUESTIONS
      // ══════════════════════════════════════════════════════════════════════
      progressBroadcaster.broadcastProgress('questions', 'Creating questions...', 'MCQ + T/F', '❓');

      async function createMcq(examId: string, data: Array<{ body: string; topic: string; options: string[]; correct: number; marks: number }>) {
        let n = 0;
        for (let i = 0; i < data.length; i++) {
          const q = data[i];
          const exists = await prisma.question.findFirst({ where: { examId, body: q.body } });
          if (!exists) {
            await prisma.question.create({
              data: {
                examId, type: 'mcq', body: q.body, marks: q.marks, topic: q.topic, orderIndex: i,
                options: { create: q.options.map((t, j) => ({ optionText: t, isCorrect: j === q.correct, orderIndex: j })) },
              },
            });
            n++;
          }
        }
        return n;
      }

      async function createTf(examId: string, data: Array<{ body: string; topic: string; correct: 0 | 1; marks: number }>) {
        let n = 0;
        for (let i = 0; i < data.length; i++) {
          const q = data[i];
          const exists = await prisma.question.findFirst({ where: { examId, body: q.body } });
          if (!exists) {
            await prisma.question.create({
              data: {
                examId, type: 'mcq', body: q.body, marks: q.marks, topic: q.topic, orderIndex: i,
                options: {
                  create: [
                    { optionText: 'True', isCorrect: q.correct === 0, orderIndex: 0 },
                    { optionText: 'False', isCorrect: q.correct === 1, orderIndex: 1 },
                  ]
                },
              },
            });
            n++;
          }
        }
        return n;
      }

      // Exam 1: OOP questions (replacing Algorithms since we switched to CSC211)
      const q1 = await createMcq(exam1.id, [
        { body: 'What is the main principle of encapsulation in OOP?', topic: 'OOP', options: ['Hiding data and exposing behaviour via methods', 'Inheriting from parent classes', 'Writing reusable functions', 'Compiling code faster'], correct: 0, marks: 5 },
        { body: 'Which keyword is used to inherit a class in Java?', topic: 'OOP', options: ['implements', 'extends', 'inherits', 'super'], correct: 1, marks: 5 },
        { body: 'What does polymorphism allow in OOP?', topic: 'OOP', options: ['Multiple inheritance only', 'One interface with many implementations', 'Hiding class fields', 'Faster execution'], correct: 1, marks: 5 },
        { body: 'Which of these is an example of runtime polymorphism?', topic: 'OOP', options: ['Method overloading', 'Method overriding', 'Constructor chaining', 'Static methods'], correct: 1, marks: 5 },
        { body: 'A class that cannot be instantiated is called a(n):', topic: 'OOP', options: ['Final class', 'Abstract class', 'Static class', 'Interface'], correct: 1, marks: 5 },
        { body: 'Which access modifier makes a member visible only within its class?', topic: 'OOP', options: ['public', 'protected', 'private', 'default'], correct: 2, marks: 5 },
        { body: 'What is a constructor?', topic: 'OOP', options: ['A method that returns an object', 'A special method called when an object is created', 'A static block', 'An interface method'], correct: 1, marks: 5 },
        { body: 'Which OOP concept allows a class to have multiple methods with the same name but different parameters?', topic: 'OOP', options: ['Overriding', 'Abstraction', 'Overloading', 'Encapsulation'], correct: 2, marks: 5 },
        { body: 'In Java, all classes implicitly inherit from:', topic: 'OOP', options: ['Object', 'Base', 'Root', 'Super'], correct: 0, marks: 5 },
        { body: 'Which of these best describes an interface in OOP?', topic: 'OOP', options: ['A class with constructor', 'A blueprint defining method signatures without implementation', 'A static utility class', 'An abstract data type'], correct: 1, marks: 5 },
        { body: 'What is the purpose of the "super" keyword?', topic: 'OOP', options: ['Create a new object', 'Reference the parent class', 'Declare a static method', 'Override a method'], correct: 1, marks: 5 },
        { body: 'Which principle states a class should have only one reason to change?', topic: 'OOP', options: ['Open/Closed Principle', 'Liskov Substitution', 'Single Responsibility Principle', 'Interface Segregation'], correct: 2, marks: 5 },
        { body: 'What is object composition?', topic: 'OOP', options: ['Inheriting multiple classes', 'Building complex objects from simpler ones', 'Compiling multiple files', 'Overloading constructors'], correct: 1, marks: 5 },
        { body: 'A "has-a" relationship in OOP is called:', topic: 'OOP', options: ['Inheritance', 'Polymorphism', 'Composition', 'Abstraction'], correct: 2, marks: 5 },
        { body: 'Which is NOT a pillar of OOP?', topic: 'OOP', options: ['Encapsulation', 'Compilation', 'Inheritance', 'Polymorphism'], correct: 1, marks: 5 },
      ]);

      const q2 = await createMcq(exam2.id, [
        { body: 'SI unit of force?', topic: 'Mechanics', options: ['Newton', 'Joule', 'Watt', 'Pascal'], correct: 0, marks: 4 },
        { body: 'Which is a scalar quantity?', topic: 'Mechanics', options: ['Velocity', 'Force', 'Speed', 'Acceleration'], correct: 2, marks: 4 },
        { body: 'Acceleration due to gravity on Earth?', topic: 'Mechanics', options: ['8.9 m/s²', '9.8 m/s²', '10.8 m/s²', '7.8 m/s²'], correct: 1, marks: 4 },
        { body: 'First law of thermodynamics is a statement of:', topic: 'Thermodynamics', options: ['Energy conservation', 'Entropy', 'Heat transfer', 'Work'], correct: 0, marks: 4 },
        { body: 'Which wave requires a medium to travel?', topic: 'Waves', options: ['Light wave', 'Sound wave', 'Radio wave', 'X-ray'], correct: 1, marks: 4 },
        { body: 'Wavelength with frequency 50 Hz and speed 340 m/s?', topic: 'Waves', options: ['6.8 m', '7.8 m', '8.8 m', '5.8 m'], correct: 0, marks: 4 },
        { body: "Object at rest stays at rest — this is Newton's:", topic: 'Mechanics', options: ['First Law', 'Second Law', 'Third Law', 'Law of Gravitation'], correct: 0, marks: 4 },
        { body: 'Power of a device using 100 J in 5 seconds?', topic: 'Mechanics', options: ['5 W', '20 W', '50 W', '100 W'], correct: 1, marks: 4 },
        { body: 'Converting solid directly to gas is called:', topic: 'Thermodynamics', options: ['Condensation', 'Evaporation', 'Sublimation', 'Melting'], correct: 2, marks: 4 },
        { body: 'Which particle has negative charge?', topic: 'Physics', options: ['Proton', 'Neutron', 'Electron', 'Photon'], correct: 2, marks: 4 },
      ]);

      const q3 = await createMcq(exam3.id, [
        { body: 'Derivative of x²?', topic: 'Calculus', options: ['2x', 'x', '2x²', 'x²/2'], correct: 0, marks: 5 },
        { body: 'Integral of 1/x?', topic: 'Calculus', options: ['ln x', 'e^x', 'x', '1/x²'], correct: 0, marks: 5 },
        { body: 'Slope of y = 3x + 2?', topic: 'Algebra', options: ['2', '3', '5', '1'], correct: 1, marks: 5 },
        { body: 'Solve: 2x + 5 = 13', topic: 'Algebra', options: ['2', '3', '4', '5'], correct: 2, marks: 5 },
        { body: 'Value of sin(90°)?', topic: 'Trigonometry', options: ['0', '0.5', '1', 'Undefined'], correct: 2, marks: 5 },
        { body: 'Area of a circle with radius r?', topic: 'Geometry', options: ['πr', '2πr', 'πr²', '2πr²'], correct: 2, marks: 5 },
        { body: 'Logarithm of 100 to base 10?', topic: 'Algebra', options: ['1', '2', '10', '100'], correct: 1, marks: 5 },
        { body: 'Derivative of e^x?', topic: 'Calculus', options: ['e^x', 'x e^x', 'e^{x-1}', 'ln x'], correct: 0, marks: 5 },
        { body: 'Sum of angles in a triangle?', topic: 'Geometry', options: ['90°', '180°', '270°', '360°'], correct: 1, marks: 5 },
        { body: 'Factorial of 5?', topic: 'Algebra', options: ['60', '100', '120', '24'], correct: 2, marks: 5 },
      ]);

      const q4 = await createMcq(exam4.id, [
        { body: 'Which is a complete sentence?', topic: 'Grammar', options: ['Running fast.', 'She runs fast.', 'Fast running.', 'Run fast.'], correct: 1, marks: 4 },
        { body: 'Plural of "child"?', topic: 'Grammar', options: ['Childs', 'Children', 'Childrens', 'Child'], correct: 1, marks: 4 },
        { body: 'Synonym for "happy"?', topic: 'Vocabulary', options: ['Sad', 'Angry', 'Joyful', 'Tired'], correct: 2, marks: 4 },
        { body: 'Correct spelling:', topic: 'Spelling', options: ['Accomodate', 'Acommodate', 'Accommodate', 'Acomodate'], correct: 2, marks: 4 },
        { body: 'Punctuation mark showing possession?', topic: 'Punctuation', options: ['Comma', 'Apostrophe', 'Period', 'Question mark'], correct: 1, marks: 4 },
        { body: 'Adverb in: "She sings beautifully."', topic: 'Grammar', options: ['She', 'Sings', 'Beautifully', 'The'], correct: 2, marks: 4 },
        { body: 'Which is a conjunction?', topic: 'Grammar', options: ['And', 'Run', 'Beautiful', 'Quickly'], correct: 0, marks: 4 },
        { body: 'Correct article before "hour":', topic: 'Grammar', options: ['a', 'an', 'the', 'none'], correct: 1, marks: 4 },
        { body: 'Past tense of "go"?', topic: 'Grammar', options: ['Goed', 'Gone', 'Went', 'Going'], correct: 2, marks: 4 },
        { body: 'Antonym of "difficult"?', topic: 'Vocabulary', options: ['Hard', 'Easy', 'Tough', 'Complex'], correct: 1, marks: 4 },
      ]);

      const q5 = await createTf(exam5.id, [
        { body: 'The SI unit of force is the Newton.', topic: 'Mechanics', correct: 0, marks: 2 },
        { body: 'Sound waves can travel through a vacuum.', topic: 'Waves', correct: 1, marks: 2 },
        { body: 'Acceleration due to gravity on Earth is approximately 9.8 m/s².', topic: 'Mechanics', correct: 0, marks: 2 },
        { body: 'Energy can be created and destroyed (first law of thermodynamics).', topic: 'Thermodynamics', correct: 1, marks: 2 },
        { body: 'Electrons carry a positive charge.', topic: 'Electricity', correct: 1, marks: 2 },
        { body: 'The process of a solid converting directly to gas is sublimation.', topic: 'Thermodynamics', correct: 0, marks: 2 },
        { body: 'Velocity is a scalar quantity.', topic: 'Mechanics', correct: 1, marks: 2 },
        { body: 'Light is an example of a transverse wave.', topic: 'Waves', correct: 0, marks: 2 },
        { body: "Newton's Second Law states that F = ma.", topic: 'Mechanics', correct: 0, marks: 2 },
        { body: 'Wavelength increases as frequency increases.', topic: 'Waves', correct: 1, marks: 2 },
      ]);

      const q6 = await createTf(exam6.id, [
        { body: 'Encapsulation hides internal data and exposes behaviour via methods.', topic: 'OOP', correct: 0, marks: 1 },
        { body: 'In Java, a class extends another class using the "implements" keyword.', topic: 'OOP', correct: 1, marks: 1 },
        { body: 'Method overriding is an example of compile-time polymorphism.', topic: 'OOP', correct: 1, marks: 1 },
        { body: 'An abstract class can be instantiated directly.', topic: 'OOP', correct: 1, marks: 1 },
        { body: 'The "private" access modifier restricts access to within the same class.', topic: 'OOP', correct: 0, marks: 1 },
        { body: 'A constructor is called automatically when an object is created.', topic: 'OOP', correct: 0, marks: 1 },
        { body: 'Method overloading means the same method name with different parameters.', topic: 'OOP', correct: 0, marks: 1 },
        { body: 'All Java classes implicitly inherit from the Object class.', topic: 'OOP', correct: 0, marks: 1 },
        { body: 'An interface can have instance variables with initial values.', topic: 'OOP', correct: 1, marks: 1 },
        { body: 'The Single Responsibility Principle states a class should have only one reason to change.', topic: 'OOP', correct: 0, marks: 1 },
        { body: 'Composition represents a "has-a" relationship between objects.', topic: 'OOP', correct: 0, marks: 1 },
        { body: 'Polymorphism only applies to method overriding, not overloading.', topic: 'OOP', correct: 1, marks: 1 },
        { body: 'The "super" keyword is used to reference the parent class.', topic: 'OOP', correct: 0, marks: 1 },
        { body: 'A "has-a" relationship in OOP is an example of inheritance.', topic: 'OOP', correct: 1, marks: 1 },
        { body: 'Abstraction is one of the four pillars of OOP.', topic: 'OOP', correct: 0, marks: 1 },
      ]);

      results.push(`✓ ${q1 + q2 + q3 + q4 + q5 + q6} questions`);
      progressBroadcaster.broadcastProgress('questions', 'Questions created', `${q1 + q2 + q3 + q4 + q5 + q6} questions`, '❓✅');

      // ══════════════════════════════════════════════════════════════════════
      // 12. NOTIFICATIONS
      // ══════════════════════════════════════════════════════════════════════
      progressBroadcaster.broadcastProgress('notifications', 'Creating notifications...', 'For students', '🔔');
      const notifs: any[] = [];
      for (const s of students) {
        notifs.push({ userId: s.id, title: '📝 Exam Scheduled', message: `You have upcoming CBT exams. Check your dashboard for details.`, isRead: false });
        notifs.push({ userId: s.id, title: '📢 GST111 Exam Notice', message: 'GST111 Communication in English I exam is scheduled. Ensure you are registered.', isRead: false });
      }
      await prisma.notification.createMany({ data: notifs, skipDuplicates: true });
      results.push(`✓ ${notifs.length} notifications`);
      progressBroadcaster.broadcastProgress('notifications', 'Notifications created', `${notifs.length}`, '🔔✅');

      // ══════════════════════════════════════════════════════════════════════
      // 13. USER PREFERENCES
      // ══════════════════════════════════════════════════════════════════════
      await prisma.userPreference.createMany({
        data: allUsers.map(u => ({
          userId: u.id,
          prefs: { theme: 'system', language: 'en', emailNotifications: true, fontSize: 'medium' },
        })),
        skipDuplicates: true,
      });
      results.push(`✓ ${allUsers.length} user preferences`);

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
      progressBroadcaster.broadcastComplete('Database reset completed!');
      return { success: true, results: ['✓ All data cleared'] };
    } catch (err) {
      console.error('[Reset] Failed:', err);
      progressBroadcaster.broadcastError(err instanceof Error ? err.message : 'Reset failed');
      return fail(500, { error: err instanceof Error ? err.message : 'Reset failed' });
    }
  },
};