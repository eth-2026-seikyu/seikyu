# Seikyu × World — speaker script

One section per slide in `world.html`. Each script is ~35–55 spoken words; read
naturally, don't recite bullets verbatim.

Slides 2–4 set up the problem before the World ID detail. If the judge already
knows Seikyu, say one sentence of slide 3 and jump to the diagram on slide 4.

## 1. Buying a receivable requires one real human.

Seikyu lets a supplier sell an unpaid invoice to an investor at a discount. Before that purchase happens, we require World ID — proof the buyer is one real human, not just a wallet. We use IDKit 4.3 with the Proof of Human preset, allowing legacy v3 proofs for this demo.

**If they ask:** why legacy v3 for the demo? — the Simulator's default World ID 4.0 mode shares one nullifier across all five test identities, so legacy v3 is the only way to demo one-person-one-wallet.

## 2. The problem

Thirty seconds of context first. A supplier finishes the work today and gets paid in sixty to ninety days — payroll doesn't wait that long. The fix is to let someone with cash buy that debt at a discount. But open that to strangers and you inherit a new problem: one person with fifty wallets looks like fifty buyers, and any per-person limit you write is theatre.

**If they ask:** why does a limit matter here? — we cap each person at three open invoices, so no single buyer can corner the market.

## 3. Anyone can buy an invoice — once they prove they are one person

So: each invoice becomes an ENS name anyone can read, confirmed on-chain by the debtor's own accountant — that's what makes it safe to buy at all. And every buyer clears World ID once, which is what makes the cap real. Supplier lists, investor buys today at a discount, debtor pays in full on the due date.

**If they ask:** is the World ID check one-time or per purchase? — once per wallet; after that the cap does the rest of the work.

## 4. Where World ID sits in the deal

The whole flow in one picture. Everything above the dividing line happens today — listing, the debtor's confirmation, the purchase. The orange part is ours: before that 950 moves, the buyer proves they're one real person. Sixty days later the debtor pays the full thousand and the name retires. World ID gates exactly one step, and it's the step where the money moves.

**If they ask:** what happens if the check fails? — the buy button never unlocks, and the contract rejects the transfer too, so the UI isn't the gate.

## 5. The client opens IDKit before checkout

When an investor clicks buy, we open IDKit's request widget — version 4.3 — configured to the Proof of Human preset with legacy v3 proofs enabled. Passport is the credential Seikyu was actually designed around; we verified one real Passport proof live on Sepolia earlier in the build. The widget itself never touches our contracts directly.

**If they ask:** does the widget itself verify anything? — no, it only produces a proof; every check happens server-side, next slide.

## 6. We verify before we forward

Here's the part that isn't obvious: World's own verify endpoint, `/api/v4/verify`, doesn't actually check the signal. So our server hashes the signal itself, using idkit-core's `hashSignal` function, and compares it against `responses[0].signal_hash` from the proof. If there's no `signal_hash` at all, we fail closed — the request is rejected, not silently accepted.

**If they ask:** why not trust the endpoint? — it's documented to skip signal checking, so a mismatched signal would slip through if we didn't add this ourselves.

## 7. Credential and environment, matched exactly

Two more checks happen server-side. We match the credential identifier against our configured preset — and it's not always what you'd expect. A legacy proof reports `identifier: "orb"`, even though the SDK's own type comments call it `proof_of_human`. We also confirm the response's `environment` matches what the widget actually requested.

**If they ask:** does the SDK type mismatch cause bugs? — only if you match on the type field literally; we match against the identifier string instead.

## 8. One nullifier, one wallet, forever

Once verification passes, an operator wallet relays `setVerified` with the investor's address and nullifier on-chain. That nullifier is now permanently bound to that wallet — the first wallet to use a given World ID owns it going forward. The per-person cap of three open invoices is enforced inside the ERC-721 `_update` transfer hook, not the UI.

**If they ask:** what if a second wallet tries the same World ID? — it's rejected before it ever reaches the contract — that's the 409 on the next slide.

## 9. Every rejection is a real response

We can demo three failure states live, all real. Cancelling the World ID widget is recoverable — the panel just offers Retry. Presenting a World ID that's already bound, from a second wallet, returns a 409 `NULLIFIER_ALREADY_USED`. And a signal that doesn't match the connected wallet returns a 422 `SIGNAL_MISMATCH`. Nothing here is mocked or hard-coded.

**If they ask:** can you trigger these live? — yes: cancel, a second Simulator identity for the nullifier clash, and a hand-edited signal for the mismatch.

## 10. Verified live, with feedback worth acting on

Quick feedback for World: `verify()` doesn't check the signal, the staging token expires in 24 hours and only comes via the Portal's MCP endpoint, and the Simulator's default nullifier-sharing means legacy v3 is required to demo one-person-one-wallet. And it's real: this wallet's `InvestorVerified` transaction is live on Sepolia right now.

**If they ask:** is the tx on a public explorer? — yes, Sepolia Etherscan, `InvestorVerified` event, `isVerified` now reads true for that wallet.
