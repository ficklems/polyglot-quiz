import type { Language, Topic } from '@pq/shared';
import type { Database } from '../../db/database';

export function listTopics(db: Database, lang: Language): Topic[] {
  return db
    .prepare(
      `SELECT t.id, tt.name, tt.description,
              (SELECT COUNT(*) FROM questions q WHERE q.topic_id = t.id) AS questionCount
         FROM topics t
         JOIN topic_translations tt ON tt.topic_id = t.id AND tt.lang = ?
        ORDER BY t.sort_order`,
    )
    .all(lang) as Topic[];
}

export function topicExists(db: Database, topicId: string): boolean {
  return db.prepare('SELECT 1 FROM topics WHERE id = ?').get(topicId) !== undefined;
}
