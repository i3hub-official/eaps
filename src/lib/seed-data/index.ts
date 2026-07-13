// src/lib/seed-data/index.ts
import { CourseType } from '@prisma/client';
import { title } from 'process';

export const COLLEGES = [
  { code: 'CAERSE', name: 'College of Agricultural Economics, Rural Sociology & Extension', shortName: 'CAERSE' },
  { code: 'CASAP', name: 'College Of Animal Science & Animal Production', shortName: 'CASAP' },
  { code: 'CAFST', name: 'College Of Applied Food Science & Tourism', shortName: 'CAFST' },
  { code: 'CCSS', name: 'College Of Crop & Soil Sciences', shortName: 'CCSS' },
  { code: 'COED', name: 'College Of Education', shortName: 'COED' },
  { code: 'CEET', name: 'College Of Engineering & Engineering Technology', shortName: 'CEET' },
  { code: 'COLMAS', name: 'College Of Management Science', shortName: 'COLMAS' },
  { code: 'CNREM', name: 'College Of Natural Resources & Environmental Management', shortName: 'CNREM' },
  { code: 'COLNAS', name: 'College Of Natural Science', shortName: 'COLNAS' },
  { code: 'COLPAS', name: 'College Of Physical & Applied Science', shortName: 'COLPAS' },
  { code: 'CVM', name: 'College Of Veterinary Medicine', shortName: 'CVM' },
  { code: 'SGS', name: 'School Of General Studies', shortName: 'SGS' },
];

