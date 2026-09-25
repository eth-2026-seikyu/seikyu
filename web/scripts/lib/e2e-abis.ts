// Minimal hand-written ABIs for the Sepolia/anvil e2e driver
// (`scripts/e2e-sepolia.ts`). Mirrors the frozen contract surface documented
// in `contracts/src/InvoiceMarket.sol`, `contracts/src/interfaces/IInvoiceRegistrar.sol`,
// and the vendored `contracts/src/interfaces/ens/IUserRegistry.sol` — only
// what the e2e flow calls or decodes (including custom errors, so viem can
// decode revert reasons from `simulateContract`).

/** `InvoiceMarket` — functions/events/errors the e2e flow touches. */
export const marketAbi = [
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
    name: "isVerified",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "nullifierOwner",
    stateMutability: "view",
    inputs: [{ name: "nullifier", type: "bytes32" }],
    outputs: [{ name: "", type: "address" }],
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
    name: "invoiceCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
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
    type: "event",
    name: "InvestorVerified",
    inputs: [
      { name: "investor", type: "address", indexed: true },
      { name: "nullifier", type: "bytes32", indexed: true },
    ],
  },
  { type: "error", name: "NotOperator", inputs: [] },
  { type: "error", name: "NotIssuer", inputs: [] },
  {
    type: "error",
    name: "NotVerifiedInvestor",
    inputs: [{ name: "who", type: "address" }],
  },
  {
    type: "error",
    name: "NullifierAlreadyUsed",
    inputs: [{ name: "boundTo", type: "address" }],
  },
  {
    type: "error",
    name: "PositionCapReached",
    inputs: [{ name: "who", type: "address" }],
  },
  {
    type: "error",
    name: "InvalidState",
    inputs: [{ name: "actual", type: "uint8" }],
  },
  { type: "error", name: "InvalidTerms", inputs: [] },
  { type: "error", name: "DueDatePassed", inputs: [] },
  { type: "error", name: "NameNotLive", inputs: [] },
  {
    type: "error",
    name: "PurchaseBlockedByAck",
    inputs: [{ name: "ack", type: "string" }],
  },
] as const;

/** `IInvoiceRegistrar` — the 5 read functions the e2e flow needs. */
export const registrarAbi = [
  {
    type: "function",
    name: "nameOf",
    stateMutability: "view",
    inputs: [{ name: "invoiceId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "resolverOf",
    stateMutability: "view",
    inputs: [{ name: "invoiceId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "isLive",
    stateMutability: "view",
    inputs: [{ name: "invoiceId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "recordsOf",
    stateMutability: "view",
    inputs: [{ name: "invoiceId", type: "uint256" }],
    outputs: [{ name: "", type: "string[8]" }],
  },
  {
    type: "function",
    name: "labelOf",
    stateMutability: "pure",
    inputs: [{ name: "invoiceId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

/**
 * `IUserRegistry.getState` (ENSv2 `PermissionedRegistry`). `anyId` accepts a
 * labelhash, tokenId or resource — the e2e flow passes
 * `uint256(keccak256(bytes(label)))`. Mirrors the `State` struct in
 * `contracts/src/interfaces/ens/EnsV2Types.sol`.
 */
export const userRegistryAbi = [
  {
    type: "function",
    name: "getState",
    stateMutability: "view",
    inputs: [{ name: "anyId", type: "uint256" }],
    outputs: [
      {
        name: "",
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

/** Just enough ERC20 for `MockUSDC`: faucet mint, approve, balance checks. */
export const erc20Abi = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;
