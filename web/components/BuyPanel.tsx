"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BaseError,
  ContractFunctionRevertedError,
  formatUnits,
  zeroAddress,
  type Address,
  type Hex,
} from "viem";
import { useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { getAddresses } from "@/lib/addresses";
import { invoiceMarketAbi, mockUsdcAbi } from "@/lib/generated";
import type { InvoiceView } from "@/lib/invoices";
import { WorldVerifyButton } from "./WorldVerifyButton";

type BuyState =
  | "idle"
  | "approving"
  | "buying"
  | "bought"
  | "error"
  | "not-verified"
  | "position-cap"
  | "name-not-live"
  | "ack-blocked"
  | "due-passed"
  | "paused";

/**
 * User-facing name for the World ID credential the market is currently
 * configured to require, keyed off `NEXT_PUBLIC_WORLD_PRESET` (see
 * `web/lib/env.ts#worldPresetSchema` — default "passport"). Read literally
 * so Next.js can inline it into the client bundle; kept local to this
 * component rather than added to `@/lib/world` (owned by C1).
 */
const CREDENTIAL_LABEL: Record<string, string> = {
  passport: "World ID Passport (document-level uniqueness)",
  proofOfHuman: "World ID Proof of Human (Orb-backed uniqueness)",
  orbLegacy: "World ID Proof of Human (Orb-backed uniqueness)",
  selfieCheck: "World ID Selfie Check",
};

function credentialLabel(): string {
  const preset = process.env.NEXT_PUBLIC_WORLD_PRESET;
  return (preset && CREDENTIAL_LABEL[preset]) || CREDENTIAL_LABEL.passport;
}

/** Records/market amounts are stored as integers with 6 decimals (like USDC). */
function formatMoney(raw: bigint): string {
  const formatted = formatUnits(raw, 6);
  const [whole, frac = "0"] = formatted.split(".");
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${withCommas}.${frac.slice(0, 2).padEnd(2, "0")}`;
}

/** Decodes a `buy()`/`approve()` revert into one of the named error states. */
function decodeBuyError(err: unknown): { state: BuyState; ack?: string } {
  if (err instanceof BaseError) {
    const revert = err.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) {
      const name = revert.data?.errorName;
      switch (name) {
        case "NotVerifiedInvestor":
          return { state: "not-verified" };
        case "PositionCapReached":
          return { state: "position-cap" };
        case "NameNotLive":
          return { state: "name-not-live" };
        case "PurchaseBlockedByAck": {
          const ack = revert.data?.args?.[0];
          return { state: "ack-blocked", ack: typeof ack === "string" ? ack : undefined };
        }
        case "DueDatePassed":
          return { state: "due-passed" };
        case "EnforcedPause":
          return { state: "paused" };
        default:
          return { state: "error" };
      }
    }
  }
  return { state: "error" };
}

/**
 * Renders per-state JSX with a *literal* `data-state="..."` attribute on
 * each branch (mirrors WorldVerifyButton's `renderState`) — a grep-based
 * acceptance check depends on these literal attribute strings appearing in
 * source, and it also keeps the pre-empted `name-not-live`/`ack-blocked`
 * branches renderable during SSR, before any wallet/chain state resolves.
 */
function renderState(
  state: BuyState,
  ctx: {
    account: Address | undefined;
    verifiedLoading: boolean;
    verified: boolean | undefined;
    onVerify: () => void;
    needsApproval: boolean;
    priceLabel: string;
    discountPct: number;
    ackText: string;
    busy: boolean;
    onApprove: () => void;
    onBuy: () => void;
  },
) {
  switch (state) {
    case "idle": {
      if (!ctx.account) {
        return (
          <div data-state="idle">
            <p className="text-sm opacity-70">Connect a wallet to buy this receivable.</p>
          </div>
        );
      }
      if (ctx.verifiedLoading) {
        return (
          <div data-state="idle">
            <p className="text-sm opacity-70">Checking World ID verification…</p>
          </div>
        );
      }
      return (
        <div data-state="idle">
          <p className="text-sm">
            Price {ctx.priceLabel} mUSDC{" "}
            <span className="opacity-60">({ctx.discountPct.toFixed(1)}% discount)</span>
          </p>
          <button
            type="button"
            onClick={ctx.needsApproval ? ctx.onApprove : ctx.onBuy}
            disabled={ctx.busy}
            className="mt-3 inline-flex min-h-10 items-center justify-center rounded-full bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {ctx.needsApproval ? "Approve mUSDC" : `Buy for ${ctx.priceLabel} mUSDC`}
          </button>
        </div>
      );
    }
    case "approving":
      return (
        <div data-state="approving">
          <p className="text-sm opacity-70">Approving mUSDC…</p>
        </div>
      );
    case "buying":
      return (
        <div data-state="buying">
          <p className="text-sm opacity-70">Buying…</p>
        </div>
      );
    case "bought":
      return (
        <div data-state="bought">
          <p className="text-sm">Purchased — you now hold this receivable.</p>
        </div>
      );
    case "not-verified":
      return (
        <div data-state="not-verified">
          <p className="text-sm opacity-80">
            Buying a receivable requires a {credentialLabel()} proof (one wallet per person, max
            3 open positions).
          </p>
          <div className="mt-3">
            {ctx.account && (
              <WorldVerifyButton investor={ctx.account} onVerified={ctx.onVerify} />
            )}
          </div>
        </div>
      );
    case "position-cap":
      return (
        <div data-state="position-cap">
          <p className="text-sm text-red-600 dark:text-red-400">
            You already hold the maximum of 3 open positions.
          </p>
        </div>
      );
    case "name-not-live":
      return (
        <div data-state="name-not-live">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            This invoice&apos;s ENS name is no longer live, so it can&apos;t be bought.
          </p>
        </div>
      );
    case "ack-blocked":
      return (
        <div data-state="ack-blocked">
          <p className="text-sm text-red-600 dark:text-red-400">
            The debtor marked this invoice &ldquo;{ctx.ackText}&rdquo; — purchases are blocked
            until it is re-acknowledged.
          </p>
        </div>
      );
    case "due-passed":
      return (
        <div data-state="due-passed">
          <p className="text-sm text-red-600 dark:text-red-400">
            This invoice&apos;s due date has passed.
          </p>
        </div>
      );
    case "paused":
      return (
        <div data-state="paused">
          <p className="text-sm text-red-600 dark:text-red-400">The market is currently paused.</p>
        </div>
      );
    case "error":
      return (
        <div data-state="error">
          <p className="text-sm text-red-600 dark:text-red-400">
            Transaction failed. Please try again.
          </p>
        </div>
      );
  }
}

export default function BuyPanel({
  invoice,
  account,
}: {
  invoice: InvoiceView;
  account: Address | undefined;
}) {
  const router = useRouter();
  const { market, mockUsdc } = getAddresses();

  const [state, setState] = useState<BuyState>("idle");
  const [ackMessage, setAckMessage] = useState<string | undefined>();
  const [phase, setPhase] = useState<"approve" | "buy" | null>(null);
  const [hash, setHash] = useState<Hex | undefined>();

  const {
    data: verified,
    isLoading: verifiedLoading,
    refetch: refetchVerified,
  } = useReadContract({
    address: market ?? undefined,
    abi: invoiceMarketAbi,
    functionName: "isVerified",
    args: [account ?? zeroAddress],
    query: {
      enabled: Boolean(market) && Boolean(account),
      // Poll while not (yet) verified, so a WorldVerifyButton success
      // elsewhere gets picked up without a manual refresh.
      refetchInterval: (query) => (query.state.data ? false : 5000),
    },
  });

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
      setState("bought");
      router.refresh();
    }
    setPhase(null);
    setHash(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receiptSuccess, phase]);

  const preempt: BuyState | null = !invoice.live
    ? "name-not-live"
    : invoice.ackView === "disputed" || invoice.ackView === "invalid"
      ? "ack-blocked"
      : null;

  const effectiveState: BuyState = preempt
    ? preempt
    : !account
      ? "idle"
      : verifiedLoading
        ? "idle"
        : !verified
          ? "not-verified"
          : state;

  const discountPct =
    invoice.market.faceValue > 0n
      ? Number(
          ((invoice.market.faceValue - invoice.market.price) * 10_000n) / invoice.market.faceValue,
        ) / 100
      : 0;

  const needsApproval = allowance === undefined || allowance < invoice.market.price;
  const busy = state === "approving" || state === "buying";

  async function handleApprove() {
    if (!market || !mockUsdc) return;
    setState("approving");
    setPhase("approve");
    try {
      const txHash = await writeContractAsync({
        address: mockUsdc,
        abi: mockUsdcAbi,
        functionName: "approve",
        args: [market, invoice.market.price],
      });
      setHash(txHash);
    } catch (err) {
      setPhase(null);
      const decoded = decodeBuyError(err);
      setState(decoded.state);
      setAckMessage(decoded.ack);
    }
  }

  async function handleBuy() {
    if (!market) return;
    setState("buying");
    setPhase("buy");
    try {
      const txHash = await writeContractAsync({
        address: market,
        abi: invoiceMarketAbi,
        functionName: "buy",
        args: [invoice.id],
      });
      setHash(txHash);
    } catch (err) {
      setPhase(null);
      const decoded = decodeBuyError(err);
      setState(decoded.state);
      setAckMessage(decoded.ack);
    }
  }

  return (
    <div className="rounded-xl border border-black/[.08] p-4 dark:border-white/[.145]">
      {renderState(effectiveState, {
        account,
        verifiedLoading,
        verified,
        onVerify: () => refetchVerified(),
        needsApproval,
        priceLabel: formatMoney(invoice.market.price),
        discountPct,
        ackText: ackMessage ?? invoice.records.ack,
        busy,
        onApprove: handleApprove,
        onBuy: handleBuy,
      })}
    </div>
  );
}
