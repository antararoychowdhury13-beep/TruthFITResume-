// Regression tests for the Critical bugs in qa/BUG_REPORT.md (UI level, AI mocked).
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { openApp, closeBrowser, fill, analyse, goTo, cards, sampleAnswer, setProvider, fixture, fixturePath } from "./helpers.mjs";

after(closeBrowser);

const PLANTED = [
  { title: "Employer swap", type: "replace", before: "Product Design Manager — IBM | Jul 2025 – Present", after: "Product Design Manager — Google | Jul 2025 – Present", cites: ["R1"] },
  { title: "Date shift", type: "replace", before: "Product Design Manager — BT Group | Dec 2024 – Jun 2025", after: "Product Design Manager — BT Group | Jan 2024 – Jun 2025", cites: ["R2"] },
  { title: "Degree upgrade", type: "replace", before: "Master of Design — IIT Hyderabad (Gold Medalist)", after: "PhD in Design — MIT (Gold Medalist)", cites: ["D1"] },
  { title: "Headline rewrite", type: "replace", before: "Product Design Manager · Bangalore, India", after: "Design Manager - Product Design Leader", cites: ["S1"] },
  { title: "Fake skills", type: "add", heading: "SKILLS", after: "• Expert in Python, Kubernetes and SAP migrations", cites: ["T1"] },
  { title: "Uncited award", type: "add", heading: "EXPERIENCE", after: "• Won the company-wide Design Excellence Award", cites: [], origin: [] },
  { title: "Grounded rewrite", type: "replace", before: "• Manage and mentor four designers across four squads.", after: "• Lead and manage four designers across four squads, mentoring each of them.", cites: ["E1"] },
];

async function sampleWithPlanted() {
  const app = await openApp({ ai: () => sampleAnswer(PLANTED) });
  await app.page.click("#loadExample");
  await analyse(app.page);
  await goTo(app.page, 6);
  return app;
}

test("BUG-002: changes to locked employer, dates, degree and headline cannot be accepted", async () => {
  const { page } = await sampleWithPlanted();
  const cs = await cards(page);
  for (const t of ["Employer swap", "Date shift", "Degree upgrade", "Headline rewrite"]) {
    const c = cs.find(x => x.title === t);
    assert.ok(c, `${t} card present`);
    assert.equal(c.acceptDisabled, true, `${t} must be blocked`);
    assert.doesNotMatch(c.tags, /Low risk/, `${t} must not be labelled Low risk`);
  }
  await page.click("#acceptLow");
  await goTo(page, 7);
  const final = await page.inputValue("#finalEdit");
  assert.doesNotMatch(final, /Google|PhD|MIT|Jan 2024|Product Design Leader/);
  assert.match(final, /Product Design Manager — IBM \| Jul 2025 – Present/);
});

test("BUG-003: invented skills and uncited claims are blocked, grounded rewrites are not", async () => {
  const { page } = await sampleWithPlanted();
  const cs = await cards(page);
  const skills = cs.find(x => x.title === "Fake skills"), award = cs.find(x => x.title === "Uncited award"), ok = cs.find(x => x.title === "Grounded rewrite");
  assert.equal(skills.acceptDisabled, true, "Python/Kubernetes/SAP are not in the evidence");
  assert.equal(award.acceptDisabled, true, "uncited claim must be blocked");
  assert.doesNotMatch(award.footer, /Uses only facts from your vault/);
  assert.doesNotMatch(award.source, /Vacancy/, "an unlabelled source must not be shown as Vacancy");
  assert.equal(ok.acceptDisabled, false, "a grounded rewrite stays acceptable");
  await page.click("#acceptLow");
  await goTo(page, 7);
  const final = await page.inputValue("#finalEdit");
  assert.doesNotMatch(final, /Python|Kubernetes|Excellence Award/);
});

test("BUG-004: a designer applying to a nurse role is never summarised as a nurse", async () => {
  const { page } = await openApp();
  await setProvider(page, "offline");
  await fill(page, { company: "City General Hospital", role: "Registered Staff Nurse", jd: fixture("J2_nurse_mismatch.txt"), resume: fixture("R1_clean.txt") });
  await analyse(page);
  await goTo(page, 6);
  const text = (await cards(page)).map(c => c.text).join("\n");
  assert.doesNotMatch(text, /Registered Staff Nurse with/);
  assert.doesNotMatch(text, /verified experience in the core requirements/);
});

