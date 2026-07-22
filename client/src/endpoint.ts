type RendererLocation = Pick<Location, 'protocol' | 'host'>;

export function normalizeQuickTunnelInput(value: string): string {
  const candidate = value.trim();
  if (!candidate) throw new Error('Enter the Cloudflare server link printed by the host.');

  let endpoint: URL;
  try {
    endpoint = new URL(candidate.includes('://') ? candidate : `https://${candidate}`);
  } catch {
    throw new Error('Enter a valid https://…trycloudflare.com server link.');
  }

  if (endpoint.protocol !== 'https:' && endpoint.protocol !== 'wss:') {
    throw new Error('The Cloudflare server link must use https:// or wss://.');
  }
  if (!endpoint.hostname.endsWith('.trycloudflare.com')) {
    throw new Error('Use the trycloudflare.com link printed by the host command.');
  }
  if (endpoint.username || endpoint.password || endpoint.hash || endpoint.search) {
    throw new Error('The Cloudflare server link must not contain credentials, query parameters, or a fragment.');
  }

  endpoint.protocol = 'wss:';
  return endpoint.href.replace(/\/+$/, '');
}

export function displayServerEndpoint(value: string | undefined): string {
  if (!value) return '';
  try {
    const endpoint = new URL(value);
    if (endpoint.protocol === 'wss:') endpoint.protocol = 'https:';
    return endpoint.href.replace(/\/+$/, '');
  } catch {
    return value;
  }
}

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
