import {
  DIFFICULTY_SETTINGS,
  QUESTION_COUNTS,
  REGION_PREFERENCES,
  resolveRegion,
  type Language,
} from '@pq/shared';
import { useId, useState } from 'react';
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
  const panelId = useId();
  const [open, setOpen] = useState(false);
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
        {/* Collapsed by default: on a phone the open panel would push categories off screen. */}
        <button
          type="button"
          className="settings-toggle"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(!open)}
        >
          <span>{t('roundSettings.heading')}</span>
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </h2>
      <p className="settings-summary">
        {[
          settings.region === 'auto'
            ? t(`roundSettings.regions.${resolved === 'all' ? 'all' : resolved}`)
            : t(`roundSettings.regions.${settings.region}`),
          t(`roundSettings.difficulties.${settings.difficulty}`),
          t('roundSettings.countSummary', { count: settings.questionCount }),
        ].join(' · ')}
      </p>

      <div id={panelId} className="settings-body" hidden={!open}>
        <div className="setting">
          <label className="field-label" htmlFor={regionId}>
            {t('roundSettings.region')}
          </label>
          <select
            id={regionId}
            className="text-input setting-select"
            value={settings.region}
            aria-describedby={regionHintId}
            onChange={(event) =>
              onChange({ region: event.target.value as RoundSettings['region'] })
            }
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
      </div>
    </section>
  );
}
