# Seikyu × World — speaker script

One section per slide in `world.html`. Each script is ~35–55 spoken words; read naturally, don't recite bullets verbatim.

## 1. Buying a receivable requires one real human.

Seikyu lets a supplier sell an unpaid invoice to an investor at a discount. Before that purchase happens, we require World ID — proof the buyer is one real human, not just a wallet. We use IDKit 4.3 with the Proof of Human preset, allowing legacy v3 proofs for this demo.

**If they ask:** why legacy v3 for the demo? — the Simulator's default World ID 4.0 mode shares one nullifier across all five test identities, so legacy v3 is the only way to demo one-person-one-wallet.

## 2. The client opens IDKit before checkout

When an investor clicks buy, we open IDKit's request widget — version 4.3 — configured to the Proof of Human preset with legacy v3 proofs enabled. Passport is the credential Seikyu was actually designed around; we verified one real Passport proof live on Sepolia earlier in the build. The widget itself never touches our contracts directly.

**If they ask:** does the widget itself verify anything? — no, it only produces a proof; every check happens server-side, next slide.

## 3. We verify before we forward

Here's the part that isn't obvious: World's own verify endpoint, `/api/v4/verify`, doesn't actually check the signal. So our server hashes the signal itself, using idkit-core's `hashSignal` function, and compares it against `responses[0].signal_hash` from the proof. If there's no `signal_hash` at all, we fail closed — the request is rejected, not silently accepted.

**If they ask:** why not trust the endpoint? — it's documented to skip signal checking, so a mismatched signal would slip through if we didn't add this ourselves.

## 4. Credential and environment, matched exactly

Two more checks happen server-side. We match the credential identifier against our configured preset — and it's not always what you'd expect. A legacy proof reports `identifier: "orb"`, even though the SDK's own type comments call it `proof_of_human`. We also confirm the response's `environment` matches what the widget actually requested.

**If they ask:** does the SDK type mismatch cause bugs? — only if you match on the type field literally; we match against the identifier string instead.

## 5. One nullifier, one wallet, forever

Once verification passes, an operator wallet relays `setVerified` with the investor's address and nullifier on-chain. That nullifier is now permanently bound to that wallet — the first wallet to use a given World ID owns it going forward. The per-person cap of three open invoices is enforced inside the ERC-721 `_update` transfer hook, not the UI.

**If they ask:** what if a second wallet tries the same World ID? — it's rejected before it ever reaches the contract — that's the 409 on the next slide.

## 6. Every rejection is a real response

We can demo three failure states live, all real. Cancelling the World ID widget is recoverable — the panel just offers Retry. Presenting a World ID that's already bound, from a second wallet, returns a 409 `NULLIFIER_ALREADY_USED`. And a signal that doesn't match the connected wallet returns a 422 `SIGNAL_MISMATCH`. Nothing here is mocked or hard-coded.

**If they ask:** can you trigger these live? — yes: cancel, a second Simulator identity for the nullifier clash, and a hand-edited signal for the mismatch.

## 7. Verified live, with feedback worth acting on

Quick feedback for World: `verify()` doesn't check the signal, the staging token expires in 24 hours and only comes via the Portal's MCP endpoint, and the Simulator's default nullifier-sharing means legacy v3 is required to demo one-person-one-wallet. And it's real: this wallet's `InvestorVerified` transaction is live on Sepolia right now.

**If they ask:** is the tx on a public explorer? — yes, Sepolia Etherscan, `InvestorVerified` event, `isVerified` now reads true for that wallet.
