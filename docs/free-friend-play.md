# Free friend play: Cloudflare Quick Tunnel

This project can be shared for free from the computer running the server. The
browser client and the Colyseus WebSocket server are both served from port
`2567`; Cloudflare Tunnel gives that local service a public HTTPS address and
also forwards the required WebSocket upgrades.

## Start a session

1. In PowerShell at the repository root, run:

   ```powershell
   npm run share
   ```

   The setup automatically finds the official Windows `cloudflared` install.
   If it is missing, install it once with:

   ```powershell
   winget install --id Cloudflare.cloudflared --exact
   ```

2. Wait for Cloudflare to print an address resembling:

   ```text
   https://orange-cactus-example.trycloudflare.com
   ```

3. Send that full `https://` link to your friends. They open it in a modern
   browser, create or join a table, and use the displayed `CAC-XXXX` room code.

Keep the PowerShell window, `cloudflared`, and this computer online while you
play. Closing the command stops the session.

## Important limits

- A quick tunnel is free and requires no Cloudflare account or custom domain.
- It is for playtesting: its random URL changes whenever it is restarted and
  Cloudflare does not promise production uptime.
- The link is public. Share it only with people you trust; anyone with the link
  can open the game and join a room if they know its room code.
- If `cloudflared` says a quick tunnel cannot start because a local
  `.cloudflared/config.yml` exists, temporarily rename that config or use a
  Cloudflare named tunnel instead.

## Electron during a quick-tunnel session

The host can use `npm run desktop:dev`, which connects to the local server.
Friends should use the browser link above. A packaged Electron build embeds one
secure endpoint, so it would need rebuilding with the current random tunnel
address and would stop working as soon as that tunnel is restarted:

```powershell
$env:VITE_COLYSEUS_URL = 'wss://orange-cactus-example.trycloudflare.com'
npm run desktop:package
```

For a stable Electron download later, use a Cloudflare named tunnel with a
domain you control, or deploy the server to a persistent host.
