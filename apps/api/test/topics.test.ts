import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { apiErrorSchema, LANGUAGES, topicsResponseSchema } from '@pq/shared';
import { buildTestApp, FIXTURE } from './helpers';

describe('GET /api/topics', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  async function topics(lang: string) {
    const res = await app.inject({ method: 'GET', url: `/api/topics?lang=${lang}` });
    expect(res.statusCode).toBe(200);
    return topicsResponseSchema.parse(res.json()).topics;
  }

  it.each(LANGUAGES)(
    'returns every category, translated into %s, in content order',
    async (lang) => {
      const body = await topics(lang);

      expect(body.map((t) => t.id)).toEqual(FIXTURE.categories.map((c) => c.id));
      for (const topic of body) {
        expect(topic.name).toBe(FIXTURE.categories.find((c) => c.id === topic.id)?.name[lang]);
      }
    },
  );

  it('counts only questions that can be played in that language', async () => {
    const count = (list: Awaited<ReturnType<typeof topics>>, id: string) =>
      list.find((t) => t.id === id)?.questionCount;
    const [uk, en] = [await topics('uk'), await topics('en')];

    expect(count(en, 'music')).toBe(15);
    // memes fixture: true/false, flagged-in-uk, machine-translated-uk, one of two exact
    // duplicates. Not counted: profanity, the second duplicate, an "order" question.
    expect(count(en, 'memes')).toBe(4);
    expect(count(uk, 'memes')).toBe(2);
  });

  it('rejects an unsupported language with 400 and a detail for "lang"', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/topics?lang=ru' });

    expect(res.statusCode).toBe(400);
    const body = apiErrorSchema.parse(res.json());
    expect(body.details?.[0]?.path).toBe('lang');
  });

  it('rejects a request without a language with 400', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/topics' });

    expect(res.statusCode).toBe(400);
  });
});

describe('unknown routes', () => {
  it('returns 404 in the shared error format', async () => {
    const app = await buildTestApp();
    const res = await app.inject({ method: 'GET', url: '/api/nope' });
    await app.close();

    expect(res.statusCode).toBe(404);
    expect(apiErrorSchema.parse(res.json()).error).toBe('Not Found');
  });
});
