import type { AnswerResult, OptionId, RoundQuestion } from '@pq/shared';

/** Whole seconds left, rounded up so the display shows 20 → 1 and hits 0 only at the end. */
export function secondsLeft(startedAt: number, now: number, limitSeconds: number): number {
  const remainingMs = startedAt + limitSeconds * 1000 - now;
  return Math.max(0, Math.ceil(remainingMs / 1000));
}

export type OptionState = 'idle' | 'correct' | 'wrong' | 'dimmed';

/**
 * How an option looks after the player answers: the right answer is always marked,
 * the player's wrong pick is marked as wrong, everything else is dimmed.
 */
export function optionState(
  optionId: OptionId,
  picked: OptionId | null,
  result: AnswerResult | null,
): OptionState {
  if (!result) return 'idle';
  if (optionId === result.correctOptionId) return 'correct';
  if (optionId === picked) return 'wrong';
  return 'dimmed';
}

export function optionText(question: RoundQuestion, optionId: OptionId): string {
  return question.options.find((o) => o.id === optionId)?.text ?? '';
}
