const CONNECTION_FALLBACK =
  'Unable to reach the game server. Check that the host server and Cloudflare tunnel are running, then try again.';

export function formatConnectionError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;

  if (typeof error === 'string') {
    const message = error.trim();
    if (message && message !== '[object ProgressEvent]' && message !== '[object Event]') return message;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = Reflect.get(error, 'message');
    if (typeof message === 'string' && message.trim()) return message.trim();
  }

  return CONNECTION_FALLBACK;
}
