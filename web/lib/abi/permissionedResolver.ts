// Stable ABI surface for the accountant `ack`-record demo (ENSv2 Enhanced
// Access Control — see `web/app/accountant/page.tsx` and
// `web/components/AckEditor.tsx`).
//
// `@wagmi/cli` already generates `iPermissionedResolverAbi` (from the
// vendored `contracts/src/interfaces/ens/IPermissionedResolver.sol`, itself
// sourced from the real ENSv2 PermissionedResolverImpl ABI, tag
// `sepolia-deployment-2026-09-15`) and `invoiceRegistrarAbi` (from
// `contracts/src/InvoiceRegistrar.sol`) into `@/lib/generated`. This module
// re-exports just the pieces this feature needs, under names scoped to it, so
// AckEditor.tsx and scripts/eac-negative.ts don't depend on generated.ts's
// full surface and stay stable if that file is regenerated.
import { iPermissionedResolverAbi, invoiceRegistrarAbi } from "@/lib/generated";

/** `setText(bytes name, string key, string value)`, `resolve`/`multicall` (reads), and the EAC role errors. */
export const permissionedResolverAbi = iPermissionedResolverAbi;

/** `resolverOf`, `dnsNameOf`, `nameOf`, `recordsOf`, `isLive`. */
export const registrarAbi = invoiceRegistrarAbi;

/**
 * `PermissionedResolver`'s revert when the caller lacks the EAC role bitmap
 * required for the resource (here, a text record key) it tried to write —
 * e.g. the accountant's AP wallet, granted a setter role scoped to `ack`
 * only, calling `setText` for `amount` or `status`.
 */
export const EAC_UNAUTHORIZED_ERROR = "EACUnauthorizedAccountRoles" as const;
