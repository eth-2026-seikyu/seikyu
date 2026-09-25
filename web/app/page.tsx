import InvoiceCard from "@/components/InvoiceCard";
import type { DisplayState } from "@/lib/invoices";
import { listInvoices } from "@/lib/invoices";

export const revalidate = 15;

const SECTIONS: { title: string; states: DisplayState[] }[] = [
  { title: "Active", states: ["Open", "Funded"] },
  { title: "Attention", states: ["Overdue", "Expired-unsold"] },
  { title: "Closed", states: ["Paid", "Cancelled"] },
];

export default async function Home() {
  const invoices = await listInvoices();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold">Invoices</h1>
      <p className="mt-2 text-sm opacity-70">
        Every invoice is an ENSv2 name that expires on its due date.
      </p>

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
