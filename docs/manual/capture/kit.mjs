// Vendored from the screenshot-manual skill (scripts/kit.mjs) so this repo's
// capture harness can be regenerated from a clean clone alone. Do not modify;
// pull updates from the skill by re-copying this file.
/**
 * Capture kit for screenshot-driven user manuals.
 *
 * Drives a REAL running app with Playwright and photographs it. Every helper
 * here exists because a manual is only trustworthy if its pictures came from
 * the same clicks the text tells the reader to make — so nothing is mocked,
 * and a step that cannot be performed throws instead of quietly producing a
 * misleading figure.
 *
 * Configuration (all optional, env-driven so the kit stays project-agnostic):
 *   MANUAL_BASE_URL   app origin                (default http://localhost:3000)
 *   MANUAL_OUT        output root               (default ./manual)
 *   MANUAL_PW_ROOT    dir whose node_modules has @playwright/test
 *                     (default: search upward from cwd)
 */
import { createRequire } from "node:module";
import { mkdirSync, existsSync } from "node:fs";
import path from "node:path";

export const BASE = process.env.MANUAL_BASE_URL ?? "http://localhost:3000";
export const OUT = path.resolve(process.env.MANUAL_OUT ?? "manual");
export const SHOTS = path.join(OUT, "screenshots");

mkdirSync(SHOTS, { recursive: true });

/**
 * Playwright usually lives in the app workspace, not next to this skill, and
 * pnpm does not hoist it to the repo root. Walk up from the cwd until a
 * node_modules that actually has it turns up.
 */
function loadChromium() {
  const candidates = [];
  if (process.env.MANUAL_PW_ROOT) candidates.push(process.env.MANUAL_PW_ROOT);
  let dir = process.cwd();
  for (let i = 0; i < 6; i += 1) {
    candidates.push(dir);
    dir = path.dirname(dir);
  }
  for (const base of candidates) {
    const pkg = path.join(base, "node_modules", "@playwright", "test", "package.json");
    if (existsSync(pkg)) {
      return createRequire(path.join(base, "package.json"))("@playwright/test").chromium;
    }
  }
  throw new Error(
    "Cannot find @playwright/test. Run this from the app workspace, or set " +
      "MANUAL_PW_ROOT to a directory whose node_modules contains it.",
  );
}

const chromium = loadChromium();

/**
 * @param {{width?:number,height?:number,locale?:string,timezoneId?:string}} opts
 *
 * Frame size is a real editorial decision, not a default to accept. A centred
 * card photographed at 1440×900 prints as a stamp floating in white space;
 * capture those at ~1000×780 so the card fills the figure.
 */
export async function launch(opts = {}) {
  const {
    width = 1440,
    height = 900,
    locale = process.env.MANUAL_LOCALE ?? "en-US",
    timezoneId = process.env.MANUAL_TZ ?? "UTC",
    headless = true,
  } = opts;
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({
    viewport: { width, height },
    // 2× pixels so a full-width figure still reads when printed on A4.
    deviceScaleFactor: 2,
    locale,
    timezoneId,
    reducedMotion: "reduce", // no half-finished transitions in the captures
  });
  // Dev-server overlays are artifacts of the developer's machine; a reader
  // will never see them, so they must never appear in a figure.
  await context.addInitScript(() => {
    const inject = () => {
      if (!document.documentElement) return false;
      const css = document.createElement("style");
      css.textContent =
        "nextjs-portal,[data-nextjs-toast],#__next-build-watcher," +
        "#vite-error-overlay,vite-error-overlay,#webpack-dev-server-client-overlay" +
        "{display:none!important}";
      document.documentElement.appendChild(css);
      return true;
    };
    if (!inject()) document.addEventListener("DOMContentLoaded", inject, { once: true });
  });
  context.setDefaultTimeout(Number(process.env.MANUAL_TIMEOUT_MS ?? 30_000));
  const page = await context.newPage();
  return { browser, context, page };
}

