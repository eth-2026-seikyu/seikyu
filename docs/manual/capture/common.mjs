/**
 * Shared setup for the capture scripts: env defaults for the screenshot kit,
 * a wallet-equipped browser, and a small JSON file that carries the invoice
 * name and tx hashes from one chapter's script to the next.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

process.env.MANUAL_BASE_URL ??= "http://localhost:3021";
process.env.MANUAL_OUT ??= path.resolve(HERE, "..");
process.env.MANUAL_PW_ROOT ??=
  "/private/tmp/claude-501/-Users-ikhalas-Documents-side-projects-eth-2026/d808efe5-001b-4ff7-9e68-da96b33804e6/scratchpad/pw";
process.env.MANUAL_TZ ??= "Asia/Tokyo";

const KIT = process.env.MANUAL_KIT ?? "/Users/ikhalas/.claude/skills/screenshot-manual/scripts/kit.mjs";
export const kit = await import(KIT);
export const { BASE, settle, shot, describe } = kit;
export const wallet = await import(path.join(HERE, "wallet.mjs"));

const STATE = path.join(HERE, "run-state.json");

export function loadState() {
  return existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : {};
}

export function saveState(patch) {
  const next = { ...loadState(), ...patch };
  writeFileSync(STATE, JSON.stringify(next, null, 2) + "\n");
  return next;
}

/** A 1000×780 browser whose page carries the given role's wallet. */
export async function openAs(role, opts = {}) {
  const { browser, context, page } = await kit.launch({ width: 1000, height: 780, ...opts });
  const account = await wallet.installWallet(context, role, { origin: BASE });
  return { browser, context, page, account };
}

/** Click the header's "Connect Wallet" and wait for the short address to show. */
export async function connect(page, account) {
  const short = `${account.address.slice(0, 6)}…${account.address.slice(-4)}`;
  const header = page.locator("header");
  if (await header.getByRole("button", { name: short }).isVisible().catch(() => false)) return short;
  await header.getByRole("button", { name: "Connect Wallet" }).click();
  await header.getByRole("button", { name: short }).waitFor({ timeout: 20_000 });
  return short;
}

/**
 * Place an invisible box over the union of several elements so `shot()`'s
 * `clipTo` can crop to a region no single element covers (e.g. the header's
 * wallet button plus a panel further down). Returns the selector to pass.
 */
export async function unionClip(page, selectors, { padX = 0, padY = 0, fullWidth = false } = {}) {
  // Measured with Playwright so elements inside open shadow roots (the IDKit
  // modal) count too; document.querySelector cannot see into those.
  const rects = [];
  for (const s of selectors) {
    const loc = typeof s === "string" ? page.locator(`${s} >> visible=true`).first() : s;
    const box = await loc.boundingBox();
    if (!box) throw new Error(`unionClip: no box for ${s}`);
    rects.push(box);
  }
  await page.evaluate(
    ({ rects, padX, padY, fullWidth }) => {
      document.getElementById("__manual-clip")?.remove();
      const vw = document.documentElement.clientWidth;
      const left = fullWidth ? 0 : Math.max(0, Math.min(...rects.map((r) => r.x)) - padX);
      const right = fullWidth ? vw : Math.min(vw, Math.max(...rects.map((r) => r.x + r.width)) + padX);
      const top = Math.max(0, Math.min(...rects.map((r) => r.y)) - padY);
      const bottom = Math.max(...rects.map((r) => r.y + r.height)) + padY;
      const box = document.createElement("div");
      box.id = "__manual-clip";
      Object.assign(box.style, {
        position: "absolute",
        left: `${left + scrollX}px`,
        top: `${top + scrollY}px`,
        width: `${right - left}px`,
        height: `${bottom - top}px`,
        pointerEvents: "none",
      });
      document.body.appendChild(box);
    },
    { rects, padX, padY, fullWidth },
  );
  return "#__manual-clip";
}

/**
 * Numbered callouts for controls the kit's highlight() cannot reach because
 * they live in a shadow root. Same look as the kit's boxes; the layer carries
 * data-manual-overlay so shot() clears it afterwards.
 */
export async function markBoxes(page, items) {
  const boxes = [];
  for (const it of items) {
    const box = await it.locator.boundingBox();
    if (!box) throw new Error(`markBoxes: callout ${it.n} has no box`);
    boxes.push({ ...box, n: it.n, pad: it.pad ?? 6 });
  }
  await page.evaluate((boxes) => {
    const layer = document.createElement("div");
    layer.setAttribute("data-manual-overlay", "");
    Object.assign(layer.style, { position: "absolute", inset: "0", zIndex: "2147483647", pointerEvents: "none" });
    document.body.appendChild(layer);
    for (const b of boxes) {
      const x = b.x + scrollX - b.pad;
      const y = b.y + scrollY - b.pad;
      const frame = document.createElement("div");
      Object.assign(frame.style, {
        position: "absolute", left: `${x}px`, top: `${y}px`,
        width: `${b.width + b.pad * 2}px`, height: `${b.height + b.pad * 2}px`,
        border: "3px solid #e11d48", borderRadius: "12px",
        boxShadow: "0 0 0 3px rgba(225,29,72,0.18)", boxSizing: "border-box",
      });
      layer.appendChild(frame);
      const badge = document.createElement("div");
      badge.textContent = String(b.n);
      Object.assign(badge.style, {
        position: "absolute", left: `${x - 14}px`, top: `${y - 14}px`, width: "28px", height: "28px",
        borderRadius: "999px", background: "#e11d48", color: "#fff",
        font: "700 15px/28px ui-sans-serif, system-ui, sans-serif", textAlign: "center",
      });
      layer.appendChild(badge);
    }
  }, boxes);
}

export async function dropClip(page) {
  await page.evaluate(() => {
    document.getElementById("__manual-clip")?.remove();
    document.querySelectorAll("[data-manual-union]").forEach((n) => n.removeAttribute("data-manual-union"));
  });
}

/** Wait until a new tx appears in the wallet log after `before`, then for its receipt. */
export async function nextTx(page, before, label) {
  for (let i = 0; i < 240 && wallet.sentTxs.length <= before; i++) await page.waitForTimeout(500);
  const tx = wallet.sentTxs[before];
  if (!tx) throw new Error(`${label}: no transaction was sent`);
  await wallet.waitReceipt(tx.hash);
  console.log(`${label}_TX ${tx.hash}`);
  return tx.hash;
}
