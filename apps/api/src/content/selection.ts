import type { Collection, CollectionRule, Difficulty, Selection } from '@pq/shared';
import { shuffle, type Rng } from '../lib/random';

/** What the selection logic needs to know about a question (no texts, no answer). */
export type QuestionMeta = {
  id: string;
  category: string;
  subcategory: string;
  type: string;
  region: string;
  difficulty: Difficulty;
  tags: string[];
};

export function matchesRule(q: QuestionMeta, rule: CollectionRule): boolean {
  if (rule.categories && !rule.categories.includes(q.category)) return false;
  if (rule.anyTags && !rule.anyTags.some((tag) => q.tags.includes(tag))) return false;
  if (rule.types && !rule.types.includes(q.type as never)) return false;
  if (rule.regions && !rule.regions.includes(q.region as never)) return false;
  if (rule.difficulties && !rule.difficulties.includes(q.difficulty)) return false;
  return true;
}

/** A collection is a filter: a question belongs to it when it matches any of its rules. */
export function matchesCollection(q: QuestionMeta, collection: Collection): boolean {
  return collection.rules.some((rule) => matchesRule(q, rule));
}

/** The union of the selected whole categories and the selected subcategories. */
export function matchesSelection(q: QuestionMeta, selection: Selection): boolean {
  return (
    selection.categories.includes(q.category) ||
    selection.subcategories.includes(`${q.category}/${q.subcategory}`)
  );
}

const DECADE = /^\d{4}s$/;

/** The question's decade tag ("1980s"), or "none". */
export function decadeOf(q: QuestionMeta): string {
  return q.tags.find((t) => DECADE.test(t)) ?? 'none';
}

/**
 * Picks `count` items giving every group an equal share (content/sampling_policy.json:
 * "equal among selected eligible categories; redistribute only after exhaustion"). Groups
 * are visited round-robin in a random order, so a huge category can't dominate a small one,
 * and the result alternates between groups.
 */
export function balancedPick<T>(
  items: readonly T[],
  groupOf: (item: T) => string,
  count: number,
  rng: Rng,
): T[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = groupOf(item);
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  const queues = shuffle([...groups.keys()].sort(), rng).map((key) =>
    shuffle(groups.get(key)!, rng),
  );

  const picked: T[] = [];
  while (picked.length < count && queues.some((q) => q.length > 0)) {
    for (const queue of queues) {
      const next = queue.shift();
      if (next !== undefined) picked.push(next);
      if (picked.length === count) break;
    }
  }
  return picked;
}

export type PickPlan = {
  count: number;
  balanceBy: 'category' | 'decade';
  /** Millionaire Challenge: steps in ascending difficulty, equal share each. */
  difficultySequence?: Difficulty[];
};

const DIFFICULTY_RANK: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };

/**
 * Chooses the questions of a round. With a difficulty sequence, each step gets an equal
 * share from its difficulty; a step without enough questions is filled from the rest of
 * the pool ("use the available pool honestly"), and the round is then ordered easy → hard.
 */
export function pickQuestions(
  pool: readonly QuestionMeta[],
  plan: PickPlan,
  rng: Rng,
): QuestionMeta[] {
  const groupOf = plan.balanceBy === 'decade' ? decadeOf : (q: QuestionMeta) => q.category;
  if (!plan.difficultySequence || plan.difficultySequence.length === 0) {
    return balancedPick(pool, groupOf, plan.count, rng);
  }

  const steps = plan.difficultySequence;
  const share = Math.floor(plan.count / steps.length);
  const picked: QuestionMeta[] = [];
  steps.forEach((difficulty, i) => {
    const quota = i === steps.length - 1 ? plan.count - share * (steps.length - 1) : share;
    const taken = new Set(picked.map((q) => q.id));
    const bucket = pool.filter((q) => q.difficulty === difficulty && !taken.has(q.id));
    picked.push(...balancedPick(bucket, groupOf, quota, rng));
  });
  if (picked.length < plan.count) {
    const taken = new Set(picked.map((q) => q.id));
    const rest = pool.filter((q) => !taken.has(q.id));
    picked.push(...balancedPick(rest, groupOf, plan.count - picked.length, rng));
  }
  // Stable sort keeps the balanced order within each difficulty.
  return picked.sort((a, b) => DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty]);
}

/** Round settings of a collection. */
export function collectionPlan(collection: Collection, defaultCount: number): PickPlan {
  const settings = collection.settings;
  return {
    count: settings.questionCount ?? defaultCount,
    balanceBy: settings.balanceBy ?? 'category',
    ...(settings.difficultySequence ? { difficultySequence: settings.difficultySequence } : {}),
  };
}
