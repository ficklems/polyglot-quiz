import { z } from 'zod';
import { languageSchema } from './languages';
import { topicIdSchema } from './topics';

export const collectionIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/, 'Unknown collection id');

/** A subcategory reference: "<categoryId>/<subcategoryId>". */
export const subcategoryRefSchema = z
  .string()
  .regex(/^[a-z0-9_]+\/[a-z0-9_]+$/, 'Subcategory must look like "category/subcategory"');

/**
 * A player's own choice of content: whole categories and/or single subcategories.
 * The round draws from the union of everything selected.
 */
export const selectionSchema = z
  .object({
    categories: z.array(topicIdSchema).max(50).default([]),
    subcategories: z.array(subcategoryRefSchema).max(300).default([]),
  })
  .refine((s) => s.categories.length + s.subcategories.length > 0, {
    message: 'Select at least one category or subcategory',
  });
export type Selection = z.infer<typeof selectionSchema>;

export const catalogQuerySchema = z.object({ lang: languageSchema });

export const catalogSubcategorySchema = z.strictObject({
  /** "<categoryId>/<subcategoryId>" */
  id: subcategoryRefSchema,
  name: z.string().min(1),
  questionCount: z.number().int().min(1),
});
export type CatalogSubcategory = z.infer<typeof catalogSubcategorySchema>;

export const catalogCategorySchema = z.strictObject({
  id: topicIdSchema,
  name: z.string().min(1),
  questionCount: z.number().int().min(0),
  /** Only subcategories with at least one playable question in this language. */
  subcategories: z.array(catalogSubcategorySchema),
});
export type CatalogCategory = z.infer<typeof catalogCategorySchema>;

export const catalogCollectionSchema = z.strictObject({
  id: collectionIdSchema,
  name: z.string().min(1),
  questionCount: z.number().int().min(0),
  /** How many questions a round of this collection has (15 for Millionaire Challenge). */
  questionsPerRound: z.number().int().positive(),
  /** False when there are fewer eligible questions than a round needs in this language. */
  playable: z.boolean(),
});
export type CatalogCollection = z.infer<typeof catalogCollectionSchema>;

export const catalogResponseSchema = z.strictObject({
  lang: languageSchema,
  categories: z.array(catalogCategorySchema),
  collections: z.array(catalogCollectionSchema),
});
export type CatalogResponse = z.infer<typeof catalogResponseSchema>;
