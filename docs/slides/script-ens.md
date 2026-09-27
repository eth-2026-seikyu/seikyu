# Seikyu — ENS partner deck script

Notes for `ens.html`, one section per slide. ~30 spoken words each — these are
prompts, not a read-aloud. The slide carries the detail; you say the point.
About two minutes at a booth pace.

Slides 2–4 are the setup. If the judge already knows Seikyu, skip to slide 4.

## 1. Seikyu on ENSv2

A marketplace for unpaid invoices, where the invoice *is* the ENS name. Every invoice is a subname under `seikyu.eth`, and its expiry is the due date. Built on ENSv2, pinned to the September Sepolia deployment tag.

**If they ask:** why pin to a tag? — main's contract API no longer matches what's deployed on Sepolia, and we needed something stable to build against.

**If they ask:** what does the name mean? — 請求, *seikyū*, is Japanese for a claim, a demand for payment; add 書, document, and 請求書 is the invoice. We named it for the claim — that's the part that changes hands.

## 2. The problem

A supplier is paid sixty to ninety days after the work is done. Nobody else will buy that debt, because nobody outside the deal can check it. And the due date — the fact that decides everything — is a column in someone's database. It expires nothing.

**If they ask:** who buys these today? — factoring houses, at a steep discount, after manual checks that only pay off on large invoices.

## 3. The invoice is the name, and the due date is the expiry

Eight text records, readable without an account or an API key. The debtor's accountant confirms on-chain, writing one record and nothing else. And the name stops resolving the day the debt falls due — no cleanup job, no drift.

**If they ask:** why not just a dueDate field? — then liveness is our claim. Here it's ENS's, and anyone can check it.

## 4. Where the name lives and dies

Orange is the name: created with one signature at listing, written to by the debtor when they confirm, retired in the same transaction that settles. Everything else hangs off its state.

**If they ask:** what if it's never settled? — it expires on the due date, and `renew` revives it for thirty days with its records intact.

## 5. Expiry is an economic primitive, not a label

Our own `UserRegistry`, deployed through VerifiableFactory under `seikyu.eth`. `inv-15.seikyu.eth` expires exactly when the debt is due — so liveness, not a status column, is the source of truth.

**If they ask:** why not a database expiry? — then nobody can verify liveness without trusting us.

## 6. One resolver per invoice — by force, not choice

The deployed resolver scopes setter roles by `keccak256` of the key alone, never by name. Granting an accountant `ack` on one invoice would grant it on all of them. Hence one PermissionedResolver proxy per invoice, eight records each.

**If they ask:** isn't a resolver per invoice expensive? — one proxy deploy, and today it's the only way to isolate permissions per name.

## 7. Confirm the debt, touch nothing else

The debtor's AP wallet holds an EAC role scoped to `ack`. Editing the amount reverts with `EACUnauthorizedAccountRoles` — we can show that live. They can attest to the debt; they can't touch the terms.

**If they ask:** and if they dispute instead? — they write `ack` as disputed, and that status gates the sale.

## 8. A disputed invoice cannot be bought

`buy()` checks `REGISTRAR.isLive(id)`, and separately refuses when `ack` reads disputed. ENS state gates the money directly — it isn't just informing the UI.

**If they ask:** can they dispute after it's sold? — that's a separate flow; this gate is pre-purchase.

## 9. The name retires; the record doesn't

`closeInvoice` pays the investor, burns the token and unregisters the name, in one transaction. Liveness reads the registry; records read the resolver cached at registration — so the records outlive the name.

**If they ask:** doesn't the registry return `address(0)`? — it does, which is exactly why the registrar cached the resolver address at registration.

## 10. The deploy tag should be the docs entry point

Four notes. Document the deploy tag — main has diverged. Call out key-scoped setter roles; that drove our whole design. The resolver has no `text()` getter, so reads go through resolve plus multicall. And `renew` reviving expired storage is useful, but undocumented.

**If they ask:** which would you fix first? — the deploy tag. It costs every new ENSv2 builder real debugging time.
