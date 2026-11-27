import type { LeaderboardEntry } from '@pq/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LeaderboardTable } from '../../leaderboard/components/LeaderboardTable';
import { SaveScoreForm } from '../../leaderboard/components/SaveScoreForm';
import { useLeaderboard } from '../../leaderboard/hooks/use-leaderboard';
import type { Board } from '../../leaderboard/leaderboard.utils';

type Props = {
  roundId: string;
  /** null for a custom mix: nothing to save. */
  board: Board | null;
  title: string;
  score: number;
  correctCount: number;
  total: number;
  onPlayAgain: () => void;
  onHome: () => void;
};

export function ResultScreen({
  roundId,
  board,
  title,
  score,
  correctCount,
  total,
  onPlayAgain,
  onHome,
}: Props) {
  const { t } = useTranslation();
  const [saved, setSaved] = useState<LeaderboardEntry | null>(null);
  const ratio = total === 0 ? 0 : correctCount / total;
  const verdictKey =
    ratio === 1 ? 'perfect' : ratio >= 0.7 ? 'great' : ratio >= 0.4 ? 'good' : 'tryAgain';

  return (
    <div className="result">
      <section className="hero result-hero">
        <span className="eyebrow">{title}</span>
        <h1>{t('result.title')}</h1>
        <p className="result-score">{t('result.points', { count: score })}</p>
        <p>{t('result.correct', { correct: correctCount, total })}</p>
        <p className="result-verdict">{t(`result.verdict.${verdictKey}`)}</p>
      </section>

      {board === null ? (
        <p className="status status--info">{t('result.notRanked')}</p>
      ) : saved ? (
        <SavedBoard board={board} title={title} entry={saved} />
      ) : (
        <SaveScoreForm roundId={roundId} onSaved={setSaved} />
      )}

      <button type="button" className="primary-button" onClick={onPlayAgain}>
        {t('result.playAgain')}
      </button>
      <button type="button" className="secondary-button result-home" onClick={onHome}>
        {t('result.home')}
      </button>
    </div>
  );
}

function SavedBoard({
  board,
  title,
  entry,
}: {
  board: Board;
  title: string;
  entry: LeaderboardEntry;
}) {
  const { t } = useTranslation();
  // Load the board after saving, so the player's own entry is included.
  const { state } = useLeaderboard(board, entry.id);

  return (
    <section className="saved-board">
      <p className="status status--info" role="status">
        {t('save.saved', { rank: entry.rank })}
      </p>
      {state.status === 'success' && (
        <LeaderboardTable
          caption={t('leaderboard.caption', { topic: title })}
          entries={state.entries}
          ownEntry={entry}
        />
      )}
      {state.status === 'error' && (
        <p className="status status--error" role="alert">
          {t('leaderboard.error')}
        </p>
      )}
    </section>
  );
}
