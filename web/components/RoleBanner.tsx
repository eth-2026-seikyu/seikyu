"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import type { InvoiceView } from "@/lib/invoices";
import { formatDueDate, formatMoney } from "@/lib/format";
import { rolesFor, roleLabel } from "@/lib/roles";
import { DISCONNECTED_HINT, multiRoleBanner, noRoleHint, roleHint } from "@/lib/copy";

/**
 * Renders just the *relative* half of a due date ("due in 3 days" / "2 days
 * past due"), recomputed from the viewer's own clock after mount. Lives here
 * rather than in a fourth new file (the L5 card scope is exactly `page.tsx`,
 * `RoleBanner.tsx`, `TechDetails.tsx`, `AddressChip.tsx`) because it needs
 * the same fix as `RoleBanner` itself: the invoice detail page has no static
 * ISR window, but the server's clock/timezone still isn't the viewer's, so
 * the *relative* phrase (unlike the Asia/Tokyo-pinned absolute string) is
 * only trustworthy once computed on the client.
 */
export function DueRelative({ dueDate }: { dueDate: bigint }) {
  const [relative, setRelative] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      const now = BigInt(Math.floor(Date.now() / 1000));
      setRelative(formatDueDate(dueDate, now).relative);
    };
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [dueDate]);

  return <span suppressHydrationWarning>{relative ?? "…"}</span>;
}

/**
 * Per-role "what can I do here" banner. Rendered outside `#actions`: the
 * screenshot scripts highlight the first `#actions [data-state] p`, so
 * nothing here ever carries `data-state`.
 *
 * wagmi's `ssr: true` config always starts disconnected on the server and on
 * first client paint, so this only renders real content after mount (risk
 * #5); the container keeps a fixed min-height throughout so that first reveal
 * doesn't shift the layout.
 */
export default function RoleBanner({ invoice }: { invoice: InvoiceView }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { address, isConnected } = useAccount();
  const roles = mounted && isConnected ? rolesFor(invoice, address) : [];

  const fmt = {
    money: (amount: bigint) => `${formatMoney(amount)} test USDC`,
    dueDate: (due: bigint) => formatDueDate(due, BigInt(Math.floor(Date.now() / 1000))),
  };

  let heading = "";
  let hints: string[] = [];
  if (mounted) {
    if (!isConnected) {
      heading = DISCONNECTED_HINT;
    } else if (roles.length === 0) {
      heading = noRoleHint(invoice);
    } else {
      heading = multiRoleBanner(roles);
      hints = roles.map((role) => roleHint(role, invoice, fmt));
    }
  }

  return (
    <div
      data-testid="role-banner"
      data-roles={roles.join(",")}
      className="mt-6 min-h-28 rounded-xl border border-black/[.08] bg-black/[.02] p-4 text-sm dark:border-white/[.145] dark:bg-white/[.03]"
    >
      {mounted && (
        <div>
          {roles.length > 0 && (
            <p className="text-xs font-semibold opacity-60">
              {/* No CSS text-transform here on purpose: `roleLabel()` output
                  ("Supplier", "Debtor company", "Current owner (investor)")
                  must appear verbatim in rendered text for scripts/tests that
                  match it by exact case. */}
              Your role{roles.length > 1 ? "s" : ""}: {roles.map(roleLabel).join(" · ")}
            </p>
          )}
          <p className="mt-1 font-medium">{heading}</p>
          {hints.map((hint, i) => (
            <p key={i} className="mt-1 opacity-80">
              {hint}
            </p>
          ))}
        </div>
      )}
      <p className="mt-3 text-xs">
        <Link
          href={`/accountant?name=${encodeURIComponent(invoice.name)}`}
          className="text-blue-600 hover:underline dark:text-blue-400"
        >
          Debtor&apos;s accountant? Confirm or dispute this invoice →
        </Link>
      </p>
    </div>
  );
}
