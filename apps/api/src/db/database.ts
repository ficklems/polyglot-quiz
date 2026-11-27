import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { seedQuestions } from './seed/seed-questions';
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

  CREATE TABLE IF NOT EXISTS questions (
    id             TEXT PRIMARY KEY,
    topic_id       TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    correct_option TEXT NOT NULL CHECK (correct_option IN ('a', 'b', 'c', 'd'))
  );

  CREATE TABLE IF NOT EXISTS question_texts (
    question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    lang        TEXT NOT NULL CHECK (lang IN ('uk', 'en', 'pl')),
    text        TEXT NOT NULL,
    PRIMARY KEY (question_id, lang)
  );

  CREATE TABLE IF NOT EXISTS question_options (
    question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    option_id   TEXT NOT NULL CHECK (option_id IN ('a', 'b', 'c', 'd')),
    lang        TEXT NOT NULL CHECK (lang IN ('uk', 'en', 'pl')),
    text        TEXT NOT NULL,
    PRIMARY KEY (question_id, option_id, lang)
  );

  CREATE TABLE IF NOT EXISTS rounds (
    id                 TEXT PRIMARY KEY,
    topic_id           TEXT NOT NULL REFERENCES topics(id),
    lang               TEXT NOT NULL,
    score              INTEGER NOT NULL DEFAULT 0,
    created_at         INTEGER NOT NULL,
    -- When the current question was shown; used to enforce the time limit.
    -- NULL between an answer and the player moving on to the next question.
    current_started_at INTEGER,
    finished_at        INTEGER
  );

  CREATE TABLE IF NOT EXISTS round_questions (
    round_id        TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    position        INTEGER NOT NULL,
    question_id     TEXT NOT NULL REFERENCES questions(id),
    -- JSON array with the shuffled order of option ids shown to the player.
    option_order    TEXT NOT NULL,
    answered_option TEXT,
    timed_out       INTEGER NOT NULL DEFAULT 0,
    is_correct      INTEGER,
    answered_at     INTEGER,
    PRIMARY KEY (round_id, position)
  );
`;

function isEmpty(db: DatabaseSync, table: 'topics' | 'questions'): boolean {
  const row = db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number };
  return row.count === 0;
}

/**
 * Opens (or creates) the SQLite database, applies the schema and seeds empty tables.
 * `:memory:` gives every caller a fresh, isolated database, which is what tests want.
 */
export function openDatabase(path: string): Database {
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true });
  }

  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);

  if (isEmpty(db, 'topics')) seedTopics(db);
  if (isEmpty(db, 'questions')) seedQuestions(db);

  return db;
}
