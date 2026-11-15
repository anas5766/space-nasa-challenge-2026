/**
 * Synthetic 150-day lunar surface scenario for VALMED demonstrations.
 * Values are authored for software behavior and narrative continuity. They are
 * not astronaut data, NASA telemetry, clinical norms, predictions, or medical limits.
 * Trend shapes are scenario assumptions, not causal or validated physiology models.
 */
export const DEMO_MISSION_ID = 'valmed-lunar-150d-synthetic-v3';
export const PREVIOUS_DEMO_MISSION_IDS = Object.freeze(['valmed-lunar-150d-synthetic-v2', 'valmed-lunar-150d-synthetic-v1']);
export const PREVIOUS_DEMO_MISSION_ID = PREVIOUS_DEMO_MISSION_IDS[1];

const CHECKPOINT_DAYS = [1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150];
const VITAL_SERIES = Object.freeze({
  heartRate:     [68, 69, 68, 70, 69, 71, 70, 72, 71, 72, 71, 73, 74, 72, 71, 70],
  bloodPressure: [112,113,112,114,113,115,114,116,115,116,115,117,118,116,115,114],
  bloodSugar:    [88, 89, 87, 90, 89, 91, 88, 90, 89, 92, 90, 93, 91, 90, 89, 90],
  hydration:     [78, 78, 77, 76, 76, 75, 74, 73, 72, 72, 70, 68, 67, 68, 70, 71],
  sleep:         [7.8,7.7,7.6,7.5,7.4,7.3,7.2,7.1,7.0,6.9,6.7,6.3,6.1,6.3,6.6,6.8],
  temperature:   [36.6,36.6,36.5,36.6,36.6,36.7,36.6,36.6,36.7,36.6,36.6,36.7,36.6,36.6,36.6,36.6],
  oxygen:        [99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 98, 99, 98, 99, 99, 99],
});
const CONTEXT_SERIES = Object.freeze({
  respiratoryRateBpm:       [14,14,15,14,15,15,15,15,14,15,15,16,16,15,15,15],
  heartRateVariabilityMs:    [48,47,48,47,46,46,45,44,44,43,42,39,38,40,42,43],
  bodyMassKg:                [72.0,71.9,71.8,71.8,71.6,71.5,71.4,71.2,71.2,71.0,70.8,70.4,70.0,69.8,69.6,69.4],
  exerciseMinutes24h:        [65,70,72,75,80,85,90,95,90,100,95,80,70,85,95,100],
  fluidIntakeMl24h:          [2400,2380,2360,2340,2320,2300,2280,2260,2250,2200,2150,2050,2000,2100,2200,2300],
  sleepQuality1to5:          [4,4,4,4,4,4,4,4,4,4,3,3,2,3,3,4],
  radiationDoseMsv:          [0.4,1.5,2.6,4.0,6.0,8.2,10.5,13.0,15.2,18.0,21.0,25.0,29.0,33.0,37.0,42.0],
  radiationWindowDays:       [...CHECKPOINT_DAYS],
  cabinPressureKpa:          [101.3,101.3,101.2,101.3,101.3,101.2,101.3,101.3,101.2,101.3,101.3,101.2,101.3,101.3,101.2,101.3],
  oxygenPartialPressureKpa:  [21.3,21.3,21.2,21.3,21.3,21.2,21.3,21.3,21.3,21.2,21.3,21.3,21.2,21.3,21.3,21.3],
  co2PartialPressureKpa:     [0.11,0.11,0.12,0.11,0.12,0.12,0.14,0.12,0.11,0.12,0.13,0.14,0.13,0.12,0.11,0.11],
  cabinTemperatureC:         [22.4,22.5,22.5,22.4,22.6,22.5,22.6,22.5,22.4,22.5,22.5,22.6,22.5,22.4,22.5,22.5],
  humidityPct:               [45,45,44,45,46,45,44,45,45,44,45,46,45,45,44,45],
  particulateMgM3:           [0.01,0.01,0.01,0.02,0.02,0.03,0.09,0.06,0.03,0.02,0.02,0.02,0.01,0.02,0.01,0.01],
  evaMinutes24h:             [0,0,0,35,55,70,90,85,0,80,95,85,65,55,45,40],
  communicationDelayMin:    [0.022,0.022,0.022,0.022,0.022,0.022,0.022,0.022,0.022,0.022,0.022,0.022,0.022,0.022,0.022,0.022],
  medicalEvacuationHours:    [120,120,120,120,120,120,120,120,120,120,120,120,120,120,120,120],
  resupplyDays:              [150,140,130,120,110,100,90,80,70,60,50,40,35,32,30,30],
});
const METRIC_META = Object.freeze({
  heartRate: ['Heart rate', 'bpm'], bloodPressure: ['Systolic blood pressure', 'mmHg'],
  bloodSugar: ['Blood glucose', 'mg/dL'], hydration: ['Hydration estimate', '%'],
  sleep: ['Sleep duration', 'hrs'], temperature: ['Temperature', '°C'], oxygen: ['Blood oxygen', '%'],
});

