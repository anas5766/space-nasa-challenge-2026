/** Offline, deterministic symptom protocol routing. Not a diagnostic system. */
export const PROTOCOL_VERSION = '2026.11-public-1';
export const PROTOCOLS = {
  chest: { title: 'Chest discomfort', region: 'chest', questions: [
    { id: 'severe', label: 'Is the discomfort severe, sudden, or rapidly worsening?' }, { id: 'breathing', label: 'Is breathing difficult or unusually labored?' }, { id: 'faint', label: 'Have you fainted, nearly fainted, or become confused?' },
  ] },
  breathing: { title: 'Breathing difficulty', region: 'chest', questions: [
    { id: 'severe', label: 'Is breathing difficulty severe, sudden, or worsening?' }, { id: 'chestPain', label: 'Is chest pain, pressure, or blue/gray lips also present?' }, { id: 'faint', label: 'Have you fainted, nearly fainted, or become confused?' },
  ] },
  fainting: { title: 'Fainting or loss of consciousness', region: 'general', questions: [
    { id: 'ongoing', label: 'Is the person still unresponsive, confused, or not fully recovered?' }, { id: 'injury', label: 'Did a fall or injury occur?' }, { id: 'repeat', label: 'Has fainting happened more than once or with chest/breathing symptoms?' },
  ] },
  confusion: { title: 'Sudden confusion', region: 'head', questions: [
    { id: 'sudden', label: 'Did this begin suddenly or is it worsening?' }, { id: 'weakness', label: 'Is there new one-sided weakness, trouble speaking, or vision loss?' }, { id: 'alertness', label: 'Is the person difficult to wake or unable to follow commands?' },
  ] },
  headache: { title: 'Headache or dizziness', region: 'head', questions: [
    { id: 'sudden', label: 'Was onset sudden, unusually severe, or rapidly worsening?' }, { id: 'neuro', label: 'Any confusion, fainting, new weakness, speech, or vision change?' }, { id: 'injury', label: 'Did this follow a head injury?' },
  ] },
  vision: { title: 'Vision change', region: 'head', questions: [
    { id: 'sudden', label: 'Did the change begin suddenly or involve loss of vision?' }, { id: 'neuro', label: 'Any severe headache, confusion, weakness, or trouble speaking?' }, { id: 'injury', label: 'Did this follow an eye or head injury?' },
  ] },
  nausea: { title: 'Nausea or vomiting', region: 'abdomen', questions: [
    { id: 'persistent', label: 'Is vomiting repeated, persistent, or preventing fluid intake?' }, { id: 'blood', label: 'Is there blood, severe abdominal pain, fainting, or confusion?' }, { id: 'worse', label: 'Are symptoms worsening or affecting mission tasks?' },
  ] },
  muscle: { title: 'Muscle, bone, or joint concern', region: 'general', questions: [
    { id: 'injury', label: 'Was there a significant injury, deformity, or inability to use the area?' }, { id: 'swelling', label: 'Is there new one-sided limb swelling, warmth, or marked tenderness?' }, { id: 'worse', label: 'Is pain severe, worsening, or limiting safe movement?' },
  ] },
  weakness: { title: 'New weakness', region: 'general', questions: [
    { id: 'sudden', label: 'Did weakness start suddenly, affect one side, or worsen quickly?' }, { id: 'neuro', label: 'Any confusion, speech or vision change, fainting, or breathing difficulty?' }, { id: 'function', label: 'Does it prevent safe movement or essential tasks?' },
  ] },
  'rapid-worsening': { title: 'Rapidly worsening symptoms', region: 'general', questions: [
    { id: 'breathing', label: 'Is breathing difficult or is there chest pain?' }, { id: 'alertness', label: 'Is there fainting, confusion, or difficulty staying awake?' }, { id: 'function', label: 'Is the person unable to perform essential tasks safely?' },
  ] },
  other: { title: 'Other symptom', region: 'general', questions: [
    { id: 'severe', label: 'Is it severe, sudden, or rapidly worsening?' }, { id: 'breathing', label: 'Is breathing difficult or is there chest pain?' }, { id: 'alertness', label: 'Any fainting, confusion, or difficulty staying awake?' },
  ] },
};
export function evaluateProtocol({ symptom, answers = {} }) {
  const protocol = PROTOCOLS[symptom] || PROTOCOLS.other;
  const positives = protocol.questions.filter((q) => answers[q.id] === 'yes');
  const uncertain = protocol.questions.some((q) => answers[q.id] === 'unsure');
  const urgent = ['chest', 'breathing', 'fainting', 'confusion', 'rapid-worsening'].includes(symptom) || positives.length > 0 || uncertain;
  const emergency = positives.length > 0 || ['fainting', 'confusion', 'rapid-worsening'].includes(symptom);
  return { protocol, level: emergency ? 'emergency' : urgent ? 'urgent' : 'monitor', guidance: emergency
    ? 'Activate the mission-approved emergency medical checklist now. Notify the Crew Medical Officer / flight surgeon and Mission Control using the mission communications procedure. Keep the person safe and follow trained crew instructions; do not delay for this tool or the AI assistant.'
    : urgent ? 'Contact the Crew Medical Officer / flight surgeon promptly through the mission medical channel and follow the mission-approved checklist. Avoid activities that could be unsafe while symptomatic. Reassess and report any worsening immediately.'
      : 'Pause optional or hazardous tasks while symptomatic. Recheck and record the symptom and relevant measurements using the mission-approved method; follow the onboard self-care checklist. Contact the Crew Medical Officer / flight surgeon if symptoms persist, recur, worsen, or affect safe task performance. This tool does not diagnose or recommend medication.' };
}
