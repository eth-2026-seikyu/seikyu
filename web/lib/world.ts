import { orbLegacy, passport, proofOfHuman, selfieCheck } from "@worldcoin/idkit";
import type { Preset } from "@worldcoin/idkit";
import { hashSignal } from "@worldcoin/idkit-core/hashing";
import { toHex, type Address, type Hex } from "viem";
import type { PublicEnv, WorldPreset } from "@/lib/env";
import { invoiceMarketAbi } from "@/lib/generated";

/**
 * World ID integration helpers shared by the /api/world/* routes and
 * WorldVerifyButton.
 *
 * SDK sources cited throughout are `@worldcoin/idkit@4.3.0` /
 * `@worldcoin/idkit-core@4.3.0` (installed under web/node_modules), read
 * directly since the public docs don't enumerate every field.
 */

/**
 * Builds the IDKit preset object for the configured preset name via the
 * real preset factories exported by `@worldcoin/idkit` (re-exported from
 * `@worldcoin/idkit-core`; see `web/node_modules/@worldcoin/idkit/dist/index.d.ts`).
 *
 * `signal`, when provided, is forwarded into the preset so the resulting
 * v4 proof response carries a `signal_hash` bound to it (see `hashSignalV4`
 * below and the U-7 signal-binding note in `/api/world/verify`). The plan
 * only specified `buildPreset(env)`; the optional `signal` param is an
 * additive extension — WorldVerifyButton is the only caller and always
 * passes the investor address so the server's signal check has something
 * to check against.
 */
export function buildPreset(env: PublicEnv, signal?: string): Preset {
  const opts = signal !== undefined ? { signal } : undefined;
  switch (env.NEXT_PUBLIC_WORLD_PRESET) {
    case "passport":
      return passport(opts);
    case "proofOfHuman":
      return proofOfHuman(opts);
    case "orbLegacy":
      return orbLegacy(opts);
    case "selfieCheck":
      return selfieCheck(opts);
  }
}

/**
 * `allow_legacy_proofs` value to use for `IDKitRequestConfig` given the
 * configured preset. Matches the idkit-core JSDoc examples for each preset
 * factory (dist/index.d.ts): `passport`/`selfieCheck` → false;
 * `proofOfHuman`/`orbLegacy` → true (`orbLegacy`'s is mandatory — "This
 * preset only returns World ID 3.0 proofs").
 *
 * Allowing legacy fallback for `proofOfHuman` is safe for our server-side
 * checks: a v3-fallback response (`ResponseItemV3`) carries the *same*
 * `"proof_of_human"` identifier as the v4 response (see `expectedIdentifier`
 * below — both are literally `identifier: "proof_of_human"`), and
 * `ResponseItemV3` still carries an optional `signal_hash`, so the signal
 * check in /api/world/verify still works either way.
 */
export function allowLegacyProofsFor(preset: WorldPreset): boolean {
  return preset === "proofOfHuman" || preset === "orbLegacy";
}

export type WorldEnvironment = "staging" | "sandbox" | "production";

/**
 * The World `environment` (`IDKitRequestConfig.environment`) the widget
 * requests proofs for, and what /api/world/verify's step-6 check compares
 * World's verify-response `environment` field against.
 *
 * Confirmed live (C0's simulator run, .omc/research/world-result-investorA.json):
 * `environment: "staging"` makes the widget show the "Use the simulator"
 * link; `"production"` shows only a real-World-App QR. `"sandbox"` is a
 * third option (World ID Sandbox phone app) verified on the SAME production
 * endpoint (`https://developer.world.org/api/v4/verify/{rp_id}` — no
 * separate sandbox endpoint), per World's docs. World's own `/api/v4/verify`
 * also enforces this server-side — it 403s with `environment_not_allowed`
 * when the requested environment isn't opened for the app (mapped to
 * 422 VERIFICATION_FAILED with World's `code`/`detail` passed through like
 * any other non-2xx, see step 5).
 *
 * Deliberately NOT added to web/lib/env.ts's publicEnv (that file is
 * B0's) — read directly here instead, and used on BOTH the client
 * (WorldVerifyButton) and the server (verify/route.ts, replacing a
 * separate WORLD_ENV server var) so the two can never drift out of sync.
 *
 * Set via `NEXT_PUBLIC_WORLD_ENVIRONMENT` ("staging" | "sandbox" |
 * "production", default "staging" for the simulator demo). Document this in
 * web/.env.example if you can add to it — that file is B0's too, so the
 * contract lives here instead.
 */
export function worldEnvironment(): WorldEnvironment {
  const raw = process.env.NEXT_PUBLIC_WORLD_ENVIRONMENT;
  return raw === "production" || raw === "sandbox" ? raw : "staging";
}

/**
 * The `x-staging-verification-token` header value World's
 * `/api/v4/verify/{rp_id}` requires on staging/sandbox proofs (NOT
 * production) once a human has opened a staging verification window for
 * the app in World's developer portal. A staging/sandbox request missing
 * this header gets rejected by World itself; /api/world/verify checks for
 * it up front instead and returns a clearer `503 STAGING_TOKEN_MISSING`
 * for the demo rather than surfacing World's own error for it.
 *
 * Server-only secret — deliberately NOT added to web/lib/env.ts's
 * serverEnv() (that file is B0's); read directly via
 * `process.env.WORLD_STAGING_VERIFICATION_TOKEN` here instead. Set it in
 * web/.env.local (see web/.env.example).
 */
export function stagingVerificationToken(): string | undefined {
  return process.env.WORLD_STAGING_VERIFICATION_TOKEN;
}

