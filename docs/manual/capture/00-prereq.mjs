// Chapter 0 — connect a wallet and use the mUSDC faucet (investor A).
import { BASE, settle, shot, describe, openAs, connect, wallet, unionClip, dropClip } from "./common.mjs";

const { browser, page, account } = await openAs("INVESTOR_A");
await page.goto(`${BASE}/`);
await settle(page, 900);
console.log(JSON.stringify(await describe(page, "header"), null, 1));

await shot(page, "00-01-connect", {
  highlights: [{ selector: 'header button:has-text("Connect Wallet")', n: 1 }],
  clipTo: "header",
  clipPad: 8,
});

const short = await connect(page, account);
await settle(page, 1200);
await page.locator("text=/Balance: .* mUSDC/").waitFor({ timeout: 20_000 });

await shot(page, "00-02-faucet", {
  highlights: [
    { selector: `header button:has-text("${short}")`, n: 1 },
    { selector: 'button:has-text("Get 10,000 mUSDC")', n: 2 },
  ],
  clipTo: await unionClip(page, ["header", "main > div > div.mt-4:not(.grid)"], { fullWidth: true, padY: 12 }),
});
await dropClip(page);

const before = wallet.sentTxs.length;
await page.getByRole("button", { name: "Get 10,000 mUSDC" }).click();
await page.getByRole("button", { name: "Minting…" }).waitFor({ timeout: 10_000 }).catch(() => {});
for (let i = 0; i < 60 && wallet.sentTxs.length === before; i++) await page.waitForTimeout(500);
const mint = wallet.sentTxs.at(-1);
if (!mint || wallet.sentTxs.length === before) throw new Error("faucet mint was not sent");
await wallet.waitReceipt(mint.hash);
await page.getByRole("button", { name: "Get 10,000 mUSDC" }).waitFor({ timeout: 60_000 });
await settle(page, 1500);
await shot(page, "00-03-faucet-done", {
  highlights: [{ selector: "text=/Balance: .* mUSDC/", n: 3 }],
  clipTo: await unionClip(page, ["header", "main > div > div.mt-4:not(.grid)"], { fullWidth: true, padY: 12 }),
});
await dropClip(page);
console.log("FAUCET_TX", mint.hash);
await browser.close();
