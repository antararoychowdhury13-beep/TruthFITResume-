// Broad regression suite: required fields, file types, XSS escaping and the sample happy path.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { openApp, closeBrowser, fill, analyse, goTo, setProvider, fixture, fixturePath } from "./helpers.mjs";

after(closeBrowser);

const VALID = { company: "Fabrikam Cloud", role: "Senior Product Designer", jd: fixture("J1_match.txt"), resume: fixture("R1_clean.txt") };

test("required fields: empty, whitespace-only or too-short inputs never start an analysis", async () => {
  const { page, calls } = await openApp();
  for (const k of ["company", "role", "jd", "resume"]) {
    for (const bad of ["", "   \n  "]) {
      await fill(page, { ...VALID, [k]: bad });
      await page.click("#nextBtn");
      assert.equal(await page.textContent("#navStep"), "Import", `${k}=${JSON.stringify(bad)} must be rejected`);
    }
  }
  await fill(page, { ...VALID, jd: fixture("J4_one_word.txt") });
  await page.click("#nextBtn");
  assert.equal(await page.textContent("#navStep"), "Import", "a one-word job description must be rejected");
  assert.equal(calls.ai.length, 0);
});

async function upload(page, name) {
  await page.setInputFiles('input[data-for="resume"]', fixturePath(name));
  await page.waitForFunction(() => { const m = document.querySelector('[data-msg="resume"]'); return /✓/.test(m.textContent) || m.classList.contains("err"); }, null, { timeout: 30000 });
  return { msg: await page.textContent('[data-msg="resume"]'), text: await page.inputValue("#resume"), err: await page.$eval('[data-msg="resume"]', m => m.classList.contains("err")) };
}

test("file types: PDF, Word and text are read; broken files get a clear error", async () => {
  const { page } = await openApp();
  let r = await upload(page, "R1_clean_1page.pdf");
  assert.match(r.text, /Senior Product Designer — Northwind Analytics \| Mar 2022 – Present/);
  assert.match(r.text, /• Ran 24 usability tests/);
  r = await upload(page, "R4_complex.docx");
  assert.match(r.text, /Northwind Analytics/); assert.match(r.text, /English, Hindi/);
  r = await upload(page, "R7_unicode.pdf");
  assert.match(r.text, /राहुल/); assert.match(r.text, /Café Façade/);
  r = await upload(page, "R9_corrupt_jpg_renamed.pdf");
  assert.equal(r.err, true); assert.match(r.msg, /damaged|recover/i);
  await page.setInputFiles('input[data-for="extra"]', fixturePath("X3_unsupported.xyz"));
  assert.match(await page.textContent('[data-msg="extra"]'), /Use a PDF, Word/);
});

test("XSS: markup typed into any field is shown as text in every step and never runs", async () => {
  const { page, calls } = await openApp();
  await setProvider(page, "offline");
  const P = '<img src=x onerror="window.__xss=(window.__xss||0)+1">', S = "<script>window.__xss=(window.__xss||0)+1<\/script>";
  await fill(page, { company: "Acme " + P, role: "Designer " + P + S, jd: VALID.jd + "\nRequired: Figma " + P + ", usability testing.",
    resume: VALID.resume.replace("Figma, Sketch", "Figma " + P + ", Sketch"), extra: "Side project " + P, links: "javascript:window.__xss=1" });
  await analyse(page);
  await goTo(page, 7);
  await page.click('[data-ftab="letter"]');
  assert.equal(await page.evaluate(() => window.__xss || 0), 0);
  assert.equal(await page.$$eval('img[src="x"]', x => x.length), 0);
  assert.equal(await page.$$eval('a[href^="javascript"]', x => x.length), 0);
  assert.deepEqual(calls.pageErrors || [], []);
});

test("sample happy path: every step renders, low-risk changes apply, facts survive the parse test", async () => {
  const { page, calls } = await openApp();
  await setProvider(page, "offline");
  await page.click("#loadExample");
  await analyse(page);
  for (let s = 3; s <= 6; s++) { await goTo(page, s); }
  await page.click("#acceptLow");
  const accepted = await page.$$eval("#chgList .chg.accepted", x => x.length);
  assert.ok(accepted >= 4, `expected the sample's grounded changes to be accepted, got ${accepted}`);
  await goTo(page, 7);
  const final = await page.inputValue("#finalEdit");
  assert.match(final, /Lead and manage a design team of four designers/);
  assert.match(final, /Product Design Manager — IBM \| Jul 2025 – Present/);
  assert.match(final, /Master of Design — IIT Hyderabad \(Gold Medalist\)/);
  const fails = await page.$$eval("#parseChecks li.fail", x => x.map(l => l.textContent));
  assert.deepEqual(fails, []);
  assert.deepEqual(calls.pageErrors || [], []);
});

test("one-page contract: creates a concise A4 résumé at an ATS-safe font while retaining every role", async () => {
  const { page } = await openApp();
  await setProvider(page, "offline");
  await page.click("#loadExample");
  await page.click('.seg[data-opt="pages"] button[data-v="1"]');
  await analyse(page);
  await goTo(page, 7);
  assert.match(await page.textContent("#finalTitle"), /One-page résumé/);
  const final = await page.inputValue("#finalEdit");
  for (const employer of ["IBM", "BT Group", "Siemens"]) assert.match(final, new RegExp(employer));
  const checks = await page.$$eval("#parseChecks li", xs => xs.map(x => x.textContent));
  assert.ok(checks.some(x => /ATS-safe font size/.test(x)), checks.join("\n"));
  assert.ok(checks.some(x => /One A4 page/.test(x)), checks.join("\n"));
  assert.ok(final.split("\n").filter(x => /^•/.test(x)).length < 15, "one-page résumé should prioritise rather than copy every bullet");
});

test("both outputs: user can switch between the one-page résumé and adaptive detailed CV", async () => {
  const { page } = await openApp();
  await setProvider(page, "offline");
  await page.click("#loadExample");
  await page.click('.seg[data-opt="pages"] button[data-v="both"]');
  await analyse(page); await goTo(page, 7);
  assert.equal(await page.$eval("#formatSwitch", e => e.classList.contains("hide")), false);
  const concise = await page.inputValue("#finalEdit");
  await page.click('#formatSwitch [data-format="detail"]');
  const detailed = await page.inputValue("#finalEdit");
  assert.ok(detailed.length > concise.length, `${detailed.length} should be greater than ${concise.length}`);
  assert.match(await page.textContent("#finalTitle"), /Detailed CV/);
});
