const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const desktopRoot = path.join(__dirname, '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const packaged = process.argv.includes('--packaged');
if (!packaged) {
  const build = spawnSync(npm, ['run', 'build:smoke'], {
    cwd: desktopRoot,
    env: { ...process.env, VITE_COLYSEUS_URL: 'wss://smoke.invalid/colyseus' },
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  process.stdout.write(build.stdout ?? '');
  process.stderr.write(build.stderr ?? '');
  if (build.status !== 0) process.exit(build.status ?? 1);
}

const executable = packaged
  ? path.join(desktopRoot, 'out', 'Cactus-win32-x64', 'Cactus.exe')
  : require('electron');
const args = packaged ? [] : ['.'];
const packagedConfig = packaged
  ? JSON.parse(
      fs.readFileSync(
        path.join(desktopRoot, 'out', 'Cactus-win32-x64', 'resources', 'renderer', 'desktop-config.json'),
        'utf8',
      ),
    )
  : null;
const child = spawn(executable, args, {
  cwd: desktopRoot,
  env: { ...process.env, CACTUS_SMOKE_TEST: '1', ELECTRON_ENABLE_LOGGING: '1' },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let output = '';
let errors = '';
child.stdout.on('data', (chunk) => {
  output += chunk;
  process.stdout.write(chunk);
});
child.stderr.on('data', (chunk) => {
  errors += chunk;
  process.stderr.write(chunk);
});

const timeout = setTimeout(() => {
  child.kill();
  console.error('Electron smoke test timed out after 30 seconds.');
  process.exitCode = 1;
}, 30_000);

child.on('error', (error) => {
  clearTimeout(timeout);
  console.error(`Unable to launch Electron: ${error.message}`);
  process.exitCode = 1;
});

child.on('exit', (code) => {
  clearTimeout(timeout);
  const match = output.match(/CACTUS_SMOKE_RESULT (\{[^\r\n]+\})/);
  if (code !== 0 || !match) {
    console.error(`Electron smoke test failed (exit ${code ?? 'unknown'}).`);
    if (!errors) console.error('No diagnostic output was produced.');
    process.exitCode = 1;
    return;
  }

  const result = JSON.parse(match[1]);
  const expected = {
    loadedProtocol: 'cactus:',
    requireType: 'undefined',
    processType: 'undefined',
    popupCount: 0,
    navigationBlocked: true,
    configuredEndpoint: packaged
      ? packagedConfig.colyseusUrl
      : 'wss://smoke.invalid/colyseus',
  };
  for (const [key, value] of Object.entries(expected)) {
    if (result[key] !== value) {
      console.error(`Electron smoke assertion failed: ${key} was ${JSON.stringify(result[key])}.`);
      process.exitCode = 1;
    }
  }
  if (!process.exitCode) console.log('Electron smoke assertions passed.');
});
