/**
 * VALMED deterministic, explainable health signal assessment.
 * This module is an educational decision-support prototype, not a diagnostic
 * system. It deliberately ships with NO clinical numeric thresholds.
 */
export const ENGINE_VERSION = '1.1.0';
export const HAZARDS = Object.freeze({
  radiation: 'Space radiation',
  isolation: 'Isolation and confinement',
  distance: 'Distance from Earth',
  gravity: 'Gravity fields',
  environment: 'Hostile closed environments',
});



const MISSION_PROFILES = Object.freeze({
  earth: {
    label: 'Earth', gravity: 'earth',
    factors: ['Earth-normal gravity context selected; spaceflight-specific gravity and deep-space exposure prompts are not applied.'],
    priorities: ['Record ordinary environmental conditions when relevant; this prototype does not infer a medical risk from being on Earth.'],
    hazards: ['environment'],
  },
  leo: {
    label: 'Spacecraft · low Earth orbit', gravity: 'microgravity',
    factors: ['Microgravity / altered-gravity adaptation is relevant.', 'Closed-cabin atmosphere, radiation dosimetry, sleep and crew isolation are mission-relevant.'],
    priorities: ['Track mission dosimetry and cabin atmosphere telemetry.', 'Record mission duration, exercise, sleep and symptom changes.', 'Document return-to-Earth and medical-support access for this mission.'],
    hazards: ['radiation', 'gravity', 'environment', 'isolation', 'distance'],
  },
  iss: {
    label: 'International Space Station', gravity: 'microgravity',
    factors: ['Long-duration microgravity and a closed orbital habitat are relevant.', 'Low-Earth-orbit logistics and return/resupply options depend on current vehicle and mission operations.'],
    priorities: ['Review personal trends alongside exercise, sleep and fluid-shift observations.', 'Capture dosimeter and cabin atmosphere data.', 'Enter actual evacuation and resupply timelines; do not assume fixed values.'],
    hazards: ['gravity', 'radiation', 'environment', 'isolation', 'distance'],
  },
  transit: {
    label: 'Deep-space transit', gravity: 'microgravity',
    factors: ['Long-duration exposure to a closed spacecraft environment is relevant.', 'Distance, communication delay, limited resupply and delayed definitive care can become operational constraints.'],
    priorities: ['Track radiation dose and solar-event shelter / mission alerts.', 'Record one-way communication delay, medical evacuation time and consumables autonomy.', 'Prioritize onboard medical capability and crew autonomy in the mission plan.'],
    hazards: ['distance', 'radiation', 'environment', 'isolation', 'gravity'],
  },
  lunar_orbit: {
    label: 'Lunar orbit / cislunar vehicle', gravity: 'microgravity',
    factors: ['Microgravity may apply during transit/orbit; verify the actual vehicle gravity environment.', 'Greater distance than low Earth orbit can change communications, evacuation and resupply assumptions.'],
    priorities: ['Enter mission-specific communication delay and time to definitive care.', 'Track dosimetry and cabin atmosphere.', 'Record actual vehicle gravity / rotation conditions rather than assuming.'],
    hazards: ['distance', 'radiation', 'environment', 'isolation', 'gravity'],
  },
  lunar_surface: {
    label: 'Lunar surface / base', gravity: 'lunar',
    factors: ['Lunar surface gravity is approximately one-sixth of Earth gravity; adaptation and mobility context differ from microgravity.', 'Lunar dust exposure is a surface-specific respiratory, ocular and dermal concern, especially around EVA and habitat ingress.', 'Radiation protection, habitat atmosphere, isolation and delayed medical support remain mission-relevant.'],
    priorities: ['Record EVA duration, dust/particulate exposure and suit-to-habitat ingress events.', 'Track dosimeter readings and shelter / solar particle event status.', 'Enter actual communications delay, evacuation time and resupply autonomy.', 'Review balance, vestibular symptoms, mobility, muscle function and bone-health surveillance with the medical team.'],
    hazards: ['gravity', 'radiation', 'environment', 'distance', 'isolation'],
  },
});

