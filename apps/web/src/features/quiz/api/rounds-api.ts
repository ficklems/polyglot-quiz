import {
  answerResultSchema,
  roundSchema,
  type AnswerResult,
  type Language,
  type OptionId,
  type Round,
} from '@pq/shared';
import { postJson } from '../../../shared/api/http';

export async function createRound(topicId: string, lang: Language): Promise<Round> {
  return roundSchema.parse(await postJson('/api/rounds', { topicId, lang }));
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
