// Minimal hand-written ABI for InvoiceMarket (see
// `contracts/src/InvoiceMarket.sol`) — just the pieces IssueForm calls.
// `@wagmi/cli` will generate the full ABI later; keep this in sync with that
// subset until then.
export const invoiceMarketAbi = [
  {
    type: "function",
    name: "createInvoice",
    stateMutability: "nonpayable",
    inputs: [
      { name: "debtor", type: "address" },
      { name: "accountant", type: "address" },
      { name: "faceValue", type: "uint128" },
      { name: "price", type: "uint128" },
      { name: "dueDate", type: "uint64" },
    ],
    outputs: [{ name: "id", type: "uint256" }],
  },
  {
    type: "function",
    name: "invoiceCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "paused",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "event",
    name: "InvoiceCreated",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "issuer", type: "address", indexed: true },
      { name: "debtor", type: "address", indexed: true },
      { name: "faceValue", type: "uint128", indexed: false },
      { name: "price", type: "uint128", indexed: false },
      { name: "dueDate", type: "uint64", indexed: false },
      { name: "name", type: "string", indexed: false },
      { name: "resolver", type: "address", indexed: false },
    ],
  },
  {
    type: "error",
    name: "InvalidTerms",
    inputs: [],
  },
  {
    type: "error",
    name: "EnforcedPause",
    inputs: [],
  },
] as const;
