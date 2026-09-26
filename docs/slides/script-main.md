# Speaker script — main deck (`main.html`)

Target: **3 minutes**, 11 slides. Spoken text below is ~500 words, which lands
around 3:00 at a calm pace. Advance with → or space. Press `f` for fullscreen.

Say the numbers slowly; skip a bullet rather than rush it. If you are cut to
two minutes, drop slides 5 and 10 — the story still closes.

---

## 1 — Seikyu 請求 *(0:00–0:12)*

"Seikyu — Japanese for invoice. A supplier can sell an unpaid invoice today
instead of waiting to be paid. Every invoice here is an ENS name that expires
on the day the debt is due. It's live on Sepolia right now."

## 2 — The problem *(0:12–0:32)*

"A supplier delivers the work today and gets paid in sixty to ninety days.
Until the debtor pays, that invoice is real money they can't touch. And nobody
else can buy it from them, because nobody outside the deal can check whether
the invoice is genuine."

## 3 — Three people, one invoice *(0:32–0:52)*

"Seikyu has three roles, and the front page says so in plain words. A supplier
lists an unpaid invoice. An investor buys it at a discount, which pays the
supplier now. The debtor company pays the full amount on the due date. No
crypto vocabulary anywhere on this screen."

## 4 — One signature *(0:52–1:10)*

"Issuing is one signature. That single transaction mints the receivable token,
deploys a resolver for this invoice alone, and registers `inv-15.seikyu.eth`
with its expiry set to the due date. The name's lifetime is the debt's
lifetime."

## 5 — The invoice *is* the ENS name *(1:10–1:26)*

"Underneath, this is the invoice: eight text records — amount, debtor, due
date, status. Anyone can read them straight off ENS. No Seikyu account, no
API key. The name lives exactly as long as the debt is current."

## 6 — Only a real person can buy *(1:26–1:48)*

"Before anyone can buy, they prove with World ID that they're one unique
person. We bind the proof to their wallet on our server before we accept it,
and record it on-chain — so one human maps to one investor wallet, capped at
three open invoices. That's enforced in the contract, not in the interface."

## 7 — 950 now, instead of 1,000 later *(1:48–2:04)*

"The investor pays 950 for a thousand-dollar invoice. The supplier has cash
the moment the sale clears, and the invoice's ENS status record flips to
funded — visible to anyone watching the name."

## 8 — The debtor confirms, and nothing else *(2:04–2:24)*

"The debtor's own accounting team confirms the invoice is real. They can write
exactly one record. When they try to edit the amount, the chain rejects it —
that red line is a real revert, not a disabled button. And a disputed invoice
can't be bought at all."

## 9 — Settle *(2:24–2:40)*

"When the debtor pays, the investor receives the full thousand, the receivable
token is burned, and the ENS name is unregistered — all in one transaction.
The invoice's identity retires with the debt."

## 10 — Why expiry matters *(2:40–2:52)*

"And if nobody buys it in time, the name simply expires. There's no cleanup
job — the due date *is* the expiry. The name stops resolving, but the records
stay readable, so the history doesn't vanish."

## 11 — Close *(2:52–3:00)*

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
- **"Did you build this during the hackathon?"** — Yes, from scratch, with AI
  agents doing most of the coding. The plan, the prompts and a full disclosure
  are committed in the repo under `docs/`.
