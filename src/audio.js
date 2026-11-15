const AudioContextClass = window.AudioContext || window.webkitAudioContext;

export function mountAudioDock() {
  if (!AudioContextClass || document.querySelector('.audio-dock')) return;
  const dock = document.createElement('aside');
  dock.className = 'audio-dock';
  dock.setAttribute('aria-label', 'Audio settings');
  dock.innerHTML = '<button class="audio-toggle" type="button" aria-pressed="true"><span aria-hidden="true">♫</span><span class="audio-label">AMBIENCE · READY</span></button><label class="audio-volume"><span>VOL</span><input type="range" min="0" max="100" value="28" aria-label="Background audio volume"></label>';
  document.body.append(dock);
  const button = dock.querySelector('.audio-toggle');
  const label = dock.querySelector('.audio-label');
  const volume = dock.querySelector('input');
  let context;
  let master;
  let enabled = true;
  let started = false;
  try { enabled = localStorage.getItem('orbital-audio-muted') !== 'true'; } catch { /* Keep audio available for this visit. */ }

  const update = () => {
    button.setAttribute('aria-pressed', String(enabled));
    button.setAttribute('aria-label', enabled ? 'Mute ambient audio' : 'Enable ambient audio');
    label.textContent = !enabled ? 'AMBIENCE · OFF' : started ? 'AMBIENCE · ON' : 'AMBIENCE · READY';
    dock.dataset.audio = !enabled ? 'off' : started ? 'on' : 'ready';
  };
  const start = async () => {
    if (!enabled) return;
    try {
      if (!context) {
        context = new AudioContextClass();
        master = context.createGain();
        master.gain.value = 0;
        master.connect(context.destination);
        const filter = context.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.value = 220; filter.Q.value = .5;
        const bed = context.createGain(); bed.gain.value = .045; filter.connect(master);
        [[55, 'sine', .2], [82, 'triangle', .06], [110, 'sine', .025]].forEach(([hz, type, gain]) => {
          const osc = context.createOscillator(); const amp = context.createGain();
          osc.type = type; osc.frequency.value = hz; amp.gain.value = gain;
          osc.connect(amp); amp.connect(bed); osc.start();
        });
        bed.connect(filter);
      }
      await context.resume();
      started = true;
      master.gain.setTargetAtTime(Number(volume.value) / 100 * .36, context.currentTime, .35);
      update();
    } catch { label.textContent = 'AUDIO · UNAVAILABLE'; button.disabled = true; }
  };
  const stop = () => {
    enabled = false;
    if (context && master) master.gain.setTargetAtTime(0, context.currentTime, .16);
    try { localStorage.setItem('orbital-audio-muted', 'true'); } catch { /* Setting applies until page close. */ }
    update();
  };
  const gesture = (event) => {
    if (dock.contains(event.target)) return;
    document.removeEventListener('pointerdown', gesture, true);
    document.removeEventListener('keydown', gesture, true);
    start();
  };
  button.addEventListener('click', () => {
    if (enabled && started) stop();
    else { enabled = true; try { localStorage.setItem('orbital-audio-muted', 'false'); } catch { /* Visit preference only. */ } start(); }
  });
  volume.addEventListener('input', () => {
    if (context && master && started && enabled) master.gain.setTargetAtTime(Number(volume.value) / 100 * .36, context.currentTime, .12);
  });
  document.addEventListener('pointerdown', gesture, true);
  document.addEventListener('keydown', gesture, true);

  function playCue(kind = 'select') {
    if (!enabled || !started || context?.state !== 'running') return;
    const notes = kind === 'switch' ? [[500, 0], [720, .07]] : [[620, 0], [910, .06]];
    notes.forEach(([hz, delay]) => {
      const osc = context.createOscillator(); const amp = context.createGain(); const now = context.currentTime + delay;
      osc.type = 'sine'; osc.frequency.setValueAtTime(hz, now); osc.frequency.exponentialRampToValueAtTime(hz * 1.25, now + .12);
      amp.gain.setValueAtTime(.0001, now); amp.gain.exponentialRampToValueAtTime(.065, now + .015); amp.gain.exponentialRampToValueAtTime(.0001, now + .18);
      osc.connect(amp); amp.connect(master); osc.start(now); osc.stop(now + .2);
    });
  }
  window.Valmed_AUDIO = { playCue };
  update();
}