export const DEPARTMENTS = [
  // CAERSE
  { name: 'Agribusiness and Management', shortName: 'Agribusiness', code: 'AGB', collegeCode: 'CAERSE' },
  { name: 'Agricultural Economics', shortName: 'Ag Econ', code: 'AGE', collegeCode: 'CAERSE' },
  { name: 'Agricultural Extension and Rural Sociology', shortName: 'Ag Ext', code: 'AGX', collegeCode: 'CAERSE' },
  // CASAP
  { name: 'Animal Breeding And Physiology', shortName: 'Animal Breeding', code: 'ABP', collegeCode: 'CASAP' },
  { name: 'Animal Nutrition And Forage Science', shortName: 'Animal Nutrition', code: 'ANF', collegeCode: 'CASAP' },
  { name: 'Animal Production and Livestock Management', shortName: 'Animal Prod', code: 'APL', collegeCode: 'CASAP' },
  // CAFST
  { name: 'Human Nutrition and Dietetics', shortName: 'Human Nutrition', code: 'HND', collegeCode: 'CAFST' },
  { name: 'Home Science/Hospitality Management & Tourism', shortName: 'Home Science', code: 'HSM', collegeCode: 'CAFST' },
  { name: 'Food Science and Technology', shortName: 'Food Sci', code: 'FST', collegeCode: 'CAFST' },
  // CCSS
  { name: 'Agronomy', shortName: 'Agronomy', code: 'AGR', collegeCode: 'CCSS' },
  { name: 'Plant Health Management', shortName: 'Plant Health', code: 'PHM', collegeCode: 'CCSS' },
  { name: 'Soil Science and Meteorology', shortName: 'Soil Sci', code: 'SSM', collegeCode: 'CCSS' },
  { name: 'Water Resources Management and Agrometeorology', shortName: 'Water Res', code: 'WRM', collegeCode: 'CCSS' },
  // COED
  { name: 'Adult and Continuing Education', shortName: 'Adult Ed', code: 'ACE', collegeCode: 'COED' },
  { name: 'Agricultural/Home Science Education', shortName: 'Ag Ed', code: 'AHE', collegeCode: 'COED' },
  { name: 'Business Education', shortName: 'Bus Ed', code: 'BED', collegeCode: 'COED' },
  { name: 'Economics Education', shortName: 'Econ Ed', code: 'EED', collegeCode: 'COED' },
  { name: 'Education Management', shortName: 'Edu Mgmt', code: 'EDM', collegeCode: 'COED' },
  { name: 'Industrial Technology Education', shortName: 'Ind Tech', code: 'ITE', collegeCode: 'COED' },
  { name: 'Library and Information Science', shortName: 'Library Sci', code: 'LIS', collegeCode: 'COED' },
  { name: 'Guidance and Counselling', shortName: 'Guidance', code: 'GAC', collegeCode: 'COED' },
  { name: 'Integrated Science Education', shortName: 'Int Sci', code: 'ISE', collegeCode: 'COED' },
  // CEET
  { name: 'Agricultural and Bioresources Engineering', shortName: 'Ag Eng', code: 'ABE', collegeCode: 'CEET' },
  { name: 'Civil Engineering', shortName: 'Civ Eng', code: 'CVE', collegeCode: 'CEET' },
  { name: 'Chemical Engineering', shortName: 'Chem Eng', code: 'CHE', collegeCode: 'CEET' },
  { name: 'Computer Engineering', shortName: 'Comp Eng', code: 'CPE', collegeCode: 'CEET' },
  { name: 'Electrical and Electronics Engineering', shortName: 'EEE', code: 'EEE', collegeCode: 'CEET' },
  { name: 'Mechanical Engineering', shortName: 'Mech Eng', code: 'MEE', collegeCode: 'CEET' },
  // COLMAS
  { name: 'Marketing', shortName: 'Marketing', code: 'MKT', collegeCode: 'COLMAS' },
  { name: 'Accounting', shortName: 'Accounting', code: 'ACC', collegeCode: 'COLMAS' },
  { name: 'Banking and Finance', shortName: 'Banking', code: 'BNK', collegeCode: 'COLMAS' },
  { name: 'Economics', shortName: 'Economics', code: 'ECO', collegeCode: 'COLMAS' },
  { name: 'Industrial Relations and Personnel Management', shortName: 'IRPM', code: 'IRP', collegeCode: 'COLMAS' },
  { name: 'Entrepreneurial Studies', shortName: 'Entrepreneur', code: 'ENT', collegeCode: 'COLMAS' },
  { name: 'Business Administration', shortName: 'Bus Admin', code: 'BUS', collegeCode: 'COLMAS' },
  // CNREM
  { name: 'Environment Management and Toxicology', shortName: 'Env Tox', code: 'EMT', collegeCode: 'CNREM' },
  { name: 'Fisheries and Aquatic Resources Management', shortName: 'Fisheries', code: 'FAR', collegeCode: 'CNREM' },
  { name: 'Forestry and Environmental Management', shortName: 'Forestry', code: 'FRY', collegeCode: 'CNREM' },
  // COLNAS
  { name: 'Biochemistry', shortName: 'Biochem', code: 'BCH', collegeCode: 'COLNAS' },
  { name: 'Microbiology', shortName: 'Microbio', code: 'MCB', collegeCode: 'COLNAS' },
  { name: 'Plant Science and Biotechnology', shortName: 'Plant Sci', code: 'PSB', collegeCode: 'COLNAS' },
  { name: 'Zoology and Environmental Biology', shortName: 'Zoology', code: 'ZEB', collegeCode: 'COLNAS' },
  // COLPAS
  { name: 'Chemistry', shortName: 'Chemistry', code: 'CHM', collegeCode: 'COLPAS' },
  { name: 'Computer Science', shortName: 'Comp Sci', code: 'CSC', collegeCode: 'COLPAS' },
  { name: 'Geology', shortName: 'Geology', code: 'GEO', collegeCode: 'COLPAS' },
  { name: 'Mathematics', shortName: 'Maths', code: 'MTH', collegeCode: 'COLPAS' },
  { name: 'Physics', shortName: 'Physics', code: 'PHY', collegeCode: 'COLPAS' },
  { name: 'Statistics', shortName: 'Stats', code: 'STA', collegeCode: 'COLPAS' },
  // CVM
  { name: 'Theriogenology', shortName: 'Theriogenology', code: 'THE', collegeCode: 'CVM' },
  { name: 'Veterinary Anatomy', shortName: 'Vet Anatomy', code: 'VAN', collegeCode: 'CVM' },
  { name: 'Veterinary Medicine', shortName: 'Vet Medicine', code: 'VME', collegeCode: 'CVM' },
  { name: 'Veterinary Microbiology', shortName: 'Vet Microbio', code: 'VMB', collegeCode: 'CVM' },
  { name: 'Veterinary Public Health and Preventive Medicine', shortName: 'Vet Public Health', code: 'VPH', collegeCode: 'CVM' },
  { name: 'Veterinary Surgery and Radiology', shortName: 'Vet Surgery', code: 'VSR', collegeCode: 'CVM' },
  // SGS
  { name: 'English', shortName: 'English', code: 'ENG', collegeCode: 'SGS' },
  { name: 'French', shortName: 'French', code: 'FRE', collegeCode: 'SGS' },
  { name: 'German', shortName: 'German', code: 'GER', collegeCode: 'SGS' },
  { name: 'History', shortName: 'History', code: 'HIS', collegeCode: 'SGS' },
  { name: 'Social Science', shortName: 'Soc Sci', code: 'SOS', collegeCode: 'SGS' },
  { name: 'Physical and Health', shortName: 'Phys Ed', code: 'PHE', collegeCode: 'SGS' },
  { name: 'Philosophy', shortName: 'Philosophy', code: 'PHL', collegeCode: 'SGS' },
  { name: 'Peace and Conflict', shortName: 'Peace', code: 'PEC', collegeCode: 'SGS' },
];

