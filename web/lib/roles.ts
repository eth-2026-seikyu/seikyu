// Plain-language role detection (plan §2 "Role detection is additive", §4 card
// L1). Pure function: given an invoice and the connected address, return
// every matching role. Issuer+holder and debtor+holder are real combinations
// (plan §1 fact F3 — `settle()`/`buy()` don't exclude issuer/debtor), so this
// returns an array, never a single value.
import type { InvoiceView } from "@/lib/invoices";

export type Role = "supplier" | "debtor" | "owner";

const ROLE_LABELS: Record<Role, string> = {
  supplier: "Supplier",
  debtor: "Debtor company",
  owner: "Current owner (investor)",
};

/** Plain label for a detected role (plan §3 vocabulary). */
export function roleLabel(role: Role): string {
  return ROLE_LABELS[role];
}

function sameAddress(a: string | null | undefined, b: string): boolean {
  if (!a) return false;
  return a.toLowerCase() === b.toLowerCase();
}

/**
 * Every role `address` matches on `invoice` (issuer → supplier, debtor →
 * debtor, holder → owner). Returns `[]` when `address` is undefined
 * (disconnected wallet) or matches none of them.
 */
export function rolesFor(invoice: InvoiceView, address: string | undefined): Role[] {
  if (!address) return [];

  const roles: Role[] = [];
  if (sameAddress(address, invoice.market.issuer)) roles.push("supplier");
  if (sameAddress(address, invoice.market.debtor)) roles.push("debtor");
  if (sameAddress(invoice.market.holder, address)) roles.push("owner");
  return roles;
}
