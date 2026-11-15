import { METRIC_DEFINITIONS, addSymptomEntry, announceHealthStateChange, metricStatus, readHealthHistory, readMetricLog, readSymptomLog, saveMetricLog, saveSymptomLog } from './health-state.js';
import { evaluateHealthRisk } from './services/health-risk-engine.mjs';
import { VALIDATED_THRESHOLDS } from './services/validated-thresholds.js';
import { buildDemoMissionData, DEMO_MISSION_ID, isUntouchedLegacyDemo } from './data/demo-mission.mjs';
import { selectRecentHistory } from './data/health-history.mjs';
import './protocols/protocol-ui.js';

const BASELINE_KEY = 'valmed-personal-reference-v1';
const MISSION_CONTEXT_KEY = 'valmed-mission-context-v1';
const DEMO_FLAG_KEY = 'valmed-demo-mission-150d-active';

function installDemoMission({ force = false } = {}) {
  const hasExistingData = ['orbital-metrics', 'orbital-history', 'orbital-symptoms', BASELINE_KEY, MISSION_CONTEXT_KEY].some((key) => {
    try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value.length > 0 : Boolean(value && Object.keys(value).length); } catch { return false; }
  });
  if (!force && hasExistingData) return false;
  const demo = buildDemoMissionData();
  localStorage.setItem('orbital-metrics', JSON.stringify(demo.metrics));
  localStorage.setItem('orbital-history', JSON.stringify(demo.history));
  localStorage.setItem('orbital-symptoms', JSON.stringify(demo.symptoms));
  localStorage.setItem(BASELINE_KEY, JSON.stringify(demo.baseline));
  localStorage.setItem(MISSION_CONTEXT_KEY, JSON.stringify(demo.missionContext));
  localStorage.setItem(DEMO_FLAG_KEY, DEMO_MISSION_ID);
  return true;
}

function migrateUntouchedLegacyDemo() {
  try {
    const parse = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } };
    const flag = localStorage.getItem(DEMO_FLAG_KEY);
    const snapshot = {
      flag,
      metrics: parse('orbital-metrics', []),
      history: parse('orbital-history', []),
      symptoms: parse('orbital-symptoms', []),
      baseline: parse(BASELINE_KEY, null),
      missionContext: parse(MISSION_CONTEXT_KEY, null),
    };
    if (!isUntouchedLegacyDemo(snapshot)) return false;
    installDemoMission({ force: true });
    return true;
  } catch { return false; }
}
// A clean browser opens into the demo. Only an untouched previous demo seed is migrated; edited/user records are preserved.
try {
  if (!localStorage.getItem(DEMO_FLAG_KEY)) installDemoMission();
  else migrateUntouchedLegacyDemo();
} catch { /* Demo data is optional when storage is unavailable. */ }
announceHealthStateChange();
const riskStyle = document.createElement('link'); riskStyle.rel = 'stylesheet'; riskStyle.href = 'src/services/health-risk-ui.css'; document.head.append(riskStyle);

