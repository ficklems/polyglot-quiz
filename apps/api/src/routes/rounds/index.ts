import type { FastifyInstance } from 'fastify';
import {
  answerRequestSchema,
  createRoundRequestSchema,
  roundParamsSchema,
  type AnswerResult,
  type Round,
  type RoundSummary,
} from '@pq/shared';
import {
  answerQuestion,
  createRound,
  getRoundSummary,
  startNextQuestion,
  type Clock,
} from './service';

export type RoundsRoutesOptions = {
  now: Clock;
  randomSeed: () => number;
};

export async function roundsRoutes(
  app: FastifyInstance,
  { now, randomSeed }: RoundsRoutesOptions,
): Promise<void> {
  app.post('/rounds', async (request, reply): Promise<Round> => {
    const body = createRoundRequestSchema.parse(request.body ?? {});
    const round = createRound(app.db, app.pool, { ...body, seed: body.seed ?? randomSeed() }, now);
    reply.status(201);
    return round;
  });

  app.get('/rounds/:roundId', async (request): Promise<RoundSummary> => {
    const { roundId } = roundParamsSchema.parse(request.params);
    return getRoundSummary(app.db, roundId);
  });

  app.post('/rounds/:roundId/answers', async (request): Promise<AnswerResult> => {
    const { roundId } = roundParamsSchema.parse(request.params);
    const body = answerRequestSchema.parse(request.body ?? {});
    return answerQuestion(app.db, roundId, body, now);
  });

  app.post('/rounds/:roundId/next', async (request, reply) => {
    const { roundId } = roundParamsSchema.parse(request.params);
    startNextQuestion(app.db, roundId, now);
    return reply.status(204).send();
  });
}
