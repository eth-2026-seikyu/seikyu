# Seikyu — Plain-language UX layer + role entry points

Status: **APPROVED (user, 2026-09-26 21:10 JST, execute via Ralph)** · Drafted 2026-09-26 21:05 JST · Budget: ~3 h agent time (≈2.5 h wall with parallel lanes) · Hard stop: submission 2026-09-27 09:00 JST
Inputs: UI inventory (explore agent, file:line cited below), analyst pre-plan (facts F1–F3, vocabulary, risks), ui-ux-pro-max checklist (§1 accessibility, §2 touch, §8 forms, §9 nav).

## 1. Requirements summary

Make https://seikyu.xyz understandable to someone who has never used web3, and make the three human roles obvious:

| Role (UI label) | On-chain identity | What they do |
|---|---|---|
| **Supplier** | `market.issuer` | issues an invoice, sells it at a discount, may cancel while unsold |
| **Investor** | any wallet; `holder` once bought | passes the one-person check (World ID) at first purchase, buys, is paid face value when the debtor pays |
| **Debtor company** | `market.debtor` (payer) + separate accountant wallet (EAC `ack` role, **not derivable on-chain** — F1) | accountant confirms/disputes on `/accountant`; company pays in full |

Approved scope (user, 21:00 JST): the plain-language + role-entry layer only. Full role dashboards are phase 2 (after submission).

Three contract facts that shape the copy (analyst, verified against `contracts/src/InvoiceMarket.sol`):
- **F1** the accountant wallet is not stored in `invoices()`; the UI can detect Supplier / Debtor / Owner, never Accountant → the accountant path is a neutral link, not a detected role.
- **F2** there is **no escrow**: `buy()` pays the supplier directly, `settle()` pays the owner directly; the market only holds the NFT before sale → never say "escrow".
- **F3** `settle()` has no caller check and `buy()` doesn't exclude issuer/debtor → hints say who *normally* does what; panels stay visible to everyone (no new gating).

## 2. Design decisions (fixed, not re-litigated during execution)

- **Keep the current light, clean look.** ui-ux-pro-max's style pick ("Vibrant block", gold/purple dark) doesn't fit a trust-first B2B product; its typography pick (IBM Plex) is fine but not worth a re-shoot of 38 figures for. Fix the real bug instead: `web/app/globals.css:25` sets `font-family: Arial`, overriding the Geist font the layout loads.
- **English UI only** (judges); the Thai guide stays the Thai surface. Remove the three hard-coded Japanese labels (`取引先経理`, `取引先`) from `app/accountant/page.tsx:15`, `IssueForm.tsx:270,281` — plain English "Debtor company" / "Debtor's accountant".
- **Truthful about test money**: every page keeps one visible "test money on a test network" line; "mUSDC" becomes "test USDC" in prose, but **button labels that scripts match stay** (`Approve mUSDC`, `Buy for …`, `Settle (pay …)`, `Get 10,000 mUSDC`).
- **Move, never delete, the ENS/tx/resolver material** (ENS judges look for it): it goes into a `<details data-testid="tech-details">` that is closed by default on `/invoice/[name]`, and stays fully visible on `/accountant` (the EAC demo is the ENS-judge moment; capture 04 clips to it).
- **Role detection is additive**: a pure function `rolesFor(invoice, address)` returns every matching role (issuer+holder, debtor+holder are real combos — F3) and the banner lists all of them.
- **No new `data-state` values anywhere.** New elements use `data-testid` / `data-role`. The PRD grep for the 11 `data-state` strings must stay at 11 and the full set must equal HEAD's.
- **Dates**: plain "Due …" uses `market.dueDate`, never `ensExpiry` (after `markOverdue` the ENS expiry is +30 d and would read "due in 30 days"). Relative text is client-rendered (home is ISR `revalidate=15`, server TZ ≠ user TZ); absolute text is pinned `en-US`, `Asia/Tokyo`, suffixed "JST". Minutes matter (`MIN_TENOR` = 60 s): "due in 4 min", "3 days overdue".
- **Money**: 6 decimals; show `1,000` for whole amounts and `970.50` for fractional; investor copy is "pay 950, receive 1,000 when the debtor pays" — never "guaranteed" (Overdue exists).
- **Wrong chain / no wallet**: `lib/wagmi.ts:23-28` is injected-only + Sepolia; nothing reads `chainId`. Add a client banner: `chainId !== 11155111` → "Switch to the Sepolia test network" with `useSwitchChain`, and action buttons disabled; `connectors[0]` undefined → "No browser wallet found — install MetaMask or open in a wallet browser". Capture wallet returns `0xaa36a7`, so scripts are unaffected.

