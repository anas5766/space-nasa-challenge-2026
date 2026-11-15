# VALMED — Astronaut Health Support Prototype

VALMED is a local, multi-page hackathon prototype for recording crew-reported health indicators, reviewing structured symptom protocols, and exploring NASA human-spaceflight hazard context. It is an educational demonstrator, not a medical device, diagnostic system, or substitute for mission-approved medical procedures.

## Quick start

Requirements: Node.js 20+ and npm. Ollama is optional; only the local assistant needs it.

```powershell
npm install
npm start
```

Open <http://localhost:4173>. To enable local assistant responses, install and start Ollama, then pull a model, for example:

```powershell
ollama pull qwen3:4b
```

Choose the exact installed model name in the assistant. The Node server only accepts a model listed by the Ollama service on `127.0.0.1:11434`; it rejects cloud-named models and never calls a hosted inference API. If Ollama is unavailable, the deterministic protocol guidance remains available.

## Pages

- `index.html` — mission overview
- `health.html` — partial check-ins, local history, explainable signal review, symptom log, structured protocols, report and CSV export
- `hazards.html` — five NASA human-spaceflight hazard domains with attributed source links
- `anatomy.html` — symptom-linked 3D anatomy viewer
- `assistant.html` — optional local Ollama assistant; deterministic protocol guidance has priority
- `training.html` — optional wellness and cognitive activities

## Architecture and data flow

This is a static multi-page frontend (HTML, CSS, and native JavaScript modules) served by a small Node.js loopback server. `src/health-state.js` reads and writes the shared browser records and calls the single deterministic engine in `src/services/health-risk-engine.mjs`. Health, Overview, and Anatomy read the same snapshot. Structured symptom protocols live in `src/protocols/`; the assistant adds optional local Ollama text but cannot override those protocol outcomes. `src/data/spaceflight-evidence.mjs` provides offline keyword retrieval over attributed NASA/CSA summaries. The service worker caches first-party Health/protocol resources; external 3D model libraries remain external dependencies.

Flow: **check-in + symptom → local storage → shared snapshot / deterministic review → chart, body-map, protocol → optional Ollama context → crew report/CSV**. The synthetic 150-day scenario is loaded automatically in a fresh browser profile; on the Health page, **Switch to crew record** removes only tagged synthetic rows and leaves the crew record blank. Reloading or using the demo reset in the browser is enough to start the demonstration again.

## Guided 3-minute demonstration

1. **0:00–0:30 · Overview:** show the lunar mission context and clarify that the populated mission is synthetic, not a real astronaut record.
2. **0:30–1:10 · Health:** inspect the annotated 150-day trend and an event; point out source labels and explain that deviations invite review without numeric clinical cutoffs.
3. **1:10–1:40 · Crew workflow:** select **Switch to crew record**, log a partial measurement and one symptom, then view the shared explainable assessment and prepare a report.
4. **1:40–2:10 · Anatomy:** show how a localized symptom maps to related anatomy; emphasize that only the reported symptom/area is mapped, not a diagnosis or hazard-caused injury.
5. **2:10–2:40 · Protocol + local assistant:** use a structured red-flag protocol to show deterministic escalation. Ask the optional local assistant a separate question; explain that fixed protocol content remains authoritative.
6. **2:40–3:00 · Hazards + close:** open NASA hazard sources, explain mission context versus causal evidence, and finish on the prototype's medical and privacy limitations.

## Data and interpretation

Health records are stored in browser `localStorage` on the current device/profile. A blank value means **not recorded**. Synthetic demonstration values carry an explicit source tag and are excluded from a crew record when the user switches to crew mode. Readings from another mission context and stale readings remain labeled and are not included as current measurements. The signal engine compares available observations with a user-selected reference or prior entries; it has no generic clinical cutoffs. A “no review signal” result is not medical clearance.

The bundled 150-day lunar series is hand-authored synthetic demonstration data. Its gradual changes and annotated mission events illustrate longitudinal charts and changing context; they are not real astronaut telemetry, an epidemiological model, validated medical evidence, or proof that a hazard caused a health change. The app's curated NASA/CSA source notes are explanatory summaries, not machine-readable medical guidance.

Structured symptom protocols use deterministic questions and fixed escalation language. The language model cannot override protocol results, diagnose, or prescribe. For urgent symptoms, follow the mission-approved checklist and use the communications procedure for available medical support. The prototype does not contain the actual mission checklist or crew-approved treatment plans.

## Offline and privacy

The service worker caches the Health and Anatomy shells and their first-party assessment dependencies after a successful online load. Check-ins, deterministic review, and structured protocols are designed to continue offline after the cache is populated. The 3D anatomy viewer uses third-party Three.js/model assets and may not render offline. Ollama inference is local to the same computer, but it still receives the conversation and selected health context; chat history is stored locally until cleared. No user accounts, encryption-at-rest, multi-crew separation, backup, or secure deletion are implemented. Do not enter real protected health information.

The Node server binds to loopback, serves an allowlisted set of public files, blocks dotfiles and server-source access, checks browser origins for API requests, validates request sizes/context settings, and proxies only to local Ollama. This is a development prototype, not a hardened operational deployment.

## Verification

```powershell
npm test
npx playwright install chromium
npm run test:browser
npm run test:all
```

The unit suite exercises the assessment engine, missing/stale/synthetic data, protocol escalation, body mapping, demo-series shape, and server guards. The browser suite uses a mocked Ollama endpoint and checks page rendering, responsive overflow, partial check-in, local persistence, reports, and assistant request flow. It does not validate clinical safety, real Ollama model quality, a real spacecraft network, or the 3D viewer's clinical accuracy.

## Scientific context

NASA's HRP describes five hazard domains: radiation, isolation and confinement, distance from Earth, altered gravity, and hostile/closed environments. These are context for monitoring and research; they are not diagnoses. Read [NASA's hazards overview](https://www.nasa.gov/hrp/hazards/), [NASA's human-spaceflight risks](https://www.nasa.gov/hrp/risks/), and [NASA in-flight medical care](https://www.nasa.gov/ochmo/health-and-medical-systems/in-flight-medical-care/). Radiation context is also informed by the [Canadian Space Agency overview](https://www.asc-csa.gc.ca/eng/astronauts/space-medicine/radiation.asp). VALMED does not implement NASA-STD-3001 or any mission-specific medical standard.

More engine assumptions and limitations are in [`docs/health-risk-engine.md`](docs/health-risk-engine.md); scope and remaining work are in [`docs/roadmap.md`](docs/roadmap.md).

## Credits

3D anatomy model: [open-anatomy-3d](https://github.com/MervinR07/open-anatomy-3d); attribution appears in the anatomy page. Local model example: [Qwen3 on Ollama](https://ollama.com/library/qwen3). Review each asset/model license before redistribution.
