import type { DatabaseSync } from 'node:sqlite';

/**
 * Recreates `rounds` and `leaderboard_entries` with the current definitions (from `schema`)
 * and copies the rows over. Needed when a column's constraints change, which SQLite's
 * ALTER TABLE can't do. Columns that didn't exist before get their defaults.
 * legacy_alter_table keeps the rename from rewriting references in round_questions, which
 * must keep pointing at "rounds".
 */
export function rebuildRoundTables(db: DatabaseSync, schema: string): void {
  db.exec(`
    PRAGMA legacy_alter_table = ON;
    DROP INDEX IF EXISTS leaderboard_by_topic;
    DROP INDEX IF EXISTS leaderboard_by_collection;
    ALTER TABLE rounds RENAME TO rounds_old;
    ALTER TABLE leaderboard_entries RENAME TO leaderboard_old;
  `);
  db.exec(schema);
  db.exec(`
    INSERT INTO rounds (id, topic_id, lang, score, created_at, current_started_at, finished_at)
      SELECT id, topic_id, lang, score, created_at, current_started_at, finished_at FROM rounds_old;
    INSERT INTO leaderboard_entries
      (id, round_id, nickname, topic_id, score, correct_count, total_questions, created_at)
      SELECT id, round_id, nickname, topic_id, score, correct_count, total_questions, created_at
      FROM leaderboard_old;
    DROP TABLE rounds_old;
    DROP TABLE leaderboard_old;
    PRAGMA legacy_alter_table = OFF;
  `);
}
