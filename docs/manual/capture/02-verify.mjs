// Chapter 2 — investor A proves personhood with World ID (staging simulator, Passport).
// Also captures the F1 "cancelled" state used in chapter 6. Captured at 1280 wide:
// below ~1024px IDKit switches to its mobile sheet, which hides "Use the simulator".
import path from "node:path";
import { BASE, settle, shot, openAs, connect, wallet, unionClip, dropClip, markBoxes, saveState, loadState } from "./common.mjs";

const VIEM = path.resolve(import.meta.dirname, "../../../web/node_modules/viem/_esm/index.js");
const { parseAbi, parseEventLogs } = await import(VIEM);

const { invoice } = loadState();
const { browser, context, page, account } = await openAs("INVESTOR_A", { width: 1280, height: 860 });
const verifyResponses = [];
page.on("response", async (r) => {
  if (!r.url().includes("/api/world/verify")) return;
  const body = await r.json().catch(() => ({}));
  verifyResponses.push({ status: r.status(), body });
  console.log("VERIFY_RESPONSE", r.status(), JSON.stringify(body));
});

await page.goto(`${BASE}/invoice/${invoice}`);
await settle(page, 900);
await connect(page, account);
const verifyBtn = page.getByRole("button", { name: "Verify with World ID" });
await verifyBtn.waitFor({ timeout: 30_000 });
await page.locator("#actions").scrollIntoViewIfNeeded();
await settle(page, 500);

await shot(page, "02-01-buy-panel-verify", {
  highlights: [{ selector: '#actions button:has-text("Verify with World ID")', n: 1 }],
  clipTo: await unionClip(page, ["main dl > div:has(dt:text-is('Price'))", "#actions"], { padX: 24, padY: 4 }),
  clipPad: 8,
});
await dropClip(page);

// F1: open the widget, close it, and show the recoverable "cancelled" state.
await verifyBtn.click();
await page.getByText("Connect your World ID").waitFor({ timeout: 20_000 });
await page.waitForTimeout(1200);
await page.getByRole("button", { name: "Close" }).first().click();
await page.locator('#actions [data-state="cancelled"]').waitFor({ timeout: 10_000 });
await settle(page, 600);
await shot(page, "06-01-verify-cancelled", {
  highlights: [{ selector: '#actions [data-state="cancelled"] button:has-text("Retry")', n: 1 }],
  clipTo: "#actions",
});

