# VALMED scope and next steps

## What the prototype currently demonstrates

- Multi-page crew interface with responsive shared navigation and reduced-motion styling.
- Local check-ins, trend history, symptom notes, CSV export, and a user-designated reference stored in browser local storage.
- Explicit provenance states for user-entered, synthetic, stale, other-context, and missing readings.
- Deterministic, explainable comparisons and symptom protocols. The model assistant is supplemental and cannot replace fixed protocol guidance.
- Mission-context prompts for NASA's five hazard domains and attributed NASA/CSA reading links.
- Synthetic 150-day lunar scenario with changing, clearly labeled demo telemetry and annotated events.
- Local Ollama proxy with model verification, payload bounds, loopback binding, origin checks and a static-file allowlist.
- Offline shell cache for first-party health/protocol resources after initial online load, plus unit/API and Playwright UI tests.

## Important limits

- VALMED is not validated for flight or clinical use, and does not implement NASA-STD-3001 or a crew-approved medical checklist.
- No treatment or medication protocol is included. Red-flag symptoms route to generic emergency escalation language and mission-approved procedures.
- There is no authenticated user/crew separation, encryption-at-rest, secure deletion, export access control, or server-side audit record.
- Clinical thresholds, population norms, and validated causal models are absent by design. Environmental measurements are contextual and not graded generically.
- The 3D viewer and local Ollama responses have not been validated as medical instruments. Third-party 3D assets may be unavailable offline.

## Highest-value next work

1. Obtain review from aerospace medicine, flight surgeons, human factors, and mission operations for every symptom protocol and escalation branch.
2. Load only authorized, versioned, mission-specific procedures with source provenance, crew role/access rules, and offline update validation.
3. Establish a validated measurement dictionary: device, method, unit, timing, population, context, uncertainty, quality checks, and clinician-approved interpretation.
4. Add privacy/security architecture for multi-crew use, encrypted storage, identity and role separation, consent, retention and secure export/deletion.
5. Test with representative crew users, assistive technology, degraded connectivity, emergency workflows, and validated medical scenarios; keep audit evidence and sign-off records.