/**
 * Expected `responses[0].identifier` value for the configured preset.
 *
 * Sources (all from `@worldcoin/idkit-core` v4.3.0):
 * - "passport": `ResponseItemV4.identifier` doc comment in dist/index.d.ts —
 *   "Credential identifier (e.g., "proof_of_human", "passport", "mnc")" —
 *   cross-checked against `issuer_schema_id` (9303 = passport).
 * - "proof_of_human" for BOTH `proofOfHuman` (v4) and `orbLegacy` (v3):
 *   `proofOfHuman`'s v4 response uses issuer_schema_id 1 = proof_of_human.
 *   `orbLegacy` returns a World ID 3.0 (`ResponseItemV3`) response; its
 *   identifier doc comment reads "Credential identifier (e.g.,
 *   "proof_of_human", "selfie")" — Orb is the verification *method*,
 *   `proof_of_human` is the credential *type* it issues, so the legacy v3
 *   Orb response and the v4 proofOfHuman response share the same identifier
 *   string. (An earlier pass here guessed "orb" from a WebFetch summary of
 *   World's public docs page — that contradicts the actual installed SDK's
 *   type comments and is NOT used; independently corroborated by C0's spike,
 *   see .omc/research/spike-world.md "Identifier values".)
 * - "selfie": `SelfieCheckResponseItemV4.identifier` is a literal type in
 *   dist/index.d.ts: `identifier: "selfie"`.
 */
export function expectedIdentifier(env: PublicEnv): string {
  switch (env.NEXT_PUBLIC_WORLD_PRESET) {
    case "passport":
      return "passport";
    case "proofOfHuman":
    case "orbLegacy":
      return "proof_of_human";
    case "selfieCheck":
      return "selfie";
  }
}

/**
 * Hashes a v4 signal (here, an investor address) the same way idkit-core
 * hashes the `signal` field on a `CredentialRequest`/preset, so the result
 * can be compared byte-for-byte against `responses[0].signal_hash`.
 *
 * Wraps `hashSignal` from `@worldcoin/idkit-core/hashing` — a pure-JS
 * (no WASM) implementation (keccak256 truncated to a field element, see
 * dist/hashing.js) — rather than re-implementing the hashing scheme.
 */
export function hashSignalV4(signal: Address | string): Hex {
  return hashSignal(signal) as Hex;
}

/**
 * Normalizes a nullifier (decimal or `0x`-hex string) to a canonical
 * `0x` + 32-byte hex value, matching how it's stored on-chain
 * (`bytes32` in `MockInvoiceMarket`/the real market).
 *
 * `BigInt()` natively accepts both decimal ("123") and `0x`-prefixed hex
 * strings, so no manual format detection is needed.
 */
export function normalizeNullifier(input: string | bigint): Hex {
  return toHex(BigInt(input), { size: 32 });
}

/**
 * ABI for the invoice market's World ID verification surface —
 * `setVerified`/`isVerified`/`nullifierOwner`, `NullifierAlreadyUsed`, and
 * `InvestorVerified` all live on the generated `invoiceMarketAbi` now that
 * the real InvoiceMarket contract exists.
 */
export const marketAbi = invoiceMarketAbi;

/** Error `code` values returned by the /api/world/* routes' JSON bodies. */
export type WorldErrorCode =
  | "WORLD_NOT_CONFIGURED"
  | "INVALID_BODY"
  | "CREDENTIAL_MISMATCH"
  | "SIGNAL_MISMATCH"
  | "VERIFICATION_FAILED"
  | "WORLD_API_UNAVAILABLE"
  | "ENV_MISMATCH"
  | "NULLIFIER_ALREADY_USED"
  | "OPERATOR_TX_FAILED"
  | "STAGING_TOKEN_MISSING";

/** UI states for WorldVerifyButton — these double as its `data-state` value. */
export type WorldVerifyState =
  | "idle"
  | "open"
  | "verifying"
  | "verified"
  | "cancelled"
  | "credential-unavailable"
  | "credential-mismatch"
  | "signal-mismatch"
  | "nullifier-used"
  | "failed";

/** Maps a server error `code` (from /api/world/verify's JSON body) to the UI state bucket it belongs in. */
export function stateForErrorCode(code: string | undefined): WorldVerifyState {
  switch (code) {
    case "VERIFICATION_FAILED":
      return "credential-unavailable";
    case "CREDENTIAL_MISMATCH":
      return "credential-mismatch";
    case "SIGNAL_MISMATCH":
      return "signal-mismatch";
    case "NULLIFIER_ALREADY_USED":
      return "nullifier-used";
    default:
      return "failed";
  }
}

/** User-facing copy for each WorldVerifyState. */
export function messageFor(state: WorldVerifyState, opts?: { boundTo?: Address }): string {
  switch (state) {
    case "idle":
      return "";
    case "open":
      return "Scan the QR code with World App to continue.";
    case "verifying":
      return "Verifying your World ID…";
    case "verified":
      return "Verified with World ID.";
    case "cancelled":
      return "Verification cancelled — only verified investors can buy receivables.";
    case "credential-unavailable":
      return "World couldn't verify this credential. Please try again.";
    case "credential-mismatch":
      return "This credential doesn't match what this action requires. Try a different verification method.";
    case "signal-mismatch":
      return "This proof wasn't bound to your wallet address. Please retry verification.";
    case "nullifier-used":
      return opts?.boundTo
        ? `This World ID is already linked to ${opts.boundTo}. One investor wallet per person.`
        : "This World ID is already linked to another wallet. One investor wallet per person.";
    case "failed":
      return "Verification failed. Please try again.";
  }
}
