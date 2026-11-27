import type { Language } from '@pq/shared';
import {
  optionTextIn,
  QUESTION_SEEDS,
  type QuestionSeed,
} from '../../apps/api/src/db/seed/questions';
import { TOPIC_SEEDS } from '../../apps/api/src/db/seed/topics';

/*
 * Test oracle: the seed data is the source of truth for which answer is correct.
 * Black-box tests use it to play like a player who knows (or doesn't know) the answer.
 */

function findByText(questionText: string, lang: Language): QuestionSeed {
  const seed = QUESTION_SEEDS.find((q) => q.text[lang] === questionText.trim());
  if (!seed) throw new Error(`No seeded question with text "${questionText}" in ${lang}`);
  return seed;
}

export function correctAnswerText(questionText: string, lang: Language): string {
  const seed = findByText(questionText, lang);
  return optionTextIn(seed.options[seed.correct], lang);
}

export function wrongAnswerText(questionText: string, lang: Language): string {
  const seed = findByText(questionText, lang);
  const wrong = seed.correct === 'a' ? 'b' : 'a';
  return optionTextIn(seed.options[wrong], lang);
}

export function correctOptionId(questionId: string) {
  const seed = QUESTION_SEEDS.find((q) => q.id === questionId);
  if (!seed) throw new Error(`Unknown question ${questionId}`);
  return seed.correct;
}

export function topicName(topicId: string, lang: Language): string {
  const topic = TOPIC_SEEDS.find((t) => t.id === topicId);
  if (!topic) throw new Error(`Unknown topic ${topicId}`);
  return topic.translations[lang].name;
}

export function questionCount(topicId: string): number {
  return QUESTION_SEEDS.filter((q) => q.topicId === topicId).length;
}
