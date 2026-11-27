import { expect, type APIRequestContext, type TestInfo } from '@playwright/test';
import {
  leaderboardResponseSchema,
  roundSchema,
  submitScoreResponseSchema,
  type LeaderboardResponse,
  type Round,
} from '@pq/shared';
import { correctOptionId } from '../data/questions';

/** Thin API client for tests: sets up state over HTTP instead of clicking through the UI. */
export class QuizApi {
  constructor(private readonly request: APIRequestContext) {}

  async createRound(body: Record<string, unknown> = {}): Promise<Round> {
    const res = await this.request.post('/api/rounds', {
      data: { topicId: 'general-knowledge', lang: 'en', ...body },
    });
    expect(res.status(), await res.text()).toBe(201);
    return roundSchema.parse(await res.json());
  }

  /** Plays a whole round: the first `correctAnswers` right, the rest wrong. Returns the round. */
  async playRound(correctAnswers: number, body: Record<string, unknown> = {}): Promise<Round> {
    const round = await this.createRound(body);
    for (const [i, q] of round.questions.entries()) {
      if (i > 0) await this.request.post(`/api/rounds/${round.roundId}/next`);
      const correct = correctOptionId(q.id);
      const optionId = i < correctAnswers ? correct : correct === 'a' ? 'b' : 'a';
      const res = await this.request.post(`/api/rounds/${round.roundId}/answers`, {
        data: { questionId: q.id, optionId },
      });
      expect(res.status()).toBe(200);
    }
    return round;
  }

  submit(data: Record<string, unknown>) {
    return this.request.post('/api/leaderboard', { data });
  }

  async submitOk(roundId: string, nickname: string) {
    const res = await this.submit({ roundId, nickname });
    expect(res.status(), await res.text()).toBe(201);
    return submitScoreResponseSchema.parse(await res.json()).entry;
  }

  async board(params: Record<string, string> = {}): Promise<LeaderboardResponse> {
    const res = await this.request.get('/api/leaderboard', { params });
    expect(res.status()).toBe(200);
    return leaderboardResponseSchema.parse(await res.json());
  }
}

/**
 * All tests share one server, so each test signs its entries with its own nickname
 * (≤ 20 characters, allowed characters only).
 */
export function uniqueNickname(testInfo: TestInfo, prefix = 'pw'): string {
  const stamp = (Date.now() % 1e8).toString(36);
  return `${prefix}${testInfo.workerIndex}_${testInfo.repeatEachIndex}_${stamp}`.slice(0, 20);
}
