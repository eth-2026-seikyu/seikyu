# Seikyu × World — speaker script

Notes for `world.html`, one section per slide. ~30 spoken words each — these
are prompts, not a read-aloud. The slide carries the detail; you say the point.
About two minutes at a booth pace.

Slides 2–4 are the setup. If the judge already knows Seikyu, skip to slide 4.

## 1. Buying a receivable requires one real human.

Seikyu is a marketplace for unpaid invoices: a business gets paid today, an investor buys the debt at a discount. Before anyone can buy, they prove with World ID that they're one real human.

**If they ask:** why legacy v3? — the Simulator's default v4 mode shares one nullifier across all five test identities, so legacy v3 is the only way to demo one-person-one-wallet.

**If they ask:** what does the name mean? — 請求, *seikyū*, is Japanese for a claim, a demand for payment; add 書, document, and 請求書 is the invoice. We named it for the claim — that's the part that changes hands.

## 2. The problem

A supplier is paid sixty to ninety days after the work is done. The fix is to let someone with cash buy that debt. But open that to strangers, and one person with fifty wallets looks like fifty buyers.

**If they ask:** why does that matter? — we cap each person at three open invoices. Without uniqueness, that cap is theatre.

## 3. Anyone can buy an invoice — once they prove they are one person

The invoice becomes an ENS name anyone can read, confirmed on-chain by the debtor's own accountant — that's what makes it safe to buy. World ID, once per buyer, is what makes the cap real.

**If they ask:** one-time, or per purchase? — once per wallet; after that the cap does the work.

## 4. Where World ID sits in the deal

Everything above the line happens today: listing, the debtor's confirmation, the sale. Orange is ours — before that 950 moves, the buyer proves they're one person. We gate exactly the step where money moves.

**If they ask:** what if the check fails? — the buy button stays locked, and the contract rejects the transfer anyway.

## 5. The client opens IDKit before checkout

IDKit 4.3's request widget, Proof of Human preset, legacy v3 allowed. Passport is the credential we designed around — we verified one real Passport proof live earlier in the build.

**If they ask:** does the widget verify anything? — no. It produces a proof; every check is server-side.

## 6. We verify before we forward

World's `/api/v4/verify` doesn't check the signal. So we hash it ourselves with idkit-core's `hashSignal` and compare against `responses[0].signal_hash`. No `signal_hash`, no sale — we fail closed.

**If they ask:** why not trust the endpoint? — it's documented to skip the signal, so a mismatch would slip straight through.

## 7. Credential and environment, matched exactly

Two more server-side checks. A legacy proof reports `identifier: "orb"`, not the `proof_of_human` the SDK's types suggest — we match the identifier anyway. And the response's `environment` has to match what the widget requested.

**If they ask:** does that type mismatch cause bugs? — only if you match on the type field; we match the identifier string.

## 8. One nullifier, one wallet, forever

An operator wallet relays `setVerified` on-chain. The nullifier binds permanently to the first wallet that uses it. The cap of three lives in the ERC-721 `_update` hook — not the UI.

**If they ask:** and a second wallet with the same World ID? — rejected before it reaches the contract. That's the 409, next slide.

## 9. Every rejection is a real response

Three failure states, all demoable. Cancel is recoverable — Retry. A World ID already bound elsewhere: 409 `NULLIFIER_ALREADY_USED`. A signal that doesn't match the wallet: 422 `SIGNAL_MISMATCH`.

**If they ask:** can you trigger them now? — yes: cancel, a second Simulator identity, and a hand-edited signal.

## 10. Verified live, with feedback worth acting on

Three things worth fixing: `verify()` ignores the signal, the staging token lasts 24 hours and only comes from the Portal's MCP endpoint, and the Simulator shares one nullifier across identities. And it's real — this wallet's `InvestorVerified` tx is on Sepolia now.

**If they ask:** is it on an explorer? — Sepolia Etherscan; `isVerified` reads true for that wallet.
