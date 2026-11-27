import { LANGUAGES } from '@pq/shared';
import { describe, expect, it } from 'vitest';
import { resources } from './resources';

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

function flattenKeys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
      ? flattenKeys(value as object, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

function flattenValues(obj: object): string[] {
  return Object.values(obj).flatMap((value) =>
    typeof value === 'object' && value !== null ? flattenValues(value as object) : [String(value)],
  );
}

const keysByLang = Object.fromEntries(
  LANGUAGES.map((lang) => [lang, flattenKeys(resources[lang].translation)]),
);

// Missing translations are the most common i18n bug, so the locale files are tested like code.
describe('locale files', () => {
  it.each(LANGUAGES)('%s has exactly the same base keys as English', (lang) => {
    const base = (keys: string[]) =>
      [...new Set(keys.map((k) => k.replace(PLURAL_SUFFIX, '')))].sort();

    expect(base(keysByLang[lang] ?? [])).toEqual(base(keysByLang.en ?? []));
  });

  it.each(LANGUAGES)('%s defines every plural form its grammar needs', (lang) => {
    const categories = new Intl.PluralRules(lang).resolvedOptions().pluralCategories;
    const keys = keysByLang[lang] ?? [];
    const pluralBases = new Set(
      keys.filter((k) => PLURAL_SUFFIX.test(k)).map((k) => k.replace(PLURAL_SUFFIX, '')),
    );

    for (const base of pluralBases) {
      for (const category of categories) {
        expect(keys, `${lang}: ${base}_${category}`).toContain(`${base}_${category}`);
      }
    }
  });

  it.each(LANGUAGES)('%s has no empty strings', (lang) => {
    for (const value of flattenValues(resources[lang].translation)) {
      expect(value.trim()).not.toBe('');
    }
  });
});
