const fs = require('node:fs');
const path = require('node:path');

function cloudflaredCommand(environment = process.env, platform = process.platform) {
  if (platform !== 'win32') return 'cloudflared';

  const candidates = [environment.ProgramFiles, environment['ProgramFiles(x86)']]
    .filter(Boolean)
    .map((directory) => path.join(directory, 'cloudflared', 'cloudflared.exe'));

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? 'cloudflared';
}

function extractQuickTunnelUrl(output) {
  return output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i)?.[0];
}

function websocketUrl(publicUrl) {
  const url = new URL(publicUrl);
  url.protocol = 'wss:';
  return url.href.replace(/\/+$/, '');
}

module.exports = { cloudflaredCommand, extractQuickTunnelUrl, websocketUrl };
