export const METRIC_DEFINITIONS = [
  { id: 'heartRate', name: 'Heart rate', unit: 'bpm', low: 60, high: 90 },
  { id: 'bloodPressure', name: 'Systolic blood pressure', unit: 'mmHg', low: 90, high: 140 },
  { id: 'bloodSugar', name: 'Blood glucose', unit: 'mg/dL', low: 70, high: 140 },
  { id: 'hydration', name: 'Hydration', unit: '%', low: 65, high: 100 },
  { id: 'sleep', name: 'Sleep', unit: 'hrs', low: 7, high: 9 },
  { id: 'temperature', name: 'Temperature', unit: '°C', low: 36, high: 38 },
  { id: 'oxygen', name: 'Blood oxygen', unit: '%', low: 94, high: 100 },
];

const SYMPTOM_WINDOW_MS = 24 * 60 * 60 * 1000;
const MEDICAL_ALERT_KEY = 'orbital-medical-alert-pending';
const MEDICAL_ALERT_SIGNATURE_KEY = 'orbital-medical-alert-signature';
const severityLevels = ['normal', 'warning', 'moderate', 'critical'];

function readArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function readMetricLog() {
  return readArray('orbital-metrics').filter((item) => item && typeof item === 'object');
}

export function readSymptomLog() {
  return readArray('orbital-symptoms').filter((item) => item && typeof item === 'object');
}

export function readHealthHistory() {
  return readArray('orbital-history').filter((item) => item && typeof item === 'object');
}

export function metricStatus(value, low, high) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 'unknown';
  const distance = numeric < low ? low - numeric : numeric > high ? numeric - high : 0;
  const span = high - low;
  return distance === 0 ? 'normal' : distance < span * .25 ? 'warning' : distance < span * .5 ? 'moderate' : 'critical';
}

export function symptomStatus(value) {
  const severity = Math.max(0, Math.min(10, Number(value) || 0));
  return severity >= 8 ? 'critical' : severity >= 5 ? 'moderate' : severity >= 1 ? 'warning' : 'normal';
}

export function readHealthSnapshot() {
  const storedMetrics = readMetricLog().filter((item) => item && typeof item === 'object');
  const readings = METRIC_DEFINITIONS.flatMap((definition) => {
    const stored = storedMetrics.find((item) => item.id === definition.id);
    if (stored?.value === null || stored?.value === undefined || stored?.value === '') return [];
    const value = Number(stored?.value);
    if (!Number.isFinite(value)) return [];
    return [{ ...definition, value, status: metricStatus(value, definition.low, definition.high), recordedAt: stored.at || null }];
  });
  const metricStatuses = Object.fromEntries(readings.map(({ id, status }) => [id, status]));
  const allSymptoms = readSymptomLog().filter((symptom) => symptom && typeof symptom === 'object');
  const now = Date.now();
  const currentSymptoms = allSymptoms
    .filter((symptom) => {
      const age = now - Date.parse(symptom.at);
      return Number.isFinite(age) && age >= 0 && age < SYMPTOM_WINDOW_MS;
    })
    .map((symptom) => ({ ...symptom, status: symptomStatus(symptom.severity) }))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const bodyRegions = {};
  for (const symptom of currentSymptoms) {
    if (symptom.status === 'normal') continue;
    const previous = bodyRegions[symptom.region];
    if (!previous || severityLevels.indexOf(symptom.status) > severityLevels.indexOf(previous)) bodyRegions[symptom.region] = symptom.status;
  }
  return {
    note: 'User-entered prototype values. Reference ranges are illustrative, unverified, and not clinical thresholds. Logged symptoms may be historical; only currentSymptoms are treated as recent reports.',
    readings,
    metricStatuses,
    currentSymptoms,
    recentSymptomHistory: allSymptoms.slice(0, 8),
    bodyRegions,
    hasReadings: readings.length > 0,
  };
}

