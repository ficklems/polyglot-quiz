import type { LeaderboardEntry, OverallPlayer } from '@pq/shared';
import type { Database } from '../db/database';
import {
  BOARD_ORDER,
  OVERALL_SQL,
  toPlayer,
  toEntry,
  type BoardFilter,
  type EntryRow,
  type LeaderboardStore,
  type NewEntry,
  type OverallRow,
} from './store';

/** Local development and tests: entries in the same SQLite database as the rounds. */
export class SqliteLeaderboardStore implements LeaderboardStore {
  constructor(private readonly db: Database) {}

  async add(entry: NewEntry): Promise<LeaderboardEntry | null> {
    const result = this.db
      .prepare(
        `INSERT INTO leaderboard_entries
           (round_id, nickname, topic_id, collection_id, score, correct_count,
            total_questions, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (round_id) DO NOTHING`,
      )
      .run(
        entry.roundId,
        entry.nickname,
        entry.topicId,
        entry.collectionId,
        entry.score,
        entry.correctCount,
        entry.totalQuestions,
        entry.createdAt,
      );
    if (result.changes === 0) return null;
    const row = this.db
      .prepare(
        `SELECT * FROM (
           SELECT *, ROW_NUMBER() OVER (
             PARTITION BY topic_id, collection_id ORDER BY ${BOARD_ORDER}) AS rank
             FROM leaderboard_entries
         ) WHERE id = ?`,
      )
      .get(result.lastInsertRowid) as EntryRow;
    return toEntry(row);
  }

  async top({ topicId, collectionId }: BoardFilter, limit: number): Promise<LeaderboardEntry[]> {
    const [where, params] =
      topicId !== undefined
        ? ['WHERE topic_id = ?', [topicId]]
        : collectionId !== undefined
          ? ['WHERE collection_id = ?', [collectionId]]
          : ['', []];
    const rows = this.db
      .prepare(
        `SELECT *, ROW_NUMBER() OVER (ORDER BY ${BOARD_ORDER}) AS rank
           FROM leaderboard_entries ${where} ORDER BY ${BOARD_ORDER} LIMIT ?`,
      )
      .all(...params, limit) as EntryRow[];
    return rows.map(toEntry);
  }

  async overall(limit: number): Promise<OverallPlayer[]> {
    const rows = this.db.prepare(OVERALL_SQL('?')).all(limit) as OverallRow[];
    return rows.map(toPlayer);
  }

  async close(): Promise<void> {
    // The database belongs to the app, which closes it.
  }
}
