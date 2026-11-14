import { announceHealthStateChange, readHealthSnapshot } from './health-state.js';

announceHealthStateChange();

import('./medical-assistant.js').then(({ initMedicalAssistant }) => initMedicalAssistant({
  getContext: () => {
    const state = readHealthSnapshot();
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
document.getElementById('assistantHelp').addEventListener('click', () => document.getElementById('assistantHelpDialog').showModal());
const anatomyPrompt = new URLSearchParams(location.search).get('structure');
if (anatomyPrompt) {
  const input = document.getElementById('assistantPrompt');
  input.value = `The anatomy map highlights ${anatomyPrompt} based on entered health indicators. Explain what this association may mean and give practical, low-risk next steps.`;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}
