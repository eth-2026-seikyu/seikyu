// One source of truth for the app's contract addresses and ENS parent name.
//
// Resolution order per address: the synced Sepolia deployment
// (`@/lib/deployments`) if it's non-zero, else a `NEXT_PUBLIC_*` env
// override, else `null`. `parentName` follows the same shape (deployment
// value, then env, then `null`).
//
// The `NEXT_PUBLIC_*` overrides (`NEXT_PUBLIC_INVOICE_MARKET`,
// `NEXT_PUBLIC_INVOICE_REGISTRAR`, `NEXT_PUBLIC_MOCK_USDC`,
// `NEXT_PUBLIC_USER_REGISTRY`, `NEXT_PUBLIC_PARENT_NAME`) exist ONLY for
// local development against an anvil Sepolia fork, before
// `deployments.sepolia.json` has real addresses synced into it (or to
// point at a throwaway local redeploy without touching that file). Once
// the real deployment lands there, its addresses win automatically and
// these envs become dead weight — safe to leave set or to remove.
//
// Every env read here is a literal `process.env.NEXT_PUBLIC_*` member
// expression (never a dynamic/bracket lookup) so Next.js can inline these
// values into the client bundle at build time; this module is imported
// from both server code and "use client" components.
import { getAddress, type Address } from "viem";
import { sepoliaDeployments, ZERO } from "@/lib/deployments";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

function envAddress(value: string | undefined): Address | null {
  return value && ADDRESS_RE.test(value) ? getAddress(value) : null;
}

export interface Addresses {
  market: Address | null;
  registrar: Address | null;
  mockUsdc: Address | null;
  userRegistry: Address | null;
  parentName: string | null;
}

export function getAddresses(): Addresses {
  const market =
    sepoliaDeployments.invoiceMarket !== ZERO
      ? sepoliaDeployments.invoiceMarket
      : envAddress(process.env.NEXT_PUBLIC_INVOICE_MARKET);

  const registrar =
    sepoliaDeployments.invoiceRegistrar !== ZERO
      ? sepoliaDeployments.invoiceRegistrar
      : envAddress(process.env.NEXT_PUBLIC_INVOICE_REGISTRAR);

  const mockUsdc =
    sepoliaDeployments.mockUsdc !== ZERO
      ? sepoliaDeployments.mockUsdc
      : envAddress(process.env.NEXT_PUBLIC_MOCK_USDC);

  const userRegistry =
    sepoliaDeployments.userRegistry !== ZERO
      ? sepoliaDeployments.userRegistry
      : envAddress(process.env.NEXT_PUBLIC_USER_REGISTRY);

  const parentName = sepoliaDeployments.parentName || process.env.NEXT_PUBLIC_PARENT_NAME || null;

  return { market, registrar, mockUsdc, userRegistry, parentName };
}

/**
 * True once the app has enough addresses to read/write real invoice data
 * (market + registrar). `mockUsdc`/`userRegistry` are checked individually
 * by whatever needs them (e.g. FaucetButton hides itself without
 * `mockUsdc`) since the app is still partially usable without them.
 */
export function isConfigured(): boolean {
  const { market, registrar } = getAddresses();
  return market !== null && registrar !== null;
}

/**
 * Fixtures are opt-in only — set `NEXT_PUBLIC_USE_FIXTURES=1` to preview the
 * UI without a wallet or deployed contracts. Never enabled implicitly by a
 * missing deployment; see `listInvoices`/`getInvoice` in `@/lib/invoices`.
 */
export function fixturesEnabled(): boolean {
  return process.env.NEXT_PUBLIC_USE_FIXTURES === "1";
}
