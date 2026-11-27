import { useTranslation } from 'react-i18next';

type Props = {
  topicName: string;
  score: number;
  correctCount: number;
  total: number;
  onPlayAgain: () => void;
  onHome: () => void;
};

export function ResultScreen({
  topicName,
  score,
  correctCount,
  total,
  onPlayAgain,
  onHome,
}: Props) {
  const { t } = useTranslation();
  const ratio = total === 0 ? 0 : correctCount / total;
  const verdictKey =
    ratio === 1 ? 'perfect' : ratio >= 0.7 ? 'great' : ratio >= 0.4 ? 'good' : 'tryAgain';

  return (
    <div className="result">
      <section className="hero result-hero">
        <span className="eyebrow">{topicName}</span>
        <h1>{t('result.title')}</h1>
        <p className="result-score">{t('result.points', { count: score })}</p>
        <p>{t('result.correct', { correct: correctCount, total })}</p>
        <p className="result-verdict">{t(`result.verdict.${verdictKey}`)}</p>
      </section>
      <button type="button" className="primary-button" onClick={onPlayAgain}>
        {t('result.playAgain')}
      </button>
      <button type="button" className="secondary-button result-home" onClick={onHome}>
        {t('result.home')}
      </button>
    </div>
  );
}
