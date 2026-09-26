// Chapter 5 — the debtor pays face value; the token burns and the ENS name is unregistered.
import { BASE, settle, shot, openAs, connect, wallet, panelClip, topCardClip, dropClip, nextTx, saveState, loadState } from "./common.mjs";

const { invoice } = loadState();
const { browser, page, account } = await openAs("DEBTOR");
await page.goto(`${BASE}/invoice/${invoice}`);
await settle(page, 900);
await connect(page, account);

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
    clipTo: await panelClip(page),
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
    clipTo: await panelClip(page),
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
// Plain-language redesign (L5): Paid status now reads straight off the top
// Card's badge; the ENS-liveness/records detail lives behind the (already
// separately captured) collapsed Technical details disclosure.
await shot(page, "05-03-paid", {
  highlights: [{ selector: "main span[data-state='Paid']", n: 4 }],
  clipTo: await topCardClip(page),
});
await dropClip(page);
await page.locator("#actions").scrollIntoViewIfNeeded();
await settle(page, 500);
// InvoiceActions' Paid-state `Explanation` card (L6) renders its text as a
// plain child, not inside a `<p>`, so the whole actions box is the target.
await shot(page, "05-04-paid-actions", {
  highlights: [{ selector: "#actions", n: 7 }],
  clipTo: await panelClip(page),
  clipPad: 8,
});
await dropClip(page);
await browser.close();
