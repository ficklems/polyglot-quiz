import type { Language } from '@pq/shared';
import en from './locales/en.json';
import pl from './locales/pl.json';
import uk from './locales/uk.json';

export const resources = {
  uk: { translation: uk },
  en: { translation: en },
  pl: { translation: pl },
} satisfies Record<Language, { translation: object }>;
