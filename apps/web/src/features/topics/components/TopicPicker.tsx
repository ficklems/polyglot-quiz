import { QUESTIONS_PER_ROUND, type Topic } from '@pq/shared';
import { useTranslation } from 'react-i18next';
import { TopicIcon } from './TopicIcon';

type Props = {
  topics: Topic[];
  selectedId: string | null;
  onSelect: (topicId: string) => void;
};

export function TopicPicker({ topics, selectedId, onSelect }: Props) {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="topics-heading">
      <h2 id="topics-heading" className="visually-hidden">
        {t('topics.heading')}
      </h2>
      <ul className="topic-list">
        {topics.map((topic) => {
          // Honest counts (content/sampling_policy.json): a topic that can't fill a round in
          // this language is shown, but can't be picked.
          const playable = topic.questionCount >= QUESTIONS_PER_ROUND;
          return (
            <li key={topic.id}>
              <button
                type="button"
                className="topic-card"
                aria-pressed={topic.id === selectedId}
                disabled={!playable}
                data-topic-id={topic.id}
                onClick={() => onSelect(topic.id)}
              >
                <span className="topic-icon">
                  <TopicIcon topicId={topic.id} />
                </span>
                <span className="topic-text">
                  <span className="topic-name">{topic.name}</span>
                  {topic.description && (
                    <span className="topic-description">{topic.description}</span>
                  )}
                  <span className="topic-meta">
                    {playable
                      ? t('topics.questions', { count: topic.questionCount })
                      : t('topics.notEnough', { count: topic.questionCount })}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
