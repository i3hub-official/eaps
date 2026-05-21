// Central DB barrel — import everything from here
export { prisma, sql, withTransaction } from './index.js';
export * from './users.js';
export * from './exams.js';
export * from './questions.js';
export * from './sessions.js';
export * from './violations.js';
export * from './results.js';
