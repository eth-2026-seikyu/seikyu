// Re-shoots the figures whose copy changed after capture (credential-aware buy panel,
// Settlement grid fix). Investor A is verified by now, so the unverified panel is shown
// by investor A2 on a still-unsold invoice; the issuer view uses the SME on the same one.
import { BASE, settle, shot, openAs, connect, unionClip, dropClip } from "./common.mjs";

const OPEN_INVOICE = process.env.OPEN_INVOICE ?? "inv-1.seikyu.eth";
const panelClip = (page) =>
  unionClip(page, ["main dl > div:has(dt:text-is('Price'))", "#actions"], { padX: 24, padY: 4 });

{
  const { browser, page, account } = await openAs("INVESTOR_A2", { width: 1280, height: 860 });
  await page.goto(`${BASE}/invoice/${OPEN_INVOICE}`);
  await settle(page, 900);
  await connect(page, account);
  const verifyBtn = page.getByRole("button", { name: "Verify with World ID" });
  await verifyBtn.waitFor({ timeout: 30_000 });
  await page.locator("#actions").scrollIntoViewIfNeeded();
  await settle(page, 500);
  console.log("PANEL", await page.locator("#actions").innerText());
  await shot(page, "02-01-buy-panel-verify", {
    highlights: [{ selector: '#actions button:has-text("Verify with World ID")', n: 1 }],
    clipTo: await panelClip(page),
    clipPad: 8,
  });
  await dropClip(page);

  await verifyBtn.click();
  await page.getByText("Connect your World ID").waitFor({ timeout: 20_000 });
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: "Close" }).first().click();
  await page.locator('#actions [data-state="cancelled"]').waitFor({ timeout: 10_000 });
  await page.locator("#actions").evaluate((el) => el.scrollIntoView({ block: "center" }));
  await settle(page, 600);
  await shot(page, "06-01-verify-cancelled", {
    highlights: [{ selector: '#actions [data-state="cancelled"] button:has-text("Retry")', n: 1 }],
    clipTo: "#actions",
  });
  await browser.close();
}

{
  const { browser, page, account } = await openAs("SME", { height: 1100 });
  await page.goto(`${BASE}/invoice/${OPEN_INVOICE}`);
  await settle(page, 900);
  await connect(page, account);
  await page.getByRole("button", { name: "Cancel invoice" }).waitFor({ timeout: 30_000 });
  await page.locator("#actions").evaluate((el) => el.scrollIntoView({ block: "center" }));
  await settle(page, 600);
  await shot(page, "01-04-invoice-settlement", {
    highlights: [
      { selector: "main dl > div:has(dt:text-is('Price'))", n: 6 },
      { selector: "main dl > div:has(dt:text-is('Due date'))", n: 7 },
      { selector: "main dl > div:has(dt:text-is('State'))", n: 8 },
      { selector: "main dl > div:has(dt:text-is('Holder'))", n: 9 },
      { selector: "#actions button:has-text('Verify with World ID')", n: 10 },
      { selector: "#actions button:has-text('Cancel invoice')", n: 11 },
    ],
    clipTo: await panelClip(page),
    clipPad: 8,
  });
  await dropClip(page);
  await browser.close();
}
