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

const playable = (lang: Language) =>
  served(lang).filter((q) => SINGLE_ANSWER_TYPES.includes(q.record.type));

/** Where a shown question came from, to check that a round respects the player's choice. */
export function questionMeta(prompt: string, optionTexts: string[], lang: Language) {
  const record = findOnScreen(prompt, optionTexts, lang);
  return { category: record.category, subcategory: record.subcategory, tags: record.tags };
}

export function subcategoryName(subId: string, lang: Language): string {
  return content.subcategoryNames[subId]?.[lang] ?? subId.replaceAll('_', ' ');
}

/** Playable questions of one subcategory in a language (what its chip counts). */
export function subcategoryCount(topicId: string, subId: string, lang: Language): number {
  return playable(lang).filter(
    (q) => q.record.category === topicId && q.record.subcategory === subId,
  ).length;
}

/**
 * A subcategory with 2–9 playable questions in `lang` (too few for a round, and the plural
 * "other" form in English), if there is one.
 */
export function thinSubcategory(lang: Language): { topicId: string; subId: string } | undefined {
  const pairs = new Set(playable(lang).map((q) => `${q.record.category}/${q.record.subcategory}`));
  const ref = [...pairs].sort().find((pair) => {
    const [topicId, subId] = pair.split('/') as [string, string];
    const count = subcategoryCount(topicId, subId, lang);
    return count > 1 && count < 10;
  });
  if (!ref) return undefined;
  const [topicId, subId] = ref.split('/') as [string, string];
  return { topicId, subId };
}

export const COLLECTION_COUNT = content.collections.length;

export function collectionName(collectionId: string, lang: Language): string {
  const collection = content.collections.find((c) => c.id === collectionId);
  if (!collection) throw new Error(`Unknown themed quiz ${collectionId}`);
  return collection.name[lang];
}
