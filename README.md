# TruthFit — Evidence-backed résumé tailoring

**Tailor the evidence, not the truth.**

TruthFit is a truth-first ATS résumé workspace. It turns a candidate's résumé into a verified *evidence vault*, researches the role, maps every job requirement to real proof, and only proposes changes it can trace back to something the candidate has actually done. Every suggestion is checked for invented numbers, altered facts and generic AI-sounding language before it can be accepted.

Live analysis runs through a secure **Cloudflare Worker** with automatic provider fallback: Anthropic, OpenAI, then Cloudflare Workers AI. The interface follows Apple's Human Interface Guidelines in a white theme.

---

## Quick start

For the deployed app:

1. Install dependencies with `npm install`.
2. Run `npm run dev` for a local Worker preview.
3. Click **Load Keka example**, then **Build Evidence Vault**, and step through the seven screens.

To publish it as a website, turn on **GitHub Pages**: open the repository's **Settings → Pages**, set **Source** to *Deploy from a branch*, pick **main** and **/ (root)**, then **Save**. The site appears at `https://<owner>.github.io/<repo>/` within a minute or two.

> **About the AI engine:** the Worker keeps provider keys server-side. Cloudflare Workers AI works through the `AI` binding with no browser key. Optional `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` secrets enable those providers; `AI_PROVIDER_ORDER` controls fallback order.

---

## The seven steps

| Step | What happens |
|---|---|
| **1. Import** | Company, role, job description and résumé (paste, or upload PDF / Word / text — read in the browser), plus optional extra evidence, a portfolio/LinkedIn link, length, region and tone. |
| **2. Evidence Vault** | The résumé becomes numbered evidence records (`R1` roles, `E1` achievements, `T1` skills, `D1` education, `X1` extra evidence). Employers, titles, dates and degrees are **locked**. The candidate confirms each record. |
| **3. Role Intelligence** | The vacancy is classified (occupation family, seniority, function, industry, region) and can be corrected. A role benchmark pack loads, and company research is shown with **source, date checked and confidence** — labelled as vacancy requirement, role benchmark, company signal, industry trend or unverified inference. |
| **4. Evidence Map** | Each requirement shows proven / partial / gap, direct or transferable evidence, confidence, freshness and credential or experience gates. Gaps are closed inline with a **gap interview**: AI-recommended statements with `[blanks]` for facts only the candidate knows, plus a live answer-strength meter. |
| **5. Strategy** | Conservative, Balanced, Career change, Executive, Technical, Creative or Academic — changes which suggestions appear and how they're framed, never the truth rules. |
| **6. Review** | Every proposed change shows before/after, why, where the idea came from, the vault records it cites and what it targets. Accept, edit or reject — with Undo. |
| **7. Design & Test** | Output classes (Portal Safe, Recruiter Modern, Human/Portfolio), customisable templates with saved personal templates, a **parse test** that reads the résumé back like an ATS, the **TruthFit Readiness Score** across 8 dimensions, an authenticity check, cover letter, exports and version history. |

## Guardrails (applied to every suggestion, including the AI's)

- **Fabrication alarm** — any number not found in the vault blocks the change until it is edited.
- **Fact locks** — changes that alter a locked title, employer, date or qualification cannot be accepted.
- **Authenticity check** — flags generic phrases, unsupported superlatives, AI-sounding patterns, copying the job ad word for word, and overlong bullets.
- **Privacy shield** — email and phone are removed before anything reaches the AI and restored on export.
- **Transparent scoring** — the Readiness Score is explicitly *not* an employer's ATS score; all 8 dimensions and their before/after values are shown.

## AI engine

| Option | Status |
|---|---|
| **Anthropic** | Enabled when `ANTHROPIC_API_KEY` is configured. Model is configurable with `ANTHROPIC_MODEL`. |
| **OpenAI** | Enabled when `OPENAI_API_KEY` is configured. Model is configurable with `OPENAI_MODEL`. |
| **Cloudflare Workers AI** | Enabled by default through the `AI` binding. Model is configurable with `WORKERS_AI_MODEL`. |
| **Offline engine** | Always available. Deterministic matching and all guardrails, with no data leaving the browser. |

The Worker endpoint is `POST /api/ai`; model availability is exposed without secrets at `GET /api/models`. The prompt (`aiPrompt()`) and response mapper (`applyAI()`) remain model-agnostic, and the guardrails run in the browser regardless of which model answers.

## Project structure

```
index.html          The complete app — open this file. Built from src/.
src/head.html       Page head and all styles (Apple HIG design layer + résumé paper styles).
src/body.html       Screens, sheets and the icon set.
src/app.js          All logic: vault parser, role engine, evidence map, AI integration,
                    guardrails, parse test, scoring, templates, exports.
scripts/build.sh    Rebuilds index.html from src/ after you edit any source file.
docs/PRODUCT.md     Product positioning, research basis and roadmap.
```

After editing anything in `src/`, run:

```sh
sh scripts/build.sh
```

## Browser storage

Saved templates, résumé versions and the free-analysis counter live in the browser's local storage only. Nothing is sent to a server by this page except the AI request described above.

## Status

This is a working prototype. Not yet built: Word (.docx) export, re-parsing the exported file itself, live company research for any employer (only the Keka example includes researched signals), payments, and accounts.
