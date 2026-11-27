import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import {
  apiErrorSchema,
  LEADERBOARD_SIZE,
  leaderboardResponseSchema,
  nicknameSchema,
  submitScoreResponseSchema,
} from '@pq/shared';
import { buildTestApp, FakeClock, playRound, startRound, submitScore } from './helpers';

let app: FastifyInstance;

afterEach(async () => {
  await app?.close();
});

async function board(query = '') {
  const res = await app.inject({ method: 'GET', url: `/api/leaderboard${query}` });
  expect(res.statusCode).toBe(200);
  return leaderboardResponseSchema.parse(res.json());
}

describe('POST /api/leaderboard', () => {
  it('saves a finished round with the score taken from the server', async () => {
    app = await buildTestApp();
    const roundId = await playRound(app, { correctAnswers: 7, topicId: 'music-decades' });

    const res = await submitScore(app, { roundId, nickname: 'Mariia' });

    expect(res.statusCode).toBe(201);
    expect(submitScoreResponseSchema.parse(res.json()).entry).toMatchObject({
      rank: 1,
      nickname: 'Mariia',
      score: 700,
      correctCount: 7,
      totalQuestions: 10,
      topicId: 'music-decades',
    });
  });

  it('rejects a client that sends its own score (strict request contract)', async () => {
    app = await buildTestApp();
    const roundId = await playRound(app, { correctAnswers: 1 });

    const res = await submitScore(app, { roundId, nickname: 'Cheater', score: 1000 });

    expect(res.statusCode).toBe(400);
    expect((await board()).entries).toHaveLength(0);
  });

  it('rejects an unfinished round with 409', async () => {
    app = await buildTestApp();
    const round = await startRound(app);

    const res = await submitScore(app, { roundId: round.roundId, nickname: 'Early' });

    expect(res.statusCode).toBe(409);
  });

  it('accepts a round only once', async () => {
    app = await buildTestApp();
    const roundId = await playRound(app);
    await submitScore(app, { roundId, nickname: 'Once' });

    const res = await submitScore(app, { roundId, nickname: 'Twice' });

    expect(res.statusCode).toBe(409);
    expect((await board()).entries.map((e) => e.nickname)).toEqual(['Once']);
  });

  it('returns 404 for an unknown round', async () => {
    app = await buildTestApp();

    const res = await submitScore(app, {
      roundId: '11111111-1111-4111-8111-111111111111',
      nickname: 'Ghost',
    });

    expect(res.statusCode).toBe(404);
  });

  it.each([
    ['too short', 'A'],
    ['too long', 'A'.repeat(21)],
    ['only spaces', '    '],
    ['markup', '<script>x</script>'],
    ['SQL-like quote', "Robert'); DROP TABLE"],
    ['emoji', 'Cat 🐱'],
  ])('rejects a nickname that is %s', async (_name, nickname) => {
    app = await buildTestApp();
    const roundId = await playRound(app);

    const res = await submitScore(app, { roundId, nickname });

    expect(res.statusCode).toBe(400);
    expect(apiErrorSchema.parse(res.json()).details?.[0]?.path).toBe('nickname');
  });
});

describe('nickname rules', () => {
  it.each(['Марія', 'Łucja_99', 'Jan Kowalski', 'qa-tester.pl', 'AB', 'A'.repeat(20)])(
    'accepts "%s"',
    (nickname) => {
      expect(nicknameSchema.safeParse(nickname).success).toBe(true);
    },
  );

  it('trims surrounding spaces before checking the length', () => {
    expect(nicknameSchema.parse('  Ola  ')).toBe('Ola');
    expect(nicknameSchema.safeParse(' A ').success).toBe(false);
  });
});

describe('GET /api/leaderboard', () => {
  it('orders by score, then by who submitted first', async () => {
    const clock = new FakeClock();
    app = await buildTestApp(clock);
    const scores: Array<[string, number]> = [
      ['Bronze', 5],
      ['Gold', 9],
      ['SilverEarly', 7],
      ['SilverLate', 7],
    ];
    for (const [nickname, correctAnswers] of scores) {
      const roundId = await playRound(app, { correctAnswers });
      clock.advance(1);
      await submitScore(app, { roundId, nickname });
    }

    const { entries } = await board('?topicId=general-knowledge');

    expect(entries.map((e) => [e.rank, e.nickname, e.score])).toEqual([
      [1, 'Gold', 900],
      [2, 'SilverEarly', 700],
      [3, 'SilverLate', 700],
      [4, 'Bronze', 500],
    ]);
  });

  it('keeps topics apart, and the board without a topic covers all of them', async () => {
    app = await buildTestApp();
    for (const topicId of ['music-decades', 'region-history']) {
      const roundId = await playRound(app, { topicId });
      await submitScore(app, { roundId, nickname: topicId.slice(0, 10) });
    }

    expect((await board('?topicId=music-decades')).entries.map((e) => e.nickname)).toEqual([
      'music-deca',
    ]);
    expect((await board()).entries).toHaveLength(2);
    expect((await board()).topicId).toBeNull();
  });

  it(`shows at most the top ${LEADERBOARD_SIZE} but reports the real rank of a lower entry`, async () => {
    app = await buildTestApp();
    for (let i = 0; i < LEADERBOARD_SIZE; i++) {
      const roundId = await playRound(app, { correctAnswers: 10 });
      await submitScore(app, { roundId, nickname: `Pro ${i}` });
    }
    const lowRound = await playRound(app, { correctAnswers: 0 });

    const res = await submitScore(app, { roundId: lowRound, nickname: 'Newbie' });

    expect(submitScoreResponseSchema.parse(res.json()).entry.rank).toBe(LEADERBOARD_SIZE + 1);
    const top = await board('?topicId=general-knowledge');
    expect(top.entries).toHaveLength(LEADERBOARD_SIZE);
    expect(top.entries.some((e) => e.nickname === 'Newbie')).toBe(false);
  });

  it('respects the limit parameter', async () => {
    app = await buildTestApp();
    for (let i = 0; i < 3; i++) {
      await submitScore(app, { roundId: await playRound(app), nickname: `Player ${i}` });
    }

    expect((await board('?limit=2')).entries).toHaveLength(2);
  });

  it.each([
    ['an unknown topic', '?topicId=cooking', 404],
    ['a limit above the maximum', `?limit=${LEADERBOARD_SIZE + 1}`, 400],
    ['a zero limit', '?limit=0', 400],
    ['a non-numeric limit', '?limit=ten', 400],
  ])('rejects %s', async (_name, query, status) => {
    app = await buildTestApp();

    const res = await app.inject({ method: 'GET', url: `/api/leaderboard${query}` });

    expect(res.statusCode).toBe(status);
  });

  it('is empty on a fresh database', async () => {
    app = await buildTestApp();

    expect(await board()).toEqual({ topicId: null, entries: [] });
  });
});
