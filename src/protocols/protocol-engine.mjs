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
export const EMERGENCY_GUIDANCE = 'Activate the mission-approved emergency medical checklist now. Notify the Crew Medical Officer / flight surgeon and Mission Control using the mission communications procedure. Keep the person safe and follow trained crew instructions; do not delay for this tool or the AI assistant.';

function normalizeMessage(message) {
  return String(message || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function reportsMedicalSupportUnavailable(message, history = []) {
  const pattern = /\b(?:no|not any|without)\s+(?:onboard\s+)?(?:medical\s+)?(?:crew|doctor|medic|clinician|medical staff)\b|\bthere(?:'s| is) no (?:medical )?(?:crew|doctor|medic|help)\b|\b(?:can't|cannot|unable to) reach (?:the )?(?:doctor|medical|crew|mission control|flight surgeon)\b|\bno one (?:is )?(?:available to help|can help)\b|\bno medical help\b|\bno hay (?:equipo|personal|medico|medica|doctor|doctora)|\bno puedo contactar (?:con )?(?:el )?(?:equipo medico|doctor|medico|control de mision)|\bno hay nadie que pueda ayudar\b/;
  return pattern.test(normalizeMessage(message)) || history.slice(-8).some((entry) => entry?.role === 'user' && pattern.test(normalizeMessage(entry.content)));
}

export function buildNoMedicalSupportResponse({ protocolTitle = 'Medical emergency', symptom = 'other', question = '' } = {}) {
  const symptomLabel = symptom === 'chest' ? 'chest pain' : symptom === 'breathing' ? 'breathing difficulty' : protocolTitle.toLowerCase();
  const current = normalizeMessage(question);
  if (/\b(i am|i'm|im|nobody is with me|no one is with me) alone\b|\bi am alone\b|\bestoy sola?\b/.test(current)) {
    return `I hear that you are alone and there is no medical crew member onboard. Do not spend time searching the vehicle for a clinician. Use the mission-approved emergency communication procedure on its primary channel, then its approved backup if needed. Say “medical emergency,” give your location, report ${symptomLabel}, and state when it began. Stop work, rest in a safe supported position, and do not operate equipment or start an EVA. If safe, note your pulse and other available readings for the responder; do not delay communication to measure them. Use only the onboard checklist and medicines it explicitly authorizes. Keep trying the approved communication routes and follow the emergency checklist while waiting. Are you having trouble breathing or feeling faint right now?`;
  }
  return `I understand: there is no medical crew member available onboard. This is still urgent, and you should not be left with only “contact the crew.”\n\n1. If another crewmate is with you, ask them to stay with you, open the mission-approved emergency medical checklist, and try the approved primary and backup channels to Mission Control / the flight surgeon. State “medical emergency,” report ${symptomLabel}, when it began, and any breathing difficulty, faintness, or readings. If you are alone, use the approved emergency communications procedure yourself.\n2. Stop work and physical activity. Stay in a safe, supported resting position; do not exercise, operate equipment, or start an EVA while symptoms are present.\n3. Use only onboard equipment, procedures, and medicines that your mission training/checklist specifically authorizes. Do not guess a medication or dose. Record symptom changes and available measurements if doing so does not delay the emergency call.\n4. If the person becomes unresponsive or is not breathing normally, have a crewmate follow their onboard CPR/AED training and the mission emergency checklist.\n\nKeep trying the approved communication routes and follow the checklist if nobody responds. Are you alone, and are you breathing normally right now?`;
}

export function evaluateProtocol({ symptom, answers = {} }) {
  const protocol = PROTOCOLS[symptom] || PROTOCOLS.other;
  const positives = protocol.questions.filter((q) => answers[q.id] === 'yes');
  const uncertain = protocol.questions.some((q) => answers[q.id] === 'unsure');
  const urgent = ['chest', 'breathing', 'fainting', 'confusion', 'rapid-worsening'].includes(symptom) || positives.length > 0 || uncertain;
  const emergency = positives.length > 0 || ['fainting', 'confusion', 'rapid-worsening'].includes(symptom);
  return { protocol, level: emergency ? 'emergency' : urgent ? 'urgent' : 'monitor', guidance: emergency
    ? EMERGENCY_GUIDANCE
    : urgent ? 'Contact the Crew Medical Officer / flight surgeon promptly through the mission medical channel and follow the mission-approved checklist. Avoid activities that could be unsafe while symptomatic. Reassess and report any worsening immediately.'
      : 'Pause optional or hazardous tasks while symptomatic. Recheck and record the symptom and relevant measurements using the mission-approved method; follow the onboard self-care checklist. Contact the Crew Medical Officer / flight surgeon if symptoms persist, recur, worsen, or affect safe task performance. This tool does not diagnose or recommend medication.' };
}

export function priorityRun(runs) {
  const priority = { emergency: 3, urgent: 2, monitor: 1 };
  let selected = null, highest = 0;
  for (const run of Array.isArray(runs) ? runs : []) {
    if (!run || run.status === 'handed-off') continue;
    const { level } = evaluateProtocol({ symptom: run.kind, answers: run.answers });
    if (run.status === 'resolved' && level !== 'emergency') continue;
    if (priority[level] > highest) { selected = { ...run, level }; highest = priority[level]; }
  }
  return selected;
}
