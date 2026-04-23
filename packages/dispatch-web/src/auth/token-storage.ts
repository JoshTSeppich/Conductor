const KEY = 'x-conductor-token';

export function readToken(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    // localStorage disabled (private browsing pathological case)
    return null;
  }
}

export function writeToken(token: string): void {
  try {
    localStorage.setItem(KEY, token);
  } catch {
    // quota exceeded or disabled; drop silently — operator will re-prompt
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
