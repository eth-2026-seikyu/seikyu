// ABI slice of `InvoiceMarket` (contracts/src/InvoiceMarket.sol) needed by
// the buy/settle/cancel UI, plus its custom errors so viem can decode
// reverts by name (see BuyPanel's `decodeBuyError`).
import type { Address } from "viem";

export const marketActionsAbi = [
  // -- state-changing --
  {
    type: "function",
    name: "buy",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "settle",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "cancel",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
  // -- views --
  {
    type: "function",
    name: "isVerified",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
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
  // -- errors --
  {
    type: "error",
    name: "NotVerifiedInvestor",
    inputs: [{ name: "who", type: "address" }],
  },
  {
    type: "error",
    name: "PositionCapReached",
    inputs: [{ name: "who", type: "address" }],
  },
  {
    type: "error",
    name: "NameNotLive",
    inputs: [],
  },
  {
    type: "error",
    name: "PurchaseBlockedByAck",
    inputs: [{ name: "ack", type: "string" }],
  },
  {
    type: "error",
    name: "DueDatePassed",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidState",
    inputs: [{ name: "actual", type: "uint8" }],
  },
  {
    type: "error",
    name: "NotIssuer",
    inputs: [],
  },
  {
    type: "error",
    name: "EnforcedPause",
    inputs: [],
  },
] as const;

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

/**
 * `NEXT_PUBLIC_INVOICE_MARKET`, read the same way `web/lib/invoices.ts`
 * does (its `envAddress` helper isn't exported and that file is frozen for
 * this lane, so this is a small, deliberate duplication). A5/B5 will swap
 * this for `@/lib/deployments` once the contracts are deployed.
 */
export function marketAddress(): Address | null {
  const value = process.env.NEXT_PUBLIC_INVOICE_MARKET;
  return value && ADDRESS_RE.test(value) ? (value as Address) : null;
}
