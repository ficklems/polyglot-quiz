import { expect, test } from '@playwright/test';
import { questionCount, TOPIC_COUNT } from '../data/questions';
import { apiErrorSchema, healthResponseSchema, LANGUAGES, topicsResponseSchema } from '@pq/shared';

test.describe('GET /api/health', () => {
  test('reports the service as up @smoke', async ({ request }) => {
    const res = await request.get('/api/health');

    expect(res.status()).toBe(200);
    expect(healthResponseSchema.parse(await res.json())).toEqual({ status: 'ok' });
  });
});

test.describe('GET /api/topics', () => {
  for (const lang of LANGUAGES) {
    test(`returns the topics in ${lang} matching the contract`, async ({ request }) => {
      const res = await request.get('/api/topics', { params: { lang } });

      expect(res.status()).toBe(200);
      expect(res.headers()['content-type']).toContain('application/json');
      const body = topicsResponseSchema.parse(await res.json());
      expect(body.lang).toBe(lang);
      expect(body.topics).toHaveLength(TOPIC_COUNT);
      // The API and the content oracle must agree on what can be played.
      for (const topic of body.topics) {
        expect(topic.questionCount, topic.id).toBe(questionCount(topic.id, lang));
      }
    });
  }

  test('returns the same topic ids in the same order for every language', async ({ request }) => {
    const idsByLang = await Promise.all(
      LANGUAGES.map(async (lang) => {
        const body = topicsResponseSchema.parse(
          await (await request.get('/api/topics', { params: { lang } })).json(),
        );
        return body.topics.map((t) => t.id);
      }),
    );

    for (const ids of idsByLang) {
      expect(ids).toEqual(idsByLang[0]);
    }
  });

  const invalidQueries: Array<[string, Record<string, string>]> = [
    ['missing lang', {}],
    ['unsupported lang', { lang: 'ru' }],
    ['upper-case lang', { lang: 'EN' }],
    ['empty lang', { lang: '' }],
  ];

  for (const [name, params] of invalidQueries) {
    test(`rejects ${name} with 400 in the error format`, async ({ request }) => {
      const res = await request.get('/api/topics', { params });

      expect(res.status()).toBe(400);
      const body = apiErrorSchema.parse(await res.json());
      expect(body.details?.some((d) => d.path === 'lang')).toBe(true);
    });
  }
});

test.describe('Unknown routes', () => {
  test('return 404 in the error format', async ({ request }) => {
    const res = await request.get('/api/does-not-exist');

    expect(res.status()).toBe(404);
    expect(apiErrorSchema.parse(await res.json()).statusCode).toBe(404);
  });
});