/** Fonts loaded, network quiet, layout settled — then it is safe to shoot. */
export async function settle(page, ms = 450) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(ms);
}

/**
 * Draw the red callout boxes that make a manual readable.
 *
 * targets: string selector | {selector|locator, label?, n?, pad?} | array of those
 *
 * The measure and the draw happen inside ONE page.evaluate on purpose. An
 * earlier version measured with Playwright and drew in a second round-trip;
 * any layout movement between the two (a chat thread scrolling to its newest
 * message, an image finishing load) put the box on the wrong element — and a
 * box around the wrong control is worse than no box, because the reader trusts
 * it. Tagging costs no layout, so tag first and measure at draw time.
 */
export async function highlight(page, targets, opts = {}) {
  const list = Array.isArray(targets) ? targets : [targets];
  // When the shot will be cropped, labels must stay inside the CROP, not merely
  // inside the document — otherwise a label placed in the right gutter is
  // sliced off by the crop and the figure ships with half a word on it.
  const bounds = opts.bounds ?? null;
  const boxes = [];
  for (const [i, t] of list.entries()) {
    const spec = typeof t === "string" ? { selector: t } : t;
    // `visible=true` matters: responsive layouts often ship a mobile duplicate
    // of the same control, and a bare CSS selector can resolve to the hidden twin.
    const locator =
      spec.locator ?? page.locator(`${spec.selector} >> visible=true`).first();
    await locator.waitFor({ state: "visible", timeout: 15_000 });
    await locator.evaluate((el, idx) => el.setAttribute("data-manual-target", String(idx)), i);
    boxes.push({ idx: i, label: spec.label ?? null, n: spec.n ?? null, pad: spec.pad ?? 6 });
  }

  const unplaced = await page.evaluate(({ items, bounds }) => {
    document.querySelectorAll("[data-manual-overlay]").forEach((n) => n.remove());
    const layer = document.createElement("div");
    layer.setAttribute("data-manual-overlay", "");
    Object.assign(layer.style, {
      position: "absolute",
      inset: "0",
      zIndex: "2147483647",
      pointerEvents: "none",
    });
    // In the document BEFORE anything is measured: an element outside the tree
    // reports offsetWidth 0, which silently defeats the label-placement checks
    // below and leaves every label in the right gutter — where a cropped figure
    // slices it in half.
    document.body.appendChild(layer);

    // Every highlighted control, in document coords — labels must not sit on
    // any of them, not just on their own.
    const rects = items
      .map((it) => document.querySelector(`[data-manual-target="${it.idx}"]`))
      .filter(Boolean)
      .map((el) => {
        const q = el.getBoundingClientRect();
        return {
          left: q.x + window.scrollX,
          top: q.y + window.scrollY,
          right: q.x + q.width + window.scrollX,
          bottom: q.y + q.height + window.scrollY,
        };
      });
    const dropped = [];

    for (const it of items) {
      const target = document.querySelector(`[data-manual-target="${it.idx}"]`);
      if (!target) continue;
      const r = target.getBoundingClientRect();
      const bx = r.x + window.scrollX;
      const by = r.y + window.scrollY;

      const box = document.createElement("div");
      Object.assign(box.style, {
        position: "absolute",
        left: `${bx - it.pad}px`,
        top: `${by - it.pad}px`,
        width: `${r.width + it.pad * 2}px`,
        height: `${r.height + it.pad * 2}px`,
        border: "3px solid #e11d48",
        borderRadius: "12px",
        boxShadow: "0 0 0 3px rgba(225,29,72,0.18)",
        boxSizing: "border-box",
      });
      layer.appendChild(box);

      if (it.n != null) {
        const badge = document.createElement("div");
        badge.textContent = String(it.n);
        Object.assign(badge.style, {
          position: "absolute",
          left: `${bx - it.pad - 14}px`,
          top: `${by - it.pad - 14}px`,
          width: "28px",
          height: "28px",
          borderRadius: "999px",
          background: "#e11d48",
          color: "#fff",
          font: "700 15px/28px ui-sans-serif, system-ui, sans-serif",
          textAlign: "center",
          boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
        });
        layer.appendChild(badge);
      }

      if (it.label) {
        const tag = document.createElement("div");
        tag.textContent = it.label;
        Object.assign(tag.style, {
          position: "absolute",
          left: "0px",
          top: "0px",
          padding: "5px 12px",
          borderRadius: "8px",
          background: "#e11d48",
          color: "#fff",
          font: '600 14px/1.5 "Sukhumvit Set","Noto Sans Thai",ui-sans-serif,system-ui,sans-serif',
          boxShadow: "0 2px 8px rgba(0,0,0,0.22)",
          whiteSpace: "nowrap",
        });
        layer.appendChild(tag);

        // Place only after measuring: a label covering the control it points at
        // defeats the purpose. Prefer the right gutter, then left, then above.
        const tw = tag.offsetWidth;
        const th = tag.offsetHeight;
        const gap = 12;
        // The frame the label must stay inside: the crop when there is one,
        // otherwise the document.
        const minX = bounds ? bounds.x + window.scrollX + 4 : 8;
        const maxX = bounds
          ? bounds.x + bounds.width + window.scrollX - 4
          : document.documentElement.scrollWidth - 8;
        const minY = bounds ? bounds.y + window.scrollY + 4 : 8;
        const maxY = bounds
          ? bounds.y + bounds.height + window.scrollY - 4
          : document.documentElement.scrollHeight - 8;

        const candidates = [
          [bx + r.width + it.pad + gap, by + r.height / 2 - th / 2], // right gutter
          [bx - it.pad - gap - tw, by + r.height / 2 - th / 2], // left gutter
          [bx - it.pad, by - it.pad - th - gap], // above
          [bx - it.pad, by + r.height + it.pad + gap], // below
        ];

        const overlaps = (x, y) =>
          rects.some(
            (o) =>
              x < o.right + gap &&
              x + tw > o.left - gap &&
              y < o.bottom + gap &&
              y + th > o.top - gap,
          );

        const place = candidates.find(
          ([x, y]) =>
            x >= minX && x + tw <= maxX && y >= minY && y + th <= maxY && !overlaps(x, y),
        );

        if (place) {
          tag.style.left = `${Math.round(place[0])}px`;
          tag.style.top = `${Math.round(place[1])}px`;
        } else {
          // Nowhere to put it without covering a control the reader needs to
          // see. The numbered badge still identifies the target, and the step
          // text names it — so drop the label and say so, rather than shipping
          // a figure with a caption sitting on top of a field.
          tag.remove();
          dropped.push(it.label);
        }
      }
    }
    return dropped;
  }, { items: boxes, bounds });

  if (unplaced.length) {
    console.warn(
      `  ⚠︎ label(s) dropped — no free space in frame: ${unplaced.join(", ")}\n` +
        "    Use a wider viewport, a larger clipPad, or a shorter label.",
    );
  }
  return unplaced;
}

