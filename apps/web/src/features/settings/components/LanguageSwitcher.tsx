import { LANGUAGE_LABELS, LANGUAGES, type Language } from '@pq/shared';
import { useTranslation } from 'react-i18next';

type Props = {
  value: Language;
  onChange: (lang: Language) => void;
};

export function LanguageSwitcher({ value, onChange }: Props) {
  const { t } = useTranslation();

  return (
    <div className="chip-group" role="group" aria-label={t('settings.language')}>
      {LANGUAGES.map((lang) => (
        <button
          key={lang}
          type="button"
          className="chip"
          lang={lang}
          aria-label={t(`languages.${lang}`)}
          aria-pressed={lang === value}
          onClick={() => onChange(lang)}
        >
          {LANGUAGE_LABELS[lang]}
        </button>
      ))}
    </div>
  );
}
