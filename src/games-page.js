import { addSymptomEntry, announceHealthStateChange } from './health-state.js';

const $ = (selector) => document.querySelector(selector);
announceHealthStateChange();
const scoreStore = (() => {
  try { return JSON.parse(localStorage.getItem('orbital-game-scores') || '{}'); }
  catch { return {}; }
})();

function saveScore(id, score) {
  scoreStore[id] = Math.max(Number(scoreStore[id]) || 0, Number(score) || 0);
  try { localStorage.setItem('orbital-game-scores', JSON.stringify(scoreStore)); } catch { /* Scores are a convenience only. */ }
  updateDeck();
}

function markGamePlayed() {
  try {
    const tasks = new Set(JSON.parse(localStorage.getItem('orbital-overview-tasks') || '[]'));
    tasks.add('game');
    localStorage.setItem('orbital-overview-tasks', JSON.stringify([...tasks]));
  } catch { /* Overview progress is optional. */ }
}

function updateDeck() {
  const total = Object.values(scoreStore).reduce((sum, value) => sum + (Number(value) || 0), 0);
  $('#gameProgressTitle').textContent = total ? `${total} focus points earned` : 'A fresh start';
  $('#gameProgressText').textContent = total
    ? 'Personal bests stay on this device. Game scores are for engagement, not health assessment.'
    : 'Choose a short activity. Your scores stay on this device and are not medical measurements.';
  $('#gameMedal').textContent = total > 30 ? '✦' : total > 0 ? '✧' : '·';
}

// Comfortable, adjustable visual breathing. There are no breath holds.
let breathTimer = null;
let breathElapsed = 0;
let breathStartedAt = 0;
let breathDuration = 60;
let inhaleSeconds = 4;
let exhaleSeconds = 6;
let breathCycles = 0;
let previousBreathPhase = null;

function renderBreathing() {
  const cycleLength = inhaleSeconds + exhaleSeconds;
  const phaseSecond = breathElapsed % cycleLength;
  const inhaling = phaseSecond < inhaleSeconds;
  const secondsLeft = inhaling ? inhaleSeconds - phaseSecond : cycleLength - phaseSecond;
  const phase = inhaling ? 'inhale' : 'exhale';
  if (phase !== previousBreathPhase) {
    const phaseDuration = previousBreathPhase === null
      ? secondsLeft
      : inhaling ? inhaleSeconds : exhaleSeconds;
    $('.breath-ring').style.setProperty('--breath-phase-duration', `${Math.max(0.2, phaseDuration)}s`);
    previousBreathPhase = phase;
  }
  const complete = breathElapsed >= breathDuration;
  $('#breathCue').textContent = complete ? 'Complete' : `${inhaling ? 'Breathe in' : 'Breathe out'} · ${Math.max(1, Math.ceil(secondsLeft))}`;
  $('#breathStage').classList.toggle('breath-expanded', !complete && inhaling);
  breathCycles = Math.floor(breathElapsed / cycleLength);
  $('#breathScore').textContent = `${breathCycles} cycle${breathCycles === 1 ? '' : 's'} · ${Math.max(0, Math.ceil(breathDuration - breathElapsed))}s`;
  const percent = Math.min(100, Math.round((breathElapsed / breathDuration) * 100));
  $('#breathProgress').style.width = `${percent}%`;
  $('.breath-progress').setAttribute('aria-valuenow', String(percent));
}

function finishBreathing(completed) {
  if (breathTimer) clearInterval(breathTimer);
  breathTimer = null;
  if (!completed) renderBreathing();
  $('#breathStage').classList.remove('breath-expanded');
  previousBreathPhase = null;
  $('#breathStart').disabled = false;
  $('#breathStop').disabled = true;
  $('#breathCadence').disabled = false;
  $('#breathDuration').disabled = false;
  $('#breathStage').classList.remove('breathing-active');
  if (completed) {
    breathElapsed = breathDuration;
    renderBreathing();
    $('#breathScore').textContent = `${breathCycles} cycles · session complete`;
    saveScore('breath', breathCycles * 5);
    markGamePlayed();
    $('#breathStart').textContent = 'Start again';
  } else {
    $('#breathCue').textContent = 'Paused';
    $('#breathScore').textContent = `${breathCycles} cycles · paused`;
    $('#breathStart').textContent = 'Resume session';
  }
}

