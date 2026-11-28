import type { OverallPlayer } from '@pq/shared';
import { useTranslation } from 'react-i18next';

type Props = { caption: string; players: OverallPlayer[] };

/** One row per player: total of their best scores and how many boards they played. */
export function OverallTable({ caption, players }: Props) {
  const { t } = useTranslation();

  if (players.length === 0) {
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
            <th scope="col">{t('leaderboard.totalScore')}</th>
            <th scope="col">{t('leaderboard.boardsPlayed')}</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => (
            <tr key={player.nickname.toLowerCase()}>
              <td>{player.rank}</td>
              <th scope="row">
                <bdi>{player.nickname}</bdi>
              </th>
              <td>{player.totalScore}</td>
              <td>{player.boardsPlayed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
