const initial = { heartRate: 74, bloodPressure: 118, bloodSugar: 92, hydration: 63, sleep: 6.5, temperature: 36.7, oxygen: 98 };
const meta = [
  ['heartRate', 'Heart rate', 'bpm', 60, 90, '⌁'], ['hydration', 'Hydration', '%', 65, 100, '◒'],
  ['sleep', 'Sleep', 'hrs', 7, 9, '☾'], ['oxygen', 'Blood oxygen', '%', 94, 100, '◉'],
];
let stored = [];
try { stored = JSON.parse(localStorage.getItem('orbital-metrics') || '[]'); } catch { stored = []; }
const scores = Object.fromEntries(stored.map(({ id, value }) => [id, Number(value)]));
const today = document.getElementById('overviewDate'); today.textContent = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
const fmt = (value) => Number.isInteger(value) ? `${value}` : Number(value).toFixed(1);
let attention = 0;
document.getElementById('overviewMetrics').innerHTML = meta.map(([id, name, unit, min, max, icon]) => {
  const value = scores[id] ?? initial[id]; const okay = value >= min && value <= max; if (!okay) attention += 1;
  const percent = Math.max(0, Math.min(100, (value - min) / (max - min) * 100));
  return `<a class="metric-card overview-metric ${okay ? 'cyan normal' : 'amber warning'}" href="health.html"><div class="metric-top"><span class="metric-icon">${icon}</span><span class="metric-state"><i></i>${okay ? 'RECORDED' : 'REVIEW'}</span></div><div class="metric-name">${name}</div><div class="metric-number">${fmt(value)} <small>${unit}</small></div><div class="metric-range"><span>ILLUSTRATIVE RANGE</span><b>${min}–${max} ${unit}</b></div><div class="range-track"><span style="width:${percent}%"></span></div><div class="metric-bottom"><span class="metric-caption">LATEST SAVED VALUE</span><span class="trend-pill neutral">VIEW ↗</span></div></a>`;
}).join('');
const progress = Math.max(30, 100 - attention * 13);
document.getElementById('overviewProgress').textContent = `${progress}%`;
document.getElementById('overviewBar').style.width = `${progress}%`;
document.getElementById('overviewStatusTitle').textContent = attention ? `${attention} signal${attention === 1 ? '' : 's'} to review.` : 'Your saved signals look steady.';
document.getElementById('overviewStatusDetail').textContent = 'These prototype ranges are illustrative. Share health concerns with the crew medical team.';

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
