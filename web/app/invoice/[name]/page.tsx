import { notFound } from "next/navigation";
import { AckBadge, SettlementBadge } from "@/components/StatusBadge";
import RoleBanner, { DueRelative } from "@/components/RoleBanner";
import TechDetails from "@/components/TechDetails";
import AddressChip from "@/components/AddressChip";
import InvoiceActions from "@/components/InvoiceActions";
import { Card } from "@/components/ui/Card";
import { getAddresses } from "@/lib/addresses";
import { getInvoice } from "@/lib/invoices";
import { formatDueDate, formatMoney } from "@/lib/format";
import { TEST_MONEY_NOTICE } from "@/lib/copy";

/** Percent discount off face value, one decimal place (e.g. "5.0"). */
function discountPercent(faceValue: bigint, price: bigint): number {
  if (faceValue <= BigInt(0)) return 0;
  return Number(((faceValue - price) * BigInt(10_000)) / faceValue) / 100;
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name: rawName } = await params;
  const invoice = await getInvoice(decodeURIComponent(rawName));
  if (!invoice) notFound();

  const { name, records, market, resolver, live, displayState, ackView, ensExpiry } = invoice;
  const dueDateSeconds = BigInt(records.dueDate);
  // `ensExpiry` reflects a `markOverdue` revival past the original due date;
  // fall back to `dueDate` when it isn't available. This is only for the
  // ENS-liveness countdown inside Technical details — the plain "Due" field
  // below always uses `market.dueDate` (plan §2: never `ensExpiry` there, or
  // a revived overdue invoice would misleadingly read "due in 30 days").
  const countdownTarget = ensExpiry ?? dueDateSeconds;

  // Before a sale, `ownerOf(id)` is the market contract itself (it
  // self-custodies the token via `_mint(address(this), id)` in
  // `createInvoice`) — that's not a real "holder" from a reader's
  // perspective, so treat it the same as no holder at all.
  const { market: marketAddress } = getAddresses();
  const realHolder =
    market.holder && market.holder.toLowerCase() !== marketAddress?.toLowerCase()
      ? market.holder
      : null;

  const discountPct = discountPercent(market.faceValue, market.price);
  // `.absolute` doesn't depend on `nowSeconds` at all (it only formats
  // `dueDate` itself, pinned to Asia/Tokyo) so it's safe to compute here on
  // the server; the `now`-dependent `.relative` half comes from the client
  // component `DueRelative` instead (avoids server-clock/ISR skew).
  const dueAbsolute = formatDueDate(market.dueDate, market.dueDate).absolute;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="font-mono text-xl font-semibold">{name}</h1>
      <p className="mt-1 text-sm opacity-70">
        Invoice ID — an ENS name that stops resolving when the invoice is paid, withdrawn, or
        expires.
      </p>

      <Card className="mt-6">
        <div className="flex flex-wrap items-center gap-4">
          <SettlementBadge state={displayState} />
          <AckBadge ackView={ackView} />
        </div>

        <dl className="mt-4 grid grid-cols-1 gap-y-4 text-sm md:grid-cols-2 md:gap-x-6">
          <div className="min-w-0">
            <dt className="text-xs opacity-60">Amount owed</dt>
            <dd>{formatMoney(market.faceValue)} test USDC</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs opacity-60">Sale price</dt>
            <dd>
              {formatMoney(market.price)} test USDC
              {discountPct > 0 && (
                <span className="opacity-70"> ({discountPct.toFixed(1)}% discount)</span>
              )}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs opacity-60">Due</dt>
            <dd>
              {dueAbsolute} — <DueRelative dueDate={market.dueDate} />
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs opacity-60">Supplier</dt>
            <dd>
              <AddressChip address={market.issuer} />
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs opacity-60">Debtor company</dt>
            <dd>
              <AddressChip address={market.debtor} />
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs opacity-60">Current owner</dt>
            <dd>
              {realHolder ? (
                <AddressChip address={realHolder} />
              ) : (
                <span className="opacity-60">— not sold yet</span>
              )}
            </dd>
          </div>
        </dl>

        <p className="mt-4 text-xs opacity-60">{TEST_MONEY_NOTICE}</p>
      </Card>

      <RoleBanner invoice={invoice} />

      <section id="actions" data-actions className="mt-8">
        <InvoiceActions invoice={invoice} />
      </section>

      <TechDetails
        name={name}
        live={live}
        countdownTarget={countdownTarget}
        records={records}
        resolver={resolver}
      />
    </div>
  );
}
