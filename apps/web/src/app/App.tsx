import { isLanguage, type Language, type Round } from '@pq/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LeaderboardScreen } from '../features/leaderboard/components/LeaderboardScreen';
import { boardOfRound, type Board } from '../features/leaderboard/leaderboard.utils';
import { createRound, type RoundSource } from '../features/quiz/api/rounds-api';
import { QuizScreen } from '../features/quiz/components/QuizScreen';
import { ResultScreen } from '../features/quiz/components/ResultScreen';
import { LanguageSwitcher } from '../features/settings/components/LanguageSwitcher';
import { ThemeToggle } from '../features/settings/components/ThemeToggle';
import { useRoundSettings } from '../features/settings/use-round-settings';
import { useTheme } from '../features/settings/use-theme';
import { readRecent, rememberPlayed } from '../features/quiz/recent-questions';
import { HomePage } from './HomePage';

type View =
  | { name: 'home' }
  | { name: 'quiz'; round: Round; source: RoundSource; title: string }
  | { name: 'leaderboard' }
  | {
      name: 'result';
      roundId: string;
      source: RoundSource;
      title: string;
      /** null for a custom mix, which isn't ranked. */
      board: Board | null;
      score: number;
      correctCount: number;
      total: number;
    };

export function App() {
  const { t, i18n } = useTranslation();
  const { theme, toggle } = useTheme();
  const { settings, update: updateSettings } = useRoundSettings();
  const [view, setView] = useState<View>({ name: 'home' });
  const lang: Language = isLanguage(i18n.resolvedLanguage) ? i18n.resolvedLanguage : 'en';

  /** Throws on failure so the caller can show the error where the player clicked. */
  const start = async (source: RoundSource, title: string) => {
    const round = await createRound(source, lang, settings, readRecent());
    rememberPlayed(round.questions.map((q) => q.id));
    setView({ name: 'quiz', round, source, title });
  };

  const playAgain = async (source: RoundSource, title: string) => {
    try {
      await start(source, title);
    } catch (error) {
      console.error(error);
      setView({ name: 'home' });
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <span className="brand">{t('app.title')}</span>
        <div className="header-controls">
          {/* A round is played in the language it started in, so switching is hidden mid-round. */}
          {view.name !== 'quiz' && (
            <LanguageSwitcher value={lang} onChange={(next) => void i18n.changeLanguage(next)} />
          )}
          <ThemeToggle theme={theme} onToggle={toggle} />
        </div>
      </header>
      <main>
        {view.name === 'home' && (
          <HomePage
            lang={lang}
            settings={settings}
            onSettingsChange={updateSettings}
            onStart={start}
            onOpenLeaderboard={() => setView({ name: 'leaderboard' })}
          />
        )}
        {view.name === 'leaderboard' && (
          <LeaderboardScreen lang={lang} onBack={() => setView({ name: 'home' })} onPlay={start} />
        )}
        {view.name === 'quiz' && (
          <QuizScreen
            key={view.round.roundId}
            round={view.round}
            title={view.title}
            onQuit={() => setView({ name: 'home' })}
            onFinish={(r) =>
              setView({
                name: 'result',
                roundId: view.round.roundId,
                source: view.source,
                title: view.title,
                board: boardOfRound(view.round),
                ...r,
              })
            }
          />
        )}
        {view.name === 'result' && (
          <ResultScreen
            key={view.roundId}
            roundId={view.roundId}
            board={view.board}
            title={view.title}
            score={view.score}
            correctCount={view.correctCount}
            total={view.total}
            onPlayAgain={() => void playAgain(view.source, view.title)}
            onHome={() => setView({ name: 'home' })}
          />
        )}
      </main>
    </div>
  );
}
