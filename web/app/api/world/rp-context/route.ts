import { NextResponse } from "next/server";
import { signRequest } from "@worldcoin/idkit-core/signing";
import { publicEnv, serverEnv } from "@/lib/env";

/**
 * Signs a fresh RP context for the World ID widget.
 *
 * `signRequest({ signingKeyHex, action })` (from
 * `@worldcoin/idkit-core/signing`, re-exported from `@worldcoin/idkit-server`)
 * returns `RpSignature = { sig, nonce, createdAt, expiresAt }` — see
 * web/node_modules/.pnpm/@worldcoin+idkit-server@1.1.1/.../dist/index.d.ts.
 * IDKit's `RpContext` (the shape `IDKitRequestWidget`'s `rp_context` prop
 * expects — see @worldcoin/idkit-core dist/index.d.ts) uses different field
 * names: `{ rp_id, nonce, created_at, expires_at, signature }`. This route
 * does that mapping.
 */
export async function GET() {
  const { WORLD_RP_ID, WORLD_RP_SIGNING_KEY } = serverEnv();

  if (!WORLD_RP_ID || !WORLD_RP_SIGNING_KEY) {
    return NextResponse.json({ code: "WORLD_NOT_CONFIGURED" }, { status: 503 });
  }

  const signature = signRequest({
    signingKeyHex: WORLD_RP_SIGNING_KEY,
    action: publicEnv.NEXT_PUBLIC_WORLD_ACTION,
  });

  return NextResponse.json({
    rp_id: WORLD_RP_ID,
    nonce: signature.nonce,
    created_at: signature.createdAt,
    expires_at: signature.expiresAt,
    signature: signature.sig,
  });
}