export const LEVELS = [
  { name: 100, label: '100 Level' },
  { name: 200, label: '200 Level' },
];

export const COURSES = [
  // Computer Science
  { code: 'CSC112', title: 'Introduction to Computer Science', creditUnits: 3, level: 100, deptCode: 'CSC', type: CourseType.COMPULSORY },
  { code: 'CSC114', title: 'Programming Fundamentals', creditUnits: 3, level: 100, deptCode: 'CSC', type: CourseType.COMPULSORY },
  { code: 'CSC117', title: 'Discrete Mathematics', creditUnits: 2, level: 100, deptCode: 'CSC', type: CourseType.COMPULSORY },
  { code: 'CSC125', title: 'Introduction to Web Technologies', creditUnits: 3, level: 100, deptCode: 'CSC', type: CourseType.COMPULSORY },
  { code: 'CSC128', title: 'Computer Applications', creditUnits: 2, level: 100, deptCode: 'CSC', type: CourseType.COMPULSORY },
  { code: 'CSC211', title: 'Data Structures and Algorithms', creditUnits: 3, level: 200, deptCode: 'CSC', type: CourseType.COMPULSORY },
  { code: 'CSC216', title: 'Database Management Systems', creditUnits: 3, level: 200, deptCode: 'CSC', type: CourseType.COMPULSORY },
  { code: 'CSC218', title: 'Object-Oriented Programming', creditUnits: 3, level: 200, deptCode: 'CSC', type: CourseType.COMPULSORY },
  { code: 'CSC224', title: 'Computer Architecture', creditUnits: 2, level: 200, deptCode: 'CSC', type: CourseType.COMPULSORY },
  { code: 'CSC227', title: 'Operating Systems', creditUnits: 3, level: 200, deptCode: 'CSC', type: CourseType.COMPULSORY },
  // Mathematics
  { code: 'MTH111', title: 'Algebra and Trigonometry', creditUnits: 3, level: 100, deptCode: 'MTH', type: CourseType.COMPULSORY },
  { code: 'MTH115', title: 'Calculus I', creditUnits: 3, level: 100, deptCode: 'MTH', type: CourseType.COMPULSORY },
  { code: 'MTH118', title: 'Analytical Geometry', creditUnits: 2, level: 100, deptCode: 'MTH', type: CourseType.COMPULSORY },
  { code: 'MTH124', title: 'Calculus II', creditUnits: 3, level: 100, deptCode: 'MTH', type: CourseType.COMPULSORY },
  { code: 'MTH127', title: 'Introduction to Statistics', creditUnits: 2, level: 100, deptCode: 'MTH', type: CourseType.COMPULSORY },
  { code: 'MTH212', title: 'Linear Algebra I', creditUnits: 3, level: 200, deptCode: 'MTH', type: CourseType.COMPULSORY },
  { code: 'MTH216', title: 'Differential Equations', creditUnits: 3, level: 200, deptCode: 'MTH', type: CourseType.COMPULSORY },
  { code: 'MTH223', title: 'Linear Algebra II', creditUnits: 3, level: 200, deptCode: 'MTH', type: CourseType.COMPULSORY },
  { code: 'MTH226', title: 'Numerical Analysis', creditUnits: 3, level: 200, deptCode: 'MTH', type: CourseType.COMPULSORY },
  // Physics
   { code: 'PHY113', title: 'General Physics I', creditUnits: 3, level: 100, deptCode: 'PHY', type: CourseType.COMPULSORY },
  { code: 'PHY116', title: 'Practical Physics I', creditUnits: 2, level: 100, deptCode: 'PHY', type: CourseType.COMPULSORY },
  { code: 'PHY124', title: 'General Physics II', creditUnits: 3, level: 100, deptCode: 'PHY', type: CourseType.COMPULSORY },
  { code: 'PHY126', title: 'Practical Physics II', creditUnits: 2, level: 100, deptCode: 'PHY', type: CourseType.COMPULSORY },
  { code: 'PHY128', title: 'Introduction to Astronomy', creditUnits: 2, level: 100, deptCode: 'PHY', type: CourseType.ELECTIVE },
  { code: 'PHY111', title: 'Mechanics and Thermodynamics', creditUnits: 3, level: 100, deptCode: 'PHY', type: CourseType.ELECTIVE },
  { code: 'PHY127', title: 'Electricity I', creditUnits: 1, level: 100, deptCode: 'PHY', type: CourseType.ELECTIVE},
  { code: 'PHY215', title: 'Electromagnetism', creditUnits: 3, level: 200, deptCode: 'PHY', type: CourseType.COMPULSORY },
  { code: 'PHY224', title: 'Optics and Waves', creditUnits: 3, level: 200, deptCode: 'PHY', type: CourseType.COMPULSORY },
  { code: 'PHY228', title: 'Modern Physics', creditUnits: 3, level: 200, deptCode: 'PHY', type: CourseType.COMPULSORY },
  { code: 'PHY231', title: 'Practical Physics III', creditUnits: 2, level: 200, deptCode: 'PHY', type: CourseType.COMPULSORY },
  { code: 'PHY235', title: 'Introduction to Quantum Mechanics', creditUnits: 3, level: 200, deptCode: 'PHY', type: CourseType.ELECTIVE },
  // Agriculture
  { code: 'AGR112', title: 'Principles of Crop Production', creditUnits: 3, level: 100, deptCode: 'AGR', type: CourseType.COMPULSORY },
  { code: 'AGR115', title: 'Introduction to Agriculture', creditUnits: 2, level: 100, deptCode: 'AGR', type: CourseType.COMPULSORY },
  { code: 'AGR124', title: 'Soil Science Fundamentals', creditUnits: 3, level: 100, deptCode: 'AGR', type: CourseType.COMPULSORY },
  { code: 'AGR213', title: 'Soil Science', creditUnits: 3, level: 200, deptCode: 'AGR', type: CourseType.COMPULSORY },
  { code: 'AGR216', title: 'Crop Physiology', creditUnits: 3, level: 200, deptCode: 'AGR', type: CourseType.COMPULSORY },
  { code: 'AGR225', title: 'Agroecology', creditUnits: 3, level: 200, deptCode: 'AGR', type: CourseType.COMPULSORY },
  { code: 'AGR228', title: 'Agricultural Economics', creditUnits: 3, level: 200, deptCode: 'AGR', type: CourseType.COMPULSORY },
  // General Studies
  { code: 'GST111', title: 'Use of English I', creditUnits: 2, level: 100, deptCode: 'ENG', type: CourseType.GENERAL_STUDIES },
  { code: 'GST122', title: 'Use of English II', creditUnits: 2, level: 100, deptCode: 'ENG', type: CourseType.GENERAL_STUDIES },
  { code: 'GST213', title: 'Communication Skills', creditUnits: 2, level: 200, deptCode: 'ENG', type: CourseType.GENERAL_STUDIES },
  { code: 'GST224', title: 'Research Methodology', creditUnits: 2, level: 200, deptCode: 'ENG', type: CourseType.GENERAL_STUDIES },
];

