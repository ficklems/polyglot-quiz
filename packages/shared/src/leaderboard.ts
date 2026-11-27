import { z } from 'zod';
import { topicIdSchema } from './topics';

export const LEADERBOARD_SIZE = 10;
export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 20;

/**
 * Letters of any script (so "Марія" and "Łucja" work), digits, spaces, "_", "-", ".".
 * Everything else is rejected, including "<" and ">", so a nickname can never carry markup.
 */
const NICKNAME_PATTERN = /^[\p{L}\p{N}_.\- ]+$/u;

export const nicknameSchema = z
  .string()
  .trim()
  .min(NICKNAME_MIN, `Nickname must be at least ${NICKNAME_MIN} characters`)
  .max(NICKNAME_MAX, `Nickname must be at most ${NICKNAME_MAX} characters`)
  .regex(NICKNAME_PATTERN, 'Nickname may contain letters, digits, spaces, "_", "-" and "."');

/**
 * The client sends only the round and a nickname. The score is read from the finished round
 * on the server; strictObject rejects a request that tries to send its own score.
 */
export const submitScoreRequestSchema = z.strictObject({
  roundId: z.uuid(),
  nickname: nicknameSchema,
});
export type SubmitScoreRequest = z.infer<typeof submitScoreRequestSchema>;

export const leaderboardEntrySchema = z.strictObject({
  id: z.number().int().positive(),
  rank: z.number().int().positive(),
  nickname: z.string(),
  score: z.number().int().min(0),
  correctCount: z.number().int().min(0),
  totalQuestions: z.number().int().positive(),
  topicId: topicIdSchema,
  createdAt: z.iso.datetime(),
});
export type LeaderboardEntry = z.infer<typeof leaderboardEntrySchema>;

export const submitScoreResponseSchema = z.strictObject({
  entry: leaderboardEntrySchema,
});
export type SubmitScoreResponse = z.infer<typeof submitScoreResponseSchema>;

export const leaderboardQuerySchema = z.object({
  topicId: topicIdSchema.optional(),
  limit: z.coerce.number().int().min(1).max(LEADERBOARD_SIZE).default(LEADERBOARD_SIZE),
});
export type LeaderboardQuery = z.infer<typeof leaderboardQuerySchema>;

export const leaderboardResponseSchema = z.strictObject({
  /** null = all topics together. */
  topicId: topicIdSchema.nullable(),
  entries: z.array(leaderboardEntrySchema).max(LEADERBOARD_SIZE),
});
export type LeaderboardResponse = z.infer<typeof leaderboardResponseSchema>;
