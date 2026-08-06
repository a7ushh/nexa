# Hosting on nexasuits.online

The app listens on `127.0.0.1:5000`. A Cloudflare tunnel terminates HTTPS at
Cloudflare's edge and forwards plain HTTP to it, so the machine needs no
certificate, no port forwarding and no public IP.

```
browser ──https──> Cloudflare edge ──tunnel──> cloudflared ──http──> 127.0.0.1:5000
```

That is the **only** way in. See "Who can reach it" below.

Google requires the OAuth redirect URI to be `https://`, which is why the app
could not sign in over a LAN address. `https://nexasuits.online/...` satisfies
that rule. The scheme is not optional: a bare `nexasuits.online` in `APP_URL` is
not an absolute URL, and Google answers the resulting authorisation request with
`Error 400: invalid_request`. The server now refuses to boot rather than let
that through.

---

## Who can reach it

Two defences, both derived from `APP_URL` — there is no separate switch:

1. **The listener binds `127.0.0.1`** ([server/src/index.js](server/src/index.js)).
   Nothing off this machine can open a socket, so the LAN address gives
   *connection refused* rather than a page. This is the real boundary.
2. **The host gate** ([server/src/middleware/hostGate.js](server/src/middleware/hostGate.js))
   refuses any request whose `Host` is not `nexasuits.online` (or the `www.`
   spelling), and — because `APP_URL` is https — any request that did not arrive
   over https. It runs before helmet, the body parsers and the session store, so
   a refused request never touches Postgres.

So on the host machine itself, `http://localhost:5000` answers:

```
403  This server only answers requests for https://nexasuits.online.
```

**That is correct behaviour, not a fault.** Every refusal is logged to the
server terminal with the reason and the offending `Host`, because once local
access is gone the terminal is the only place left to diagnose from.

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
cloudflared tunnel create nexa
```

Prints a tunnel UUID and writes `~/.cloudflared/<UUID>.json`.

Already done on this machine: the tunnel is named **nexa**, UUID
`555d042d-4256-49d1-a1a7-0778ed3c12bc`. `cloudflared tunnel list` confirms it.

### 4. Check the config

[cloudflared/config.yml](cloudflared/config.yml) already holds that UUID. There
is no `credentials-file` line and no placeholder to fill in — cloudflared
resolves `%USERPROFILE%\.cloudflared\<UUID>.json` by itself. Only a Windows
*service* install needs an explicit path, because the service runs as
LocalSystem with a different home directory.

Keep exactly one config. A stray `~/.cloudflared/config.yml` is picked up
implicitly by a bare `cloudflared tunnel run` and will silently diverge from the
one in this repo; the old one here was renamed to `config.yml.superseded`.

### 5. Route the hostnames

```bash
cloudflared tunnel route dns nexa nexasuits.online
cloudflared tunnel route dns nexa www.nexasuits.online
```

Creates the proxied CNAME records. **The `www` record does not currently exist**
— `www.nexasuits.online` answers with Cloudflare error 1033 until the second
command is run. The apex works.

### 6. Add the redirect URI in Google

Google Cloud Console → **APIs & Services → Credentials** → your OAuth client →
**Authorised redirect URIs** → add exactly:

```
https://nexasuits.online/api/auth/google/callback
```

Delete any LAN-address entries (`http://192.168.x.x:5000/...`). Google rejects
them anyway, and they are open-redirect surface on the OAuth client for no gain.

Whether to keep `http://localhost:5000/api/auth/google/callback` is a judgement
call. It is the recovery path — see "Getting back in" — and loopback URIs are a
case Google treats as low risk. Remove it if you want the lockdown to be
absolute everywhere; you will then also have to re-add it before you can debug
sign-in offline.

*Authorised JavaScript origins* is not needed: this is the server-side code
flow, not the JS SDK.

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

Builds the client and serves it with the API on port 5000. `NODE_ENV` must be
`production`; `npm start` without a prior build refuses to boot, because
`client/dist` has to exist.

```bash
npm run tunnel
```

Connects the tunnel. Once it reports `Registered tunnel connection`, the app is
live at **https://nexasuits.online**.

Check nothing is already holding the tunnel first — two cloudflared processes
for one tunnel will fight over connections:

```bash
tasklist | findstr cloudflared
```

---

## Keeping it running

