// Minimal ERC-20 ABI, plus the faucet `mint` that `MockUSDC`
// (contracts/src/MockUSDC.sol) adds on top of a standard 6-decimal ERC-20.
import type { Address } from "viem";

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
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
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
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

/**
 * `NEXT_PUBLIC_MOCK_USDC`, read the same way `web/lib/invoices.ts` reads
 * `NEXT_PUBLIC_INVOICE_MARKET`/`NEXT_PUBLIC_INVOICE_REGISTRAR` (its
 * `envAddress` helper isn't exported and that file is frozen for this lane,
 * so this is a small, deliberate duplication). A5/B5 will swap this for
 * `@/lib/deployments` once the contracts are deployed.
 */
export function mockUsdcAddress(): Address | null {
  const value = process.env.NEXT_PUBLIC_MOCK_USDC;
  return value && ADDRESS_RE.test(value) ? (value as Address) : null;
}
