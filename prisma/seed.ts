// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import { config } from 'dotenv';

// Load .env before anything else — Prisma reads DATABASE_URL from process.env
config();

const scryptAsync = promisify(scrypt);

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set in .env');

// In Prisma v6+, just use new PrismaClient() — it reads DATABASE_URL from env automatically
const prisma = new PrismaClient({ log: ['warn', 'error'] });

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString('hex')}`;
}

async function main() {
  console.log('🌱 Seeding MOUAU eTest...');

  // ── Faculties ──────────────────────────────────────────────────────────────
  const faculties = await Promise.all([
    prisma.faculty.upsert({ where: { code: 'COLNAS' }, update: {}, create: { name: 'College of Natural Sciences', code: 'COLNAS' } }),
    prisma.faculty.upsert({ where: { code: 'CEET' },   update: {}, create: { name: 'College of Engineering and Engineering Technology', code: 'CEET' } }),
    prisma.faculty.upsert({ where: { code: 'COLVET' }, update: {}, create: { name: 'College of Veterinary Medicine', code: 'COLVET' } }),
    prisma.faculty.upsert({ where: { code: 'COLPAS' }, update: {}, create: { name: 'College of Physical and Applied Sciences', code: 'COLPAS' } }),
    prisma.faculty.upsert({ where: { code: 'COLMGT' }, update: {}, create: { name: 'College of Management Sciences', code: 'COLMGT' } }),
  ]);

  console.log(`  ✓ ${faculties.length} faculties`);
  const [colnas, coleng, colvet, colpas, colmgt] = faculties;

  // ── Departments ────────────────────────────────────────────────────────────
  const depts = await Promise.all([
    prisma.department.upsert({ where: { code: 'CSC' }, update: {}, create: { name: 'Computer Science',          code: 'CSC', facultyId: colnas.id } }),
    prisma.department.upsert({ where: { code: 'MTH' }, update: {}, create: { name: 'Mathematics',               code: 'MTH', facultyId: colnas.id } }),
    prisma.department.upsert({ where: { code: 'PHY' }, update: {}, create: { name: 'Physics',                   code: 'PHY', facultyId: colnas.id } }),
    prisma.department.upsert({ where: { code: 'CHM' }, update: {}, create: { name: 'Chemistry',                 code: 'CHM', facultyId: colnas.id } }),
    prisma.department.upsert({ where: { code: 'BIO' }, update: {}, create: { name: 'Biology',                   code: 'BIO', facultyId: colnas.id } }),
    prisma.department.upsert({ where: { code: 'CVE' }, update: {}, create: { name: 'Civil Engineering',         code: 'CVE', facultyId: coleng.id } }),
    prisma.department.upsert({ where: { code: 'EEE' }, update: {}, create: { name: 'Electrical Engineering',    code: 'EEE', facultyId: coleng.id } }),
    prisma.department.upsert({ where: { code: 'MCE' }, update: {}, create: { name: 'Mechanical Engineering',    code: 'MCE', facultyId: coleng.id } }),
    prisma.department.upsert({ where: { code: 'AGE' }, update: {}, create: { name: 'Agricultural Engineering',  code: 'AGE', facultyId: coleng.id } }),
    prisma.department.upsert({ where: { code: 'VPH' }, update: {}, create: { name: 'Veterinary Public Health',  code: 'VPH', facultyId: colvet.id } }),
    prisma.department.upsert({ where: { code: 'VAM' }, update: {}, create: { name: 'Veterinary Anatomy',        code: 'VAM', facultyId: colvet.id } }),
    prisma.department.upsert({ where: { code: 'AGR' }, update: {}, create: { name: 'Agronomy',                  code: 'AGR', facultyId: colpas.id } }),
    prisma.department.upsert({ where: { code: 'ANS' }, update: {}, create: { name: 'Animal Science',            code: 'ANS', facultyId: colpas.id } }),
    prisma.department.upsert({ where: { code: 'FST' }, update: {}, create: { name: 'Food Science & Technology', code: 'FST', facultyId: colpas.id } }),
    prisma.department.upsert({ where: { code: 'ACC' }, update: {}, create: { name: 'Accountancy',               code: 'ACC', facultyId: colmgt.id } }),
    prisma.department.upsert({ where: { code: 'BUS' }, update: {}, create: { name: 'Business Administration',   code: 'BUS', facultyId: colmgt.id } }),
  ]);

  console.log(`  ✓ ${depts.length} departments`);

  const csc = depts.find(d => d.code === 'CSC')!;
  const mth = depts.find(d => d.code === 'MTH')!;

  // ── Users ──────────────────────────────────────────────────────────────────
  const [adminPass, lecturerPass, invigilatorPass, studentPass] = await Promise.all([
    hashPassword('admin123'),
    hashPassword('lecturer123'),
    hashPassword('invigilator123'),
    hashPassword('student123'),
  ]);

  await prisma.user.upsert({
    where: { email: 'admin@mouau.edu.ng' }, update: {},
    create: { email: 'admin@mouau.edu.ng', fullName: 'System Administrator', passwordHash: adminPass, role: 'admin', staffId: 'ADM001' },
  });

  const lecturer1 = await prisma.user.upsert({
    where: { email: 'dr.okafor@mouau.edu.ng' }, update: {},
    create: { email: 'dr.okafor@mouau.edu.ng', fullName: 'Dr. Emeka Okafor', passwordHash: lecturerPass, role: 'lecturer', staffId: 'LCT001', departmentId: csc.id },
  });

  await prisma.user.upsert({
    where: { email: 'prof.nwosu@mouau.edu.ng' }, update: {},
    create: { email: 'prof.nwosu@mouau.edu.ng', fullName: 'Prof. Adaeze Nwosu', passwordHash: lecturerPass, role: 'lecturer', staffId: 'LCT002', departmentId: mth.id },
  });

  const invigilator = await prisma.user.upsert({
    where: { email: 'invig1@mouau.edu.ng' }, update: {},
    create: { email: 'invig1@mouau.edu.ng', fullName: 'Mr. Chidi Eze', passwordHash: invigilatorPass, role: 'invigilator', staffId: 'INV001', departmentId: csc.id },
  });

  const studentData = [
    { email: 'alice.obi@student.mouau.edu.ng',     fullName: 'Alice Obi',      matric: '2021/CSC/001', level: 300 },
    { email: 'bob.nwachukwu@student.mouau.edu.ng', fullName: 'Bob Nwachukwu',  matric: '2021/CSC/002', level: 300 },
    { email: 'chidi.okeke@student.mouau.edu.ng',   fullName: 'Chidi Okeke',    matric: '2021/CSC/003', level: 300 },
    { email: 'dalu.eze@student.mouau.edu.ng',      fullName: 'Dalu Eze',       matric: '2021/CSC/004', level: 300 },
    { email: 'emeka.agu@student.mouau.edu.ng',     fullName: 'Emeka Agu',      matric: '2022/CSC/001', level: 200 },
    { email: 'funke.adeyemi@student.mouau.edu.ng', fullName: 'Funke Adeyemi',  matric: '2022/CSC/002', level: 200 },
    { email: 'grace.uko@student.mouau.edu.ng',     fullName: 'Grace Uko',      matric: '2020/CSC/001', level: 400 },
    { email: 'henry.dim@student.mouau.edu.ng',     fullName: 'Henry Dim',      matric: '2020/CSC/002', level: 400 },
    { email: 'ifeoma.ogu@student.mouau.edu.ng',    fullName: 'Ifeoma Ogu',     matric: '2023/CSC/001', level: 100 },
    { email: 'james.oti@student.mouau.edu.ng',     fullName: 'James Oti',      matric: '2023/CSC/002', level: 100 },
  ];

  const students = await Promise.all(studentData.map(s =>
    prisma.user.upsert({
      where: { email: s.email }, update: {},
      create: { email: s.email, fullName: s.fullName, passwordHash: studentPass, role: 'student', matricNumber: s.matric, departmentId: csc.id, level: s.level },
    })
  ));

  console.log(`  ✓ ${students.length + 4} users`);

  // ── Courses ────────────────────────────────────────────────────────────────
  const csc301 = await prisma.course.upsert({
    where: { code: 'CSC301' }, update: {},
    create: { code: 'CSC301', title: 'Data Structures & Algorithms', departmentId: csc.id, creditUnits: 3, level: 300 },
  });

  const csc201 = await prisma.course.upsert({
    where: { code: 'CSC201' }, update: {},
    create: { code: 'CSC201', title: 'Object Oriented Programming', departmentId: csc.id, creditUnits: 3, level: 200 },
  });

  await prisma.course.upsert({
    where: { code: 'MTH201' }, update: {},
    create: { code: 'MTH201', title: 'Mathematical Methods', departmentId: mth.id, creditUnits: 3, level: 200 },
  });

  console.log('  ✓ 3 courses');

  // ── Course registrations ───────────────────────────────────────────────────
  const level300 = students.filter(s => s.level === 300);
  const level200 = students.filter(s => s.level === 200);

  await Promise.all([
    ...level300.map(s => prisma.courseRegistration.upsert({
      where: { studentId_courseId_session_semester: { studentId: s.id, courseId: csc301.id, session: '2024/2025', semester: 1 } },
      update: {}, create: { studentId: s.id, courseId: csc301.id, session: '2024/2025', semester: 1 },
    })),
    ...level200.map(s => prisma.courseRegistration.upsert({
      where: { studentId_courseId_session_semester: { studentId: s.id, courseId: csc201.id, session: '2024/2025', semester: 1 } },
      update: {}, create: { studentId: s.id, courseId: csc201.id, session: '2024/2025', semester: 1 },
    })),
  ]);

  console.log('  ✓ Course registrations');

  // ── Exam ───────────────────────────────────────────────────────────────────
  const exam = await prisma.exam.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      courseId: csc301.id, createdBy: lecturer1.id,
      title: 'CSC301 — First Semester Examination',
      instructions: 'Answer all questions. No external resources. Time limit strictly enforced.',
      durationMinutes: 60, totalMarks: 40, passMark: 20,
      status: 'active',
      scheduledStart: new Date(),
      scheduledEnd: new Date(Date.now() + 2 * 60 * 60 * 1000),
      randomizeQuestions: true, randomizeOptions: true,
      showResultAfter: true, maxViolations: 5,
      session: '2024/2025', semester: 1,
    },
  });

  await prisma.examInvigilator.upsert({
    where: { examId_invigilatorId: { examId: exam.id, invigilatorId: invigilator.id } },
    update: {}, create: { examId: exam.id, invigilatorId: invigilator.id },
  });

  // ── Questions ──────────────────────────────────────────────────────────────
  const mcqData = [
    { body: 'Which data structure uses LIFO (Last In First Out) ordering?',
      options: [{ optionText: 'Queue', isCorrect: false }, { optionText: 'Stack', isCorrect: true }, { optionText: 'Linked List', isCorrect: false }, { optionText: 'Binary Tree', isCorrect: false }] },
    { body: 'What is the time complexity of binary search on a sorted array?',
      options: [{ optionText: 'O(n)', isCorrect: false }, { optionText: 'O(n²)', isCorrect: false }, { optionText: 'O(log n)', isCorrect: true }, { optionText: 'O(1)', isCorrect: false }] },
    { body: 'Which sorting algorithm has the best average-case time complexity?',
      options: [{ optionText: 'Bubble Sort', isCorrect: false }, { optionText: 'Insertion Sort', isCorrect: false }, { optionText: 'Merge Sort', isCorrect: true }, { optionText: 'Selection Sort', isCorrect: false }] },
    { body: 'A graph with no cycles is called a ___.',
      options: [{ optionText: 'Complete Graph', isCorrect: false }, { optionText: 'Tree', isCorrect: true }, { optionText: 'Bipartite Graph', isCorrect: false }, { optionText: 'Directed Graph', isCorrect: false }] },
    { body: 'Which traversal visits nodes in Left → Root → Right order?',
      options: [{ optionText: 'Preorder', isCorrect: false }, { optionText: 'Postorder', isCorrect: false }, { optionText: 'Inorder', isCorrect: true }, { optionText: 'Level Order', isCorrect: false }] },
    { body: 'What is the worst-case time complexity of QuickSort?',
      options: [{ optionText: 'O(n log n)', isCorrect: false }, { optionText: 'O(n)', isCorrect: false }, { optionText: 'O(n²)', isCorrect: true }, { optionText: 'O(log n)', isCorrect: false }] },
    { body: 'Which data structure is used for implementing BFS?',
      options: [{ optionText: 'Stack', isCorrect: false }, { optionText: 'Queue', isCorrect: true }, { optionText: 'Heap', isCorrect: false }, { optionText: 'Priority Queue', isCorrect: false }] },
    { body: 'In a max-heap, the root node contains the ___ element.',
      options: [{ optionText: 'Smallest', isCorrect: false }, { optionText: 'Median', isCorrect: false }, { optionText: 'Largest', isCorrect: true }, { optionText: 'Random', isCorrect: false }] },
  ];

  const fitbData = [
    { body: 'The process of removing an element from a stack is called ___.', answer: 'popping'    },
    { body: 'A hash table resolves collisions using chaining or open ___.', answer: 'addressing' },
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
          options: { create: q.options.map((o, j) => ({ ...o, orderIndex: j })) },
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
          orderIndex: mcqData.length + i,
          fitbAnswers: { create: [{ acceptedAnswer: q.answer, isPrimary: true }] },
        },
      });
      qCount++;
    }
  }

  console.log(`  ✓ ${qCount} questions (8 MCQ + 4 FITB)`);

  console.log('\n✅ Seed complete!\n');
  console.log('  ┌─────────────────────────────────────────────────────────┐');
  console.log('  │  admin@mouau.edu.ng              → admin123             │');
  console.log('  │  dr.okafor@mouau.edu.ng          → lecturer123          │');
  console.log('  │  invig1@mouau.edu.ng             → invigilator123       │');
  console.log('  │  alice.obi@student.mouau.edu.ng  → student123           │');
  console.log('  └─────────────────────────────────────────────────────────┘');
  console.log('\n  Active exam ID: 00000000-0000-0000-0000-000000000001\n');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());