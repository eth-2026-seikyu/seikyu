import InvoiceCard from "@/components/InvoiceCard";
import FaucetButton from "@/components/FaucetButton";
import type { DisplayState } from "@/lib/invoices";
import { listInvoices } from "@/lib/invoices";

export const revalidate = 15;

const SECTIONS: { title: string; states: DisplayState[] }[] = [
  { title: "Active", states: ["Open", "Funded"] },
  { title: "Attention", states: ["Overdue", "Expired-unsold"] },
  { title: "Closed", states: ["Paid", "Cancelled"] },
];

const HOW_IT_WORKS: { step: string; text: string }[] = [
  { step: "1. Issue", text: "An SME issues an invoice — it mints an ENS name that expires on the due date." },
  {
    step: "2. Verified investor buys",
    text: "A World ID–verified investor buys the receivable at a discount; funds go to the SME now.",
  },
  {
    step: "3. Debtor pays",
    text: "The debtor pays in full and the name is released. Unpaid past due, it goes overdue instead.",
  },
];

export default async function Home() {
  const invoices = await listInvoices();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold">Invoices</h1>
      <p className="mt-2 text-sm opacity-70">
        Every invoice is an ENSv2 name that expires on its due date.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-black/[.08] bg-black/[.02] p-4 text-sm sm:grid-cols-3 dark:border-white/[.145] dark:bg-white/[.03]">
        {HOW_IT_WORKS.map(({ step, text }) => (
          <div key={step}>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-60">{step}</p>
            <p className="mt-1 opacity-80">{text}</p>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <FaucetButton />
      </div>

      {invoices.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-black/[.08] p-8 text-center text-sm opacity-60 dark:border-white/[.145]">
          No invoices yet.
        </p>
      ) : (
        <div className="mt-8 flex flex-col gap-10">
          {SECTIONS.map(({ title, states }) => {
            const items = invoices.filter((invoice) =>
              states.includes(invoice.displayState),
            );
            if (items.length === 0) return null;
            return (
              <section key={title}>
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
