"use client";

import { useEffect, useRef } from "react";
import type { Address } from "viem";
import { LiveCountdown } from "@/components/InvoiceCard";
import { RECORD_KEYS, type InvoiceRecords } from "@/lib/invoices";

function etherscanAddress(address: Address): string {
  return `https://sepolia.etherscan.io/address/${address}`;
}

/**
 * The ENS-judge material (plan §2: "move, never delete"), collapsed by
 * default behind a native `<details>` (no JS toggle library) so the plain
 * summary above it is what a first-time visitor sees. Auto-opens when the
 * page is loaded with `#ens` in the URL so a direct link can still land
 * straight on it.
 */
export default function TechDetails({
  name,
  live,
  countdownTarget,
  records,
  resolver,
}: {
  name: string;
  live: boolean;
  countdownTarget: bigint;
  records: InvoiceRecords;
  resolver: Address;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (window.location.hash === "#ens" && detailsRef.current) {
      detailsRef.current.open = true;
    }
  }, []);

  const ensAppUrl = `https://sepolia.app.ens.domains/${name}`;

  return (
    <details ref={detailsRef} data-testid="tech-details" className="group mt-8">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold uppercase tracking-wide opacity-70 [&::-webkit-details-marker]:hidden">
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-3 w-3 shrink-0 transition-transform group-open:rotate-90"
        >
          <path d="M7 4l6 6-6 6V4z" />
        </svg>
        Technical details (ENS)
      </summary>

      <div className="mt-4">
        <a
          href={ensAppUrl}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          View on ENS app →
        </a>

        <p className="mt-3 text-sm opacity-70">
          Name live on ENS: {live ? "yes" : "no"} —{" "}
          <LiveCountdown dueDateSeconds={countdownTarget} live={live} />
        </p>

        <section className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide opacity-60">
            ENS records
          </h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <tbody>
                {RECORD_KEYS.map((key) => {
                  const value = records[key];
                  return (
                    <tr
                      key={key}
                      data-record={key}
                      className="border-b border-black/[.08] last:border-0 dark:border-white/[.145]"
                    >
                      <td className="py-2 pr-4 align-top font-mono text-xs opacity-60">
                        {key}
                      </td>
                      <td className="py-2 font-mono text-xs break-all">
                        {value === "" ? "—" : value}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs opacity-60">
            Resolver:{" "}
            <a
              href={etherscanAddress(resolver)}
              target="_blank"
              rel="noreferrer"
              className="font-mono hover:underline"
            >
              {resolver}
            </a>
          </p>
        </section>
      </div>
    </details>
  );
}
