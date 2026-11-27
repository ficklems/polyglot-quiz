import { z } from 'zod';
import { languageSchema } from './languages';
import { collectionIdSchema, selectionSchema } from './catalog';
import { topicIdSchema } from './topics';

export const QUESTIONS_PER_ROUND = 10;
export const MAX_QUESTIONS_PER_ROUND = 50;
export const TIME_LIMIT_SECONDS = 20;
export const POINTS_PER_CORRECT = 100;

/** Option ids as stored in the content: o1, o2, … (stable, independent of display order). */
export const optionIdSchema = z.string().regex(/^o[1-9]$/, 'Unknown option id');
export type OptionId = z.infer<typeof optionIdSchema>;

export const questionIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{3,64}$/, 'Unknown question id format');

// ---------- POST /api/rounds ----------

/**
 * Exactly one source of questions: a single topic (category), the player's own selection
 * of categories and subcategories, or a themed quiz (collection).
 */
export const createRoundRequestSchema = z
  .object({
    lang: languageSchema,
    topicId: topicIdSchema.optional(),
    selection: selectionSchema.optional(),
    collectionId: collectionIdSchema.optional(),
    /** Fixes question and option order. Meant for tests and for replaying a round. */
    seed: z
      .number()
      .int()
      .min(0)
      .max(2 ** 32 - 1)
      .optional(),
  })
  .refine(
    (r) =>
      [r.topicId, r.selection, r.collectionId].filter((source) => source !== undefined).length ===
      1,
    { message: 'Send exactly one of topicId, selection or collectionId' },
  );
export type CreateRoundRequest = z.infer<typeof createRoundRequestSchema>;
/** What a client sends (defaults not applied yet, e.g. `subcategories` may be left out). */
export type CreateRoundInput = z.input<typeof createRoundRequestSchema>;

/** A question as the player sees it: no correct answer, options already shuffled. */
export const roundQuestionSchema = z.strictObject({
  id: questionIdSchema,
  text: z.string().min(1),
  options: z
    .array(z.strictObject({ id: optionIdSchema, text: z.string().min(1) }))
    .min(2)
    .max(4),
});
export type RoundQuestion = z.infer<typeof roundQuestionSchema>;

export const roundSchema = z.strictObject({
  roundId: z.uuid(),
  /** Set for a single-topic round (also a selection of exactly one whole category). */
  topicId: topicIdSchema.nullable(),
  /** Set for a themed quiz. */
  collectionId: collectionIdSchema.nullable(),
  /** Only topic and themed-quiz rounds go on the leaderboard; custom mixes don't. */
  ranked: z.boolean(),
  lang: languageSchema,
  timeLimitSeconds: z.number().int().positive(),
  questions: z.array(roundQuestionSchema).min(1).max(MAX_QUESTIONS_PER_ROUND),
});
export type Round = z.infer<typeof roundSchema>;

// ---------- POST /api/rounds/:roundId/answers ----------

export const roundParamsSchema = z.object({ roundId: z.uuid() });

export const answerRequestSchema = z.object({
  questionId: questionIdSchema,
  /** null = the timer ran out before the player picked an option. */
  optionId: optionIdSchema.nullable(),
});
export type AnswerRequest = z.infer<typeof answerRequestSchema>;

export const answerResultSchema = z.strictObject({
  questionId: questionIdSchema,
  correct: z.boolean(),
  timedOut: z.boolean(),
  correctOptionId: optionIdSchema,
  pointsAwarded: z.number().int().min(0),
  score: z.number().int().min(0),
  answeredCount: z.number().int().min(1),
  totalQuestions: z.number().int().positive(),
  finished: z.boolean(),
});
export type AnswerResult = z.infer<typeof answerResultSchema>;

// ---------- GET /api/rounds/:roundId ----------

export const roundSummarySchema = z.strictObject({
  roundId: z.uuid(),
  topicId: topicIdSchema.nullable(),
  collectionId: collectionIdSchema.nullable(),
  ranked: z.boolean(),
  lang: languageSchema,
  score: z.number().int().min(0),
  correctCount: z.number().int().min(0),
  answeredCount: z.number().int().min(0),
  totalQuestions: z.number().int().positive(),
  finished: z.boolean(),
});
export type RoundSummary = z.infer<typeof roundSummarySchema>;
