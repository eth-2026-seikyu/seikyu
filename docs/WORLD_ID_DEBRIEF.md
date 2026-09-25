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
| **Passport (NFC, ICAO 9303)** | ✓ | ✓ — one physical document, one identity | ✓ | medium (needs an NFC-chip passport) | **chosen** — least friction credential that still clears R2 |
| Proof of Human (Orb) | ✓ | ✓ (biometric) | ✓ | high (requires visiting an Orb) | fallback only — over-assured for this pilot's needs |
| identityCheck({attributes}) | ✓ | ✓ | ✗ — discloses whichever attributes are requested | medium | rejected — no rule in this pilot needs any disclosed attribute |

**Accepted residual risk**: someone holding two valid passports can verify twice and get a 2×
cap (6 open positions instead of 3). This is a bounded, known gap, not an unknown one.

**Fallback ladder actually implemented** (`web/lib/env.ts:14-19`, `web/lib/world.ts:29-59`):
`passport` → `proofOfHuman` → `orbLegacy` → `selfieCheck`, selected via `NEXT_PUBLIC_WORLD_PRESET`.
If the pilot ever had to fall back to `selfieCheck`, that would be a real drop below R2 and must be
called out plainly rather than described as passing — the fallback exists for demo continuity, not
as a silent downgrade of the security claim.

## Verification architecture

`POST /api/world/verify` (`web/app/api/world/verify/route.ts`, `export const maxDuration = 30`)
runs 8 steps in order:

1. **Body validation** — zod schema requires `investor` (a `0x`-address) and `result` — `web/app/api/world/verify/route.ts:16-19,26-38`. Malformed input returns `400 INVALID_BODY`.
2. **Action check** — `result.action` must equal `NEXT_PUBLIC_WORLD_ACTION` (`buy-receivable`) — `web/app/api/world/verify/route.ts:40-43`.
3. **Identifier match** — `responses[0].identifier` must equal the identifier the configured preset produces (`passport`→`"passport"`, `proofOfHuman`/`orbLegacy`→`"proof_of_human"`, `selfieCheck`→`"selfie"`); this stops a client from silently downgrading to a weaker credential than the server expects — `web/app/api/world/verify/route.ts:51-55`, `web/lib/world.ts:82-92`.
4. **Signal binding (local check)** — the server hashes `investor` itself with idkit-core's own `hashSignal` (never re-implemented) and compares it, case-insensitively, against `responses[0].signal_hash` from the client's proof; a missing or mismatched hash fails closed — `web/app/api/world/verify/route.ts:57-79`, `web/lib/world.ts:94-105`.
5. **Forward to World** — the *entire* result is POSTed as-is to `https://developer.world.org/api/v4/verify/{WORLD_RP_ID}`; a non-2xx response is mapped to `422 VERIFICATION_FAILED`, a network error or 5xx to `502 WORLD_API_UNAVAILABLE` — `web/app/api/world/verify/route.ts:86-114`.
6. **Environment check** — the response's `environment` must equal our configured `WORLD_ENV` (staging/production), or `409 ENV_MISMATCH` — `web/app/api/world/verify/route.ts:116-119`.
7. **Nullifier binding** — normalize the nullifier, then read `InvoiceMarket.nullifierOwner(nullifier)` on-chain; if it's already bound to a different wallet, `409 NULLIFIER_ALREADY_USED` — `web/app/api/world/verify/route.ts:121-151`.
8. **Operator transaction** — the operator wallet calls `setVerified(investor, nullifier)` using viem's `nonceManager`, retrying once on `nonce too low`/`replacement transaction underpriced`, and returns the tx hash **without waiting for a receipt** (Vercel's function timeout is the constraint) — `web/app/api/world/verify/route.ts:153-191`.

`GET /api/world/rp-context` signs a fresh RP context for the widget — `web/app/api/world/rp-context/route.ts:17-36`.

## Alternative paths (F1–F5)

