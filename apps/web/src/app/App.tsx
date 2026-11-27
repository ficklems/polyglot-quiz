import { isLanguage, type Language } from '@pq/shared';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../features/settings/components/LanguageSwitcher';
import { ThemeToggle } from '../features/settings/components/ThemeToggle';
import { useTheme } from '../features/settings/use-theme';
import { HomePage } from './HomePage';

export function App() {
  const { t, i18n } = useTranslation();
  const { theme, toggle } = useTheme();
  const lang: Language = isLanguage(i18n.resolvedLanguage) ? i18n.resolvedLanguage : 'en';

  return (
    <div className="app">
      <header className="app-header">
        <span className="brand">{t('app.title')}</span>
        <div className="header-controls">
          <LanguageSwitcher value={lang} onChange={(next) => void i18n.changeLanguage(next)} />
          <ThemeToggle theme={theme} onToggle={toggle} />
        </div>
      </header>
      <main>
        <HomePage lang={lang} />
      </main>
    </div>
  );
}
