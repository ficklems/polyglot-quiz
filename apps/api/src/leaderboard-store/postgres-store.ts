import type { LeaderboardEntry, OverallPlayer } from '@pq/shared';
import pg from 'pg';
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

/*
 * No foreign keys: rounds live in the API's local SQLite, which a free host wipes on every
 * restart, while entries must outlive it. The score is copied from the round when saved.
 */
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS leaderboard_entries (
    id              BIGSERIAL PRIMARY KEY,
    round_id        TEXT NOT NULL UNIQUE,
    nickname        TEXT NOT NULL,
    topic_id        TEXT,
    collection_id   TEXT,
    score           INTEGER NOT NULL,
    correct_count   INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    created_at      BIGINT NOT NULL,
    CHECK ((topic_id IS NULL) <> (collection_id IS NULL))
  );
  CREATE INDEX IF NOT EXISTS leaderboard_by_topic
    ON leaderboard_entries (topic_id, score DESC, created_at, id);
  CREATE INDEX IF NOT EXISTS leaderboard_by_collection
    ON leaderboard_entries (collection_id, score DESC, created_at, id);
`;

/** Production: entries in a hosted Postgres (Neon), so they survive restarts. */
export class PostgresLeaderboardStore implements LeaderboardStore {
  private constructor(private readonly pool: pg.Pool) {}

  static async connect(connectionString: string): Promise<PostgresLeaderboardStore> {
    // A few connections are plenty for a quiz; Neon's free plan limits them anyway.
    const pool = new pg.Pool({ connectionString, max: 3, idleTimeoutMillis: 30_000 });
    await pool.query(SCHEMA);
    return new PostgresLeaderboardStore(pool);
  }

  async add(entry: NewEntry): Promise<LeaderboardEntry | null> {
    const inserted = await this.pool.query<{ id: string }>(
      `INSERT INTO leaderboard_entries
         (round_id, nickname, topic_id, collection_id, score, correct_count, total_questions,
          created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (round_id) DO NOTHING
       RETURNING id`,
      [
        entry.roundId,
        entry.nickname,
        entry.topicId,
        entry.collectionId,
        entry.score,
        entry.correctCount,
        entry.totalQuestions,
        entry.createdAt,
      ],
    );
    const id = inserted.rows[0]?.id;
    if (id === undefined) return null;
    const ranked = await this.pool.query<EntryRow>(
      `SELECT * FROM (
         SELECT *, ROW_NUMBER() OVER (
           PARTITION BY topic_id, collection_id ORDER BY ${BOARD_ORDER}) AS rank
           FROM leaderboard_entries
           WHERE topic_id IS NOT DISTINCT FROM $2 AND collection_id IS NOT DISTINCT FROM $3
       ) AS board WHERE id = $1`,
      [id, entry.topicId, entry.collectionId],
    );
    return toEntry(ranked.rows[0]!);
  }

  async top({ topicId, collectionId }: BoardFilter, limit: number): Promise<LeaderboardEntry[]> {
    const [where, params]: [string, unknown[]] =
      topicId !== undefined
        ? ['WHERE topic_id = $1', [topicId]]
        : collectionId !== undefined
          ? ['WHERE collection_id = $1', [collectionId]]
          : ['', []];
    const rows = await this.pool.query<EntryRow>(
      `SELECT *, ROW_NUMBER() OVER (ORDER BY ${BOARD_ORDER}) AS rank
         FROM leaderboard_entries ${where} ORDER BY ${BOARD_ORDER} LIMIT $${params.length + 1}`,
      [...params, limit],
    );
    return rows.rows.map(toEntry);
  }

  async overall(limit: number): Promise<OverallPlayer[]> {
    const rows = (await this.pool.query<OverallRow>(OVERALL_SQL('$1'), [limit])).rows;
    return rows.map(toPlayer);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
