# Speaker script — main deck (`main.html`)

Target: **3 minutes**, 13 slides. About 495 spoken words — these are prompts,
not a read-aloud; the slide carries the detail. Advance with → or space, press
`f` for fullscreen.

The deck opens by saying what Seikyu is and where the name comes from, then the
problem, the fix, and one picture of the whole deal — so a judge who has never
heard of invoice factoring is with you before any screenshot appears.

Say the numbers slowly; skip a bullet rather than rush it.

- **need 15 seconds back** → drop the name's origin on slide 1; it's in
  *If they ask* below
- **cut to two and a half** → drop slides 3 and 7 as well
- **cut to two** → drop 3, 7 and 12 — the story still closes

---

## 1 — Seikyu 請求 *(0:00–0:16)*

"Seikyu — 請求 — Japanese for a claim, a demand for payment. Add the character
for document and it's 請求書, the invoice. We named it for the claim, because the
claim is what gets sold. So: get paid today for an invoice due in sixty days.
Live on Sepolia."

## 2 — The problem *(0:16–0:32)*

"A supplier finishes the work today and is paid in sixty to ninety days.
Payroll doesn't wait. A bank will lend against that invoice — after collateral,
paperwork and two weeks, which is exactly the money and time they don't have."

## 3 — Why nobody just buys it *(0:32–0:46)*

"The fix is to sell it to someone who has cash. But an invoice is a PDF, and a
PDF proves nothing. Was the work delivered? Only the debtor knows. Already sold
twice? No way to tell. Checking costs more than the discount."

## 4 — The solution *(0:46–1:00)*

"So we made the invoice checkable. Three roles, in plain words: a supplier
lists an unpaid invoice, an investor buys it today at a discount, and the
debtor company confirms the debt and pays in full later. No crypto vocabulary
anywhere."

## 5 — How it works *(1:00–1:22)*

"The whole deal in one picture. Today: the supplier lists it — one signature,
creating an ENS name that expires on the due date. The debtor's accountant
confirms it's real. The buyer proves with World ID they're one person, pays 950
straight to the supplier — no escrow — and ownership moves.
Sixty days later the debtor pays the full thousand, and the name retires with
the debt."

## 6 — One signature *(1:22–1:36)*

"Issuing is that one signature: it mints the receivable token, deploys a
resolver for this invoice alone, and registers `inv-15.seikyu.eth` with expiry
set to the due date. The name's lifetime is the debt's lifetime."

## 7 — The invoice *is* the ENS name *(1:36–1:46)*

"Underneath, this is the invoice: eight text records — amount, debtor, due
date, status. Anyone reads them straight off ENS. No account, no API key."

## 8 — Only a real person can buy *(1:46–2:04)*

"Before anyone can buy, they prove with World ID that they're one unique
person. We bind the proof to their wallet server-side, then record it on-chain
— one human, one investor wallet, capped at three open invoices. Enforced in
the contract, not the interface."

## 9 — 950 now, instead of 1,000 later *(2:04–2:14)*

"950 for a thousand-dollar invoice. The supplier has cash the moment it clears,
and the ENS status record flips to funded — visible to anyone watching."

## 10 — The debtor confirms, and nothing else *(2:14–2:30)*

"The debtor's own accounting team confirms the invoice is real — they can write
exactly one record. Try to edit the amount and the chain rejects it: that red
line is a real revert, not a disabled button. And a disputed invoice can't be
bought."

## 11 — Settle *(2:30–2:42)*

"When the debtor pays, the investor receives the full thousand, the token is
burned, and the ENS name is unregistered — one transaction. The invoice's
identity retires with the debt."

## 12 — Why expiry matters *(2:42–2:52)*

"If nobody buys it in time, the name simply expires. No cleanup job — the due
date *is* the expiry. It stops resolving; the records stay readable."

## 13 — Close *(2:52–3:00)*

"A name lives as long as the debt behind it. Live at seikyu.xyz, contracts
verified on Sepolia, everything in the repo."

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
