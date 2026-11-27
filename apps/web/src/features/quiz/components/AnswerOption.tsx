import type { OptionId } from '@pq/shared';
import { useTranslation } from 'react-i18next';
import type { OptionState } from '../quiz.utils';

type Props = {
  letter: string;
  optionId: OptionId;
  text: string;
  state: OptionState;
  disabled: boolean;
  onPick: (optionId: OptionId) => void;
};

export function AnswerOption({ letter, optionId, text, state, disabled, onPick }: Props) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      className={`answer answer--${state}`}
      disabled={disabled}
      onClick={() => onPick(optionId)}
    >
      <span className="answer-badge" aria-hidden="true">
        {letter}
      </span>
      <span className="answer-text">{text}</span>
      {state === 'correct' && (
        <>
          <span className="visually-hidden">{t('quiz.correctMark')}</span>
          <svg
            aria-hidden="true"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </>
      )}
      {state === 'wrong' && (
        <>
          <span className="visually-hidden">{t('quiz.wrongMark')}</span>
          <svg
            aria-hidden="true"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </>
      )}
    </button>
  );
}
