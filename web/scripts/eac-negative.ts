#!/usr/bin/env -S node --import tsx
/**
 * Negative-path proof for the accountant's ENSv2 Enhanced Access Control
 * setter role: the debtor's AP wallet can write `ack` (the one key
 * `InvoiceRegistrar.registerInvoice` grants it via `grantSetterRoles`), but
 * gets `EACUnauthorizedAccountRoles` reverts on `amount`/`status` — roles
 * only the InvoiceRegistrar itself holds on the resolver. See
 * `contracts/src/InvoiceRegistrar.sol` and `@/lib/abi/permissionedResolver`.
 *
 * Usage:
 *   pnpm -C web exec tsx scripts/eac-negative.ts <name> [--rpc <url>] [--registrar <address>]
 *
 * Example (anvil fork rehearsal):
 *   pnpm -C web exec tsx scripts/eac-negative.ts inv-1.seikyu.eth \
 *     --rpc http://127.0.0.1:8550 --registrar 0x...
 *
 * Config:
 *   Registrar address: --registrar, else `@/lib/deployments` (once deployed —
 *   pre-deploy it's the zero-address placeholder and is skipped), else
 *   NEXT_PUBLIC_INVOICE_REGISTRAR (web/.env.e2e or process.env).
 *   RPC: --rpc, else SEPOLIA_RPC_URL (web/.env.e2e or process.env), else the
 *   public Sepolia RPC. Chain id is detected from the RPC, so this also runs
 *   unmodified against a plain `anvil` fork.
 *   Private key: DEBTOR_AP_PK in web/.env.e2e — the wallet granted the
 *   `ack`-only setter role at issuance.
 *
 * Prints exactly 3 result lines and exits non-zero if any check fails:
 *   ack: OK (tx 0x…)
 *   amount: REVERTED (EACUnauthorizedAccountRoles)
 *   status: REVERTED (EACUnauthorizedAccountRoles)
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  type Address,
  type Chain,
  type Hex,
  BaseError,
  ContractFunctionRevertedError,
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { idFromLabel } from "@/lib/ens";
import { EAC_UNAUTHORIZED_ERROR, permissionedResolverAbi, registrarAbi } from "@/lib/abi/permissionedResolver";

const __dirname = dirname(fileURLToPath(import.meta.url));

////////////////////////////////////////////////////////////////////////////
// Config loading — same dotenv/`@/lib/deployments` convention as
// scripts/e2e-sepolia.ts.
////////////////////////////////////////////////////////////////////////////

/** Tiny dotenv-style parser — no new deps. `KEY=value` per line, `#` comments, optional quotes. */
function loadDotEnv(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const out: Record<string, string> = {};
  for (const rawLine of readFileSync(path, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const dotEnv = loadDotEnv(resolve(__dirname, "..", ".env.e2e"));

function envVar(name: string): string | undefined {
  return process.env[name] ?? dotEnv[name];
}

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const PK_RE = /^0x[a-fA-F0-9]{64}$/;
const ZERO_ADDRESS_RE = /^0x0{40}$/i;

/** Loads `@/lib/deployments`'s `invoiceRegistrar` if the file exists and it's past the pre-deploy placeholder. */
async function loadRegistrarFromDeployments(): Promise<Address | undefined> {
  const abs = resolve(__dirname, "..", "lib", "deployments.ts");
  if (!existsSync(abs)) return undefined;
  try {
    const mod = (await import(pathToFileURL(abs).href)) as Record<string, unknown>;
    const deployments = mod.sepoliaDeployments as Record<string, unknown> | undefined;
    const value = deployments?.invoiceRegistrar;
    if (typeof value !== "string" || !ADDRESS_RE.test(value) || ZERO_ADDRESS_RE.test(value)) {
      return undefined;
    }
    return value as Address;
  } catch {
    return undefined;
  }
}

function usageAndExit(message: string): never {
  console.error(`error: ${message}`);
  console.error("");
  console.error("usage: eac-negative.ts <name> [--rpc <url>] [--registrar <address>]");
  process.exit(1);
}

interface Args {
  name: string;
  rpc?: string;
  registrar?: Address;
}

function parseArgs(argv: string[]): Args {
  let name: string | undefined;
  let rpc: string | undefined;
  let registrar: Address | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--rpc") {
      rpc = argv[++i];
    } else if (arg === "--registrar") {
      const value = argv[++i];
      if (!value || !ADDRESS_RE.test(value)) usageAndExit("--registrar requires a 0x-address");
      registrar = value as Address;
    } else if (arg && !arg.startsWith("--") && !name) {
      name = arg;
    }
  }
  if (!name) usageAndExit("missing <name>");
  return { name, rpc, registrar };
}

function describeRevert(err: unknown): { errorName?: string; message: string } {
  if (err instanceof BaseError) {
    const revertError = err.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revertError instanceof ContractFunctionRevertedError) {
      return { errorName: revertError.data?.errorName, message: err.shortMessage };
    }
    return { message: err.shortMessage };
  }
  return { message: err instanceof Error ? err.message : String(err) };
}

