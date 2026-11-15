import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateHealthRisk } from '../src/services/health-risk-engine.mjs';

const now = Date.parse('2026-11-15T12:00:00.000Z');
const readings = [
  { id: 'heartRate', name: 'Heart rate', unit: 'bpm', value: 72 },
  { id: 'bloodPressure', name: 'Systolic blood pressure', unit: 'mmHg', value: 118 },
  { id: 'bloodSugar', name: 'Blood glucose', unit: 'mg/dL', value: 92 },
  { id: 'hydration', name: 'Hydration estimate', unit: '%', value: 70 },
  { id: 'sleep', name: 'Sleep', unit: 'hrs', value: 7 },
  { id: 'temperature', name: 'Temperature', unit: '°C', value: 36.7 },
  { id: 'oxygen', name: 'Blood oxygen', unit: '%', value: 98 },
];
const stableHistory = [
  { at: '2026-11-13T12:00:00.000Z', readings: Object.fromEntries(readings.map((item) => [item.id, item.value])) },
  { at: '2026-11-14T12:00:00.000Z', readings: Object.fromEntries(readings.map((item) => [item.id, item.value])) },
  { at: '2026-11-15T11:00:00.000Z', readings: Object.fromEntries(readings.map((item) => [item.id, item.value])) },
];

test('stable measurements matching a user baseline produce no attention flag', () => {
  const result = evaluateHealthRisk({ readings, history: stableHistory, baseline: Object.fromEntries(readings.map((item) => [item.id, { value: item.value, unit: item.unit }])), now });
  assert.equal(result.overallState, 'normal');
  assert.ok(result.findings.every((finding) => finding.state === 'normal'));
});

test('baseline deviation and changing trend are explained as descriptive attention, not diagnosis', () => {
  const result = evaluateHealthRisk({
    readings: [{ id: 'heartRate', name: 'Heart rate', unit: 'bpm', value: 82 }],
    baseline: { heartRate: { value: 72, unit: 'bpm' } },
    history: [
      { at: '2026-11-13T12:00:00.000Z', readings: { heartRate: 72 } },
      { at: '2026-11-14T12:00:00.000Z', readings: { heartRate: 77 } },
      { at: '2026-11-15T11:00:00.000Z', readings: { heartRate: 82 } },
    ], now,
  });
  assert.equal(result.overallState, 'attention');
  assert.match(result.findings[0].reasons.join(' '), /differs from the user-designated reference/);
  assert.match(result.findings[0].reasons.join(' '), /increasing trend/);
  assert.match(result.summary, /not a diagnosis/i);
});

test('missing or invalid current data remains unknown and is never called normal', () => {
  const result = evaluateHealthRisk({ readings: [{ id: 'heartRate', value: '' }], now });
  assert.equal(result.overallState, 'unknown');
  assert.ok(result.missing.some((item) => item.metricId === 'heartRate'));
  assert.ok(!result.findings.some((item) => item.metricId === 'heartRate'));
});

test('urgent symptom categories escalate without waiting for numeric thresholds', () => {
  const result = evaluateHealthRisk({
    readings,
    symptoms: [{ kind: 'breathing', severity: 3, at: new Date(now - 1000).toISOString() }],
    now,
  });
  assert.equal(result.overallState, 'urgent');
  assert.match(result.recommendations[0], /emergency medical checklist/i);
});


test('zero-intensity non-urgent entries do not create an attention finding, while new severe weakness escalates', () => {
  const noSymptom = evaluateHealthRisk({
    symptoms: [{ kind: 'nausea', severity: 0, at: new Date(now - 1000).toISOString() }], now,
  });
  assert.equal(noSymptom.recentSymptomCount, 0);
  assert.equal(noSymptom.overallState, 'unknown');
  const weakness = evaluateHealthRisk({
    symptoms: [{ kind: 'weakness', severity: 2, at: new Date(now - 1000).toISOString() }], now,
  });
  assert.equal(weakness.overallState, 'urgent');
});

