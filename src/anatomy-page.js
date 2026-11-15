import { metricLabel, readHealthSnapshot } from './health-state.js';

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
    const hasValue = reading && reading.value !== null;
    valueNode.textContent = hasValue ? `${Number.isInteger(reading.value) ? reading.value : reading.value.toFixed(1)} ${reading.unit}` : '—';
    metaNode.textContent = hasValue ? metricLabel(reading.status) : 'NOT RECORDED';
    card.dataset.level = reading?.status || 'unknown';
  }
}

function refreshAnatomyState() {
  const snapshot = readHealthSnapshot();
  updateVitalsHud(snapshot);
  const currentReadings = snapshot.currentReadings;
  const currentMetricStatuses = Object.fromEntries(currentReadings.map(({ id, status }) => [id, status]));
  window.Valmed_HEALTH = {
    ...currentMetricStatuses,
    bodyRegions: snapshot.bodyRegions,
    readings: currentReadings,
    currentSymptoms: snapshot.currentSymptoms,
  };
  window.dispatchEvent(new CustomEvent('orbital:health-update', { detail: window.Valmed_HEALTH }));
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
