import type { LeaderboardEntry, LeaderboardResponse, SubmitScoreRequest } from '@pq/shared';
import type { Database } from '../../db/database';
import type { QuestionPool } from '../../content/question-pool';
import type { LeaderboardStore } from '../../leaderboard-store/store';
import { conflict, notFound, unprocessable } from '../../lib/http-errors';
import type { Clock } from '../rounds/service';
import { getRoundSummary } from '../rounds/service';
import { topicExists } from '../topics/service';

/**
 * Saves a finished round under a nickname. Everything except the nickname (score, correct
 * answers, topic) is read from the round on the server, so the client can't inflate it.
 */
export async function submitScore(
  db: Database,
  store: LeaderboardStore,
  request: SubmitScoreRequest,
  now: Clock,
): Promise<LeaderboardEntry> {
  const summary = getRoundSummary(db, request.roundId); // 404 for an unknown round
  if (!summary.finished) {
    throw conflict('Only a finished round can be submitted');
  }
  if (!summary.ranked) {
    throw unprocessable('Custom mixes are not ranked');
  }

  const entry = await store.add({
    roundId: request.roundId,
    nickname: request.nickname,
    topicId: summary.topicId,
    collectionId: summary.collectionId,
    score: summary.score,
    correctCount: summary.correctCount,
    totalQuestions: summary.totalQuestions,
    createdAt: now(),
  });
  if (!entry) throw conflict('This round is already on the leaderboard');
  return entry;
}

export type BoardQuery = { topicId?: string; collectionId?: string; limit: number };

export async function getLeaderboard(
  db: Database,
  pool: QuestionPool,
  store: LeaderboardStore,
  { topicId, collectionId, limit }: BoardQuery,
): Promise<LeaderboardResponse> {
  if (topicId !== undefined && !topicExists(db, topicId)) {
    throw notFound(`Topic "${topicId}" does not exist`);
  }
  if (collectionId !== undefined && !pool.collection(collectionId)) {
    throw notFound(`Themed quiz "${collectionId}" does not exist`);
  }

  const entries = await store.top(
    {
      ...(topicId !== undefined ? { topicId } : {}),
      ...(collectionId !== undefined ? { collectionId } : {}),
    },
    limit,
  );

  return {
    topicId: topicId ?? null,
    collectionId: collectionId ?? null,
    entries,
  };
}