## 3. Vocabulary (single source: `web/lib/copy.ts`)

| Today | Plain UI term | Tooltip / helper (Term component, tap+focus, `aria-expanded`) |
|---|---|---|
| issuer | Supplier | the business that issued the invoice and is selling it |
| debtor | Debtor company | the company that owes the invoice |
| accountant / AP wallet | Debtor's accountant | can confirm or dispute the invoice on the debtor's behalf |
| holder | Current owner (investor) | receives the amount owed when the debtor pays |
| face value | Amount owed | — |
| price | Sale price | what an investor pays the supplier now |
| mUSDC | test USDC | mock stablecoin on the Sepolia test network — no real value |
| Sepolia | test network (Sepolia) | — |
| faucet | free test money | button label unchanged |
| Approve | (label unchanged) | "Step 1 of 2 — allow Seikyu to move this amount" / "Step 2 of 2 — pay" |
| receivable / NFT | invoice ownership token | proves who is owed the money |
| ack: none / acknowledged / disputed / invalid | No response yet / Confirmed by debtor / Disputed by debtor / Unreadable (buying blocked) | "Confirmed" is not a payment guarantee |
| World ID | one-person check | proves you are one real person; you verify once, at your first purchase |
| nullifier-used | already used by another wallet | — |
| ENS name / records / resolver / EAC | Invoice ID (an ENS name) / Technical details | — |
| Open / Funded / Overdue / Expired-unsold / Paid / Cancelled | For sale / Sold — awaiting payment / Past due — unpaid / Not sold in time / Paid in full / Withdrawn by supplier | badge keeps `data-state` = the old value |

## 4. Task cards (owned paths; commit with explicit pathspec; never `git add -A`)

Lanes: **L1** can run in parallel with **L2/L3** (disjoint files). **L4–L6** start after L1 merges (they import `lib/format.ts`, `lib/roles.ts`, `lib/copy.ts`). **L7** after L4–L6. **L8** last.

