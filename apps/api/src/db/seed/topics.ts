import type { DatabaseSync } from 'node:sqlite';
import type { Language } from '@pq/shared';

type TopicSeed = {
  id: string;
  translations: Record<Language, { name: string; description: string }>;
};

/** v1 topics. Question content arrives in the next milestone. */
export const TOPIC_SEEDS: TopicSeed[] = [
  {
    id: 'music-decades',
    translations: {
      uk: { name: 'Музика за десятиліттями', description: 'Від 60-х до 2020-х' },
      en: { name: 'Music by decade', description: 'From the 60s to the 2020s' },
      pl: { name: 'Muzyka według dekad', description: 'Od lat 60. do 2020.' },
    },
  },
  {
    id: 'region-history',
    translations: {
      uk: {
        name: 'Історія й події регіону',
        description: 'Польща, Україна та Центральна Європа',
      },
      en: {
        name: 'History of the region',
        description: 'Poland, Ukraine and Central Europe',
      },
      pl: {
        name: 'Historia regionu',
        description: 'Polska, Ukraina i Europa Środkowa',
      },
    },
  },
  {
    id: 'general-knowledge',
    translations: {
      uk: { name: 'Загальні знання', description: 'Наука, географія, культура' },
      en: { name: 'General knowledge', description: 'Science, geography, culture' },
      pl: { name: 'Wiedza ogólna', description: 'Nauka, geografia, kultura' },
    },
  },
];

export function seedTopics(db: DatabaseSync): void {
  const insertTopic = db.prepare('INSERT INTO topics (id, sort_order) VALUES (?, ?)');
  const insertTranslation = db.prepare(
    'INSERT INTO topic_translations (topic_id, lang, name, description) VALUES (?, ?, ?, ?)',
  );

  db.exec('BEGIN');
  try {
    TOPIC_SEEDS.forEach((topic, index) => {
      insertTopic.run(topic.id, index);
      for (const [lang, { name, description }] of Object.entries(topic.translations)) {
        insertTranslation.run(topic.id, lang, name, description);
      }
    });
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
