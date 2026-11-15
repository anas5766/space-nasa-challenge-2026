import { METRIC_DEFINITIONS, addSymptomEntry, announceHealthStateChange, metricStatus, readHealthHistory, readMetricLog, readSymptomLog, saveMetricLog, saveSymptomLog } from './health-state.js';

announceHealthStateChange();

const icons = { heartRate: '⌁', bloodPressure: '↕', bloodSugar: '◉', hydration: '◒', sleep: '☾', temperature: '♨', oxygen: '◉' };
const defs = METRIC_DEFINITIONS.map(({ id, name, unit, low, high }) => [id, name, unit, low, high, icons[id]]);
const defaults = { heartRate: 74, bloodPressure: 118, bloodSugar: 92, hydration: 63, sleep: 6.5, temperature: 36.7, oxygen: 98 };
const storedMetrics = readMetricLog();
let readings = defs.map(([id, name, unit, low, high, icon]) => ({ id, name, unit, low, high, icon, value: Number(storedMetrics.find((item) => item.id === id)?.value ?? defaults[id]) }));
let hasSavedReadings = storedMetrics.length > 0;
let history = readHealthHistory();
let symptoms = readSymptomLog();
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
function render({ persist = false } = {}) {
  if (persist) { try { saveMetricLog(readings); hasSavedReadings = true; } catch { /* Local storage is optional. */ } }
  document.getElementById('healthMetrics').innerHTML = readings.map((m) => {
    const level = status(m); const pct = Math.min(100, Math.max(0, (m.value - m.low) / (m.high - m.low) * 100));
    return `<article class="metric-card ${!hasSavedReadings || level === 'normal' ? 'cyan' : 'amber'} ${hasSavedReadings ? level : 'normal'}"><div class="metric-top"><span class="metric-icon">${m.icon}</span><span class="metric-state"><i></i>${!hasSavedReadings ? 'EXAMPLE' : level === 'normal' ? 'STABLE' : 'ATTENTION'}</span></div><div class="metric-name">${m.name}</div><div class="metric-number">${nice(m.value)} <small>${m.unit}</small></div><div class="metric-range"><span>ILLUSTRATIVE RANGE</span><b>${m.low}–${m.high} ${m.unit}</b></div><div class="range-track"><span style="width:${pct}%"></span></div><div class="metric-bottom"><span class="metric-caption">${hasSavedReadings ? 'SAVED READING' : 'EXAMPLE · NOT SAVED'}</span><span class="trend-pill neutral">VIEW TREND</span></div></article>`;
  }).join('');
  const attention = readings.filter((m) => status(m) !== 'normal').length;
  document.getElementById('healthStatus').textContent = !hasSavedReadings ? 'Example values only. Log a check-in to share measured readings with the assistant and anatomy map.' : attention ? `${attention} signal${attention === 1 ? '' : 's'} outside illustrative ranges.` : 'Your entered signals are within illustrative ranges.';
  document.getElementById('healthMessage').textContent = 'These ranges are illustrative, not clinical thresholds. Saved check-ins are shared with the local assistant and body map.';
  const readiness = hasSavedReadings ? Math.max(25, 100 - attention * 11) : 0;
  document.getElementById('healthReadiness').textContent = hasSavedReadings ? `${readiness}%` : '—'; document.getElementById('healthReadinessBar').style.width = `${readiness}%`;
  renderChart(); renderSymptoms();
}

function renderChart() {
  const id = document.getElementById('healthChartMetric').value; const metric = readings.find((m) => m.id === id);
  const values = history.slice(0, 12).reverse().filter((entry) => Number.isFinite(Number(entry.readings?.[id])));
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
  document.getElementById('symptomList').innerHTML = symptoms.slice(0, 5).map((entry, index) => `<article class="symptom-entry"><span class="symptom-entry-mark">${index === 0 ? '✳' : '·'}</span><div><strong>${symptomLabels[entry.kind] || escapeHtml(entry.kind)}</strong><small>${regionLabels[entry.region] || escapeHtml(entry.region)} · Intensity ${entry.severity}/10 · ${new Date(entry.at).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}</small>${entry.note ? `<p>${escapeHtml(entry.note)}</p>` : ''}</div><button type="button" data-remove-symptom="${index}" aria-label="Remove symptom">×</button></article>`).join('') || '<p class="symptom-empty">No symptoms logged. Add an observation to include it in a crew report.</p>';
  document.getElementById('symptomChips').querySelectorAll('[data-symptom]').forEach((button) => button.addEventListener('click', () => { document.querySelector('#symptomForm [name="kind"]').value = button.dataset.symptom; document.getElementById('symptomDialog').showModal(); }));
  document.getElementById('symptomList').querySelectorAll('[data-remove-symptom]').forEach((button) => button.addEventListener('click', () => { symptoms.splice(Number(button.dataset.removeSymptom), 1); symptoms = saveSymptomLog(symptoms); renderSymptoms(); }));
}

