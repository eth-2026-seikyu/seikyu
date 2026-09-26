// Chapter 1 — the SME issues an invoice. Creates the invoice every later chapter uses.
import { BASE, settle, shot, describe, openAs, connect, wallet, unionClip, dropClip, nextTx, saveState, loadState } from "./common.mjs";

const DEBTOR = "0xb6359D76E104a9fF007c979d5b18b2804578E72B";
const ACCOUNTANT = "0xe1D7a414963005BdCeecA0da42a50A3FFF7d9aDe";

const { browser, page, account } = await openAs("SME");
// Re-runnable: once the invoice exists, only the detail-page figures are retaken.
const issued = loadState().invoice;
if (!issued) {
await page.goto(`${BASE}/issue`);
await settle(page, 900);
await connect(page, account);
await page.locator("text=/Registers inv-/").waitFor({ timeout: 20_000 });
await settle(page, 600);

const form = page.locator("form");
const debtor = form.locator("label:has-text('Debtor address') input");
const ap = form.locator("label:has-text('Debtor accounts-payable address') input");
const face = form.locator("label:has-text('Face value') input");
const discount = form.locator("label:has-text('Discount %') input");
await debtor.fill(DEBTOR);
await ap.fill(ACCOUNTANT);
await face.fill("1000");
await discount.fill("5");
await form.locator("label:has-text('+7 days') input").check();
await settle(page, 500);
console.log(JSON.stringify(await describe(page, "form"), null, 1));

await shot(page, "01-01-issue-form", {
  highlights: [
    { selector: "form label:has-text('Debtor address (')", n: 1 },
    { selector: "form label:has-text('Debtor accounts-payable address')", n: 2 },
    { selector: "form label:has-text('Face value')", n: 3 },
    { selector: "form label:has-text('Discount %')", n: 4 },
    { selector: "form label:has-text('+7 days')", n: 5 },
    { selector: "form p:has-text('Registers inv-')", n: 6 },
    { selector: "form button[type=submit]", n: 7 },
  ],
  clipTo: await unionClip(page, ["main h1", "form"], { padX: 24, padY: 16 }),
});
await dropClip(page);

const preview = (await form.locator("p:has-text('Registers inv-')").innerText()).match(/inv-\d+\.[\w.]+eth/)?.[0];
console.log("PREVIEW", preview);

const before = wallet.sentTxs.length;
await form.locator("button[type=submit]").click();
await page.getByRole("link", { name: "View transaction →" }).waitFor({ timeout: 60_000 });
await page.getByRole("button", { name: "Confirming…" }).waitFor({ timeout: 30_000 }).catch(() => {});
await shot(page, "01-02-issue-pending", {
  highlights: [
    { selector: "form a:has-text('View transaction')", n: 8 },
    { selector: "form button[type=submit]", n: 9 },
  ],
  clipTo: await unionClip(page, ["form p:has-text('Registers inv-')", "form button[type=submit]"], { padX: 0, padY: 16 }),
});
await dropClip(page);
const createTx = await nextTx(page, before, "CREATE");

await page.waitForURL(/\/invoice\//, { timeout: 120_000 });
saveState({ invoice: decodeURIComponent(new URL(page.url()).pathname.split("/").pop()), createTx, issuer: account.address });
} else {
  await page.goto(`${BASE}/invoice/${issued}`);
  await settle(page, 900);
  await connect(page, account);
}
for (let i = 0; i < 10; i++) {
  if (await page.locator("main h1.font-mono").isVisible().catch(() => false)) break;
  await page.waitForTimeout(3000);
  await page.reload();
}
await settle(page, 1500);
console.log("INVOICE", loadState().invoice);

console.log(JSON.stringify(await describe(page), null, 1));
await shot(page, "01-03-invoice-detail", {
  highlights: [
    { selector: "main h1", n: 1 },
    { selector: "main span[data-state='Open']", n: 2 },
    { selector: "main span[data-state='none']", n: 3 },
    { selector: "main p:has-text('Name live on ENS')", n: 4 },
    { selector: "main section:has(table)", n: 5, pad: 4 },
  ],
  clipTo: await unionClip(page, ["main h1", "main section:has(table)"], { padX: 24, padY: 20, fullWidth: false }),
});
await dropClip(page);

await page.locator("#actions").scrollIntoViewIfNeeded();
await settle(page, 600);
// The Settlement grid's first row (Issuer/Debtor/Face value) overlaps at desktop
// widths — an app layout bug — so the crop starts at the Price row.
await shot(page, "01-04-invoice-settlement", {
  highlights: [
    { selector: "main dl > div:has(dt:text-is('Price'))", n: 6 },
    { selector: "main dl > div:has(dt:text-is('Due date'))", n: 7 },
    { selector: "main dl > div:has(dt:text-is('State'))", n: 8 },
    { selector: "main dl > div:has(dt:text-is('Holder'))", n: 9 },
    { selector: "#actions button:has-text('Verify with World ID')", n: 10 },
    { selector: "#actions button:has-text('Cancel invoice')", n: 11 },
  ],
  clipTo: await unionClip(page, ["main dl > div:has(dt:text-is('Price'))", "#actions"], { padX: 24, padY: 4 }),
  clipPad: 8,
});
await dropClip(page);
await browser.close();
