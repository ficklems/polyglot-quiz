import { z } from 'zod';
import { languageSchema } from './languages';

export const topicIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:[_-][a-z0-9]+)*$/, 'Topic id must be lower case with "_" or "-"');

/** A topic as returned by GET /api/topics, already translated. */
export const topicSchema = z.object({
  id: topicIdSchema,
  name: z.string().min(1),
  /** Topics are the content categories; they have no description yet. */
  description: z.string().nullable(),
  questionCount: z.number().int().min(0),
});

export type Topic = z.infer<typeof topicSchema>;

export const topicsQuerySchema = z.object({
  lang: languageSchema,
});

export type TopicsQuery = z.infer<typeof topicsQuerySchema>;

export const topicsResponseSchema = z.object({
  lang: languageSchema,
  topics: z.array(topicSchema),
});

export type TopicsResponse = z.infer<typeof topicsResponseSchema>;