const icons = { heartRate: '⌁', bloodPressure: '↕', bloodSugar: '◉', hydration: '◒', sleep: '☾', temperature: '♨', oxygen: '◉' };
const defs = METRIC_DEFINITIONS.map(({ id, name, unit, low, high }) => [id, name, unit, low, high, icons[id]]);
const defaults = { heartRate: 74, bloodPressure: 118, bloodSugar: 92, hydration: 63, sleep: 6.5, temperature: 36.7, oxygen: 98 };
const storedMetrics = readMetricLog();
let readings = defs.map(([id, name, unit, low, high, icon]) => ({ id, name, unit, low, high, icon, value: Number(storedMetrics.find((item) => item.id === id)?.value ?? defaults[id]) }));
let hasSavedReadings = storedMetrics.length > 0;
let savedMetricIds = new Set(storedMetrics.map((item) => item.id));
let history = readHealthHistory();
let symptoms = readSymptomLog();
function readMissionContext() { try { const value = JSON.parse(localStorage.getItem(MISSION_CONTEXT_KEY) || '{}'); return value && typeof value === 'object' ? value : {}; } catch { return {}; } }
let missionContext = readMissionContext();
const status = (metric) => metricStatus(metric.value, metric.low, metric.high);
const nice = (n) => Number.isInteger(n) ? `${n}` : Number(n).toFixed(1);
const symptomLabels = { headache: 'Headache or dizziness', chest: 'Chest pain or pressure', breathing: 'Difficulty breathing', fainting: 'Fainting / loss of consciousness', confusion: 'Sudden confusion', weakness: 'Severe new weakness', 'rapid-worsening': 'Rapidly worsening symptoms', nausea: 'Nausea', muscle: 'Weakness or muscle pain', vision: 'Vision changes', other: 'Other' };
const regionLabels = { head: 'Head / eyes', chest: 'Chest', abdomen: 'Abdomen', back: 'Back', arm: 'Arm', leg: 'Leg', general: 'General' };
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const toast = (message) => { const node = document.getElementById('healthToast'); node.textContent = message; node.classList.add('visible'); setTimeout(() => node.classList.remove('visible'), 2400); };
const today = document.getElementById('healthDate'); today.textContent = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase();

function markOverviewTask(task) {
  try { const tasks = new Set(JSON.parse(localStorage.getItem('orbital-overview-tasks') || '[]')); tasks.add(task); localStorage.setItem('orbital-overview-tasks', JSON.stringify([...tasks])); } catch { /* Overview progress is optional. */ }
}
function readPersonalBaseline() {
  try {
    const value = JSON.parse(localStorage.getItem(BASELINE_KEY) || 'null');
    return value && typeof value === 'object' ? value : null;
  } catch { return null; }
}

