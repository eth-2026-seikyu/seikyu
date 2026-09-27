# Seikyu × Curvegrid — speaker script

Notes for `curvegrid.html`, one section per slide. ~30 spoken words each —
these are prompts, not a read-aloud. The slide carries the detail; you say the
point. Under two minutes at a booth pace.

Slides 2–4 are the setup. If the judge already knows Seikyu, skip to slide 4.

## 1. A receivable that lives and dies on-chain.

Seikyu is a marketplace for unpaid invoices: a business gets paid today, an investor buys the debt at a discount. Each invoice is one ERC-721 — minted at listing, transferred once, burned at settlement.

**If they ask:** why ERC-721 and not ERC-20? — each invoice is unique. One asset, one token, not a fungible share.

**If they ask:** what does the name mean? — 請求, *seikyū*, is Japanese for a claim, a demand for payment; add 書, document, and 請求書 is the invoice. We named it for the claim — that's the part that changes hands.

## 2. The problem

A supplier is paid sixty to ninety days after the work is done. That receivable is a real asset worth real money, and it lives in a spreadsheet — so it can be sold twice, and a buyer can't audit it.

**If they ask:** how big is that market? — factoring is large and old. Our contribution is the settlement rail, not the demand.

## 3. One token per invoice, for the whole life of the debt

Minted when the supplier lists. Transferred exactly once, to an investor the contract itself has checked. Burned when the debtor settles. There's never a token without a debt behind it.

**If they ask:** can it be transferred again after purchase? — not in this build; the one transfer that matters is the gated one.

## 4. The life of one receivable

Orange is the token: minted at listing, moving to the investor when they pay 950, burned when the debtor pays the full thousand. And no escrow anywhere — money goes buyer to supplier, then payer to holder.

**If they ask:** why no escrow? — fewer places for funds to sit. The trade-off is that both legs must be atomic, and they are.

## 5. The listing lives on-chain, not in a database

Listing mints the token to the market contract itself — `_mint(address(this), id)`. So the listing is an on-chain fact anyone can verify, not a row in our database. Settlement burns that same token.

**If they ask:** who pays that gas? — the supplier, in the same transaction that lists the invoice.

## 6. Programmable rules live in the transfer itself

The one transfer that matters is gated inside ERC-721's `_update` hook, not an off-chain form. No World ID, no transfer. Three open invoices per person, maximum. Mint and burn are exempt.

**If they ask:** why cap at three? — it limits how much concentration risk sits in a single wallet.

## 7. 950 now, instead of 1,000 later

No escrow. `buy()` sends 950 test USDC straight to the supplier. `settle()` sends the full 1,000 to whoever holds the token — and that same transaction burns it and retires the ENS name.

**If they ask:** what if `settle()` never comes? — the invoice goes Overdue, and the debt gets chased off-chain.

## 8. Six states — four on-chain, two derived

Listed, Funded, Paid and Cancelled are written on-chain. Overdue and Expired-unsold are derived from the due date — no cleanup job. Marking one overdue extends its ENS name thirty days.

**If they ask:** who can extend it? — anyone. It's permissionless, since the due date is public on-chain.

## 9. Verifiable on-chain, honest about the gaps

46 Foundry fork tests against a pinned Sepolia block, three contracts Sourcify-verified, the whole lifecycle run live. One honest gap: we evaluated MultiBaas for the activity feed and cut it for time, so we read chain state over plain RPC.

**If they ask:** what would change that? — a 15-minute quick-start indexing a custom ERC-721's Sepolia events into a REST or webhook feed, with a Next.js example to copy.
