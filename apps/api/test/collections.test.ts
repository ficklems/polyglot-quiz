import type { FastifyInstance } from 'fastify';
import { leaderboardResponseSchema, QUESTIONS_PER_ROUND } from '@pq/shared';
import { afterEach, describe, expect, it } from 'vitest';
import { buildTestApp, FIXTURE, playRound, startRound, submitScore } from './helpers';

let app: FastifyInstance;
afterEach(async () => app?.close());

const meta = new Map(FIXTURE.questions.map((q) => [q.record.id, q.record]));
const recordOf = (id: string) => meta.get(id)!;

function createRound(payload: Record<string, unknown>) {
  return app.inject({ method: 'POST', url: '/api/rounds', payload: { lang: 'en', ...payload } });
}

describe('POST /api/rounds with a selection', () => {
  it('draws only from the selected categories and subcategories', async () => {
    app = await buildTestApp();

    const round = await startRound(app, {
      selection: { categories: ['general'], subcategories: ['music/albums'] },
    });

    expect(round.questions).toHaveLength(QUESTIONS_PER_ROUND);
    for (const q of round.questions) {
      const r = recordOf(q.id);
      expect(
        r.category === 'general' || (r.category === 'music' && r.subcategory === 'albums'),
      ).toBe(true);
    }
  });

  it('gives each selected category an equal share, however big it is', async () => {
    app = await buildTestApp();

    // general has 15 playable questions, history 15: 5 + 5 expected.
    const round = await startRound(app, { selection: { categories: ['general', 'history'] } });
    const perCategory = round.questions.reduce<Record<string, number>>((acc, q) => {
      const category = recordOf(q.id).category;
      acc[category] = (acc[category] ?? 0) + 1;
      return acc;
    }, {});

    expect(perCategory).toEqual({ general: 5, history: 5 });
  });

  it('is an unranked custom mix', async () => {
    app = await buildTestApp();

    const round = await startRound(app, { selection: { categories: ['general', 'history'] } });

    expect(round).toMatchObject({ topicId: null, collectionId: null, ranked: false });
  });

  it('treats a selection of exactly one whole category as that ranked topic', async () => {
    app = await buildTestApp();

    const round = await startRound(app, { selection: { categories: ['history'] } });

    expect(round).toMatchObject({ topicId: 'history', collectionId: null, ranked: true });
  });

  it('rejects an unknown category or subcategory with 400', async () => {
    app = await buildTestApp();

    const unknownCategory = await createRound({ selection: { categories: ['cooking'] } });
    const unknownSub = await createRound({ selection: { subcategories: ['music/opera'] } });

    expect(unknownCategory.statusCode).toBe(400);
    expect(unknownSub.statusCode).toBe(400);
  });

  it('rejects an empty selection and more than one source with 400', async () => {
    app = await buildTestApp();

    const empty = await createRound({ selection: { categories: [], subcategories: [] } });
    const two = await createRound({ topicId: 'general', collectionId: 'fifth_grader' });
    const none = await createRound({});

    expect([empty.statusCode, two.statusCode, none.statusCode]).toEqual([400, 400, 400]);
  });

  it('returns 422 with the available count when the selection is too small', async () => {
    app = await buildTestApp();

    const res = await createRound({ selection: { subcategories: ['music/albums'] } });

    expect(res.statusCode).toBe(422);
    expect(res.json().message).toMatch(/has 6 questions in "en", a round needs 10/);
  });
});

describe('POST /api/rounds with a themed quiz', () => {
  it('draws only questions matching the quiz rules and marks the round ranked', async () => {
    app = await buildTestApp();

    const round = await startRound(app, { collectionId: 'fifth_grader' });

    expect(round).toMatchObject({ topicId: null, collectionId: 'fifth_grader', ranked: true });
    expect(round.questions.every((q) => recordOf(q.id).category === 'general')).toBe(true);
  });

  it('plays Millionaire Challenge as 15 questions ordered from easy to hard', async () => {
    app = await buildTestApp();

    const round = await startRound(app, { collectionId: 'millionaire' });
    const rank = { easy: 0, medium: 1, hard: 2 } as const;
    const levels = round.questions.map((q) => rank[recordOf(q.id).difficulty]);

    expect(round.questions).toHaveLength(15);
    expect(levels).toEqual([...levels].sort((a, b) => a - b));
    // The fixture has only 3 easy and 1 hard question in these categories: all are used.
    expect(levels.filter((l) => l === 0)).toHaveLength(3);
    expect(levels.filter((l) => l === 2)).toHaveLength(1);
  });

  it('balances Generations by decade', async () => {
    app = await buildTestApp();

    const round = await startRound(app, { collectionId: 'generations' });
    const decades = round.questions.map((q) =>
      recordOf(q.id).tags.find((t) => /^\d{4}s$/.test(t))!,
    );
    const counts = Object.values(
      decades.reduce<Record<string, number>>((acc, d) => ({ ...acc, [d]: (acc[d] ?? 0) + 1 }), {}),
    );

    // 7 decades in the fixture, 10 questions: no decade gets more than 2.
    expect(new Set(decades).size).toBe(7);
    expect(Math.max(...counts)).toBeLessThanOrEqual(2);
  });

  it('returns 422 for a themed quiz without enough questions and 404 for an unknown one', async () => {
    app = await buildTestApp();

    const thin = await createRound({ collectionId: 'back_to_80s' });
    const unknown = await createRound({ collectionId: 'no_such_quiz' });

    expect(thin.statusCode).toBe(422);
    expect(unknown.statusCode).toBe(404);
  });
});

describe('leaderboard for themed quizzes and custom mixes', () => {
  it('keeps a board per themed quiz, apart from the topic boards', async () => {
    app = await buildTestApp();
    const quizRound = await playRound(app, { collectionId: 'fifth_grader', correctAnswers: 3 });
    const topicRound = await playRound(app, { topicId: 'general', correctAnswers: 9 });
    await submitScore(app, { roundId: quizRound, nickname: 'Quizzer' });
    await submitScore(app, { roundId: topicRound, nickname: 'Topical' });

    const res = await app.inject({
      method: 'GET',
      url: '/api/leaderboard?collectionId=fifth_grader',
    });
    const board = leaderboardResponseSchema.parse(res.json());

    expect(board.collectionId).toBe('fifth_grader');
    expect(board.entries.map((e) => [e.nickname, e.rank, e.collectionId, e.topicId])).toEqual([
      ['Quizzer', 1, 'fifth_grader', null],
    ]);
  });

  it('does not rank a custom mix (422)', async () => {
    app = await buildTestApp();
    const roundId = await playRound(app, { selection: { categories: ['general', 'history'] } });

    const res = await submitScore(app, { roundId, nickname: 'Mixer' });

    expect(res.statusCode).toBe(422);
    expect(res.json().message).toBe('Custom mixes are not ranked');
  });

  it('rejects an unknown quiz board with 404 and asking for two boards with 400', async () => {
    app = await buildTestApp();

    const unknown = await app.inject({ method: 'GET', url: '/api/leaderboard?collectionId=nope' });
    const both = await app.inject({
      method: 'GET',
      url: '/api/leaderboard?collectionId=fifth_grader&topicId=general',
    });

    expect(unknown.statusCode).toBe(404);
    expect(both.statusCode).toBe(400);
  });
});
