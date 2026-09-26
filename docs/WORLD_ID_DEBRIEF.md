# World ID debrief

## Product event requiring trust

The trust event is the first moment a wallet tries to `buy()` a receivable: at that instant it
stops being an anonymous address and becomes an **investor** taking on another party's default
risk with real money. Seikyu needs to know, before that purchase clears, that the wallet behind it
is a distinct human — otherwise one operator could buy every discounted receivable on the platform
with a fresh wallet each time, and a legitimate `MAX_OPEN_POSITIONS` cap would mean nothing.

## Credential choice & why it is the minimum sufficient assurance

Three requirements the credential has to satisfy:

- **R1** — the buyer is a human, not a bot sniping every well-priced invoice.
- **R2** — **deterministic** per-person uniqueness, so `MAX_OPEN_POSITIONS = 3` (`contracts/src/InvoiceMarket.sol:44,216-224`) is a real cap on one person's exposure, not a cap on one *wallet's* exposure.
- **R3** — no name, age, nationality, or other KYC attribute — real KYC/FIEA compliance happens off-chain and is out of scope for this testnet pilot; the credential should disclose the minimum needed for R1+R2.

| Credential | R1 (human) | R2 (deterministic uniqueness) | R3 (minimal disclosure) | Friction | Verdict |
|---|---|---|---|---|---|
| Device | ✗ | ✗ | ✓ | lowest | not enough — no uniqueness at all |
| Selfie Check | ✓ | ✗ — returns a probabilistic "Sybil score", not a deterministic identity match | ✓ | low | fails R2: two accounts is a real possibility, giving 2× the cap |
| **Passport (NFC, ICAO 9303)** | ✓ | ✓ — one physical document, one identity[^sim-passport] | ✓ | medium (needs an NFC-chip passport) | **chosen for production** — least friction credential that still clears R2 |
| Proof of Human (Orb) | ✓ | ✓ (biometric) | ✓ | high (requires visiting an Orb) | fallback only — over-assured for this pilot's needs; **used for this demo, see below** |
| identityCheck({attributes}) | ✓ | ✓ | ✗ — discloses whichever attributes are requested | medium | rejected — no rule in this pilot needs any disclosed attribute |

[^sim-passport]: True of a real, physical passport. World's **staging Simulator's mock Passport credential is a single shared document across all five test identities** (confirmed live, see below), so on staging exactly one wallet, ever, can complete Passport verification per `(rp_id, action)` — a tooling limitation of the test environment, not a property of Passport itself.

**Accepted residual risk**: someone holding two valid passports can verify twice and get a 2×
cap (6 open positions instead of 3). This is a bounded, known gap, not an unknown one.

**Fallback ladder actually implemented** (`web/lib/env.ts:14-19`, `web/lib/world.ts:30-59`):
`passport` → `proofOfHuman` → `orbLegacy` → `selfieCheck`, selected via `NEXT_PUBLIC_WORLD_PRESET`.
If the pilot ever had to fall back to `selfieCheck`, that would be a real drop below R2 and must be
called out plainly rather than described as passing — the fallback exists for demo continuity, not
as a silent downgrade of the security claim.

