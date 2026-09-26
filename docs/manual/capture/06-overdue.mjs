// Chapter 6.6 — a funded invoice past its due date (Overdue). View only: whoever runs the
// scenario clicks "Mark overdue"; this photographs the page before and/or after it.
import { BASE, settle, shot, openAs, connect, unionClip, dropClip } from "./common.mjs";

const INVOICE = process.env.OVERDUE_INVOICE ?? "inv-7.seikyu.eth";
const { browser, page, account } = await openAs("INVESTOR_A2", { height: 1100 });
await page.goto(`${BASE}/invoice/${INVOICE}`);
await settle(page, 1200);
await connect(page, account);
await page.locator("main span[data-state='Overdue']").waitFor({ timeout: 30_000 });
await settle(page, 800);
const status = await page.locator("tr[data-record='status'] td:last-child").innerText();
const live = await page.locator("main p:has-text('Name live on ENS')").innerText();
const markVisible = await page.getByRole("button", { name: "Mark overdue" }).isVisible().catch(() => false);
console.log("OVERDUE", JSON.stringify({ status, live, markVisible }));
const suffix = status.trim() === "overdue" ? "after" : "before";

if (suffix === "after") {
  // After markOverdue the app still shows "expires in expired" (countdown uses the
  // original dueDate) and a stale "Mark overdue" box (a second call reverts NameStillLive).
  // Those are app bugs, so the "after" figure is cropped to the ENS records only.
  await shot(page, "06-14-overdue-after-records", {
    highlights: [
      { selector: "main tr[data-record='dueDate']", n: 6, pad: 2 },
      { selector: "main tr[data-record='status']", n: 7, pad: 2 },
    ],
    clipTo: await unionClip(page, ["main h2:has-text('ENS records')", "main section:has(table)"], { padX: 24, padY: 16 }),
  });
  await dropClip(page);
  await browser.close();
  process.exit(0);
}

await shot(page, `06-12-overdue-${suffix}`, {
  highlights: [
    { selector: "main span[data-state='Overdue']", n: 1 },
    { selector: "main p:has-text('Name live on ENS')", n: 2 },
    { selector: "main tr[data-record='status']", n: 3, pad: 2 },
  ],
  clipTo: await unionClip(page, ["main h1", "main section:has(table)"], { padX: 24, padY: 16 }),
});
await dropClip(page);
await page.locator("#actions").evaluate((el) => el.scrollIntoView({ block: "center" }));
await settle(page, 500);
await shot(page, `06-13-overdue-actions-${suffix}`, {
  highlights: [
    { selector: "#actions [data-state='overdue']", n: 4 },
    ...(markVisible ? [{ selector: '#actions button:has-text("Mark overdue")', n: 5 }] : []),
  ],
  clipTo: await unionClip(page, ["main dl > div:has(dt:text-is('Price'))", "#actions"], { padX: 24, padY: 4 }),
  clipPad: 8,
});
await dropClip(page);
await browser.close();