const CONTEXT_FIELDS = Object.freeze([
  ['missionDay', 'Mission day', 'days'], ['isolationDays', 'Continuous isolation', 'days'],
  ['respiratoryRateBpm', 'Respiratory rate', 'breaths/min'], ['heartRateVariabilityMs', 'Heart-rate variability', 'ms'],
  ['bodyMassKg', 'Body mass', 'kg'], ['exerciseMinutes24h', 'Exercise time in last 24 h', 'min'],
  ['fluidIntakeMl24h', 'Fluid intake in last 24 h', 'mL'], ['sleepQuality1to5', 'Subjective sleep quality', '1–5'],
  ['radiationDoseMsv', 'Cumulative dosimeter reading', 'mSv'], ['radiationWindowDays', 'Dose accumulation period', 'days'],
  ['cabinPressureKpa', 'Cabin pressure', 'kPa'], ['oxygenPartialPressureKpa', 'O₂ partial pressure', 'kPa'],
  ['co2PartialPressureKpa', 'CO₂ partial pressure', 'kPa'], ['cabinTemperatureC', 'Cabin / habitat temperature', '°C'],
  ['humidityPct', 'Relative humidity', '%'], ['particulateMgM3', 'Airborne particulate / dust', 'mg/m³'],
  ['evaMinutes24h', 'EVA time in last 24 h', 'min'], ['communicationDelayMin', 'One-way communication delay', 'min'],
  ['medicalEvacuationHours', 'Estimated time to definitive care / evacuation', 'h'], ['resupplyDays', 'Consumables autonomy / next resupply', 'days'],
]);
const finiteContextNumber = (value) => value === '' || value === null || value === undefined ? null : Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null;
function assessMissionContext(context = {}) {
  const location = Object.hasOwn(MISSION_PROFILES, context.location) ? context.location : 'earth';
  const profile = MISSION_PROFILES[location];
  const gravity = ['earth', 'microgravity', 'lunar', 'mars', 'artificial', 'unknown'].includes(context.gravity) ? context.gravity : profile.gravity;
  const values = Object.fromEntries(CONTEXT_FIELDS.map(([id, label, unit]) => [id, finiteContextNumber(context[id]) === null ? null : { value: finiteContextNumber(context[id]), label, unit }]));
  const missing = CONTEXT_FIELDS.filter(([id]) => values[id] === null).map(([id, label, unit]) => ({ id, label, unit }));
  const notes = [...profile.factors];
  const priorities = [...profile.priorities];
  if (gravity === 'microgravity') notes.push('The selected gravity mode is microgravity; cardiovascular fluid shifts, vestibular adaptation, muscle and bone deconditioning are relevant review domains.');
  if (gravity === 'lunar') notes.push('The selected gravity mode is lunar partial gravity; it is not equivalent to microgravity or Earth-normal gravity.');
  if (gravity === 'mars') notes.push('The selected gravity mode is Mars partial gravity; use mission-specific evidence rather than assuming lunar or Earth responses.');
  if (values.respiratoryRateBpm || values.heartRateVariabilityMs || values.bodyMassKg || values.exerciseMinutes24h || values.fluidIntakeMl24h || values.sleepQuality1to5) notes.push('Additional crew physiology and activity observations were entered. Compare them with the astronaut’s own longitudinal baseline and mission exercise, nutrition and sleep plan; no population cut-offs are applied here.');
  if (values.radiationDoseMsv) notes.push(`A cumulative dosimeter value of ${values.radiationDoseMsv.value} mSv was entered over ${values.radiationWindowDays?.value ?? 'an unspecified'} day period; interpret against mission dosimetry limits and device records.`);
  if (values.particulateMgM3 && ['lunar_surface'].includes(location)) notes.push(`A particulate / dust reading of ${values.particulateMgM3.value} mg/m³ was entered; compare with the mission's validated lunar dust monitoring protocol.`);
  if (values.evaMinutes24h && values.evaMinutes24h.value > 0) notes.push(`${values.evaMinutes24h.value} minutes of EVA in the last 24 hours were entered; consider suit workload, decompression procedures, thermal load and dust ingress context.`);
  if (values.co2PartialPressureKpa || values.oxygenPartialPressureKpa || values.cabinPressureKpa || values.cabinTemperatureC || values.humidityPct) notes.push('Cabin telemetry values are observational inputs only; evaluate them together using approved environmental-control limits and instrument calibration records.');
  if (values.communicationDelayMin || values.medicalEvacuationHours || values.resupplyDays) notes.push('Communication, evacuation and resupply values describe operational access to care, not the astronaut’s physiological condition.');
  if (gravity === 'unknown') priorities.push('Confirm the actual gravity environment for the current mission phase.');
  return {
    location, locationLabel: profile.label, gravity, gravityLabel: ({ earth: 'Earth-normal (1 g)', microgravity: 'Microgravity', lunar: 'Lunar partial gravity (~1/6 g)', mars: 'Mars partial gravity', artificial: 'Artificial / rotating gravity', unknown: 'Unknown / not entered' })[gravity],
    factors: profile.factors, notes, priorities, hazards: profile.hazards, values, missing,
    caveat: 'Mission context changes which hazards and data streams deserve attention; it does not independently diagnose illness or change a clinical severity score. No generic numeric limits are applied to these telemetry fields.',
  };
}

