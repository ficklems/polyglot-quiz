import { LANGUAGES, type ExclusionReason, type QuestionRecord, type Servability } from '@pq/shared';

/** Review findings for the whole dataset, read from content/review and content/migrations. */
export type ReviewFlags = {
  quarantined: Set<string>;
  duplicates: Set<string>;
  openTranslationFlags: Set<string>;
  musicNamePending: Set<string>;
  criticalRemaining: Set<string>;
  /** Records whose Ukrainian text was machine-translated and never proofread. */
  ukMachineTranslated: (record: QuestionRecord) => boolean;
};

export function emptyFlags(): ReviewFlags {
  return {
    quarantined: new Set(),
    duplicates: new Set(),
    openTranslationFlags: new Set(),
    musicNamePending: new Set(),
    criticalRemaining: new Set(),
    ukMachineTranslated: () => false,
  };
}

/**
 * Decides, per language, why a record must not be served. An empty list means it can be
 * played in that language. Rules follow content/sampling_policy.json ("do not serve unresolved
 * translation flags, near-duplicates or fact conflicts by default") and the owner's decision to
 * serve drafts without known problems.
 */
export function computeExclusions(record: QuestionRecord, flags: ReviewFlags): Servability {
  const everywhere: ExclusionReason[] = [];
  if (flags.quarantined.has(record.id)) everywhere.push('quarantined');
  if (flags.duplicates.has(record.id)) everywhere.push('duplicate');
  if (flags.musicNamePending.has(record.id)) everywhere.push('music_name_review_pending');
  if (flags.criticalRemaining.has(record.id)) everywhere.push('critical_flag_remaining');
  // Profanity is opt-in only; there is no opt-in switch yet, so it is not served.
  if (record.contentFlags?.includes('profanity')) everywhere.push('profanity');

  const result = Object.fromEntries(
    LANGUAGES.map((lang) => [lang, [...everywhere]]),
  ) as unknown as Servability;

  // The open translation flags in the review files are about the Ukrainian text.
  if (flags.openTranslationFlags.has(record.id)) result.uk.push('open_translation_flag');
  if (flags.ukMachineTranslated(record)) result.uk.push('machine_translation_unreviewed');

  return result;
}
