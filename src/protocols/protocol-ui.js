import { evaluateProtocol, PROTOCOLS, PROTOCOL_VERSION } from './protocol-engine.mjs';
import { addSymptomEntry } from '../health-state.js';

const KEY = 'valmed-protocol-runs-v1';
const choices = Object.entries(PROTOCOLS);
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const style = document.createElement('link');
style.rel = 'stylesheet'; style.href = 'src/protocols/protocols.css'; document.head.append(style);

const section = document.createElement('section');
section.className = 'protocol-section'; section.id = 'medical-protocols';
section.innerHTML = `<div class="eyebrow">03 · OFFLINE MEDICAL GUIDANCE</div>
  <h2>Structured symptom protocol</h2>
  <p class="protocol-intro">A deterministic, locally available check-in. It collects the symptom, focused follow-up answers, optional measurements, and your action/outcome log. It does not diagnose or prescribe.</p>
  <form id="protocolForm"><div class="protocol-grid">
    <label class="protocol-field">Primary symptom<select name="symptom" required>${choices.map(([id,p]) => `<option value="${id}">${p.title}</option>`).join('')}</select></label>
    <label class="protocol-field">Body area<select name="region"><option value="general">General</option><option value="head">Head / eyes</option><option value="chest">Chest</option><option value="abdomen">Abdomen</option><option value="back">Back</option><option value="arm">Arm</option><option value="leg">Leg</option></select></label>
    <label class="protocol-field">Intensity (0–10)<input name="severity" type="number" min="0" max="10" value="3" required></label>
    <label class="protocol-field">Onset / duration<input name="onset" maxlength="100" placeholder="When did it start? Is it changing?"></label>
  </div><div class="protocol-questions" id="protocolQuestions"></div>
  <h3>Relevant measurements (optional)</h3><div class="protocol-grid">
    <label class="protocol-field">Heart rate (bpm)<input name="heartRate" type="number" min="25" max="240"></label>
    <label class="protocol-field">Blood pressure (mmHg)<input name="bloodPressure" maxlength="12" placeholder="e.g., 118/76"></label>
    <label class="protocol-field">Temperature (°C)<input name="temperature" type="number" min="30" max="45" step="0.1"></label>
    <label class="protocol-field">Blood oxygen (%)<input name="oxygen" type="number" min="50" max="100"></label>
    <label class="protocol-field">Blood glucose (mg/dL)<input name="bloodSugar" type="number" min="20" max="600"></label>
    <label class="protocol-field">Other measurement / units<input name="otherMeasurement" maxlength="90" placeholder="Measurement and unit"></label>
  </div><button class="button-primary protocol-action" type="submit">Review protocol</button></form>
  <div id="protocolResult" aria-live="polite"></div><div class="protocol-history" id="protocolHistory"></div>
  <p class="protocol-disclaimer">Public information aid, not a mission-approved clinical checklist. It does not set validated thresholds. In an emergency use the mission-approved emergency checklist and medical communications procedure immediately. The local AI assistant cannot change or supersede the protocol guidance.</p>
  <p class="protocol-disclaimer">Evidence basis: <a href="https://www.nasa.gov/ochmo/health-and-medical-systems/in-flight-medical-care/" target="_blank" rel="noopener">NASA in-flight medical care</a> describes the need for in-mission care and ground support; emergency warning-sign questions are informed by <a href="https://medlineplus.gov/ency/article/001927.htm" target="_blank" rel="noopener">MedlinePlus emergency recognition</a>. These public references do not replace mission-specific medical procedures.</p>`;
document.querySelector('.health-source-note')?.before(section);

