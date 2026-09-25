"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Hex } from "viem";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { getAddresses } from "@/lib/addresses";
import { invoiceMarketAbi } from "@/lib/generated";
import type { InvoiceView } from "@/lib/invoices";
import BuyPanel from "./BuyPanel";
import PayPanel from "./PayPanel";

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
      <button
        type="button"
        onClick={handleCancel}
        disabled={state === "cancelling" || state === "cancelled"}
        className="rounded-full border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 disabled:opacity-50 dark:border-red-800 dark:text-red-400"
      >
        {state === "cancelling"
          ? "Cancelling…"
          : state === "cancelled"
            ? "Cancelled"
            : "Cancel invoice"}
      </button>
      {state === "error" && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
          Cancel failed — the invoice may already be sold.
        </p>
      )}
    </div>
  );
}

function Explanation({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed border-black/[.08] p-4 text-sm opacity-70 dark:border-white/[.145]">
      {text}
    </p>
  );
}

/**
 * Decides what to render in the invoice detail page's actions slot, based
 * on the invoice's settlement state and the connected account.
 */
export default function InvoiceActions({ invoice }: { invoice: InvoiceView }) {
  const { address: account, isConnected } = useAccount();
  const connectedAccount = isConnected ? account : undefined;
  const { displayState } = invoice;

  if (displayState === "Open") {
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

  if (displayState === "Funded" || displayState === "Overdue") {
    return <PayPanel invoice={invoice} account={connectedAccount} />;
  }

  switch (displayState) {
    case "Paid":
      return <Explanation text="This receivable has been settled in full." />;
    case "Cancelled":
      return <Explanation text="The issuer cancelled this invoice before it was sold." />;
    case "Expired-unsold":
      return (
        <Explanation text="This invoice's due date passed before it found a buyer." />
      );
  }
}
