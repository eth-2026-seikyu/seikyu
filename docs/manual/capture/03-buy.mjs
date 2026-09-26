// Chapter 3 — the verified investor approves mUSDC and buys the receivable.
import { BASE, settle, shot, openAs, connect, wallet, panelClip, topCardClip, dropClip, nextTx, saveState, loadState } from "./common.mjs";

const { invoice } = loadState();
const { browser, page, account } = await openAs("INVESTOR_A");
await page.goto(`${BASE}/invoice/${invoice}`);
await settle(page, 900);
await connect(page, account);

if (!loadState().buyTx) {
  const approve = page.getByRole("button", { name: "Approve mUSDC" });
  await approve.waitFor({ timeout: 60_000 });
  await page.locator("#actions").scrollIntoViewIfNeeded();
  await settle(page, 600);
  await shot(page, "03-01-approve", {
    highlights: [
      { selector: "#actions p:has-text('Sale price')", n: 1 },
      { selector: '#actions button:has-text("Approve mUSDC")', n: 2 },
    ],
    clipTo: await panelClip(page),
    clipPad: 8,
  });
  await dropClip(page);
  let before = wallet.sentTxs.length;
  await approve.click();
  const approveTx = await nextTx(page, before, "APPROVE_BUY");
  const buy = page.getByRole("button", { name: /^Buy for/ });
  await buy.waitFor({ timeout: 60_000 });
  await settle(page, 600);
  await shot(page, "03-02-buy", {
    highlights: [{ selector: '#actions button:has-text("Buy for")', n: 3 }],
    clipTo: await panelClip(page),
    clipPad: 8,
  });
  await dropClip(page);
  before = wallet.sentTxs.length;
  await buy.click();
  const buyTx = await nextTx(page, before, "BUY");
  saveState({ approveBuyTx: approveTx, buyTx });
}

for (let i = 0; i < 10; i++) {
  await page.waitForTimeout(2500);
  await page.reload();
  await settle(page, 800);
  if (await page.locator("main span[data-state='Funded']").isVisible().catch(() => false)) break;
}
// Plain-language redesign (L5): the settlement badge and the "Current owner"
// row both live in the top Card's `dl` now — no more separate ENS
// `tr[data-record='status']` highlight needed for this (the collapsed
// Technical details already got its own dedicated figure in chapter 1).
await shot(page, "03-03-funded", {
  highlights: [{ selector: "main span[data-state='Funded']", n: 4 }],
  clipTo: await topCardClip(page),
});
await dropClip(page);
await shot(page, "03-04-holder", {
  highlights: [{ selector: "main dl > div:has(dt:text-is('Current owner'))", n: 5 }],
  clipTo: await topCardClip(page),
});
await dropClip(page);
await browser.close();
