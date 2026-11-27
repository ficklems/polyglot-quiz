import { useCallback, useEffect, useState } from 'react';
import { readStored, writeStored } from '../../shared/storage';
import {
  parseRoundSettings,
  ROUND_SETTINGS_STORAGE_KEY,
  type RoundSettings,
} from './round-settings';

/** Region, difficulty and length, kept across sessions (spec: "retain the setting"). */
export function useRoundSettings() {
  const [settings, setSettings] = useState<RoundSettings>(() =>
    parseRoundSettings(readStored(ROUND_SETTINGS_STORAGE_KEY)),
  );

  useEffect(() => {
    writeStored(ROUND_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const update = useCallback(
    (change: Partial<RoundSettings>) => setSettings((current) => ({ ...current, ...change })),
    [],
  );

  return { settings, update };
}
