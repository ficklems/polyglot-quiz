import type { Language, Topic } from '@pq/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TopicPicker } from '../features/topics/components/TopicPicker';
import { useTopics } from '../features/topics/hooks/use-topics';

type Props = {
  lang: Language;
  onStart: (topic: Topic) => Promise<void>;
  onOpenLeaderboard: () => void;
};

export function HomePage({ lang, onStart, onOpenLeaderboard }: Props) {
  const { t } = useTranslation();
  const { state, retry } = useTopics(lang);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [startFailed, setStartFailed] = useState(false);

  const topics = state.status === 'success' ? state.topics : [];
  const selected = topics.find((topic) => topic.id === selectedId);

  const select = (topicId: string) => {
    setSelectedId(topicId);
    setStartFailed(false);
  };

  const start = async () => {
    if (!selected) return;
    setStarting(true);
    setStartFailed(false);
    try {
      await onStart(selected);
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

      {state.status === 'success' && (
        <>
          <span className="eyebrow">{t('topics.count', { count: topics.length })}</span>
          <TopicPicker topics={topics} selectedId={selectedId} onSelect={select} />
          {startFailed && (
            <p className="status status--error" role="alert">
              {t('home.startError')}
            </p>
          )}
          <button
            type="button"
            className="primary-button"
            disabled={!selected || starting}
            aria-busy={starting}
            onClick={() => void start()}
          >
            {t('home.start')}
          </button>
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
