// Chapter 6 (and the pending-state figure of chapter 1): a second invoice that the
// debtor's accountant disputes, which blocks buying, and which the issuer then cancels.
// Also photographs inv-2 (issued with the "+10 minutes" preset, never sold) after expiry.
import { BASE, settle, shot, openAs, connect, wallet, unionClip, dropClip, nextTx, saveState, loadState } from "./common.mjs";

const DEBTOR = "0xb6359D76E104a9fF007c979d5b18b2804578E72B";
const ACCOUNTANT = "0xe1D7a414963005BdCeecA0da42a50A3FFF7d9aDe";
const EXPIRED = "inv-2.seikyu.eth";

// A. SME issues the second invoice — this run also supplies figure 01-02 (pending).
if (!loadState().invoice2) {
  const { browser, page, account } = await openAs("SME");
  await page.goto(`${BASE}/issue`);
  await settle(page, 900);
  await connect(page, account);
  await page.locator("text=/Registers inv-/").waitFor({ timeout: 20_000 });
  const form = page.locator("form");
  await form.locator("label:has-text('Debtor address') input").fill(DEBTOR);
  await form.locator("label:has-text('Debtor accounts-payable address') input").fill(ACCOUNTANT);
  await form.locator("label:has-text('Face value') input").fill("500");
  await form.locator("label:has-text('Discount %') input").fill("4");
  await form.locator("label:has-text('+7 days') input").check();
  const before = wallet.sentTxs.length;
  await form.locator("button[type=submit]").click();
  await page.getByRole("link", { name: "View transaction →" }).waitFor({ timeout: 60_000 });
  await page.getByRole("button", { name: "Confirming…" }).waitFor({ timeout: 30_000 }).catch(() => {});
  await shot(page, "01-02-issue-pending", {
    highlights: [
      { selector: "form a:has-text('View transaction')", n: 8 },
      { selector: "form button[type=submit]", n: 9 },
    ],
    clipTo: await unionClip(page, ["form fieldset", "form button[type=submit]"], { padX: 16, padY: 16 }),
  });
  await dropClip(page);
  const createTx2 = await nextTx(page, before, "CREATE2");
  await page.waitForURL(/\/invoice\//, { timeout: 120_000 });
  saveState({ invoice2: decodeURIComponent(new URL(page.url()).pathname.split("/").pop()), createTx2 });
  await browser.close();
}
const { invoice2 } = loadState();
console.log("INVOICE2", invoice2);

// B. The debtor's accountant disputes it.
if (!loadState().disputeTx) {
  const { browser, page, account } = await openAs("DEBTOR_AP");
  await page.goto(`${BASE}/accountant?name=${invoice2}`);
  await settle(page, 900);
  await connect(page, account);
  const dispute = page.getByRole("button", { name: "Dispute" });
  await dispute.waitFor({ timeout: 30_000 });
  await page.waitForFunction(() => !document.querySelector("tr[data-record='amount'] td:last-child")?.textContent?.includes("…"));
  const before = wallet.sentTxs.length;
  await dispute.click();
  const disputeTx = await nextTx(page, before, "DISPUTE");
  await page.getByText("ack updated.").waitFor({ timeout: 60_000 });
  await page.locator("section span[data-state='disputed']").waitFor({ timeout: 30_000 });
  await settle(page, 800);
  await shot(page, "04-05-disputed", {
    highlights: [
      { selector: "section span[data-state='disputed']", n: 1 },
      { selector: "tr[data-record='ack']", n: 2, pad: 2 },
      { selector: "section[data-state='confirmed'] p:has-text('ack updated.')", n: 3 },
    ],
    clipTo: await unionClip(page, ["main h2:has-text('ENS records')", "section[data-state='confirmed']"], { padX: 24, padY: 16 }),
  });
  await dropClip(page);
  saveState({ disputeTx });
  await browser.close();
}

// C. An investor looking at the disputed invoice cannot buy it (only while it is still listed).
if (!loadState().cancelTx) {
  const { browser, page, account } = await openAs("INVESTOR_A2");
  await page.goto(`${BASE}/invoice/${invoice2}`);
  await settle(page, 900);
  await connect(page, account);
  await page.locator("#actions [data-state='ack-blocked']").waitFor({ timeout: 30_000 });
  await settle(page, 600);
  await shot(page, "06-04-ack-blocked", {
    highlights: [
      { selector: "main span[data-state='disputed']", n: 1 },
      { selector: "#actions [data-state='ack-blocked']", n: 2 },
    ],
    clipTo: await unionClip(page, ["main h1", "main span[data-state='disputed']", "main p:has-text('Name live on ENS')"], { padX: 24, padY: 16 }),
  });
  await dropClip(page);
  await page.locator("#actions").scrollIntoViewIfNeeded();
  await shot(page, "06-05-ack-blocked-panel", {
    highlights: [{ selector: "#actions [data-state='ack-blocked'] p", n: 2 }],
    clipTo: await unionClip(page, ["main dl > div:has(dt:text-is('Price'))", "#actions"], { padX: 24, padY: 4 }),
    clipPad: 8,
  });
  await dropClip(page);
  await browser.close();
}

// D. The issuer cancels the unsold invoice.
if (!loadState().cancelTx) {
  const { browser, page, account } = await openAs("SME");
  await page.goto(`${BASE}/invoice/${invoice2}`);
  await settle(page, 900);
  await connect(page, account);
  const cancel = page.getByRole("button", { name: "Cancel invoice" });
  await cancel.waitFor({ timeout: 30_000 });
  await page.locator("#actions").scrollIntoViewIfNeeded();
  await settle(page, 500);
  await shot(page, "06-06-cancel-button", {
    highlights: [{ selector: '#actions button:has-text("Cancel invoice")', n: 1 }],
    clipTo: await unionClip(page, ["main dl > div:has(dt:text-is('Price'))", "#actions"], { padX: 24, padY: 4 }),
    clipPad: 8,
  });
  await dropClip(page);
  const before = wallet.sentTxs.length;
  await cancel.click();
  const cancelTx = await nextTx(page, before, "CANCEL");
  saveState({ cancelTx });
  await browser.close();
}
{
  const { browser, page, account } = await openAs("SME");
  await page.goto(`${BASE}/invoice/${invoice2}`);
  await connect(page, account);
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(3000);
    await page.reload();
    await settle(page, 800);
    if (await page.locator("main span[data-state='Cancelled']").isVisible().catch(() => false)) break;
  }
  await shot(page, "06-07-cancelled", {
    highlights: [
      { selector: "main span[data-state='Cancelled']", n: 2 },
      { selector: "main p:has-text('Name live on ENS')", n: 3 },
    ],
    clipTo: await unionClip(page, ["main h1", "main p:has-text('Name live on ENS')"], { padX: 24, padY: 16 }),
  });
  await dropClip(page);
  await page.locator("#actions").scrollIntoViewIfNeeded();
  await shot(page, "06-08-cancelled-actions", {
    clipTo: await unionClip(page, ["main dl > div:has(dt:text-is('Price'))", "#actions"], { padX: 24, padY: 4 }),
    clipPad: 8,
  });
  await dropClip(page);
  await browser.close();
}

// E. An invoice that reached its due date unsold.
{
  const { browser, page } = await openAs("INVESTOR_A2");
  await page.goto(`${BASE}/invoice/${EXPIRED}`);
  await settle(page, 1200);
  await shot(page, "06-09-expired-unsold", {
    highlights: [
      { selector: "main span[data-state='Expired-unsold']", n: 1 },
      { selector: "main p:has-text('Name live on ENS')", n: 2 },
      { selector: "main tr[data-record='status']", n: 3, pad: 2 },
    ],
    clipTo: await unionClip(page, ["main h1", "main section:has(table)"], { padX: 24, padY: 16 }),
  });
  await dropClip(page);
  await page.locator("#actions").scrollIntoViewIfNeeded();
  await shot(page, "06-10-expired-unsold-actions", {
    highlights: [{ selector: "#actions [data-state='expired-unsold']", n: 4 }],
    clipTo: await unionClip(page, ["main dl > div:has(dt:text-is('Price'))", "#actions"], { padX: 24, padY: 4 }),
    clipPad: 8,
  });
  await dropClip(page);
  await browser.close();
}