export const ROLES = [
  { name: 'SUPER_ADMIN', displayName: 'Super Administrator', description: 'Full system access' },
  { name: 'VC', displayName: 'Vice Chancellor', description: 'University leadership' },
  { name: 'DVC', displayName: 'Deputy Vice Chancellor', description: 'University leadership' },
  { name: 'REGISTRAR', displayName: 'Registrar', description: 'University registrar' },
  { name: 'UNIVERSITY_EXAM_OFFICER', displayName: 'University Examination Officer', description: 'University-level exam oversight' },
  { name: 'UNIVERSITY_COURSE_COORDINATOR', displayName: 'University Course Coordinator', description: 'University-level course coordination' },
  { name: 'DEAN', displayName: 'Dean', description: 'College dean' },
  { name: 'HOD', displayName: 'Head of Department', description: 'Department head' },
  { name: 'COLLEGE_EXAM_OFFICER', displayName: 'College Examination Officer', description: 'College-level exam oversight' },
  { name: 'COLLEGE_COORDINATOR', displayName: 'College Coordinator', description: 'College-level coordination' },
  { name: 'DEPARTMENT_EXAM_OFFICER', displayName: 'Department Examination Officer', description: 'Department-level exam oversight' },
  { name: 'DEPARTMENT_COORDINATOR', displayName: 'Department Coordinator', description: 'Department-level coordination' },
  { name: 'LECTURER', displayName: 'Lecturer', description: 'Teaching staff' },
  { name: 'INVIGILATOR', displayName: 'Invigilator', description: 'Exam invigilator' },
];

