import type { DatabaseSync } from 'node:sqlite';
import { LANGUAGES } from '@pq/shared';
import type { ContentBundle } from '../content/load-content';

/**
 * Upserts categories and questions from the content bundle. Runs only when the content
 * version changed. Questions that disappeared from the content are not deleted (played
 * rounds may point at them); they are marked as no longer served.
 */
export function syncContent(db: DatabaseSync, content: ContentBundle): void {
  const current = db.prepare("SELECT value FROM meta WHERE key = 'content_version'").get() as
    { value: string } | undefined;
  if (current?.value === content.version) return;

  const upsertCategory = db.prepare(
    `INSERT INTO categories (id, sort_order, names, subcategories) VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET sort_order = excluded.sort_order, names = excluded.names,
       subcategories = excluded.subcategories`,
  );
  const upsertQuestion = db.prepare(
    `INSERT INTO questions (id, fact_key, category_id, subcategory, region, difficulty, type, tags,
       review_status, origin, payload, exclusions, serve_uk, serve_en, serve_pl)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET fact_key = excluded.fact_key, category_id = excluded.category_id,
       subcategory = excluded.subcategory, region = excluded.region, difficulty = excluded.difficulty,
       type = excluded.type, tags = excluded.tags, review_status = excluded.review_status,
       origin = excluded.origin, payload = excluded.payload, exclusions = excluded.exclusions,
       serve_uk = excluded.serve_uk, serve_en = excluded.serve_en, serve_pl = excluded.serve_pl`,
  );

  db.exec('BEGIN');
  try {
    content.categories.forEach((c, index) => {
      upsertCategory.run(c.id, index, JSON.stringify(c.name), JSON.stringify(c.subcategories));
    });

    const present = new Set<string>();
    for (const { record: r, origin, exclusions } of content.questions) {
      present.add(r.id);
      const payload = {
        localizations: r.localizations,
        answer: r.answer,
        ...(r.geo !== undefined ? { geo: r.geo } : {}),
        ...(r.emoji !== undefined ? { emoji: r.emoji } : {}),
      };
      const serve = LANGUAGES.map((lang) => (exclusions[lang].length === 0 ? 1 : 0));
      upsertQuestion.run(
        r.id,
        r.factKey,
        r.category,
        r.subcategory,
        r.region,
        r.difficulty,
        r.type,
        JSON.stringify(r.tags),
        r.reviewStatus,
        origin,
        JSON.stringify(payload),
        JSON.stringify(exclusions),
        ...(serve as [number, number, number]),
      );
    }

    const retire = db.prepare(
      `UPDATE questions SET serve_uk = 0, serve_en = 0, serve_pl = 0,
         exclusions = '{"uk":["removed_from_content"],"en":["removed_from_content"],"pl":["removed_from_content"]}'
       WHERE id = ?`,
    );
    for (const { id } of db.prepare('SELECT id FROM questions').all() as { id: string }[]) {
      if (!present.has(id)) retire.run(id);
    }

    db.prepare(
      `INSERT INTO meta (key, value) VALUES ('content_version', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    ).run(content.version);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