/** Detect chain id from the RPC itself so this also works unmodified against a plain `anvil` node. */
async function detectChain(rpcUrl: string): Promise<Chain> {
  const probe = createPublicClient({ transport: http(rpcUrl) });
  const id = await probe.getChainId();
  if (id === sepolia.id) return sepolia;
  return defineChain({
    id,
    name: `local-${id}`,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  });
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const rpcUrl = args.rpc ?? envVar("SEPOLIA_RPC_URL") ?? "https://ethereum-sepolia-rpc.publicnode.com";

  const envRegistrar = envVar("NEXT_PUBLIC_INVOICE_REGISTRAR");
  const registrar =
    args.registrar ??
    (await loadRegistrarFromDeployments()) ??
    (envRegistrar && ADDRESS_RE.test(envRegistrar) ? (envRegistrar as Address) : undefined);
  if (!registrar) {
    usageAndExit(
      "no registrar address: pass --registrar, deploy (@/lib/deployments), or set NEXT_PUBLIC_INVOICE_REGISTRAR",
    );
  }

  const apPk = envVar("DEBTOR_AP_PK");
  if (!apPk || !PK_RE.test(apPk)) {
    usageAndExit("DEBTOR_AP_PK is not set to a valid 0x private key (web/.env.e2e)");
  }
  const ap = privateKeyToAccount(apPk as Hex);

  let id: bigint;
  try {
    id = idFromLabel(args.name);
  } catch (err) {
    usageAndExit(err instanceof Error ? err.message : String(err));
  }

  const chain = await detectChain(rpcUrl);
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account: ap, chain, transport: http(rpcUrl) });

  const [resolver, dnsName] = await Promise.all([
    publicClient.readContract({ address: registrar, abi: registrarAbi, functionName: "resolverOf", args: [id] }),
    publicClient.readContract({ address: registrar, abi: registrarAbi, functionName: "dnsNameOf", args: [id] }),
  ]);

  if (ZERO_ADDRESS_RE.test(resolver)) {
    console.error(`error: registrar has no resolver for invoice id ${id} (unknown invoice)`);
    process.exit(1);
  }

  let failed = false;

  // 1. ack — the AP wallet's own granted key. Real tx.
  try {
    const { request } = await publicClient.simulateContract({
      address: resolver,
      abi: permissionedResolverAbi,
      functionName: "setText",
      args: [dnsName, "ack", "acknowledged"],
      account: ap,
      chain,
    });
    const hash = await walletClient.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") {
      console.log(`ack: FAILED (tx ${hash} reverted on-chain)`);
      failed = true;
    } else {
      console.log(`ack: OK (tx ${hash})`);
    }
  } catch (err) {
    console.log(`ack: FAILED (${describeRevert(err).message})`);
    failed = true;
  }

  // 2 & 3. amount/status — roles only the registrar holds on the resolver. Expect a revert.
  for (const key of ["amount", "status"] as const) {
    try {
      await publicClient.simulateContract({
        address: resolver,
        abi: permissionedResolverAbi,
        functionName: "setText",
        args: [dnsName, key, "1"],
        account: ap,
        chain,
      });
      console.log(`${key}: FAILED (expected a revert, simulate succeeded — EAC is not enforced)`);
      failed = true;
    } catch (err) {
      const { errorName, message } = describeRevert(err);
      if (errorName === EAC_UNAUTHORIZED_ERROR) {
        console.log(`${key}: REVERTED (${errorName})`);
      } else {
        console.log(`${key}: FAILED (expected ${EAC_UNAUTHORIZED_ERROR}, got ${errorName ?? message})`);
        failed = true;
      }
    }
  }

  if (failed) process.exit(1);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? (err.stack ?? err.message) : String(err));
  process.exit(1);
});
