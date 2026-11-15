import { priorityRun } from './protocols/protocol-engine.mjs';
import { announceHealthStateChange, readHealthSnapshot } from './health-state.js';

announceHealthStateChange();

import('./medical-assistant.js').then(({ initMedicalAssistant }) => initMedicalAssistant({
  getContext: () => {
    const state = readHealthSnapshot();
    let protocolContext = 'No saved structured protocol run.';
    try {
      const runs = JSON.parse(localStorage.getItem('valmed-protocol-runs-v1') || '[]');
      const latest = priorityRun(runs);
      if (latest) protocolContext = JSON.stringify({ title: latest.title, level: latest.level, at: latest.at, followUpAnswers: latest.answers, measurements: latest.measurements, action: latest.action, outcome: latest.outcome });
    } catch { /* The deterministic protocol remains available even if optional context cannot be read. */ }
    const now = Date.now();
    const currentReadings = state.readings.filter((reading) => {
      const age = now - Date.parse(reading.recordedAt || '');
      return Number.isFinite(age) && age >= 0 && age < 24 * 60 * 60 * 1000;
    });
    return JSON.stringify({
      note: `${state.note} Only measurements recorded in the previous 24 hours are included as current readings; older entries are omitted.`,
      currentReadings,
      currentSymptoms: state.currentSymptoms,
      recentSymptomHistory: state.recentSymptomHistory,
      affectedRegions: state.bodyRegions,
      latestStructuredProtocol: protocolContext,
    }, null, 2);
  },
})).catch(() => { document.getElementById('assistantConnection').textContent = 'Could not load the local assistant module.'; });
document.querySelectorAll('.assistant-shortcuts [data-prompt]').forEach((button) => button.addEventListener('click', () => {
  const input = document.getElementById('assistantPrompt');
  input.value = button.dataset.prompt;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.focus();
  if (!document.getElementById('assistantSend').disabled) document.getElementById('assistantForm').requestSubmit();
}));
try {
  const runs = JSON.parse(localStorage.getItem('valmed-protocol-runs-v1') || '[]');
  const latest = priorityRun(runs);
  const active = latest && latest.status !== 'handed-off' && (latest.status !== 'resolved' || latest.level === 'emergency');
  if (active) {
    const notice = document.createElement('aside');
    notice.className = 'assistant-health-alert';
    notice.setAttribute('role', 'alert');
    const emergency = latest.level === 'emergency';
    const urgent = latest.level === 'urgent';
    notice.innerHTML = `<span class="assistant-alert-icon">!</span><div class="assistant-alert-copy"><strong>${emergency ? 'Protocol emergency escalation is active' : urgent ? 'Protocol medical review is recommended' : 'Structured protocol is still open'}</strong><p></p><small>This fixed protocol guidance takes priority over any AI response.</small></div><a href="health.html#medical-protocols">Open protocol ↗</a>`;
    notice.querySelector('.assistant-alert-copy p').textContent = `${String(latest.title || 'Recent protocol')} · ${emergency ? 'Use the mission emergency checklist and notify the flight surgeon now.' : urgent ? 'Contact the flight surgeon promptly through the mission medical channel.' : 'The deterministic check-in is open. Record an outcome or handoff before asking the AI about this case.'}`;
    document.querySelector('#medicalAssistant .assistant-health-alert')?.after(notice);
  }
} catch { /* Optional prior protocol context. */ }
document.getElementById('assistantHelp').addEventListener('click', () => document.getElementById('assistantHelpDialog').showModal());
const anatomyPrompt = new URLSearchParams(location.search).get('structure');
if (anatomyPrompt) {
  const input = document.getElementById('assistantPrompt');
  input.value = `The anatomy map highlights ${anatomyPrompt} based on entered health indicators. Explain what this association may mean and give practical, low-risk next steps.`;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}
