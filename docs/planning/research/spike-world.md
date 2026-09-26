# World ID IDKit v4 spike (C0)

**UPDATE (H1 landed, live run complete):** see `## LIVE RUN` section near the
end for the actual captured result, the U-7 answer confirmed end-to-end, and
a blocking `environment_not_allowed` finding that needs a human decision.
Full raw JSON saved to `.omc/research/world-result-investorA.json`.

Spike app: `spike/world/` (gitignored, not committed). Built with
`create-next-app@15`, `@worldcoin/idkit@4.3.0`, `@worldcoin/idkit-core@4.3.0`
(pulls in `@worldcoin/idkit-server@1.1.1` transitively), `viem`.
Dev server: `pnpm -C spike/world dev -p 3101` (port 3100 was occupied by an
unrelated local Docker container, so I moved to 3101 — use that port, or free
3100 first).

## Credential decision (CP0)

**Pending H1.** No World credentials exist anywhere in the repo
(`web/.env.local`, `spike/world/.env.local` — neither pre-existed; I created
`spike/world/.env.local` as an empty placeholder). Recommendation once H1 is
done: default to **`passport`** (matches the CP0 target: passport credential,
`allow_legacy_proofs: false`, since `PassportPreset` is a native v4 credential
with its own legacy-document fallback baked in — no v3 orb fallback needed).
Fall back to `proofOfHuman` (`allow_legacy_proofs: true`) if Passport isn't
issuable on the test identity in the simulator, then `orbLegacy`
(`allow_legacy_proofs: true`, mandatory — it only ever returns v3 proofs) as
last resort. The spike's UI lets you flip between all four with one click,
each defaulting `allow_legacy_proofs` per the idkit-core JSDoc examples
(passport/selfieCheck → false, proofOfHuman/orbLegacy → true).

## Timeline

Not run — blocked on H1 (no `NEXT_PUBLIC_WORLD_APP_ID` / `WORLD_RP_ID` /
`WORLD_RP_SIGNING_KEY`). `GET /api/rp-context` correctly returns
`{"error":"missing WORLD_RP_ID env var — ..."}` (HTTP 500) right now — verified
live via curl. `/` renders with no console errors (verified via
claude-in-chrome — "Start verification" button is disabled because
`NEXT_PUBLIC_WORLD_APP_ID` is unset). The moment credentials are pasted into
`spike/world/.env.local` and the dev server restarted, this becomes runnable
end-to-end with no further code changes.

## Result shapes

Not obtained (no live run). Ground truth below is from reading the actual
`@worldcoin/idkit-core@4.3.0` and `@worldcoin/idkit-server@1.1.1` **published
`.d.ts` files directly** (not docs prose, which is sparser/less precise on
this), at:
`spike/world/node_modules/@worldcoin/idkit-core/dist/index.d.ts`,
`.../dist/hashing.js`, and
`spike/world/node_modules/.pnpm/@worldcoin+idkit-server@1.1.1/.../dist/index.d.ts`.

