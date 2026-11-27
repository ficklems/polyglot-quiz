import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { ContentBundle } from '../content/load-content';
import { migrateFromV1, needsV1Migration } from './migrate-v1';
import { rebuildRoundTables } from './rebuild-round-tables';
import { syncContent } from './sync-content';

export type Database = DatabaseSync;

/**
 * v1 = milestones 0–2 (3 topics, 45 questions). v2 = imported content dataset.
 * v3 = rounds and leaderboard entries for themed quizzes and custom selections.
 */
export const SCHEMA_VERSION = 3;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS categories (
    id            TEXT PRIMARY KEY,
    sort_order    INTEGER NOT NULL,
    names         TEXT NOT NULL,  -- JSON { uk, en, pl }
    subcategories TEXT NOT NULL   -- JSON string[]
  );

  CREATE TABLE IF NOT EXISTS questions (
    id            TEXT PRIMARY KEY,
    fact_key      TEXT NOT NULL,
    category_id   TEXT NOT NULL REFERENCES categories(id),
    subcategory   TEXT NOT NULL,
    region        TEXT NOT NULL,
    difficulty    TEXT NOT NULL,
    type          TEXT NOT NULL,
    tags          TEXT NOT NULL,  -- JSON string[]
    review_status TEXT NOT NULL,
    origin        TEXT NOT NULL,  -- dataset | legacy
    -- JSON { localizations, answer, geo?, emoji? }. Source metadata stays in content/ for audit.
    payload       TEXT NOT NULL,
    -- JSON { uk: reason[], en: reason[], pl: reason[] }; empty list = served in that language.
    exclusions    TEXT NOT NULL,
    serve_uk      INTEGER NOT NULL,
    serve_en      INTEGER NOT NULL,
    serve_pl      INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS questions_by_category ON questions (category_id, type);

  CREATE TABLE IF NOT EXISTS rounds (
    id                 TEXT PRIMARY KEY,
    -- A topic round has topic_id, a themed quiz has collection_id, a custom mix has neither.
    topic_id           TEXT REFERENCES categories(id),
    collection_id      TEXT,
    selection          TEXT,  -- JSON Selection, for custom mixes
    ranked             INTEGER NOT NULL DEFAULT 1,
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

  CREATE TABLE IF NOT EXISTS leaderboard_entries (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    -- UNIQUE: one leaderboard entry per round.
    round_id        TEXT NOT NULL UNIQUE REFERENCES rounds(id),
    nickname        TEXT NOT NULL,
    -- The board: exactly one of topic_id / collection_id.
    topic_id        TEXT REFERENCES categories(id),
    collection_id   TEXT,
    score           INTEGER NOT NULL,
    correct_count   INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    created_at      INTEGER NOT NULL,
    CHECK ((topic_id IS NULL) <> (collection_id IS NULL))
  );

  CREATE INDEX IF NOT EXISTS leaderboard_by_topic
    ON leaderboard_entries (topic_id, score DESC, created_at, id);
  CREATE INDEX IF NOT EXISTS leaderboard_by_collection
    ON leaderboard_entries (collection_id, score DESC, created_at, id);
`;

/**
 * Opens (or creates) the database, migrates a v1 database, applies the schema and brings
 * the questions in line with the content bundle. `:memory:` gives every caller a fresh,
 * isolated database, which is what tests want.
 */
export function openDatabase(path: string, content: ContentBundle): Database {
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true });
  }

  const db = new DatabaseSync(path);
  // Off while the structure changes; checked explicitly before turning it back on.
  db.exec('PRAGMA foreign_keys = OFF;');

  if (needsV1Migration(db)) {
    migrateFromV1(db, content, SCHEMA);
  } else if (userVersion(db) === 2) {
    rebuildRoundTables(db, SCHEMA);
  }
  db.exec(SCHEMA);
  syncContent(db, content);
  db.exec(`PRAGMA user_version = ${SCHEMA_VERSION};`);

  const violations = db.prepare('PRAGMA foreign_key_check').all();
  if (violations.length > 0) {
    throw new Error(`Database has ${violations.length} broken references after migration`);
  }
  db.exec('PRAGMA foreign_keys = ON;');
  return db;
}

function userVersion(db: DatabaseSync): number {
  return (db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;
}