**Confirmed live — and the fallback ladder was actually used**: a real Passport proof was generated
and verified end-to-end against this deployment's staging app via the World ID Simulator on
2026-09-26 ([`InvestorVerified` tx](https://eth-sepolia.blockscout.com/tx/0xffdf3910f2e55373ac6a084bab8575a593c0467050bb3a026f3b1cc11ef3b975),
wallet `0x2aaA…259A`) — the code path for `passport` genuinely works. But testing further revealed
the Simulator issues the **same** mock Passport document to every test identity: identities #4, #1,
and a freshly created #5 all produced the identical nullifier
`0x28318508ef4f584f142db492a5a8a2d1af223ccf4b6edd08183d4c09583c85ab` when verified with `passport`.
That means on staging, only the *one* wallet that got there first can ever complete Passport
verification for this app's action — every other wallet collides with F3 by construction, not
because of anything wrong in our nullifier handling. Recording a demo that needs multiple distinct
investors therefore required taking the plan's own fallback-ladder step:
**`NEXT_PUBLIC_WORLD_PRESET=proofOfHuman`** on the demo deployment (identifier `proof_of_human`,
the Simulator's "Human" card), under which each Simulator test identity *does* produce its own
distinct nullifier. Per the plan, this is honestly **over-assured because of tooling** — production
intent remains Passport (document-level uniqueness, lower friction than Orb); the demo credential
change is a Simulator limitation, not a reassessment of R1–R3. <!-- FILL-TX: proofOfHuman
InvestorVerified tx for the demo deployment (exec-manual to report) -->. See "Time to first
success" below for the timeline and "Friction" for how this was discovered.

## Verification architecture

`POST /api/world/verify` (`web/app/api/world/verify/route.ts`, `export const maxDuration = 30`)
runs 8 steps in order:

1. **Body validation** — zod schema requires `investor` (a `0x`-address) and `result` — `web/app/api/world/verify/route.ts:17-20,27-39`. Malformed input returns `400 INVALID_BODY`.
2. **Action check** — `result.action` must equal `NEXT_PUBLIC_WORLD_ACTION` (`buy-receivable`) — `web/app/api/world/verify/route.ts:41-44`.
3. **Identifier match** — `responses[0].identifier` must equal the identifier the configured preset produces (`passport`→`"passport"`, `proofOfHuman`/`orbLegacy`→`"proof_of_human"`, `selfieCheck`→`"selfie"`); this stops a client from silently downgrading to a weaker credential than the server expects — `web/app/api/world/verify/route.ts:52-56`, `web/lib/world.ts:116-126`. Confirmed live: the real proof below carries `"identifier": "passport"`.
4. **Signal binding (local check)** — the server hashes `investor` itself with idkit-core's own `hashSignal` (never re-implemented) and compares it, case-insensitively, against `responses[0].signal_hash` from the client's proof; a missing or mismatched hash fails closed — `web/app/api/world/verify/route.ts:58-80`, `web/lib/world.ts:137-139`. Confirmed live (see "Time to first success"): `hashSignal(investorAddress)` matched `responses[0].signal_hash` exactly, byte for byte.
5. **Forward to World** — the *entire* result is POSTed as-is to `https://developer.world.org/api/v4/verify/{WORLD_RP_ID}`. Staging/sandbox proofs (not production) additionally require an `x-staging-verification-token` header — obtained once, out of band, per app (see Friction) — or World rejects them outright; the route checks `stagingVerificationToken()` up front and fails with a clearer `503 STAGING_TOKEN_MISSING` rather than surfacing World's own error. A non-2xx response from World is mapped to `422 VERIFICATION_FAILED`, a network error or 5xx to `502 WORLD_API_UNAVAILABLE` — `web/app/api/world/verify/route.ts:88-114`, `web/lib/world.ts:95-111`.
6. **Environment check** — the response's `environment` must equal `worldEnvironment()` (`web/lib/world.ts:90-93`, read from `NEXT_PUBLIC_WORLD_ENVIRONMENT`) — the *same* value passed as the `environment` prop on the widget (`web/components/WorldVerifyButton.tsx:242`), so client and server can't drift apart — or `409 ENV_MISMATCH` — `web/app/api/world/verify/route.ts:130-136`.
7. **Nullifier binding** — normalize the nullifier, then read `InvoiceMarket.nullifierOwner(nullifier)` on-chain; if it's already bound to a different wallet, `409 NULLIFIER_ALREADY_USED` — `web/app/api/world/verify/route.ts:138-168`.
8. **Operator transaction** — the operator wallet calls `setVerified(investor, nullifier)` using viem's `nonceManager`, retrying once on `nonce too low`/`replacement transaction underpriced`, and returns the tx hash **without waiting for a receipt** (Vercel's function timeout is the constraint) — `web/app/api/world/verify/route.ts:170-179,182-208`. Confirmed live end-to-end: [`InvestorVerified` tx](https://eth-sepolia.blockscout.com/tx/0xffdf3910f2e55373ac6a084bab8575a593c0467050bb3a026f3b1cc11ef3b975) (block 11785076) — `isVerified(investor)` reads `true` and nullifier `0x28318508ef4f584f142db492a5a8a2d1af223ccf4b6edd08183d4c09583c85ab` is bound to that wallet.

`GET /api/world/rp-context` signs a fresh RP context for the widget — `web/app/api/world/rp-context/route.ts:17-36`.

## Alternative paths (F1–F5)

| # | Event | Detection point | HTTP code / revert | UI `data-state` |
|---|---|---|---|---|
| F1 | User cancels the widget | `onOpenChange(false)` fires while still in the `open` state (before `onSuccess`/`onError`) — `web/components/WorldVerifyButton.tsx:145-158` | n/a (client-only) | `cancelled` |
| F2 | Credential unavailable or a mismatched credential is returned | IDKit error `credential_unavailable`, or server `422 CREDENTIAL_MISMATCH` (step 3) / `422 VERIFICATION_FAILED` (step 5) | `422 CREDENTIAL_MISMATCH` / `422 VERIFICATION_FAILED` | `credential-unavailable` / `credential-mismatch` |
| F3 | Same person tries a second wallet | Operator tx reverts `NullifierAlreadyUsed(boundTo)` on-chain; server pre-checks the same condition (step 7) | `409 NULLIFIER_ALREADY_USED` (server) / `NullifierAlreadyUsed` (on-chain) | `nullifier-used` |
| F4 | `buy()` called directly from an unverified wallet (bypassing the UI) | `InvoiceMarket.buy` checks `isVerified[msg.sender]` before anything else — `contracts/src/InvoiceMarket.sol:175` | revert `NotVerifiedInvestor(address)` | n/a — no UI path produces this; only a direct contract call |
| F5 | A proof for wallet A is submitted with `investor = B` | Local signal check (step 4) — the hash of `B` never matches the `signal_hash` bound to `A`'s proof | `422 SIGNAL_MISMATCH` | `signal-mismatch` |

**Nullifier semantics, corrected after live testing**: the nullifier is a function of
`(rp_id, action, the credential's underlying identity/document)` — not simply "per test identity,"
which an earlier pass here assumed. For **Proof of Human**, that underlying identity is the
World-verified personhood behind each Simulator test identity, so switching test identities
(Settings → "Switch test identity") genuinely does yield a distinct nullifier — confirmed for
identities #1/#2/#3/#5. For **Passport**, the underlying identity is the physical document itself,
and the Simulator issues **one single shared mock document to all five test identities** (see
Credential choice above) — so switching identities changes nothing about the nullifier when using
`passport`. Either way, generating a second proof bound to the *same* underlying identity/document
for a different `investor` wallet reproduces F3 exactly (`409 NULLIFIER_ALREADY_USED`) — that part
is the one-person-one-wallet rule working as designed, not a bug in our nullifier handling.

**Stale proofs fail, as they should**: replaying a previously captured proof (rather than generating a fresh one) gets rejected by World with `verification_failed: execution reverted` — `rp_context`'s `nonce`/TTL make each proof single-use and time-bounded. A proof has to be fresh per request; nothing in our own code needs to enforce this separately.

## Debrief

### Time to first success

**≈108 seconds (1 minute 48 seconds)** from opening the widget to a captured, verified Passport
proof: `T_start` `2026-09-26T06:32:01.875Z` → `T_first_success` `2026-09-26T06:33:50.120Z`
(`.omc/research/spike-world.md`, "LIVE RUN"). That time is almost entirely a human clicking through
the World ID simulator UI by hand (opening the simulator tab, picking the Passport credential tab,
clicking Continue) — an automated test would take seconds. No code changes were needed once
`NEXT_PUBLIC_WORLD_APP_ID`/`WORLD_RP_ID`/`WORLD_RP_SIGNING_KEY` landed: widget props, the preset,
and the `rp-context` signing route all worked on the first try.

That number measures the **client-side proof**, not a full round trip through our own
`/api/world/verify` route. The very next call, forwarding that real proof to
`POST /api/v4/verify/{rp_id}`, hit a separate blocker (`403 environment_not_allowed` — see
Friction) that had nothing to do with our code and needed a Developer Portal setting changed —
honestly, that took roughly **another hour** to resolve, mostly spent reading the error message
carefully, finding the Developer Portal's MCP endpoint, and working out the
`set_world_id_staging_verification` → `x-staging-verification-token` handshake described in
Friction below. Once that token was wired in, the full round trip succeeded on the first retry:
proof → `/api/world/verify` → World's `/api/v4/verify` → on-chain `setVerified` → `InvestorVerified`
(see "Verification architecture", step 8, for the tx). Before any credentials landed at all,
`GET /api/world/rp-context` correctly returned `{"code":"WORLD_NOT_CONFIGURED"}` (503) with no env
set, and the widget's verify button was correctly disabled with `NEXT_PUBLIC_WORLD_APP_ID` unset.

That first success, however, turned out not to generalize: a second attempt to bind a *different*
wallet to a *different* Simulator test identity, still on `passport`, produced the exact same
nullifier as the first — which took further testing (a third, freshly created test identity, to
rule out a two-identity coincidence) to pin down as the Simulator sharing one mock Passport document
across all five identities, not a bug on our side. That investigation cost real time on top of the
108 seconds above, and is why the recorded demo runs on `proofOfHuman` instead — see "Credential
choice" and "Friction".

### Friction

- **`403 environment_not_allowed` on `/api/v4/verify` until a portal-side toggle is flipped.** A correctly-generated, correctly-signaled staging proof was rejected outright: `{"code":"environment_not_allowed","detail":"Staging verification is not open for this app. Open a staging window with the set_world_id_staging_verification tool, or omit \`environment\` (or set it to \`production\`) to verify production proofs."}`. This is not documented anywhere in the request/response schema for `/api/v4/verify` — a new app's staging verification has to be explicitly opened in the Developer Portal before any simulator-generated proof will pass, and the only pointer to how is the error message itself naming an internal-sounding `set_world_id_staging_verification` tool. This cost real time figuring out that the *proof* was fine and the *rejection* was an app-configuration gate, not a bug in our signal check or request shape.
  **Resolution**: the Developer Portal exposes an MCP server at `https://developer.world.org/api/mcp`, authenticated with a Bearer team API key (`api_…`, from Team settings → API Keys — not something we'd have guessed from the REST docs). Its `set_world_id_staging_verification({ app_id, enabled: true })` tool returns a one-time `staging_verification_token`, valid 24 hours, that the *server* must then send back to World as the `x-staging-verification-token` header on every `/api/v4/verify` call for staging/sandbox proofs (production proofs don't need it at all). We wired this in as `stagingVerificationToken()` (`web/lib/world.ts:95-111`), read from `WORLD_STAGING_VERIFICATION_TOKEN`, with a `503 STAGING_TOKEN_MISSING` if it's unset — see "Verification architecture" step 5.
- **The Simulator's shared Passport document blocks multi-user demos.** Every one of the five Simulator test identities produces the *identical* nullifier when verified with `passport` (see "Credential choice"), because the mock Passport credential is a single document, not five distinct ones. A product whose demo needs more than one investor wallet to complete Passport verification simply cannot on staging — the second wallet always hits `409 NULLIFIER_ALREADY_USED`, indistinguishable from a real F3 event until you've dug into why. We only found this by deliberately testing a third identity after the second collided, to rule out coincidence.
- **`signRequest()`'s camelCase output vs the widget's snake_case input.** `@worldcoin/idkit-core/signing`'s `signRequest({ signingKeyHex, action })` returns `{ sig, nonce, createdAt, expiresAt }`, but `IDKitRequestWidget`'s `rp_context` prop wants `{ rp_id, nonce, created_at, expires_at, signature }` — and `rp_id` isn't even in the signer's output, it's just the `WORLD_RP_ID` env var. Missing this remap produces a silent `invalid_rp_signature` with no hint that it's a field-naming problem. We had to write the remap explicitly (`web/app/api/world/rp-context/route.ts:24-35`).
- **The `passport()` preset's own documentation is effectively "coming soon".** The public docs prose doesn't enumerate the preset factories or their options; the only reliable source was reading `@worldcoin/idkit/dist/index.d.ts` and `@worldcoin/idkit-core/dist/index.d.ts` directly.
- **Simulator readiness for v4 Passport is unconfirmed from docs alone.** `simulator.worldcoin.org` states outright that "this simulator will change with the adoption of World ID 4.0" — there's no way to know from documentation whether a Passport request actually completes there; it needs a live run to find out, and the test identity we found had no pre-configured credentials.
- **`/api/v4/verify` does not check the signal itself.** Its documented request/response schema has no signal parameter and no signal-mismatch error code — signal verification is entirely the relying party's own responsibility (see the improvement below).
- **`orbLegacy`'s response identifier is `"proof_of_human"`, not `"orb"`.** An earlier pass assumed `"orb"` based on a summary of World's public docs page; the actual installed SDK's type comments (and an independent spike) both confirm the legacy Orb v3 response and the v4 `proofOfHuman` response share the identifier `"proof_of_human"` — Orb is the verification *method*, `proof_of_human` is the credential *type* it issues.
- **Docs prose vs. shipped SDK types disagree often enough that we stopped trusting the prose.** Every non-trivial fact in this integration (`signal_hash` location, identifier values, error codes, widget prop names) was ultimately confirmed by reading the published `.d.ts` files under `node_modules`, not by reading docs.world.org.

### Missing capability / docs

- World's own `/api/v4/verify` has no way to express "and also check this signal server-side" or to return a distinct error code when a signal doesn't match — every RP has to reimplement the local hash-and-compare check correctly, with no help from the API if they get it wrong.
- No canonical, versioned reference table of `identifier` values per preset (passport/proofOfHuman/orbLegacy/selfieCheck/mnc/identityCheck) exists in the public docs — we had to derive it from `.d.ts` doc comments and `issuer_schema_id` cross-checks, then independently confirm it via a spike.
- **Nowhere does World document that the staging Simulator's Passport credential is a single shared mock document across all test identities.** The Simulator's own UI gives no hint of this — it presents five separate "test identities" that look independent. A team building a multi-user demo against Passport on staging has no way to learn this short of hitting the collision and tracing it down manually, as we did.
- No documented guarantee (or even a clear statement either way) of Passport support in the public simulator for v4 — a developer building against Passport today can't tell from docs alone whether their staging tests will actually complete. **Now confirmed live**: it works, no fallback needed.
- The Developer Portal's "staging verification window" gate for `/api/v4/verify` isn't documented anywhere we could find before hitting it — see the Friction item above.
- **The Developer Portal's MCP server and its `set_world_id_staging_verification` tool aren't in the public docs page for the portal at all.** We only found them because the `environment_not_allowed` error message happened to name the tool by its exact function name; nothing on docs.world.org describes the MCP endpoint, its auth (a team-scoped Bearer API key, distinct from the app's `WORLD_RP_SIGNING_KEY`), its available tools, or the `staging_verification_token` → `x-staging-verification-token` handshake it produces. A developer who doesn't read error messages character-by-character has no path to discovering this exists.
- **`responses[i].proof` is an array of decimal-string big integers, not `0x`-hex strings**, despite `@worldcoin/idkit-core`'s own `.d.ts` comment describing them as "(hex strings)". A real captured proof: `["13586708970665106381745288208973107748208932217529228854957135199212447396569", ...]` — five plain base-10 numbers. `nullifier` and `signal_hash`, by contrast, genuinely are `0x`-prefixed hex, each 33 bytes (66 hex chars) rather than the 32 you'd expect from a plain field element. Anything downstream that consumes `proof` (e.g. a Solidity verifier call) needs to treat each element as an arbitrary-precision integer literal, not assume a `0x` prefix — the type declaration is simply wrong on this point.

### The one improvement with greatest impact

**Make `/api/v4/verify` optionally accept an expected signal (or `signal_hash`) and enforce it
server-side, returning a dedicated error code on mismatch.** Everything else in this list is
friction that costs an afternoon of reading `.d.ts` files. This one is different: it's a piece of
the actual security model — binding a World ID proof to a specific wallet address — that IDKit
hands entirely to the relying party with no backstop. If an RP's local signal check has a bug (a
hashing mismatch, a case-sensitivity slip, a check that's accidentally skippable), the failure mode
isn't a visible error — it's proof A silently getting accepted for wallet B, defeating the "one
verified human, one wallet" invariant that the whole exposure-cap design depends on. Every other
friction point here fails loudly and immediately during development; a broken signal check can
ship and only get discovered by exploitation. Moving that check into World's own API, where it can
be tested once against the real ZK circuit instead of reimplemented by every RP, would remove an
entire class of otherwise-silent integration bugs from every app built on IDKit, not just this one.

(The staging-verification-window 403 from the live run above was real friction too, but it fails
loudly, points at itself, and is a one-time per-app setup step — not a silent, ongoing security gap
like an unenforced signal check.)
