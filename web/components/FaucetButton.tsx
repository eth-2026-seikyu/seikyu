"use client";

import { useEffect, useState } from "react";
import { formatUnits, zeroAddress, type Hex } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { getAddresses } from "@/lib/addresses";
import { mockUsdcAbi } from "@/lib/generated";

/** 10,000 mUSDC at 6 decimals — well under MockUSDC's 1,000,000e6 per-call cap. */
const MINT_AMOUNT = 10_000_000_000n;

function formatMoney(raw: bigint): string {
  const formatted = formatUnits(raw, 6);
  const [whole, frac = "0"] = formatted.split(".");
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${withCommas}.${frac.slice(0, 2).padEnd(2, "0")}`;
}

/**
 * Faucet for the demo's mock stablecoin. Hidden entirely when
 * `NEXT_PUBLIC_MOCK_USDC` isn't configured; otherwise always mounted (even
 * before a wallet connects) so it can nudge people toward connecting.
 */
export default function FaucetButton() {
  const { mockUsdc } = getAddresses();
  const { address: account } = useAccount();
  const [hash, setHash] = useState<Hex | undefined>();
  const [minting, setMinting] = useState(false);

  const { data: balance, refetch } = useReadContract({
    address: mockUsdc ?? undefined,
    abi: mockUsdcAbi,
    functionName: "balanceOf",
    args: [account ?? zeroAddress],
    query: { enabled: Boolean(mockUsdc) && Boolean(account) },
  });

  const { writeContractAsync } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (!isSuccess) return;
    refetch();
    setMinting(false);
    setHash(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  if (!mockUsdc) return null;

  async function handleMint() {
    if (!account || !mockUsdc) return;
    setMinting(true);
    try {
      const txHash = await writeContractAsync({
        address: mockUsdc,
        abi: mockUsdcAbi,
        functionName: "mint",
        args: [account, MINT_AMOUNT],
      });
      setHash(txHash);
    } catch {
      setMinting(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      {account && balance !== undefined && (
        <span className="opacity-70">Balance: {formatMoney(balance)} mUSDC</span>
      )}
      <button
        type="button"
        onClick={handleMint}
        disabled={minting || !account}
        title={!account ? "Connect a wallet first" : undefined}
        className="inline-flex min-h-10 items-center justify-center rounded-full border border-black/[.08] px-4 py-1.5 text-xs font-medium disabled:opacity-50 dark:border-white/[.145]"
      >
        {minting ? "Minting…" : "Get 10,000 mUSDC"}
      </button>
    </div>
  );
}
