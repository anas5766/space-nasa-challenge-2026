const defs = [
  ['heartRate', 'Heart rate', 'bpm', 60, 90, '⌁'], ['bloodPressure', 'Systolic blood pressure', 'mmHg', 90, 140, '↕'],
  ['bloodSugar', 'Blood glucose', 'mg/dL', 70, 140, '◉'], ['hydration', 'Hydration', '%', 65, 100, '◒'],
  ['sleep', 'Sleep', 'hrs', 7, 9, '☾'], ['temperature', 'Temperature', '°C', 36, 38, '♨'], ['oxygen', 'Blood oxygen', '%', 94, 100, '◉'],
];
const read = (key, fallback) => { try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; } catch { return fallback; } };
let readings = defs.map(([id, name, unit, low, high, icon]) => ({ id, name, unit, low, high, icon, value: Number(read('orbital-metrics', []).find((item) => item.id === id)?.value ?? ({ heartRate: 74, bloodPressure: 118, bloodSugar: 92, hydration: 63, sleep: 6.5, temperature: 36.7, oxygen: 98 })[id]) }));
let history = read('orbital-history', []);
let symptoms = read('orbital-symptoms', []);
const status = (metric) => metric.value >= metric.low && metric.value <= metric.high ? 'normal' : metric.value < metric.low ? (metric.low - metric.value <= (metric.high - metric.low) * .2 ? 'warning' : 'moderate') : (metric.value - metric.high <= (metric.high - metric.low) * .2 ? 'warning' : 'moderate');
const nice = (n) => Number.isInteger(n) ? `${n}` : Number(n).toFixed(1);
const symptomLabels = { headache: 'Headache or dizziness', chest: 'Chest pain or pressure', breathing: 'Difficulty breathing', nausea: 'Nausea', muscle: 'Weakness or muscle pain', vision: 'Vision changes', other: 'Other' };
const regionLabels = { head: 'Head / eyes', chest: 'Chest', abdomen: 'Abdomen', back: 'Back', arm: 'Arm', leg: 'Leg', general: 'General' };
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const toast = (message) => { const node = document.getElementById('healthToast'); node.textContent = message; node.classList.add('visible'); setTimeout(() => node.classList.remove('visible'), 2400); };
const today = document.getElementById('healthDate'); today.textContent = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase();

function markOverviewTask(task) {
  try { const tasks = new Set(JSON.parse(localStorage.getItem('orbital-overview-tasks') || '[]')); tasks.add(task); localStorage.setItem('orbital-overview-tasks', JSON.stringify([...tasks])); } catch { /* Overview progress is optional. */ }
}
function render() {
  document.getElementById('healthMetrics').innerHTML = readings.map((m) => {
    const level = status(m); const pct = Math.min(100, Math.max(0, (m.value - m.low) / (m.high - m.low) * 100));
    return `<article class="metric-card ${level === 'normal' ? 'cyan' : 'amber'} ${level}"><div class="metric-top"><span class="metric-icon">${m.icon}</span><span class="metric-state"><i></i>${level === 'normal' ? 'STABLE' : 'ATTENTION'}</span></div><div class="metric-name">${m.name}</div><div class="metric-number">${nice(m.value)} <small>${m.unit}</small></div><div class="metric-range"><span>ILLUSTRATIVE RANGE</span><b>${m.low}–${m.high} ${m.unit}</b></div><div class="range-track"><span style="width:${pct}%"></span></div><div class="metric-bottom"><span class="metric-caption">USER-ENTERED</span><span class="trend-pill neutral">VIEW TREND</span></div></article>`;
  }).join('');
  const attention = readings.filter((m) => status(m) !== 'normal').length;
  document.getElementById('healthStatus').textContent = attention ? `${attention} signal${attention === 1 ? '' : 's'} outside illustrative ranges.` : 'Your entered signals are within illustrative ranges.';
  document.getElementById('healthMessage').textContent = 'These values are not clinical thresholds or a diagnosis. Review concerns with the mission medical team.';
  const readiness = Math.max(25, 100 - attention * 11);
  document.getElementById('healthReadiness').textContent = `${readiness}%`; document.getElementById('healthReadinessBar').style.width = `${readiness}%`;
  renderChart(); renderSymptoms();
  try { localStorage.setItem('orbital-metrics', JSON.stringify(readings.map(({ id, value }) => ({ id, value })))); } catch { /* local storage is optional */ }
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
  document.getElementById('symptomList').querySelectorAll('[data-remove-symptom]').forEach((button) => button.addEventListener('click', () => { symptoms.splice(Number(button.dataset.removeSymptom), 1); localStorage.setItem('orbital-symptoms', JSON.stringify(symptoms)); renderSymptoms(); }));
}

const dialog = document.getElementById('healthDialog'); const form = document.getElementById('healthForm');
document.getElementById('healthLog').addEventListener('click', () => { readings.forEach((m) => { if (form.elements[m.id]) form.elements[m.id].value = m.value; }); dialog.showModal(); });
form.addEventListener('submit', (event) => { if (event.submitter?.value === 'cancel') return; event.preventDefault(); const data = new FormData(form); readings.forEach((m) => { if (data.has(m.id)) m.value = Number(data.get(m.id)); }); history.unshift({ at: new Date().toISOString(), readings: Object.fromEntries(readings.map(({ id, value }) => [id, value])) }); history = history.slice(0, 80); localStorage.setItem('orbital-history', JSON.stringify(history)); markOverviewTask('checkin'); dialog.close(); render(); toast('Check-in saved on this device.'); });
document.getElementById('healthChartMetric').addEventListener('change', renderChart);
document.getElementById('symptomAdd').addEventListener('click', () => document.getElementById('symptomDialog').showModal());
document.getElementById('symptomForm').addEventListener('submit', (event) => { if (event.submitter?.value === 'cancel') return; event.preventDefault(); const data = new FormData(event.currentTarget); symptoms.unshift({ kind: data.get('kind'), region: data.get('region'), severity: Number(data.get('severity')), note: String(data.get('note') || '').slice(0, 160), at: new Date().toISOString() }); localStorage.setItem('orbital-symptoms', JSON.stringify(symptoms.slice(0, 80))); document.getElementById('symptomDialog').close(); renderSymptoms(); toast('Observation added to the local symptom log.'); });
document.getElementById('healthReport').addEventListener('click', async () => { const text = ['ORBITAL · CREW HEALTH SUMMARY', new Date().toLocaleString('en-US'), '', 'Current readings:', ...readings.map((m) => `- ${m.name}: ${nice(m.value)} ${m.unit}`), '', 'Recent symptoms:', ...(symptoms.length ? symptoms.slice(0, 5).map((s) => `- ${symptomLabels[s.kind] || s.kind}, ${regionLabels[s.region] || s.region}, intensity ${s.severity}/10${s.note ? ` — ${s.note}` : ''}`) : ['- None logged']), '', 'Entered data only; not a diagnosis.'].join('\n'); try { await navigator.clipboard.writeText(text); toast('Report copied to clipboard.'); } catch { const area = document.createElement('textarea'); area.value = text; document.body.append(area); area.select(); document.execCommand('copy'); area.remove(); toast('Report copied.'); } });
document.getElementById('healthExport').addEventListener('click', () => { const csv = [['date', ...defs.map((d) => `${d[1]} (${d[2]})`)], ...history.map((entry) => [entry.at, ...defs.map((d) => entry.readings?.[d[0]] ?? '')])].map((row) => row.join(',')).join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'orbital-health-history.csv'; a.click(); URL.revokeObjectURL(a.href); });
render();
