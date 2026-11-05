const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: JSON_HEADERS });
}

function available(env) {
  return {
    anthropic: Boolean(env.ANTHROPIC_API_KEY),
    openai: Boolean(env.OPENAI_API_KEY),
    workersAi: Boolean(env.AI),
  };
}

async function runAnthropic(prompt, env) {
  const model = env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929";
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
  const model = env.OPENAI_MODEL || "gpt-5-mini";
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

async function runWorkersAI(prompt, env) {
  const model = env.WORKERS_AI_MODEL || "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
  const data = await env.AI.run(model, { messages: [{ role: "system", content: "Return exactly the requested format. Be factual and concise." }, { role: "user", content: prompt }], max_tokens: 8000, temperature: 0.2 });
  const output = typeof data === "string" ? data : data.response;
  return { text: typeof output === "string" ? output : JSON.stringify(output), model, provider: "Cloudflare Workers AI" };
}

async function runAI(prompt, requested, env) {
  const order = requested && requested !== "auto" ? [requested] : String(env.AI_PROVIDER_ORDER || "anthropic,openai,workers").split(",").map(x => x.trim());
  const errors = [];
  for (const provider of order) {
    try {
      if (provider === "anthropic" && env.ANTHROPIC_API_KEY) return await runAnthropic(prompt, env);
      if (provider === "openai" && env.OPENAI_API_KEY) return await runOpenAI(prompt, env);
      if ((provider === "workers" || provider === "workersAi") && env.AI) return await runWorkersAI(prompt, env);
    } catch (error) { errors.push(error.message); }
  }
  throw new Error(errors.join("; ") || "No AI provider is configured");
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/models" && request.method === "GET") return json({ available: available(env), default: env.AI_PROVIDER_ORDER || "anthropic,openai,workers" });
    if (url.pathname === "/api/ai" && request.method === "POST") {
      try {
        const body = await request.json();
        if (!body || typeof body.prompt !== "string" || body.prompt.length < 20) return json({ error: "A prompt is required" }, 400);
        if (body.prompt.length > 65000) return json({ error: "Prompt is too large" }, 413);
        return json(await runAI(body.prompt, body.provider || "auto", env));
      } catch (error) { return json({ error: error.message || "AI request failed" }, 502); }
    }
    return env.ASSETS.fetch(request);
  },
};
