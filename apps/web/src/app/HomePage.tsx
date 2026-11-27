import { QUESTIONS_PER_ROUND, type CatalogResponse, type Language } from '@pq/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { RoundSource } from '../features/quiz/api/rounds-api';
import {
  EMPTY_SELECTION,
  isEmpty,
  selectionQuestionCount,
  toRequestSelection,
  type PickerSelection,
} from '../features/topics/catalog.utils';
import { CategoryPicker } from '../features/topics/components/CategoryPicker';
import { CollectionList } from '../features/topics/components/CollectionList';
import { useCatalog } from '../features/topics/hooks/use-catalog';

type Props = {
  lang: Language;
  onStart: (source: RoundSource, title: string) => Promise<void>;
  onOpenLeaderboard: () => void;
};

export function HomePage({ lang, onStart, onOpenLeaderboard }: Props) {
  const { t } = useTranslation();
  const { state, retry } = useCatalog(lang);
  const [selection, setSelection] = useState<PickerSelection>(EMPTY_SELECTION);
  const [starting, setStarting] = useState(false);
  const [startFailed, setStartFailed] = useState(false);

  const change = (next: PickerSelection) => {
    setSelection(next);
    setStartFailed(false);
  };

  const start = async (source: RoundSource, title: string) => {
    setStarting(true);
    setStartFailed(false);
    try {
      await onStart(source, title);
    } catch (error) {
      console.error(error);
      setStartFailed(true);
      setStarting(false);
    }
  };

  return (
    <div className="home">
      <section className="hero">
        <span className="eyebrow">{t('home.eyebrow')}</span>
        <h1>{t('home.title')}</h1>
        <p>{t('home.subtitle')}</p>
      </section>

      {state.status === 'loading' && (
        <p className="status" role="status">
          {t('topics.loading')}
        </p>
      )}

      {state.status === 'error' && (
        <div className="status status--error" role="alert">
          <span>{t('topics.error')}</span>
          <button type="button" className="secondary-button" onClick={retry}>
            {t('topics.retry')}
          </button>
        </div>
      )}

      {startFailed && (
        <p className="status status--error" role="alert">
          {t('home.startError')}
        </p>
      )}

      {state.status === 'success' && (
        <>
          <CategoryPicker
            categories={state.catalog.categories}
            selection={selection}
            onChange={change}
          />
          <SelectionSummary
            catalog={state.catalog}
            selection={selection}
            starting={starting}
            onStart={(title) =>
              void start({ kind: 'selection', selection: toRequestSelection(selection) }, title)
            }
          />
          <CollectionList
            collections={state.catalog.collections}
            busy={starting}
            onStart={(c) => void start({ kind: 'collection', collectionId: c.id }, c.name)}
          />
        </>
      )}

      <button
        type="button"
        className="secondary-button home-leaderboard"
        onClick={onOpenLeaderboard}
      >
        {t('leaderboard.open')}
      </button>
    </div>
  );
}

function SelectionSummary({
  catalog,
  selection,
  starting,
  onStart,
}: {
  catalog: CatalogResponse;
  selection: PickerSelection;
  starting: boolean;
  onStart: (title: string) => void;
}) {
  const { t } = useTranslation();
  const count = selectionQuestionCount(catalog.categories, selection);
  const enough = count >= QUESTIONS_PER_ROUND;
  const single = singleTitle(catalog, selection);
  // Exactly one whole category is that topic's ranked round; anything else is a custom mix.
  const ranked = selection.categories.size === 1 && selection.subcategories.size === 0;

  let message: string;
  if (isEmpty(selection)) message = t('home.selectNothing');
  else if (!enough) message = t('home.selectionTooSmall', { count, needed: QUESTIONS_PER_ROUND });
  else message = t('home.selectionCount', { count });

  return (
    <section className="selection-summary" aria-label={t('home.summaryLabel')}>
      <p className="selection-status" role="status">
        {message}
      </p>
      {enough && (
        <p className="section-hint">{ranked ? t('home.ranked') : t('home.mixNotRanked')}</p>
      )}
      <button
        type="button"
        className="primary-button"
        disabled={!enough || starting}
        aria-busy={starting}
        onClick={() => onStart(single ?? t('quiz.customMix'))}
      >
        {t('home.start')}
      </button>
    </section>
  );
}

/** The quiz title when the selection is one category or one subcategory. */
function singleTitle(catalog: CatalogResponse, selection: PickerSelection): string | null {
  const total = selection.categories.size + selection.subcategories.size;
  if (total !== 1) return null;
  const [categoryId] = selection.categories;
  if (categoryId) return catalog.categories.find((c) => c.id === categoryId)?.name ?? null;
  const [subId] = selection.subcategories;
  for (const category of catalog.categories) {
    const sub = category.subcategories.find((s) => s.id === subId);
    if (sub) return `${category.name}: ${sub.name}`;
  }
  return null;
}
