import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase, SCHEMA_VERSION } from '../src/db/database';
import { FIXTURE } from './helpers';

// The database layout of milestones 0–2, as it was shipped.
const V1_SCHEMA = `
  CREATE TABLE topics (id TEXT PRIMARY KEY, sort_order INTEGER NOT NULL);
  CREATE TABLE topic_translations (topic_id TEXT, lang TEXT, name TEXT, description TEXT);
  CREATE TABLE questions (id TEXT PRIMARY KEY, topic_id TEXT REFERENCES topics(id), correct_option TEXT);
  CREATE TABLE question_texts (question_id TEXT, lang TEXT, text TEXT);
  CREATE TABLE question_options (question_id TEXT, option_id TEXT, lang TEXT, text TEXT);
  CREATE TABLE rounds (id TEXT PRIMARY KEY, topic_id TEXT NOT NULL REFERENCES topics(id), lang TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, current_started_at INTEGER, finished_at INTEGER);
  CREATE TABLE round_questions (round_id TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    position INTEGER NOT NULL, question_id TEXT NOT NULL REFERENCES questions(id), option_order TEXT NOT NULL,
    answered_option TEXT, timed_out INTEGER NOT NULL DEFAULT 0, is_correct INTEGER, answered_at INTEGER,
    PRIMARY KEY (round_id, position));
  CREATE TABLE leaderboard_entries (id INTEGER PRIMARY KEY AUTOINCREMENT, round_id TEXT NOT NULL UNIQUE REFERENCES rounds(id),
    nickname TEXT NOT NULL, topic_id TEXT NOT NULL REFERENCES topics(id), score INTEGER NOT NULL,
    correct_count INTEGER NOT NULL, total_questions INTEGER NOT NULL, created_at INTEGER NOT NULL);
  CREATE INDEX leaderboard_by_topic ON leaderboard_entries (topic_id, score DESC, created_at, id);
  INSERT INTO topics VALUES ('music-decades', 0);
  INSERT INTO questions VALUES ('music-02', 'music-decades', 'b'), ('music-77', 'music-decades', 'a');
  INSERT INTO rounds VALUES ('r1', 'music-decades', 'pl', 100, 1, NULL, 2);
  INSERT INTO round_questions VALUES
    ('r1', 0, 'music-02', '["c","a","d","b"]', 'b', 0, 1, 2),
    ('r1', 1, 'music-77', '["a","b","c","d"]', 'a', 0, 1, 3);
  INSERT INTO leaderboard_entries VALUES (1, 'r1', 'Ola', 'music-decades', 100, 1, 2, 5);
`;

let dir: string;
afterEach(() => rmSync(dir, { recursive: true, force: true }));

function v1Database(): string {
  dir = mkdtempSync(join(tmpdir(), 'pq-migration-'));
  const path = join(dir, 'quiz.db');
  const db = new DatabaseSync(path);
  db.exec(V1_SCHEMA);
  db.close();
  return path;
}

// Pretend the content retired "music-77" as a duplicate of "music-01".
const content = { ...FIXTURE, duplicateMap: [{ retiredId: 'music-77', keptId: 'music-01' }] };

describe('migration from the v1 database', () => {
  it('keeps played rounds and leaderboard entries, remapping ids', () => {
    const db = openDatabase(v1Database(), content);

    expect(db.prepare('PRAGMA user_version').get()).toEqual({ user_version: SCHEMA_VERSION });
    expect(db.prepare('SELECT topic_id, score FROM rounds').all()).toEqual([
      { topic_id: 'music', score: 100 },
    ]);
    expect(db.prepare('SELECT topic_id, nickname FROM leaderboard_entries').all()).toEqual([
      { topic_id: 'music', nickname: 'Ola' },
    ]);

    const rows = db
      .prepare(
        'SELECT question_id, option_order, answered_option, is_correct FROM round_questions ORDER BY position',
      )
      .all();
    expect(rows).toEqual([
      // Kept legacy question: letters become content option ids.
      {
        question_id: 'music-02',
        option_order: '["o3","o1","o4","o2"]',
        answered_option: 'o2',
        is_correct: 1,
      },
      // Retired duplicate: points at the kept record, correctness preserved.
      {
        question_id: 'music-01',
        option_order: '["o1","o2","o3","o4"]',
        answered_option: 'o1',
        is_correct: 1,
      },
    ]);
    db.close();
  });

  it('drops the v1 question tables and leaves no broken references', () => {
    const db = openDatabase(v1Database(), content);
    const tables = (
      db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]
    ).map((t) => t.name);

    expect(tables).not.toContain('topics');
    expect(tables).not.toContain('question_texts');
    expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    db.close();
  });

  it('is idempotent: opening the migrated database again changes nothing', () => {
    const path = v1Database();
    openDatabase(path, content).close();
    const db = openDatabase(path, content);

    expect(db.prepare('SELECT COUNT(*) AS n FROM round_questions').get()).toEqual({ n: 2 });
    db.close();
  });
});

describe('content sync', () => {
  it('marks a question that left the content as no longer served instead of deleting it', () => {
    const path = v1Database();
    openDatabase(path, content).close();
    const smaller = {
      ...content,
      version: 'smaller',
      questions: content.questions.filter((q) => q.record.id !== 'music-02'),
    };

    const db = openDatabase(path, smaller);

    expect(db.prepare("SELECT serve_en FROM questions WHERE id = 'music-02'").get()).toEqual({
      serve_en: 0,
    });
    db.close();
  });
});
