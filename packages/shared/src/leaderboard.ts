import { z } from 'zod';
import { collectionIdSchema } from './catalog';
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
  /** Exactly one of topicId / collectionId is set: the board the entry belongs to. */
  topicId: topicIdSchema.nullable(),
  collectionId: collectionIdSchema.nullable(),
  createdAt: z.iso.datetime(),
});
export type LeaderboardEntry = z.infer<typeof leaderboardEntrySchema>;

export const submitScoreResponseSchema = z.strictObject({
  entry: leaderboardEntrySchema,
});
export type SubmitScoreResponse = z.infer<typeof submitScoreResponseSchema>;

export const leaderboardQuerySchema = z
  .object({
    topicId: topicIdSchema.optional(),
    collectionId: collectionIdSchema.optional(),
    limit: z.coerce.number().int().min(1).max(LEADERBOARD_SIZE).default(LEADERBOARD_SIZE),
  })
  .refine((q) => !(q.topicId && q.collectionId), {
    message: 'Ask for a topic board or a collection board, not both',
  });
export type LeaderboardQuery = z.infer<typeof leaderboardQuerySchema>;

export const leaderboardResponseSchema = z.strictObject({
  /** Both null = all boards together. */
  topicId: topicIdSchema.nullable(),
  collectionId: collectionIdSchema.nullable(),
  entries: z.array(leaderboardEntrySchema).max(LEADERBOARD_SIZE),
});
export type LeaderboardResponse = z.infer<typeof leaderboardResponseSchema>;

/**
 * "All boards": one row per player. A player's total is the sum of their best score on each
 * board, so replaying the same topic can't pile up points, but every topic played counts.
 * No accounts: the nickname (case-insensitive) is the player.
 */
export const overallPlayerSchema = z.strictObject({
  rank: z.number().int().positive(),
  nickname: z.string(),
  totalScore: z.number().int().min(0),
  /** Topics and themed quizzes with at least one saved round. */
  boardsPlayed: z.number().int().positive(),
});
export type OverallPlayer = z.infer<typeof overallPlayerSchema>;

export const overallQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(LEADERBOARD_SIZE).default(LEADERBOARD_SIZE),
});

export const overallResponseSchema = z.strictObject({
  players: z.array(overallPlayerSchema).max(LEADERBOARD_SIZE),
});
export type OverallResponse = z.infer<typeof overallResponseSchema>;
