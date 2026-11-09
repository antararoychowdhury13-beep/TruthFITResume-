// Shared helpers for TruthFit UI tests. The real built page (public/index.html) is served
// from disk on a fake origin; /api/* calls are mocked so tests are free and deterministic.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromium } from "playwright-core";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const ORIGIN = "http://truthfit.test";
export const fixture = name => readFileSync(path.join(root, "qa/fixtures", name), "utf8");
export const fixturePath = name => path.join(root, "qa/fixtures", name);

let browser;
export async function launch() {
  // Playwright 1.48 asks current Chrome for the removed `--headless=old` mode.
  // Supplying the modern flag explicitly keeps the suite compatible without downloading a browser.
  browser ??= await chromium.launch({ channel: "chrome", headless: false, args: ["--headless=new"] });
  return browser;
}
export async function closeBrowser() { if (browser) await browser.close(); browser = null; }

const MODELS = { available: { anthropic: false, openai: false, workersAi: true, qwen: true, kimi: false }, default: "qwen,workers",
  models: { qwen: "@cf/qwen/qwen3.8-27b", workers: "@cf/meta/llama-3.3-70b-instruct-fp8-fast" } };

/** Open the app. `ai` is either a function(prompt)->{changes,requirements,...} or null (AI fails). */
export async function openApp({ ai = null, ocr = null } = {}) {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  const calls = { ai: [], ocr: [] };
  page.on("pageerror", e => { calls.pageErrors = (calls.pageErrors || []).concat(String(e)); });
  page.on("dialog", d => { calls.dialogs = (calls.dialogs || []).concat(d.message()); d.dismiss(); });
  await page.route(`${ORIGIN}/**`, async route => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/models") return route.fulfill({ json: MODELS });
    if (url.pathname === "/api/ai") {
      const body = JSON.parse(route.request().postData() || "{}");
      calls.ai.push(body.prompt);
      if (!ai) return route.fulfill({ status: 502, json: { error: "mock failure" } });
      const out = ai(body.prompt);
      return route.fulfill({ json: { text: typeof out === "string" ? out : JSON.stringify(out), model: "@cf/qwen/qwen3.8-27b", provider: "Qwen via Workers AI" } });
    }
    if (url.pathname === "/api/ocr") {
      calls.ocr.push(route.request().postData());
      return route.fulfill({ json: { text: ocr || "", model: "@cf/qwen/qwen3.8-27b" } });
    }
    return route.fulfill({ body: readFileSync(path.join(root, "public/index.html")), contentType: "text/html" });
  });
  await page.goto(ORIGIN + "/");
  await page.waitForFunction(() => !/Checking/.test(document.querySelector("#aiStatus")?.textContent || "Checking"));
  return { page, calls, ctx };
}

export async function setProvider(page, value) {
  await page.evaluate(v => { const i = document.querySelector(`#providers input[value="${v}"]`); i.checked = true; i.dispatchEvent(new Event("change", { bubbles: true })); }, value);
}

export async function fill(page, f) {
  for (const k of ["company", "role", "jd", "resume", "extra", "links"]) await page.fill("#" + k, f[k] ?? "");
}

export async function analyse(page) {
  await page.click("#nextBtn");
  await page.waitForFunction(() => document.querySelector("#overlay").classList.contains("hide") && document.querySelector("#navStep").textContent === "Evidence Vault", null, { timeout: 30000 });
}

export async function goTo(page, step) {
  while (true) {
    const cur = await page.evaluate(() => ["Import","Evidence Vault","Role Intelligence","Evidence Map","Strategy","Review","Design & Test"].indexOf(document.querySelector("#navStep").textContent) + 1);
    if (cur >= step) return;
    await page.click("#nextBtn");
  }
}

export async function cards(page) {
  return page.$$eval("#chgList .chg", cs => cs.map(c => ({
    id: c.dataset.id, title: c.querySelector("h3").textContent,
    tags: [...c.querySelectorAll(".chg-h .tag")].map(t => t.textContent).join("|"),
    acceptDisabled: !!c.querySelector("[data-a=accept]")?.disabled,
    footer: c.querySelector(".chg-f .why")?.textContent || "", source: c.querySelector(".whybox .row")?.textContent || "",
    text: c.textContent,
  })));
}

/** A realistic model answer for the built-in sample, with the given changes. */
export function sampleAnswer(changes) {
  return {
    classification: { family: "Software, data, product & design", seniority: "Manager (people leader)", function: "Design", industry: "" },
    requirements: [
      { label: "Lead the design team", priority: "must", gate: null, status: "proven", match: "direct", evidenceId: "E1", kw: ["design team"], note: "", question: "" },
      { label: "Design strategy", priority: "must", gate: null, status: "proven", match: "direct", evidenceId: "E2", kw: ["design strategy"], note: "", question: "" },
      { label: "Bachelor's in Design", priority: "must", gate: "Credential gate", status: "proven", match: "direct", evidenceId: "D2", kw: ["bachelor"], note: "", question: "" },
    ],
    changes: changes.map(c => ({ heading: "", targets: [0], origin: ["vac"], basis: "direct", risk: "low", claim: "", why: "x", variants: null, before: "", ...c })),
    gapSuggestions: {},
  };
}
