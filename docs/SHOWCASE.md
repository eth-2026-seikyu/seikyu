# Seikyu (請求) — Invoice factoring where every invoice is an ENSv2 name that expires on its due date

## Short description

Seikyu turns unpaid invoices into ERC-721 receivables that World ID–verified investors buy at a discount. Each invoice is published as an ENSv2 name — live only while the debt is outstanding, gone the moment it's paid, cancelled, or expires unsold.

## Long description

Japanese SMEs typically wait 60–120 days to get paid on an invoice. Seikyu lets a supplier sell that receivable today instead of waiting.

An SME issues an invoice in one transaction: it mints an ERC-721 receivable to escrow, deploys a dedicated ENSv2 Permissioned Resolver holding 7 text records (amount, currency, debtor, due date, status, token id, issuer), and registers `inv-<id>.<parent>.eth` in our own ENSv2 UserRegistry with `expiry` set to the invoice's due date. An 8th record, `ack`, is writable only by the debtor's accounts-payable wallet — a role granted through Enhanced Access Control that is scoped to that one field, on that one invoice.

To buy, an investor must first pass a World ID Passport check. The proof is verified server-side, bound to the investor's wallet, and recorded on-chain as a nullifier — one person maps to one wallet, capped at 3 open positions. The market contract then checks ENS itself before allowing the purchase: the name must still be live, and the debtor's `ack` must not be `disputed`. Buying pays the SME immediately.

When the debtor pays in full, the current holder receives face value, the token burns, and the ENS name is unregistered in the same transaction — the receivable's on-chain identity retires with the debt. If the due date passes with no buyer, the name simply expires: no code path unregisters it, it just stops resolving.

Deployed and tested on Sepolia against the pinned ENSv2 contracts, with the full lifecycle covered by Foundry fork tests.

## How it's made

Contracts are Foundry, built against a pinned tag of the `contracts-v2` ENSv2 repo (`sepolia-deployment-2026-09-15`) via minimal interfaces generated from that tag's ABI — `InvoiceRegistrar` deploys one `VerifiableFactory` proxy of the Permissioned Resolver impl per invoice and grants the debtor's accountant a setter role scoped to the `ack` key only, on top of OpenZeppelin v5 (`ERC721`, `Ownable`, `Pausable`) for the market. The frontend is Next.js 15 (App Router) with wagmi/viem for all contract reads and writes, and `@worldcoin/idkit` 4.3 driving World ID Passport verification against `/api/v4/verify`. Everything runs against Sepolia, deployed on Vercel.

Three facts we didn't expect going in:

1. The deployed resolver's setter-role scope is keyed only by the record key (`keccak256(key)`), not by name — so granting the accountant write access to `ack` on one invoice, without also handing them every other invoice's `ack`, requires deploying a separate resolver per invoice. There's no cheaper way to isolate it.
2. Records stay readable after a name expires. The ENS registry itself returns `address(0)` for an expired name's resolver, but our registrar caches the resolver address at registration time, so text records remain readable straight off that cached resolver even though the name has stopped resolving through the registry.
3. World's `/api/v4/verify` endpoint doesn't verify that the proof's signal matches the wallet we expect — so we hash and compare the signal locally, before ever calling World's API, to stop a proof for one wallet being replayed against another.

## Prize tracks

### ENS — Best Use of ENSv2
- Every invoice is a real ENSv2 subname registered under our own `UserRegistry` (deployed via `VerifiableFactory`), with `expiry = dueDate` — expiry is an economically meaningful primitive, not a display label.
- A dedicated Permissioned Resolver per invoice, because the deployed resolver's setter-role scope is key-only: it's the only way to grant the debtor's accountant write access to one invoice's `ack` record without leaking access to every other invoice.
- `InvoiceMarket.buy()` checks ENS before allowing a purchase — the name must be live and `ack` must not be `disputed` — so ENS state gates a real financial action, not just metadata.
- Text records stay readable through the cached resolver after a name expires or is unregistered (path R), even though liveness correctly reports the name as gone (path L).

### World — Best Use of IDKit
- Uses IDKit 4.3's Passport credential, chosen deliberately as the lowest-friction credential that still gives deterministic, one-document-per-identity uniqueness (Device and Selfie Check were rejected for failing that bar).
- The proof's signal is hashed and checked locally against the investor's wallet before the result is forwarded to `/api/v4/verify`, because World's API does not verify the signal itself.
- Verification is recorded on-chain: a nullifier binds permanently to the first wallet that uses it, enforcing a real per-person exposure cap (3 open positions) instead of a client-side check.
- Demoable failure paths with explicit UI states: cancelled verification (recoverable), nullifier reuse from a second wallet, and signal mismatch.

### Curvegrid — RWA Tokenization
- An ERC-721 receivable represents one real invoice end to end: minted on issue, held in escrow until sold, transferred only to a verified investor, burned on settlement.
- Programmable asset controls live in the transfer hook itself: `_update` blocks transfers to unverified investors and enforces a max-open-positions cap per investor, as code rather than an off-chain KYC gate.
- Self-settling lifecycle: paying the debtor's invoice pays the current holder, burns the token, and retires the invoice's ENS identity in one transaction — no separate redemption step.

## Links

- Live app: <!-- FILL-H5: live URL -->
- Repository: <!-- FILL-H4: repo URL -->
- Demo video: <!-- FILL-VIDEO -->

## Contract addresses (Sepolia)

Pinned ENSv2 infrastructure (`sepolia-deployment-2026-09-15`, commit `f2f0a05e`):

| Contract | Address |
|---|---|
| ETHRegistry | `0x657ea849311d3d5823348dded7c2aaafb3ede09e` |
| ETHRegistrar | `0xabe76f6c8dfced81aa5a2bb8034202a7136b94ca` |
| UniversalResolverV2 | `0x5d25c1d6acbb71b7a28aa7899618a3412a8303e3` |
| VerifiableFactory | `0x9e726eb570beb6bceb495ab8cda7df517d4e841c` |
| PermissionedResolver (impl) | `0x14f09fd05d4585759e54844dc9b00147131cf243` |
| UserRegistry (impl) | `0xa80338aaa8d23831cea25e858d1774534abb0263` |
| ENS mock USDC (parent registration only) | `0x16f95d91dba7da3aca778ec053df0ff6c6a8aa8e` |

Seikyu's own deployment (live on Sepolia):

| Contract | Address |
|---|---|
| Parent name | `seikyu.eth` |
| UserRegistry (our proxy) | `0xA9DFC9d1D5EA96b5Ade09d0E9B84944965B4eD67` |
| InvoiceRegistrar | `0x628701e9A322B019e4aFe31A077f393644D748eF` |
| InvoiceMarket | `0x9Cf9989AfC0196720aa0A64F61a614CFB548B875` |
| Mock USDC (market currency) | `0x6B41ADF3e9A858136C28dfAC2432Eb2356E5451D` |

Source not yet verified on Etherscan (Sourcify attempted, in progress). Deploy block `11784486`; `seikyu.eth` registered at block `11784477` for 8,000,021 ENS-mUSDC.