function breathTick() {
  breathElapsed = Math.min(breathDuration, (Date.now() - breathStartedAt) / 1000);
  renderBreathing();
  if (breathElapsed >= breathDuration) finishBreathing(true);
}

$('#breathStart').addEventListener('click', () => {
  if (breathTimer) return;
  breathDuration = Number($('#breathDuration').value) || 60;
  if (breathElapsed >= breathDuration) breathElapsed = 0;
  [inhaleSeconds, exhaleSeconds] = $('#breathCadence').value.split('-').map(Number);
  breathStartedAt = Date.now() - breathElapsed * 1000;
  $('#breathStart').disabled = true;
  $('#breathStop').disabled = false;
  $('#breathCadence').disabled = true;
  $('#breathDuration').disabled = true;
  $('#breathStart').textContent = 'Resume session';
  $('#breathStage').classList.add('breathing-active');
  breathTick();
  breathTimer = setInterval(breathTick, 200);
});

$('#breathStop').addEventListener('click', () => finishBreathing(false));
$('#breathCadence').addEventListener('change', () => {
  breathElapsed = 0;
  previousBreathPhase = null;
  [inhaleSeconds, exhaleSeconds] = $('#breathCadence').value.split('-').map(Number);
  renderBreathing();
  $('#breathStart').textContent = 'Start session';
});
$('#breathDuration').addEventListener('change', () => {
  breathElapsed = 0;
  previousBreathPhase = null;
  breathDuration = Number($('#breathDuration').value) || 60;
  renderBreathing();
  $('#breathStart').textContent = 'Start session';
});

// Visual scan. Score, accuracy, and streak are game feedback only, never health signals.
const glyphs = ['✦', '✧', '✷', '✳', '⋆', '⊹'];
let focusTarget = '';
let focusTimer = null;
let focusSeconds = 30;
let focusDuration = 30;
let focusScore = 0;
let focusMisses = 0;
let focusStreak = 0;
let focusRound = 0;

function newField() {
  const base = glyphs[Math.floor(Math.random() * glyphs.length)];
  const alternatives = glyphs.filter((glyph) => glyph !== base);
  focusTarget = alternatives[Math.floor(Math.random() * alternatives.length)];
  const size = Number($('#focusGridSize').value) || 35;
  const targetAt = Math.floor(Math.random() * size);
  const grid = $('#focusGrid');
  grid.replaceChildren();
  grid.style.gridTemplateColumns = `repeat(${Math.ceil(Math.sqrt(size))}, minmax(0, 1fr))`;
  for (let index = 0; index < size; index += 1) {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', `Star ${index + 1}`);
    button.dataset.target = String(index === targetAt);
    button.textContent = index === targetAt ? focusTarget : base;
    grid.append(button);
  }
  focusRound += 1;
  $('#focusRound').textContent = String(focusRound).padStart(2, '0');
}

function updateFocusStats() {
  const attempts = focusScore + focusMisses;
  $('#focusScore').textContent = String(focusScore);
  $('#focusAccuracy').textContent = attempts ? `${Math.round((focusScore / attempts) * 100)}%` : '—';
}

function stopFocus({ completed = false, paused = false } = {}) {
  if (focusTimer) clearInterval(focusTimer);
  focusTimer = null;
  $('#focusStart').disabled = false;
  $('#focusStop').disabled = true;
  $('#focusGrid').classList.add('game-locked');
  $('#focusGridSize').disabled = false;
  $('#focusDuration').disabled = false;
  if (completed) {
    $('#focusResult').textContent = `Session complete · ${focusScore} signals · ${$('#focusAccuracy').textContent} accuracy`;
    saveScore('scan', focusScore * 2);
    markGamePlayed();
  } else if (paused) {
    $('#focusResult').textContent = `Paused · ${focusScore} found. Start a new scan when ready.`;
  } else {
    $('#focusResult').textContent = `Scan ended · ${focusScore} found`;
    if (focusScore) saveScore('scan', focusScore * 2);
    markGamePlayed();
  }
}

