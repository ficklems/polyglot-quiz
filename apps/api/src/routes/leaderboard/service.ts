import type { LeaderboardEntry, LeaderboardResponse, SubmitScoreRequest } from '@pq/shared';
import type { Database } from '../../db/database';
import { conflict, notFound } from '../../lib/http-errors';
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
  topic_id: string;
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

  const existing = db
    .prepare('SELECT 1 FROM leaderboard_entries WHERE round_id = ?')
    .get(request.roundId);
  if (existing) {
    throw conflict('This round is already on the leaderboard');
  }

  const result = db
    .prepare(
      `INSERT INTO leaderboard_entries
         (round_id, nickname, topic_id, score, correct_count, total_questions, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      request.roundId,
      request.nickname,
      summary.topicId,
      summary.score,
      summary.correctCount,
      summary.totalQuestions,
      now(),
    );

  return getEntryWithRank(db, Number(result.lastInsertRowid));
}

/** The entry with its rank within its topic, even when it is outside the top 10. */
function getEntryWithRank(db: Database, id: number): LeaderboardEntry {
  const row = db
    .prepare(
      `SELECT * FROM (
         SELECT *, ROW_NUMBER() OVER (PARTITION BY topic_id ORDER BY ${ORDER}) AS rank
           FROM leaderboard_entries
       ) WHERE id = ?`,
    )
    .get(id) as EntryRow | undefined;
  if (!row) throw notFound(`Leaderboard entry ${id} does not exist`);
  return toEntry(row);
}

export function getLeaderboard(
  db: Database,
  topicId: string | undefined,
  limit: number,
): LeaderboardResponse {
  if (topicId !== undefined && !topicExists(db, topicId)) {
    throw notFound(`Topic "${topicId}" does not exist`);
  }

  const rows = (
    topicId === undefined
      ? db
          .prepare(
            `SELECT *, ROW_NUMBER() OVER (ORDER BY ${ORDER}) AS rank
               FROM leaderboard_entries ORDER BY ${ORDER} LIMIT ?`,
          )
          .all(limit)
      : db
          .prepare(
            `SELECT *, ROW_NUMBER() OVER (ORDER BY ${ORDER}) AS rank
               FROM leaderboard_entries WHERE topic_id = ? ORDER BY ${ORDER} LIMIT ?`,
          )
          .all(topicId, limit)
  ) as EntryRow[];

  return { topicId: topicId ?? null, entries: rows.map(toEntry) };
}
