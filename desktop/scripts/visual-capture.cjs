const { app, BrowserWindow, screen } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('colyseus.js');

function argument(name, fallback) {
  const prefix = `--${name}=`;
  const value = process.argv.find((entry) => entry.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

const width = Number(argument('width', '1920'));
const height = Number(argument('height', '1080'));
const playerCount = Number(argument('players', '4'));
const rendererUrl = argument('url', 'http://localhost:2567/');
const socketUrl = argument('socket', 'ws://localhost:2567');
const outputPath = path.resolve(
  argument('output', path.join(__dirname, '..', 'out', 'visual-qa', `cactus-${playerCount}p-${width}x${height}.jpg`)),
);

if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1100 || height < 700) {
  throw new Error('Visual captures require an integer viewport of at least 1100x700.');
}
if (!Number.isInteger(playerCount) || playerCount < 2 || playerCount > 8) {
  throw new Error('Visual captures support 2-8 players.');
}

const avatars = ['ranger', 'maverick', 'sage', 'prospector', 'vaquera', 'outlaw', 'botanist', 'drifter'];
const rooms = [];
let window;

async function waitForHealth() {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(new URL('/healthz', rendererUrl));
      if (response.ok) return;
    } catch {
      // The local server may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`No Cactus server responded at ${rendererUrl}. Run npm run server first.`);
}

async function waitForRenderer(predicate, label, timeoutMs = 8_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await window.webContents.executeJavaScript(predicate)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${label}.`);
}

async function joinRenderer(roomCode) {
  await window.loadURL(rendererUrl);
  const preset = width === 1920 && height === 1080 ? 'fhd'
    : width === 2560 && height === 1440 ? 'qhd'
      : width === 3840 && height === 2160 ? 'uhd'
        : width === 2560 && height === 1080 ? 'uwfhd'
          : width === 3440 && height === 1440 ? 'uwqhd'
            : 'custom';
  await window.webContents.executeJavaScript(`localStorage.setItem('cactus-preferences', ${JSON.stringify(JSON.stringify({
    state: {
      muted: false,
      masterVolume: 0.8,
      effectsVolume: 0.9,
      reducedMotion: true,
      resolution: { preset, width, height },
    },
    version: 3,
  }))})`);
  await new Promise((resolve) => {
    window.webContents.once('did-finish-load', resolve);
    window.reload();
  });
  await waitForRenderer(`Boolean(document.querySelector('.join-screen')) && !document.querySelector('.resolution-selector')`, 'the saved display profile');
  await window.webContents.executeJavaScript(`(() => {
    const setInput = (selector, value) => {
      const input = document.querySelector(selector);
      if (!input) throw new Error('Missing visual capture input: ' + selector);
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };
    setInput('.name-input', 'Desktop Player');
    setInput('.code-input', ${JSON.stringify(roomCode)});
    const join = document.querySelector('.secondary-action');
    if (!join) throw new Error('Missing visual capture join button.');
    join.click();
  })()`);
  await waitForRenderer(`Boolean(document.querySelector('.lobby-screen'))`, 'the Electron player to join');
}

async function capture() {
  await waitForHealth();

  const client = new Client(socketUrl);
  const host = await client.create('cactus', {
    name: 'Capture Host',
    avatarId: avatars[0],
    peekMs: 250,
    seed: 20260721,
  });
  rooms.push(host);

  for (let index = 1; index < playerCount - 1; index += 1) {
    const guest = await new Client(socketUrl).joinById(host.roomId, {
      name: `Capture ${index + 1}`,
      avatarId: avatars[index],
    });
    rooms.push(guest);
  }

  window = new BrowserWindow({
    x: -32_000,
    y: -32_000,
    width,
    height,
    useContentSize: true,
    show: true,
    skipTaskbar: true,
    frame: false,
    backgroundColor: '#0c0907',
    webPreferences: {
      backgroundThrottling: false,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      navigateOnDragDrop: false,
      spellcheck: false,
    },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  // Windows constrains ordinary windows to the taskbar-adjusted work area.
  // Fullscreen is required when QA targets the display's complete pixel size
  // (for example 2560x1440 on a 1440p monitor).
  const display = screen.getAllDisplays().find((candidate) => (
    candidate.size.width >= width && candidate.size.height >= height
  )) ?? screen.getPrimaryDisplay();
  if (
    height > display.workAreaSize.height
    && height <= display.size.height
    && width <= display.size.width
  ) {
    window.setBounds({ x: display.bounds.x, y: display.bounds.y, width, height });
    window.setFullScreen(true);
  }

  await joinRenderer(host.roomId);
  host.send('start');
  await waitForRenderer(
    `document.querySelector('.game-screen')?.dataset.phase === 'playing'`,
    'post-peek playing state',
    10_000,
  );
  await new Promise((resolve) => setTimeout(resolve, 450));
  await window.webContents.executeJavaScript(`document.querySelector('[aria-label="Settings"]')?.click()`);
  await waitForRenderer(`Boolean(document.querySelector('.display-settings-button'))`, 'display settings to remain available in-game');
  await window.webContents.executeJavaScript(`document.querySelector('.settings-modal .modal-close')?.click()`);

  const evidence = await window.webContents.executeJavaScript(`(() => ({
    width: innerWidth,
    height: innerHeight,
    playerCount: Number(document.querySelector('.game-stage')?.dataset.playerCount ?? 0),
    boardCards: document.querySelectorAll('.board-grid .playing-card').length,
    exposedBoardCards: document.querySelectorAll('.board-grid .playing-card:not(.face-down)').length,
    phase: document.querySelector('.game-screen')?.dataset.phase ?? null,
    resolutionTier: document.querySelector('.app')?.dataset.resolutionTier ?? null,
    resolutionAspect: document.querySelector('.app')?.dataset.resolutionAspect ?? null,
    displaySettingsAvailable: Boolean(document.querySelector('[aria-label="Settings"]')),
    gameLogPresent: Boolean(document.querySelector('.event-log')),
  }))()`);
  if (evidence.width !== width || evidence.height !== height) {
    throw new Error(`Electron content size was ${evidence.width}x${evidence.height}, expected ${width}x${height}.`);
  }
  if (evidence.playerCount !== playerCount || evidence.boardCards !== playerCount * 4) {
    throw new Error(`Unexpected table content: ${JSON.stringify(evidence)}.`);
  }
  if (evidence.phase !== 'playing' || evidence.exposedBoardCards !== 0) {
    throw new Error(`Post-peek concealment failed: ${JSON.stringify(evidence)}.`);
  }
  if (evidence.gameLogPresent) {
    throw new Error(`The removed game log is still rendered: ${JSON.stringify(evidence)}.`);
  }

  window.webContents.invalidate();
  await new Promise((resolve) => setTimeout(resolve, 500));
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const image = await window.webContents.capturePage();
  fs.writeFileSync(outputPath, image.toJPEG(92));
  process.stdout.write(`CACTUS_VISUAL_CAPTURE ${JSON.stringify({ ...evidence, outputPath })}\n`);
}

async function cleanup(exitCode) {
  for (const room of rooms.reverse()) {
    try {
      await room.leave();
    } catch {
      // Best-effort cleanup for a visual-only room.
    }
  }
  if (window && !window.isDestroyed()) window.destroy();
  app.exit(exitCode);
}

app.whenReady().then(async () => {
  try {
    await capture();
    await cleanup(0);
  } catch (error) {
    process.stderr.write(`Cactus visual capture failed: ${error instanceof Error ? error.stack : String(error)}\n`);
    await cleanup(1);
  }
});
