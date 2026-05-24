// prisma/apply-sql.ts
import pg from 'pg';
import fs from 'fs';
import path from 'path';
// import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

// const __dirname = path.dirname(fileURLToPath(import.meta.url));

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
});

/**
 * Split SQL into executable statements, properly handling:
 * - Dollar-quoted strings ($$ ... $$, $tag$ ... $tag$)
 * - Single-quoted strings (' ... ')
//  * - Line comments (-- ... */

function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let i = 0;

  while (i < sql.length) {
    const ch = sql[i];
    const next = sql[i + 1];

    // Line comment -- skip to end of line
    if (ch === '-' && next === '-') {
      while (i < sql.length && sql[i] !== '\n') i++;
      continue;
    }

    // Block comment /* ... */
    if (ch === '/' && next === '*') {
      i += 2;
      while (i < sql.length - 1 && !(sql[i] === '*' && sql[i + 1] === '/')) i++;
      i += 2;
      continue;
    }

    // Dollar-quoted string ($tag$ ... $tag$)
    if (ch === '$') {
      const tagMatch = sql.slice(i).match(/^\$([a-zA-Z0-9_]*)\$/);
      if (tagMatch) {
        const tag = tagMatch[1];
        const endTag = `$${tag}$`;
        current += tagMatch[0];
        i += tagMatch[0].length;
        const endIdx = sql.indexOf(endTag, i);
        if (endIdx === -1) throw new Error(`Unclosed dollar quote: ${endTag}`);
        current += sql.slice(i, endIdx + endTag.length);
        i = endIdx + endTag.length;
        continue;
      }
    }

    // Single-quoted string
    if (ch === "'") {
      current += ch;
      i++;
      while (i < sql.length) {
        if (sql[i] === "'" && sql[i + 1] === "'") {
          current += "''";
          i += 2;
        } else if (sql[i] === "'") {
          current += "'";
          i++;
          break;
        } else {
          current += sql[i];
          i++;
        }
      }
      continue;
    }

    // Semicolon = end of statement
    if (ch === ';') {
      current += ch;
      const trimmed = current.trim();
      if (trimmed.length > 0) {
        statements.push(trimmed);
      }
      current = '';
      i++;
      continue;
    }

    current += ch;
    i++;
  }

  // Catch any trailing statement without semicolon
  const trimmed = current.trim();
  if (trimmed.length > 0) {
    statements.push(trimmed);
  }

  return statements;
}

async function applySqlFile(filePath: string, label: string) {
  const fullPath = path.resolve(filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  ${label} not found at ${fullPath}, skipping.`);
    return;
  }

  const sql = fs.readFileSync(fullPath, 'utf-8');
  const statements = splitStatements(sql).filter(s => s.length > 0);

  console.log(`📄 Applying ${label} (${statements.length} statements)...`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await client.query(stmt);
    } catch (err: any) {
      // Ignore "already exists" errors
      if (err.code === '42710' || err.message?.includes('already exists')) {
        console.log(`   ⏭️  Statement ${i + 1}: already exists, skipping`);
        continue;
      }
      // Ignore "does not exist" drops
      if (err.code === '42704' || err.message?.includes('does not exist')) {
        console.log(`   ⏭️  Statement ${i + 1}: does not exist, skipping`);
        continue;
      }
      console.error(`   ❌ Statement ${i + 1} failed:`, err.message);
      console.error(`      SQL: ${stmt.slice(0, 200)}...`);
      throw err;
    }
  }

  console.log(`✅ ${label} applied.`);
}

async function main() {
  await client.connect();
  console.log('🔌 Connected to database.\n');

  await applySqlFile('prisma/migrations/face_descriptors.sql', 'face_descriptors.sql');
  console.log('Face descriptor schema applied.\n');
  await applySqlFile('prisma/migrations/face_similarity.sql', 'face_similarity.sql');
  console.log('Similarity flags schema applied.\n');

  await client.end();
  console.log('\n🎉 All SQL scripts applied successfully.');
}

main().catch((err) => {
  console.error('\n💥 Failed:', err.message);
  client.end();
  process.exit(1);
});