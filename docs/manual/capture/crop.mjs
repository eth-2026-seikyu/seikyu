// Trim a figure: node crop.mjs <png> <top> [bottom] — pixel rows to drop (2x pixels).
// Used only to remove a strip showing an app bug from a figure that cannot be re-shot.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.env.MANUAL_PW_ROOT ??
  "/private/tmp/claude-501/-Users-ikhalas-Documents-side-projects-eth-2026/d808efe5-001b-4ff7-9e68-da96b33804e6/scratchpad/pw";
const { chromium } = createRequire(path.join(root, "package.json"))("@playwright/test");
const [file, top = "0", bottom = "0"] = process.argv.slice(2);
const buf = readFileSync(file);
const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
await page.setContent(`<body style="margin:0"><img src="data:image/png;base64,${buf.toString("base64")}"></body>`);
await page.screenshot({ path: file, clip: { x: 0, y: Number(top), width: w, height: h - Number(top) - Number(bottom) } });
await browser.close();
console.log(`${file}: ${w}x${h} -> ${w}x${h - Number(top) - Number(bottom)}`);
