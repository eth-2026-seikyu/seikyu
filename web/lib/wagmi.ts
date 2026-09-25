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
const transport = fallback([
  ...(publicEnv.NEXT_PUBLIC_SEPOLIA_RPC_URL
    ? [http(publicEnv.NEXT_PUBLIC_SEPOLIA_RPC_URL)]
    : []),
  http(),
]);

export const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors: [injected()],
  transports: { [sepolia.id]: transport },
  ssr: true,
});
