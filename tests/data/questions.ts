import { SINGLE_ANSWER_TYPES, type Language, type QuestionRecord } from '@pq/shared';
import { loadContent } from '../../apps/api/src/content/load-content';

/*
 * Test oracle: the content folder is the source of truth for which answer is correct.
 * Black-box tests use it to play like a player who knows (or doesn't know) the answer.
 * The same content the API serves is loaded once per worker (about a second).
 */
const content = loadContent();
const served = (lang: Language) => content.questions.filter((q) => q.exclusions[lang].length === 0);

const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();

/**
 * Finds the question on screen. The prompt alone isn't unique ("Which came first?" is
 * shared by hundreds of questions), so the shown options are part of the match.
 */
function findOnScreen(prompt: string, optionTexts: string[], lang: Language): QuestionRecord {
  const shown = optionTexts.map(normalize).sort().join('|');
  const match = served(lang).find(({ record }) => {
    const loc = record.localizations[lang];
    if (normalize(loc.prompt) !== normalize(prompt)) return false;
    return (
      (loc.options ?? [])
        .map((o) => normalize(o.text))
        .sort()
        .join('|') === shown
    );
  });
  if (!match) throw new Error(`No served question "${prompt}" with options [${shown}] in ${lang}`);
  return match.record;
}

function optionText(record: QuestionRecord, lang: Language, pick: 'correct' | 'wrong'): string {
  const options = record.localizations[lang].options ?? [];
  const correctId = 'correctOptionId' in record.answer ? record.answer.correctOptionId : undefined;
  const option = options.find((o) =>
    pick === 'correct' ? o.id === correctId : o.id !== correctId,
  );
  if (!option) throw new Error(`No ${pick} option for ${record.id}`);
  return option.text;
}

export function correctAnswerText(prompt: string, optionTexts: string[], lang: Language): string {
  return optionText(findOnScreen(prompt, optionTexts, lang), lang, 'correct');
}

export function wrongAnswerText(prompt: string, optionTexts: string[], lang: Language): string {
  return optionText(findOnScreen(prompt, optionTexts, lang), lang, 'wrong');
}

export function correctOptionId(questionId: string): string {
  const q = content.questions.find((x) => x.record.id === questionId);
  if (!q || !('correctOptionId' in q.record.answer))
    throw new Error(`Unknown question ${questionId}`);
  return q.record.answer.correctOptionId;
}

export function topicName(topicId: string, lang: Language): string {
  const category = content.categories.find((c) => c.id === topicId);
  if (!category) throw new Error(`Unknown topic ${topicId}`);
  return category.name[lang];
}

export const TOPIC_COUNT = content.categories.length;

/** Questions of a topic that can be played in a language (what the topic card shows). */
export function questionCount(topicId: string, lang: Language): number {
  return served(lang).filter(
    (q) => q.record.category === topicId && SINGLE_ANSWER_TYPES.includes(q.record.type),
  ).length;
}

/** A topic with fewer than 10 playable Ukrainian questions, if there is one. */
export const THIN_UK_TOPIC: string | undefined = content.categories.find(
  (c) => questionCount(c.id, 'uk') < 10,
)?.id;
