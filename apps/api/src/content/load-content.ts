import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import {
  categorySchema,
  EXCLUSION_REASONS,
  LANGUAGES,
  questionRecordSchema,
  type Category,
  type ExclusionReason,
  type Language,
  type QuestionRecord,
  type Servability,
} from '@pq/shared';
import { computeExclusions, emptyFlags, type ReviewFlags } from './exclusions';
import { exactDuplicateKey, structuralProblems } from './validate';

export const DEFAULT_CONTENT_DIR = resolve(
  fileURLToPath(import.meta.url),
  '../../../../../content',
);

export type PreparedQuestion = {
  record: QuestionRecord;
  origin: 'dataset' | 'legacy';
  exclusions: Servability;
};

export type ContentReport = {
  files: number;
  recordsRead: number;
  invalidRecords: { file: string; line: number; id?: string; problem: string }[];
  structuralProblems: { id: string; problem: string }[];
  duplicateIds: string[];
  exactDuplicates: { keptId: string; removedId: string }[];
  legacyMerge: { legacyRecords: number; retiredByMap: number };
  servableByLanguage: Record<Language, number>;
  exclusionsByReason: Record<Language, Partial<Record<ExclusionReason, number>>>;
};

export type ContentBundle = {
  /** Hash of every file read: changes whenever the content changes. */
  version: string;
  categories: Category[];
  questions: PreparedQuestion[];
  /** Retired id → kept id (content/migrations/legacy-duplicate-map.json). */
  duplicateMap: { retiredId: string; keptId: string }[];
  report: ContentReport;
};

type DuplicateMap = { pairs: { retiredId: string; keptId: string }[] };

function readText(path: string, hash: ReturnType<typeof createHash>): string {
  const raw = readFileSync(path);
  hash.update(raw);
  return path.endsWith('.gz') ? gunzipSync(raw).toString('utf8') : raw.toString('utf8');
}

function readJsonl(path: string, hash: ReturnType<typeof createHash>): unknown[] {
  if (!existsSync(path)) return [];
  return readText(path, hash)
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line) as unknown);
}

/** Finds `<dir>/<name>.jsonl` or `<dir>/<name>.jsonl.gz`. */
function jsonlPath(dir: string, name: string): string {
  const plain = join(dir, `${name}.jsonl`);
  return existsSync(plain) ? plain : `${plain}.gz`;
}

function idsOf(rows: unknown[], pick: (row: Record<string, unknown>) => unknown = (r) => r.id) {
  return new Set(
    rows
      .map((row) => pick(row as Record<string, unknown>))
      .filter((id): id is string => typeof id === 'string'),
  );
}

function loadFlags(dir: string, hash: ReturnType<typeof createHash>): ReviewFlags {
  const flags = emptyFlags();
  const review = join(dir, 'review');

  const resolved = idsOf(readJsonl(jsonlPath(review, 'resolved_specific_translation_flags'), hash));
  for (const id of idsOf(readJsonl(jsonlPath(review, 'uk_translation_issues'), hash))) {
    if (!resolved.has(id)) flags.openTranslationFlags.add(id);
  }
  flags.musicNamePending = idsOf(readJsonl(jsonlPath(review, 'music_name_review_pending'), hash));
  flags.quarantined = idsOf(readJsonl(jsonlPath(review, 'quarantine_index'), hash));
  for (const row of readJsonl(jsonlPath(review, 'independent_duplicate_map'), hash)) {
    const r = row as { id?: string; action?: string };
    if (r.id && r.action === 'quarantine') flags.quarantined.add(r.id);
    if (r.id && r.action !== 'quarantine') flags.duplicates.add(r.id);
  }
  for (const row of readJsonl(jsonlPath(review, 'duplicate_map'), hash)) {
    const r = row as { removedId?: string };
    if (r.removedId) flags.duplicates.add(r.removedId);
  }
  for (const row of readJsonl(jsonlPath(review, 'critical_second_pass'), hash)) {
    const r = row as { id?: string; remainingSpecificFlags?: unknown[] };
    if (r.id && Array.isArray(r.remainingSpecificFlags) && r.remainingSpecificFlags.length > 0) {
      flags.criticalRemaining.add(r.id);
    }
  }

  const mapPath = join(dir, 'migrations', 'legacy-duplicate-map.json');
  if (existsSync(mapPath)) {
    const map = JSON.parse(readText(mapPath, hash)) as DuplicateMap;
    for (const pair of map.pairs) flags.duplicates.add(pair.retiredId);
  }

  // OpenTriviaQA/QuizBase records (OPEN-*) got their Ukrainian from the Argos EN→UK model
  // (content/DATA_SOURCES.md). Spot checks show it is often unintelligible, including the
  // records listed as revised, so none of them are served in Ukrainian until proofread.
  flags.ukMachineTranslated = (record) => record.id.startsWith('OPEN-');
  return flags;
}

