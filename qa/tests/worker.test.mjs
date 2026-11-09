// Worker-level regression tests (BUG-001, BUG-007, BUG-023). Workers AI is mocked.
import { test } from "node:test";
import assert from "node:assert/strict";
import worker from "../../worker.js";

const ORIGIN = "https://truthfit.example";
const PROMPT = "You are the analysis engine of TruthFit. Reply with ONLY one JSON object, no prose: {}";

function env(overrides = {}) {
  const runs = [];
  return {
    runs,
    AI: { run: async (model, input) => { runs.push({ model, input }); return { response: '{"ok":true}' }; } },
    ASSETS: { fetch: async () => new Response("asset") },
    AI_PROVIDER_ORDER: "qwen,workers",
    ...overrides,
  };
}
const post = (path, body, headers = {}) => new Request(ORIGIN + path, {
  method: "POST", headers: { "content-type": "application/json", origin: ORIGIN, ...headers },
  body: typeof body === "string" ? body : JSON.stringify(body),
});

test("BUG-007: a request from another website is refused", async () => {
  const e = env();
  const res = await worker.fetch(post("/api/ai", { prompt: PROMPT }, { origin: "https://evil.example" }), e);
  assert.equal(res.status, 403);
  assert.equal(e.runs.length, 0);
});

test("BUG-007: a request with no Origin header is refused", async () => {
  const e = env();
  const req = new Request(ORIGIN + "/api/ai", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: PROMPT }) });
  assert.equal((await worker.fetch(req, e)).status, 403);
});

test("BUG-007: OCR and file extraction are origin-checked too", async () => {
  const e = env();
  assert.equal((await worker.fetch(post("/api/ocr", { image: "AAAA" }, { origin: "https://evil.example" }), e)).status, 403);
  assert.equal((await worker.fetch(post("/api/extract-file", "x", { origin: "https://evil.example" }), e)).status, 403);
});

test("BUG-007: prompts that are not TruthFit prompts are refused", async () => {
  const e = env();
  const res = await worker.fetch(post("/api/ai", { prompt: "Write one sentence about the history of tea, nothing else." }), e);
  assert.equal(res.status, 400);
  assert.equal(e.runs.length, 0);
});

test("BUG-007: the rate limiter is applied when bound", async () => {
  const e = env({ RATE_LIMITER: { limit: async () => ({ success: false }) } });
  const res = await worker.fetch(post("/api/ai", { prompt: PROMPT }), e);
  assert.equal(res.status, 429);
  assert.equal(e.runs.length, 0);
});

test("BUG-007: a same-origin TruthFit request still works", async () => {
  const e = env();
  const res = await worker.fetch(post("/api/ai", { prompt: PROMPT, provider: "qwen" }), e);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).text, '{"ok":true}');
});

test("BUG-001: JSON analysis gets enough output budget for a reasoning model", async () => {
  const e = env();
  await worker.fetch(post("/api/ai", { prompt: PROMPT, provider: "qwen" }), e);
  assert.ok(e.runs[0].input.max_tokens >= 4096, `max_tokens was ${e.runs[0].input.max_tokens}`);
});

test("BUG-001: an empty Qwen answer falls back quickly and reports which model answered", async () => {
  const e = env();
  e.AI.run = async (model, input) => { e.runs.push({ model, input }); return /qwen/.test(model) ? { choices: [{ message: { content: null, reasoning_content: "thinking…" } }] } : { response: '{"ok":1}' }; };
  const res = await worker.fetch(post("/api/ai", { prompt: PROMPT }), e);
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.match(body.model, /llama/);
  assert.match(body.fallbackFrom || "", /qwen/i, "the response must say a fallback happened");
});

test("BUG-023: malformed JSON is a 400 with a generic message", async () => {
  const res = await worker.fetch(post("/api/ai", "{bad"), env());
  assert.equal(res.status, 400);
  assert.doesNotMatch((await res.json()).error, /position|property name/);
});
