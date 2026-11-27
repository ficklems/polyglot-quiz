import {
  MIXED_DIFFICULTY_TARGET,
  REGIONAL_SHARE,
  resolveRegion,
  type Collection,
  type CollectionRule,
  type Difficulty,
  type DifficultySetting,
  type Language,
  type RegionPreference,
  type ResolvedRegion,
  type Selection,
} from '@pq/shared';
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
  /** Orders a group's (already shuffled) items; the first ones are taken first. */
  orderGroup: (items: T[]) => T[] = (group) => group,
): T[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = groupOf(item);
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  const queues = shuffle([...groups.keys()].sort(), rng).map((key) =>
    orderGroup(shuffle(groups.get(key)!, rng)),
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

/**
 * Splits `count` by `shares` (largest remainder), takes up to each bucket's quota from that
 * bucket and fills any shortfall from the remaining items. The targets are soft (sampling
 * policy: "use the available pool honestly"): a thin bucket never shrinks the round.
 */
export function quotaPick<T>(
  items: readonly T[],
  bucketOf: (item: T) => string,
  shares: Readonly<Record<string, number>>,
  count: number,
  pick: (items: readonly T[], n: number) => T[],
): T[] {
  const total = Object.values(shares).reduce((sum, share) => sum + share, 0);
  const keys = Object.keys(shares);
  const exact = keys.map((key) => ((shares[key] ?? 0) / total) * count);
  const quotas = exact.map(Math.floor);
  const order = exact
    .map((value, i) => ({ i, rest: value - Math.floor(value) }))
    .sort((a, b) => b.rest - a.rest || a.i - b.i);
  for (let k = 0; k < count - quotas.reduce((a, b) => a + b, 0); k++) {
    const target = order[k % order.length];
    if (target) quotas[target.i] = (quotas[target.i] ?? 0) + 1;
  }

  const picked: T[] = [];
  keys.forEach((key, i) => {
    picked.push(
      ...pick(
        items.filter((item) => bucketOf(item) === key),
        quotas[i] ?? 0,
      ),
    );
  });
  if (picked.length < count) {
    const taken = new Set(picked);
    picked.push(
      ...pick(
        items.filter((item) => !taken.has(item)),
        count - picked.length,
      ),
    );
  }
  return picked;
}

export type PickPlan = {
  count: number;
  balanceBy: 'category' | 'decade';
  /** Millionaire Challenge: steps in ascending difficulty, equal share each. */
  difficultySequence?: Difficulty[];
  /** Soft difficulty mix, e.g. 40/40/20 for Mixed. */
  difficultyShares?: Readonly<Record<string, number>>;
  /** Soft region mix, e.g. 35% UA / 65% global. */
  regionShares?: Readonly<Record<string, number>>;
};

const DIFFICULTY_RANK: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };

/**
 * Orders items so that every prefix follows `shares` as closely as the items allow: each
 * step takes from the bucket furthest behind its share. Buckets without a share go last.
 */
export function weightedInterleave<T>(
  items: readonly T[],
  bucketOf: (item: T) => string,
  shares: Readonly<Record<string, number>>,
): T[] {
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const key = bucketOf(item);
    buckets.set(key, [...(buckets.get(key) ?? []), item]);
  }
  const weighted = Object.keys(shares).filter((key) => (shares[key] ?? 0) > 0);
  const taken = new Map<string, number>();
  const result: T[] = [];
  for (;;) {
    let best: string | undefined;
    let bestDeficit = -Infinity;
    for (const key of weighted) {
      if ((buckets.get(key)?.length ?? 0) === 0) continue;
      const deficit = (shares[key] ?? 0) * (result.length + 1) - (taken.get(key) ?? 0);
      if (deficit > bestDeficit) {
        best = key;
        bestDeficit = deficit;
      }
    }
    if (best === undefined) break;
    result.push(buckets.get(best)!.shift()!);
    taken.set(best, (taken.get(best) ?? 0) + 1);
  }
  for (const [key, rest] of buckets) if (!weighted.includes(key)) result.push(...rest);
  return result;
}

/**
 * Chooses the questions of a round. Layers, outside in: region mix, an equal share per
 * category (or decade), and the difficulty mix inside each category. With a difficulty sequence each step gets an equal
 * share from its difficulty, a short step is filled from the rest of the pool, and the round
 * is ordered easy → hard; otherwise the result is shuffled so buckets don't come in blocks.
 */