const HAZARD_CONTEXT = Object.freeze({
  radiation: { relevance: 'Radiation exposure is mission-monitored through dosimetry and exposure records. Current vital-sign entries in VALMED cannot estimate radiation dose or attribute a symptom to radiation.', indicators: ['Cumulative mission dosimeter / exposure record (manual entry; no live sensor feed)'] },
  isolation: { relevance: 'Isolation and confinement can affect behavioral health, stress and sleep. VALMED currently records sleep and user-reported symptoms, but does not yet collect a validated mood or behavioral-health assessment.', indicators: ['Sleep duration', 'Structured mood / stress assessment (not currently captured)'] },
  distance: { relevance: 'Communication delay and limited access to ground support make onboard self-assessment and clear escalation procedures important. This is an operational constraint, not a physiological measurement.', indicators: ['Communication delay, evacuation time and resupply autonomy (manual mission-context entries)'] },
  gravity: { relevance: 'Altered gravity can affect fluid distribution, cardiovascular adaptation, balance, muscle and bone health. The current measurements are only partial proxies and cannot assess bone density or strength.', indicators: ['Heart rate', 'Blood pressure', 'Hydration estimate', 'Muscle / bone assessment (not currently captured)'] },
  environment: { relevance: 'A closed spacecraft environment makes environmental monitoring and symptom reporting important. VALMED records temperature, oxygen and hydration entries, but does not directly monitor cabin atmosphere or contaminants.', indicators: ['Cabin pressure, O₂ / CO₂ partial pressure, temperature, humidity and particulates (manual entries; no live sensor feed)', 'Blood oxygen and hydration estimate'] },
});
const METRIC_HAZARDS = Object.freeze({
  heartRate: ['gravity', 'environment'],
  bloodPressure: ['gravity', 'environment'],
  bloodSugar: ['environment'],
  hydration: ['gravity', 'environment'],
  sleep: ['isolation', 'distance', 'environment'],
  temperature: ['environment'],
  oxygen: ['environment'],
});
const SYMPTOM_HAZARDS = Object.freeze({
  headache: ['radiation', 'environment'],
  chest: ['gravity', 'environment'],
  breathing: ['environment'],
  fainting: ['gravity', 'environment'],
  confusion: ['radiation', 'isolation', 'environment'],
  weakness: ['gravity', 'environment'],
  'rapid-worsening': ['distance', 'environment'],
  nausea: ['gravity', 'environment'],
  muscle: ['gravity'],
  vision: ['radiation', 'environment'],
});
const URGENT_SYMPTOMS = new Set(['chest', 'breathing', 'fainting', 'confusion', 'weakness', 'rapid-worsening']);
const DEFAULT_METRICS = Object.freeze([
  ['heartRate', 'Heart rate', 'bpm'],
  ['bloodPressure', 'Systolic blood pressure', 'mmHg'],
  ['bloodSugar', 'Blood glucose', 'mg/dL'],
  ['hydration', 'Hydration estimate', '%'],
  ['sleep', 'Sleep duration', 'hrs'],
  ['temperature', 'Temperature', '°C'],
  ['oxygen', 'Blood oxygen', '%'],
]);

const numberOrNull = (value) => value === null || value === undefined || value === '' ? null : Number.isFinite(Number(value)) ? Number(value) : null;
const validDate = (value) => {
  const time = Date.parse(value ?? '');
  return Number.isFinite(time) ? time : null;
};
const unique = (values) => [...new Set(values)];
const formatDelta = (value, unit) => `${value > 0 ? '+' : ''}${Number(value.toFixed(2))} ${unit}`;

