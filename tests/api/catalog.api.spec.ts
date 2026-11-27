import { expect, test } from '@playwright/test';
import { apiErrorSchema, catalogResponseSchema, LANGUAGES, roundSchema } from '@pq/shared';
import {
  COLLECTION_COUNT,
  collectionName,
  questionCount,
  subcategoryCount,
  TOPIC_COUNT,
} from '../data/questions';

test.describe('GET /api/catalog', () => {
  for (const lang of LANGUAGES) {
    test(`lists categories, subcategories and themed quizzes in ${lang} @smoke`, async ({
      request,
    }) => {
      const res = await request.get('/api/catalog', { params: { lang } });

      expect(res.status()).toBe(200);
      const body = catalogResponseSchema.parse(await res.json());
      expect(body.categories).toHaveLength(TOPIC_COUNT);
      expect(body.collections).toHaveLength(COLLECTION_COUNT);
      // The API and the content oracle agree on what can be played.
      for (const category of body.categories) {
        expect(category.questionCount, category.id).toBe(questionCount(category.id, lang));
        for (const sub of category.subcategories) {
          const subId = sub.id.split('/')[1]!;
          expect(sub.questionCount, sub.id).toBe(subcategoryCount(category.id, subId, lang));
        }
      }
      expect(body.collections.find((c) => c.id === 'millionaire')?.name).toBe(
        collectionName('millionaire', lang),
      );
    });
  }

  test('counts under a chosen region and difficulty', async ({ request }) => {
    const res = await request.get('/api/catalog', {
      params: { lang: 'pl', region: 'all', difficulty: 'mixed' },
    });

    const body = catalogResponseSchema.parse(await res.json());
    expect(body).toMatchObject({ region: 'all', difficulty: 'mixed' });
    for (const category of body.categories) {
      expect(category.questionCount, category.id).toBe(questionCount(category.id, 'pl', 'all'));
    }
  });

  test('a single difficulty never counts more than Mixed', async ({ request }) => {
    const get = async (difficulty: string) =>
      catalogResponseSchema.parse(
        await (await request.get('/api/catalog', { params: { lang: 'en', difficulty } })).json(),
      );
    const [mixed, easy] = await Promise.all([get('mixed'), get('easy')]);

    for (const category of easy.categories) {
      const all = mixed.categories.find((c) => c.id === category.id)!;
      expect(category.questionCount, category.id).toBeLessThanOrEqual(all.questionCount);
    }
  });

  test('rejects an unsupported language with 400', async ({ request }) => {
    const res = await request.get('/api/catalog', { params: { lang: 'de' } });

    expect(res.status()).toBe(400);
    apiErrorSchema.parse(await res.json());
  });
});

test.describe('POST /api/rounds sources', () => {
  test('a themed quiz round is ranked and tagged with the quiz', async ({ request }) => {
    const res = await request.post('/api/rounds', {
      data: { lang: 'pl', collectionId: 'millionaire' },
    });

    expect(res.status()).toBe(201);
    const round = roundSchema.parse(await res.json());
    expect(round).toMatchObject({ collectionId: 'millionaire', topicId: null, ranked: true });
    expect(round.questions).toHaveLength(15);
  });

  test('a mix of categories is not ranked', async ({ request }) => {
    const res = await request.post('/api/rounds', {
      data: { lang: 'en', selection: { categories: ['music', 'geography'] } },
    });

    expect(res.status()).toBe(201);
    expect(roundSchema.parse(await res.json())).toMatchObject({
      topicId: null,
      collectionId: null,
      ranked: false,
    });
  });

  test('rejects sending two sources, or none, with 400', async ({ request }) => {
    const two = await request.post('/api/rounds', {
      data: { lang: 'en', topicId: 'music', collectionId: 'pub_quiz' },
    });
    const none = await request.post('/api/rounds', { data: { lang: 'en' } });

    expect([two.status(), none.status()]).toEqual([400, 400]);
  });

  test('returns 404 for an unknown themed quiz', async ({ request }) => {
    const res = await request.post('/api/rounds', {
      data: { lang: 'en', collectionId: 'no_such_quiz' },
    });

    expect(res.status()).toBe(404);
  });
});
