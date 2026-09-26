// Chapter 6.4 — the same person (simulator Identity #1, already bound to investor A)
// tries to verify a second wallet: the server answers 409.
//
// Investor A2 is now also verified on-chain from earlier capture runs (it
// successfully bound its own identity at some point after the original F3
// capture), so it can no longer demonstrate the "not yet verified" collision
// either — this uses the debtor's wallet as a stand-in second wallet for the
// same re-shoot reason documented in 02-verify.mjs.
import { BASE, settle, shot, openAs, connect, saveState, loadState } from "./common.mjs";

const OPEN_INVOICE = process.env.F3_INVOICE ?? loadState().invoice ?? "inv-1.seikyu.eth";
const F3_ROLE = process.env.F3_ROLE ?? "DEBTOR";
const { browser, context, page, account } = await openAs(F3_ROLE, { width: 1280, height: 860 });
const setup = await context.newPage();
await setup.goto("https://simulator.worldcoin.org/");
await setup.getByRole("button", { name: "Settings" }).click();
await setup.getByRole("button", { name: /Switch test identity/ }).click();
await setup.getByRole("button", { name: /^Identity #1/ }).click();
await setup.waitForURL(/\/id\/0x14a219b1/, { timeout: 20_000 });
await setup.close();

await page.goto(`${BASE}/invoice/${OPEN_INVOICE}`);
await settle(page, 900);
await connect(page, account);
await page.getByRole("button", { name: "Verify with World ID" }).click();
const simLink = page.getByText("Use the simulator");
await simLink.waitFor({ timeout: 30_000 });
const [sim] = await Promise.all([context.waitForEvent("page"), simLink.click()]);
const cont = sim.getByRole("button", { name: "Continue" });
await cont.waitFor({ timeout: 60_000 });
await sim.locator('button:has-text("Legacy v3 proof")').click();
await sim.waitForTimeout(800);
const resp = page.waitForResponse((r) => r.url().includes("/api/world/verify"), { timeout: 180_000 });
await cont.click();
const r = await resp;
const body = await r.json().catch(() => ({}));
console.log("F3", r.status(), JSON.stringify(body));
saveState({ f3: { wallet: account.address, status: r.status(), body } });
await page.bringToFront();
await page.waitForTimeout(3000);
await page.getByRole("button", { name: "Close" }).first().click().catch(() => {});
await page.locator("#actions [data-state='nullifier-used']").waitFor({ timeout: 20_000 });
await page.locator("#actions").evaluate((el) => el.scrollIntoView({ block: "center" }));
await settle(page, 600);
await shot(page, "06-11-nullifier-used", {
  highlights: [
    { selector: "#actions [data-state='nullifier-used'] p", n: 1 },
    { selector: "#actions [data-state='nullifier-used'] button:has-text('Retry')", n: 2 },
  ],
  clipTo: "#actions",
});
await browser.close();
