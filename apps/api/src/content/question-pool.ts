import {
  LANGUAGES,
  QUESTIONS_PER_ROUND,
  type CatalogResponse,
  type Collection,
  type Language,
} from '@pq/shared';
import type { Database } from '../db/database';
import { PLAYABLE_TYPES_SQL, SERVE_COLUMN } from '../routes/topics/service';
import type { ContentBundle } from './load-content';
import { collectionPlan, matchesCollection, type QuestionMeta } from './selection';

/**
 * The playable questions per language (metadata only), read from the database once.
 * Content only changes when the API restarts, so it is safe to keep in memory, and it
 * spares every round request a scan of 24k JSON rows.
 */
export class QuestionPool {
  private readonly byLang = new Map<Language, QuestionMeta[]>();
  private readonly catalogs = new Map<Language, CatalogResponse>();
  private readonly collectionById: Map<string, Collection>;

  constructor(
    private readonly db: Database,
    private readonly content: Pick<ContentBundle, 'collections' | 'subcategoryNames'>,
  ) {
    this.collectionById = new Map(content.collections.map((c) => [c.id, c]));
  }

  questions(lang: Language): QuestionMeta[] {
    let pool = this.byLang.get(lang);
    if (!pool) {
      const rows = this.db
        .prepare(
          `SELECT id, category_id, subcategory, type, region, difficulty, tags FROM questions
            WHERE ${SERVE_COLUMN[lang]} = 1 AND type IN (${PLAYABLE_TYPES_SQL})
            ORDER BY id`,
        )
        .all() as {
        id: string;
        category_id: string;
        subcategory: string;
        type: string;
        region: string;
        difficulty: QuestionMeta['difficulty'];
        tags: string;
      }[];
      pool = rows.map((r) => ({
        id: r.id,
        category: r.category_id,
        subcategory: r.subcategory,
        type: r.type,
        region: r.region,
        difficulty: r.difficulty,
        tags: JSON.parse(r.tags) as string[],
      }));
      this.byLang.set(lang, pool);
    }
    return pool;
  }

  collection(id: string): Collection | undefined {
    return this.collectionById.get(id);
  }

  /** Categories with their non-empty subcategories, and the themed quizzes, for one language. */
  catalog(lang: Language): CatalogResponse {
    const cached = this.catalogs.get(lang);
    if (cached) return cached;

    const pool = this.questions(lang);
    const perCategory = new Map<string, number>();
    const perSubcategory = new Map<string, number>();
    for (const q of pool) {
      perCategory.set(q.category, (perCategory.get(q.category) ?? 0) + 1);
      const ref = `${q.category}/${q.subcategory}`;
      perSubcategory.set(ref, (perSubcategory.get(ref) ?? 0) + 1);
    }

    const categories = (
      this.db
        .prepare('SELECT id, names, subcategories FROM categories ORDER BY sort_order')
        .all() as {
        id: string;
        names: string;
        subcategories: string;
      }[]
    ).map((row) => {
      const subIds = JSON.parse(row.subcategories) as string[];
      // Subcategories that only appear in questions (not declared) are listed too.
      for (const ref of perSubcategory.keys()) {
        const [cat, sub] = ref.split('/') as [string, string];
        if (cat === row.id && !subIds.includes(sub)) subIds.push(sub);
      }
      return {
        id: row.id,
        name: (JSON.parse(row.names) as Record<Language, string>)[lang],
        questionCount: perCategory.get(row.id) ?? 0,
        subcategories: subIds
          .map((sub) => ({
            id: `${row.id}/${sub}`,
            name: this.content.subcategoryNames[sub]?.[lang] ?? sub.replaceAll('_', ' '),
            questionCount: perSubcategory.get(`${row.id}/${sub}`) ?? 0,
          }))
          .filter((s) => s.questionCount > 0),
      };
    });

    const collections = this.content.collections.map((c) => {
      const questionCount = pool.filter((q) => matchesCollection(q, c)).length;
      const questionsPerRound = collectionPlan(c, QUESTIONS_PER_ROUND).count;
      return {
        id: c.id,
        name: c.name[lang],
        questionCount,
        questionsPerRound,
        playable: questionCount >= Math.max(questionsPerRound, c.minimumUniqueQuestions),
      };
    });

    const catalog: CatalogResponse = { lang, categories, collections };
    this.catalogs.set(lang, catalog);
    return catalog;
  }

  /** Builds every cache up front, so the first player doesn't wait for it. */
  warmUp(): void {
    for (const lang of LANGUAGES) this.catalog(lang);
  }
}
