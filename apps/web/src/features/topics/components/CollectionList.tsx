import type { CatalogCollection } from '@pq/shared';
import { useTranslation } from 'react-i18next';

type Props = {
  collections: CatalogCollection[];
  busy: boolean;
  onStart: (collection: CatalogCollection) => void;
};

/** Themed quizzes start straight away: their content and round size are fixed. */
export function CollectionList({ collections, busy, onStart }: Props) {
  const { t } = useTranslation();

  return (
    <section className="picker" aria-labelledby="collections-heading">
      <h2 id="collections-heading" className="section-title">
        {t('collections.heading')}
      </h2>
      <p className="section-hint">{t('collections.hint')}</p>
      <ul className="collection-list">
        {collections.map((collection) => (
          <li key={collection.id}>
            <button
              type="button"
              className="collection-card"
              disabled={!collection.playable || busy}
              data-collection-id={collection.id}
              aria-describedby={`collection-meta-${collection.id}`}
              onClick={() => onStart(collection)}
            >
              <span className="collection-name">{collection.name}</span>
            </button>
            <span id={`collection-meta-${collection.id}`} className="topic-meta">
              {collection.playable
                ? t('collections.questionsPerRound', { count: collection.questionsPerRound })
                : t('collections.notEnough')}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
