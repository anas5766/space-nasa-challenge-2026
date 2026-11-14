import { METRIC_DEFINITIONS, announceHealthStateChange, metricStatus, readMetricLog } from './health-state.js';

announceHealthStateChange();

const defaults = { heartRate: 74, bloodPressure: 118, bloodSugar: 92, hydration: 63, sleep: 6.5, temperature: 36.7, oxygen: 98 };
const icons = { heartRate: '⌁', bloodPressure: '↕', bloodSugar: '◉', hydration: '◒', sleep: '☾', temperature: '♨', oxygen: '◉' };
const metricIds = new Set(['heartRate', 'hydration', 'sleep', 'oxygen']);
const metrics = METRIC_DEFINITIONS.filter(({ id }) => metricIds.has(id));
const today = document.getElementById('overviewDate');
today.textContent = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
const fmt = (value) => Number.isInteger(value) ? `${value}` : Number(value).toFixed(1);

function renderOverviewMetrics() {
  const stored = readMetricLog();
  const saved = Object.fromEntries(stored.map(({ id, value }) => [id, Number(value)]));
  const hasSaved = stored.length > 0;
  let attention = 0;
  document.getElementById('overviewMetrics').innerHTML = metrics.map(({ id, name, unit, low, high }) => {
    const value = saved[id] ?? defaults[id];
    const level = hasSaved ? metricStatus(value, low, high) : 'unknown';
    const okay = level === 'normal';
    if (hasSaved && !okay) attention += 1;
    const percent = Math.max(0, Math.min(100, (value - low) / (high - low) * 100));
    const cardLevel = hasSaved ? level : 'normal';
    const cardTone = level === 'normal' || !hasSaved ? 'cyan' : 'amber';
    const stateLabel = !hasSaved ? 'EXAMPLE' : okay ? 'STEADY' : level.toUpperCase();
    return `<a class="metric-card overview-metric ${cardTone} ${cardLevel}" href="health.html"><div class="metric-top"><span class="metric-icon">${icons[id]}</span><span class="metric-state"><i></i>${stateLabel}</span></div><div class="metric-name">${name}</div><div class="metric-number">${fmt(value)} <small>${unit}</small></div><div class="metric-range"><span>ILLUSTRATIVE RANGE</span><b>${low}–${high} ${unit}</b></div><div class="range-track"><span style="width:${percent}%"></span></div><div class="metric-bottom"><span class="metric-caption">${hasSaved ? 'LATEST SAVED VALUE' : 'SAMPLE · NOT SAVED'}</span><span class="trend-pill neutral">VIEW ↗</span></div></a>`;
  }).join('');
  const progress = hasSaved ? Math.max(30, 100 - attention * 13) : 0;
  document.getElementById('overviewProgress').textContent = hasSaved ? `${progress}%` : '—';
  document.getElementById('overviewBar').style.width = `${progress}%`;
  document.getElementById('overviewStatusTitle').textContent = !hasSaved ? 'Complete a check-in to load real readings.' : attention ? `${attention} signal${attention === 1 ? '' : 's'} to review.` : 'Your saved signals are within illustrative ranges.';
  document.getElementById('overviewStatusDetail').textContent = 'Check-in readings feed the local assistant and the 3D anatomy map. The displayed ranges are illustrative, not clinical thresholds.';
}

window.addEventListener('storage', (event) => {
  if (event.key === 'orbital-metrics' || event.key === null) renderOverviewMetrics();
});
renderOverviewMetrics();

let completed = new Set();
try { completed = new Set(JSON.parse(localStorage.getItem('orbital-overview-tasks') || '[]')); } catch { completed = new Set(); }
function paintTasks() {
  document.querySelectorAll('.overview-task').forEach((button) => button.classList.toggle('done', completed.has(button.dataset.task)));
  document.getElementById('overviewRoutineCount').textContent = `${completed.size} OF 3 COMPLETE`;
}
document.querySelectorAll('.overview-task').forEach((button) => button.addEventListener('click', () => {
  const destinations = { checkin: 'health.html', research: 'hazards.html', game: 'training.html' };
  location.href = destinations[button.dataset.task];
}));
paintTasks();
