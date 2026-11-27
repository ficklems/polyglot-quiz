import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import {
  answerResultSchema,
  apiErrorSchema,
  POINTS_PER_CORRECT,
  QUESTIONS_PER_ROUND,
  roundSummarySchema,
  TIME_LIMIT_SECONDS,
} from '@pq/shared';
import { TIME_GRACE_SECONDS } from '../src/routes/rounds/service';
import {
  answer,
  buildTestApp,
  correctOptionOf,
  FakeClock,
  next,
  startRound,
  wrongOptionOf,
} from './helpers';

let app: FastifyInstance;

afterEach(async () => {
  await app?.close();
});

describe('POST /api/rounds', () => {
  it('creates a round of 10 distinct questions from the chosen topic', async () => {
    app = await buildTestApp();
    const round = await startRound(app, { topicId: 'history' });

    expect(round.questions).toHaveLength(QUESTIONS_PER_ROUND);
    expect(new Set(round.questions.map((q) => q.id)).size).toBe(QUESTIONS_PER_ROUND);
    expect(round.questions.every((q) => q.id.startsWith('history-'))).toBe(true);
    expect(round.timeLimitSeconds).toBe(TIME_LIMIT_SECONDS);
  });

  it('never sends the correct answer to the client', async () => {
    app = await buildTestApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/rounds',
      payload: { topicId: 'music', lang: 'uk', seed: 1 },
    });

    // Question texts may contain the word "correct", so check for answer fields instead.
    expect(res.body).not.toMatch(/"(correctOptionId|answer|orderedOptionIds|pairs)"/);
  });

  it('gives the same questions and option order for the same seed', async () => {
    app = await buildTestApp();
    const first = await startRound(app, { seed: 7 });
    const second = await startRound(app, { seed: 7 });

    expect(second.questions).toEqual(first.questions);
    expect(second.roundId).not.toBe(first.roundId);
  });

  it('gives a different order for a different seed', async () => {
    app = await buildTestApp();
    const a = await startRound(app, { seed: 1 });
    const b = await startRound(app, { seed: 2 });

    expect(b.questions.map((q) => q.id)).not.toEqual(a.questions.map((q) => q.id));
  });

  it('returns question text in the requested language', async () => {
    app = await buildTestApp();
    const pl = await startRound(app, { lang: 'pl', seed: 3 });
    const en = await startRound(app, { lang: 'en', seed: 3 });

    expect(pl.questions.map((q) => q.id)).toEqual(en.questions.map((q) => q.id));
    expect(pl.questions[0]?.text).not.toBe(en.questions[0]?.text);
  });

  it.each([
    ['unknown topic', { topicId: 'cooking', lang: 'en' }, 404],
    ['a topic with fewer than 10 playable questions', { topicId: 'memes', lang: 'en' }, 422],
    ['unsupported language', { topicId: 'music', lang: 'ru' }, 400],
    ['missing topic', { lang: 'en' }, 400],
    ['negative seed', { topicId: 'music', lang: 'en', seed: -1 }, 400],
    ['fractional seed', { topicId: 'music', lang: 'en', seed: 1.5 }, 400],
  ])('rejects %s with %i', async (_name, payload, status) => {
    app = await buildTestApp();
    const res = await app.inject({ method: 'POST', url: '/api/rounds', payload });

    expect(res.statusCode).toBe(status);
    apiErrorSchema.parse(res.json());
  });
});

