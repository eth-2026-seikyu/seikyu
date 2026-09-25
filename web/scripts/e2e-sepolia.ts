#!/usr/bin/env -S node --import tsx
/**
 * End-to-end driver for the Seikyu invoice flow against a live
 * `InvoiceMarket` deployment — Sepolia, or a local anvil rehearsal (see
 * "Local rehearsal" in the C1b task brief; no Sepolia deployment exists yet).
 *
 * Usage:
 *   pnpm -C web exec tsx scripts/e2e-sepolia.ts --seed
 *   pnpm -C web exec tsx scripts/e2e-sepolia.ts --flow
 *   pnpm -C web exec tsx scripts/e2e-sepolia.ts --status <name>
 *
 * Config:
 *   Addresses come from NEXT_PUBLIC_INVOICE_MARKET / NEXT_PUBLIC_INVOICE_REGISTRAR /
 *   NEXT_PUBLIC_MOCK_USDC / NEXT_PUBLIC_USER_REGISTRY, unless `web/lib/deployments.ts`
 *   (A5's `sepoliaDeployments`) has a real, non-zero address for that contract,
 *   which then takes priority. `deployBlock`/`parentName` from the same module
 *   seed the InvestorVerified log scan's default lower bound and the printed
 *   invoice name, respectively, when available.
 *   RPC from SEPOLIA_RPC_URL (default: public Sepolia RPC). Chain id is
 *   detected from the RPC itself, so this also runs unmodified against a
 *   plain `anvil` node for local rehearsal.
 *   Private keys from `web/.env.e2e` (gitignored, never committed):
 *   SME_PK, INVESTOR_A_PK, DEBTOR_PK, DEBTOR_AP_PK. Addresses for those roles
 *   are derived from the keys, not read separately.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  type Abi,
  type Address,
  type Chain,
  type Hex,
  type TransactionReceipt,
  BaseError,
  ContractFunctionRevertedError,
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  keccak256,
  parseEventLogs,
  parseUnits,
  toBytes,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { idFromLabel } from "@/lib/ens";
import { RECORD_KEYS } from "@/lib/invoices";
import { erc20Abi, marketAbi, registrarAbi, userRegistryAbi } from "./lib/e2e-abis";

const __dirname = dirname(fileURLToPath(import.meta.url));

////////////////////////////////////////////////////////////////////////////
// Config loading
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
const ZERO_ADDRESS: Address = "0x0000000000000000000000000000000000000000";

type DeploymentAddresses = Partial<{
  invoiceMarket: Address;
  invoiceRegistrar: Address;
  mockUsdc: Address;
  userRegistry: Address;
  deployBlock: bigint;
  parentName: string;
}>;

/**
 * `web/lib/deployments.ts` (A5) exports `sepoliaDeployments` — a typed view
 * over `deployments.sepolia.json` with the app-owned addresses set to
 * `ZERO_ADDRESS` pre-deploy. Load it if (and only if) it exists on disk —
 * checked with a plain filesystem path (not the `@/` alias) so this works
 * whether or not tsx's alias resolution covers dynamic imports, and so
 * `tsc --noEmit` never has to resolve a module that may not exist yet.
 */
async function loadDeployments(): Promise<DeploymentAddresses> {
  const abs = resolve(__dirname, "..", "lib", "deployments.ts");
  if (!existsSync(abs)) return {};
  try {
    const mod = (await import(pathToFileURL(abs).href)) as Record<string, unknown>;
    const deployments = mod.sepoliaDeployments as Record<string, unknown> | undefined;
    if (!deployments) return {};

    // Pre-deploy, A5's app-owned addresses are the zero address — treat that
    // the same as "not configured" so env vars still win until a real
    // deployment lands.
    const pickAddr = (key: string): Address | undefined => {
      const value = deployments[key];
      return typeof value === "string" && ADDRESS_RE.test(value) && value !== ZERO_ADDRESS
        ? (value as Address)
        : undefined;
    };

    const deployBlockRaw = deployments.deployBlock;
    const parentNameRaw = deployments.parentName;

    return {
      invoiceMarket: pickAddr("invoiceMarket"),
      invoiceRegistrar: pickAddr("invoiceRegistrar"),
      mockUsdc: pickAddr("mockUsdc"),
      userRegistry: pickAddr("userRegistry"),
      deployBlock:
        typeof deployBlockRaw === "number" && deployBlockRaw > 0
          ? BigInt(deployBlockRaw)
          : undefined,
      parentName:
        typeof parentNameRaw === "string" && parentNameRaw !== "" ? parentNameRaw : undefined,
    };
  } catch {
    return {};
  }
}

