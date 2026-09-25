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
 *     { investor: walletA, result } with the last hex character of every
 *     `responses[].proof` entry flipped. The signal binding (bound to
 *     walletA) still matches, but World's own /api/v4/verify rejects the
 *     corrupted proof — expected: 422 VERIFICATION_FAILED.
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

const result = JSON.parse(readFileSync(resolve(resultPath), "utf8")) as Record<string, unknown>;

function flipLastHexChar(hex: string): string {
  if (!/^0x[0-9a-fA-F]+$/.test(hex)) {
    throw new Error(`expected a 0x-hex string, got: ${hex}`);
  }
  const table = "0123456789abcdef";
  const last = hex[hex.length - 1].toLowerCase();
  const flipped = table[(table.indexOf(last) + 1) % table.length];
  return hex.slice(0, -1) + flipped;
}

function corruptProof(proof: unknown): unknown {
  if (Array.isArray(proof)) {
    return proof.map((entry) => (typeof entry === "string" ? flipLastHexChar(entry) : entry));
  }
  if (typeof proof === "string") {
    return flipLastHexChar(proof);
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
