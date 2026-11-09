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

test("BYOK: a user's OpenAI key is used for one request and is never returned", async () => {
  const realFetch = globalThis.fetch;
  let auth = "";
  globalThis.fetch = async (_url, init) => {
    auth = init.headers.authorization;
    return new Response(JSON.stringify({ output_text: '{"ok":"byok"}' }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const key = "sk-user-owned-test-key-123456789";
    const res = await worker.fetch(post("/api/ai", { prompt: PROMPT, provider: "openai" }, { "x-truthfit-openai-key": key }), env({ AI: undefined, AI_PROVIDER_ORDER: "openai" }));
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(auth, `Bearer ${key}`);
    assert.equal(body.text, '{"ok":"byok"}');
    assert.doesNotMatch(JSON.stringify(body), /sk-user-owned/);
  } finally { globalThis.fetch = realFetch; }
});

test("vacancy URL: extracts JobPosting structured data", async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(`<html><title>Designer at Acme</title><script type="application/ld+json">{"@type":"JobPosting","title":"Product Designer","description":"Lead product design across several customer-facing workflows. Partner with engineers, conduct user research, build prototypes, and measure outcomes for a growing SaaS platform."}</script></html>`, { headers: { "content-type": "text/html" } });
  try {
    const res = await worker.fetch(post("/api/extract-url", { url: "https://jobs.example.com/designer" }), env());
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.match(body.text, /Lead product design/);
    assert.equal(body.url, "https://jobs.example.com/designer");
  } finally { globalThis.fetch = realFetch; }
});

test("vacancy URL: blocks private and local network targets", async () => {
  for (const url of ["http://localhost/job", "http://127.0.0.1/job", "http://192.168.1.1/job", "http://10.0.0.2/job", "http://169.254.169.254/latest/meta-data"]) {
    const res = await worker.fetch(post("/api/extract-url", { url }), env());
    assert.equal(res.status, 422, url);
    assert.match((await res.json()).error, /Private or local/);
  }
});
