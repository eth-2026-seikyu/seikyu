// Frozen shared types for the Seikyu web app (plan §2.7). Lane B1 adds the
// data functions (`listInvoices`, `getInvoice`) below these types; other lanes
// import only from this module.
import { createPublicClient, fallback, http, type Address } from "viem";
import { sepolia } from "viem/chains";
import { publicEnv } from "@/lib/env";
import { idFromLabel, readRecords } from "@/lib/ens";
import { FIXTURE_INVOICES } from "@/lib/__fixtures__/invoices";

export const RECORD_KEYS = [
  "amount",
  "currency",
  "debtor",
  "dueDate",
  "status",
  "ack",
  "tokenId",
  "issuer",
] as const;

export type RecordKey = (typeof RECORD_KEYS)[number];

export type InvoiceRecords = Record<RecordKey, string>;

export type MarketState = "Listed" | "Funded" | "Paid" | "Cancelled";

export type DisplayState =
  | "Open"
  | "Funded"
  | "Overdue"
  | "Expired-unsold"
  | "Paid"
  | "Cancelled";

export type AckView = "none" | "acknowledged" | "disputed" | "invalid";

export interface InvoiceMarketView {
  issuer: Address;
  debtor: Address;
  faceValue: bigint;
  price: bigint;
  dueDate: bigint;
  state: MarketState;
  holder: Address | null;
}

export interface InvoiceView {
  id: bigint;
  /** Full ENS name, e.g. `inv-7.seikyu.eth` */
  name: string;
  /** Label only, e.g. `inv-7` */
  label: string;
  /** Per-invoice Permissioned Resolver (path R — always readable, even after expiry) */
  resolver: Address;
  records: InvoiceRecords;
  /** Path L — registry says REGISTERED and now < expiry */
  live: boolean;
  market: InvoiceMarketView;
  /** Funded and now >= dueDate */
  overdue: boolean;
  displayState: DisplayState;
  ackView: AckView;
}

/** Map the raw `ack` text record to what the UI shows; unknown values block purchase. */
export function ackViewOf(ack: string): AckView {
  if (ack === "") return "none";
  if (ack === "acknowledged") return "acknowledged";
  if (ack === "disputed") return "disputed";
  return "invalid";
}

/** Derive the display state from market state, due date and current time (seconds). */
export function displayStateOf(
  state: MarketState,
  dueDate: bigint,
  nowSeconds: bigint,
): DisplayState {
  if (state === "Paid") return "Paid";
  if (state === "Cancelled") return "Cancelled";
  const matured = nowSeconds >= dueDate;
  if (state === "Funded") return matured ? "Overdue" : "Funded";
  return matured ? "Expired-unsold" : "Open";
}

////////////////////////////////////////////////////////////////////////////
// Data sources
////////////////////////////////////////////////////////////////////////////

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

function envAddress(name: string): Address | null {
  const value = process.env[name];
  return value && ADDRESS_RE.test(value) ? (value as Address) : null;
}

/**
 * For now, addresses come straight from env (`NEXT_PUBLIC_INVOICE_MARKET` /
 * `NEXT_PUBLIC_INVOICE_REGISTRAR`) — A5/B5 will swap this for the generated
 * per-chain addresses in `@/lib/deployments` once the contracts are deployed.
 */
function invoiceMarketAddress(): Address | null {
  return envAddress("NEXT_PUBLIC_INVOICE_MARKET");
}

function invoiceRegistrarAddress(): Address | null {
  return envAddress("NEXT_PUBLIC_INVOICE_REGISTRAR");
}

/** Fixtures until the real contracts are deployed and wired up, or when forced via env. */
function fixturesEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_USE_FIXTURES === "1") return true;
  return !invoiceMarketAddress() || !invoiceRegistrarAddress();
}

const chainClient = createPublicClient({
  chain: sepolia,
  transport: fallback([
    ...(publicEnv.NEXT_PUBLIC_SEPOLIA_RPC_URL
      ? [http(publicEnv.NEXT_PUBLIC_SEPOLIA_RPC_URL)]
      : []),
    http(),
  ]),
});