| # | Card | Files | Est. | Verify |
|---|---|---|---|---|
| L1 | **Shared helpers** — `lib/format.ts` (`formatMoney` 6-dec whole/fraction rule, `formatDueDate` {absolute JST, relative incl. minutes/overdue}, `shortAddress`), `lib/roles.ts` (`rolesFor(invoice, address): Role[]`, `Role = "supplier" \| "debtor" \| "owner"`), `lib/copy.ts` (table §3 as constants). Replace the 5 duplicated `formatMoney` and 3 `formatDate` copies. | `web/lib/format.ts` `web/lib/roles.ts` `web/lib/copy.ts` + call-site imports | 35 m | `pnpm build`; `node --import tsx` unit script in `web/scripts/format-check.ts` printing 6 cases (whole, fraction, due-in-4-min, due-today, 3-days-overdue, JST suffix) |
| L2 | **Style base** — remove the `Arial` override in `globals.css:25`; add `Button` (primary/secondary/danger, ≥44 px tap, `cursor-pointer`, focus ring, disabled opacity) and `Card` primitives in `web/components/ui/`; migrate the copy-pasted button classes (`InvoiceActions.tsx:13`, `WorldVerifyButton.tsx:35`, BuyPanel, PayPanel, FaucetButton, AckEditor, IssueForm) **without changing button text or `data-state`**. | `web/app/globals.css` `web/components/ui/*` + class swaps | 30 m | build; visual diff of one screen at 375 px and 1280 px |
| L3 | **Header + chain guard** — nav labels: `For suppliers` (`/issue`), `For investors` (`/#for-sale`), `For debtors` (`/accountant`); brand link "Seikyu" → `/`; testnet pill copy "Test network · no real money"; `header-connect-button.tsx`: "No browser wallet found" when `connectors[0]` is undefined, disconnect behind a 1-step confirm; new `ChainGuard.tsx` client island in layout: wrong-chain banner + `useSwitchChain`, exports `useOnSepolia()` that panels call to disable writes. | `web/app/layout.tsx` `web/components/header-connect-button.tsx` `web/components/ChainGuard.tsx` | 30 m | build; PW: mock `eth_chainId` `0x1` → banner visible and `#actions button` all disabled |
| L4 | **Home** — h1 "Sell an invoice today, or invest in one", one-line what/why, **three role cards** (Supplier → `/issue`; Investor → first Open invoice, else `#for-sale` list with "nothing for sale right now"; Debtor company → `/accountant`) each one sentence + one CTA; keep the 3-step box in plain words; section ids `#for-sale` / `#attention` / `#closed`; test-money line; role cards render with zero invoices. | `web/app/page.tsx` `web/components/RoleCards.tsx` `web/components/InvoiceCard.tsx` (plain labels only) | 30 m | build; PW: 3 `[data-role-card]`, links resolve, 375 px no horizontal scroll |
| L5 | **Invoice detail** — top summary card (plain status badge = same `SettlementBadge`, exactly one per page; Amount owed / Sale price / Due (plain, from `market.dueDate`) / Supplier / Debtor / Owner as short addresses with copy + "Copied"); `RoleBanner` client island **outside `#actions`** listing every matched role + the per-role next step (§5 hints); neutral link "Debtor's accountant? Confirm or dispute →" to `/accountant?name=…`; `<details data-testid="tech-details">` closed by default containing the h1 ENS name (`main h1.font-mono` stays inside `main`), "View on ENS app →", "Name live on ENS …" line, the 8-row records table with `tr[data-record]`, resolver link; auto-open when `location.hash === "#ens"`. | `web/app/invoice/[name]/page.tsx` `web/components/RoleBanner.tsx` `web/components/TechDetails.tsx` `web/components/AddressChip.tsx` | 45 m | build; PW: details closed → open → 8 `tr[data-record]`; `main span[data-state='Funded']` count 1 on inv-5; banner text per capture wallet |
| L6 | **Panels & forms copy** — BuyPanel: "Step 1 of 2 / Step 2 of 2" helpers, verify intro "One-time one-person check (World ID)", cap message "You already own 3 open invoices (the maximum)"; PayPanel: "Pay the amount owed — goes straight to the current owner"; InvoiceActions plain state text (Expired-unsold: "Nobody bought it before the due date"; Cancelled: "Withdrawn by the supplier"; Overdue: "Past due — the debtor can still pay"); IssueForm: labels keep the prefixes scripts match (`Debtor address (`, `Debtor accounts-payable address`, `Face value`, `Discount %`), remove `NEXT_PUBLIC_*` names and EIP/ERC jargon from visible text (keep a short "smart-account wallets can't issue — use a normal wallet"), plain "+7 days" helper; AckEditor/`/accountant`: plain intro above the table ("You are the debtor's accountant. Confirm or dispute the invoice; the supplier and investors see it instantly"), keep records table + EAC demo visible, remove env-var name from UI; FaucetButton: "Free test money" caption, button text unchanged. **No state-machine edits.** | `web/components/{BuyPanel,PayPanel,InvoiceActions,IssueForm,AckEditor,FaucetButton,WorldVerifyButton}.tsx` `web/app/{issue,accountant}/page.tsx` | 40 m | build; `data-state` set identical to HEAD; capture-script text selectors still resolve (run 00–06 dry) |
| L7 | **Manual + scripts re-shoot** — update `docs/manual/capture/*.mjs` selectors that changed (open `tech-details` before highlighting `tr[data-record]`, `Name live on ENS`); re-run 00→07 against `http://localhost:3021` (**not** the live site: 02/06-f3 consume Simulator identities and send tx — use identity #2 only if a fresh verify is unavoidable, keep #3 for the video); regenerate changed figures; update USER_GUIDE prose that quotes changed labels (mUSDC ×32, Name live on ENS ×6, etc.) and DEMO_SCRIPT.md if it quotes labels. | `docs/manual/**` `docs/USER_GUIDE.md` `docs/DEMO_SCRIPT.md` | 40 m | all 38 figures referenced, numbered, <400 KB; changed-set listed in the commit body |
| L8 | **Verify + ship** — AC-U1…U10 below by an independent verifier; deploy is automatic on push (Vercel); re-probe `https://seikyu.xyz` (200s, 7 invoices, verify route 400/422); update `docs/AI_USAGE.md` table row for `web/components/ui/`, `RoleBanner`, etc.; refresh `docs/planning/`. | verifier lane | 20 m | evidence in `.omc/progress.txt` |

## 5. Per-role next-step hints (RoleBanner, outside `#actions`)

| Detected | State | Banner + hint |
|---|---|---|
| none (disconnected) | any | "Connect a wallet to see what you can do here." |
| none (connected, no role) | Open | "You're viewing as an investor. Buying requires a one-time one-person check." |
| supplier | Open | "You issued this invoice. It's for sale at {price}. You can withdraw it until someone buys." |
| supplier | Funded/Overdue | "Sold — you were paid {price}. The debtor now owes {face} to the owner." |
| debtor | Open | "This invoice is addressed to your company. Your accountant can confirm or dispute it; you can pay it after it's sold." |
| debtor | Funded/Overdue | "Your company owes {face}. Paying closes the invoice." (Overdue adds "It's {n} days past due.") |
| owner | Funded | "You own this invoice. You'll receive {face} when the debtor pays (due {date})." |
| owner | Overdue | "You own this invoice. It's {n} days past due — the debtor can still pay." |
| multiple | any | one banner listing all roles, e.g. "You're the supplier and the current owner." |
| any | Paid / Cancelled / Expired-unsold | plain closing sentence from §3; no actions promised |

## 6. Acceptance criteria (all testable)

- **AC-U1** `cd web && pnpm lint && pnpm build` pass (build via the rsync temp-copy method if the dev server is running).
- **AC-U2** `grep -rhoE 'data-state="(cancelled|credential-unavailable|credential-mismatch|signal-mismatch|nullifier-used|not-verified|ack-blocked|name-not-live|position-cap|overdue|expired-unsold)"' web/components web/app | sort -u | wc -l` = 11, and `grep -rhoE 'data-state="[^"]+"' web/components web/app | sort -u` is byte-identical to the same command on the pre-change commit.
- **AC-U3** Capture scripts 00→07 run green against the new build; every changed figure is regenerated; 38 figures referenced in order, <400 KB.
- **AC-U4** Playwright on `/invoice/inv-1.seikyu.eth`: `[data-testid=tech-details]` is closed on load; after opening it contains 8 `tr[data-record]`, the resolver link and "View on ENS app".
- **AC-U5** Playwright on a Funded invoice (inv-5): `main span[data-state='Funded']` count = 1.
- **AC-U6** RoleBanner per capture wallet: SME on an Open invoice → "supplier" + withdraw hint; DEBTOR on Funded → "debtor" + pay hint; INVESTOR_A on the invoice it holds → "owner"; disconnected → connect prompt; `eth_chainId` mocked to `0x1` → switch banner and all `#actions button` disabled.
- **AC-U7** Text scan of `/`, `/invoice/inv-1…`, `/accountant`: every occurrence of "USDC" outside `tech-details` is qualified as test money (or is a button label from the frozen list).
- **AC-U8** At 375 px: `document.documentElement.scrollWidth <= 375` on `/`, `/invoice/inv-1…`, `/issue`, `/accountant`; header wraps to ≤ 2 rows.
- **AC-U9** inv-7 (overdue, revived) shows "N days past due", not "due in 30 days"; a fractional price renders `970.50`; a whole one renders `1,000`.
- **AC-U10** `grep -ri escrow web/` is empty; `grep -rn 'NEXT_PUBLIC_' web/components web/app` has no hits inside JSX text.
- **AC-U11** Live: after the Vercel deploy, `https://seikyu.xyz` 200 with 7 invoices; `POST /api/world/verify` `{}` → 400 `INVALID_BODY`.

## 7. Risks → mitigations

1. Scripts select by visible text → freeze the button-label list (§2), add `data-testid` to every new element, update scripts in the same commit as the UI change, re-run 00→07 (AC-U3).
2. Collapsed details hides `tr[data-record]` from `>> visible=true` locators → scripts open `tech-details` first; `#ens` hash auto-opens.
3. Strict-mode locator `main span[data-state='Funded']` silently times out on 2 matches → exactly one `SettlementBadge` per page (AC-U5).
4. Capture 02 highlights the first `#actions [data-state] p` → RoleBanner and hints live outside `#actions`.
5. Hydration flicker of the banner (wagmi `ssr:true`) → render after mount with a fixed-height placeholder (CLS < 0.1).
6. Time overrun → cut line at T+2:30 h: if L7 isn't started, ship L1–L6 with the guide marked "figures being refreshed" in the commit body and re-shoot after the video; never ship L5/L6 half-migrated (each card is one atomic commit).
7. Video recorded after this change → freeze copy at L8 sign-off; Simulator identity #3 reserved for the recording.

## 8. Not in this pass

No contract/ABI changes · no new write actions (no Expired-unsold cancel button, no standalone verify page) · no on-chain accountant detection · no reverse-ENS names · no Thai UI / i18n · no Issue-form restructure · no connector changes (RainbowKit stays out) · no state-machine edits in BuyPanel/PayPanel/WorldVerifyButton · no dark-mode design pass (keep `prefers-color-scheme` as is) · no role dashboards (`/supplier`, `/investor`) — phase 2.

## 9. Execution recommendation

**Ralph, continuing the existing loop** (append stories US-025…US-032 = L1…L8 to the session PRD; PRD currently 21/24 with the 3 open stories waiting on video/submit). Reasons: the work overlaps on the same files (layout, invoice page, panels) so Team's parallel lanes would collide (we already hit a git-index race in round 1); ultrawork still runs L1‖L2‖L3 and later L4‖L5‖L6 in parallel where files are disjoint; Ralph's per-story verification + reviewer gate is exactly the guard needed for "don't break the tested flows"; one V2 + one `/oh-my-claudecode:cancel` closes everything. Team is the right tool for phase-2 dashboards.

## 10. Verification runbook (L8)

```sh
# AC-U1
cd web && pnpm lint && pnpm build
# AC-U2
grep -rhoE 'data-state="[^"]+"' web/components web/app | sort -u > /tmp/ds-new; git show <pre>:… | … | diff - /tmp/ds-new
# AC-U3/U4/U5/U6/U8/U9: Playwright checks via docs/manual/capture harness (MANUAL_BASE_URL=http://localhost:3021)
# AC-U7/U10
grep -rn 'USDC' web/app web/components | grep -v 'test USDC' | grep -v 'Approve mUSDC\|Get 10,000 mUSDC\|Buy for\|Settle (pay' ; grep -ri escrow web/
# AC-U11
curl -s -o /dev/null -w '%{http_code}' https://seikyu.xyz ; curl -s https://seikyu.xyz | grep -oE 'inv-[0-9]+\.seikyu\.eth' | sort -u | wc -l
```
