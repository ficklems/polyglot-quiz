import type { LeaderboardEntry } from '@pq/shared';

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
