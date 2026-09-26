// Plain-language role detection. Pure function: given an invoice and the
// connected address, return every matching role. Issuer+holder and
// debtor+holder are real combinations, because `settle()` and `buy()` don't
// exclude the issuer or the debtor, so this returns an array, never a single
// value.
import type { InvoiceView } from "@/lib/invoices";

export type Role = "supplier" | "debtor" | "owner";

const ROLE_LABELS: Record<Role, string> = {
  supplier: "Supplier",
  debtor: "Debtor company",
  owner: "Current owner (investor)",
};

/** Plain label for a detected role. */
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
