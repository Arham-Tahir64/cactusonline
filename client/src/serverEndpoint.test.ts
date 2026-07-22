import { describe, expect, it } from 'vitest';
import { readServerEndpoint, saveServerEndpoint } from './serverEndpoint';

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => void values.delete(key),
    setItem: (key, value) => void values.set(key, value),
  };
}

describe('saved server endpoint', () => {
  it('persists the latest normalized endpoint', () => {
    const storage = memoryStorage();
    saveServerEndpoint('wss://quiet-cactus.trycloudflare.com', storage);
    expect(readServerEndpoint(storage)).toBe('wss://quiet-cactus.trycloudflare.com');
  });

  it('treats empty saved values as absent', () => {
    const storage = memoryStorage();
    storage.setItem('cactus-server-endpoint-v1', '  ');
    expect(readServerEndpoint(storage)).toBeUndefined();
  });
});
