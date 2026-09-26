import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { GLOSSARY } from "@/lib/copy";

/**
 * Mirrors `ui/Button`'s primary/default look (rounded-full, min-h-11 tap
 * target, focus ring) for an anchor tag — `Button` only renders a native
 * `<button>`, so a real `<Link>` needs its own class string to look the same
 * (plan §4 card L4: "Button-styled `<Link>`").
 */
const CTA_CLASSNAME =
  "mt-auto inline-flex min-h-11 items-center justify-center rounded-full bg-black px-4 py-2 text-center text-sm font-medium text-white cursor-pointer transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black/50 dark:bg-white dark:text-black dark:focus-visible:ring-white/50 dark:focus-visible:ring-offset-black";

/**
 * Investor card sentence, hard-coded here rather than pulled from
 * `GLOSSARY.owner` (lib/copy.ts, owned by lane L1): that entry describes the
 * *outcome* of already being an owner ("Receives the amount owed when the
 * debtor pays"), not the action a prospective investor takes to get there.
 */
const INVESTOR_SENTENCE =
  "Buys unpaid invoices at a discount and receives the full amount when the debtor pays.";

function SupplierIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="28"
      height="28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="5" y="3" width="14" height="18" rx="1.5" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  );
}

function InvestorIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="28"
      height="28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 17l5-5 4 4 7-8" />
      <path d="M14 8h6v6" />
    </svg>
  );
}

function DebtorIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="28"
      height="28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <path d="M8 8h2M14 8h2M8 12h2M14 12h2M8 16h2M14 16h2" />
    </svg>
  );
}

export default function RoleCards({
  firstOpenInvoiceName,
}: {
  /** First invoice with `displayState === "Open"`, computed server-side; undefined when none is for sale. */
  firstOpenInvoiceName?: string;
}) {
  const investorHref = firstOpenInvoiceName
    ? `/invoice/${encodeURIComponent(firstOpenInvoiceName)}`
    : "#for-sale";
  const investorLabel = firstOpenInvoiceName
    ? "See what's for sale"
    : "Nothing for sale right now";

  return (
    <section aria-label="Choose your role" className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card data-role-card="supplier" className="flex flex-col gap-3">
        <div className="opacity-80">
          <SupplierIcon />
        </div>
        <h2 className="text-base font-semibold">Supplier</h2>
        <p className="text-sm opacity-70">{GLOSSARY.supplier.help}</p>
        <Link href="/issue" className={CTA_CLASSNAME}>
          List an invoice
        </Link>
      </Card>

      <Card data-role-card="investor" className="flex flex-col gap-3">
        <div className="opacity-80">
          <InvestorIcon />
        </div>
        <h2 className="text-base font-semibold">Investor</h2>
        <p className="text-sm opacity-70">{INVESTOR_SENTENCE}</p>
        <Link href={investorHref} className={CTA_CLASSNAME}>
          {investorLabel}
        </Link>
      </Card>

      <Card data-role-card="debtor" className="flex flex-col gap-3">
        <div className="opacity-80">
          <DebtorIcon />
        </div>
        <h2 className="text-base font-semibold">Debtor company</h2>
        <p className="text-sm opacity-70">{GLOSSARY.debtor.help}</p>
        <Link href="/accountant" className={CTA_CLASSNAME}>
          Confirm or dispute an invoice
        </Link>
      </Card>
    </section>
  );
}
