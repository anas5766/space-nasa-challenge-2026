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

export const metricLabel = (level) => ({normal:'STABLE', warning:'ATTENTION', moderate:'MODERATE', critical:'CRITICAL'})[level] || 'UNKNOWN';

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
    return [{ ...definition, value, status: 'logged', recordedAt: stored.at || null }];
  });
  const metricStatuses = Object.fromEntries(readings.map(({ id, status }) => [id, status]));
  const allSymptoms = readSymptomLog().filter((symptom) => symptom && typeof symptom === 'object');
  const now = Date.now();
  const currentSymptoms = allSymptoms
    .filter((symptom) => {
      const age = now - Date.parse(symptom.at);
      return Number.isFinite(age) && age >= 0 && age < SYMPTOM_WINDOW_MS;
    })
    .map((symptom) => ({
      ...symptom,
      status: symptom.protocolLevel === 'emergency' ? 'critical'
        : symptom.protocolLevel === 'urgent' && symptomStatus(symptom.severity) === 'normal' ? 'moderate'
          : symptomStatus(symptom.severity),
    }))
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
  const prioritySymptoms = snapshot.currentSymptoms.filter((item) =>
    ['chest', 'breathing', 'fainting', 'confusion', 'weakness', 'rapid-worsening'].includes(item.kind) || Number(item.severity) >= 8,
  );
  // The dashboard's display ranges are illustrative and cannot trigger medical alerts.
  if (!prioritySymptoms.length) return null;

  const signature = JSON.stringify({
    symptoms: prioritySymptoms.map(({ at, kind, region, severity }) => [at, kind, region, severity]),
  });
  const symptomLabel = { chest: 'chest pain or pressure', breathing: 'difficulty breathing', fainting: 'fainting or loss of consciousness', confusion: 'sudden confusion', weakness: 'severe new weakness', 'rapid-worsening': 'rapidly worsening symptoms', headache: 'headache or dizziness', muscle: 'weakness or muscle pain', vision: 'vision changes', nausea: 'nausea', other: 'a reported symptom' };
  const symptomSummary = prioritySymptoms.map((item) => `${symptomLabel[item.kind] || 'a reported symptom'} (${item.region}, intensity ${item.severity}/10)`).join('; ');
  const prompt = `PRIORITY HEALTH ALERT — The astronaut has just confirmed a current symptom: ${symptomSummary}. This was entered in the crew check-in at ${new Date(prioritySymptoms[0].at).toISOString()}. Respond with concise immediate safety guidance, direct the astronaut to the approved mission checklist and available mission medical support. If no clinician is reachable, acknowledge that constraint and help the astronaut follow the approved onboard protocol, check immediate danger, and report via the mission communications procedure. Ask one focused question about onset or worsening. Do not diagnose or prescribe. Dashboard measurement ranges are illustrative only.`;
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: 'priority-symptom',
    signature,
    createdAt: new Date().toISOString(),
    summary: `Current symptom: ${symptomSummary}`,
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
  const previous = new Map(readMetricLog().map((item) => [item.id, item]));
  const timestamp = new Date().toISOString();
  for (const reading of readings) {
    if (!reading || reading.value === null || reading.value === undefined || reading.value === '' || !Number.isFinite(Number(reading.value))) continue;
    previous.set(reading.id, { id: reading.id, value: Number(reading.value), at: timestamp });
  }
  const values = [...previous.values()]
    .filter((reading) => reading && reading.value !== null && reading.value !== undefined && reading.value !== '' && Number.isFinite(Number(reading.value)))
    .map(({ id, value, at }) => ({ id, value: Number(value), at: at || timestamp }));
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
