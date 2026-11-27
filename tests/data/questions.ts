import {
  resolveRegion,
  SINGLE_ANSWER_TYPES,
  type Language,
  type QuestionRecord,
  type RegionPreference,
} from '@pq/shared';
import { loadContent } from '../../apps/api/src/content/load-content';

/*
 * Test oracle: the content folder is the source of truth for which answer is correct.
 * Black-box tests use it to play like a player who knows (or doesn't know) the answer.
 * The same content the API serves is loaded once per worker (about a second).
 */
const content = loadContent();
const served = (lang: Language) => content.questions.filter((q) => q.exclusions[lang].length === 0);

const playable = (lang: Language) =>
  served(lang).filter((q) => SINGLE_ANSWER_TYPES.includes(q.record.type));

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

/**
 * The region rule, written independently of the API: a named region (or "auto", which follows
 * the language) keeps its own and global questions; "all" keeps everything.
 */
function inRegion(record: QuestionRecord, lang: Language, preference: RegionPreference): boolean {
  const region = resolveRegion(preference, lang);
  if (region === 'all') return true;
  if (region === 'global') return record.region === 'global';
  return record.region === 'global' || record.region === region;
}

/**
 * Playable questions of a topic in a language and region. The home screen counts under the
 * default region "auto"; GET /api/topics has no region filter ("all").
 */
export function questionCount(
  topicId: string,
  lang: Language,
  region: RegionPreference = 'auto',
): number {
  return playable(lang).filter(
    (q) => q.record.category === topicId && inRegion(q.record, lang, region),
  ).length;
}

/** A topic with fewer than 10 playable Ukrainian questions under the default region, if any. */
export const THIN_UK_TOPIC: string | undefined = content.categories.find(
  (c) => questionCount(c.id, 'uk') < 10,
)?.id;

/** Where a shown question came from, to check that a round respects the player's choice. */
export function questionMeta(prompt: string, optionTexts: string[], lang: Language) {
  const record = findOnScreen(prompt, optionTexts, lang);
  return { category: record.category, subcategory: record.subcategory, tags: record.tags };
}

export function subcategoryName(subId: string, lang: Language): string {
  return content.subcategoryNames[subId]?.[lang] ?? subId.replaceAll('_', ' ');
}

/** Playable questions of one subcategory (what its chip counts under the default region). */
export function subcategoryCount(
  topicId: string,
  subId: string,
  lang: Language,
  region: RegionPreference = 'auto',
): number {
  return playable(lang).filter(
    (q) =>
      q.record.category === topicId &&
      q.record.subcategory === subId &&
      inRegion(q.record, lang, region),
  ).length;
}

/**
 * A subcategory with 2–9 playable questions in `lang` (too few for a round, and the plural
 * "other" form in English), if there is one.
 */
export function thinSubcategory(lang: Language): { topicId: string; subId: string } | undefined {
  const pairs = new Set(
    playable(lang)
      .filter((q) => inRegion(q.record, lang, 'auto'))
      .map((q) => `${q.record.category}/${q.record.subcategory}`),
  );
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

/**
 * A subcategory that can't fill a round under `region` but can with all regions: the case
 * where the game offers "use all regions" instead of quietly adding other ones.
 */
export function narrowUnder(
  lang: Language,
  region: RegionPreference,
): { topicId: string; subId: string } | undefined {
  const pairs = new Set(playable(lang).map((q) => `${q.record.category}/${q.record.subcategory}`));
  const ref = [...pairs].sort().find((pair) => {
    const [topicId, subId] = pair.split('/') as [string, string];
    const narrow = subcategoryCount(topicId, subId, lang, region);
    return narrow > 0 && narrow < 10 && subcategoryCount(topicId, subId, lang, 'all') >= 10;
  });
  if (!ref) return undefined;
  const [topicId, subId] = ref.split('/') as [string, string];
  return { topicId, subId };
}

/** A subcategory with 10–30 playable questions under the default region, and their ids. */
export function smallSubcategory(lang: Language): {
  topicId: string;
  subId: string;
  ids: string[];
} {
  const groups = new Map<string, string[]>();
  for (const q of playable(lang).filter((x) => inRegion(x.record, lang, 'auto'))) {
    const key = `${q.record.category}/${q.record.subcategory}`;
    groups.set(key, [...(groups.get(key) ?? []), q.record.id]);
  }
  const found = [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .find(([, ids]) => ids.length >= 10 && ids.length <= 30);
  if (!found) throw new Error(`No subcategory with 10–30 questions in ${lang}`);
  const [topicId, subId] = found[0].split('/') as [string, string];
  return { topicId, subId, ids: found[1] };
}
