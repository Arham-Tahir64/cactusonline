type RendererLocation = Pick<Location, 'protocol' | 'host'>;

export function resolveEndpoint(
  currentLocation: RendererLocation,
  configured: string | undefined,
  isDev: boolean,
): string {
  const override = configured?.trim();
  if (override) {
    let endpoint: URL;
    try {
      endpoint = new URL(override);
    } catch {
      throw new Error('VITE_COLYSEUS_URL must be a valid ws:// or wss:// URL');
    }
    if (endpoint.protocol !== 'ws:' && endpoint.protocol !== 'wss:') {
      throw new Error('VITE_COLYSEUS_URL must begin with ws:// or wss://');
    }
    if (endpoint.username || endpoint.password) {
      throw new Error('VITE_COLYSEUS_URL must not contain embedded credentials');
    }
    return endpoint.href.replace(/\/+$/, '');
  }

  if (isDev) return 'ws://localhost:2567';
  if (currentLocation.protocol === 'https:') return `wss://${currentLocation.host}`;
  if (currentLocation.protocol === 'http:') return `ws://${currentLocation.host}`;

  throw new Error('A secure VITE_COLYSEUS_URL is required for the desktop build.');
}
