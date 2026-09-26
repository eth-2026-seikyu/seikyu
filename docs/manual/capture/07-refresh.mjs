// Chapter 7 (bonus, optional per the L7 card) — the wrong-network banner
// (`ChainGuard`, added in L3) is never exercised by the happy-path chapters
// above, so this fakes it cheaply: a mock wallet that reports chainId `0x1`
// (mainnet) instead of Sepolia, via `wallet.mjs`'s `chainId` override. No
// transaction, no simulator identity, no invoice needed.
//
// Also confirms (AC-U6's last bullet) that `#actions` write buttons are
// disabled on the wrong network via `useOnSepolia()` — BuyPanel/PayPanel
// import it and render "Switch to the Sepolia test network first (see the
// banner above)." with the button disabled.
import { BASE, settle, shot, openAs, connect, unionClip, dropClip } from "./common.mjs";

const { browser, page, account } = await openAs("INVESTOR_A2", { chainId: "0x1" });
await page.goto(`${BASE}/`);
await settle(page, 900);
await connect(page, account);
// `getByRole("alert")` also matches Next.js's own route-announcer div, so
// scope to the banner's actual text.
const banner = page.locator('[role="alert"]:has-text("wrong network")');
await banner.waitFor({ timeout: 15_000 });
await settle(page, 500);

await shot(page, "07-01-wrong-network", {
  highlights: [{ selector: '[role="alert"]:has-text("wrong network") button:has-text("Switch to Sepolia")', n: 1 }],
  clipTo: await unionClip(page, ["header", banner], { fullWidth: true, padY: 8 }),
});
await dropClip(page);

await page.goto(`${BASE}/invoice/inv-1.seikyu.eth`);
await settle(page, 900);
await connect(page, account);
await page.getByRole("alert").filter({ hasText: "wrong network" }).waitFor({ timeout: 15_000 });
await page.locator("#actions").scrollIntoViewIfNeeded();
await settle(page, 500);
await shot(page, "07-02-wrong-network-actions", {
  highlights: [{ selector: "#actions button:disabled", n: 1 }],
  clipTo: "#actions",
  clipPad: 16,
});
await dropClip(page);
await browser.close();
