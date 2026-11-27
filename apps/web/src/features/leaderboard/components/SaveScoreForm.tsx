import type { LeaderboardEntry } from '@pq/shared';
import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { HttpError } from '../../../shared/api/http';
import { readStored, writeStored } from '../../../shared/storage';
import { submitScore } from '../api/leaderboard-api';
import { nicknameError, NICKNAME_STORAGE_KEY, type NicknameError } from '../leaderboard.utils';

type Props = {
  roundId: string;
  onSaved: (entry: LeaderboardEntry) => void;
};

type SubmitError = 'already' | 'failed';

export function SaveScoreForm({ roundId, onSaved }: Props) {
  const { t } = useTranslation();
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();
  const [nickname, setNickname] = useState(() => readStored(NICKNAME_STORAGE_KEY) ?? '');
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<SubmitError | null>(null);

  const validation: NicknameError | null = nicknameError(nickname);
  const showValidation = touched && validation !== null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (validation) return;

    setSaving(true);
    setSubmitError(null);
    try {
      const entry = await submitScore(roundId, nickname.trim());
      writeStored(NICKNAME_STORAGE_KEY, entry.nickname);
      onSaved(entry);
    } catch (error) {
      console.error(error);
      setSubmitError(error instanceof HttpError && error.status === 409 ? 'already' : 'failed');
      setSaving(false);
    }
  };

  return (
    <form className="save-form" onSubmit={(e) => void submit(e)} noValidate>
      <h2 className="save-title">{t('save.title')}</h2>
      <label htmlFor={inputId} className="field-label">
        {t('save.label')}
      </label>
      <div className="save-row">
        <input
          id={inputId}
          className="text-input"
          value={nickname}
          autoComplete="nickname"
          maxLength={40}
          aria-invalid={showValidation}
          aria-describedby={showValidation ? `${errorId} ${hintId}` : hintId}
          onChange={(e) => setNickname(e.target.value)}
          onBlur={() => setTouched(true)}
        />
        <button type="submit" className="save-button" disabled={saving} aria-busy={saving}>
          {t('save.submit')}
        </button>
      </div>
      <p id={hintId} className="field-hint">
        {t('save.hint')}
      </p>
      {showValidation && (
        <p id={errorId} className="field-error" role="alert">
          {t(`save.errors.${validation}`)}
        </p>
      )}
      {submitError && (
        <p className="status status--error" role="alert">
          {t(`save.errors.${submitError}`)}
        </p>
      )}
    </form>
  );
}
