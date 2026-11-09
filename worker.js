const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const SECURITY_HEADERS = {
  "content-security-policy": "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self' data:; worker-src 'self' blob: https://cdnjs.cloudflare.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
};

function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: JSON_HEADERS });
}

function available(env) {
  return {
    anthropic: Boolean(env.ANTHROPIC_API_KEY),
    openai: Boolean(env.OPENAI_API_KEY),
    workersAi: Boolean(env.AI),
    qwen: Boolean(env.AI),
    kimi: Boolean(env.AI && env.ENABLE_KIMI === "true"),
  };
}

async function runAnthropic(prompt, env) {
  const model = env.ANTHROPIC_MODEL || "claude-opus-5";
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: 8000, temperature: 0.2, messages: [{ role: "user", content: prompt }] }),
  });
  if (!response.ok) throw new Error(`Anthropic returned ${response.status}`);
  const data = await response.json();
  return { text: (data.content || []).filter(x => x.type === "text").map(x => x.text).join("\n"), model, provider: "Anthropic" };
}

async function runOpenAI(prompt, env) {
  const model = env.OPENAI_MODEL || "gpt-5.6";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model, input: prompt, max_output_tokens: 8000 }),
  });
  if (!response.ok) throw new Error(`OpenAI returned ${response.status}`);
  const data = await response.json();
  const text = data.output_text || (data.output || []).flatMap(x => x.content || []).filter(x => x.type === "output_text").map(x => x.text).join("\n");
  return { text, model, provider: "OpenAI" };
}

