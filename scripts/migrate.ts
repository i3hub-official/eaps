import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
});

const sql = fs.readFileSync(path.resolve('prisma/schema.sql'), 'utf-8');

await client.connect();

// Wipe everything cleanly before re-applying
await client.query(`
  DO $$ DECLARE
    r RECORD;
  BEGIN
    -- Drop all tables
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
      EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;

    -- Drop all views
    FOR r IN (SELECT viewname FROM pg_views WHERE schemaname = 'public') LOOP
      EXECUTE 'DROP VIEW IF EXISTS ' || quote_ident(r.viewname) || ' CASCADE';
    END LOOP;

    -- Drop all custom types (enums)
    FOR r IN (SELECT typname FROM pg_type WHERE typtype = 'e' AND typnamespace = 'public'::regnamespace) LOOP
      EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(r.typname) || ' CASCADE';
    END LOOP;

    -- Drop all functions
    FOR r IN (
      SELECT proname, oid, pg_get_function_identity_arguments(oid) AS args
      FROM pg_proc
      WHERE pronamespace = 'public'::regnamespace
    ) LOOP
      EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.proname) || '(' || r.args || ') CASCADE';
    END LOOP;
  END $$;
`);

console.log('Wiped existing schema.');

await client.query(sql);
await client.end();

console.log('Schema applied successfully.');