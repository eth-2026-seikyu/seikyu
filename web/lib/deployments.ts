// Typed, checksummed view over the synced deployment addresses for Sepolia.
//
// `deployments.sepolia.json` is a build-time snapshot of
// `contracts/deployments/sepolia.json`, refreshed by `scripts/sync-deployments.mjs`
// (`pnpm run sync:deployments`). Pre-deploy, the app-owned addresses
// (`userRegistry`, `invoiceRegistrar`, `invoiceMarket`, `mockUsdc`) are the zero
// address — use `isDeployed()` to check before relying on them.
//
// No env reads here — see `@/lib/env` for that.
import { getAddress, type Address } from "viem";
import raw from "./deployments.sepolia.json";

export const ZERO: Address = "0x0000000000000000000000000000000000000000";

export const sepoliaDeployments = {
  chainId: 11155111,
  parentName: raw.parentName,
  userRegistry: getAddress(raw.userRegistry),
  invoiceRegistrar: getAddress(raw.invoiceRegistrar),
  invoiceMarket: getAddress(raw.invoiceMarket),
  mockUsdc: getAddress(raw.mockUsdc),
  ethRegistry: getAddress(raw.ethRegistry),
  universalResolver: getAddress(raw.universalResolver),
  verifiableFactory: getAddress(raw.verifiableFactory),
  permissionedResolverImpl: getAddress(raw.permissionedResolverImpl),
  userRegistryImpl: getAddress(raw.userRegistryImpl),
  ensMockUsdc: getAddress(raw.ensMockUsdc),
  deployBlock: raw.deployBlock,
  forkBlock: raw.forkBlock,
} as const;

/** The app-owned contracts we deploy ourselves (as opposed to the pre-existing ENS ones). */
const APP_ADDRESS_KEYS = [
  "userRegistry",
  "invoiceRegistrar",
  "invoiceMarket",
  "mockUsdc",
] as const;

/** True once every app-owned address has been filled in by a real deployment. */
export function isDeployed(): boolean {
  return APP_ADDRESS_KEYS.every((key) => sepoliaDeployments[key] !== ZERO);
}

/**
 * Build a full ENS name from a label under the deployed parent domain, e.g.
 * `nameUnderParent("inv-7")` -> `"inv-7.seikyu.eth"`.
 */
export function nameUnderParent(label: string): string {
  if (!sepoliaDeployments.parentName) {
    throw new Error(
      "sepoliaDeployments.parentName is empty (pre-deploy placeholder) — cannot build an ENS name yet",
    );
  }
  return `${label}.${sepoliaDeployments.parentName}`;
}