function missionContextKey(context = {}) {
  const location = Object.hasOwn(MISSION_PROFILES, context.location) ? context.location : 'earth';
  const profileGravity = MISSION_PROFILES[location].gravity;
  const gravity = ['earth', 'microgravity', 'lunar', 'mars', 'artificial', 'unknown'].includes(context.gravity) ? context.gravity : profileGravity;
  return `${location}:${gravity}`;
}

function normalizeHistory(history, metricId, currentMissionKey = 'earth:earth') {
  return (Array.isArray(history) ? history : [])
    .filter((entry) => {
      // Legacy records without a mission tag are only comparable to the Earth profile.
      const entryKey = entry?.missionContext ? missionContextKey(entry.missionContext) : 'earth:earth';
      return entryKey === currentMissionKey;
    })
    .map((entry) => {
      const at = validDate(entry?.at ?? entry?.recordedAt);
      const raw = entry?.readings?.[metricId] ?? entry?.[metricId]?.value ?? entry?.[metricId];
      const value = numberOrNull(raw);
      return at !== null && value !== null ? { at, value } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.at - b.at);
}

function validatedThresholds(thresholds, metricId, unit) {
  return (Array.isArray(thresholds) ? thresholds : []).filter((rule) =>
    rule && rule.metricId === metricId && rule.unit === unit &&
    ['above', 'below'].includes(rule.direction) &&
    ['attention', 'urgent'].includes(rule.level) &&
    Number.isFinite(Number(rule.value)) && rule.validated === true &&
    typeof rule.source?.name === 'string' && rule.source.name.trim() &&
    typeof rule.source?.url === 'string' && /^https:\/\//i.test(rule.source.url),
  );
}

function currentSymptomsWithinWindow(symptoms, now, windowMs) {
  return (Array.isArray(symptoms) ? symptoms : []).filter((symptom) => {
    const at = validDate(symptom?.at);
    const kind = String(symptom?.kind || 'other');
    const zeroIntensityNonUrgent = numberOrNull(symptom?.severity) === 0 && !URGENT_SYMPTOMS.has(kind) && !['urgent', 'emergency'].includes(symptom?.protocolLevel);
    return at !== null && at <= now && now - at <= windowMs && !zeroIntensityNonUrgent;
  });
}

/**
 * @param {object} input
 * @param {Array} input.readings Current measurements: {id,name,unit,value,recordedAt?}.
 * @param {Array} input.history Entries: {at, readings:{[metricId]: number}}.
 * @param {Array} input.symptoms Symptom log entries from VALMED.
 * @param {object|Array} input.baseline User-designated reference values. Never treated as clinical norms.
 * @param {Array} input.thresholds Optional externally validated rules with explicit source provenance.
 * @param {number} input.now Epoch milliseconds, injectable for tests.
 */
export function evaluateHealthRisk({ readings = [], history = [], symptoms = [], baseline = null, thresholds = [], missionContext = {}, now = Date.now(), symptomWindowMs = 24 * 60 * 60 * 1000 } = {}) {
  const mission = assessMissionContext(missionContext);
  const activeMissionKey = missionContextKey(missionContext);
  const baselineMissionKey = baseline?.missionContext ? missionContextKey(baseline.missionContext) : 'earth:earth';
  const baselineMatchesMission = baselineMissionKey === activeMissionKey;
  const baselineValues = Array.isArray(baseline)
    ? Object.fromEntries(baseline.map((item) => [item.id, item]))
    : baseline?.readings && typeof baseline.readings === 'object' ? baseline.readings
      : baseline && typeof baseline === 'object' ? baseline : {};
  const currentById = new Map((Array.isArray(readings) ? readings : []).map((item) => [item.id, item]));
  const metricDefinitions = new Map(DEFAULT_METRICS.map(([id, name, unit]) => [id, { id, name, unit }]));
  for (const item of (Array.isArray(readings) ? readings : [])) {
    if (item?.id) metricDefinitions.set(item.id, { id: item.id, name: item.name || item.id, unit: item.unit || '' });
  }

  const findings = [];
  const missing = [];
  const metricSummaries = [];

  for (const definition of metricDefinitions.values()) {
    const current = currentById.get(definition.id);
    const value = numberOrNull(current?.value);
    if (!current || value === null) {
      missing.push({ metricId: definition.id, label: definition.name, reason: 'No valid current measurement was supplied.' });
      continue;
    }

    const unit = current.unit || definition.unit;
    const personalBaselineRaw = baselineMatchesMission ? baselineValues[definition.id] : null;
    const personalBaseline = numberOrNull(personalBaselineRaw !== null && typeof personalBaselineRaw === 'object' ? personalBaselineRaw.value : personalBaselineRaw);
    const baselineUnit = personalBaselineRaw !== null && typeof personalBaselineRaw === 'object' ? personalBaselineRaw.unit : unit;
    const metricHistory = normalizeHistory(history, definition.id, activeMissionKey);
    const trend = metricHistory.length >= 3 ? {
      sampleCount: metricHistory.length,
      first: metricHistory[0].value,
      latest: metricHistory[metricHistory.length - 1].value,
      delta: metricHistory[metricHistory.length - 1].value - metricHistory[0].value,
      direction: metricHistory[metricHistory.length - 1].value > metricHistory[0].value ? 'increasing'
        : metricHistory[metricHistory.length - 1].value < metricHistory[0].value ? 'decreasing' : 'stable',
    } : { sampleCount: metricHistory.length, direction: 'insufficient-data', delta: null };
    const relatedHazards = (METRIC_HAZARDS[definition.id] || []).map((id) => ({ id, label: HAZARDS[id] }));
    const reasons = [];
    let state = 'normal';

    if (personalBaseline !== null && baselineUnit === unit) {
      const delta = value - personalBaseline;
      if (delta !== 0) {
        state = 'attention';
        reasons.push(`The current value differs from the user-designated reference by ${formatDelta(delta, unit)}.`);
      } else reasons.push('The current value matches the user-designated reference.');
    } else if (personalBaseline !== null && baselineUnit !== unit) {
      reasons.push(`Personal reference was not compared because its unit (${baselineUnit}) does not match the current unit (${unit}).`);
    } else if (!baselineMatchesMission && baseline) {
      reasons.push('Personal reference was not compared because it was recorded under a different mission location / gravity context.');
    } else {
      reasons.push('No personal reference has been configured; an individual comparison is unavailable.');
    }

    if (trend.direction !== 'insufficient-data') {
      if (trend.direction !== 'stable') {
        state = state === 'normal' ? 'attention' : state;
        reasons.push(`A ${trend.direction} trend is visible across ${trend.sampleCount} recorded measurements (${formatDelta(trend.delta, unit)} from first to latest). This is descriptive, not a clinical alert.`);
      } else reasons.push(`No net change is visible across ${trend.sampleCount} recorded measurements.`);
    } else {
      reasons.push(`At least three historical measurements from the current mission location / gravity context are needed to describe a trend (${trend.sampleCount} comparable records available).`);
    }

    const matchedRules = validatedThresholds(thresholds, definition.id, unit).filter((rule) =>
      rule.direction === 'above' ? value > Number(rule.value) : value < Number(rule.value),
    );
    for (const rule of matchedRules) {
      if (rule.level === 'urgent' || state === 'normal') state = rule.level;
      reasons.push(`A configured ${rule.level} rule was crossed (${rule.direction} ${rule.value} ${unit}) using ${rule.source.name}.`);
    }

    findings.push({
      id: `metric-${definition.id}`, type: 'measurement', metricId: definition.id,
      label: definition.name, value, unit, state, reasons, trend,
      baseline: personalBaseline !== null && baselineUnit === unit ? { value: personalBaseline, unit, delta: value - personalBaseline } : null,
      relatedHazards,
      evidence: matchedRules.map((rule) => ({ name: rule.source.name, url: rule.source.url })),
    });
    metricSummaries.push({ id: definition.id, value, unit, state, trend: trend.direction });
  }

  const recentSymptoms = currentSymptomsWithinWindow(symptoms, now, symptomWindowMs);
  for (const symptom of recentSymptoms) {
    const kind = String(symptom.kind || 'other');
    const severity = numberOrNull(symptom.severity);
    const isUrgent = URGENT_SYMPTOMS.has(kind) || ['urgent', 'emergency'].includes(symptom.protocolLevel);
    const state = isUrgent ? 'urgent' : severity !== null && severity >= 8 ? 'attention' : 'attention';
    const reasons = [
      `A self-reported symptom was recorded${severity !== null ? ` with intensity ${severity}/10` : ''}.`,
      isUrgent
        ? 'This symptom category or its saved protocol level requires prompt escalation through mission-approved procedures.'
        : 'The symptom is not automatically classified as an emergency by this engine; persistence, recurrence, worsening, or impact on safe tasks warrants medical review.',
    ];
    if (mission.location === 'lunar_surface' && ['breathing', 'vision', 'headache'].includes(kind)) reasons.push('Lunar surface context: consider possible dust contact / ingress and document EVA, suit, eye and respiratory exposure history for the medical team; this is not a causal attribution.');
    if (['microgravity', 'lunar'].includes(mission.gravity) && ['nausea', 'headache', 'fainting', 'weakness', 'muscle', 'vision'].includes(kind)) reasons.push('Altered-gravity context: vestibular, fluid-distribution, visual, muscle and mobility factors may be relevant to the medical review.');
    if (mission.location !== 'earth' && ['sleep', 'confusion'].includes(kind)) reasons.push('Spaceflight context: consider sleep timing, workload, isolation and circadian schedule alongside the symptom record.');
    findings.push({
      id: `symptom-${symptom.id || `${kind}-${symptom.at}`}`, type: 'symptom', symptomKind: kind,
      label: kind.replaceAll('-', ' '), value: severity, unit: severity === null ? '' : '/10',
      state, reasons,
      relatedHazards: (SYMPTOM_HAZARDS[kind] || []).map((id) => ({ id, label: HAZARDS[id] })),
      evidence: [], recordedAt: symptom.at,
    });
  }

  const hasUrgent = findings.some((item) => item.state === 'urgent');
  const hasAttention = findings.some((item) => item.state === 'attention');
  const hasCurrentData = metricSummaries.length > 0 || recentSymptoms.length > 0;
  const metricFindings = findings.filter((item) => item.type === 'measurement');
  const allMeasurementsComparable = metricFindings.length > 0 && missing.length === 0 && metricFindings.every((item) => item.baseline !== null || item.trend.sampleCount >= 3);
  const overallState = hasUrgent ? 'urgent' : hasAttention ? 'attention' : hasCurrentData && allMeasurementsComparable ? 'normal' : 'unknown';
  const recommendations = hasUrgent
    ? [
      'Activate the mission-approved emergency medical checklist and notify the Crew Medical Officer / flight surgeon immediately using the mission communications procedure.',
      'Do not delay escalation to repeat measurements or consult this software. Follow trained crew instructions.',
    ]
    : [
      'Verify any unexpected measurement using the mission-approved measurement method and device instructions.',
      'Review changes against the astronaut-designated personal reference and the recorded trend; this engine does not apply population clinical cut-offs.',
      'Record new symptoms and contextual factors. Contact the Crew Medical Officer / flight surgeon for persistent, recurrent, worsening, or task-limiting symptoms or measurements.',
    ];
  if (!hasCurrentData) recommendations.unshift('Record valid measurements and/or a symptom check-in before interpreting health status.');

  const hazardIds = unique([...mission.hazards, ...findings.flatMap((item) => item.relatedHazards.map((hazard) => hazard.id))]);
  return {
    engineVersion: ENGINE_VERSION,
    assessedAt: new Date(now).toISOString(),
    overallState,
    summary: overallState === 'urgent' ? 'Urgent symptom or configured validated rule requires mission medical escalation.'
      : overallState === 'attention' ? 'One or more changes or symptoms warrant review; this is not a diagnosis.'
        : overallState === 'normal' ? 'No urgent or attention signal was generated from the available comparisons; this does not establish that the astronaut is medically healthy.'
          : 'Insufficient current data to assess health signals.',
    findings,
    missing,
    metricSummaries,
    recentSymptomCount: recentSymptoms.length,
    relatedHazards: hazardIds.map((id) => ({ id, label: HAZARDS[id] })),
    missionContext: mission,
    hazardContext: Object.entries(HAZARDS).map(([id, label]) => ({ id, label, ...HAZARD_CONTEXT[id] })),
    recommendations,
    limitations: [
      'This is an educational decision-support prototype, not a medical device or diagnostic system.',
      'No numeric clinical thresholds are built in. Numeric rules are used only when explicitly configured with matching units and a named HTTPS source marked as validated.',
      'Personal references and observed trends are descriptive and do not establish normality, causation, or medical risk.',
      'Hazard links are contextual prompts, not evidence that a hazard caused a measurement or symptom.',
      'Mission location, gravity, environmental telemetry and logistics values are user-entered context. They are not automatically checked against clinical or engineering limits.',
      'Follow mission-approved procedures and the Crew Medical Officer / flight surgeon; do not delay emergency care for this tool.',
    ],
  };
}
