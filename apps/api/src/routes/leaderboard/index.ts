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
    const { topicId, limit } = leaderboardQuerySchema.parse(request.query);
    return getLeaderboard(app.db, topicId, limit);
  });

  app.post('/leaderboard', async (request, reply): Promise<SubmitScoreResponse> => {
    const body = submitScoreRequestSchema.parse(request.body ?? {});
    const entry = submitScore(app.db, body, now);
    reply.status(201);
    return { entry };
  });
}
