import {
  DEFAULT_DIFFICULTY,
  DEFAULT_QUESTION_COUNT,
  DEFAULT_REGION,
  difficultySettingSchema,
  questionCountSchema,
  regionPreferenceSchema,
  type DifficultySetting,
  type QuestionCount,
  type RegionPreference,
} from '@pq/shared';

export type RoundSettings = {
  region: RegionPreference;
  difficulty: DifficultySetting;
  questionCount: QuestionCount;
};

export const ROUND_SETTINGS_STORAGE_KEY = 'pq.roundSettings';

export const DEFAULT_ROUND_SETTINGS: RoundSettings = {
  region: DEFAULT_REGION,
  difficulty: DEFAULT_DIFFICULTY,
  questionCount: DEFAULT_QUESTION_COUNT,
};

/** Each field falls back on its own, so one stale value doesn't reset the others. */
export function parseRoundSettings(stored: string | null): RoundSettings {
  let value: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(stored ?? '{}');
    if (parsed && typeof parsed === 'object') value = parsed as Record<string, unknown>;
  } catch {
    // Unreadable: defaults below.
  }
  const region = regionPreferenceSchema.safeParse(value.region);
  const difficulty = difficultySettingSchema.safeParse(value.difficulty);
  const questionCount = questionCountSchema.safeParse(value.questionCount);
  return {
    region: region.success ? region.data : DEFAULT_REGION,
    difficulty: difficulty.success ? difficulty.data : DEFAULT_DIFFICULTY,
    questionCount: questionCount.success ? questionCount.data : DEFAULT_QUESTION_COUNT,
  };
}

/** Only standard rounds go on the leaderboard (same rule as the API). */
export function isStandard(settings: RoundSettings): boolean {
  return (
    settings.difficulty === DEFAULT_DIFFICULTY && settings.questionCount === DEFAULT_QUESTION_COUNT
  );
}
