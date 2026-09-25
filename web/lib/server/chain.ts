// Server-only: reads OPERATOR_PRIVATE_KEY and talks to an RPC. The
// `server-only` package isn't in this app's dependencies (out of scope for
// this task — see web/package.json), so this guards the same way it would:
// throwing if somehow evaluated in a browser bundle.
if (typeof window !== "undefined") {
  throw new Error("web/lib/server/chain.ts must only be imported on the server");
}

import {
  createPublicClient,
  createWalletClient,
  fallback,
  http,
  nonceManager,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { serverEnv } from "@/lib/env";

function rpcTransport() {
  const { SEPOLIA_RPC_URL } = serverEnv();
  return SEPOLIA_RPC_URL ? fallback([http(SEPOLIA_RPC_URL), http()]) : fallback([http()]);
}

let cachedPublicClient: ReturnType<typeof createPublicClient> | undefined;

/**
 * Lazily builds the read-only Sepolia client, used to read `nullifierOwner`
 * before issuing a tx. Must stay lazy (memoized on first call, not a
 * module-level const): `next build` imports every route module while
 * "Collecting page data" (NODE_ENV=production at that point), and importing
 * this file must never call `serverEnv()` as a side effect — `serverEnv()`
 * throws if a dev-only `LOCAL_MARKET_ADDRESS` happens to be set in
 * `.env.local` while NODE_ENV=production, which broke `next build` when
 * this was a top-level `const` calling `rpcTransport()` (which calls
 * `serverEnv()`) at import time.
 */
export function publicClient() {
  if (cachedPublicClient) {
    return cachedPublicClient;
  }
  cachedPublicClient = createPublicClient({
    chain: sepolia,
    transport: rpcTransport(),
  });
  return cachedPublicClient;
}

let cachedWallet: ReturnType<typeof createWalletClient> | undefined;

/**
 * Lazily builds the operator's wallet client. The account is created with
 * viem's `nonceManager` (per plan) so concurrent/retried sends get correctly
 * sequenced nonces instead of colliding.
 */
export function operatorWallet() {
  if (cachedWallet) {
    return cachedWallet;
  }

  const { OPERATOR_PRIVATE_KEY } = serverEnv();
  if (!OPERATOR_PRIVATE_KEY) {
    throw new Error("OPERATOR_PRIVATE_KEY not configured");
  }

  const account = privateKeyToAccount(OPERATOR_PRIVATE_KEY as `0x${string}`, {
    nonceManager,
  });

  cachedWallet = createWalletClient({
    account,
    chain: sepolia,
    transport: rpcTransport(),
  });

  return cachedWallet;
}

/**
 * The invoice market address to write World ID verification results to.
 * Dev-only override for now via `LOCAL_MARKET_ADDRESS` — C2 replaces this
 * with the generated per-chain deployment address once the real
 * InvoiceMarket contract exists.
 */
export function marketAddress(): Address {
  const { LOCAL_MARKET_ADDRESS } = serverEnv();
  if (LOCAL_MARKET_ADDRESS) {
    return LOCAL_MARKET_ADDRESS as Address;
  }
  throw new Error("market not configured yet");
}