// ============================================================
// GRADING
// ============================================================

/**
 * MOUAU 5-point grade scale.
 * Input: percentage (0–100). Points are on a 5.0 scale.
 * Use this at runtime (result computation, transcript finalization)
 * instead of manually looking up a grade band.
 */
export function mouauGrade(percentage: number): {
  grade: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  points: number;
  passed: boolean;
} {
  if (percentage >= 70) return { grade: 'A', points: 5.0, passed: true };
  if (percentage >= 60) return { grade: 'B', points: 4.0, passed: true };
  if (percentage >= 50) return { grade: 'C', points: 3.0, passed: true };
  if (percentage >= 45) return { grade: 'D', points: 2.0, passed: true };
  if (percentage >= 40) return { grade: 'E', points: 1.0, passed: true };
  return { grade: 'F', points: 0.0, passed: false };
}

/**
 * Grade band boundaries, derived from mouauGrade() so the DB-seeded
 * GradeScale rows can never drift out of sync with the runtime grading
 * logic above. Only consumed by the seed script (seed-missing/+server.ts §10)
 * to populate the GradeScale table — for actual grading, call
 * mouauGrade(percentage) directly rather than looking up GRADE_SCALE.
 */
const GRADE_BANDS: {
  label: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  minPercent: number;
  maxPercent: number;
  description: string;
}[] = [
  { label: 'A', minPercent: 70, maxPercent: 100,   description: 'Excellent' },
  { label: 'B', minPercent: 60, maxPercent: 69.99, description: 'Very Good' },
  { label: 'C', minPercent: 50, maxPercent: 59.99, description: 'Good' },
  { label: 'D', minPercent: 45, maxPercent: 49.99, description: 'Fair' },
  { label: 'E', minPercent: 40, maxPercent: 44.99, description: 'Pass' },
  { label: 'F', minPercent: 0,  maxPercent: 39.99, description: 'Fail' },
];

export const GRADE_SCALE = GRADE_BANDS.map((band) => ({
  label: band.label,
  minPercent: band.minPercent,
  maxPercent: band.maxPercent,
  points: mouauGrade(band.minPercent).points,
  description: band.description,
}));