export const DEMO_MISSION_EVENTS = Object.freeze([
  { day: 1, phase: 'start', title: 'Surface operations begin', note: 'Scenario baseline established after habitat commissioning. Values are synthetic and do not represent mission telemetry.' },
  { day: 30, phase: 'event', title: 'Routine EVA cadence', note: 'Surface activity becomes more regular in this fictional schedule. No medical effect is inferred from the activity record.' },
  { day: 60, phase: 'event', title: 'Airlock dust-control inspection', note: 'The synthetic particulate series rises around this checkpoint and then declines. This is a scenario cue to review instrument logs, not an exposure limit.' },
  { day: 80, phase: 'event', title: 'Communications continuity drill', note: 'A planned exercise tests backup procedures. The modeled light-time delay stays unchanged; no health measurement is altered by this event.' },
  { day: 100, phase: 'trend-start', title: 'Habitat maintenance shifts', note: 'The fictional shift schedule coincides with a downward sleep and HRV trend in the authored data. This is not evidence of causation.' },
  { day: 120, phase: 'trend-change', title: 'Protected recovery block', note: 'A planned schedule adjustment coincides with partial recovery in the synthetic sleep and HRV series. No clinical threshold is applied.' },
  { day: 150, phase: 'end', title: 'Scenario review', note: 'Review the longitudinal changes and prepare a crew report. VALMED highlights comparison signals; mission procedures determine action.' },
]);

function contextAt(index, day) {
  return Object.fromEntries(Object.entries(CONTEXT_SERIES).map(([id, series]) => [id, String(series[index] ?? series.at(-1))]));
}

export function buildDemoMissionData(now = Date.now()) {
  const start = now - 150 * 24 * 60 * 60 * 1000;
  const missionContext = {
    location: 'lunar_surface', gravity: 'lunar', missionDay: '150', isolationDays: '150',
    ...contextAt(CHECKPOINT_DAYS.length - 1, 150),
    demoMissionId: DEMO_MISSION_ID,
    crewMemberId: 'LUNAR-CREW-01',
    demoLabel: 'SYNTHETIC · 150-DAY LUNAR SURFACE SCENARIO · NOT NASA TELEMETRY',
  };
  const history = CHECKPOINT_DAYS.map((day, index) => {
    const missionEvent = DEMO_MISSION_EVENTS.find((event) => event.day === day) || null;
    return {
      at: new Date(start + (day - 1) * 24 * 60 * 60 * 1000).toISOString(),
      missionDay: day,
      missionContext: { location: 'lunar_surface', gravity: 'lunar', demoMissionId: DEMO_MISSION_ID },
      readings: { ...Object.fromEntries(Object.entries(VITAL_SERIES).map(([id, values]) => [id, values[index]])), ...contextAt(index, day) },
      ...(missionEvent ? { missionEvent } : {}),
      source: 'synthetic-demo',
    };
  });
  const current = Object.fromEntries(Object.entries(VITAL_SERIES).map(([id, values]) => [id, values.at(-1)]));
  const metrics = Object.entries(current).map(([id, value]) => ({ id, value, at: new Date(now).toISOString(), missionContext: { location: 'lunar_surface', gravity: 'lunar' }, source: 'synthetic-demo', demoMissionId: DEMO_MISSION_ID }));
  const baseline = {
    createdAt: new Date(start).toISOString(), label: 'Synthetic day-1 comparison reference; not a clinical norm',
    demoMissionId: DEMO_MISSION_ID, missionContext: { location: 'lunar_surface', gravity: 'lunar' },
    readings: Object.fromEntries(Object.entries(VITAL_SERIES).map(([id, values]) => [id, { value: values[0], unit: METRIC_META[id][1] }])),
  };
  const symptoms = [
    { kind: 'muscle', region: 'leg', severity: 4, note: 'Synthetic scenario: post-EVA muscle soreness, reported as persistent but not rapidly worsening.', at: new Date(now - 3 * 60 * 60 * 1000).toISOString(), source: 'synthetic-demo', demoMissionId: DEMO_MISSION_ID },
    { kind: 'nausea', region: 'abdomen', severity: 2, note: 'Synthetic scenario: brief mild nausea after a surface activity period; abdomen selected as the reported area.', at: new Date(now - 9 * 60 * 60 * 1000).toISOString(), source: 'synthetic-demo', demoMissionId: DEMO_MISSION_ID },
  ];
  return { history, metrics, baseline, symptoms, missionContext, current, missionStart: new Date(start).toISOString(), events: DEMO_MISSION_EVENTS, assumptions: 'All trajectories are synthetic, hand-authored scenario values for interface demonstration. They are not based on a validated astronaut physiology model, NASA telemetry, causal estimates, or clinical limits.' };
}

/** True only for an untouched older demo seed; never migrate a user's edited records. */
export function isUntouchedLegacyDemo({ flag, metrics = [], history = [], symptoms = [], baseline = null, missionContext = null } = {}) {
  return PREVIOUS_DEMO_MISSION_IDS.includes(flag)
    && metrics.length === 7 && metrics.every((item) => PREVIOUS_DEMO_MISSION_IDS.includes(item?.demoMissionId))
    && history.length === 16 && history.every((item) => PREVIOUS_DEMO_MISSION_IDS.includes(item?.missionContext?.demoMissionId))
    && symptoms.length === 2 && symptoms.every((item) => PREVIOUS_DEMO_MISSION_IDS.includes(item?.demoMissionId))
    && PREVIOUS_DEMO_MISSION_IDS.includes(baseline?.demoMissionId)
    && PREVIOUS_DEMO_MISSION_IDS.includes(missionContext?.demoMissionId);
}