`npm run serve` and `npm run tunnel` stop when the terminal closes. To survive a
reboot, install cloudflared as a Windows service and run the app under a process
manager:

```bash
cloudflared --config D:\nexa\cloudflared\config.yml service install
npm install -g pm2
pm2 start server/src/index.js --name grag-erp
pm2 save
pm2 startup
```

The service runs as LocalSystem, whose home directory is **not** `C:\Users\HP`,
so add an absolute `credentials-file:` line to the config before installing it
and make the file readable by LocalSystem. Do this as a separate, verified
change — a failed service install on top of a locked-down origin is two unknowns
at once.

---

## Configuration this depends on

`server/.env`:

```
PORT=5000
NODE_ENV=production
APP_URL=https://nexasuits.online
GOOGLE_REDIRECT_URI=https://nexasuits.online/api/auth/google/callback
```

`APP_URL` drives four things: the post-sign-in redirect target, the default
Google redirect URI, whether the session cookie is marked `secure`, and **which
`Host` values the server will answer at all**. Setting it to an `https://` URL
turns the secure flag on, which is correct behind the tunnel — `trust proxy` is
enabled so Express reads `X-Forwarded-Proto` from cloudflared.

`NODE_ENV=production` is what makes the app serve `client/dist`. In
`development` it mounts Vite's dev server instead, which then enforces its own
host allow-list on top of ours and has no business facing the internet. The
server prints a warning at boot if `APP_URL` is public while `NODE_ENV` is not.

Back up the file before editing it — `.gitignore` already covers the pattern:

```bash
copy server\.env server\.env.backup-20260806
```

---

## Getting back in

To work on the app locally, set both of these in `server/.env` and restart:

```
NODE_ENV=development
APP_URL=http://localhost:5000
```

The host gate reads `APP_URL`, so this re-opens `localhost` with no code change,
and it is the same switch that makes the loopback Google redirect URI valid
again and correctly drops `secure` from the session cookie. Restore the two
`https://` values to go back live.

---

## Verifying

PowerShell note: `curl` is an alias for `Invoke-WebRequest` and will not accept
these flags — use `curl.exe`.

```bash
curl.exe -sS -o NUL -w "%{http_code}\n" https://nexasuits.online/api/health
```

Expect `200`. Then, from the host machine:

```bash
curl.exe -sS http://127.0.0.1:5000/api/health
```

Expect the 403 sentence — local access is gone. To smoke-test the origin
directly, present what cloudflared presents:

```bash
curl.exe -sS -H "Host: nexasuits.online" -H "X-Forwarded-Proto: https" http://127.0.0.1:5000/api/health
```

Expect `200`. And confirm the bind:

```bash
netstat -ano | findstr :5000
```

Must list `127.0.0.1:5000` and nothing else — no `0.0.0.0:5000`, no `[::]:5000`.

---

## If something is wrong

| Symptom | Cause |
|---|---|
| `Error 400: invalid_request` | The redirect URI is not `https://` or loopback — or has no scheme at all. The server refuses to boot on a scheme-less `APP_URL` and warns at boot about a bad `GOOGLE_REDIRECT_URI`. |
| `Error 400: redirect_uri_mismatch` | The URI in the Console does not match the one the server prints at boot, character for character. |
| `403 This server only answers requests for ...` | The host gate. You are not coming through the tunnel, or `Host` is wrong. The server terminal names the exact `Host` it rejected. |
| Connection refused from another machine | Expected. The listener binds `127.0.0.1` only. |
| Tunnel connects, site shows 502 | The app is not running, or the ingress still says `localhost` — that resolves to `::1` first on Windows, where nothing listens any more. Use `127.0.0.1`. |
| `Blocked request. This host is not allowed` | `NODE_ENV` is not `production`, so Vite's dev server is running and applying its own host check. |
| `www` shows Cloudflare error 1033 | The `www` DNS record was never routed. Run `cloudflared tunnel route dns nexa www.nexasuits.online`. |
| Signed in, then immediately signed out | Reaching the app over `http://` while `APP_URL` is `https://` — the secure cookie is refused. Use the domain. |
| DNS does not resolve | Zone not Active in Cloudflare, or `tunnel route dns` was not run. |

The database stays local on port 6789. The tunnel exposes **only** port 5000;
PostgreSQL is never reachable from outside the machine.
