// Chapter 5 — the debtor pays face value; the token burns and the ENS name is unregistered.
import { BASE, settle, shot, openAs, connect, wallet, unionClip, dropClip, nextTx, saveState, loadState } from "./common.mjs";

const { invoice } = loadState();
const { browser, page, account } = await openAs("DEBTOR");
await page.goto(`${BASE}/invoice/${invoice}`);
await settle(page, 900);
await connect(page, account);
const panelClip = () => unionClip(page, ["main dl > div:has(dt:text-is('Price'))", "#actions"], { padX: 24, padY: 4 });

if (!loadState().settleTx) {
  const approve = page.getByRole("button", { name: "Approve mUSDC" });
  await approve.waitFor({ timeout: 60_000 });
  await page.locator("#actions").scrollIntoViewIfNeeded();
  await settle(page, 600);
  await shot(page, "05-01-approve", {
    highlights: [
      { selector: "#actions p:has-text('Face value')", n: 1 },
      { selector: '#actions button:has-text("Approve mUSDC")', n: 2 },
    ],
    clipTo: await panelClip(),
    clipPad: 8,
  });
  await dropClip(page);
  let before = wallet.sentTxs.length;
  await approve.click();
  const approveTx = await nextTx(page, before, "APPROVE_SETTLE");
  const pay = page.getByRole("button", { name: /^Settle \(pay/ });
  await pay.waitFor({ timeout: 60_000 });
  await settle(page, 600);
  await shot(page, "05-02-settle", {
    highlights: [{ selector: '#actions button:has-text("Settle (pay")', n: 3 }],
    clipTo: await panelClip(),
    clipPad: 8,
  });
  await dropClip(page);
  before = wallet.sentTxs.length;
  await pay.click();
  const settleTx = await nextTx(page, before, "SETTLE");
  saveState({ approveSettleTx: approveTx, settleTx });
}

for (let i = 0; i < 10; i++) {
  await page.waitForTimeout(2500);
  await page.reload();
  await settle(page, 800);
  if (await page.locator("main span[data-state='Paid']").isVisible().catch(() => false)) break;
}
await shot(page, "05-03-paid", {
  highlights: [
    { selector: "main span[data-state='Paid']", n: 4 },
    { selector: "main p:has-text('Name live on ENS')", n: 5 },
    { selector: "main tr[data-record='status']", n: 6, pad: 2 },
  ],
  clipTo: await unionClip(page, ["main h1", "main section:has(table)"], { padX: 24, padY: 16 }),
});
await dropClip(page);
await page.locator("#actions").scrollIntoViewIfNeeded();
await settle(page, 500);
await shot(page, "05-04-paid-actions", {
  highlights: [
    { selector: "main dl > div:has(dt:text-is('State'))", n: 7 },
    { selector: "#actions p", n: 8 },
  ],
  clipTo: await panelClip(),
  clipPad: 8,
});
await dropClip(page);
await browser.close();
