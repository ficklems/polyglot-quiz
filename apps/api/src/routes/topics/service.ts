import { SINGLE_ANSWER_TYPES, type Language, type Topic } from '@pq/shared';
import type { Database } from '../../db/database';

/** SQL column telling whether a question is served in a language. */
export const SERVE_COLUMN: Record<Language, string> = {
  uk: 'serve_uk',
  en: 'serve_en',
  pl: 'serve_pl',
};

/** Question types a round can contain right now (one correct option). */
export const PLAYABLE_TYPES_SQL = SINGLE_ANSWER_TYPES.map((t) => `'${t}'`).join(', ');

/** Topics are the content categories, with the number of questions playable in `lang`. */
export function listTopics(db: Database, lang: Language): Topic[] {
  const rows = db
    .prepare(
      `SELECT c.id, c.names,
              (SELECT COUNT(*) FROM questions q
                WHERE q.category_id = c.id AND q.${SERVE_COLUMN[lang]} = 1
                  AND q.type IN (${PLAYABLE_TYPES_SQL})) AS questionCount
         FROM categories c
        ORDER BY c.sort_order`,
    )
    .all() as { id: string; names: string; questionCount: number }[];

  return rows.map((row) => ({
    id: row.id,
    name: (JSON.parse(row.names) as Record<Language, string>)[lang],
    description: null,
    questionCount: row.questionCount,
  }));
}

export function topicExists(db: Database, topicId: string): boolean {
  return db.prepare('SELECT 1 FROM categories WHERE id = ?').get(topicId) !== undefined;
}
