import {
  leaderboardResponseSchema,
  submitScoreResponseSchema,
  type LeaderboardEntry,
  type LeaderboardResponse,
} from '@pq/shared';
import { getJson, postJson } from '../../../shared/api/http';
import { boardQuery, type Board } from '../leaderboard.utils';

export async function fetchLeaderboard(
  board: Board,
  signal?: AbortSignal,
): Promise<LeaderboardResponse> {
  return leaderboardResponseSchema.parse(
    await getJson(`/api/leaderboard${boardQuery(board)}`, signal),
  );
}

export async function submitScore(roundId: string, nickname: string): Promise<LeaderboardEntry> {
  return submitScoreResponseSchema.parse(await postJson('/api/leaderboard', { roundId, nickname }))
    .entry;
}