test("BUG-005: name, location, URLs, street address and phone formats never reach the AI", async () => {
  for (const [resume, banned] of [
    [null, ["Anupam Sarkar", "Bangalore", "portfolio.example.com", "98765", "anupam.sarkar@"]],
    [fixture("R5_plain_titlecase.txt"), ["Sam Test Okafor", "010-0199", "12 Example Street", "LS1 1AA", "sam.test@"]],
    [fixture("R1_clean.txt"), ["Priya Test Sharma", "Pune", "linkedin.com/in/priya", "90000 00000"]],
  ]) {
    const { page, calls } = await openApp();
    if (resume) await fill(page, { company: "Fabrikam Cloud", role: "Senior Product Designer", jd: fixture("J1_match.txt"), resume, links: "https://www.linkedin.com/in/someone-test" });
    else await page.click("#loadExample");
    await analyse(page);
    assert.equal(calls.ai.length, 1);
    for (const b of banned) assert.ok(!calls.ai[0].includes(b), `prompt leaked "${b}"`);
    assert.ok(!calls.ai[0].includes("linkedin.com/in/someone-test"));
  }
});

test("BUG-005: dates and metrics are not mistaken for phone numbers", async () => {
  const { page, calls } = await openApp();
  await fill(page, { company: "Fabrikam Cloud", role: "Senior Product Designer", jd: fixture("J1_match.txt"),
    resume: fixture("R1_clean.txt").replace("Mar 2022 – Present", "2019 - 2021 2022").replace("12,000 customers", "1,200,000 customers") });
  await analyse(page);
  assert.match(calls.ai[0], /2019 - 2021/);
  assert.match(calls.ai[0], /1,200,000 customers/);
});

test("BUG-006: scanned pages are not sent for OCR without explicit consent", async () => {
  const { page, calls } = await openApp({ ocr: fixture("R1_clean.txt") });
  await page.setInputFiles('input[data-for="resume"]', fixturePath("R3_scanned.pdf"));
  await page.waitForSelector('[data-ocr-consent="yes"]', { timeout: 30000 });
  assert.equal(calls.ocr.length, 0, "no page image may leave before consent");
  assert.match(await page.textContent('[data-msg="resume"]'), /contact details/i);
  await page.click('[data-ocr-consent="yes"]');
  await page.waitForFunction(() => /✓/.test(document.querySelector('[data-msg="resume"]').textContent), null, { timeout: 30000 });
  assert.equal(calls.ocr.length, 1);
});

test("BUG-006: declining OCR sends nothing and explains what to do", async () => {
  const { page, calls } = await openApp();
  await page.setInputFiles('input[data-for="resume"]', fixturePath("R3_scanned.pdf"));
  await page.waitForSelector('[data-ocr-consent="no"]', { timeout: 30000 });
  await page.click('[data-ocr-consent="no"]');
  await page.waitForFunction(() => /paste/i.test(document.querySelector('[data-msg="resume"]').textContent));
  assert.equal(calls.ocr.length, 0);
});

test("BUG-009: Title Case headings and two-line role entries build a real, locked vault", async () => {
  const { page, calls } = await openApp();
  await fill(page, { company: "Fabrikam Cloud", role: "Senior Product Designer", jd: fixture("J1_match.txt"), resume: fixture("R5_plain_titlecase.txt") });
  await analyse(page);
  const sum = await page.textContent("#vaultSum");
  assert.match(sum, /^2Roles/);
  const facts = await page.$$eval("#vaultList .fact", fs => fs.map(f => f.textContent).join("|"));
  assert.match(facts, /Product Designer/); assert.match(facts, /2020 – Present/); assert.match(facts, /Junior Designer/);
  assert.match(await page.textContent("#vaultList"), /Acme Retail/);
  assert.match(await page.textContent("#vaultList"), /Redesigned the basket page/);
  const vaultPart = calls.ai[0].split("EVIDENCE VAULT")[1].split("TASKS")[0];
  assert.match(vaultPart, /R1 \[role\]/); assert.match(vaultPart, /E1 \[ach at R1\]/); assert.match(vaultPart, /D1 \[edu\]/);
});

test("BUG-009: the built-in sample still parses exactly as before", async () => {
  const { page } = await openApp();
  await page.click("#loadExample");
  await analyse(page);
  assert.match(await page.textContent("#vaultSum"), /^3Roles · facts locked13Achievement records/);
});
