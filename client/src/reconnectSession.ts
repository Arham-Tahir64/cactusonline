const RECONNECT_KEY = 'cactus-reconnect-v1';
export const RECONNECT_MAX_AGE_MS = 5 * 60 * 1000;

export interface ReconnectSession {
  token: string;
  savedAtMs: number;
}

function browserSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function parseReconnectSession(value: string | null, nowMs = Date.now()): ReconnectSession | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<ReconnectSession>;
    if (typeof parsed.token !== 'string' || !/^[^:]+:.+$/.test(parsed.token)) return null;
    if (typeof parsed.savedAtMs !== 'number' || nowMs - parsed.savedAtMs > RECONNECT_MAX_AGE_MS) return null;
    return { token: parsed.token, savedAtMs: parsed.savedAtMs };
  } catch {
    return null;
  }
}

export function readReconnectSession(storage = browserSessionStorage(), nowMs = Date.now()): ReconnectSession | null {
  if (!storage) return null;
  try {
    const session = parseReconnectSession(storage.getItem(RECONNECT_KEY), nowMs);
    if (!session) storage.removeItem(RECONNECT_KEY);
    return session;
  } catch {
    return null;
  }
}

export function saveReconnectSession(token: string, storage = browserSessionStorage(), nowMs = Date.now()): void {
  if (!storage || !/^[^:]+:.+$/.test(token)) return;
  try {
    storage.setItem(RECONNECT_KEY, JSON.stringify({ token, savedAtMs: nowMs } satisfies ReconnectSession));
  } catch {
    // Session storage can be unavailable in hardened browser contexts.
  }
}

export function clearReconnectSession(storage = browserSessionStorage()): void {
  try {
    storage?.removeItem(RECONNECT_KEY);
  } catch {
    // Explicit leave still succeeds even if session storage is unavailable.
  }
}
