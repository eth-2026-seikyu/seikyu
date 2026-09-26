// Plain-language formatting helpers (plan §2 "Money"/"Dates", §4 card L1).
// Pure functions so date math is testable and can run client-side (the home
// page is ISR `revalidate=15` and the server TZ isn't the viewer's TZ).
import type { AckView, DisplayState } from "@/lib/invoices";

const TOKYO_ABSOLUTE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const TOKYO_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Tokyo",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const TOKYO_DAY_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const SECOND = 1n;
const MINUTE = 60n * SECOND;
const HOUR = 60n * MINUTE;
const DAY = 24n * HOUR;

/**
 * Formats a token amount stored as an integer with `decimals` decimals
 * (default 6, matching test USDC): whole amounts print with no decimal
 * places ("1,000"); fractional amounts keep exactly two ("970.50"), rounded
 * half-up. Grouping uses en-US thousands separators.
 */
export function formatMoney(amount: bigint, decimals = 6): string {
  const negative = amount < 0n;
  const abs = negative ? -amount : amount;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const remainder = abs % base;
  const sign = negative ? "-" : "";

  if (remainder === 0n) {
    return `${sign}${whole.toLocaleString("en-US")}`;
  }

  const fracDigits = remainder.toString().padStart(decimals, "0");
  const keep = fracDigits.slice(0, 2);
  const rest = fracDigits.slice(2);
  let fracValue = Number(keep);
  if (rest.length > 0 && Number(rest[0]) >= 5) {
    fracValue += 1;
  }

  let wholeAdjusted = whole;
  let fracStr: string;
  if (fracValue >= 100) {
    wholeAdjusted += 1n;
    fracStr = "00";
  } else {
    fracStr = fracValue.toString().padStart(2, "0");
  }

  return `${sign}${wholeAdjusted.toLocaleString("en-US")}.${fracStr}`;
}

/** Shortens an address to `0x1234…abcd`. */
export function shortAddress(a: string): string {
  if (a.length <= 12) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export interface DueDateView {
  /** en-US date + 24h time pinned to Asia/Tokyo, e.g. "Oct 3, 2026, 14:05 JST". */
  absolute: string;
  /** Human-scale relative phrase, see formatDueDate doc comment for cases. */
  relative: string;
  /** True once `nowSeconds >= dueDate` (matches InvoiceView's own overdue rule). */
  overdue: boolean;
}

/**
 * Formats a due date (unix seconds) relative to `nowSeconds` (also unix
 * seconds, passed in so this stays a pure, testable function).
 *
 * `relative` cases:
 * - future, under 1 hour away: "due in {n} min"
 * - future, later the same Asia/Tokyo calendar day: "due today {HH:MM} JST"
 * - future, under 24 h away but a different calendar day (crosses midnight):
 *   "due in {n} h"
 * - future, 24 h or more away: "due in {n} days"
 * - past, under 1 hour ago: "just past due"
 * - past, under 24 h ago: "{n} h past due"
 * - past, 24 h or more ago: "{n} days past due"
 */
export function formatDueDate(dueDate: bigint, nowSeconds: bigint): DueDateView {
  const dueMs = Number(dueDate) * 1000;
  const absolute = `${TOKYO_ABSOLUTE_FORMATTER.format(dueMs)} JST`;
  const overdue = nowSeconds >= dueDate;

  if (overdue) {
    const behind = nowSeconds - dueDate;
    let relative: string;
    if (behind < HOUR) {
      relative = "just past due";
    } else if (behind < DAY) {
      const hours = behind / HOUR;
      relative = `${hours} h past due`;
    } else {
      const days = behind / DAY;
      relative = `${days} days past due`;
    }
    return { absolute, relative, overdue };
  }

  const ahead = dueDate - nowSeconds;
  let relative: string;
  if (ahead < HOUR) {
    const minutes = ahead / MINUTE;
    const displayMinutes = minutes < 1n ? 1n : minutes;
    relative = `due in ${displayMinutes} min`;
  } else {
    const nowMs = Number(nowSeconds) * 1000;
    const sameDay = TOKYO_DAY_FORMATTER.format(nowMs) === TOKYO_DAY_FORMATTER.format(dueMs);
    if (sameDay) {
      relative = `due today ${TOKYO_TIME_FORMATTER.format(dueMs)} JST`;
    } else if (ahead < DAY) {
      const hours = ahead / HOUR;
      relative = `due in ${hours} h`;
    } else {
      const days = ahead / DAY;
      relative = `due in ${days} days`;
    }
  }

  return { absolute, relative, overdue };
}

const PLAIN_STATE: Record<DisplayState, string> = {
  Open: "For sale",
  Funded: "Sold — awaiting payment",
  Overdue: "Past due — unpaid",
  "Expired-unsold": "Not sold in time",
  Paid: "Paid in full",
  Cancelled: "Withdrawn by supplier",
};

/** Plain-language label for an invoice's `displayState` (plan §3 vocabulary). */
export function plainState(state: DisplayState): string {
  return PLAIN_STATE[state];
}

const PLAIN_ACK: Record<AckView, string> = {
  none: "No response yet",
  acknowledged: "Confirmed by debtor",
  disputed: "Disputed by debtor",
  invalid: "Unreadable (buying blocked)",
};

/** Plain-language label for an invoice's `ackView` (plan §3 vocabulary). */
export function plainAck(ack: AckView): string {
  return PLAIN_ACK[ack];
}