export async function clearHighlights(page) {
  await page.evaluate(() => {
    document.querySelectorAll("[data-manual-overlay]").forEach((n) => n.remove());
    document
      .querySelectorAll("[data-manual-target]")
      .forEach((n) => n.removeAttribute("data-manual-target"));
  });
}

const taken = [];

/**
 * @param {string} name file stem, e.g. "03-02-invoice-form"
 * @param {{highlights?:any, fullPage?:boolean, clipTo?:string, clipPad?:number}} opts
 *
 * `clipTo` crops to one element: a 1440-wide frame of a centred 500px card is
 * mostly blank paper, and blank paper is unreadable at print scale.
 */
export async function shot(page, name, opts = {}) {
  const { highlights, fullPage = false, clipTo, clipPad = 24 } = opts;

  // Resolve the crop BEFORE drawing, so callout labels can be kept inside it.
  let clip;
  if (clipTo) {
    const box = await page.locator(`${clipTo} >> visible=true`).first().boundingBox();
    if (!box) throw new Error(`shot(${name}): clipTo matched nothing — ${clipTo}`);
    const vp = page.viewportSize();
    const x = Math.max(0, box.x - clipPad);
    const y = Math.max(0, box.y - clipPad);
    clip = {
      x,
      y,
      width: Math.min(vp.width - x, box.width + clipPad * 2),
      height: Math.min(vp.height - y, box.height + clipPad * 2),
    };
  }

  if (highlights) await highlight(page, highlights, { bounds: clip ?? null });

  const file = path.join(SHOTS, `${name}.png`);
  await page.screenshot({ path: file, fullPage, ...(clip ? { clip } : {}) });
  await clearHighlights(page);
  taken.push(name);
  console.log(`  📸 ${name}${fullPage ? " (full)" : ""}${clipTo ? " (clipped)" : ""}`);
  return file;
}

