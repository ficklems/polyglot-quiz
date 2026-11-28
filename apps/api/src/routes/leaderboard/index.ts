import type { FastifyInstance } from 'fastify';
import {
  leaderboardQuerySchema,
  overallQuerySchema,
  submitScoreRequestSchema,
  type LeaderboardResponse,
  type OverallResponse,
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

  app.get('/leaderboard/overall', async (request): Promise<OverallResponse> => {
    const { limit } = overallQuerySchema.parse(request.query);
    return { players: await app.leaderboard.overall(limit) };
  });

  app.post('/leaderboard', async (request, reply): Promise<SubmitScoreResponse> => {
    const body = submitScoreRequestSchema.parse(request.body ?? {});
    const entry = await submitScore(app.db, app.leaderboard, body, now);
    reply.status(201);
    return { entry };
  });
}