| # | Event | Detection point | HTTP code / revert | UI `data-state` |
|---|---|---|---|---|
| F1 | User cancels the widget | `onOpenChange(false)` fires while still in the `open` state (before `onSuccess`/`onError`) — `web/components/WorldVerifyButton.tsx:145-158` | n/a (client-only) | `cancelled` |
| F2 | Credential unavailable or a mismatched credential is returned | IDKit error `credential_unavailable`, or server `422 CREDENTIAL_MISMATCH` (step 3) / `422 VERIFICATION_FAILED` (step 5) | `422 CREDENTIAL_MISMATCH` / `422 VERIFICATION_FAILED` | `credential-unavailable` / `credential-mismatch` |
| F3 | Same person tries a second wallet | Operator tx reverts `NullifierAlreadyUsed(boundTo)` on-chain; server pre-checks the same condition (step 7) | `409 NULLIFIER_ALREADY_USED` (server) / `NullifierAlreadyUsed` (on-chain) | `nullifier-used` |
| F4 | `buy()` called directly from an unverified wallet (bypassing the UI) | `InvoiceMarket.buy` checks `isVerified[msg.sender]` before anything else — `contracts/src/InvoiceMarket.sol:175` | revert `NotVerifiedInvestor(address)` | n/a — no UI path produces this; only a direct contract call |
| F5 | A proof for wallet A is submitted with `investor = B` | Local signal check (step 4) — the hash of `B` never matches the `signal_hash` bound to `A`'s proof | `422 SIGNAL_MISMATCH` | `signal-mismatch` |

## Debrief

### Time to first success

<!-- FILL-H1: minutes from spike-world.md once a live World ID verification succeeds -->

Not yet measured end-to-end: live verification is blocked on the World ID Developer Portal
credentials (`NEXT_PUBLIC_WORLD_APP_ID`, `WORLD_RP_ID`, `WORLD_RP_SIGNING_KEY`), which as of this
writing haven't landed in the environment (`.omc/research/spike-world.md`, "Timeline"). What's
already verified without live credentials: `GET /api/world/rp-context` correctly returns
`{"code":"WORLD_NOT_CONFIGURED"}` (503) with no env set; the widget page renders with zero console
errors, with its verify button correctly disabled until `NEXT_PUBLIC_WORLD_APP_ID` exists; and
`npx tsc --noEmit` is clean across the whole integration. The moment credentials land, no further
code changes are expected before a first live run.

### Friction

- **`signRequest()`'s camelCase output vs the widget's snake_case input.** `@worldcoin/idkit-core/signing`'s `signRequest({ signingKeyHex, action })` returns `{ sig, nonce, createdAt, expiresAt }`, but `IDKitRequestWidget`'s `rp_context` prop wants `{ rp_id, nonce, created_at, expires_at, signature }` — and `rp_id` isn't even in the signer's output, it's just the `WORLD_RP_ID` env var. Missing this remap produces a silent `invalid_rp_signature` with no hint that it's a field-naming problem. We had to write the remap explicitly (`web/app/api/world/rp-context/route.ts:24-35`).
- **The `passport()` preset's own documentation is effectively "coming soon".** The public docs prose doesn't enumerate the preset factories or their options; the only reliable source was reading `@worldcoin/idkit/dist/index.d.ts` and `@worldcoin/idkit-core/dist/index.d.ts` directly.
- **Simulator readiness for v4 Passport is unconfirmed from docs alone.** `simulator.worldcoin.org` states outright that "this simulator will change with the adoption of World ID 4.0" — there's no way to know from documentation whether a Passport request actually completes there; it needs a live run to find out, and the test identity we found had no pre-configured credentials.
- **`/api/v4/verify` does not check the signal itself.** Its documented request/response schema has no signal parameter and no signal-mismatch error code — signal verification is entirely the relying party's own responsibility (see the improvement below).
- **`orbLegacy`'s response identifier is `"proof_of_human"`, not `"orb"`.** An earlier pass assumed `"orb"` based on a summary of World's public docs page; the actual installed SDK's type comments (and an independent spike) both confirm the legacy Orb v3 response and the v4 `proofOfHuman` response share the identifier `"proof_of_human"` — Orb is the verification *method*, `proof_of_human` is the credential *type* it issues.
- **Docs prose vs. shipped SDK types disagree often enough that we stopped trusting the prose.** Every non-trivial fact in this integration (`signal_hash` location, identifier values, error codes, widget prop names) was ultimately confirmed by reading the published `.d.ts` files under `node_modules`, not by reading docs.world.org.

### Missing capability / docs

- World's own `/api/v4/verify` has no way to express "and also check this signal server-side" or to return a distinct error code when a signal doesn't match — every RP has to reimplement the local hash-and-compare check correctly, with no help from the API if they get it wrong.
- No canonical, versioned reference table of `identifier` values per preset (passport/proofOfHuman/orbLegacy/selfieCheck/mnc/identityCheck) exists in the public docs — we had to derive it from `.d.ts` doc comments and `issuer_schema_id` cross-checks, then independently confirm it via a spike.
- No documented guarantee (or even a clear statement either way) of Passport support in the public simulator for v4 — a developer building against Passport today can't tell from docs alone whether their staging tests will actually complete.

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
