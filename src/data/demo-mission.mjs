/**
 * VALMED 150-day lunar mission demonstration dataset.
 * All values are synthetic and intended only for software demonstration.
 * They are NOT astronaut records, medical norms, validated limits, or NASA telemetry.
 */
export const DEMO_MISSION_ID = 'valmed-lunar-150d-synthetic-v2';
export const PREVIOUS_DEMO_MISSION_ID = 'valmed-lunar-150d-synthetic-v1';

const CHECKPOINT_DAYS = [1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150];
const SERIES = {
  heartRate:     [68, 68, 68, 68, 68, 68, 68, 68, 68, 68, 68, 68, 68, 68, 68, 68],
  bloodPressure: [112,112,112,112,112,112,112,112,112,112,112,112,112,112,112,112],
  bloodSugar:    [88, 88, 88, 88, 88, 88, 88, 88, 88, 88, 88, 88, 88, 88, 88, 88],
  hydration:     [78, 78, 77, 76, 76, 75, 74, 73, 72, 71, 70, 68, 66, 64, 62, 61],
  sleep:         [7.8,7.7,7.6,7.5,7.4,7.3,7.2,7.1,7.0,6.9,6.8,6.6,6.4,6.2,6.0,5.8],
  temperature:   [36.6,36.6,36.6,36.6,36.6,36.6,36.6,36.6,36.6,36.6,36.6,36.6,36.6,36.6,36.6,36.6],
  oxygen:        [99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99],
};
const METRIC_META = {
  heartRate: ['Heart rate', 'bpm'], bloodPressure: ['Systolic blood pressure', 'mmHg'],
  bloodSugar: ['Blood glucose', 'mg/dL'], hydration: ['Hydration estimate', '%'],
  sleep: ['Sleep duration', 'hrs'], temperature: ['Temperature', '°C'], oxygen: ['Blood oxygen', '%'],
};

export function buildDemoMissionData(now = Date.now()) {
  const start = now - 150 * 24 * 60 * 60 * 1000;
  const history = CHECKPOINT_DAYS.map((day, index) => ({
    at: new Date(start + (day - 1) * 24 * 60 * 60 * 1000).toISOString(),
    missionDay: day,
    missionContext: { location: 'lunar_surface', gravity: 'lunar', demoMissionId: DEMO_MISSION_ID },
    readings: Object.fromEntries(Object.entries(SERIES).map(([id, values]) => [id, values[index]])),
  }));
  const current = Object.fromEntries(Object.entries(SERIES).map(([id, values]) => [id, values.at(-1)]));
  const metrics = Object.entries(current).map(([id, value]) => ({ id, value, at: new Date(now).toISOString(), demoMissionId: DEMO_MISSION_ID }));
  const baseline = {
    createdAt: new Date(start).toISOString(),
    label: 'Synthetic day-1 mission reference; not a clinical norm',
    demoMissionId: DEMO_MISSION_ID,
    missionContext: { location: 'lunar_surface', gravity: 'lunar' },
    readings: Object.fromEntries(Object.entries(current).map(([id]) => [id, { value: SERIES[id][0], unit: METRIC_META[id][1] }])),
  };
  const symptoms = [
    { kind: 'muscle', region: 'leg', severity: 4, note: 'Synthetic scenario: post-EVA muscle soreness, reported as persistent but not rapidly worsening.', at: new Date(now - 3 * 60 * 60 * 1000).toISOString(), source: 'synthetic-150-day-mission', demoMissionId: DEMO_MISSION_ID },
    { kind: 'nausea', region: 'abdomen', severity: 2, note: 'Synthetic scenario: brief mild nausea after a surface activity period; abdomen selected as the reported area.', at: new Date(now - 9 * 60 * 60 * 1000).toISOString(), source: 'synthetic-150-day-mission', demoMissionId: DEMO_MISSION_ID },
  ];
  const missionContext = {
    location: 'lunar_surface', gravity: 'lunar', missionDay: '150', isolationDays: '150',
    respiratoryRateBpm: '16', heartRateVariabilityMs: '42', bodyMassKg: '69.4',
    exerciseMinutes24h: '105', fluidIntakeMl24h: '2300', sleepQuality1to5: '3',
    radiationDoseMsv: '42', radiationWindowDays: '150', cabinPressureKpa: '101.3',
    oxygenPartialPressureKpa: '21.3', co2PartialPressureKpa: '0.12', cabinTemperatureC: '22.5',
    humidityPct: '45', particulateMgM3: '0.04', evaMinutes24h: '90',
    communicationDelayMin: '0.022', medicalEvacuationHours: '120', resupplyDays: '30',
    demoMissionId: DEMO_MISSION_ID, crewMemberId: 'LUNAR-CREW-01', demoLabel: 'SYNTHETIC · 150-DAY LUNAR SURFACE MISSION',
  };
  return { history, metrics, baseline, symptoms, missionContext, current, missionStart: new Date(start).toISOString() };
}


/** True only for the untouched v1 demo seed; never migrate a user's edited records. */
export function isUntouchedLegacyDemo({ flag, metrics = [], history = [], symptoms = [], baseline = null, missionContext = null } = {}) {
  return flag === PREVIOUS_DEMO_MISSION_ID
    && metrics.length === 7 && metrics.every((item) => item?.demoMissionId === PREVIOUS_DEMO_MISSION_ID)
    && history.length === 16 && history.every((item) => item?.missionContext?.demoMissionId === PREVIOUS_DEMO_MISSION_ID)
    && symptoms.length === 2 && symptoms.every((item) => item?.demoMissionId === PREVIOUS_DEMO_MISSION_ID)
    && baseline?.demoMissionId === PREVIOUS_DEMO_MISSION_ID
    && missionContext?.demoMissionId === PREVIOUS_DEMO_MISSION_ID;
}