async function runWorkersAI(prompt, env, requested = "workers") {
  const models = {
    qwen: env.QWEN_MODEL || "@cf/qwen/qwen3.8-27b",
    kimi: env.KIMI_MODEL || "@cf/moonshotai/kimi-k2.7-code",
    workers: env.WORKERS_AI_MODEL || "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  };
  const model = models[requested] || models.workers;
  const wantsJson = /Reply with ONLY one JSON object/i.test(prompt);
  // Reasoning models spend part of max_tokens thinking; 1600 left no room for the JSON answer (BUG-001).
  const input = { messages: [{ role: "system", content: "Return exactly the requested format. Be factual and concise." }, { role: "user", content: prompt }], max_tokens: wantsJson ? 6000 : 2000, temperature: 0, reasoning_effort: "low" };
  if (wantsJson) input.response_format = { type: "json_object" };
  const data = await env.AI.run(model, input);
  const output = typeof data === "string" ? data : data.response ?? data.output_text ?? data.choices?.[0]?.message?.content ?? data.result?.response;
  if (output == null || output === "") throw new Error(`${model} returned no answer text (output budget used up)`);
  const label = requested === "qwen" ? "Qwen via Workers AI" : requested === "kimi" ? "Kimi via Workers AI" : "Cloudflare Workers AI";
  return { text: typeof output === "string" ? output : JSON.stringify(output), model, provider: label };
}

function aiText(data) {
  const output = typeof data === "string" ? data : data.response ?? data.output_text ?? data.choices?.[0]?.message?.content ?? data.result?.response;
  return typeof output === "string" ? output.trim() : output == null ? "" : JSON.stringify(output);
}

async function runVisionOcr(image, kind, page, env) {
  if (!env.AI) throw new Error("Workers AI is not configured");
  const model = env.OCR_MODEL || env.QWEN_MODEL || "@cf/qwen/qwen3.8-27b";
  const label = kind === "jd" ? "job description" : kind === "extra" ? "supporting evidence" : "résumé";
  const prompt = `Transcribe every visible word from page ${page || 1} of this ${label}. Preserve reading order, headings, bullets, dates, numbers, names, and line breaks. Do not summarize, rewrite, correct, infer, or describe the page. Return only the transcription. If no text is visible, return exactly [NO TEXT].`;
  const data = await env.AI.run(model, {
    messages: [
      { role: "system", content: "You are a precise document OCR engine. Output only text visible in the supplied page image." },
      { role: "user", content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}` } },
      ] },
    ],
    max_tokens: 6000,
    temperature: 0,
    reasoning_effort: "low",
  });
  const text = aiText(data);
  if (!text) throw new Error("The vision model returned no text");
  return { text: text === "[NO TEXT]" ? "" : text, model, provider: "Qwen Vision via Workers AI" };
}

async function runAI(prompt, requested, env) {
  const order = requested && requested !== "auto" ? [requested] : String(env.AI_PROVIDER_ORDER || "anthropic,openai,qwen,kimi,workers").split(",").map(x => x.trim());
  const errors = [];
  const tried = [];
  for (const provider of order) {
    try {
      let result = null;
      if (provider === "anthropic" && env.ANTHROPIC_API_KEY) result = await runAnthropic(prompt, env);
      else if (provider === "openai" && env.OPENAI_API_KEY) result = await runOpenAI(prompt, env);
      else if (provider === "kimi" && env.AI && env.ENABLE_KIMI === "true") result = await runWorkersAI(prompt, env, "kimi");
      else if (["workers","workersAi","qwen"].includes(provider) && env.AI) result = await runWorkersAI(prompt, env, provider === "workersAi" ? "workers" : provider);
      if (result) return tried.length ? { ...result, fallbackFrom: tried.join(", ") } : result;
    } catch (error) { errors.push(error.message); tried.push(provider); console.error("AI provider failed", provider, error.message); }
  }
  throw new Error(errors.join("; ") || "No AI provider is configured");
}

const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;
// Only TruthFit's own prompts are proxied, so the endpoint can't be used as a general-purpose AI (BUG-007).
const ALLOWED_PROMPT = /^(You are the analysis engine of TruthFit|Write a concise cover letter)/;
const PROVIDERS = new Set(["auto", "anthropic", "openai", "qwen", "kimi", "workers", "workersAi"]);

async function guard(request, env, url) {
  const origin = request.headers.get("origin");
  if (!origin || (origin !== url.origin && !LOCAL_ORIGIN.test(origin))) return json({ error: "Requests must come from the TruthFit app" }, 403);
  if (env.RATE_LIMITER) {
    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    const { success } = await env.RATE_LIMITER.limit({ key: `${ip}:${url.pathname}` });
    if (!success) return json({ error: "Too many requests — wait a minute and try again" }, 429);
  }
  return null;
}
async function readJson(request) {
  try { return await request.json(); } catch { return undefined; }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname.startsWith("/api/")) {
      const blocked = await guard(request, env, url);
      if (blocked) return blocked;
    }
    if (url.pathname === "/api/models" && request.method === "GET") return json({
      available: available(env),
      default: env.AI_PROVIDER_ORDER || "anthropic,openai,qwen,kimi,workers",
      notes: { kimi: env.ENABLE_KIMI === "true" ? "enabled" : "Set ENABLE_KIMI=true after enabling paid Workers AI access" },
      models: {
        anthropic: env.ANTHROPIC_MODEL || "claude-opus-5",
        openai: env.OPENAI_MODEL || "gpt-5.6",
        qwen: env.QWEN_MODEL || "@cf/qwen/qwen3.8-27b",
        kimi: env.KIMI_MODEL || "@cf/moonshotai/kimi-k2.7-code",
        workers: env.WORKERS_AI_MODEL || "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
      }
    });
    if (url.pathname === "/api/ai" && request.method === "POST") {
      try {
        const body = await readJson(request);
        if (body === undefined) return json({ error: "The request body must be valid JSON" }, 400);
        if (!body || typeof body.prompt !== "string" || body.prompt.length < 20) return json({ error: "A prompt is required" }, 400);
        if (!ALLOWED_PROMPT.test(body.prompt)) return json({ error: "Only TruthFit analysis and cover-letter prompts are accepted" }, 400);
        if (body.prompt.length > 65000) return json({ error: "Prompt is too large" }, 413);
        const provider = PROVIDERS.has(body.provider) ? body.provider : "auto";
        return json(await runAI(body.prompt, provider, env));
      } catch (error) { console.error("AI request failed", error.message); return json({ error: "The AI service couldn't answer. Try again in a minute." }, 502); }
    }
    if (url.pathname === "/api/ocr" && request.method === "POST") {
      try {
        const body = await readJson(request);
        if (!body || typeof body.image !== "string" || !/^[A-Za-z0-9+/=]+$/.test(body.image)) return json({ error: "A base64 page image is required" }, 400);
        if (body.image.length > 5_500_000) return json({ error: "Page image is too large for OCR" }, 413);
        return json(await runVisionOcr(body.image, body.kind, body.page, env));
      } catch (error) { console.error("OCR request failed", error.message); return json({ error: "The OCR service couldn't read this page. Try another file or paste the text." }, 502); }
    }
    if (url.pathname === "/api/extract-file" && request.method === "POST") {
      try {
        if (!env.AI) return json({ error: "Workers AI is not configured" }, 503);
        const form = await request.formData();
        const file = form.get("file");
        if (!(file instanceof File)) return json({ error: "A PDF file is required" }, 400);
        if (file.size > 10 * 1024 * 1024) return json({ error: "File is larger than 10 MB" }, 413);
        const result = await env.AI.toMarkdown(
          { name: file.name || "document.pdf", blob: file },
          { conversionOptions: { output: { format: "text" }, pdf: { metadata: false } } },
        );
        const item = Array.isArray(result) ? result[0] : result;
        if (!item || item.format === "error") throw new Error(item?.error || "Cloudflare could not parse this PDF");
        return json({ text: String(item.data || "").trim(), parser: "Cloudflare document conversion" });
      } catch (error) { console.error("Document conversion failed", error.message); return json({ error: "This document could not be recovered. Export a fresh unlocked PDF or paste the text." }, 422); }
    }
    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  },
};
