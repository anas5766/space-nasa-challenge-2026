/**
 * Map only recent, user-reported symptoms to anatomical structures.
 * Mission hazards and broad physiological proxies are deliberately excluded:
 * they are contextual review domains, not anatomical findings.
 */
const LEVELS = Object.freeze({ normal: 0, warning: 1, moderate: 2, critical: 3 });
const MUSCLE_STRUCTURE = /muscle|psoas|quadricep|hamstring|glute|bicep|tricep|deltoid|pector|latissimus|trapezius|gastrocnemius|soleus|sartorius|adductor|abductor|tendon/i;
const GI_STRUCTURE = /stomach|gastric|intestin|duoden|colon|rectum|liver|pancrea|spleen|gallbladder|oesoph|esoph/i;
const AIRWAY_STRUCTURE = /lung|bronch|trachea|diaphragm|alveol/i;
const EYE_STRUCTURE = /eye|optic|retina|cornea|lens|eyelid|iris|pupil/i;
const HEAD_STRUCTURE = /brain|cerebr|skull|cranium|mening|head|face|sinus|jaw|mandible|maxilla/i;
const THORAX_STRUCTURE = /heart|lung|bronch|trachea|rib|sternum|chest|aorta|arter|vein|diaphragm/i;

export function regionForAnatomyKey(key) {
  const name = String(key || '').toLowerCase();
  if (/brain|eye|optic|skull|cranium|head|face|ear|nose|mouth|jaw|sinus|retina|cornea/.test(name)) return 'head';
  if (/heart|lung|bronch|trachea|rib|sternum|chest|aorta|arter|vein|diaphragm/.test(name)) return 'chest';
  if (/kidney|renal|liver|stomach|pancrea|intestin|spleen|bladder|ureter|abdomen|colon|duoden|gallbladder/.test(name)) return 'abdomen';
  if (/spine|vertebra|back|latissimus|trapezius/.test(name)) return 'back';
  if (/humerus|ulna|radius|biceps|triceps|deltoid|forearm|carpal|hand|metacarpal|phalange|wrist|shoulder|arm|pectoral/.test(name)) return 'arm';
  if (/femur|tibia|fibula|quadricep|hamstring|glute|patella|tarsal|foot|ankle|leg|calf|gastrocnemius|soleus|thigh/.test(name)) return 'leg';
  return null;
}

function symptomLevel(symptom) {
  if (['chest', 'breathing', 'weakness'].includes(String(symptom?.kind || '').toLowerCase())) return 'critical';
  if (symptom?.protocolLevel === 'emergency') return 'critical';
  if (symptom?.protocolLevel === 'urgent') return 'moderate';
  if (LEVELS[symptom?.status] !== undefined) return symptom.status;
  const severity = Math.max(0, Math.min(10, Number(symptom?.severity) || 0));
  return severity >= 8 ? 'critical' : severity >= 5 ? 'moderate' : severity >= 1 ? 'warning' : 'normal';
}

function symptomMatchesStructure(symptom, key, region) {
  const kind = String(symptom?.kind || 'other').toLowerCase();
  const selectedRegion = String(symptom?.region || 'general').toLowerCase();
  if (!region || selectedRegion === 'general' || selectedRegion !== region) return false;
  const name = String(key || '');
  if (kind === 'muscle' || kind === 'weakness') return MUSCLE_STRUCTURE.test(name);
  if (kind === 'nausea') return region === 'abdomen' && GI_STRUCTURE.test(name);
  if (kind === 'breathing') return region === 'chest' && AIRWAY_STRUCTURE.test(name);
  if (kind === 'vision') return region === 'head' && EYE_STRUCTURE.test(name);
  if (kind === 'headache') return region === 'head' && HEAD_STRUCTURE.test(name);
  if (kind === 'chest') return region === 'chest' && THORAX_STRUCTURE.test(name);
  // Fainting, confusion and rapid worsening are systemic reports. Do not pin
  // them to an organ simply because a broad body area was selected.
  if (['fainting', 'confusion', 'rapid-worsening'].includes(kind)) return false;
  return kind === 'other';
}

export function symptomsForAnatomyStructure(key, symptoms = []) {
  const region = regionForAnatomyKey(key);
  if (!region) return [];
  return (Array.isArray(symptoms) ? symptoms : []).filter((symptom) =>
    symptomLevel(symptom) !== 'normal' && symptomMatchesStructure(symptom, key, region),
  );
}

export function anatomySymptomLevel(key, symptoms = []) {
  return symptomsForAnatomyStructure(key, symptoms)
    .map(symptomLevel)
    .sort((a, b) => LEVELS[b] - LEVELS[a])[0] || 'normal';
}
