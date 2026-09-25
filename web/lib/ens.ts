// ENS v2 (ENSv2/Namechain) resolver reads for Seikyu invoices.
//
// IMPORTANT: never use viem's `getEnsText` / `getEnsResolver`, or a registry's
// `getResolver`, for record reads. Those resolve through the ENS *registry*,
// which reports nothing once a name's registration has expired — even though
// our PermissionedResolver still holds the records and the InvoiceRegistrar
// still knows which resolver belongs to which invoice and whether it's live.
//
// Path R (`readRecords`) reads records straight off the per-invoice resolver
// via `resolve()` + a read-multicall of `text(node,key)` calls, which stays
// correct after expiry because it never touches the registry.
// Path L (`isLive`) asks the InvoiceRegistrar directly for the same reason.
//
// See `.omc/research/spike-ens-read.md` for how path R's calldata layout was
// verified against a live PermissionedResolver proxy on an anvil Sepolia fork.
import {
  type Address,
  type Hex,
  createPublicClient,
  decodeAbiParameters,
  decodeFunctionResult,
  encodeFunctionData,
  fallback,
  http,
  toHex,
} from "viem";
import { sepolia } from "viem/chains";
import { namehash, packetToBytes } from "viem/ens";
import { publicEnv } from "@/lib/env";
import { iPermissionedResolverAbi, invoiceRegistrarAbi } from "@/lib/generated";
import { RECORD_KEYS, type InvoiceRecords } from "@/lib/invoices";

/** DNS-encode an ENS name (e.g. `inv-7.seikyu.eth`) for `resolve(bytes,bytes)`. */
export function dnsEncode(name: string): Hex {
  return toHex(packetToBytes(name));
}

/** namehash(name) — the ENS node identifier used by profile calls like `text()`. */
export function nodeOf(name: string): Hex {
  return namehash(name);
}

/** Parse the numeric invoice id out of a name's label, e.g. `inv-7.seikyu.eth` -> 7n. */
export function idFromLabel(name: string): bigint {
  const label = name.split(".")[0] ?? "";
  const match = /^inv-(\d+)$/.exec(label);
  if (!match) {
    throw new Error(`not a Seikyu invoice name (expected "inv-<id>.…"): ${name}`);
  }
  return BigInt(match[1]);
}

/** Shared read-only Sepolia client for resolver/registrar reads in this module. */
export const ensPublicClient = createPublicClient({
  chain: sepolia,
  transport: fallback([
    ...(publicEnv.NEXT_PUBLIC_SEPOLIA_RPC_URL
      ? [http(publicEnv.NEXT_PUBLIC_SEPOLIA_RPC_URL)]
      : []),
    http(),
  ]),
});

// `resolve`/`multicall` (real contract calls, on the PermissionedResolver)
// and `recordsOf`/`isLive` (on the InvoiceRegistrar) come from `@/lib/generated`
// (wagmi cli) now that both contracts are generated. `text` stays hand-written
// below: it's never called as a top-level contract function here — it's only
// used to encode/decode the *inner* calls of the `resolve()` read-multicall
// payload, i.e. it's the standard `ITextResolver` profile-call shape, not a
// function this repo's contracts declare in their own ABI.
const resolveAbi = iPermissionedResolverAbi;
const multicallAbi = iPermissionedResolverAbi;
const registrarRecordsAbi = invoiceRegistrarAbi;
const registrarIsLiveAbi = invoiceRegistrarAbi;

/** `ITextResolver.text` — encoded as the inner calls of a resolver read-multicall. */
const textAbi = [
  {
    type: "function",
    name: "text",
    stateMutability: "view",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" },
    ],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

/**
 * Path R: read all 8 invoice text records straight off the resolver via
 * `resolve()` + a read-multicall of `text(node,key)` calls, in one RPC round
 * trip. Works even after the name's ENS registration has expired, because it
 * never touches the registry.
 *
 * `resolve()`'s multicall branch returns `abi.encode(bytes[])` — one layer of
 * encoding beyond `resolve`'s own `bytes` return type (see
 * `AbstractRecordResolver.resolve`) — so the outer `bytes` is decoded as a
 * `bytes[]` before each element is decoded as a `text()` result.
 */
export async function readRecords(resolver: Address, name: string): Promise<InvoiceRecords> {
  const dnsName = dnsEncode(name);
  const node = nodeOf(name);

  const calls = RECORD_KEYS.map((key) =>
    encodeFunctionData({ abi: textAbi, functionName: "text", args: [node, key] }),
  );
  const multicallData = encodeFunctionData({
    abi: multicallAbi,
    functionName: "multicall",
    args: [calls],
  });

  const outer = await ensPublicClient.readContract({
    address: resolver,
    abi: resolveAbi,
    functionName: "resolve",
    args: [dnsName, multicallData],
  });

  const [results] = decodeAbiParameters([{ type: "bytes[]" }], outer);

  const entries = RECORD_KEYS.map((key, i) => {
    const value = decodeFunctionResult({
      abi: textAbi,
      functionName: "text",
      data: results[i],
    });
    return [key, value] as const;
  });

  return Object.fromEntries(entries) as InvoiceRecords;
}

/**
 * Path-R fallback: read all 8 records in one call via the InvoiceRegistrar's
 * own `recordsOf(id)` mirror, bypassing the resolver entirely. Only used if
 * the resolver read-multicall route (above) turns out unusable — see the
 * kill rule in `.omc/research/spike-ens-read.md`.
 */
export async function readRecordsFromRegistrar(
  name: string,
  registrar: Address,
): Promise<InvoiceRecords> {
  const id = idFromLabel(name);
  const values = await ensPublicClient.readContract({
    address: registrar,
    abi: registrarRecordsAbi,
    functionName: "recordsOf",
    args: [id],
  });
  const entries = RECORD_KEYS.map((key, i) => [key, values[i]] as const);
  return Object.fromEntries(entries) as InvoiceRecords;
}

/**
 * Path L: is this invoice's ENS name currently live? Delegates entirely to
 * the InvoiceRegistrar's own `isLive(id)` — never the ENS registry/Universal
 * Resolver, which report the wrong thing post-expiry (see module doc comment).
 */
export async function isLive(name: string, registrar: Address): Promise<boolean> {
  const id = idFromLabel(name);
  return ensPublicClient.readContract({
    address: registrar,
    abi: registrarIsLiveAbi,
    functionName: "isLive",
    args: [id],
  });
}
