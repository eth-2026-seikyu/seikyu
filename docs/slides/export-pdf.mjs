// Renders every deck in this folder to a 1280x720 PDF, one slide per page.
// Needs the Playwright install the screenshot harness uses:
//   docs/manual/capture/.pw   (see docs/manual/capture/README.md)
// Run from the repo root:  node docs/slides/export-pdf.mjs
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";

const here = path.dirname(new URL(import.meta.url).pathname);
const pwRoot =
  process.env.MANUAL_PW_ROOT ?? path.resolve(here, "../manual/capture/.pw");
const { chromium } = createRequire(path.join(pwRoot, "package.json"))(
  "@playwright/test",
);

const decks = ["main", "world", "ens", "curvegrid"].filter((n) =>
  fs.existsSync(path.join(here, `${n}.html`)),
);

const browser = await chromium.launch();
const page = await browser.newPage();
for (const name of decks) {
  const src = path.join(here, `${name}.html`);
  await page.goto(`file://${src}`);
  // Print CSS reveals every slide; wait for the images to decode first.
  await page.waitForLoadState("networkidle");
  await page.emulateMedia({ media: "print" });
  const out = path.join(here, `${name}.pdf`);
  await page.pdf({
    path: out,
    width: "1280px",
    height: "720px",
    printBackground: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
  });
  const slides = await page.evaluate(
    () => document.querySelectorAll(".slide").length,
  );
  console.log(
    `${name}.pdf  ${slides} slides  ${(fs.statSync(out).size / 1024).toFixed(0)} KB`,
  );
}
await browser.close();
