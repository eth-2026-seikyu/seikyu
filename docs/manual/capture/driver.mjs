/**
 * Interactive exploration driver (not part of the capture run): keeps a
 * wallet-equipped browser open and executes command files dropped into
 * DRIVER_DIR as `<n>.mjs` (an async function body receiving `ctx`), writing
 * the result to `<n>.out`. Used to learn third-party UIs (IDKit, the World ID
 * simulator) before scripting them.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import * as common from "./common.mjs";

const DIR = process.env.DRIVER_DIR;
const role = process.argv[2] ?? "INVESTOR_A";
const { browser, context, page, account } = await common.openAs(role);
const ctx = { ...common, browser, context, page, account, pages: () => context.pages(), vars: {} };
context.on("page", (p) => console.log("new page", p.url()));
console.log("driver ready as", role, account.address);

const done = new Set();
for (;;) {
  for (const f of readdirSync(DIR).filter((f) => f.endsWith(".mjs")).sort()) {
    if (done.has(f)) continue;
    done.add(f);
    const out = path.join(DIR, f.replace(/\.mjs$/, ".out"));
    try {
      const body = readFileSync(path.join(DIR, f), "utf8");
      const fn = new Function("ctx", `return (async () => { ${body} })();`);
      const res = await fn(ctx);
      writeFileSync(out, typeof res === "string" ? res : JSON.stringify(res, null, 1) ?? "ok");
    } catch (e) {
      writeFileSync(out, "ERROR " + (e.stack ?? e.message));
    }
    if (existsSync(path.join(DIR, "STOP"))) process.exit(0);
  }
  await new Promise((r) => setTimeout(r, 300));
}