const dialog = document.getElementById('healthDialog'); const form = document.getElementById('healthForm');
document.getElementById('healthLog').addEventListener('click', () => { readings.forEach((m) => { if (form.elements[m.id]) form.elements[m.id].value = m.value; }); dialog.showModal(); });
form.addEventListener('submit', (event) => { if (event.submitter?.value === 'cancel') return; event.preventDefault(); const data = new FormData(form); readings.forEach((m) => { if (data.has(m.id)) m.value = Number(data.get(m.id)); }); history.unshift({ at: new Date().toISOString(), readings: Object.fromEntries(readings.map(({ id, value }) => [id, value])) }); history = history.slice(0, 80); localStorage.setItem('orbital-history', JSON.stringify(history)); markOverviewTask('checkin'); dialog.close(); render({ persist: true }); toast('Check-in shared with the assistant and anatomy map.'); });
document.getElementById('healthChartMetric').addEventListener('change', renderChart);
document.getElementById('symptomAdd').addEventListener('click', () => document.getElementById('symptomDialog').showModal());
document.getElementById('symptomForm').addEventListener('submit', (event) => { if (event.submitter?.value === 'cancel') return; event.preventDefault(); const data = new FormData(event.currentTarget); symptoms = addSymptomEntry({ kind: data.get('kind'), region: data.get('region'), severity: Number(data.get('severity')), note: String(data.get('note') || '').slice(0, 160), at: new Date().toISOString(), source: 'health-check-in' }); document.getElementById('symptomDialog').close(); renderSymptoms(); toast('Observation added to the shared health record.'); });
document.getElementById('healthReport').addEventListener('click', async () => { const text = ['Valmed · CREW HEALTH SUMMARY', new Date().toLocaleString('en-US'), '', 'Current readings:', ...readings.map((m) => `- ${m.name}: ${nice(m.value)} ${m.unit}`), '', 'Recent symptoms:', ...(symptoms.length ? symptoms.slice(0, 5).map((s) => `- ${symptomLabels[s.kind] || s.kind}, ${regionLabels[s.region] || s.region}, intensity ${s.severity}/10${s.note ? ` — ${s.note}` : ''}`) : ['- None logged']), '', 'Entered data only; not a diagnosis.'].join('\n'); try { await navigator.clipboard.writeText(text); toast('Report copied to clipboard.'); } catch { const area = document.createElement('textarea'); area.value = text; document.body.append(area); area.select(); document.execCommand('copy'); area.remove(); toast('Report copied.'); } });
document.getElementById('healthExport').addEventListener('click', () => { const csv = [['date', ...defs.map((d) => `${d[1]} (${d[2]})`)], ...history.map((entry) => [entry.at, ...defs.map((d) => entry.readings?.[d[0]] ?? '')])].map((row) => row.join(',')).join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'valmed-health-history.csv'; a.click(); URL.revokeObjectURL(a.href); });

window.addEventListener('storage', (event) => {
  if (event.key !== null && !['orbital-metrics', 'orbital-symptoms', 'orbital-history'].includes(event.key)) return;
  const latest = readMetricLog();
  hasSavedReadings = latest.length > 0;
  readings = defs.map(([id, name, unit, low, high, icon]) => ({ id, name, unit, low, high, icon, value: Number(latest.find((item) => item.id === id)?.value ?? defaults[id]) }));
  history = readHealthHistory();
  symptoms = readSymptomLog();
  render({ persist: false });
});
render();
