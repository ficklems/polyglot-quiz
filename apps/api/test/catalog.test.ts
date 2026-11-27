import type { FastifyInstance } from 'fastify';
import { catalogResponseSchema, type CatalogResponse, type Language } from '@pq/shared';
import { afterEach, describe, expect, it } from 'vitest';
import { buildTestApp } from './helpers';

let app: FastifyInstance;
afterEach(async () => app?.close());

async function catalog(lang: Language): Promise<CatalogResponse> {
  const res = await app.inject({ method: 'GET', url: `/api/catalog?lang=${lang}` });
  expect(res.statusCode).toBe(200);
  return catalogResponseSchema.parse(res.json());
}

describe('GET /api/catalog', () => {
  it('lists categories with localized names and playable counts', async () => {
    app = await buildTestApp();

    const { categories } = await catalog('pl');

    expect(categories.map((c) => c.id)).toEqual(['music', 'history', 'general', 'memes']);
    expect(categories.find((c) => c.id === 'general')).toMatchObject({
      name: 'Wiedza ogólna',
      questionCount: 15,
    });
  });

  it('lists only subcategories that have playable questions, with counts adding up', async () => {
    app = await buildTestApp();

    const { categories } = await catalog('en');

    for (const category of categories) {
      const sum = category.subcategories.reduce((total, s) => total + s.questionCount, 0);
      expect(sum, category.id).toBe(category.questionCount);
      for (const sub of category.subcategories) {
        expect(sub.id.startsWith(`${category.id}/`)).toBe(true);
        expect(sub.questionCount).toBeGreaterThan(0);
      }
    }
  });

  it('includes subcategories that are used by questions but not declared', async () => {
    app = await buildTestApp();

    const music = (await catalog('en')).categories.find((c) => c.id === 'music')!;

    // The fixture declares only albums and eurovision.
    expect(music.subcategories.map((s) => s.id)).toEqual(
      expect.arrayContaining(['music/albums', 'music/eurovision', 'music/international_hits']),
    );
  });

  it('names subcategories in the requested language and falls back to a readable id', async () => {
    app = await buildTestApp();

    const music = (await catalog('uk')).categories.find((c) => c.id === 'music')!;
    const names = Object.fromEntries(music.subcategories.map((s) => [s.id, s.name]));

    expect(names['music/albums']).toBe('Альбоми');
    expect(names['music/international_hits']).toBe('international hits');
  });

  it('lists themed quizzes with their round size and whether they can be played', async () => {
    app = await buildTestApp();

    const { collections } = await catalog('en');
    const byId = Object.fromEntries(collections.map((c) => [c.id, c]));

    expect(byId['millionaire']).toMatchObject({ questionsPerRound: 15, playable: true });
    expect(byId['fifth_grader']).toMatchObject({
      name: 'Smarter than a 5th grader',
      questionCount: 15,
      questionsPerRound: 10,
      playable: true,
    });
    // Only 5 questions carry the 1980s tag.
    expect(byId['back_to_80s']).toMatchObject({ questionCount: 5, playable: false });
  });

  it('rejects an unknown language with 400', async () => {
    app = await buildTestApp();

    const res = await app.inject({ method: 'GET', url: '/api/catalog?lang=de' });

    expect(res.statusCode).toBe(400);
  });
});
