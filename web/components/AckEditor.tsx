"use client";

import { useEffect, useMemo, useState } from "react";
import { BaseError, ContractFunctionRevertedError, zeroAddress } from "viem";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { EAC_UNAUTHORIZED_ERROR, permissionedResolverAbi, registrarAbi } from "@/lib/abi/permissionedResolver";
import { getAddresses } from "@/lib/addresses";
import { idFromLabel } from "@/lib/ens";
import { RECORD_KEYS, ackViewOf, type RecordKey } from "@/lib/invoices";
import { AckBadge } from "./StatusBadge";
import { Button } from "./ui/Button";

type AckAction = "acknowledged" | "disputed" | "";
type AckWriteState = "idle" | "pending" | "confirmed" | "error";
type NegativeKey = "amount" | "status";

interface NegativeResult {
  status: "denied" | "unexpected-success" | "error";
  errorName?: string;
  message: string;
  txHash?: `0x${string}`;
}

/** Decodes a revert into `{ errorName, message }`, mirroring `IssueForm.tsx`'s `readableError`. */
function decodeRevert(error: unknown): { errorName?: string; message: string } {
  if (error instanceof BaseError) {
    const revertError = error.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revertError instanceof ContractFunctionRevertedError) {
      return { errorName: revertError.data?.errorName, message: error.shortMessage };
    }
    return { message: error.shortMessage || error.message };
  }
  return { message: error instanceof Error ? error.message : "Something went wrong." };
}

function etherscanTx(hash: string): string {
  return `https://sepolia.etherscan.io/tx/${hash}`;
}

