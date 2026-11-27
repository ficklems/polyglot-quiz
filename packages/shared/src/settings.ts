import { z } from 'zod';
import type { Language } from './languages';
import type { Difficulty, Region } from './content';

/**
 * Region controls subject matter, language controls presentation (spec §3). "auto" follows
 * the language: uk → UA, pl → PL, en → EN. "all" = every region, "global" = international
 * questions only. A named region (or auto) mixes its own questions with global ones.
 */
export const REGION_PREFERENCES = ['auto', 'all', 'global', 'UA', 'PL', 'CE', 'EN'] as const;
export const regionPreferenceSchema = z.enum(REGION_PREFERENCES);
export type RegionPreference = z.infer<typeof regionPreferenceSchema>;
export const DEFAULT_REGION: RegionPreference = 'auto';

/** What a preference means once the language is known. */
export type ResolvedRegion = 'all' | Region;

const REGION_OF_LANGUAGE: Record<Language, Region> = { uk: 'UA', pl: 'PL', en: 'EN' };

export function resolveRegion(preference: RegionPreference, lang: Language): ResolvedRegion {
  return preference === 'auto' ? REGION_OF_LANGUAGE[lang] : preference;
}

/** Soft target of content/sampling_policy.json: share of regional questions in a round. */
export const REGIONAL_SHARE = 0.35;

/** "mixed" is a session setting, never a question's difficulty (spec §4). */
export const DIFFICULTY_SETTINGS = ['mixed', 'easy', 'medium', 'hard'] as const;
export const difficultySettingSchema = z.enum(DIFFICULTY_SETTINGS);
export type DifficultySetting = z.infer<typeof difficultySettingSchema>;
export const DEFAULT_DIFFICULTY: DifficultySetting = 'mixed';

/** Soft target for Mixed (content/sampling_policy.json). */
export const MIXED_DIFFICULTY_TARGET: Record<Difficulty, number> = {
  easy: 0.4,
  medium: 0.4,
  hard: 0.2,
};

export const QUESTION_COUNTS = [10, 20, 30, 50] as const;
export const questionCountSchema = z.literal(QUESTION_COUNTS);
export type QuestionCount = (typeof QUESTION_COUNTS)[number];
export const DEFAULT_QUESTION_COUNT: QuestionCount = 10;

/** How many recently played question ids a client may ask the server to avoid. */
export const MAX_AVOID_IDS = 500;
