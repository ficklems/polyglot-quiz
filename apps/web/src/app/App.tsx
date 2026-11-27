import { isLanguage, type Language, type Round, type Topic } from '@pq/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createRound } from '../features/quiz/api/rounds-api';
import { QuizScreen } from '../features/quiz/components/QuizScreen';
import { ResultScreen } from '../features/quiz/components/ResultScreen';
import { LanguageSwitcher } from '../features/settings/components/LanguageSwitcher';
import { ThemeToggle } from '../features/settings/components/ThemeToggle';
import { useTheme } from '../features/settings/use-theme';
import { HomePage } from './HomePage';

type View =
  | { name: 'home' }
  | { name: 'quiz'; round: Round; topic: Topic }
  | { name: 'result'; topic: Topic; score: number; correctCount: number; total: number };

export function App() {
  const { t, i18n } = useTranslation();
  const { theme, toggle } = useTheme();
  const [view, setView] = useState<View>({ name: 'home' });
  const lang: Language = isLanguage(i18n.resolvedLanguage) ? i18n.resolvedLanguage : 'en';

  /** Throws on failure so the caller can show the error where the player clicked. */
  const start = async (topic: Topic) => {
    const round = await createRound(topic.id, lang);
    setView({ name: 'quiz', round, topic });
  };

  const playAgain = async (topic: Topic) => {
    try {
      await start(topic);
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
        {view.name === 'home' && <HomePage lang={lang} onStart={start} />}
        {view.name === 'quiz' && (
          <QuizScreen
            key={view.round.roundId}
            round={view.round}
            topicName={view.topic.name}
            onQuit={() => setView({ name: 'home' })}
            onFinish={(r) => setView({ name: 'result', topic: view.topic, ...r })}
          />
        )}
        {view.name === 'result' && (
          <ResultScreen
            topicName={view.topic.name}
            score={view.score}
            correctCount={view.correctCount}
            total={view.total}
            onPlayAgain={() => void playAgain(view.topic)}
            onHome={() => setView({ name: 'home' })}
          />
        )}
      </main>
    </div>
  );
}
