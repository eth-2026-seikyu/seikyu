#!/usr/bin/env -S node --import tsx
/**
 * Standalone checks for `@/lib/format` (plan §4 card L1). Prints 6 cases and
 * exits non-zero if any assertion fails.
 *
 * Usage:
 *   pnpm -C web exec tsx scripts/format-check.ts
 */
import { formatDueDate, formatMoney } from "@/lib/format";

let failures = 0;

function check(label: string, actual: string, expected: string | ((s: string) => boolean)) {
  const pass = typeof expected === "string" ? actual === expected : expected(actual);
  const expectedLabel = typeof expected === "string" ? JSON.stringify(expected) : "(predicate)";
  console.log(`${pass ? "PASS" : "FAIL"} ${label}: ${JSON.stringify(actual)} (expected ${expectedLabel})`);
  if (!pass) failures += 1;
}

// 1. Whole money amount.
check("whole money (1000 test USDC)", formatMoney(1_000_000_000n), "1,000");

// 2. Fractional money amount.
check("fractional money (970.50 test USDC)", formatMoney(970_500_000n), "970.50");

// A fixed "now" so the minute/day/JST cases below are deterministic.
const NOW = 1_759_000_000n; // 2025-09-27T19:06:40Z / 2025-09-28 04:06:40 JST

// 3. Due in 4 minutes.
check("due in 4 min", formatDueDate(NOW + 4n * 60n, NOW).relative, "due in 4 min");

// 4. Due later today, in Asia/Tokyo — 09:26:40 JST + 5h = 14:26 JST, same day.
check(
  "due today with JST",
  formatDueDate(NOW + 5n * 60n * 60n, NOW).relative,
  (s) => s.startsWith("due today ") && s.endsWith(" JST"),
);

// 5. 3 days past due.
check("3 days past due", formatDueDate(NOW - 3n * 24n * 60n * 60n, NOW).relative, "3 days past due");

// 6. Absolute string ends with " JST".
check("absolute ends with JST", formatDueDate(NOW, NOW).absolute, (s) => s.endsWith(" JST"));

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll checks passed.");
