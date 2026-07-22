import path from 'node:path';

export const APP_SCHEME = 'cactus:';
export const APP_ORIGIN = 'cactus://app';

export function normalizeSecureEndpoint(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(
      'Packaged Cactus builds require a configured Colyseus endpoint. Rebuild with VITE_COLYSEUS_URL=wss://your-host.',
    );
  }

  let endpoint: URL;
  try {
    endpoint = new URL(value.trim());
  } catch {
    throw new Error('VITE_COLYSEUS_URL must be a valid wss:// URL.');
  }

  if (endpoint.protocol !== 'wss:') {
    throw new Error('VITE_COLYSEUS_URL must use wss:// for packaged desktop builds.');
  }
  if (endpoint.username || endpoint.password) {
    throw new Error('VITE_COLYSEUS_URL must not contain embedded credentials.');
  }
  if (endpoint.hash) {
    throw new Error('VITE_COLYSEUS_URL must not contain a URL fragment.');
  }

  return endpoint.href.replace(/\/+$/, '');
}

export function normalizeDevelopmentRendererUrl(value: unknown): string {
  const candidate = typeof value === 'string' && value.trim() ? value.trim() : 'http://localhost:5173';
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error('CACTUS_RENDERER_URL must be a valid local HTTP URL.');
  }

  const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
  if (url.protocol !== 'http:' || !localHosts.has(url.hostname) || url.username || url.password) {
    throw new Error('CACTUS_RENDERER_URL must use http://localhost, 127.0.0.1, or [::1].');
  }
  return url.href.replace(/\/$/, '');
}

export function createContentSecurityPolicy(endpoint: string): string {
  const endpointUrl = new URL(normalizeSecureEndpoint(endpoint));
  const websocketOrigin = endpointUrl.origin;
  endpointUrl.protocol = 'https:';
  const matchmakingOrigin = endpointUrl.origin;
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self' ${matchmakingOrigin} ${websocketOrigin} https://*.trycloudflare.com wss://*.trycloudflare.com`,
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join('; ');
}

export function isAllowedTopLevelNavigation(url: string, developmentOrigin?: string): boolean {
  let destination: URL;
  try {
    destination = new URL(url);
  } catch {
    return false;
  }

  if (destination.protocol === APP_SCHEME) {
    return destination.hostname === 'app';
  }

  if (!developmentOrigin) return false;

  try {
    const allowed = new URL(developmentOrigin);
    return destination.origin === allowed.origin && destination.protocol === allowed.protocol;
  } catch {
    return false;
  }
}

export function resolveRendererRequest(root: string, requestUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(requestUrl);
  } catch {
    return null;
  }

  if (url.protocol !== APP_SCHEME || url.hostname !== 'app') return null;

  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(url.pathname);
  } catch {
    return null;
  }

  const relativePath = decodedPath.replace(/^\/+/, '') || 'index.html';
  const resolvedRoot = path.resolve(root);
  const filePath = path.resolve(resolvedRoot, relativePath);
  if (filePath !== resolvedRoot && !filePath.startsWith(`${resolvedRoot}${path.sep}`)) return null;
  return filePath;
}
