import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { seedTopics } from './seed/topics';

export type Database = DatabaseSync;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS topics (
    id         TEXT PRIMARY KEY,
    sort_order INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS topic_translations (
    topic_id    TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    lang        TEXT NOT NULL CHECK (lang IN ('uk', 'en', 'pl')),
    name        TEXT NOT NULL,
    description TEXT NOT NULL,
    PRIMARY KEY (topic_id, lang)
  );
`;

/**
 * Opens (or creates) the SQLite database, applies the schema and seeds it when empty.
 * `:memory:` gives every caller a fresh, isolated database, which is what tests want.
 */
export function openDatabase(path: string): Database {
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true });
  }

  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);

  const { count } = db.prepare('SELECT COUNT(*) AS count FROM topics').get() as { count: number };
  if (count === 0) {
    seedTopics(db);
  }

  return db;
}
