import { notFound } from "next/navigation";
import { formatUnits, type Address } from "viem";
import { AckBadge, SettlementBadge } from "@/components/StatusBadge";
import { LiveCountdown } from "@/components/InvoiceCard";
import { getInvoice, RECORD_KEYS } from "@/lib/invoices";

function etherscanAddress(address: Address): string {
  return `https://sepolia.etherscan.io/address/${address}`;
}

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

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name: rawName } = await params;
  const invoice = await getInvoice(decodeURIComponent(rawName));
  if (!invoice) notFound();

  const { name, records, market, resolver, live, displayState, ackView } = invoice;
  const dueDateSeconds = BigInt(records.dueDate);
  const ensAppUrl = `https://sepolia.app.ens.domains/${name}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-mono text-xl font-semibold">{name}</h1>
          <a
            href={ensAppUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            View on ENS app →
          </a>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <SettlementBadge state={displayState} />
          <AckBadge ackView={ackView} />
        </div>
      </div>

      <p className="mt-3 text-sm opacity-70">
        Name live on ENS: {live ? "yes" : "no"} —{" "}
        <LiveCountdown dueDateSeconds={dueDateSeconds} live={live} />
      </p>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide opacity-60">
          ENS records
        </h2>
        <table className="mt-3 w-full border-collapse text-sm">
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

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide opacity-60">
          Settlement
        </h2>
        <dl className="mt-3 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs opacity-60">Issuer</dt>
            <dd>
              <a
                href={etherscanAddress(market.issuer)}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-xs hover:underline"
              >
                {market.issuer}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-xs opacity-60">Debtor</dt>
            <dd>
              <a
                href={etherscanAddress(market.debtor)}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-xs hover:underline"
              >
                {market.debtor}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-xs opacity-60">Face value</dt>
            <dd>
              {formatMoney(market.faceValue)} {records.currency}
            </dd>
          </div>
          <div>
            <dt className="text-xs opacity-60">Price</dt>
            <dd>
              {formatMoney(market.price)} {records.currency}
            </dd>
          </div>
          <div>
            <dt className="text-xs opacity-60">Due date</dt>
            <dd>{formatDate(market.dueDate)}</dd>
          </div>
          <div>
            <dt className="text-xs opacity-60">State</dt>
            <dd>{market.state}</dd>
          </div>
          <div>
            <dt className="text-xs opacity-60">Holder</dt>
            <dd>
              {market.holder ? (
                <a
                  href={etherscanAddress(market.holder)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs hover:underline"
                >
                  {market.holder}
                </a>
              ) : (
                <span className="opacity-60">— unsold</span>
              )}
            </dd>
          </div>
        </dl>
      </section>

      <section id="actions" data-actions className="mt-8" />
    </div>
  );
}
