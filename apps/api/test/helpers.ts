import type { FastifyInstance } from 'fastify';
import { roundSchema, type AnswerRequest, type CreateRoundRequest, type Round } from '@pq/shared';
import { buildApp } from '../src/app';
import { QUESTION_SEEDS } from '../src/db/seed/questions';

/** A clock the test moves by hand. */
export class FakeClock {
  constructor(public current = Date.UTC(2026, 0, 1)) {}
  now = () => this.current;
  advance(seconds: number) {
    this.current += seconds * 1000;
  }
}

/** A fresh app with its own in-memory database (and, optionally, a fake clock). */
export function buildTestApp(clock?: FakeClock) {
  return buildApp({
    dbPath: ':memory:',
    corsOrigins: [],
    logLevel: 'silent',
    ...(clock ? { now: clock.now } : {}),
  });
}

export async function startRound(
  app: FastifyInstance,
  body: Partial<CreateRoundRequest> = {},
): Promise<Round> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/rounds',
    payload: { topicId: 'general-knowledge', lang: 'en', seed: 42, ...body },
  });
  if (res.statusCode !== 201) {
    throw new Error(`startRound failed: ${res.statusCode} ${res.body}`);
  }
  return roundSchema.parse(res.json());
}

export function answer(app: FastifyInstance, roundId: string, body: AnswerRequest) {
  return app.inject({ method: 'POST', url: `/api/rounds/${roundId}/answers`, payload: body });
}

export function next(app: FastifyInstance, roundId: string) {
  return app.inject({ method: 'POST', url: `/api/rounds/${roundId}/next` });
}

/** The test oracle: correct and wrong option ids straight from the seed data. */
export function correctOptionOf(questionId: string) {
  const seed = QUESTION_SEEDS.find((q) => q.id === questionId);
  if (!seed) throw new Error(`Unknown question ${questionId}`);
  return seed.correct;
}

export function wrongOptionOf(questionId: string) {
  const correct = correctOptionOf(questionId);
  return correct === 'a' ? 'b' : 'a';
}
