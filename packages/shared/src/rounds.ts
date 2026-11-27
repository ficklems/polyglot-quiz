import { z } from 'zod';
import { languageSchema } from './languages';
import { topicIdSchema } from './topics';

export const QUESTIONS_PER_ROUND = 10;
export const TIME_LIMIT_SECONDS = 20;
export const POINTS_PER_CORRECT = 100;

export const OPTION_IDS = ['a', 'b', 'c', 'd'] as const;
export const optionIdSchema = z.enum(OPTION_IDS);
export type OptionId = z.infer<typeof optionIdSchema>;

export const questionIdSchema = z.string().regex(/^[a-z]+-\d{2,}$/, 'Unknown question id format');

// ---------- POST /api/rounds ----------

export const createRoundRequestSchema = z.object({
  topicId: topicIdSchema,
  lang: languageSchema,
  /** Fixes question and option order. Meant for tests and for replaying a round. */
  seed: z
    .number()
    .int()
    .min(0)
    .max(2 ** 32 - 1)
    .optional(),
});
export type CreateRoundRequest = z.infer<typeof createRoundRequestSchema>;

/** A question as the player sees it: no correct answer, options already shuffled. */
export const roundQuestionSchema = z.strictObject({
  id: questionIdSchema,
  text: z.string().min(1),
  options: z
    .array(z.strictObject({ id: optionIdSchema, text: z.string().min(1) }))
    .length(OPTION_IDS.length),
});
export type RoundQuestion = z.infer<typeof roundQuestionSchema>;

export const roundSchema = z.strictObject({
  roundId: z.uuid(),
  topicId: topicIdSchema,
  lang: languageSchema,
  timeLimitSeconds: z.number().int().positive(),
  questions: z.array(roundQuestionSchema).length(QUESTIONS_PER_ROUND),
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
  topicId: topicIdSchema,
  lang: languageSchema,
  score: z.number().int().min(0),
  correctCount: z.number().int().min(0),
  answeredCount: z.number().int().min(0),
  totalQuestions: z.number().int().positive(),
  finished: z.boolean(),
});
export type RoundSummary = z.infer<typeof roundSummarySchema>;