function renderHealthRisk() {
  const host = document.getElementById('healthRiskResult');
  if (!host) return;
  const baseline = readPersonalBaseline();
  const result = evaluateHealthRisk({
    readings: hasSavedReadings ? readings.filter((item) => savedMetricIds.has(item.id)) : [],
    history,
    symptoms,
    baseline,
    thresholds: VALIDATED_THRESHOLDS,
    missionContext,
  });
  const stateLabels = { normal: 'NO RULE TRIGGERED', attention: 'REVIEW SIGNALS', urgent: 'URGENT MEDICAL ESCALATION', unknown: 'INSUFFICIENT DATA' };
  const stateLabel = stateLabels[result.overallState] || stateLabels.unknown;
  const findings = result.findings.length ? result.findings.map((finding) => {
    const detail = finding.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join('');
    const hazards = finding.relatedHazards.length ? `<div class="risk-hazards"><span>CONTEXTUAL HAZARD LINKS</span>${finding.relatedHazards.map((hazard) => `<span>${escapeHtml(hazard.label)}</span>`).join('')}</div>` : '';
    const evidence = finding.evidence?.length ? `<div class="risk-evidence">Evidence: ${finding.evidence.map((item) => `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener">${escapeHtml(item.name)}</a>`).join(', ')}</div>` : '';
    const value = finding.value === null ? '' : `<span class="risk-value">${escapeHtml(finding.value)} ${escapeHtml(finding.unit)}</span>`;
    return `<article class="risk-finding" data-state="${escapeHtml(finding.state)}"><div class="risk-finding-top"><strong>${escapeHtml(finding.label)}</strong><span class="risk-state">${escapeHtml(finding.state.toUpperCase())}</span>${value}</div><ul>${detail}</ul>${hazards}${evidence}</article>`;
  }).join('') : '<p class="risk-empty">No current findings. Save a measured check-in and record any symptoms to begin.</p>';
  const missing = result.missing.length ? `<details class="risk-missing"><summary>Missing measurements (${result.missing.length})</summary><p>${result.missing.map((item) => escapeHtml(item.label)).join(' · ')}</p></details>` : '';
  const recommendations = result.recommendations.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  const symptomHazards = [...new Map(result.findings.filter((finding) => finding.type === 'symptom').flatMap((finding) => finding.relatedHazards || []).map((item) => [item.id, item])).values()];
  const hazards = symptomHazards.length ? `<div class="risk-hazards"><span>CONTEXTUAL LINKS FOR REPORTED SYMPTOMS — NOT CAUSATION</span>${symptomHazards.map((item) => `<span>${escapeHtml(item.label)}</span>`).join('')}</div>` : '';
  const mission = result.missionContext;
  const missionValues = Object.entries(mission.values).filter(([, item]) => item !== null).map(([, item]) => `${item.label}: ${item.value} ${item.unit}`);
  const missionPrompts = [...mission.priorities, ...mission.notes.filter((note) => !mission.priorities.includes(note))].map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  const missionPanel = `<section class="risk-mission-summary"><div class="risk-mission-top"><div><span class="risk-kicker">ACTIVE MISSION CONTEXT</span><strong>${escapeHtml(mission.locationLabel)}</strong><small>${escapeHtml(mission.gravityLabel)}${mission.values.missionDay ? ` · Mission day ${mission.values.missionDay.value}` : ''}</small></div><span class="risk-state">${mission.hazards.length} MISSION DOMAINS IN SCOPE</span></div><p>${escapeHtml(mission.caveat)} The five hazard domains are mission context, separate from the symptoms reported by the crew.</p>${missionValues.length ? `<div class="risk-context-values">${missionValues.map((item) => `<span>${escapeHtml(item)}</span>`).join('')}</div>` : '<p class="risk-empty">No environmental or operational telemetry entered yet.</p>'}<details class="risk-mission-prompts" open><summary>What matters in this environment?</summary><ul>${missionPrompts}</ul></details><details class="risk-mission-prompts"><summary>Mission data gaps (${mission.missing.length})</summary><ul>${mission.missing.map((item) => `<li>${escapeHtml(item.label)} — not entered</li>`).join('')}</ul></details></section>`;
  host.innerHTML = `<div class="risk-overview" data-state="${escapeHtml(result.overallState)}"><div><span class="risk-kicker">ENGINE ${escapeHtml(result.engineVersion)}</span><strong>${escapeHtml(stateLabel)}</strong></div><p>${escapeHtml(result.summary)}</p></div>${missionPanel}<div class="risk-columns"><div><h3>Why this result?</h3><div class="risk-findings">${findings}</div>${missing}</div><aside class="risk-recommendations"><h3>Suggested next steps</h3><ul>${recommendations}</ul></aside></div>${hazards}<details class="risk-hazard-context"><summary>Five mission hazard domains in scope · not symptom diagnoses</summary><p class="risk-hazard-note">These domains come from the selected mission profile. They describe what the crew should monitor; they are not evidence that a logged symptom was caused by a hazard and they do not create a 3D body alert.</p><div class="risk-hazard-grid">${result.hazardContext.map((hazard) => `<article><strong>${escapeHtml(hazard.label)}</strong><p>${escapeHtml(hazard.relevance)}</p><small>${hazard.indicators.map(escapeHtml).join(' · ')}</small></article>`).join('')}</div></details><details class="risk-limitations"><summary>Method, evidence and limitations</summary><ul>${result.limitations.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul><p>NASA context: <a href="https://www.nasa.gov/hrp/hazards/" target="_blank" rel="noopener">Five Hazards of Human Spaceflight</a> · <a href="https://www.nasa.gov/ochmo/health-and-medical-systems/in-flight-medical-care/" target="_blank" rel="noopener">NASA in-flight medical care</a>.</p></details>`;
  const setButton = document.getElementById('setHealthBaseline');
  const clearButton = document.getElementById('clearHealthBaseline');
  if (setButton) { setButton.disabled = !hasSavedReadings; setButton.textContent = baseline ? 'Update personal reference' : 'Set personal reference'; }
  if (clearButton) clearButton.hidden = !baseline;
}

