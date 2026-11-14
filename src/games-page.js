const $ = (selector) => document.querySelector(selector);
const scoreStore = (() => { try { return JSON.parse(localStorage.getItem('orbital-game-scores') || '{}'); } catch { return {}; } })();
function saveScore(id, score) { scoreStore[id] = Math.max(scoreStore[id] || 0, score); try { localStorage.setItem('orbital-game-scores', JSON.stringify(scoreStore)); } catch { /* Scores are a convenience only. */ } updateDeck(); }
function markGamePlayed() { try { const tasks = new Set(JSON.parse(localStorage.getItem('orbital-overview-tasks') || '[]')); tasks.add('game'); localStorage.setItem('orbital-overview-tasks', JSON.stringify([...tasks])); } catch { /* Overview progress is optional. */ } }
function updateDeck() {
  const total = Object.values(scoreStore).reduce((sum, value) => sum + value, 0);
  $('#gameProgressTitle').textContent = total ? `${total} focus points earned` : 'A fresh start';
  $('#gameProgressText').textContent = total ? 'Your best scores are saved on this device. Return whenever you like.' : 'Choose a game to begin. Your activity scores stay on this device.';
  $('#gameMedal').textContent = total > 30 ? '✦' : total > 0 ? '✧' : '·';
}

// A slow, no-hold visual breathing cue. Always optional; stop at any time.
let breathTimer = null; let breathLeft = 60; let cycles = 0; let breathPhase = 'inhale';
function breathTick() {
  if (breathLeft <= 0) { clearInterval(breathTimer); breathTimer = null; $('#breathCue').textContent = 'Complete'; $('#breathStage').classList.remove('breathing-active'); $('#breathStart').disabled = false; $('#breathStop').disabled = true; $('#breathScore').textContent = `${cycles} cycles · session complete`; saveScore('breath', cycles * 5); markGamePlayed(); return; }
  const phaseSecond = (60 - breathLeft) % 8;
  breathPhase = phaseSecond < 4 ? 'inhale' : 'exhale';
  $('#breathCue').textContent = `${breathPhase === 'inhale' ? 'Breathe in' : 'Breathe out'} · ${breathPhase === 'inhale' ? 4 - phaseSecond : 8 - phaseSecond}`;
  $('#breathStage').classList.toggle('breath-expanded', breathPhase === 'inhale');
  if (phaseSecond === 0 && breathLeft < 60) cycles += 1;
  $('#breathScore').textContent = `${cycles} cycle${cycles === 1 ? '' : 's'} · ${breathLeft}s`;
  breathLeft -= 1;
}
$('#breathStart').addEventListener('click', () => { if (breathTimer) return; breathLeft = 60; cycles = 0; $('#breathStart').disabled = true; $('#breathStage').classList.add('breathing-active'); breathTick(); breathTimer = setInterval(breathTick, 1000); });
$('#breathStop').addEventListener('click', () => { clearInterval(breathTimer); breathTimer = null; $('#breathStart').disabled = false; $('#breathCue').textContent = 'Ready?'; $('#breathStage').classList.remove('breathing-active', 'breath-expanded'); $('#breathScore').textContent = `${cycles} cycles · ended`; $('#breathStop').disabled = true; if (cycles) saveScore('breath', cycles * 5); markGamePlayed(); });
$('#breathStart').addEventListener('click', () => { $('#breathStop').disabled = false; });
$('#breathStop').addEventListener('click', () => { $('#breathStop').disabled = true; });

