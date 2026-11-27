import { useTranslation } from 'react-i18next';
import { useCountdown } from '../hooks/use-countdown';

type Props = {
  running: boolean;
  limitSeconds: number;
  onExpire: () => void;
};

/** Remount with a new `key` for every question to restart it. */
export function QuestionTimer({ running, limitSeconds, onExpire }: Props) {
  const { t } = useTranslation();
  const left = useCountdown(running, limitSeconds, onExpire);
  const urgent = running && left <= 5;

  return (
    <div
      className={`timer${urgent ? ' timer--urgent' : ''}`}
      role="timer"
      aria-label={t('quiz.secondsLeft', { count: left })}
    >
      <span className="timer-value" aria-hidden="true">
        {left}
      </span>
      <span className="timer-unit" aria-hidden="true">
        {t('quiz.secondsShort')}
      </span>
    </div>
  );
}