test('unvalidated thresholds are ignored; validated thresholds require provenance and matching units', () => {
  const base = { readings: [{ id: 'heartRate', name: 'Heart rate', unit: 'bpm', value: 101 }], now };
  const unvalidated = evaluateHealthRisk({ ...base, thresholds: [{ metricId: 'heartRate', unit: 'bpm', direction: 'above', value: 100, level: 'urgent', validated: false, source: { name: 'Example', url: 'https://example.org' } }] });
  assert.equal(unvalidated.overallState, 'unknown');
  const validated = evaluateHealthRisk({ ...base, thresholds: [{ metricId: 'heartRate', unit: 'bpm', direction: 'above', value: 100, level: 'attention', validated: true, source: { name: 'Approved mission protocol', url: 'https://example.org/protocol' } }] });
  assert.equal(validated.overallState, 'attention');
  assert.equal(validated.findings[0].evidence[0].name, 'Approved mission protocol');
});

test('old symptoms are excluded from the current assessment window', () => {
  const result = evaluateHealthRisk({ symptoms: [{ kind: 'chest', severity: 9, at: new Date(now - 48 * 60 * 60 * 1000).toISOString() }], now });
  assert.equal(result.overallState, 'unknown');
  assert.equal(result.recentSymptomCount, 0);
});


test('lunar surface context changes hazard priorities and exposes lunar dust/EVA data gaps without inventing a clinical alert', () => {
  const result = evaluateHealthRisk({
    missionContext: { location: 'lunar_surface', gravity: 'lunar', missionDay: '42', evaMinutes24h: '95', particulateMgM3: '0.03' },
    now,
  });
  assert.equal(result.missionContext.locationLabel, 'Lunar surface / base');
  assert.equal(result.missionContext.gravity, 'lunar');
  assert.ok(result.relatedHazards.some((item) => item.id === 'gravity'));
  assert.ok(result.relatedHazards.some((item) => item.id === 'radiation'));
  assert.ok(result.missionContext.notes.some((item) => /dust/i.test(item)));
  assert.ok(result.missionContext.notes.some((item) => /EVA/i.test(item)));
  assert.equal(result.overallState, 'unknown');
});

test('ISS profile selects microgravity and closed-habitat context while telemetry remains unclassified without approved limits', () => {
  const result = evaluateHealthRisk({ missionContext: { location: 'iss', gravity: 'microgravity', co2PartialPressureKpa: '0.4', communicationDelayMin: '0.01' }, now });
  assert.equal(result.missionContext.gravity, 'microgravity');
  assert.ok(result.missionContext.notes.some((item) => /Cabin telemetry/i.test(item)));
  assert.ok(result.relatedHazards.some((item) => item.id === 'environment'));
  assert.equal(result.overallState, 'unknown');
});


test('historical trends and personal references are not mixed across different mission gravity contexts', () => {
  const result = evaluateHealthRisk({
    readings: [{ id: 'heartRate', name: 'Heart rate', unit: 'bpm', value: 80 }],
    missionContext: { location: 'iss', gravity: 'microgravity' },
    baseline: { missionContext: { location: 'earth', gravity: 'earth' }, readings: { heartRate: { value: 70, unit: 'bpm' } } },
    history: [
      { at: '2026-11-13T12:00:00.000Z', missionContext: { location: 'earth', gravity: 'earth' }, readings: { heartRate: 68 } },
      { at: '2026-11-14T12:00:00.000Z', missionContext: { location: 'earth', gravity: 'earth' }, readings: { heartRate: 70 } },
      { at: '2026-11-15T11:00:00.000Z', missionContext: { location: 'earth', gravity: 'earth' }, readings: { heartRate: 72 } },
    ], now,
  });
  assert.equal(result.findings[0].baseline, null);
  assert.equal(result.findings[0].trend.sampleCount, 0);
  assert.match(result.findings[0].reasons.join(' '), /different mission location \/ gravity context/i);
});