**`IDKitResult`** (union of `IDKitResultV3 | IDKitResultV4 | IDKitResultSession`)
— `responses[]` items are `ResponseItemV3` / `ResponseItemV4` /
`SelfieCheckResponseItemV4` / session variants. All response-item shapes carry
an **optional** `signal_hash?: string` field ("included if signal was
provided in request" — confirms U-7's core premise).

## U-7 signal binding

- **Where bound:** `responses[i].signal_hash` (optional field on every response
  item type — V3, V4, session, selfie). It is **not** in the request body sent
  to `POST /api/v4/verify/{rp_id}` — I confirmed via `docs.world.org`'s
  OpenAPI-derived `verify.md` page that the request schema (`protocol_version`,
  `nonce`, `action`, `environment`, `responses[]`, etc.) has **no top-level
  `signal` field**; `signal_hash` only appears inside each response item,
  exactly mirroring the type definitions above.
- **Hashing rule** — ground truth from
  `@worldcoin/idkit-core/dist/hashing.js` (`hashSignal`, exported from
  `@worldcoin/idkit-core/hashing`, re-exported by `@worldcoin/idkit-core`'s
  index and by `@worldcoin/idkit`):
  ```js
  function hashToField(input) {           // input: Uint8Array
    const hash = BigInt("0x" + keccak256hex(input)) >> 8n;
    return bytesOf(hash, 32);              // left-padded to 32 bytes
  }
  function hashSignal(signal) {            // signal: string | Uint8Array
    let input;
    if (signal instanceof Uint8Array) input = signal;
    else if (signal.startsWith("0x") && isValidHex(signal.slice(2)))
      input = hexToBytes(signal.slice(2)); // <-- wallet addresses take this branch
    else input = utf8Encode(signal);
    return "0x" + hexOf(hashToField(input));
  }
  ```
  i.e. **keccak256(bytes) right-shifted 8 bits, padded to 32 bytes** — same
  rule as v3's `hashToField`, confirmed unchanged in v4. **Critical gotcha for
  a wallet-address signal**: because `0x`-prefixed hex strings are detected and
  decoded to raw bytes (not UTF-8-encoded as text), `hashSignal("0xAbC1...")`
  hashes the **20 raw address bytes**, not the 42-character ASCII string. Any
  server-side re-derivation must pass the address in the exact same `0x...`
  string form to land on the same branch.
- **Does `/api/v4/verify` check signal itself?** No evidence it does. The
  endpoint's documented request schema takes no expected-signal parameter, and
  the response schema (`success`, `action`, `nullifier`, `results[]`, etc.)
  has no signal-mismatch field either. **Conclusion: signal verification is
  the RP's own responsibility** — call `hashSignal(expectedInvestorAddress)`
  server-side yourself and compare it to `responses[i].signal_hash` from the
  IDKit result (or from the verify response, if World echoes `responses` back
  — the spike's `/api/verify` logs the full upstream body, so this is directly
  checkable once creds land). No `verification_rejected`-for-signal-mismatch
  code exists; a mismatch is silently a hash that doesn't match what you
  expected, not an API error.
- **Where `signRequest`/`RpContext` field-name mismatch bites**: exported
  `signRequest({ signingKeyHex, action, ttl? })` from
  `@worldcoin/idkit-core/signing` returns **camelCase**
  `{ sig, nonce, createdAt, expiresAt }` (from `@worldcoin/idkit-server`'s
  `RpSignature` type), but the widget's `RpContext` prop wants **snake_case
  plus `rp_id`**: `{ rp_id, nonce, created_at, expires_at, signature }`.
  `signRequest` does **not** return `rp_id` — that's just your `WORLD_RP_ID`
  env var. The spike's `app/api/rp-context/route.ts` does this remap
  explicitly (`sig`→`signature`, `createdAt`→`created_at`, etc.) — easy to
  miss and get silent `invalid_rp_signature` errors otherwise.

**C1 (route implementation) note:** `POST /api/world/verify` uses the SDK's
own `signal_hash` field branch, not a signal forwarded to World's API —
consistent with this section's "signal verification is the RP's own
responsibility" conclusion. `WorldVerifyButton` always builds its preset with
`signal: investor` (`lib/world.ts` `buildPreset`), so a genuine v4 (or
v3-fallback) response from our own client always carries
`responses[0].signal_hash`. The route hashes `investor` itself via
`hashSignalV4` (`lib/world.ts`, wrapping idkit-core's own `hashSignal` from
`@worldcoin/idkit-core/hashing` — never re-derived), lower-cases both sides,
and compares against `responses[0].signal_hash`. A response with no
`signal_hash` at all is treated as a mismatch (fail closed, `422
SIGNAL_MISMATCH`) rather than falling back to sending a bare `signal`
alongside the forwarded result to World — there was no need for that
fallback branch since our client-side preset always sets `signal`.

## Identifier values

From the actual type comments (`ResponseItemV4`/`ResponseItemV3` /
`issuer_schema_id`):
- `proof_of_human` — issuer_schema_id `1`. **Used by both the v4
  `proofOfHuman` preset AND the legacy v3 `orbLegacy` preset** — there is no
  separate `"orb"` identifier. (This contradicts the assumption in the task
  brief that `orbLegacy` → identifier `"orb"`; ground truth says `orbLegacy`'s
  v3 response item also carries `identifier: "proof_of_human"`.)
- `passport` — issuer_schema_id `9303`.
- `mnc` — issuer_schema_id `9310`.
- `selfie` — issuer_schema_id `11` (literal type `"selfie"` on
  `SelfieCheckResponseItemV4`/`...Session`, only ever this value).

Preset factories — all exported from **both** `@worldcoin/idkit-core` and
`@worldcoin/idkit` (the React package re-exports the core ones verbatim), no
`/presets` subpath:
```ts
import { passport, proofOfHuman, orbLegacy, selfieCheck } from "@worldcoin/idkit";
// also available: mnc, secureDocumentLegacy, documentLegacy, deviceLegacy,
// selfieCheckLegacy, identityCheck
```
Each is `(opts?: { signal?: string }) => Preset`.

React widget — confirmed by reading `@worldcoin/idkit/dist/index.d.ts`
directly (not guessed): export is **`IDKitRequestWidget`** (also
`IDKitInviteCodeRequestWidget`, `IDKitSessionWidget`), from `"@worldcoin/idkit"`.
Props: `open, onOpenChange, handleVerify?, onSuccess (required),
onError?, autoClose?, language?` plus the spread `IDKitRequestConfig`:
`app_id, action, rp_context, action_description?, bridge_url?, return_to?,
allow_legacy_proofs (required boolean), require_user_presence?,
override_connect_base_url?, environment? ("production"|"staging"|"sandbox")`,
plus exactly one of `preset` or `constraints`.

## Errors & cancel

From `IDKitErrorCodes` enum (`@worldcoin/idkit-core`, mirrors Rust
`AppError`): `user_rejected`, `verification_rejected` (legacy alias, handle
same as `user_rejected`), `credential_unavailable`, `feature_unavailable`,
`world_id_4_not_available`, `world_id_3_not_available`, `malformed_request`,
`invalid_network`, `inclusion_proof_pending`, `inclusion_proof_failed`,
`unexpected_response`, `connection_failed`, `max_verifications_reached`,
`failed_by_host_app` (your own `handleVerify` threw/rejected),
`user_presence_failed`, `invalid_rp_signature`, `nullifier_replayed`,
`duplicate_nonce`, `unknown_rp`, `inactive_rp`, `timestamp_too_old`,
`timestamp_too_far_in_future`, `invalid_timestamp`, `rp_signature_expired`,
`identity_attributes_not_matched`, `generic_error`, `invalid_rp_id_format`,
`timeout`, `cancelled`.

**Cancel**: the widget component itself does not expose a distinct
"cancelled" prop/callback — `onSuccess`/`onError` simply never fire and
`onOpenChange(false)` is called. The spike's `page.tsx` tracks this
explicitly: if `onOpenChange(false)` fires while status is still `idle`
(neither `onSuccess` nor `onError` ran), it's treated as user cancellation.
`Cancelled` (`"cancelled"`) also exists as an explicit client-side error code
value for other abort paths (timeout/abort-signal), per the enum.

## Nullifier

Typed as `nullifier: string`, with the doc comment `/** RP-scoped nullifier
(hex) */` on `ResponseItemV4` — **hex string**, not decimal. "RP-scoped"
confirms it's derived per (rp/app, action, identity) and is why
`nullifier_replayed` exists as a distinct error code — it is stable across
sessions for the same (app_id/rp_id, action, identity) tuple, as expected.
Session proofs use a 2-element `session_nullifier: string[]` tuple instead
(1st = session nullifier, 2nd = generated action), both hex.

## Simulator notes

- `simulator.worldcoin.org` (fetched `/id/0x18310f83` directly): confirms it's
  the staging/no-phone test tool ("test on the staging network without a
  phone"), has a "Paste code" input (works with non-QR/bridge flows), and
  explicitly states **"This simulator will change with the adoption of World
  ID 4.0"** — i.e. as of today it's mid-migration; the fetched test identity
  page showed "no verified credentials yet," implying you configure fake
  credentials on the simulator identity before it can complete a Passport/PoH
  request. Could not confirm from docs alone whether v4 Passport is fully
  wired in the simulator yet — **this needs a live run once H1 lands**; if
  Passport doesn't work in the simulator, fall back to `proofOfHuman` then
  `orbLegacy` per the CP0 plan above (the spike's preset selector makes this a
  one-click swap, no code change).
- Docs confirm: "staging" environment is the documented pairing for
  simulator-based development testing (`environment: "staging"` on
  `IDKitRequestConfig`, which the spike defaults to).

## Blockers for human (H1)

None of `NEXT_PUBLIC_WORLD_APP_ID` / `WORLD_RP_ID` / `WORLD_RP_SIGNING_KEY`
exist yet. Steps (confirmed via `docs.world.org/world-id/idkit/integrate.md`,
though exact portal UI label text isn't in the docs text — only the value
names):

1. Go to **https://developer.world.org** (or `developer.worldcoin.org`,
   same portal) and create a new **app** — pick the **staging** environment
   for the app (its `app_id` will look like `app_staging_xxxxxxxxxxxx`).
2. Register the action **`buy-receivable`** on that app (the widget's
   `action` prop and the `rp-context` route's `signRequest({ action: ... })`
   must match this exactly, or you'll get `invalid_rp_signature` / a
   verify-side rejection).
3. The portal gives you three values to copy out — docs call them literally
   `app_id`, `rp_id`, and `signing_key`. Paste them into
   `spike/world/.env.local` as:
   ```
   NEXT_PUBLIC_WORLD_APP_ID=app_staging_xxxxxxxxxxxx
   WORLD_RP_ID=rp_xxxxxxxxxxxx
   WORLD_RP_SIGNING_KEY=0x...   # keep this OUT of anything client-side; never commit
   ```
4. Restart `pnpm -C spike/world dev -p 3101` (or whatever port; 3100 was busy
   with an unrelated local Docker process when I ran this) and open
   `http://localhost:3101`.
5. Test identity setup on `https://simulator.worldcoin.org/id/0x18310f83`
   likely needs credentials configured on it before a Passport/PoH request
   will succeed there — the fetched page showed no verified credentials on
   that test identity as of now.

Everything else (widget wiring, preset switcher, rp-context signing route with
the camelCase→snake_case remap, verify-forwarding route, cancel/error/success
UI) is built and type-checks clean (`npx tsc --noEmit` — zero errors) and the
dev server is live and responding correctly to the no-creds case right now.

## LIVE RUN (H1 credentials landed)

Ran with `NEXT_PUBLIC_WORLD_APP_ID=app_47ea303bb2ca8ee8e6e4dfddfb8b090b`,
`WORLD_RP_ID=rp_26da7441b98d1a38`, preset `passport`, signal (investor A
wallet) `0x601344DFBEd3Cc685CF49190f39c18B1b570C131`, widget
`environment: "staging"`. `GET /api/rp-context` returned a correctly signed
context immediately (`rp_id`, `nonce`, `created_at`, `expires_at`,
`signature` all populated — the camelCase→snake_case remap works).

**Flow that actually worked**: opened the widget on `localhost:3101` → it
shows a QR code and, only when `environment: "staging"`, a **"Testing in
staging? Use the simulator"** link. That link opens
`https://simulator.worldcoin.org/id/0x18310f83?connect_url=https%3A%2F%2Fstaging.world.org%2Fverify%3Ft%3Dwld%26i%3D<request-id>%26k%3D<key>`
in a new tab (confirms: staging bridges through `staging.world.org`, the
simulator wires itself up entirely from that query param — no manual
QR/code pasting needed). The simulator showed a "Complete verification"
sheet for our app ("Invoice RWA" — app name confirmed correct), with
credential tabs **Human / Passport / ID / Device** and a
**"SIMULATOR OPTIONS: Legacy v3 proof | World ID 4.0"** toggle (defaulted to
World ID 4.0, matching our `allow_legacy_proofs: false` + `passport` preset).
Passport was pre-selected (matches our preset). Clicked **Continue** →
"Presented" (green) → back on `localhost:3101` the widget's poll picked it
up within ~2s and fired `handleVerify` → `onSuccess`.

**So yes — Passport is fully wired into the simulator for v4 today.** No
need for `proofOfHuman`/`orbLegacy` fallback; CP0 = `passport` is confirmed
usable end-to-end via the simulator, not just in theory.

T_start `2026-09-26T06:32:01.875Z`, T_first_success
`2026-09-26T06:33:50.120Z` (~108s, dominated by me navigating the simulator
UI by hand — an automated test would be seconds).

**Full captured result** (saved verbatim to
`.omc/research/world-result-investorA.json`):
```json
{
  "action": "buy-receivable",
  "environment": "staging",
  "nonce": "0x0050d1cea6f422fbf9c025883fbcbff1f5cde7a76ef3797329f2e763e644945b",
  "protocol_version": "4.0",
  "responses": [{
    "expires_at_min": 1790404322,
    "identifier": "passport",
    "issuer_schema_id": 9303,
    "nullifier": "0x28318508ef4f584f142db492a5a8a2d1af223ccf4b6edd08183d4c09583c85ab",
    "proof": ["13586708970665106381745288208973107748208932217529228854957135199212447396569", "3496315628313386146607455000394330740674813200397598144228559932493601834382", "24911389304964050339536334864926605829222014766159611726448603010999788557571", "2061725491485979853583972913247404948584683107149486747299314869970839483327", "10442162504619117625503155665608155026801839232948277265663602594287241473816"],
    "signal_hash": "0x0058a67f5b3adba1c7a9452185d8e3822b8689ac0c12227d74a713e91a749d54"
  }]
}
```

**Correction to earlier read of the types**: `proof[]` elements are
**decimal-string big integers**, not `0x`-hex strings, despite the
`idkit-core` `.d.ts` comment saying "(hex strings)". Anything that consumes
`proof` (e.g. a Solidity call via `WorldIDVerifier.sol`) should treat each
element as an arbitrary-precision integer literal (parses fine with
`BigInt(...)` either way) rather than assuming a `0x` prefix. `nullifier` and
`signal_hash`, by contrast, *are* `0x`-prefixed hex as documented, both 33
bytes (66 hex chars) rather than the 32 you'd expect from a plain field
element — same 33-byte pattern I saw on the `rp_context.nonce` too, so this
looks like a consistent "field element as 33-byte big-endian, sign/overflow
byte included" encoding across the SDK, not a one-off.

**U-7 CONFIRMED END-TO-END**: independently recomputed
`hashSignal("0x601344DFBEd3Cc685CF49190f39c18B1b570C131")` server-side
(Node, using the real `@worldcoin/idkit-core@4.3.0` `hashSignal` — keccak256
then `>> 8` bits) and it **exactly matches** `responses[0].signal_hash`
above (`0x0058a67f...9d54`). This is the concrete recipe for the invoice-RWA
backend: store the investor address, and at verify time compute
`hashSignal(investorAddress)` and assert equality against
`responses[i].signal_hash` yourself — World's API does not do this check for
you (confirmed again below).

**BLOCKER — `environment_not_allowed` (403) on `/api/v4/verify`:**
```json
{
  "status": 403,
  "body": {
    "code": "environment_not_allowed",
    "detail": "Staging verification is not open for this app. Open a staging window with the set_world_id_staging_verification tool, or omit `environment` (or set it to `production`) to verify production proofs.",
    "attribute": "environment",
    "app_id": "app_47ea303bb2ca8ee8e6e4dfddfb8b090b"
  }
}
```
The proof itself was generated fine (`onSuccess` fired with a full v4
result) — the rejection is purely on the **verify** call, because this app
has not had "staging verification" opened. **This directly answers the
`WORLD_ENV` question**: `environment` is not a value you set once and
forget — it's the `environment` prop passed into the widget/`IDKitRequestConfig`,
it gets echoed into the signed result (`"environment": "staging"` above),
and `/api/v4/verify` enforces it against a per-app allowlist. Two options,
human decision needed:
1. **Find and flip the "staging verification" toggle for this app** in the
   new World Developer Portal (the error names something called
   `set_world_id_staging_verification` — not a name I've seen in the docs,
   possibly an internal/portal-side control; I didn't attempt to find it
   myself since it needs your portal login). Then staging proofs (via the
   free, phone-free simulator) will verify.
2. **Or just use `environment: "production"`** for real use — I tested this
   too: with the widget set to `environment: "production"`, the **"Use the
   simulator" link disappears entirely** (only the plain QR code is shown).
   So production proofs cannot be generated via the simulator at all — they
   need the real World App on a phone (the "World ID Sandbox test build"
   path you mentioned). I did not attempt a real-phone run in this session.

**Cancel path also verified** (bonus, not just requested "once" — happened
naturally on the production attempt): closing the widget's `×` before
`onSuccess`/`onError` fired correctly set `Status: cancelled` with the
message "Verification cancelled by user (widget closed before
onSuccess/onError)." — the app-level cancel detection in `page.tsx` works as
designed.

**Recommendation for the web app integration**: nothing needs to change in
the IDKit wiring itself (widget props, preset, rp-context signing all worked
first try). The only real decision is #1 vs #2 above for which `environment`
the production invoice-RWA flow should target — that determines whether
QA/demo can keep using the simulator (staging, once the portal toggle is
found) or must use a real phone + World App (production, works today).
