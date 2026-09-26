# ETHGlobal Tokyo 2026 — submission form answers

Paste-ready copy for the ETHGlobal project form. Kept in the repo so the
submission text and the code are reviewed together.

## Demonstration link

https://seikyu.xyz

## Short description (≤ 100 characters)

Sell unpaid invoices as ENSv2 names that expire on their due date, to World ID-verified investors.

## Description

Small suppliers often wait 60 or 90 days to get paid on an invoice. Seikyu (請求, Japanese for "invoice") lets a supplier sell that receivable now. The invoice itself is an ENS name that expires on the due date, so the on-chain record lives for as long as the debt does and no longer.

Issuing is one transaction. It mints an ERC-721 receivable into escrow, deploys an ENSv2 Permissioned Resolver for that invoice with seven text records (amount, currency, debtor, due date, status, token id, issuer), and registers inv-<id>.seikyu.eth in our own ENSv2 UserRegistry with the name's expiry set to the due date. An eighth record, ack, can only be written by the debtor's accounts-payable wallet. That permission is granted through the resolver's Enhanced Access Control and scoped to one key on one invoice, so the debtor acknowledges or disputes the invoice on ENS itself.

Before buying, an investor verifies with World ID. The proof is checked server-side, tied to the investor's wallet through the signal, and stored on-chain as a nullifier, so one person gets one wallet and at most three open positions. The market contract then reads ENS before it allows the purchase: the name must still be live and ack must not be "disputed". The supplier receives the discounted price in the same transaction.

When the debtor pays in full, the current holder receives face value, the token burns, and the ENS name is unregistered in the same transaction. If the due date passes with no sale, the name expires. If the invoice was sold and is still unpaid, anyone can mark it overdue; that renews the name for 30 days so the record stays readable while the debt is collected.

All of this runs on Sepolia against the pinned ENSv2 contracts. Seven invoices covering every lifecycle state are live at https://seikyu.xyz, and 46 Foundry fork tests cover the full lifecycle.

## How it's made

Contracts: Foundry, Solidity 0.8.27, OpenZeppelin v5.1. We built against a pinned tag of ENS's contracts-v2 repo (sepolia-deployment-2026-09-15) with hand-written minimal interfaces, checked for selector parity against that tag's ABI. The main branch has a different API, so the tag is the only ground truth. InvoiceRegistrar registers each invoice as a subname in our own UserRegistry (deployed through ENS's VerifiableFactory) and deploys one PermissionedResolver proxy per invoice. InvoiceMarket is the ERC-721 receivable plus escrow; the World ID gate and the position cap are enforced in its transfer hook. 46 fork tests run against Sepolia at a fixed block. All three contracts are Sourcify exact-match verified.

Frontend: Next.js 15 (App Router), wagmi 2, viem 2, Tailwind 4, deployed on Vercel at seikyu.xyz. ENS records are read through UniversalResolverV2 (resolve with a multicall) and liveness through the registry's getState, so the UI can show a name whose records are still readable after it has stopped being live.

World ID: IDKit 4.3 request widget with a server-signed RP context. The verify route hashes the signal with idkit-core's own hashSignal and compares it with the proof before calling /api/v4/verify, because World's endpoint does not check the signal itself. It then enforces environment and credential checks, and an operator wallet relays setVerified(investor, nullifier) on-chain. We designed around Passport and verified a real Passport proof live on Sepolia. The recorded demo runs the Proof of Human preset with legacy v3 proofs allowed, because in the staging Simulator's default v4 mode every test identity shares one nullifier, and a one-person-one-wallet demo needs distinct humans.

Things we learned the hard way: (1) The deployed resolver scopes setter roles by record key only, not by name, so isolating the debtor's ack permission to one invoice requires a resolver per invoice. We found no cheaper way. (2) An expired ENSv2 name keeps its resolver storage and can be revived with renew(), so "mark overdue" is an ENS renewal that keeps an unpaid invoice's identity alive for 30 more days. (3) Staging World ID verification needs a 24-hour staging token that is only obtainable through the Developer Portal's MCP endpoint. We open the window there and send the token as a header on every staging verify call. (4) EIP-7702 smart-account EOAs cannot be issuers because the ERC-1155 registry mint rejects them; the issue form warns about it.

Built during the hackathon with Claude Code agents; the plan, PRD and every prompt are in docs/planning/, and the AI disclosure is docs/AI_USAGE.md.

## Describe how AI tools were used

Claude Code (Anthropic) wrote the code; the team made the decisions, ran the deployment and verified it live. We used the oh-my-claudecode plugin to run planner, reviewer and executor agents, and one of us ran every session.

Before any code, a planner agent drafted the plan and an architect agent and a critic agent reviewed it twice. A team member approved it. Executor agents then implemented the plan's task cards: the Solidity contracts, Foundry scripts and fork tests in contracts/, the Next.js app, World ID verify route and e2e scripts in web/, and the docs, including the Thai user manual and the Playwright scripts that capture its screenshots. Every commit has a Co-Authored-By: Claude trailer.

The team picked the prize tracks and the idea after asking the AI to check prior art, approved the plan, funded the deployer, set up the wallets and the World Developer Portal, did the first live World ID verification with their own wallet, reviewed the output and steered the docs.

Everything the AI was told is in the repo: the plan, the 24-story PRD, the research spikes, every prompt a person typed and every prompt the lead session gave an agent (secrets redacted) are in docs/planning/. Which parts used AI, by path, is in docs/AI_USAGE.md.