$('#focusGrid').addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button || !focusTimer) return;
  if (button.dataset.target === 'true') {
    focusScore += 1;
    focusStreak += 1;
    $('#focusResult').textContent = focusStreak >= 3 ? `Signal acquired · ${focusStreak} in a row` : 'Signal acquired';
    newField();
  } else {
    focusMisses += 1;
    focusStreak = 0;
    button.classList.add('missed');
    $('#focusResult').textContent = 'No penalty · scan the field again';
    setTimeout(() => button.classList.remove('missed'), 300);
  }
  updateFocusStats();
});

$('#focusStart').addEventListener('click', () => {
  focusScore = 0;
  focusMisses = 0;
  focusStreak = 0;
  focusRound = 0;
  focusDuration = Number($('#focusDuration').value) || 30;
  focusSeconds = focusDuration;
  $('#focusScore').textContent = '0';
  $('#focusAccuracy').textContent = '—';
  $('#focusTime').textContent = String(focusSeconds);
  $('#focusStart').disabled = true;
  $('#focusStop').disabled = false;
  $('#focusGridSize').disabled = true;
  $('#focusDuration').disabled = true;
  $('#focusGrid').classList.remove('game-locked');
  newField();
  $('#focusResult').textContent = 'Find the one different signal';
  const startedAt = Date.now();
  focusTimer = setInterval(() => {
    focusSeconds = Math.max(0, focusDuration - Math.floor((Date.now() - startedAt) / 1000));
    $('#focusTime').textContent = String(focusSeconds);
    if (focusSeconds <= 0) stopFocus({ completed: true });
  }, 250);
});

$('#focusStop').addEventListener('click', () => stopFocus());
$('#focusReset').addEventListener('click', () => {
  if (focusTimer) return;
  newField();
  focusRound = 0;
  $('#focusRound').textContent = '01';
  $('#focusResult').textContent = 'New field ready';
});

// Sequence recall with cancellable playback and a user-controlled end button.
let sequence = [];
let sequenceInput = [];
let memoryLocked = true;
let memoryActive = false;
let memoryRun = 0;
let memoryRunBest = Math.floor((scoreStore.memory || 0) / 3);
let playbackTimers = [];
const memoryPads = [...document.querySelectorAll('#memoryPad button')];

function clearPlayback() {
  playbackTimers.forEach(clearTimeout);
  playbackTimers = [];
  memoryPads.forEach((pad) => pad.classList.remove('lit'));
}

function flashPad(index, duration = 360) {
  memoryPads[index].classList.add('lit');
  const timer = setTimeout(() => memoryPads[index].classList.remove('lit'), duration);
  playbackTimers.push(timer);
}

function endMemory(message = 'Session ended.') {
  clearPlayback();
  memoryActive = false;
  memoryLocked = true;
  $('#memoryStart').disabled = false;
  $('#memoryStop').disabled = true;
  $('#memoryStatus').textContent = message;
  if (memoryRunBest) saveScore('memory', memoryRunBest * 3);
  if (memoryRun > 0) markGamePlayed();
  sequence = [];
  sequenceInput = [];
}

function playSequence() {
  clearPlayback();
  memoryLocked = true;
  $('#memoryStatus').textContent = 'Watch the lights…';
  sequence.forEach((padIndex, index) => {
    const timer = setTimeout(() => { if (memoryActive) flashPad(padIndex, 340); }, 450 + index * 660);
    playbackTimers.push(timer);
  });
  playbackTimers.push(setTimeout(() => {
    if (!memoryActive) return;
    memoryLocked = false;
    sequenceInput = [];
    $('#memoryStatus').textContent = 'Your turn — repeat the sequence.';
  }, 450 + sequence.length * 660));
}

