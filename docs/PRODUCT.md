# TruthFit — Product notes

## Positioning

TruthFit is not another AI résumé builder. It is an **evidence-backed career application workspace** that researches the role, verifies the candidate's claims, builds an ATS-safe résumé and explains every recommendation.

The differentiation is **role intelligence + truth verification + transparent scoring**, with résumé design as a supporting capability.

## Problems it targets (to validate with users)

These come from published surveys and are hypotheses for TruthFit's own research, not findings about TruthFit users.

- Tailoring is slow and candidates are unsure what to change; some worry about stretching the truth.
- Candidates distrust opaque AI evaluation — TruthFit shows what was detected, why, where the evidence came from and how confident it is.
- AI-written résumés risk sounding generic — TruthFit runs an authenticity check on every change.
- A single "ATS score" is oversimplified — TruthFit shows eight dimensions and labels the composite a *Readiness Score*.
- Formatting advice is contradictory — TruthFit parse-tests the actual layout instead of repeating rules.

## Architecture

1. **Universal résumé model** — every claim stored as a structured evidence record with source and confirmation status.
2. **Occupational ontology** — vacancies classified by family, seniority, function, industry and region (modelled on public frameworks such as O\*NET and ESCO).
3. **Role packs** — benchmark expectations per role type. The prototype ships five: design leadership & product design, software & data, sales/marketing/customer success, operations & project management, and HR & recruitment. Packs never silently add requirements.
4. **Company context** — research insights with source, date and confidence.

## Plans (prototype pricing hypotheses)

| Plan | Price | For |
|---|---|---|
| Free | ₹0 | 3 analyses a month, core evidence map, Portal Safe templates |
| Job Search Pass | ₹1,199 / 30 days | Active search; no auto-renewal |
| 90-day Campaign | ₹2,999 / 90 days | A full search window, one price |
| Career Pro | ₹1,999 / month | Ongoing vault, multiple role tracks, outcome analytics |
| Coach & institution | Contact | Universities, bootcamps, outplacement firms, coaches |

## North-star metric

Percentage of serious applications completed with a verified, role-aligned résumé that receive a positive response.

Leading indicators: time from vacancy to application-ready résumé, share of claims linked to evidence, unsupported-claim rate, suggestion accept/edit/reject rates, parse accuracy, interview rate, and repeat use.

## Roadmap

- **Phase 1 — credible:** server-side AI connection for hosted deployments, Word export, post-export parse verification, structured evidence storage, version history, more role packs.
- **Phase 2 — cross-industry:** full O\*NET/ESCO integration, 12 occupation families, career-change translation, credential gates, locale conventions, live cited company research.
- **Phase 3 — data moat:** submission and outcome tracking, privacy-safe learning about which recommendations correlate with interviews, expert-certified role packs, coach and university dashboards.

## Known risks

Shallow results if "all roles" ships before role packs mature; unverifiable internet résumé examples; stale company research; false confidence from a composite score; keyword stuffing; privacy obligations for career and outcome data; biased early outcome data.
