"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Hex } from "viem";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { getAddresses } from "@/lib/addresses";
import { invoiceMarketAbi } from "@/lib/generated";
import type { InvoiceView } from "@/lib/invoices";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import BuyPanel from "./BuyPanel";
import PayPanel from "./PayPanel";

function formatDate(unixSeconds: bigint): string {
  return new Date(Number(unixSeconds) * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type CancelState = "idle" | "cancelling" | "cancelled" | "error";

/** Small "Cancel invoice" control shown to the issuer of an Open invoice. */
function CancelInvoiceButton({ id }: { id: bigint }) {
  const router = useRouter();
  const { market } = getAddresses();
  const [state, setState] = useState<CancelState>("idle");
  const [hash, setHash] = useState<Hex | undefined>();
  const { writeContractAsync } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (!isSuccess) return;
    setState("cancelled");
    router.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  if (!market) return null;

  async function handleCancel() {
    if (!market) return;
    setState("cancelling");
    try {
      const txHash = await writeContractAsync({
        address: market,
        abi: invoiceMarketAbi,
        functionName: "cancel",
        args: [id],
      });
      setHash(txHash);
    } catch {
      setState("error");
    }
  }

  return (
    <div data-state={state} className="mt-2">
      <Button
        variant="danger"
        size="sm"
        onClick={handleCancel}
        disabled={state === "cancelling" || state === "cancelled"}
      >
        {state === "cancelling"
          ? "Cancelling…"
          : state === "cancelled"
            ? "Cancelled"
            : "Cancel invoice"}
      </Button>
      {state === "error" && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
          Cancel failed — the invoice may already be sold.
        </p>
      )}
    </div>
  );
}

type MarkOverdueState = "idle" | "marking" | "marked" | "error";

/**
 * "Mark overdue" control shown on a `Funded` invoice past its due date:
 * anyone may call `InvoiceMarket.markOverdue`, which revives the lapsed ENS
 * name for a fixed extension with `status = "overdue"` (settle() still
 * works either way — this only affects the ENS record/liveness).
 */
function MarkOverdueButton({ id }: { id: bigint }) {
  const router = useRouter();
  const { market } = getAddresses();
  const [state, setState] = useState<MarkOverdueState>("idle");
  const [hash, setHash] = useState<Hex | undefined>();
  const { writeContractAsync } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (!isSuccess) return;
    setState("marked");
    router.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  if (!market) return null;

  async function handleMark() {
    if (!market) return;
    setState("marking");
    try {
      const txHash = await writeContractAsync({
        address: market,
        abi: invoiceMarketAbi,
        functionName: "markOverdue",
        args: [id],
      });
      setHash(txHash);
    } catch {
      setState("error");
    }
  }

  return (
    <div className="mt-3">
      <Button
        variant="secondary"
        size="sm"
        onClick={handleMark}
        disabled={state === "marking" || state === "marked"}
        className="border-amber-400 text-amber-800 dark:border-amber-700 dark:text-amber-300"
      >
        {state === "marking"
          ? "Marking…"
          : state === "marked"
            ? "Marked overdue"
            : "Mark overdue"}
      </Button>
      {state === "error" && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
          Failed to mark overdue — please try again.
        </p>
      )}
    </div>
  );
}

function Explanation({ text }: { text: string }) {
  return <Card className="border-dashed text-sm opacity-70">{text}</Card>;
}

/**
 * Decides what to render in the invoice detail page's actions slot, based
 * on the invoice's settlement state and the connected account.
 */
export default function InvoiceActions({ invoice }: { invoice: InvoiceView }) {
  const { address: account, isConnected } = useAccount();
  const connectedAccount = isConnected ? account : undefined;
  const { displayState } = invoice;

  // A literal `data-state="…"` per case (no computed attribute values) —
  // "overdue" and "expired-unsold" are pre-empt states that must render
  // during SSR, before any wallet/chain state resolves, same as BuyPanel's
  // `name-not-live`/`ack-blocked`.
  switch (displayState) {
    case "Open": {
      const isIssuer =
        !!connectedAccount &&
        connectedAccount.toLowerCase() === invoice.market.issuer.toLowerCase();
      return (
        <div>
          <BuyPanel invoice={invoice} account={connectedAccount} />
          {isIssuer && <CancelInvoiceButton id={invoice.id} />}
        </div>
      );
    }
    case "Funded":
      return <PayPanel invoice={invoice} account={connectedAccount} />;
    case "Overdue":
      return (
        <div className="flex flex-col gap-4">
          {invoice.live ? (
            <div
              data-state="overdue"
              className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200"
            >
              <p>
                Past due — the debtor company can still pay.
                {invoice.ensExpiry
                  ? ` This invoice stays active until ${formatDate(invoice.ensExpiry)}.`
                  : ""}
              </p>
            </div>
          ) : (
            <div
              data-state="overdue"
              className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200"
            >
              <p>
                Past due — the debtor company can still pay. Mark overdue keeps the invoice&apos;s
                ENS name alive for 30 more days while payment is chased.
              </p>
              <MarkOverdueButton id={invoice.id} />
            </div>
          )}
          <PayPanel invoice={invoice} account={connectedAccount} />
        </div>
      );
    case "Expired-unsold":
      return (
        <div
          data-state="expired-unsold"
          className="rounded-xl border border-dashed border-black/[.08] p-4 text-sm opacity-70 dark:border-white/[.145]"
        >
          Not sold in time — nobody bought this invoice before its due date.
        </div>
      );
    case "Paid":
      return <Explanation text="This receivable has been settled in full." />;
    case "Cancelled":
      return <Explanation text="Withdrawn by the supplier." />;
  }
}
