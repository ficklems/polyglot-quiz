import type { FastifyInstance } from 'fastify';
import { catalogResponseSchema, roundSchema, type CatalogResponse } from '@pq/shared';
import { afterEach, describe, expect, it } from 'vitest';
import { buildTestApp, FIXTURE, playRound, submitScore } from './helpers';

/*
 * Fixture regions: general (15) and memes are global; history is UA/PL/CE only; music is
 * mostly global with a few UA/PL. Difficulty: almost everything is medium, memes are easy.
 */
let app: FastifyInstance;
afterEach(async () => app?.close());

const record = new Map(FIXTURE.questions.map((q) => [q.record.id, q.record]));

function create(payload: Record<string, unknown>) {
  return app.inject({ method: 'POST', url: '/api/rounds', payload: { lang: 'en', ...payload } });
}

async function created(payload: Record<string, unknown>) {
  const res = await create(payload);
  expect(res.statusCode, res.body).toBe(201);
  return roundSchema.parse(res.json());
}

async function catalog(query: string): Promise<CatalogResponse> {
  const res = await app.inject({ method: 'GET', url: `/api/catalog?${query}` });
  expect(res.statusCode, res.body).toBe(200);
  return catalogResponseSchema.parse(res.json());
}

describe('region setting', () => {
  it('by default follows the language: English players get global and English-speaking questions', async () => {
    app = await buildTestApp();

    const round = await created({ selection: { categories: ['general', 'music'] } });

    for (const q of round.questions) {
      expect(['global', 'EN'], q.id).toContain(record.get(q.id)!.region);
    }
  });

  it('a named region adds its own questions to the global ones', async () => {
    app = await buildTestApp();

    const round = await created({
      selection: { categories: ['general', 'history'] },
      region: 'UA',
    });
    const regions = new Set(round.questions.map((q) => record.get(q.id)!.region));

    expect([...regions].every((r) => r === 'global' || r === 'UA')).toBe(true);
    expect(regions.has('UA')).toBe(true);
  });

  it('reports the smaller pool honestly instead of filling it with other regions', async () => {
    app = await buildTestApp();

    // History has only regional questions: none of them is English-speaking.
    const res = await create({ topicId: 'history' });

    expect(res.statusCode).toBe(422);
    expect(res.json().message).toMatch(/has 0 questions in "en" \(region auto/);
  });

  it('counts the catalog under the region: history is empty in English by default', async () => {
    app = await buildTestApp();

    const auto = await catalog('lang=en');
    const all = await catalog('lang=en&region=all');
    const history = (c: CatalogResponse) => c.categories.find((x) => x.id === 'history')!;

    expect(auto).toMatchObject({ region: 'auto', difficulty: 'mixed' });
    expect(history(auto).questionCount).toBe(0);
    expect(history(all).questionCount).toBe(15);
  });

  it('Only Locals uses strictly the language region, even with "all regions"', async () => {
    app = await buildTestApp();

    const pl = (await catalog('lang=pl&region=all')).collections.find(
      (c) => c.id === 'only_locals',
    )!;
    const uk = (await catalog('lang=uk')).collections.find((c) => c.id === 'only_locals')!;

    // 8 PL history + 1 PL music; 5 UA history + 4 UA music.
    expect(pl).toMatchObject({ strictRegion: true, questionCount: 9, playable: false });
    expect(uk.questionCount).toBe(9);
  });

  it('rejects an unknown region with 400', async () => {
    app = await buildTestApp();

    expect((await create({ topicId: 'general', region: 'US' })).statusCode).toBe(400);
  });
});

describe('difficulty setting', () => {
  it('a level returns only questions of that level', async () => {
    app = await buildTestApp();

    const round = await created({ topicId: 'general', region: 'all', difficulty: 'medium' });

    expect(round.questions.every((q) => record.get(q.id)!.difficulty === 'medium')).toBe(true);
  });

  it('says how many questions are left at that level', async () => {
    app = await buildTestApp();

    const res = await create({
      selection: { categories: ['music', 'history', 'memes'] },
      region: 'all',
      difficulty: 'easy',
    });

    // 1 music + 2 history + the playable easy memes (some memes are withheld or not playable).
    expect(res.statusCode).toBe(422);
    expect(res.json().message).toMatch(/has 7 questions .*difficulty easy\), a round needs 10/);
  });

  it('Millionaire Challenge keeps its own sequence whatever the level', async () => {
    app = await buildTestApp();

    const round = await created({ collectionId: 'millionaire', region: 'all', difficulty: 'hard' });

    expect(round.questions).toHaveLength(15);
    expect(round.ranked).toBe(true);
  });

  it('rejects "extreme" with 400', async () => {
    app = await buildTestApp();

    expect((await create({ topicId: 'general', difficulty: 'extreme' })).statusCode).toBe(400);
  });
});

describe('question count', () => {
  it('plays 20 questions when asked', async () => {
    app = await buildTestApp();

    const round = await created({
      selection: { categories: ['general', 'music'] },
      region: 'all',
      questionCount: 20,
    });

    expect(round.questions).toHaveLength(20);
    expect(new Set(round.questions.map((q) => q.id)).size).toBe(20);
  });

  it('refuses a length the pool cannot fill and lengths other than 10/20/30/50', async () => {
    app = await buildTestApp();

    const tooLong = await create({ topicId: 'general', region: 'all', questionCount: 20 });
    const odd = await create({ topicId: 'general', region: 'all', questionCount: 15 });

    expect(tooLong.statusCode).toBe(422);
    expect(odd.statusCode).toBe(400);
  });
});

describe('ranking only standard rounds', () => {
  it('ranks 10 mixed-difficulty questions, not easier or longer rounds', async () => {
    app = await buildTestApp();

    const standard = await created({ topicId: 'general', region: 'all' });
    const medium = await created({ topicId: 'general', region: 'all', difficulty: 'medium' });
    const longer = await created({ collectionId: 'generations', region: 'all', questionCount: 20 });

    expect([standard.ranked, medium.ranked, longer.ranked]).toEqual([true, false, false]);
  });

  it('refuses to save a non-standard round on the leaderboard', async () => {
    app = await buildTestApp();
    const roundId = await playRound(app, { topicId: 'general', difficulty: 'medium' });

    const res = await submitScore(app, { roundId, nickname: 'Shortcut' });

    expect(res.statusCode).toBe(422);
  });
});

describe('recently played questions', () => {
  it('prefers questions the player has not seen and reports any repeats', async () => {
    app = await buildTestApp();
    const first = await created({ topicId: 'general', region: 'all', seed: 1 });
    const seen = first.questions.map((q) => q.id);

    const second = await created({ topicId: 'general', region: 'all', seed: 2, avoidIds: seen });

    // 15 general questions: the 5 unseen ones come first, then 5 repeats.
    const repeated = second.questions.filter((q) => seen.includes(q.id));
    expect(second.repeatedCount).toBe(5);
    expect(repeated).toHaveLength(5);
  });

  it('reports no repeats when the pool is large enough', async () => {
    app = await buildTestApp();

    const round = await created({ topicId: 'general', region: 'all', avoidIds: ['general-01'] });

    expect(round.repeatedCount).toBe(0);
    expect(round.questions.map((q) => q.id)).not.toContain('general-01');
  });
});
