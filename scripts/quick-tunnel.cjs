const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function cloudflaredCommand() {
  if (process.platform !== 'win32') return 'cloudflared';

  // Winget installs cloudflared here, but the current terminal does not gain
  // the updated PATH until it is reopened. Prefer the explicit executable so
  // `npm run share` works immediately after installation.
  const candidates = [
    process.env.ProgramFiles,
    process.env['ProgramFiles(x86)'],
  ]
    .filter(Boolean)
    .map((directory) => path.join(directory, 'cloudflared', 'cloudflared.exe'));

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? 'cloudflared';
}

const command = cloudflaredCommand();
const child = spawn(command, ['tunnel', '--url', 'http://localhost:2567'], {
  stdio: 'inherit',
  windowsHide: false,
});

child.on('error', (error) => {
  console.error(`Unable to start cloudflared (${command}): ${error.message}`);
  console.error('Install it with: winget install --id Cloudflare.cloudflared --exact');
  process.exitCode = 1;
});

child.on('exit', (code, signal) => {
  if (signal) process.exitCode = 0;
  else process.exitCode = code ?? 1;
});

for (const event of ['SIGINT', 'SIGTERM']) {
  process.on(event, () => child.kill(event));
}
