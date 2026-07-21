import { describe, expect, it } from 'vitest';
import {
  RECONNECT_MAX_AGE_MS,
  clearReconnectSession,
  parseReconnectSession,
  readReconnectSession,
  saveReconnectSession,
} from './reconnectSession';

function memoryStorage(): Storage {
  const entries = new Map<string, string>();
  return {
    get length() { return entries.size; },
    clear: () => entries.clear(),
    getItem: (key) => entries.get(key) ?? null,
    key: (index) => [...entries.keys()][index] ?? null,
    removeItem: (key) => { entries.delete(key); },
    setItem: (key, value) => { entries.set(key, value); },
  };
}

describe('reconnection session', () => {
  it('round-trips a valid session-scoped token', () => {
    const storage = memoryStorage();
    saveReconnectSession('CAC-ABCD:secret', storage, 10_000);
    expect(readReconnectSession(storage, 11_000)).toEqual({ token: 'CAC-ABCD:secret', savedAtMs: 10_000 });
    clearReconnectSession(storage);
    expect(readReconnectSession(storage, 11_000)).toBeNull();
  });

  it('rejects malformed and expired tokens', () => {
    expect(parseReconnectSession('{bad json')).toBeNull();
    expect(parseReconnectSession(JSON.stringify({ token: 'missing-separator', savedAtMs: 1 }), 2)).toBeNull();
    expect(
      parseReconnectSession(
        JSON.stringify({ token: 'CAC-ABCD:secret', savedAtMs: 1_000 }),
        1_000 + RECONNECT_MAX_AGE_MS + 1,
      ),
    ).toBeNull();
  });
});
