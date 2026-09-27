# Speaker script — main deck (`main.html`)

Target: **3 minutes 30**, 13 slides. The spoken text below is ~600 words, which
lands around 3:30 at a calm pace. Advance with → or space. Press `f` for
fullscreen.

The deck opens by saying what Seikyu is and where the name comes from, then
the problem, the fix, and one picture of the whole deal — so a judge who has
never heard of invoice factoring is with you before any screenshot appears.

Say the numbers slowly; skip a bullet rather than rush it. If you are cut to
**three minutes**, drop the name's origin on slide 1 — it is in *If they ask*
below. If you are cut to **two and a half**, drop slides 3 and 7 as well. If
you are cut to **two**, drop 3, 7 and 12 — the story still closes.

---

## 1 — Seikyu 請求 *(0:00–0:18)*

"Seikyu is 請求 — *seikyū* — Japanese for a claim, a demand for payment. Add one
character, 書, meaning document, and it becomes 請求書: the invoice itself. We
named it for the claim rather than the paperwork, because the claim is the part
that gets sold here.

And that's the product in one sentence: get paid today for an invoice that
isn't due for sixty days. It's live on Sepolia right now."

## 2 — The problem *(0:18–0:36)*

"Start with the problem. A supplier finishes the work today and gets paid in
sixty to ninety days. Payroll doesn't wait sixty days. Materials don't wait.
A bank will lend against that invoice, but only after collateral, paperwork,
and a couple of weeks — which is exactly the money and time they don't have."

## 3 — Why nobody just buys it *(0:36–0:52)*

"The obvious fix is to sell the invoice to someone who has cash. But the
invoice is a PDF, and a PDF proves nothing. Was the work delivered? Only the
debtor knows. Has it already been sold to someone else? No way to tell.
Checking costs more than the discount is worth, so nobody checks, and the
supplier waits."

## 4 — The solution *(0:52–1:08)*

"So we made the invoice checkable. Three roles, named in plain words on the
front page: a supplier lists an unpaid invoice, an investor buys it today at a
discount, and the debtor company confirms the debt and later pays in full.
No crypto vocabulary anywhere on this screen."

## 5 — How it works *(1:08–1:32)*

"Here's the whole deal in one picture. Today: the supplier lists the invoice —
that's one signature, and it creates an ENS name that expires on the due date.
The debtor's own accountant confirms the invoice is real. The buyer proves with
World ID that they're one real person, then pays 950 — straight to the
supplier, nothing sits in escrow — and ownership moves to them. Sixty days
later the debtor pays the full thousand, and the name retires with the debt."

## 6 — One signature *(1:32–1:48)*

"Issuing is that one signature. It mints the receivable token, deploys a
resolver for this invoice alone, and registers `inv-15.seikyu.eth` with its
expiry set to the due date. The name's lifetime is the debt's lifetime."

## 7 — The invoice *is* the ENS name *(1:48–2:02)*

"Underneath, this is the invoice: eight text records — amount, debtor, due
date, status. Anyone can read them straight off ENS. No Seikyu account, no
API key."

## 8 — Only a real person can buy *(2:02–2:22)*

"Before anyone can buy, they prove with World ID that they're one unique
person. We bind the proof to their wallet on our server before we accept it,
and record it on-chain — so one human maps to one investor wallet, capped at
three open invoices. That's enforced in the contract, not in the interface."

## 9 — 950 now, instead of 1,000 later *(2:22–2:36)*

"The investor pays 950 for a thousand-dollar invoice. The supplier has cash the
moment the sale clears, and the ENS status record flips to funded — visible to
anyone watching the name."

## 10 — The debtor confirms, and nothing else *(2:36–2:54)*

"The debtor's own accounting team confirms the invoice is real. They can write
exactly one record. When they try to edit the amount, the chain rejects it —
that red line is a real revert, not a disabled button. And a disputed invoice
can't be bought at all."

## 11 — Settle *(2:54–3:08)*

"When the debtor pays, the investor receives the full thousand, the receivable
token is burned, and the ENS name is unregistered — all in one transaction.
The invoice's identity retires with the debt."

## 12 — Why expiry matters *(3:08–3:20)*

"And if nobody buys it in time, the name simply expires. There's no cleanup
job — the due date *is* the expiry. The name stops resolving, but the records
stay readable, so the history doesn't vanish."

## 13 — Close *(3:20–3:28)*

"A name lives as long as the debt behind it. It's live at seikyu.xyz, the
contracts are verified on Sepolia, and everything you just saw is in the repo."

---

## If they ask

- **"What does Seikyu mean?"** — 請求, *seikyū*, is Japanese for a claim or a
  demand for payment; add 書 (*sho*, document) and 請求書 is the invoice you post
  to a customer. We took the shorter word on purpose: the paperwork stays with
  the supplier, and the claim is what an investor actually buys.
- **"Is this real money?"** — No. Sepolia testnet, a mock USDC token. The app
  says so on every screen; nothing here has real value.
- **"Why ENS and not a database?"** — Because expiry does real work. The due
  date and the name's lifetime are the same fact, so the record can't drift
  from the debt, and anyone can verify an invoice without asking us.
- **"What stops a fake invoice?"** — The debtor's own accounts-payable wallet
  confirms or disputes it on-chain, and a disputed invoice is unbuyable. We
  don't vouch for invoices; the debtor does.
- **"Why World ID rather than KYC?"** — We need uniqueness, not identity. The
  cap of three open positions per person only means something if one person
  can't spin up ten wallets.
- **"What if the debtor never pays?"** — The invoice goes overdue. Anyone can
  extend the ENS name thirty days so the record stays live while the debt is
  chased. We don't pretend the investor is guaranteed.
- **"Who takes the risk?"** — The investor, knowingly: the discount is the
  price of that risk, and the debtor's on-chain confirmation is what makes it
  worth taking.
- **"Did you build this during the hackathon?"** — Yes, from scratch, with AI
  agents doing most of the coding. The plan, the prompts and a full disclosure
  are committed in the repo under `docs/`.
