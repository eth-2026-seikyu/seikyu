// Frozen shared types for the Seikyu web app (plan §2.7). Lane B1 adds the
// data functions (`listInvoices`, `getInvoice`) below these types; other lanes
// import only from this module.
import { createPublicClient, fallback, http, type Address } from "viem";
import { sepolia } from "viem/chains";
import { getAddresses } from "@/lib/addresses";
import { publicEnv } from "@/lib/env";
import { idFromLabel, readRecords } from "@/lib/ens";
import { invoiceMarketAbi, invoiceRegistrarAbi } from "@/lib/generated";

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

const chainClient = createPublicClient({
  chain: sepolia,
  transport: fallback([
    ...(publicEnv.NEXT_PUBLIC_SEPOLIA_RPC_URL
      ? [http(publicEnv.NEXT_PUBLIC_SEPOLIA_RPC_URL)]
      : []),
    http(),
  ]),
});

// ABIs come from `@/lib/generated` (wagmi cli) — see `@/lib/addresses` for
// where the market/registrar addresses themselves come from.
const registrarAbi = invoiceRegistrarAbi;
const marketAbi = invoiceMarketAbi;

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

/** All invoices, read live from chain. An unconfigured app returns `[]`. */
export async function listInvoices(): Promise<InvoiceView[]> {
  const { market, registrar } = getAddresses();
  if (!market || !registrar) return [];

  const count = await chainClient.readContract({
    address: market,
    abi: marketAbi,
    functionName: "invoiceCount",
    args: [],
  });

  // Token ids are assumed 1-based (ERC721-style, InvoiceMarket.createInvoice
  // increments before minting). Flag here if that ever changes.
  const ids = Array.from({ length: Number(count) }, (_, i) => BigInt(i + 1));
  const loaded = await Promise.all(ids.map((id) => loadInvoiceFromChain(id, market, registrar)));
  return loaded.filter((invoice): invoice is InvoiceView => invoice !== null);
}

/**
 * One invoice by its full ENS name, e.g. `inv-7.seikyu.eth`. Same
 * unconfigured rule as `listInvoices`.
 */
export async function getInvoice(name: string): Promise<InvoiceView | null> {
  const { market, registrar } = getAddresses();
  if (!market || !registrar) return null;

  let id: bigint;
  try {
    id = idFromLabel(name);
  } catch {
    return null;
  }

  return loadInvoiceFromChain(id, market, registrar);
}
