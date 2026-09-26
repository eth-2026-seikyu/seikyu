// Chapter 1 — the SME issues an invoice. Creates the invoice every later chapter uses.
import {
  BASE,
  settle,
  shot,
  describe,
  openAs,
  connect,
  wallet,
  unionClip,
  dropClip,
  nextTx,
  saveState,
  loadState,
  openTechDetails,
  topCardClip,
  panelClip,
} from "./common.mjs";

const DEBTOR = "0xb6359D76E104a9fF007c979d5b18b2804578E72B";
const ACCOUNTANT = "0xe1D7a414963005BdCeecA0da42a50A3FFF7d9aDe";

// Tall viewport: the opened Technical details disclosure (8-row table +
// link + resolver) is taller than the default 780px and a non-fullPage clip
// can't capture content below the fold.
const { browser, page, account } = await openAs("SME", { height: 1500 });
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
// Plain-language redesign (L5): the page's top Card carries the Status/
// Debtor's-response badges plus a single settlement `dl` (Amount owed /
// Sale price / Due / Supplier / Debtor company / Current owner) — the old
// separate "Price/Due date/State/Holder" grid and the always-visible ENS
// records table are gone from this view (the latter is now inside a closed
// `[data-testid=tech-details]`, captured separately below).
await shot(page, "01-03-invoice-detail", {
  highlights: [
    { selector: "main h1", n: 1 },
    { selector: "main span[data-state='Open']", n: 2 },
    { selector: "main span[data-state='none']", n: 3 },
    { selector: "main dl > div:has(dt:text-is('Amount owed'))", n: 4 },
    { selector: "main dl > div:has(dt:text-is('Sale price'))", n: 5 },
  ],
  clipTo: await topCardClip(page),
});
await dropClip(page);

// New key screen (L7): the Technical details disclosure, closed by default,
// then opened to show the 8-row ENS records table, the ENS-app link, and the
// resolver link (plan AC-U4) — this is where the old "Name live on ENS" line
// and records table moved to.
await page.locator("[data-testid=tech-details]").scrollIntoViewIfNeeded();
await settle(page, 400);
await shot(page, "01-05-tech-details-closed", {
  highlights: [{ selector: "[data-testid=tech-details] summary", n: 1 }],
  clipTo: "[data-testid=tech-details]",
  clipPad: 28,
});
await openTechDetails(page);
await page.locator("[data-testid=tech-details]").scrollIntoViewIfNeeded();
await settle(page, 400);
await shot(page, "01-06-tech-details-open", {
  highlights: [
    { selector: "[data-testid=tech-details] a:has-text('View on ENS app')", n: 1 },
    { selector: "[data-testid=tech-details] p:has-text('Name live on ENS')", n: 2 },
    { selector: "[data-testid=tech-details] table", n: 3, pad: 4 },
  ],
  clipTo: "[data-testid=tech-details]",
  clipPad: 28,
});
await dropClip(page);

await page.locator("#actions").scrollIntoViewIfNeeded();
await settle(page, 600);
await shot(page, "01-04-invoice-settlement", {
  highlights: [
    { selector: "[data-testid=role-banner]", n: 6 },
    { selector: "#actions button:has-text('Verify with World ID')", n: 10 },
    { selector: "#actions button:has-text('Cancel invoice')", n: 11 },
  ],
  clipTo: await panelClip(page),
  clipPad: 8,
});
await dropClip(page);
await browser.close();
