# ETHGlobal Tokyo 2026 — submission form answers

Paste-ready copy for the ETHGlobal project form. Kept in the repo so the
submission text and the code are reviewed together.

## Demonstration link

https://seikyu.xyz

## Short description (≤ 100 characters)

Sell unpaid invoices as ENSv2 names that expire on their due date, to World ID-verified investors.

## Description

Japanese SMEs typically wait 60–120 days to get paid on an invoice. Seikyu (請求, "invoice") lets a supplier sell that receivable today instead of waiting — and makes the invoice itself a first-class on-chain object with an ENS identity that lives exactly as long as the debt does.

Issuing an invoice is one transaction: it mints an ERC-721 receivable into escrow, deploys a dedicated ENSv2 Permissioned Resolver holding seven text records (amount, currency, debtor, due date, status, token id, issuer), and registers inv-<id>.seikyu.eth in our own ENSv2 UserRegistry with the name's expiry set to the invoice's due date. An eighth record, ack, can only be written by the debtor's accounts-payable wallet — a role granted through the resolver's Enhanced Access Control and scoped to that one key on that one invoice, so the debtor acknowledges or disputes the invoice on ENS itself.

To buy, an investor first proves personhood with World ID. The proof is verified server-side, bound to the investor's wallet address through the signal, and recorded on-chain as a nullifier — one human maps to one wallet, capped at three open positions. The market contract then checks ENS before allowing the purchase: the name must still be live and the debtor's ack must not be "disputed". Buying pays the SME immediately, at a discount.

When the debtor pays in full, the current holder receives face value, the token burns, and the ENS name is unregistered in the same transaction — the receivable's identity retires with the debt. If the due date passes unsold, the name simply expires. If it was sold but is unpaid, anyone can mark it overdue, which renews the name for 30 days so the record stays live while the debt is collected.

Everything runs on Sepolia against the pinned ENSv2 contracts: seven invoices covering every lifecycle state are live at https://seikyu.xyz, and the full lifecycle is covered by 46 Foundry fork tests.

## How it's made

Contracts: Foundry, Solidity 0.8.27, OpenZeppelin v5. We built against a pinned tag of ENS's contracts-v2 repo (sepolia-deployment-2026-09-15) using hand-written minimal interfaces checked for selector parity against that tag's ABI — the main branch has a different API, so the tag is the only ground truth. InvoiceRegistrar registers each invoice as a subname in our own UserRegistry (deployed through ENS's VerifiableFactory) and deploys one PermissionedResolver proxy per invoice; InvoiceMarket is the ERC-721 receivable plus escrow, with the World ID gate and the position cap enforced inside the transfer hook. 46 fork tests run against Sepolia at a fixed block; all three contracts are Sourcify exact-match verified.

Frontend: Next.js 15 (App Router), wagmi 2 / viem 2, Tailwind 4, deployed on Vercel at seikyu.xyz. ENS records are read through UniversalResolverV2 (resolve + multicall) and liveness through the registry's getState, so the UI can show "records still readable, name no longer live" after expiry.

World ID: IDKit 4.3 request widget with a server-signed RP context. The verify route hashes the signal with idkit-core's own hashSignal and compares it to the proof before calling /api/v4/verify (World's endpoint does not check the signal itself), enforces environment and credential checks, then an operator wallet relays setVerified(investor, nullifier) on-chain. We designed around Passport and verified a real Passport proof live on Sepolia; the recorded demo runs the Proof of Human preset with legacy-v3 proofs allowed, because in the staging Simulator's default v4 mode every test identity shares one nullifier — only the legacy mode yields distinct humans, which a one-person-one-wallet demo needs.

Hacky bits worth knowing: (1) the deployed resolver scopes setter roles by record key only, not by name, so isolating the debtor's ack permission to one invoice requires a resolver per invoice — there is no cheaper way. (2) An expired ENSv2 name keeps its resolver storage and can be revived with renew(), so "mark overdue" is literally an ENS renewal that keeps an unpaid invoice's identity alive for 30 more days. (3) Staging World ID verification needs a 24-hour staging token that is only obtainable through the Developer Portal's MCP endpoint — we scripted that. (4) EIP-7702 smart-account EOAs can't be issuers because the ERC-1155 registry mint rejects them; the issue form warns about it.

Built during the hackathon with Claude Code agents; the plan, PRD and every prompt are in docs/planning/, and the AI disclosure is docs/AI_USAGE.md.
