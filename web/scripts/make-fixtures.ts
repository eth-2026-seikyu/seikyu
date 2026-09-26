#!/usr/bin/env -S node --import tsx
/**
 * Builds AC-10 fixtures for POST /api/world/verify from a real, successful
 * IDKit v4 result (captured by the World spike — see
 * .omc/research/spike-world.md).
 *
 * Usage:
 *   pnpm -C web exec tsx scripts/make-fixtures.ts <result.json> <walletA> <walletB>
 *
 * Writes:
 *   scripts/fixtures/bad-proof.json
 *     { investor: walletA, result } with every `responses[].proof` entry
 *     corrupted (see `corruptFieldElement` — decimal field elements are
 *     bumped by 1, hex strings have their last nibble flipped). The signal
 *     binding (bound to walletA) still matches, but World's own
 *     /api/v4/verify rejects the corrupted proof — expected:
 *     422 VERIFICATION_FAILED.
 *   scripts/fixtures/signal-mismatch.json
 *     { investor: walletB, result } — the *untouched* result (which was
 *     signal-bound to walletA when the proof was generated) submitted under
 *     a different investor address. Our own signal_hash check rejects this
 *     before it ever reaches World — expected: 422 SIGNAL_MISMATCH.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const [, , resultPath, walletA, walletB] = process.argv;

if (!resultPath || !walletA || !walletB) {
  console.error("usage: tsx scripts/make-fixtures.ts <result.json> <walletA> <walletB>");
  process.exit(1);
}

const addressRe = /^0x[0-9a-fA-F]{40}$/;
if (!addressRe.test(walletA) || !addressRe.test(walletB)) {
  console.error("walletA and walletB must both be 0x-addresses");
  process.exit(1);
}

const raw = JSON.parse(readFileSync(resolve(resultPath), "utf8")) as Record<string, unknown>;
// Accept either a bare IDKit result, or a spike capture file shaped like
// .omc/research/world-result-investorA.json ({ meta, idkit_onSuccess_result,
// verify_api_response, signal_hash_verification }) -- unwrap the latter.
const result = (
  raw.idkit_onSuccess_result && typeof raw.idkit_onSuccess_result === "object"
    ? raw.idkit_onSuccess_result
    : raw
) as Record<string, unknown>;

function flipLastHexChar(hex: string): string {
  const table = "0123456789abcdef";
  const last = hex[hex.length - 1].toLowerCase();
  const flipped = table[(table.indexOf(last) + 1) % table.length];
  return hex.slice(0, -1) + flipped;
}

/**
 * Corrupts a single proof field element so it's wrong but still
 * syntactically valid, whichever form World hands it back in.
 *
 * Real v4 `responses[].proof` entries are DECIMAL-string field elements
 * (confirmed via .omc/research/world-result-investorA.json — e.g.
 * "13586708970665106381745288208973107748208932217529228854957135199212447396569"),
 * not hex, despite the plan's "flip the last hex char" phrasing (written
 * before a real result existed). Bumping the decimal value by 1 keeps it a
 * valid field-element-shaped number while making the proof wrong. The
 * `0x`-hex branch is kept for forward-compatibility in case a future
 * result shape uses hex proof strings instead.
 */
function corruptFieldElement(value: string): string {
  if (/^0x[0-9a-fA-F]+$/.test(value)) {
    return flipLastHexChar(value);
  }
  if (/^[0-9]+$/.test(value)) {
    return (BigInt(value) + 1n).toString();
  }
  throw new Error(`expected a 0x-hex or decimal numeric string, got: ${value}`);
}

function corruptProof(proof: unknown): unknown {
  if (Array.isArray(proof)) {
    return proof.map((entry) => (typeof entry === "string" ? corruptFieldElement(entry) : entry));
  }
  if (typeof proof === "string") {
    return corruptFieldElement(proof);
  }
  return proof;
}

const badProofResult = structuredClone(result);
const responses = badProofResult.responses;
if (Array.isArray(responses)) {
  for (const response of responses) {
    if (response && typeof response === "object" && "proof" in response) {
      (response as Record<string, unknown>).proof = corruptProof(
        (response as Record<string, unknown>).proof,
      );
    }
  }
}

const fixturesDir = resolve(__dirname, "fixtures");
mkdirSync(fixturesDir, { recursive: true });

writeFileSync(
  resolve(fixturesDir, "bad-proof.json"),
  JSON.stringify({ investor: walletA, result: badProofResult }, null, 2) + "\n",
);

writeFileSync(
  resolve(fixturesDir, "signal-mismatch.json"),
  JSON.stringify({ investor: walletB, result }, null, 2) + "\n",
);

console.log("wrote scripts/fixtures/bad-proof.json and scripts/fixtures/signal-mismatch.json");
