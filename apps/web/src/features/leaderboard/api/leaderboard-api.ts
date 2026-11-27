import {
  leaderboardResponseSchema,
  submitScoreResponseSchema,
  type LeaderboardEntry,
  type LeaderboardResponse,
} from '@pq/shared';
import { getJson, postJson } from '../../../shared/api/http';

export async function fetchLeaderboard(
  topicId: string | null,
  signal?: AbortSignal,
): Promise<LeaderboardResponse> {
  const query = topicId ? `?topicId=${encodeURIComponent(topicId)}` : '';
  return leaderboardResponseSchema.parse(await getJson(`/api/leaderboard${query}`, signal));
}

export async function submitScore(roundId: string, nickname: string): Promise<LeaderboardEntry> {
  return submitScoreResponseSchema.parse(await postJson('/api/leaderboard', { roundId, nickname }))
    .entry;
}
