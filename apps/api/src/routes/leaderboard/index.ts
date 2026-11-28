import type { FastifyInstance } from 'fastify';
import {
  leaderboardQuerySchema,
  submitScoreRequestSchema,
  type LeaderboardResponse,
  type SubmitScoreResponse,
} from '@pq/shared';
import type { Clock } from '../rounds/service';
import { getLeaderboard, submitScore } from './service';

export type LeaderboardRoutesOptions = { now: Clock };

export async function leaderboardRoutes(
  app: FastifyInstance,
  { now }: LeaderboardRoutesOptions,
): Promise<void> {
  app.get('/leaderboard', async (request): Promise<LeaderboardResponse> => {
    const { topicId, collectionId, limit } = leaderboardQuerySchema.parse(request.query);
    return getLeaderboard(app.db, app.pool, app.leaderboard, {
      limit,
      ...(topicId !== undefined ? { topicId } : {}),
      ...(collectionId !== undefined ? { collectionId } : {}),
    });
  });

  app.post('/leaderboard', async (request, reply): Promise<SubmitScoreResponse> => {
    const body = submitScoreRequestSchema.parse(request.body ?? {});
    const entry = await submitScore(app.db, app.leaderboard, body, now);
    reply.status(201);
    return { entry };
  });
}