describe('POST /api/rounds/:roundId/answers', () => {
  it('scores a correct answer and reveals the correct option', async () => {
    app = await buildTestApp();
    const round = await startRound(app);
    const q = round.questions[0]!;

    const res = await answer(app, round.roundId, {
      questionId: q.id,
      optionId: correctOptionOf(q.id),
    });

    expect(res.statusCode).toBe(200);
    expect(answerResultSchema.parse(res.json())).toMatchObject({
      correct: true,
      timedOut: false,
      correctOptionId: correctOptionOf(q.id),
      pointsAwarded: POINTS_PER_CORRECT,
      score: POINTS_PER_CORRECT,
      answeredCount: 1,
      finished: false,
    });
  });

  it('gives no points for a wrong answer', async () => {
    app = await buildTestApp();
    const round = await startRound(app);
    const q = round.questions[0]!;

    const body = answerResultSchema.parse(
      (
        await answer(app, round.roundId, { questionId: q.id, optionId: wrongOptionOf(q.id) })
      ).json(),
    );

    expect(body).toMatchObject({ correct: false, timedOut: false, pointsAwarded: 0, score: 0 });
  });

  it('treats a null option as a time-out', async () => {
    app = await buildTestApp();
    const round = await startRound(app);
    const q = round.questions[0]!;

    const body = answerResultSchema.parse(
      (await answer(app, round.roundId, { questionId: q.id, optionId: null })).json(),
    );

    expect(body).toMatchObject({ correct: false, timedOut: true, pointsAwarded: 0 });
  });

  it('plays a full round: 10 correct answers give the maximum score', async () => {
    app = await buildTestApp();
    const round = await startRound(app);
    let last;

    for (const [i, q] of round.questions.entries()) {
      if (i > 0) expect((await next(app, round.roundId)).statusCode).toBe(204);
      last = answerResultSchema.parse(
        (
          await answer(app, round.roundId, { questionId: q.id, optionId: correctOptionOf(q.id) })
        ).json(),
      );
    }

    expect(last).toMatchObject({
      finished: true,
      answeredCount: QUESTIONS_PER_ROUND,
      score: QUESTIONS_PER_ROUND * POINTS_PER_CORRECT,
    });
  });

  it('rejects answering the same question twice with 409', async () => {
    app = await buildTestApp();
    const round = await startRound(app);
    const q = round.questions[0]!;
    await answer(app, round.roundId, { questionId: q.id, optionId: 'o1' });

    const res = await answer(app, round.roundId, { questionId: q.id, optionId: 'o2' });

    expect(res.statusCode).toBe(409);
  });

  it('rejects skipping ahead with 409', async () => {
    app = await buildTestApp();
    const round = await startRound(app);

    const res = await answer(app, round.roundId, {
      questionId: round.questions[2]!.id,
      optionId: 'o1',
    });

    expect(res.statusCode).toBe(409);
    expect(apiErrorSchema.parse(res.json()).message).toMatch(/in order/);
  });

  it('rejects answering the next question before it was started with 409', async () => {
    app = await buildTestApp();
    const round = await startRound(app);
    await answer(app, round.roundId, { questionId: round.questions[0]!.id, optionId: 'o1' });

    const res = await answer(app, round.roundId, {
      questionId: round.questions[1]!.id,
      optionId: 'o1',
    });

    expect(res.statusCode).toBe(409);
  });

  it("rejects an option id that is not one of the question's options with 400", async () => {
    app = await buildTestApp();
    const round = await startRound(app);

    const res = await answer(app, round.roundId, {
      questionId: round.questions[0]!.id,
      optionId: 'o9',
    });

    expect(res.statusCode).toBe(400);
  });

  it('shuffles options so the correct one is not always first', async () => {
    app = await buildTestApp();
    const round = await startRound(app, { seed: 11 });

    const firstIsCorrect = round.questions.filter(
      (q) => q.options[0]?.id === correctOptionOf(q.id),
    );
    expect(firstIsCorrect.length).toBeLessThan(round.questions.length);
  });

  it('rejects a question from outside the round with 400', async () => {
    app = await buildTestApp();
    const round = await startRound(app, { topicId: 'general' });

    const res = await answer(app, round.roundId, { questionId: 'music-01', optionId: 'o1' });

    expect(res.statusCode).toBe(400);
  });

  it.each([
    ['an unknown option id', { optionId: 'e' }],
    ['a missing option id', {}],
    ['a malformed question id', { questionId: 'DROP TABLE', optionId: 'o1' }],
  ])('rejects %s with 400', async (_name, override) => {
    app = await buildTestApp();
    const round = await startRound(app);

    const res = await app.inject({
      method: 'POST',
      url: `/api/rounds/${round.roundId}/answers`,
      payload: { questionId: round.questions[0]!.id, ...override },
    });

    expect(res.statusCode).toBe(400);
  });

  it('returns 404 for an unknown round and 400 for a malformed round id', async () => {
    app = await buildTestApp();
    const unknown = await answer(app, '00000000-0000-4000-8000-000000000000', {
      questionId: 'general-01',
      optionId: 'o1',
    });
    const malformed = await answer(app, 'not-a-uuid', { questionId: 'general-01', optionId: 'o1' });

    expect(unknown.statusCode).toBe(404);
    expect(malformed.statusCode).toBe(400);
  });
});

