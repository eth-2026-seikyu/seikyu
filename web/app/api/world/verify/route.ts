import { NextResponse } from "next/server";
import { zeroAddress, type Address, type Hex } from "viem";
import { z } from "zod";
import { publicEnv, serverEnv } from "@/lib/env";
import { marketAddress, operatorWallet, publicClient } from "@/lib/server/chain";
import {
  expectedIdentifier,
  hashSignalV4,
  marketAbi,
  normalizeNullifier,
  type WorldErrorCode,
} from "@/lib/world";

export const maxDuration = 30;

const bodySchema = z.object({
  investor: z.string().regex(/^0x[0-9a-fA-F]{40}$/, "investor must be a 0x address"),
  result: z.record(z.string(), z.unknown()),
});

function fail(status: number, code: WorldErrorCode, extra?: Record<string, unknown>) {
  return NextResponse.json({ code, ...extra }, { status });
}

export async function POST(request: Request) {
  // 1. Validate the request body shape.
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return fail(400, "INVALID_BODY");
  }

  const parsedBody = bodySchema.safeParse(json);
  if (!parsedBody.success) {
    return fail(400, "INVALID_BODY");
  }
  const { investor, result } = parsedBody.data;

  // 2. The proof must be for the action this app requests.
  if (result.action !== publicEnv.NEXT_PUBLIC_WORLD_ACTION) {
    return fail(400, "INVALID_BODY");
  }

  const responses = result.responses;
  if (!Array.isArray(responses) || responses.length === 0) {
    return fail(400, "INVALID_BODY");
  }
  const response0 = responses[0] as Record<string, unknown>;

  // 3. Credential identifier must match the configured preset. See
  // `expectedIdentifier` in lib/world.ts for the per-preset source citations.
  if (response0.identifier !== expectedIdentifier(publicEnv)) {
    return fail(422, "CREDENTIAL_MISMATCH");
  }

  // 4. Signal binding (U-7). WorldVerifyButton always builds its preset with
  // `signal: investor` (see lib/world.ts `buildPreset`), so a genuine v4
  // response from our own client always carries `responses[0].signal_hash`
  // (`ResponseItemV4.signal_hash` — idkit-core dist/index.d.ts: "included if
  // signal was provided in request"). We hash `investor` ourselves with
  // idkit-core's own `hashSignal` export (never re-derive the hashing
  // scheme — see `hashSignalV4` in lib/world.ts) and compare against the
  // hash carried in the result.
  //
  // Branch used: the SDK's own `signal` field, not a signal forwarded to
  // World's verify API. A v4 response with no `signal_hash` at all (e.g. a
  // proof built without a signal) is treated as a mismatch — fail closed —
  // rather than falling back to sending a bare `signal` alongside the
  // forwarded result. See .omc/research/spike-world.md "## U-7 signal
  // binding" for this decision.
  const expectedSignalHash = hashSignalV4(investor as Address);
  const actualSignalHash = response0.signal_hash;
  if (
    typeof actualSignalHash !== "string" ||
    actualSignalHash.toLowerCase() !== expectedSignalHash.toLowerCase()
  ) {
    return fail(422, "SIGNAL_MISMATCH");
  }

  const { WORLD_RP_ID, WORLD_ENV } = serverEnv();
  if (!WORLD_RP_ID) {
    return fail(503, "WORLD_NOT_CONFIGURED");
  }

  // 5. Forward the result to World for verification.
  let worldResponse: Response;
  try {
    worldResponse = await fetch(`https://developer.world.org/api/v4/verify/${WORLD_RP_ID}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(result),
    });
  } catch {
    return fail(502, "WORLD_API_UNAVAILABLE");
  }

  if (worldResponse.status >= 500) {
    return fail(502, "WORLD_API_UNAVAILABLE");
  }

  let worldBody: Record<string, unknown> = {};
  try {
    worldBody = await worldResponse.json();
  } catch {
    // Missing/invalid JSON body from World — handled by the !ok check below.
  }

  if (!worldResponse.ok) {
    return fail(422, "VERIFICATION_FAILED", {
      worldCode: worldBody.code,
      detail: worldBody.detail,
    });
  }

  // 6. Environment must match ours (staging vs production).
  if (worldBody.environment !== WORLD_ENV) {
    return fail(409, "ENV_MISMATCH");
  }

  // 7. Nullifier binding.
  const rawNullifier = response0.nullifier;
  if (typeof rawNullifier !== "string") {
    return fail(400, "INVALID_BODY");
  }

  let nullifier: Hex;
  try {
    nullifier = normalizeNullifier(rawNullifier);
  } catch {
    return fail(400, "INVALID_BODY");
  }

  let market: Address;
  try {
    market = marketAddress();
  } catch (error) {
    console.error("[world/verify] market not configured:", error);
    return fail(500, "OPERATOR_TX_FAILED");
  }

  const boundTo = (await publicClient.readContract({
    address: market,
    abi: marketAbi,
    functionName: "nullifierOwner",
    args: [nullifier],
  })) as Address;

  if (boundTo !== zeroAddress && boundTo.toLowerCase() !== investor.toLowerCase()) {
    return fail(409, "NULLIFIER_ALREADY_USED", { boundTo });
  }

  // 8. Operator submits setVerified(investor, nullifier) and returns
  // immediately without waiting for the receipt.
  try {
    const wallet = operatorWallet();
    const txHash = await sendSetVerified(wallet, market, investor as Address, nullifier);
    return NextResponse.json({ txHash });
  } catch (error) {
    console.error("[world/verify] operator tx failed:", error);
    return fail(500, "OPERATOR_TX_FAILED");
  }
}

async function sendSetVerified(
  wallet: ReturnType<typeof operatorWallet>,
  market: Address,
  investor: Address,
  nullifier: Hex,
): Promise<Hex> {
  const send = () =>
    wallet.writeContract({
      address: market,
      abi: marketAbi,
      functionName: "setVerified",
      args: [investor, nullifier],
      chain: wallet.chain,
      // operatorWallet() always creates the client with an account attached.
      account: wallet.account!,
    });

  try {
    return await send();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/nonce too low|replacement transaction underpriced/i.test(message)) {
      return await send();
    }
    throw error;
  }
}