export function pickQuestions(
  pool: readonly QuestionMeta[],
  plan: PickPlan,
  rng: Rng,
): QuestionMeta[] {
  const groupOf = plan.balanceBy === 'decade' ? decadeOf : (q: QuestionMeta) => q.category;
  // Difficulty mixes inside each category, so it never upsets the equal category shares.
  const shares = plan.difficultyShares;
  const orderGroup = shares
    ? (items: QuestionMeta[]) => weightedInterleave(items, (q) => q.difficulty, shares)
    : undefined;
  const byCategory = (items: readonly QuestionMeta[], n: number) =>
    balancedPick(items, groupOf, n, rng, orderGroup);
  const byRegion = plan.regionShares
    ? (items: readonly QuestionMeta[], n: number) =>
        quotaPick(items, (q) => q.region, plan.regionShares!, n, byCategory)
    : byCategory;

  if (!plan.difficultySequence || plan.difficultySequence.length === 0) {
    return shuffle(byRegion(pool, plan.count), rng);
  }

  const steps = plan.difficultySequence;
  const share = Math.floor(plan.count / steps.length);
  const picked: QuestionMeta[] = [];
  steps.forEach((difficulty, i) => {
    const quota = i === steps.length - 1 ? plan.count - share * (steps.length - 1) : share;
    const taken = new Set(picked.map((q) => q.id));
    const bucket = pool.filter((q) => q.difficulty === difficulty && !taken.has(q.id));
    picked.push(...byRegion(bucket, quota));
  });
  if (picked.length < plan.count) {
    const taken = new Set(picked.map((q) => q.id));
    const rest = pool.filter((q) => !taken.has(q.id));
    picked.push(...byRegion(rest, plan.count - picked.length));
  }
  return sortByDifficulty(picked);
}

/** Stable: keeps the balanced order within each difficulty. */
export function sortByDifficulty(questions: QuestionMeta[]): QuestionMeta[] {
  return [...questions].sort(
    (a, b) => DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty],
  );
}

/** Round settings of a collection; `count` is the player's choice unless the quiz fixes it. */
export function collectionPlan(collection: Collection, count: number): PickPlan {
  const settings = collection.settings;
  return {
    count: settings.questionCount ?? count,
    balanceBy: settings.balanceBy ?? 'category',
    ...(settings.difficultySequence ? { difficultySequence: settings.difficultySequence } : {}),
  };
}

export type SettingsFilter = {
  region: ResolvedRegion;
  difficulty: DifficultySetting;
  /** Only the chosen region, no global questions (Only Locals). */
  strictRegion?: boolean;
  /** The quiz brings its own difficulty sequence; the setting doesn't filter. */
  ownDifficulty?: boolean;
};

/**
 * Strict quizzes need a concrete region: "all" and "international only" fall back to the
 * language's region, so Only Locals is always about one place.
 */
export function effectiveRegion(
  preference: RegionPreference,
  lang: Language,
  strict: boolean,
): ResolvedRegion {
  const region = resolveRegion(preference, lang);
  return strict && (region === 'all' || region === 'global') ? resolveRegion('auto', lang) : region;
}

export function matchesSettings(q: QuestionMeta, f: SettingsFilter): boolean {
  if (f.strictRegion) {
    if (q.region !== f.region) return false;
  } else if (f.region === 'global') {
    if (q.region !== 'global') return false;
  } else if (f.region !== 'all') {
    if (q.region !== 'global' && q.region !== f.region) return false;
  }
  if (!f.ownDifficulty && f.difficulty !== 'mixed' && q.difficulty !== f.difficulty) {
    return false;
  }
  return true;
}

/** The soft targets that apply under these settings. */
export function settingsShares(
  f: SettingsFilter,
): Pick<PickPlan, 'regionShares' | 'difficultyShares'> {
  const regional = !f.strictRegion && f.region !== 'all' && f.region !== 'global';
  return {
    ...(regional
      ? { regionShares: { [f.region]: REGIONAL_SHARE, global: 1 - REGIONAL_SHARE } }
      : {}),
    ...(!f.ownDifficulty && f.difficulty === 'mixed'
      ? { difficultyShares: MIXED_DIFFICULTY_TARGET }
      : {}),
  };
}

/** How a themed quiz treats the player's settings. */
export function collectionSettings(collection: Collection): {
  ownDifficulty: boolean;
  strictRegion: boolean;
} {
  return {
    ownDifficulty: (collection.settings.difficultySequence?.length ?? 0) > 0,
    strictRegion: collection.settings.requireRegionalSelection === true,
  };
}
