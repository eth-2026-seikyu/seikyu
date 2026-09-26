// Plain-language vocabulary, tooltips and per-role hints (plan §3, §5; card
// L1). Single source of truth — components import from here instead of
// hard-coding copy. Wording rules (plan §2): never "escrow" (the market pays
// the supplier/owner directly, it never holds funds in between), never
// "guaranteed" (the Overdue state exists), and every page keeps one visible
// "test money on a test network" sentence.
import type { DisplayState } from "@/lib/invoices";
import type { InvoiceView } from "@/lib/invoices";
import type { DueDateView } from "@/lib/format";
import { plainState } from "@/lib/format";
import type { Role } from "@/lib/roles";

/** Plan §3 vocabulary table — today's term to the plain UI term. */
export const TERMS = {
  issuer: "Supplier",
  debtor: "Debtor company",
  accountant: "Debtor's accountant",
  holder: "Current owner (investor)",
  faceValue: "Amount owed",
  price: "Sale price",
  testUsdc: "test USDC",
  network: "test network (Sepolia)",
  faucet: "free test money",
  receivable: "invoice ownership token",
  worldId: "one-person check",
  nullifierUsed: "already used by another wallet",
  invoiceId: "Invoice ID (an ENS name)",
  technicalDetails: "Technical details",
} as const;

/** One visible "test money on a test network" sentence, reused on every page. */
export const TEST_MONEY_NOTICE =
  "This app uses test money on a test network — nothing here has real value.";

/** Tap/focus tooltips (plan §3's "Tooltip / helper" column), keyed for `<Term>`. */
export const GLOSSARY: Record<string, { term: string; help: string }> = {
  supplier: {
    term: "Supplier",
    help: "The business that issued the invoice and is selling it.",
  },
  debtor: {
    term: "Debtor company",
    help: "The company that owes the invoice.",
  },
  accountant: {
    term: "Debtor's accountant",
    help: "Can confirm or dispute the invoice on the debtor's behalf.",
  },
  owner: {
    term: "Current owner (investor)",
    help: "Receives the amount owed when the debtor pays.",
  },
  testUsdc: {
    term: "test USDC",
    help: "A mock stablecoin on the Sepolia test network — no real value.",
  },
  worldId: {
    term: "one-person check",
    help: "Proves you are one real person; you verify once, at your first purchase.",
  },
  invoiceId: {
    term: "Invoice ID (an ENS name)",
    help: "A unique ENS name that identifies this invoice on-chain.",
  },
  approveStep: {
    term: "Approve",
    help: "Step 1 of 2 — allow Seikyu to move this amount. Step 2 of 2 — pay.",
  },
};

/** Shown when no wallet is connected at all (plan §5 row "none (disconnected)"). */
export const DISCONNECTED_HINT = "Connect a wallet to see what you can do here.";

/**
 * Shown when a wallet is connected but matches none of the invoice's roles
 * (plan §5 row "none (connected, no role)"). Only the Open state has bespoke
 * copy; closed states fall back to the plain state sentence, matching the
 * "any" row's rule of no actions promised once an invoice is closed.
 */
export function noRoleHint(invoice: Pick<InvoiceView, "displayState">): string {
  if (invoice.displayState === "Open") {
    return "You're viewing as an investor. Buying requires a one-time one-person check.";
  }
  return `${plainState(invoice.displayState)}.`;
}

const MULTI_ROLE_NOUN: Record<Role, string> = {
  supplier: "the supplier",
  debtor: "the debtor company",
  owner: "the current owner",
};

/**
 * One banner sentence listing every role a wallet matches (plan §5 row
 * "multiple"), e.g. "You're the supplier and the current owner."
 */
export function multiRoleBanner(roles: Role[]): string {
  const nouns = roles.map((role) => MULTI_ROLE_NOUN[role]);
  if (nouns.length === 0) return "";
  if (nouns.length === 1) return `You're ${nouns[0]}.`;
  const last = nouns[nouns.length - 1];
  const rest = nouns.slice(0, -1);
  return `You're ${rest.join(", ")} and ${last}.`;
}

const CLOSED_STATES: readonly DisplayState[] = ["Paid", "Cancelled", "Expired-unsold"];

export interface RoleHintFormatters {
  /** Formats a raw token amount, e.g. `format.ts`'s `formatMoney`. */
  money: (amount: bigint) => string;
  /** Formats a due date against "now"; only `.absolute`/`.relative` are used here. */
  dueDate: (due: bigint) => DueDateView;
}

/**
 * The per-role next-step hint for a single matched role (plan §5). When an
 * invoice matches more than one role, call this once per role and/or use
 * `multiRoleBanner` for the combined sentence — this function only knows
 * about one role at a time so it stays simple to test.
 */
export function roleHint(role: Role, invoice: InvoiceView, fmt: RoleHintFormatters): string {
  const { displayState, market } = invoice;

  // "any" row: once an invoice is closed, no actions are promised regardless
  // of role — the plain state sentence is the whole hint.
  if (CLOSED_STATES.includes(displayState)) {
    return `${plainState(displayState)}.`;
  }

  const price = fmt.money(market.price);
  const face = fmt.money(market.faceValue);

  if (role === "supplier") {
    if (displayState === "Open") {
      return `You issued this invoice. It's for sale at ${price}. You can withdraw it until someone buys.`;
    }
    // Funded or Overdue: the supplier was already paid when it sold.
    return `Sold — you were paid ${price}. The debtor now owes ${face} to the owner.`;
  }

  if (role === "debtor") {
    if (displayState === "Open") {
      return "This invoice is addressed to your company. Your accountant can confirm or dispute it; you can pay it after it's sold.";
    }
    const base = `Your company owes ${face}. Paying closes the invoice.`;
    if (displayState === "Overdue") {
      return `${base} It's ${fmt.dueDate(market.dueDate).relative}.`;
    }
    return base;
  }

  // role === "owner"
  if (displayState === "Overdue") {
    return `You own this invoice. It's ${fmt.dueDate(market.dueDate).relative} — the debtor can still pay.`;
  }
  return `You own this invoice. You'll receive ${face} when the debtor pays (due ${fmt.dueDate(market.dueDate).absolute}).`;
}
