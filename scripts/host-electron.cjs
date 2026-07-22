const { spawn, spawnSync } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');
const {
  cloudflaredCommand,
  extractQuickTunnelUrl,
  websocketUrl,
} = require('./tunnel-utils.cjs');

const root = path.resolve(__dirname, '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const managedChildren = new Set();
let shuttingDown = false;

function run(command, args, extraEnvironment = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: { ...process.env, ...extraEnvironment },
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} exited with code ${result.status}.`);
}

function start(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: root,
    env: { ...process.env, ...options.environment },
    stdio: options.stdio ?? 'inherit',
    windowsHide: true,
  });
  managedChildren.add(child);
  child.once('exit', () => managedChildren.delete(child));
  return child;
}

function healthCheck() {
  return new Promise((resolve) => {
    const request = http.get('http://127.0.0.1:2567/healthz', (response) => {
      response.resume();
      resolve(response.statusCode === 200);
    });
    request.setTimeout(750, () => request.destroy());
    request.on('error', () => resolve(false));
  });
}

async function waitForServer(child) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (child.exitCode !== null) throw new Error('The Cactus server stopped before it became ready.');
    if (await healthCheck()) return;
    await new Promise((resolve) => setTimeout(resolve, 125));
  }
  throw new Error('The Cactus server did not become ready on port 2567.');
}

function waitForTunnel(child) {
  return new Promise((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(() => reject(new Error('Cloudflare did not provide a quick-tunnel URL.')), 30_000);

    const inspect = (chunk, destination) => {
      destination.write(chunk);
      output = `${output}${chunk}`.slice(-12_000);
      const url = extractQuickTunnelUrl(output);
      if (!url) return;
      clearTimeout(timeout);
      resolve(url);
    };

    child.stdout.on('data', (chunk) => inspect(chunk, process.stdout));
    child.stderr.on('data', (chunk) => inspect(chunk, process.stderr));
    child.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`Cloudflare tunnel exited with code ${code ?? 'unknown'}.`));
    });
  });
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of managedChildren) {
    if (child.exitCode === null) child.kill();
  }
  setTimeout(() => process.exit(exitCode), 150).unref();
}

async function main() {
  if (await healthCheck()) {
    throw new Error('Port 2567 is already serving Cactus. Stop the previous host/share command first.');
  }

  console.log('\n[1/4] Building the browser client...');
  run(npm, ['run', 'client:build']);

  console.log('\n[2/4] Starting the authoritative game server...');
  const server = start(process.execPath, [path.join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs'), 'watch', 'src/server/index.ts']);
  await waitForServer(server);

  console.log('\n[3/4] Starting a free Cloudflare quick tunnel...');
  const tunnel = start(cloudflaredCommand(), ['tunnel', '--url', 'http://localhost:2567'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const publicUrl = await waitForTunnel(tunnel);
  const endpoint = websocketUrl(publicUrl);

  console.log(`\nFriend link: ${publicUrl}`);
  console.log(`Electron server link: ${publicUrl}`);
  console.log('\n[4/4] Rebuilding and launching Electron...');
  run(npm, ['run', 'desktop:package'], { VITE_COLYSEUS_URL: endpoint });

  const executable = path.join(root, 'desktop', 'out', 'Cactus-win32-x64', 'Cactus.exe');
  const electron = start(executable, []);
  electron.once('exit', () => {
    console.log('\nElectron closed. The server is still available for browser players.');
    console.log('Press Ctrl+C here when everyone is finished.');
  });

  console.log('\nCactus is live. Keep this terminal open; press Ctrl+C to stop hosting.\n');
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => shutdown(0));
}

main().catch((error) => {
  console.error(`\nUnable to host Cactus: ${error instanceof Error ? error.message : String(error)}`);
  shutdown(1);
});
