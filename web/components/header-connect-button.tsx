"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

/**
 * RainbowKit's <ConnectButton /> was dropped along with the rest of
 * RainbowKit (see web/lib/wagmi.ts for why) — this is a minimal button
 * built directly on wagmi's injected connector.
 */
export function HeaderConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);
  const connector = connectors[0];
  // `connectors` always contains the statically-configured `injected()`
  // connector, even with no injected wallet present — it only fails once you
  // try to connect. `getProvider()` is how wagmi itself checks for an actual
  // `window.ethereum` (or EIP-6963 provider) before that point, so use it to
  // show "no wallet" state up front instead of waiting for a failed connect.
  const [hasProvider, setHasProvider] = useState(true);

  useEffect(() => {
    if (!connector) {
      setHasProvider(false);
      return;
    }
    let cancelled = false;
    connector
      .getProvider()
      .then((provider) => {
        if (!cancelled) setHasProvider(Boolean(provider));
      })
      .catch(() => {
        if (!cancelled) setHasProvider(false);
      });
    return () => {
      cancelled = true;
    };
  }, [connector]);

  // Never let a stale confirm prompt survive a disconnect/reconnect/address
  // change that didn't go through the Yes/No buttons below.
  useEffect(() => {
    setConfirmingDisconnect(false);
  }, [isConnected, address]);

  if (isConnected && address) {
    const short = `${address.slice(0, 6)}…${address.slice(-4)}`;

    if (confirmingDisconnect) {
      return (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-black/70 dark:text-white/70">Disconnect?</span>
          <button
            type="button"
            onClick={() => {
              disconnect();
              setConfirmingDisconnect(false);
            }}
            className="min-h-11 rounded-full border border-black/[.08] px-3 text-sm font-medium dark:border-white/[.145]"
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDisconnect(false)}
            className="min-h-11 rounded-full border border-black/[.08] px-3 text-sm font-medium dark:border-white/[.145]"
          >
            No
          </button>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={() => setConfirmingDisconnect(true)}
        className="min-h-11 rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium dark:border-white/[.145]"
      >
        {short}
      </button>
    );
  }

  if (!connector || !hasProvider) {
    // A `title` tooltip alone would be unreachable on touch devices (no
    // hover), and a permanently visible helper line pushes the header past
    // two rows at narrow widths — so the full instruction goes in
    // `aria-label`, which every screen reader gets regardless of device,
    // while `title` still shows a tooltip for mouse users.
    return (
      <button
        type="button"
        disabled
        title="Install MetaMask or open this page in a wallet browser"
        aria-label="No browser wallet found. Install MetaMask or open this page in a wallet browser."
        className="min-h-11 rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium opacity-50 dark:border-white/[.145]"
      >
        No browser wallet found
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={() => connect({ connector })}
        className="min-h-11 rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium disabled:opacity-50 dark:border-white/[.145]"
      >
        {isPending ? "Connecting…" : "Connect Wallet"}
      </button>
      {connectError && (
        <p className="text-xs text-red-600 dark:text-red-400">{connectError.message}</p>
      )}
    </div>
  );
}
