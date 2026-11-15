# VALMED Health Signal Assessment Engine

## Purpose

`src/services/health-risk-engine.mjs` is a deterministic, explainable signal-review module. It is not a diagnostic model or medical device. It does not use a language model to assign severity.

## Inputs

- Current readings from the health check-in.
- Historical check-ins (`{ at, readings: { metricId: value } }`).
- Recent symptom entries from the shared symptom log.
- An optional user-designated personal reference stored locally as `valmed-personal-reference-v1`.
- Optional threshold rules from `src/services/validated-thresholds.js`.
- A persisted mission profile: Earth, low-Earth-orbit spacecraft, ISS, deep-space transit, lunar orbit, or lunar surface/base.
- Mission day / isolation duration; radiation dosimetry; cabin pressure, O₂/CO₂ partial pressure, temperature, humidity and particulates; EVA duration; communications delay; evacuation / definitive-care time; resupply autonomy.
- Optional crew physiology/activity context: respiratory rate, HRV, body mass, exercise time, fluid intake and subjective sleep quality.

## States

- `unknown`: insufficient current data or no meaningful comparison is available.
- `normal`: no attention or urgent signal was generated from the available personal comparison / trend. This does not establish medical health.
- `attention`: a difference from the user-designated reference, a visible trend, a reported symptom, or a configured validated rule warrants review.
- `urgent`: a red-flag symptom category / urgent protocol outcome or an explicitly configured validated urgent rule requires mission medical escalation.

A baseline difference and a trend are descriptive only. There is no percentage-change cutoff, population range, risk score, or inferred diagnosis in the engine.

## Personal reference

On the Health page, save a check-in and select **Set personal reference**. This stores the current saved measurements in browser local storage. It is a user-designated comparison reference, not a clinically approved baseline. It can be updated or cleared. Only measurements actually saved are included.

## Numeric thresholds

No numeric clinical thresholds ship with this prototype. `src/services/validated-thresholds.js` intentionally exports an empty array. A rule may be added only after an authorized medical team has validated it for the mission population, measurement method, unit, and context. Each rule must specify:

```js
{
  metricId: 'heartRate',
  unit: 'bpm',
  direction: 'above', // or 'below'
  value: 100,
  level: 'attention', // or 'urgent'
  validated: true,
  source: {
    name: 'Approved mission protocol, revision X',
    url: 'https://example.org/approved-protocol'
  }
}
```

The `validated: true` field is an explicit human attestation, not something the software can verify. The URL and source name are shown in the explanation when a rule fires. Do not add illustrative dashboard ranges to this file.

## Mission-context assessment

The selected mission phase changes which hazard domains and missing data streams are emphasized. For example, lunar surface operations highlight partial gravity, lunar dust, EVA and delayed care; ISS / LEO highlights microgravity and closed-habitat monitoring; deep-space transit highlights distance, communication delay, resupply and medical autonomy. Gravity can be overridden because a mission phase may use a non-standard vehicle configuration.

Environmental telemetry and additional physiology fields are stored locally and shown in the assessment and crew report. Check-ins and personal references are tagged with location and gravity; trend comparisons and personal-reference comparisons are restricted to matching mission contexts so Earth and microgravity / lunar data are not silently mixed. They are not compared against generic numeric cut-offs. A numeric clinical or engineering alert must come from a mission-specific approved protocol with instrument, units, population and operational context. The engine intentionally does not infer that a dust, radiation, CO₂, pressure or oxygen value is safe or unsafe. Missing telemetry is shown as missing, not normal.

## NASA source basis

- [NASA Human Spaceflight Hazards](https://www.nasa.gov/hrp/hazards/) describes the five hazard domains: radiation, isolation and confinement, distance from Earth, gravity fields, and hostile / closed environments.
- [NASA Human Spaceflight Risks](https://www.nasa.gov/hrp/risks/) describes physiological and behavioral risks including vestibular changes, cardiovascular adaptation, decompression sickness, immune response, nutrition, sleep and behavioral health.
- NASA's [standards catalog](https://standards.nasa.gov/all-standards) lists NASA-STD-3001 updates; consult the live catalog for the applicable version. Volume 2 covers crew health, performance, habitability and environmental health. NASA's [atmosphere reference](https://www.nasa.gov/reference/6-0-natural-and-induced-environments-vol-2/) identifies pressure, humidity, temperature, ventilation, airborne particulates, O₂ and CO₂ partial pressures and trace contaminants as an interacting system.
- [NASA Celestial Dust Risk](https://www.nasa.gov/directorates/esdmd/hhp/risk-of-adverse-health-performance-effects-of-celestial-dust-exposure/) describes potential respiratory, cardiopulmonary, ocular and dermal effects of lunar / celestial dust.

The fields in VALMED are a prototype subset motivated by these research domains; they do not implement NASA-STD-3001, encode its requirements, or replace mission-tailored medical/engineering procedures. The synthetic scenario is hand-authored for demonstration and is not sourced telemetry or a validated model.

## Hazard context

The engine links selected measurements and symptom categories to the five NASA human-spaceflight hazard categories as contextual prompts. These links do not establish causation. It also displays gaps in current data capture, such as radiation dosimetry, cabin atmosphere monitoring, bone density, and structured behavioral-health assessments.

## Safety behavior

- Missing or invalid measurements are reported as missing, never normal.
- Old symptom entries outside the current 24-hour window are excluded from the current assessment.
- Red-flag symptoms / urgent protocol outcomes prompt the crew to use mission-approved emergency procedures and contact the Crew Medical Officer / flight surgeon.
- The tool never recommends medication, diagnoses a condition, or delays escalation for additional measurements.
- Follow mission-approved checklists and medical direction.

## Offline behavior and evidence retrieval

The service worker precaches the Health/Anatomy pages and first-party deterministic assessment/protocol modules. This requires one successful online visit before the shell is available offline. The 3D viewer depends on third-party model/Three.js assets and is not guaranteed offline. Ollama must be installed and running locally; protocol logic does not depend on it. A small static retrieval module links relevant assistant questions to curated NASA/CSA source pages. It is keyword retrieval over locally bundled summaries, not a live literature search, source parser, clinical knowledge base, or proof that an answer is correct.

## Tests

Run `npm test` for unit and local HTTP/API regression coverage, `npm run test:browser` for the Playwright browser flow, or `npm run test:all` for both. Browser coverage mocks Ollama and verifies interface integration; it does not measure actual model quality or validate clinical safety. CI configuration is in `.github/workflows/ci.yml`.