export function AckEditor({ initialName }: { initialName?: string }) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const registrar = getAddresses().registrar;

  const [nameInput, setNameInput] = useState(initialName ?? "");
  const [nameError, setNameError] = useState<string | null>(null);
  const [negativeResults, setNegativeResults] = useState<Record<NegativeKey, NegativeResult | null>>({
    amount: null,
    status: null,
  });
  const [negativePending, setNegativePending] = useState<NegativeKey | null>(null);
  const [sendRealTxAnyway, setSendRealTxAnyway] = useState(false);

  const invoiceId = useMemo((): bigint | null => {
    if (!nameInput.trim()) return null;
    try {
      return idFromLabel(nameInput.trim());
    } catch {
      return null;
    }
  }, [nameInput]);

  useEffect(() => {
    if (!nameInput.trim()) {
      setNameError(null);
      return;
    }
    try {
      idFromLabel(nameInput.trim());
      setNameError(null);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : String(err));
    }
  }, [nameInput]);

  const reads = {
    enabled: registrar !== null && invoiceId !== null,
  };

  const { data: resolver } = useReadContract({
    address: registrar ?? undefined,
    abi: registrarAbi,
    functionName: "resolverOf",
    args: invoiceId !== null ? [invoiceId] : undefined,
    query: { enabled: reads.enabled },
  });

  const { data: dnsName } = useReadContract({
    address: registrar ?? undefined,
    abi: registrarAbi,
    functionName: "dnsNameOf",
    args: invoiceId !== null ? [invoiceId] : undefined,
    query: { enabled: reads.enabled },
  });

  const { data: canonicalName } = useReadContract({
    address: registrar ?? undefined,
    abi: registrarAbi,
    functionName: "nameOf",
    args: invoiceId !== null ? [invoiceId] : undefined,
    query: { enabled: reads.enabled },
  });

  const {
    data: records,
    refetch: refetchRecords,
  } = useReadContract({
    address: registrar ?? undefined,
    abi: registrarAbi,
    functionName: "recordsOf",
    args: invoiceId !== null ? [invoiceId] : undefined,
    query: { enabled: reads.enabled },
  });

  const recordsByKey = useMemo((): Record<RecordKey, string> | null => {
    if (!records) return null;
    return Object.fromEntries(RECORD_KEYS.map((key, i) => [key, records[i]])) as Record<
      RecordKey,
      string
    >;
  }, [records]);

  ////////////////////////////////////////////////////////////////////////////
  // Ack write — Acknowledge / Dispute / Clear.
  ////////////////////////////////////////////////////////////////////////////

  const {
    writeContract: writeAck,
    data: ackHash,
    error: ackWriteError,
    isPending: ackIsSubmitting,
    reset: resetAckWrite,
  } = useWriteContract();

  const {
    data: ackReceipt,
    isLoading: ackIsConfirming,
    isSuccess: ackConfirmed,
    error: ackReceiptError,
  } = useWaitForTransactionReceipt({ hash: ackHash });

  useEffect(() => {
    if (!ackConfirmed || !ackReceipt) return;
    void refetchRecords();
  }, [ackConfirmed, ackReceipt, refetchRecords]);

  useEffect(() => {
    // A new invoice name invalidates any in-flight/completed write for the
    // previous one.
    resetAckWrite();
    setNegativeResults({ amount: null, status: null });
  }, [invoiceId, resetAckWrite]);

  const ackState: AckWriteState = ackWriteError || ackReceiptError
    ? "error"
    : ackConfirmed
      ? "confirmed"
      : ackIsSubmitting || ackIsConfirming
        ? "pending"
        : "idle";

  function submitAck(action: AckAction) {
    if (!resolver || !dnsName) return;
    resetAckWrite();
    writeAck({
      address: resolver,
      abi: permissionedResolverAbi,
      functionName: "setText",
      args: [dnsName, "ack", action],
    });
  }

  ////////////////////////////////////////////////////////////////////////////
  // Negative demo — "Try to edit amount" / "Try to edit status".
  ////////////////////////////////////////////////////////////////////////////

  const { writeContractAsync: writeNegative } = useWriteContract();

  async function runNegativeDemo(key: NegativeKey) {
    if (!resolver || !dnsName || !publicClient) return;
    setNegativePending(key);
    setNegativeResults((prev) => ({ ...prev, [key]: null }));

    const args = [dnsName, key, "1"] as const;

    let result: NegativeResult;
    try {
      await publicClient.simulateContract({
        address: resolver,
        abi: permissionedResolverAbi,
        functionName: "setText",
        args,
        account: address,
      });
      // Should never happen — the whole point of this demo is that it reverts.
      result = {
        status: "unexpected-success",
        message: `simulateContract for "${key}" did NOT revert — EAC is not enforced as expected.`,
      };
    } catch (err) {
      const { errorName, message } = decodeRevert(err);
      result =
        errorName === EAC_UNAUTHORIZED_ERROR
          ? { status: "denied", errorName, message }
          : { status: "error", errorName, message };
    }

    if (sendRealTxAnyway) {
      try {
        const hash = await writeNegative({
          address: resolver,
          abi: permissionedResolverAbi,
          functionName: "setText",
          args,
        });
        result = { ...result, txHash: hash };
      } catch {
        // The simulate result above already explains why; a real tx send
        // failing the same way (wallet-side revert estimate) is expected.
      }
    }

    setNegativeResults((prev) => ({ ...prev, [key]: result }));
    setNegativePending(null);
  }

  ////////////////////////////////////////////////////////////////////////////
  // Render.
  ////////////////////////////////////////////////////////////////////////////

  if (!registrar) {
    return (
      <div
        data-state="unavailable"
        className="mt-6 rounded-xl border border-dashed border-black/[.08] p-6 text-sm opacity-70 dark:border-white/[.145]"
      >
        Registrar not deployed yet — set{" "}
        <code className="font-mono">NEXT_PUBLIC_INVOICE_REGISTRAR</code> to enable this page.
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      <p className="rounded-lg border border-black/[.08] bg-black/[.02] px-3 py-2 text-xs opacity-70 dark:border-white/[.145] dark:bg-white/[.03]">
        Connected wallet:{" "}
        <span className="font-mono">{isConnected && address ? address : "not connected"}</span>
        <br />
        Only the debtor&apos;s AP wallet named at issuance can write{" "}
        <code className="font-mono">ack</code>. Connect it using the button in the header.
      </p>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Invoice name</span>
        <input
          type="text"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value.trim())}
          placeholder="inv-1.seikyu.eth"
          className="rounded-lg border border-black/[.08] px-3 py-2 font-mono text-sm dark:border-white/[.145] dark:bg-transparent"
        />
        {nameError && <span className="text-xs text-red-600 dark:text-red-400">{nameError}</span>}
      </label>

      {invoiceId !== null && !nameError && (
        <>
          {resolver === undefined || dnsName === undefined ? (
            <p className="text-sm opacity-60">Loading invoice…</p>
          ) : resolver === zeroAddress ? (
            <p className="text-sm text-red-600 dark:text-red-400">
              No resolver for {canonicalName ?? nameInput} — unknown invoice.
            </p>
          ) : (
            <>
              <section>
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wide opacity-60">
                    ENS records
                  </h2>
                  {recordsByKey && <AckBadge ackView={ackViewOf(recordsByKey.ack)} />}
                </div>
                <table className="mt-3 w-full border-collapse text-sm">
                  <tbody>
                    {RECORD_KEYS.map((key) => {
                      const value = recordsByKey?.[key];
                      const isAck = key === "ack";
                      return (
                        <tr
                          key={key}
                          data-record={key}
                          className={`border-b border-black/[.08] last:border-0 dark:border-white/[.145] ${
                            isAck ? "bg-amber-50 dark:bg-amber-900/10" : ""
                          }`}
                        >
                          <td
                            className={`py-2 pr-4 align-top font-mono text-xs ${
                              isAck ? "font-bold opacity-100" : "opacity-60"
                            }`}
                          >
                            {key}
                            {isAck && " (editable)"}
                          </td>
                          <td className="py-2 font-mono text-xs break-all">
                            {value === undefined ? "…" : value === "" ? "—" : value}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p className="mt-2 text-xs opacity-60">
                  Resolver: <span className="font-mono">{resolver}</span>
                </p>
              </section>

              <section
                data-state={ackState}
                className="flex flex-col gap-3 rounded-xl border border-black/[.08] p-4 dark:border-white/[.145]"
              >
                <h2 className="text-sm font-semibold uppercase tracking-wide opacity-60">
                  Acknowledge / dispute
                </h2>
                <div className="flex flex-wrap gap-3">
                  <Button
                    disabled={!isConnected || ackState === "pending"}
                    onClick={() => submitAck("acknowledged")}
                  >
                    Acknowledge
                  </Button>
                  <Button
                    variant="danger"
                    disabled={!isConnected || ackState === "pending"}
                    onClick={() => submitAck("disputed")}
                  >
                    Dispute
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={!isConnected || ackState === "pending"}
                    onClick={() => submitAck("")}
                  >
                    Clear
                  </Button>
                </div>

                {ackState === "pending" && (
                  <p className="text-sm opacity-60">
                    {ackIsSubmitting ? "Confirm in wallet…" : "Confirming…"}
                  </p>
                )}
                {ackState === "confirmed" && (
                  <p className="text-sm text-green-700 dark:text-green-400">ack updated.</p>
                )}
                {ackState === "error" && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {decodeRevert(ackWriteError ?? ackReceiptError).message}
                  </p>
                )}
                {ackHash && (
                  <a
                    href={etherscanTx(ackHash)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                  >
                    View transaction →
                  </a>
                )}
              </section>

              <section className="flex flex-col gap-3 rounded-xl border border-black/[.08] p-4 dark:border-white/[.145]">
                <h2 className="text-sm font-semibold uppercase tracking-wide opacity-60">
                  EAC negative demo — every other record is out of reach
                </h2>
                <label className="flex items-center gap-2 text-xs opacity-70">
                  <input
                    type="checkbox"
                    checked={sendRealTxAnyway}
                    onChange={(e) => setSendRealTxAnyway(e.target.checked)}
                  />
                  Send the real tx anyway (for on-chain proof)
                </label>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="secondary"
                    disabled={!isConnected || negativePending === "amount"}
                    onClick={() => runNegativeDemo("amount")}
                  >
                    {negativePending === "amount" ? "Simulating…" : "Try to edit amount"}
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={!isConnected || negativePending === "status"}
                    onClick={() => runNegativeDemo("status")}
                  >
                    {negativePending === "status" ? "Simulating…" : "Try to edit status"}
                  </Button>
                </div>

                {(["amount", "status"] as const).map((key) => {
                  const result = negativeResults[key];
                  if (!result) return null;
                  const denied = result.status === "denied";
                  return (
                    <div
                      key={key}
                      data-state={denied ? "eac-denied" : result.status}
                      className={`rounded-lg border px-3 py-2 text-xs ${
                        denied
                          ? "border-red-300 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300"
                          : "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300"
                      }`}
                    >
                      <span className="font-mono">{key}</span>:{" "}
                      {denied
                        ? `reverted with ${result.errorName} — this wallet's EAC role is scoped to "ack" only.`
                        : result.message}
                      {result.txHash && (
                        <>
                          {" "}
                          <a
                            href={etherscanTx(result.txHash)}
                            target="_blank"
                            rel="noreferrer"
                            className="underline"
                          >
                            on-chain proof →
                          </a>
                        </>
                      )}
                    </div>
                  );
                })}
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default AckEditor;
