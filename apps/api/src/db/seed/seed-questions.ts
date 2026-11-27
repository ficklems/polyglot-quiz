import type { DatabaseSync } from 'node:sqlite';
import { LANGUAGES, OPTION_IDS } from '@pq/shared';
import { optionTextIn, QUESTION_SEEDS, type QuestionSeed } from './questions';

export function seedQuestions(db: DatabaseSync, seeds: QuestionSeed[] = QUESTION_SEEDS): void {
  const insertQuestion = db.prepare(
    'INSERT INTO questions (id, topic_id, correct_option) VALUES (?, ?, ?)',
  );
  const insertText = db.prepare(
    'INSERT INTO question_texts (question_id, lang, text) VALUES (?, ?, ?)',
  );
  const insertOption = db.prepare(
    'INSERT INTO question_options (question_id, option_id, lang, text) VALUES (?, ?, ?, ?)',
  );

  db.exec('BEGIN');
  try {
    for (const q of seeds) {
      insertQuestion.run(q.id, q.topicId, q.correct);
      for (const lang of LANGUAGES) {
        insertText.run(q.id, lang, q.text[lang]);
        for (const optionId of OPTION_IDS) {
          insertOption.run(q.id, optionId, lang, optionTextIn(q.options[optionId], lang));
        }
      }
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