function pickAddress(fromDeployments: Address | undefined, envName: string): Address | undefined {
  if (fromDeployments) return fromDeployments;
  const value = envVar(envName);
  return value && ADDRESS_RE.test(value) ? (value as Address) : undefined;
}

function loadAccount(envName: string) {
  const pk = envVar(envName);
  if (!pk || !PK_RE.test(pk)) return undefined;
  return privateKeyToAccount(pk as Hex);
}

function requireOrExit(checks: ReadonlyArray<readonly [string, unknown]>): void {
  const missing = checks.filter(([, value]) => value === undefined).map(([name]) => name);
  if (missing.length === 0) return;
  console.error(`Missing required config: ${missing.join(", ")}`);
  console.error(
    "Set addresses via NEXT_PUBLIC_INVOICE_MARKET / NEXT_PUBLIC_INVOICE_REGISTRAR / " +
      "NEXT_PUBLIC_MOCK_USDC / NEXT_PUBLIC_USER_REGISTRY (or add web/lib/deployments.ts), " +
      "and private keys via SME_PK / INVESTOR_A_PK / DEBTOR_PK / DEBTOR_AP_PK in web/.env.e2e.",
  );
  process.exit(1);
}

const RPC_URL = envVar("SEPOLIA_RPC_URL") ?? "https://ethereum-sepolia-rpc.publicnode.com";

const sme = loadAccount("SME_PK");
const investorA = loadAccount("INVESTOR_A_PK");
const debtor = loadAccount("DEBTOR_PK");
const debtorAp = loadAccount("DEBTOR_AP_PK");

// Populated by `init()`, which `main()` awaits before dispatching to a mode —
// tsx runs this file as CommonJS (no `"type": "module"` in web/package.json),
// which doesn't support top-level await, so the async setup below can't live
// at module scope.
let MARKET: Address | undefined;
let REGISTRAR: Address | undefined;
let MOCK_USDC: Address | undefined;
let USER_REGISTRY: Address | undefined;
let DEPLOY_BLOCK: bigint | undefined;
let PARENT_NAME: string | undefined;
let chain: Chain;
let publicClient: ReturnType<typeof createPublicClient>;

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

async function init(): Promise<void> {
  const deployments = await loadDeployments();
  MARKET = pickAddress(deployments.invoiceMarket, "NEXT_PUBLIC_INVOICE_MARKET");
  REGISTRAR = pickAddress(deployments.invoiceRegistrar, "NEXT_PUBLIC_INVOICE_REGISTRAR");
  MOCK_USDC = pickAddress(deployments.mockUsdc, "NEXT_PUBLIC_MOCK_USDC");
  USER_REGISTRY = pickAddress(deployments.userRegistry, "NEXT_PUBLIC_USER_REGISTRY");
  DEPLOY_BLOCK = deployments.deployBlock;
  PARENT_NAME = deployments.parentName;

  chain = await detectChain(RPC_URL);
  publicClient = createPublicClient({ chain, transport: http(RPC_URL) });
}

function walletFor(account: NonNullable<ReturnType<typeof loadAccount>>) {
  return createWalletClient({ account, chain, transport: http(RPC_URL) });
}

////////////////////////////////////////////////////////////////////////////
// Tx helpers
////////////////////////////////////////////////////////////////////////////

function describeRevert(err: unknown): string {
  if (err instanceof BaseError) {
    const revertError = err.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revertError instanceof ContractFunctionRevertedError) {
      const name = revertError.data?.errorName ?? revertError.reason;
      const args = revertError.data?.args;
      if (name && args && args.length > 0) return `${name}(${args.join(", ")})`;
      if (name) return name;
    }
    return err.shortMessage;
  }
  return err instanceof Error ? err.message : String(err);
}

function abortWithRevert(label: string, err: unknown): never {
  console.error(`${label} failed: ${describeRevert(err)}`);
  process.exit(1);
}

/** Simulate (to get a decodable revert reason on failure), send, print `LABEL=txHash`, wait for the receipt. */
async function sendTx(params: {
  account: NonNullable<ReturnType<typeof loadAccount>>;
  label: string;
  address: Address;
  abi: Abi;
  functionName: string;
  args: readonly unknown[];
}): Promise<TransactionReceipt> {
  const { account, label, address, abi, functionName, args } = params;

  const sim = await publicClient
    .simulateContract({ address, abi, functionName, args, account, chain })
    .catch((err: unknown) => abortWithRevert(label, err));

  const hash = await walletFor(account)
    .writeContract(sim.request)
    .catch((err: unknown) => abortWithRevert(label, err));

  console.log(`${label}=${hash}`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status === "reverted") {
    console.error(`${label} (${hash}) was mined but reverted on-chain`);
    process.exit(1);
  }
  return receipt;
}