function buildMedicalAlert(snapshot) {
  const now = Date.now();
  const prioritySymptoms = snapshot.currentSymptoms.filter((item) =>
    ['chest', 'breathing', 'fainting', 'confusion', 'weakness', 'rapid-worsening'].includes(item.kind) || Number(item.severity) >= 8,
  );
  const criticalReadings = snapshot.readings.filter((item) => {
    const age = now - Date.parse(item.recordedAt || '');
    return item.status === 'critical' && Number.isFinite(age) && age >= 0 && age < SYMPTOM_WINDOW_MS;
  });
  if (!prioritySymptoms.length && !criticalReadings.length) return null;

  const signature = JSON.stringify({
    symptoms: prioritySymptoms.map(({ at, kind, region, severity }) => [at, kind, region, severity]),
    readings: criticalReadings.map(({ id, value, recordedAt }) => [id, value, recordedAt]),
  });
  const symptomLabel = { chest: 'chest pain or pressure', breathing: 'difficulty breathing', fainting: 'fainting or loss of consciousness', confusion: 'sudden confusion', weakness: 'severe new weakness', 'rapid-worsening': 'rapidly worsening symptoms', headache: 'headache or dizziness', muscle: 'weakness or muscle pain', vision: 'vision changes', nausea: 'nausea', other: 'a reported symptom' };
  const symptomSummary = prioritySymptoms.map((item) => `${symptomLabel[item.kind] || 'a reported symptom'} (${item.region}, intensity ${item.severity}/10)`).join('; ');
  const readingSummary = criticalReadings.map((item) => `${item.name}: ${item.value} ${item.unit}`).join('; ');
  const type = prioritySymptoms.length ? 'priority-symptom' : 'critical-measurement';
  const prompt = prioritySymptoms.length
    ? `PRIORITY HEALTH ALERT — The astronaut has just confirmed a current symptom: ${symptomSummary}. This was entered in the crew check-in at ${new Date(prioritySymptoms[0].at).toISOString()}. Saved readings for this device: ${readingSummary || 'none currently saved'}. Respond with concise immediate safety guidance, direct the astronaut to the approved mission checklist and CMO/flight surgeon for urgent symptoms, and ask one focused question about onset or worsening. Do not diagnose or prescribe. This app's symptom severity and metric ranges are illustrative only.`
    : `HEALTH MEASUREMENT REVIEW ALERT — A saved reading was flagged critical by this prototype's illustrative range: ${readingSummary}. This flag is not a validated clinical threshold or a diagnosis. Ask the astronaut to verify the measurement using the mission-approved method, compare with their personal baseline, and report persistent or worsening results through the mission medical channel. Ask whether any symptoms are present. Do not diagnose or prescribe.`;
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    signature,
    createdAt: new Date().toISOString(),
    summary: prioritySymptoms.length ? `Current symptom: ${symptomSummary}` : `Reading to verify: ${readingSummary}`,
    prompt,
  };
}

function syncMedicalAlert(snapshot) {
  const alert = buildMedicalAlert(snapshot);
  try {
    if (!alert) {
      localStorage.removeItem(MEDICAL_ALERT_SIGNATURE_KEY);
      localStorage.removeItem(MEDICAL_ALERT_KEY);
      window.dispatchEvent(new CustomEvent('orbital:medical-alert', { detail: null }));
      return null;
    }
    if (localStorage.getItem(MEDICAL_ALERT_SIGNATURE_KEY) === alert.signature) return null;
    localStorage.setItem(MEDICAL_ALERT_SIGNATURE_KEY, alert.signature);
    localStorage.setItem(MEDICAL_ALERT_KEY, JSON.stringify(alert));
  } catch { /* The current page can still notify an open local assistant. */ }
  window.dispatchEvent(new CustomEvent('orbital:medical-alert', { detail: alert }));
  return alert;
}

export function readPendingMedicalAlert() {
  try {
    const alert = JSON.parse(localStorage.getItem(MEDICAL_ALERT_KEY) || 'null');
    return alert && typeof alert === 'object' && alert.id && alert.prompt ? alert : null;
  } catch {
    return null;
  }
}

export function clearPendingMedicalAlert(id) {
  const current = readPendingMedicalAlert();
  if (current?.id !== id) return false;
  try { localStorage.removeItem(MEDICAL_ALERT_KEY); } catch { return false; }
  window.dispatchEvent(new CustomEvent('orbital:medical-alert', { detail: null }));
  return true;
}

export function announceHealthStateChange() {
  const snapshot = readHealthSnapshot();
  window.Valmed_HEALTH = { ...snapshot.metricStatuses, bodyRegions: snapshot.bodyRegions, readings: snapshot.readings, currentSymptoms: snapshot.currentSymptoms };
  window.dispatchEvent(new CustomEvent('orbital:health-update', { detail: window.Valmed_HEALTH }));
  syncMedicalAlert(snapshot);
  return snapshot;
}

export function saveMetricLog(readings) {
  const values = readings
    .filter((reading) => reading && reading.value !== null && reading.value !== undefined && reading.value !== '' && Number.isFinite(Number(reading.value)))
    .map(({ id, value }) => ({ id, value: Number(value), at: new Date().toISOString() }));
  localStorage.setItem('orbital-metrics', JSON.stringify(values));
  announceHealthStateChange();
  return values;
}

export function saveSymptomLog(symptoms) {
  const values = symptoms.slice(0, 80);
  localStorage.setItem('orbital-symptoms', JSON.stringify(values));
  announceHealthStateChange();
  return values;
}

export function addSymptomEntry(entry) {
  return saveSymptomLog([entry, ...readSymptomLog()]);
}
