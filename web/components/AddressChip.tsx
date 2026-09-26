"use client";

import { useEffect, useRef, useState } from "react";
import type { Address } from "viem";
import { shortAddress } from "@/lib/format";

function blockscoutAddress(address: Address): string {
  return `https://eth-sepolia.blockscout.com/address/${address}`;
}

/**
 * Copies `text` to the clipboard. Prefers the async Clipboard API, which
 * needs a secure context (https or localhost); falls back to a hidden
 * `<textarea>` + `execCommand("copy")` for plain-http deployments where
 * `navigator.clipboard` doesn't exist at all.
 */
async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to the legacy fallback below
    }
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Short address (`0x1234…abcd`) with a copy button and a link to Blockscout.
 * Used for the plain-language "Supplier" / "Debtor company" / "Current owner"
 * rows on the invoice detail page.
 */
export default function AddressChip({ address }: { address: Address }) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  async function handleCopy() {
    const ok = await copyToClipboard(address);
    if (!ok) return;
    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 1500);
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <a
        href={blockscoutAddress(address)}
        target="_blank"
        rel="noreferrer"
        className="break-all font-mono text-xs hover:underline"
      >
        {shortAddress(address)}
      </a>
      <span className="relative inline-flex">
        <button
          type="button"
          aria-label="Copy address"
          onClick={handleCopy}
          className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-sm opacity-60 transition hover:bg-black/[.06] hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/50 dark:hover:bg-white/[.1] dark:focus-visible:ring-white/50"
        >
          <span aria-hidden="true">{copied ? "✓" : "⧉"}</span>
        </button>
        <span
          role="status"
          className={`pointer-events-none absolute left-full top-1/2 ml-1 -translate-y-1/2 whitespace-nowrap rounded bg-black px-1.5 py-0.5 text-[10px] text-white transition-opacity dark:bg-white dark:text-black ${
            copied ? "opacity-100" : "opacity-0"
          }`}
        >
          {copied ? "Copied" : ""}
        </span>
      </span>
    </span>
  );
}
