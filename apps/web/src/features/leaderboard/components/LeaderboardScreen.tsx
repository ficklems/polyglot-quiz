import type { Language } from '@pq/shared';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { RoundSource } from '../../quiz/api/rounds-api';
import { useCatalog } from '../../topics/hooks/use-catalog';
import { useLeaderboard } from '../hooks/use-leaderboard';
import { useOverall } from '../hooks/use-overall';
import { ALL_BOARDS, boardValue, parseBoardValue, type Board } from '../leaderboard.utils';
import { LeaderboardTable } from './LeaderboardTable';
import { OverallTable } from './OverallTable';

type Props = {
  lang: Language;
  onBack: () => void;
  /** Starts a round of the board's topic or themed quiz, so a player can try to get on it. */
  onPlay: (source: RoundSource, title: string) => Promise<void>;
};

export function LeaderboardScreen({ lang, onBack, onPlay }: Props) {
  const { t } = useTranslation();
  const selectId = useId();
  const [board, setBoard] = useState<Board>(ALL_BOARDS);
  const { state: catalogState } = useCatalog(lang);
  const overallView = board.kind === 'all';
  const { state: boardState, retry: retryBoard } = useLeaderboard(board);
  const { state: overallState, retry: retryOverall } = useOverall(overallView);
  // "All boards" ranks players (one row each), a single board ranks rounds.
  const state = overallView ? overallState : boardState;
  const retry = overallView ? retryOverall : retryBoard;

  const catalog = catalogState.status === 'success' ? catalogState.catalog : null;
  const categories = catalog?.categories ?? [];
  const collections = catalog?.collections ?? [];
  const currentName =
    board.kind === 'topic'
      ? (categories.find((c) => c.id === board.id)?.name ?? '')
      : board.kind === 'collection'
        ? (collections.find((c) => c.id === board.id)?.name ?? '')
        : t('leaderboard.allTopics');
  const [starting, setStarting] = useState(false);
  const [startFailed, setStartFailed] = useState(false);

  const play = async () => {
    // "All boards" has no single topic to start: go home and pick one.
    if (board.kind === 'all') return onBack();
    const source: RoundSource =
      board.kind === 'topic'
        ? { kind: 'selection', selection: { categories: [board.id], subcategories: [] } }
        : { kind: 'collection', collectionId: board.id };
    setStarting(true);
    setStartFailed(false);
    try {
      await onPlay(source, currentName);
    } catch (error) {
      console.error(error);
      setStartFailed(true);
      setStarting(false);
    }
  };

  const changeBoard = (next: Board) => {
    setBoard(next);
    setStartFailed(false);
  };

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

      {/* 31 categories and 20 themed quizzes: a select scales where a row of chips doesn't. */}
      <div className="board-picker">
        <label className="field-label" htmlFor={selectId}>
          {t('leaderboard.topicsLabel')}
        </label>
        <select
          id={selectId}
          className="text-input board-select"
          value={boardValue(board)}
          onChange={(event) => changeBoard(parseBoardValue(event.target.value))}
        >
          <option value={boardValue(ALL_BOARDS)}>{t('leaderboard.allTopics')}</option>
          <optgroup label={t('categories.heading')}>
            {categories.map((c) => (
              <option key={c.id} value={boardValue({ kind: 'topic', id: c.id })}>
                {c.name}
              </option>
            ))}
          </optgroup>
          <optgroup label={t('collections.heading')}>
            {collections.map((c) => (
              <option key={c.id} value={boardValue({ kind: 'collection', id: c.id })}>
                {c.name}
              </option>
            ))}
          </optgroup>
        </select>
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
      {overallView && overallState.status === 'success' && (
        <>
          <OverallTable caption={t('leaderboard.overallCaption')} players={overallState.players} />
          <p className="section-hint">{t('leaderboard.overallHint')}</p>
        </>
      )}
      {!overallView && boardState.status === 'success' && (
        <LeaderboardTable
          caption={t('leaderboard.caption', { topic: currentName })}
          entries={boardState.entries}
        />
      )}

      {startFailed && (
        <p className="status status--error" role="alert">
          {t('home.startError')}
        </p>
      )}
      {/* Always offered, empty board or not: the way from "be the first" to actually playing. */}
      <button
        type="button"
        className="primary-button leaderboard-play"
        disabled={starting}
        aria-busy={starting}
        onClick={() => void play()}
      >
        {board.kind === 'all'
          ? t('leaderboard.playChoose')
          : t('leaderboard.playBoard', { name: currentName })}
      </button>
    </div>
  );
}
