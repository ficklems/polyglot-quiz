import type { FastifyInstance } from 'fastify';
import { roundSchema, type AnswerRequest, type CreateRoundRequest, type Round } from '@pq/shared';
import { join } from 'node:path';
import { buildApp } from '../src/app';
import { loadContent, type ContentBundle } from '../src/content/load-content';

/** Small, fixed content for fast tests: the 45 legacy questions plus special cases in "memes". */
export const FIXTURE_DIR = join(import.meta.dirname, 'fixtures', 'content');
export const FIXTURE: ContentBundle = loadContent(FIXTURE_DIR);

/** A clock the test moves by hand. */
export class FakeClock {
  constructor(public current = Date.UTC(2026, 0, 1)) {}
  now = () => this.current;
  advance(seconds: number) {
    this.current += seconds * 1000;
  }
}

/** A fresh app with its own in-memory database (and, optionally, a fake clock). */
export function buildTestApp(clock?: FakeClock, content: ContentBundle = FIXTURE) {
  return buildApp({
    dbPath: ':memory:',
    corsOrigins: [],
    logLevel: 'silent',
    content,
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
    payload: { topicId: 'general', lang: 'en', seed: 42, ...body },
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

/**
 * Plays a whole round and returns its id. The first `correctAnswers` questions are answered
 * correctly, the rest wrongly, so the final score is known in advance.
 */
export async function playRound(
  app: FastifyInstance,
  { correctAnswers = 10, ...body }: Partial<CreateRoundRequest> & { correctAnswers?: number } = {},
): Promise<string> {
  const round = await startRound(app, body);
  for (const [i, q] of round.questions.entries()) {
    if (i > 0) await next(app, round.roundId);
    const optionId = i < correctAnswers ? correctOptionOf(q.id) : wrongOptionOf(q.id);
    await answer(app, round.roundId, { questionId: q.id, optionId });
  }
  return round.roundId;
}

export function submitScore(app: FastifyInstance, payload: Record<string, unknown>) {
  return app.inject({ method: 'POST', url: '/api/leaderboard', payload });
}

/** The test oracle: correct and wrong option ids straight from the fixture content. */
export function correctOptionOf(questionId: string): string {
  const q = FIXTURE.questions.find((x) => x.record.id === questionId);
  if (!q || !('correctOptionId' in q.record.answer))
    throw new Error(`Unknown question ${questionId}`);
  return q.record.answer.correctOptionId;
}

export function wrongOptionOf(questionId: string): string {
  return correctOptionOf(questionId) === 'o1' ? 'o2' : 'o1';
}
