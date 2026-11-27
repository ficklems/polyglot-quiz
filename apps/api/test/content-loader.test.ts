import { describe, expect, it } from 'vitest';
import type { QuestionRecord } from '@pq/shared';
import { exactDuplicateKey, structuralProblems } from '../src/content/validate';
import { FIXTURE } from './helpers';

const byId = (id: string) => {
  const q = FIXTURE.questions.find((x) => x.record.id === id);
  if (!q) throw new Error(`missing ${id}`);
  return q;
};

function record(overrides: Partial<QuestionRecord> = {}): QuestionRecord {
  const loc = {
    prompt: 'Which came first?',
    options: [
      { id: 'o1', text: 'A' },
      { id: 'o2', text: 'B' },
    ],
  };
  return {
    id: 'TEST-1',
    factKey: 'test:1',
    category: 'memes',
    subcategory: 'internet',
    region: 'global',
    difficulty: 'easy',
    type: 'higher_lower',
    tags: [],
    localizations: { uk: loc, en: loc, pl: loc },
    answer: { correctOptionId: 'o1' },
    reviewStatus: 'draft',
    sources: [],
    ...overrides,
  };
}

describe('content loader on the fixture', () => {
  it('reads every record without schema or structure problems', () => {
    expect(FIXTURE.report.invalidRecords).toEqual([]);
    expect(FIXTURE.report.structuralProblems).toEqual([]);
    expect(FIXTURE.report.legacyMerge.legacyRecords).toBe(45);
  });

  it('serves a clean record in every language', () => {
    expect(byId('MEME-TF1').exclusions).toEqual({ uk: [], en: [], pl: [] });
  });

  it('never serves a record with profanity (no opt-in yet)', () => {
    const { exclusions } = byId('MEME-PRF1');
    expect(exclusions.uk).toContain('profanity');
    expect(exclusions.en).toContain('profanity');
  });

  it('withholds an open Ukrainian translation flag only in Ukrainian', () => {
    expect(byId('MEME-FLG1').exclusions).toEqual({
      uk: ['open_translation_flag'],
      en: [],
      pl: [],
    });
  });

  it('withholds machine-translated Ukrainian of OPEN-* records only in Ukrainian', () => {
    expect(byId('OPEN-fixture0000000001').exclusions).toEqual({
      uk: ['machine_translation_unreviewed'],
      en: [],
      pl: [],
    });
  });

  it('keeps the first of two exact duplicates and withholds the second', () => {
    expect(byId('MEME-DUP1').exclusions.en).toEqual([]);
    expect(byId('MEME-DUP2').exclusions.en).toEqual(['duplicate']);
    expect(FIXTURE.report.exactDuplicates).toEqual([
      { keptId: 'MEME-DUP1', removedId: 'MEME-DUP2' },
    ]);
  });

  it('gives the same version for the same files', async () => {
    const { loadContent } = await import('../src/content/load-content');
    const { FIXTURE_DIR } = await import('./helpers');

    expect(loadContent(FIXTURE_DIR).version).toBe(FIXTURE.version);
  });
});

describe('exactDuplicateKey', () => {
  it('treats questions with a shared generic prompt but different options as different', () => {
    // Regression: a prompt+answer key reported 285 false duplicates in the real content.
    const a = record();
    const b = record({
      localizations: {
        uk: {
          prompt: 'Which came first?',
          options: [
            { id: 'o1', text: 'A' },
            { id: 'o2', text: 'C' },
          ],
        },
        en: {
          prompt: 'Which came first?',
          options: [
            { id: 'o1', text: 'A' },
            { id: 'o2', text: 'C' },
          ],
        },
        pl: {
          prompt: 'Which came first?',
          options: [
            { id: 'o1', text: 'A' },
            { id: 'o2', text: 'C' },
          ],
        },
      },
    });

    expect(exactDuplicateKey(a)).not.toBe(exactDuplicateKey(b));
  });

  it('ignores case, punctuation and option order', () => {
    const a = record();
    const b = record({
      localizations: {
        uk: a.localizations.uk,
        pl: a.localizations.pl,
        en: {
          prompt: 'which came FIRST',
          options: [
            { id: 'o2', text: 'b' },
            { id: 'o1', text: 'a!' },
          ],
        },
      },
    });

    expect(exactDuplicateKey(a)).toBe(exactDuplicateKey(b));
  });
});

describe('structuralProblems', () => {
  const categories = new Set(['memes']);

  it('accepts a well-formed record', () => {
    expect(structuralProblems(record(), categories)).toEqual([]);
  });

  it('reports an unknown category', () => {
    expect(structuralProblems(record({ category: 'cooking' }), categories)).toContain(
      'unknown category "cooking"',
    );
  });

  it('reports an answer key pointing at a missing option', () => {
    expect(structuralProblems(record({ answer: { correctOptionId: 'o3' } }), categories)).toContain(
      'correct option o3 is not among the options',
    );
  });

  it('reports option ids that differ between languages', () => {
    const r = record();
    r.localizations.pl = {
      prompt: 'x',
      options: [
        { id: 'o1', text: 'A' },
        { id: 'o3', text: 'B' },
      ],
    };

    expect(structuralProblems(r, categories)).toContain('option ids differ in pl');
  });

  it('reports an order question whose answer does not cover the options', () => {
    const r = record({ type: 'order', answer: { orderedOptionIds: ['o1', 'o3'] } });

    expect(structuralProblems(r, categories)).toContain(
      'orderedOptionIds do not match the options',
    );
  });
});