export function captured() {
  return [...taken];
}

/**
 * Sign in through the UI, which is usually the manual's own first step.
 * Selectors are parameters because every app names its fields differently —
 * read them off the real login page rather than assuming.
 */
export async function login(page, opts = {}) {
  const {
    url = `${BASE}/login`,
    email = process.env.MANUAL_EMAIL,
    password = process.env.MANUAL_PASSWORD,
    emailSelector = 'input[type="email"]',
    passwordSelector = 'input[type="password"]',
    submit = /sign in|log in|login|เข้าสู่ระบบ/i,
    settledAt = (u) => !new URL(u).pathname.startsWith("/login"),
  } = opts;
  if (!email || !password) {
    throw new Error("login(): set MANUAL_EMAIL / MANUAL_PASSWORD or pass them in");
  }
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.locator(emailSelector).first().fill(email);
  await page.locator(passwordSelector).first().fill(password);
  await page.getByRole("button", { name: submit }).first().click();
  await page.waitForURL(settledAt, { timeout: 45_000 });
  await settle(page);
}

/**
 * Read what a screen actually offers. Manuals go wrong when a writer names a
 * field the app does not have, so transcribe headings, tabs, buttons and form
 * fields from the live DOM instead of from the code or from memory.
 */
export async function describe(page, scopeSelector) {
  return page.evaluate((sel) => {
    const txt = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
    const scope =
      (sel && document.querySelector(sel)) ||
      document.querySelector('[role="dialog"]') ||
      document.querySelector("main") ||
      document.body;
    const uniq = (a) => [...new Set(a.filter((s) => s && s.length < 140))];
    const visible = (el) => !!(el.offsetWidth || el.offsetHeight);
    return {
      url: location.pathname,
      headings: uniq([...scope.querySelectorAll("h1,h2,h3")].map(txt)),
      tabs: uniq([...scope.querySelectorAll('[role="tab"]')].map(txt)),
      buttons: uniq(
        [...scope.querySelectorAll("button")].filter(visible).map(txt),
      ),
      fields: [...scope.querySelectorAll("input,select,textarea")]
        .filter(visible)
        .map((el) => ({
          tag: el.tagName.toLowerCase(),
          type: el.getAttribute("type") ?? "",
          id: el.id || "",
          placeholder: el.getAttribute("placeholder") || "",
          required: el.required || false,
          label: (() => {
            if (el.id) {
              const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
              if (l) return txt(l);
            }
            return txt(el.closest("label"));
          })(),
        })),
      links: uniq(
        [...scope.querySelectorAll("a[href]")].map(
          (a) => `${txt(a)} → ${a.getAttribute("href")}`,
        ),
      ),
    };
  }, scopeSelector ?? null);
}
