# Hosting on nexasuits.online

The app listens on `localhost:5000`. A Cloudflare tunnel terminates HTTPS at
Cloudflare's edge and forwards plain HTTP to it, so the machine needs no
certificate, no port forwarding and no public IP.

```
browser ──https──> Cloudflare edge ──tunnel──> cloudflared ──http──> localhost:5000
```

Google requires the OAuth redirect URI to be `https://`, which is why the app
could not sign in over a LAN address. `https://nexasuits.online/...` satisfies
that rule.

---

## One-time setup

### 1. Point the domain at Cloudflare

`nexasuits.online` must be a zone in your Cloudflare account: add the site in
the dashboard and change the nameservers at your registrar to the two
Cloudflare gives you. Wait until the zone shows **Active**.

### 2. Authorise cloudflared

```bash
cloudflared tunnel login
```

Opens a browser; pick `nexasuits.online`. Writes `~/.cloudflared/cert.pem`.

### 3. Create the tunnel

```bash
cloudflared tunnel create nexasuits
```

Prints a tunnel UUID and writes `~/.cloudflared/<UUID>.json`.

### 4. Fill the UUID into the config

Edit `cloudflared/config.yml` and replace `<TUNNEL-UUID>` with the id from the
previous step, so `credentials-file` points at the real file.

### 5. Route the hostnames

```bash
cloudflared tunnel route dns nexasuits nexasuits.online
cloudflared tunnel route dns nexasuits www.nexasuits.online
```

Creates the proxied CNAME records.

### 6. Add the redirect URI in Google

Google Cloud Console → **APIs & Services → Credentials** → your OAuth client →
**Authorised redirect URIs** → add exactly:

```
https://nexasuits.online/api/auth/google/callback
```

Keep `http://localhost:5000/api/auth/google/callback` alongside it if you still
want to sign in locally; a client may hold several.

While you are there, **Publish** the consent screen (OAuth consent screen →
Publish app). The app only requests `openid`, `email` and `profile`, which are
non-sensitive, so this needs no Google review — and it stops the
"Google hasn't verified this app" screen and the 7-day refresh-token expiry
that Testing mode imposes.

---

## Running it

Two processes. Start the app first.

```bash
npm run serve
```

Builds the client and serves it with the API on port 5000.

```bash
npm run tunnel
```

Connects the tunnel. Once it reports `Registered tunnel connection`, the app is
live at **https://nexasuits.online**.

---

## Keeping it running

`npm run serve` and `npm run tunnel` stop when the terminal closes. To survive a
reboot, install cloudflared as a Windows service and run the app under a process
manager:

```bash
cloudflared --config cloudflared/config.yml service install
npm install -g pm2
pm2 start server/src/index.js --name grag-erp
pm2 save
pm2 startup
```

---

## Configuration this depends on

`server/.env`:

```
PORT=5000
NODE_ENV=production
APP_URL=https://nexasuits.online
GOOGLE_REDIRECT_URI=https://nexasuits.online/api/auth/google/callback
```

`APP_URL` drives three things: the post-sign-in redirect target, the default
Google redirect URI, and whether the session cookie is marked `secure`. Setting
it to an `https://` URL turns the secure flag on, which is correct behind the
tunnel — `trust proxy` is enabled so Express reads `X-Forwarded-Proto` from
cloudflared.

The previous localhost configuration is saved as `server/.env.backup-localhost`.
To go back to local-only working, copy it over `server/.env` and restart.

---

## If something is wrong

| Symptom | Cause |
|---|---|
| `Error 400: invalid_request` | Redirect URI is not `https://` or loopback. The server warns about this at boot. |
| `Error 400: redirect_uri_mismatch` | The URI in the Console does not match the one the server prints at boot, character for character. |
| Tunnel connects, site shows 502 | The app is not running, or not on port 5000. |
| Signed in, then immediately signed out | Reaching the app over `http://` while `APP_URL` is `https://` — the secure cookie is refused. Use the domain. |
| DNS does not resolve | Zone not Active in Cloudflare, or `tunnel route dns` was not run. |

The database stays local on port 6789. The tunnel exposes **only** port 5000;
PostgreSQL is never reachable from outside the machine.
