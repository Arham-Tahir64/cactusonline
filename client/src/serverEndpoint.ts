const SERVER_ENDPOINT_KEY = 'cactus-server-endpoint-v1';

function browserStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readServerEndpoint(storage = browserStorage()): string | undefined {
  try {
    return storage?.getItem(SERVER_ENDPOINT_KEY)?.trim() || undefined;
  } catch {
    return undefined;
  }
}

export function saveServerEndpoint(endpoint: string, storage = browserStorage()): void {
  try {
    storage?.setItem(SERVER_ENDPOINT_KEY, endpoint);
  } catch {
    // A hardened renderer may disable persistent storage; the current attempt still works.
  }
}