////////////////////////////////////////////////////////////////////////////
// Shared invoice helpers
////////////////////////////////////////////////////////////////////////////

const FACE_VALUE = parseUnits("1000", 6);
const PRICE = parseUnits("950", 6);
const SEVEN_DAYS = 7n * 24n * 60n * 60n;
const TEN_MINUTES = 10n * 60n;
const MIN_BALANCE = parseUnits("10000", 6);
const MINT_AMOUNT = parseUnits("100000", 6);
const STATUS_KEY_INDEX = RECORD_KEYS.indexOf("status");

function nowSeconds(): bigint {
  return BigInt(Math.floor(Date.now() / 1000));
}

async function createDemoInvoice(
  account: NonNullable<ReturnType<typeof loadAccount>>,
  dueDate: bigint,
  txLabel: string,
): Promise<{ id: bigint; name: string }> {
  const receipt = await sendTx({
    account,
    label: txLabel,
    address: MARKET!,
    abi: marketAbi,
    functionName: "createInvoice",
    args: [debtor!.address, debtorAp!.address, FACE_VALUE, PRICE, dueDate],
  });

  const [created] = parseEventLogs({ abi: marketAbi, eventName: "InvoiceCreated", logs: receipt.logs });
  if (!created) throw new Error(`${txLabel}: InvoiceCreated event not found in receipt logs`);
  return { id: created.args.id, name: created.args.name };
}

async function mintIfLow(address: Address, label: string): Promise<void> {
  const balance = await publicClient.readContract({
    address: MOCK_USDC!,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address],
  });
  if (balance >= MIN_BALANCE) {
    console.log(`# ${label} balance already >= 10,000 mUSDC, skipping mint`);
    return;
  }
  await sendTx({
    account: sme!,
    label: `MINT_${label.toUpperCase().replace(/\s+/g, "_")}_TX`,
    address: MOCK_USDC!,
    abi: erc20Abi,
    functionName: "mint",
    args: [address, MINT_AMOUNT],
  });
}

async function findVerifyTx(investor: Address): Promise<{ hash: Hex; nullifier: Hex }> {
  const latestBlock = await publicClient.getBlockNumber();
  const fromBlockEnv = envVar("E2E_FROM_BLOCK");
  const fromBlock = fromBlockEnv
    ? BigInt(fromBlockEnv)
    : DEPLOY_BLOCK !== undefined
      ? DEPLOY_BLOCK
      : latestBlock > 50_000n
        ? latestBlock - 50_000n
        : 0n;

  const events = await publicClient.getContractEvents({
    address: MARKET!,
    abi: marketAbi,
    eventName: "InvestorVerified",
    args: { investor },
    fromBlock,
    toBlock: "latest",
  });

  if (events.length === 0) {
    console.error(
      `No InvestorVerified log found for ${investor} between block ${fromBlock} and latest ` +
        `(set E2E_FROM_BLOCK to widen the search).`,
    );
    process.exit(1);
  }

  const latest = events[events.length - 1]!;
  return { hash: latest.transactionHash, nullifier: latest.args.nullifier as Hex };
}

const LIVE_STATUS_NAMES = ["AVAILABLE", "RESERVED", "REGISTERED"] as const;

/** Prints the KEY=value status block shared by `--flow` (post-settle) and `--status`. */
async function printStatus(id: bigint): Promise<void> {
  const invoice = await publicClient.readContract({
    address: MARKET!,
    abi: marketAbi,
    functionName: "invoices",
    args: [id],
  });
  console.log(`STATE=${invoice[5]}`);

  const records = await publicClient.readContract({
    address: REGISTRAR!,
    abi: registrarAbi,
    functionName: "recordsOf",
    args: [id],
  });
  console.log(`records[status]=${records[STATUS_KEY_INDEX]}`);

  let label: string | undefined;
  async function getLabel(): Promise<string> {
    label ??= await publicClient.readContract({
      address: REGISTRAR!,
      abi: registrarAbi,
      functionName: "labelOf",
      args: [id],
    });
    return label;
  }

  if (PARENT_NAME) {
    console.log(`NAME=${await getLabel()}.${PARENT_NAME}`);
  }

  if (!USER_REGISTRY) {
    console.log("LIVE_STATE=N/A (no user registry)");
    return;
  }

  const anyId = BigInt(keccak256(toBytes(await getLabel())));
  const state = await publicClient.readContract({
    address: USER_REGISTRY,
    abi: userRegistryAbi,
    functionName: "getState",
    args: [anyId],
  });
  console.log(`LIVE_STATE=${LIVE_STATUS_NAMES[state.status] ?? state.status}`);
}

