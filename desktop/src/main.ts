import { app, BrowserWindow, dialog, net, protocol, session } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  APP_ORIGIN,
  createContentSecurityPolicy,
  isAllowedTopLevelNavigation,
  normalizeDevelopmentRendererUrl,
  normalizeSecureEndpoint,
  resolveRendererRequest,
} from './security';

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'cactus',
    privileges: { standard: true, secure: true, supportFetchAPI: true },
  },
]);

function rendererRoot(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'renderer')
    : path.join(__dirname, '..', 'renderer');
}

function readPackagedEndpoint(): string {
  const configPath = path.join(rendererRoot(), 'desktop-config.json');
  let config: unknown;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    throw new Error(
      `The desktop renderer configuration is missing or unreadable (${configPath}). Rebuild with VITE_COLYSEUS_URL=wss://your-host.`,
    );
  }

  return normalizeSecureEndpoint((config as { colyseusUrl?: unknown }).colyseusUrl);
}

function registerRendererProtocol(): void {
  const root = path.resolve(rendererRoot());
  protocol.handle('cactus', (request) => {
    if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });
    const filePath = resolveRendererRequest(root, request.url);
    if (!filePath) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(filePath).toString());
  });
}

function installSessionGuards(endpoint: string | null): void {
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);

  if (endpoint) {
    const policy = createContentSecurityPolicy(endpoint);
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      if (details.resourceType !== 'mainFrame' || !details.url.startsWith(`${APP_ORIGIN}/`)) {
        callback({ responseHeaders: details.responseHeaders });
        return;
      }
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [policy],
        },
      });
    });
  }
}

function createWindow(loadLocalRenderer: boolean, smokeTest: boolean, endpoint: string | null): void {
  const developmentUrl = normalizeDevelopmentRendererUrl(process.env.CACTUS_RENDERER_URL);
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    backgroundColor: '#0c0907',
    title: 'Cactus',
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#120e0b', symbolColor: '#f3d8a4', height: 38 },
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      navigateOnDragDrop: false,
      spellcheck: false,
    },
  });

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-attach-webview', (event) => event.preventDefault());
  window.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedTopLevelNavigation(url, loadLocalRenderer ? undefined : developmentUrl)) event.preventDefault();
  });
  window.webContents.on('will-redirect', (event, url) => {
    if (!isAllowedTopLevelNavigation(url, loadLocalRenderer ? undefined : developmentUrl)) event.preventDefault();
  });
  window.once('ready-to-show', () => {
    if (!smokeTest) window.show();
  });

  window.webContents.once('did-finish-load', async () => {
    if (!smokeTest) return;

    const isolation = await window.webContents.executeJavaScript(
      `({ requireType: typeof require, processType: typeof process, href: location.href })`,
    );
    await window.webContents.executeJavaScript(`window.open('https://example.invalid/smoke')`);
    await window.webContents.executeJavaScript(`location.href = 'https://example.invalid/navigation-smoke'`);
    await new Promise((resolve) => setTimeout(resolve, 250));
    const result = {
      loadedProtocol: new URL(window.webContents.getURL()).protocol,
      requireType: isolation.requireType,
      processType: isolation.processType,
      popupCount: BrowserWindow.getAllWindows().length - 1,
      navigationBlocked: window.webContents.getURL().startsWith(`${APP_ORIGIN}/`),
      configuredEndpoint: endpoint,
    };
    process.stdout.write(`CACTUS_SMOKE_RESULT ${JSON.stringify(result)}\n`);
    window.destroy();
    app.quit();
  });

  const target = loadLocalRenderer ? `${APP_ORIGIN}/index.html` : developmentUrl;
  void window.loadURL(target).catch((error: unknown) => {
    process.stderr.write(`Failed to load the Cactus renderer: ${String(error)}\n`);
    app.exit(1);
  });
}

function failStartup(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Cactus desktop startup failed: ${message}\n`);
  if (!process.env.CACTUS_SMOKE_TEST) {
    dialog.showErrorBox('Cactus could not start', message);
  }
  app.exit(1);
}

app.whenReady().then(() => {
  const smokeTest = process.env.CACTUS_SMOKE_TEST === '1';
  const loadLocalRenderer = app.isPackaged || smokeTest;
  try {
    const endpoint = loadLocalRenderer ? readPackagedEndpoint() : null;
    installSessionGuards(endpoint);
    if (loadLocalRenderer) registerRendererProtocol();
    createWindow(loadLocalRenderer, smokeTest, endpoint);
  } catch (error) {
    failStartup(error);
    return;
  }
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const smokeTest = process.env.CACTUS_SMOKE_TEST === '1';
      const loadLocalRenderer = app.isPackaged || smokeTest;
      let endpoint: string | null = null;
      try {
        endpoint = loadLocalRenderer ? readPackagedEndpoint() : null;
      } catch (error) {
        failStartup(error);
        return;
      }
      createWindow(loadLocalRenderer, smokeTest, endpoint);
    }
  });
});

app.on('window-all-closed', () => app.quit());
