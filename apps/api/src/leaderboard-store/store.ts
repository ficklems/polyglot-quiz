import type { LeaderboardEntry, OverallPlayer } from '@pq/shared';

/** A saved score, before it has an id and a rank. */
export type NewEntry = {
  roundId: string;
  nickname: string;
  topicId: string | null;
  collectionId: string | null;
  score: number;
  correctCount: number;
  totalQuestions: number;
  createdAt: number;
};

/** One board: a topic, a themed quiz, or (neither) all boards together. */
export type BoardFilter = { topicId?: string; collectionId?: string };

/**
 * Where leaderboard entries live. Rounds are short-lived and stay in SQLite; entries must
 * survive restarts, so in production they go to Postgres (free hosts wipe the disk).
 * Both implementations must pass `test/leaderboard-store.contract.ts`.
 */
export interface LeaderboardStore {
  /** Saves the entry and returns it with its rank, or null if the round is already saved. */
  add(entry: NewEntry): Promise<LeaderboardEntry | null>;
  top(board: BoardFilter, limit: number): Promise<LeaderboardEntry[]>;
  /** One row per player: the sum of their best score on each board. */
  overall(limit: number): Promise<OverallPlayer[]>;
  close(): Promise<void>;
}

/** Higher score first; on a tie, whoever got there first. id breaks exact-time ties. */
export const BOARD_ORDER = 'score DESC, created_at ASC, id ASC';

export type EntryRow = {
  id: number | string;
  rank: number | string;
  nickname: string;
  score: number;
  correct_count: number;
  total_questions: number;
  topic_id: string | null;
  collection_id: string | null;
  created_at: number | string;
};

/** Postgres returns BIGINT and ROW_NUMBER as strings; SQLite as numbers. */
export function toEntry(row: EntryRow): LeaderboardEntry {
  return {
    id: Number(row.id),
    rank: Number(row.rank),
    nickname: row.nickname,
    score: row.score,
    correctCount: row.correct_count,
    totalQuestions: row.total_questions,
    topicId: row.topic_id,
    collectionId: row.collection_id,
    createdAt: new Date(Number(row.created_at)).toISOString(),
  };
}

/*
 * Same SQL for SQLite and Postgres. Per player and board: the best score. Per player: the sum
 * of those and the number of boards. The shown nickname is the one of the latest entry.
 * Ties: more boards first (broader play), then the nickname, so the order is stable.
 */
export const OVERALL_SQL = (limitPlaceholder: string) => `
  WITH best AS (
    SELECT LOWER(nickname) AS player, topic_id, collection_id, MAX(score) AS best
      FROM leaderboard_entries
     GROUP BY LOWER(nickname), topic_id, collection_id
  ),
  totals AS (
    SELECT player, SUM(best) AS total_score, COUNT(*) AS boards_played
      FROM best
     GROUP BY player
  ),
  latest_name AS (
    SELECT player, nickname FROM (
      SELECT LOWER(nickname) AS player, nickname,
             ROW_NUMBER() OVER (PARTITION BY LOWER(nickname) ORDER BY created_at DESC, id DESC) AS n
        FROM leaderboard_entries
    ) AS named
     WHERE n = 1
  )
  SELECT ROW_NUMBER() OVER (ORDER BY t.total_score DESC, t.boards_played DESC, t.player ASC)
           AS rank,
         l.nickname, t.total_score, t.boards_played
    FROM totals t JOIN latest_name l ON l.player = t.player
   ORDER BY t.total_score DESC, t.boards_played DESC, t.player ASC
   LIMIT ${limitPlaceholder}
`;

export type OverallRow = {
  rank: number | string;
  nickname: string;
  total_score: number | string;
  boards_played: number | string;
};

export function toPlayer(row: OverallRow): OverallPlayer {
  return {
    rank: Number(row.rank),
    nickname: row.nickname,
    totalScore: Number(row.total_score),
    boardsPlayed: Number(row.boards_played),
  };
}
