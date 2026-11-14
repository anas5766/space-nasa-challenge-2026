const levels = ['normal', 'warning', 'moderate', 'critical'];
const definitions = { heartRate: [60, 90], bloodPressure: [90, 140], bloodSugar: [70, 140], hydration: [65, 100], sleep: [7, 9], temperature: [36, 38], oxygen: [94, 100] };
let metrics = [];
try { metrics = JSON.parse(localStorage.getItem('orbital-metrics') || '[]'); } catch { metrics = []; }
const health = {};
for (const [id, [low, high]] of Object.entries(definitions)) {
  const value = Number(metrics.find((item) => item.id === id)?.value);
  if (!Number.isFinite(value)) continue;
  health[id] = value >= low && value <= high ? 'normal' : (value < low ? low - value : value - high) < (high - low) * .25 ? 'warning' : 'moderate';
}
try {
  const symptoms = JSON.parse(localStorage.getItem('orbital-symptoms') || '[]');
  health.bodyRegions = {};
  health.urgentRegions = [];
  for (const symptom of symptoms) {
    const level = symptom.severity >= 8 ? 'critical' : symptom.severity >= 5 ? 'moderate' : 'warning';
    if (!health.bodyRegions[symptom.region] || levels.indexOf(level) > levels.indexOf(health.bodyRegions[symptom.region])) health.bodyRegions[symptom.region] = level;
    if (/chest pain|difficulty breathing|faint/i.test(symptom.kind)) health.urgentRegions.push(symptom.region.toLowerCase().includes('chest') ? 'chest' : symptom.region.toLowerCase());
  }
} catch { /* An empty symptom log is valid. */ }
window.ORBITAL_HEALTH = health;
const root = document.getElementById('anatomyContainer');
import('./anatomy.js').then(({ mountAnatomyViewer }) => {
  const stop = mountAnatomyViewer(root, { onSelect: ({ label, level }) => { const banner = document.getElementById('anatomySelection'); banner.dataset.selected = label; banner.dataset.level = level; } });
  if (typeof stop === 'function') window.addEventListener('pagehide', stop, { once: true });
}).catch(() => { document.getElementById('anatomyStatus').textContent = 'Could not initialize the 3D viewer. Check WebGL support and try reloading.'; document.getElementById('anatomyRetry').addEventListener('click', () => location.reload()); });
