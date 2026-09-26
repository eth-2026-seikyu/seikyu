"use client";

import { useCallback, useRef, useState } from "react";
import { IDKitErrorCodes, IDKitRequestWidget } from "@worldcoin/idkit";
import type { IDKitResult } from "@worldcoin/idkit-core";
import type { Address, Hex } from "viem";
import { publicEnv } from "@/lib/env";
import {
  allowLegacyProofsFor,
  buildPreset,
  messageFor,
  stateForErrorCode,
  worldEnvironment,
  type WorldVerifyState,
} from "@/lib/world";
import { useOnSepolia } from "./ChainGuard";
import { Button } from "./ui/Button";

type RpContext = {
  rp_id: string;
  nonce: string;
  created_at: number;
  expires_at: number;
  signature: string;
};

type WorldVerifyButtonProps = {
  investor: Address;
  onVerified?: (txHash: Hex) => void;
};

/**
 * Renders per-state JSX with a *literal* `data-state="..."` attribute (a
 * grep-based acceptance check depends on the literal attribute text
 * appearing in source — a dynamically computed value wouldn't satisfy it).
 */
const ERROR_TEXT = "text-sm text-red-600 dark:text-red-400";
const MUTED_TEXT = "text-sm opacity-70";

function renderState(
  state: WorldVerifyState,
  message: string,
  onAction: () => void,
  onSepolia: boolean,
) {
  switch (state) {
    case "idle":
      return (
        <div data-state="idle">
          <Button onClick={onAction} disabled={!onSepolia}>
            Verify with World ID
          </Button>
          {!onSepolia && (
            <p className="mt-2 text-sm opacity-70">
              Switch to the Sepolia test network first (see the banner above).
            </p>
          )}
        </div>
      );
    case "open":
      return (
        <div data-state="open">
          <p className={MUTED_TEXT}>{message}</p>
        </div>
      );
    case "verifying":
      return (
        <div data-state="verifying">
          <p className={MUTED_TEXT}>{message}</p>
        </div>
      );
    case "verified":
      return (
        <div data-state="verified">
          <p className="text-sm">{message}</p>
        </div>
      );
    case "cancelled":
      return (
        <div data-state="cancelled">
          <p className={ERROR_TEXT}>{message}</p>
          <Button variant="secondary" size="sm" onClick={onAction} className="mt-2">
            Retry
          </Button>
        </div>
      );
    case "credential-unavailable":
      return (
        <div data-state="credential-unavailable">
          <p className={ERROR_TEXT}>{message}</p>
          <Button variant="secondary" size="sm" onClick={onAction} className="mt-2">
            Retry
          </Button>
        </div>
      );
    case "credential-mismatch":
      return (
        <div data-state="credential-mismatch">
          <p className={ERROR_TEXT}>{message}</p>
          <Button variant="secondary" size="sm" onClick={onAction} className="mt-2">
            Retry
          </Button>
        </div>
      );
    case "signal-mismatch":
      return (
        <div data-state="signal-mismatch">
          <p className={ERROR_TEXT}>{message}</p>
          <Button variant="secondary" size="sm" onClick={onAction} className="mt-2">
            Retry
          </Button>
        </div>
      );
    case "nullifier-used":
      return (
        <div data-state="nullifier-used">
          <p className={ERROR_TEXT}>{message}</p>
          <Button variant="secondary" size="sm" onClick={onAction} className="mt-2">
            Retry
          </Button>
        </div>
      );
    case "failed":
      return (
        <div data-state="failed">
          <p className={ERROR_TEXT}>{message}</p>
          <Button variant="secondary" size="sm" onClick={onAction} className="mt-2">
            Retry
          </Button>
        </div>
      );
  }
}

export function WorldVerifyButton({ investor, onVerified }: WorldVerifyButtonProps) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<WorldVerifyState>("idle");
  const [boundTo, setBoundTo] = useState<Address | undefined>(undefined);
  const [rpContext, setRpContext] = useState<RpContext | null>(null);
  const txHashRef = useRef<Hex | null>(null);
  const onSepolia = useOnSepolia();

  const handleOpen = useCallback(async () => {
    setBoundTo(undefined);
    txHashRef.current = null;

    try {
      const res = await fetch("/api/world/rp-context");
      if (!res.ok) {
        setState("failed");
        return;
      }
      const context = (await res.json()) as RpContext;
      setRpContext(context);
      setState("open");
      setOpen(true);
    } catch {
      setState("failed");
    }
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      // Only reaching for "cancelled" from the initial "open" state — once
      // handleVerify has run and landed on a specific state (verifying,
      // verified, or one of the failure buckets), closing the modal
      // afterwards (e.g. the widget's own "Close" button on its error
      // screen) must not stomp on that state.
      if (!next) {
        setState((current) => (current === "open" ? "cancelled" : current));
      }
    },
    [],
  );

  const handleVerify = useCallback(
    async (result: IDKitResult) => {
      setState("verifying");

      let response: Response;
      try {
        response = await fetch("/api/world/verify", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ investor, result }),
        });
      } catch (networkError) {
        setState("failed");
        throw networkError instanceof Error ? networkError : new Error("network_error");
      }

      const body: Record<string, unknown> = await response.json().catch(() => ({}));

      if (!response.ok) {
        const code = typeof body.code === "string" ? body.code : undefined;
        if (typeof body.boundTo === "string") {
          setBoundTo(body.boundTo as Address);
        }
        setState(stateForErrorCode(code));
        // Throwing tells IDKitRequestWidget this attempt failed. Its onError
        // only ever receives IDKitErrorCodes.FailedByHostApp for a
        // handleVerify rejection (see @worldcoin/idkit dist/index.js
        // `startHostVerify` -> `.catch()`), which discards the rejection
        // reason — so the precise server code must be captured here, not
        // read back from onError.
        throw new Error(code ?? "VERIFICATION_FAILED");
      }

      txHashRef.current = typeof body.txHash === "string" ? (body.txHash as Hex) : null;
    },
    [investor],
  );

  const handleSuccess = useCallback(() => {
    setState("verified");
    if (txHashRef.current) {
      onVerified?.(txHashRef.current);
    }
  }, [onVerified]);

  const handleWidgetError = useCallback((errorCode: IDKitErrorCodes) => {
    if (errorCode === IDKitErrorCodes.FailedByHostApp) {
      // handleVerify already set the precise state/message above.
      return;
    }
    if (errorCode === IDKitErrorCodes.Cancelled) {
      setState("cancelled");
      return;
    }
    if (errorCode === IDKitErrorCodes.CredentialUnavailable) {
      setState("credential-unavailable");
      return;
    }
    setState("failed");
  }, []);

  const message = messageFor(state, { boundTo });
  const appId = publicEnv.NEXT_PUBLIC_WORLD_APP_ID;

  return (
    <>
      {renderState(state, message, handleOpen, onSepolia)}
      {rpContext && appId && (
        <IDKitRequestWidget
          open={open}
          onOpenChange={handleOpenChange}
          app_id={appId as `app_${string}`}
          action={publicEnv.NEXT_PUBLIC_WORLD_ACTION}
          rp_context={rpContext}
          environment={worldEnvironment()}
          allow_legacy_proofs={allowLegacyProofsFor(publicEnv.NEXT_PUBLIC_WORLD_PRESET)}
          preset={buildPreset(publicEnv, investor)}
          handleVerify={handleVerify}
          onSuccess={handleSuccess}
          onError={handleWidgetError}
        />
      )}
    </>
  );
}
