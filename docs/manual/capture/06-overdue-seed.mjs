// Chapter 6.6 setup — seeds a short-tenor invoice and buys it immediately, so
// its due date passes on its own (no tx needed) while later chapters run.
// Run this FIRST, then do the rest of the capture pass, then run
// `06-overdue.mjs` once its due date has actually elapsed (it polls a little
// itself, but the point of seeding early is to spend that wait doing other
// chapters' work instead of sitting idle). Re-runnable: a no-op once
// `run-state.json` already has an `overdueInvoice`.
import { BASE, settle, openAs, connect, wallet, nextTx, saveState, loadState } from "./common.mjs";

if (loadState().overdueInvoice) {
  console.log("Already seeded:", loadState().overdueInvoice, "due at", loadState().overdueDueAt);
  process.exit(0);
}

const DEBTOR = "0xb6359D76E104a9fF007c979d5b18b2804578E72B";
const ACCOUNTANT = "0xe1D7a414963005BdCeecA0da42a50A3FFF7d9aDe";

// A. SME issues an invoice with the "+10 minutes (quick demo)" preset.
const issuer = await openAs("SME");
await issuer.page.goto(`${BASE}/issue`);
await settle(issuer.page, 900);
await connect(issuer.page, issuer.account);
await issuer.page.locator("text=/Registers inv-/").waitFor({ timeout: 20_000 });
const form = issuer.page.locator("form");
await form.locator("label:has-text('Debtor address') input").fill(DEBTOR);
await form.locator("label:has-text('Debtor accounts-payable address') input").fill(ACCOUNTANT);
await form.locator("label:has-text('Face value') input").fill("300");
await form.locator("label:has-text('Discount %') input").fill("5");
await form.locator("label:has-text('+10 minutes') input").check();
const beforeCreate = wallet.sentTxs.length;
await form.locator("button[type=submit]").click();
await issuer.page.getByRole("link", { name: "View transaction →" }).waitFor({ timeout: 60_000 });
const createTx = await nextTx(issuer.page, beforeCreate, "OVERDUE_CREATE");
await issuer.page.waitForURL(/\/invoice\//, { timeout: 120_000 });
const name = decodeURIComponent(new URL(issuer.page.url()).pathname.split("/").pop());
const dueAt = Math.floor(Date.now() / 1000) + 10 * 60;
await issuer.browser.close();

// B. Investor A (already verified from earlier capture runs) buys it right away.
const investor = await openAs("INVESTOR_A");
await investor.page.goto(`${BASE}/invoice/${name}`);
await settle(investor.page, 900);
await connect(investor.page, investor.account);
const approve = investor.page.getByRole("button", { name: "Approve mUSDC" });
await approve.waitFor({ timeout: 60_000 });
let before = wallet.sentTxs.length;
await approve.click();
const approveTx = await nextTx(investor.page, before, "OVERDUE_APPROVE_BUY");
const buy = investor.page.getByRole("button", { name: /^Buy for/ });
await buy.waitFor({ timeout: 60_000 });
before = wallet.sentTxs.length;
await buy.click();
const buyTx = await nextTx(investor.page, before, "OVERDUE_BUY");
await investor.browser.close();

saveState({ overdueInvoice: name, overdueDueAt: dueAt, overdueCreateTx: createTx, overdueApproveBuyTx: approveTx, overdueBuyTx: buyTx });
console.log(
  `Seeded ${name}, Funded, due at ${new Date(dueAt * 1000).toISOString()} ` +
    `(${Math.round((dueAt - Date.now() / 1000) / 60)} min from now). ` +
    "Run other chapters, then run 06-overdue.mjs once that time has passed.",
);
