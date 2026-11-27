import { z } from 'zod';

/** ISO 639-1 codes of the languages the game supports. */
export const LANGUAGES = ['uk', 'en', 'pl'] as const;

export const languageSchema = z.enum(LANGUAGES);

export type Language = z.infer<typeof languageSchema>;

export const DEFAULT_LANGUAGE: Language = 'en';

/** Short labels shown in the language switcher. */
export const LANGUAGE_LABELS: Record<Language, string> = {
  uk: 'UA',
  en: 'EN',
  pl: 'PL',
};

export function isLanguage(value: unknown): value is Language {
  return languageSchema.safeParse(value).success;
}
