# Seikyu — ENS partner deck script

Speaker notes for `ens.html`, one section per slide. ~2–3 minutes total.

## 1. Seikyu on ENSv2

Seikyu turns unpaid invoices into ENS names. We're built on ENSv2, pinned to the Sepolia deployment tag from mid-September, because the current `contracts-v2` main branch has a different API than what's actually deployed. Every invoice is a subname under `seikyu.eth`, and its expiry is the invoice's due date — a real economic primitive, not a label.

**If they ask:** Why pin to a tag instead of tracking main? Because main's contract API doesn't match what's live on Sepolia — we needed something stable to build against.

## 2. Expiry is an economic primitive, not a label

We deploy our own `UserRegistry` through ENS's VerifiableFactory under `seikyu.eth`. Every invoice becomes a subname — `inv-15.seikyu.eth` — and its ENS expiry is set to the invoice's actual due date. When the debt is due, the name expires. That's not cosmetic: liveness itself becomes the source of truth for whether an invoice is still active.

**If they ask:** Could you use a plain database expiry instead? Sure, but then liveness wouldn't be verifiable on-chain by anyone without trusting us.

## 3. One resolver per invoice — by force, not choice

The deployed resolver scopes setter roles by `keccak256` of the record key alone, not by name. That means we can't grant a debtor's accountant write access to just the `ack` field on one invoice without also handing them `ack` on every invoice we've ever issued. So every invoice gets its own PermissionedResolver proxy, holding eight text records: amount, currency, debtor, dueDate, status, ack, tokenId, issuer.

**If they ask:** Isn't a resolver per invoice expensive? It's one proxy deploy, and today it's the only way to isolate permissions per name.

## 4. Confirm the debt, touch nothing else

The debtor's accounts-payable wallet only holds an Enhanced Access Control role scoped to the `ack` key. If they try to edit the amount instead, it reverts on-chain with `EACUnauthorizedAccountRoles` — we'll show that live. Confirm `ack`, and the invoice badge flips to "Confirmed by debtor." They can attest to the debt; they can't touch the terms.

**If they ask:** What if the debtor disputes it instead? They write `ack` as disputed, and that's the exact status that gates the sale.

## 5. A disputed invoice cannot be bought

`InvoiceMarket.buy()` checks `REGISTRAR.isLive(id)` on the invoice's ENS name, and separately refuses when the debtor's `ack` reads disputed. If it's disputed, the purchase reverts — no investor can buy a receivable the debtor has contested. ENS state is directly gating real money moving, not just informing a UI.

**If they ask:** Can the debtor dispute after it's already sold? Yes, that's a separate flow — this gate is specifically pre-purchase.

## 6. The name retires; the record doesn't

Settlement calls `closeInvoice`: it pays the investor, burns the token, and unregisters the name — one transaction. Liveness and records are two separate paths — liveness reads the registry, records read the resolver cached at registration. So even after a name's gone, records stay readable, because the registry alone returns `address(0)` for it.

**If they ask:** Doesn't returning `address(0)` break the record read? No — the registrar cached the actual resolver address at registration, so record reads don't depend on the registry's live pointer.

## 7. The deploy tag should be the docs entry point

Four quick notes. The deployment tag should be the documented entry point — main's already diverged. Key-scoped setter roles deserve a prominent callout; it drove our whole resolver-per-invoice design. The resolver has no `text()` getter, so every read goes through resolve plus multicall. And `renew` reviving an expired name's storage is useful, though undocumented.

**If they ask:** Which of these would you want fixed first? Probably the deploy-tag documentation — it's the one that costs every new ENSv2 builder real debugging time.
