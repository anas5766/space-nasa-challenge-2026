import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDemoMissionData, DEMO_MISSION_ID, PREVIOUS_DEMO_MISSION_ID, isUntouchedLegacyDemo } from '../src/data/demo-mission.mjs';

test('150-day demo contains 16 chronological checkpoints ending on mission day 150', () => {
  const now = Date.parse('2026-11-15T00:00:00.000Z');
  const demo = buildDemoMissionData(now);
  assert.equal(demo.history.length, 16);
  assert.equal(demo.history[0].missionDay, 1);
  assert.equal(demo.history.at(-1).missionDay, 150);
  assert.ok(demo.history.every((entry, index, all) => index === 0 || Date.parse(entry.at) > Date.parse(all[index - 1].at)));
  assert.ok(demo.history.every((entry) => entry.missionContext.demoMissionId === DEMO_MISSION_ID));
});

test('demo includes current metrics, same-environment personal reference and labelled synthetic symptoms', () => {
  const demo = buildDemoMissionData(Date.parse('2026-11-15T00:00:00.000Z'));
  assert.equal(demo.metrics.length, 7);
  assert.equal(demo.missionContext.location, 'lunar_surface');
  assert.equal(demo.missionContext.gravity, 'lunar');
  assert.equal(demo.missionContext.missionDay, '150');
  assert.equal(demo.baseline.missionContext.location, 'lunar_surface');
  assert.equal(demo.symptoms.length, 2);
  assert.equal(demo.symptoms.find((item) => item.kind === 'nausea')?.region, 'abdomen');
  assert.ok(demo.symptoms.every((item) => item.demoMissionId === DEMO_MISSION_ID));
  assert.equal(demo.symptoms.some((item) => ['chest', 'breathing', 'fainting', 'confusion', 'rapid-worsening'].includes(item.kind)), false);
});

test('demo drives explainable trends without triggering a fabricated emergency', async () => {
  const { evaluateHealthRisk } = await import('../src/services/health-risk-engine.mjs');
  const now = Date.parse('2026-11-15T00:00:00.000Z');
  const demo = buildDemoMissionData(now);
  const units = { heartRate: 'bpm', bloodPressure: 'mmHg', bloodSugar: 'mg/dL', hydration: '%', sleep: 'hrs', temperature: '°C', oxygen: '%' };
  const readings = Object.entries(demo.current).map(([id, value]) => ({ id, value, unit: units[id] }));
  const result = evaluateHealthRisk({ readings, history: demo.history, symptoms: demo.symptoms, baseline: demo.baseline, missionContext: demo.missionContext, now });
  assert.equal(result.overallState, 'attention');
  assert.ok(result.findings.some((finding) => finding.label === 'hydration' && finding.reasons.some((reason) => reason.includes('decreasing trend'))));
  assert.ok(result.findings.some((finding) => finding.label === 'sleep' && finding.reasons.some((reason) => reason.includes('decreasing trend'))));
  assert.notEqual(result.overallState, 'urgent');
});


test('only an untouched v1 demo dataset is eligible for safe migration', () => {
  const demo = buildDemoMissionData(Date.parse('2026-11-15T00:00:00.000Z'));
  const legacy = {
    flag: PREVIOUS_DEMO_MISSION_ID,
    metrics: demo.metrics.map((item) => ({ ...item, demoMissionId: PREVIOUS_DEMO_MISSION_ID })),
    history: demo.history.map((item) => ({ ...item, missionContext: { ...item.missionContext, demoMissionId: PREVIOUS_DEMO_MISSION_ID } })),
    symptoms: demo.symptoms.map((item) => ({ ...item, demoMissionId: PREVIOUS_DEMO_MISSION_ID })),
    baseline: { ...demo.baseline, demoMissionId: PREVIOUS_DEMO_MISSION_ID },
    missionContext: { ...demo.missionContext, demoMissionId: PREVIOUS_DEMO_MISSION_ID },
  };
  assert.equal(isUntouchedLegacyDemo(legacy), true);
  assert.equal(isUntouchedLegacyDemo({ ...legacy, symptoms: [...legacy.symptoms, { kind: 'headache', source: 'health-check-in' }] }), false);
  assert.equal(isUntouchedLegacyDemo({ ...legacy, metrics: legacy.metrics.map(({ demoMissionId, ...item }) => item) }), false);
});
