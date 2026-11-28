import type { CatalogResponse, Language } from '@pq/shared';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { RoundSource } from '../features/quiz/api/rounds-api';
import {
  EMPTY_SELECTION,
  isEmpty,
  selectionQuestionCount,
  toRequestSelection,
  type PickerSelection,
} from '../features/topics/catalog.utils';
import { RoundSettingsPanel } from '../features/settings/components/RoundSettingsPanel';
import { isStandard, type RoundSettings } from '../features/settings/round-settings';
import { CategoryPicker } from '../features/topics/components/CategoryPicker';
import { CollectionList } from '../features/topics/components/CollectionList';
import { useCatalog } from '../features/topics/hooks/use-catalog';

/**
 * The free API host sleeps after 15 idle minutes and takes up to a minute to wake. After a
 * few seconds of loading, say so instead of leaving the player wondering.
 */
const WAKE_UP_HINT_MS = 4000;

function useAfterDelay(active: boolean, ms: number): boolean {
  // Remember which loading phase the timer fired for, so a new phase starts fresh.
  const [firedFor, setFiredFor] = useState<number | null>(null);
  const [phase, setPhase] = useState(0);
  const [wasActive, setWasActive] = useState(active);
  if (active !== wasActive) {
    setWasActive(active);
    if (active) setPhase(phase + 1);
  }
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setFiredFor(phase), ms);
    return () => clearTimeout(timer);
  }, [active, ms, phase]);
  return active && firedFor === phase;
}

type Props = {
  lang: Language;
  settings: RoundSettings;
  onSettingsChange: (change: Partial<RoundSettings>) => void;
  onStart: (source: RoundSource, title: string) => Promise<void>;
  onOpenLeaderboard: () => void;
};

export function HomePage({ lang, settings, onSettingsChange, onStart, onOpenLeaderboard }: Props) {
  const { t } = useTranslation();
  const { state, retry } = useCatalog(lang, settings.region, settings.difficulty);
  const [selection, setSelection] = useState<PickerSelection>(EMPTY_SELECTION);
  const [starting, setStarting] = useState(false);
  const [startFailed, setStartFailed] = useState(false);
  const slowLoad = useAfterDelay(state.status === 'loading', WAKE_UP_HINT_MS);

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

      <RoundSettingsPanel lang={lang} settings={settings} onChange={onSettingsChange} />

      {state.status === 'loading' && (
        <p className="status" role="status">
          {slowLoad ? t('topics.wakingUp') : t('topics.loading')}
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
            settings={settings}
            starting={starting}
            onWiden={() => onSettingsChange({ region: 'all' })}
            onStart={(title) =>
              void start({ kind: 'selection', selection: toRequestSelection(selection) }, title)
            }
          />
          <CollectionList
            collections={state.catalog.collections}
            questionCount={settings.questionCount}
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
  settings,
  starting,
  onWiden,
  onStart,
}: {
  catalog: CatalogResponse;
  selection: PickerSelection;
  settings: RoundSettings;
  starting: boolean;
  onWiden: () => void;
  onStart: (title: string) => void;
}) {
  const { t } = useTranslation();
  const count = selectionQuestionCount(catalog.categories, selection);
  const needed = settings.questionCount;
  const enough = count >= needed;
  const single = singleTitle(catalog, selection);
  // Exactly one whole category is that topic's round; anything else is a custom mix.
  const oneTopic = selection.categories.size === 1 && selection.subcategories.size === 0;
  const rankedHint = !oneTopic
    ? t('home.mixNotRanked')
    : isStandard(settings)
      ? t('home.ranked')
      : t('home.notStandard');

  let message: string;
  if (isEmpty(selection)) message = t('home.selectNothing');
  else if (!enough) message = t('home.selectionTooSmall', { count, needed });
  else message = t('home.selectionCount', { count });
  // Honest small pool (spec §3): offer every region instead of quietly adding other ones.
  const canWiden = !isEmpty(selection) && !enough && settings.region !== 'all';

  return (
    <section className="selection-summary" aria-label={t('home.summaryLabel')}>
      <p className="selection-status" role="status">
        {message}
      </p>
      {enough && <p className="section-hint">{rankedHint}</p>}
      {canWiden && (
        <button type="button" className="secondary-button widen-button" onClick={onWiden}>
          {t('home.widenRegion')}
        </button>
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
