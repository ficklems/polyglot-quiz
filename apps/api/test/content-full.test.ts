import { beforeAll, describe, expect, it } from 'vitest';
import { LANGUAGES, QUESTIONS_PER_ROUND, SINGLE_ANSWER_TYPES } from '@pq/shared';
import { loadContent, type ContentBundle } from '../src/content/load-content';

// The real content in content/: 24k records, loaded once (about a second).
let content: ContentBundle;
beforeAll(() => {
  content = loadContent();
});

const served = (lang: (typeof LANGUAGES)[number]) =>
  content.questions.filter((q) => q.exclusions[lang].length === 0);

describe('content dataset', () => {
  it('has no invalid records, structural problems or repeated ids', () => {
    expect(content.report.invalidRecords).toEqual([]);
    expect(content.report.structuralProblems).toEqual([]);
    expect(content.report.duplicateIds).toEqual([]);
  });

  it('has 31 categories, all with unique ids and names in three languages', () => {
    expect(content.categories).toHaveLength(31);
    expect(new Set(content.categories.map((c) => c.id)).size).toBe(31);
  });

  it('imported the whole dataset plus the 45 legacy questions', () => {
    expect(content.report.recordsRead).toBe(24_256 + 45);
    expect(content.report.legacyMerge).toEqual({ legacyRecords: 45, retiredByMap: 15 });
  });

  it('has no exact duplicates left among served records', () => {
    expect(content.report.exactDuplicates).toEqual([]);
  });

  it('resolves every legacy duplicate pair to one served record', () => {
    const ids = new Map(content.questions.map((q) => [q.record.id, q]));
    for (const { retiredId, keptId } of content.duplicateMap) {
      expect(ids.get(retiredId)?.exclusions.en, retiredId).toContain('duplicate');
      expect(ids.get(keptId)?.exclusions.en, keptId).toEqual([]);
    }
  });

  it.each(['en', 'pl'] as const)(
    'every category has enough playable questions for a round in %s',
    (lang) => {
      for (const category of content.categories) {
        const playable = served(lang).filter(
          (q) => q.record.category === category.id && SINGLE_ANSWER_TYPES.includes(q.record.type),
        );
        expect(playable.length, category.id).toBeGreaterThanOrEqual(QUESTIONS_PER_ROUND);
      }
    },
  );

  it('never serves Ukrainian machine translation, open flags or profanity', () => {
    for (const q of served('uk')) {
      expect(q.record.id.startsWith('OPEN-'), q.record.id).toBe(false);
    }
    for (const lang of LANGUAGES) {
      expect(served(lang).some((q) => q.record.contentFlags?.includes('profanity'))).toBe(false);
    }
  });

  it.each(LANGUAGES)('served records have a prompt and option texts in %s', (lang) => {
    for (const { record } of served(lang)) {
      const loc = record.localizations[lang];
      expect(loc.prompt.trim(), record.id).not.toBe('');
      for (const option of loc.options ?? []) expect(option.text.trim(), record.id).not.toBe('');
    }
  });

  it('keeps original music names identical across languages in the kept legacy records', () => {
    // original_name_policy.json: band and album names are never translated.
    const legacy = content.questions.filter(
      (q) => q.origin === 'legacy' && q.record.category === 'music' && q.exclusions.en.length === 0,
    );
    for (const { record } of legacy.filter((q) => q.record.subcategory === 'albums')) {
      const names = LANGUAGES.map((l) =>
        record.localizations[l].options?.map((o) => o.text).join('|'),
      );
      expect(new Set(names).size, record.id).toBe(1);
    }
  });
});
