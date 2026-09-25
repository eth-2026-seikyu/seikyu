"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  BaseError,
  ContractFunctionRevertedError,
  formatUnits,
  isAddress,
  parseEventLogs,
  parseUnits,
  zeroAddress,
  type Address,
} from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { getAddresses } from "@/lib/addresses";
import { invoiceMarketAbi } from "@/lib/generated";

/** Mirrors `InvoiceMarket.MIN_TENOR` (see contracts/src/InvoiceMarket.sol). */
const MIN_TENOR_SECONDS = 60;

type DuePreset = "7d" | "30d" | "10m" | "custom";

const DUE_PRESET_SECONDS: Record<Exclude<DuePreset, "custom">, number> = {
  "7d": 7 * 24 * 60 * 60,
  "30d": 30 * 24 * 60 * 60,
  "10m": 10 * 60,
};

const DUE_PRESET_LABELS: Record<Exclude<DuePreset, "custom">, string> = {
  "7d": "+7 days",
  "30d": "+30 days",
  "10m": "+10 minutes (demo expiry)",
};

function formatDueDate(seconds: number): string {
  return new Date(seconds * 1000).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Decodes `InvalidTerms`/`EnforcedPause` reverts into a message a user can act on. */
function readableError(error: unknown): string {
  if (error instanceof BaseError) {
    const revertError = error.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revertError instanceof ContractFunctionRevertedError) {
      const errorName = revertError.data?.errorName;
      if (errorName === "InvalidTerms") {
        return "Invalid terms — check the discount, due date (at least 1 minute out), and that the debtor/accountant addresses are set and differ from your wallet.";
      }
      if (errorName === "EnforcedPause") {
        return "The invoice market is paused right now. Try again later.";
      }
    }
    return error.shortMessage || error.message;
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong submitting the transaction.";
}

type UiState = "idle" | "pending" | "confirming" | "success" | "error";

export function IssueForm() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { market: marketAddress, parentName } = getAddresses();

  const [debtor, setDebtor] = useState("");
  const [accountant, setAccountant] = useState("");
  const [faceValueInput, setFaceValueInput] = useState("");
  const [discountPct, setDiscountPct] = useState(5);
  const [duePreset, setDuePreset] = useState<DuePreset>("7d");
  const [customDueDate, setCustomDueDate] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Ticks every 30s so the live preview's resolved due date stays roughly
  // current. Starts `null` and resolves in an effect so this never depends
  // on the clock during the server render (see InvoiceCard's LiveCountdown
  // for the same pattern).
  const [nowSeconds, setNowSeconds] = useState<number | null>(null);
  useEffect(() => {
    setNowSeconds(Math.floor(Date.now() / 1000));
    const id = setInterval(() => setNowSeconds(Math.floor(Date.now() / 1000)), 30_000);
    return () => clearInterval(id);
  }, []);

  const { data: invoiceCount } = useReadContract({
    address: marketAddress ?? undefined,
    abi: invoiceMarketAbi,
    functionName: "invoiceCount",
    query: { enabled: marketAddress !== null },
  });
  const { data: isPaused } = useReadContract({
    address: marketAddress ?? undefined,
    abi: invoiceMarketAbi,
    functionName: "paused",
    query: { enabled: marketAddress !== null },
  });
  const nextId = invoiceCount !== undefined ? invoiceCount + 1n : null;
  const previewName =
    nextId !== null ? `inv-${nextId.toString()}.${parentName ?? "<parent>.eth"}` : null;

  const dueDateSeconds = useMemo((): bigint | null => {
    if (duePreset !== "custom") {
      if (nowSeconds === null) return null;
      return BigInt(nowSeconds + DUE_PRESET_SECONDS[duePreset]);
    }
    if (!customDueDate) return null;
    const ms = new Date(customDueDate).getTime();
    if (Number.isNaN(ms)) return null;
    return BigInt(Math.floor(ms / 1000));
  }, [duePreset, customDueDate, nowSeconds]);

  const faceValueWei = useMemo((): bigint | null => {
    if (!faceValueInput.trim()) return null;
    try {
      return parseUnits(faceValueInput.trim(), 6);
    } catch {
      return null;
    }
  }, [faceValueInput]);

  const priceWei = useMemo((): bigint | null => {
    if (faceValueWei === null || !Number.isFinite(discountPct)) return null;
    return (faceValueWei * BigInt(100 - Math.round(discountPct))) / 100n;
  }, [faceValueWei, discountPct]);

  const {
    writeContract,
    data: hash,
    error: writeError,
    isPending: isSubmitting,
    reset: resetWrite,
  } = useWriteContract();

  const {
    data: receipt,
    isLoading: isConfirming,
    isSuccess,
    error: receiptError,
  } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (!isSuccess || !receipt) return;
    const events = parseEventLogs({
      abi: invoiceMarketAbi,
      logs: receipt.logs,
      eventName: "InvoiceCreated",
    });
    const created = events[0];
    if (created) {
      router.push(`/invoice/${encodeURIComponent(created.args.name)}`);
    }
  }, [isSuccess, receipt, router]);

  const uiState: UiState =
    writeError || receiptError
      ? "error"
      : isSuccess
        ? "success"
        : isConfirming
          ? "confirming"
          : isSubmitting
            ? "pending"
            : "idle";

  function validate(): string | null {
    if (!isAddress(debtor)) return "Debtor address is not a valid address.";
    if (!isAddress(accountant)) return "Accountant address is not a valid address.";
    if (debtor === zeroAddress) return "Debtor cannot be the zero address.";
    if (accountant === zeroAddress) return "Accountant cannot be the zero address.";
    if (address && debtor.toLowerCase() === address.toLowerCase()) {
      return "Debtor cannot be your own connected wallet.";
    }
    if (address && accountant.toLowerCase() === address.toLowerCase()) {
      return "Accountant cannot be your own connected wallet.";
    }
    if (faceValueWei === null || faceValueWei <= 0n) {
      return "Enter a face value greater than zero.";
    }
    if (priceWei === null || priceWei <= 0n || priceWei >= faceValueWei) {
      return "Discount must result in a price greater than 0 and less than the face value.";
    }
    if (dueDateSeconds === null) return "Choose a valid due date.";
    if (dueDateSeconds < BigInt(Math.floor(Date.now() / 1000) + MIN_TENOR_SECONDS)) {
      return "Due date must be at least 1 minute from now.";
    }
    return null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetWrite();
    const validationError = validate();
    setFormError(validationError);
    if (
      validationError ||
      !marketAddress ||
      faceValueWei === null ||
      priceWei === null ||
      dueDateSeconds === null
    ) {
      return;
    }

    writeContract({
      address: marketAddress,
      abi: invoiceMarketAbi,
      functionName: "createInvoice",
      args: [debtor as Address, accountant as Address, faceValueWei, priceWei, dueDateSeconds],
    });
  }

  if (!marketAddress) {
    return (
      <div
        data-state="unavailable"
        className="mt-6 rounded-xl border border-dashed border-black/[.08] p-6 text-sm opacity-70 dark:border-white/[.145]"
      >
        Market not deployed yet — set <code className="font-mono">NEXT_PUBLIC_INVOICE_MARKET</code>{" "}
        to enable issuing invoices.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} data-state={uiState} className="mt-6 flex flex-col gap-5">
      {!isConnected && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
          Connect your wallet using the button in the header to issue an invoice.
        </p>
      )}
      {isPaused === true && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
          The invoice market is currently paused.
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Debtor address (取引先)</span>
        <input
          type="text"
          value={debtor}
          onChange={(e) => setDebtor(e.target.value.trim())}
          placeholder="0x…"
          className="rounded-lg border border-black/[.08] px-3 py-2 font-mono text-sm dark:border-white/[.145] dark:bg-transparent"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Debtor accounts-payable address (取引先経理)</span>
        <input
          type="text"
          value={accountant}
          onChange={(e) => setAccountant(e.target.value.trim())}
          placeholder="0x…"
          className="rounded-lg border border-black/[.08] px-3 py-2 font-mono text-sm dark:border-white/[.145] dark:bg-transparent"
        />
        <span className="text-xs opacity-60">
          This wallet may only set the <code className="font-mono">ack</code> record.
        </span>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Face value (mUSDC)</span>
        <input
          type="text"
          inputMode="decimal"
          value={faceValueInput}
          onChange={(e) => setFaceValueInput(e.target.value)}
          placeholder="10000"
          className="rounded-lg border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145] dark:bg-transparent"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Discount %</span>
        <input
          type="number"
          min={1}
          max={99}
          step={1}
          value={discountPct}
          onChange={(e) => setDiscountPct(Number(e.target.value))}
          className="w-24 rounded-lg border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145] dark:bg-transparent"
        />
        {priceWei !== null && faceValueWei !== null && (
          <span className="text-xs opacity-60">
            Investor pays {formatUnits(priceWei, 6)} mUSDC now for {formatUnits(faceValueWei, 6)}{" "}
            mUSDC at maturity.
          </span>
        )}
      </label>

      <fieldset className="flex flex-col gap-2 text-sm">
        <legend className="mb-1 font-medium">Due date</legend>
        <div className="flex flex-wrap gap-4">
          {(Object.keys(DUE_PRESET_SECONDS) as Exclude<DuePreset, "custom">[]).map((preset) => (
            <label key={preset} className="flex items-center gap-2">
              <input
                type="radio"
                name="duePreset"
                checked={duePreset === preset}
                onChange={() => setDuePreset(preset)}
              />
              {DUE_PRESET_LABELS[preset]}
            </label>
          ))}
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="duePreset"
              checked={duePreset === "custom"}
              onChange={() => setDuePreset("custom")}
            />
            Custom
          </label>
        </div>
        {duePreset === "custom" && (
          <input
            type="datetime-local"
            value={customDueDate}
            onChange={(e) => setCustomDueDate(e.target.value)}
            className="rounded-lg border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145] dark:bg-transparent"
          />
        )}
      </fieldset>

      <p className="rounded-lg border border-black/[.08] bg-black/[.02] px-3 py-2 text-xs opacity-70 dark:border-white/[.145] dark:bg-white/[.03]">
        {previewName ? (
          <>
            Registers <span className="font-mono">{previewName}</span>
            {dueDateSeconds !== null && (
              <> with expiry = {formatDueDate(Number(dueDateSeconds))}</>
            )}
          </>
        ) : (
          "Loading next invoice id…"
        )}
      </p>

      {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}
      {(writeError || receiptError) && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {readableError(writeError ?? receiptError)}
        </p>
      )}

      {hash && (
        <a
          href={`https://sepolia.etherscan.io/tx/${hash}`}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          View transaction →
        </a>
      )}

      <button
        type="submit"
        disabled={!isConnected || isSubmitting || isConfirming || isPaused === true}
        className="self-start rounded-full bg-black px-5 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {isSubmitting
          ? "Confirm in wallet…"
          : isConfirming
            ? "Confirming…"
            : isSuccess
              ? "Issued!"
              : "Issue invoice"}
      </button>
    </form>
  );
}
