"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";

/**
 * RainbowKit's <ConnectButton /> was dropped along with the rest of
 * RainbowKit (see web/lib/wagmi.ts for why) — this is a minimal button
 * built directly on wagmi's injected connector.
 */
export function HeaderConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <button
        type="button"
        onClick={() => disconnect()}
        className="rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium dark:border-white/[.145]"
      >
        {address.slice(0, 6)}…{address.slice(-4)}
      </button>
    );
  }

  const connector = connectors[0];

  return (
    <button
      type="button"
      disabled={!connector || isPending}
      onClick={() => connector && connect({ connector })}
      className="rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium disabled:opacity-50 dark:border-white/[.145]"
    >
      {isPending ? "Connecting…" : "Connect Wallet"}
    </button>
  );
}
