import type { Language, Topic } from '@pq/shared';
import type { Database } from '../../db/database';

export function listTopics(db: Database, lang: Language): Topic[] {
  return db
    .prepare(
      `SELECT t.id, tt.name, tt.description
         FROM topics t
         JOIN topic_translations tt ON tt.topic_id = t.id AND tt.lang = ?
        ORDER BY t.sort_order`,
    )
    .all(lang) as Topic[];
}
