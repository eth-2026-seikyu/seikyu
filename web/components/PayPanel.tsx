"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatUnits, zeroAddress, type Address, type Hex } from "viem";
import { useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { getAddresses } from "@/lib/addresses";
import { invoiceMarketAbi, mockUsdcAbi } from "@/lib/generated";
import type { InvoiceView } from "@/lib/invoices";

type PayState = "idle" | "approving" | "settling" | "settled" | "error";

/** Records/market amounts are stored as integers with 6 decimals (like USDC). */
function formatMoney(raw: bigint): string {
  const formatted = formatUnits(raw, 6);
  const [whole, frac = "0"] = formatted.split(".");
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${withCommas}.${frac.slice(0, 2).padEnd(2, "0")}`;
}

function shortAddress(address: Address): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function etherscanAddress(address: Address): string {
  return `https://sepolia.etherscan.io/address/${address}`;
}

/** Renders per-state JSX with a *literal* `data-state="..."` attribute on each branch. */
function renderState(
  state: PayState,
  ctx: {
    holder: Address | null;
    faceValueLabel: string;
    needsApproval: boolean;
    busy: boolean;
    onApprove: () => void;
    onSettle: () => void;
  },
) {
  const primaryLabel = ctx.needsApproval ? "Approve mUSDC" : `Settle (pay ${ctx.faceValueLabel} mUSDC)`;
  const primaryAction = ctx.needsApproval ? ctx.onApprove : ctx.onSettle;

  switch (state) {
    case "idle":
      return (
        <div data-state="idle">
          <p className="text-sm">
            Face value {ctx.faceValueLabel} mUSDC — held by{" "}
            {ctx.holder ? (
              <a
                href={etherscanAddress(ctx.holder)}
                target="_blank"
                rel="noreferrer"
                className="font-mono hover:underline"
              >
                {shortAddress(ctx.holder)}
              </a>
            ) : (
              <span className="opacity-60">unknown</span>
            )}
          </p>
          <button
            type="button"
            onClick={primaryAction}
            disabled={ctx.busy || !ctx.holder}
            className="mt-3 rounded-full bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {primaryLabel}
          </button>
          <p className="mt-2 text-xs opacity-60">
            Settling burns the receivable and unregisters the ENS name.
          </p>
        </div>
      );
    case "approving":
      return (
        <div data-state="approving">
          <p className="text-sm opacity-70">Approving mUSDC…</p>
        </div>
      );
    case "settling":
      return (
        <div data-state="settling">
          <p className="text-sm opacity-70">Settling…</p>
        </div>
      );
    case "settled":
      return (
        <div data-state="settled">
          <p className="text-sm">Settled — the receivable has been burned.</p>
        </div>
      );
    case "error":
      return (
        <div data-state="error">
          <p className="text-sm text-red-600 dark:text-red-400">
            Transaction failed. Please try again.
          </p>
          <button
            type="button"
            onClick={primaryAction}
            className="mt-2 rounded-full border border-black/[.08] px-3 py-1.5 text-xs font-medium dark:border-white/[.145]"
          >
            Retry
          </button>
        </div>
      );
  }
}

export default function PayPanel({
  invoice,
  account,
}: {
  invoice: InvoiceView;
  account: Address | undefined;
}) {
  const router = useRouter();
  const { market, mockUsdc } = getAddresses();
  const holder = invoice.market.holder;

  const [state, setState] = useState<PayState>("idle");
  const [phase, setPhase] = useState<"approve" | "settle" | null>(null);
  const [hash, setHash] = useState<Hex | undefined>();

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: mockUsdc ?? undefined,
    abi: mockUsdcAbi,
    functionName: "allowance",
    args: [account ?? zeroAddress, market ?? zeroAddress],
    query: { enabled: Boolean(mockUsdc) && Boolean(market) && Boolean(account) },
  });

  const { writeContractAsync } = useWriteContract();
  const { isSuccess: receiptSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (!receiptSuccess || !phase) return;
    if (phase === "approve") {
      refetchAllowance();
      setState("idle");
    } else {
      setState("settled");
      router.refresh();
    }
    setPhase(null);
    setHash(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receiptSuccess, phase]);

  const needsApproval = allowance === undefined || allowance < invoice.market.faceValue;
  const busy = state === "approving" || state === "settling";

  async function handleApprove() {
    if (!market || !mockUsdc) return;
    setState("approving");
    setPhase("approve");
    try {
      const txHash = await writeContractAsync({
        address: mockUsdc,
        abi: mockUsdcAbi,
        functionName: "approve",
        args: [market, invoice.market.faceValue],
      });
      setHash(txHash);
    } catch {
      setPhase(null);
      setState("error");
    }
  }

  async function handleSettle() {
    if (!market) return;
    setState("settling");
    setPhase("settle");
    try {
      const txHash = await writeContractAsync({
        address: market,
        abi: invoiceMarketAbi,
        functionName: "settle",
        args: [invoice.id],
      });
      setHash(txHash);
    } catch {
      setPhase(null);
      setState("error");
    }
  }

  if (!account) {
    return (
      <div className="rounded-xl border border-dashed border-black/[.08] p-4 dark:border-white/[.145]">
        <p data-state="idle" className="text-sm opacity-70">
          Connect a wallet to settle this receivable.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-black/[.08] p-4 dark:border-white/[.145]">
      {renderState(state, {
        holder,
        faceValueLabel: formatMoney(invoice.market.faceValue),
        needsApproval,
        busy,
        onApprove: handleApprove,
        onSettle: handleSettle,
      })}
    </div>
  );
}
