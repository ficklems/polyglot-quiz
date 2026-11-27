import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { apiErrorSchema, LANGUAGES, topicsResponseSchema } from '@pq/shared';
import { TOPIC_SEEDS } from '../src/db/seed/topics';
import { buildTestApp } from './helpers';

describe('GET /api/topics', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it.each(LANGUAGES)('returns every topic translated into %s', async (lang) => {
    const res = await app.inject({ method: 'GET', url: `/api/topics?lang=${lang}` });

    expect(res.statusCode).toBe(200);
    const body = topicsResponseSchema.parse(res.json());
    expect(body.lang).toBe(lang);
    expect(body.topics.map((t) => t.id)).toEqual(TOPIC_SEEDS.map((t) => t.id));
    for (const topic of body.topics) {
      const seed = TOPIC_SEEDS.find((t) => t.id === topic.id);
      expect(topic.name).toBe(seed?.translations[lang].name);
    }
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
