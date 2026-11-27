import { expect, test, type APIRequestContext } from '@playwright/test';
import {
  answerResultSchema,
  apiErrorSchema,
  LANGUAGES,
  POINTS_PER_CORRECT,
  QUESTIONS_PER_ROUND,
  roundSchema,
  roundSummarySchema,
  type Round,
} from '@pq/shared';
import { correctOptionId } from '../data/questions';

async function createRound(
  request: APIRequestContext,
  body: Record<string, unknown> = {},
): Promise<Round> {
  const res = await request.post('/api/rounds', {
    data: { topicId: 'region-history', lang: 'en', ...body },
  });
  expect(res.status()).toBe(201);
  return roundSchema.parse(await res.json());
}

test.describe('POST /api/rounds', () => {
  for (const lang of LANGUAGES) {
    test(`creates a round in ${lang} matching the contract @smoke`, async ({ request }) => {
      const round = await createRound(request, { lang });

      expect(round.lang).toBe(lang);
      expect(round.questions).toHaveLength(QUESTIONS_PER_ROUND);
    });
  }

  test('does not leak correct answers in the response body', async ({ request }) => {
    const res = await request.post('/api/rounds', {
      data: { topicId: 'general-knowledge', lang: 'en' },
    });

    expect(await res.text()).not.toMatch(/correct/i);
    // strictObject: any extra field (like a leaked answer) fails the contract.
    roundSchema.parse(await res.json());
  });

  test('is reproducible with a seed', async ({ request }) => {
    const a = await createRound(request, { seed: 2026 });
    const b = await createRound(request, { seed: 2026 });

    expect(b.questions).toEqual(a.questions);
  });

  const invalid: Array<[string, Record<string, unknown>, number]> = [
    ['unknown topic', { topicId: 'astrology', lang: 'en' }, 404],
    ['unsupported language', { topicId: 'region-history', lang: 'de' }, 400],
    ['missing body fields', {}, 400],
    ['seed as a string', { topicId: 'region-history', lang: 'en', seed: '42' }, 400],
  ];
  for (const [name, data, status] of invalid) {
    test(`rejects ${name} with ${status}`, async ({ request }) => {
      const res = await request.post('/api/rounds', { data });

      expect(res.status()).toBe(status);
      apiErrorSchema.parse(await res.json());
    });
  }
});

test.describe('Playing a round over the API', () => {
  test('a full round with every answer correct scores the maximum', async ({ request }) => {
    const round = await createRound(request);

    for (const [i, q] of round.questions.entries()) {
      if (i > 0) {
        expect((await request.post(`/api/rounds/${round.roundId}/next`)).status()).toBe(204);
      }
      const res = await request.post(`/api/rounds/${round.roundId}/answers`, {
        data: { questionId: q.id, optionId: correctOptionId(q.id) },
      });
      const result = answerResultSchema.parse(await res.json());
      expect(result.correct).toBe(true);
    }

    const summary = roundSummarySchema.parse(
      await (await request.get(`/api/rounds/${round.roundId}`)).json(),
    );
    expect(summary).toMatchObject({
      finished: true,
      correctCount: QUESTIONS_PER_ROUND,
      score: QUESTIONS_PER_ROUND * POINTS_PER_CORRECT,
    });
  });

  test('a time-out (null option) gives no points', async ({ request }) => {
    const round = await createRound(request);
    const q = round.questions[0]!;

    const res = await request.post(`/api/rounds/${round.roundId}/answers`, {
      data: { questionId: q.id, optionId: null },
    });

    expect(answerResultSchema.parse(await res.json())).toMatchObject({
      timedOut: true,
      correct: false,
      pointsAwarded: 0,
      correctOptionId: correctOptionId(q.id),
    });
  });

  test('answering the same question twice returns 409', async ({ request }) => {
    const round = await createRound(request);
    const data = { questionId: round.questions[0]!.id, optionId: 'a' };
    await request.post(`/api/rounds/${round.roundId}/answers`, { data });

    const res = await request.post(`/api/rounds/${round.roundId}/answers`, { data });

    expect(res.status()).toBe(409);
  });

  test('"next" cannot restart a question that is already running', async ({ request }) => {
    const round = await createRound(request);

    const res = await request.post(`/api/rounds/${round.roundId}/next`);

    expect(res.status()).toBe(409);
  });

  test('unknown round returns 404', async ({ request }) => {
    const res = await request.get('/api/rounds/7f1d2c3b-0000-4000-8000-000000000000');

    expect(res.status()).toBe(404);
    expect(apiErrorSchema.parse(await res.json()).error).toBe('Not Found');
  });
});
