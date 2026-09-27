# Seikyu × Curvegrid — speaker script

One section per slide in `curvegrid.html`. Each script is ~35–55 spoken words;
read naturally, don't recite bullets verbatim.

Slides 2–4 set up the problem before the token detail. If the judge already
knows Seikyu, say one sentence of slide 3 and jump to the diagram on slide 4.

## 1. A receivable that lives and dies on-chain.

Seikyu is a marketplace for unpaid invoices: a business gets paid today, an investor buys the debt at a discount and collects in full on the due date. Each invoice becomes a single ERC-721 token that represents that real-world asset for its entire life. It's minted when a supplier lists the invoice, transferred exactly once to a verified investor, and burned the moment the debt is settled. The token's life mirrors the asset's life.

**If they ask:** why ERC-721 and not ERC-20? — each invoice is unique and non-fungible, so one asset gets exactly one token, not a fungible share.

## 2. The problem

Quick context first. A supplier delivers today and gets paid in sixty to ninety days. That receivable is a real asset worth real money, and it lives in a spreadsheet — which means it can be sold twice, and a buyer can't audit it without trusting whoever keeps the sheet.

**If they ask:** how big is that market? — invoice factoring is a large, old industry; our point is the settlement rail, not the demand.

## 3. One token per invoice, for the whole life of the debt

So the receivable becomes one token. Minted when the supplier lists it, transferred exactly once — to an investor the contract itself has checked — and burned the moment the debtor settles. The token's life is the asset's life, so there's never a token without a debt behind it.

**If they ask:** can it be transferred again after purchase? — not in this build; the one transfer that matters is market to investor, and it's gated.

## 4. The life of one receivable

The whole flow in one picture. Orange is the token: minted at listing, ownership moving to the investor when they pay 950, burned when the debtor pays the full thousand on the due date. And no escrow anywhere — money goes straight from buyer to supplier, then from payer to whoever holds the token.

**If they ask:** why no escrow? — fewer places for funds to sit means fewer ways for them to be stuck; the trade-off is that both legs must be atomic, which they are.

## 5. The listing lives on-chain, not in a database

Before an invoice ever sells, the token already exists. Listing it mints the ERC-721 straight to the market contract itself, self-custodied with `_mint(address(this), id)`. So the listing isn't a row in our database — it's an on-chain fact anyone can verify. Settlement burns that same token.

**If they ask:** who pays gas for that mint? — the supplier, in the same transaction that lists the invoice.

## 6. Programmable rules live in the transfer itself

The one transfer that matters — market contract to investor — is gated inside ERC-721's `_update` hook, not an off-chain KYC form. Anyone who hasn't passed World ID gets rejected on-chain, and each verified person is capped at three open invoices at once. Minting and burning skip these checks entirely.

**If they ask:** why cap at three? — it limits how much concentration risk sits in any single investor's wallet.

## 7. 950 now, instead of 1,000 later

There's no escrow anywhere in this system. `buy()` sends the discounted price — 950 test USDC on a 1,000 face-value invoice — straight from investor to supplier. `settle()` later sends the full 1,000 straight from the payer to whoever currently owns the token. One transaction pays, burns the receivable, and retires its ENS name.

**If they ask:** what if `settle()` is never called? — the invoice just goes Overdue, then the debt gets chased off-chain while the clock keeps running.

## 8. Six states — four on-chain, two derived

An invoice moves through Listed, Funded, Paid, or Cancelled — all written on-chain. Two more states, Overdue and Expired-unsold, are derived just from the due date, with no cleanup job needed. If a sold invoice goes overdue, anyone can extend its ENS name another 30 days while the debt gets chased.

**If they ask:** who can trigger the overdue extension? — anyone; it's permissionless, since the due date is public on-chain.

## 9. Verifiable on-chain, honest about the gaps

Everything here is checkable: 46 Foundry fork tests against a pinned Sepolia block, all three contracts Sourcify-verified, and the whole lifecycle run live on Sepolia during our demo. One honest gap: we evaluated MultiBaas for the invoice activity feed and cut it for time, so we read chain state over plain RPC today.

**If they ask:** what would get you onto MultiBaas? — a 15-minute quick-start indexing a custom ERC-721's Sepolia events into a REST or webhook feed, with a Next.js example to copy.
