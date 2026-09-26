"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAccount, useSwitchChain } from "wagmi";

export const SEPOLIA_CHAIN_ID = 11155111;

/**
 * Nav link that highlights itself when the current page matches its target
 * (hash fragments, e.g. `/#for-sale`, are stripped before comparing — they
 * still point at the home page). Lives here rather than layout.tsx because
 * `usePathname` needs a client component and layout.tsx stays a server
 * component.
 */
export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const target = href.split("#")[0] || "/";
  const isActive = pathname === target;

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`inline-flex min-h-11 items-center whitespace-nowrap border-b-2 px-0.5 ${
        isActive
          ? "border-black text-black dark:border-white dark:text-white"
          : "border-transparent text-black/70 hover:text-black dark:text-white/70 dark:hover:text-white"
      }`}
    >
      {children}
    </Link>
  );
}

/**
 * True whenever the app should treat the connected wallet as usable:
 * disconnected (panels show their own connect prompts) or connected and on
 * Sepolia. False only while connected to the wrong network — later cards use
 * this to disable write actions.
 *
 * Reads `chainId` off `useAccount()`, not `useChainId()`: this app's wagmi
 * config only lists Sepolia (`web/lib/wagmi.ts`), and wagmi's `syncConnectedChain`
 * refuses to move the global "active chain" (`useChainId()`) to a chain that
 * isn't in that list — so `useChainId()` reports Sepolia forever regardless of
 * what the wallet is actually on. `useAccount().chainId` reflects the
 * connection's real, unclamped chain, which is what "wrong network" needs.
 */
export function useOnSepolia(): boolean {
  const { isConnected, chainId } = useAccount();
  return !isConnected || chainId === SEPOLIA_CHAIN_ID;
}

/**
 * Full-width banner shown under the header when a connected wallet is on the
 * wrong network. Renders nothing when disconnected or already on Sepolia, and
 * nothing at all until after mount: wagmi's `ssr: true` config always starts
 * disconnected on the server and on first client paint, so gating on
 * `mounted` keeps that first paint (no banner) consistent instead of the
 * banner popping in the instant a persisted wrong-chain connection rehydrates.
 */
export default function ChainGuard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { isConnected, chainId } = useAccount();
  const { switchChain, isPending, error } = useSwitchChain();

  if (!mounted || !isConnected || chainId === SEPOLIA_CHAIN_ID) return null;

  return (
    <div
      role="alert"
      className="w-full border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200"
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <p>Your wallet is on the wrong network — Seikyu runs on the Sepolia test network.</p>
        <button
          type="button"
          disabled={isPending}
          onClick={() => switchChain({ chainId: SEPOLIA_CHAIN_ID })}
          className="min-h-11 shrink-0 rounded-full border border-amber-400 bg-white px-4 py-2 text-sm font-medium text-amber-900 disabled:opacity-50 dark:bg-transparent dark:text-amber-100"
        >
          {isPending ? "Switching…" : "Switch to Sepolia"}
        </button>
      </div>
      {error && <p className="mx-auto mt-2 max-w-5xl text-xs text-amber-800 dark:text-amber-300">{error.message}</p>}
    </div>
  );
}
