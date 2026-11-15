# Valmed — Mission Health

Valmed is a multi-page, locally run astronaut wellness prototype inspired by NASA's Human Research Program. It brings crew check-ins, spaceflight hazard context, an interactive anatomy viewer, an Ollama-powered local information assistant, and optional wellness mini-games into one presentation-ready experience.

## Run locally

Requirements: Node.js and Ollama. No npm packages are required.

1. Start Ollama. The assistant uses the Ollama service at `http://127.0.0.1:11434`.
2. Install a local model if one is not already available:

   ```bash
   ollama pull qwen3:4b
   ```

3. In the project directory, run:

   ```bash
   npm start
   ```

4. Open [http://localhost:4173](http://localhost:4173).

The pages are `index.html` (mission overview), `health.html` (readings, trends, symptoms and export), `hazards.html` (NASA/CSA research context), `anatomy.html` (interactive 3D model), `assistant.html` (local Ollama chat), and `training.html` (three optional mini-games).

## Features

- Collapsible, responsive navigation shared across all pages; orbital stars, animated planets, and low-motion support.
- Editable crew health readings with locally stored trends, symptom notes, and a CSV summary.
- Explainable, deterministic health-signal assessment comparing saved readings with a user-designated personal reference, describing trends, reviewing recent symptoms, and relating findings to the five spaceflight hazards. Missing data remains unknown; no clinical numeric thresholds are bundled.
- Mission-aware context for Earth, low-Earth-orbit spacecraft, the ISS, deep-space transit, lunar orbit and lunar surface/base. Captures gravity mode, mission duration, radiation dosimetry, cabin atmosphere, particulates / lunar dust, EVA exposure, crew physiology/activity, communications delay, evacuation time and resupply autonomy.
- Mission-tagged check-ins and personal references prevent Earth, microgravity and lunar measurements from being silently compared as if they were collected in the same environment.
- Configurable numeric rules are disabled by default and require explicit medical validation, matching units, and a named source. The assessment is not a diagnosis and escalates urgent symptom categories to mission-approved procedures.
- Interactive summaries of NASA's five human-spaceflight hazards, with direct NASA and Canadian Space Agency resources.
- Selectable 3D anatomy structures with colors associated with entered readings and symptom regions.
- Local assistant: a small Node server verifies each selected model against the installed local Ollama model list, rejects cloud models, and proxies requests to Ollama on the same computer. Conversation context stays in page memory for the current session and is not written to browser storage.
- Optional paced breathing, visual attention, and sequence-recall activities. Scores stay in browser storage.

## Health risk assessment

The deterministic assessment engine is documented in [`docs/health-risk-engine.md`](docs/health-risk-engine.md). The Health page now includes a mission profile and optional telemetry for radiation dose, cabin pressure and O₂/CO₂ partial pressures, temperature, humidity, particulates / lunar dust, EVA time, respiratory rate, HRV, body mass, exercise, fluid intake, sleep quality, isolation, communications delay, evacuation time and resupply autonomy. These are contextual inputs, not automatically graded against generic limits. The selected location and gravity change the hazards and prompts shown, and historical comparisons are kept within matching mission contexts. A personal reference can be set from saved check-in readings on the Health page; it is a user-designated comparison reference, not a clinical baseline. The engine describes deviations and trends without inventing population thresholds. The configurable threshold list in `src/services/validated-thresholds.js` is intentionally empty until an authorized medical team validates mission-specific rules. Run `npm test` to execute the assessment and symptom-protocol tests.

## Data and safety

Health readings and symptom notes are stored in this browser's `localStorage`. Ollama prompts and health context go to the local Ollama service through the Node server; they are not sent to a hosted AI service by this app. Conversation context remains in page memory for the current session and is not written to browser storage. The anatomy model and Three.js modules are loaded from public CDNs, so the 3D viewer needs an internet connection.

This is an educational hackathon prototype, not a medical device or clinical decision system. The dashboard ranges are illustrative and not personalized clinical thresholds. The local model can make mistakes; it cannot diagnose, prescribe, or replace a Crew Medical Officer, flight surgeon, approved mission checklist, or other mission-specific medical direction. New, severe, or worsening symptoms should be shared with the crew medical team using the mission's approved procedures.

## Research resources

- [NASA: Five Hazards of Human Spaceflight](https://www.nasa.gov/hrp/hazards/)
- [NASA: Risks of Human Spaceflight](https://www.nasa.gov/hrp/risks/)
- [NASA: Ongoing HRP Research in Space](https://www.nasa.gov/hrp/ongoing-hrp-research/)
- [CSA: Monitoring Radiation for Astronaut Health](https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp)
- [CSA: Why Do We Conduct Science Experiments in Space?](https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp)
- [NASA: In-flight medical care](https://www.nasa.gov/ochmo/health-and-medical-systems/in-flight-medical-care/)

## Credits

3D anatomy model: [open-anatomy-3d](https://github.com/MervinR07/open-anatomy-3d), with attribution displayed in the anatomy page. Local language model: [Qwen3 on Ollama](https://ollama.com/library/qwen3). See the source project for its model and data licenses.
