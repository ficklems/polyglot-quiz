import { describe, expect, it } from 'vitest';
import { LANGUAGES, OPTION_IDS, QUESTIONS_PER_ROUND, questionIdSchema } from '@pq/shared';
import { optionTextIn, QUESTION_SEEDS } from '../src/db/seed/questions';
import { TOPIC_SEEDS } from '../src/db/seed/topics';

// The question bank is test data for every other test, so its quality is tested first.
describe('question bank', () => {
  it('has unique, well-formed question ids', () => {
    const ids = QUESTION_SEEDS.map((q) => q.id);

    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(questionIdSchema.safeParse(id).success, id).toBe(true);
  });

  it.each(TOPIC_SEEDS.map((t) => t.id))('has enough questions for a round in "%s"', (topicId) => {
    const count = QUESTION_SEEDS.filter((q) => q.topicId === topicId).length;

    expect(count).toBeGreaterThanOrEqual(QUESTIONS_PER_ROUND);
  });

  it('only uses existing topics', () => {
    const topicIds = new Set(TOPIC_SEEDS.map((t) => t.id));

    for (const q of QUESTION_SEEDS) expect(topicIds.has(q.topicId), q.id).toBe(true);
  });

  it.each(LANGUAGES)('every question and option has non-empty text in %s', (lang) => {
    for (const q of QUESTION_SEEDS) {
      expect(q.text[lang].trim(), `${q.id} text`).not.toBe('');
      for (const id of OPTION_IDS) {
        expect(optionTextIn(q.options[id], lang).trim(), `${q.id}.${id}`).not.toBe('');
      }
    }
  });

  it.each(LANGUAGES)('no question has two identical options in %s', (lang) => {
    for (const q of QUESTION_SEEDS) {
      const texts = OPTION_IDS.map((id) => optionTextIn(q.options[id], lang).toLowerCase());
      expect(new Set(texts).size, q.id).toBe(OPTION_IDS.length);
    }
  });

  it('does not put every correct answer on the same option', () => {
    const used = new Set(QUESTION_SEEDS.map((q) => q.correct));

    expect(used.size).toBe(OPTION_IDS.length);
  });
});
