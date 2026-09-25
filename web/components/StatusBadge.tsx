import type { AckView, DisplayState } from "@/lib/invoices";

/**
 * Two independent badges that must never be visually merged into one pill:
 * - Settlement state comes from the on-chain market (source of truth for money).
 * - ENS ack comes from a text record the debtor can set themselves, so it is
 *   informational only and must never be mistaken for a settlement guarantee.
 */

const SETTLEMENT_STYLES: Record<DisplayState, string> = {
  Open: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  Funded: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  Overdue: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  "Expired-unsold": "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  Paid: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  Cancelled: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

const ACK_META: Record<AckView, { label: string; className: string }> = {
  none: {
    label: "no ack",
    className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  },
  acknowledged: {
    label: "acknowledged",
    className: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  },
  disputed: {
    label: "disputed",
    className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  },
  invalid: {
    label: "invalid ack",
    className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  },
};

export function SettlementBadge({
  state,
  className = "",
}: {
  state: DisplayState;
  className?: string;
}) {
  return (
    <span
      data-state={state}
      className={`inline-flex flex-col items-start gap-0.5 ${className}`}
    >
      <span className="text-[10px] font-medium uppercase tracking-wide text-black/50 dark:text-white/50">
        Settlement (on-chain)
      </span>
      <span
        className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${SETTLEMENT_STYLES[state]}`}
      >
        {state}
      </span>
    </span>
  );
}

export function AckBadge({
  ackView,
  className = "",
}: {
  ackView: AckView;
  className?: string;
}) {
  const meta = ACK_META[ackView];
  return (
    <span
      data-state={ackView}
      className={`inline-flex flex-col items-start gap-0.5 ${className}`}
    >
      <span className="text-[10px] font-medium uppercase tracking-wide text-black/50 dark:text-white/50">
        ENS ack
      </span>
      <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${meta.className}`}>
        {meta.label}
      </span>
    </span>
  );
}

/** Convenience wrapper that renders both badges together, kept visibly distinct. */
export default function StatusBadge({
  state,
  ackView,
}: {
  state: DisplayState;
  ackView: AckView;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <SettlementBadge state={state} />
      <AckBadge ackView={ackView} />
    </div>
  );
}
