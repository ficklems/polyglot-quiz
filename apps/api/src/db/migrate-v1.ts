import type { DatabaseSync } from 'node:sqlite';
import type { ContentBundle } from '../content/load-content';
import { rebuildRoundTables } from './rebuild-round-tables';

/** Milestones 0–2 used three topics; their questions now live in these categories. */
export const V1_TOPIC_TO_CATEGORY: Record<string, string> = {
  'music-decades': 'music',
  'region-history': 'history',
  'general-knowledge': 'general',
};

/** v1 option ids → content option ids (the legacy questions kept their option order). */
const V1_OPTION: Record<string, string> = { a: 'o1', b: 'o2', c: 'o3', d: 'o4' };

export function needsV1Migration(db: DatabaseSync): boolean {
  const { user_version: version } = db.prepare('PRAGMA user_version').get() as {
    user_version: number;
  };
  const hasTopics = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'topics'")
    .get();
  return version < 2 && hasTopics !== undefined;
}

/**
 * Moves a v1 database to the v2 layout without losing played rounds or leaderboard entries:
 * topic ids become category ids, question ids retired as duplicates point at the record
 * that was kept, and option letters become content option ids.
 */
export function migrateFromV1(db: DatabaseSync, content: ContentBundle, schema: string): void {
  const retiredToKept = new Map<string, string>();
  for (const pair of content.duplicateMap) retiredToKept.set(pair.retiredId, pair.keptId);
  const correctOf = new Map<string, string | null>();
  const optionIdsOf = new Map<string, string[]>();
  for (const { record } of content.questions) {
    correctOf.set(
      record.id,
      'correctOptionId' in record.answer ? record.answer.correctOptionId : null,
    );
    optionIdsOf.set(
      record.id,
      (record.localizations.en.options ?? []).map((o) => o.id),
    );
  }

  db.exec('BEGIN');
  try {
    db.exec(`
      DROP TABLE IF EXISTS topic_translations;
      DROP TABLE IF EXISTS question_options;
      DROP TABLE IF EXISTS question_texts;
      DROP TABLE IF EXISTS questions;
      DROP TABLE IF EXISTS topics;
    `);

    // v1 rounds and leaderboard entries reference the dropped topics table: rebuild them.
    rebuildRoundTables(db, schema);

    for (const [from, to] of Object.entries(V1_TOPIC_TO_CATEGORY)) {
      db.prepare('UPDATE rounds SET topic_id = ? WHERE topic_id = ?').run(to, from);
      db.prepare('UPDATE leaderboard_entries SET topic_id = ? WHERE topic_id = ?').run(to, from);
    }

    const rows = db
      .prepare(
        'SELECT round_id, position, question_id, option_order, answered_option, is_correct FROM round_questions',
      )
      .all() as {
      round_id: string;
      position: number;
      question_id: string;
      option_order: string;
      answered_option: string | null;
      is_correct: number | null;
    }[];
    const update = db.prepare(
      `UPDATE round_questions SET question_id = ?, option_order = ?, answered_option = ?
       WHERE round_id = ? AND position = ?`,
    );

    for (const row of rows) {
      const keptId = retiredToKept.get(row.question_id);
      if (keptId) {
        // The kept record has its own options, so the old letters mean nothing there.
        // Correctness is preserved; a correct answer maps to the kept correct option.
        update.run(
          keptId,
          JSON.stringify(optionIdsOf.get(keptId) ?? []),
          row.is_correct === 1 ? (correctOf.get(keptId) ?? null) : null,
          row.round_id,
          row.position,
        );
      } else {
        const order = (JSON.parse(row.option_order) as string[]).map((o) => V1_OPTION[o] ?? o);
        const answered = row.answered_option
          ? (V1_OPTION[row.answered_option] ?? row.answered_option)
          : null;
        update.run(row.question_id, JSON.stringify(order), answered, row.round_id, row.position);
      }
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
