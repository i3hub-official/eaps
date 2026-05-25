// src/routes/(admin)/seed/+page.server.ts
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireAdmin } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';
import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

// ── Guard: only allow in dev OR if no users exist yet ─────────────────────
export const load: PageServerLoad = async ({ locals }) => {
  const userCount = await prisma.user.count();

  // If users exist, require admin auth
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
    // Re-check auth inside action
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      requireAdmin(locals.user);
    }

    try {
      const results: string[] = [];

      // ── Colleges ───────────────────────────────────────────────────────
      const colleges = await Promise.all([
        prisma.college.upsert({ where: { name: 'College of Natural Sciences' },                    update: {}, create: { name: 'College of Natural Sciences',                    code: 'COLNAS' } }),
        prisma.college.upsert({ where: { name: 'College of Engineering and Engineering Technology' }, update: {}, create: { name: 'College of Engineering and Engineering Technology', code: 'CEET'   } }),
        prisma.college.upsert({ where: { name: 'College of Veterinary Medicine' },                 update: {}, create: { name: 'College of Veterinary Medicine',                 code: 'COLVET' } }),
        prisma.college.upsert({ where: { name: 'College of Physical and Applied Sciences' },       update: {}, create: { name: 'College of Physical and Applied Sciences',       code: 'COLPAS' } }),
        prisma.college.upsert({ where: { name: 'College of Management Sciences' },                 update: {}, create: { name: 'College of Management Sciences',                 code: 'COLMGT' } }),
      ]);
      const [colnas, coleng, colvet, colpas, colmgt] = colleges;
      results.push(`✓ ${colleges.length} colleges`);

      // ── Departments ────────────────────────────────────────────────────
      const deptData = [
        { name: 'Computer Science',       code: 'CSC', collegeId: colnas.id },
        { name: 'Mathematics',            code: 'MTH', collegeId: colnas.id },
        { name: 'Physics',                code: 'PHY', collegeId: colnas.id },
        { name: 'Chemistry',              code: 'CHM', collegeId: colnas.id },
        { name: 'Biology',                code: 'BIO', collegeId: colnas.id },
        { name: 'Statistics',             code: 'STA', collegeId: colnas.id },
        { name: 'Microbiology',           code: 'MCB', collegeId: colnas.id },
        { name: 'Biochemistry',           code: 'BCH', collegeId: colnas.id },
        { name: 'Civil Engineering',      code: 'CVE', collegeId: coleng.id },
        { name: 'Electrical Engineering', code: 'EEE', collegeId: coleng.id },
        { name: 'Mechanical Engineering', code: 'MCE', collegeId: coleng.id },
        { name: 'Agricultural Engineering', code: 'AGE', collegeId: coleng.id },
        { name: 'Chemical Engineering',   code: 'CHE', collegeId: coleng.id },
        { name: 'Computer Engineering',   code: 'CPE', collegeId: coleng.id },
        { name: 'Veterinary Public Health', code: 'VPH', collegeId: colvet.id },
        { name: 'Veterinary Anatomy',     code: 'VAM', collegeId: colvet.id },
        { name: 'Veterinary Medicine',    code: 'VET', collegeId: colvet.id },
        { name: 'Veterinary Surgery',     code: 'VSU', collegeId: colvet.id },
        { name: 'Agronomy',               code: 'AGR', collegeId: colpas.id },
        { name: 'Animal Science',         code: 'ANS', collegeId: colpas.id },
        { name: 'Food Science & Technology', code: 'FST', collegeId: colpas.id },
        { name: 'Soil Science',           code: 'SSC', collegeId: colpas.id },
        { name: 'Crop Science',           code: 'CRP', collegeId: colpas.id },
        { name: 'Accountancy',            code: 'ACC', collegeId: colmgt.id },
        { name: 'Business Administration', code: 'BUS', collegeId: colmgt.id },
        { name: 'Economics',              code: 'ECO', collegeId: colmgt.id },
        { name: 'Marketing',              code: 'MKT', collegeId: colmgt.id },
        { name: 'Banking & Finance',      code: 'BNF', collegeId: colmgt.id },
      ];

      const departments = await Promise.all(
        deptData.map(d => prisma.department.upsert({ where: { code: d.code }, update: {}, create: d }))
      );
      results.push(`✓ ${departments.length} departments`);

      const getDept = (code: string) => {
        const d = departments.find(d => d.code === code);
        if (!d) throw new Error(`Department not found: ${code}`);
        return d;
      };

      // ── Users ──────────────────────────────────────────────────────────
      const [adminPass, lecturerPass, invigilatorPass, studentPass] = await Promise.all([
        hashPassword('admin123'),
        hashPassword('lecturer123'),
        hashPassword('invigilator123'),
        hashPassword('student123'),
      ]);

      await prisma.user.upsert({
        where: { email: 'admin@mouau.edu.ng' },
        update: {},
        create: { email: 'admin@mouau.edu.ng', fullName: 'System Administrator', passwordHash: adminPass, role: 'admin', staffId: 'ADM001' },
      });

      const lecturers = await Promise.all([
        prisma.user.upsert({ where: { email: 'dr.okafor@mouau.edu.ng' },    update: {}, create: { email: 'dr.okafor@mouau.edu.ng',    fullName: 'Dr. Emeka Okafor',     passwordHash: lecturerPass, role: 'lecturer', staffId: 'LCT001', collegeId: colnas.id, departmentId: getDept('CSC').id } }),
        prisma.user.upsert({ where: { email: 'prof.nwosu@mouau.edu.ng' },   update: {}, create: { email: 'prof.nwosu@mouau.edu.ng',   fullName: 'Prof. Adaeze Nwosu',   passwordHash: lecturerPass, role: 'lecturer', staffId: 'LCT002', collegeId: colnas.id, departmentId: getDept('MTH').id } }),
        prisma.user.upsert({ where: { email: 'dr.adekunle@mouau.edu.ng' },  update: {}, create: { email: 'dr.adekunle@mouau.edu.ng',  fullName: 'Dr. Adekunle Williams', passwordHash: lecturerPass, role: 'lecturer', staffId: 'LCT003', collegeId: coleng.id, departmentId: getDept('EEE').id } }),
        prisma.user.upsert({ where: { email: 'prof.ekwueme@mouau.edu.ng' }, update: {}, create: { email: 'prof.ekwueme@mouau.edu.ng', fullName: 'Prof. Ngozi Ekwueme',  passwordHash: lecturerPass, role: 'lecturer', staffId: 'LCT004', collegeId: colmgt.id, departmentId: getDept('ACC').id } }),
      ]);

      const invigilator = await prisma.user.upsert({
        where: { email: 'invig1@mouau.edu.ng' },
        update: {},
        create: { email: 'invig1@mouau.edu.ng', fullName: 'Mr. Chidi Eze', passwordHash: invigilatorPass, role: 'invigilator', staffId: 'INV001', collegeId: colnas.id, departmentId: getDept('CSC').id },
      });

      const studentData = [
        { email: 'alice.obi@student.mouau.edu.ng',       fullName: 'Alice Obi',       deptCode: 'CSC', matric: '2021/CSC/001', level: 300 },
        { email: 'bob.nwachukwu@student.mouau.edu.ng',   fullName: 'Bob Nwachukwu',   deptCode: 'CSC', matric: '2021/CSC/002', level: 300 },
        { email: 'chidi.okeke@student.mouau.edu.ng',     fullName: 'Chidi Okeke',     deptCode: 'CSC', matric: '2021/CSC/003', level: 300 },
        { email: 'dalu.eze@student.mouau.edu.ng',        fullName: 'Dalu Eze',        deptCode: 'CSC', matric: '2021/CSC/004', level: 300 },
        { email: 'emeka.agu@student.mouau.edu.ng',       fullName: 'Emeka Agu',       deptCode: 'CSC', matric: '2022/CSC/001', level: 200 },
        { email: 'funke.adeyemi@student.mouau.edu.ng',   fullName: 'Funke Adeyemi',   deptCode: 'CSC', matric: '2022/CSC/002', level: 200 },
        { email: 'grace.uko@student.mouau.edu.ng',       fullName: 'Grace Uko',       deptCode: 'CSC', matric: '2020/CSC/001', level: 400 },
        { email: 'henry.dim@student.mouau.edu.ng',       fullName: 'Henry Dim',       deptCode: 'CSC', matric: '2020/CSC/002', level: 400 },
        { email: 'ifeoma.ogu@student.mouau.edu.ng',      fullName: 'Ifeoma Ogu',      deptCode: 'CSC', matric: '2023/CSC/001', level: 100 },
        { email: 'james.oti@student.mouau.edu.ng',       fullName: 'James Oti',       deptCode: 'CSC', matric: '2023/CSC/002', level: 100 },
        { email: 'ada.mba@student.mouau.edu.ng',         fullName: 'Ada Mba',         deptCode: 'MTH', matric: '2021/MTH/005', level: 300 },
        { email: 'ben.ugwu@student.mouau.edu.ng',        fullName: 'Ben Ugwu',        deptCode: 'MTH', matric: '2021/MTH/006', level: 300 },
        { email: 'chioma.igwe@student.mouau.edu.ng',     fullName: 'Chioma Igwe',     deptCode: 'MTH', matric: '2022/MTH/003', level: 200 },
        { email: 'david.okafor@student.mouau.edu.ng',    fullName: 'David Okafor',    deptCode: 'MTH', matric: '2022/MTH/004', level: 200 },
        { email: 'esther.nwosu@student.mouau.edu.ng',    fullName: 'Esther Nwosu',    deptCode: 'MTH', matric: '2020/MTH/003', level: 400 },
        { email: 'frank.eze@student.mouau.edu.ng',       fullName: 'Frank Eze',       deptCode: 'MTH', matric: '2020/MTH/004', level: 400 },
        { email: 'gloria.okonkwo@student.mouau.edu.ng',  fullName: 'Gloria Okonkwo',  deptCode: 'MTH', matric: '2023/MTH/005', level: 100 },
        { email: 'henrietta.ani@student.mouau.edu.ng',   fullName: 'Henrietta Ani',   deptCode: 'MTH', matric: '2023/MTH/006', level: 100 },
        { email: 'isaac.udoh@student.mouau.edu.ng',      fullName: 'Isaac Udoh',      deptCode: 'PHY', matric: '2021/PHY/007', level: 300 },
        { email: 'joy.akan@student.mouau.edu.ng',        fullName: 'Joy Akan',        deptCode: 'PHY', matric: '2022/PHY/005', level: 200 },
        { email: 'kingsley.bassey@student.mouau.edu.ng', fullName: 'Kingsley Bassey', deptCode: 'PHY', matric: '2020/PHY/005', level: 400 },
        { email: 'linda.akpan@student.mouau.edu.ng',     fullName: 'Linda Akpan',     deptCode: 'PHY', matric: '2023/PHY/007', level: 100 },
        { email: 'michael.ekong@student.mouau.edu.ng',   fullName: 'Michael Ekong',   deptCode: 'PHY', matric: '2022/PHY/006', level: 200 },
        { email: 'nancy.ekwu@student.mouau.edu.ng',      fullName: 'Nancy Ekwu',      deptCode: 'PHY', matric: '2021/PHY/008', level: 300 },
        { email: 'peter.okpara@student.mouau.edu.ng',    fullName: 'Peter Okpara',    deptCode: 'EEE', matric: '2021/EEE/009', level: 300 },
        { email: 'queen.etuk@student.mouau.edu.ng',      fullName: 'Queen Etuk',      deptCode: 'EEE', matric: '2022/EEE/007', level: 200 },
        { email: 'samuel.udo@student.mouau.edu.ng',      fullName: 'Samuel Udo',      deptCode: 'EEE', matric: '2020/EEE/006', level: 400 },
        { email: 'tina.offiong@student.mouau.edu.ng',    fullName: 'Tina Offiong',    deptCode: 'EEE', matric: '2023/EEE/008', level: 100 },
        { email: 'victor.akpan@student.mouau.edu.ng',    fullName: 'Victor Akpan',    deptCode: 'EEE', matric: '2022/EEE/009', level: 200 },
        { email: 'wendy.udoh@student.mouau.edu.ng',      fullName: 'Wendy Udoh',      deptCode: 'EEE', matric: '2021/EEE/010', level: 300 },
        { email: 'xavier.otu@student.mouau.edu.ng',      fullName: 'Xavier Otu',      deptCode: 'ACC', matric: '2021/ACC/011', level: 300 },
        { email: 'yemi.adebayo@student.mouau.edu.ng',    fullName: 'Yemi Adebayo',    deptCode: 'ACC', matric: '2022/ACC/008', level: 200 },
        { email: 'zainab.bello@student.mouau.edu.ng',    fullName: 'Zainab Bello',    deptCode: 'ACC', matric: '2020/ACC/007', level: 400 },
        { email: 'abiola.ogun@student.mouau.edu.ng',     fullName: 'Abiola Ogun',     deptCode: 'ACC', matric: '2023/ACC/009', level: 100 },
        { email: 'blessing.okon@student.mouau.edu.ng',   fullName: 'Blessing Okon',   deptCode: 'ACC', matric: '2022/ACC/010', level: 200 },
        { email: 'charles.ekpo@student.mouau.edu.ng',    fullName: 'Charles Ekpo',    deptCode: 'ACC', matric: '2021/ACC/012', level: 300 },
        { email: 'dorothy.ndukwe@student.mouau.edu.ng',  fullName: 'Dorothy Ndukwe',  deptCode: 'BUS', matric: '2021/BUS/013', level: 300 },
        { email: 'edwin.chukwu@student.mouau.edu.ng',    fullName: 'Edwin Chukwu',    deptCode: 'BUS', matric: '2022/BUS/011', level: 200 },
        { email: 'florence.obi@student.mouau.edu.ng',    fullName: 'Florence Obi',    deptCode: 'BUS', matric: '2020/BUS/008', level: 400 },
        { email: 'george.okoli@student.mouau.edu.ng',    fullName: 'George Okoli',    deptCode: 'BUS', matric: '2023/BUS/010', level: 100 },
        { email: 'helen.uzochukwu@student.mouau.edu.ng', fullName: 'Helen Uzochukwu', deptCode: 'BUS', matric: '2022/BUS/012', level: 200 },
        { email: 'ifeanyi.nwankwo@student.mouau.edu.ng', fullName: 'Ifeanyi Nwankwo', deptCode: 'BUS', matric: '2021/BUS/014', level: 300 },
      ];

      const students = await Promise.all(
        studentData.map(s => {
          const dept = getDept(s.deptCode);
          return prisma.user.upsert({
            where: { email: s.email },
            update: {},
            create: {
              email: s.email, fullName: s.fullName,
              passwordHash: studentPass, role: 'student',
              matricNumber: s.matric, collegeId: dept.collegeId,
              departmentId: dept.id, level: s.level, session: '2024/2025',
            },
          });
        })
      );
      results.push(`✓ 1 admin, ${lecturers.length} lecturers, 1 invigilator, ${students.length} students`);

      // ── Courses ────────────────────────────────────────────────────────
      const coursesData = [
        { code: 'CSC101', title: 'Introduction to Computer Science', deptCode: 'CSC', credits: 2, level: 100 },
        { code: 'CSC201', title: 'Object Oriented Programming',      deptCode: 'CSC', credits: 3, level: 200 },
        { code: 'CSC301', title: 'Data Structures & Algorithms',     deptCode: 'CSC', credits: 3, level: 300 },
        { code: 'CSC302', title: 'Database Management Systems',      deptCode: 'CSC', credits: 3, level: 300 },
        { code: 'CSC401', title: 'Software Engineering',             deptCode: 'CSC', credits: 3, level: 400 },
        { code: 'MTH101', title: 'Calculus I',                       deptCode: 'MTH', credits: 2, level: 100 },
        { code: 'MTH201', title: 'Mathematical Methods',             deptCode: 'MTH', credits: 3, level: 200 },
        { code: 'MTH301', title: 'Linear Algebra',                   deptCode: 'MTH', credits: 3, level: 300 },
        { code: 'MTH402', title: 'Real Analysis',                    deptCode: 'MTH', credits: 3, level: 400 },
        { code: 'EEE201', title: 'Circuit Theory',                   deptCode: 'EEE', credits: 3, level: 200 },
        { code: 'EEE301', title: 'Electronics I',                    deptCode: 'EEE', credits: 3, level: 300 },
        { code: 'EEE401', title: 'Power Systems',                    deptCode: 'EEE', credits: 3, level: 400 },
        { code: 'ACC201', title: 'Financial Accounting',             deptCode: 'ACC', credits: 3, level: 200 },
        { code: 'ACC301', title: 'Managerial Accounting',            deptCode: 'ACC', credits: 3, level: 300 },
        { code: 'ACC401', title: 'Auditing',                         deptCode: 'ACC', credits: 3, level: 400 },
      ];

      const courses = await Promise.all(
        coursesData.map(c => prisma.course.upsert({
          where: { code: c.code },
          update: {},
          create: { code: c.code, title: c.title, departmentId: getDept(c.deptCode).id, creditUnits: c.credits, level: c.level },
        }))
      );
      results.push(`✓ ${courses.length} courses`);

      const getCourse = (code: string) => {
        const c = courses.find(c => c.code === code);
        if (!c) throw new Error(`Course not found: ${code}`);
        return c;
      };

      // ── Course registrations ───────────────────────────────────────────
      let regCount = 0;
      for (const deptCode of ['CSC', 'MTH', 'EEE', 'ACC']) {
        const dept        = getDept(deptCode);
        const deptStudents = students.filter(s => s.departmentId === dept.id);
        const deptCourses  = courses.filter(c => c.departmentId === dept.id);
        for (const student of deptStudents) {
          for (const course of deptCourses) {
            const levelDiff = (student.level ?? 0) - (course.level ?? 0);
            if (levelDiff === 0 || levelDiff === 100) {
              await prisma.courseRegistration.upsert({
                where: { studentId_courseId_session_semester: { studentId: student.id, courseId: course.id, session: '2024/2025', semester: 1 } },
                update: {},
                create: { studentId: student.id, courseId: course.id, session: '2024/2025', semester: 1 },
              });
              regCount++;
            }
          }
        }
      }
      results.push(`✓ ${regCount} course registrations`);

      // ── Exam ───────────────────────────────────────────────────────────
      const EXAM_ID = '00000000-0000-0000-0000-000000000001';
      const exam = await prisma.exam.upsert({
        where: { id: EXAM_ID },
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
        where: { examId_invigilatorId: { examId: exam.id, invigilatorId: invigilator.id } },
        update: {},
        create: { examId: exam.id, invigilatorId: invigilator.id },
      });

      // ── Questions ──────────────────────────────────────────────────────
      const mcqData = [
        { body: 'Which data structure uses LIFO (Last In First Out) ordering?',      options: ['Queue', 'Stack', 'Linked List', 'Binary Tree'],                correct: 1 },
        { body: 'What is the time complexity of binary search on a sorted array?',   options: ['O(n)', 'O(n²)', 'O(log n)', 'O(1)'],                           correct: 2 },
        { body: 'Which sorting algorithm has the best average-case time complexity?', options: ['Bubble Sort', 'Insertion Sort', 'Merge Sort', 'Selection Sort'], correct: 2 },
        { body: 'A graph with no cycles is called a ___.',                           options: ['Complete Graph', 'Tree', 'Bipartite Graph', 'Directed Graph'],  correct: 1 },
        { body: 'Which traversal visits nodes in Left → Root → Right order?',        options: ['Preorder', 'Postorder', 'Inorder', 'Level Order'],              correct: 2 },
        { body: 'What is the worst-case time complexity of QuickSort?',              options: ['O(n log n)', 'O(n)', 'O(n²)', 'O(log n)'],                     correct: 2 },
        { body: 'Which data structure is used for implementing BFS?',                options: ['Stack', 'Queue', 'Heap', 'Priority Queue'],                     correct: 1 },
        { body: 'In a max-heap, the root node contains the ___ element.',            options: ['Smallest', 'Median', 'Largest', 'Random'],                     correct: 2 },
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
      // Delete in FK-safe order
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