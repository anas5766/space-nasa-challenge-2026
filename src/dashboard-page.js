import { metricLabel, METRIC_DEFINITIONS, announceHealthStateChange, readHealthSnapshot } from './health-state.js';

announceHealthStateChange();

const defaults = { heartRate: 74, bloodPressure: 118, bloodSugar: 92, hydration: 63, sleep: 6.5, temperature: 36.7, oxygen: 98 };
const icons = { heartRate: '⌁', bloodPressure: '↕', bloodSugar: '◉', hydration: '◒', sleep: '☾', temperature: '♨', oxygen: '◉' };
const metricIds = new Set(['heartRate', 'hydration', 'sleep', 'oxygen']);
const metrics = METRIC_DEFINITIONS.filter(({ id }) => metricIds.has(id));
const today = document.getElementById('overviewDate');
today.textContent = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
const fmt = (value) => Number.isInteger(value) ? `${value}` : Number(value).toFixed(1);

function renderOverviewMetrics() {
  const snapshot = readHealthSnapshot();
  const assessment = snapshot.assessment;
  const metricFindings = new Map(assessment.findings.filter((finding) => finding.type === 'measurement').map((finding) => [finding.metricId, finding]));
  document.getElementById('overviewMetrics').innerHTML = metrics.map(({ id, name, unit }) => {
    const reading = snapshot.readings.find((item) => item.id === id);
    const finding = metricFindings.get(id);
    const value = reading?.value;
    const level = finding?.state || 'unknown';
    const displayLevel = ['attention', 'urgent'].includes(level) ? level : 'normal';
    const source = reading?.status === 'synthetic' ? 'SYNTHETIC · DEMO ONLY' : reading?.status === 'context-mismatch' ? 'OTHER MISSION · EXCLUDED' : reading?.status === 'stale' ? 'STALE · NOT CURRENT' : reading?.status === 'logged' ? `RECORDED ${reading.recordedAt ? new Date(reading.recordedAt).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }) : ''}` : 'NOT RECORDED';
    return `<a class="metric-card overview-metric ${displayLevel === 'attention' ? 'amber' : 'cyan'} ${displayLevel}" href="health.html"><div class="metric-top"><span class="metric-icon">${icons[id]}</span><span class="metric-state"><i></i>${reading?.status === 'unknown' ? 'NOT RECORDED' : reading?.status === 'synthetic' ? 'DEMO DATA' : reading?.status === 'stale' ? 'STALE' : reading?.status === 'context-mismatch' ? 'OTHER MISSION' : metricLabel(level)}</span></div><div class="metric-name">${name}</div><div class="metric-number">${value === null || value === undefined ? '—' : fmt(value)} <small>${unit}</small></div><div class="metric-range"><span>PERSONAL TREND · NO CLINICAL CUTOFF</span></div><div class="metric-bottom"><span class="metric-caption">${source}</span><span class="trend-pill neutral">VIEW ↗</span></div></a>`;
  }).join('');
  document.getElementById('overviewProgress').textContent = 'NOT A SCORE';
  document.getElementById('overviewBar').parentElement.hidden = true;
  document.getElementById('overviewStatusTitle').textContent = assessment.overallState === 'urgent' ? 'Urgent protocol escalation is active.' : assessment.overallState === 'attention' ? 'Review the changes listed below.' : assessment.overallState === 'normal' ? 'No change signal in available comparisons.' : 'Insufficient current, comparable data.';
  document.getElementById('overviewStatusDetail').textContent = `${assessment.summary} This is not medical clearance; synthetic, stale, mismatched, and missing records are labeled separately.`;
}

window.addEventListener('storage', (event) => {
  if (['orbital-metrics', 'orbital-history', 'orbital-symptoms', 'valmed-personal-reference-v1', 'valmed-mission-context-v1', 'valmed-demo-mission-150d-active'].includes(event.key) || event.key === null) renderOverviewMetrics();
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
