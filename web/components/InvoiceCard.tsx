"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatUnits } from "viem";
import type { InvoiceView } from "@/lib/invoices";
import { AckBadge, SettlementBadge } from "./StatusBadge";

/** Records/market amounts are stored as integers with 6 decimals (like USDC). */
function formatMoney(raw: bigint, decimals = 6): string {
  const formatted = formatUnits(raw, decimals);
  const [whole, frac = "0"] = formatted.split(".");
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${withCommas}.${frac.slice(0, 2).padEnd(2, "0")}`;
}

function formatDate(unixSeconds: bigint): string {
  return new Date(Number(unixSeconds) * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

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

export default function InvoiceCard({ invoice }: { invoice: InvoiceView }) {
  const { name, records, market, live, displayState, ackView } = invoice;
  const dueDateSeconds = BigInt(records.dueDate);
  const discountPct =
    market.faceValue > 0n
      ? Number(((market.faceValue - market.price) * 10_000n) / market.faceValue) / 100
      : 0;

  return (
    <article
      data-invoice-card
      data-name={name}
      className="flex flex-col gap-3 rounded-xl border border-black/[.08] p-4 transition hover:border-black/20 dark:border-white/[.145] dark:hover:border-white/30"
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/invoice/${encodeURIComponent(name)}`}
          className="font-mono text-sm font-medium hover:underline"
        >
          {name}
        </Link>
        <LiveCountdown dueDateSeconds={dueDateSeconds} live={live} />
      </div>

      <div className="text-lg font-semibold">
        {formatMoney(BigInt(records.amount))} {records.currency}
      </div>

      <div className="flex flex-wrap items-baseline gap-3 text-sm opacity-80">
        <span>
          Price {formatMoney(market.price)} {records.currency}
        </span>
        <span>{discountPct.toFixed(1)}% discount</span>
        <span>Due {formatDate(dueDateSeconds)}</span>
      </div>

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
