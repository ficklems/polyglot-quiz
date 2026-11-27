import type { Language } from '@pq/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TopicPicker } from '../features/topics/components/TopicPicker';
import { useTopics } from '../features/topics/hooks/use-topics';

export function HomePage({ lang }: { lang: Language }) {
  const { t } = useTranslation();
  const { state, retry } = useTopics(lang);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  const topics = state.status === 'success' ? state.topics : [];
  const selected = topics.find((topic) => topic.id === selectedId);

  const select = (topicId: string) => {
    setSelectedId(topicId);
    setStarted(false);
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
          <button
            type="button"
            className="primary-button"
            disabled={!selected}
            onClick={() => setStarted(true)}
          >
            {t('home.start')}
          </button>
        </>
      )}

      {started && selected && (
        <p className="status status--info" role="status">
          {t('home.comingSoon', { topic: selected.name })}
        </p>
      )}
    </div>
  );
}
