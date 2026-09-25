#!/usr/bin/env -S node --import tsx
/**
 * CLI diagnostic for the Seikyu ENS read paths (see `.omc/research/spike-ens-read.md`
 * and `@/lib/ens`). Prints the 8 text records for an invoice name, whether it
 * resolves, and its ENS registry status.
 *
 * Usage:
 *   pnpm -C web exec tsx scripts/check-ens.ts <name>
 *     Full path: resolves the id from the name's label (`inv-<id>`), reads
 *     the registrar for the resolver, reads records via path R, and reports
 *     liveness (path L) + ENS registry status.
 *     Requires env: NEXT_PUBLIC_INVOICE_REGISTRAR, NEXT_PUBLIC_USER_REGISTRY.
 *     Optional env: NEXT_PUBLIC_UNIVERSAL_RESOLVER_V2 (used for the RESOLVES
 *     check instead of the registrar's own `isLive`, when set).
 *
 *   pnpm -C web exec tsx scripts/check-ens.ts --resolver <address> --name <name>
 *     Resolver-only path: reads records straight off a resolver (path R),
 *     bypassing the registrar entirely. Useful against a spike-deployed
 *     resolver before the real InvoiceRegistrar exists — see
 *     `spike/ens-read/spike.ts`. Point NEXT_PUBLIC_SEPOLIA_RPC_URL at your
 *     anvil fork to test against it, e.g.:
 *       NEXT_PUBLIC_SEPOLIA_RPC_URL=http://127.0.0.1:8546 \
 *         pnpm -C web exec tsx scripts/check-ens.ts --resolver 0x... --name inv-1.seikyu.eth
 *
 * Exits non-zero (with a clear message) if required env/args are missing.
 */
import { type Address, encodeFunctionData, keccak256, stringToHex } from "viem";
import { namehash } from "viem/ens";
import { RECORD_KEYS } from "@/lib/invoices";
import { dnsEncode, ensPublicClient, idFromLabel, readRecords } from "@/lib/ens";

function usageAndExit(message: string): never {
  console.error(`error: ${message}`);
  console.error("");
  console.error("usage:");
  console.error("  tsx scripts/check-ens.ts <name>");
  console.error("  tsx scripts/check-ens.ts --resolver <address> --name <name>");
  process.exit(1);
}

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

function requireAddressEnv(name: string): Address {
  const value = process.env[name];
  if (!value || !ADDRESS_RE.test(value)) {
    usageAndExit(`env ${name} is not set to a valid 0x-address`);
  }
  return value as Address;
}

function optionalAddressEnv(name: string): Address | null {
  const value = process.env[name];
  return value && ADDRESS_RE.test(value) ? (value as Address) : null;
}

function printRecords(records: Record<string, string>) {
  for (const key of RECORD_KEYS) {
    console.log(`records[${key}]=${records[key] ?? ""}`);
  }
}

// Minimal ABIs — same sources as web/lib/ens.ts and web/lib/invoices.ts.
const registrarAbi = [
  {
    type: "function",
    name: "resolverOf",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "nameOf",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "isLive",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const universalResolverAbi = [
  {
    type: "function",
    name: "resolve",
    stateMutability: "view",
    inputs: [
      { name: "name", type: "bytes" },
      { name: "data", type: "bytes" },
    ],
    outputs: [
      { name: "", type: "bytes" },
      { name: "", type: "address" },
    ],
  },
] as const;

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

// `IPermissionedRegistry.Status`: 0 AVAILABLE, 1 RESERVED, 2 REGISTERED.
const userRegistryAbi = [
  {
    type: "function",
    name: "getState",
    stateMutability: "view",
    inputs: [{ name: "anyId", type: "uint256" }],
    outputs: [
      {
        name: "state",
        type: "tuple",
        components: [
          { name: "status", type: "uint8" },
          { name: "expiry", type: "uint64" },
          { name: "latestOwner", type: "address" },
          { name: "tokenId", type: "uint256" },
          { name: "resource", type: "uint256" },
        ],
      },
    ],
  },
] as const;
const LIVE_STATES = ["AVAILABLE", "RESERVED", "REGISTERED"] as const;

async function resolverOnlyMode(resolver: Address, name: string) {
  const records = await readRecords(resolver, name);
  printRecords(records);
}

async function fullMode(name: string) {
  let id: bigint;
  try {
    id = idFromLabel(name);
  } catch (err) {
    usageAndExit(err instanceof Error ? err.message : String(err));
  }

  const registrar = requireAddressEnv("NEXT_PUBLIC_INVOICE_REGISTRAR");
  const userRegistry = requireAddressEnv("NEXT_PUBLIC_USER_REGISTRY");
  const universalResolver = optionalAddressEnv("NEXT_PUBLIC_UNIVERSAL_RESOLVER_V2");

  const resolver = await ensPublicClient.readContract({
    address: registrar,
    abi: registrarAbi,
    functionName: "resolverOf",
    args: [id],
  });

  const records = await readRecords(resolver, name);
  printRecords(records);

  let resolves: boolean;
  if (universalResolver) {
    try {
      // Any well-formed profile call proves resolution works; reuse "status".
      const probe = encodeFunctionData({
        abi: textAbi,
        functionName: "text",
        args: [namehash(name), "status"],
      });
      await ensPublicClient.readContract({
        address: universalResolver,
        abi: universalResolverAbi,
        functionName: "resolve",
        args: [dnsEncode(name), probe],
      });
      resolves = true;
    } catch {
      resolves = false;
    }
  } else {
    resolves = await ensPublicClient.readContract({
      address: registrar,
      abi: registrarAbi,
      functionName: "isLive",
      args: [id],
    });
  }
  console.log(`RESOLVES: ${resolves}`);

  const label = name.split(".")[0] ?? "";
  const labelhash = keccak256(stringToHex(label));
  const state = await ensPublicClient.readContract({
    address: userRegistry,
    abi: userRegistryAbi,
    functionName: "getState",
    args: [BigInt(labelhash)],
  });
  console.log(`LIVE_STATE: ${LIVE_STATES[state.status] ?? `UNKNOWN(${state.status})`}`);
}

async function main() {
  const args = process.argv.slice(2);

  const resolverFlagIndex = args.indexOf("--resolver");
  const nameFlagIndex = args.indexOf("--name");
  if (resolverFlagIndex !== -1 || nameFlagIndex !== -1) {
    const resolver = args[resolverFlagIndex + 1];
    const name = args[nameFlagIndex + 1];
    if (!resolver || !ADDRESS_RE.test(resolver) || !name) {
      usageAndExit("--resolver <address> and --name <name> are both required in this mode");
    }
    await resolverOnlyMode(resolver as Address, name);
    return;
  }

  const [name] = args;
  if (!name) {
    usageAndExit("missing <name> argument");
  }
  await fullMode(name);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
