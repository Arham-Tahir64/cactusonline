import { app, BrowserWindow, net, protocol, session, shell } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

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

function registerRendererProtocol(): void {
  const root = path.resolve(rendererRoot());
  protocol.handle('cactus', (request) => {
    const url = new URL(request.url);
    const relativePath = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
    const filePath = path.resolve(root, relativePath);
    if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
      return new Response('Not found', { status: 404 });
    }
    return net.fetch(pathToFileURL(filePath).toString());
  });
}

function createWindow(): void {
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
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//i.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('cactus://') && !url.startsWith('http://localhost:5173')) {
      event.preventDefault();
    }
  });
  window.once('ready-to-show', () => window.show());

  if (!app.isPackaged) {
    void window.loadURL(process.env.CACTUS_RENDERER_URL ?? 'http://localhost:5173');
  } else {
    void window.loadURL('cactus://app/index.html');
  }
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });
  registerRendererProtocol();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => app.quit());
