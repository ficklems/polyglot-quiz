import { z } from 'zod';
import { LANGUAGES, type Language } from './languages';

/*
 * Schema of a question record in the content dataset (content/questions/*.jsonl.gz and
 * content/legacy/questions.jsonl). Used by the importer, the API and the content tests.
 */

export const QUESTION_TYPES = [
  'multiple_choice',
  'true_false',
  'guess_year',
  'order',
  'emoji',
  'higher_lower',
  'matching',
  'guess_location',
] as const;
export const questionTypeSchema = z.enum(QUESTION_TYPES);
export type QuestionType = z.infer<typeof questionTypeSchema>;

/** Types played by picking one option; the others need their own UI (milestone "formats"). */
export const SINGLE_ANSWER_TYPES: readonly QuestionType[] = [
  'multiple_choice',
  'true_false',
  'guess_year',
  'emoji',
  'higher_lower',
  'guess_location',
];

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export const difficultySchema = z.enum(DIFFICULTIES);
export type Difficulty = z.infer<typeof difficultySchema>;

export const REGIONS = ['global', 'UA', 'PL', 'CE', 'EN'] as const;
export const regionSchema = z.enum(REGIONS);
export type Region = z.infer<typeof regionSchema>;

export const contentOptionIdSchema = z.string().regex(/^o[1-9]$/);
const itemIdSchema = z.string().regex(/^[lr][1-9]$/);

const textItemSchema = z.object({ id: z.string().min(1), text: z.string().min(1) });

export const localizationSchema = z.object({
  prompt: z.string().min(1),
  options: z.array(textItemSchema.extend({ id: contentOptionIdSchema })).optional(),
  leftItems: z.array(textItemSchema.extend({ id: itemIdSchema })).optional(),
  rightItems: z.array(textItemSchema.extend({ id: itemIdSchema })).optional(),
  explanation: z.string().nullable().optional(),
  answerFeedback: z.string().nullable().optional(),
});
export type Localization = z.infer<typeof localizationSchema>;

export const answerKeySchema = z.union([
  z.object({ correctOptionId: contentOptionIdSchema }),
  z.object({ orderedOptionIds: z.array(contentOptionIdSchema).min(2) }),
  z.object({
    pairs: z.array(z.object({ leftId: itemIdSchema, rightId: itemIdSchema })).min(2),
  }),
]);
export type AnswerKey = z.infer<typeof answerKeySchema>;

export const questionRecordSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{3,64}$/),
  factKey: z.string().min(1),
  category: z.string().min(1),
  subcategory: z.string().min(1),
  region: regionSchema,
  difficulty: difficultySchema,
  type: questionTypeSchema,
  tags: z.array(z.string()),
  localizations: z.object({
    uk: localizationSchema,
    en: localizationSchema,
    pl: localizationSchema,
  }),
  answer: answerKeySchema,
  reviewStatus: z.enum(['draft', 'verified', 'published']),
  sources: z.array(z.unknown()),
  contentFlags: z.array(z.string()).optional(),
  geo: z.unknown().optional(),
  emoji: z.unknown().optional(),
  originalQuote: z.unknown().optional(),
  qualityReview: z.record(z.string(), z.unknown()).optional(),
});
export type QuestionRecord = z.infer<typeof questionRecordSchema>;

export const categorySchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/),
  name: z.object({ uk: z.string().min(1), en: z.string().min(1), pl: z.string().min(1) }),
  subcategories: z.array(z.string()),
});
export type Category = z.infer<typeof categorySchema>;

/** Why a record is not served in a locale. Empty = served. */
export const EXCLUSION_REASONS = [
  'quarantined',
  'duplicate',
  'open_translation_flag',
  'music_name_review_pending',
  'critical_flag_remaining',
  'profanity',
  'machine_translation_unreviewed',
] as const;
export type ExclusionReason = (typeof EXCLUSION_REASONS)[number];

export type Servability = Record<Language, ExclusionReason[]>;

export function emptyServability(): Servability {
  return Object.fromEntries(LANGUAGES.map((l) => [l, []])) as unknown as Servability;
}

/** A rule matches when every field it sets matches; a collection matches any of its rules. */
export const collectionRuleSchema = z.object({
  categories: z.array(z.string()).optional(),
  anyTags: z.array(z.string()).optional(),
  types: z.array(questionTypeSchema).optional(),
  regions: z.array(regionSchema).optional(),
  difficulties: z.array(difficultySchema).optional(),
});
export type CollectionRule = z.infer<typeof collectionRuleSchema>;

export const collectionSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/),
  name: z.object({ uk: z.string().min(1), en: z.string().min(1), pl: z.string().min(1) }),
  rules: z.array(collectionRuleSchema).min(1),
  settings: z
    .object({
      difficultySequence: z.array(difficultySchema).optional(),
      questionCount: z.number().int().positive().optional(),
      balanceBy: z.enum(['category', 'decade']).optional(),
      requireRegionalSelection: z.boolean().optional(),
    })
    .passthrough()
    .default({}),
  minimumUniqueQuestions: z.number().int().positive().default(10),
});
export type Collection = z.infer<typeof collectionSchema>;

export const subcategoryNamesSchema = z.object({
  names: z.record(
    z.string(),
    z.object({ uk: z.string().min(1), en: z.string().min(1), pl: z.string().min(1) }),
  ),
});
