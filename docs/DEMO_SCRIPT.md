# Demo script (3:00)

One continuous take, screen recording + voiceover. Routes are on the live Vercel deployment
unless noted. `$PARENT` = the registered parent label (see `contracts/deployments/sepolia.json`).

## Timed table

| Time | Screen / route | Action | What it proves | Prize bullet |
|---|---|---|---|---|
| 0:00–0:20 | Title slide / voiceover, no app on screen | State the problem: small suppliers everywhere wait weeks or months on net-60 / net-90 terms, and the receivable is locked up until the debtor pays. | Context: why a tradeable, expiring receivable matters | — |
| 0:20–0:50 | `/issue` → `/invoice/inv-N.$PARENT` | SME fills the issue form and signs **one transaction**. Redirect lands on the invoice detail page: **8 ENS records** read live off the stored resolver, a countdown to `expiry = dueDate`, and links out to Etherscan and the ENS app. | One tx mints the ERC-721 receivable, deploys a per-invoice Permissioned Resolver, and registers `inv-<id>.$PARENT.eth` with `expiry = dueDate` | ENS — hierarchy (parent → per-invoice subname), expiring names, one resolver per invoice |
| 0:50–1:25 | `/invoice/[name]` Buy panel | Investor clicks **Buy** → World ID widget opens → click **Cancel** (F1, `data-state="cancelled"`) → click **Retry** → complete the **Human (Proof of Human)** flow in the World ID Simulator, with the Simulator's **"Legacy v3 proof"** toggle on → server verifies and emits `InvestorVerified` → click **Buy** again → the invoice's ENS `status` record flips to `funded`. (Recorded with `proofOfHuman` + Legacy v3, not Passport — the Simulator's default v4 mode shares one signer across every identity for either credential, so it can't support more than one investor wallet on staging; Legacy v3 mode is the one that actually gives each identity its own nullifier. See the pre-recording checklist and `docs/WORLD_ID_DEBRIEF.md`. Production's default credential is Passport — the live Passport `InvestorVerified` tx is cited there.) | World ID gates real purchases; a cancelled verification is recoverable, not a dead end | World — World ID–verified purchase, `InvestorVerified` recorded on-chain |
| 1:25–1:45 | Same Buy panel, second MetaMask wallet | The same person switches to a **second wallet** and tries to verify with the same World ID identity → server returns `409 NULLIFIER_ALREADY_USED`, UI shows `data-state="nullifier-used"` ("already linked to 0x…"); a direct on-chain `setVerified` call would revert `NullifierAlreadyUsed`. | One human maps to one wallet — enforced by an on-chain nullifier, not app-side trust | World — deterministic uniqueness (F3) |
| 1:45–2:15 | `/accountant` | Debtor's accounts-payable wallet sets `ack=acknowledged` on the first invoice (succeeds) → clicks **"Try to edit amount"** → reverts `EACUnauthorizedAccountRoles` → switches to a second invoice and sets `ack=disputed` → back on that invoice, **Buy** is blocked (`data-state="ack-blocked"`, contract reverts `PurchaseBlockedByAck`). | Enhanced Access Control confines the debtor to one record; ENS state itself gates the market, not just app logic | ENS — EAC setter-role scoping (E6), ENS records as a purchase gate |
| 2:15–2:40 | `/invoice/[name]` Pay panel | Debtor calls **Settle**: the current holder (the investor) receives the invoice's face value in mUSDC, the ERC-721 is burned, and the invoice's ENS name is **unregistered immediately**. | A tokenized receivable and its on-chain identity retire together the moment the underlying debt is paid | Curvegrid — programmable, self-settling RWA lifecycle |
| 2:40–3:00 | `/` home + terminal (`check-ens.ts`) | The invoice seeded 10 minutes earlier, now past its due date and never bought, shows **"Not sold in time"** on the homepage (the plain-language label for the `Expired-unsold` state, under the "Needs attention" section). Running `pnpm -C web exec tsx scripts/check-ens.ts <name>` prints `RESOLVES: false` while `records[status]=listed` still reads back. Close on: **"The name lives as long as the debt is current."** | Expiry is a first-class economic primitive, not a UI label — the name dies, the records don't | ENS — expiry as primitive, records survive expiry via the stored resolver (path R vs. path L) |

Total: 3:00.

## Talk track (read over each segment, ≤ 40 words, for a non-crypto judge)

**0:00 — Problem.** "Small suppliers everywhere wait weeks or months to get paid on an invoice — net-60, net-90, sometimes longer. Seikyu — 請求, Japanese for 'invoice' — lets a supplier sell that unpaid invoice today, to a verified investor, for cash now."

**0:20 — Issue.** "One signature turns an invoice into a tradeable asset. Behind the scenes we mint a token and register a unique web name for it — a name that automatically expires on the day the debt is due."

**0:50 — Buy / World ID.** "Before anyone can buy this receivable, they prove with World ID that they're a real, unique person — so no one wallet-farms their way into three different investor identities. In production this runs on Passport; today's demo uses World ID's Human check for the same reason."

**1:25 — Second wallet.** "If that same person tries a second wallet, the system recognizes the same passport underneath and blocks it — one human maps to one investor identity, automatically."

**1:45 — Accountant / EAC.** "The debtor's own accounting team confirms the invoice is real, but the system only lets them touch that one confirmation — they can't quietly change what they owe. The blockchain enforces that boundary."

**2:15 — Settle.** "When the debtor pays, the investor is paid instantly, the token is destroyed, and the invoice's web name disappears — because the debt behind it no longer exists."

**2:40 — Expiry / closing.** "If an invoice never finds a buyer and its due date passes, its name simply expires. On Seikyu, a name lives as long as the debt behind it is current — nothing more."

---

## Pre-recording checklist

- [ ] `contracts/.env` and `web/.env.local` populated; `contracts/deployments/sepolia.json` has no `0x000…000` addresses left for `userRegistry`, `invoiceRegistrar`, `invoiceMarket`, `mockUsdc`
- [ ] All demo wallets funded per plan §2.8: SME ≥ 0.2 ETH; operator, Investor A, Investor A2, debtor, debtor AP ≥ 0.05 ETH each on Sepolia; Investor A, Investor A2, and debtor hold mUSDC (from `Seed.s.sol`)
- [ ] Run `pnpm -C web exec tsx scripts/e2e-sepolia.ts --seed` **exactly 12 minutes before recording starts**, so the `EXPIRY_DEMO` invoice (due now + 10 minutes) crosses its due date on cue for the 2:40 segment
- [ ] World ID Simulator tab open and logged in at `https://simulator.worldcoin.org/id/0x18310f83`, ready on the **Human (Proof of Human)** flow — not Passport, see the identity note below
- [ ] **World Simulator identities planned in advance — record with `proofOfHuman` AND the Simulator's "Legacy v3 proof" toggle, not plain `passport`.** `simulator.worldcoin.org` only exposes **5 fixed, shared test identities** (Settings → "Switch test identity") — the default `/id/0x18310f83` is identity **#4**. **The Simulator's default "World ID 4.0" mode is a trap for this demo**: it shares one signer across all five identities under *either* Passport or Proof of Human, so identities #4, #1, and a freshly-created #5 all produced the identical nullifier `0x28318508…85ab` when verified with `passport` in that mode — only wallet `0x2aaA…259A` was ever able to bind it on-chain (that's our one live Passport `InvestorVerified` tx, proving the code path works). Switching the preset alone to `proofOfHuman` doesn't fix this — still v4, still one shared nullifier. What actually works: set `NEXT_PUBLIC_WORLD_PRESET=proofOfHuman` (the Simulator's "Human" card) **and** flip the Simulator's own **"Legacy v3 proof"** toggle — that combination gives each identity its own distinct nullifier (confirmed live: identity #1 → `0x274a…c29b`, bound to Investor A `0x6013…C131`, [tx](https://eth-sepolia.blockscout.com/tx/0xde353f1a30fdf850010d72aadb34a5c194bee5128ad1e39e17803e392400a38c); identity #0 → `0x20b66c56…60d8`). Current binding map (after the manual re-shoot on 26 Sep): #0 → Investor A2, #1 → Investor A, #2 → the debtor's-accountant wallet, #4 → the lead's own wallet; **only identity #3 is still fresh**. So the recording needs identity #3 plus **two brand-new MetaMask accounts** (any wallets never verified on this contract): verify #3 on the first one for the happy path, then switch to the second one and present #3 again for the F3 beat. Decide this *before* rolling camera, not during. For the F3 beat, deliberately **reuse an already-bound identity with a second wallet** to trigger the real `409 NULLIFIER_ALREADY_USED` — don't burn a fresh identity on it (confirmed on-chain: `setVerified(investorA2, 0x274a…c29b)` reverts `NullifierAlreadyUsed(0x6013…C131)` at `estimateGas`, selector `0x183d4b06`, no tx). If an identity needs to be freed for reuse, the contract owner calls `InvoiceMarket.revokeVerification(wallet, nullifier)` (`onlyOwner`; emits `InvestorVerificationRevoked`). See [`docs/WORLD_ID_DEBRIEF.md`](WORLD_ID_DEBRIEF.md#credential-choice--why-it-is-the-minimum-sufficient-assurance) for the full story.
- [ ] **World ID staging verification window is open.** It expires `2026-09-27T08:26Z` (17:26 JST) — if recording after that, re-open it first via the Developer Portal MCP tool (`set_world_id_staging_verification({ app_id, enabled: true })`) and refresh `WORLD_STAGING_VERIFICATION_TOKEN` in `web/.env.local`, or every verify call will fail with `403 environment_not_allowed` on camera. See [`docs/WORLD_ID_DEBRIEF.md`](WORLD_ID_DEBRIEF.md#friction).
- [ ] MetaMask has **two brand-new investor wallets** (never verified on this contract — Investor A and A2 are already verified and would skip the World ID step) added, funded with a little Sepolia ETH and test USDC (faucet button on the home page), and unlocked on Sepolia, for the happy path and the F3 second-wallet beat
- [ ] A separate MetaMask wallet for the debtor accounts-payable role is added and ready to switch to for `/accountant`
- [ ] Live Vercel URL loaded and hard-refreshed once immediately before recording, so `/` shows the freshly seeded invoices
- [ ] Terminal font size large enough to read `check-ens.ts` output on camera; scrollback cleared
- [ ] GitHub repo tab open and ready to flash on screen (AC-19 "repo visible")

## Fallback

- **If the World ID Simulator is flaky or the Human/Proof of Human flow won't complete on camera**: cut to `forge test` evidence instead of a live verify —
  ```
  forge test --fork-url $SEPOLIA_RPC_URL --fork-block-number $FORK_BLOCK --match-test test_nameExpiredAtDueDate -vv
  cast call $MARKET "isVerified(address)(bool)" $INVESTOR_A --rpc-url $SEPOLIA_RPC_URL
  cast logs --from-block $(jq -r .deployBlock $DEP) --address $MARKET "InvestorVerified(address,bytes32)" --rpc-url $SEPOLIA_RPC_URL | grep -c transactionHash
  ```
  (`test_nameExpiredAtDueDate` lives in `contracts/test/InvoiceRegistrar.t.sol`; the two `cast` calls are the AC-11 happy-path checks — `isVerified` returning `true` and at least one `InvestorVerified` log.)
- **If Sepolia is slow or a transaction hangs on camera**: don't wait it out live — cut to the pre-recorded transaction links captured from a prior `pnpm -C web exec tsx scripts/e2e-sepolia.ts --flow` run (`CREATE_TX`, `VERIFY_TX`, `BUY_TX`, `SETTLE_TX`), also listed in `docs/ENS_INTEGRATION.md`.

## AC-19 checklist (manual video review)

- [ ] Total runtime ≤ 3:00
- [ ] Happy path shown: issue → buy → settle
- [ ] F1 shown: cancel the World ID widget, then retry
- [ ] F3 or F5 shown: second-wallet nullifier reuse, or a signal mismatch
- [ ] EAC revert shown: `EACUnauthorizedAccountRoles` on "Try to edit amount"
- [ ] `disputed` ack shown blocking Buy
- [ ] Name unregistered after settle shown (via `check-ens.ts` or the detail page)
- [ ] "Not sold in time" (`Expired-unsold` state) shown on `/`
- [ ] Live URL visible on screen
- [ ] GitHub repo visible on screen