export function loadDuplicateMap(dir = DEFAULT_CONTENT_DIR): Map<string, string> {
  const mapPath = join(dir, 'migrations', 'legacy-duplicate-map.json');
  if (!existsSync(mapPath)) return new Map();
  const map = JSON.parse(readFileSync(mapPath, 'utf8')) as DuplicateMap;
  return new Map(map.pairs.map((p) => [p.retiredId, p.keptId]));
}

function emptyByLanguage<T>(make: () => T): Record<Language, T> {
  return Object.fromEntries(LANGUAGES.map((l) => [l, make()])) as Record<Language, T>;
}

/**
 * Reads and validates the whole content folder. Invalid records are reported and skipped,
 * never served. Pure apart from reading files, so tests can point it at a fixture folder.
 */
export function loadContent(dir = DEFAULT_CONTENT_DIR): ContentBundle {
  const hash = createHash('sha256');
  const categories = (JSON.parse(readText(join(dir, 'categories.json'), hash)) as unknown[]).map(
    (c) => categorySchema.parse(c),
  );
  const categoryIds = new Set(categories.map((c) => c.id));
  const flags = loadFlags(dir, hash);

  const report: ContentReport = {
    files: 0,
    recordsRead: 0,
    invalidRecords: [],
    structuralProblems: [],
    duplicateIds: [],
    exactDuplicates: [],
    legacyMerge: { legacyRecords: 0, retiredByMap: 0 },
    servableByLanguage: emptyByLanguage(() => 0),
    exclusionsByReason: emptyByLanguage(() => ({})),
  };

  const sources: { path: string; origin: PreparedQuestion['origin'] }[] = [];
  const questionDir = join(dir, 'questions');
  if (existsSync(questionDir)) {
    for (const name of readdirSync(questionDir).sort()) {
      if (/\.jsonl(\.gz)?$/.test(name))
        sources.push({ path: join(questionDir, name), origin: 'dataset' });
    }
  }
  const legacyPath = join(dir, 'legacy', 'questions.jsonl');
  if (existsSync(legacyPath)) sources.push({ path: legacyPath, origin: 'legacy' });

  const questions: PreparedQuestion[] = [];
  const seenIds = new Set<string>();
  const seenKeys = new Map<string, string>();

  for (const { path, origin } of sources) {
    report.files++;
    readJsonl(path, hash).forEach((raw, index) => {
      report.recordsRead++;
      const parsed = questionRecordSchema.safeParse(raw);
      const rawId = (raw as { id?: unknown }).id;
      if (!parsed.success) {
        report.invalidRecords.push({
          file: path.slice(dir.length + 1),
          line: index + 1,
          ...(typeof rawId === 'string' ? { id: rawId } : {}),
          problem: parsed.error.issues[0]?.message ?? 'invalid',
        });
        return;
      }
      const record = parsed.data;
      if (seenIds.has(record.id)) {
        report.duplicateIds.push(record.id);
        return;
      }
      seenIds.add(record.id);

      const problems = structuralProblems(record, categoryIds);
      if (problems.length > 0) {
        for (const problem of problems) report.structuralProblems.push({ id: record.id, problem });
        return;
      }

      const exclusions = computeExclusions(record, flags);
      if (origin === 'legacy') {
        report.legacyMerge.legacyRecords++;
        if (flags.duplicates.has(record.id)) report.legacyMerge.retiredByMap++;
      }

      // Exact duplicates among records that are otherwise playable: keep the first one.
      if (exclusions.en.length === 0) {
        const key = exactDuplicateKey(record);
        const kept = seenKeys.get(key);
        if (kept) {
          report.exactDuplicates.push({ keptId: kept, removedId: record.id });
          for (const lang of LANGUAGES) exclusions[lang].push('duplicate');
        } else {
          seenKeys.set(key, record.id);
        }
      }

      questions.push({ record, origin, exclusions });
    });
  }

  for (const q of questions) {
    for (const lang of LANGUAGES) {
      if (q.exclusions[lang].length === 0) report.servableByLanguage[lang]++;
      for (const reason of new Set(q.exclusions[lang])) {
        const counts = report.exclusionsByReason[lang];
        counts[reason] = (counts[reason] ?? 0) + 1;
      }
    }
  }
  // Keep the report's key order stable for snapshots and diffs.
  for (const lang of LANGUAGES) {
    const counts = report.exclusionsByReason[lang];
    report.exclusionsByReason[lang] = Object.fromEntries(
      EXCLUSION_REASONS.filter((r) => counts[r]).map((r) => [r, counts[r]]),
    );
  }

  const duplicateMap = [...loadDuplicateMap(dir)].map(([retiredId, keptId]) => ({
    retiredId,
    keptId,
  }));
  return { version: hash.digest('hex').slice(0, 16), categories, questions, duplicateMap, report };
}
