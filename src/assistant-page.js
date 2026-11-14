import('./medical-assistant.js').then(({ initMedicalAssistant }) => initMedicalAssistant({
  getContext: () => {
    let metrics = []; let symptoms = [];
    try { metrics = JSON.parse(localStorage.getItem('orbital-metrics') || '[]'); } catch { /* Optional local context. */ }
    try { symptoms = JSON.parse(localStorage.getItem('orbital-symptoms') || '[]'); } catch { /* Optional local context. */ }
    return JSON.stringify({ note: 'User-entered prototype values; ranges are illustrative and unverified.', readings: metrics, recentSymptoms: symptoms.slice(0, 8) }, null, 2);
  },
})).catch(() => { document.getElementById('assistantConnection').textContent = 'Could not load the local assistant module.'; });
document.getElementById('assistantHelp').addEventListener('click', () => document.getElementById('assistantHelpDialog').showModal());
