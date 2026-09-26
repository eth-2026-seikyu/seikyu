import { createConfig, fallback, http } from "wagmi";
import { sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { publicEnv } from "./env";

/**
 * RainbowKit's default connector set was dropped: it pulls in
 * `@wagmi/connectors`'s Coinbase Wallet connector, which transitively
 * depends on `@coinbase/cdp-sdk`'s x402 payment support. That references
 * `@x402/*` packages that don't exist on npm, and Turbopack fails to
 * resolve them at build time (a hard build failure, not just an unmet
 * peer-dependency warning). Until upstream fixes this, wagmi's own
 * `injected()` connector covers wallet connection without pulling in that
 * broken dependency chain.
 */
/**
 * Built-in Sepolia RPC fallback endpoints — see the matching comment in
 * `lib/invoices.ts` for why viem's chain-default RPC (thirdweb) is never
 * included: it rate-limits (HTTP 429) under light concurrent load (R1). This
 * client-side transport backs wallet reads like `BuyPanel`'s
 * `isVerified`/`allowance` checks and `FaucetButton`'s balance read.
 */
const DEFAULT_SEPOLIA_RPC_URLS = [
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://sepolia.gateway.tenderly.co",
  "https://rpc.sepolia.ethpandaops.io",
];

/**
 * Ordered, deduped RPC URL list: `NEXT_PUBLIC_SEPOLIA_RPC_URL` first (if
 * set), then either a custom comma-separated override
 * (`NEXT_PUBLIC_SEPOLIA_RPC_URLS`) or `DEFAULT_SEPOLIA_RPC_URLS`.
 */
function sepoliaRpcUrls(): string[] {
  const rest = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URLS
    ? process.env.NEXT_PUBLIC_SEPOLIA_RPC_URLS.split(",")
        .map((url) => url.trim())
        .filter(Boolean)
    : DEFAULT_SEPOLIA_RPC_URLS;
  const all = publicEnv.NEXT_PUBLIC_SEPOLIA_RPC_URL
    ? [publicEnv.NEXT_PUBLIC_SEPOLIA_RPC_URL, ...rest]
    : rest;
  return Array.from(new Set(all));
}

// No transport-level `batch: true` (JSON-RPC array batching) — see the
// matching comment in `lib/invoices.ts`; several fallback endpoints reject
// array-wrapped request bodies outright, which broke the fallback chain.
const transport = fallback(
  sepoliaRpcUrls().map((url) => http(url, { timeout: 10_000 })),
  { rank: false, retryCount: 2, retryDelay: 150 },
);

export const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors: [injected()],
  transports: { [sepolia.id]: transport },
  ssr: true,
});