// The simulator ships five shared test identities; the default (#4) is already
// bound to another wallet on this app, so investor A uses Identity #1.
const SIM_IDENTITY = process.env.SIM_IDENTITY ?? "Identity #1";
{
  const setup = await context.newPage();
  await setup.goto("https://simulator.worldcoin.org/");
  await setup.getByRole("button", { name: "Settings" }).click();
  const switchBtn = setup.getByRole("button", { name: /Switch test identity/ });
  await switchBtn.waitFor({ timeout: 20_000 });
  await setup.waitForTimeout(1200);
  await markBoxes(setup, [{ locator: switchBtn, n: 2 }]);
  await shot(setup, "06-02-sim-settings", {
    clipTo: await unionClip(setup, [setup.getByText("9:41"), setup.getByRole("button", { name: "Reset simulator" })], { padX: 60, padY: 60 }),
  });
  await dropClip(setup);
  await switchBtn.click();
  const row = setup.getByRole("button", { name: new RegExp(`^${SIM_IDENTITY}`) });
  await row.waitFor({ timeout: 20_000 });
  await setup.waitForTimeout(1200);
  await markBoxes(setup, [{ locator: row, n: 3 }]);
  await shot(setup, "06-03-sim-identities", {
    clipTo: await unionClip(setup, [setup.getByText("9:41"), setup.getByRole("button", { name: /^Identity #0/ })], { padX: 60, padY: 60 }),
  });
  await dropClip(setup);
  await row.click();
  await setup.waitForURL(/\/id\/0x/, { timeout: 20_000 });
  console.log("SIM_IDENTITY", SIM_IDENTITY, setup.url());
  await setup.close();
}

await page.bringToFront();
await page.getByRole("button", { name: "Retry" }).click();
const title = page.getByText("Connect your World ID");
await title.waitFor({ timeout: 20_000 });
const simLink = page.getByText("Use the simulator");
await simLink.waitFor({ timeout: 20_000 });
await page.waitForTimeout(1500);
await markBoxes(page, [{ locator: simLink, n: 2 }]);
await shot(page, "02-02-idkit-modal", {
  clipTo: await unionClip(page, [title, page.getByText("Terms & Privacy"), simLink], { padX: 150, padY: 110 }),
});
await dropClip(page);

const [sim] = await Promise.all([context.waitForEvent("page"), simLink.click()]);
await sim.setViewportSize({ width: 1280, height: 860 });
await sim.waitForLoadState("domcontentloaded");
const passportChip = sim.getByRole("button", { name: "Passport", exact: true });
const continueBtn = sim.getByRole("button", { name: "Continue" });
await continueBtn.waitFor({ timeout: 60_000 });
await sim.waitForTimeout(2500);
console.log("SIMULATOR", sim.url());
await markBoxes(sim, [
  { locator: passportChip, n: 3 },
  { locator: continueBtn, n: 4 },
]);
await shot(sim, "02-03-simulator-passport", {
  clipTo: await unionClip(sim, ["text=World ID Simulator", sim.locator("button:has-text(\"World ID 4.0\")"), sim.getByText("9:41")], { padX: 60, padY: 50 }),
});
await dropClip(sim);

const responseP = page.waitForResponse((r) => r.url().includes("/api/world/verify"), { timeout: 180_000 });
await continueBtn.click();
await sim.waitForTimeout(4000);
await sim.screenshot({ path: path.join(process.env.MANUAL_OUT, "screenshots", "survey-sim-after.png") });
const response = await responseP;
await page.bringToFront();
await page.waitForTimeout(2500);
await page.screenshot({ path: path.join(process.env.MANUAL_OUT, "screenshots", "survey-app-after.png") });
const body = await response.json().catch(() => ({}));
console.log("VERIFY", response.status(), JSON.stringify(body));

if (response.status() !== 200) {
  // Close IDKit's own error sheet so the app's message is photographed un-dimmed.
  await page.waitForTimeout(3000);
  await page.getByRole("button", { name: "Close" }).first().click().catch(() => {});
  await page.waitForTimeout(1500);
  await shot(page, "02-99-verify-error", {
    highlights: [{ selector: "#actions [data-state] p.text-red-600, #actions [data-state] p", n: 1 }],
    clipTo: "#actions",
  });
  saveState({ verifyError: { status: response.status(), body } });
  await browser.close();
  process.exit(2);
}

const verifyTx = body.txHash;
const receipt = await wallet.waitReceipt(verifyTx);
const [ev] = parseEventLogs({
  abi: parseAbi(["event InvestorVerified(address indexed investor, bytes32 nullifier)"]),
  logs: receipt.logs,
});
console.log("VERIFY_TX", verifyTx, "NULLIFIER", ev?.args?.nullifier);
saveState({ verifyTx, nullifierA: ev?.args?.nullifier ?? null, simulatorUrl: sim.url() });

// IDKit shows its own success screen; the app's state flips once it closes.
const verified = page.locator('#actions [data-state="verified"]');
const approve = page.getByRole("button", { name: "Approve mUSDC" });
await Promise.race([verified.waitFor({ timeout: 60_000 }), approve.waitFor({ timeout: 60_000 })]).catch(() => {});
if (await page.getByText("Connect your World ID").isVisible().catch(() => false)) {
  await page.screenshot({ path: path.join(process.env.MANUAL_OUT, "screenshots", "survey-app-modal.png") });
}
if (await verified.isVisible().catch(() => false)) {
  await shot(page, "02-04-verified", {
    highlights: [{ selector: '#actions [data-state="verified"] p', n: 5 }],
    clipTo: "#actions",
  });
}
await approve.waitFor({ timeout: 90_000 });
await settle(page, 800);
await shot(page, "02-05-verified-approve", {
  highlights: [{ selector: '#actions button:has-text("Approve mUSDC")', n: 5 }],
  clipTo: "#actions",
});
await browser.close();
