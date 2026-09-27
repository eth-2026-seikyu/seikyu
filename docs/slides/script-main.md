# Speaker script — main deck (`main.html`)

Target: **3 minutes 20**, 13 slides. The spoken text below is ~560 words, which
lands around 3:20 at a calm pace. Advance with → or space. Press `f` for
fullscreen.

The deck opens on the problem, then the fix, then one picture of the whole
deal — so a judge who has never heard of invoice factoring is with you before
any screenshot appears.

Say the numbers slowly; skip a bullet rather than rush it. If you are cut to
**two and a half minutes**, drop slides 3 and 7. If you are cut to **two**,
drop 3, 7 and 12 — the story still closes.

---

## 1 — Seikyu 請求 *(0:00–0:10)*

"Seikyu — Japanese for invoice. In one sentence: get paid today for an invoice
that isn't due for sixty days. It's a marketplace for unpaid invoices, where
each invoice becomes an ENS name anyone can check — and it's live on Sepolia
right now."

## 2 — The problem *(0:10–0:28)*

"Start with the problem. A supplier finishes the work today and gets paid in
sixty to ninety days. Payroll doesn't wait sixty days. Materials don't wait.
A bank will lend against that invoice, but only after collateral, paperwork,
and a couple of weeks — which is exactly the money and time they don't have."

## 3 — Why nobody just buys it *(0:28–0:44)*

"The obvious fix is to sell the invoice to someone who has cash. But the
invoice is a PDF, and a PDF proves nothing. Was the work delivered? Only the
debtor knows. Has it already been sold to someone else? No way to tell.
Checking costs more than the discount is worth, so nobody checks, and the
supplier waits."

## 4 — The solution *(0:44–1:00)*

"So we made the invoice checkable. Three roles, named in plain words on the
front page: a supplier lists an unpaid invoice, an investor buys it today at a
discount, and the debtor company confirms the debt and later pays in full.
No crypto vocabulary anywhere on this screen."

## 5 — How it works *(1:00–1:24)*

"Here's the whole deal in one picture. Today: the supplier lists the invoice —
that's one signature, and it creates an ENS name that expires on the due date.
The debtor's own accountant confirms the invoice is real. The buyer proves with
World ID that they're one real person, then pays 950 — straight to the
supplier, nothing sits in escrow — and ownership moves to them. Sixty days
later the debtor pays the full thousand, and the name retires with the debt."

## 6 — One signature *(1:24–1:40)*

"Issuing is that one signature. It mints the receivable token, deploys a
resolver for this invoice alone, and registers `inv-15.seikyu.eth` with its
expiry set to the due date. The name's lifetime is the debt's lifetime."

## 7 — The invoice *is* the ENS name *(1:40–1:54)*

"Underneath, this is the invoice: eight text records — amount, debtor, due
date, status. Anyone can read them straight off ENS. No Seikyu account, no
API key."

## 8 — Only a real person can buy *(1:54–2:14)*

"Before anyone can buy, they prove with World ID that they're one unique
person. We bind the proof to their wallet on our server before we accept it,
and record it on-chain — so one human maps to one investor wallet, capped at
three open invoices. That's enforced in the contract, not in the interface."

## 9 — 950 now, instead of 1,000 later *(2:14–2:28)*

"The investor pays 950 for a thousand-dollar invoice. The supplier has cash the
moment the sale clears, and the ENS status record flips to funded — visible to
anyone watching the name."

## 10 — The debtor confirms, and nothing else *(2:28–2:46)*

"The debtor's own accounting team confirms the invoice is real. They can write
exactly one record. When they try to edit the amount, the chain rejects it —
that red line is a real revert, not a disabled button. And a disputed invoice
can't be bought at all."

## 11 — Settle *(2:46–3:00)*

"When the debtor pays, the investor receives the full thousand, the receivable
token is burned, and the ENS name is unregistered — all in one transaction.
The invoice's identity retires with the debt."

## 12 — Why expiry matters *(3:00–3:12)*

"And if nobody buys it in time, the name simply expires. There's no cleanup
job — the due date *is* the expiry. The name stops resolving, but the records
stay readable, so the history doesn't vanish."

## 13 — Close *(3:12–3:20)*

"A name lives as long as the debt behind it. It's live at seikyu.xyz, the
contracts are verified on Sepolia, and everything you just saw is in the repo."

---

## If they ask

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
