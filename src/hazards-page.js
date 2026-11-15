const hazards = {
  radiation: {
    icon: '☼', label: '01 · SPACE RADIATION', title: 'Exposure is monitored, not inferred.',
    copy: 'NASA HRP identifies space radiation as a human-spaceflight hazard. Exposure is managed through mission radiation protection, dosimetry, and operational procedures.',
    signals: 'VALMED can store a manually entered cumulative dosimeter value and its reporting period. It has no dosimeter connection or radiation-quality sensor.',
    gaps: 'No live dose, particle-energy spectrum, organ-specific dose, solar-event forecast, or exposure-limit comparison is available here.',
    limitation: 'A manually entered value is unverified. A hazard association does not show that radiation caused a symptom.',
    links: [['NASA · Five hazards', 'https://www.nasa.gov/hrp/hazards/'], ['NASA · Human-spaceflight risks', 'https://www.nasa.gov/hrp/risks/'], ['CSA · Radiation monitoring', 'https://www.asc-csa.gc.ca/eng/astronauts/space-medicine/radiation.asp']],
  },
  isolation: {
    icon: '◌', label: '02 · ISOLATION & CONFINEMENT', title: 'Crew well-being changes over time.',
    copy: 'NASA studies behavioral responses, sleep, and team performance during prolonged isolation and confinement. VALMED presents these as monitoring topics, not a mental-health diagnosis.',
    signals: 'VALMED records sleep duration, a 1–5 self-rated sleep-quality field, and free-text symptom notes.',
    gaps: 'No validated mood, stress, cognitive, team-cohesion, or behavioral-health instrument is implemented.',
    limitation: 'Sleep duration and a single subjective rating are incomplete proxies; they cannot assess behavioral health or crew performance.',
    links: [['NASA · Five hazards', 'https://www.nasa.gov/hrp/hazards/'], ['NASA · Human-spaceflight risks', 'https://www.nasa.gov/hrp/risks/'], ['NASA · Ongoing HRP research', 'https://www.nasa.gov/hrp/ongoing-hrp-research/']],
  },
  distance: {
    icon: '⌖', label: '03 · DISTANCE FROM EARTH', title: 'Care access is an operational constraint.',
    copy: 'NASA highlights that communication, supplies, and medical support become harder to receive as crews travel farther from Earth. This changes mission planning needs, not a physiological reading.',
    signals: 'VALMED can store manually entered one-way communication delay, time to definitive care, and resupply autonomy.',
    gaps: 'These entries are not connected to spacecraft networks and do not verify that a link, clinician, evacuation vehicle, or supply is actually available.',
    limitation: 'A planned delay or evacuation estimate must be interpreted with the current mission communications and contingency plan.',
    links: [['NASA · Human-spaceflight risks', 'https://www.nasa.gov/hrp/risks/'], ['NASA · In-flight medical care', 'https://www.nasa.gov/ochmo/health-and-medical-systems/in-flight-medical-care/']],
  },
  gravity: {
    icon: '⤢', label: '04 · GRAVITY FIELDS', title: 'Mission phase matters to the comparison.',
    copy: 'NASA describes adaptation across gravity fields and associated concerns such as fluid shifts, balance, cardiovascular deconditioning, muscle atrophy, and bone loss.',
    signals: 'VALMED stores a selected gravity context and can compare user-entered readings and trends only when location and gravity match.',
    gaps: 'It does not measure bone density, muscle strength, vestibular function, fluid distribution, or exercise quality; heart rate and blood pressure are not substitutes.',
    limitation: 'Changing the mission context excludes incompatible readings from the current assessment. Contextual links do not establish causation.',
    links: [['NASA · Five hazards', 'https://www.nasa.gov/hrp/hazards/'], ['NASA · Human-spaceflight risks', 'https://www.nasa.gov/hrp/risks/'], ['CSA · Science experiments in space', 'https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp']],
  },
  environment: {
    icon: '⌂', label: '05 · HOSTILE / CLOSED ENVIRONMENTS', title: 'A habitat needs its own monitoring systems.',
    copy: 'NASA describes spacecraft habitability as a coupled environment that includes air, temperature, pressure, lighting, noise, and other operational conditions.',
    signals: 'VALMED can record manually entered cabin pressure, oxygen and carbon-dioxide partial pressure, temperature, humidity, and particulates.',
    gaps: 'No live environmental sensor, calibration record, contaminant identification, alarm integration, or limit evaluation is implemented.',
    limitation: 'These manual entries cannot replace vehicle environmental-control telemetry or its approved procedures.',
    links: [['NASA · Hostile/closed environments', 'https://www.nasa.gov/hrp/hazard-hostile-closed-environments/'], ['NASA · Five hazards', 'https://www.nasa.gov/hrp/hazards/'], ['NASA · Ongoing HRP research', 'https://www.nasa.gov/hrp/ongoing-hrp-research/']],
  },
};
const feature = document.getElementById('hazardFeature');
const tabs = [...document.querySelectorAll('.hazard-tab')];
function showHazard(id, { focus = false } = {}) {
  const item = hazards[id]; if (!item) return;
  const activeTab = tabs.find((button) => button.dataset.hazard === id);
  feature.setAttribute('aria-labelledby', activeTab?.id || '');
  feature.innerHTML = `<div class="hazard-feature-visual"><div class="hazard-planet hazard-planet-${id}" aria-hidden="true">${item.icon}</div><span class="hazard-feature-coordinate">VALMED FIELD NOTES<br/>NASA HRP · ${item.label.slice(0, 2)}</span><span class="hazard-feature-dots" aria-hidden="true">✦ · ✧ · ✦</span></div><div class="hazard-feature-copy"><span class="eyebrow">${item.label}</span><h2>${item.title}</h2><p>${item.copy}</p><div class="hazard-focus"><span>WHAT VALMED CAN RECORD</span><p>${item.signals}</p></div><div class="hazard-focus signal-focus"><span>NOT MEASURED / NOT VERIFIED</span><p>${item.gaps}</p></div><div class="hazard-focus signal-focus"><span>INTERPRETATION LIMIT</span><p>${item.limitation}</p></div><div class="hazard-feature-links"><span class="eyebrow">OFFICIAL RESEARCH SOURCES</span>${item.links.map(([label, href]) => `<a href="${href}" target="_blank" rel="noopener">${label}<b aria-hidden="true">↗</b></a>`).join('')}</div></div>`;
  tabs.forEach((button) => { const active = button.dataset.hazard === id; button.classList.toggle('active', active); button.setAttribute('aria-selected', String(active)); button.tabIndex = active ? 0 : -1; });
  if (focus) activeTab?.focus();
  try { const tasks = new Set(JSON.parse(localStorage.getItem('orbital-overview-tasks') || '[]')); tasks.add('research'); localStorage.setItem('orbital-overview-tasks', JSON.stringify([...tasks])); } catch { /* Overview progress is optional. */ }
}
tabs.forEach((button, index) => {
  button.addEventListener('click', () => showHazard(button.dataset.hazard));
  button.addEventListener('keydown', (event) => {
    const next = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? (index + 1) % tabs.length
      : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? (index - 1 + tabs.length) % tabs.length
        : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
    if (next < 0) return;
    event.preventDefault(); showHazard(tabs[next].dataset.hazard, { focus: true });
  });
});
showHazard('radiation');
