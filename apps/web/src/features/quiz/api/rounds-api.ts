import {
  answerResultSchema,
  roundSchema,
  type AnswerResult,
  type CreateRoundInput,
  type Language,
  type OptionId,
  type Round,
  type Selection,
} from '@pq/shared';
import { postJson } from '../../../shared/api/http';
import type { RoundSettings } from '../../settings/round-settings';

/** Where a round's questions come from: the player's own selection or a themed quiz. */
export type RoundSource =
  { kind: 'selection'; selection: Selection } | { kind: 'collection'; collectionId: string };

export async function createRound(
  source: RoundSource,
  lang: Language,
  settings: RoundSettings,
  avoidIds: string[],
): Promise<Round> {
  const common = { lang, ...settings, avoidIds };
  const body: CreateRoundInput =
    source.kind === 'selection'
      ? { ...common, selection: source.selection }
      : { ...common, collectionId: source.collectionId };
  return roundSchema.parse(await postJson('/api/rounds', body));
}

export async function submitAnswer(
  roundId: string,
  questionId: string,
  optionId: OptionId | null,
): Promise<AnswerResult> {
  return answerResultSchema.parse(
    await postJson(`/api/rounds/${roundId}/answers`, { questionId, optionId }),
  );
}

export async function startNextQuestion(roundId: string): Promise<void> {
  await postJson(`/api/rounds/${roundId}/next`);
}
