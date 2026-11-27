import type { LeaderboardEntry, LeaderboardResponse, SubmitScoreRequest } from '@pq/shared';
import type { Database } from '../../db/database';
import type { QuestionPool } from '../../content/question-pool';
import { conflict, notFound, unprocessable } from '../../lib/http-errors';
import type { Clock } from '../rounds/service';
import { getRoundSummary } from '../rounds/service';
import { topicExists } from '../topics/service';

type EntryRow = {
  id: number;
  rank: number;
  nickname: string;
  score: number;
  correct_count: number;
  total_questions: number;
  topic_id: string | null;
  collection_id: string | null;
  created_at: number;
};

/** Higher score first; on a tie, whoever got there first. id breaks exact-time ties. */
const ORDER = 'score DESC, created_at ASC, id ASC';

function toEntry(row: EntryRow): LeaderboardEntry {
  return {
    id: row.id,
    rank: row.rank,
    nickname: row.nickname,
    score: row.score,
    correctCount: row.correct_count,
    totalQuestions: row.total_questions,
    topicId: row.topic_id,
    collectionId: row.collection_id,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

/**
 * Saves a finished round under a nickname. Everything except the nickname (score, correct
 * answers, topic) is read from the round on the server, so the client can't inflate it.
 */
export function submitScore(
  db: Database,
  request: SubmitScoreRequest,
  now: Clock,
): LeaderboardEntry {
  const summary = getRoundSummary(db, request.roundId); // 404 for an unknown round
  if (!summary.finished) {
    throw conflict('Only a finished round can be submitted');
  }
  if (!summary.ranked) {
    throw unprocessable('Custom mixes are not ranked');
  }

  const existing = db
    .prepare('SELECT 1 FROM leaderboard_entries WHERE round_id = ?')
    .get(request.roundId);
  if (existing) {
    throw conflict('This round is already on the leaderboard');
  }

  const result = db
    .prepare(
      `INSERT INTO leaderboard_entries
         (round_id, nickname, topic_id, collection_id, score, correct_count, total_questions,
          created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      request.roundId,
      request.nickname,
      summary.topicId,
      summary.collectionId,
      summary.score,
      summary.correctCount,
      summary.totalQuestions,
      now(),
    );

  return getEntryWithRank(db, Number(result.lastInsertRowid));
}

/** The entry with its rank on its board, even when it is outside the top 10. */
function getEntryWithRank(db: Database, id: number): LeaderboardEntry {
  const row = db
    .prepare(
      `SELECT * FROM (
         SELECT *, ROW_NUMBER() OVER (PARTITION BY topic_id, collection_id ORDER BY ${ORDER}) AS rank
           FROM leaderboard_entries
       ) WHERE id = ?`,
    )
    .get(id) as EntryRow | undefined;
  if (!row) throw notFound(`Leaderboard entry ${id} does not exist`);
  return toEntry(row);
}

export type BoardQuery = { topicId?: string; collectionId?: string; limit: number };

export function getLeaderboard(
  db: Database,
  pool: QuestionPool,
  { topicId, collectionId, limit }: BoardQuery,
): LeaderboardResponse {
  if (topicId !== undefined && !topicExists(db, topicId)) {
    throw notFound(`Topic "${topicId}" does not exist`);
  }
  if (collectionId !== undefined && !pool.collection(collectionId)) {
    throw notFound(`Themed quiz "${collectionId}" does not exist`);
  }

  const [where, params] =
    topicId !== undefined
      ? ['WHERE topic_id = ?', [topicId]]
      : collectionId !== undefined
        ? ['WHERE collection_id = ?', [collectionId]]
        : ['', []];
  const rows = db
    .prepare(
      `SELECT *, ROW_NUMBER() OVER (ORDER BY ${ORDER}) AS rank
         FROM leaderboard_entries ${where} ORDER BY ${ORDER} LIMIT ?`,
    )
    .all(...params, limit) as EntryRow[];

  return {
    topicId: topicId ?? null,
    collectionId: collectionId ?? null,
    entries: rows.map(toEntry),
  };
}
