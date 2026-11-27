import { NICKNAME_MAX, NICKNAME_MIN, nicknameSchema } from '@pq/shared';

export type NicknameError = 'tooShort' | 'tooLong' | 'invalid';

export const NICKNAME_STORAGE_KEY = 'pq.nickname';

/**
 * Same rules as the API (shared schema), mapped to a reason the UI can explain
 * in the player's language.
 */
export function nicknameError(value: string): NicknameError | null {
  if (nicknameSchema.safeParse(value).success) return null;
  const trimmed = value.trim();
  if (trimmed.length < NICKNAME_MIN) return 'tooShort';
  if (trimmed.length > NICKNAME_MAX) return 'tooLong';
  return 'invalid';
}
