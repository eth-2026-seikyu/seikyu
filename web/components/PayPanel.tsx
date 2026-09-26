"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zeroAddress, type Address, type Hex } from "viem";
import { useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { getAddresses } from "@/lib/addresses";
import { TERMS } from "@/lib/copy";
import { formatMoney, shortAddress } from "@/lib/format";
import { invoiceMarketAbi, mockUsdcAbi } from "@/lib/generated";
import type { InvoiceView } from "@/lib/invoices";
import { useOnSepolia } from "./ChainGuard";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";

type PayState = "idle" | "approving" | "settling" | "settled" | "error";

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
    onSepolia: boolean;
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
            Face value {ctx.faceValueLabel} {TERMS.testUsdc} — goes straight to the current
            owner{" "}
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
          <p className="mt-2 text-sm opacity-70">
            {ctx.needsApproval
              ? `Step 1 of 2 — allow Seikyu to move ${ctx.faceValueLabel} ${TERMS.testUsdc}`
              : `Step 2 of 2 — pay ${ctx.faceValueLabel} ${TERMS.testUsdc} to the current owner; this closes the invoice`}
          </p>
          <Button
            onClick={primaryAction}
            disabled={ctx.busy || !ctx.holder || !ctx.onSepolia}
            className="mt-3"
          >
            {primaryLabel}
          </Button>
          {!ctx.onSepolia && (
            <p className="mt-2 text-xs opacity-60">
              Switch to the Sepolia test network first (see the banner above).
            </p>
          )}
          <p className="mt-2 text-xs opacity-60">
            Paying closes the invoice and retires its ENS name.
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
          <Button
            variant="secondary"
            size="sm"
            onClick={primaryAction}
            disabled={!ctx.onSepolia}
            className="mt-2"
          >
            Retry
          </Button>
          {!ctx.onSepolia && (
            <p className="mt-2 text-xs opacity-60">
              Switch to the Sepolia test network first (see the banner above).
            </p>
          )}
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
  const onSepolia = useOnSepolia();

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
      <Card className="border-dashed">
        <p data-state="idle" className="text-sm opacity-70">
          Connect the debtor company&apos;s wallet to pay.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      {renderState(state, {
        holder,
        faceValueLabel: formatMoney(invoice.market.faceValue),
        needsApproval,
        busy,
        onSepolia,
        onApprove: handleApprove,
        onSettle: handleSettle,
      })}
    </Card>
  );
}