function nextMemoryRound() {
  if (!memoryActive) return;
  memoryRun += 1;
  sequence.push(Math.floor(Math.random() * memoryPads.length));
  $('#memoryScore').textContent = `Round ${memoryRun} · Best ${memoryRunBest}`;
  playSequence();
}

$('#memoryStart').addEventListener('click', () => {
  memoryRun = 0;
  sequence = [];
  memoryActive = true;
  $('#memoryStart').disabled = true;
  $('#memoryStop').disabled = false;
  nextMemoryRound();
});

$('#memoryStop').addEventListener('click', () => endMemory(`Session ended · ${Math.max(0, memoryRun - 1)} rounds completed.`));

memoryPads.forEach((pad, index) => pad.addEventListener('click', () => {
  if (memoryLocked || !memoryActive || !sequence.length) return;
  flashPad(index, 170);
  sequenceInput.push(index);
  const offset = sequenceInput.length - 1;
  if (sequenceInput[offset] !== sequence[offset]) {
    memoryLocked = true;
    memoryRunBest = Math.max(memoryRunBest, memoryRun - 1);
    $('#memoryScore').textContent = `Best ${memoryRunBest}`;
    endMemory(`Sequence ended · ${memoryRun - 1} rounds completed. No health conclusion is drawn from this score.`);
    return;
  }
  if (sequenceInput.length === sequence.length) {
    memoryRunBest = Math.max(memoryRunBest, memoryRun);
    saveScore('memory', memoryRunBest * 3);
    window.setTimeout(nextMemoryRound, 700);
  }
}));

// A self-report check-in can create a health alert; game scores never can.
$('#crewCheckConcern').addEventListener('click', () => {
  $('#crewCheckForm').hidden = false;
  $('#crewCheckResult').textContent = '';
  $('#crewSymptomKind').focus();
});

$('#crewCheckOkay').addEventListener('click', () => {
  $('#crewCheckForm').hidden = true;
  $('#crewCheckResult').textContent = 'Check-in noted. Take a short break or choose another optional activity.';
  saveScore('checkin', 1);
  markGamePlayed();
});

$('#crewSymptomSeverity').addEventListener('input', (event) => {
  $('#crewSeverityValue').value = `${event.target.value} / 10`;
  $('#crewSeverityValue').textContent = `${event.target.value} / 10`;
});

$('#crewCheckSave').addEventListener('click', () => {
  const kind = $('#crewSymptomKind').value;
  const region = $('#crewSymptomRegion').value;
  const severity = Number($('#crewSymptomSeverity').value);
  addSymptomEntry({ kind, region, severity, note: 'Crew wellness check-in', at: new Date().toISOString(), source: 'wellness-check' });
  const prioritySignal = ['chest', 'breathing', 'fainting', 'confusion', 'weakness', 'rapid-worsening'].includes(kind) || severity >= 8;
  const result = $('#crewCheckResult');
  result.replaceChildren(document.createTextNode(prioritySignal
    ? 'Priority signal queued for the assistant. Open ORBITAL for local review. For severe symptoms, follow the mission emergency protocol now; do not wait for AI. '
    : 'Check-in saved to the health log. This report is not a diagnosis. '));
  const link = document.createElement('a');
  link.href = 'assistant.html';
  link.textContent = 'Open ORBITAL ↗';
  result.append(link);
  $('#crewCheckForm').hidden = true;
  saveScore('checkin', 1);
  markGamePlayed();
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) return;
  if (breathTimer) {
    breathElapsed = Math.min(breathDuration, (Date.now() - breathStartedAt) / 1000);
    finishBreathing(false);
  }
  if (focusTimer) stopFocus({ paused: true });
  if (memoryActive) endMemory(`Session paused · ${Math.max(0, memoryRun - 1)} rounds completed. Start again when ready.`);
});

updateDeck();
$('#memoryScore').textContent = `Best ${memoryRunBest}`;
renderBreathing();