describe('time limit (fake clock)', () => {
  it(`accepts an answer right at the limit plus ${TIME_GRACE_SECONDS}s grace`, async () => {
    const clock = new FakeClock();
    app = await buildTestApp(clock);
    const round = await startRound(app);
    const q = round.questions[0]!;

    clock.advance(TIME_LIMIT_SECONDS + TIME_GRACE_SECONDS);
    const body = answerResultSchema.parse(
      (
        await answer(app, round.roundId, { questionId: q.id, optionId: correctOptionOf(q.id) })
      ).json(),
    );

    expect(body).toMatchObject({ correct: true, timedOut: false });
  });

  it('treats a correct answer that arrives after the grace period as timed out', async () => {
    const clock = new FakeClock();
    app = await buildTestApp(clock);
    const round = await startRound(app);
    const q = round.questions[0]!;

    clock.advance(TIME_LIMIT_SECONDS + TIME_GRACE_SECONDS + 0.001);
    const body = answerResultSchema.parse(
      (
        await answer(app, round.roundId, { questionId: q.id, optionId: correctOptionOf(q.id) })
      ).json(),
    );

    expect(body).toMatchObject({ correct: false, timedOut: true, pointsAwarded: 0 });
  });

  it('does not count time spent between an answer and starting the next question', async () => {
    const clock = new FakeClock();
    app = await buildTestApp(clock);
    const round = await startRound(app);
    const [q1, q2] = round.questions;
    await answer(app, round.roundId, { questionId: q1!.id, optionId: 'o1' });

    clock.advance(60); // reading the feedback for a minute
    await next(app, round.roundId);
    clock.advance(5);
    const body = answerResultSchema.parse(
      (
        await answer(app, round.roundId, { questionId: q2!.id, optionId: correctOptionOf(q2!.id) })
      ).json(),
    );

    expect(body.timedOut).toBe(false);
  });

  it('does not let "next" restart a question that is already running', async () => {
    app = await buildTestApp();
    const round = await startRound(app);

    const res = await next(app, round.roundId);

    expect(res.statusCode).toBe(409);
  });
});

describe('GET /api/rounds/:roundId', () => {
  it('summarises progress and score', async () => {
    app = await buildTestApp();
    const round = await startRound(app);
    const [q1, q2] = round.questions;
    await answer(app, round.roundId, { questionId: q1!.id, optionId: correctOptionOf(q1!.id) });
    await next(app, round.roundId);
    await answer(app, round.roundId, { questionId: q2!.id, optionId: wrongOptionOf(q2!.id) });

    const res = await app.inject({ method: 'GET', url: `/api/rounds/${round.roundId}` });

    expect(roundSummarySchema.parse(res.json())).toEqual({
      roundId: round.roundId,
      topicId: 'general',
      lang: 'en',
      score: POINTS_PER_CORRECT,
      correctCount: 1,
      answeredCount: 2,
      totalQuestions: QUESTIONS_PER_ROUND,
      finished: false,
    });
  });

  it('rejects answers and "next" after the round is finished with 409', async () => {
    app = await buildTestApp();
    const round = await startRound(app);
    for (const [i, q] of round.questions.entries()) {
      if (i > 0) await next(app, round.roundId);
      await answer(app, round.roundId, { questionId: q.id, optionId: 'o1' });
    }

    const summary = roundSummarySchema.parse(
      (await app.inject({ method: 'GET', url: `/api/rounds/${round.roundId}` })).json(),
    );
    expect(summary.finished).toBe(true);
    expect((await next(app, round.roundId)).statusCode).toBe(409);
    expect(
      (await answer(app, round.roundId, { questionId: round.questions[0]!.id, optionId: 'o1' }))
        .statusCode,
    ).toBe(409);
  });
});