function render({ persist = false } = {}) {
  if (persist) { try { const saved = saveMetricLog(readings); savedMetricIds = new Set(saved.map((item) => item.id)); hasSavedReadings = savedMetricIds.size > 0; } catch { /* Local storage is optional. */ } }
  document.getElementById('healthMetrics').innerHTML = readings.map((m) => {
    const level = status(m); const pct = Math.min(100, Math.max(0, (m.value - m.low) / (m.high - m.low) * 100));
    return `<article class="metric-card ${!hasSavedReadings || level === 'normal' ? 'cyan' : 'amber'} ${hasSavedReadings ? level : 'normal'}"><div class="metric-top"><span class="metric-icon">${m.icon}</span><span class="metric-state"><i></i>${!hasSavedReadings ? 'EXAMPLE' : level === 'normal' ? 'STABLE' : 'ATTENTION'}</span></div><div class="metric-name">${m.name}</div><div class="metric-number">${nice(m.value)} <small>${m.unit}</small></div><div class="metric-range"><span>ILLUSTRATIVE RANGE</span><b>${m.low}–${m.high} ${m.unit}</b></div><div class="range-track"><span style="width:${pct}%"></span></div><div class="metric-bottom"><span class="metric-caption">${hasSavedReadings ? 'SAVED READING' : 'EXAMPLE · NOT SAVED'}</span><span class="trend-pill neutral">VIEW TREND</span></div></article>`;
  }).join('');
  document.getElementById('healthStatus').textContent = !hasSavedReadings ? 'Example values only. Log a check-in to assess your entered data.' : 'Readings saved. Review the explainable assessment below.';
  document.getElementById('healthMessage').textContent = 'Dashboard ranges are illustrative only. No medical readiness score or diagnosis is calculated.';
  document.getElementById('healthReadiness').textContent = 'NOT SCORED'; document.getElementById('healthReadinessBar').style.width = '0%';
  renderChart(); renderSymptoms(); renderHealthRisk();
}