////////////////////////////////////////////////////////////////////////////
// Modes
////////////////////////////////////////////////////////////////////////////

async function runSeed(): Promise<void> {
  requireOrExit([
    ["NEXT_PUBLIC_INVOICE_MARKET", MARKET],
    ["NEXT_PUBLIC_INVOICE_REGISTRAR", REGISTRAR],
    ["NEXT_PUBLIC_MOCK_USDC", MOCK_USDC],
    ["SME_PK", sme],
    ["INVESTOR_A_PK", investorA],
    ["DEBTOR_PK", debtor],
    ["DEBTOR_AP_PK", debtorAp],
  ]);

  const now = nowSeconds();

  const seed1 = await createDemoInvoice(sme!, now + SEVEN_DAYS, "SEED_1_TX");
  console.log(`SEED_1=${seed1.name}`);

  const expiryDemo = await createDemoInvoice(sme!, now + TEN_MINUTES, "EXPIRY_DEMO_TX");
  console.log(`EXPIRY_DEMO=${expiryDemo.name}`);

  await mintIfLow(investorA!.address, "investor A");
  await mintIfLow(debtor!.address, "debtor");
}

async function runFlow(): Promise<void> {
  requireOrExit([
    ["NEXT_PUBLIC_INVOICE_MARKET", MARKET],
    ["NEXT_PUBLIC_INVOICE_REGISTRAR", REGISTRAR],
    ["NEXT_PUBLIC_MOCK_USDC", MOCK_USDC],
    ["SME_PK", sme],
    ["INVESTOR_A_PK", investorA],
    ["DEBTOR_PK", debtor],
    ["DEBTOR_AP_PK", debtorAp],
  ]);

  const now = nowSeconds();
  const { id } = await createDemoInvoice(sme!, now + SEVEN_DAYS, "CREATE_TX");

  const verified = await publicClient.readContract({
    address: MARKET!,
    abi: marketAbi,
    functionName: "isVerified",
    args: [investorA!.address],
  });
  if (!verified) {
    console.log("NEEDS_VERIFY: verify INVESTOR_A via the web UI (World ID) then re-run");
    process.exit(2);
  }

  const { hash: verifyTx, nullifier } = await findVerifyTx(investorA!.address);
  console.log(`VERIFY_TX=${verifyTx}`);
  console.log(`NULLIFIER_A=${nullifier}`);

  await sendTx({
    account: investorA!,
    label: "APPROVE_BUY_TX",
    address: MOCK_USDC!,
    abi: erc20Abi,
    functionName: "approve",
    args: [MARKET!, PRICE],
  });
  await sendTx({
    account: investorA!,
    label: "BUY_TX",
    address: MARKET!,
    abi: marketAbi,
    functionName: "buy",
    args: [id],
  });

  await sendTx({
    account: debtor!,
    label: "APPROVE_SETTLE_TX",
    address: MOCK_USDC!,
    abi: erc20Abi,
    functionName: "approve",
    args: [MARKET!, FACE_VALUE],
  });
  await sendTx({
    account: debtor!,
    label: "SETTLE_TX",
    address: MARKET!,
    abi: marketAbi,
    functionName: "settle",
    args: [id],
  });

  await printStatus(id);
}

async function runStatus(name: string): Promise<void> {
  requireOrExit([
    ["NEXT_PUBLIC_INVOICE_MARKET", MARKET],
    ["NEXT_PUBLIC_INVOICE_REGISTRAR", REGISTRAR],
  ]);

  let id: bigint;
  try {
    id = idFromLabel(name);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  await printStatus(id);
}

async function main(): Promise<void> {
  await init();

  const [mode, arg] = process.argv.slice(2);
  switch (mode) {
    case "--seed":
      await runSeed();
      return;
    case "--flow":
      await runFlow();
      return;
    case "--status":
      if (!arg) {
        console.error("usage: e2e-sepolia.ts --status <name>");
        process.exit(1);
      }
      await runStatus(arg);
      return;
    default:
      console.error("usage: e2e-sepolia.ts <--seed|--flow|--status <name>>");
      process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? (err.stack ?? err.message) : String(err));
  process.exit(1);
});
