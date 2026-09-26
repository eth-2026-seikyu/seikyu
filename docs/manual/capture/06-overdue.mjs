// Chapter 6.6 — a funded invoice past its due date (Overdue). Run
// `06-overdue-seed.mjs` first (ideally several minutes before this, so the
// wait below is short); this script polls until the due date has actually
// elapsed, captures the "before Mark overdue" figures, clicks the button
// itself, then captures "after".
import { BASE, settle, shot, openAs, connect, wallet, nextTx, panelClip, topCardClip, dropClip, loadState } from "./common.mjs";

const state = loadState();
const INVOICE = process.env.OVERDUE_INVOICE ?? state.overdueInvoice;
if (!INVOICE) {
  throw new Error("No overdue invoice seeded — run 06-overdue-seed.mjs first (or set OVERDUE_INVOICE).");
}

const { browser, page, account } = await openAs("INVESTOR_A2", { height: 1100 });
await page.goto(`${BASE}/invoice/${INVOICE}`);
await settle(page, 1200);
await connect(page, account);

// Wait for the due date to actually pass (state flips Funded -> Overdue with
// no transaction — it's a timestamp comparison). Seeding well ahead of this
// script means this loop is usually a no-op.
for (let i = 0; i < 30; i++) {
  if (await page.locator("main span[data-state='Overdue']").isVisible().catch(() => false)) break;
  await page.waitForTimeout(10_000);
  await page.reload();
  await settle(page, 800);
  await connect(page, account);
}
await page.locator("main span[data-state='Overdue']").waitFor({ timeout: 30_000 });
await settle(page, 800);

const markVisible = await page.getByRole("button", { name: "Mark overdue" }).isVisible().catch(() => false);
console.log("OVERDUE before-mark, Mark overdue button visible:", markVisible);

// Before Mark overdue: state Overdue, ENS name already expired (no tx needed
// — expiry is a timestamp check), no plain-language change here beyond the
// L5 redesign's badge/dl relocation.
await shot(page, "06-12-overdue-before", {
  highlights: [{ selector: "main span[data-state='Overdue']", n: 1 }],
  clipTo: await topCardClip(page),
});
await dropClip(page);
await page.locator("#actions").evaluate((el) => el.scrollIntoView({ block: "center" }));
await settle(page, 500);
await shot(page, "06-13-overdue-actions-before", {
  highlights: [
    { selector: "#actions [data-state='overdue']", n: 4 },
    ...(markVisible ? [{ selector: '#actions button:has-text("Mark overdue")', n: 5 }] : []),
  ],
  clipTo: await panelClip(page),
  clipPad: 8,
});
await dropClip(page);

if (markVisible) {
  // Once the tx confirms, `router.refresh()` flips `invoice.live` to true and
  // the *entire* `!invoice.live` branch — MarkOverdueButton included — is
  // replaced by the revived-state branch, so the button unmounts before its
  // own local "marked" text would ever paint. Reload and check the revived
  // copy instead of waiting on the button's own transient state.
  const mark = page.getByRole("button", { name: "Mark overdue" });
  const before = wallet.sentTxs.length;
  await mark.click();
  await nextTx(page, before, "MARK_OVERDUE");
  await page.waitForTimeout(2000);
  await page.reload();
  await settle(page, 800);
  await connect(page, account);
}

// After Mark overdue: the ENS name is revived (live again) until the revived
// expiry, and the amber box explains the revival — no button (a second call
// would revert NameStillLive).
await page.locator("main span[data-state='Overdue']").waitFor({ timeout: 30_000 });
await settle(page, 600);
await shot(page, "06-14-overdue-after", {
  highlights: [{ selector: "main span[data-state='Overdue']", n: 6 }],
  clipTo: await topCardClip(page),
});
await dropClip(page);
await page.locator("#actions").evaluate((el) => el.scrollIntoView({ block: "center" }));
await settle(page, 500);
await shot(page, "06-15-overdue-actions-after", {
  highlights: [{ selector: "#actions [data-state='overdue']", n: 10 }],
  clipTo: await panelClip(page),
  clipPad: 8,
});
await dropClip(page);
await browser.close();
