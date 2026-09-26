# Re-running the captures

Prerequisites: the web app running locally (or `MANUAL_BASE_URL` pointing at
`https://seikyu.xyz`), and the actor keys in `web/.env.e2e` (file must exist;
never commit its values).

One-time setup (installs Playwright into a gitignored local dir):

```sh
mkdir -p docs/manual/capture/.pw && cd docs/manual/capture/.pw && npm init -y >/dev/null && npm i -D @playwright/test && npx playwright install chromium
```

Run one chapter, e.g.:

```sh
MANUAL_BASE_URL=http://localhost:3021 node docs/manual/capture/02-verify.mjs
```

Env vars (all optional):

- `MANUAL_BASE_URL` — app origin (default `http://localhost:3021`)
- `MANUAL_OUT` — output root for `screenshots/` (default `docs/manual`)
- `MANUAL_PW_ROOT` — dir with the Playwright install (default `docs/manual/capture/.pw`)
- `MANUAL_KIT` — path to the capture kit (default the vendored `kit.mjs` here)
- `MANUAL_TZ` — browser timezone (default `Asia/Tokyo`)

Warning: chapters `02-verify.mjs` and `06-f3.mjs` consume a World Simulator
identity and send real Sepolia transactions — do not run them casually.
