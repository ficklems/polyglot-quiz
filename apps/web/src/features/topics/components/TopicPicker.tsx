import type { Topic } from '@pq/shared';
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
        {topics.map((topic) => (
          <li key={topic.id}>
            <button
              type="button"
              className="topic-card"
              aria-pressed={topic.id === selectedId}
              data-topic-id={topic.id}
              onClick={() => onSelect(topic.id)}
            >
              <span className="topic-icon">
                <TopicIcon topicId={topic.id} />
              </span>
              <span className="topic-text">
                <span className="topic-name">{topic.name}</span>
                <span className="topic-description">{topic.description}</span>
                <span className="topic-meta">
                  {t('topics.questions', { count: topic.questionCount })}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