function renderChart() {
  const id = document.getElementById('healthChartMetric').value; const metric = readings.find((m) => m.id === id);
  const values = selectRecentHistory(history, id, 12);
  document.getElementById('healthChartValue').innerHTML = `${nice(metric.value)} <small>${metric.unit}</small>`;
  const graph = document.getElementById('healthChart');
  if (!values.length) { graph.innerHTML = '<span class="history-empty">Save a check-in to start your personal trend.</span>'; document.getElementById('healthDates').replaceChildren(); document.getElementById('healthEntries').replaceChildren(); return; }
  const nums = values.map((entry) => Number(entry.readings[id])); const min = Math.min(...nums); const max = Math.max(...nums); const span = max - min || Math.max(1, max * .1);
  const points = nums.map((value, index) => `${(index / Math.max(1, nums.length - 1)) * 100},${88 - (value - min) / span * 70}`).join(' ');
  graph.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="${metric.name} over time"><polyline points="${points}"/></svg>`;
  document.getElementById('healthDates').innerHTML = values.map((entry) => `<span>${new Date(entry.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>`).join('');
  document.getElementById('healthEntries').innerHTML = values.slice(-4).reverse().map((entry) => `<span>${new Date(entry.at).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })} <b>${nice(Number(entry.readings[id]))} ${metric.unit}</b></span>`).join('');
}

function renderSymptoms() {
  const choices = [['headache', 'Headache or dizziness'], ['chest', 'Chest pain or pressure'], ['breathing', 'Difficulty breathing'], ['nausea', 'Nausea'], ['muscle', 'Weakness or muscle pain'], ['vision', 'Vision changes']];
  document.getElementById('symptomChips').innerHTML = choices.map(([id, label]) => `<button class="symptom-chip" type="button" data-symptom="${id}"><i></i>${label}</button>`).join('');
  document.getElementById('symptomCount').textContent = symptoms.length ? `${symptoms.length} ENTRIES` : 'NO ENTRIES';
  document.getElementById('symptomList').innerHTML = symptoms.slice(0, 5).map((entry, index) => { const age = Date.now() - Date.parse(entry.at || ''); const inReviewWindow = Number.isFinite(age) && age >= 0 && age < 24 * 60 * 60 * 1000; const reviewLabel = inReviewWindow ? 'IN CURRENT 24 H REVIEW' : 'HISTORICAL · NOT IN CURRENT ASSESSMENT'; return `<article class="symptom-entry" data-review-state="${inReviewWindow ? 'current' : 'historical'}"><span class="symptom-entry-mark">${index === 0 ? '✳' : '·'}</span><div><strong>${symptomLabels[entry.kind] || escapeHtml(entry.kind)}</strong><small>${regionLabels[entry.region] || escapeHtml(entry.region)} · Intensity ${entry.severity}/10 · ${new Date(entry.at).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}</small><small>${reviewLabel}</small>${entry.note ? `<p>${escapeHtml(entry.note)}</p>` : ''}</div><button type="button" data-remove-symptom="${index}" aria-label="Remove symptom">×</button></article>`; }).join('') || '<p class="symptom-empty">No symptoms logged. Add an observation to include it in a crew report.</p>';
  document.getElementById('symptomChips').querySelectorAll('[data-symptom]').forEach((button) => button.addEventListener('click', () => { const kind = button.dataset.symptom; document.querySelector('#symptomForm [name="kind"]').value = kind; const suggestedRegion = { headache: 'head', chest: 'chest', breathing: 'chest', nausea: 'abdomen', vision: 'head' }[kind] || 'general'; document.querySelector('#symptomForm [name="region"]').value = suggestedRegion; document.getElementById('symptomDialog').showModal(); }));
  document.getElementById('symptomList').querySelectorAll('[data-remove-symptom]').forEach((button) => button.addEventListener('click', () => { symptoms.splice(Number(button.dataset.removeSymptom), 1); symptoms = saveSymptomLog(symptoms); renderSymptoms(); renderHealthRisk(); }));
}

const dialog = document.getElementById('healthDialog'); const form = document.getElementById('healthForm');
document.getElementById('healthLog').addEventListener('click', () => { readings.forEach((m) => { if (form.elements[m.id]) form.elements[m.id].value = m.value; }); dialog.showModal(); });
form.addEventListener('submit', (event) => { if (event.submitter?.value === 'cancel') return; event.preventDefault(); const data = new FormData(form); readings.forEach((m) => { if (data.has(m.id)) m.value = Number(data.get(m.id)); }); history.unshift({ at: new Date().toISOString(), missionContext: { location: missionContext.location || 'earth', gravity: missionContext.gravity || 'earth' }, readings: Object.fromEntries(readings.map(({ id, value }) => [id, value])) }); history = history.slice(0, 80); localStorage.setItem('orbital-history', JSON.stringify(history)); markOverviewTask('checkin'); dialog.close(); render({ persist: true }); toast('Check-in shared with the assistant and anatomy map.'); });
document.getElementById('setHealthBaseline').addEventListener('click', () => { if (!hasSavedReadings) return; const existing = readPersonalBaseline(); if (existing && !window.confirm('Replace your current user-designated reference with the latest saved readings?')) return; const reference = { createdAt: new Date().toISOString(), label: 'User-designated comparison reference; not a clinical norm', missionContext: { location: missionContext.location || 'earth', gravity: missionContext.gravity || 'earth' }, readings: Object.fromEntries(readings.filter(({ id }) => savedMetricIds.has(id)).map(({ id, value, unit }) => [id, { value: Number(value), unit: METRIC_DEFINITIONS.find((item) => item.id === id)?.unit || unit }])) }; try { localStorage.setItem(BASELINE_KEY, JSON.stringify(reference)); renderHealthRisk(); toast('Personal reference saved on this device.'); } catch { toast('Could not save personal reference.'); } });
document.getElementById('clearHealthBaseline').addEventListener('click', () => { try { localStorage.removeItem(BASELINE_KEY); renderHealthRisk(); toast('Personal reference cleared.'); } catch { toast('Could not clear personal reference.'); } });
document.getElementById('healthChartMetric').addEventListener('change', renderChart);
document.getElementById('symptomAdd').addEventListener('click', () => document.getElementById('symptomDialog').showModal());
document.getElementById('symptomForm').addEventListener('submit', (event) => { if (event.submitter?.value === 'cancel') return; event.preventDefault(); const data = new FormData(event.currentTarget); symptoms = addSymptomEntry({ kind: data.get('kind'), region: data.get('region'), severity: Number(data.get('severity')), note: String(data.get('note') || '').slice(0, 160), at: new Date().toISOString(), source: 'health-check-in' }); document.getElementById('symptomDialog').close(); renderSymptoms(); renderHealthRisk(); toast('Observation added to the shared health record.'); });
document.getElementById('healthReport').addEventListener('click', async () => {
  const contextLines = Object.entries(missionContext).filter(([key, value]) => value !== '' && value !== null && value !== undefined && !['location', 'gravity'].includes(key)).map(([key, value]) => `- ${key}: ${value}`);
  const now = Date.now();
  const inCurrentWindow = (item) => { const age = now - Date.parse(item.at || ''); return Number.isFinite(age) && age >= 0 && age < 24 * 60 * 60 * 1000; };
  const currentSymptoms = symptoms.filter(inCurrentWindow).slice(0, 5);
  const historicalSymptoms = symptoms.filter((item) => !inCurrentWindow(item)).slice(0, 5);
  const symptomLine = (s) => `- ${symptomLabels[s.kind] || s.kind}, ${regionLabels[s.region] || s.region}, intensity ${s.severity}/10${s.note ? ` — ${s.note}` : ''}`;
  const text = ['Valmed · CREW HEALTH SUMMARY', new Date().toLocaleString('en-US'), '', `Mission location: ${missionContext.location || 'earth'}`, `Gravity environment: ${missionContext.gravity || 'earth'}`, 'Mission and environmental context:', ...(contextLines.length ? contextLines : ['- No additional mission telemetry entered']), '', 'Current readings:', ...(hasSavedReadings ? readings.filter((m) => savedMetricIds.has(m.id)).map((m) => `- ${m.name}: ${nice(m.value)} ${m.unit}`) : ['- No saved measurements; dashboard values are examples only.']), '', 'Symptoms in current 24-hour assessment window:', ...(currentSymptoms.length ? currentSymptoms.map(symptomLine) : ['- None']), '', 'Historical symptom entries (not included in current assessment):', ...(historicalSymptoms.length ? historicalSymptoms.map(symptomLine) : ['- None']), '', 'Entered data only; not a diagnosis.'].join('\n');
  try { await navigator.clipboard.writeText(text); toast('Report copied to clipboard.'); }
  catch { const area = document.createElement('textarea'); area.value = text; document.body.append(area); area.select(); document.execCommand('copy'); area.remove(); toast('Report copied.'); }
});
document.getElementById('healthExport').addEventListener('click', () => { const csv = [['date', ...defs.map((d) => `${d[1]} (${d[2]})`)], ...history.map((entry) => [entry.at, ...defs.map((d) => entry.readings?.[d[0]] ?? '')])].map((row) => row.join(',')).join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'valmed-health-history.csv'; a.click(); URL.revokeObjectURL(a.href); });

const missionForm = document.getElementById('missionContextForm');
const loadDemoButton = document.getElementById('loadDemoMission');
if (loadDemoButton) loadDemoButton.addEventListener('click', () => {
  const hasData = ['orbital-metrics', 'orbital-history', 'orbital-symptoms', BASELINE_KEY, MISSION_CONTEXT_KEY].some((key) => { try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value.length > 0 : Boolean(value && Object.keys(value).length); } catch { return false; } });
  if (hasData && !window.confirm('Replace the health records currently stored in this browser with the synthetic 150-day lunar mission demo? Export any records you need first.')) return;
  try { installDemoMission({ force: true }); window.location.reload(); }
  catch { toast('Could not load the demo mission in this browser.'); }
});
if (missionForm) {
  for (const [key, value] of Object.entries(missionContext)) { if (missionForm.elements[key]) missionForm.elements[key].value = value; }
  if (!missionContext.gravity && missionForm.elements.gravity) missionForm.elements.gravity.value = ({ earth: 'earth', leo: 'microgravity', iss: 'microgravity', transit: 'microgravity', lunar_orbit: 'microgravity', lunar_surface: 'lunar' })[missionForm.elements.location.value] || 'unknown';
  const saveMissionContext = () => {
    const data = new FormData(missionForm);
    missionContext = Object.fromEntries([...data.entries()].map(([key, value]) => [key, String(value).trim()]));
    try { localStorage.setItem(MISSION_CONTEXT_KEY, JSON.stringify(missionContext)); } catch { toast('Could not save mission context on this device.'); }
    const badge = document.getElementById('missionContextBadge');
    if (badge) badge.textContent = missionForm.elements.location.selectedOptions[0]?.textContent.toUpperCase() || 'MISSION PROFILE';
    renderHealthRisk();
  };
  missionForm.addEventListener('change', (event) => { if (event.target.name === 'location') { const defaults = { earth: 'earth', leo: 'microgravity', iss: 'microgravity', transit: 'microgravity', lunar_orbit: 'microgravity', lunar_surface: 'lunar' }; missionForm.elements.gravity.value = defaults[event.target.value] || 'unknown'; } saveMissionContext(); });
  missionForm.addEventListener('input', (event) => { if (event.target.matches('input')) saveMissionContext(); });
  missionForm.addEventListener('reset', () => { queueMicrotask(() => { missionContext = {}; try { localStorage.removeItem(MISSION_CONTEXT_KEY); } catch {} if (missionForm.elements.location) missionForm.elements.location.value = 'earth'; if (missionForm.elements.gravity) missionForm.elements.gravity.value = 'earth'; const badge = document.getElementById('missionContextBadge'); if (badge) badge.textContent = 'EARTH PROFILE'; renderHealthRisk(); }); });
  const badge = document.getElementById('missionContextBadge');
  if (badge) badge.textContent = missionForm.elements.location.selectedOptions[0]?.textContent.toUpperCase() || 'EARTH PROFILE';
}

window.addEventListener('storage', (event) => {
  if (event.key !== null && !['orbital-metrics', 'orbital-symptoms', 'orbital-history', BASELINE_KEY, MISSION_CONTEXT_KEY, DEMO_FLAG_KEY].includes(event.key)) return;
  const latest = readMetricLog();
  hasSavedReadings = latest.length > 0;
  savedMetricIds = new Set(latest.map((item) => item.id));
  readings = defs.map(([id, name, unit, low, high, icon]) => ({ id, name, unit, low, high, icon, value: Number(latest.find((item) => item.id === id)?.value ?? defaults[id]) }));
  history = readHealthHistory();
  symptoms = readSymptomLog();
  missionContext = readMissionContext();
  if (missionForm) for (const [key, value] of Object.entries(missionContext)) { if (missionForm.elements[key]) missionForm.elements[key].value = value; }
  const missionBadge = document.getElementById('missionContextBadge');
  if (missionBadge && missionForm) missionBadge.textContent = missionForm.elements.location.selectedOptions[0]?.textContent.toUpperCase() || 'EARTH PROFILE';
  render({ persist: false });
});
render();
