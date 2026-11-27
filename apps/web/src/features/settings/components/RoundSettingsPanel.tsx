import {
  DIFFICULTY_SETTINGS,
  QUESTION_COUNTS,
  REGION_PREFERENCES,
  resolveRegion,
  type Language,
} from '@pq/shared';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import type { RoundSettings } from '../round-settings';

type Props = {
  lang: Language;
  settings: RoundSettings;
  onChange: (change: Partial<RoundSettings>) => void;
};

export function RoundSettingsPanel({ lang, settings, onChange }: Props) {
  const { t } = useTranslation();
  const regionId = useId();
  const regionHintId = useId();
  const resolved = resolveRegion(settings.region, lang);

  // Say what the region does, so "Ukraine" isn't read as "only Ukraine" (spec §3).
  const regionHint =
    resolved === 'all'
      ? t('roundSettings.regionHint.all')
      : resolved === 'global'
        ? t('roundSettings.regionHint.global')
        : t('roundSettings.regionHint.mixed', { region: t(`roundSettings.regions.${resolved}`) });

  return (
    <section className="picker round-settings" aria-labelledby="round-settings-heading">
      <h2 id="round-settings-heading" className="section-title">
        {t('roundSettings.heading')}
      </h2>

      <div className="setting">
        <label className="field-label" htmlFor={regionId}>
          {t('roundSettings.region')}
        </label>
        <select
          id={regionId}
          className="text-input setting-select"
          value={settings.region}
          aria-describedby={regionHintId}
          onChange={(event) => onChange({ region: event.target.value as RoundSettings['region'] })}
        >
          {REGION_PREFERENCES.map((region) => (
            <option key={region} value={region}>
              {region === 'auto'
                ? t('roundSettings.regions.auto', {
                    region: t(`roundSettings.regions.${resolveRegion('auto', lang)}`),
                  })
                : t(`roundSettings.regions.${region}`)}
            </option>
          ))}
        </select>
        <p id={regionHintId} className="section-hint">
          {regionHint}
        </p>
      </div>

      <div className="setting">
        <span className="field-label" id="difficulty-label">
          {t('roundSettings.difficulty')}
        </span>
        <div className="segmented" role="group" aria-labelledby="difficulty-label">
          {DIFFICULTY_SETTINGS.map((difficulty) => (
            <button
              key={difficulty}
              type="button"
              className="filter-chip"
              aria-pressed={settings.difficulty === difficulty}
              onClick={() => onChange({ difficulty })}
            >
              {t(`roundSettings.difficulties.${difficulty}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="setting">
        <span className="field-label" id="count-label">
          {t('roundSettings.questionCount')}
        </span>
        <div className="segmented" role="group" aria-labelledby="count-label">
          {QUESTION_COUNTS.map((count) => (
            <button
              key={count}
              type="button"
              className="filter-chip"
              aria-pressed={settings.questionCount === count}
              onClick={() => onChange({ questionCount: count })}
            >
              {count}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