// Minimal hand-written ABIs — the InvoiceRegistrar/InvoiceMarket contracts
// aren't deployed yet, so there's no generated ABI to import. A5/B5 will
// replace these with `@/lib/deployments` once they exist.
const registrarAbi = [
  {
    type: "function",
    name: "nameOf",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "resolverOf",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "isLive",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "recordsOf",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ name: "", type: "string[8]" }],
  },
  {
    type: "function",
    name: "labelOf",
    stateMutability: "pure",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

const marketAbi = [
  {
    type: "function",
    name: "invoiceCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "invoices",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [
      { name: "issuer", type: "address" },
      { name: "debtor", type: "address" },
      { name: "faceValue", type: "uint128" },
      { name: "price", type: "uint128" },
      { name: "dueDate", type: "uint64" },
      { name: "state", type: "uint8" },
    ],
  },
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "isVerified",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

/** `InvoiceMarket.State`: 0 None, 1 Listed, 2 Funded, 3 Paid, 4 Cancelled. */
const MARKET_STATE_BY_INDEX: readonly (MarketState | null)[] = [
  null,
  "Listed",
  "Funded",
  "Paid",
  "Cancelled",
];

/** Loads one invoice from chain by id. Returns null for `State.None` (not a real invoice). */
async function loadInvoiceFromChain(
  id: bigint,
  market: Address,
  registrar: Address,
): Promise<InvoiceView | null> {
  const [[issuer, debtor, faceValue, price, dueDate, stateIndex], name, resolver, live] =
    await Promise.all([
      chainClient.readContract({
        address: market,
        abi: marketAbi,
        functionName: "invoices",
        args: [id],
      }),
      chainClient.readContract({
        address: registrar,
        abi: registrarAbi,
        functionName: "nameOf",
        args: [id],
      }),
      chainClient.readContract({
        address: registrar,
        abi: registrarAbi,
        functionName: "resolverOf",
        args: [id],
      }),
      chainClient.readContract({
        address: registrar,
        abi: registrarAbi,
        functionName: "isLive",
        args: [id],
      }),
    ]);

  const state = MARKET_STATE_BY_INDEX[stateIndex];
  if (!state) return null;

  const [label, holder, records] = await Promise.all([
    chainClient.readContract({
      address: registrar,
      abi: registrarAbi,
      functionName: "labelOf",
      args: [id],
    }),
    chainClient
      .readContract({ address: market, abi: marketAbi, functionName: "ownerOf", args: [id] })
      .catch(() => null),
    readRecords(resolver, name),
  ]);

  const now = BigInt(Math.floor(Date.now() / 1000));
  const displayState = displayStateOf(state, dueDate, now);
  const overdue = state === "Funded" && now >= dueDate;

  return {
    id,
    name,
    label,
    resolver,
    records,
    live,
    market: { issuer, debtor, faceValue, price, dueDate, state, holder },
    overdue,
    displayState,
    ackView: ackViewOf(records.ack),
  };
}

/** All invoices — fixtures or live chain data, per `fixturesEnabled()`. */
export async function listInvoices(): Promise<InvoiceView[]> {
  if (fixturesEnabled()) return FIXTURE_INVOICES;

  const market = invoiceMarketAddress();
  const registrar = invoiceRegistrarAddress();
  if (!market || !registrar) return FIXTURE_INVOICES;

  const count = await chainClient.readContract({
    address: market,
    abi: marketAbi,
    functionName: "invoiceCount",
    args: [],
  });

  // Token ids are assumed 1-based (ERC721-style), matching the fixtures'
  // `tokenId` records. A0/B5: flag here if the deployed contract starts at 0.
  const ids = Array.from({ length: Number(count) }, (_, i) => BigInt(i + 1));
  const loaded = await Promise.all(ids.map((id) => loadInvoiceFromChain(id, market, registrar)));
  return loaded.filter((invoice): invoice is InvoiceView => invoice !== null);
}

/** One invoice by its full ENS name, e.g. `inv-7.seikyu.eth`. */
export async function getInvoice(name: string): Promise<InvoiceView | null> {
  if (fixturesEnabled()) {
    return FIXTURE_INVOICES.find((invoice) => invoice.name === name) ?? null;
  }

  const market = invoiceMarketAddress();
  const registrar = invoiceRegistrarAddress();
  if (!market || !registrar) return null;

  let id: bigint;
  try {
    id = idFromLabel(name);
  } catch {
    return null;
  }

  return loadInvoiceFromChain(id, market, registrar);
}
