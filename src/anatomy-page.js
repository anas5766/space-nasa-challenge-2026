import { readHealthSnapshot } from './health-state.js';

function updateVitalsHud(snapshot) {
  const fields = [
    ['heartRate', 'anatomyHudHeartRate', 'anatomyHudHeartMeta', 'anatomyHudHeartCard'],
    ['oxygen', 'anatomyHudOxygen', 'anatomyHudOxygenMeta', 'anatomyHudOxygenCard'],
    ['sleep', 'anatomyHudSleep', 'anatomyHudSleepMeta', 'anatomyHudSleepCard'],
  ];
  for (const [id, valueId, metaId, cardId] of fields) {
    const reading = snapshot.readings.find((item) => item.id === id);
    const valueNode = document.getElementById(valueId);
    const metaNode = document.getElementById(metaId);
    const card = document.getElementById(cardId);
    if (!valueNode || !metaNode || !card) continue;
    valueNode.textContent = reading ? `${Number.isInteger(reading.value) ? reading.value : reading.value.toFixed(1)} ${reading.unit}` : '—';
    metaNode.textContent = reading ? `${reading.status.toUpperCase()} · SAVED` : 'Awaiting check-in';
    card.dataset.level = reading?.status || 'unknown';
  }
}

function refreshAnatomyState() {
  const snapshot = readHealthSnapshot();
  updateVitalsHud(snapshot);
  const now = Date.now();
  const currentReadings = snapshot.readings.filter((reading) => {
    const age = now - Date.parse(reading.recordedAt || '');
    return Number.isFinite(age) && age >= 0 && age < 24 * 60 * 60 * 1000;
  });
  const currentMetricStatuses = Object.fromEntries(currentReadings.map(({ id, status }) => [id, status]));
  window.ORBITAL_HEALTH = {
    ...currentMetricStatuses,
    bodyRegions: snapshot.bodyRegions,
    readings: currentReadings,
    currentSymptoms: snapshot.currentSymptoms,
  };
  window.dispatchEvent(new CustomEvent('orbital:health-update', { detail: window.ORBITAL_HEALTH }));
}

refreshAnatomyState();
window.addEventListener('storage', (event) => {
  if (event.key === 'orbital-metrics' || event.key === 'orbital-symptoms' || event.key === null) refreshAnatomyState();
});

const root = document.getElementById('anatomyContainer');
import('./anatomy.js').then(({ mountAnatomyViewer }) => {
  const stop = mountAnatomyViewer(root, { onSelect: ({ label, level }) => { const banner = document.getElementById('anatomySelection'); banner.dataset.selected = label; banner.dataset.level = level; } });
  if (typeof stop === 'function') window.addEventListener('pagehide', stop, { once: true });
}).catch(() => { document.getElementById('anatomyStatus').textContent = 'Could not initialize the 3D viewer. Check WebGL support and try reloading.'; document.getElementById('anatomyRetry').addEventListener('click', () => location.reload()); });
