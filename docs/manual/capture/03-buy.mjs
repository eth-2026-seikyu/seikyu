// Chapter 3 — the verified investor approves mUSDC and buys the receivable.
import { BASE, settle, shot, openAs, connect, wallet, unionClip, dropClip, nextTx, saveState, loadState } from "./common.mjs";

const { invoice } = loadState();
const { browser, page, account } = await openAs("INVESTOR_A");
await page.goto(`${BASE}/invoice/${invoice}`);
await settle(page, 900);
await connect(page, account);
const panelClip = () => unionClip(page, ["main dl > div:has(dt:text-is('Price'))", "#actions"], { padX: 24, padY: 4 });

if (!loadState().buyTx) {
  const approve = page.getByRole("button", { name: "Approve mUSDC" });
  await approve.waitFor({ timeout: 60_000 });
  await page.locator("#actions").scrollIntoViewIfNeeded();
  await settle(page, 600);
  await shot(page, "03-01-approve", {
    highlights: [
      { selector: "#actions p:has-text('Price')", n: 1 },
      { selector: '#actions button:has-text("Approve mUSDC")', n: 2 },
    ],
    clipTo: await panelClip(),
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
    clipTo: await panelClip(),
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
await shot(page, "03-03-funded", {
  highlights: [
    { selector: "main span[data-state='Funded']", n: 4 },
    { selector: "main tr[data-record='status']", n: 5, pad: 2 },
  ],
  clipTo: await unionClip(page, ["main h1", "main section:has(table)"], { padX: 24, padY: 16 }),
});
await dropClip(page);
await page.locator("#actions").scrollIntoViewIfNeeded();
await settle(page, 500);
await shot(page, "03-04-holder", {
  highlights: [
    { selector: "main dl > div:has(dt:text-is('State'))", n: 6 },
    { selector: "main dl > div:has(dt:text-is('Holder'))", n: 7 },
  ],
  clipTo: await panelClip(),
  clipPad: 8,
});
await dropClip(page);
await browser.close();