// Visual scan: one different glyph is chosen at random each round.
const glyphs = ['✦', '✧', '✷', '✳', '⋆', '⊹']; let focusTarget = ''; let focusTimer = null; let focusSeconds = 30; let focusScore = 0; let focusRound = 0;
function newField() {
  const base = glyphs[Math.floor(Math.random() * glyphs.length)];
  const alternatives = glyphs.filter((glyph) => glyph !== base); focusTarget = alternatives[Math.floor(Math.random() * alternatives.length)];
  const targetAt = Math.floor(Math.random() * 35);
  $('#focusGrid').innerHTML = Array.from({ length: 35 }, (_, index) => `<button type="button" aria-label="Star ${index + 1}" data-target="${index === targetAt}">${index === targetAt ? focusTarget : base}</button>`).join('');
  $('#focusRound').textContent = String(focusRound + 1).padStart(2, '0');
}
function stopFocus() { clearInterval(focusTimer); focusTimer = null; $('#focusStart').disabled = false; $('#focusGrid').classList.remove('game-locked'); $('#focusResult').textContent = `Session complete · ${focusScore} found`; saveScore('scan', focusScore * 2); markGamePlayed(); }
$('#focusGrid').addEventListener('click', (event) => { const button = event.target.closest('button'); if (!button || !focusTimer) return; if (button.dataset.target === 'true') { focusScore += 1; focusRound += 1; $('#focusScore').textContent = focusScore; $('#focusResult').textContent = 'Signal acquired'; newField(); } else { button.classList.add('missed'); $('#focusResult').textContent = 'Keep scanning'; setTimeout(() => button.classList.remove('missed'), 300); } });
$('#focusStart').addEventListener('click', () => { clearInterval(focusTimer); focusScore = 0; focusRound = 0; focusSeconds = 30; $('#focusScore').textContent = '0'; $('#focusTime').textContent = '30'; $('#focusStart').disabled = true; $('#focusGrid').classList.remove('game-locked'); newField(); $('#focusResult').textContent = 'Scan the field'; focusTimer = setInterval(() => { focusSeconds -= 1; $('#focusTime').textContent = focusSeconds; if (focusSeconds <= 0) stopFocus(); }, 1000); });
$('#focusReset').addEventListener('click', () => { newField(); if (!focusTimer) $('#focusResult').textContent = 'New field ready'; });

// Sequence recall with four large, keyboard-accessible pads.
let sequence = []; let sequenceInput = []; let memoryLocked = true; let memoryRun = 0; let bestMemory = scoreStore.memory || 0;
const memoryPads = [...document.querySelectorAll('#memoryPad button')];
function flashPad(index, duration = 360) { memoryPads[index].classList.add('lit'); setTimeout(() => memoryPads[index].classList.remove('lit'), duration); }
function playSequence() { memoryLocked = true; $('#memoryStatus').textContent = 'Watch the lights…'; let index = 0; const timer = setInterval(() => { if (index >= sequence.length) { clearInterval(timer); memoryLocked = false; sequenceInput = []; $('#memoryStatus').textContent = 'Your turn — repeat the sequence.'; return; } flashPad(sequence[index]); index += 1; }, 650); }
function nextMemoryRound() { memoryRun += 1; sequence.push(Math.floor(Math.random() * 4)); $('#memoryScore').textContent = `Round ${memoryRun} · Best ${bestMemory}`; playSequence(); }
$('#memoryStart').addEventListener('click', () => { memoryRun = 0; sequence = []; $('#memoryStart').disabled = true; nextMemoryRound(); });
memoryPads.forEach((pad, index) => pad.addEventListener('click', () => {
  if (memoryLocked || !sequence.length) return;
  flashPad(index, 170); sequenceInput.push(index);
  const offset = sequenceInput.length - 1;
  if (sequenceInput[offset] !== sequence[offset]) { memoryLocked = true; $('#memoryStatus').textContent = `Sequence missed · ${memoryRun - 1} rounds completed`; bestMemory = Math.max(bestMemory, memoryRun - 1); saveScore('memory', bestMemory * 3); $('#memoryScore').textContent = `Best ${bestMemory}`; $('#memoryStart').disabled = false; sequence = []; markGamePlayed(); return; }
  if (sequenceInput.length === sequence.length) { bestMemory = Math.max(bestMemory, memoryRun); saveScore('memory', bestMemory * 3); setTimeout(nextMemoryRound, 700); }
}));
document.addEventListener('visibilitychange', () => { if (document.hidden && breathTimer) $('#breathStop').click(); });
updateDeck(); $('#memoryScore').textContent = `Best ${bestMemory}`;
