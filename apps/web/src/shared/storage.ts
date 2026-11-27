/**
 * localStorage can be missing or throw (private mode, blocked storage),
 * so every access goes through these helpers and degrades to "nothing stored".
 */
export function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Not being able to remember a preference is not worth breaking the app.
  }
}
