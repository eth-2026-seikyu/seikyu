"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { InvoiceView } from "@/lib/invoices";
import { formatDueDate, formatMoney, shortAddress } from "@/lib/format";
import { TERMS } from "@/lib/copy";
import { AckBadge, SettlementBadge } from "./StatusBadge";

function remaining(targetSeconds: bigint, nowMs: number): string {
  const diffMs = Number(targetSeconds) * 1000 - nowMs;
  if (diffMs <= 0) return "expired";
  const totalMinutes = Math.floor(diffMs / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Live island: a ticking countdown to an invoice's ENS expiry (== its due
 * date). Shared by InvoiceCard and the invoice detail page. Renders "expired"
 * immediately when `live` is false so it never depends on the client clock
 * for that case (safe to render on the server too).
 *
 * Kept exported with unchanged behaviour — `app/invoice/[name]/page.tsx`
 * imports it directly for the ENS-technical countdown.
 */
export function LiveCountdown({
  dueDateSeconds,
  live,
}: {
  dueDateSeconds: bigint;
  live: boolean;
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!live) return <span className="text-xs opacity-60">expired</span>;
  if (now === null) return <span className="text-xs opacity-60">…</span>;

  return (
    <span className="text-xs opacity-70" suppressHydrationWarning>
      expires in {remaining(dueDateSeconds, now)}
    </span>
  );
}

/**
 * Plain-language "Due …" text for a card: always `market.dueDate`, never
 * `ensExpiry` — after a revival the ENS expiry runs ahead of the real due
 * date. Client-rendered like `LiveCountdown` because
 * the relative phrase depends on the viewer's clock and the home page is ISR.
 */
function DueLabel({ dueDate }: { dueDate: bigint }) {
  const [now, setNow] = useState<bigint | null>(null);

  useEffect(() => {
    setNow(BigInt(Math.floor(Date.now() / 1000)));
    const id = setInterval(() => setNow(BigInt(Math.floor(Date.now() / 1000))), 30_000);
    return () => clearInterval(id);
  }, []);

  if (now === null) return <span className="opacity-60">…</span>;
  return <span suppressHydrationWarning>{formatDueDate(dueDate, now).relative}</span>;
}

export default function InvoiceCard({ invoice }: { invoice: InvoiceView }) {
  const { name, market, displayState, ackView } = invoice;

  return (
    <article
      data-invoice-card
      data-name={name}
      className="flex flex-col gap-3 rounded-xl border border-black/[.08] p-4 transition hover:border-black/20 dark:border-white/[.145] dark:hover:border-white/30"
    >
      <Link
        href={`/invoice/${encodeURIComponent(name)}`}
        className="font-mono text-sm font-medium hover:underline"
      >
        {name}
      </Link>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <dt className="text-xs opacity-60">Amount owed</dt>
          <dd className="font-semibold">
            {formatMoney(market.faceValue)} {TERMS.testUsdc}
          </dd>
        </div>
        <div>
          <dt className="text-xs opacity-60">Sale price</dt>
          <dd>
            {formatMoney(market.price)} {TERMS.testUsdc}
          </dd>
        </div>
        <div>
          <dt className="text-xs opacity-60">Due</dt>
          <dd>
            <DueLabel dueDate={market.dueDate} />
          </dd>
        </div>
        <div>
          <dt className="text-xs opacity-60">Supplier</dt>
          <dd className="font-mono text-xs">{shortAddress(market.issuer)}</dd>
        </div>
        <div>
          <dt className="text-xs opacity-60">Debtor</dt>
          <dd className="font-mono text-xs">{shortAddress(market.debtor)}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap items-center gap-4 pt-1">
        <SettlementBadge state={displayState} />
        <AckBadge ackView={ackView} />
      </div>

      <Link
        href={`/invoice/${encodeURIComponent(name)}`}
        className="mt-1 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
      >
        View details →
      </Link>
    </article>
  );
}
