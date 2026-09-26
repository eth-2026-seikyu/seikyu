import InvoiceCard from "@/components/InvoiceCard";
import RoleCards from "@/components/RoleCards";
import FaucetButton from "@/components/FaucetButton";
import { TEST_MONEY_NOTICE } from "@/lib/copy";
import type { DisplayState } from "@/lib/invoices";
import { listInvoices } from "@/lib/invoices";

export const revalidate = 15;

const SECTIONS: { id: string; title: string; states: DisplayState[] }[] = [
  { id: "for-sale", title: "For sale", states: ["Open", "Funded"] },
  { id: "attention", title: "Needs attention", states: ["Overdue", "Expired-unsold"] },
  { id: "closed", title: "Closed", states: ["Paid", "Cancelled"] },
];

const HOW_IT_WORKS: { step: string; text: string }[] = [
  { step: "1. List", text: "A supplier lists an unpaid invoice." },
  {
    step: "2. Buy",
    text: "A verified investor buys it at a discount, the supplier is paid now.",
  },
  {
    step: "3. Pay",
    text: "The debtor company pays the full amount to the investor on the due date.",
  },
];

export default async function Home() {
  const invoices = await listInvoices();
  const firstOpenInvoiceName = invoices.find((invoice) => invoice.displayState === "Open")?.name;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold sm:text-3xl">
        Sell an invoice today, or invest in one
      </h1>
      <p className="mt-2 text-sm opacity-70">
        Seikyu turns a real unpaid invoice into something anyone can buy at a
        discount — each invoice gets its own ENS name that expires on the due
        date.
      </p>

      <RoleCards firstOpenInvoiceName={firstOpenInvoiceName} />

      <div className="mt-8 grid grid-cols-1 gap-3 rounded-xl border border-black/[.08] bg-black/[.02] p-4 text-sm sm:grid-cols-3 dark:border-white/[.145] dark:bg-white/[.03]">
        {HOW_IT_WORKS.map(({ step, text }) => (
          <div key={step}>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-60">{step}</p>
            <p className="mt-1 opacity-80">{text}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <FaucetButton />
        <p className="text-xs opacity-60">{TEST_MONEY_NOTICE}</p>
      </div>

      {invoices.length === 0 ? (
        <p
          id="for-sale"
          className="mt-10 rounded-xl border border-dashed border-black/[.08] p-8 text-center text-sm opacity-60 dark:border-white/[.145]"
        >
          No invoices yet — suppliers can list one.
        </p>
      ) : (
        <div className="mt-8 flex flex-col gap-10">
          {SECTIONS.map(({ id, title, states }) => {
            const items = invoices.filter((invoice) =>
              states.includes(invoice.displayState),
            );
            if (items.length === 0) return null;
            return (
              <section key={id} id={id}>
                <h2 className="text-sm font-semibold uppercase tracking-wide opacity-60">
                  {title}
                </h2>
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {items.map((invoice) => (
                    <InvoiceCard key={invoice.name} invoice={invoice} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
