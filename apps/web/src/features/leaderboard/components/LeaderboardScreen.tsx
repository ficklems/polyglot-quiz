import type { Language } from '@pq/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTopics } from '../../topics/hooks/use-topics';
import { useLeaderboard } from '../hooks/use-leaderboard';
import { LeaderboardTable } from './LeaderboardTable';

type Props = {
  lang: Language;
  onBack: () => void;
};

export function LeaderboardScreen({ lang, onBack }: Props) {
  const { t } = useTranslation();
  const [topicId, setTopicId] = useState<string | null>(null);
  const { state: topicsState } = useTopics(lang);
  const { state, retry } = useLeaderboard(topicId);

  const topics = topicsState.status === 'success' ? topicsState.topics : [];
  const filters = [{ id: null, name: t('leaderboard.allTopics') }, ...topics];
  const currentName = filters.find((f) => f.id === topicId)?.name ?? '';

  return (
    <div className="leaderboard-screen">
      <div className="quiz-top">
        <button
          type="button"
          className="icon-button"
          aria-label={t('leaderboard.back')}
          onClick={onBack}
        >
          <svg
            aria-hidden="true"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="screen-title">{t('leaderboard.title')}</h1>
      </div>

      <div className="filter-chips" role="group" aria-label={t('leaderboard.topicsLabel')}>
        {filters.map((filter) => (
          <button
            key={filter.id ?? 'all'}
            type="button"
            className="filter-chip"
            aria-pressed={filter.id === topicId}
            onClick={() => setTopicId(filter.id)}
          >
            {filter.name}
          </button>
        ))}
      </div>

      {state.status === 'loading' && (
        <p className="status" role="status">
          {t('leaderboard.loading')}
        </p>
      )}
      {state.status === 'error' && (
        <div className="status status--error" role="alert">
          <span>{t('leaderboard.error')}</span>
          <button type="button" className="secondary-button" onClick={retry}>
            {t('topics.retry')}
          </button>
        </div>
      )}
      {state.status === 'success' && (
        <LeaderboardTable
          caption={t('leaderboard.caption', { topic: currentName })}
          entries={state.entries}
        />
      )}
    </div>
  );
}
