import type { LeaderboardEntry } from '@pq/shared';
import { useTranslation } from 'react-i18next';

type Props = {
  caption: string;
  entries: LeaderboardEntry[];
  /** The player's own entry: highlighted, and added below the table when outside the top. */
  ownEntry?: LeaderboardEntry | null;
};

export function LeaderboardTable({ caption, entries, ownEntry }: Props) {
  const { t } = useTranslation();
  const ownInTop = ownEntry ? entries.some((e) => e.id === ownEntry.id) : false;
  const rows = ownEntry && !ownInTop ? [...entries, ownEntry] : entries;

  if (rows.length === 0) {
    return <p className="status">{t('leaderboard.empty')}</p>;
  }

  return (
    <div className="table-wrap">
      <table className="leaderboard">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{t('leaderboard.rank')}</th>
            <th scope="col">{t('leaderboard.nickname')}</th>
            <th scope="col">{t('leaderboard.score')}</th>
            <th scope="col">{t('leaderboard.correct')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((entry) => {
            const isOwn = entry.id === ownEntry?.id;
            const separated = isOwn && !ownInTop;
            return (
              <tr
                key={entry.id}
                className={`${isOwn ? 'leaderboard-row--own' : ''}${separated ? ' leaderboard-row--separated' : ''}`}
                aria-current={isOwn ? 'true' : undefined}
              >
                <td>{entry.rank}</td>
                <th scope="row">
                  <bdi>{entry.nickname}</bdi>
                  {isOwn && <span className="leaderboard-you"> {t('leaderboard.you')}</span>}
                </th>
                <td>{entry.score}</td>
                <td>
                  {t('leaderboard.correctValue', {
                    correct: entry.correctCount,
                    total: entry.totalQuestions,
                  })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
