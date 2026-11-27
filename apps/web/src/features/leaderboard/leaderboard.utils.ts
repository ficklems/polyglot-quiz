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

/** Which leaderboard to show: all boards together, a topic, or a themed quiz. */
export type Board =
  { kind: 'all' } | { kind: 'topic'; id: string } | { kind: 'collection'; id: string };

export const ALL_BOARDS: Board = { kind: 'all' };

export function boardQuery(board: Board): string {
  if (board.kind === 'topic') return `?topicId=${encodeURIComponent(board.id)}`;
  if (board.kind === 'collection') return `?collectionId=${encodeURIComponent(board.id)}`;
  return '';
}

/** The board a round's score goes to, or null for a custom mix (not ranked). */
export function boardOfRound(round: {
  ranked: boolean;
  topicId: string | null;
  collectionId: string | null;
}): Board | null {
  if (!round.ranked) return null;
  if (round.topicId) return { kind: 'topic', id: round.topicId };
  if (round.collectionId) return { kind: 'collection', id: round.collectionId };
  return null;
}

/** A <select> value for a board, and back. */
export function boardValue(board: Board): string {
  return board.kind === 'all' ? 'all' : `${board.kind}:${board.id}`;
}

export function parseBoardValue(value: string): Board {
  const [kind, id] = value.split(':');
  if ((kind === 'topic' || kind === 'collection') && id) return { kind, id };
  return ALL_BOARDS;
}
