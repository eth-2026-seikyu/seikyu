// Chapter 4 — the debtor's accounts-payable wallet acknowledges the invoice and
// shows that every other record is out of reach (ENSv2 Enhanced Access Control).
import { BASE, settle, shot, describe, openAs, connect, wallet, unionClip, dropClip, nextTx, saveState, loadState } from "./common.mjs";

const { invoice } = loadState();
const { browser, page, account } = await openAs("DEBTOR_AP", { height: 1200 });
await page.goto(`${BASE}/accountant?name=${invoice}`);
await settle(page, 900);
await connect(page, account);
await page.getByRole("button", { name: "Acknowledge" }).waitFor({ timeout: 30_000 });
await page.waitForFunction(() => !document.querySelector("tr[data-record='amount'] td:last-child")?.textContent?.includes("…"));
await settle(page, 800);
console.log(JSON.stringify(await describe(page), null, 1));

await shot(page, "04-01-accountant", {
  highlights: [
    { selector: "main p:has-text('Connected wallet')", n: 1 },
    { selector: "main label:has-text('Invoice name')", n: 2 },
    { selector: "tr[data-record='ack']", n: 3, pad: 2 },
    { selector: "main button:text-is('Acknowledge')", n: 4 },
    { selector: "main button:text-is('Dispute')", n: 5 },
    { selector: "main button:text-is('Clear')", n: 6 },
  ],
  clipTo: await unionClip(page, ["main h1", "section[data-state] >> nth=0"], { padX: 24, padY: 16 }),
});
await dropClip(page);

const eac = page.locator("section:has(h2:has-text('EAC negative demo'))");
await shot(page, "04-02-eac-buttons", {
  highlights: [
    { selector: "main button:has-text('Try to edit amount')", n: 7 },
    { selector: "main button:has-text('Try to edit status')", n: 8 },
  ],
  clipTo: await unionClip(page, [eac], { padX: 24, padY: 16 }),
});
await dropClip(page);

await page.getByRole("button", { name: "Try to edit amount" }).click();
const denied = page.locator("[data-state='eac-denied']");
await denied.first().waitFor({ timeout: 30_000 });
await settle(page, 500);
console.log("EAC", await denied.first().innerText());
await shot(page, "04-03-eac-denied", {
  highlights: [{ selector: "[data-state='eac-denied']", n: 9 }],
  clipTo: await unionClip(page, [eac], { padX: 24, padY: 16 }),
});
await dropClip(page);

if (!loadState().ackTx) {
  const before = wallet.sentTxs.length;
  await page.getByRole("button", { name: "Acknowledge" }).click();
  const ackTx = await nextTx(page, before, "ACK");
  saveState({ ackTx });
  await page.getByText("ack updated.").waitFor({ timeout: 60_000 });
} else {
  await page.reload();
  await settle(page, 1500);
}
await page.locator("section span[data-state='acknowledged']").waitFor({ timeout: 60_000 });
await settle(page, 800);
await shot(page, "04-04-acknowledged", {
  highlights: [
    { selector: "section span[data-state='acknowledged']", n: 10 },
    { selector: "tr[data-record='ack']", n: 11, pad: 2 },
  ],
  clipTo: await unionClip(page, ["main h2:has-text('ENS records')", "section[data-state] >> nth=0"], { padX: 24, padY: 16 }),
});
await dropClip(page);
await browser.close();
