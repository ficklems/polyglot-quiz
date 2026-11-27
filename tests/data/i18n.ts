import type { Language } from '@pq/shared';
import en from '../../apps/web/src/i18n/locales/en.json' with { type: 'json' };
import pl from '../../apps/web/src/i18n/locales/pl.json' with { type: 'json' };
import uk from '../../apps/web/src/i18n/locales/uk.json' with { type: 'json' };

const LOCALES: Record<Language, object> = { uk, en, pl };

/**
 * Reads UI copy from the app's own locale files, so tests find elements by the
 * text a user sees in each language and never hardcode translations.
 */
export function text(lang: Language, key: string, vars: Record<string, string> = {}): string {
  const value = key
    .split('.')
    .reduce<unknown>(
      (node, part) => (node as Record<string, unknown> | undefined)?.[part],
      LOCALES[lang],
    );

  if (typeof value !== 'string') {
    throw new Error(`Missing translation "${key}" for "${lang}"`);
  }
  return Object.entries(vars).reduce((s, [name, v]) => s.replaceAll(`{{${name}}}`, v), value);
}