const form = section.querySelector('#protocolForm');
const symptomSelect = form.elements.symptom;
const questions = section.querySelector('#protocolQuestions');
const result = section.querySelector('#protocolResult');
function renderQuestions() {
  const protocol = PROTOCOLS[symptomSelect.value];
  form.elements.region.value = protocol.region;
  questions.innerHTML = protocol.questions.map((q) => `<label class="protocol-question"><span>${q.label}</span><select name="answer-${q.id}" aria-label="${q.label}" required><option value="">Choose…</option><option value="no">No</option><option value="yes">Yes</option><option value="unsure">Unsure</option></select></label>`).join('');
}
function readRuns() { try { const data = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(data) ? data : []; } catch { return []; } }
function renderHistory() {
  const host = section.querySelector('#protocolHistory');
  const runs = readRuns();
  host.innerHTML = runs.length ? `<h3>Recent protocol actions & outcomes</h3>${runs.slice(0, 5).map((r) => `<article><b>${escapeHtml(r.title)}</b> · ${escapeHtml(r.level?.toUpperCase())}<small>${escapeHtml(new Date(r.at).toLocaleString())} · Follow-up: ${escapeHtml(Object.entries(r.answers || {}).map(([k,v]) => `${k}: ${v}`).join(', '))} · Measurements: ${escapeHtml((r.measurements || []).join(', ') || 'none')} · Action: ${escapeHtml(r.action || 'not recorded')} · Outcome: ${escapeHtml(r.outcome || 'not recorded')}</small></article>`).join('')}` : '';
}
symptomSelect.addEventListener('change', renderQuestions);
renderQuestions(); renderHistory();

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const symptom = String(data.get('symptom'));
  const answers = Object.fromEntries(PROTOCOLS[symptom].questions.map((q) => [q.id, String(data.get(`answer-${q.id}`))]));
  const decision = evaluateProtocol({ symptom, answers });
  const onset = String(data.get('onset') || '').trim();
  const measurements = ['heartRate', 'bloodPressure', 'temperature', 'oxygen', 'bloodSugar'].flatMap((key) => data.get(key) ? [`${key}: ${data.get(key)}`] : []);
  if (data.get('otherMeasurement')) measurements.push(String(data.get('otherMeasurement')));
  const run = { id: crypto.randomUUID?.() || String(Date.now()), at: new Date().toISOString(), version: PROTOCOL_VERSION, title: decision.protocol.title, kind: symptom, region: String(data.get('region')), severity: Number(data.get('severity')), answers, measurements, onset, level: decision.level, action: '', outcome: '' };
  try { const runs = readRuns(); runs.unshift(run); localStorage.setItem(KEY, JSON.stringify(runs.slice(0, 80))); renderHistory(); } catch { /* The assessment remains visible for this session if storage is unavailable. */ }
  addSymptomEntry({ kind: symptom, region: run.region, severity: run.severity, protocolLevel: run.level, note: [onset && `Onset: ${onset}`, measurements.length && `Measurements: ${measurements.join(', ')}`].filter(Boolean).join(' · '), at: run.at, source: 'medical-protocol' });
  const heading = run.level === 'emergency' ? 'EMERGENCY ESCALATION' : run.level === 'urgent' ? 'PROMPT MEDICAL REVIEW' : 'RECORD & MONITOR';
  const contact = run.level === 'emergency' ? 'Now, using the mission emergency communications procedure.' : run.level === 'urgent' ? 'Promptly through the mission medical channel.' : 'For persistent, recurrent, or worsening symptoms through the normal medical channel.';
  result.innerHTML = `<article class="protocol-result" data-level="${run.level}"><strong>${heading}</strong><p>${decision.guidance}</p><p><b>Flight surgeon contact:</b> ${contact}</p>${measurements.length ? `<p><b>Measurements recorded:</b> ${escapeHtml(measurements.join(' · '))}</p>` : ''}<label class="protocol-field">Action taken<input id="protocolAction" maxlength="180" placeholder="What did you do?"></label><label class="protocol-field">Outcome / reassessment<textarea id="protocolOutcome" rows="2" maxlength="240" placeholder="What changed? Include time and follow-up readings."></textarea></label><label class="protocol-field">Current status<select id="protocolStatus"><option value="active">Still ongoing / not resolved</option><option value="improving">Improving, still present</option><option value="resolved">Resolved</option><option value="handed-off">Flight surgeon acknowledged / took over</option></select></label><button id="saveProtocolOutcome" class="button-primary protocol-action" type="button">Save action & outcome</button><p><a class="text-link" href="anatomy.html">View the shared body map →</a> · <a class="text-link" href="assistant.html">Open local assistant →</a></p></article>`;
  section.querySelector('#saveProtocolOutcome').addEventListener('click', () => {
    run.action = section.querySelector('#protocolAction').value.trim();
    run.outcome = section.querySelector('#protocolOutcome').value.trim();
    run.status = section.querySelector('#protocolStatus').value;
    const runs = readRuns();
    try { const index = runs.findIndex((saved) => saved.id === run.id); if (index >= 0) runs[index] = run; else runs.unshift(run); localStorage.setItem(KEY, JSON.stringify(runs.slice(0, 80))); renderHistory(); section.querySelector('#saveProtocolOutcome').textContent = 'Saved on this device'; section.querySelector('#saveProtocolOutcome').disabled = true; }
    catch { section.querySelector('#saveProtocolOutcome').textContent = 'Storage unavailable'; }
  });
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/service-worker.js').catch(() => {});
