// Frozen shared types for the Seikyu web app (plan §2.7). Lane B1 adds the
// data functions (`listInvoices`, `getInvoice`) below these types; other lanes
// import only from this module.
import type { Address } from "viem";

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
