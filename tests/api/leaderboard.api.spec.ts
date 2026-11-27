import {
  apiErrorSchema,
  LEADERBOARD_SIZE,
  POINTS_PER_CORRECT,
  QUESTIONS_PER_ROUND,
} from '@pq/shared';
import { expect, test, uniqueNickname } from '../fixtures';

// The server is shared by all tests, so these checks never assume an empty leaderboard:
// they use their own nicknames and check invariants (order, ranks) instead of exact contents.

test.describe('POST /api/leaderboard', () => {
  test('saves a finished round with the score computed by the server @smoke', async ({
    quizApi,
  }, testInfo) => {
    const round = await quizApi.playRound(6, { topicId: 'music-decades' });
    const nickname = uniqueNickname(testInfo);

    const entry = await quizApi.submitOk(round.roundId, nickname);

    expect(entry).toMatchObject({
      nickname,
      topicId: 'music-decades',
      score: 6 * POINTS_PER_CORRECT,
      correctCount: 6,
      totalQuestions: QUESTIONS_PER_ROUND,
    });
    expect(entry.rank).toBeGreaterThanOrEqual(1);
  });

  test('the reported rank matches the position on the topic board', async ({
    quizApi,
  }, testInfo) => {
    const round = await quizApi.playRound(QUESTIONS_PER_ROUND, { topicId: 'region-history' });
    const entry = await quizApi.submitOk(round.roundId, uniqueNickname(testInfo));

    const { entries } = await quizApi.board({ topicId: 'region-history' });

    if (entry.rank <= LEADERBOARD_SIZE) {
      expect(entries[entry.rank - 1]?.id).toBe(entry.id);
    } else {
      expect(entries.some((e) => e.id === entry.id)).toBe(false);
    }
  });

  test('a request carrying its own score is rejected', async ({ quizApi }, testInfo) => {
    const round = await quizApi.playRound(0);

    const res = await quizApi.submit({
      roundId: round.roundId,
      nickname: uniqueNickname(testInfo),
      score: 1_000_000,
    });

    expect(res.status()).toBe(400);
  });

  test('an unfinished round cannot be submitted (409)', async ({ quizApi }, testInfo) => {
    const round = await quizApi.createRound();

    const res = await quizApi.submit({
      roundId: round.roundId,
      nickname: uniqueNickname(testInfo),
    });

    expect(res.status()).toBe(409);
    apiErrorSchema.parse(await res.json());
  });

  test('a round can be submitted only once (409)', async ({ quizApi }, testInfo) => {
    const round = await quizApi.playRound(3);
    await quizApi.submitOk(round.roundId, uniqueNickname(testInfo, 'a'));

    const res = await quizApi.submit({
      roundId: round.roundId,
      nickname: uniqueNickname(testInfo, 'b'),
    });

    expect(res.status()).toBe(409);
  });

  const badNicknames: Array<[string, string]> = [
    ['too short', 'x'],
    ['too long', 'x'.repeat(21)],
    ['markup', '<img src=x>'],
    ['whitespace only', '   '],
  ];
  for (const [name, nickname] of badNicknames) {
    test(`rejects a nickname that is ${name} (400)`, async ({ quizApi }) => {
      const round = await quizApi.playRound(1);

      const res = await quizApi.submit({ roundId: round.roundId, nickname });

      expect(res.status()).toBe(400);
      expect(apiErrorSchema.parse(await res.json()).details?.[0]?.path).toBe('nickname');
    });
  }
});

test.describe('GET /api/leaderboard', () => {
  test('is sorted by score with consecutive ranks, on every board', async ({ quizApi }) => {
    for (const topicId of [undefined, 'music-decades', 'region-history', 'general-knowledge']) {
      const { entries } = await quizApi.board(topicId ? { topicId } : {});

      expect(entries.length).toBeLessThanOrEqual(LEADERBOARD_SIZE);
      entries.forEach((entry, i) => {
        expect(entry.rank).toBe(i + 1);
        if (i > 0) expect(entry.score).toBeLessThanOrEqual(entries[i - 1]!.score);
        if (topicId) expect(entry.topicId).toBe(topicId);
      });
    }
  });

  test('respects the limit', async ({ quizApi }, testInfo) => {
    for (let i = 0; i < 2; i++) {
      const round = await quizApi.playRound(5);
      await quizApi.submitOk(round.roundId, uniqueNickname(testInfo, `l${i}`));
    }

    expect((await quizApi.board({ limit: '1' })).entries).toHaveLength(1);
  });

  const invalid: Array<[string, Record<string, string>, number]> = [
    ['an unknown topic', { topicId: 'astrology' }, 404],
    ['a limit above 10', { limit: '11' }, 400],
    ['a negative limit', { limit: '-1' }, 400],
  ];
  for (const [name, params, status] of invalid) {
    test(`rejects ${name} (${status})`, async ({ request }) => {
      const res = await request.get('/api/leaderboard', { params });

      expect(res.status()).toBe(status);
      apiErrorSchema.parse(await res.json());
    });
  }
});
