import assert from "node:assert/strict";

const base = (process.env.TRUTHFIT_URL || "https://truthfitresume.antara-roychowdhury13.workers.dev").replace(/\/$/, "");
const request = async (path, options) => {
  const headers = options?.method === "POST" ? { origin: base, ...(options.headers || {}) } : options?.headers;
  const response = await fetch(base + path, { ...options, headers, signal: options?.signal || AbortSignal.timeout(120_000) });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { response, body };
};

const home = await request("/");
assert.equal(home.response.status, 200);
assert.match(home.body, /TruthFit/);
assert.match(home.body, /Qwen Vision OCR/);

const models = await request("/api/models");
assert.equal(models.response.status, 200);
assert.equal(models.body.available.workersAi, true);
assert.match(models.body.models.qwen, /qwen3\.8-27b/);

const missingPrompt = await request("/api/ai", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
assert.equal(missingPrompt.response.status, 400);
assert.match(missingPrompt.body.error, /prompt/i);

const foreign = await fetch(base + "/api/ai", { method: "POST", headers: { "content-type": "application/json", origin: "https://evil.example" }, body: JSON.stringify({ prompt: "You are the analysis engine of TruthFit. test" }) });
assert.equal(foreign.status, 403);

const missingImage = await request("/api/ocr", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
assert.equal(missingImage.response.status, 400);
assert.match(missingImage.body.error, /image/i);

const form = new FormData();
form.append("file", new File(["not a pdf"], "broken.pdf", { type: "application/pdf" }));
const brokenPdf = await request("/api/extract-file", { method: "POST", body: form });
assert.ok([200, 422].includes(brokenPdf.response.status));
if (brokenPdf.response.status === 200) assert.equal(String(brokenPdf.body.text || "").trim(), "");

if (process.env.RUN_AI === "1") {
  const ai = await request("/api/ai", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: "You are the analysis engine of TruthFit. Reply with exactly the word READY and nothing else.", provider: "qwen" }) });
  assert.equal(ai.response.status, 200);
  assert.match(ai.body.text, /READY/i);
  assert.match(ai.body.model, /qwen3\.8-27b/);

  const jsonAi = await request("/api/ai", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: "You are the analysis engine of TruthFit. Reply with ONLY one JSON object, no prose: {\"status\":\"READY\"}", provider: "qwen" }) });
  assert.equal(jsonAi.response.status, 200);
  assert.equal(JSON.parse(jsonAi.body.text).status, "READY");
}

console.log(`TruthFit live smoke tests passed against ${base}`);
